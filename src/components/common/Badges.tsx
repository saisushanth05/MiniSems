// Mini Sems — Rank Badge Component
// Gold/Silver/Bronze/Numeric rank badges

import React from 'react';
import {StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius} from '@theme/spacing';

interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const SIZE_CONFIG = {
  sm: {outer: 28, fontSize: FontSize.sm},
  md: {outer: 36, fontSize: FontSize.base},
  lg: {outer: 52, fontSize: FontSize.xl},
};

export const RankBadge: React.FC<RankBadgeProps> = ({rank, size = 'md', style}) => {
  const config = SIZE_CONFIG[size];

  const getBadgeColor = () => {
    if (rank === 1) return Colors.rankGold;
    if (rank === 2) return Colors.rankSilver;
    if (rank === 3) return Colors.rankBronze;
    if (rank <= 10) return Colors.primary;
    return Colors.textTertiary;
  };

  const getEmoji = () => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const emoji = getEmoji();
  const color = getBadgeColor();

  if (emoji && size === 'lg') {
    return (
      <View
        style={[
          styles.badge,
          {
            width: config.outer,
            height: config.outer,
            backgroundColor: `${color}20`,
            borderWidth: 2,
            borderColor: color,
          },
          style,
        ]}>
        <Text style={{fontSize: config.outer * 0.5}}>{emoji}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          width: config.outer,
          height: config.outer,
          backgroundColor: `${color}18`,
          borderWidth: rank <= 3 ? 2 : 1.5,
          borderColor: color,
        },
        style,
      ]}>
      <Text
        style={[
          styles.text,
          {
            fontSize: config.fontSize,
            color,
            fontFamily: rank <= 3 ? FontFamily.black : FontFamily.bold,
          },
        ]}>
        #{rank}
      </Text>
    </View>
  );
};

// ── Warning Badge ──
export const WarningBadge: React.FC<{count: number; style?: ViewStyle}> = ({count, style}) => (
  <View style={[warningStyles.badge, style]}>
    <Text style={warningStyles.text}>⚠ {count} Warning{count > 1 ? 's' : ''}</Text>
  </View>
);

// ── Disqualified Badge ──
export const DisqualifiedBadge: React.FC<{style?: ViewStyle}> = ({style}) => (
  <View style={[disqStyles.badge, style]}>
    <Text style={disqStyles.text}>🚫 DISQUALIFIED</Text>
  </View>
);

// ── Status Badge ──
export const StatusBadge: React.FC<{
  label: string;
  color: string;
  style?: ViewStyle;
}> = ({label, color, style}) => (
  <View
    style={[
      {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.full,
        backgroundColor: `${color}18`,
        borderWidth: 1,
        borderColor: `${color}40`,
      },
      style,
    ]}>
    <Text
      style={{
        fontFamily: FontFamily.bold,
        fontSize: FontSize.xs,
        color,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
      }}>
      {label}
    </Text>
  </View>
);

// ── Exam Type Badge ──
export const ExamTypeBadge: React.FC<{
  type: 'weekly_test' | 'unit_test' | 'grand_test' | 'practice_test';
}> = ({type}) => {
  const config = {
    weekly_test: {label: 'Weekly', color: Colors.weeklyTest},
    unit_test: {label: 'Unit Test', color: Colors.unitTest},
    grand_test: {label: 'Grand Test', color: Colors.grandTest},
    practice_test: {label: 'Practice', color: Colors.practiceTest},
  }[type];

  return <StatusBadge label={config.label} color={config.color} />;
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    textAlign: 'center',
  },
});

const warningStyles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.warningSurface,
    borderWidth: 1,
    borderColor: Colors.warningBorder,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.warningDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

const disqStyles = StyleSheet.create({
  badge: {
    backgroundColor: Colors.dangerSurface,
    borderWidth: 1.5,
    borderColor: Colors.dangerBorder,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  text: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.xs,
    color: Colors.danger,
    letterSpacing: 1,
  },
});

export default RankBadge;
