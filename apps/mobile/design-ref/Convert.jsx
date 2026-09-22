// Convert.jsx — guest → member conversion nudges. Gentle, contextual, dismissible.
//
// Principles (the "not bitchy" contract):
//  - An offer, never a wall. The core loop always works signed-out; a nudge never blocks it.
//  - Contextual only. Shown at the moment its value is real (a shortlist worth keeping, a
//    taste worth carrying, a group worth sharing), never on the swipe deck or thinking screen.
//  - Once. Dismissing a nudge hides that kind for good (app.dismissedNudges[kind]); it never
//    re-nags. Members never see any of it.
//  - Honest value, warm tone. Each line says what signing in *keeps*, not what the guest loses.
//
// Placement (see Shell.jsx wiring):
//  - kind="shortlist" → top of the Shortlist tab, once it holds ~4+ films.
//  - kind="taste"     → top of the Taste tab (richer form of the "On this phone only" pill).
//  - kind="group"     → when a guest opens Group mode / tries to invite — the "save your
//                       group's shared taste once everyone has an account" moment.
//  - kind="sync"      → Settings, near the Sync row (paired with the guest banner).

const NUDGE_COPY = {
  shortlist: ['Keep this shortlist if you switch phones', 'It lives on this phone right now. Sign in and it — plus your taste — comes with you to a new one.'],
  taste: ['This is only on this phone', 'We’ve learned a fair bit about you. Sign in and it follows you, so a new phone starts where you left off.'],
  group: ['Save what your group decides together', 'Group nights keep best when everyone has an account — your shared taste is there for next time, not just tonight.'],
  sync: ['Watch on your other devices too', 'Sign in once and tonight’s picks and your shortlist show up everywhere you watch.'],
};
// A guest nudge maps to the sign-in Gate feature it argues for, so the copy carries through.
const NUDGE_GATE = { shortlist: 'sync', taste: 'sync', group: 'group', sync: 'sync' };

function ConvertNudge({ app, set, kind = 'shortlist' }) {
  const { Button } = useC();
  // Members and already-dismissed kinds show nothing at all.
  if (app.signedIn || (app.dismissedNudges || {})[kind]) return null;
  const [h, b] = NUDGE_COPY[kind] || NUDGE_COPY.shortlist;
  const dismiss = () => set({ dismissedNudges: { ...(app.dismissedNudges || {}), [kind]: true } });
  const signIn = () => set({ route: 'signin', signinMode: 'options', returnTo: app.route, gateFeature: NUDGE_GATE[kind] });
  return (
    <div style={{ margin: 'var(--space-4) 0', padding: '14px 16px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', boxShadow: 'inset 0 0 0 1px var(--color-hairline)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
          <span style={{ font: 'var(--type-label)', color: 'var(--color-ink)' }}>{h}</span>
          <span style={{ font: 'var(--type-caption)', color: 'var(--color-ink-tertiary)', textWrap: 'pretty' }}>{b}</span>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss" style={{ appearance: 'none', border: 0, background: 'transparent', color: 'var(--color-ink-tertiary)', cursor: 'pointer', font: 'var(--type-body-l)', lineHeight: 1, padding: 4, marginTop: -2 }}>×</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Button size="sm" onClick={signIn}>Sign in</Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>Not now</Button>
      </div>
    </div>
  );
}

Object.assign(window, { ConvertNudge, NUDGE_COPY });
