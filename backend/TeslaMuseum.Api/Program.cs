using Microsoft.Extensions.FileProviders;
using Microsoft.AspNetCore.StaticFiles;
using TeslaMuseum.Application;
using TeslaMuseum.Application.Abstractions;
using TeslaMuseum.Infrastructure;
using TeslaMuseum.Infrastructure.Media;
using TeslaMuseum.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
var thumbnailDirectory = Path.Combine(builder.Environment.ContentRootPath,
    "wwwroot", "uploads", "thumbnails");
var modelDirectory = Path.Combine(builder.Environment.ContentRootPath,
    "wwwroot", "uploads", "models");
Directory.CreateDirectory(thumbnailDirectory);
Directory.CreateDirectory(modelDirectory);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSingleton<IThumbnailStorage>(new LocalThumbnailStorage(thumbnailDirectory));
builder.Services.AddSingleton<IModelStorage>(new LocalModelStorage(modelDirectory));
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
var modelContentTypes = new FileExtensionContentTypeProvider();
modelContentTypes.Mappings[".glb"] = "model/gltf-binary";
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(modelDirectory),
    RequestPath = "/uploads/models",
    ContentTypeProvider = modelContentTypes
});
app.MapControllers();
app.Run();

public partial class Program;
