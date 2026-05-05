# Open Graph & Twitter Card

How the social-share preview image is generated and what to check before
deploying.

## Implementation

The OGP image is generated at build time via Next.js
[`ImageResponse`](https://nextjs.org/docs/app/api-reference/functions/image-response)
using the file conventions of the App Router. Three files are involved:

| File | Role |
| --- | --- |
| [`apps/frontend/app/opengraph-image.tsx`](../app/opengraph-image.tsx) | Defines the 1200×630 PNG (Flovia palette + dashboard-style mock). Runs on the Node.js runtime so it can read `public/logo.png` from disk. |
| [`apps/frontend/app/twitter-image.tsx`](../app/twitter-image.tsx) | Re-uses the same image for the Twitter Card. `runtime` must be re-declared explicitly because Next.js parses route segment config statically and does not follow re-exports. |
| [`apps/frontend/app/layout.tsx`](../app/layout.tsx) | Declares `metadata.openGraph` / `metadata.twitter` so the `<head>` of every page picks up the image automatically. |

The output is a fully static route at `/opengraph-image` and
`/twitter-image`. No runtime rendering or external service is involved.

## What gets injected automatically

After build, Next.js injects tags equivalent to the following into every
page that inherits the root layout:

```html
<meta property="og:title" content="Flovia — Turn x402 / MPP payments into decisions" />
<meta property="og:description" content="..." />
<meta property="og:image" content="https://<site>/opengraph-image?<hash>" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="..." />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://<site>/twitter-image?<hash>" />
```

The `?<hash>` suffix is appended by Next.js for cache-busting whenever
the underlying source file changes.

## Required environment variable

`NEXT_PUBLIC_SITE_URL` **must** be set to the production origin (e.g.
`https://flovia.example.com`) in every environment that serves
production-like share previews.

The root layout uses this value as `metadataBase`. When it is missing,
`metadataBase` falls back to `null` on purpose (we deliberately avoid
hard-coding a placeholder so the production OGP cannot silently leak a
fake host). The trade-off is that without `NEXT_PUBLIC_SITE_URL` the
generated `og:image` tag becomes a relative URL (`/opengraph-image`),
which most social platforms cannot resolve.

Set it in the deployment platform (Vercel project settings, Cloudflare
env vars, etc.) before sharing any production link.

## Editing the image

Edit `apps/frontend/app/opengraph-image.tsx`. A few constraints worth
remembering, all coming from
[satori](https://github.com/vercel/satori) (the renderer behind
`ImageResponse`):

- Any `<div>` with **more than one child** must declare an explicit
  `display` value (`flex`, `contents`, or `none`). Otherwise the build
  fails during static prerender with
  *"Expected `<div>` to have explicit display"*.
- Multi-line headings should be split into sibling `<span>` elements
  inside a `display: flex; flex-direction: column` container. Mixing
  text nodes with `<br />` works in browsers but trips satori.
- Only the fonts explicitly registered through the `fonts` option of
  `ImageResponse` are embedded. The current implementation uses
  `system-ui` fallbacks because no custom font is bundled — if brand
  typography matters, register a font file (`Geist`, `Inter`, etc.)
  before relying on it.
- `process.cwd()` resolves to `apps/frontend` during `next build`, so
  reading `public/logo.png` works as long as the build is invoked from
  that workspace (the standard `bun run build` flow does this).

## Verifying the output

### Locally during build

```bash
cd apps/frontend
bun run build
file .next/server/app/opengraph-image.body
# → PNG image data, 1200 x 630, 8-bit/color RGBA
open .next/server/app/opengraph-image.body
```

### Locally with the dev server

```bash
cd apps/frontend
bun run dev
# Image:        http://localhost:3000/opengraph-image
# Twitter card: http://localhost:3000/twitter-image
# Meta tags:    view-source on http://localhost:3000/
```

### After deployment

```bash
curl -s https://<site>/ | grep -E 'og:image|twitter:image'
```

Then validate the actual share rendering with the platform debuggers:

- Twitter/X — https://cards-dev.twitter.com/validator
- Facebook / Meta — https://developers.facebook.com/tools/debug/
- LinkedIn — https://www.linkedin.com/post-inspector/

Each platform aggressively caches OGP results. After updating the image
or copy, use the debugger's *re-fetch* button to invalidate the cached
preview; the `?<hash>` query string alone is not always enough.

## Per-page overrides

The root layout sets the default OG / Twitter metadata. Any page
(`page.tsx` / nested `layout.tsx`) can override `title`, `description`,
or supply a route-specific image by exporting its own `metadata` or by
placing an `opengraph-image.*` file in that segment. Until a route does
that, the root-level image is used everywhere.
