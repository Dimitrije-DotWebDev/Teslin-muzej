using System.ComponentModel.DataAnnotations;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Application.Features.Admin.Exhibits;

public sealed record AdminExhibitDto(Guid Id, string Slug, string Title, string Eyebrow,
    string Description, string BehaviorType, string? ModelPath, string? ThumbnailPath,
    FieldConfigurationDto? Field, bool IsAvailable, int DisplayOrder);

public sealed record FieldConfigurationDto(string Profile, string ReferencePartId,
    string RotationPartId, string? SecondaryReferencePartId, string? SecondaryRotationPartId,
    FieldTransformDto Transform, string RotationAxis,
    double AngleMultiplier, double PhaseOffsetDegrees, EngineeringFieldDto Engineering);
public sealed record FieldTransformDto(FieldVector3Dto Position, FieldVector3Dto Rotation,
    FieldVector3Dto Scale);
public sealed record FieldVector3Dto(double X, double Y, double Z);
public sealed record EngineeringFieldDto(int PhaseCount, int CoilCount, int PolePairs,
    bool ShowVirtualMagnet, bool ShowTorqueVector);

public sealed class SaveExhibitRequest
{
    [Required, MaxLength(100), RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    public string Slug { get; init; } = string.Empty;

    [Required, MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    [Required, MaxLength(200)]
    public string Eyebrow { get; init; } = string.Empty;

    [Required, MaxLength(4000)]
    public string Description { get; init; } = string.Empty;

    [Required, MaxLength(100)]
    public string BehaviorType { get; init; } = string.Empty;

    [MaxLength(1000)]
    public string? ModelPath { get; init; }

    [MaxLength(1000)]
    public string? ThumbnailPath { get; init; }

    public SaveFieldConfigurationRequest? Field { get; init; }

    [Range(0, int.MaxValue)]
    public int DisplayOrder { get; init; }
}

public sealed class SaveFieldConfigurationRequest
{
    [Required, RegularExpression("^(rotating-field|static-dipole|alternating-core|linear-field)$")]
    public string Profile { get; init; } = string.Empty;

    [Required, MaxLength(200)]
    public string ReferencePartId { get; init; } = string.Empty;

    [Required, MaxLength(200)]
    public string RotationPartId { get; init; } = string.Empty;

    [MaxLength(200)]
    public string? SecondaryReferencePartId { get; init; }

    [MaxLength(200)]
    public string? SecondaryRotationPartId { get; init; }

    [Required]
    public SaveFieldTransformRequest Transform { get; init; } = new();

    [Required, RegularExpression("^[xyzXYZ]$")]
    public string RotationAxis { get; init; } = "z";

    public double AngleMultiplier { get; init; } = 1;
    public double PhaseOffsetDegrees { get; init; }

    [Required]
    public SaveEngineeringFieldRequest Engineering { get; init; } = new();
}

public sealed class SaveFieldTransformRequest
{
    [Required]
    public SaveFieldVector3Request Position { get; init; } = new();

    [Required]
    public SaveFieldVector3Request Rotation { get; init; } = new();

    [Required]
    public SaveFieldScaleRequest Scale { get; init; } = new();
}

public class SaveFieldVector3Request
{
    public double X { get; init; }
    public double Y { get; init; }
    public double Z { get; init; }
}

public sealed class SaveFieldScaleRequest
{
    [Range(0.000001, double.MaxValue)]
    public double X { get; init; } = 1;

    [Range(0.000001, double.MaxValue)]
    public double Y { get; init; } = 1;

    [Range(0.000001, double.MaxValue)]
    public double Z { get; init; } = 1;
}

public sealed class SaveEngineeringFieldRequest
{
    [Range(1, 100)]
    public int PhaseCount { get; init; } = 2;

    [Range(1, 32)]
    public int CoilCount { get; init; } = 8;

    [Range(1, 100)]
    public int PolePairs { get; init; } = 1;

    public bool ShowVirtualMagnet { get; init; } = true;
    public bool ShowTorqueVector { get; init; } = true;
}

public sealed record SetExhibitAvailabilityRequest(bool IsAvailable);

public enum ExhibitMutationError
{
    None,
    NotFound,
    DuplicateSlug,
    InvalidState
}

public sealed record ExhibitMutationResult(
    AdminExhibitDto? Exhibit, ExhibitMutationError Error = ExhibitMutationError.None, string? Message = null);

public static class AdminExhibitMapping
{
    public static AdminExhibitDto ToAdminDto(this Exhibit exhibit) => new(
        exhibit.Id, exhibit.Slug, exhibit.Title, exhibit.Eyebrow, exhibit.Description,
        exhibit.BehaviorType, exhibit.ModelPath, exhibit.ThumbnailPath,
        exhibit.Field?.ToDto(),
        exhibit.IsAvailable, exhibit.DisplayOrder);

    public static FieldConfigurationDto ToDto(this FieldConfiguration field) => new(
        field.Profile, field.ReferencePartId, field.RotationPartId,
        field.SecondaryReferencePartId, field.SecondaryRotationPartId,
        new FieldTransformDto(
            new FieldVector3Dto(field.PositionX, field.PositionY, field.PositionZ),
            new FieldVector3Dto(field.RotationX, field.RotationY, field.RotationZ),
            new FieldVector3Dto(field.ScaleX, field.ScaleY, field.ScaleZ)),
        field.RotationAxis, field.AngleMultiplier, field.PhaseOffsetDegrees,
        new EngineeringFieldDto(field.PhaseCount, field.CoilCount, field.PolePairs,
            field.ShowVirtualMagnet, field.ShowTorqueVector));

    public static FieldConfiguration ToEntity(this SaveFieldConfigurationRequest request,
        Guid exhibitId, Guid? id = null) => new(
        id ?? Guid.NewGuid(), exhibitId, request.Profile, request.ReferencePartId,
        request.RotationPartId, request.SecondaryReferencePartId,
        request.SecondaryRotationPartId, request.RotationAxis,
        request.Transform.Position.X, request.Transform.Position.Y, request.Transform.Position.Z,
        request.Transform.Rotation.X, request.Transform.Rotation.Y, request.Transform.Rotation.Z,
        request.Transform.Scale.X, request.Transform.Scale.Y, request.Transform.Scale.Z,
        request.AngleMultiplier, request.PhaseOffsetDegrees,
        request.Engineering.PhaseCount, request.Engineering.CoilCount,
        request.Engineering.PolePairs, request.Engineering.ShowVirtualMagnet,
        request.Engineering.ShowTorqueVector);

    public static void ApplyTo(this SaveFieldConfigurationRequest request,
        FieldConfiguration field) => field.Update(
        request.Profile, request.ReferencePartId, request.RotationPartId,
        request.SecondaryReferencePartId, request.SecondaryRotationPartId, request.RotationAxis,
        request.Transform.Position.X, request.Transform.Position.Y, request.Transform.Position.Z,
        request.Transform.Rotation.X, request.Transform.Rotation.Y, request.Transform.Rotation.Z,
        request.Transform.Scale.X, request.Transform.Scale.Y, request.Transform.Scale.Z,
        request.AngleMultiplier, request.PhaseOffsetDegrees,
        request.Engineering.PhaseCount, request.Engineering.CoilCount,
        request.Engineering.PolePairs, request.Engineering.ShowVirtualMagnet,
        request.Engineering.ShowTorqueVector);
}
