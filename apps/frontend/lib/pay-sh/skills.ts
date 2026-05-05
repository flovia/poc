"use client";

import { useEffect, useMemo, useState } from "react";

// Use a same-origin proxy (apps/frontend/app/api/pay-sh-skills) instead of
// hitting storage.googleapis.com directly: the upstream object does not send
// CORS headers, so a browser fetch from the dashboard would be rejected.
const SKILLS_URL = "/api/pay-sh-skills";

export type PaySkillProvider = {
  fqn: string;
  title: string;
  service_url?: string;
  category?: string;
};

type SkillsDoc = {
  providers?: PaySkillProvider[];
};

type SkillsIndex = {
  byFqn: Map<string, PaySkillProvider>;
  byHost: Map<string, PaySkillProvider>;
};

type SkillsState = SkillsIndex & {
  loaded: boolean;
};

const EMPTY: SkillsState = { byFqn: new Map(), byHost: new Map(), loaded: false };

let inflight: Promise<SkillsIndex> | null = null;
let cached: SkillsIndex | null = null;

function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

async function loadSkills(): Promise<SkillsIndex> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(SKILLS_URL, { cache: "force-cache" });
      if (!res.ok) return { byFqn: new Map(), byHost: new Map() };
      const doc = (await res.json()) as SkillsDoc;
      const byFqn = new Map<string, PaySkillProvider>();
      const byHost = new Map<string, PaySkillProvider>();
      for (const p of doc.providers ?? []) {
        if (p.fqn) byFqn.set(p.fqn, p);
        if (p.service_url) {
          const host = hostFromUrl(p.service_url);
          if (host) byHost.set(host, p);
        }
      }
      cached = { byFqn, byHost };
      return cached;
    } catch {
      return { byFqn: new Map(), byHost: new Map() };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Best-effort lookup that tolerates the catalog using either the skills atlas
 * `fqn` or a raw host (e.g. "pro-api.coingecko.com") as its serviceId.
 */
export function resolvePaySkill(
  index: Pick<SkillsIndex, "byFqn" | "byHost">,
  serviceId: string | undefined,
): PaySkillProvider | undefined {
  if (!serviceId) return undefined;
  const direct = index.byFqn.get(serviceId);
  if (direct) return direct;
  // serviceId can be a bare hostname when the BFF stitched provider rows from
  // raw on-chain data instead of from the atlas. Look up by host fragment.
  if (serviceId.includes(".") && !serviceId.includes("/")) {
    return index.byHost.get(serviceId.toLowerCase());
  }
  return undefined;
}

/**
 * Loads the Pay.sh skills atlas once per browser session and exposes a lookup
 * by `fqn`. The atlas is a small static JSON (~130 KB, ~74 providers) so we
 * just memoize it in module scope; the hook returns an empty map on the first
 * render and updates once the fetch settles.
 */
export function usePaySkills(): SkillsState {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void loadSkills().then(() => {
      if (!cancelled) setVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return useMemo(() => {
    if (!cached) return EMPTY;
    return { ...cached, loaded: true };
    // Re-evaluate the memo whenever the loader resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
}
