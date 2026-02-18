# PRD: Guided Form UX + Flat Navbar

## Research Sources
- [Progressive Disclosure - NN/g](https://www.nngroup.com/articles/progressive-disclosure/)
- [Progressive Disclosure Types & Use Cases - LogRocket](https://blog.logrocket.com/ux-design/progressive-disclosure-ux-types-use-cases/)
- [Stepper UI Examples - Eleken](https://www.eleken.co/blog-posts/stepper-ui-examples)
- [Best Practices for Form Design - UX Collective](https://uxdesign.cc/best-practices-for-form-design-ff5de6ca8e5f)
- [UI Form Design Guide 2026 - IxDF](https://www.interaction-design.org/literature/article/ui-form-design)

## Problem Statement

1. **FAB blocks form content** — floating + button overlaps Note field on mobile
2. **No visual guidance** — all form fields shown at equal prominence, overwhelming on small screens
3. **Default account bug** — SinoPac Card not pre-selected because form renders before accounts load
4. **Cognitive overload** — 6+ fields visible simultaneously without clear order

## Design Principles (from research)

- **Staged disclosure**: Show one section at a time, minimize cognitive load per step
- **Active field highlighting**: Bold border/color change signals where user should focus
- **Completion feedback**: Green border on completed fields reassures users their input registered
- **Always interactable**: Dimmed fields can still be tapped (user isn't locked into sequence)

---

## Deliverables

### 1. Flat Navbar (BottomNavBar.tsx)

**Current**: SVG curved notch + floating gradient FAB overlapping navbar
**New**: Simple flat row with 5 evenly-spaced icons

| Position | Icon | Action |
|----------|------|--------|
| 1 | Home | Overview tab |
| 2 | Document | Expenses tab |
| 3 | + (accent color) | Open add form |
| 4 | Activity | Trends tab |
| 5 | Clipboard | Claims tab |

- Remove SVG notch, FAB absolute positioning, gradient animation
- + icon uses `text-accent` to stand out, slightly larger (28px vs 24px)
- Same opacity-based active/inactive as other icons
- Bar height stays 56px, no overhang needed
- Keep safe area padding for iPhone

### 2. Fix Default Account

**Root cause**: `showAddForm` starts `true`, but `accounts` starts `[]`. Form mounts with empty accounts → `defaultAccountId` = "". When accounts load + localStorage is set, the form's `useState` already initialized.

**Fix**: In HomeContent, only render `<AddTransactionForm>` when `accounts.length > 0`. This ensures the form mounts with actual account data and reads the correct localStorage value.

### 3. Guided Form UX (AddTransactionForm)

#### Step definitions:

| Step | Fields | Auto-advance trigger |
|------|--------|---------------------|
| 0 | Type toggle + Amount | Amount > 0 (debounced 300ms) |
| 1 | Account selector | Tap any account button |
| 2 | Category chips | Tap any category OR tap next section |
| 3 | Date + Note + Company advance + Submit | (final step) |

#### Visual states per section:

- **Future** (step > activeStep): `opacity-[0.35]`, pointer-events still enabled
- **Active** (step === activeStep): full opacity, section label highlighted
- **Completed** (step < activeStep): full opacity, green border (`border-income/40`), green label

#### Behavior:

1. On mount: Amount input auto-focused. Steps 1-3 dimmed.
2. User types amount → after 300ms debounce, step 0 gets green border, step 1 fades in.
3. User taps account → green border on account section, step 2 fades in.
4. User taps category → green border, step 3 (date+note+submit) fades in.
5. User can always tap any section to jump there (sets activeStep).
6. Submit button always visible but disabled until amount > 0 and account selected.

#### Auto-scroll:
When advancing steps, smooth-scroll the newly active section into view.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/BottomNavBar.tsx` | Replace curved notch + FAB with flat 5-icon row |
| `src/components/home/HomeContent.tsx` | Gate form render on `accounts.length > 0` |
| `src/components/ui/AddTransactionSheet.tsx` | Add step tracking, section wrappers, green borders, opacity transitions |

## Verification
1. `npx tsc --noEmit` clean
2. Mobile: + button inline in navbar, no overlap
3. Mobile: form opens with SinoPac Card pre-selected
4. Form: amount focused on load, other fields dimmed
5. Form: filling amount → account highlights → category highlights → note highlights
6. Form: completed fields have green border
