using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Infrastructure.Media;

public sealed class LocalModelStorage(string directory) : IModelStorage
{
    public async Task<string> SaveAsync(Stream content, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(directory);

        var fileName = $"{Guid.NewGuid():N}.glb";
        var filePath = Path.Combine(directory, fileName);
        await using var output = new FileStream(filePath, FileMode.CreateNew, FileAccess.Write,
            FileShare.None, 81920, FileOptions.Asynchronous);
        await content.CopyToAsync(output, cancellationToken);
        return $"/uploads/models/{fileName}";
    }
}
