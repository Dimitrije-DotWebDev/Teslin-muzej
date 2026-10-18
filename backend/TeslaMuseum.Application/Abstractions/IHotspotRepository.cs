using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Application.Abstractions;

public interface IHotspotRepository
{
    Task<IReadOnlyList<Hotspot>> GetForExhibitAsync(Guid exhibitId, CancellationToken cancellationToken);
    Task<Hotspot?> GetByIdAsync(Guid exhibitId, Guid id, CancellationToken cancellationToken);
    Task<bool> KeyExistsAsync(Guid exhibitId, string key, Guid? excludedId, CancellationToken cancellationToken);
    void Add(Hotspot hotspot);
    void Remove(Hotspot hotspot);
    void AddTargetParts(IEnumerable<HotspotTargetPart> targetParts);
    void RemoveTargetParts(IEnumerable<HotspotTargetPart> targetParts);
    Task SaveChangesAsync(CancellationToken cancellationToken);
}
