using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TeslaMuseum.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Exhibits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Eyebrow = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    BehaviorType = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    ModelPath = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    ThumbnailPath = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    FieldSourcePartId = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    FieldRotationPartId = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    IsAvailable = table.Column<bool>(type: "INTEGER", nullable: false),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Exhibits", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Hotspots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ExhibitId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Key = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 4000, nullable: false),
                    AnchorPartId = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    LocalPositionX = table.Column<double>(type: "REAL", nullable: false),
                    LocalPositionY = table.Column<double>(type: "REAL", nullable: false),
                    LocalPositionZ = table.Column<double>(type: "REAL", nullable: false),
                    IsEnabled = table.Column<bool>(type: "INTEGER", nullable: false),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Hotspots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Hotspots_Exhibits_ExhibitId",
                        column: x => x.ExhibitId,
                        principalTable: "Exhibits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HotspotTargetParts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    HotspotId = table.Column<Guid>(type: "TEXT", nullable: false),
                    PartId = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    DisplayOrder = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HotspotTargetParts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HotspotTargetParts_Hotspots_HotspotId",
                        column: x => x.HotspotId,
                        principalTable: "Hotspots",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Exhibits_DisplayOrder",
                table: "Exhibits",
                column: "DisplayOrder");

            migrationBuilder.CreateIndex(
                name: "IX_Exhibits_Slug",
                table: "Exhibits",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Hotspots_ExhibitId_Key",
                table: "Hotspots",
                columns: new[] { "ExhibitId", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HotspotTargetParts_HotspotId_PartId",
                table: "HotspotTargetParts",
                columns: new[] { "HotspotId", "PartId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HotspotTargetParts");

            migrationBuilder.DropTable(
                name: "Hotspots");

            migrationBuilder.DropTable(
                name: "Exhibits");
        }
    }
}
