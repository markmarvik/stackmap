# StackMap

Longevity constellation. Educational only, not medical advice.

**Live:** https://stackmap-31c.pages.dev/  
**Repo:** https://github.com/markmarvik/stackmap  
Formerly Aetheris. `github.com/markmarvik/aetheris` redirects here. The public site is Cloudflare Pages. GitHub Pages remains a mirror at https://markmarvik.github.io/stackmap/.

## Map

One canvas. Constellations: supplements, habits, exercises, foods, environment, biomarkers. **All nodes** is the default. Search with `/`.

The figure in the center is a 3D body on the map plane. Click it to explode the organs and leave them open. Click the body again to collapse. Click an exploded organ to show the nodes linked to it. Selecting a node fades the other organs. Pan, pinch, and the wheel zoom the map. The camera does not refit when the body opens.

Desktop rail: **Map**, **Body**, **Stack**. My Stack (notes, time of day, import/export, share card, print) stays in this browser.

`?c=supplements|habits|exercises|foods|environment|biomarkers` opens one constellation.

**Keys:** `Esc` clear · `+`/`-` zoom · `r` fit · `f` groups · `/` search

## Run

Node **24+** (`.nvmrc`).

```bash
npm install
npm run dev
npm test
npm run build
```

Do not open `index.html` as a file. Vite serves the modules.

## Where things live

| Area | Location |
|------|----------|
| Shell, input, rail | `src/main.js` |
| Map draw | `src/trees/SupplementTree.js`, `src/trees/AllTree.js` |
| 3D body | `src/components/BodyStage.js` |
| Explode | `src/core/OrganExplode.js` |
| Fork screen | `src/run/boot.js`, `src/data/forks.js` (`/run/:id`, not the map) |
| Catalog | `src/data/` |
| My Stack | `src/core/MyStack.js` |

## Deploy

Dev and Cloudflare use base `/`. Leave `BASE` and `SITE_URL` unset on Cloudflare Pages. Build `npm run build`, output `dist`, Node from `.nvmrc`.

The GitHub Pages workflow sets `BASE=/stackmap/` and `SITE_URL=https://markmarvik.github.io/stackmap/`. Pages source must be **GitHub Actions**, not a branch.

## Assets

| File | License |
|------|---------|
| `public/assets/body/camera/body.bin` | [BodyParts3D](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html) release 4.0, © The Database Center for Life Science, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Same source set as Z-Anatomy. |
| `public/assets/body/camera/torso.bin` | Same BodyParts3D license. Used by the `/run` liver view. |
| `public/assets/body/player/*.fbx` | [Kenney Animated Characters](https://kenney.nl/assets/animated-characters), CC0. |

Layer PNGs under `public/assets/body/` are the older anatomy sheets. The map figure is the 3D mesh, not those PNGs.
