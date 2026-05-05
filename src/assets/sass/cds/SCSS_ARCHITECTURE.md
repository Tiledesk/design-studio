# SCSS Architecture - Design System V3

## Overview

The SCSS system is centralized to avoid code duplication and ensure consistency across all action components. All components should use the **mixins** and **utility classes** provided instead of writing custom styles.

---

## File Structure

```
src/assets/sass/cds/
├── _variables.scss          # DS tokens (colors, spacing, typography)
├── _mixins.scss             # Reusable SCSS mixins (NEW)
├── action-styles.scss       # Shared action component styles (UPDATED)
├── connector-styles.scss    # Connector-specific styles
├── styles.scss              # Global styles
└── SCSS_ARCHITECTURE.md     # This file
```

---

## Using Centralized Styles

### Option 1: Extend Utility Classes (Recommended)

For simple components, extend the ready-to-use classes from `action-styles.scss`:

```scss
@import "./src/assets/sass/cds/_variables.scss";
@import "./src/assets/sass/cds/_mixins.scss";

// Panel containers
.toolbar { @extend .ds-panel-toolbar; }
.content { @extend .ds-panel-content; }
.footer { @extend .ds-panel-footer; }

// Response layout
.response { @extend .ds-response-grid; }
.response-drop { @extend .ds-response-drop; }

// Empty state
.empty { @extend .ds-empty-state; }
.empty-text { @extend .ds-empty-state-text; }

// Drag & drop
.preview { @extend .ds-drag-preview; }
.placeholder { @extend .ds-drag-placeholder; }
```

### Option 2: Use Mixins for Custom Layouts

For more control, use mixins directly:

```scss
@import "./src/assets/sass/cds/_mixins.scss";

.my-toolbar {
  @include panel-toolbar($padding: 12px 16px, $bg-color: var(--ds-surface));
}

.my-layout {
  @include flex-column($gap: 16px, $align: flex-start);
}

.my-button {
  @include pill-button($height: 40px, $bg: var(--ds-ink));
}
```

---

## Available Mixins

### Layout Mixins

#### `flex-row($gap, $align, $justify)`
Create a flex row container with gap.
```scss
@include flex-row(10px, center, space-between);
// Output: display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 10px;
```

#### `flex-column($gap, $align, $justify)`
Create a flex column container with gap.
```scss
@include flex-column(8px);
```

#### `response-grid($icon-width, $gap)`
Grid layout for icon + content pattern (used in replies).
```scss
@include response-grid(32px, 8px);
// Output: display: grid; grid-template-columns: 32px 1fr; gap: 8px;
```

### Panel Styling

#### `panel-toolbar($padding, $border-color, $bg-color)`
Toolbar/header pattern.
```scss
.toolbar {
  @include panel-toolbar();
  // Or customize:
  @include panel-toolbar($padding: 14px 18px);
}
```

#### `panel-content($padding, $gap)`
Main content area pattern.
```scss
.content {
  @include panel-content($padding: 20px, $gap: 16px);
}
```

#### `panel-footer($padding, $border-color, $bg-color)`
Footer pattern.
```scss
.footer {
  @include panel-footer();
}
```

### Button & Control Mixins

#### `pill-button($height, $padding, $bg, $color)`
Rounded pill-shaped button.
```scss
.btn {
  @include pill-button();
  // Or customize:
  @include pill-button($height: 40px, $padding: 0 20px);
}
```

#### `chip($bg, $color)`
Badge/chip pattern.
```scss
.tag {
  @include chip();
}
```

#### `control-button($size, $bg, $color, $hover-bg)`
Small circular control button.
```scss
.icon-btn {
  @include control-button(24px);
}
```

### Visual Effects

#### `shadow-drag()`
Drop shadow for dragged elements.
```scss
.dragging {
  @include shadow-drag();
}
```

#### `shadow-subtle()`
Subtle shadow.
```scss
.card {
  @include shadow-subtle();
}
```

#### `focus-ring($color)`
Accessibility focus ring.
```scss
button:focus {
  @include focus-ring();
}
```

### Material Component Overrides

#### `checkbox-override($color, $surface)`
Material checkbox with DS tokens.
```scss
.checkbox-container {
  @include checkbox-override();
  // Or customize colors:
  @include checkbox-override($color: var(--ds-ink), $surface: white);
}
```

### Drag & Drop

#### `cdk-drag-preview()`
CDK dragged element preview.
```scss
.cdk-drag-preview {
  @include cdk-drag-preview();
}
```

#### `cdk-placeholder()`
CDK drag placeholder.
```scss
.cdk-placeholder {
  @include cdk-placeholder();
}
```

### Scrollbar

#### `scrollbar-custom($width, $thumb-color, $hover-color)`
Custom scrollbar for scrollable areas.
```scss
.scrollable-area {
  @include scrollbar-custom();
}
```

---

## Available Utility Classes

Classes in `action-styles.scss` that can be extended:

### Panel Classes
- `.ds-panel-toolbar` - Toolbar with DS styling
- `.ds-panel-content` - Content area with scroll and layout
- `.ds-panel-footer` - Footer panel

### Response Classes
- `.ds-response-grid` - Grid layout for icon + content
- `.ds-response-drop` - Drag handle indicator

