namespace Skerp.Domain.Shared;

/// <summary>
/// The outcome of an operation that can fail in an expected way. A caller must inspect
/// <see cref="IsSuccess"/> before acting; expected failures are never thrown.
/// </summary>
public class Result
{
    protected Result(bool isSuccess, Error error)
    {
        if (isSuccess && error != Error.None)
        {
            throw new ArgumentException("A successful result cannot carry an error.", nameof(error));
        }

        if (!isSuccess && error == Error.None)
        {
            throw new ArgumentException("A failed result must carry an error.", nameof(error));
        }

        IsSuccess = isSuccess;
        Error = error;
    }

    public bool IsSuccess { get; }

    public bool IsFailure => !IsSuccess;

    public Error Error { get; }

    public static Result Success() => new(isSuccess: true, Error.None);

    public static Result Failure(Error error) => new(isSuccess: false, error);

    public static Result<TValue> Success<TValue>(TValue value) => new(value, isSuccess: true, Error.None);

    public static Result<TValue> Failure<TValue>(Error error) => new(default, isSuccess: false, error);
}

/// <summary>
/// A <see cref="Result"/> that carries a value when it succeeds.
/// </summary>
public sealed class Result<TValue> : Result
{
    private readonly TValue? _value;

    internal Result(TValue? value, bool isSuccess, Error error)
        : base(isSuccess, error)
    {
        _value = value;
    }

    /// <summary>The value of a successful result. Reading it from a failed result is a programming error.</summary>
    public TValue Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("The value of a failed result cannot be read.");

    public static implicit operator Result<TValue>(TValue value) => Success(value);

    public static implicit operator Result<TValue>(Error error) => Failure<TValue>(error);
}
