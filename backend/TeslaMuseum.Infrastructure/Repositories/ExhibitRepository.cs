using Microsoft.EntityFrameworkCore;
using TeslaMuseum.Application.Abstractions;
using TeslaMuseum.Domain.Entities;
using TeslaMuseum.Infrastructure.Persistence;

namespace TeslaMuseum.Infrastructure.Repositories;

public sealed class ExhibitRepository(TeslaMuseumDbContext dbContext) : IExhibitRepository
{
    public async Task<IReadOnlyList<Exhibit>> GetCatalogAsync(CancellationToken cancellationToken)
    {
        return await dbContext.Exhibits.AsNoTracking()
            .Where(exhibit => exhibit.IsAvailable)
            .OrderBy(exhibit => exhibit.DisplayOrder)
            .ToArrayAsync(cancellationToken);
    }

    public Task<Exhibit?> GetBySlugAsync(string slug, CancellationToken cancellationToken)
    {
        return dbContext.Exhibits.AsNoTracking()
            .AsSplitQuery()
            .Include(exhibit => exhibit.Field)
            .Include(exhibit => exhibit.Hotspots)
            .ThenInclude(hotspot => hotspot.TargetParts)
            .SingleOrDefaultAsync(exhibit => exhibit.Slug == slug && exhibit.IsAvailable, cancellationToken);
    }

    public async Task<IReadOnlyList<Exhibit>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await dbContext.Exhibits.AsNoTracking()
            .Include(exhibit => exhibit.Field)
            .OrderBy(exhibit => exhibit.DisplayOrder)
            .ThenBy(exhibit => exhibit.Title)
            .ToArrayAsync(cancellationToken);
    }

    public Task<Exhibit?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return dbContext.Exhibits.Include(exhibit => exhibit.Field)
            .SingleOrDefaultAsync(exhibit => exhibit.Id == id, cancellationToken);
    }

    public Task<bool> SlugExistsAsync(string slug, Guid? excludedId, CancellationToken cancellationToken)
    {
        return dbContext.Exhibits.AnyAsync(
            exhibit => exhibit.Slug == slug && (!excludedId.HasValue || exhibit.Id != excludedId.Value),
            cancellationToken);
    }

    public void Add(Exhibit exhibit) => dbContext.Exhibits.Add(exhibit);

    public void Remove(Exhibit exhibit) => dbContext.Exhibits.Remove(exhibit);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
