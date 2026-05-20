const MOBILE_USER_AGENT_PATTERN = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i;

type MobileDesktopGateProps = {
  landingUrl: string;
};

export function isMobileUserAgent(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return MOBILE_USER_AGENT_PATTERN.test(userAgent);
}

export function MobileDesktopGate({ landingUrl }: MobileDesktopGateProps) {
  return (
    <main className="mobile-desktop-gate" aria-labelledby="mobile-desktop-gate-title">
      <section className="mobile-desktop-gate-card">
        <div className="mobile-desktop-gate-brand">
          <img className="mobile-desktop-gate-logo" src="/logo.png" alt="Flovia" />
          <span>Flovia</span>
        </div>
        <h1 id="mobile-desktop-gate-title">Flovia is built for desktop analytics</h1>
        <p className="mobile-desktop-gate-copy">
          Flovia uses dense payment tables, provider-level analysis, and network views that
          need a larger screen. Open Flovia on desktop for the full dashboard experience.
        </p>
        <div className="mobile-desktop-gate-actions">
          <a className="btn primary" href={landingUrl}>
            View Flovia Overview <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>
    </main>
  );
}
