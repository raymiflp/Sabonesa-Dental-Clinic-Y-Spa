# Responsive Design Specification

## Purpose

Make all existing and new pages fully usable on mobile (360px) and tablet (768px) viewports without horizontal overflow, using shadcn Sheet for the mobile sidebar and responsive layout patterns.

## Requirements

### Requirement: shadcn Sheet Component

The system MUST install the shadcn Sheet component via `npx shadcn add sheet`. The Sheet acts as the mobile sidebar container.

#### Scenario: Component Installed

- GIVEN shadcn/ui is configured
- WHEN `npx shadcn add sheet` runs
- THEN `frontend/src/components/ui/sheet.jsx` exists

### Requirement: Mobile Sidebar via Sheet

The Layout MUST replace the manual `translate-x` sidebar toggle with shadcn `<Sheet>` on mobile. Sheet opens from the left (`side="left"`), contains the same navigation items, and closes on navigation click. On desktop (lg breakpoint), the sidebar MUST remain static/inline as before.

| Scenario | GIVEN | WHEN | THEN |
|----------|-------|------|------|
| Open Sheet | Mobile viewport (<1024px) | User taps hamburger menu | Sheet slides in from left with nav items |
| Close on nav | Sheet is open | User clicks a nav link | Sheet closes and navigates |
| Desktop unchanged | Desktop viewport | Page renders | Static sidebar visible, Sheet not used |

### Requirement: Table Horizontal Scroll

Every data table (`<Table>` from shadcn) MUST be wrapped in a container with `overflow-x-auto` to prevent horizontal page overflow on small screens.

#### Scenario: Table Overflow Container

- GIVEN a PatientList or Agenda page on a 360px viewport
- WHEN the table has many columns
- THEN the table container scrolls horizontally without causing page overflow

### Requirement: Dashboard Stats Grid

The dashboard stats grid using `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` MUST remain unchanged — already responsive.

#### Scenario: Desktop Grid

- GIVEN a 1440px viewport
- WHEN Dashboard renders
- THEN 4 stat cards display in a single row

#### Scenario: Tablet Grid

- GIVEN a 768px viewport
- WHEN Dashboard renders
- THEN 2 stat cards display per row

### Requirement: Agenda Mobile Calendar

The Agenda calendar grid (7-column layout) SHOULD show smaller cells on small screens without breaking the layout. Cells MUST be touch-friendly (minimum 32x32px tap target).

#### Scenario: Mobile Cells

- GIVEN a 360px viewport
- WHEN the Agenda monthly calendar renders
- THEN day numbers are visible, cells are scrollable if needed, and taps register correctly

### Requirement: Global Padding Audit

The main content area MUST use `p-4 sm:p-6` globally (replace current `p-6`) to reduce padding on mobile while maintaining desktop spacing.

| Affected File | Current | Changed To |
|---------------|---------|------------|
| Layout.jsx `<main>` | `p-6` | `p-4 sm:p-6` |
| All page-level `<div className="space-y-6">` containers | — | No change (outer padding handled by Layout) |

#### Scenario: Mobile Padding

- GIVEN a 360px viewport
- WHEN any page renders
- THEN the main content has `p-4` (16px) padding on all sides

#### Scenario: Desktop Padding

- GIVEN a 1440px viewport
- WHEN any page renders
- THEN the main content has `p-6` (24px) padding

### Requirement: Dialogs on Mobile

Every `<DialogContent>` MUST display correctly on mobile viewports. The existing `max-w-[calc(100%-2rem)]` SHOULD be verified on all dialogs. Content inside dialogs SHOULD scroll if it exceeds viewport height.

#### Scenario: Dialog Fit

- GIVEN a 360px viewport
- WHEN a Dialog opens (e.g., Nueva Cita)
- THEN the dialog is fully visible and scrollable without horizontal overflow

### Requirement: Odontograma Touch Events

The Odontograma component's existing touch event handling MUST NOT regress. All tap, swipe, and long-press interactions MUST work on mobile browsers.

#### Scenario: Touch Interaction

- GIVEN a mobile device with touch
- WHEN the user taps a tooth on the Odontograma
- THEN the tooth selection toggles correctly

### Requirement: PagoRapido FAB

The floating action button for PagoRápido (`bottom-6 right-6`, `w-14 h-14`) MUST be verified on mobile. Size and position MAY be adjusted to avoid overlap with content.

#### Scenario: FAB on Mobile

- GIVEN a 360px viewport
- WHEN the PagoRápido button renders
- THEN it is fully visible and does not overlap with sidebar or bottom navigation

### Requirement: Viewport Testing

The responsive implementation SHOULD be manually verified on 360px, 768px, 1024px, and 1440px viewports. Each viewport MUST render without horizontal scrollbars or broken layouts.

#### Scenario: Test Cases

| Viewport | Device Target | Key Checks |
|----------|---------------|------------|
| 360px | Mobile phone | Sheet sidebar, table scroll, dialog fit, padding |
| 768px | Tablet portrait | Grid layout, sidebar behavior |
| 1024px | Tablet landscape | Sidebar transition point |
| 1440px | Desktop | Full layout, static sidebar |
