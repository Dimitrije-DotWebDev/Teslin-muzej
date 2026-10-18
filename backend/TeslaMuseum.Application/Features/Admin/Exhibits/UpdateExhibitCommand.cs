using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Admin.Exhibits;

public sealed record UpdateExhibitCommand(Guid Id, SaveExhibitRequest Request) : IRequest<ExhibitMutationResult>;

public sealed class UpdateExhibitCommandHandler(IExhibitRepository exhibitRepository)
    : IRequestHandler<UpdateExhibitCommand, ExhibitMutationResult>
{
    public async Task<ExhibitMutationResult> Handle(
        UpdateExhibitCommand command, CancellationToken cancellationToken)
    {
        var exhibit = await exhibitRepository.GetByIdAsync(command.Id, cancellationToken);
        if (exhibit is null)
        {
            return new ExhibitMutationResult(null, ExhibitMutationError.NotFound);
        }

        var request = command.Request;
        if (await exhibitRepository.SlugExistsAsync(request.Slug, command.Id, cancellationToken))
        {
            return new ExhibitMutationResult(null, ExhibitMutationError.DuplicateSlug,
                "An exhibit with this slug already exists.");
        }

        try
        {
            var field = request.Field is null
                ? null
                : exhibit.Field ?? request.Field.ToEntity(exhibit.Id);
            if (request.Field is not null && exhibit.Field is not null)
            {
                request.Field.ApplyTo(exhibit.Field);
            }
            exhibit.Update(request.Slug, request.Title, request.Eyebrow, request.Description,
                request.BehaviorType, request.ModelPath, request.ThumbnailPath,
                field, request.DisplayOrder);
        }
        catch (InvalidOperationException exception)
        {
            return new ExhibitMutationResult(null, ExhibitMutationError.InvalidState, exception.Message);
        }

        await exhibitRepository.SaveChangesAsync(cancellationToken);
        return new ExhibitMutationResult(exhibit.ToAdminDto());
    }
}
