// Mini Sems — Theme Index
export {Colors} from './colors';
export {Typography, FontFamily, FontSize, FontWeight} from './typography';
export {Spacing, BorderRadius, Shadow, TouchTarget, Layout, ZIndex} from './spacing';

import {Colors} from './colors';
import {Typography} from './typography';
import {Spacing, BorderRadius, Shadow} from './spacing';

export const Theme = {
  colors: Colors,
  typography: Typography,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadow: Shadow,
} as const;

export type Theme = typeof Theme;
