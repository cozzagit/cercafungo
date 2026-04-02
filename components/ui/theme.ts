/**
 * CercaFungo Design System
 *
 * Palette ispirata al sottobosco della Valtellina:
 * verdi profondi, marroni caldi, ambra dei porcini, crema naturale.
 */

export const colors = {
  // === Primari ===
  forest: '#2D5016',
  forestLight: '#3A6A1E',
  forestDark: '#1E3A0E',

  // === Secondari ===
  moss: '#4A7C2E',
  mossLight: '#5E9A3A',
  mossMuted: '#6B8F5A',

  // === Accento ===
  porcino: '#C68B3E',
  porcinoLight: '#D9A85C',
  porcinoDark: '#A87230',

  // === Neutri caldi ===
  bark: '#5C3D2E',
  barkLight: '#7A5A48',
  soil: '#3E2B1C',
  soilLight: '#5A4232',

  // === Sfondi ===
  cream: '#F5F0E8',
  creamDark: '#E8E0D2',
  parchment: '#FBF8F3',
  white: '#FFFFFF',

  // === Semantici ===
  safe: '#27AE60',
  safeLight: '#E8F8EF',
  safeBg: '#D5F5E3',

  warning: '#E67E22',
  warningLight: '#FEF3E2',
  warningBg: '#FDEBD0',

  danger: '#C0392B',
  dangerLight: '#FDEDEC',
  dangerBg: '#FADBD8',

  // === Confidenza rilevamento ===
  confidence: {
    high: '#27AE60',
    highBg: '#D5F5E3',
    medium: '#F39C12',
    mediumBg: '#FEF9E7',
    low: '#E74C3C',
    lowBg: '#FDEDEC',
  },

  // === Overlay ===
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.25)',
  overlayDark: 'rgba(0, 0, 0, 0.75)',
  scannerOverlay: 'rgba(45, 80, 22, 0.15)',

  // === Testo ===
  text: {
    primary: '#2C2118',
    secondary: '#6B5D52',
    tertiary: '#9B8E83',
    inverse: '#FFFFFF',
    accent: '#C68B3E',
    link: '#2D5016',
  },

  // === Bordi ===
  border: {
    light: '#E8E0D2',
    medium: '#D4C9BB',
    dark: '#A99888',
  },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const typography = {
  // Font families — uses system fonts, can be swapped for custom
  fontFamily: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  // Preset text styles
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: colors.text.primary,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    color: colors.text.primary,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
    color: colors.text.primary,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: colors.text.secondary,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
    color: colors.text.tertiary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: colors.text.tertiary,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
  },
  glow: {
    shadowColor: colors.porcino,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

export const hitSlop = {
  top: 12,
  bottom: 12,
  left: 12,
  right: 12,
} as const;

export type ThemeColors = typeof colors;
export type ThemeSpacing = typeof spacing;
