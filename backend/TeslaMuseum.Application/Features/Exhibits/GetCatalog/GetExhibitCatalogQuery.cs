using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Exhibits.GetCatalog;

public sealed record GetExhibitCatalogQuery : IRequest<IReadOnlyList<ExhibitCatalogItemDto>>;

public sealed record ExhibitCatalogItemDto(string Id, string Title, string Eyebrow,
    string? ThumbnailPath, bool IsAvailable, int DisplayOrder);

public sealed class GetExhibitCatalogQueryHandler(IExhibitRepository exhibitRepository)
    : IRequestHandler<GetExhibitCatalogQuery, IReadOnlyList<ExhibitCatalogItemDto>>
{
    public async Task<IReadOnlyList<ExhibitCatalogItemDto>> Handle(
        GetExhibitCatalogQuery request, CancellationToken cancellationToken)
    {
        var exhibits = await exhibitRepository.GetCatalogAsync(cancellationToken);
        return exhibits.Select(exhibit => new ExhibitCatalogItemDto(
            exhibit.Slug, exhibit.Title, exhibit.Eyebrow, exhibit.ThumbnailPath,
            exhibit.IsAvailable, exhibit.DisplayOrder)).ToArray();
    }
}
