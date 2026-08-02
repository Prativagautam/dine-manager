// src/shared/theme.ts
//
// Mantine theme config generated from DESIGN.md — the BistroPro RMS
// "Heritage Theme" tokens extracted from the 6 Stitch screens.
//
// This is the single place brand colors, typography, and radius live.
// Components should reference these via Mantine's theme system
// (e.g. `c="brand.6"`, `radius="md"`) rather than hardcoding hex values.

import { createTheme, MantineColorsTuple } from '@mantine/core';

// Mantine color "tuples" need 10 shades (0 = lightest, 9 = darkest),
// even though Stitch only gave us a handful of red variants. Shade 6 is
// mapped to our confirmed canonical primary (#b81c30) since that's
// Mantine's default "main" shade index for a color.
const brandRed: MantineColorsTuple = [
  '#ffdad8', // 0 - primary-fixed
  '#ffcbc9', // 1 - on-primary-container
  '#ffb3b1', // 2 - primary-fixed-dim / inverse-primary
  '#f28b89', // 3 - interpolated
  '#d94f52', // 4 - interpolated
  '#c22e38', // 5 - interpolated, just above canonical
  '#b81c30', // 6 - CANONICAL PRIMARY (confirmed from Order Management screen)
  '#b71b2f', // 7 - primary-container (near-identical to 6, matches Stitch)
  '#92001e', // 8 - on-primary-fixed-variant
  '#410008', // 9 - on-primary-fixed (darkest)
];

// Semantic status colors — deliberately separate from brandRed.
// See DESIGN.md Section 2.6: statuses use raw Tailwind-style hues across
// all 6 screens, not brand-derived shades, and that's preserved here.
const statusAvailable: MantineColorsTuple = [
  '#f0fdf4', '#dcfce7', '#bbf7d0', '#86efac', '#4ade80',
  '#22c55e', '#16a34a', '#15803d', '#166534', '#14532d',
];
const statusOccupied: MantineColorsTuple = [
  '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa',
  '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a',
];
const statusReserved: MantineColorsTuple = [
  '#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24',
  '#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f',
];
const statusAttention: MantineColorsTuple = [
  '#ffdad6', '#ffc2bc', '#ffa39a', '#ff8177', '#f4645a',
  '#ba1a1a', '#93000a', '#7a0008', '#5c0006', '#3d0004',
];

export const theme = createTheme({
  colors: {
    brand: brandRed,
    available: statusAvailable,
    occupied: statusOccupied,
    reserved: statusReserved,
    attention: statusAttention,
  },
  primaryColor: 'brand',
  primaryShade: 6, // maps to #b81c30

  fontFamily: '"Source Sans 3", sans-serif',
  fontFamilyMonospace: 'monospace',
  headings: {
    // Source Serif 4 for headlines — this is what gives the "upscale
    // restaurant" feel vs. a generic sans-everywhere admin panel.
    // Do not change this to match fontFamily above.
    fontFamily: '"Source Serif 4", serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '48px', lineHeight: '56px', fontWeight: '700' }, // headline-xl
      h2: { fontSize: '32px', lineHeight: '40px', fontWeight: '600' }, // headline-lg
      h3: { fontSize: '24px', lineHeight: '32px', fontWeight: '600' }, // headline-md
    },
  },

  // Deliberately restrained radius scale — part of the "architectural,"
  // not "bubbly," aesthetic. Note "full" is NOT a true pill radius here.
  radius: {
    xs: '2px',  // DEFAULT in Stitch's config
    sm: '2px',
    md: '4px',  // lg in Stitch's config
    lg: '8px',  // xl in Stitch's config
    xl: '12px', // full in Stitch's config
  },
  defaultRadius: 'md',

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '40px',
  },

  other: {
    // Non-Mantine-native tokens, available via `theme.other.*` in
    // components (e.g. useMantineTheme().other.background).
    background: '#fff8f4',
    surface: '#fff8f4',
    surfaceDim: '#e0d9d3',       // sidebar background
    surfaceContainerLowest: '#ffffff', // card background
    surfaceContainerLow: '#faf2ec',    // table header background
    onSurface: '#1e1b18',        // primary text
    onSurfaceVariant: '#5a403f', // muted text (warm, not gray)
    outlineVariant: '#e3bebc',   // card borders, dividers, grid lines
    error: '#ba1a1a',
    errorContainer: '#ffdad6',
    sidebarWidth: '280px',
    maxContentWidth: '1200px',
  },
});