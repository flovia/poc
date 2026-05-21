"use client";

import { useMobileNav } from "@/components/shell/MobileNavContext";

export function MobileMenuButton() {
  const mobileNav = useMobileNav();

  if (!mobileNav) return null;

  return (
    <button
      type="button"
      className="mobile-menu-button"
      aria-label="Open navigation"
      aria-expanded={mobileNav.isOpen}
      onClick={mobileNav.open}
    >
      <span aria-hidden />
      <span aria-hidden />
      <span aria-hidden />
    </button>
  );
}
