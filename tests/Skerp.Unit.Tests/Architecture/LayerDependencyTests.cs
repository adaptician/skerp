using FluentAssertions;
using NetArchTest.Rules;
using Skerp.Application.Abstractions.Time;
using Skerp.Domain.Shared;
using Skerp.Infrastructure.Persistence;

namespace Skerp.Unit.Tests.Architecture;

/// <summary>
/// The dependency rule (architecture.md): dependencies point inward only. A violation fails the gate.
/// </summary>
public class LayerDependencyTests
{
    private const string ApplicationNamespace = "Skerp.Application";
    private const string InfrastructureNamespace = "Skerp.Infrastructure";
    private const string ApiNamespace = "Skerp.Api";

    [Fact]
    public void Domain_DependsOnNoOtherLayer()
    {
        var result = Types.InAssembly(typeof(Result).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(ApplicationNamespace, InfrastructureNamespace, ApiNamespace)
            .GetResult();

        result.IsSuccessful.Should().BeTrue(Describe(result));
    }

    [Fact]
    public void Domain_DependsOnNoFrameworkPackages()
    {
        var result = Types.InAssembly(typeof(Result).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny("Microsoft.EntityFrameworkCore", "Microsoft.AspNetCore", "MediatR", "FluentValidation")
            .GetResult();

        result.IsSuccessful.Should().BeTrue(Describe(result));
    }

    [Fact]
    public void Application_DependsOnNeitherInfrastructureNorApi()
    {
        var result = Types.InAssembly(typeof(IDateTimeOffsetProvider).Assembly)
            .ShouldNot()
            .HaveDependencyOnAny(InfrastructureNamespace, ApiNamespace, "Microsoft.EntityFrameworkCore", "Microsoft.AspNetCore")
            .GetResult();

        result.IsSuccessful.Should().BeTrue(Describe(result));
    }

    [Fact]
    public void Infrastructure_DoesNotDependOnApi()
    {
        var result = Types.InAssembly(typeof(ApplicationDbContext).Assembly)
            .ShouldNot()
            .HaveDependencyOn(ApiNamespace)
            .GetResult();

        result.IsSuccessful.Should().BeTrue(Describe(result));
    }

    private static string Describe(TestResult result) =>
        "these types break the dependency rule: " + string.Join(", ", result.FailingTypeNames ?? []);
}
