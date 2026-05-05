// Same-origin proxy for the public Pay.sh skills atlas. The upstream object
// at storage.googleapis.com does not expose CORS headers, so the browser
// cannot fetch it directly from the dashboard. Routing through this server
// route also lets us cap the cache lifetime at the edge.

const UPSTREAM = "https://storage.googleapis.com/pay-skills/v1/skills.json";

export const revalidate = 300; // seconds

export async function GET() {
  try {
    const upstream = await fetch(UPSTREAM, {
      // Cache the upstream response on the server so multiple browser tabs
      // don't each cause a fresh egress request to GCS.
      next: { revalidate: 300 },
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify({ providers: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        // Browser-side cache: 5 min fresh, then revalidate via stale-while-revalidate.
        "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  } catch {
    return new Response(JSON.stringify({ providers: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
}
