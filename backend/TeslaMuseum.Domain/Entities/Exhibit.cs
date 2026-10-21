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
        if (IsAvailable) ValidatePublishedBehavior(behaviorType, field);

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
        if (isAvailable) ValidatePublishedBehavior(BehaviorType, Field);

        IsAvailable = isAvailable;
    }

    private static string Require(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        return value.Trim();
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static bool IsRotatingMotor(string behaviorType) =>
        behaviorType.Trim() is "two-phase-motor" or "three-phase-motor";

    private static void ValidatePublishedBehavior(string behaviorType, FieldConfiguration? field)
    {
        var normalizedBehavior = behaviorType.Trim();
        if (!IsRotatingMotor(normalizedBehavior))
        {
            throw new InvalidOperationException(
                $"Behavior type '{normalizedBehavior}' is not implemented yet.");
        }
        if (field?.Profile != "rotating-field")
        {
            throw new InvalidOperationException(
                "A rotating motor requires the rotating-field profile.");
        }

        var requiredPhaseCount = normalizedBehavior == "three-phase-motor" ? 3 : 2;
        if (field.PhaseCount != requiredPhaseCount)
        {
            throw new InvalidOperationException(
                $"The selected motor requires phaseCount = {requiredPhaseCount}.");
        }
    }
}
