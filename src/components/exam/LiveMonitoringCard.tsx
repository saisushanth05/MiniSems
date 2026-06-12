// Mini Sems — Live Monitoring Card Component
// Real-time student status during active exam

import React from 'react';
import {Pressable, StyleSheet, Text, View, Animated, type ViewStyle} from 'react-native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {WarningBadge, DisqualifiedBadge} from '@components/common/Badges';
import type {LiveStudentCard as LiveStudentCardType} from '@apptypes/exam.types';

interface LiveMonitoringCardProps {
  student: LiveStudentCardType;
  onPress?: () => void;
  style?: ViewStyle;
}

const STATUS_CONFIG = {
  active: {color: Colors.success, label: '● Active', bg: Colors.successSurface},
  suspicious: {color: Colors.warning, label: '⚠ Suspicious', bg: Colors.warningSurface},
  submitted: {color: Colors.primary, label: '✓ Submitted', bg: Colors.primarySurface},
  not_started: {color: Colors.textMuted, label: '○ Not Started', bg: Colors.surfaceVariant},
  disqualified: {color: Colors.danger, label: '✕ Disqualified', bg: Colors.dangerSurface},
};

const formatSecondsToMMSS = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const LiveMonitoringCard: React.FC<LiveMonitoringCardProps> = ({
  student,
  onPress,
  style,
}) => {
  const statusConfig = STATUS_CONFIG[student.status];
  const progressPercent =
    student.totalQuestions > 0
      ? (student.questionsAttempted / student.totalQuestions) * 100
      : 0;

  const isSuspicious = student.status === 'suspicious';
  const isDisqualified = student.status === 'disqualified';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          borderColor: isSuspicious
            ? Colors.warningBorder
            : isDisqualified
            ? Colors.dangerBorder
            : Colors.border,
          borderWidth: isSuspicious || isDisqualified ? 2 : 1,
          backgroundColor: isSuspicious
            ? Colors.warningSurface
            : isDisqualified
            ? Colors.dangerSurface
            : Colors.surface,
        },
        style,
      ]}>
      {/* Header row */}
      <View style={styles.header}>
        {/* Avatar */}
        <View style={[styles.avatar, {backgroundColor: `${statusConfig.color}20`}]}>
          <Text style={[styles.avatarText, {color: statusConfig.color}]}>
            {student.studentName.charAt(0).toUpperCase()}
          </Text>
        </View>
        {/* Name & Roll */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{student.studentName}</Text>
          <Text style={styles.roll}>{student.rollNumber} · {student.section}</Text>
        </View>
        {/* Status */}
        <View style={[styles.statusPill, {backgroundColor: `${statusConfig.color}15`}]}>
          <Text style={[styles.statusText, {color: statusConfig.color}]}>{statusConfig.label}</Text>
        </View>
      </View>

      {/* Progress row */}
      <View style={styles.progressRow}>
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: statusConfig.color,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {student.questionsAttempted}/{student.totalQuestions}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.round(progressPercent)}%</Text>
          <Text style={styles.statLabel}>Attempted</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              {color: student.timeRemainingSeconds < 300 ? Colors.danger : Colors.textPrimary},
            ]}>
            {formatSecondsToMMSS(student.timeRemainingSeconds)}
          </Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text
            style={[
              styles.statValue,
              {color: student.violationCount > 0 ? Colors.warning : Colors.success},
            ]}>
            {student.violationCount}
          </Text>
          <Text style={styles.statLabel}>Violations</Text>
        </View>
      </View>

      {/* Badges */}
      {student.violationCount > 0 && !isDisqualified && (
        <View style={styles.badgeRow}>
          <WarningBadge count={student.violationCount} />
        </View>
      )}
      {isDisqualified && (
        <View style={styles.badgeRow}>
          <DisqualifiedBadge />
        </View>
      )}

      {/* Last activity */}
      {student.lastActivityAt && (
        <Text style={styles.lastActivity}>
          Last activity: {new Date(student.lastActivityAt).toLocaleTimeString()}
        </Text>
      )}
    </Pressable>
  );
};

// ── Live Monitor Grid ──
export const LiveMonitorGrid: React.FC<{
  students: LiveStudentCardType[];
  onStudentPress: (student: LiveStudentCardType) => void;
}> = ({students, onStudentPress}) => (
  <View style={gridStyles.container}>
    {students.map(student => (
      <LiveMonitoringCard
        key={student.studentId}
        student={student}
        onPress={() => onStudentPress(student)}
        style={gridStyles.card}
      />
    ))}
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    ...Shadow.sm,
    marginBottom: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  roll: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    minWidth: 36,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
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
    height: 24,
    backgroundColor: Colors.border,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: Spacing.sm,
  },
  lastActivity: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});

const gridStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: '48%',
  },
});

export default LiveMonitoringCard;
