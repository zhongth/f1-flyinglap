---
name: performance-editorial-style
description: A design system skill for creating premium, dark-dominant, data-rich editorial websites in the style of high-end motorsport and performance brands. Use this skill whenever the user asks to build a website, landing page, dashboard, portfolio, or any web interface that should feel cinematic, data-forward, and editorially polished — especially for sports, automotive, athlete brands, nonprofit showcases, performance products, luxury tech, or any context where bold typography meets dense information. Also trigger when the user mentions "motorsport style", "dark editorial", "performance aesthetic", "data-driven storytelling", "cinematic web design", "athlete portfolio", or wants something that feels like an awwwards-level site with a moody, high-contrast, magazine-quality feel. This skill pairs well with the frontend-design skill as a style layer on top of it.
---

# Performance Editorial Style

A design system distilled from the visual language of elite motorsport editorial sites — where cinematic atmosphere meets data density, and every pixel serves both beauty and information.

This is not a template. It is a set of opinionated design principles, patterns, and implementation guidelines that produce a specific genre of web experience: **dark, atmospheric, typographically bold, data-rich, and editorially precise**.

---

## I. Core Philosophy

Three tensions define this style. Every design decision should navigate between them:

1. **Cinematic vs. Informational** — Full-bleed media and atmospheric backdrops coexist with dense data tables, statistics, and structured content. Neither dominates; they alternate in rhythm.
2. **Monumental vs. Intimate** — Hero sections use enormous scale (viewport-filling type, full-screen video). Detail sections use tight, precise micro-typography. The contrast between these scales creates drama.
3. **Editorial vs. Technical** — Magazine-quality storytelling meets dashboard-level data presentation. Headlines read like editorial spreads; data sections read like cockpit telemetry.

---

## II. Color System

### Palette Architecture

The palette is **monochromatic-dominant with a single accent channel**. Never use more than one accent hue family.

**Background Range:**
- Primary canvas: deep black to charcoal (`#000000` → `#0A0A0A` → `#111111` → `#1A1A1A`)
- Elevated surfaces: dark gray (`#1E1E1E` → `#252525` → `#2A2A2A`)
- Card/panel backgrounds: subtle lift from canvas (`+5-10%` lightness from base)
- Never use pure gray midtones as backgrounds — they flatten depth

**Foreground Range:**
- Primary text: near-white, never pure `#FFFFFF` — use `#F5F5F5`, `#EDEDED`, `#E8E8E8`
- Secondary text: muted cool gray (`#888888` → `#999999` → `#AAAAAA`)
- Tertiary/caption text: subdued (`#666666` → `#777777`)
- Disabled/ghost: barely visible (`#333333` → `#444444`)

**Accent Strategy:**
Choose ONE accent from a controlled spectrum. The accent should feel:
- **Warm track**: signal red, amber, papaya orange — for energy, urgency, competition
- **Cool track**: electric blue, cyan, ice white — for precision, technology, speed
- **Neutral track**: gold, champagne, bronze — for prestige, achievement, heritage

Use accent sparingly: on interactive elements, key data highlights, active states, and one or two hero moments per page. Never as background fills on large surfaces.

**Gradient Usage:**
- Subtle vignettes from black into dark gray (radial, from corners/edges)
- Never decorative gradients on surfaces — only atmospheric fades
- Use gradient masks on images to blend photography into the dark canvas
- Acceptable: linear gradient overlays on hero media (black → transparent, bottom-up)

### Dark Mode Is the Only Mode

This design system is dark-first and dark-only. Light variants should only exist as inverted accent cards or pull-quote blocks, used very sparingly (1-2 per page maximum) for editorial contrast.

---

## III. Typography

### Type Scale Philosophy

The type system operates on **extreme scale contrast**. The ratio between the largest and smallest text on a page should be at minimum 8:1 and can go up to 16:1 or beyond.

### Heading Hierarchy

