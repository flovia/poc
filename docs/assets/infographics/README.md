# docs infographics

This directory contains the reusable image-generation foundation for documentation Markdown files.

## Layout

```txt
docs/assets/infographics/
  README.md
  common.prompt.md
  manifest.json
  artifacts/
    index.png
```

## Workflow

1. Keep common image rules in `common.prompt.md`.
2. Track source Markdown and output image paths in `manifest.json`.
3. Generate via Codex CLI built-in `image_gen`; do not write an API script.
4. Pass only the shared prompt, target Markdown, and output path to Codex CLI.
5. Save generated PNG files under `docs/assets/infographics/artifacts/`.
6. Add the generated image near the top of the source Markdown with a relative path from that Markdown file.
7. Validate that every `manifest.json` image path exists before committing.

Example for one document:

```sh
codex exec --sandbox workspace-write -C "$PWD" \
  "Read docs/assets/infographics/common.prompt.md and docs/index.md. Use the built-in image_gen tool to generate a single-page infographic for docs/index.md. Do not write an API script. Do not modify markdown or source files. Save the resulting image as docs/assets/infographics/artifacts/index.png. If image_gen is unavailable, explain that clearly and make no placeholder image."
```

To generate all documents, run the same Codex CLI pattern for each item in `manifest.json`.

After generating a new image, add an item to `manifest.json`:

```json
{
  "source": "docs/path/to/source.md",
  "slug": "source-slug",
  "image": "docs/assets/infographics/artifacts/source-slug.png",
  "status": "generated"
}
```

Use a Markdown image link relative to the source file, for example from `docs/research/*.md`:

```md
![Source title infographic](../assets/infographics/artifacts/source-slug.png)
```

Validate manifest image paths:

```sh
bun -e 'const manifest=JSON.parse(await Bun.file("docs/assets/infographics/manifest.json").text()); const missing=[]; for (const item of manifest.items) { if (!(await Bun.file(item.image).exists())) missing.push(item.image); } if (missing.length) { console.error(`Missing images:\n${missing.join("\n")}`); process.exit(1); } console.log(`manifest ok: ${manifest.items.length} images exist`);'
```

Current Markdown files do not need to link to every image yet. This directory is the foundation for generating and storing those images consistently.
