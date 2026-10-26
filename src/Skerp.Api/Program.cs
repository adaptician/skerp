using Asp.Versioning;
using Microsoft.FeatureManagement;
using Skerp.Api.Endpoints;
using Skerp.Api.ErrorHandling;
using Skerp.Api.Features;
using Skerp.Api.Health;
using Skerp.Api.Hubs;
using Skerp.Application;
using Skerp.Application.PurchaseOrders.Monitoring;
using Skerp.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration, builder.Environment);

builder.Services.AddFeatureManagement();

// Monitor Mode's live feed (Feature AB#1482): handlers raise changes, the hub broadcasts them.
builder.Services.AddSignalR();
builder.Services.AddSingleton<IPurchaseOrderChangeNotifier, SignalRPurchaseOrderChangeNotifier>();

// URL-segment versioning (api.md → Versioning): /api/v1 is version 1.0, the default and only version.
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = ApiV1.Version;
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ApiVersionReader = new UrlSegmentApiVersionReader();
    options.ReportApiVersions = true;
}).AddApiExplorer(options =>
{
    // Names the Swagger document "v1" and writes the version into each documented URL.
    options.GroupNameFormat = "'v'VVV";
    options.SubstituteApiVersionInUrl = true;
});

// A request the framework cannot bind (malformed JSON, a string for a number) throws, so the global
// handler answers with a Result body in every environment, not only Development.
builder.Services.Configure<RouteHandlerOptions>(options => options.ThrowOnBadRequest = true);
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => options.SwaggerDoc("v1", new() { Title = "Sharp ERP API", Version = "v1" }));

var app = builder.Build();

app.UseExceptionHandler();
app.UseRouting();
app.UseFeatureGates();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/swagger/v1/swagger.json", "Sharp ERP API v1"));
}

app.MapHealthEndpoints();
app.MapApiV1()
    .MapFeatureEndpoints()
    .MapPurchaseOrderEndpoints()
    .MapCustomerEndpoints()
    .MapProductEndpoints();
app.MapPurchaseOrderMonitorHub();

await app.InitializeDatabaseAsync();
await app.RunAsync();

/// <summary>Entry point; public so integration tests can host the API with WebApplicationFactory.</summary>
public partial class Program;
