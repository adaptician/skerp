using FluentAssertions;
using FluentValidation;
using MediatR;
using Skerp.Application.Behaviors;
using Skerp.Domain.Shared;

namespace Skerp.Unit.Tests.Application.Behaviors;

public class ValidationBehaviorTests
{
    [Fact]
    public async Task Handle_WhenRequestIsInvalid_ReturnsValidationFailureWithoutCallingHandler()
    {
        var behavior = new ValidationBehavior<SampleRequest, Result<string>>([new SampleRequestValidator()]);
        var handlerCalled = false;

        var result = await behavior.Handle(
            new SampleRequest(Name: string.Empty),
            _ =>
            {
                handlerCalled = true;
                return Task.FromResult(Result.Success("handled"));
            },
            CancellationToken.None);

        handlerCalled.Should().BeFalse();
        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be(ValidationBehavior<SampleRequest, Result<string>>.ErrorCode);
        result.Error.Description.Should().Contain("Name is required.");
    }

    [Fact]
    public async Task Handle_WhenRequestIsValid_ReturnsHandlerResult()
    {
        var behavior = new ValidationBehavior<SampleRequest, Result<string>>([new SampleRequestValidator()]);

        var result = await behavior.Handle(
            new SampleRequest(Name: "Alpha Studios"),
            _ => Task.FromResult(Result.Success("handled")),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("handled");
    }

    [Fact]
    public async Task Handle_WhenResponseHasNoValue_ReturnsNonGenericFailure()
    {
        var behavior = new ValidationBehavior<SampleRequest, Result>([new SampleRequestValidator()]);

        var result = await behavior.Handle(
            new SampleRequest(Name: string.Empty),
            _ => Task.FromResult(Result.Success()),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
    }

    [Fact]
    public async Task Handle_WhenEveryFailureCarriesOneDomainCode_ReportsThatCode()
    {
        var behavior = new ValidationBehavior<SampleRequest, Result<string>>([new SampleRequestValidator()]);

        var result = await behavior.Handle(
            new SampleRequest(Name: "Alpha Studios", Quantity: 0),
            _ => Task.FromResult(Result.Success("handled")),
            CancellationToken.None);

        result.Error.Code.Should().Be("Sample.InvalidQuantity");
        result.Error.Description.Should().Be("Quantity must be positive.");
    }

    [Fact]
    public async Task Handle_WhenFailuresCarryDifferentCodes_ReportsTheGeneralCode()
    {
        var behavior = new ValidationBehavior<SampleRequest, Result<string>>([new SampleRequestValidator()]);

        var result = await behavior.Handle(
            new SampleRequest(Name: string.Empty, Quantity: 0),
            _ => Task.FromResult(Result.Success("handled")),
            CancellationToken.None);

        result.Error.Code.Should().Be(ValidationBehavior<SampleRequest, Result<string>>.ErrorCode);
        result.Error.Description.Should().Contain("Name is required.").And.Contain("Quantity must be positive.");
    }

    public sealed record SampleRequest(string Name, int Quantity = 1) : IRequest<Result<string>>;

    private sealed class SampleRequestValidator : AbstractValidator<SampleRequest>
    {
        public SampleRequestValidator()
        {
            RuleFor(r => r.Name).NotEmpty().WithMessage("Name is required.");
            RuleFor(r => r.Quantity).GreaterThan(0)
                .WithErrorCode("Sample.InvalidQuantity")
                .WithMessage("Quantity must be positive.");
        }
    }
}