### State Classes
- `.ds-empty-state` - Empty state placeholder
- `.ds-empty-state-text` - Empty state text

### Drag & Drop Classes
- `.ds-drag-preview` - Preview during drag
- `.ds-drag-placeholder` - Placeholder during drag
- `.ds-draggable-list` - Container for draggable items
- `.ds-draggable-box` - Individual draggable item

### Utilities
- `.ds-scrollable` - Custom scrollbar styling

---

## Component SCSS Template

Use this template when creating new action components:

```scss
@import "./src/assets/sass/cds/_variables.scss";
@import "./src/assets/sass/cds/_mixins.scss";

:host {
  display: block;
}

// Use extends for common patterns
.toolbar {
  @extend .ds-panel-toolbar;
}

.content {
  @extend .ds-panel-content;
  @extend .ds-scrollable;
}

.footer {
  @extend .ds-panel-footer;
  @include checkbox-override();
}

// Custom styles only if needed
.custom-element {
  color: var(--ds-ink);
  padding: 10px 14px;
  border: 1px solid var(--ds-border);
  border-radius: 10px;
}

// Preview mode variations
.previewMode {
  .custom-element {
    padding: 8px 12px;
  }
}
```

---

## Design System Tokens

Always use DS tokens from `_variables.scss`:

```scss
// Colors
color: var(--ds-ink);                    // Main text
color: var(--ds-ink-2);                  // Secondary text
color: var(--ds-muted);                  // Muted/tertiary text
background: var(--ds-surface);           // White/surface
background: var(--ds-canvas);            // Light background
border-color: var(--ds-border);          // Light border
border-color: var(--ds-border-strong);   // Strong border

// Radius
border-radius: 10px;                     // Standard (use 8-10px)
border-radius: 999px;                    // Pills/rounds

// Spacing
gap: 8px;                                // Standard gap
padding: 10px 14px;                      // Standard padding
```

---

## Migration Guide: Old → New

### Before (Old Pattern)
```scss
.my-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--blu);
  background: var(--ds-canvas);
  width: 100%;
}
```

### After (New Pattern)
```scss
.my-panel {
  @extend .ds-panel-toolbar;
}
// Or with custom padding:
.my-panel {
  @include panel-toolbar($padding: 12px 16px);
}
```

---

## Best Practices

1. **Prefer extends over includes** - Use `@extend .ds-*` for utility classes, use `@include mixin()` only for customization
2. **Use DS tokens** - Never use hardcoded colors; always use `var(--ds-*)` tokens
3. **Minimal custom SCSS** - Component SCSS should be < 50 lines; use centralizedclasses
4. **Responsive design** - Use `@include respond-to('md')` mixin for breakpoints
5. **Document overrides** - If you add custom styles, add a comment explaining why
6. **Avoid ::ng-deep** - Use it only for Material components; prefer scoped styles

---

## Examples

### Example 1: Simple Reply Component
```scss
@import "./src/assets/sass/cds/_mixins.scss";

.toolbar { @extend .ds-panel-toolbar; }
.content { @extend .ds-panel-content; @extend .ds-scrollable; }
.footer { @extend .ds-panel-footer; @include checkbox-override(); }
.response { @extend .ds-response-grid; }
.empty { @extend .ds-empty-state; }
```

### Example 2: Custom Button Group
```scss
@import "./src/assets/sass/cds/_mixins.scss";

.button-group {
  @include flex-row(6px, center, flex-start);
  padding: 10px 14px;
}

.button {
  @include pill-button();
}

.button.small {
  @include pill-button($height: 28px, $padding: 0 12px);
}
```

### Example 3: Form Field
```scss
@import "./src/assets/sass/cds/_mixins.scss";

.field {
  @include border-ds('all', var(--ds-border), 1px);
  border-radius: 10px;
  background: var(--ds-surface);
  position: relative;

  &:focus-within {
    @include focus-ring();
  }

  textarea {
    padding: 12px 14px;
    font-size: 13.5px;
    color: var(--ds-ink);
    border: none;
    background: none;
    width: 100%;

    &::placeholder {
      color: var(--ds-muted);
    }
  }
}
```

---

## Troubleshooting

### Issue: Mixin not found
**Solution**: Make sure to import `_mixins.scss` before using mixins:
```scss
@import "./src/assets/sass/cds/_mixins.scss";
```

### Issue: Styles not applying
**Solution**: Check that:
1. The component import path is correct
2. The class name matches exactly (case-sensitive)
3. No conflicting ::ng-deep overrides

### Issue: Build fails with SCSS error
**Solution**: Verify SCSS syntax:
- Mixins must have `@` prefix: `@include` not `include`
- Variables need `$` or `var()`: `$variable` or `var(--token)`

---

## Contributing New Mixins

To add a new mixin:

1. Add to `_mixins.scss`
2. Document parameters and defaults
3. Add usage example in this file
4. Update `action-styles.scss` if creating new utility classes
5. Test in a component SCSS file
6. Commit with `docs: add <mixin-name> mixin`

---

## References

- Design System Tokens: See `_variables.scss`
- Material Component Styles: [Angular Material](https://material.angular.io/)
- SCSS Best Practices: [SASS Guidelines](https://sass-guidelin.es/)
