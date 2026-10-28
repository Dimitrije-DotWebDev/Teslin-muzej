# Magnetic field configuration contract

Magnetic field placement and visualization parameters are stored in the backend and edited through the admin panel. The GLB model only needs stable `museumPartId` values and behavior-specific animation names.

## API representation

```json
{
  "profile": "rotating-field",
  "referencePartId": "stator-motora",
  "rotationPartId": "rotor-generatora",
  "secondaryReferencePartId": null,
  "secondaryRotationPartId": null,
  "transform": {
    "position": { "x": 0, "y": 0, "z": 0 },
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "scale": { "x": 1, "y": 1, "z": 1 }
  },
  "rotationAxis": "z",
  "angleMultiplier": 1,
  "phaseOffsetDegrees": 0,
  "engineering": {
    "phaseCount": 2,
    "coilCount": 8,
    "polePairs": 1,
    "showVirtualMagnet": true,
    "showTorqueVector": true
  }
}
```

## Common placement

`referencePartId` supplies the world position around which the field is placed. The configured position is an offset in exhibit coordinates. Rotation uses degrees and scale must contain positive values. Artistic and engineering renderers share this transform.

## Rotation coupling

`rotationPartId` identifies the animated part that drives the magnetic field. For the current motor exhibits this is the generator rotor. The runtime reads the selected local rotation axis and calculates both angle and angular velocity from consecutive animation frames.

The symmetric motor also uses `secondaryReferencePartId` and `secondaryRotationPartId`. They identify the placement reference and rotor for the second machine. The same configured transform is applied relative to the active reference while the generator and motor roles alternate.

The displayed angle is:

```text
rotationPart angle × angleMultiplier + phaseOffsetDegrees
```

Changing animation speed, direction or power is reflected automatically in both field renderers.

## Profiles

Supported configuration values are:

- `rotating-field`
- `static-dipole`
- `alternating-core`
- `linear-field`

The two-phase, three-phase, magnetic, electromagnetic and symmetric motor behaviors use `rotating-field`. The transformer uses `alternating-core`.

## Engineering parameters

`phaseCount` defines electrical phase separation. Two phases use 90 degrees, while systems with three or more phases use `360 / phaseCount` degrees. `coilCount` is limited to 32. `polePairs` converts the tracked mechanical rotor angle into the electrical field angle and controls the number of pole repetitions in the artistic view.

For `two-phase-motor`, `phaseCount` must be `2`. For `three-phase-motor`, it must be `3`. The admin panel sets default coil counts to `8` and `6` respectively, and they can be adjusted to match the model.

For `symmetric-motor`, both secondary identifiers are required. Primary identifiers describe motor 1 and secondary identifiers describe motor 2. The user selects the generator; roles do not switch automatically. The field uses the driven motor's reference and rotation source, keeping the same transform parameters relative to the selected reference. Its angle follows the driven rotor during acceleration, reversal and stopping, including rotation inherited from an Empty parent. During the visible field stage before the motor starts, the field remains stationary with the driven rotor.

The GLB must contain looping `motor-1` and `motor-2` clips and one-shot `pokretanje-motor-1` and `pokretanje-motor-2` clips (`pokretanje-motora-1/2` is also accepted). Only the selected generator plays its startup clip, holding the final pose, then starts rotating. After 1.5 seconds its field appears at the other motor; 0.75 seconds later that motor starts without a startup clip. Other GLB clips, including legacy `Take 001`, are not played. Changing generator restarts this sequence; switching power off cancels pending starts and freezes the animations. Powering on uses the selected generator. Polarity changes apply to the driven motor only, after its delayed start.

For `transformer`, `frequency` controls the alternating flux animation. No GLB animation is required. The artistic view shows circulating flux around the core, while the engineering view shows direction arrows and primary and secondary winding activity.

The virtual magnet and torque vector can be hidden independently without changing the artistic view.

## Admin workflow

1. Load the GLB model.
2. Select a reference part.
3. Select the animated part that drives the field, normally the generator rotor.
4. Move, rotate and scale the field proxy with the gizmo.
5. Switch between artistic and engineering preview.
6. Set phase and engineering parameters.
7. Save the exhibit.

For a symmetric motor, repeat steps 2 and 3 with the secondary reference and source controls before saving.
