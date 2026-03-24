# OCTOPUS Design Tokens

This file is the single source of truth for OCTOPUS brand colors and usage rules across the platform.

## Brand Palette

- `--octopus-core`: `#4B0082` (deep violet)
- `--octopus-highlight`: `#7B24A6` (lighter violet)
- `--octopus-cap`: `#3C1E55` (graduation cap color)
- `--octopus-gold`: `#BF9B30` (gold tassel accent)
- `--octopus-iris`: `#00BFFF` (blue iris accent)
- `--octopus-detail`: `#2E5175` (eye detail / slate blue)

## Semantic Mapping

Defined in `client/src/index.css` and consumed by Tailwind theme variables:

- `--primary`: main action color
- `--accent`: hover/interactive backgrounds
- `--ring`: focus state color
- `--border` and `--input`: structural outlines
- `--chart-*`: data visualization colors

## UI Rules

- Primary CTA: use `bg-primary text-primary-foreground`
- Interactive focus: keep `ring` on `--octopus-iris`
- Dark surfaces: use semantic `card`, `popover`, and `muted`
- Avoid hardcoded hex values in components when semantic tokens already exist

## Accessibility Notes

- Keep text/background contrast high on all gradients
- For links or status indicators on dark backgrounds, prefer `--octopus-iris`
- Gold (`--octopus-gold`) should be used as accent, not as body text color

## Component Guidance

- Header/brand title can use a gradient from iris -> highlight -> gold
- Navigation hover state should use semantic accent background
- Chat bubbles should remain high contrast, with user and assistant clearly separated

## Maintenance

When adding new pages or components:

1. Reuse semantic tokens first (`bg-card`, `text-foreground`, `border-border`)
2. Use brand tokens only for branded highlights
3. If a new recurring color role appears, add a semantic token in `client/src/index.css`
