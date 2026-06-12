// Mini Sems — OTP Input Component
// 6-cell auto-advancing OTP input with Inter font

import React, {useRef, useState, useCallback} from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Animated,
  type TextInputProps,
} from 'react-native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Spacing} from '@theme/spacing';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onChange?: (otp: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  onChange,
  error = false,
  disabled = false,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, {toValue: 8, duration: 60, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -8, duration: 60, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 6, duration: 60, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: -6, duration: 60, useNativeDriver: true}),
      Animated.timing(shakeAnim, {toValue: 0, duration: 60, useNativeDriver: true}),
    ]).start();
  }, [shakeAnim]);

  React.useEffect(() => {
    if (error) shake();
  }, [error, shake]);

  const handleChange = useCallback(
    (text: string, index: number) => {
      const digit = text.replace(/[^0-9]/g, '').slice(-1);
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      onChange?.(newOtp.join(''));
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      if (newOtp.every(d => d !== '')) {
        onComplete(newOtp.join(''));
      }
    },
    [otp, length, onChange, onComplete],
  );

  const handleKeyPress = useCallback(
    (e: {nativeEvent: {key: string}}, index: number) => {
      if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange?.(newOtp.join(''));
      }
    },
    [otp, onChange],
  );

  return (
    <Animated.View
      style={[styles.container, {transform: [{translateX: shakeAnim}]}]}>
      {Array(length)
        .fill(0)
        .map((_, i) => (
          <TextInput
            key={i}
            ref={ref => {
              inputRefs.current[i] = ref;
            }}
            style={[
              styles.cell,
              otp[i] ? styles.cellFilled : null,
              error ? styles.cellError : null,
            ]}
            value={otp[i]}
            onChangeText={text => handleChange(text, i)}
            onKeyPress={e => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            editable={!disabled}
            selectTextOnFocus
            textAlign="center"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            returnKeyType="done"
          />
        ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceVariant,
    fontSize: FontSize['2xl'],
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  cellFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
    color: Colors.primary,
  },
  cellError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSurface,
  },
});

export default OTPInput;