**Display / Hero (Level 0):**
- Size range: `clamp(3rem, 8vw, 10rem)` — should fill significant viewport width
- Weight: Bold to Black (700–900)
- Tracking: Tight negative (`-0.02em` to `-0.04em`)
- Line height: Extremely tight (`0.85` to `0.95`)
- Case: Uppercase for single-word impact, sentence case for multi-word phrases
- Font choice: A condensed or display sans-serif with geometric precision. Look for fonts with sharp terminals, clean geometry, and strong vertical rhythm. Families in the vein of: condensed grotesques, wide geometric sans, or sharp neo-grotesques

**Section Headers (Level 1):**
- Size range: `clamp(1.5rem, 3vw, 3.5rem)`
- Weight: Semibold to Bold (600–700)
- Tracking: Slightly negative (`-0.01em`)
- Often paired with a thin horizontal rule or a small label above

**Subsection / Card Titles (Level 2):**
- Size range: `clamp(1.1rem, 1.5vw, 1.75rem)`
- Weight: Medium to Semibold (500–600)
- Tracking: Normal to slightly positive for smaller sizes

### Body & Data Typography

**Body Text:**
- Size: `1rem` to `1.125rem` (16–18px)
- Weight: Regular (400)
- Line height: Generous (`1.6` to `1.75`)
- Max width: `60ch` to `70ch` — always constrain body text width
- Font: A refined, highly legible sans-serif — clean, slightly humanist or geometric. Prioritize optical quality at small sizes

**Data / Statistics:**
- Size: `clamp(2.5rem, 6vw, 7rem)` for hero stats
- Weight: Bold to Black
- Font: Tabular-lining numerals required. Use a monospaced or technical sans-serif for data tables; proportional bold sans for display stats
- Tracking: Tight negative for large numbers
- Pair every large stat number with a small label beneath or beside it (small caps or uppercase at 0.75rem)

**Labels / Metadata / Captions:**
- Size: `0.6875rem` to `0.8125rem` (11–13px)
- Weight: Medium (500)
- Case: Uppercase with wide tracking (`0.08em` to `0.15em`)
- Color: Secondary or tertiary foreground
- These are the "whisper" layer — ever-present, never dominant

### Font Pairing Strategy

Use a **two-font system** maximum:
1. **Display font** — for hero text, section headers, and large stats. This font carries the personality.
2. **Workhorse font** — for body, labels, data, navigation. This font carries the information.

Alternatively, a single superfamily with sufficient weight/width range can serve both roles.

Never use: Inter, Roboto, Arial, system fonts, or any default stack. Search Google Fonts or reference premium font alternatives for: **Aktiv Grotesk, Neue Haas Grotesk, Aeonik, General Sans, Switzer, Cabinet Grotesk, Satoshi, Outfit, Space Grotesk (only if paired distinctively), Plus Jakarta Sans, Syne, Unbounded, Bebas Neue, Oswald** — or comparable distinctive choices. Rotate selections; never default to the same font twice.

---

## IV. Layout & Spatial Composition

### Grid System

Use a **12-column or 16-column grid** with generous gutters (24px–48px) on a max-width container of `1400px` to `1600px`.

**Key spatial principles:**
- **Asymmetric balance**: Avoid centered-everything layouts. Offset content blocks. Place hero text at 1/3 or 2/3 horizontal position.
- **Generous negative space**: Let sections breathe with `8rem` to `16rem` vertical padding between major blocks. White space (dark space in this case) is a design tool, not waste.
- **Edge-to-edge moments**: Hero sections, media, and partner strips should break out of the container to touch viewport edges. Then pull back into the grid for content sections.
- **Vertical rhythm anchors**: Use consistent spacing tokens. Define a scale: `0.5rem, 1rem, 1.5rem, 2rem, 3rem, 4rem, 6rem, 8rem, 12rem, 16rem`.

### Section Typology

