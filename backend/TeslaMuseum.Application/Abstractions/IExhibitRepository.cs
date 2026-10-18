using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Application.Abstractions;

public interface IExhibitRepository
{
    Task<IReadOnlyList<Exhibit>> GetCatalogAsync(CancellationToken cancellationToken);
    Task<Exhibit?> GetBySlugAsync(string slug, CancellationToken cancellationToken);
    Task<IReadOnlyList<Exhibit>> GetAllAsync(CancellationToken cancellationToken);
    Task<Exhibit?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> SlugExistsAsync(string slug, Guid? excludedId, CancellationToken cancellationToken);
    void Add(Exhibit exhibit);
    void Remove(Exhibit exhibit);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
