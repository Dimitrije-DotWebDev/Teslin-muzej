namespace TeslaMuseum.Domain.Entities;

public sealed class Exhibit
{
    private Exhibit()
    {
    }

    public Exhibit(Guid id, string slug, string title, string eyebrow, string description,
        string behaviorType, string? modelPath, string? thumbnailPath,
        FieldConfiguration? field, bool isAvailable, int displayOrder)
    {
        Id = id;
        Slug = Require(slug);
        Title = Require(title);
        Eyebrow = Require(eyebrow);
        Description = Require(description);
        BehaviorType = Require(behaviorType);
        ModelPath = modelPath;
        ThumbnailPath = thumbnailPath;
        Field = field;
        IsAvailable = isAvailable;
        DisplayOrder = displayOrder;
    }

    public Guid Id { get; private set; }
    public string Slug { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Eyebrow { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string BehaviorType { get; private set; } = string.Empty;
    public string? ModelPath { get; private set; }
    public string? ThumbnailPath { get; private set; }
    public FieldConfiguration? Field { get; private set; }
    public bool IsAvailable { get; private set; }
    public int DisplayOrder { get; private set; }
    public ICollection<Hotspot> Hotspots { get; private set; } = new List<Hotspot>();

    public void AddHotspot(Hotspot hotspot) => Hotspots.Add(hotspot);

    public void Update(string slug, string title, string eyebrow, string description,
        string behaviorType, string? modelPath, string? thumbnailPath,
        FieldConfiguration? field, int displayOrder)
    {
        if (IsAvailable && (string.IsNullOrWhiteSpace(modelPath) || field is null))
        {
            throw new InvalidOperationException(
                "A published exhibit needs a model path and magnetic field configuration.");
        }
        if (IsAvailable && behaviorType.Trim() == "two-phase-motor" &&
            field?.Profile != "rotating-motor")
        {
            throw new InvalidOperationException(
                "The two-phase motor requires the rotating-motor field profile.");
        }

        Slug = Require(slug);
        Title = Require(title);
        Eyebrow = Require(eyebrow);
        Description = Require(description);
        BehaviorType = Require(behaviorType);
        ModelPath = NormalizeOptional(modelPath);
        ThumbnailPath = NormalizeOptional(thumbnailPath);
        Field = field;
        DisplayOrder = displayOrder;
    }

    public void SetAvailability(bool isAvailable)
    {
        if (isAvailable && (string.IsNullOrWhiteSpace(ModelPath) || Field is null))
        {
            throw new InvalidOperationException(
                "An exhibit needs a model path and magnetic field configuration before it can be published.");
        }
        if (isAvailable && BehaviorType == "two-phase-motor" && Field?.Profile != "rotating-motor")
        {
            throw new InvalidOperationException(
                "The two-phase motor requires the rotating-motor field profile.");
        }

        IsAvailable = isAvailable;
    }

    private static string Require(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        return value.Trim();
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
