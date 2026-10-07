# Body camera

Implement this. Do not expand scope.

Replace the rebuild-every-frame SVG in `src/components/OrganDiagram.js`.

## Look

- Background `#070b14`.
- Torso and ribs: thin cyan wireframe, stroke `#37d6e8` at 0.35 opacity. Draw once.
- Vessels: aorta, heart, and branches to the active organ only. Arteries `#e23b3b`, veins `#3b7de2`. No capillary tree.
- Active organ amber `#e8a317` with a soft glow. Fork 1 organ is the liver.
- Label `ALCOHOL LOAD`. Claim: alcohol load on a first heavy night. No cure, no diagnosis.
- Type: ui-monospace. Labels 11px `#7f93a3`. Value 28px `#e8eef2`.

## Rules

- `render()` must not wipe `innerHTML` and recreate every node.
- Pulse is opacity only, 2.4s. No CSS filters, no particles, no per-frame layout.
- Keep `render(activeOrgans)` and `pulse(organKey)`.
- No Three.js, no Unreal, no MRI, no full BodyParts3D download in this task.
- Later meshes, if any, only Z-Anatomy / BodyParts3D, CC BY-SA, with attribution. Derived meshes stay CC BY-SA.
- Constellation map stays untouched.

Branch: `body-camera-look`.
