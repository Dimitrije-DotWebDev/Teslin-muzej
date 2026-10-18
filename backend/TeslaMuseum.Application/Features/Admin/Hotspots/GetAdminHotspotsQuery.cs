using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Admin.Hotspots;

public sealed record GetAdminHotspotsQuery(Guid ExhibitId) : IRequest<IReadOnlyList<AdminHotspotDto>>;

public sealed class GetAdminHotspotsQueryHandler(IHotspotRepository hotspotRepository)
    : IRequestHandler<GetAdminHotspotsQuery, IReadOnlyList<AdminHotspotDto>>
{
    public async Task<IReadOnlyList<AdminHotspotDto>> Handle(
        GetAdminHotspotsQuery request, CancellationToken cancellationToken)
    {
        var hotspots = await hotspotRepository.GetForExhibitAsync(request.ExhibitId, cancellationToken);
        return hotspots.Select(hotspot => hotspot.ToAdminDto()).ToArray();
    }
}
