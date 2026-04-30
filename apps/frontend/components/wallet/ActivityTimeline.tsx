import type { CustomerTimelineEventDto, CustomerTimelineEventType } from "@/lib/api/types";
import { formatAtomic, formatTimestamp, shortAddr } from "@/lib/format";

type ActivityTimelineProps = {
  timeline: CustomerTimelineEventDto[];
};

const TYPE_BADGE: Record<CustomerTimelineEventType, { label: string; color: string; bg: string }> = {
  payment: { label: "Payment", color: "#2563EB", bg: "rgba(37,99,235,0.10)" },
  provider_usage: { label: "Provider", color: "#0D9488", bg: "rgba(13,148,136,0.10)" },
  growth: { label: "Growth", color: "#1D4ED8", bg: "rgba(29,78,216,0.10)" },
  upsell_signal: { label: "Upsell", color: "#B45309", bg: "rgba(180,83,9,0.10)" },
};

export function ActivityTimeline({ timeline }: ActivityTimelineProps) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", background: "#FFFFFF" }}>
      <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--line)" }}>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-mute)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Activity timeline
        </div>
        <div className="display" style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {timeline.length} event{timeline.length === 1 ? "" : "s"} from BFF projection
        </div>
      </div>

      <div className="timeline-body" style={{ maxHeight: 520, overflow: "auto" }}>
        {timeline.length === 0 && (
          <div style={{ padding: 20, color: "var(--text-3)", fontSize: 13 }}>
            No timeline events.
          </div>
        )}
        {timeline.map((event, i) => {
          const badge = TYPE_BADGE[event.type];
          return (
            <div
              key={`${event.timestamp}-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "150px 90px minmax(0, 1fr) 110px",
                alignItems: "start",
                gap: 14,
                padding: "12px 20px",
                borderBottom: i < timeline.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <span className="mono" style={{ fontSize: 11.5, color: "var(--text-3)" }}>
                {formatTimestamp(event.timestamp)}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: badge.color,
                  background: badge.bg,
                  padding: "3px 8px",
                  borderRadius: 4,
                  textAlign: "center",
                  alignSelf: "start",
                }}
              >
                {badge.label}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-1)" }}>
                  {event.title}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2, lineHeight: 1.5 }}>
                  {event.description}
                </div>
                {(event.providerId || event.txHash) && (
                  <div
                    className="mono"
                    style={{
                      fontSize: 10.5,
                      color: "var(--text-mute)",
                      marginTop: 4,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {event.providerId && <span>provider: {event.providerId}</span>}
                    {event.txHash && <span>tx: {shortAddr(event.txHash)}</span>}
                  </div>
                )}
              </div>
              <span
                className="mono"
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  textAlign: "right",
                  color: event.amountAtomic ? "var(--text-1)" : "var(--text-mute)",
                }}
              >
                {event.amountAtomic ? formatAtomic(event.amountAtomic) : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
