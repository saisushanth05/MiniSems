// Mini Sems — Card Component
// Clean card-based architecture with soft shadows

import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
  type PressableProps,
} from 'react-native';
import {Colors} from '@theme/colors';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled' | 'glass';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: number | 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  onPress?: PressableProps['onPress'];
  borderColor?: string;
  backgroundColor?: string;
  radius?: number;
}

const PADDING_MAP = {
  none: 0,
  sm: Spacing.sm,
  md: Spacing.base,
  lg: Spacing.xl,
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  style,
  onPress,
  borderColor,
  backgroundColor,
  radius,
}) => {
  const paddingValue =
    typeof padding === 'number'
      ? padding
      : PADDING_MAP[padding as keyof typeof PADDING_MAP] ?? Spacing.base;

  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: radius ?? BorderRadius.xl,
      padding: paddingValue,
      backgroundColor: backgroundColor || Colors.surface,
    };

    switch (variant) {
      case 'elevated':
        return {...base, ...Shadow.lg};
      case 'outlined':
        return {
          ...base,
          borderWidth: 1,
          borderColor: borderColor || Colors.border,
          backgroundColor: backgroundColor || Colors.surface,
        };
      case 'filled':
        return {...base, backgroundColor: backgroundColor || Colors.surfaceVariant};
      case 'glass':
        return {
          ...base,
          backgroundColor: 'rgba(255,255,255,0.85)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.6)',
          ...Shadow.md,
        };
      default:
        return {...base, ...Shadow.md};
    }
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [
          getCardStyle(),
          pressed && {opacity: 0.9, transform: [{scale: 0.99}]},
          style,
        ]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[getCardStyle(), style]}>{children}</View>;
};

export default Card;
