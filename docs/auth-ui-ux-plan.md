# Sign-in & Login UI/UX Enhancement Plan

## Design direction

- **Primary theme:** Mostly **white** — light backgrounds, white/off-white surfaces, plenty of space.
- **Accent:** **Black gradients** for emphasis — primary buttons, key borders, subtle shadows, and highlights.
- **Feel:** Clean, minimal, premium; consistent with “The Rope” brand but inverted (light-first).

---

## 1. Layout & background

| Area | Current | Planned |
|------|---------|--------|
| **Auth layout** | Dark gradient (`#0B0B0B` → `#252525`) | Light gradient: off-white → light gray (e.g. `#FAFAFA` → `#F0F0F0` → `#F5F5F5`) |
| **Page background** | Same dark gradient | Same light gradient; optional very subtle pattern or noise for depth |
| **Safe area** | Applied | Keep; ensure padding respects insets on all auth pages |

---

## 2. Card & container

| Element | Planned |
|--------|--------|
| **Card** | White (`#FFFFFF`) or near-white; soft shadow (`0 4px 24px rgba(0,0,0,0.06)`); border `1px solid rgba(0,0,0,0.06)` |
| **Border highlight** | Optional thin black gradient border (e.g. top or left edge) or subtle black/charcoal shadow for depth |
| **Radius** | Keep `rounded-2xl`; consider `rounded-3xl` for a softer look |
| **Max width** | Keep ~400px for form card; ensure comfortable reading line length |

---

## 3. Typography

| Element | Planned |
|--------|--------|
| **Headings (Sign in, Verify, Welcome)** | Dark gray/black (`#0B0B0B` or `#1a1a1a`); font-weight light to medium; slightly larger on desktop |
| **Body / hints** | Muted gray (`#6B6B6B` or `#737373`) for secondary text |
| **Links** | Black or dark gray; hover: underline or slight darkening; no blue |
| **Font stack** | Use existing (e.g. DM Sans); consider serif for headings if it matches The Rope (Playfair) |

---

## 4. Inputs

| Property | Planned |
|----------|--------|
| **Background** | White or very light gray (`#FAFAFA`) |
| **Border** | Light gray default (`#E5E5E5`); focus: darker gray or thin black gradient / ring |
| **Text** | Black or near-black (`#0B0B0B`) |
| **Placeholder** | Muted gray (`#A3A3A3`) |
| **Focus state** | Ring or border using black/dark gray (e.g. `ring-2 ring-black/10` or gradient border) |
| **Error state** | Red border + red error text; keep accessible contrast |

---

## 5. Buttons

| Type | Planned |
|------|--------|
| **Primary (Send code, Verify, Continue)** | **Black gradient**: e.g. `from-[#1a1a1a] to-[#0B0B0B]`; white text; rounded-xl; hover: slightly lighter gradient + soft shadow |
| **Disabled** | Gray gradient or flat gray; reduced opacity; clear disabled state |
| **Secondary / link (Back, Change number)** | Text only: dark gray; hover: black or underline; no blue |

---

## 6. Feedback & states

| Area | Planned |
|------|--------|
| **Loading** | Button shows “Sending…”, “Verifying…”, “Saving…” and is disabled; optional subtle spinner inside button or beside label |
| **Errors** | Inline below field or above button; red text (`#DC2626` or similar); optional small icon |
| **Success** | After verify/name save: redirect to app; optional brief toast (can be added later) |
| **Accessibility** | `aria-live` for errors; `aria-busy` on submit; ensure focus order and visible focus rings (black/gray) |

---

## 7. UX enhancements

| Enhancement | Description |
|-------------|-------------|
| **Auto-focus** | Auto-focus phone input on login; code input on verify; name input on name step (where safe) |
| **Enter key** | Submit on Enter for all forms (already in place via form submit) |
| **Clear error on type** | Clear error message when user starts typing again |
| **Phone format** | Optional: format as user types (e.g. spaces or dashes); validate length/format before submit |
| **Code input** | Consider 6 separate digit boxes for better UX and mobile OTP autofill (optional) |
| **Back / Change number** | Keep visible; ensure tap targets ≥ 44px; “Back to home” and “Change number” stay secondary |
| **Redirect after login** | Keep redirect to `/app` or `/app/feed`; optional “Redirecting…” state if needed |
| **Deep link back** | After login, redirect to `/app/feed` (or intended destination); preserve `?phone=` on verify for “Change number” |

---

## 8. Screens summary

| Screen | Purpose | Key UI elements |
|--------|---------|-----------------|
| **Login** | Enter phone, send code | White card; black gradient CTA; phone input; “Back to home” link |
| **Verify** | Enter 6-digit code | Same card style; code input (single or 6 boxes); “Change number” link |
| **Welcome (name)** | First-time name | Same card; name input; black gradient “Continue” |

---

## 9. Implementation checklist

- [x] Auth layout: switch to white/light gradient background
- [x] Login page: white card, black gradient button, light inputs, dark text
- [x] Verify page (code step): same treatment
- [x] Verify page (name step): same treatment
- [x] Suspense fallback: light background, dark text
- [x] Clear error on input change (all three forms)
- [x] Auto-focus first field on each screen (login phone; verify code; name step)
- [ ] Optional: 6-digit code boxes + OTP autofill
- [ ] Test on mobile (touch targets, keyboard, safe areas)
- [x] Error states use `aria-describedby` / `aria-invalid` / `role="alert"` for a11y

---

## 10. Token reference (white theme)

| Token | Value |
|-------|--------|
| Background gradient | `#FAFAFA` → `#F5F5F5` → `#F0F0F0` |
| Card bg | `#FFFFFF` |
| Card border | `rgba(0,0,0,0.06)` |
| Card shadow | `0 4px 24px rgba(0,0,0,0.06)` |
| Text primary | `#0B0B0B` / `#1a1a1a` |
| Text secondary | `#737373` |
| Input bg | `#FFFFFF` or `#FAFAFA` |
| Input border | `#E5E5E5` |
| Button gradient | `from-[#1a1a1a] to-[#0B0B0B]` |
| Button hover | Slight lift + `0 4px 12px rgba(0,0,0,0.15)` |
