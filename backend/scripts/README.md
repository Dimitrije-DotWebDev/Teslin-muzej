# Register completed exhibits

## Replace and register standard motor models

```powershell
node backend/scripts/sync-motor-models.cjs --check
node backend/scripts/sync-motor-models.cjs --apply
```

This command replaces the two-phase and three-phase model references and registers the magnetic and electromagnetic motors. It uses the exact completed filenames in `client/static/models/`, validates part IDs and animation clips, preserves existing exhibit descriptions and field adjustments where references remain valid, and remaps hotspot IDs to the new model parts. Hotspot anchor positions are recalculated in the new geometry's local coordinates. All four fields follow `rotor-motora` around model Z.

Models are uploaded through the backend API; identical model bytes reuse the existing upload. Original admin configurations and hotspots are backed up under `scripts/backups/` before any mutation. Existing upload files are retained. Re-running updates existing slugs instead of duplicating entries. New exhibits are published after their hotspots are saved; existing availability choices are preserved.

## Register symmetric motor and transformer

Start the backend, then run from the repository root with Node.js 18 or newer:

```powershell
node backend/scripts/register-completed-exhibits.cjs --check
node backend/scripts/register-completed-exhibits.cjs --apply
```

The script registers `symmetric-motor` and `transformer` through the admin API:

- Validates source GLB part IDs and required animation clips before writes.
- Uploads GLBs into backend-managed `/uploads/models/` storage.
- Creates descriptions, behavior-specific field configuration and five hotspots per exhibit.
- Derives hotspot anchors from local geometry bounds.
- Checks the stored GLB's SHA-256 before making the exhibit available.
- Verifies public catalog/details responses.

Existing slugs are skipped, preserving manual edits and avoiding duplicate uploads. If an import fails after creating an exhibit, it remains unavailable; inspect and finish that entry through the admin panel before publishing it.

Default API: `http://localhost:5095/api`. Override with `TESLA_MUSEUM_API_URL`.

Field transforms are initial placements based on the exported geometry. Refine them in the admin field editor as needed; rerunning this script preserves those edits. The symmetric motor uses the two rotor centers as field references and reads their inherited rotation around model Z. The transformer uses `okvir-transformatora` as its field reference and the `alternating-core` profile. Its bulb/tube IDs are consumed by `TransformerLighting`.

This is an explicit import, not an automatic startup seed, so deleting an exhibit in the admin panel does not recreate it on backend restart.
