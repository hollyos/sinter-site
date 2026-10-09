# Sinter documentation site

Static, no build step, no framework. Open `index.html` or serve the folder.

```bash
python3 -m http.server -d site 8080
```

## Regenerating

`data.json` is extracted from the plugin source, so the command, skill, pack,
agent, and control tables cannot drift from what actually ships:

```bash
npm run site:data
```

## Theme

Three states, cycled from the topbar: **Auto** (follows `prefers-color-scheme`,
the default and stores nothing), **Light**, **Dark**. An explicit choice persists
in `localStorage`; auto clears it. An inline script in `<head>` applies the stored
choice before first paint, so there is no flash of the wrong theme.

Both palettes are verified to WCAG AA. The hero figure reads its colours from CSS
custom properties and repaints on change, so it has no hard-coded values.

## Accessibility

```bash
npm run a11y
```

Static audit: contrast for every token pair in **both** themes, accessible names,
heading order, landmarks, live regions, tab order, and reflow. It fails the build
rather than warning.

What it verifies:

| | |
|---|---|
| Contrast | 28 pairs across two themes. Text 4.5:1, UI borders 3:1 |
| Names | Every button, input, image and canvas has an accessible name |
| Structure | One `h1` per page, no skipped heading levels, named landmarks |
| Tab order | Skip link first, no positive `tabindex`, collapsed rail leaves the order |
| Live regions | Router result and filter count announce their updates |
| Reflow | Wide tables sit in labelled, keyboard-reachable scroll regions |
| Focus | Visible `:focus-visible` style, no bare `outline: none` |

What it cannot verify, and still has to be done by a person: tab through every
flow using only the keyboard, one pass with VoiceOver or NVDA, 200% zoom, and
320px width. The keyboard-only pass finds more than every scanner combined.

## Brand

The mark is traced from the supplied artwork rather than redrawn: 94.7% IoU
against the original at 149 points. `logo-mark.svg`, `logo-lockup.svg` and
`favicon.svg` all carry the same cyan -> violet -> magenta ramp.

**The ramp is identity, not text.** Cyan at full saturation is about 1.6:1 on a
light background. The UI accents are lightness-solved tints of the same three
hues, verified to 4.5:1 on every surface in both themes:

| Token | Role | Light | Dark |
|---|---|---|---|
| `--flux` | verified, safe | cyan tint | cyan tint |
| `--molten` | primary accent | magenta tint | magenta tint |
| `--caution` | needs attention | violet tint | violet tint |
| `--brand-1..3` | the ramp itself | logo values, identity surfaces only | same |

## Runtime

Floor is Node 22, the oldest line still in security support. Development
target is Node 24 (Active LTS), pinned in `.nvmrc` and `.node-version`. CI runs
the full gate on 22, 24 and Current.

`scripts/runtime.test.mjs` holds the release schedule and fails the build when
the declared floor passes its end-of-life date, so the support policy expires
loudly rather than quietly.

## Punctuation

```bash
npm run prose
```

The site and the plugin's instruction files use ASCII punctuation: no em
dashes, curly quotes, section signs, arrows or decorative glyphs. The check
is deliberately narrow. It targets English typographic ornament only, and
leaves accents, CJK punctuation, inverted marks, guillemets, emoji and
currency alone, because stripping those would corrupt other languages.

A line can opt out with a trailing `prose-ok` comment for a deliberate
quotation. HTML entities such as `&nbsp;` are markup, not typed characters,
and are not flagged.

## Design

Visual system drawn from powder metallurgy: grain boundaries as structure,
molten accent only where fusion happens. Passes Sinter's own design detectors
and WCAG AA contrast:

```bash
node scripts/detectors.mjs site/assets/sinter.css site/*.html
```

Cross-document view transitions are native CSS (`@view-transition`), not a
router. Everything degrades under `prefers-reduced-motion`.
