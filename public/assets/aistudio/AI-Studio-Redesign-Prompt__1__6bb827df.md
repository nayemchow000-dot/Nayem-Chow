# Google AI Studio Prompt — "Midnight Forest Glass" Redesign

(নিচের পুরো লেখাটা কপি করে AI Studio-তে আপনার প্রজেক্টে পেস্ট করুন। ৩টি রেফারেন্স/প্রিভিউ ছবিও সাথে দিলে ভালো হয়।)

---

## ROLE
You are a senior UI designer + front-end engineer. Redesign ONLY the visual layer of this existing React + Vite + Tailwind CSS v4 app ("Kotbari Dawah Movement – Dawah Tracking Portal"). 

## ABSOLUTE RULES (do not break)
1. **Do NOT change any functionality**: no changes to routes, API calls, database/schema, auth, state logic, props, form handling, AI/chatbot/voice features, or data flow.
2. **Do NOT change, translate, rename or remove any text** (Bengali or English). Every label, heading, placeholder, button text, and emoji stays exactly as is.
3. **Do NOT remove or reorder any feature, page, button, tab, table column or menu item.** Layout may be refined (spacing, radius, grouping) but every element must still exist and work.
4. Keep the project structure. Prefer editing `src/index.css` (theme tokens), `index.html` (fonts), `src/components/ui.tsx` (Button, Card, Badge, Input, Tabs…) and then updating page-level class names.
5. The app must still build and run with no TypeScript errors. Keep it responsive (mobile + desktop).

## DESIGN DIRECTION — "Midnight Forest Glass"
Dark, atmospheric, premium. Deep emerald-black night background, frosted-glass panels, soft glowing emerald accents, and a warm amber/gold secondary accent for "critical / highlight" items. Inspired by dark cinematic SaaS landing pages (misty forest/mountain ambience, translucent glass cards, thin light borders, subtle orange glow) — adapted to an Islamic dawah dashboard: calm, respectful, elegant. No cartoon, no neon overload.

### Color tokens (define as CSS variables in `@theme` / `:root` and use everywhere)
- `--bg-night: #050807` (page base) · `--bg-forest: #0A1210` · `--moss: #1C4A3F`
- Glass surface: `rgba(255,255,255,0.045 → 0.075)` vertical gradient
- Glass border: `rgba(255,255,255,0.10)`, hover `0.16`
- `--emerald: #34D399` (primary accent) · `--emerald-deep: #0E9F6E` · `--mint: #B6F5D8` (text on active/accents)
- `--amber: #F4A85E` · `--copper: #DD7B3C` · `--gold: #E8CD92` (secondary accent / critical / highlights)
- Text: primary `#EDF4F0`, muted `#8EA39A`, faint `#5D726A`
- Danger `#FB7185`, Warning = amber, Success = emerald

### Page background (global, fixed)
Layered gradients on `body`:
- radial emerald glow top-left `rgba(52,211,153,.20)`
- radial teal/blue-green glow top-right `rgba(40,110,120,.20)`
- radial copper/amber glow bottom-right `rgba(221,123,60,.20)`
- base `linear-gradient(180deg,#07100d,#050807)`
- 2 faint misty mountain/ridge SVG silhouettes at the bottom (very low opacity) + a 4–5% film-grain noise overlay.
- A few large blurred orbs (blur 70px) behind content so the glass has something to refract.

### Glass component recipe (Cards, Sidebar, Top bar, Modals, Dropdowns, Popovers)
```
background: linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
border: 1px solid rgba(255,255,255,.10);
backdrop-filter: blur(22px) saturate(140%);
box-shadow: inset 0 1px 0 rgba(255,255,255,.10), 0 24px 60px -20px rgba(0,0,0,.65);
border-radius: 20px;   /* cards 18–20px, buttons/inputs 12px, pills 999px */
```
Replace every hard-coded `bg-[#0A0A0B]`, `bg-[#16161A]`, `bg-[#121214]`, `bg-[#0F0F12]`, `text-[#E5E5E7]` and the many `slate-*` / `emerald-*` utility colors with these tokens so the whole app changes consistently (update `ui.tsx` first, then search & replace in pages/components).

