using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace TeslaMuseum.Infrastructure.Persistence.Migrations;

[DbContext(typeof(TeslaMuseumDbContext))]
[Migration("20261019090000_RenameRotatingFieldProfile")]
public partial class RenameRotatingFieldProfile : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE FieldConfigurations
            SET Profile = 'rotating-field'
            WHERE Profile = 'rotating-motor';
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE FieldConfigurations
            SET Profile = 'rotating-motor'
            WHERE Profile = 'rotating-field';
            """);
    }
}
