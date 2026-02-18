# PRD: Bottom Navigation Bar Redesign

## Problem

The current app uses a **top horizontal tab bar** (text pill buttons) + a **floating + button** at the bottom center. Issues:

1. **Horizontal scroll on mobile** — swiping left breaks the layout (no overflow protection)
2. **Top tabs waste vertical space** on a mobile-first app
3. **No visual hierarchy** — all 4 tabs look identical as text pills
4. **FAB feels disconnected** from navigation — just a floating circle

## Goal

Replace the top tab bar with a **bottom navigation bar** featuring:
- A **curved notch** in the center for the + button (like the reference design)
- **4 icon-based tab buttons** — 2 on each side of the center FAB
- An **animated + button** with flowing gradient gas texture and glow effect
- Proper **safe area handling** for iPhone notch/home indicator

### Layout

```
┌──────────────────────────────────────┐
│  [👤] Personal              [🔍]     │  ← Header (no emoji)
│                                      │
│         (tab content area)           │
│                                      │
│                                      │
├──────────┐          ┌────────────────┤
│ Overview │  ╭──+──╮ │ Trends         │
│ Expenses │  ╰─────╯ │ Claims         │
└──────────┴──────────┴────────────────┘
```

### + Button Animation
- Circular button, ~64px diameter
- **Gradient texture**: animated CSS gradient simulating flowing gas (multiple colors shifting)
- **Glow effect**: soft outer glow pulsing subtly
- **Press animation**: scale down + brightness increase on tap

---

## Current State Analysis

### Component Hierarchy
```
AppShell (layout, FAB, sheets)
  └── HomeContent (header, tab bar, tab content)
       ├── Header: avatar + workspace label + search
       ├── TabBar: 4 text pills (Overview, Expenses, Trends, Claims)
       └── TabContent: AnimatePresence switching between tab views
```

### Key Files
| File | Role |
|------|------|
| `src/components/home/HomeContent.tsx` | Tab bar + header + tab content |
| `src/components/layout/FAB.tsx` | Floating + button (fixed bottom-8) |
| `src/components/layout/AppShell.tsx` | Layout wrapper, FAB placement, main padding |
| `src/app/globals.css` | Global styles, overflow behavior |

### Current Tab System
- **State**: `activeTab` in HomeContent local state (`"overview" | "expense" | "insight" | "claims"`)
- **Rendering**: Top pill buttons with `cn()` conditional styling
- **Transitions**: Framer Motion `AnimatePresence` with fade + Y-slide

---

## 10-Week Implementation Plan

### Week 1 — Fix Horizontal Scroll + Remove Workspace Emoji
**Goal:** Fix the mobile swipe bug and clean up header

| Task | Details |
|------|---------|
| Fix horizontal overflow | Add `overflow-x: hidden` and `overscroll-behavior-x: none` to html/body in globals.css |
| Remove workspace emoji | Header shows "Personal" instead of "🏠 Personal" |
| Test on iOS Safari | Verify left-swipe no longer breaks layout |

**Files:** `globals.css`, `HomeContent.tsx`
**Deliverable:** No more horizontal scroll issue, cleaner header

---

### Week 2 — Create BottomNavBar Component Skeleton
**Goal:** New component with 5 slots (2 left tabs, center FAB, 2 right tabs)

| Task | Details |
|------|---------|
| Create `BottomNavBar.tsx` | New component in `src/components/layout/` |
| Layout structure | Fixed bottom, full-width, flex row with 5 slots |
| Placeholder content | Text labels for now (icons come in Week 4) |
| Safe area padding | `pb-safe` for iPhone home indicator |
| Background | Solid `bg-bg-primary` with top border |
| Z-index | Higher than content, lower than modals (z-40) |

**Files:** New `src/components/layout/BottomNavBar.tsx`
**Deliverable:** Static bottom bar with 5 slots visible

---

### Week 3 — Wire Up Tab Switching + Remove Top Tab Bar
**Goal:** Bottom nav controls tab switching, top tab bar removed

| Task | Details |
|------|---------|
| Lift tab state to AppShell | Move `activeTab` from HomeContent to AppShell context so BottomNavBar can access it |
| Add to useAppData | `activeTab` + `setActiveTab` in context |
| BottomNavBar calls setActiveTab | Each tab slot is a button that switches tabs |
| Remove top tab bar | Delete the `<div className="flex items-center gap-1.5 px-5 mt-4">` section from HomeContent |
| Remove FAB.tsx usage | BottomNavBar includes the center + button directly |
| Adjust main padding | Change `pb-24` to account for new navbar height (~80px + safe area) |

**Files:** `AppShell.tsx`, `useAppData.ts`, `HomeContent.tsx`, `BottomNavBar.tsx`
**Deliverable:** Functional bottom nav, no more top tabs, tab switching works

---

### Week 4 — Design Tab Icons (SVG)
**Goal:** Replace text labels with custom SVG icons

| Task | Details |
|------|---------|
| Overview icon | Home/dashboard icon (grid or pie chart) |
| Expenses icon | Receipt/list icon |
| Trends icon | Chart/line-graph icon |
| Claims icon | Clipboard/checkmark icon |
| Active vs inactive states | Active: filled/accent color, Inactive: outline/secondary color |
| Icon + label layout | Small icon above tiny label text (10-11px) |

**Icon style:** Outline stroke icons (24x24 viewBox, strokeWidth 1.8), matching existing app icon style

**Files:** `BottomNavBar.tsx`
**Deliverable:** 4 distinct icons with active/inactive visual states

---