### Components
- **Sidebar**: floating glass panel (24px radius, 20px margin from edges). Logo in a soft emerald-glowing rounded square, tiny uppercase letter-spaced caption. User card = nested glass. Active nav item: emerald gradient fill (`rgba(52,211,153,.18)→.04`), emerald border, soft glow, and a 3px glowing bar on the left edge. Inactive: muted text, hover → glass-2.
- **Top bar**: glass pill bar; search input with subtle inner glass, `⌘K` key badge; "AI Center" as an emerald-tinted pill.
- **Primary button**: gradient `#6EE7B7 → #22C58A`, dark text `#04140D`, glow shadow `0 8px 28px -8px rgba(52,211,153,.7)`, inner top highlight. **Secondary/ghost**: glass with 1px light border. **Danger**: rose outline.
- **Category / stat cards (Dashboard grid)**: glass card, round icon badge with emerald radial glow; count number in the serif display font, larger and brighter when > 0 and dimmed when 0. "Critical/priority" cards (e.g. highest-priority category) use amber/copper border + glow instead of emerald.
- **Hero / greeting card** at top of dashboard pages: large glass card with warm amber orb glow in the corner, display-serif heading with one italic gold word, and a stat card beside it with big serif number + mini emerald bar-sparkline.
- **Badges/chips**: pill, tinted translucent background + matching 1px border (emerald = active, amber = critical, neutral = white 8%).
- **Tables/lists**: no heavy borders; rows are glass with 1px separators `rgba(255,255,255,.06)`, hover = glass-2.
- **Charts (Recharts)**: emerald→mint gradient fills, amber for secondary series, soft glow, faint grid lines, glass tooltip.
- **Modals/dialogs/chatbot widget/voice modal**: glass with stronger blur (28px) and dimmed backdrop `rgba(0,0,0,.55)` + blur(6px).
- **Floating "দাওয়াহ AI সহায়ক" button**: emerald gradient pill with glow.
- **Login page**: centered glass card over the full atmospheric background.
- **Motion** (use the `motion` library already installed): fade+rise on mount (200–300ms), gentle hover lift (`translateY(-2px)`) with glow increase on cards, smooth active-nav transitions. Respect `prefers-reduced-motion`.

### Typography (load via Google Fonts in `index.html`, with `display=swap`)
- **Display / headings (English):** `Instrument Serif` (use italic for one accent word).
- **Display / headings (Bengali):** `Noto Serif Bengali` (alt: `Tiro Bangla`) — weights 500/600.
- **Body / UI (Bengali):** `Anek Bangla` (alt: `Hind Siliguri`) — weights 400/500/600.
- **Body / UI (English):** `Inter`.
- **Eyebrow labels / small caps:** `JetBrains Mono` or Inter 500, 10–11px, letter-spacing `.24em`, uppercase, emerald color.
- Font stacks: headings `'Instrument Serif','Noto Serif Bengali',serif`; body `'Inter','Anek Bangla','Hind Siliguri',system-ui,sans-serif`.
- Scale: page title 40–44px display; section title 22px display; card title 14–15px; body 13–14px; Bengali body line-height ≥ 1.6, Bengali headings line-height ≥ 1.35 (Bengali needs more vertical room — avoid clipped matras).
- Make sure Bengali text is never letter-spaced.

### Light mode (optional, only if easy and safe)
Add a theme toggle that keeps dark as default. Light = "Ivory Mist": background `#F3F6F4` with soft mint/lavender radial washes, white glass cards `rgba(255,255,255,.7)` with blur, deep green sidebar `#0B3B2E`, emerald `#10B981` accents, dark text `#0B1F18`. If this risks breaking anything, skip it and keep only the dark theme.

### Accessibility
Text contrast ≥ 4.5:1 on glass; visible focus rings (emerald, 2px offset); hit targets ≥ 40px; do not rely on color alone for status.

## DELIVERABLE
1. Updated `index.html` (fonts, meta theme-color `#050807`), `src/index.css` (tokens, global background, utilities like `.glass`, `.glass-hot`, `.eyebrow`), `src/components/ui.tsx`, and every page/component with updated class names only.
2. Return the full changed files. Do not touch server, API, DB or business logic files.
3. At the end, give a short checklist confirming: no text changed, no feature removed, app builds.
