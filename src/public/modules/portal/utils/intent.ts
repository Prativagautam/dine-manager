const INTENT_KEY = 'rms_portal_intent';
const INTENT_TTL_MS = 10 * 60 * 1000; // 10 minutes — how long a saved intent stays fresh.

type PortalSection = 'order' | 'reservation';

function saveIntent(view: PortalSection) {
	sessionStorage.setItem(INTENT_KEY, JSON.stringify({ view, ts: Date.now() }));
}

function consumeIntent(): PortalSection | null {
	const raw = sessionStorage.getItem(INTENT_KEY);
	if (!raw) return null;
	// One-shot: clear regardless of outcome below, so a stale note never
	// silently fires on some future unrelated visit.
	sessionStorage.removeItem(INTENT_KEY);
	try {
		const { view, ts } = JSON.parse(raw);
		if (Date.now() - ts > INTENT_TTL_MS) return null; // stale — ignore.
		return view === 'order' || view === 'reservation' ? view : null;
	} catch {
		return null;
	}
}

export { saveIntent, consumeIntent };
