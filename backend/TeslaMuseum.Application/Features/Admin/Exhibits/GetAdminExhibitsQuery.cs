using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Admin.Exhibits;

public sealed record GetAdminExhibitsQuery : IRequest<IReadOnlyList<AdminExhibitDto>>;

public sealed class GetAdminExhibitsQueryHandler(IExhibitRepository exhibitRepository)
    : IRequestHandler<GetAdminExhibitsQuery, IReadOnlyList<AdminExhibitDto>>
{
    public async Task<IReadOnlyList<AdminExhibitDto>> Handle(
        GetAdminExhibitsQuery request, CancellationToken cancellationToken)
    {
        var exhibits = await exhibitRepository.GetAllAsync(cancellationToken);
        return exhibits.Select(exhibit => exhibit.ToAdminDto()).ToArray();
    }
}
