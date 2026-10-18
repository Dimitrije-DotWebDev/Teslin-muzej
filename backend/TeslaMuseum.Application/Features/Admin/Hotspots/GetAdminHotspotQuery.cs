using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Admin.Hotspots;

public sealed record GetAdminHotspotQuery(Guid ExhibitId, Guid Id) : IRequest<AdminHotspotDto?>;

public sealed class GetAdminHotspotQueryHandler(IHotspotRepository hotspotRepository)
    : IRequestHandler<GetAdminHotspotQuery, AdminHotspotDto?>
{
    public async Task<AdminHotspotDto?> Handle(
        GetAdminHotspotQuery request, CancellationToken cancellationToken)
    {
        var hotspot = await hotspotRepository.GetByIdAsync(
            request.ExhibitId, request.Id, cancellationToken);
        return hotspot?.ToAdminDto();
    }
}
