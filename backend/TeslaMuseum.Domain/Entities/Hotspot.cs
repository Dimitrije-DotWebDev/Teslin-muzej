namespace TeslaMuseum.Domain.Entities;

public sealed class Hotspot
{
    private Hotspot()
    {
    }

    public Hotspot(Guid id, Guid exhibitId, string key, string title, string description,
        string anchorPartId, Position3D localPosition, bool isEnabled, int displayOrder)
    {
        Id = id;
        ExhibitId = exhibitId;
        Key = Require(key);
        Title = Require(title);
        Description = Require(description);
        AnchorPartId = Require(anchorPartId);
        LocalPosition = localPosition;
        IsEnabled = isEnabled;
        DisplayOrder = displayOrder;
    }

    public Guid Id { get; private set; }
    public Guid ExhibitId { get; private set; }
    public string Key { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string AnchorPartId { get; private set; } = string.Empty;
    public Position3D LocalPosition { get; private set; } = null!;
    public bool IsEnabled { get; private set; }
    public int DisplayOrder { get; private set; }
    public Exhibit Exhibit { get; private set; } = null!;
    public ICollection<HotspotTargetPart> TargetParts { get; private set; } = new List<HotspotTargetPart>();

    public void AddTargetPart(HotspotTargetPart targetPart) => TargetParts.Add(targetPart);

    public void Update(string key, string title, string description, string anchorPartId,
        Position3D localPosition, bool isEnabled, int displayOrder)
    {
        Key = Require(key);
        Title = Require(title);
        Description = Require(description);
        AnchorPartId = Require(anchorPartId);
        LocalPosition.Update(localPosition.X, localPosition.Y, localPosition.Z);
        IsEnabled = isEnabled;
        DisplayOrder = displayOrder;
    }

    public void ReplaceTargetParts(IEnumerable<string> partIds)
    {
        TargetParts.Clear();
        var normalizedPartIds = partIds
            .Where(partId => !string.IsNullOrWhiteSpace(partId))
            .Select(partId => partId.Trim())
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        if (normalizedPartIds.Length == 0)
        {
            throw new ArgumentException("At least one target part is required.", nameof(partIds));
        }

        for (var index = 0; index < normalizedPartIds.Length; index++)
        {
            AddTargetPart(new HotspotTargetPart(Guid.NewGuid(), Id, normalizedPartIds[index], index));
        }
    }

    private static string Require(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        return value.Trim();
    }
}