Every page is a **vertical scroll narrative** composed of these section types in sequence:

1. **Hero** — Full viewport height. Video or image background with gradient overlay. Oversized headline. Minimal supporting text. Scroll indicator.
2. **Stats Bar** — Horizontal strip of 3-5 key numbers with labels. Can be sticky or scroll-triggered.
3. **Editorial Block** — Asymmetric text + image composition. Text on one side (constrained width), large image on the other (bleeding to edge).
4. **Card Carousel** — Horizontal scrolling row of cards (people, items, events). Cards have image + minimal text overlay.
5. **Data Table / List** — Structured information presented in rows. Hover states reveal additional detail or imagery.
6. **Media Break** — Full-width atmospheric image or video. No text or minimal overlaid text. Provides visual breathing room.
7. **FAQ / Accordion** — Clean expandable sections with +/- or arrow indicators.
8. **Logo / Partner Strip** — Horizontal row of monochrome logos. Subtle, not attention-competing.
9. **Footer** — Minimal. Stacked links, newsletter input, social icons. Same dark palette.

### Responsive Strategy

- **Desktop**: Full grid, expansive spacing, horizontal carousels
- **Tablet**: Collapse to 8-column, reduce hero type scale, stack editorial blocks
- **Mobile**: Single column, hero type fills width, carousels become swipeable, data tables become card lists
- Always include a "rotate your device" consideration for data-heavy horizontal layouts

---

## V. Motion & Interaction

### Animation Philosophy

Motion should feel **weighted and purposeful** — like mechanical precision, not playful bounce. Think of a camera panning across a starting grid, not a bouncing ball.

### Core Animation Tokens

```css
/* Timing */
--duration-instant: 100ms;
--duration-fast: 200ms;
--duration-normal: 400ms;
--duration-slow: 700ms;
--duration-cinematic: 1200ms;

/* Easing */
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);       /* primary exit */
--ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);   /* smooth transitions */
--ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);      /* soft deceleration */
```

### Scroll-Triggered Reveals

Every section should enter via scroll-trigger (IntersectionObserver or CSS `@scroll-timeline`):
- **Fade up**: `translateY(40px)` → `translateY(0)` + opacity 0→1 over `--duration-slow` with `--ease-out-expo`
- **Stagger children**: Each child element delays by `80–120ms` from the previous
- **Stats counter**: Numbers count up from 0 to final value when scrolled into view. Use `requestAnimationFrame` for smooth counting.
- **Image reveal**: Optional clip-path wipe (`inset(100% 0 0 0)` → `inset(0)`) or scale (`1.1` → `1`) with overflow hidden

### Hover States

- **Cards**: Subtle lift (`translateY(-4px)`) + image zoom (scale `1.0` → `1.05`) within overflow hidden
- **Links**: Underline slide-in from left (`scaleX(0)` → `scaleX(1)`, `transform-origin: left`)
- **Navigation items**: Color transition to accent + optional arrow/indicator slide-in
- **Data rows**: Background highlight (subtle, `+5%` lightness) + optional image peek from side

### Page Load Sequence

Orchestrate the first paint:
1. Background fades from pure black (0ms)
2. Hero media begins loading / video plays (100ms)
3. Navigation fades in from top (200ms)
4. Hero headline reveals — either word-by-word stagger or a single smooth fade-up (400ms)
5. Scroll indicator pulses into view (800ms)

### Parallax (Use Sparingly)

- Background images at `0.3x` to `0.5x` scroll speed relative to content
- Never on text — only on background media layers
- Disable on mobile for performance

---

## VI. Media Treatment

### Photography

- **Color grading**: Desaturated with lifted shadows and crushed highlights. Never fully vivid — always editorially processed.
- **Overlay**: Gradient mask from the dark canvas color to transparent, anchored at bottom or side edges
- **Aspect ratios**: Heroes at 16:9 or wider. Cards at 3:4 or 4:5 (portrait). Editorial blocks at 4:3 or 3:2.
- **Object-fit**: Always `cover` with `object-position` tuned per image

