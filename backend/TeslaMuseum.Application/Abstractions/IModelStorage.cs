namespace TeslaMuseum.Application.Abstractions;

public interface IModelStorage
{
    Task<string> SaveAsync(Stream content, CancellationToken cancellationToken);
}
