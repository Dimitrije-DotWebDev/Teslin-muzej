using MediatR;
using Microsoft.AspNetCore.Mvc;
using TeslaMuseum.Application.Features.Exhibits.GetCatalog;
using TeslaMuseum.Application.Features.Exhibits.GetDetails;

namespace TeslaMuseum.Api.Controllers;

[ApiController]
[Route("api/exhibits")]
public sealed class ExhibitsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<ExhibitCatalogItemDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<ExhibitCatalogItemDto>>> GetCatalog(CancellationToken cancellationToken)
    {
        var exhibits = await sender.Send(new GetExhibitCatalogQuery(), cancellationToken);
        return Ok(exhibits);
    }

    [HttpGet("{id}")]
    [ProducesResponseType<ExhibitDetailsDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ExhibitDetailsDto>> GetById(string id, CancellationToken cancellationToken)
    {
        var exhibit = await sender.Send(new GetExhibitDetailsQuery(id), cancellationToken);
        return exhibit is null ? NotFound() : Ok(exhibit);
    }
}
