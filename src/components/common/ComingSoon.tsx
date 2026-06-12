// Mini Sems — Shared stub for screens under development
// Replace each stub file with full implementation

import React from 'react';
import {SafeAreaView, StyleSheet, Text, View, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {Spacing} from '@theme/spacing';

export const ComingSoonScreen: React.FC<{title: string; emoji: string}> = ({title, emoji}) => {
  const navigation = useNavigation();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Full implementation coming in next iteration</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  content: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl},
  emoji: {fontSize: 64, marginBottom: 16},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.textPrimary, textAlign: 'center', marginBottom: 8},
  subtitle: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24},
  backBtn: {paddingHorizontal: 24, paddingVertical: 12, backgroundColor: Colors.primarySurface, borderRadius: 12, borderWidth: 1, borderColor: Colors.primaryBorder},
  backText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.primary},
});

export default ComingSoonScreen;
