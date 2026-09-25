# What Should We Watch: brand

Everything here was designed in the Claude Design project *What Should We Watch logo* and exported as-is, except where noted. Full rationale, palettes and the decision trail are in [`design/WSWW Brand.dc.html`](design/WSWW%20Brand.dc.html).

## The mark

Three discs, one per mood, overlap in the dark. Where every mood agrees the colours add up to plain white light: tonight's pick. When friends join, more discs join the same field and the rule doesn't change. The rest of the app stays ink on near-black, so the only colour on screen is the decision itself.

| | |
|---|---|
| Coral | `#E8796F` |
| Lilac | `#AE9BE0` |
| Lagoon | `#4DBFB0` |
| Ground | `#14151A` (light ground `#F3F1EC`) |
| Ink | `#EDEBE6` (ink on light `#14151A`) |
| Yes | lagoon `#4DBFB0` |
| No | mauve `#C96A95` |
| Accent | coral `#E8796F` |

Type: Bricolage Grotesque 600 at width 92 for the wordmark, tracked −0.025em, always one line. "by Manali" in the regular weight at roughly 0.45× the wordmark size. Wordmark and "by Manali" are always ink; colour is reserved for the mark and for decisions.

## Files

`svg/`
- `mark-dark.svg`, `mark-light.svg` — the colour mark on dark and on light. **Flattened**: the overlaps are painted explicitly (screen on dark, multiply on light), so they render identically in GitHub, vector tools and anything that ignores `mix-blend-mode`.
- `mark-dark-mono.svg`, `mark-light-mono.svg` — one-colour versions.
- `mark-animated-dark.svg`, `mark-animated-light.svg` — the discs drift in from three sides and light up where they meet. CSS inside the SVG; plays once, respects `prefers-reduced-motion`.
- `wordmark-*.svg`, `lockup-*.svg` — type converted to outlines so no font needs to load.
- `banner-*.svg` — README header, animated. `social-preview.svg` — the 1280×640 card.
- `source/` — the original exports with live text and blend modes, untouched.

`png/`
- `ios-icon-1024.png` — App Store icon, unmasked as Apple requires. Also lives at `apps/mobile/assets/icon.png`.
- `android-foreground-432.png`, `android-background-432.png` — adaptive icon layers, 66dp safe zone respected.
- `lockup-*.png`, `wordmark-*.png`, `mark-*-512.png`, `banner-*.png` — rasters at 2× to 4×.
- `social-preview-1280x640.png` — upload under **Settings › Social preview** on GitHub.

## Rules

Never outline the discs, never rotate the mark, never put text inside the icon. Keep clear space of at least one disc radius around the mark. The colour mark goes on ground or light ground only; on photography use the mono version.
