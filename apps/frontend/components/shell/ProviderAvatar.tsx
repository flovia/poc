"use client";

import { useEffect, useState } from "react";

type ProviderAvatarProps = {
  name: string;
  serviceId?: string;
  /** Resolved brand favicon domain (preferred over serviceId guessing). */
  brandDomain?: string | null;
  /** Direct icon URL override; bypasses Google favicon resolution entirely. */
  brandIconUrl?: string | null;
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
  brandIconUrl,
  size = 32,
}: ProviderAvatarProps) {
  const host = brandDomain || hostnameOf(serviceId);
  const iconSrc = brandIconUrl
    || (host
      ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}`
      : null);
  const [iconFailed, setIconFailed] = useState(false);
  // Reset the failure flag when the icon source actually changes (e.g. when
  // the skills.json fetch settles and we move from no-icon to a real one).
  useEffect(() => {
    setIconFailed(false);
  }, [iconSrc]);
  const showIcon = iconSrc !== null && !iconFailed;
  const color = pickColor(serviceId || name);
  const letter = initialOf(name);
  // Direct iconUrls (curated brand assets) usually fill the disc — render
  // them at full size. Favicons from Google's resolver are tiny PNGs, so
  // keep the inset look that gave them visual padding before.
  const iconSize = brandIconUrl ? size : Math.round(size * 0.62);

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
        background: showIcon ? "#fff" : color,
        color: "#fff",
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        letterSpacing: "0.01em",
        flexShrink: 0,
        border: showIcon ? "1px solid var(--line)" : "none",
        overflow: "hidden",
      }}
    >
      {showIcon ? (
        <img
          src={iconSrc!}
          alt=""
          width={iconSize}
          height={iconSize}
          onError={() => setIconFailed(true)}
          style={{ display: "block", objectFit: "cover" }}
        />
      ) : (
        letter
      )}
    </span>
  );
}
