"use client";

import { useEffect, useMemo, useState } from "react";

const SKILLS_URL = "https://storage.googleapis.com/pay-skills/v1/skills.json";

export type PaySkillProvider = {
  fqn: string;
  title: string;
  service_url?: string;
  category?: string;
};

type SkillsDoc = {
  providers?: PaySkillProvider[];
};

type SkillsState = {
  byFqn: Map<string, PaySkillProvider>;
  loaded: boolean;
};

const EMPTY: SkillsState = { byFqn: new Map(), loaded: false };

let inflight: Promise<Map<string, PaySkillProvider>> | null = null;
let cached: Map<string, PaySkillProvider> | null = null;

async function loadSkills(): Promise<Map<string, PaySkillProvider>> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(SKILLS_URL, { cache: "force-cache" });
      if (!res.ok) return new Map();
      const doc = (await res.json()) as SkillsDoc;
      const map = new Map<string, PaySkillProvider>();
      for (const p of doc.providers ?? []) {
        if (p.fqn) map.set(p.fqn, p);
      }
      cached = map;
      return map;
    } catch {
      return new Map();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
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
    return { byFqn: cached, loaded: true };
    // Re-evaluate the memo whenever the loader resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);
}
