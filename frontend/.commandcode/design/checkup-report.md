# Checkup Report: Seruni Predict Frontend

**Mode:** /design checkup
**Date:** 2026-08-14
**Surface audited:** `frontend/src` — App shell, Login, Dashboard, Transaksi, Customer, Riwayat, UI kit
**Score:** 31 / 60

---

## TL;DR

Seruni Predict is a healthy-by-construction React + Tailwind v4 + Radix dashboard for a sales-prediction tool (Sistem Informasi Penjualan). The shadcn-style component kit brings real accessibility (focus rings, labels, dialogs, aria) and every page has loading, empty, and error states. But two things block trust: a **broken CSV export** (no auth header → 401 on a JWT-protected route) and a **user-visible honesty hole** — the dashboard reports model accuracy on a product-level forecast that the UI itself admits is ~25% accurate. The interface is quiet, competent, and generic: zero brand color (pure neutral default Tailwind palette, one unmodified blue-violet ring token), inconsistent heading hierarchy, and tables with no sorting/search. Visually it is a competent default; functionally it has one broken primary action.

**Verdict: Fix before ship — P0 export bug and dashboard honesty, then design passes for character.**

---

## Heuristic Scores

| # | Heuristic | Score | Key Finding |
|---|---|---|---|
| 1 | Intentionality | 5/10 | Default shadcn neutral palette + generic blue-violet ring token; no product color decision anywhere |
| 2 | Readability | 7/10 | Good tabular-nums money formatting and muted-foreground hierarchy; body measure fine; few font-size inconsistencies |
| 3 | Usability | 5/10 | **Export CSV is broken** (no auth token on download); 100-row hard cap with no pagination/search; raw ISO date strings in table cells |
| 4 | Responsiveness | 7/10 | Inputs use 16px text-base (no iOS zoom trap); sidebar offcanvas on mobile; wide tables scroll; header/sidebar "Seruni Predict" duplicated |
| 5 | Speed | 8/10 | Lightweight, no images, no heavy media; chart renders only after data; skeleton states everywhere |
| 6 | Accessibility | 7/10 | Radix + shadcn kit: focus rings, sr-only labels, labeled dialogs; icon-only buttons lack tooltips/aria-labels (Pencil, Trash2) |

**Score: 31/60**

---

## Cognitive Load / Risk

- **PASS** — Every list page has a loading skeleton and a graceful empty state ("Belum ada transaksi / customer / data riwayat").
- **PASS** — Destructive actions (delete, retrain) are gated behind confirmation dialogs with explicit consequences.
- **PASS** — Token refresh interceptor is well-structured; 401 → refresh → retry, falls back to logout redirect.
- **WATCH** — Tables are frozen at `page_size=100` with no search, filter, or pagination; the sales ledger will outgrow this quickly.
- **WATCH** — Zero unit tests in the frontend (no test script in package.json) for an app whose whole job is trustworthy numbers.
- **FAIL** — Dashboard claims "Akurasi Model" as the headline metric while the same screen disclaims "*Prediksi kasar, akurasi model produk rendah (~25%)". The leading number contradicts its own evidence.
- **FAIL** — Export CSV navigates to `/api/predictions/export/` with no bearer token. Backend requires `IsAuthenticated` + JWT. Result: 401 redirect loop or silent failure.

**Cognitive load: Moderate. The interface is simple and skimmable, but one headline metric is misleading and one primary action is broken.**

---

## What's Working

- **Strong component discipline.** Every page is composed from the same Card / Table / Dialog / Button kit with consistent tokens. Nothing hand-rolled, nothing stray.
- **Honest data copy.** The top-products footnote ("~25% accuracy") and rentang values on the revenue card show the product is candid about model limits.
- **Good feedback loop.** Every mutation has success and error toasts; delete and retrain require confirmation; refresh shows a spinner.
- **Solid responsive base.** Offcanvas sidebar on mobile, scrollable tables, `text-base` inputs (no iOS auto-zoom), `min-h-svh` layouts.
- **Accessible primitives out of the box.** Labeled inputs, `sr-only` text for icon buttons, Radix dialogs with descriptions, visible focus rings.

---

## Priority Issues

### P0 — Export CSV is broken (unauthenticated download)

