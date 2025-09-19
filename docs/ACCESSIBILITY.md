# Accessibility Guidelines

This document outlines the accessibility guarantees and developer guidance for maintaining and
improving accessibility in the application.

## Core Accessibility Features

### Global Skip Link

The application provides a global "Skip to main content" link that:

- Appears as the first focusable element when users press Tab
- Respects `prefers-reduced-motion` for smooth scrolling behavior
- Moves focus directly to the main content area when activated
- Is fully internationalized (English and Norwegian)

**Implementation Details:**

- The skip link is rendered by `AccessibilityWrapper` at the app root
- Focus management includes both focus shifting and scrolling to content
- The link is visually hidden by default but becomes visible on focus

### Live Region for Announcements

A global ARIA live region is available for screen reader announcements:

- Located at `#accessibility-announcements`
- Configured with `aria-live="polite"` for non-intrusive updates
- Available on all pages through `AccessibilityWrapper`

### Landmark Structure

The application maintains a consistent landmark structure:

- **Exactly one `<main>` element** per page (provided by `AccessibilityWrapper`)
- Main element has `id="main-content"` for skip link targeting
- Additional sections use semantic elements (`<section>`, `<article>`, `<aside>`)
- Never add a second `<main>` element in page components

## Heading Hierarchy

### Requirements

- **One H1 per page**: Each route must have exactly one `<h1>` element
- **Sequential levels**: Use h2 for major sections, h3 for subsections
- **No level skipping**: Don't jump from h1 to h3 (must have h2 in between)
- **Internationalized text**: All headings must use i18n keys, not hardcoded strings

### Examples

```tsx
// Good - proper heading hierarchy
<h1>{tDashboard('title')}</h1>
  <h2>{tDashboard('statistics.title')}</h2>
    <h3>{tDashboard('statistics.weekly')}</h3>
    <h3>{tDashboard('statistics.monthly')}</h3>
  <h2>{tDashboard('students.title')}</h2>

// Bad - skipped heading level
<h1>Dashboard</h1>
  <h3>Statistics</h3>  // ❌ Skipped h2
```

## Writing Accessible Components

### New Pages Checklist

When creating a new page component:

1. ✅ Include exactly one `<h1>` element
2. ✅ Use i18n for all user-facing text
3. ✅ Don't add a `<main>` element (already provided globally)
4. ✅ Use semantic HTML elements
5. ✅ Maintain proper heading hierarchy
6. ✅ Ensure interactive elements are keyboard accessible
7. ✅ Provide appropriate ARIA labels where needed

### Focus Management

- **Never remove focus outlines** without providing an alternative visual indicator
- Use `tabIndex={-1}` only for programmatic focus targets
- Ensure all interactive elements are reachable via keyboard

## Testing Accessibility

### Running A11y Tests

```bash
# Run all accessibility smoke tests
npm run e2e:a11y

# Run all e2e tests (includes a11y)
npm run e2e

# Interactive UI mode for debugging
npm run e2e:ui
```

### Test Coverage

The accessibility tests check for:

- WCAG 2.0 Level A and AA violations
- Proper landmark structure (single main element)
- Presence of h1 on each page
- Skip link functionality
- Live region availability

### Local Development Testing

Before committing:

1. Run `npm run e2e:a11y` to catch accessibility issues
2. Test keyboard navigation manually
3. Use browser DevTools accessibility inspector
4. Consider testing with a screen reader

## Common Pitfalls to Avoid

### ❌ DON'T

- Create duplicate `<main>` elements
- Skip heading levels (h1 → h3)
- Remove focus outlines with CSS
- Use `div` or `span` for interactive elements
- Hardcode text strings (use i18n)
- Rely solely on color to convey meaning

### ✅ DO

- Use semantic HTML elements
- Maintain sequential heading hierarchy
- Provide text alternatives for images
- Ensure sufficient color contrast
- Test with keyboard navigation
- Include ARIA labels for icon-only buttons

## Overlay layering policy (z-index)

To prevent tooltips/popovers/hover cards from being clipped by tabs or headers, use shared overlay
tokens rather than magic numbers. These classes are defined in `src/index.css` under
`@layer utilities`:

```
// Tokens
.z-overlay          // 70: standard overlays (tooltip, popover, hover-card)
.z-overlay-elevated // 80: larger overlays that must float above other overlays (e.g., long explanations)
```

Current layering scale for reference:

- Tabs and sticky headers: z-10
- Sidebar: z-[60]
- Standard overlays (Tooltip/Popover/HoverCard default): z-[70] / `.z-overlay`
- Elevated overlays (pattern explanations): z-[80] / `.z-overlay-elevated`
- Toasts: z-[100]
- Developer emergency banner: z-[1000]

Guidelines:

- Prefer the primitive defaults (no extra class) unless the overlay must sit above other overlays.
- Do not introduce new raw z-index numbers in feature code. Use the tokens above.
- If you add an `overflow: hidden` container near overlay triggers, verify that overlays still
  render correctly; consider portaling content to body if needed.

## ARIA Best Practices

### When to Use ARIA

- Use native HTML elements first (they have built-in accessibility)
- Add ARIA only when HTML semantics are insufficient
- Common ARIA attributes:
  - `aria-label`: Provides accessible name
  - `aria-describedby`: Links to description
  - `aria-expanded`: Indicates expanded/collapsed state
  - `role`: Defines element's purpose (use sparingly)

### Live Regions

Use the global live region for important status updates:

```tsx
// Announce to screen readers
const announceElement = document.getElementById('accessibility-announcements');
if (announceElement) {
  announceElement.textContent = 'Data saved successfully';
}
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [axe DevTools Extension](https://www.deque.com/axe/devtools/)
- [NVDA Screen Reader](https://www.nvaccess.org/) (Windows)
- [VoiceOver](https://support.apple.com/guide/voiceover/welcome/mac) (macOS/iOS)

## Contributing

When submitting PRs:

1. Run accessibility tests: `npm run e2e:a11y`
2. Test keyboard navigation for new features
3. Verify heading hierarchy on new pages
4. Add i18n keys for all new user-facing text
5. Document any accessibility-related decisions

## Questions?

If you're unsure about accessibility implementation:

1. Check this guide first
2. Run the a11y tests locally
3. Ask for review from team members
4. Consider user testing with assistive technology users
