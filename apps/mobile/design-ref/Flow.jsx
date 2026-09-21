// Flow.jsx — Welcome, Sign in (Clerk), Tutorial coach-marks, and the edge/unhappy states.

function BrandMark({ name }) {
  // Placeholder tile for a third-party brand icon (Apple / Google). Drop the official asset in per each brand's guidelines.
  return <span aria-hidden style={{ width: 20, height: 20, borderRadius: 5, background: 'currentColor', opacity: .18, display: 'inline-flex' }} title={`${name} brand icon`} />;
}

function Welcome({ app, set }) {
  const { Button } = useC();
  const hues = ['coral', 'lilac', 'lagoon'];
  return (
    <Screen padded={false}>
      <div style={{ position: 'absolute', left: 'var(--page-inset)', right: 'var(--page-inset)', top: 96 }}>
        <Blend hues={hues} size={44} />
      </div>
      <div style={{ position: 'absolute', left: 'var(--page-inset)', right: 'var(--page-inset)', top: 178, display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <Headline>Tonight feels like… <span style={{ color: 'var(--mood-coral-ink)' }}>cozy</span>. Or <span style={{ color: 'var(--mood-lilac-ink)' }}>a mind-bender</span>. Or both.</Headline>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[['Pick a mood or two.', 'Mix them. Bring friends.'], ['We deal ten films.', 'Only ones actually streaming on your services, in your country, tonight.'], ['Swipe to decide.', 'Right to like, left to pass. Every swipe teaches us what you’d say yes to.']].map(([h, b], i) => (
            <li key={i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 10 }}>
              <span style={{ font: 'var(--type-title)', color: 'var(--color-ink-tertiary)' }}>{i + 1}</span>
              <span><span style={{ display: 'block', font: 'var(--type-title)', letterSpacing: 'var(--text-title-tracking)' }}>{h}</span><Body>{b}</Body></span>
            </li>
          ))}
        </ol>
      </div>
      <div style={{ position: 'absolute', left: 'var(--page-inset)', right: 'var(--page-inset)', bottom: 'calc(var(--safe-bottom) + 12px)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Button variant="primary" size="lg" full onClick={() => set({ route: 'signin', signinMode: 'options' })}>Get started</Button>
        <Button variant="ghost" full onClick={() => set({ route: 'onboarding', onboardingStep: 0, signedIn: null, guest: true })}>Continue as guest</Button>
        <Body tone="tertiary" style={{ font: 'var(--type-caption)', textAlign: 'center' }}>Free. No card. Guests get the full loop on this phone; sign in later to decide with friends.</Body>
      </div>
    </Screen>
  );
}

// Sign in via Clerk: Apple (native, iOS) · Google · email code. Modes: options → email → code → failed.
const GATE_HEAD = { group: 'Sign in to decide together.', sync: 'Sign in to keep your taste everywhere.', account: 'Sign in to manage your account.', faceid: 'Sign in to lock the app.', export: 'Sign in to export your data.' };
function SignIn({ app, set }) {
  const { Button, IconButton, Toast } = useC();
  React.useEffect(() => { if (!app.cancelToast) return; const id = setTimeout(() => set({ cancelToast: false }), 2400); return () => clearTimeout(id); }, [app.cancelToast]);
  const mode = app.signinMode || 'options';
  const [email, setEmail] = React.useState(app.email || 'manali@example.com');
  const [code, setCode] = React.useState('');
  // Return path: session expiry → back to the exact deck card; gate → the screen that gated; otherwise first-run onboarding.
  const done = (via) => set({ signedIn: via, guest: false, route: app.sessionExpired ? (app.resume ? app.resume.route : 'tonight') : app.returnTo ? app.returnTo : app.onboarded ? 'tonight' : 'onboarding', deckIndex: app.sessionExpired && app.resume ? app.resume.deckIndex : app.deckIndex, onboardingStep: 0, sessionExpired: false, signinMode: 'options', returnTo: null, resume: null, gateFeature: null });
  const back = () => set({ signinMode: mode === 'code' ? 'email' : 'options' });
  return (
    <Screen>
      <TopRow left={mode !== 'options' ? <Button variant="ghost" size="sm" onClick={back}>Back</Button> : <Micro>{app.sessionExpired ? 'Signed out' : 'Sign in'}</Micro>} right={mode === 'options' ? <Button variant="ghost" size="sm" onClick={() => set(app.returnTo || app.sessionExpired ? { route: app.returnTo || (app.resume ? app.resume.route : 'shortlist'), returnTo: null, gateFeature: null } : { route: 'onboarding', onboardingStep: 0, signedIn: null, guest: true })}>{app.returnTo || app.sessionExpired ? 'Not now' : 'Continue as guest'}</Button> : null} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingTop: 'var(--space-7)' }}>
        {mode === 'options' && <>
          <Headline>{app.sessionExpired ? 'You were signed out.' : app.gateFeature ? GATE_HEAD[app.gateFeature] || 'Sign in to keep this.' : 'Keep your taste, not just your phone’s.'}</Headline>
          <Body size="l">{app.sessionExpired ? (app.resume ? `Your session expired mid-deck. Sign in and you’re back on card ${app.resume.deckIndex + 1} of 10.` : 'Your session expired. Sign in again and everything is where you left it.') : app.gateFeature ? 'Your shortlist and taste so far merge into the account. Nothing is lost.' : 'Sign in so what the app learns survives a new phone and works when friends join.'}</Body>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', paddingBottom: 'var(--space-4)' }}>
            <Button variant="primary" size="lg" full icon={<BrandMark name="Apple" />} onClick={() => done('apple')} style={{ justifyContent: 'flex-start', paddingLeft: 20 }}><span style={{ flex: 1, textAlign: 'center', marginRight: 26 }}>Continue with Apple</span></Button>
            <Button variant="outline" size="lg" full icon={<BrandMark name="Google" />} onClick={() => set({ signinMode: 'pending' })} style={{ justifyContent: 'flex-start', paddingLeft: 20 }}><span style={{ flex: 1, textAlign: 'center', marginRight: 26 }}>Continue with Google</span></Button>
            <Button variant="secondary" size="lg" full onClick={() => set({ signinMode: 'email' })}>Continue with email</Button>
            <Body tone="tertiary" style={{ font: 'var(--type-caption)', textAlign: 'center', marginTop: 4 }}>By continuing you agree to the terms and privacy policy.</Body>
          </div>
          <Toast open={!!app.cancelToast} message="No problem — nothing was saved." />
        </>}
        {mode === 'pending' && <>
          <Headline>Finishing sign-in with Google…</Headline>
          <Body size="l">A browser window opened. Come back here when it’s done.</Body>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>
            <Button variant="primary" size="lg" full onClick={() => done('google')}>It’s done</Button>
            <Button variant="ghost" full onClick={() => set(app.returnTo ? { route: app.returnTo, returnTo: null, gateFeature: null, signinMode: 'options', cancelToast: true } : { signinMode: 'options', cancelToast: true })}>I cancelled</Button>
            <Button variant="ghost" size="sm" full onClick={() => set({ signinMode: 'failed', signinError: 'provider' })} style={{ color: 'var(--color-ink-tertiary)' }}>Simulate a provider error</Button>
          </div>
        </>}
        {mode === 'email' && <>
          <Headline>What’s your email?</Headline>
          <Body size="l">We’ll send a six-digit code. No password to remember.</Body>
          <input value={email} onChange={e => setEmail(e.target.value)} inputMode="email" aria-label="Email" style={{ appearance: 'none', border: 0, borderBottom: '1px solid var(--color-hairline-strong)', background: 'transparent', color: 'var(--color-ink)', font: 'var(--type-display-m)', letterSpacing: 'var(--text-display-m-tracking)', padding: '8px 0 12px', outline: 'none', width: '100%' }} />
          <div style={{ marginTop: 'auto', paddingBottom: 'var(--space-4)' }}><Button variant="primary" size="lg" full disabled={!email.includes('@')} onClick={() => set({ signinMode: 'code', email })}>Send code</Button></div>
        </>}
        {mode === 'code' && <>
          <Headline size="l" style={{ overflowWrap: 'anywhere' }}>Enter the code we sent to {email}.</Headline>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 'var(--space-2)' }}>
            {Array.from({ length: 6 }).map((_, i) => <span key={i} style={{ height: 56, borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', boxShadow: i === code.length ? 'inset 0 0 0 1.5px var(--color-ink)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', font: 'var(--type-display-m)', color: 'var(--color-ink)' }}>{code[i] || ''}</span>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 'var(--space-3)' }}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => <button key={i} type="button" disabled={!k} onClick={() => setCode(c => k === '⌫' ? c.slice(0, -1) : (c + k).slice(0, 6))} style={{ appearance: 'none', border: 0, background: 'transparent', color: 'var(--color-ink)', height: 48, borderRadius: 'var(--radius-sm)', font: 'var(--type-title)', cursor: 'pointer' }}>{k}</button>)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingBottom: 'var(--space-4)', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setCode('')}>Resend code</Button>
            <Button variant="primary" size="lg" disabled={code.length < 6} onClick={() => code === '000000' ? set({ signinMode: 'failed', signinError: 'code' }) : done('email')}>Continue</Button>
          </div>
          <Body tone="tertiary" style={{ font: 'var(--type-caption)' }}>Codes expire in 10 minutes. Try 000000 to see the failure state.</Body>
        </>}
        {mode === 'failed' && <>
          <Headline>{app.signinError === 'code' ? 'That code didn’t work.' : 'We couldn’t sign you in.'}</Headline>
          <Body size="l">{app.signinError === 'code' ? 'It may have expired, or a digit is off. We can send a new one.' : app.signinError === 'network' ? 'The sign-in service didn’t answer. Check your connection and try again.' : 'Google sent us back without a session. Not something you did; trying again usually fixes it.'}</Body>
          <Micro>{app.signinError === 'code' ? 'Code rejected' : app.signinError === 'network' ? 'No connection' : 'Provider error · ref 4a7f'}</Micro>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingBottom: 'var(--space-4)' }}>
            <Button variant="primary" size="lg" full onClick={() => set({ signinMode: app.signinError === 'code' ? 'code' : 'options' })}>{app.signinError === 'code' ? 'Send a new code' : 'Try again'}</Button>
            {app.signinError !== 'code' && <Button variant="secondary" size="lg" full onClick={() => set({ signinMode: 'email' })}>Use email instead</Button>}
            <Button variant="ghost" full onClick={() => set({ route: 'onboarding', onboardingStep: 0, signedIn: null, signinMode: 'options' })}>Continue without an account</Button>
          </div>
        </>}
      </div>
    </Screen>
  );
}

