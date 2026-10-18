using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Infrastructure.Persistence.Configurations;

public sealed class HotspotConfiguration : IEntityTypeConfiguration<Hotspot>
{
    public void Configure(EntityTypeBuilder<Hotspot> builder)
    {
        builder.ToTable("Hotspots");
        builder.HasKey(hotspot => hotspot.Id);
        builder.Property(hotspot => hotspot.Key).HasMaxLength(100).IsRequired();
        builder.Property(hotspot => hotspot.Title).HasMaxLength(200).IsRequired();
        builder.Property(hotspot => hotspot.Description).HasMaxLength(4000).IsRequired();
        builder.Property(hotspot => hotspot.AnchorPartId).HasMaxLength(200).IsRequired();
        builder.OwnsOne(hotspot => hotspot.LocalPosition, position =>
        {
            position.Property(value => value.X).HasColumnName("LocalPositionX");
            position.Property(value => value.Y).HasColumnName("LocalPositionY");
            position.Property(value => value.Z).HasColumnName("LocalPositionZ");
        });
        builder.HasIndex(hotspot => new { hotspot.ExhibitId, hotspot.Key }).IsUnique();
        builder.HasOne(hotspot => hotspot.Exhibit)
            .WithMany(exhibit => exhibit.Hotspots)
            .HasForeignKey(hotspot => hotspot.ExhibitId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
