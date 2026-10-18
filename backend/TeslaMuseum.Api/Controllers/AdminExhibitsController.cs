using MediatR;
using Microsoft.AspNetCore.Mvc;
using TeslaMuseum.Application.Abstractions;
using TeslaMuseum.Application.Features.Admin.Exhibits;

namespace TeslaMuseum.Api.Controllers;

[ApiController]
[Route("api/admin/exhibits")]
public sealed class AdminExhibitsController(ISender sender, IThumbnailStorage thumbnailStorage,
    IModelStorage modelStorage) : ControllerBase
{
    private const long MaximumThumbnailSize = 5 * 1024 * 1024;
    private const long MaximumThumbnailRequestSize = MaximumThumbnailSize + 64 * 1024;
    private const long MaximumModelSize = 100 * 1024 * 1024;
    private const long MaximumModelRequestSize = MaximumModelSize + 1024 * 1024;

    [HttpGet]
    [ProducesResponseType<IReadOnlyList<AdminExhibitDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminExhibitDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        return Ok(await sender.Send(new GetAdminExhibitsQuery(), cancellationToken));
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType<AdminExhibitDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminExhibitDto>> GetById(
        Guid id, CancellationToken cancellationToken)
    {
        var exhibit = await sender.Send(new GetAdminExhibitQuery(id), cancellationToken);
        return exhibit is null ? NotFound() : Ok(exhibit);
    }

    [HttpPost]
    [ProducesResponseType<AdminExhibitDto>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminExhibitDto>> Create(
        SaveExhibitRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new CreateExhibitCommand(request), cancellationToken);
        if (result.Error == ExhibitMutationError.DuplicateSlug)
        {
            return Conflict(new ProblemDetails { Detail = result.Message });
        }

        return CreatedAtAction(nameof(GetById), new { id = result.Exhibit!.Id }, result.Exhibit);
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType<AdminExhibitDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminExhibitDto>> Update(
        Guid id, SaveExhibitRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new UpdateExhibitCommand(id, request), cancellationToken);
        return ToActionResult(result);
    }

    [HttpPost("thumbnail")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaximumThumbnailRequestSize)]
    [ProducesResponseType<ThumbnailUploadResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ThumbnailUploadResponse>> UploadThumbnail(
        [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0 || file.Length > MaximumThumbnailSize)
        {
            return BadRequest(new ProblemDetails { Detail = "Thumbnail must be between 1 byte and 5 MB." });
        }

        await using var stream = file.OpenReadStream();
        var extension = await DetectImageExtensionAsync(stream, cancellationToken);
        if (extension is null)
        {
            return BadRequest(new ProblemDetails { Detail = "Only JPEG, PNG and WebP images are supported." });
        }

        stream.Position = 0;
        var thumbnailPath = await thumbnailStorage.SaveAsync(stream, extension, cancellationToken);
        return Created(thumbnailPath, new ThumbnailUploadResponse(thumbnailPath));
    }

    [HttpPost("model")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaximumModelRequestSize)]
    [ProducesResponseType<ModelUploadResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ModelUploadResponse>> UploadModel(
        [FromForm] IFormFile file, CancellationToken cancellationToken)
    {
        if (file.Length == 0 || file.Length > MaximumModelSize)
        {
            return BadRequest(new ProblemDetails { Detail = "The GLB model must be between 1 byte and 100 MB." });
        }

        await using var stream = file.OpenReadStream();
        var header = new byte[12];
        var bytesRead = await stream.ReadAsync(header, cancellationToken);
        if (bytesRead < 12 || !header.AsSpan(0, 4).SequenceEqual("glTF"u8) ||
            BitConverter.ToUInt32(header, 4) != 2)
        {
            return BadRequest(new ProblemDetails { Detail = "The selected file is not a valid GLB 2.0 model." });
        }

        stream.Position = 0;
        var modelPath = await modelStorage.SaveAsync(stream, cancellationToken);
        return Created(modelPath, new ModelUploadResponse(modelPath));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await sender.Send(new DeleteExhibitCommand(id), cancellationToken);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/availability")]
    [ProducesResponseType<AdminExhibitDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminExhibitDto>> SetAvailability(
        Guid id, SetExhibitAvailabilityRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(
            new SetExhibitAvailabilityCommand(id, request.IsAvailable), cancellationToken);
        return ToActionResult(result);
    }

    private ActionResult<AdminExhibitDto> ToActionResult(ExhibitMutationResult result)
    {
        return result.Error switch
        {
            ExhibitMutationError.None => Ok(result.Exhibit),
            ExhibitMutationError.NotFound => NotFound(),
            ExhibitMutationError.DuplicateSlug => Conflict(new ProblemDetails { Detail = result.Message }),
            ExhibitMutationError.InvalidState => BadRequest(new ProblemDetails { Detail = result.Message }),
            _ => StatusCode(StatusCodes.Status500InternalServerError)
        };
    }

    private static async Task<string?> DetectImageExtensionAsync(Stream stream,
        CancellationToken cancellationToken)
    {
        var header = new byte[12];
        var bytesRead = await stream.ReadAsync(header, cancellationToken);

        if (bytesRead >= 8 && header.AsSpan(0, 8).SequenceEqual(
                new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }))
        {
            return ".png";
        }

        if (bytesRead >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return ".jpg";
        }

        if (bytesRead >= 12 && header.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
            header.AsSpan(8, 4).SequenceEqual("WEBP"u8))
        {
            return ".webp";
        }

        return null;
    }
}

public sealed record ThumbnailUploadResponse(string ThumbnailPath);
public sealed record ModelUploadResponse(string ModelPath);
