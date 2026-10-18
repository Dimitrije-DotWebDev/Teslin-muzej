namespace TeslaMuseum.Application.Abstractions;

public interface IThumbnailStorage
{
    Task<string> SaveAsync(Stream content, string extension, CancellationToken cancellationToken);
}
