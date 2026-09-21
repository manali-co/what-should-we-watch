// Onboarding.jsx — first run after sign-in. Three steps: country confirm, services (min 1 of 20), optional name + one-line primer.
function Onboarding({ app, set }) {
  const { Button, ListRow, Switch, Pill, PillRow } = useC();
  const step = app.onboardingStep || 0;
  const detected = D.services.filter(s => s.detected).map(s => s.name);
  const on = app.services;
  const count = Object.values(on).filter(Boolean).length;
  const country = app.country || 'United States';
  const next = () => step < 2 ? set({ onboardingStep: step + 1 }) : set({ route: 'tonight', onboarded: true });

  return (
    <Screen>
      <TopRow left={<Dots n={3} i={step} />} right={step > 0 ? <Button variant="ghost" size="sm" onClick={() => set({ onboardingStep: step - 1 })}>Back</Button> : null} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingTop: 'var(--space-7)', minHeight: 0 }}>
        {step === 0 && <>
          <Micro>Step 1 of 3</Micro>
          <Headline>You're watching from {country}.</Headline>
          <Body size="l">We only show films you can actually play tonight, so the country matters.</Body>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <ListRow title={country} subtitle={app.countryManual ? 'Chosen by you' : 'From your device region'} trailing={<span style={{ font: 'var(--type-label)' }}>✓</span>} />
            <ListRow title="Somewhere else" chevron onClick={() => set({ route: 'country' })} last />
          </div>
        </>}
        {step === 1 && <>
          <Micro>Step 2 of 3</Micro>
          <Headline>{detected.length ? <>We spotted {detected.slice(0, -1).join(', ')} and {detected.slice(-1)}.</> : 'Which services do you have?'}</Headline>
          <Body size="l">Turn on anything we missed. You need at least one.</Body>
          <div style={{ marginTop: 'var(--space-2)', overflowY: 'auto', flex: 1, minHeight: 0, maskImage: 'linear-gradient(to bottom, #000 88%, transparent)', paddingBottom: 40 }}>
            {D.services.map((s, i) => (
              <ListRow key={s.id} title={s.name} subtitle={s.detected ? 'On this phone' : undefined} trailing={<Switch checked={!!on[s.id]} onChange={v => set({ services: { ...on, [s.id]: v } })} label={s.name} />} last={i === D.services.length - 1} />
            ))}
          </div>
        </>}
        {step === 2 && <>
          <Micro>Step 3 of 3</Micro>
          <Headline>What should we call you?</Headline>
          <Body size="l">Optional. It's how friends will see your picks when you decide together.</Body>
          <input value={app.displayName || ''} onChange={e => set({ displayName: e.target.value })} placeholder="Your name" aria-label="Display name"
            style={{ appearance: 'none', border: 0, borderBottom: '1px solid var(--color-hairline-strong)', background: 'transparent', color: 'var(--color-ink)', font: 'var(--type-display-m)', letterSpacing: 'var(--text-display-m-tracking)', padding: '8px 0 12px', outline: 'none', width: '100%' }} />
          <div style={{ marginTop: 'auto', paddingBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Micro>How it works</Micro>
            <Body tone="ink" size="l">Pick a mood or two, we deal ten films that are on {count} service{count === 1 ? '' : 's'} in {country} tonight, and you swipe: right to like, left to pass.</Body>
          </div>
        </>}
      </div>
      <div style={{ padding: '0 0 calc(var(--safe-bottom) + 12px)' }}>
        <Button variant="primary" size="lg" full disabled={step === 1 && count === 0} onClick={next}>
          {step === 0 ? "That's right" : step === 1 ? (count === 0 ? 'Pick at least one' : `Continue with ${count} service${count === 1 ? '' : 's'}`) : (app.displayName ? `Let's go, ${app.displayName}` : 'Skip for now')}
        </Button>
      </div>
    </Screen>
  );
}
window.Onboarding = Onboarding;
