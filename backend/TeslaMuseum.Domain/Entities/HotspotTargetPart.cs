namespace TeslaMuseum.Domain.Entities;

public sealed class HotspotTargetPart
{
    private HotspotTargetPart()
    {
    }

    public HotspotTargetPart(Guid id, Guid hotspotId, string partId, int displayOrder)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(partId);
        Id = id;
        HotspotId = hotspotId;
        PartId = partId.Trim();
        DisplayOrder = displayOrder;
    }

    public Guid Id { get; private set; }
    public Guid HotspotId { get; private set; }
    public string PartId { get; private set; } = string.Empty;
    public int DisplayOrder { get; private set; }
    public Hotspot Hotspot { get; private set; } = null!;
}
