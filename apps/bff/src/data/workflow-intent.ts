import {
  PaymentRecipientAddressSchema,
  type PhaseBCustomerProfileResponse,
  type PhaseBCustomerWorkflowIntentInput,
  type PhaseBCustomerWorkflowIntentSession,
  normalizePaymentRecipientAddress,
  validatePhaseBCustomerWorkflowIntentInput,
} from "contracts";

export const WORKFLOW_INTENT_SESSION_WINDOW_SECONDS = 300;
const WORKFLOW_INTENT_MAX_SESSIONS = 3;
const WORKFLOW_INTENT_MIN_EVENTS = 2;
const UNKNOWN_PROVIDER_NAME = "Unknown API";

type WorkflowIntentCandidateEvent = PhaseBCustomerWorkflowIntentSession["events"][number] & {
  timestampMs: number;
  sortIndex: number;
};

export type WorkflowIntentInputSelection = {
  sessionWindowSeconds: number;
  sessions: PhaseBCustomerWorkflowIntentSession[];
  sessionCount: number;
  remainingSessionCount: number;
};

const parseTimestamp = (value: string) => Date.parse(value);

const addAtomic = (left: string, right: string | undefined) =>
  (BigInt(left) + BigInt(right ?? "0")).toString();

const isLikelyPaymentAddress = (value: string | undefined) => {
  if (!value) return false;
  return PaymentRecipientAddressSchema.safeParse(value).success;
};

const buildActivityLabel = (description: string) => {
  const trimmed = description.trim();
  const splitIndex = trimmed.lastIndexOf(": ");
  if (splitIndex === -1) return trimmed;
  const tail = trimmed.slice(splitIndex + 2).trim();
  return tail || trimmed;
};

const buildProviderLookup = (profile: PhaseBCustomerProfileResponse["profile"]) => {
  const byProviderId = new Map(profile.providers.map((provider) => [provider.providerId, provider]));
  const byPayToWallet = new Map(
    profile.providers.map((provider) => [
      normalizePaymentRecipientAddress(provider.payToWallet),
      provider,
    ]),
  );

  return { byProviderId, byPayToWallet };
};

const enrichPaymentEvents = (
  profile: PhaseBCustomerProfileResponse["profile"],
): WorkflowIntentCandidateEvent[] => {
  const { byProviderId, byPayToWallet } = buildProviderLookup(profile);

  return profile.timeline
    .filter((event) => event.eventType === "payment")
    .map((event, sortIndex) => {
      const rawId = event.relatedProviderId;
      const provider =
        (rawId ? byProviderId.get(rawId) : undefined) ??
        (rawId ? byPayToWallet.get(normalizePaymentRecipientAddress(rawId)) : undefined);
      const payToWallet = provider?.payToWallet ?? (isLikelyPaymentAddress(rawId) ? rawId : undefined);

      return {
        at: event.at,
        providerId: provider?.providerId ?? rawId,
        providerName: provider?.providerName ?? provider?.name ?? rawId ?? UNKNOWN_PROVIDER_NAME,
        payToWallet,
        activityLabel: buildActivityLabel(event.description),
        description: event.description,
        amountAtomic: event.amountAtomic,
        timestampMs: parseTimestamp(event.at),
        sortIndex,
      };
    })
    .sort((left, right) => left.timestampMs - right.timestampMs || left.sortIndex - right.sortIndex);
};

const buildSession = (
  sessionIndex: number,
  events: WorkflowIntentCandidateEvent[],
): PhaseBCustomerWorkflowIntentSession | null => {
  if (events.length < WORKFLOW_INTENT_MIN_EVENTS) return null;

  const distinctActivities = new Set(events.map((event) => event.activityLabel));
  if (distinctActivities.size < WORKFLOW_INTENT_MIN_EVENTS) return null;

  const providers = new Map<
    string,
    PhaseBCustomerWorkflowIntentSession["providers"][number]
  >();
  for (const event of events) {
    const key = `${event.providerId ?? event.providerName}:${event.payToWallet ?? ""}`;
    const current = providers.get(key);
    if (!current) {
      providers.set(key, {
        ...(event.providerId ? { providerId: event.providerId } : {}),
        providerName: event.providerName,
        ...(event.payToWallet ? { payToWallet: event.payToWallet } : {}),
        eventCount: 1,
        totalAmountAtomic: event.amountAtomic ?? "0",
        activityLabels: [event.activityLabel],
      });
      continue;
    }

    providers.set(key, {
      ...current,
      eventCount: current.eventCount + 1,
      totalAmountAtomic: addAtomic(current.totalAmountAtomic, event.amountAtomic),
      activityLabels: current.activityLabels.includes(event.activityLabel)
        ? current.activityLabels
        : [...current.activityLabels, event.activityLabel],
    });
  }

  const startedAt = events[0]?.at;
  const endedAt = events[events.length - 1]?.at;
  if (!startedAt || !endedAt) return null;

  return {
    sessionId: `session-${sessionIndex}`,
    startedAt,
    endedAt,
    durationSeconds: Math.max(0, Math.floor((parseTimestamp(endedAt) - parseTimestamp(startedAt)) / 1000)),
    eventCount: events.length,
    distinctProviderCount: new Set(
      events.map((event) => event.providerId ?? event.providerName),
    ).size,
    distinctActivityCount: distinctActivities.size,
    totalAmountAtomic: events.reduce((sum, event) => addAtomic(sum, event.amountAtomic), "0"),
    providers: [...providers.values()],
    events: events.map(({ timestampMs: _timestampMs, sortIndex: _sortIndex, ...event }) => event),
  };
};

export const buildWorkflowIntentInputFromProfile = (
  profile: PhaseBCustomerProfileResponse,
): WorkflowIntentInputSelection => {
  const events = enrichPaymentEvents(profile.profile);
  const candidateSessions: PhaseBCustomerWorkflowIntentSession[] = [];
  let current: WorkflowIntentCandidateEvent[] = [];
  let previousTimestampMs: number | null = null;

  const flush = () => {
    if (current.length === 0) return;
    const built = buildSession(candidateSessions.length + 1, current);
    if (built) candidateSessions.push(built);
    current = [];
  };

  for (const event of events) {
    if (
      previousTimestampMs !== null &&
      event.timestampMs - previousTimestampMs > WORKFLOW_INTENT_SESSION_WINDOW_SECONDS * 1000
    ) {
      flush();
    }
    current.push(event);
    previousTimestampMs = event.timestampMs;
  }
  flush();

  const sortedByRecency = [...candidateSessions].sort((left, right) =>
    right.endedAt.localeCompare(left.endedAt),
  );
  const sessions = sortedByRecency.slice(0, WORKFLOW_INTENT_MAX_SESSIONS);

  return {
    sessionWindowSeconds: WORKFLOW_INTENT_SESSION_WINDOW_SECONDS,
    sessions,
    sessionCount: candidateSessions.length,
    remainingSessionCount: Math.max(0, candidateSessions.length - sessions.length),
  };
};

export const toWorkflowIntentInput = (
  selection: WorkflowIntentInputSelection,
): PhaseBCustomerWorkflowIntentInput | null => {
  if (selection.sessions.length === 0) return null;
  return validatePhaseBCustomerWorkflowIntentInput({
    sessionWindowSeconds: selection.sessionWindowSeconds,
    sessions: selection.sessions,
  });
};
