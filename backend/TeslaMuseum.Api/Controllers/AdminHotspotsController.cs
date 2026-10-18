using MediatR;
using Microsoft.AspNetCore.Mvc;
using TeslaMuseum.Application.Features.Admin.Exhibits;
using TeslaMuseum.Application.Features.Admin.Hotspots;

namespace TeslaMuseum.Api.Controllers;

[ApiController]
[Route("api/admin/exhibits/{exhibitId:guid}/hotspots")]
public sealed class AdminHotspotsController(ISender sender) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<AdminHotspotDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<AdminHotspotDto>>> GetAll(
        Guid exhibitId, CancellationToken cancellationToken)
    {
        var exhibit = await sender.Send(new GetAdminExhibitQuery(exhibitId), cancellationToken);
        if (exhibit is null) return NotFound();

        return Ok(await sender.Send(new GetAdminHotspotsQuery(exhibitId), cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<AdminHotspotDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminHotspotDto>> GetById(
        Guid exhibitId, Guid id, CancellationToken cancellationToken)
    {
        var hotspot = await sender.Send(
            new GetAdminHotspotQuery(exhibitId, id), cancellationToken);
        return hotspot is null ? NotFound() : Ok(hotspot);
    }

    [HttpPost]
    [ProducesResponseType<AdminHotspotDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminHotspotDto>> Create(
        Guid exhibitId, SaveHotspotRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new CreateHotspotCommand(exhibitId, request), cancellationToken);
        if (result.Error != HotspotMutationError.None) return ToActionResult(result);

        return CreatedAtAction(
            nameof(GetById), new { exhibitId, id = result.Hotspot!.Id }, result.Hotspot);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<AdminHotspotDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminHotspotDto>> Update(
        Guid exhibitId, Guid id, SaveHotspotRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new UpdateHotspotCommand(exhibitId, id, request), cancellationToken);
        return ToActionResult(result);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        Guid exhibitId, Guid id, CancellationToken cancellationToken)
    {
        var deleted = await sender.Send(
            new DeleteHotspotCommand(exhibitId, id), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    private ActionResult<AdminHotspotDto> ToActionResult(HotspotMutationResult result)
    {
        return result.Error switch
        {
            HotspotMutationError.None => Ok(result.Hotspot),
            HotspotMutationError.ExhibitNotFound => NotFound(),
            HotspotMutationError.HotspotNotFound => NotFound(),
            HotspotMutationError.DuplicateKey => Conflict(
                new ProblemDetails { Detail = result.Message }),
            HotspotMutationError.InvalidTargetParts => BadRequest(
                new ProblemDetails { Detail = result.Message }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }
}
