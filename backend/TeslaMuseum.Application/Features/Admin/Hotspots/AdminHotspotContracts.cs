using System.ComponentModel.DataAnnotations;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Application.Features.Admin.Hotspots;

public sealed record AdminHotspotDto(Guid Id, Guid ExhibitId, string Key, string Title,
    string Description, string AnchorPartId, AdminPosition3DDto LocalPosition,
    IReadOnlyList<string> TargetPartIds, bool IsEnabled, int DisplayOrder);

public sealed record AdminPosition3DDto(double X, double Y, double Z);

public sealed class SaveHotspotRequest
{
    [Required, MaxLength(100), RegularExpression("^[a-z0-9]+(?:-[a-z0-9]+)*$")]
    public string Key { get; init; } = string.Empty;

    [Required, MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    [Required, MaxLength(4000)]
    public string Description { get; init; } = string.Empty;

    [Required, MaxLength(200)]
    public string AnchorPartId { get; init; } = string.Empty;

    [Required]
    public SavePosition3DRequest? LocalPosition { get; init; }

    [Required, MinLength(1)]
    public List<string> TargetPartIds { get; init; } = [];

    public bool IsEnabled { get; init; } = true;

    [Range(0, int.MaxValue)]
    public int DisplayOrder { get; init; }
}

public sealed class SavePosition3DRequest
{
    public double X { get; init; }
    public double Y { get; init; }
    public double Z { get; init; }
}

public enum HotspotMutationError
{
    None,
    ExhibitNotFound,
    HotspotNotFound,
    DuplicateKey,
    InvalidTargetParts
}

public sealed record HotspotMutationResult(
    AdminHotspotDto? Hotspot, HotspotMutationError Error = HotspotMutationError.None,
    string? Message = null);

public static class AdminHotspotMapping
{
    public static AdminHotspotDto ToAdminDto(this Hotspot hotspot) => new(
        hotspot.Id, hotspot.ExhibitId, hotspot.Key, hotspot.Title, hotspot.Description,
        hotspot.AnchorPartId,
        new AdminPosition3DDto(
            hotspot.LocalPosition.X, hotspot.LocalPosition.Y, hotspot.LocalPosition.Z),
        hotspot.TargetParts.OrderBy(target => target.DisplayOrder)
            .Select(target => target.PartId).ToArray(),
        hotspot.IsEnabled, hotspot.DisplayOrder);
}
