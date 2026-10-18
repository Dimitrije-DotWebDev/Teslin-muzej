using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TeslaMuseum.Domain.Entities;

namespace TeslaMuseum.Infrastructure.Persistence.Configurations;

public sealed class FieldConfigurationConfiguration : IEntityTypeConfiguration<FieldConfiguration>
{
    public void Configure(EntityTypeBuilder<FieldConfiguration> builder)
    {
        builder.ToTable("FieldConfigurations");
        builder.HasKey(field => field.Id);
        builder.Property(field => field.Profile).HasMaxLength(100).IsRequired();
        builder.Property(field => field.ReferencePartId).HasMaxLength(200).IsRequired();
        builder.Property(field => field.RotationPartId).HasMaxLength(200).IsRequired();
        builder.Property(field => field.RotationAxis).HasMaxLength(1).IsRequired();
        builder.HasIndex(field => field.ExhibitId).IsUnique();
        builder.HasOne(field => field.Exhibit)
            .WithOne(exhibit => exhibit.Field)
            .HasForeignKey<FieldConfiguration>(field => field.ExhibitId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
