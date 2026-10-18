using Microsoft.EntityFrameworkCore;
using TeslaMuseum.Application.Abstractions;
using TeslaMuseum.Domain.Entities;
using TeslaMuseum.Infrastructure.Persistence;

namespace TeslaMuseum.Infrastructure.Repositories;

public sealed class HotspotRepository(TeslaMuseumDbContext dbContext) : IHotspotRepository
{
    public async Task<IReadOnlyList<Hotspot>> GetForExhibitAsync(
        Guid exhibitId, CancellationToken cancellationToken)
    {
        return await dbContext.Hotspots.AsNoTracking()
            .Include(hotspot => hotspot.TargetParts)
            .Where(hotspot => hotspot.ExhibitId == exhibitId)
            .OrderBy(hotspot => hotspot.DisplayOrder)
            .ThenBy(hotspot => hotspot.Title)
            .ToArrayAsync(cancellationToken);
    }

    public Task<Hotspot?> GetByIdAsync(
        Guid exhibitId, Guid id, CancellationToken cancellationToken)
    {
        return dbContext.Hotspots
            .Include(hotspot => hotspot.TargetParts)
            .SingleOrDefaultAsync(
                hotspot => hotspot.ExhibitId == exhibitId && hotspot.Id == id,
                cancellationToken);
    }

    public Task<bool> KeyExistsAsync(
        Guid exhibitId, string key, Guid? excludedId, CancellationToken cancellationToken)
    {
        return dbContext.Hotspots.AnyAsync(
            hotspot => hotspot.ExhibitId == exhibitId && hotspot.Key == key &&
                       (!excludedId.HasValue || hotspot.Id != excludedId.Value),
            cancellationToken);
    }

    public void Add(Hotspot hotspot) => dbContext.Hotspots.Add(hotspot);

    public void Remove(Hotspot hotspot) => dbContext.Hotspots.Remove(hotspot);

    public void AddTargetParts(IEnumerable<HotspotTargetPart> targetParts) =>
        dbContext.HotspotTargetParts.AddRange(targetParts);

    public void RemoveTargetParts(IEnumerable<HotspotTargetPart> targetParts) =>
        dbContext.HotspotTargetParts.RemoveRange(targetParts);

    public Task SaveChangesAsync(CancellationToken cancellationToken) =>
        dbContext.SaveChangesAsync(cancellationToken);
}
