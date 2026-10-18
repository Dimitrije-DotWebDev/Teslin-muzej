using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Admin.Hotspots;

public sealed record DeleteHotspotCommand(Guid ExhibitId, Guid Id) : IRequest<bool>;

public sealed class DeleteHotspotCommandHandler(IHotspotRepository hotspotRepository)
    : IRequestHandler<DeleteHotspotCommand, bool>
{
    public async Task<bool> Handle(
        DeleteHotspotCommand command, CancellationToken cancellationToken)
    {
        var hotspot = await hotspotRepository.GetByIdAsync(
            command.ExhibitId, command.Id, cancellationToken);
        if (hotspot is null) return false;

        hotspotRepository.Remove(hotspot);
        await hotspotRepository.SaveChangesAsync(cancellationToken);
        return true;
    }
}