// Tutorial — coach-marks over the first deck card. A ghost card demonstrates the four swipes, each with its stamp, then tap-for-trailer. Dismisses on first interaction.
const TUT = [
  { kind: 'nope', x: -150, y: 0, title: 'Swipe left to pass', body: 'Not tonight. We won’t show it again for a while.' },
  { kind: 'like', x: 150, y: 0, title: 'Swipe right to like', body: 'Goes to your shortlist as a strong yes.' },
  { kind: 'maybe', x: 0, y: -130, title: 'Swipe up for maybe', body: 'Keep it around without committing.' },
  { kind: 'watched', x: 0, y: 130, title: 'Swipe down if you’ve seen it', body: 'Then tell us if it was any good.' },
  { kind: null, x: 0, y: 0, title: 'Tap the poster for the trailer', body: 'Plays inline. Swipe any time to decide.' },
];
function Tutorial({ app, set }) {
  const { PosterCard, Button } = useC();
  const [step, setStep] = React.useState(0);
  const [out, setOut] = React.useState(false);
  const reduced = app.reducedMotion;
  React.useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => { setOut(true); setTimeout(() => { setOut(false); setStep(s => (s + 1) % TUT.length); }, 420); }, 1900);
    return () => clearInterval(id);
  }, [reduced]);
  const t = TUT[step];
  const film = D.films[(app.deck || [])[app.deckIndex || 0] ? D.films.findIndex(f => f.id === app.deck[app.deckIndex || 0]) : 0];
  const dismiss = () => set({ route: app.tutorialReturn || 'deck', tutorialSeen: true, tutorialReturn: null });
  const ghostT = out && t.kind ? `translate(${t.x}px, ${t.y}px) rotate(${Math.max(-12, Math.min(12, t.x * .06))}deg)` : 'translate(0,0) rotate(0)';
  return (
    <div style={{ position: 'absolute', inset: 0 }} onPointerDown={dismiss}>
      <Deck app={app} set={() => {}} frozen />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,17,20,.8)' }} />
      <div style={{ position: 'absolute', left: 'var(--page-inset)', right: 'var(--page-inset)', top: 54 + 44 + 8 + 20, height: 'var(--card-height)' }}>
        <div style={{ position: 'absolute', inset: 0, transform: ghostT, transition: reduced ? 'none' : (out ? 'transform 420ms var(--ease-out)' : 'none'), opacity: 1 }}>
          <PosterCard film={film} stamp={t.kind || undefined} stampOpacity={out ? 1 : 0} style={{ boxShadow: 'var(--elevation-card-lifted)' }} />
          {!t.kind && <div style={{ position: 'absolute', left: '50%', top: '42%', width: 72, height: 72, borderRadius: 99, border: '2px solid #F2F1EE', transform: 'translate(-50%, -50%)', animation: reduced ? 'none' : 'wsww-pulse 1.2s ease-out infinite' }} />}
        </div>
        {t.kind && <div aria-hidden style={{ position: 'absolute', left: '50%', top: '50%', width: 48, height: 48, marginLeft: -24, marginTop: -24, borderRadius: 99, background: 'rgba(242,241,238,.9)', transform: out ? `translate(${t.x * .6}px, ${t.y * .6}px)` : 'translate(0,0)', transition: out ? 'transform 420ms var(--ease-out)' : 'none', boxShadow: '0 4px 16px rgba(0,0,0,.35)' }} />}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '20px var(--page-inset) calc(var(--safe-bottom) + 12px)', background: '#101114', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>{TUT.map((_, i) => <span key={i} style={{ height: 3, flex: 1, borderRadius: 99, background: i <= step ? '#F2F1EE' : 'rgba(242,241,238,.3)' }} />)}</div>
        <div style={{ color: '#F2F1EE', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ font: 'var(--type-display-m)', letterSpacing: 'var(--text-display-m-tracking)' }}>{t.title}</span>
          <span style={{ font: 'var(--type-body-l)', color: '#C9C8C4' }}>{t.body}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Micro style={{ color: '#A9A8A4' }}>{step + 1} of {TUT.length} · touch anywhere to start</Micro>
          <button type="button" onClick={dismiss} style={{ appearance: 'none', border: 0, background: '#F2F1EE', color: '#17181B', height: 40, padding: '0 18px', borderRadius: 99, font: 'var(--type-label)', cursor: 'pointer' }}>Got it</button>
        </div>
      </div>
    </div>
  );
}

