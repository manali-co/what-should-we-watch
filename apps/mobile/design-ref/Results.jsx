// Results.jsx — End of deck, Shortlist, Follow-up.
function ranked(app) {
  const d = app.decisions || {};
  const by = k => Object.keys(d).filter(id => d[id] === k).map(id => D.films.find(f => f.id === id));
  return { yes: by('like'), maybe: by('maybe') };
}

function EndOfDeck({ app, set }) {
  const { Button, Poster, ListRow } = useC();
  const { yes, maybe } = ranked(app);
  const all = [...yes, ...maybe];
  return (
    <Screen>
      <TopRow left={<Micro>That's ten</Micro>} right={<Button variant="ghost" size="sm" onClick={() => set({ route: 'shortlist' })}>Shortlist</Button>} />
      <div style={{ paddingTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Headline size="l">{all.length ? `${yes.length} yes, ${maybe.length} maybe.` : 'Nothing landed.'}</Headline>
        <Body size="l">{all.length ? 'Ranked by how sure you seemed. Tap one to watch, or keep going.' : 'That happens. Ten more, or a different mood?'}</Body>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 'var(--space-4)', maskImage: 'linear-gradient(to bottom, #000 90%, transparent)' }}>
        {all.map((f, i) => (
          <ListRow key={f.id} title={f.title} subtitle={`${f.service} · ${f.runtime}${f.expiresInDays ? ` · leaves in ${f.expiresInDays} days` : ''}`} onClick={() => set({ route: 'shortlist' })}
            leading={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><span style={{ width: 18, font: 'var(--type-caption)', color: 'var(--color-ink-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span><Poster title={f.title} tint={f.tint} width={40} height={60} radius={6} /></span>}
            trailing={<span style={{ width: 8, height: 8, borderRadius: 99, background: i < yes.length ? 'var(--color-yes)' : 'var(--color-ink-tertiary)' }} />} last={i === all.length - 1} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-4) 0 calc(var(--safe-bottom) + 10px)' }}>
        <Button variant="primary" size="lg" full onClick={() => set({ route: 'thinking', dealt: (app.dealt || 1) + 1 })}>Deal ten more</Button>
        <Button variant="secondary" size="lg" full onClick={() => set({ route: 'mood' })}>Change the mood</Button>
      </div>
    </Screen>
  );
}

function Shortlist({ app, set, variant }) {
  const { Button, Poster, ListRow, SectionLabel, Toast } = useC();
  const offline = variant === 'offline' || app.offline;
  const [offToast, setOffToast] = React.useState(null);
  React.useEffect(() => { if (!offToast) return; const id = setTimeout(() => setOffToast(null), 2800); return () => clearTimeout(id); }, [offToast]);
  const { yes, maybe } = ranked(app);
  const empty = variant === 'empty' || (!yes.length && !maybe.length);
  const watch = f => { if (offline) return setOffToast(f); if (!app.notifAsked && app.followUp !== false) return set({ pendingFollowUp: f.id, route: 'notif', returnTo: 'shortlist', watchNowTapped: true }); set({ pendingFollowUp: f.id, watchNowTapped: true }); };
  const row = (f, i, arr) => (
    <ListRow key={f.id} title={f.title} subtitle={`${f.service} · ${f.runtime}${f.expiresInDays ? ` · leaves in ${f.expiresInDays} days` : ''}`}
      leading={<Poster title={f.title} tint={f.tint} width={44} height={66} radius={6} />}
      trailing={<Button size="sm" variant={i === 0 && arr === yes ? 'primary' : 'secondary'} onClick={() => watch(f)}>Watch now</Button>} last={i === arr.length - 1} />
  );
  return (
    <Screen style={{ paddingBottom: 'calc(50px + var(--safe-bottom))' }}>
      <TopRow left={<Headline size="m">Shortlist</Headline>} right={<Button variant="ghost" size="sm" onClick={() => set({ route: 'mood' })}>New mood</Button>} />
      {offline && <div style={{ marginTop: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', font: 'var(--type-caption)', color: 'var(--color-ink-secondary)' }}><span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--color-ink-tertiary)' }} />You’re offline. Your shortlist is saved on this phone; Watch now needs a connection.</div>}
      {empty ? <Empty title="Nothing shortlisted yet." body="Swipe right on anything in the deck and it lands here, sorted by how sure you were." action="Deal ten" onAction={() => set({ route: 'mood' })} /> : (
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 'var(--space-8)' }}>
            {/* Guest → member: keep this shortlist across phones. Gentle, dismissible, never for members. */}
            <ConvertNudge app={app} set={set} kind="shortlist" />
            {yes.length > 0 && <><SectionLabel>Strong yes</SectionLabel>{yes.map((f, i) => row(f, i, yes))}</>}
            {maybe.length > 0 && <><SectionLabel>Maybe</SectionLabel>{maybe.map((f, i) => row(f, i, maybe))}</>}
            <Body tone="tertiary" style={{ font: 'var(--type-caption)', marginTop: 'var(--space-6)' }}>Watch now opens the film in the streaming app. Tomorrow we'll ask how it went.</Body>
          </div>
        )}
      <Toast open={!!offToast} message={offToast ? `You’re offline — can’t open ${offToast.title} on ${offToast.service} right now` : ''} actionLabel="Retry" onAction={() => { setOffToast(null); if (!app.offline) watch(offToast); }} style={{ bottom: 'calc(var(--safe-bottom) + 62px)' }} />
      {app.watchNowTapped && <div style={{ position: 'absolute', left: 'var(--page-inset)', right: 'var(--page-inset)', bottom: 'calc(var(--safe-bottom) + 62px)', display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, padding: '0 18px', borderRadius: 'var(--radius-full)', background: 'var(--color-ink)', color: 'var(--color-ink-inverse)', boxShadow: 'var(--elevation-toast)', font: 'var(--type-body)' }}>Opening {D.films.find(f => f.id === app.pendingFollowUp).service}…<button type="button" onClick={() => set({ route: 'followup', watchNowTapped: false })} style={{ marginLeft: 'auto', appearance: 'none', border: 0, background: 'transparent', color: 'inherit', font: 'var(--type-label)', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer', height: 40 }}>Skip to tomorrow</button></div>}
    </Screen>
  );
}

function Empty({ title, body, action, onAction, kicker }) {
  const { Button } = useC();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-4)', paddingBottom: 80 }}>
      <Blend hues={['coral', 'lilac', 'lagoon']} size={28} style={{ opacity: .9 }} />
      {kicker && <Micro>{kicker}</Micro>}
      <Headline size="l">{title}</Headline>
      <Body size="l">{body}</Body>
      {action && <div><Button variant="primary" onClick={onAction}>{action}</Button></div>}
    </div>
  );
}
function Offline({ what, detail, onRetry }) {
  return <Empty kicker="You're offline" title={`We can't refresh ${what}.`} body={detail} action={onRetry ? 'Try again' : null} onAction={onRetry} />;
}

// Follow-up — the next open after "Watch now". Two taps: did you watch it → how was it.
function FollowUp({ app, set }) {
  const { Button, Pill, PillRow, Poster } = useC();
  const film = D.films.find(f => f.id === (app.pendingFollowUp || 'thething'));
  const [step, setStep] = React.useState(0); // 0 watched?, 1 reaction, 2 done
  const [answer, setAnswer] = React.useState(null);
  const finish = (r) => { set({ reactions: { ...(app.reactions || {}), [film.id]: r }, pendingFollowUp: null }); setStep(2); setTimeout(() => set({ route: 'mood' }), 1400); };
  return (
    <Screen>
      <TopRow left={<Micro>Last night</Micro>} right={<Button variant="ghost" size="sm" onClick={() => set({ route: 'mood', pendingFollowUp: null })}>Later</Button>} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-6)', paddingBottom: 60 }}>
        <Poster title={film.title} tint={film.tint} width={120} height={180} radius={'var(--radius-md)'} style={{ boxShadow: 'var(--elevation-card)' }} />
        {step === 0 && <>
          <Headline>Did you watch {film.title} last night?</Headline>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Button variant="primary" size="lg" full onClick={() => { setAnswer('yes'); setStep(1); }}>Yes</Button>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="secondary" size="lg" full onClick={() => { setAnswer('started'); setStep(1); }}>Started it</Button>
              <Button variant="secondary" size="lg" full onClick={() => { set({ pendingFollowUp: null }); setStep(2); setTimeout(() => set({ route: 'mood' }), 1200); }}>No</Button>
            </div>
          </div>
        </>}
        {step === 1 && <>
          <Headline>{answer === 'started' ? 'Fair enough. How far did it get you?' : 'And?'}</Headline>
          <PillRow>
            <Pill tone="yes" leading size="lg" onClick={() => finish('liked')}>Liked it</Pill>
            <Pill tone="watched" size="lg" onClick={() => finish('okay')}>It was okay</Pill>
            <Pill tone="no" leading size="lg" onClick={() => finish('not')}>Not for me</Pill>
          </PillRow>
        </>}
        {step === 2 && <>
          <Headline>Noted. Thanks.</Headline>
          <Body size="l">That's one more thing we know about your nights.</Body>
        </>}
      </div>
    </Screen>
  );
}
Object.assign(window, { EndOfDeck, Shortlist, FollowUp, Empty, Offline, ranked });
