// Account.jsx — tab bar, guest gate, Account screen, Delete / Export confirm sheets, notification pre-permission, tutorial replay.

const TABS = [['tonight', 'Tonight'], ['shortlist', 'Shortlist'], ['taste', 'Taste'], ['settings', 'Settings']];
const TAB_ROUTES = { tonight: 'tonight', 'quick-recs': 'tonight', mood: 'tonight', shortlist: 'shortlist', taste: 'taste', settings: 'settings', account: 'settings', notif: 'settings', states: 'shortlist' };

// TabBar — four tabs. Hidden on deck, thinking, onboarding, sign-in and full-screen sheets. Icons are glyph placeholders → SF Symbols / Material Symbols in code.
function TabBar({ app, set }) {
  const active = TAB_ROUTES[app.route];
  const go = id => set({ route: id === 'tonight' ? (app.predictionDeclined || !Object.keys(app.decisions || {}).length ? 'mood' : 'tonight') : id });
  const glyph = { tonight: '◐', shortlist: '≡', taste: '◎', settings: '⋯' };
  return (
    <nav aria-label="Tabs" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 'calc(50px + var(--safe-bottom))', paddingBottom: 'var(--safe-bottom)', borderTop: 'var(--hairline)', background: 'var(--color-bg)', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', zIndex: 4 }}>
      {TABS.map(([id, label]) => {
        const on = active === id;
        return (
          <button key={id} type="button" onClick={() => go(id)} aria-current={on ? 'page' : undefined} style={{ appearance: 'none', border: 0, background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: on ? 'var(--color-ink)' : 'var(--color-ink-tertiary)', transition: 'color var(--duration-fast)' }}>
            <span aria-hidden style={{ font: '400 18px/1 var(--font-body)' }}>{glyph[id]}</span>
            <span style={{ font: 'var(--type-micro)', letterSpacing: 'var(--text-micro-tracking)', textTransform: 'uppercase', fontWeight: on ? 600 : 500 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// Gate — "Sign in to keep this". Shown when a guest taps an account-only feature. `feature` decides the copy.
const GATE_COPY = {
  group: ['Deciding together needs an account.', 'Friends join through a link tied to you. Your picks so far stay on this phone either way.'],
  sync: ['Keep your taste on every phone.', 'Sign in and what you’ve taught the app comes with you to a new device.'],
  account: ['Your account lives behind a sign-in.', 'Name, email and connected services need somewhere to live.'],
  faceid: ['Face ID lock needs an account.', 'Locking the app protects an account. As a guest there’s nothing to sign back into.'],
  export: ['Sign in to export.', 'The export includes everything you’ve decided. We tie it to an account so only you can download it.'],
  delete: ['Nothing to delete yet.', 'You’re a guest. To clear this phone, use Reset what we’ve learned in Settings.'],
};
function Gate({ app, set }) {
  const { Sheet, Button } = useC();
  const f = app.gate;
  const [h, b] = GATE_COPY[f] || GATE_COPY.account;
  const close = () => set({ gate: null });
  return (
    <Sheet open={!!f} title={null} onClose={close}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Micro>Sign in to keep this</Micro>
        <Headline size="m">{h}</Headline>
        <Body>{b}</Body>
        {f !== 'delete' && <Body tone="tertiary" style={{ font: 'var(--type-caption)' }}>Your shortlist and taste so far merge into the account. Nothing is lost.</Body>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          {f === 'delete' ? <Button variant="secondary" size="lg" full onClick={() => { set({ decisions: {}, reactions: {}, customMoods: [], picks: [], gate: null }); }}>Reset what we’ve learned</Button>
            : <Button variant="primary" size="lg" full onClick={() => set({ gate: null, route: 'signin', signinMode: 'options', returnTo: app.route, gateFeature: f })}>Sign in</Button>}
          <Button variant="ghost" full onClick={close}>Not now</Button>
        </div>
      </div>
    </Sheet>
  );
}
// helper: guests hit the gate, members pass through
function gated(app, set, feature, go) { return () => app.signedIn ? go() : set({ gate: feature }); }

// Account — edit display name, email, providers, log out, delete, export.
function Account({ app, set }) {
  const { Button, ListRow, SectionLabel, IconButton } = useC();
  const [name, setName] = React.useState(app.displayName || '');
  const dirty = name.trim() !== (app.displayName || '');
  const provider = app.signedIn || 'google';
  return (
    <Screen style={{ paddingBottom: 'calc(50px + var(--safe-bottom))' }}>
      <TopRow left={<Button variant="ghost" size="sm" onClick={() => set({ route: 'settings' })}>Settings</Button>} right={dirty ? <Button size="sm" onClick={() => set({ displayName: name.trim() })}>Save</Button> : null} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 'var(--space-6)' }}>
        <div style={{ paddingTop: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar person={{ name: name || 'You', initial: (name || 'Y')[0].toUpperCase() }} size={56} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Micro>Display name</Micro>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={24} aria-label="Display name" placeholder="Your name" style={{ appearance: 'none', border: 0, borderBottom: '1px solid var(--color-hairline-strong)', background: 'transparent', color: 'var(--color-ink)', font: 'var(--type-display-m)', letterSpacing: 'var(--text-display-m-tracking)', padding: '2px 0 8px', outline: 'none', width: '100%' }} />
            <Body tone="tertiary" style={{ font: 'var(--type-caption)' }}>How friends see your picks in group mode.</Body>
          </div>
        </div>
        <SectionLabel>Email</SectionLabel>
        <ListRow title={app.email || 'manali@example.com'} subtitle="Used for codes and the export link" trailing={<Button size="sm" variant="outline" onClick={() => set({ route: 'signin', signinMode: 'email', returnTo: 'account' })}>Change</Button>} last />
        <SectionLabel>Connected</SectionLabel>
        <ListRow title="Google" subtitle={provider === 'google' ? 'Connected · manali@gmail.com' : 'Not connected'} trailing={provider === 'google' ? <span style={{ font: 'var(--type-label)' }}>✓</span> : <Button size="sm" variant="outline" onClick={() => set({ signedIn: 'google' })}>Connect</Button>} />
        <ListRow title="Apple" subtitle="Coming soon" trailing={<span style={{ font: 'var(--type-micro)', letterSpacing: 'var(--text-micro-tracking)', textTransform: 'uppercase', color: 'var(--color-ink-tertiary)' }}>Soon</span>} style={{ opacity: .6 }} />
        <ListRow title="Email code" subtitle={provider === 'email' ? 'Connected' : 'Always available'} trailing={<span style={{ font: 'var(--type-label)' }}>✓</span>} last />
        <SectionLabel>Your data</SectionLabel>
        <ListRow title="Export my data" subtitle="Every decision as a file you own" chevron onClick={() => set({ sheet: 'export', exportStep: 0 })} />
        <ListRow title="Log out" subtitle="Your shortlist stays on this phone" onClick={() => set({ sheet: 'logout' })} />
        <ListRow title="Delete account" destructive onClick={() => set({ sheet: 'delete', deleteTyped: '' })} last />
        <Body tone="tertiary" style={{ font: 'var(--type-caption)', marginTop: 'var(--space-6)' }}>Member since March 2026 · 71 decisions · synced 2 minutes ago</Body>
      </div>
    </Screen>
  );
}

// Confirm sheets — logout, delete (type DELETE), export (confirm → progress → done).
function ConfirmSheets({ app, set }) {
  const { Sheet, Button, Pill, PillRow } = useC();
  const s = app.sheet;
  const close = () => set({ sheet: null });
  React.useEffect(() => {
    if (s !== 'export' || app.exportStep !== 1) return;
    const id = setTimeout(() => set({ exportStep: 2 }), 1800); return () => clearTimeout(id);
  }, [s, app.exportStep]);
  return (
    <>
      <Sheet open={s === 'logout'} title="Log out?" onClose={close}>
        <Body>Your shortlist and what we’ve learned stay on this phone. Sign back in any time and they merge with your account.</Body>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <Button variant="primary" size="lg" full onClick={() => set({ sheet: null, signedIn: null, route: 'welcome' })}>Log out</Button>
          <Button variant="ghost" full onClick={close}>Cancel</Button>
        </div>
      </Sheet>
      <Sheet open={s === 'delete'} title="Delete your account?" onClose={close}>
        <Body>This removes your account, taste, shortlist and every decision from our servers. It can’t be undone. If you might come back, log out instead.</Body>
        <Body tone="tertiary" style={{ font: 'var(--type-caption)', marginTop: 'var(--space-2)' }}>Type DELETE to confirm.</Body>
        <input value={app.deleteTyped || ''} onChange={e => set({ deleteTyped: e.target.value })} aria-label="Type DELETE" placeholder="DELETE" style={{ appearance: 'none', border: 0, borderBottom: '1px solid var(--color-hairline-strong)', background: 'transparent', color: 'var(--color-ink)', font: 'var(--type-title)', padding: '8px 0 10px', outline: 'none', width: '100%', marginTop: 4, letterSpacing: '.08em' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <Button variant="no" size="lg" full disabled={(app.deleteTyped || '') !== 'DELETE'} onClick={() => set({ sheet: null, signedIn: null, decisions: {}, reactions: {}, route: 'welcome' })}>Delete everything</Button>
          <Button variant="ghost" full onClick={close}>Keep my account</Button>
        </div>
      </Sheet>
      <Sheet open={s === 'export'} title={app.exportStep === 2 ? 'Your file is ready.' : 'Export my data'} onClose={close}>
        {app.exportStep === 0 && <>
          <Body>One JSON file with every swipe, reaction, mood you picked, and what we’ve learned, with dates. No poster art (it isn’t ours to give).</Body>
          <PillRow style={{ marginTop: 'var(--space-3)' }}><Pill size="sm" selected>71 decisions</Pill><Pill size="sm" selected>14 reactions</Pill><Pill size="sm" selected>taste notes</Pill></PillRow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <Button variant="primary" size="lg" full onClick={() => set({ exportStep: 1 })}>Prepare file</Button>
            <Button variant="ghost" full onClick={close}>Cancel</Button>
          </div>
        </>}
        {app.exportStep === 1 && <>
          <Body>Gathering everything… about ten seconds.</Body>
          <div style={{ height: 4, borderRadius: 99, background: 'var(--color-surface-raised)', marginTop: 'var(--space-4)', overflow: 'hidden' }}><div style={{ height: '100%', width: '62%', borderRadius: 99, background: 'var(--color-ink)', transition: 'width 1.8s var(--ease-out)' }} /></div>
          <Button variant="ghost" full style={{ marginTop: 'var(--space-4)' }} onClick={close}>Cancel</Button>
        </>}
        {app.exportStep === 2 && <>
          <Body>wsww-export-2026-09-21.json · 38 KB. We’ve also emailed a link that works for 24 hours.</Body>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <Button variant="primary" size="lg" full onClick={close}>Save or share</Button>
            <Button variant="ghost" full onClick={close}>Done</Button>
          </div>
        </>}
      </Sheet>
    </>
  );
}

// Notification pre-permission — shown once, before the OS prompt, after the first Watch now.
function NotifPrePermission({ app, set }) {
  const { Button, Poster } = useC();
  const f = D.films.find(x => x.id === (app.pendingFollowUp || 'thething'));
  const done = (allow) => set({ notifAsked: true, followUp: allow, route: app.returnTo || 'shortlist', returnTo: null });
  return (
    <Screen>
      <TopRow left={<Micro>One thing before you go</Micro>} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-5)', paddingBottom: 60 }}>
        <div style={{ position: 'relative', width: 120, height: 180 }}>
          <Poster title={f.title} tint={f.tint} width={120} height={180} radius={'var(--radius-md)'} style={{ boxShadow: 'var(--elevation-card)' }} />
          <div style={{ position: 'absolute', left: 84, top: -14, minWidth: 190, padding: '10px 14px', borderRadius: 14, background: 'var(--color-surface)', boxShadow: 'var(--elevation-toast)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Micro>Tomorrow, 10:00</Micro>
            <span style={{ font: 'var(--type-label)', color: 'var(--color-ink)' }}>Did you watch {f.title}?</span>
          </div>
        </div>
        <Headline>Can we ask how it went tomorrow?</Headline>
        <Body size="l">One notification the morning after you tap Watch now. Two taps to answer. It’s the single most useful thing you can teach us.</Body>
      </div>
      <div style={{ padding: '0 0 calc(var(--safe-bottom) + 12px)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Button variant="primary" size="lg" full onClick={() => done(true)}>Yes, remind me</Button>
        <Button variant="ghost" full onClick={() => done(false)}>Not now — ask me in the app instead</Button>
      </div>
    </Screen>
  );
}

Object.assign(window, { TabBar, Gate, gated, Account, ConfirmSheets, NotifPrePermission, TAB_ROUTES });
