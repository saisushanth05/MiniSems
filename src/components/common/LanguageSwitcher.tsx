// Mini Sems — Language Switcher Component
// EN ↔ తెలుగు toggle with animated pill

import React, {useCallback} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';

interface LanguageSwitcherProps {
  compact?: boolean;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({compact = false}) => {
  const {i18n} = useTranslation();
  const {language, setLanguage} = useAuthStore();
  const slideAnim = React.useRef(new Animated.Value(language === 'en' ? 0 : 1)).current;

  const toggle = useCallback(() => {
    const newLang = language === 'en' ? 'te' : 'en';
    Animated.spring(slideAnim, {
      toValue: newLang === 'en' ? 0 : 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
  }, [language, i18n, slideAnim, setLanguage]);

  const pillX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, compact ? 44 : 56],
  });

  const pillWidth = compact ? 42 : 54;
  const containerWidth = compact ? 90 : 116;

  return (
    <Pressable
      onPress={toggle}
      style={[styles.container, {width: containerWidth}]}
      accessibilityLabel={`Switch language to ${language === 'en' ? 'Telugu' : 'English'}`}>
      {/* Sliding pill */}
      <Animated.View
        style={[
          styles.pill,
          {width: pillWidth, transform: [{translateX: pillX}]},
        ]}
      />
      {/* Labels */}
      <View style={styles.labelsRow}>
        <Text
          style={[
            styles.label,
            compact ? styles.labelCompact : null,
            language === 'en' ? styles.labelActive : styles.labelInactive,
          ]}>
          EN
        </Text>
        <Text
          style={[
            styles.label,
            compact ? styles.labelCompact : null,
            language === 'te' ? styles.labelActive : styles.labelInactive,
          ]}>
          {compact ? 'తె' : 'తెలుగు'}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 36,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    height: 30,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    top: 3,
    ...{
      shadowColor: Colors.primary,
      shadowOffset: {width: 0, height: 2},
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    zIndex: 1,
    flex: 1,
    textAlign: 'center',
  },
  labelCompact: {
    fontSize: FontSize.sm,
  },
  labelActive: {
    color: Colors.white,
  },
  labelInactive: {
    color: Colors.textTertiary,
  },
});

export default LanguageSwitcher;
