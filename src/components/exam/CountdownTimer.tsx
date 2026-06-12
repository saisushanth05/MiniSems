// Mini Sems — Countdown Timer Component
// Large exam timer with color transitions (green → amber → red)

import React, {useEffect, useRef, useCallback} from 'react';
import {Animated, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Spacing} from '@theme/spacing';

interface CountdownTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  onTick?: (remaining: number) => void;
  style?: ViewStyle;
  compact?: boolean;
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  totalSeconds,
  onTimeUp,
  onTick,
  style,
  compact = false,
}) => {
  const [remaining, setRemaining] = React.useState(totalSeconds);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Color transitions
  const getTimerColor = useCallback((secs: number): string => {
    const ratio = secs / totalSeconds;
    if (ratio > 0.5) return Colors.success;
    if (ratio > 0.25) return Colors.warning;
    return Colors.danger;
  }, [totalSeconds]);

  // Pulse animation when critical
  useEffect(() => {
    if (remaining <= 300 && remaining > 0) {
      // Last 5 min: pulse
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {toValue: 1.08, duration: 500, useNativeDriver: true}),
          Animated.timing(pulseAnim, {toValue: 1, duration: 500, useNativeDriver: true}),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [remaining <= 300, pulseAnim]);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1;
        onTick?.(next);
        if (next <= 0) {
          clearInterval(timerRef.current!);
          onTimeUp();
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [onTimeUp, onTick]);

  const color = getTimerColor(remaining);
  const timeStr = formatTime(remaining);
  const isWarning = remaining <= 600; // 10 min
  const isCritical = remaining <= 300; // 5 min

  if (compact) {
    return (
      <Animated.View
        style={[
          compactStyles.container,
          {
            backgroundColor: `${color}18`,
            borderColor: `${color}40`,
            transform: [{scale: isCritical ? pulseAnim : 1}],
          },
          style,
        ]}>
        <Text style={[compactStyles.timer, {color}]}>⏱ {timeStr}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: `${color}12`,
          borderColor: `${color}35`,
          transform: [{scale: isCritical ? pulseAnim : 1}],
        },
        style,
      ]}>
      <Text style={styles.label}>Time Remaining</Text>
      <Text style={[styles.timer, {color}]}>{timeStr}</Text>
      {isWarning && (
        <Text style={[styles.warningText, {color}]}>
          {isCritical ? '⚠️ Critical! Submit soon' : '⚡ 10 minutes left'}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  timer: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    letterSpacing: -1,
    lineHeight: FontSize['4xl'] * 1.1,
  },
  warningText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    marginTop: 4,
    textAlign: 'center',
  },
});

const compactStyles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1.5,
  },
  timer: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    letterSpacing: -0.5,
  },
});

export default CountdownTimer;