/* ---- Edge and unhappy states ---- */

function PassedAll({ app, set }) {
  const { Button, Poster } = useC();
  const deck = (app.deck || D.films.slice(0, 10).map(f => f.id)).map(id => D.films.find(f => f.id === id));
  return (
    <Screen>
      <TopRow left={<Micro>That's ten</Micro>} />
      <div style={{ paddingTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Headline size="l">You passed on all ten.</Headline>
        <Body size="l">Fair. Either the mood was off, or tonight wants something we haven’t tried. Ten more of the same, or a different mood?</Body>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 'var(--space-6)', overflow: 'hidden', maskImage: 'linear-gradient(to right, #000 80%, transparent)' }}>
        {deck.map(f => <Poster key={f.id} title={f.title} tint={f.tint} width={52} height={78} radius={6} style={{ opacity: .45, filter: 'saturate(.4)' }} />)}
      </div>
      <Body tone="tertiary" style={{ font: 'var(--type-caption)', marginTop: 'var(--space-2)' }}>We’ll rest these for a few weeks. Changed your mind about one? Undo from the shortlist.</Body>
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: '0 0 calc(var(--safe-bottom) + 10px)' }}>
        <Button variant="primary" size="lg" full onClick={() => set({ route: 'mood' })}>Change the mood</Button>
        <Button variant="secondary" size="lg" full onClick={() => set({ route: 'thinking', dealt: (app.dealt || 1) + 1 })}>Deal ten more anyway</Button>
      </div>
    </Screen>
  );
}

