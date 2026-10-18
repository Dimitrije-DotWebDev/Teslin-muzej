using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Infrastructure.Media;

public sealed class LocalThumbnailStorage(string directory) : IThumbnailStorage
{
    public async Task<string> SaveAsync(Stream content, string extension,
        CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(directory);

        var fileName = $"{Guid.NewGuid():N}{extension}";
        var filePath = Path.Combine(directory, fileName);
        await using var output = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write,
            FileShare.None, 81920, FileOptions.Asynchronous);
        await content.CopyToAsync(output, cancellationToken);
        return $"/uploads/thumbnails/{fileName}";
    }
}
