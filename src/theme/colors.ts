// Mini Sems — Updated Color System
// EdTech-grade palette inspired by BYJU'S, Unacademy, Khan Academy

export const Colors = {
  // === PRIMARY BRAND (Education Blue) ===
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  primaryLighter: '#93C5FD',
  primaryDark: '#1D4ED8',
  primaryDarker: '#1E3A8A',
  primarySurface: '#EFF6FF',
  primaryBorder: '#BFDBFE',

  // === SECONDARY (Sky Blue) ===
  secondary: '#0EA5E9',
  secondaryLight: '#38BDF8',
  secondaryDark: '#0284C7',
  secondarySurface: '#F0F9FF',

  // === SUCCESS ===
  success: '#22C55E',
  successLight: '#4ADE80',
  successDark: '#16A34A',
  successSurface: '#F0FDF4',
  successBorder: '#BBF7D0',

  // === WARNING ===
  warning: '#F59E0B',
  warningLight: '#FCD34D',
  warningDark: '#D97706',
  warningSurface: '#FFFBEB',
  warningBorder: '#FDE68A',

  // === DANGER ===
  danger: '#EF4444',
  dangerLight: '#F87171',
  dangerDark: '#DC2626',
  dangerSurface: '#FEF2F2',
  dangerBorder: '#FECACA',

  // === PURPLE (Accent) ===
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  purpleSurface: '#F5F3FF',

  // === NEUTRALS ===
  white: '#FFFFFF',
  black: '#0F172A',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  surfaceElevated: '#FFFFFF',

  // === BORDERS ===
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  borderDark: '#CBD5E1',
  divider: '#E2E8F0',

  // === TEXT ===
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textTertiary: '#64748B',
  textMuted: '#94A3B8',
  textDisabled: '#CBD5E1',
  textInverse: '#FFFFFF',
  textLink: '#2563EB',

  // === EXAM QUESTION PALETTE ===
  answered: '#22C55E',         // Answered — green
  answeredSurface: '#F0FDF4',
  markedReview: '#F59E0B',     // Marked for review — amber
  markedReviewSurface: '#FFFBEB',
  notVisited: '#94A3B8',       // Not visited — grey
  notVisitedSurface: '#F8FAFC',
  notAnswered: '#EF4444',      // Visited but not answered — red
  currentQuestion: '#2563EB',   // Currently active — blue
  currentSurface: '#EFF6FF',

  // === EXAM TYPE COLORS ===
  weeklyTest: '#2563EB',
  unitTest: '#F59E0B',
  grandTest: '#EF4444',
  practiceTest: '#22C55E',

  // === STATUS COLORS ===
  active: '#22C55E',
  inactive: '#94A3B8',
  suspicious: '#F59E0B',
  disqualified: '#EF4444',
  submitted: '#2563EB',

  // === GRADIENTS ===
  gradients: {
    primaryBlue: ['#1D4ED8', '#2563EB', '#0EA5E9'] as string[],
    heroHeader: ['#1E3A8A', '#2563EB'] as string[],
    successGreen: ['#16A34A', '#22C55E'] as string[],
    warningAmber: ['#D97706', '#F59E0B'] as string[],
    dangerRed: ['#DC2626', '#EF4444'] as string[],
    purpleIndigo: ['#6D28D9', '#8B5CF6'] as string[],
    card: ['#FFFFFF', '#F8FAFC'] as string[],
    adminHeader: ['#1E3A8A', '#1D4ED8'] as string[],
    facultyHeader: ['#0284C7', '#0EA5E9'] as string[],
    studentHeader: ['#16A34A', '#22C55E'] as string[],
    parentHeader: ['#6D28D9', '#8B5CF6'] as string[],
    examActive: ['#EF4444', '#DC2626'] as string[],
  },

  // === OVERLAYS ===
  overlay: 'rgba(15, 23, 42, 0.65)',
  overlayLight: 'rgba(15, 23, 42, 0.35)',
  overlayBlue: 'rgba(37, 99, 235, 0.1)',

  // === SHIMMER (Skeleton) ===
  shimmerBase: '#E2E8F0',
  shimmerHighlight: '#F8FAFC',

  // === RANK COLORS ===
  rankGold: '#F59E0B',
  rankSilver: '#94A3B8',
  rankBronze: '#D97706',
  rankOther: '#2563EB',

  // === ANSWERED & MARKED REVIEW (palette) ===
  answeredMarked: '#8B5CF6',

  // === EXTRA SURFACES ===
  primarySurface2: '#DBEAFE',
  secondaryBorder: '#7DD3FC',
  purpleBorder: '#C4B5FD',
  successBorder2: '#86EFAC',
  dangerBorder2: '#FCA5A5',

  // === EXAM STATUS palette state ===
  examLive: '#EF4444',

} as const;

export type ColorKey = keyof typeof Colors;
