using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Admin.Exhibits;

public sealed record SetExhibitAvailabilityCommand(Guid Id, bool IsAvailable) : IRequest<ExhibitMutationResult>;

public sealed class SetExhibitAvailabilityCommandHandler(IExhibitRepository exhibitRepository)
    : IRequestHandler<SetExhibitAvailabilityCommand, ExhibitMutationResult>
{
    public async Task<ExhibitMutationResult> Handle(
        SetExhibitAvailabilityCommand command, CancellationToken cancellationToken)
    {
        var exhibit = await exhibitRepository.GetByIdAsync(command.Id, cancellationToken);
        if (exhibit is null)
        {
            return new ExhibitMutationResult(null, ExhibitMutationError.NotFound);
        }

        try
        {
            exhibit.SetAvailability(command.IsAvailable);
        }
        catch (InvalidOperationException exception)
        {
            return new ExhibitMutationResult(null, ExhibitMutationError.InvalidState, exception.Message);
        }

        await exhibitRepository.SaveChangesAsync(cancellationToken);
        return new ExhibitMutationResult(exhibit.ToAdminDto());
    }
}
