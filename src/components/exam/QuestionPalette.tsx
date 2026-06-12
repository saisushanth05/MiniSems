// Mini Sems — Question Palette Component
// 5-state color-coded question grid for exam interface

import React, {useCallback} from 'react';
import {
  Animated,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import type {QuestionStatus} from '@apptypes/exam.types';

interface PaletteQuestion {
  index: number;
  questionId: string;
  status: QuestionStatus;
}

interface QuestionPaletteProps {
  questions: PaletteQuestion[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose?: () => void;
}

const STATUS_CONFIG: Record<QuestionStatus, {bg: string; border: string; text: string; label: string}> = {
  answered: {
    bg: Colors.answered,
    border: Colors.successDark,
    text: Colors.white,
    label: 'Answered',
  },
  marked_review: {
    bg: Colors.markedReview,
    border: Colors.warningDark,
    text: Colors.white,
    label: 'Marked for Review',
  },
  answered_marked: {
    bg: Colors.purple,
    border: '#6D28D9',
    text: Colors.white,
    label: 'Answered & Marked',
  },
  not_answered: {
    bg: Colors.dangerSurface,
    border: Colors.danger,
    text: Colors.danger,
    label: 'Not Answered',
  },
  not_visited: {
    bg: Colors.surfaceVariant,
    border: Colors.border,
    text: Colors.textTertiary,
    label: 'Not Visited',
  },
};

export const QuestionPalette: React.FC<QuestionPaletteProps> = ({
  questions,
  currentIndex,
  onSelect,
  onClose,
}) => {
  const stats = {
    answered: questions.filter(q => q.status === 'answered').length,
    markedReview: questions.filter(q => q.status === 'marked_review').length,
    notAnswered: questions.filter(q => q.status === 'not_answered').length,
    notVisited: questions.filter(q => q.status === 'not_visited').length,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Question Palette</Text>
        {onClose && (
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const count =
            status === 'answered'
              ? stats.answered
              : status === 'marked_review'
              ? stats.markedReview
              : status === 'not_answered'
              ? stats.notAnswered
              : status === 'not_visited'
              ? stats.notVisited
              : 0;
          return (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendDot, {backgroundColor: config.bg, borderColor: config.border}]} />
              <Text style={styles.legendText}>{count} {config.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}>
        {questions.map((q, idx) => {
          const config = STATUS_CONFIG[q.status];
          const isCurrent = idx === currentIndex;
          return (
            <Pressable
              key={q.questionId}
              onPress={() => onSelect(idx)}
              style={[
                styles.cell,
                {
                  backgroundColor: isCurrent ? Colors.currentQuestion : config.bg,
                  borderColor: isCurrent ? Colors.primaryDark : config.border,
                  borderWidth: isCurrent ? 2 : 1.5,
                },
              ]}>
              <Text
                style={[
                  styles.cellText,
                  {color: isCurrent ? Colors.white : config.text},
                ]}>
                {q.index + 1}
              </Text>
              {isCurrent && <View style={styles.currentDot} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Summary bar */}
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {stats.answered} answered · {stats.markedReview} marked · {stats.notVisited} not visited
        </Text>
      </View>
    </View>
  );
};

// ── Mini palette (horizontal strip) ──
export const MiniPalette: React.FC<{
  questions: PaletteQuestion[];
  currentIndex: number;
  onSelect: (index: number) => void;
}> = ({questions, currentIndex, onSelect}) => (
  <FlatList
    horizontal
    data={questions}
    keyExtractor={item => item.questionId}
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{paddingHorizontal: Spacing.base, gap: 6}}
    renderItem={({item, index}) => {
      const config = STATUS_CONFIG[item.status];
      const isCurrent = index === currentIndex;
      return (
        <Pressable
          onPress={() => onSelect(index)}
          style={[
            styles.miniCell,
            {
              backgroundColor: isCurrent ? Colors.primary : config.bg,
              borderColor: isCurrent ? Colors.primaryDark : config.border,
            },
          ]}>
          <Text
            style={[
              styles.miniCellText,
              {color: isCurrent ? Colors.white : config.text},
            ]}>
            {item.index + 1}
          </Text>
        </Pressable>
      );
    }}
  />
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    maxHeight: '90%',
    ...Shadow.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  legend: {
    padding: Spacing.base,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    marginRight: 8,
  },
  legendText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    gap: 8,
  },
  cell: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cellText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
  },
  currentDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.white,
  },
  summary: {
    padding: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surfaceVariant,
  },
  summaryText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  miniCell: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCellText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
});

export default QuestionPalette;
