// Mini Sems — Analytics Card Component
// Data-dense but clean — Linear/Notion quality

import React from 'react';
import {StyleSheet, Text, View, type ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '@theme/colors';
import {TextStyles, FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';

interface StatCardProps {
  label: string;
  value: string | number;
  subLabel?: string;
  subValue?: string;
  icon?: string;
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  style?: ViewStyle;
  compact?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subLabel,
  subValue,
  icon,
  color = Colors.primary,
  trend,
  trendValue,
  style,
  compact = false,
}) => {
  const trendColor =
    trend === 'up' ? Colors.success : trend === 'down' ? Colors.danger : Colors.textTertiary;
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <View style={[styles.card, compact ? styles.compact : null, style]}>
      {/* Icon + Trend row */}
      <View style={styles.topRow}>
        {icon && (
          <View style={[styles.iconContainer, {backgroundColor: `${color}18`}]}>
            <Text style={[styles.icon, {color}]}>{icon}</Text>
          </View>
        )}
        {trend && trendValue && (
          <View style={[styles.trendBadge, {backgroundColor: `${trendColor}18`}]}>
            <Text style={[styles.trendText, {color: trendColor}]}>
              {trendIcon} {trendValue}
            </Text>
          </View>
        )}
      </View>
      {/* Main value */}
      <Text style={[styles.value, {color: Colors.textPrimary}]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {/* Sub info */}
      {subLabel && (
        <View style={styles.subRow}>
          <Text style={styles.subLabel}>{subLabel}</Text>
          {subValue && <Text style={[styles.subValue, {color}]}>{subValue}</Text>}
        </View>
      )}
      {/* Color accent bar */}
      <View style={[styles.accentBar, {backgroundColor: color}]} />
    </View>
  );
};

// ── Horizontal stat for rank list ──
export const InlineStatItem: React.FC<{
  label: string;
  value: string | number;
  color?: string;
}> = ({label, value, color = Colors.primary}) => (
  <View style={inlineStyles.container}>
    <Text style={[inlineStyles.value, {color}]}>{value}</Text>
    <Text style={inlineStyles.label}>{label}</Text>
  </View>
);

// ── Analytics overview card (larger) ──
interface AnalyticsCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  style?: ViewStyle;
  gradientHeader?: boolean;
  gradientColors?: string[];
}

export const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  subtitle,
  children,
  headerRight,
  style,
  gradientHeader = false,
  gradientColors = Colors.gradients.heroHeader,
}) => {
  const header = gradientHeader ? (
    <LinearGradient
      colors={gradientColors}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      style={styles.gradientHeader}>
      <View style={{flex: 1}}>
        <Text style={styles.gradientTitle}>{title}</Text>
        {subtitle && <Text style={styles.gradientSubtitle}>{subtitle}</Text>}
      </View>
      {headerRight}
    </LinearGradient>
  ) : (
    <View style={styles.cardHeader}>
      <View style={{flex: 1}}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
      {headerRight}
    </View>
  );

  return (
    <View style={[styles.analyticsCard, style]}>
      {header}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
};

// ── Performance Circle ──
export const PercentageCircle: React.FC<{
  percentage: number;
  size?: number;
  color?: string;
  label?: string;
}> = ({percentage, size = 80, color = Colors.primary, label}) => {
  const angle = (percentage / 100) * 360;
  const isAbove50 = percentage >= 50;

  return (
    <View style={{alignItems: 'center'}}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}18`,
          borderWidth: 5,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{fontFamily: FontFamily.black, fontSize: size * 0.22, color}}>
          {Math.round(percentage)}%
        </Text>
      </View>
      {label && (
        <Text
          style={{
            fontFamily: FontFamily.medium,
            fontSize: FontSize.xs,
            color: Colors.textSecondary,
            marginTop: 6,
            textAlign: 'center',
          }}>
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadow.md,
    overflow: 'hidden',
    position: 'relative',
  },
  compact: {
    padding: Spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  trendText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
  },
  value: {
    ...TextStyles.stat,
    marginBottom: 2,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  subRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  subLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
  },
  subValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.xl,
    borderBottomLeftRadius: BorderRadius.xl,
  },
  analyticsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    ...Shadow.md,
    overflow: 'hidden',
    marginBottom: Spacing.base,
  },
  gradientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    paddingVertical: Spacing.md,
  },
  gradientTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  gradientSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  cardTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  cardBody: {
    padding: Spacing.base,
  },
});

const inlineStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    minWidth: 60,
  },
  value: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xl,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
});
