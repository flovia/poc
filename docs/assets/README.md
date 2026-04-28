# docs assets

Documentation images and other static assets live here.

- `infographics/`: shared generation prompt and manifest for document overview images
- `infographics/common.prompt.md`: shared instruction and visual style for every docs image
- `infographics/manifest.json`: source Markdown and output image mapping
- `infographics/artifacts/*.png`: generated document overview images

Keep generated CLI reports under `apps/*/reports/` out of this directory; those reports are reproducible artifacts and are ignored by git.
