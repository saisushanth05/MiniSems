// Mini Sems — Typography System
// Inter font family — EdTech premium quality

import {Platform} from 'react-native';

// Inter is loaded via react-native-vector-icons or bundled
// For production: add Inter font files to android/app/src/main/assets/fonts/
export const FontFamily = {
  thin: 'Inter-Thin',
  extraLight: 'Inter-ExtraLight',
  light: 'Inter-Light',
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extraBold: 'Inter-ExtraBold',
  black: 'Inter-Black',
  // Fallbacks for devices without Inter installed
  system: Platform.select({ios: 'System', android: 'Roboto'}) || 'System',
  mono: Platform.select({ios: 'Courier New', android: 'monospace'}) || 'monospace',
} as const;

export const FontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,      // Minimum body size per design spec
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
  '6xl': 48,
  // Special
  timerSmall: 24,
  timerLarge: 32,
  examQuestion: 18,
} as const;

export const LineHeight = {
  none: 1.0,
  tight: 1.2,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2.0,
} as const;

export const FontWeight = {
  thin: '100' as const,
  extraLight: '200' as const,
  light: '300' as const,
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
  black: '900' as const,
} as const;

export const LetterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
} as const;

// Pre-composed text style presets
export const TextStyles = {
  // === HEADINGS ===
  h1: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['4xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  },
  h2: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['3xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  },
  h3: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['2xl'] * LineHeight.snug,
  },
  h4: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semiBold,
    lineHeight: FontSize.xl * LineHeight.snug,
  },
  h5: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    lineHeight: FontSize.lg * LineHeight.normal,
  },
  h6: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    lineHeight: FontSize.md * LineHeight.normal,
  },

  // === BODY ===
  bodyLarge: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.lg * LineHeight.relaxed,
  },
  body: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.md * LineHeight.relaxed,
  },
  bodySmall: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.base * LineHeight.relaxed,
  },
  bodyXSmall: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.sm * LineHeight.relaxed,
  },

  // === LABELS ===
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
    lineHeight: FontSize.base * LineHeight.normal,
  },
  labelSmall: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.sm * LineHeight.normal,
  },
  labelXSmall: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.xs * LineHeight.normal,
    letterSpacing: LetterSpacing.wide,
    textTransform: 'uppercase' as const,
  },

  // === CAPTION ===
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.regular,
    lineHeight: FontSize.xs * LineHeight.relaxed,
  },

  // === BUTTONS ===
  buttonLarge: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semiBold,
    letterSpacing: LetterSpacing.wide,
  },
  button: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
  },
  buttonSmall: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    fontWeight: FontWeight.semiBold,
  },

  // === SPECIAL ===
  timer: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.timerLarge,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
    lineHeight: FontSize.timerLarge * LineHeight.none,
  },
  timerSmall: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.timerSmall,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.tight,
  },
  stat: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extraBold,
    letterSpacing: LetterSpacing.tight,
  },
  rank: {
    fontFamily: FontFamily.black,
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.black,
  },
  badge: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: LetterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  mono: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.base,
    fontWeight: FontWeight.regular,
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    fontWeight: FontWeight.medium,
  },
  examQuestion: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.examQuestion,
    fontWeight: FontWeight.medium,
    lineHeight: FontSize.examQuestion * LineHeight.relaxed,
  },
} as const;

// Legacy alias
export const Typography = TextStyles;