function EmptyDeck({ app, set }) {
  const { Button } = useC();
  const words = [...new Set((app.picks || []).map(p => p.w))];
  const svc = D.services.filter(s => app.services[s.id]).map(s => s.name);
  const list = svc.length > 3 ? `${svc.slice(0, 3).join(', ')} and ${svc.length - 3} more` : svc.join(', ');
  return (
    <Screen>
      <TopRow left={<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><Micro>Tonight</Micro><span style={{ font: 'var(--type-title)', letterSpacing: 'var(--text-title-tracking)' }}>{words.length ? words.join(' · ') : 'cozy · big laughs'}</span></div>} />
      <Empty title="Nothing on your services feels like that tonight." body={`${list} don’t have a ${words.length ? words.join(', ') : 'cozy, funny'} film in ${app.country || 'the United States'} we haven’t already shown you.`} />
      <div style={{ position: 'absolute', left: 'var(--page-inset)', right: 'var(--page-inset)', bottom: 'calc(var(--safe-bottom) + 10px)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Button variant="primary" size="lg" full onClick={() => set({ route: 'mood' })}>Change the moods</Button>
        <Button variant="secondary" size="lg" full onClick={() => set({ route: 'onboarding', onboardingStep: 1 })}>Add a service</Button>
        <Button variant="ghost" full onClick={() => set({ route: 'thinking' })}>Drop one mood and try again</Button>
      </div>
    </Screen>
  );
}

function ApiDown({ app, set, offline }) {
  const { Button } = useC();
  return (
    <Screen>
      <TopRow left={<Micro>Tonight</Micro>} />
      {offline
        ? <Offline what="tonight’s deck" detail="We need a connection to check what’s on your services right now. Your shortlist works offline." onRetry={() => set({ route: 'thinking' })} />
        : <Empty kicker="Our side, not yours" title="We couldn’t build tonight’s ten." body="The catalog service didn’t answer. It usually comes back in a minute; your shortlist is still here." action="Try again" onAction={() => set({ route: 'thinking' })} />}
      <div style={{ position: 'absolute', left: 'var(--page-inset)', right: 'var(--page-inset)', bottom: 'calc(var(--safe-bottom) + 10px)' }}><Button variant="secondary" full onClick={() => set({ route: 'shortlist' })}>Open shortlist</Button></div>
    </Screen>
  );
}

function RateLimited({ app, set }) {
  return <Deck app={app} set={set} banner="Catalog is busy. Showing last night’s list; availability may have changed." />;
}
function MissingPoster({ app, set }) {
  const film = { ...D.films[3], posterMissing: true, why: 'No artwork from the service yet. The film is real; the poster will follow.' };
  return <Deck app={app} set={set} film={film} />;
}
function TrailerUnavailable({ app, set }) {
  const film = { ...D.films[8], noTrailer: true };
  return <Deck app={app} set={set} film={film} initialToast={{ msg: 'No trailer for Before Sunrise yet', tone: 'neutral', noUndo: true }} frozen />;
}

function SessionExpired({ app, set }) {
  const { Button } = useC();
  return (
    <Screen>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--space-4)', paddingBottom: 80 }}>
        <Blend hues={['coral', 'lilac', 'lagoon']} size={28} />
        <Micro>Signed out</Micro>
        <Headline size="l">Your session expired.</Headline>
        <Body size="l">{app.resume ? `You were on card ${app.resume.deckIndex + 1} of 10. Your decisions so far are saved on this phone; sign in and the deck picks up right there.` : 'Nothing is lost. Sign in again and the shortlist, taste and tonight’s deck are where you left them.'}</Body>
        {app.resume && <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>{(app.deck || []).map((id, i) => <span key={id} style={{ width: 22, height: 33, borderRadius: 4, background: i < app.resume.deckIndex ? 'var(--color-ink-tertiary)' : i === app.resume.deckIndex ? 'var(--color-ink)' : 'var(--color-surface-raised)' }} />)}</div>}
      </div>
      <div style={{ padding: '0 0 calc(var(--safe-bottom) + 12px)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Button variant="primary" size="lg" full onClick={() => set({ route: 'signin', signinMode: 'options', sessionExpired: true })}>Sign in{app.resume ? ' and keep going' : ''}</Button>
        <Button variant="ghost" full onClick={() => set({ route: 'shortlist' })}>Just show my shortlist</Button>
      </div>
    </Screen>
  );
}

function Skel({ w = '100%', h = 16, r = 6, style }) {
  return <span style={{ display: 'block', width: w, height: h, borderRadius: r, background: 'var(--color-surface-raised)', animation: 'wsww-pulse-bg 1.4s ease-in-out infinite', ...style }} />;
}
function Skeletons({ app, set }) {
  const which = app.skeleton || 'deck';
  return (
    <Screen>
      <TopRow left={<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Skel w={48} h={10} /><Skel w={150} h={20} /></div>} right={<Skel w={44} h={44} r={99} />} />
      {which === 'deck' ? <>
        <div style={{ position: 'relative', marginTop: 'var(--space-5)', height: 'var(--card-height)' }}>
          <div style={{ position: 'absolute', inset: 0, transform: 'translateY(14px) scale(.94)', transformOrigin: 'top center', borderRadius: 'var(--radius-card)', background: 'var(--color-surface)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: 'var(--radius-card)', background: 'var(--color-surface-raised)', animation: 'wsww-pulse-bg 1.4s ease-in-out infinite', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 22, right: 22, bottom: 22, display: 'flex', flexDirection: 'column', gap: 10 }}><Skel w={90} h={14} style={{ background: 'var(--color-surface-pressed)' }} /><Skel w="70%" h={30} style={{ background: 'var(--color-surface-pressed)' }} /><Skel w={120} h={14} style={{ background: 'var(--color-surface-pressed)' }} /><Skel w="90%" h={14} style={{ background: 'var(--color-surface-pressed)' }} /></div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 'var(--space-6)' }}><Skel w={130} h={32} r={99} /><Skel w={100} h={32} r={99} /><Skel w={96} h={32} r={99} /></div>
        <Micro style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>Slow connection · still loading tonight’s ten</Micro>
      </> : <>
        <div style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column' }}>
          <Skel w={70} h={10} style={{ margin: '14px 0 12px' }} />
          {[0, 1, 2].map(i => <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: 'var(--hairline)' }}><Skel w={44} h={66} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}><Skel w="60%" h={16} /><Skel w="40%" h={12} /></div><Skel w={92} h={36} r={99} /></div>)}
          <Skel w={50} h={10} style={{ margin: '24px 0 12px' }} />
          {[0, 1].map(i => <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: i ? 0 : 'var(--hairline)' }}><Skel w={44} h={66} /><div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}><Skel w="50%" h={16} /><Skel w="35%" h={12} /></div><Skel w={92} h={36} r={99} /></div>)}
        </div>
      </>}
    </Screen>
  );
}

