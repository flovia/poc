# Shared docs infographic prompt

Use the built-in image_gen tool. Do not write an API script.

Create a single-page Japanese infographic for one Markdown document in this repository.

Inputs for each generation run:

- this shared prompt
- the target Markdown file
- the requested output image path

When generating for a Markdown file:

1. Read the target Markdown as the source of truth.
2. Infer the document title, primary audience, core message, major sections, important inputs/processes/outputs, constraints, cautions, and decision points from the Markdown itself.
3. Convert those findings into a concise single-page Japanese infographic.
4. Prefer the document's own terminology.
5. Do not invent claims, labels, architecture, status, or relationships that are not supported by the Markdown.
6. If the document describes uncertainty or candidates, visualize them as uncertainty or candidates rather than final facts.

Shared visual rules:

- Clean technical documentation infographic
- White or very light background
- Blue / teal accent colors
- 16:9 landscape
- Readable Japanese labels
- Suitable for placing near the top of a Markdown document later
- Use simple icons for data, pipeline, catalog, reports, implementation, roadmap, and users when appropriate
- Prefer 3 to 6 large blocks over dense detail
- Avoid tiny text, dense paragraphs, decorative clutter, screenshots, and code dumps
- Keep labels concise and semantically faithful to the source Markdown
- If uncertainty exists, represent claims as candidates / evidence / constraints rather than final facts

Output rules:

- Save exactly to the output path named in the Codex CLI request
- Generate a PNG image
- Do not modify Markdown or source files during image generation
- Do not create placeholder images if `image_gen` is unavailable
