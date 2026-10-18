using MediatR;
using TeslaMuseum.Application.Abstractions;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Application.Features.Admin.Hotspots;

public sealed record UpdateHotspotCommand(Guid ExhibitId, Guid Id, SaveHotspotRequest Request)
    : IRequest<HotspotMutationResult>;

public sealed class UpdateHotspotCommandHandler(IHotspotRepository hotspotRepository)
    : IRequestHandler<UpdateHotspotCommand, HotspotMutationResult>
{
    public async Task<HotspotMutationResult> Handle(
        UpdateHotspotCommand command, CancellationToken cancellationToken)
    {
        var hotspot = await hotspotRepository.GetByIdAsync(
            command.ExhibitId, command.Id, cancellationToken);
        if (hotspot is null)
        {
            return new HotspotMutationResult(null, HotspotMutationError.HotspotNotFound);
        }

        var request = command.Request;
        if (await hotspotRepository.KeyExistsAsync(
                command.ExhibitId, request.Key, command.Id, cancellationToken))
        {
            return new HotspotMutationResult(null, HotspotMutationError.DuplicateKey,
                "A hotspot with this key already exists for the exhibit.");
        }

        hotspot.Update(request.Key, request.Title, request.Description, request.AnchorPartId,
            new Position3D(request.LocalPosition!.X, request.LocalPosition.Y, request.LocalPosition.Z),
            request.IsEnabled, request.DisplayOrder);

        var previousTargetParts = hotspot.TargetParts.ToArray();
        try
        {
            hotspot.ReplaceTargetParts(request.TargetPartIds);
        }
        catch (ArgumentException exception)
        {
            return new HotspotMutationResult(
                null, HotspotMutationError.InvalidTargetParts, exception.Message);
        }

        hotspotRepository.RemoveTargetParts(previousTargetParts);
        hotspotRepository.AddTargetParts(hotspot.TargetParts);

        await hotspotRepository.SaveChangesAsync(cancellationToken);
        return new HotspotMutationResult(hotspot.ToAdminDto());
    }
}