function CountryPicker({ app, set }) {
  const { Button, ListRow } = useC();
  const [q, setQ] = React.useState('');
  const list = D.countries.filter(c => c.toLowerCase().includes(q.toLowerCase()));
  const unknown = !app.country;
  return (
    <Screen>
      <TopRow left={<Micro>{unknown ? 'Where are you?' : 'Country'}</Micro>} right={!unknown ? <Button variant="ghost" size="sm" onClick={() => set({ route: 'onboarding' })}>Cancel</Button> : null} />
      <div style={{ paddingTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Headline size="l">{unknown ? 'We couldn’t tell where you’re watching from.' : 'Which country?'}</Headline>
        {unknown && <Body size="l">Your device didn’t say. Pick a country so we only show films that actually play there.</Body>}
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search countries" aria-label="Search countries" style={{ appearance: 'none', border: 0, background: 'var(--color-surface)', color: 'var(--color-ink)', font: 'var(--type-body-l)', padding: '12px 16px', borderRadius: 'var(--radius-md)', outline: 'none', width: '100%', marginTop: 'var(--space-2)' }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', marginTop: 'var(--space-2)', maskImage: 'linear-gradient(to bottom, #000 92%, transparent)' }}>
        {list.map((c, i) => <ListRow key={c} title={c} trailing={(app.country || '') === c ? <span style={{ font: 'var(--type-label)' }}>✓</span> : null} onClick={() => set(app.onboarded ? { country: c, countryManual: true, route: 'tonight', lineupChange: (app.deck && (app.deckIndex || 0) < app.deck.length && c !== (app.country || 'United States')) ? { kind: 'country', country: c, affected: 4 } : null } : { country: c, countryManual: true, route: 'onboarding', onboardingStep: 0 })} last={i === list.length - 1} />)}
        {!list.length && <Body tone="tertiary" style={{ padding: '16px 0' }}>No match. We currently support 18 countries; more are coming.</Body>}
      </div>
    </Screen>
  );
}

Object.assign(window, { Welcome, SignIn, Tutorial, PassedAll, EmptyDeck, ApiDown, RateLimited, MissingPoster, TrailerUnavailable, SessionExpired, Skeletons, CountryPicker });
