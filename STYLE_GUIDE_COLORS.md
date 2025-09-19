# Color System Style Guide

This document outlines the color system used in this project, which is based on a semantic token
architecture. Adhering to these guidelines ensures visual consistency, maintainability, and
accessibility across the application.

## 1. Semantic Color Tokens

All colors are defined as CSS variables in `src/index.css` and exposed through Tailwind CSS utility
classes. Avoid using hard-coded hex values or raw `rgb()`/`hsl()` colors directly in components.
Instead, use the semantic tokens defined below.

### Core Palette

- `primary`: The main brand color, used for primary actions, and highlights.
- `secondary`: Used for secondary actions and less prominent elements.
- `accent`: Used for highlighting and emphasizing elements.
- `destructive`: Used for destructive actions, errors, and critical alerts.
- `muted`: Used for muted text and backgrounds.
- `foreground`: The default text color.
- `background`: The default background color.
- `border`: The default border color.
- `ring`: The default ring color for focus indicators.
- `card`: The default card background color.
- `popover`: The default popover background color.

### Feedback Colors

- `success`: Used for success states and positive feedback.
- `warning`: Used for warnings and potential issues.
- `info`: Used for informational messages and highlights.

## 2. Usage in Components

When styling components, use the Tailwind CSS utility classes that correspond to the semantic
tokens. For example, to set the text color to the primary brand color, use `text-primary`.

### Soft Backgrounds

For badges, pills, and other elements that require a softer background color, use the `bg-*-soft`
classes. For example, `bg-success-soft` will apply a soft green background color.

## 3. Usage in Charts

ECharts and other charting libraries require final color strings, not CSS variables. To ensure
consistency with the design system, use the `chartColor` helper function located in
`src/lib/chartColor.ts`.

This helper function reads the HSL values from the CSS variables and converts them to RGBA strings
that can be used by the charting libraries. It also supports alpha transparency.

**Example:**

```typescript
import { chartColor } from '@/lib/chartColor';

const chartOptions = {
  color: [
    chartColor('--primary'),
    chartColor('--accent', 0.9),
    chartColor('--success'),
    chartColor('--destructive'),
    chartColor('--info'),
  ],
  // ...
};
```

**Important:**

- **Do not use raw hex/hsl strings in ECharts configs.** Always use the `chartColor` helper to
  ensure that the chart colors are consistent with the design system.
- **Provide SSR-safe fallbacks.** The `chartColor` helper requires a fallback HSL value to be
  provided in case the CSS variable is not available on the server. This is important for ensuring
  that the charts render correctly on the server.

By following these guidelines, we can ensure that the color system remains consistent, maintainable,
and accessible across the entire application.
