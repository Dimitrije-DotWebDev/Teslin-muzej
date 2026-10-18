using MediatR;
using TeslaMuseum.Application.Abstractions;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Application.Features.Admin.Exhibits;

public sealed record CreateExhibitCommand(SaveExhibitRequest Request) : IRequest<ExhibitMutationResult>;

public sealed class CreateExhibitCommandHandler(IExhibitRepository exhibitRepository)
    : IRequestHandler<CreateExhibitCommand, ExhibitMutationResult>
{
    public async Task<ExhibitMutationResult> Handle(
        CreateExhibitCommand command, CancellationToken cancellationToken)
    {
        var request = command.Request;
        if (await exhibitRepository.SlugExistsAsync(request.Slug, null, cancellationToken))
        {
            return new ExhibitMutationResult(null, ExhibitMutationError.DuplicateSlug,
                "An exhibit with this slug already exists.");
        }

        var exhibitId = Guid.NewGuid();
        var field = request.Field?.ToEntity(exhibitId);
        var exhibit = new Exhibit(exhibitId, request.Slug, request.Title, request.Eyebrow,
            request.Description, request.BehaviorType, request.ModelPath, request.ThumbnailPath,
            field, false, request.DisplayOrder);

        exhibitRepository.Add(exhibit);
        await exhibitRepository.SaveChangesAsync(cancellationToken);
        return new ExhibitMutationResult(exhibit.ToAdminDto());
    }
}
