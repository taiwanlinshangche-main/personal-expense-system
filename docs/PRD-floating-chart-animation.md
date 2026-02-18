# PRD: Floating Line Chart Animation for Trends Tab

## Overview

Transform the Trends tab (`InsightTab.tsx`) chart from a static SVG line into a magical, floating visualization. The line should feel like it's glowing and hovering in space, with smooth physics-based interactions and cinematic entrance animations.

**Target file:** `src/components/home/InsightTab.tsx`
**Dependencies:** `motion/react` (already installed)
**No new packages required.**

---

## Animation Spec

### 1. Multi-Layer Glow Filter (Floating Feel)

The core of the "floating" effect. Layer 3 blurred copies of the line behind the sharp original to create a soft luminous halo.

**SVG filter definition (add to `<defs>`):**

```xml
<filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
  <!-- Wide ambient glow -->
  <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur3" />
  <feColorMatrix in="blur3" result="color3" type="matrix"
    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.3 0" />
  <!-- Medium glow -->
  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
  <feColorMatrix in="blur2" result="color2" type="matrix"
    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" />
  <!-- Tight inner glow -->
  <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur1" />
  <feMerge>
    <feMergeNode in="color3" />
    <feMergeNode in="color2" />
    <feMergeNode in="blur1" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

Apply to the line: `<path d={linePath} filter="url(#lineGlow)" />`

**Why this works:** The 3 blur layers at increasing `stdDeviation` (1.5, 4, 8) create depth — tight luminosity near the line fading into a wide ambient glow. The `feColorMatrix` reduces opacity on wider layers so the glow softens naturally.

---

### 2. Line Draw-On Animation (Cinematic Entrance)

When the chart mounts or data changes, the line draws itself from left to right.

**Replace the static `<path>` with `<motion.path>`:**

```tsx
<motion.path
  d={linePath}
  fill="none"
  stroke={lineColor}
  strokeWidth="2.5"
  strokeLinecap="round"
  strokeLinejoin="round"
  filter="url(#lineGlow)"
  initial={{ pathLength: 0, opacity: 0 }}
  animate={{ pathLength: 1, opacity: 1 }}
  transition={{
    pathLength: { duration: 1.5, ease: [0.33, 1, 0.68, 1] },
    opacity: { duration: 0.3 },
  }}
/>
```

The area fill fades in after the line finishes drawing:

```tsx
<motion.path
  d={areaPath}
  fill="url(#insightAreaGrad)"
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ delay: 1.0, duration: 0.8, ease: "easeOut" }}
/>
```

**Key:** Use `key={...}` on the parent `<motion.svg>` or `<motion.g>` to re-trigger the animation when viewMode/period/account changes.

---

### 3. Breathing Area Gradient (Living Feel)

The area under the line gently pulses, like the chart is breathing.

**Update the `<linearGradient>` definition:**

```xml
<linearGradient id="insightAreaGrad" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0%" stopColor={lineColor}>
    <animate
      attributeName="stop-opacity"
      values="0.20;0.10;0.20"
      dur="4s"
      repeatCount="indefinite"
    />
  </stop>
  <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
</linearGradient>
```

**Subtlety is key:** The opacity only shifts between 0.10 and 0.20 — just enough to feel alive without being distracting.

---

### 4. Glow Pulse Animation (Breathing Glow)

The glow itself gently breathes in sync with the area:

```xml
<!-- Inside the lineGlow filter, on the wide blur -->
<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur3">
  <animate
    attributeName="stdDeviation"
    values="6;10;6"
    dur="4s"
    repeatCount="indefinite"
  />
</feGaussianBlur>
```

This makes the outer glow expand and contract subtly, reinforcing the floating illusion.

---

### 5. Spring-Animated Hover Cursor (Satisfying Interaction)

Replace the current click-to-select with smooth mouse/touch tracking using Motion springs.

**New state + springs:**

```tsx
import { useMotionValue, useSpring } from "motion/react";

const cursorX = useMotionValue(0);
const cursorY = useMotionValue(0);
const springX = useSpring(cursorX, { stiffness: 300, damping: 28 });
const springY = useSpring(cursorY, { stiffness: 300, damping: 28 });
```

**Mouse/touch tracking on an invisible hit rect:**

```tsx
<rect
  x={CHART_L} y={CHART_T}
  width={CHART_R - CHART_L} height={CHART_B - CHART_T}
  fill="transparent"
  style={{ pointerEvents: "all" }}
  onMouseMove={(e) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * SVG_W;
    let closest = 0, closestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - mouseX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    }
    cursorX.set(coords[closest].x);
    cursorY.set(coords[closest].y);
    setSelectedPointIdx(closest);
  }}
  onMouseLeave={() => setSelectedPointIdx(null)}
  onTouchMove={(e) => {
    const touch = e.touches[0];
    const rect = svgRef.current!.getBoundingClientRect();
    const touchX = ((touch.clientX - rect.left) / rect.width) * SVG_W;
    let closest = 0, closestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - touchX);
      if (dist < closestDist) { closestDist = dist; closest = i; }
    }
    cursorX.set(coords[closest].x);
    cursorY.set(coords[closest].y);
    setSelectedPointIdx(closest);
  }}
