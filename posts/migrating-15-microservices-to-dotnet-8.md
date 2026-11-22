---
title: "Migrating 15+ Production Services to Modern .NET & RabbitMQ Quorum Queues"
date: "2026-11-22"
readTime: "7 min read"
tags: [".NET 10", "RabbitMQ", "MassTransit", "Hangfire", "SQL Server"]
summary: "Field notes on upgrading legacy .NET services without downtime, transitioning RabbitMQ classic queues to quorum queues with MassTransit, and tuning SQL Server stored procedures."
badge: "NEW"
---

Upgrading a single greenfield API to a new LTS runtime is easy. Migrating **15+ interconnected production microservices** while processing live bookings, external payment callbacks, and automated tax registrations requires a repeatable playbook.

## 1. Incremental .NET Migration Strategy

Instead of freezing feature work for a big-bang rewrite, we grouped services by dependency depth — starting with leaf services and shared NuGet contracts before touching core orchestration APIs.

- **Standardize shared packages first:** Upgrade logging, MassTransit abstractions, and auth middleware so every service inherits the same modern .NET baseline.
- **Containerize cleanly:** Move to minimal .NET Alpine/Chiseled Docker images with explicit non-root users and health probes.
- **Measure before and after:** Track P95 latency, GC pause times, and container memory footprint on every rollout.

## 2. Moving from Classic Queues to RabbitMQ Quorum Queues

Classic mirrored queues in RabbitMQ have well-known split-brain and synchronization risks during node restarts. For financial events (payment confirmations, ticket issuance, tax registration), losing a message in flight is unacceptable.

> Quorum queues use the Raft consensus algorithm to replicate queue state across cluster nodes — giving predictable failover and poison-message delivery limits out of the box.

With **MassTransit**, enabling quorum queues on a receive endpoint is straightforward:

```csharp
cfg.ReceiveEndpoint("payments-settlement-v2", e =>
{
    // Enforce Raft-replicated quorum queue
    e.SetQuorumQueue();
    e.SetQueueArgument("x-delivery-limit", 5);

    e.UseMessageRetry(r => r.Exponential(
        retryLimit: 4,
        minInterval: TimeSpan.FromSeconds(2),
        maxInterval: TimeSpan.FromSeconds(30),
        intervalDelta: TimeSpan.FromSeconds(5)));

    e.ConfigureConsumer<PaymentSettledConsumer>(context);
});
```

### Zero-Downtime Queue Cutover

Because RabbitMQ does not allow changing a queue's `x-queue-type` in place, we used versioned endpoint names (e.g., `-v2`) during rollout: deploy new consumers bound to the quorum queue, drain the legacy classic queue completely, then retire the old binding.

## 3. Isolating Heavy Work with Hangfire & SQL Server Tuning

External payment gateways (such as Zarrinpal and Azkivam) and government tax registration APIs can experience unpredictable latency spikes. Moving non-interactive reconciliation and retry sweeps into **Hangfire** kept HTTP request threads lean and responsive.

Finally, pairing the .NET upgrade with targeted **SQL Server** stored procedure refactors — eliminating parameter sniffing and adding covering indexes on hot lookup tables — delivered the biggest single reduction in tail latency across the platform.

## Key Takeaways

- Treat runtime upgrades as a pipeline, not a one-off hero effort.
- Never alter RabbitMQ queue types in place; cut over cleanly with versioned queues.
- Always pair broker reliability with idempotent consumers and database query hygiene.
