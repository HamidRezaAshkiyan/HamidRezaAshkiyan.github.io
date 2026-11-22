---
title: "Eliminating Dual-Write Hazards: Transactional Outbox Pattern in .NET & RabbitMQ"
date: "2026-09-18"
readTime: "7 min read"
tags: ["Distributed Systems", "RabbitMQ", ".NET", "PostgreSQL", "Architecture"]
summary: "Why database commits combined with direct message publishing fail in production, and how to implement a bulletproof transactional outbox with polling workers or CDC."
---

When building microservices, one of the most insidious architectural traps is the **Dual-Write Problem**. Consider an e-commerce order service that persists an `Order` aggregate to a relational database and then publishes an `OrderCreatedIntegrationEvent` to RabbitMQ:

```csharp
// Fragile dual-write anti-pattern
public async Task<Guid> CreateOrderAsync(CreateOrderCommand cmd, CancellationToken ct)
{
    using var tx = await _dbContext.Database.BeginTransactionAsync(ct);

    var order = Order.Create(cmd.CustomerId, cmd.Items);
    _dbContext.Orders.Add(order);
    await _dbContext.SaveChangesAsync(ct);

    // IF THE PROCESS CRASHES OR NETWORK DROPS HERE:
    // The order is committed in DB, but the event is NEVER published!
    await _bus.PublishAsync(new OrderCreatedIntegrationEvent(order.Id), ct);

    await tx.CommitAsync(ct);
    return order.Id;
}
```

Two-Phase Commit (2PC) / distributed XA transactions across heterogeneous systems (relational DB + AMQP broker) are brittle, high-latency, and generally unsupported in modern cloud topologies.

## The Solution: Transactional Outbox

Instead of writing to two separate network resources, record both the aggregate state and the outbox message inside **the exact same relational transaction**.

```architecture
+-------------------------------------------------------------+
| Local Relational Transaction (SQL Server / PostgreSQL)      |
|  1. INSERT INTO "Orders" (...)                              |
|  2. INSERT INTO "OutboxMessages" (Id, Type, Payload, State) |
|  3. COMMIT (Atomic ACID guarantee)                          |
+-------------------------------------------------------------+
                               |
                               v
               [ Background Outbox Processor ]
               (Worker / Hangfire / Debezium)
                               |
                               v
                     [ RabbitMQ Exchange ]
```

### 1. The Outbox Entity

```csharp
public sealed class OutboxMessage
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string EventType { get; init; } = string.Empty;
    public string Payload { get; init; } = string.Empty;
    public DateTime OccurredOnUtc { get; init; } = DateTime.UtcNow;
    public DateTime? ProcessedOnUtc { get; set; }
    public string? Error { get; set; }
    public int RetryCount { get; set; }
}
```

### 2. Atomic Persistence with EF Core

```csharp
public override async Task<int> SaveChangesAsync(CancellationToken ct = default)
{
    var domainEvents = ChangeTracker.Entries<AggregateRoot>()
        .Select(x => x.Entity)
        .Where(x => x.DomainEvents.Any())
        .SelectMany(x => {
            var events = x.DomainEvents.ToList();
            x.ClearDomainEvents();
            return events;
        })
        .Select(e => new OutboxMessage
        {
            Id = Guid.NewGuid(),
            EventType = e.GetType().AssemblyQualifiedName!,
            Payload = JsonSerializer.Serialize(e, e.GetType()),
            OccurredOnUtc = DateTime.UtcNow
        });

    await Set<OutboxMessage>().AddRangeAsync(domainEvents, ct);
    return await base.SaveChangesAsync(ct);
}
```

### 3. High-Throughput Delivery Worker

To avoid lock contention across concurrent workers, pull batches with `FOR UPDATE SKIP LOCKED` (PostgreSQL) or `UPDLOCK, READPAST` (SQL Server):

```sql
SELECT "Id", "EventType", "Payload"
FROM "OutboxMessages"
WHERE "ProcessedOnUtc" IS NULL
ORDER BY "OccurredOnUtc" ASC
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

## Key Takeaways

- **Guaranteed At-Least-Once Delivery:** Your downstream consumers must therefore be **idempotent**.
- **Batching:** Group event publishing with broker confirms to maximize throughput.
- **Pruning:** Schedule a retention job to purge processed rows older than 7 days to avoid table bloat.