### Video

- **Autoplay + muted + loop** for atmospheric hero backgrounds
- Always provide a poster frame for loading states
- Apply same gradient overlay as photography
- Keep video file sizes aggressive: compress, reduce framerate to 24fps for ambient loops

### SVG & Vector Elements

Use custom SVG artwork for:
- Track/circuit outlines, technical illustrations
- Decorative separators and section dividers
- Icon systems (monoline, consistent stroke weight)
- Background patterns (subtle, low-opacity geometric grids or line work)

Avoid: stock icons, emoji, clip art, generic icon libraries used at scale

---

## VII. Component Patterns

### Navigation

- **Desktop**: Fixed top bar with logo left, minimal text links right. Transparent background that gains opacity on scroll (backdrop-blur optional).
- **Mobile**: Hamburger menu that opens a full-screen overlay with large stacked links and atmospheric imagery.
- **Active state**: Accent color or underline indicator

### Hero Section

```
┌─────────────────────────────────────────┐
│ [VIDEO / IMAGE — full viewport]         │
│                                         │
│         MASSIVE                         │
│         HEADLINE                        │
│                                         │
│  Supporting subtitle text, smaller,     │
│  constrained width                      │
│                                         │
│              ↓ Scroll                   │
└─────────────────────────────────────────┘
```

### Stats Row

```
┌─────────────────────────────────────────┐
│   10%          1-5         45%    1976  │
│  [label]     [label]    [label] [label] │
└─────────────────────────────────────────┘
```

- Large numbers in display font
- Small uppercase labels beneath
- Optional dividers between items
- Can be full-width with dark background or slightly elevated surface

### Card Carousel

```
←  [  CARD  ] [  CARD  ] [  CARD  ] [  CARD  ]  →
    portrait    portrait    portrait    portrait
    image       image       image       image
    Name        Name        Name        Name
    Meta        Meta        Meta        Meta
```

- Horizontal scroll with CSS `overflow-x: auto; scroll-snap-type: x mandatory`
- Each card: `scroll-snap-align: start`
- Image fills top portion, text overlaid at bottom or below
- Hover: image zoom + optional color overlay shift

### Data Table / Race List

```
┌────┬───────────────┬──────────┬──────────┐
│ #  │ Location      │ Date     │ Result   │
├────┼───────────────┼──────────┼──────────┤
│ 1  │ 🏁 Australia  │ 06-08 Mar│ 1st      │  ← hover reveals photo
│ 2  │ 🏁 China      │ 13-15 Mar│ 2nd      │
└────┴───────────────┴──────────┴──────────┘
```

- Minimal borders — use spacing and subtle background alternation
- Hover state: row highlight + optional image peek from right edge
- Flag/icon as small inline accent
- Monospace or tabular-figure font for numbers and dates

### Accordion / FAQ

- Clean expand/collapse with `+` → `−` rotation or chevron
- Question in bold, answer in regular weight with secondary color
- Thin bottom border between items
- Smooth height animation (`max-height` or `grid-template-rows: 0fr → 1fr`)

---

## VIII. Micro-Details That Elevate

These small decisions separate generic from premium:

- **Scrollbar styling**: Custom thin scrollbar matching the palette (`scrollbar-width: thin; scrollbar-color: #333 #111`)
- **Selection color**: Accent background on `::selection`
- **Focus states**: Accent outline with offset, never browser default
- **Loading states**: Skeleton screens in dark palette, subtle shimmer animation
- **Cursor**: Default for most; pointer only on interactive elements; optional custom cursor for hero sections
- **Border radius**: Near-zero (`2px–4px`) for a sharp, technical feel. Avoid large radii (`12px+`) — they soften the precision
- **Borders**: Prefer `1px solid` with very subtle contrast (`rgba(255,255,255,0.08)` to `0.12`). Borders should be felt more than seen.
- **Shadows**: Avoid drop shadows on dark backgrounds — they're invisible. Instead use subtle border-top highlights (`rgba(255,255,255,0.05)`) on elevated cards.
- **Image loading**: Blur-up placeholder (`filter: blur(20px)` → `blur(0)`) with low-res base64 inline

