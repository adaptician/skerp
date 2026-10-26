using FluentAssertions;
using Skerp.Domain.Shared;

namespace Skerp.Unit.Tests.Domain.Shared;

public class ResultTests
{
    private static readonly Error SampleError = Error.NotFound("Sample.NotFound", "The sample was not found.");

    [Fact]
    public void Success_WithValue_ExposesValueAndNoError()
    {
        var result = Result.Success(42);

        result.IsSuccess.Should().BeTrue();
        result.IsFailure.Should().BeFalse();
        result.Error.Should().Be(Error.None);
        result.Value.Should().Be(42);
    }

    [Fact]
    public void Failure_ReadingValue_Throws()
    {
        var result = Result.Failure<int>(SampleError);

        var read = () => result.Value;

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(SampleError);
        read.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void ImplicitConversion_FromError_ProducesFailure()
    {
        Result<string> result = SampleError;

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Sample.NotFound");
    }

    [Fact]
    public void ImplicitConversion_FromValue_ProducesSuccess()
    {
        Result<string> result = "value";

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().Be("value");
    }

    [Fact]
    public void Failure_WithNoError_IsRejected()
    {
        var create = () => Result.Failure(Error.None);

        create.Should().Throw<ArgumentException>();
    }
}
