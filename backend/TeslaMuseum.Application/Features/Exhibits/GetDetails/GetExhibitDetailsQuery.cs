using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Exhibits.GetDetails;

public sealed record GetExhibitDetailsQuery(string Id) : IRequest<ExhibitDetailsDto?>;
public sealed record ExhibitDetailsDto(string Id, string Title, string Eyebrow, string Description,
    string BehaviorType, string ModelPath, string? ThumbnailPath, ExhibitFieldDto? Field,
    IReadOnlyList<HotspotDto> Hotspots);
public sealed record ExhibitFieldDto(string Profile, string ReferencePartId, string RotationPartId,
    string? SecondaryReferencePartId, string? SecondaryRotationPartId,
    FieldTransformDto Transform, string RotationAxis, double AngleMultiplier,
    double PhaseOffsetDegrees, EngineeringFieldDto Engineering);
public sealed record FieldTransformDto(FieldVector3Dto Position, FieldVector3Dto Rotation,
    FieldVector3Dto Scale);
public sealed record FieldVector3Dto(double X, double Y, double Z);
public sealed record EngineeringFieldDto(int PhaseCount, int CoilCount, int PolePairs,
    bool ShowVirtualMagnet, bool ShowTorqueVector);
public sealed record HotspotDto(string Id, string Title, string Description, string AnchorPartId,
    Position3DDto LocalPosition, IReadOnlyList<string> TargetPartIds, bool IsEnabled, int DisplayOrder);
public sealed record Position3DDto(double X, double Y, double Z);

public sealed class GetExhibitDetailsQueryHandler(IExhibitRepository exhibitRepository)
    : IRequestHandler<GetExhibitDetailsQuery, ExhibitDetailsDto?>
{
    public async Task<ExhibitDetailsDto?> Handle(
        GetExhibitDetailsQuery request, CancellationToken cancellationToken)
    {
        var exhibit = await exhibitRepository.GetBySlugAsync(request.Id, cancellationToken);
        if (exhibit is null || string.IsNullOrWhiteSpace(exhibit.ModelPath)) return null;

        var field = exhibit.Field is null ? null : new ExhibitFieldDto(
            exhibit.Field.Profile, exhibit.Field.ReferencePartId, exhibit.Field.RotationPartId,
            exhibit.Field.SecondaryReferencePartId, exhibit.Field.SecondaryRotationPartId,
            new FieldTransformDto(
                new FieldVector3Dto(exhibit.Field.PositionX, exhibit.Field.PositionY, exhibit.Field.PositionZ),
                new FieldVector3Dto(exhibit.Field.RotationX, exhibit.Field.RotationY, exhibit.Field.RotationZ),
                new FieldVector3Dto(exhibit.Field.ScaleX, exhibit.Field.ScaleY, exhibit.Field.ScaleZ)),
            exhibit.Field.RotationAxis, exhibit.Field.AngleMultiplier, exhibit.Field.PhaseOffsetDegrees,
            new EngineeringFieldDto(exhibit.Field.PhaseCount, exhibit.Field.CoilCount,
                exhibit.Field.PolePairs, exhibit.Field.ShowVirtualMagnet,
                exhibit.Field.ShowTorqueVector));
        var hotspots = exhibit.Hotspots.OrderBy(hotspot => hotspot.DisplayOrder)
            .Select(hotspot => new HotspotDto(
                hotspot.Key, hotspot.Title, hotspot.Description, hotspot.AnchorPartId,
                new Position3DDto(hotspot.LocalPosition.X, hotspot.LocalPosition.Y, hotspot.LocalPosition.Z),
                hotspot.TargetParts.OrderBy(target => target.DisplayOrder)
                    .Select(target => target.PartId).ToArray(),
                hotspot.IsEnabled, hotspot.DisplayOrder))
            .ToArray();

        return new ExhibitDetailsDto(exhibit.Slug, exhibit.Title, exhibit.Eyebrow,
            exhibit.Description, exhibit.BehaviorType, exhibit.ModelPath, exhibit.ThumbnailPath,
            field, hotspots);
    }
}
