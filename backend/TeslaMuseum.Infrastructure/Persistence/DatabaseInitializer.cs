using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Infrastructure.Persistence;

public static class DatabaseInitializer
{
    private static readonly Guid ExhibitId = Guid.Parse("de4502e2-d206-4e89-9a88-f56a0255364a");

    public static async Task InitializeDatabaseAsync(this IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TeslaMuseumDbContext>();
        var isNewDatabase = !(await dbContext.Database.GetAppliedMigrationsAsync()).Any();
        await dbContext.Database.MigrateAsync();

        if (!isNewDatabase || await dbContext.Exhibits.AnyAsync()) return;

        var field = new FieldConfiguration(Guid.Parse("c6c1d78a-bbbc-4458-911a-4938cb7f5357"),
            ExhibitId, "rotating-field", "stator-motora", "rotor-generatora", "z",
            0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 2, 8, 1, true, true);
        var exhibit = new Exhibit(ExhibitId, "two-phase-motor", "Двофазни мотор",
            "Теслин индукциони систем",
            "Теслин двофазни систем приказује стварање обртног магнетног поља и његово дејство на ротор мотора.",
            "two-phase-motor", "/models/TwoPhasesGenerator/glb/TeslinDvofazniMotor.glb", null,
            field, true, 0);

        AddHotspot(exhibit, "11d36f8f-3b82-4764-8c93-bdefd02d8cb6", "motor-windings", "Навоји мотора",
            "Намотаји мотора повезани су са двофазним напајањем. Њихово заједничко деловање ствара обртно магнетно поље.",
            "namotaji-motora-8", new Position3D(27.434277, 75.06204, -118.247152), 0,
            "namotaj-motora-1", "namotaji-motora-2", "namotaji-motora-3", "namotaji-motora-4",
            "namotaji-motora-5", "namotaji-motora-6", "namotaji-motora-7", "namotaji-motora-8");
        AddHotspot(exhibit, "21879012-3729-41ca-9762-5cb5608af689", "motor-rotor", "Ротор мотора",
            "Ротор је покретни део мотора. Деловање магнетног поља доводи до његовог обртања и покретања осовине.",
            "rotor-motora", new Position3D(1.079657, 138.86661, 104.773743), 1, "rotor-motora");
        AddHotspot(exhibit, "39a90ace-5d12-4319-947e-813ff546926a", "motor-stator", "Статор мотора",
            "Статор је непокретни део мотора. У њему су смештени намотаји који стварају магнетно поље око ротора.",
            "stator-motora", new Position3D(141.606995, 73.322006, 46.570443), 2, "stator-motora");
        AddHotspot(exhibit, "48739932-e78d-41d2-86c6-15f1812b6574", "generator-stator", "Статор генератора",
            "Статор је непокретни део генератора. Заједно са ротором учествује у претварању механичке енергије у електричну.",
            "stator-generatora", new Position3D(-127.800817, -106.133028, 0.000016), 3, "stator-generatora");
        AddHotspot(exhibit, "59e7831a-a76b-4406-a926-aec910663b56", "generator-rotor", "Ротор генератора",
            "Ротор је обртни део генератора. Његово кретање учествује у стварању променљивог магнетног флукса.",
            "rotor-generatora", new Position3D(87.135017, 0.000004, 91.429619), 4, "rotor-generatora");
        AddHotspot(exhibit, "6b3d9854-9384-4f8d-8962-989a4e5fd2d5", "conductor", "Проводник",
            "Проводник повезује делове електричног кола и омогућава протицање струје између генератора и мотора.",
            "provodnik", new Position3D(-191.879875, -1.250002, -193.121283), 5, "provodnik");

        dbContext.Exhibits.Add(exhibit);
        await dbContext.SaveChangesAsync();
    }

    private static void AddHotspot(Exhibit exhibit, string id, string key, string title,
        string description, string anchorPartId, Position3D localPosition, int displayOrder,
        params string[] targetPartIds)
    {
        var hotspotId = Guid.Parse(id);
        var hotspot = new Hotspot(hotspotId, exhibit.Id, key, title, description,
            anchorPartId, localPosition, true, displayOrder);

        for (var index = 0; index < targetPartIds.Length; index++)
        {
            hotspot.AddTargetPart(new HotspotTargetPart(Guid.NewGuid(), hotspotId, targetPartIds[index], index));
        }

        exhibit.AddHotspot(hotspot);
    }
}
