// Same-origin proxy for the public Pay.sh skills atlas. The upstream object
// at storage.googleapis.com does not expose CORS headers, so the browser
// cannot fetch it directly from the dashboard. Routing through this server
// route also lets us cap the cache lifetime at the edge.

import {
  DISCOVERY_REVALIDATE_SECONDS,
  DISCOVERY_STALE_WHILE_REVALIDATE_SECONDS,
} from "@/lib/api/cache-policy";

const UPSTREAM = "https://storage.googleapis.com/pay-skills/v1/skills.json";
const CACHE_CONTROL = `public, max-age=${DISCOVERY_REVALIDATE_SECONDS}, stale-while-revalidate=${DISCOVERY_STALE_WHILE_REVALIDATE_SECONDS}`;

export const revalidate = 43200; // seconds

export async function GET() {
  try {
    const upstream = await fetch(UPSTREAM, {
      // Cache the upstream response on the server so multiple browser tabs
      // don't each cause a fresh egress request to GCS.
      next: { revalidate: DISCOVERY_REVALIDATE_SECONDS },
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify({ providers: [] }), {
        status: 200,
        headers: { "content-type": "application/json", "cache-control": CACHE_CONTROL },
      });
    }
    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": CACHE_CONTROL,
      },
    });
  } catch {
    return new Response(JSON.stringify({ providers: [] }), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": CACHE_CONTROL },
    });
  }
}
