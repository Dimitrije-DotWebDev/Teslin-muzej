using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Infrastructure.Persistence.Configurations;

public sealed class ExhibitConfiguration : IEntityTypeConfiguration<Exhibit>
{
    public void Configure(EntityTypeBuilder<Exhibit> builder)
    {
        builder.ToTable("Exhibits");
        builder.HasKey(exhibit => exhibit.Id);
        builder.Property(exhibit => exhibit.Slug).HasMaxLength(100).IsRequired();
        builder.Property(exhibit => exhibit.Title).HasMaxLength(200).IsRequired();
        builder.Property(exhibit => exhibit.Eyebrow).HasMaxLength(200).IsRequired();
        builder.Property(exhibit => exhibit.Description).HasMaxLength(4000).IsRequired();
        builder.Property(exhibit => exhibit.BehaviorType).HasMaxLength(100).IsRequired();
        builder.Property(exhibit => exhibit.ModelPath).HasMaxLength(1000);
        builder.Property(exhibit => exhibit.ThumbnailPath).HasMaxLength(1000);
        builder.HasIndex(exhibit => exhibit.Slug).IsUnique();
        builder.HasIndex(exhibit => exhibit.DisplayOrder);
    }
}
