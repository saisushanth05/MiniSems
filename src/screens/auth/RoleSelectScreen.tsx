// Mini Sems — Role Select Screen
// EdTech premium entry point with animated role cards

import React, {useRef, useEffect} from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {LanguageSwitcher} from '@components/common/LanguageSwitcher';
import {useTranslation} from 'react-i18next';
import type {RootStackParamList} from '@apptypes/navigation.types';
import type {UserRole} from '@apptypes/database.types';

const {width} = Dimensions.get('window');

type Nav = NativeStackNavigationProp<RootStackParamList, 'RoleSelect'>;

interface RoleOption {
  role: 'admin' | 'faculty' | 'student' | 'parent';
  emoji: string;
  gradientColors: string[];
  tag: string;
}

const ROLES: RoleOption[] = [
  {
    role: 'admin',
    emoji: '🏛️',
    gradientColors: ['#1E3A8A', '#2563EB'],
    tag: 'ADMIN',
  },
  {
    role: 'faculty',
    emoji: '👨‍🏫',
    gradientColors: ['#0284C7', '#0EA5E9'],
    tag: 'FACULTY',
  },
  {
    role: 'student',
    emoji: '🎓',
    gradientColors: ['#16A34A', '#22C55E'],
    tag: 'STUDENT',
  },
  {
    role: 'parent',
    emoji: '👨‍👩‍👧',
    gradientColors: ['#6D28D9', '#8B5CF6'],
    tag: 'PARENT',
  },
];

const RoleCard: React.FC<{
  option: RoleOption;
  onPress: () => void;
  delay: number;
}> = ({option, onPress, delay}) => {
  const {t} = useTranslation();
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 450,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {toValue: 0.97, useNativeDriver: true, tension: 200}).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {toValue: 1, useNativeDriver: true, tension: 200}).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{translateY: slideAnim}, {scale: scaleAnim}],
        opacity: fadeAnim,
        width: '48%',
      }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.roleCard}>
        <LinearGradient
          colors={option.gradientColors}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.roleCardGradient}>
          {/* Tag */}
          <View style={styles.roleTag}>
            <Text style={styles.roleTagText}>{option.tag}</Text>
          </View>
          {/* Emoji */}
          <Text style={styles.roleEmoji}>{option.emoji}</Text>
          {/* Title */}
          <Text style={styles.roleTitle}>{t(`auth.${option.role}`)}</Text>
          <Text style={styles.roleSubtitle}>{t(`auth.${option.role}Subtitle`)}</Text>
          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <Text style={styles.arrowText}>→</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

const RoleSelectScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {t} = useTranslation();
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleRoleSelect = (role: 'admin' | 'faculty' | 'student' | 'parent') => {
    navigation.navigate('Login', {role});
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        {/* Header */}
        <Animated.View style={[styles.header, {opacity: headerAnim}]}>
          <View style={styles.logoRow}>
            {/* Logo placeholder — replace with actual college logo */}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={Colors.gradients.primaryBlue}
                style={styles.logoGradient}>
                <Text style={styles.logoText}>MS</Text>
              </LinearGradient>
            </View>
            <View style={styles.logoInfo}>
              <Text style={styles.appName}>Mini Sems</Text>
              <Text style={styles.appSubtitle}>Secure Examination System</Text>
            </View>
            <LanguageSwitcher compact />
          </View>

          {/* Hero section */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{t('auth.selectRole')}</Text>
            <Text style={styles.heroSubtitle}>{t('auth.selectRoleSubtitle')}</Text>
          </View>

          {/* Feature badges */}
          <View style={styles.badges}>
            {['EAMCET', 'JEE Main', 'NEET', 'BITSAT'].map(exam => (
              <View key={exam} style={styles.examBadge}>
                <Text style={styles.examBadgeText}>{exam}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Role cards grid */}
        <View style={styles.rolesGrid}>
          {ROLES.map((role, i) => (
            <RoleCard
              key={role.role}
              option={role}
              onPress={() => handleRoleSelect(role.role)}
              delay={i * 80}
            />
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Mini Sems v1.0 · Secured by Supabase · AP & TS Certified
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  header: {
    paddingTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginRight: Spacing.md,
    ...Shadow.md,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.xl,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  logoInfo: {
    flex: 1,
  },
  appName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  appSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  hero: {
    marginBottom: Spacing.base,
  },
  heroTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    lineHeight: FontSize.md * 1.5,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.md,
  },
  examBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: Colors.primarySurface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.primaryBorder,
  },
  examBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  roleCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    ...Shadow.lg,
  },
  roleCardGradient: {
    padding: Spacing.base,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    minHeight: 180,
    position: 'relative',
  },
  roleTag: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  roleTagText: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.xs,
    color: Colors.white,
    letterSpacing: 1,
  },
  roleEmoji: {
    fontSize: 36,
    marginBottom: Spacing.sm,
  },
  roleTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.white,
    marginBottom: 3,
  },
  roleSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: FontSize.sm * 1.4,
  },
  arrowContainer: {
    position: 'absolute',
    bottom: Spacing.base,
    right: Spacing.base,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 18,
    color: Colors.white,
  },
  footer: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});

export default RoleSelectScreen;
