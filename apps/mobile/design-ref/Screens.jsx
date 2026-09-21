// Taste.jsx + Settings.jsx + States.jsx
function Taste({ app, set }) {
  const { Button, Pill, PillRow, SectionLabel, ListRow, Poster } = useC();
  const d = app.decisions || {}; const r = app.reactions || {};
  const n = k => Object.values(d).filter(x => x === k).length;
  const patterns = [
    { k: 'Weeknights', moods: ['brain off', 'big laughs'], note: 'and nothing over two hours' },
    { k: 'Weekends', moods: ['slow burn', 'a proper epic'], note: 'you have the room for long ones' },
    { k: 'Late, after 10', moods: ['properly scary', 'mind-bender'], note: 'you skip anything cozy' },
    { k: 'Autumn', moods: ['spooky not scary', 'comfort rewatch'], note: 'the rewatches start in October' },
    { k: 'With Jo', moods: ['heist energy', 'whodunit'], note: 'you both say yes to twists' },
  ];
  const hue = w => D.moods.find(m => m.w === w).hue;
  // Contextual signals: captured automatically, never set by the user. Read-only, phrased as observations. Each row can carry a poster that typifies the pattern.
  const noticed = [
    { signal: 'Sunday nights', text: 'Comfort rewatches on Sunday nights.', mood: 'comfort rewatch', film: 'budapest' },
    { signal: 'Weeknights', text: 'Shorter films on weeknights — nothing over two hours since spring.', mood: 'brain off', film: 'paddington2' },
    { signal: 'Late, after 10', text: 'The later it gets, the stranger you go.', mood: 'mind-bender', film: 'arrival' },
    { signal: 'Autumn', text: 'Darker, slower picks in autumn.', mood: 'dark and twisty', film: 'thething' },
    { signal: 'Late December', text: 'Feel-good around the holidays, and you don’t mind having seen it before.', mood: 'feel-good', film: 'moonstruck' },
    { signal: 'Saturdays', text: 'Saturdays are for the long ones, ideally with someone.', mood: 'a proper epic', film: 'heat' },
    { signal: 'Summer', text: 'Summer evenings lean bright and a little chaotic.', mood: 'chaotic', film: 'oceans' },
  ];
  const filmOf = id => D.films.find(f => f.id === id);
  return (
    <Screen>
      <TopRow left={<Headline size="m">Taste</Headline>} right={<Button variant="ghost" size="sm" onClick={() => set({ route: 'mood' })}>Done</Button>} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 'var(--space-9)', maskImage: 'linear-gradient(to bottom, #000 94%, transparent)' }}>
        <div style={{ paddingTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Headline size="l">You like films that take their time, as long as they're under two hours.</Headline>
          <Body size="l">You say yes to <span style={{ color: 'var(--mood-lagoon-ink)' }}>slow burns</span> and <span style={{ color: 'var(--mood-coral-ink)' }}>quiet, tender</span> ones more than anything else. You almost never finish a film that starts after 11. Funny beats clever on a Tuesday. You've marked 14 as seen, and liked 11 of them, so we trust your past.</Body>
        </div>
        <SectionLabel>Patterns</SectionLabel>
        {patterns.map((p, i) => (
          <div key={p.k} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0', borderBottom: i < patterns.length - 1 ? 'var(--hairline)' : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ font: 'var(--type-body-l)', color: 'var(--color-ink)' }}>{p.k}</span><span style={{ font: 'var(--type-caption)', color: 'var(--color-ink-tertiary)' }}>{p.note}</span></div>
            <PillRow>{p.moods.map(m => <Pill key={m} hue={hue(m)} size="sm" selected>{m}</Pill>)}</PillRow>
          </div>
        ))}
        <SectionLabel>What we’ve noticed</SectionLabel>
        <Body style={{ font: 'var(--type-caption)', color: 'var(--color-ink-tertiary)', margin: '-2px 0 6px' }}>Learned from when you watch — time of day, day of week, season, holidays. Not settings; they shift as you do.</Body>
        {noticed.map((n, i) => {
          const f = filmOf(n.film);
          return (
            <div key={n.signal} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12, alignItems: 'center', padding: '12px 0', borderBottom: i < noticed.length - 1 ? 'var(--hairline)' : 0 }}>
              <Poster title={f.title} tint={f.tint} width={40} height={60} radius={6} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                <Micro>{n.signal}</Micro>
                <span style={{ font: 'var(--type-body-l)', color: 'var(--color-ink)', textWrap: 'pretty' }}>{n.text}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Pill hue={hue(n.mood)} size="sm" selected>{n.mood}</Pill><span style={{ font: 'var(--type-caption)', color: 'var(--color-ink-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>e.g. {f.title}</span></div>
              </div>
            </div>
          );
        })}
        <SectionLabel>What you’ve told us</SectionLabel>
        {[['Yes', 38 + n('like'), 'yes'], ['Maybe', 12 + n('maybe'), null], ['No', 21 + n('nope'), 'no'], ['Seen it', 14 + n('watched'), null]].map(([k, v, tone], i, arr) => (
          <ListRow key={k} title={k} value={String(v)} leading={<span style={{ width: 8, height: 8, borderRadius: 99, background: tone === 'yes' ? 'var(--color-yes)' : tone === 'no' ? 'var(--color-no)' : 'var(--color-ink-tertiary)' }} />} last={i === arr.length - 1} />
        ))}
        <Body tone="tertiary" style={{ font: 'var(--type-caption)', marginTop: 'var(--space-4)' }}>Every swipe and every follow-up answer is in here. What we’ve noticed comes from when you watch, not from anything you set; it feeds tonight’s ten quietly. Wrong about something? Change a decision from your shortlist, or reset it all in Settings.</Body>
      </div>
    </Screen>
  );
}

