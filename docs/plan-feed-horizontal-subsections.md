# Feed: horizontal subsections with header (one visible at a time)

## Goal

- Only **one subsection visible at a time** on the feed screen (Stories **or** Posts).
- A **header** with two segments (Stories | Posts) to switch the visible subsection.
- **Horizontal navigation** between the two: tap the header segment or **swipe left/right** to move between Stories and Posts.

## Current state

- [app/app/feed/FeedClient.tsx](app/app/feed/FeedClient.tsx) stacks two sections vertically: Stories (with heading + StoryBar) then Posts (heading + post list). Both are in one vertical scroll.

## Target design

```mermaid
flowchart LR
  subgraph screen [Feed screen]
    H[Header: Stories | Posts]
    P[Panel area]
  end
  H -->|tap or swipe| P
  P -->|"Stories"| S[Stories panel]
  P -->|"Posts"| Po[Posts panel]
```

- **Header**: Fixed or sticky at top of the feed. Segmented control: **Stories** and **Posts**. Active segment is clearly highlighted (e.g. bold + underline or filled background). Tapping a segment switches the visible panel and updates the segment highlight.
- **Content area**: One horizontal “page” at a time:
  - **Panel 1 (Stories)**: Full-width, scrollable vertically inside (StoryBar vertical list).
  - **Panel 2 (Posts)**: Full-width, scrollable vertically inside (post list + Load more).
- **Navigation**:
  - **Tap header**: Set active index (0 = Stories, 1 = Posts); scroll content to that panel and update header state.
  - **Swipe**: Horizontal scroll (or drag) in the content area. Use **scroll-snap** so one panel is fully in view. On scroll end (or scroll-snap after swipe), set active index from scroll position and update header highlight.

## Implementation outline

### 1. FeedClient layout and state

**File:** [app/app/feed/FeedClient.tsx](app/app/feed/FeedClient.tsx)

- Add state: `activeIndex: 0 | 1` (0 = Stories, 1 = Posts). Optional: derive from a ref to the horizontal scroll container’s scrollLeft to keep header in sync after swipe.
- **Structure**:
  1. **Header** (sticky/fixed at top of feed):
     - Segmented control: two buttons/chips “Stories” and “Posts”. `activeIndex === 0` → Stories active; `activeIndex === 1` → Posts active. `onClick` sets `activeIndex` and scrolls the content container to the correct panel (e.g. `scrollLeft = activeIndex * width`).
     - Style to match app (e.g. border-bottom, same bg as feed).
  2. **Horizontal content wrapper** (takes remaining height, `overflow-x: auto`, `overflow-y: hidden`, `scroll-snap-type: x mandatory`, `display: flex`):
     - **Panel 1**: `min-width: 100%` (or `100vw`), `scroll-snap-align: start`, `overflow-y: auto` so the Stories content scrolls vertically inside. Render Stories subsection (StoryBar) here.
     - **Panel 2**: Same width and snap, `overflow-y: auto`. Render Posts subsection (empty state or post list + Load more) here.
  3. **Sync swipe → header**: Attach `onScroll` to the horizontal container. When scroll ends (or use a debounce/small timeout), compute which panel is in view (e.g. `scrollLeft / containerWidth`) and set `activeIndex`. So after the user swipes, the header segment updates to match.
  4. **Sync header → scroll**: When user taps a segment, set `activeIndex` and set `scrollLeft` of the container to `activeIndex * containerWidth` (use a ref to the scroll container). Optional: `scrollIntoView` on the panel div.
  5. Keep **CommentsDrawer**, **ShareSheet**, and the **floating create button** outside this layout (same as now) so they work from both panels.

### 2. Panel content

- **Stories panel**: Move current Stories section content (heading optional; StoryBar) into the first panel. No structural change to StoryBar; it stays a vertical list.
- **Posts panel**: Move current Posts section content (heading optional; empty state or `<ul>` + Load more) into the second panel. Each panel handles its own vertical scroll.

### 3. Scroll container ref and dimensions

- Use a ref for the horizontal scroll container. On mount and resize, read `clientWidth` to compute panel width (usually same as container width). When setting scroll position programmatically, use `ref.current.scrollLeft = activeIndex * ref.current.clientWidth`.
- Ensure the two panels each have `min-width: 100%` (of the container) or equivalent so they fill the view and snap one-at-a-time.

### 4. Touch / swipe behavior

- Rely on native horizontal scroll: the container is `overflow-x: auto` with scroll-snap. No extra touch handlers required unless you want to disable vertical scroll in the container (vertical scroll should happen inside each panel only). Ensure the horizontal container doesn’t capture vertical scroll when the user is scrolling posts or stories; the inner panels have `overflow-y: auto`.

### 5. FeedSkeleton

- [components/feed/FeedSkeleton.tsx](components/feed/FeedSkeleton.tsx): Match the new layout: header skeleton (two segments) + a single visible panel skeleton (e.g. one panel’s content skeleton). No need to show both panels in the skeleton.

### 6. Accessibility and UX

- Header segments: `role="tablist"` and each segment `role="tab"`, `aria-selected={activeIndex === i}`, `aria-controls` pointing to the panel id. Panels: `role="tabpanel"`, `id` for `aria-controls`, `aria-label` (e.g. “Stories”, “Posts”).
- Optional: keyboard support (arrow keys to switch tabs) and focus management when changing panels.

## File summary

| File | Action |
|------|--------|
| [app/app/feed/FeedClient.tsx](app/app/feed/FeedClient.tsx) | Add header (Stories/Posts segments), horizontal scroll container with two full-width panels, `activeIndex` state, scroll-to-panel on segment tap, sync activeIndex from scroll on swipe. Keep drawer, share sheet, FAB. |
| [components/feed/FeedSkeleton.tsx](components/feed/FeedSkeleton.tsx) | Skeleton: header with two segments + one panel placeholder. |

## Result

- One subsection visible at a time (Stories or Posts).
- Header with two segments; tapping a segment switches the visible subsection.
- Horizontal swipe between Stories and Posts; header updates to match the visible subsection.
