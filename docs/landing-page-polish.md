# Landing Page Polish & Refinement — Next Steps

Prioritized list of improvements for The Rope landing page. Tick off as you go.

---

## 1. Navigation & wayfinding

- [ ] **Sticky header (optional)**  
  Minimal bar on scroll: logo/wordmark “The Rope” + “Request Membership” and “Learn More”. Only show after user scrolls past hero (e.g. `position: sticky`, show when `scrollY > 80`).

- [ ] **Skip link**  
  Add `<a href="#the-idea" class="sr-only focus:not-sr-only">Skip to main content</a>` at top for keyboard/screen-reader users.

- [ ] **Section IDs for deep links**  
  You already have `#the-idea` and `#request`. Consider: `#problem`, `#features`, `#benefits`, `#power-of-circles` and use them in a simple in-page nav or for sharing.

---

## 2. Visual polish

- [ ] **Hero CTA focus states**  
  Ensure “Request Membership” and “Learn More” have a visible focus ring (e.g. `focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B0B]`) for keyboard users.

- [ ] **Button active state**  
  Add `active:scale-[0.98]` to primary/secondary CTAs for tap feedback on mobile.

- [ ] **Decorative divider**  
  Optional thin horizontal line or gradient between major sections (e.g. between “Fragmentation” and “Platform Features”) to reinforce section breaks.

- [ ] **Consistent link underline**  
  If “Back to home” or any text links are added, use a consistent hover style (e.g. `hover:underline underline-offset-2`).

---

## 3. Accessibility

- [ ] **Landmark roles**  
  Wrap main content in `<main>` and use `<section aria-labelledby="...">` where useful (e.g. `id="problem-heading"` on the “Fragmentation” heading, `aria-labelledby="problem-heading"` on that section).

- [ ] **Heading hierarchy**  
  Confirm a single `<h1>` (e.g. “The Rope”) and that section titles are `<h2>`; no skipped levels.

- [ ] **Reduced motion**  
  You already respect `prefers-reduced-motion` for mesh and icons. Ensure hero CSS animations (`network-fade-in`) are also disabled or simplified when `prefers-reduced-motion: reduce` (e.g. no translateY, opacity 0→1 only or no animation).

- [ ] **Arabic text**  
  Keep `dir="rtl"` and `lang="ar"` on the verse; optionally add `aria-label` or a short visually hidden translation for screen readers if needed.

---

## 4. Performance & UX

- [ ] **Font loading**  
  Root layout already preconnects to Google Fonts. Consider `font-display: swap` (or ensure it’s set in the font URL) so text is visible while fonts load.

- [ ] **Hero animation**  
  If hero feels heavy on low-end devices, reduce number of constellation nodes/lines or simplify the mesh orbs.

- [ ] **Lazy / below-the-fold**  
  Sections below hero are already in FadeInSection; no extra lazy-loading needed unless you add heavy images later.

- [ ] **Meta / OG**  
  Add Open Graph and Twitter card meta tags (in root layout or network page) for “The Rope” title, description, and an OG image (e.g. 1200×630) so shares look good.

---

## 5. Content & trust

- [ ] **Footer (optional)**  
  Minimal footer: “The Rope · A network of faith”, link to “Request Membership” or login, and optional “Privacy” / “Terms” if you have those pages.

- [ ] **Testimonial or quote (optional)**  
  One short, dignified quote from a member or advisor (with permission) in a “Power of Small Circles” or Benefits area to add social proof.

- [ ] **Clear outcome**  
  You already state “connect with affluent, influential, and powerful Muslims”. Optionally add one line near the final CTA: what happens after they request (e.g. “Apply once; we’ll be in touch.”) to set expectations.

---

## 6. Technical / SEO

- [ ] **Canonical URL**  
  If the same content is on `/` and `/network`, set `<link rel="canonical" href="https://yourdomain.com/" />` (or vice versa) to avoid duplicate content.

- [ ] **Structured data (optional)**  
  Add JSON-LD `Organization` or `WebSite` with name “The Rope”, description, and `url` for rich results.

- [ ] **Page metadata**  
  You have title and description on `/network`. Ensure root `/` (when it renders the landing) uses the same or similar metadata (e.g. in root layout or in the page that renders `<NetworkLanding />`).

---

## 7. Mobile & touch

- [ ] **Tap targets**  
  CTAs are already large (e.g. `min-h-[48px]` equivalent via padding). Ensure “Learn More” and any small links are at least ~44px height for touch.

- [ ] **Safe area**  
  Sections use `px-6` and standard padding; if you add a sticky header or footer, add `env(safe-area-inset-*)` so they don’t sit under notches or home indicators.

- [ ] **Scroll hint (optional)**  
  Subtle “Scroll” or chevron at bottom of hero on desktop to hint at more content (optional; can feel redundant if the fold is obvious).

---

## Quick wins (do first)

1. Add focus-visible styles to hero CTAs.
2. Add `prefers-reduced-motion` override for hero `network-fade-in` animations.
3. Add OG/Twitter meta tags and a default OG image.
4. Add a minimal footer with “The Rope” and Request Membership link.
5. Ensure root `/` page (when it shows the landing) has the same title/description as the brand.

After that, tackle navigation (sticky header or skip link), then deeper a11y (landmarks, heading audit), then optional content (testimonial, footer copy, canonical/structured data).