### Week 5 — Curved Notch / Concave Cutout
**Goal:** The navbar has a curved indentation in the center for the FAB

| Task | Details |
|------|---------|
| SVG clip-path or CSS approach | Use an SVG path for the navbar background with a concave curve in the center |
| Notch dimensions | ~72px wide arc at the top of the navbar, accommodates 64px FAB |
| Background fill | Same as navbar background, seamless blend |
| FAB overlap | Center button sits ~50% above the navbar line |
| Shadow on navbar | Subtle top shadow for depth |

**Approach:** Render the navbar as an SVG `<path>` background with a semicircular cutout, then position content on top.

**Files:** `BottomNavBar.tsx`, possibly `globals.css`
**Deliverable:** Navbar with smooth curved notch, FAB sitting in the curve

---

### Week 6 — Animated Gradient FAB (Flowing Gas Texture)
**Goal:** The + button has a living, breathing gradient animation

| Task | Details |
|------|---------|
| Gradient design | Multi-color gradient (blue/purple/teal shifting) |
| CSS animation | `@keyframes` rotating conic-gradient or animated radial-gradient |
| Technique | Use `background-size: 200% 200%` with `animation: gradient-shift 4s ease infinite` |
| Alternative: SVG filter | `feTurbulence` + `feDisplacementMap` for organic gas-like movement |
| Button size | 64px diameter, white + icon centered |
| Border-radius | Full circle |

**Visual:** Colors slowly shift and flow across the button surface, like iridescent gas in a sphere.

**Files:** `BottomNavBar.tsx`, `globals.css`
**Deliverable:** Mesmerizing animated gradient on the + button

---

### Week 7 — Glow Effect + Press Animations
**Goal:** The FAB glows softly and responds to touch

| Task | Details |
|------|---------|
| Outer glow | `box-shadow` with color from the gradient, pulsing opacity via animation |
| Pulse timing | Synced with gradient animation (same 4s cycle) or offset |
| Press: scale down | `whileTap={{ scale: 0.9 }}` (Framer Motion) |
| Press: brightness | Increase brightness on tap via CSS filter |
| Release: spring back | Spring physics (stiffness: 400, damping: 20) |
| Haptic feedback | Navigator vibrate API on tap (10ms pulse, if supported) |

**Files:** `BottomNavBar.tsx`
**Deliverable:** FAB that glows, breathes, and responds to touch with satisfying feedback

---

### Week 8 — Active Tab Indicators + Micro-Animations
**Goal:** Visual feedback for active tab, smooth transitions

| Task | Details |
|------|---------|
| Active indicator dot | Small dot or line below active icon |
| Color change | Active icon gets accent color fill, label gets primary text |
| Transition animation | Spring-based transition when switching tabs (icon morphs) |
| Tab content transition | Keep existing AnimatePresence fade + slide |
| Badge support | Optional: show count badge on Claims tab (pending count) |

**Files:** `BottomNavBar.tsx`, `HomeContent.tsx`
**Deliverable:** Polished tab switching with visual indicators

---

### Week 9 — Safe Area, Landscape, Edge Cases
**Goal:** Works on all devices and orientations

| Task | Details |
|------|---------|
| iPhone safe area | `env(safe-area-inset-bottom)` padding below navbar |
| Landscape mode | Navbar stays at bottom, content scrolls properly |
| Keyboard open | Navbar hides or stays fixed when keyboard is visible |
| Very small screens | Ensure icons don't overflow or overlap |
| AddTransactionSheet | Sheet opens above navbar properly |
| Settings/Search | Overlays appear above navbar |
| Touch targets | Minimum 44x44px hit areas for all tab buttons |
| Accessibility | aria-labels, role="navigation", aria-current for active tab |

**Files:** `BottomNavBar.tsx`, `globals.css`, `AppShell.tsx`
**Deliverable:** Robust navbar on all device configurations

---

### Week 10 — Final QA, Polish & Performance
**Goal:** Production-ready, buttery smooth

| Task | Details |
|------|---------|
| Performance audit | Ensure gradient animation uses GPU (`will-change`, `transform`) |
| `prefers-reduced-motion` | Disable gradient animation + glow pulse for users who prefer reduced motion |
| Memory check | Gradient animation doesn't leak memory over time |
| Full regression | All 4 tabs work, + button opens sheet, workspace switch works |
| Visual polish | Pixel-perfect alignment, consistent spacing |
| Screenshot comparison | Match reference design |
| Update MEMORY.md | Document new navbar architecture |
| Commit & deploy | Final push |

**Deliverable:** Ship it

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| SVG notch cutout is complex | Medium | Fallback to simple rounded border if SVG path is too brittle |
| Gradient animation jank on low-end devices | Medium | Use `will-change: transform`, test on real devices, reduced-motion fallback |
| Tab state lifting breaks existing behavior | Low | Straightforward refactor, context pattern already used |
| Safe area varies across devices | Medium | Test on multiple iOS/Android devices, use standard env() values |
| Navbar conflicts with bottom sheets | Medium | Ensure z-index hierarchy: content < navbar < sheet backdrop < sheet |

## Success Metrics

- [ ] No horizontal scroll on mobile swipe
- [ ] Bottom navbar with 4 icon tabs + center FAB
- [ ] Curved notch cutout matches reference design
- [ ] + button has flowing gradient animation + glow
- [ ] Smooth tab switching with active indicators
- [ ] Works on iPhone (safe area), Android, desktop
- [ ] All existing features (workspace switch, search, settings) still work
- [ ] `prefers-reduced-motion` respected
