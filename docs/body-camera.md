# Body camera

The liver beat is a small WebGL view, not a flat plate.

- Background `#070b14`.
- Real BodyParts3D meshes (the Z-Anatomy source set), CC BY 4.0, already reduced and packed in `public/assets/body/camera/torso.bin`.
- Ribs are a thin cyan cage. Heart and aorta are red. Veins are blue. The liver is amber and is the only part that glows.
- One custom light shader. No bloom pass, no shadow map, no full atlas.
- The model turns on its own. Dragging it orbits. `render()` does not wipe the canvas. `pulse()` only raises the liver glow for 2.4s.
- Label `ALCOHOL LOAD`.

Constellation map stays untouched.
