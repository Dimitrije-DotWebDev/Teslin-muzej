using Microsoft.Extensions.FileProviders;
using TeslaMuseum.Application;
using TeslaMuseum.Application.Abstractions;
using TeslaMuseum.Infrastructure;
using TeslaMuseum.Infrastructure.Media;
using TeslaMuseum.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var thumbnailDirectory = Path.Combine(builder.Environment.ContentRootPath,
    "wwwroot", "uploads", "thumbnails");
Directory.CreateDirectory(thumbnailDirectory);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSingleton<IThumbnailStorage>(new LocalThumbnailStorage(thumbnailDirectory));
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

await app.Services.InitializeDatabaseAsync();
app.UseCors("Client");
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(thumbnailDirectory),
    RequestPath = "/uploads/thumbnails"
});
app.MapControllers();
app.Run();

public partial class Program;
