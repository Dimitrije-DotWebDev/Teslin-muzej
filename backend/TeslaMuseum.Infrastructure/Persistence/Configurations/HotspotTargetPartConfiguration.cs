using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Infrastructure.Persistence.Configurations;

public sealed class HotspotTargetPartConfiguration : IEntityTypeConfiguration<HotspotTargetPart>
{
    public void Configure(EntityTypeBuilder<HotspotTargetPart> builder)
    {
        builder.ToTable("HotspotTargetParts");
        builder.HasKey(target => target.Id);
        builder.Property(target => target.PartId).HasMaxLength(200).IsRequired();
        builder.HasIndex(target => new { target.HotspotId, target.PartId }).IsUnique();
        builder.HasOne(target => target.Hotspot)
            .WithMany(hotspot => hotspot.TargetParts)
            .HasForeignKey(target => target.HotspotId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
