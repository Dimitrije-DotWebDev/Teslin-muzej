using MediatR;
using TeslaMuseum.Application.Abstractions;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Application.Features.Admin.Hotspots;

public sealed record CreateHotspotCommand(Guid ExhibitId, SaveHotspotRequest Request)
    : IRequest<HotspotMutationResult>;

public sealed class CreateHotspotCommandHandler(
    IExhibitRepository exhibitRepository, IHotspotRepository hotspotRepository)
    : IRequestHandler<CreateHotspotCommand, HotspotMutationResult>
{
    public async Task<HotspotMutationResult> Handle(
        CreateHotspotCommand command, CancellationToken cancellationToken)
    {
        if (await exhibitRepository.GetByIdAsync(command.ExhibitId, cancellationToken) is null)
        {
            return new HotspotMutationResult(null, HotspotMutationError.ExhibitNotFound);
        }

        var request = command.Request;
        if (await hotspotRepository.KeyExistsAsync(
                command.ExhibitId, request.Key, null, cancellationToken))
        {
            return new HotspotMutationResult(null, HotspotMutationError.DuplicateKey,
                "A hotspot with this key already exists for the exhibit.");
        }

        var hotspot = new Hotspot(Guid.NewGuid(), command.ExhibitId, request.Key,
            request.Title, request.Description, request.AnchorPartId,
            new Position3D(request.LocalPosition!.X, request.LocalPosition.Y, request.LocalPosition.Z),
            request.IsEnabled, request.DisplayOrder);

        try
        {
            hotspot.ReplaceTargetParts(request.TargetPartIds);
        }
        catch (ArgumentException exception)
        {
            return new HotspotMutationResult(
                null, HotspotMutationError.InvalidTargetParts, exception.Message);
        }

        hotspotRepository.Add(hotspot);
        await hotspotRepository.SaveChangesAsync(cancellationToken);
        return new HotspotMutationResult(hotspot.ToAdminDto());
    }
}
