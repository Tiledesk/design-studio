# Reply Inspector Layout Specification

**Source**: `.docs/design-studio-2/project/Reply Inspector.html`  
**Target**: `cds-action-reply-v1-new` component  
**Design System**: DS V3 (Design Studio 2025)

---

## Color Palette (Updated Tokens)

All colors use CSS custom properties from `_variables.scss`:

```scss
--ds-bg:            #fbfbfa;        // Background
--ds-surface:       #ffffff;        // Surface/white
--ds-canvas:        #f7f6f3;        // Light background
--ds-ink:           #14140e;        // Main text (dark)
--ds-ink-2:         #3a3935;        // Secondary text
--ds-muted:         #8a8884;        // Muted text
--ds-muted-2:       #b3b1ac;        // More muted text
--ds-border:        #e8e6e0;        // Light border
--ds-border-strong: #d8d6d0;        // Strong border
--ds-red:           oklch(0.55 0.2 25);      // Trash hover
--ds-red-soft:      oklch(0.98 0.02 25);     // Trash bg
--ds-green:         oklch(0.68 0.14 155);    // Toggle on
--ds-shadow-card:   0 1px 2px rgba(20,20,18,0.04);
--ds-focus-ring:    oklch(0.85 0.05 240 / 0.55);
```

---

## Typography

```scss
Font family:  'Geist', system-ui, sans-serif
Mono font:    'Geist Mono', monospace

Weights:
  - Normal:   400
  - Medium:   500
  - Semibold: 600
  - Bold:     700

Sizes:
  - Body:      14px, line-height 1.5
  - Title:     15px, weight 600, letter-spacing -0.01em
  - Block title: 18px, weight 600, letter-spacing -0.015em
  - Label:     13.5px, weight 400
  - Meta:      13px, weight 400
  - Small:     12.5px, weight 500 (chip)
  - Mono:      11px, weight 500 (char count)
```

---

## Spacing & Radius

```scss
--ds-radius:        10px;    // Standard (fields, chips)
--ds-radius-sm:     6px;     // Small (tool buttons)
--ds-radius-lg:     14px;    // Large (panel border)

Padding:
  - Toolbar:  10px 14px
  - Body:     18px 14px 20px
  - Footer:   14px 18px
  - Field:    12px 150px 12px 14px (textarea)

Gap/Gap:
  - Toolbar:   4px (between tool buttons)
  - Body:      28px (between messages)
  - Message:   8px (icon + content)
  - Chip row:  6px (between chips)
  - Buttons:   8px (between reply buttons)
```

---

## Layout Structure

### Page Hierarchy

```
.inspector (max-width: 680px, surface, border: 1px, shadow-card, border-radius-lg)
├── .insp-head (toolbar header with collapse/info)
├── .insp-toolbar (content type buttons: Text, Form, Image, Video, Docs, Send, Audio)
├── .insp-body (scrollable content area)
│   └── .msg (message block) — repeated
│       ├── .move-stack (5 move buttons vertically stacked)
│       └── .msg-content
│           ├── .chip-row (delay + filter/add-button)
│           ├── .field (textarea with lang-tag)
│           ├── .reply-buttons (action buttons + add-button)
│           └── .row-end (JSON buttons, etc.)
└── .insp-foot (disable-user-input switch)
```

---

## Component Details

### 1. Header (.insp-head)

```
Layout:  flex, row, center, gap 10px
Padding: 14px 18px
Border:  bottom 1px solid var(--ds-border)

Elements:
├── .insp-icon (26x26px, border-radius 7px, canvas bg, center icon)
├── .insp-title (flex: 1, 15px, weight 600, letter-spacing -0.01em)
└── .icon-btn (30x30px, border-radius 7px, transparent, hover: canvas bg)
```

### 2. Toolbar (.insp-toolbar)

```
Layout:  flex, row, center, gap 4px
Padding: 10px 14px
Border:  bottom 1px solid var(--ds-border)
Background: var(--ds-surface)
Overflow: scroll-x

Tool buttons (.tool-btn):
├── 32x32px
├── border-radius 6px
├── border: transparent (hover: canvas bg, color ink)
├── active state: canvas bg + ink color
└── .tool-divider: 1px solid border, height 18px, margin 0 4px
```

### 3. Body (.insp-body)