/>
```

**Render spring-animated cursor elements:**

```tsx
{selectedPointIdx !== null && (
  <>
    {/* Vertical guide line */}
    <motion.line
      x1={springX} y1={CHART_T} x2={springX} y2={CHART_B}
      stroke="var(--color-text-tertiary)"
      strokeWidth="0.5"
      strokeDasharray="3 3"
      opacity="0.3"
    />
    {/* Outer pulse ring */}
    <motion.circle
      cx={springX} cy={springY} r="12"
      fill={lineColor} opacity="0.08"
    />
    {/* Data point dot */}
    <motion.circle
      cx={springX} cy={springY} r="5"
      fill={lineColor}
      stroke="var(--color-bg-primary)"
      strokeWidth="2.5"
    />
  </>
)}
```

The spring physics make the cursor glide between data points with a satisfying elastic feel instead of snapping rigidly.

---

### 6. Glassmorphism Chart Container

Wrap the chart in a frosted glass card for depth.

```tsx
<div className="relative mt-4 rounded-2xl overflow-hidden">
  {/* Frosted glass background */}
  <div
    className="absolute inset-0"
    style={{
      background: "rgba(255, 255, 255, 0.03)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255, 255, 255, 0.06)",
      borderRadius: "1rem",
    }}
  />
  {/* Chart on top */}
  <svg ref={svgRef} ... className="relative w-full" style={{ cursor: "crosshair" }}>
    ...
  </svg>
</div>
```

---

### 7. Pulsing Data Point Dots (Ambient Particles)

Small dots at each data point that gently pulse, making the line feel alive:

```tsx
{coords.map((pt, i) => (
  <circle
    key={i}
    cx={pt.x}
    cy={pt.y}
    r="1.5"
    fill={lineColor}
    opacity="0"
  >
    <animate
      attributeName="opacity"
      values="0;0.5;0"
      dur={`${3 + (i % 3)}s`}
      begin={`${(i * 0.3) % 2}s`}
      repeatCount="indefinite"
    />
    <animate
      attributeName="r"
      values="1;2.5;1"
      dur={`${3 + (i % 3)}s`}
      begin={`${(i * 0.3) % 2}s`}
      repeatCount="indefinite"
    />
  </circle>
))}
```

**Only render when `viewMode === "week"` or data points < 15** to avoid clutter on month/year views.

---

## Implementation Order

| Step | What | Effort |
|------|------|--------|
| 1 | Add glow filter `<defs>` + apply to line path | Small |
| 2 | Replace `<path>` with `<motion.path>` for draw-on animation | Small |
| 3 | Add breathing gradient `<animate>` to area fill | Small |
| 4 | Add glow pulse `<animate>` to filter | Small |
| 5 | Implement spring cursor with `useMotionValue` + `useSpring` | Medium |
| 6 | Wrap chart in glassmorphism container | Small |
| 7 | Add pulsing data point dots (week view only) | Small |

Steps 1-4 can be done together as one pass (pure SVG/markup changes).
Step 5 is the most involved (replaces existing click handler with continuous tracking).
Steps 6-7 are independent polish.

---

## Performance Notes

- All glow/pulse animations use **SVG-native `<animate>`** — zero JS overhead, runs on compositor
- `motion.path` with `pathLength` uses GPU-accelerated `stroke-dashoffset`
- Spring cursor uses Motion's optimized `useSpring` — updates via `style` not React re-renders
- `backdrop-filter: blur()` is GPU-accelerated on all modern browsers
- **No `transition: all`** anywhere — only specific properties are animated
- Glow filter may impact performance on very low-end devices; can add a `prefers-reduced-motion` media query to disable it

---

## Reduced Motion Fallback

```tsx
const prefersReduced = typeof window !== "undefined"
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```

When `prefersReduced`:
- Skip draw-on animation (set `initial={false}`)
- Remove glow filter
- Disable breathing animations
- Keep spring cursor (springs respect reduced motion in Motion v11+)
