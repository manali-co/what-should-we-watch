# What Should We Watch — Full UX Flow Brief (for Claude Design)

Brand **Manali**. Mood-driven film picker. Only ever shows titles actually streaming
on the user's services in their country tonight. Core loop: pick moods → get 10
LLM-ranked films → swipe to decide. Quality bar: "as smooth as Apple apps."

Palette (fixed): near-black chrome `#16171D`, ink `#F0ECE3`; mood hues appear only on
user actions — coral `#E8796F`, lilac `#AE9BE0`, lagoon `#4DBFB0`, amber `#E7B15A`.
Type: Bricolage Grotesque (display), Figtree (body).

Swipe semantics: **left = pass, right = like, up = maybe, down = already seen it**
(then reaction pills: loved it / it was okay / not for me).

Design every screen for phone-first. Cover BOTH happy and unhappy paths for each.

---

## 1. First launch & auth
- **1a. Welcome / explainer.** First-ever open, before sign-in. One strong screen or a
  3-beat intro that says what the app does: "The right film, for right now." Convey
  moods → real availability → swipe. Not a wall of text.
- **1b. Sign in.** Clerk. Continue with Apple (marked *Coming soon*, disabled),
  Continue with Google, email code. Custom copy, brand icons.
  - Unhappy: sign-in cancelled; code wrong/expired; network down; "didn't finish" recovery.
- **1c. Face ID / passkey lock** (native, returning user relaunch). Unhappy: biometric
  fails → passcode fallback → sign in again.

## 2. Onboarding (first run after sign-in only)
- **2a. Country.** Auto-detect, user confirms. Geography is a hard rule.
  - Unhappy: can't detect → manual country picker.
- **2b. Streaming services.** "Which do you have?" Multi-select of the 20 US services,
  auto-suggested where possible. At least one required to continue.
  - Unhappy: none selected → gentle prompt; "I'm not sure" path.
- **2c. Name / username.** Optional display name (Clerk no longer requires it).
- **2d. Primer.** One-line "here's how it works" that leads into the first deck.

## 3. Tutorial (first deck for a new or not-logged-in user)
- Overlay on the real first card demonstrating all four swipe directions AND tap-for-trailer.
  Left = pass, right = like, up = maybe, down = seen it. Must feel like a coach-mark, not a modal.
  Dismisses on first interaction. Design the animated states for each direction.
- Unhappy: user ignores it / swipes immediately → it gets out of the way cleanly.

## 4. Main loop (happy path)
- **4a. Tonight / mood picker.** Novel selector; chosen moods flow into the headline in
  their hue. Then company (solo / partner / friends / family) and length. "Find something."
- **4b. Thinking state.** Brief, characterful loading while the recs engine ranks.
- **4c. Deck.** Poster-forward swipe cards, gradient scrim, title + why-line + service +
  "leaving in N days". Stamps on drag (LIKE/PASS/MAYBE). Tap = trailer. Action buttons too.
- **4d. Seen-it reaction.** Swipe down → pills: loved it / it was okay / not for me.
- **4e. End of deck / your night.** Summary of likes → shortlist handoff.
- **4f. Shortlist.** Poster thumbs, "Watch now" deep link into the streaming app.
- **4g. Follow-up loop.** Later: "Did you watch X?" → reaction, closes the loop, feeds taste.
- **4h. Taste.** The learned profile, human-readable.
- **4i. Settings.** Services, country, name, sign out, delete account.

## 5. Unhappy / edge states (the "so we're not missing things" set)
- **Empty deck:** no titles match these moods + services in this country. Offer: broaden
  services, change moods, or widen length. Never a dead end.
- **No likes at end:** user passed all 10 → "Not feeling these? Try another mood" path.
- **Offline / API down:** clear retry state, no raw error.
- **Rate-limited catalog (Streaming API 1000/mo):** cached fallback, silent.
- **Poster missing:** graceful placeholder card.
- **Trailer unavailable:** brief toast, card stays.
- **Session expired:** silent token refresh, else back to sign-in with context kept.
- **Slow network:** skeleton loaders, not spinners.
- **Group mode (future):** reserve a participant entry point; don't build yet.

## 6. Deliverables from Design
A screen-by-screen flow (happy + unhappy) with the states above, in the fixed palette and
type, plus the tutorial's per-direction animated coach-mark. Modern, minimal, abstract;
poster-forward where posters exist.
