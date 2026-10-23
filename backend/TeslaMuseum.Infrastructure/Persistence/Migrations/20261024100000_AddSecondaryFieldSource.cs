using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace TeslaMuseum.Infrastructure.Persistence.Migrations;

[DbContext(typeof(TeslaMuseumDbContext))]
[Migration("20261024100000_AddSecondaryFieldSource")]
public partial class AddSecondaryFieldSource : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "SecondaryReferencePartId",
            table: "FieldConfigurations",
            type: "TEXT",
            maxLength: 200,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "SecondaryRotationPartId",
            table: "FieldConfigurations",
            type: "TEXT",
            maxLength: 200,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "SecondaryReferencePartId",
            table: "FieldConfigurations");

        migrationBuilder.DropColumn(
            name: "SecondaryRotationPartId",
            table: "FieldConfigurations");
    }
}
