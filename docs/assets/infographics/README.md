# docs infographics

This directory contains the reusable image-generation foundation for documentation Markdown files.

## Layout

```txt
docs/assets/infographics/
  README.md
  common.prompt.md
  manifest.json
  index.png
```

## Workflow

1. Keep common image rules in `common.prompt.md`.
2. Track source Markdown and output image paths in `manifest.json`.
3. Generate via Codex CLI built-in `image_gen`; do not write an API script.
4. Pass only the shared prompt, target Markdown, and output path to Codex CLI.

Example for one document:

```sh
codex exec --sandbox workspace-write -C "$PWD" \
  "Read docs/assets/infographics/common.prompt.md and docs/index.md. Use the built-in image_gen tool to generate a single-page infographic for docs/index.md. Do not write an API script. Do not modify markdown or source files. Save the resulting image as docs/assets/infographics/index.png. If image_gen is unavailable, explain that clearly and make no placeholder image."
```

To generate all documents, run the same Codex CLI pattern for each item in `manifest.json`.

Current Markdown files do not need to link to every image yet. This directory is the foundation for generating and storing those images consistently.