**Evidence:** `Riwayat.tsx` calls `window.location.href = "/api/predictions/export/"`. The axios client attaches the JWT bearer token, but `window.location` navigation does not. Backend `ExportView` requires `permission_classes = [IsAuthenticated]` with SimpleJWT. The export will return 401 and no CSV will download; the user loses the refresh token and gets bounced to `/login` by the interceptor's fallback.

**FIX:** `/design finish` or manual: fetch the CSV through `api.get("/predictions/export/", { responseType: "blob" })`, then create an object URL and trigger a programmatic `<a download>` click.

### P0 — Dashboard headlines a metric the UI itself refutes

**Evidence:** The "Akurasi Model" card displays R² as the primary number while the Top Produk card on the same grid states product-level model accuracy is ~25%. R² measures the revenue model; top products are produced by a separate, weaker classifier. Leading with R² in the hero position overstates the prediction quality a daily user should trust.

**FIX:** `/design voice` or `/design deslop`: relabel the metric honestly ("Akurasi model revenue"), move the ~25% caveat up into the evaluation context, and put model freshness (`trained s/d`) on equal footing with the accuracy number.

### P1 — No search, filter, or pagination on any table

**Evidence:** `useTransaksi` and `useCustomer` hard-code `?page_size=100`. Sales and customer tables render the first 100 rows only, with no way to find an old transaction or a specific customer. As the ledger grows, records silently disappear from the UI.

**FIX:** `/design surface` or `/design interaction`: add search input on Transaksi/Customer, client-side pagination or "load more", and a visible "showing X of Y" count.

### P1 — Zero brand color decision

**Evidence:** `index.css` keeps the stock shadcn neutral tokens. The only hue anywhere is the untouched `--ring: oklch(0.585 0.17 255)` (blue-violet, the default) used for focus rings and chart line 1. A sales-prediction product with a name like "Seruni" ships with no color personality; chart series use the same generic palette.

**FIX:** `/design recolor`: pick one owned hue (seruni = chrysanthemum; a warm gold, deep green, or terracotta would fit Indonesian floristry/garden retail) and tint neutrals, sidebar, chart series, and the revenue accent to it.

### P1 — Icon-only actions have no tooltips or aria-labels

**Evidence:** Edit (Pencil) and Delete (Trash2) ghost buttons in Transaksi and Customer rows ship with no `title`, no `Tooltip`, and no `aria-label`. Screen-reader users hear an unlabeled button; sighted users must guess the icon's meaning.

**FIX:** `/design interaction`: wrap row actions in the existing `Tooltip` component and add `aria-label` / `sr-only` text for each icon button.

### P2 — Inconsistent heading hierarchy

**Evidence:** Dashboard uses `text-2xl font-semibold` for its page title; Transaksi, Customer, and Riwayat use `text-2xl font-bold`. Card titles mix `text-sm font-medium`, `text-sm font-semibold`, and `text-base`. Raw ISO date strings (`2026-08-14`) and `id` slugs render as plain mono text with no formatting or display label.

**FIX:** `/design typeset`: define one page-title style and one card-title style; format dates (`14 Agu 2026`) and add a human label next to raw IDs.

### P2 — No reduced-motion or animation system beyond defaults

**Evidence:** The only motion is `animate-spin` on refresh and `tw-animate-css` defaults. There is no `prefers-reduced-motion` handling and no entrance choreography on page changes or dialog open.

**FIX:** `/design motion`: add a small entrance system (sidebar fade-in, page fade-up, dialog scale) and respect `prefers-reduced-motion` with a global toggle.

### P2 — Duplicate "Seruni Predict" in header + sidebar

**Evidence:** `AppLayout` renders the product name in the sidebar header and again in the top bar. On a 4-item nav, this is redundant chrome that crowds the header; the top bar reads as a placeholder.

**FIX:** `/design relayout`: use the top bar for the current page/context (e.g. breadcrumb or page title) and keep the brand in the sidebar only.

---

## Next Modes

- `/design finish` — fix the P0 export bug and data-honesty issue first
- `/design recolor` — give Seruni a real color system
- `/design typeset` — unify the type scale and date/ID formatting
- `/design surface` — search, pagination, and table density
- `/design motion` — entrance choreography + reduced-motion support

---

*Generated with CommandCode — 2026-08-14*
