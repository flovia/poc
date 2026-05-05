"use client";

import { useEffect, useState } from "react";

type ProviderAvatarProps = {
  name: string;
  serviceId?: string;
  /** Resolved brand favicon domain (preferred over serviceId guessing). */
  brandDomain?: string | null;
  size?: number;
};

const PALETTE = [
  "#2F6FED",
  "#0EA5A4",
  "#7C3AED",
  "#DB2777",
  "#F97316",
  "#16A34A",
  "#EAB308",
  "#0891B2",
  "#9333EA",
  "#E11D48",
];

function pickColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length] ?? PALETTE[0]!;
}

function initialOf(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0]!.toUpperCase();
}

function hostnameOf(serviceId: string | undefined): string | null {
  if (!serviceId) return null;
  if (!serviceId.includes(".")) return null;
  if (serviceId.includes(" ") || serviceId.includes("/")) return null;
  return serviceId.toLowerCase();
}

export function ProviderAvatar({
  name,
  serviceId,
  brandDomain,
  size = 32,
}: ProviderAvatarProps) {
  const host = brandDomain || hostnameOf(serviceId);
  const [faviconFailed, setFaviconFailed] = useState(false);
  // Reset the failure flag when the resolved host actually changes (e.g. when
  // the skills.json fetch settles and we move from no-favicon to a real one).
  useEffect(() => {
    setFaviconFailed(false);
  }, [host]);
  const showFavicon = host !== null && !faviconFailed;
  const color = pickColor(serviceId || name);
  const letter = initialOf(name);

  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: showFavicon ? "#fff" : color,
        color: "#fff",
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        letterSpacing: "0.01em",
        flexShrink: 0,
        border: showFavicon ? "1px solid var(--line)" : "none",
        overflow: "hidden",
      }}
    >
      {showFavicon ? (
        <img
          src={`https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host!)}`}
          alt=""
          width={Math.round(size * 0.62)}
          height={Math.round(size * 0.62)}
          onError={() => setFaviconFailed(true)}
          style={{ display: "block" }}
        />
      ) : (
        letter
      )}
    </span>
  );
}
