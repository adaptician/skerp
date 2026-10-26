using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Skerp.Application.Behaviors;
using Skerp.Application.PurchaseOrders.LineItems;

namespace Skerp.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Registers MediatR handlers, the validation pipeline and every validator in this assembly.
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        services.AddMediatR(config =>
        {
            config.RegisterServicesFromAssembly(assembly);
            config.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });

        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: true);

        services.AddScoped<LineItemProductResolver>();

        return services;
    }
}
