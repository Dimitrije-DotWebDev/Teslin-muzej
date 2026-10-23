namespace TeslaMuseum.Domain.Entities;

public sealed class FieldConfiguration
{
    private static readonly HashSet<string> Profiles =
    [
        "rotating-field",
        "static-dipole",
        "alternating-core",
        "linear-field"
    ];

    private FieldConfiguration()
    {
    }

    public FieldConfiguration(Guid id, Guid exhibitId, string profile, string referencePartId,
        string rotationPartId, string? secondaryReferencePartId, string? secondaryRotationPartId,
        string rotationAxis, double positionX, double positionY,
        double positionZ, double rotationX, double rotationY, double rotationZ, double scaleX,
        double scaleY, double scaleZ, double angleMultiplier, double phaseOffsetDegrees,
        int phaseCount, int coilCount, int polePairs, bool showVirtualMagnet, bool showTorqueVector)
    {
        Id = id;
        ExhibitId = exhibitId;
        Update(profile, referencePartId, rotationPartId, secondaryReferencePartId,
            secondaryRotationPartId, rotationAxis, positionX, positionY,
            positionZ, rotationX, rotationY, rotationZ, scaleX, scaleY, scaleZ,
            angleMultiplier, phaseOffsetDegrees, phaseCount, coilCount, polePairs,
            showVirtualMagnet, showTorqueVector);
    }

    public Guid Id { get; private set; }
    public Guid ExhibitId { get; private set; }
    public Exhibit Exhibit { get; private set; } = null!;
    public string Profile { get; private set; } = string.Empty;
    public string ReferencePartId { get; private set; } = string.Empty;
    public string RotationPartId { get; private set; } = string.Empty;
    public string? SecondaryReferencePartId { get; private set; }
    public string? SecondaryRotationPartId { get; private set; }
    public string RotationAxis { get; private set; } = string.Empty;
    public double PositionX { get; private set; }
    public double PositionY { get; private set; }
    public double PositionZ { get; private set; }
    public double RotationX { get; private set; }
    public double RotationY { get; private set; }
    public double RotationZ { get; private set; }
    public double ScaleX { get; private set; }
    public double ScaleY { get; private set; }
    public double ScaleZ { get; private set; }
    public double AngleMultiplier { get; private set; }
    public double PhaseOffsetDegrees { get; private set; }
    public int PhaseCount { get; private set; }
    public int CoilCount { get; private set; }
    public int PolePairs { get; private set; }
    public bool ShowVirtualMagnet { get; private set; }
    public bool ShowTorqueVector { get; private set; }

    public void Update(string profile, string referencePartId, string rotationPartId,
        string? secondaryReferencePartId, string? secondaryRotationPartId,
        string rotationAxis, double positionX, double positionY, double positionZ,
        double rotationX, double rotationY, double rotationZ, double scaleX, double scaleY,
        double scaleZ, double angleMultiplier, double phaseOffsetDegrees, int phaseCount,
        int coilCount, int polePairs, bool showVirtualMagnet, bool showTorqueVector)
    {
        var normalizedProfile = Require(profile);
        if (!Profiles.Contains(normalizedProfile))
        {
            throw new ArgumentException($"Unsupported field profile: {normalizedProfile}.");
        }

        var normalizedAxis = Require(rotationAxis).ToLowerInvariant();
        if (normalizedAxis is not ("x" or "y" or "z"))
        {
            throw new ArgumentException("Rotation axis must be x, y or z.");
        }

        var numbers = new[]
        {
            positionX, positionY, positionZ, rotationX, rotationY, rotationZ,
            scaleX, scaleY, scaleZ, angleMultiplier, phaseOffsetDegrees
        };
        if (numbers.Any(value => double.IsNaN(value) || double.IsInfinity(value)))
        {
            throw new ArgumentException("Field configuration values must be finite numbers.");
        }
        if (scaleX <= 0 || scaleY <= 0 || scaleZ <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(scaleX), "Field scale must be greater than zero.");
        }
        if (phaseCount is < 1 or > 100 || coilCount is < 1 or > 32 || polePairs is < 1 or > 100)
        {
            throw new ArgumentOutOfRangeException(nameof(phaseCount),
                "Phase, coil and pole-pair counts must be greater than zero.");
        }

        Profile = normalizedProfile;
        ReferencePartId = Require(referencePartId);
        RotationPartId = Require(rotationPartId);
        SecondaryReferencePartId = NormalizeOptional(secondaryReferencePartId);
        SecondaryRotationPartId = NormalizeOptional(secondaryRotationPartId);
        RotationAxis = normalizedAxis;
        PositionX = positionX;
        PositionY = positionY;
        PositionZ = positionZ;
        RotationX = rotationX;
        RotationY = rotationY;
        RotationZ = rotationZ;
        ScaleX = scaleX;
        ScaleY = scaleY;
        ScaleZ = scaleZ;
        AngleMultiplier = angleMultiplier;
        PhaseOffsetDegrees = phaseOffsetDegrees;
        PhaseCount = phaseCount;
        CoilCount = coilCount;
        PolePairs = polePairs;
        ShowVirtualMagnet = showVirtualMagnet;
        ShowTorqueVector = showTorqueVector;
    }

    private static string Require(string value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(value);
        return value.Trim();
    }

    private static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