function Settings({ app, set }) {
  const { Button, ListRow, SectionLabel, Segmented, Switch } = useC();
  const svc = D.services.filter(s => app.services[s.id]).map(s => s.name);
  return (
    <Screen>
      <TopRow left={<Headline size="m">Settings</Headline>} right={<Button variant="ghost" size="sm" onClick={() => set({ route: 'mood' })}>Done</Button>} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: 'var(--space-9)', maskImage: 'linear-gradient(to bottom, #000 94%, transparent)' }}>
        <SectionLabel>Where and what</SectionLabel>
        <ListRow title="Country" value="United States" chevron onClick={() => {}} />
        <ListRow title="Streaming services" subtitle={svc.join(', ')} value={String(svc.length)} chevron onClick={() => set({ route: 'onboarding', onboardingStep: 1 })} last />
        <SectionLabel>Accounts</SectionLabel>
        <ListRow title="Apple" value={app.signedIn === 'apple' ? 'Signed in' : undefined} trailing={app.signedIn !== 'apple' ? <Button size="sm" variant="outline" onClick={() => set({ signedIn: 'apple' })}>Connect</Button> : null} />
        <ListRow title="Google" value={app.signedIn === 'google' ? 'Signed in' : undefined} trailing={app.signedIn !== 'google' ? <Button size="sm" variant="outline" onClick={() => set({ signedIn: 'google' })}>Connect</Button> : null} last />
        <SectionLabel>Appearance</SectionLabel>
        <div style={{ padding: '6px 0 14px' }}><Segmented options={[{ value: 'system', label: 'System' }, { value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} value={app.themePref || 'system'} onChange={v => set({ themePref: v })} /></div>
        <ListRow title="Reduce motion" subtitle="Follows the system setting; override here" trailing={<Switch checked={!!app.reducedMotion} onChange={v => set({ reducedMotion: v })} label="Reduce motion" />} last />
        <SectionLabel>Follow-up</SectionLabel>
        <ListRow title="Ask how it went" subtitle="The morning after you tap Watch now" trailing={<Switch checked={app.followUp !== false} onChange={v => set({ followUp: v })} label="Follow-up" />} />
        <ListRow title="Around" value="10:00" chevron onClick={() => {}} last />
        <SectionLabel>Your data</SectionLabel>
        <ListRow title="Taste" subtitle="What we've learned, in plain words" chevron onClick={() => set({ route: 'taste' })} />
        <ListRow title="Export my data" subtitle="Every decision as a file you own" chevron onClick={() => {}} />
        <ListRow title="Reset what we've learned" onClick={() => set({ decisions: {}, reactions: {} })} />
        <ListRow title="Delete account" destructive onClick={() => {}} last />
        <Body tone="tertiary" style={{ font: 'var(--type-caption)', marginTop: 'var(--space-6)' }}>What Should We Watch 1.0 · Availability data is checked nightly for your country.</Body>
      </div>
    </Screen>
  );
}

// States — shortlist empty / offline variants (deck edge states live in Flow.jsx).
function States({ app, set, variant }) {
  const { Button } = useC();
  const words = [...new Set((app.picks || []).map(p => p.w))];
  const v = variant || app.stateVariant || 'deck-empty';
  const back = () => set({ route: 'mood' });
  if (v.startsWith('shortlist')) return <Shortlist app={app} set={set} variant={v.split('-')[1]} />;
  return (
    <Screen>
      <TopRow left={<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><Micro>Tonight</Micro><span style={{ font: 'var(--type-title)', letterSpacing: 'var(--text-title-tracking)' }}>{words.length ? words.join(' · ') : 'cozy · big laughs'}</span></div>} />
      {v === 'deck-empty' && <Empty title="Nothing on your services feels like that tonight." body="Netflix, Hulu and Max don't have a cozy, funny film we haven't already shown you. Loosen the mood, or add a service." action="Loosen the mood" onAction={back} />}
      {v === 'deck-error' && <Empty kicker="Something broke on our side" title="We couldn't build tonight's ten." body="Not you, us. Try once more; if it keeps happening, your shortlist still works." action="Try again" onAction={() => set({ route: 'thinking' })} />}
      {v === 'deck-offline' && <Offline what="tonight's deck" detail="We need a connection to check what's on your services right now. Your shortlist is here in the meantime." onRetry={() => set({ route: 'thinking' })} />}
      <div style={{ position: 'absolute', left: 'var(--page-inset)', right: 'var(--page-inset)', bottom: 'calc(var(--safe-bottom) + 10px)' }}><Button variant="secondary" full onClick={() => set({ route: 'shortlist' })}>Open shortlist</Button></div>
    </Screen>
  );
}
Object.assign(window, { Taste, Settings, States });
