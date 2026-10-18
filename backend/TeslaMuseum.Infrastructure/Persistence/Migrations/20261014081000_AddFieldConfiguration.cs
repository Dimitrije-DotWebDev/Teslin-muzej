using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeslaMuseum.Infrastructure.Persistence.Migrations;

[DbContext(typeof(TeslaMuseumDbContext))]
[Migration("20261014081000_AddFieldConfiguration")]
public partial class AddFieldConfiguration : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "FieldConfigurations",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "TEXT", nullable: false),
                ExhibitId = table.Column<Guid>(type: "TEXT", nullable: false),
                Profile = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                ReferencePartId = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                RotationPartId = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                RotationAxis = table.Column<string>(type: "TEXT", maxLength: 1, nullable: false),
                PositionX = table.Column<double>(type: "REAL", nullable: false),
                PositionY = table.Column<double>(type: "REAL", nullable: false),
                PositionZ = table.Column<double>(type: "REAL", nullable: false),
                RotationX = table.Column<double>(type: "REAL", nullable: false),
                RotationY = table.Column<double>(type: "REAL", nullable: false),
                RotationZ = table.Column<double>(type: "REAL", nullable: false),
                ScaleX = table.Column<double>(type: "REAL", nullable: false),
                ScaleY = table.Column<double>(type: "REAL", nullable: false),
                ScaleZ = table.Column<double>(type: "REAL", nullable: false),
                AngleMultiplier = table.Column<double>(type: "REAL", nullable: false),
                PhaseOffsetDegrees = table.Column<double>(type: "REAL", nullable: false),
                PhaseCount = table.Column<int>(type: "INTEGER", nullable: false),
                CoilCount = table.Column<int>(type: "INTEGER", nullable: false),
                PolePairs = table.Column<int>(type: "INTEGER", nullable: false),
                ShowVirtualMagnet = table.Column<bool>(type: "INTEGER", nullable: false),
                ShowTorqueVector = table.Column<bool>(type: "INTEGER", nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_FieldConfigurations", x => x.Id);
                table.ForeignKey(
                    name: "FK_FieldConfigurations_Exhibits_ExhibitId",
                    column: x => x.ExhibitId,
                    principalTable: "Exhibits",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.Sql("""
            INSERT INTO FieldConfigurations
            (Id, ExhibitId, Profile, ReferencePartId, RotationPartId, RotationAxis,
             PositionX, PositionY, PositionZ, RotationX, RotationY, RotationZ,
             ScaleX, ScaleY, ScaleZ, AngleMultiplier, PhaseOffsetDegrees,
             PhaseCount, CoilCount, PolePairs, ShowVirtualMagnet, ShowTorqueVector)
            SELECT
              lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' ||
              '4' || substr(lower(hex(randomblob(2))), 2) || '-' ||
              substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
              lower(hex(randomblob(6))),
              Id, 'rotating-motor', FieldSourcePartId, FieldRotationPartId, 'z',
              0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 2, 8, 1, 1, 1
            FROM Exhibits
            WHERE FieldSourcePartId IS NOT NULL AND FieldRotationPartId IS NOT NULL;
            """);

        migrationBuilder.CreateIndex(
            name: "IX_FieldConfigurations_ExhibitId",
            table: "FieldConfigurations",
            column: "ExhibitId",
            unique: true);

    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            UPDATE Exhibits
            SET FieldSourcePartId = (
                    SELECT ReferencePartId FROM FieldConfigurations
                    WHERE FieldConfigurations.ExhibitId = Exhibits.Id),
                FieldRotationPartId = (
                    SELECT RotationPartId FROM FieldConfigurations
                    WHERE FieldConfigurations.ExhibitId = Exhibits.Id);
            """);

        migrationBuilder.DropTable(name: "FieldConfigurations");
    }
}
