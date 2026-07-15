# DESIGN.md

# SuwaLink Design System

## Purpose

This document defines the design principles for SuwaLink.

The primary goal is **consistency**.

Since multiple developers and AI assistants will contribute to this project, every screen should feel like it belongs to the same application without requiring page-by-page specifications.

When making design decisions, always follow this document first. If something is not explicitly covered here, follow the official **Material Design 3 (Material You)** guidelines rather than inventing new patterns.

---

# Design Philosophy

SuwaLink is **not** a hospital management system.

It is a modern healthcare marketplace connecting patients with pharmacies.

The interface should communicate:

- Trust
- Simplicity
- Calmness
- Professionalism
- Cleanliness
- Accessibility

Avoid making the application look overly "medical" or "clinical."

Instead, it should feel approachable and reassuring while maintaining professional credibility.

Think:

> Modern Pharmacy + Digital Marketplace + Material Design 3

Not:

> Hospital Administration Software

---

# Design Principles

Every UI should follow these principles.

## Simple

Interfaces should contain only the information necessary to complete the current task.

Avoid unnecessary decorations.

---

## Familiar

Users should immediately understand how to navigate the application.

Follow Material Design 3 components and interaction patterns whenever possible.

Do not reinvent common UI patterns.

---

## Consistent

Buttons should behave the same everywhere.

Cards should have consistent spacing.

Typography hierarchy should remain identical throughout the application.

Navigation should never change between screens.

---

## Accessible

Every component should have sufficient color contrast.

Touch targets should meet Material Design recommendations.

Typography should remain readable on all devices.

Never rely solely on color to communicate information.

---

## Calm

Healthcare applications should reduce stress.

Avoid aggressive colors.

Avoid excessive animations.

Avoid visual clutter.

Whitespace is a feature.

---

# Design Language

The application follows:

- Material Design 3
- Material You principles
- Rounded components
- Soft shadows
- Large touch targets
- Clean typography
- Comfortable spacing

Every new component should first ask:

> Does Material Design 3 already define this?

If yes,

Use that solution.

---

# Brand Colors

Theme Name

> Olive Garden Feast

This palette provides a natural, healthy, earthy appearance while remaining warm and approachable.

| Name | Color | Usage |
|-------|---------|----------------|
| Olive Leaf | `#606C38` | Primary Brand |
| Black Forest | `#283618` | Primary Dark / Headlines |
| Cornsilk | `#FEFAE0` | Background |
| Sunlit Clay | `#DDA15E` | Secondary / Accent |
| Copperwood | `#BC6C25` | Tertiary / Highlights |

---

# Color Roles

Do **not** assign colors arbitrarily.

Use Material Design 3 color roles.

Suggested mapping:

Primary

```
Olive Leaf
#606C38
```

Primary Container

Use a lighter generated variation of Olive Leaf.

---

Secondary

```
Sunlit Clay
#DDA15E
```

Secondary Container

Use generated tonal variations.

---

Tertiary

```
Copperwood
#BC6C25
```

---

Background

```
Cornsilk
#FEFAE0
```

---

Surface

Pure white or slightly toned Material surface colors.

---

Text Primary

```
Black Forest
#283618
```

---

Error

Use default Material Design 3 error colors.

Do not create custom reds.

---

Success

Use Material green tokens.

Avoid inventing custom success colors.

---

# Material Theme

Always generate complete Material Design 3 color schemes from the brand palette instead of manually assigning colors.

Every implementation should support:

- Light Theme
- Dark Theme

Dark mode should **not** simply invert colors.

Follow Material 3 tonal palettes.

---

# Elevation

Use Material Design elevation.

Avoid heavy shadows.

Prefer:

- Surface hierarchy
- Tonal elevation
- Layered surfaces

Instead of dramatic drop shadows.

---

# Shapes

Follow Material Design 3 shape principles.

Recommended:

Small

8dp

Medium

12dp

Large

16dp

Extra Large

24–28dp

Cards and dialogs should use larger radii than buttons.

Avoid sharp corners.

Avoid pill shapes unless the component specifically requires it.

---

# Typography

Follow Material Design 3 Typography.

Recommended font:

## Primary

Manrope

Reason:

- Modern
- Friendly
- Excellent readability
- Works well in healthcare applications

---

Optional Accent Font

Space Mono

Use sparingly.

Examples:

- Medicine codes
- IDs
- Inventory SKU
- Technical information

Never use Space Mono for paragraphs.

