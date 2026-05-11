# Design preview — token notes

Three style explorations for the Travel Planner app. Each option below is implemented as its own folder of components (`airbnb/`, `wolt/`, `notion/`) so they're easy to compare side-by-side without affecting the live app.

The demo route is `/design-preview`, admin-gated.

---

## Option A — Airbnb-flavored

Source: airbnb.com listing cards, Airbnb DLS (Cereal typography), and visible patterns on the Airbnb iOS/Android apps in 2025.

| Token | Value | Notes |
|---|---|---|
| Font family | `'Cereal', 'Inter', system-ui` | Cereal is Airbnb's proprietary face; Inter is the closest open-source approximation. |
| Type scale | 12 / 14 / 16 / 18 / 22 / 28 | Body 16, card titles 16–18, page titles 22–28. |
| Weights | 400 / 500 / 600 | Never 700/800 — Airbnb avoids heavy weights. |
| Letter-spacing | Slight negative on headings (`tracking-tight`) | Body normal. |
| Primary accent | `#FF385C` (Rausch pink/coral) | Used only on primary actions — never as a background fill on cards. |
| Background | `#FFFFFF` page, `#F7F7F7` containers | Warm white. |
| Text | `#222222` body, `#717171` muted | High-contrast charcoal. |
| Card radius | `rounded-xl` (12px) | Photos use `rounded-xl` to match. |
| Pill radius | `rounded-full` | Category chips, badges. |
| Card shadow | `shadow-[0_2px_8px_rgba(0,0,0,0.05)]` | Very soft. Hover lifts via `translate-y-[-2px]` + `shadow-[0_4px_12px_rgba(0,0,0,0.08)]`. |
| Photo treatment | `aspect-square` or `aspect-[4/5]` | Vertical-leaning; photo is the hero of the card. |
| Spacing rhythm | `gap-6` between cards, `p-6` inside cards | Generous, breathy. |
| Favorite icon | Top-right heart, outline → fill | Airbnb's signature pattern. |

**Feel**: warm, photographic, premium-but-friendly. The product is "rentable homes for humans".

---

## Option B — Wolt-flavored

Source: wolt.com restaurant detail pages, Wolt app, and Wolt's public marketing pages.

| Token | Value | Notes |
|---|---|---|
| Font family | `'Söhne', 'Inter Tight', system-ui` | Wolt uses Söhne; Inter Tight is the closest open-source approximation. |
| Type scale | 12 / 14 / 16 / 20 / 24 | Smaller body (14–15) than Airbnb. |
| Weights | 500 / 600 / 700 | Bolder overall. |
| Letter-spacing | Default | No tracking adjustments. |
| Primary accent | `#00C2E8` (Wolt cyan) | High-visibility action color. |
| Secondary | `#0E1217` (Wolt navy) | Used for primary text + dark surfaces. |
| Background | `#F4F4F5` page, `#FFFFFF` cards | Cool light gray. |
| Text | `#0E1217` body, `#6B7280` muted | Cool dark. |
| Card radius | `rounded-lg` (8px) | Tighter than Airbnb. |
| Pill radius | `rounded-full` | Pills + rating badges. |
| Card shadow | NONE — `border border-zinc-200` instead | Hairline borders, no depth. |
| Photo treatment | `aspect-[16/10]` with overlay chips | Delivery time / distance / price badges overlay the photo bottom-left. |
| Spacing rhythm | `gap-3` between cards, `p-3` inside | Dense, info-rich. |
| Rating | Bright yellow pill (`bg-yellow-100 text-yellow-900`) + star inline | Rating is the most prominent metadata. |
| Cuisine pill | Saturated semantic colors (red=spicy, green=healthy, etc.) | Multi-color category coding. |

**Feel**: dense, food-delivery-app urgency, multi-pill metadata. The product is "decide what to eat in 30 seconds".

---

## Option C — Notion / Linear-flavored

Source: notion.so dashboards, linear.app issue lists, the Linear "Method" essay (linear.app/method).

| Token | Value | Notes |
|---|---|---|
| Font family | `'Inter', 'Söhne', system-ui` | Inter is the de-facto choice for this aesthetic. |
| Type scale | 12 / 13 / 14 / 16 / 20 / 28 | Tight scale, body 14. |
| Weights | 400 / 500 / 600 / 700 | Heavy weight contrast does the hierarchy work. |
| Letter-spacing | `tracking-tight` on titles | Linear uses `-0.011em` on headings. |
| Primary accent | `#5E6AD2` (Linear indigo) | Single accent — no semantic colors. |
| Background | `#FAFAF9` page, `#FFFFFF` cards | Paper white. |
| Text | `#18181B` body, `#71717A` muted | Pure grayscale. |
| Card radius | `rounded-md` (6px) | Between Linear's sharp 4px and Notion's 8px. |
| Pill radius | `rounded-md` (6px) | NOT full circles — important for the editorial feel. |
| Card shadow | ZERO — `border border-zinc-200` only | Depth via hairline borders + dividers. |
| Photo treatment | Small thumbnail (`w-12 h-12` to `w-16 h-16`) OR absent | Typography-driven; photo is optional. |
| Spacing rhythm | `space-y-6` between sections, `p-5` inside cards | Generous vertical rhythm. |
| List rows | `divide-y divide-zinc-200` | Full-width rows separated by hairlines. |
| Rating | Inline text: `4.7 · 480 reviews` | No pill, just text. |

**Feel**: editorial, content-forward, "serious tool for planning". The product is "the spreadsheet of trips".

---

## Comparison summary

| | Airbnb | Wolt | Notion/Linear |
|---|---|---|---|
| Photo emphasis | Hero (70% card) | Medium (40% card, with overlays) | Minimal (thumbnail or none) |
| Typography role | Supporting | Supporting | Load-bearing |
| Color | Warm + pink accent | Bright + cyan accent | Monochrome + indigo accent |
| Density | Spacious | Dense | Spacious (different way) |
| Shadows | Soft | None (borders) | None (borders) |
| Card radius | 12px | 8px | 6px |
| Pill style | Round (`rounded-full`) | Round | Square-ish (`rounded-md`) |
| Best fit | Aspirational discovery | Quick decisions | Power-user planning |
