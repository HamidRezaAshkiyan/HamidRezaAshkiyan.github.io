---
title: "Designing Bulletproof Idempotent Consumers in Distributed Systems"
date: "2026-07-04"
readTime: "5 min read"
tags: ["Microservices", "Event-Driven", "RabbitMQ", "Resilience"]
summary: "Network retries and broker reconnects inevitably lead to duplicate messages. Here is how we design zero-duplicate consumer pipelines with distributed locks and inbox tables."
---

# Designing Bulletproof Idempotent Consumers in Distributed Systems

In real-world distributed architectures, exactly-once delivery across network boundaries is a mathematical impossibility without coordination overhead that kills throughput.

Instead, we embrace **At-Least-Once Delivery + Idempotent Processing**.

```
Message Broker (RabbitMQ) ----[ Message (Id: msg_889a) ]----> Consumer Service
                                                                    |
                                   +--------------------------------+
                                   |
                         [ Step 1: Check Inbox Table ]
                         SELECT 1 FROM "InboxMessages" WHERE "Id" = 'msg_889a'
                                   |
                  +----------------+----------------+
                  | Exists                          | New Message
                  v                                 v
          [ ACK & Discard ]               [ Execute Business Logic ]
          (No duplicate charge)                     |
                                          [ INSERT INTO "InboxMessages" ]
                                                    |
                                          [ ACK to Broker ]
```

## Idempotency Key Strategies

### Strategy A: Natural Idempotency
Whenever possible, design operations to be mathematically idempotent:
- Setting a status: `UPDATE orders SET status = 'Shipped'` (idempotent)
- Versus appending: `UPDATE inventory SET stock = stock - 1` (non-idempotent without guards)

### Strategy B: Transactional Inbox Table
When mutating state across relational models, store the consumed `MessageId` within the domain transaction:

```sql
CREATE TABLE "InboxMessages" (
    "Id" VARCHAR(64) PRIMARY KEY,
    "ConsumerName" VARCHAR(100) NOT NULL,
    "ProcessedOnUtc" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

If another thread or worker attempts to process the exact same message concurrently, PostgreSQL's primary key constraint will throw a unique violation (`23505`), automatically aborting the duplicate run.

### Strategy C: Redis Distributed Lock with Lease Expiry
For high-frequency events where DB roundtrips add unnecessary latency:

```csharp
public async Task<bool> AcquireDeduplicationLockAsync(string messageId, TimeSpan ttl)
{
    var key = $"idemp:{messageId}";
    // SET key value NX PX 10000
    return await _redis.StringSetAsync(key, "1", ttl, When.NotExists);
}
```

## Summary Rule of Thumb
If a message delivery can fail after the domain write but before the broker ACK, your system will receive a duplicate. **Always design the receiver as if duplicates are an hourly occurrence.**