---

Typography hierarchy should follow Material Design 3:

- Display
- Headline
- Title
- Body
- Label

Do not invent custom text styles.

---

# Spacing

Use an **8dp spacing system**.

Examples:

```
4
8
12
16
24
32
40
48
64
```

Avoid arbitrary values.

Padding and margins should always align to the spacing scale.

---

# Icons

Use:

Material Symbols Rounded

Avoid mixing icon libraries.

Icons should communicate actions clearly.

Avoid decorative icons.

---

# Components

Always prefer official Material Design 3 components.

Examples:

- Buttons
- Cards
- Navigation Bar
- Navigation Rail
- Navigation Drawer
- Top App Bar
- FAB
- Bottom Sheets
- Dialogs
- Snackbars
- Chips
- Badges
- Search Bar

Avoid building custom alternatives unless absolutely necessary.

---

# Buttons

Hierarchy:

1. Filled Button
2. Filled Tonal Button
3. Outlined Button
4. Text Button

Do not overuse filled buttons.

Every screen should have one obvious primary action.

---

# Forms

Forms should be clean and comfortable.

Requirements:

- Filled Material Text Fields
- Clear labels
- Helpful validation
- Inline error messages
- Required fields clearly marked

Never rely on placeholders instead of labels.

---

# Cards

Cards should be used for:

- Pharmacies
- Medicines
- Prescription Requests
- Reservation Summaries
- Notifications

Cards should not become miniature pages.

Keep them concise.

---

# Lists

Use lists for:

- Search Results
- Notifications
- Inventory
- Reservations

Each list item should contain:

- Primary information
- Supporting information
- Optional trailing action

Avoid crowded layouts.

---

# Motion

Follow Material Motion.

Animations should be:

- Fast
- Natural
- Purposeful

Avoid:

- Bounce effects
- Long fades
- Flashy transitions

Motion should guide attention, not entertain.

---

# Images

Prescription images should:

- Preserve aspect ratio
- Never crop automatically
- Support pinch zoom
- Display on neutral surfaces

---

# Empty States

Every empty screen should explain:

- Why it is empty
- What the user can do next

Example:

"No medicines found."

Rather than displaying an empty list.

---

# Loading States

Prefer:

- Skeleton loaders
- Circular progress indicators
- Linear progress bars

Avoid blank screens during loading.

---

# Notifications

Notifications should be informative rather than alarming.

Examples:

Good

✔ Pharmacy responded to your prescription.

Bad

🚨 IMPORTANT UPDATE!!!

Healthcare applications should reduce anxiety.

---

# Accessibility

Every feature should support:

- Screen readers
- Dynamic font scaling
- High contrast
- Keyboard navigation (Web)
- Minimum 48dp touch targets

Accessibility is mandatory.

---

# Responsive Design

Layouts should adapt across:

- Mobile
- Tablet
- Desktop

Do not create separate applications.

Responsive layouts should reuse the same design language.

---

# AI Development Rules

When generating UI with AI:

Always prioritize:

1. Material Design 3
2. Consistency
3. Simplicity
4. Accessibility
5. Reusability

Never generate:

- Glassmorphism
- Neumorphism
- Overly colorful dashboards
- Gradient-heavy interfaces
- Excessive shadows
- Unnecessary animations
- iOS-style components
- Bootstrap aesthetics

If uncertain, always ask:

> "How would Google's Material Design 3 solve this?"

---

# Official References

All contributors should treat the following documentation as the source of truth:
- link - https://m3.material.io/
- Material Design 3 Overview
- Material Design Foundations
- Material Design Color System
- Material Design Color Roles
- Material Design Typography
- Material Design Shapes
- Material Design Spacing
- Material Design Motion
- Material Design Accessibility
- Material Design Content Design
- Material Design Customization

Design decisions should follow the official Material Design 3 documentation before introducing custom patterns.

---

# Design Summary

SuwaLink should feel calm, trustworthy, and modern.

Every screen should communicate confidence through simplicity rather than decoration.

The application should embrace Material Design 3 as its foundation, using the Olive Garden Feast palette to establish a recognizable brand while allowing Material's color system, typography, spacing, and components to provide consistency across the entire product.

When in doubt:

> **Choose the Material Design 3 solution over a custom one. Consistency is more valuable than creativity.**

# SKILLS

if available, use the following skills to implement the design:
- impeccable
- emil-design-eng
- frontend-design
- design-taste-frontend
````
