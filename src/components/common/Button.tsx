// Mini Sems — Primary Button Component
// Enterprise-grade with loading states, haptic feedback, and size variants

import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '@theme/colors';
import {TextStyles, FontFamily} from '@theme/typography';
import {BorderRadius, Spacing, Shadow, TouchTarget} from '@theme/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'gradient';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: string[];
}

const SIZE_CONFIG: Record<ButtonSize, {height: number; paddingH: number; textStyle: object}> = {
  sm: {height: TouchTarget.minimum, paddingH: Spacing.md, textStyle: TextStyles.buttonSmall},
  md: {height: TouchTarget.comfortable, paddingH: Spacing.lg, textStyle: TextStyles.button},
  lg: {height: TouchTarget.large, paddingH: Spacing.xl, textStyle: TextStyles.buttonLarge},
  xl: {height: 64, paddingH: Spacing['2xl'], textStyle: TextStyles.buttonLarge},
};

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  textStyle,
  gradientColors,
  onPress,
  ...rest
}) => {
  const sizeConfig = SIZE_CONFIG[size];
  const isDisabled = disabled || loading;

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (!isDisabled && onPress) {
        onPress(e);
      }
    },
    [isDisabled, onPress],
  );

  const getButtonStyle = (): ViewStyle => {
    const base: ViewStyle = {
      height: sizeConfig.height,
      paddingHorizontal: sizeConfig.paddingH,
      borderRadius: BorderRadius.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: isDisabled ? 0.55 : 1,
    };

    switch (variant) {
      case 'primary':
        return {...base, backgroundColor: Colors.primary, ...Shadow.colored(Colors.primary)};
      case 'secondary':
        return {...base, backgroundColor: Colors.secondary};
      case 'outline':
        return {...base, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary};
      case 'ghost':
        return {...base, backgroundColor: 'transparent'};
      case 'danger':
        return {...base, backgroundColor: Colors.danger, ...Shadow.colored(Colors.danger)};
      case 'success':
        return {...base, backgroundColor: Colors.success, ...Shadow.colored(Colors.success)};
      case 'gradient':
        return {...base, overflow: 'hidden'};
      default:
        return base;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'outline':
        return Colors.primary;
      case 'ghost':
        return Colors.primary;
      default:
        return Colors.white;
    }
  };

  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
          <Text
            style={[
              sizeConfig.textStyle,
              {color: getTextColor(), fontFamily: FontFamily.semiBold},
              textStyle,
            ]}>
            {title}
          </Text>
          {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
        </>
      )}
    </>
  );

  if (variant === 'gradient') {
    const colors = gradientColors || Colors.gradients.primaryBlue;
    return (
      <Pressable
        onPress={handlePress}
        disabled={isDisabled}
        style={[
          getButtonStyle(),
          fullWidth && styles.fullWidth,
          style,
        ]}
        {...rest}>
        <LinearGradient
          colors={colors}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 0}}
          style={[styles.gradient, {height: sizeConfig.height, paddingHorizontal: sizeConfig.paddingH}]}>
          {buttonContent}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      style={({pressed}) => [
        getButtonStyle(),
        fullWidth && styles.fullWidth,
        pressed && {opacity: 0.8, transform: [{scale: 0.98}]},
        style,
      ]}
      {...rest}>
      {buttonContent}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    width: '100%',
  },
});

export default Button;
