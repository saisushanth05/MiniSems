// Mini Sems — Exam Card Component
// Shows exam info with color-coded type, status, and countdown

import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {ExamTypeBadge, StatusBadge} from '@components/common/Badges';
import type {Exam} from '@apptypes/database.types';

interface ExamCardProps {
  exam: Exam;
  onPress?: () => void;
  showCountdown?: boolean;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
  variant?: 'default' | 'compact' | 'featured';
}

const formatTimeRemaining = (targetTime: string): string => {
  const now = new Date();
  const target = new Date(targetTime);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return 'Started';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const TYPE_GRADIENT: Record<string, string[]> = {
  weekly_test: ['#1D4ED8', '#2563EB'],
  unit_test: ['#D97706', '#F59E0B'],
  grand_test: ['#DC2626', '#EF4444'],
  practice_test: ['#16A34A', '#22C55E'],
};

export const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  onPress,
  showCountdown = false,
  showActions = false,
  onEdit,
  onDelete,
  style,
  variant = 'default',
}) => {
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!showCountdown) return;
    const update = () => {
      setCountdown(formatTimeRemaining(`${exam.scheduled_date}T${exam.start_time}`));
    };
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [exam, showCountdown]);

  const gradientColors = TYPE_GRADIENT[exam.exam_type] || Colors.gradients.heroHeader;

  if (variant === 'featured') {
    return (
      <Pressable onPress={onPress} style={[styles.featured, style]}>
        <LinearGradient
          colors={gradientColors}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.featuredGradient}>
          <View style={styles.featuredContent}>
            <ExamTypeBadge type={exam.exam_type} />
            <Text style={styles.featuredName} numberOfLines={2}>{exam.name}</Text>
            <Text style={styles.featuredDate}>
              {new Date(exam.scheduled_date).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              })} • {exam.start_time}
            </Text>
            <View style={styles.featuredStats}>
              <StatChip label="Questions" value={exam.total_questions} />
              <StatChip label="Marks" value={exam.total_marks} />
              <StatChip label="Duration" value={`${exam.duration_minutes}m`} />
            </View>
            {showCountdown && countdown && (
              <View style={styles.countdownPill}>
                <Text style={styles.countdownText}>⏱ Starts in {countdown}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  if (variant === 'compact') {
    return (
      <Pressable onPress={onPress} style={[styles.compact, style]}>
        <View style={[styles.compactBar, {backgroundColor: gradientColors[1]}]} />
        <View style={styles.compactBody}>
          <Text style={styles.compactName} numberOfLines={1}>{exam.name}</Text>
          <Text style={styles.compactMeta}>
            {new Date(exam.scheduled_date).toLocaleDateString('en-IN', {
              day: 'numeric', month: 'short',
            })} • {exam.total_questions}Q • {exam.total_marks}M
          </Text>
        </View>
        {showCountdown && (
          <Text style={[styles.compactCountdown, {color: gradientColors[1]}]}>{countdown}</Text>
        )}
      </Pressable>
    );
  }

  // Default card
  return (
    <Pressable onPress={onPress} style={[styles.card, style]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <ExamTypeBadge type={exam.exam_type} />
        <StatusBadge
          label={exam.status}
          color={
            exam.status === 'active'
              ? Colors.danger
              : exam.status === 'completed'
              ? Colors.textTertiary
              : exam.status === 'published'
              ? Colors.success
              : Colors.textMuted
          }
        />
      </View>
      {/* Exam name */}
      <Text style={styles.examName} numberOfLines={2}>{exam.name}</Text>
      <Text style={styles.examMeta}>
        {new Date(exam.scheduled_date).toLocaleDateString('en-IN', {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
        })} • {exam.start_time}
      </Text>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{exam.total_questions}</Text>
          <Text style={styles.statLabel}>Questions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{exam.total_marks}</Text>
          <Text style={styles.statLabel}>Marks</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{exam.duration_minutes}m</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        {exam.submitted_count !== undefined && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{exam.submitted_count}</Text>
              <Text style={styles.statLabel}>Submitted</Text>
            </View>
          </>
        )}
      </View>
      {/* Countdown */}
      {showCountdown && countdown && (
        <View style={styles.countdownRow}>
          <Text style={styles.countdownLabel}>⏱ </Text>
          <Text style={styles.countdownValue}>{countdown}</Text>
        </View>
      )}
      {/* Actions */}
      {showActions && (
        <View style={styles.actions}>
          <Pressable onPress={onEdit} style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>✏️ Edit</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.actionBtn, styles.actionBtnDanger]}>
            <Text style={[styles.actionBtnText, {color: Colors.danger}]}>🗑 Delete</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
};

const StatChip: React.FC<{label: string; value: string | number}> = ({label, value}) => (
  <View style={chipStyles.container}>
    <Text style={chipStyles.value}>{value}</Text>
    <Text style={chipStyles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  examName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  examMeta: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  countdownLabel: {
    fontSize: FontSize.base,
  },
  countdownValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  actionBtn: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnDanger: {
    borderColor: Colors.dangerBorder,
    backgroundColor: Colors.dangerSurface,
  },
  actionBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  // Featured variant
  featured: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.lg,
    marginBottom: Spacing.md,
  },
  featuredGradient: {
    padding: Spacing.xl,
  },
  featuredContent: {},
  featuredName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  featuredDate: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.md,
  },
  featuredStats: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  countdownPill: {
    marginTop: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  countdownText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.white,
  },
  // Compact variant
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    ...Shadow.sm,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  compactBar: {
    width: 5,
    alignSelf: 'stretch',
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  compactBody: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  compactName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  compactMeta: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  compactCountdown: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    paddingRight: Spacing.md,
  },
});

const chipStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  value: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.white,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
});

export default ExamCard;
