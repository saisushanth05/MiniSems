// Mini Sems — Skeleton Loader Component
// Animated shimmer effect — no spinners per design spec

import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View, type ViewStyle, type DimensionValue} from 'react-native';
import {Colors} from '@theme/colors';
import {BorderRadius} from '@theme/spacing';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = BorderRadius.sm,
  style,
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: Colors.shimmerBase,
          opacity,
        },
        style,
      ]}
    />
  );
};

// ── Pre-built skeleton layouts ──

export const SkeletonStatCard: React.FC = () => (
  <View style={skeletonStyles.statCard}>
    <Skeleton height={14} width={80} />
    <Skeleton height={36} width={120} style={{marginTop: 8}} />
    <Skeleton height={12} width={60} style={{marginTop: 6}} />
  </View>
);

export const SkeletonStudentRow: React.FC = () => (
  <View style={skeletonStyles.row}>
    <Skeleton width={40} height={40} borderRadius={20} />
    <View style={{flex: 1, marginLeft: 12}}>
      <Skeleton height={14} width="60%" />
      <Skeleton height={12} width="40%" style={{marginTop: 6}} />
    </View>
    <Skeleton height={28} width={64} borderRadius={14} />
  </View>
);

export const SkeletonExamCard: React.FC = () => (
  <View style={skeletonStyles.examCard}>
    <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
      <Skeleton height={18} width="55%" />
      <Skeleton height={24} width={80} borderRadius={12} />
    </View>
    <Skeleton height={13} width="35%" style={{marginTop: 8}} />
    <View style={{flexDirection: 'row', marginTop: 12, gap: 8}}>
      <Skeleton height={32} width={80} borderRadius={8} />
      <Skeleton height={32} width={80} borderRadius={8} />
      <Skeleton height={32} width={80} borderRadius={8} />
    </View>
  </View>
);

export const SkeletonQuestionCard: React.FC = () => (
  <View style={skeletonStyles.questionCard}>
    <Skeleton height={14} width={80} />
    <Skeleton height={16} width="90%" style={{marginTop: 10}} />
    <Skeleton height={16} width="70%" style={{marginTop: 4}} />
    {[0, 1, 2, 3].map(i => (
      <View key={i} style={skeletonStyles.option}>
        <Skeleton width={22} height={22} borderRadius={11} />
        <Skeleton height={14} width="75%" style={{marginLeft: 10}} />
      </View>
    ))}
  </View>
);

export const SkeletonDashboard: React.FC = () => (
  <View style={{padding: 16}}>
    <Skeleton height={28} width="50%" />
    <Skeleton height={14} width="30%" style={{marginTop: 6}} />
    <View style={skeletonStyles.statsRow}>
      {[0, 1, 2, 3].map(i => (
        <SkeletonStatCard key={i} />
      ))}
    </View>
    {[0, 1, 2].map(i => (
      <SkeletonExamCard key={i} />
    ))}
  </View>
);

const skeletonStyles = StyleSheet.create({
  statCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 16,
    flex: 1,
    margin: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    marginBottom: 1,
  },
  examCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  questionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: 20,
    marginBottom: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
});
