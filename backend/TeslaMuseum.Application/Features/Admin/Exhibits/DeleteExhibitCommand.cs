using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Admin.Exhibits;

public sealed record DeleteExhibitCommand(Guid Id) : IRequest<bool>;

public sealed class DeleteExhibitCommandHandler(IExhibitRepository exhibitRepository)
    : IRequestHandler<DeleteExhibitCommand, bool>
{
    public async Task<bool> Handle(DeleteExhibitCommand command, CancellationToken cancellationToken)
    {
        var exhibit = await exhibitRepository.GetByIdAsync(command.Id, cancellationToken);
        if (exhibit is null) return false;

        exhibitRepository.Remove(exhibit);
        await exhibitRepository.SaveChangesAsync(cancellationToken);
        return true;
    }
}
