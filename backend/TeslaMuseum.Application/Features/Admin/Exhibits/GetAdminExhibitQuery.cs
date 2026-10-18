using MediatR;
using TeslaMuseum.Application.Abstractions;

namespace TeslaMuseum.Application.Features.Admin.Exhibits;

public sealed record GetAdminExhibitQuery(Guid Id) : IRequest<AdminExhibitDto?>;

public sealed class GetAdminExhibitQueryHandler(IExhibitRepository exhibitRepository)
    : IRequestHandler<GetAdminExhibitQuery, AdminExhibitDto?>
{
    public async Task<AdminExhibitDto?> Handle(
        GetAdminExhibitQuery request, CancellationToken cancellationToken)
    {
        var exhibit = await exhibitRepository.GetByIdAsync(request.Id, cancellationToken);
        return exhibit?.ToAdminDto();
    }
}
