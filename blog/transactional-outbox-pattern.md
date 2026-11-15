---
title: "Eliminating Dual-Write Hazards: Transactional Outbox Pattern in .NET & RabbitMQ"
date: "2026-09-18"
readTime: "7 min read"
tags: ["Distributed Systems", "RabbitMQ", ".NET", "PostgreSQL", "Architecture"]
summary: "Why database commits combined with direct message publishing fail in production, and how to implement a bulletproof transactional outbox with change data capture or polling workers."
---

# Eliminating Dual-Write Hazards: Transactional Outbox Pattern in .NET & RabbitMQ

When building microservices, one of the most insidious architectural traps is the **Dual-Write Problem**. 

Consider an e-commerce order service:
1. Persist the `Order` aggregate to PostgreSQL within a database transaction.
2. Publish an `OrderCreatedIntegrationEvent` to RabbitMQ exchange to inform Payments and Inventory services.

```csharp
// THE FRAGILE DUAL-WRITE ANTI-PATTERN
public async Task<Guid> CreateOrderAsync(CreateOrderCommand cmd, CancellationToken ct)
{
    using var tx = await _dbContext.Database.BeginTransactionAsync(ct);
    
    var order = Order.Create(cmd.CustomerId, cmd.Items);
    _dbContext.Orders.Add(order);
    await _dbContext.SaveChangesAsync(ct);
    
    // IF THE PROCESS CRASHES OR NETWORK DROPS HERE:
    // The order is committed in DB, but the event is NEVER published!
    // Result: The customer was charged nothing, but inventory was never reserved.
    await _bus.PublishAsync(new OrderCreatedIntegrationEvent(order.Id), ct);
    
    await tx.CommitAsync(ct);
    return order.Id;
}
```

Two-Phase Commit (2PC) / distributed XA transactions across heterogeneous systems (relational DB + AMQP broker) are notoriously brittle, high latency, and generally unsupported in modern cloud topologies.

---

## The Solution: Transactional Outbox

Instead of writing to two separate network resources, we record both the aggregate state and the outbox message inside **the exact same relational transaction**.

```
+-------------------------------------------------------------+
| PostgreSQL Local Transaction                                |
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
    public string Payload { get; init; } = string.Empty; // JSON serialized
    public DateTime OccurredOnUtc { get; init; } = DateTime.UtcNow;
    public DateTime? ProcessedOnUtc { get; set; }
    public string? Error { get; set; }
    public int RetryCount { get; set; }
}
```

### 2. Atomic Persistence with EF Core Interceptors

In our `DbContext`, we intercept aggregate events before calling `SaveChangesAsync`:

```csharp
public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
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

    await Set<OutboxMessage>().AddRangeAsync(domainEvents, cancellationToken);
    return await base.SaveChangesAsync(cancellationToken);
}
```

### 3. High-Throughput Delivery Worker

To avoid lock contention on high write rates, use `FOR UPDATE SKIP LOCKED` in PostgreSQL:

```sql
SELECT "Id", "EventType", "Payload"
FROM "OutboxMessages"
WHERE "ProcessedOnUtc" IS NULL
ORDER BY "OccurredOnUtc" ASC
LIMIT 100
FOR UPDATE SKIP LOCKED;
```

With `SKIP LOCKED`, multiple outbox processor instances can pull batches concurrently without waiting on row locks.

### Key Takeaways for Senior Engineers
- **Guaranteed At-Least-Once Delivery**: The outbox pattern guarantees delivery. Your consumers must therefore be **idempotent**.
- **Batching**: Group event publishing to RabbitMQ using batch confirms (`BasicPublish` with confirmation channels) to achieve 15,000+ msg/sec on standard nodes.
- **Pruning**: Implement a partition retention job to purge `ProcessedOnUtc` rows older than 7 days, preventing database bloat.
