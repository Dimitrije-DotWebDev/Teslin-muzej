using Microsoft.EntityFrameworkCore;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Infrastructure.Persistence;

public sealed class TeslaMuseumDbContext(DbContextOptions<TeslaMuseumDbContext> options) : DbContext(options)
{
    public DbSet<Exhibit> Exhibits => Set<Exhibit>();
    public DbSet<FieldConfiguration> FieldConfigurations => Set<FieldConfiguration>();
    public DbSet<Hotspot> Hotspots => Set<Hotspot>();
    public DbSet<HotspotTargetPart> HotspotTargetParts => Set<HotspotTargetPart>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TeslaMuseumDbContext).Assembly);
    }
}
