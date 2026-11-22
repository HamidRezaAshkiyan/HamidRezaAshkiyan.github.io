---
title: "Structuring Modular Monoliths with Clean Architecture, MediatR & MassTransit"
date: "2026-11-15"
readTime: "8 min read"
tags: ["Modular Monolith", "Clean Architecture", "DDD", "MediatR", "MassTransit"]
summary: "How to design loosely coupled modules with independent persistence, strict contract boundaries, and asynchronous event buses before jumping prematurely to microservices."
---

Many engineering teams adopt microservices too early, paying the distributed systems tax (network latency, distributed transactions, partial failures, out-of-sync schemas) without reaping the benefits of team autonomy.

A **Modular Monolith** provides the ideal balance:

1. **Single deployment artifact** — fast CI/CD, simple operations, shared infrastructure.
2. **Strict architectural boundaries** — modules cannot access each other's database tables or internal domain aggregates.
3. **Prepared for extraction** — any module can be split into a standalone microservice with minimal changes to business logic.

## The Module Boundary Rule

In a production Modular Monolith, modules (e.g., `Catalog`, `Orders`, `Payments`, `Notifications`) must obey one non-negotiable rule:

> A module must NEVER reference another module's internal DbContext, Entities, or Repositories.

Communication occurs strictly through two sanctioned mechanisms:

1. **Synchronous Contract Queries** via public interfaces defined in `Module.Contracts`.
2. **Asynchronous Integration Events** dispatched over an in-process or distributed message bus (**MassTransit** over **RabbitMQ** or in-memory channel).

```architecture
+-------------------------------------------------------------+
|                     ASP.NET Core Host                       |
+--------------+----------------+---------------+-------------+
               |                |               |
               v                v               v
        +--------------+ +--------------+ +---------------+
        |Orders Module | |Catalog Module| |Payments Module|
        | - Domain     | | - Domain     | | - Domain      |
        | - Application| | - Application| | - Application |
        | - Persistence| | - Persistence| | - Persistence |
        +-------+------+ +------+-------+ +-------+-------+
                |               |                 |
                |   [ Contract: ICatalogModule ]  |
                +-------------------------------->+
                |
                v (Publish Integration Event)
        +-------------------------------------------------+
        |   MassTransit Event Bus (RabbitMQ / In-Memory)  |
        +-------------------------------------------------+
```

## Command & Query Handling with MediatR

Within each module, application use-cases are structured using **CQRS** and **MediatR**:

```csharp
// 1. Command
public sealed record PlaceOrderCommand(
    Guid CustomerId,
    List<OrderItemDto> Items
) : IRequest<Result<Guid>>;

// 2. Handler enforcing Domain-Driven Design (DDD)
public sealed class PlaceOrderCommandHandler : IRequestHandler<PlaceOrderCommand, Result<Guid>>
{
    private readonly IOrdersRepository _ordersRepository;
    private readonly ICatalogModule _catalogModule;
    private readonly IPublisher _bus;

    public PlaceOrderCommandHandler(
        IOrdersRepository ordersRepository,
        ICatalogModule catalogModule,
        IPublisher bus)
    {
        _ordersRepository = ordersRepository;
        _catalogModule = catalogModule;
        _bus = bus;
    }

    public async Task<Result<Guid>> Handle(PlaceOrderCommand request, CancellationToken ct)
    {
        foreach (var item in request.Items)
        {
            var product = await _catalogModule.GetProductByIdAsync(item.ProductId, ct);
            if (product is null || product.AvailableStock < item.Quantity)
                return Result.Failure<Guid>(OrderErrors.InsufficientStock(item.ProductId));
        }

        var order = Order.Create(request.CustomerId, request.Items);
        await _ordersRepository.AddAsync(order, ct);

        await _bus.Publish(new OrderPlacedIntegrationEvent(order.Id, order.TotalAmount), ct);
        return Result.Success(order.Id);
    }
}
```

## Decoupled Modules with MassTransit Consumers

When `OrderPlacedIntegrationEvent` is published, the `Payments` module reacts asynchronously:

```csharp
public sealed class OrderPlacedConsumer : IConsumer<OrderPlacedIntegrationEvent>
{
    private readonly IPaymentService _paymentService;
    private readonly ILogger<OrderPlacedConsumer> _logger;

    public OrderPlacedConsumer(IPaymentService paymentService, ILogger<OrderPlacedConsumer> logger)
    {
        _paymentService = paymentService;
        _logger = logger;
    }

    public async Task Consume(ConsumeContext<OrderPlacedIntegrationEvent> context)
    {
        var msg = context.Message;
        _logger.LogInformation("Processing payment for Order: {OrderId}", msg.OrderId);

        var result = await _paymentService.ProcessTransactionAsync(msg.OrderId, msg.TotalAmount);

        if (result.IsSuccess)
            await context.Publish(new PaymentCompletedIntegrationEvent(msg.OrderId));
        else
            await context.Publish(new PaymentFailedIntegrationEvent(msg.OrderId, result.Error));
    }
}
```

## Key Architectural Benefits

- **Zero network serialization overhead** between in-process contract queries.
- **Independent schema migrations** per module (separate schemas in SQL Server or PostgreSQL).
- **Clean Architecture & DDD** prevent spaghetti dependencies while maintaining rapid velocity.
- **Trivial extraction:** When a module needs independent scaling, extracting it only requires updating MassTransit endpoints and Docker configs.