---

## IX. Implementation Notes

### CSS Custom Properties Setup

```css
:root {
  /* Canvas */
  --bg-primary: #0A0A0A;
  --bg-elevated: #141414;
  --bg-card: #1A1A1A;
  --bg-hover: #222222;

  /* Text */
  --text-primary: #F0F0F0;
  --text-secondary: #999999;
  --text-tertiary: #666666;
  --text-ghost: #333333;

  /* Accent — swap per project */
  --accent: #E63946;
  --accent-muted: rgba(230, 57, 70, 0.15);

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-visible: rgba(255, 255, 255, 0.15);

  /* Spacing scale */
  --space-xs: 0.5rem;
  --space-sm: 1rem;
  --space-md: 2rem;
  --space-lg: 4rem;
  --space-xl: 8rem;
  --space-2xl: 12rem;

  /* Type scale */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.5rem;
  --text-3xl: clamp(2.5rem, 5vw, 4.5rem);
  --text-hero: clamp(3.5rem, 9vw, 10rem);
}
```

### React Considerations

- Use `framer-motion` for scroll-triggered animations (in environments where available)
- In Claude artifacts, use CSS animations with IntersectionObserver via `useEffect`
- Use `useRef` + `useEffect` for scroll-based parallax
- Implement carousels with CSS scroll-snap, not heavy libraries

### Tailwind Mapping

When using Tailwind (e.g., in Claude artifacts with React):
- `bg-[#0A0A0A]`, `text-[#F0F0F0]` for custom colors
- `tracking-tighter` for display text, `tracking-widest` for labels
- `leading-none` or `leading-tight` for hero text
- `overflow-x-auto snap-x snap-mandatory` for carousels
- `transition-all duration-500 ease-out` for hover states

---

## X. Anti-Patterns (What to Avoid)

- **White backgrounds** — Never as the primary canvas. Only as rare accent inversions.
- **Rounded everything** — Large border radii feel soft and app-like. This style is sharp.
- **Colorful gradients** — No rainbow or multi-hue gradients. Only monochromatic fades.
- **Stock photography** — If you must use placeholder images, treat them with desaturated overlays.
- **Centered paragraph text** — Body text is always left-aligned. Only hero headlines may center.
- **Decorative icons scattered everywhere** — Icons are functional or absent.
- **Thin light-gray text on white** — Wrong palette entirely. Everything lives on dark.
- **Generic card grids** — Prefer horizontal scroll or asymmetric editorial layout over a 3×3 grid.
- **Excessive whitespace without intent** — Space is deliberate, not lazy.
- **Animations that bounce or spring** — This is not playful UI. Motion is smooth, weighted, mechanical.

---

## XI. Checklist Before Delivery

Use this to audit your implementation:

- [ ] Background is dark canvas, not white or gray
- [ ] Type scale has at least 8:1 ratio between largest and smallest
- [ ] Hero section fills viewport with media + overlaid text
- [ ] At least one large statistical display with labels
- [ ] Custom font loaded (not Inter/Roboto/Arial/system)
- [ ] Accent color used sparingly (< 10% of visible surface)
- [ ] Scroll-triggered reveal animations on content sections
- [ ] Hover states on all interactive elements
- [ ] Uppercase tracked labels for metadata/captions
- [ ] Edge-to-edge media moment (at least one section)
- [ ] Body text constrained to 60-70ch width
- [ ] Responsive considerations addressed
- [ ] No bounce/spring easing — all smooth deceleration
- [ ] Border radius ≤ 4px throughout