```
Layout:  flex column, gap 28px
Padding: 18px 14px 20px
Background: var(--ds-surface)
Overflow: auto

Message block (.msg):
├── Layout: grid, columns [32px 1fr], gap 8px, align-items start
├── .move-stack
│   ├── Layout: flex column, gap 2px, margin-top 4px
│   └── Buttons (5x): 24x22px each
│       ├── .trash-btn (top, delete icon, color: muted-2, hover: ink + canvas bg)
│       ├── .move-top (color: muted-2)
│       ├── .move-up (color: muted-2)
│       ├── .move-down (color: muted-2)
│       └── .move-bottom (color: muted-2)
│       └── All hover: ink + canvas bg, border
│       └── .trash-btn hover: red + red-soft bg
└── .msg-content
    ├── Layout: flex column, gap 22px, min-width 0
    ├── .chip-row (flex row, gap 6px, wrap)
    │   ├── .chip.delay (height 28px, padding 0 10px, border-radius 999px)
    │   └── .chip.chip-add (dashed border, muted text)
    ├── .field (textarea with icons)
    │   ├── border: 1px solid border
    │   ├── border-radius: 10px
    │   ├── background: surface
    │   ├── :focus-within: box-shadow focus-ring
    │   ├── textarea: min-height 60px, resize vertical
    │   ├── padding: 12px 150px 12px 14px
    │   ├── .lang-tag (24x24px, absolute top -10px right 14px)
    │   └── .field-actions (absolute right 10px bottom -15px)
    │       ├── .field-icon (26x26px, border-radius 50%)
    │       └── .char-count (26px height, padding 0 10px, mono font 11px)
    ├── .reply-buttons (flex row, gap 8px, wrap)
    │   ├── .reply-btn (32px height, padding 0 16px, border-radius 999px)
    │   │   ├── border: 1px solid border
    │   │   ├── background: surface
    │   │   ├── color: ink
    │   │   ├── 13px, weight 500
    │   │   ├── hover: border-strong + canvas bg
    │   │   ├── .btn-action (20x20px, circular)
    │   │   │   ├── .action-trash (left -8px, hover: red + red-soft)
    │   │   │   └── .action-right (right -8px, hover: ink + canvas)
    │   │   └── dragging state: ink bg + surface text
    │   └── .chip.chip-add (add button)
    └── .row-end (flex, space-between) for JSON buttons
```

### 4. Footer (.insp-foot)

```
Layout:  flex row, center, gap 10px
Padding: 14px 18px
Border:  top 1px solid border
Background: var(--ds-surface)

.switch (32x18px, border-radius 999px):
├── background: border (off), green (on)
├── ::after: 14x14px, border-radius 50%, surface color
├── Transition: left 0.18s (off: 2px, on: 16px)

.foot-label (13.5px, color ink-2)
```

---

## Transitions & Interactions

```scss
// Standard transition
transition: background 0.12s, border-color 0.12s, color 0.12s;

// Button-specific
transition: background 0.12s, border-color 0.12s, color 0.12s;

// Move buttons
transition: color 0.12s, background 0.12s, border-color 0.12s;

// Settings chevron
transition: transform 0.2s;

// Switch toggle
transition: background 0.18s;

// Hover effects
button:hover { background: var(--ds-canvas); color: var(--ds-ink); }
.trash-btn:hover { color: var(--ds-red); background: var(--ds-red-soft); }
```

---

## Icon Specifications

All icons use inline SVG with:
```scss
.i {
  width: 14px; height: 14px;
  stroke: currentColor;
  stroke-width: 1.6;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}
.i-md { width: 16px; height: 16px; }
.i-lg { width: 18px; height: 18px; }
```

Icons needed:
- Collapse (panels icon)
- Clock (delay)
- Filter (filter)
- X (delete/trash - 24x24)
- Arrow up (move up)
- Arrow down (move down)
- Text (toolbar)
- Form (toolbar)
- Image (toolbar)
- Video (toolbar)
- Document (toolbar)
- Send (toolbar)
- Audio (toolbar)
- Plus (add button)
- Chevron (settings toggle)
- Info (info icon)

---

## Implementation Order

1. **Update SCSS variables** ✅
2. **Add DS utility classes** → action-styles.scss
3. **Update component HTML** → Add header, toolbar, move-stack, settings
4. **Update component SCSS** → Use DS tokens and classes
5. **Add sub-components** → reply-text, reply-button, reply-image
6. **Test layout** → Verify all measurements, colors, spacing
7. **Accessibility** → Focus rings, keyboard nav, ARIA labels

---

## Verification Checklist

- [ ] Colors match hex exactly
- [ ] Font family and weights correct
- [ ] All padding/gaps/margins match spec
- [ ] Border radius correct (10px standard, 6px small, 14px large)
- [ ] Icons render properly (SVG stroke-width 1.6)
- [ ] Transitions smooth (0.12s standard, 0.2s for transform)
- [ ] Hover states match spec
- [ ] Focus ring visible on focus (0 0 0 3px focus-ring)
- [ ] Drag states working (preview shadow, icon changes)
- [ ] Settings collapsible working
- [ ] Footer switch toggle working
- [ ] Responsive scaling (max-width 680px)

---

## Reference Files

- Design mockup: `.docs/design-studio-2/project/Reply Inspector.html`
- DS tokens: `src/assets/sass/cds/_variables.scss`
- Action styles: `src/assets/sass/cds/action-styles.scss`
- Mixins: `src/assets/sass/cds/_mixins.scss`
- SCSS Architecture: `src/assets/sass/cds/SCSS_ARCHITECTURE.md`
