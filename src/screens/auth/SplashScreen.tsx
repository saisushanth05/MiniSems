// Mini Sems — Splash Screen

import React, {useEffect, useRef} from 'react';
import {Animated, Dimensions, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {useAuthStore} from '@stores/authStore';
import type {RootStackParamList} from '@apptypes/navigation.types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

const {width, height} = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const {isAuthenticated, user} = useAuthStore();
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {toValue: 1, tension: 60, friction: 6, useNativeDriver: true}),
      Animated.timing(fadeAnim, {toValue: 1, duration: 600, useNativeDriver: true}),
    ]).start();

    const timer = setTimeout(() => {
      if (isAuthenticated && user) {
        const routes: Record<string, keyof RootStackParamList> = {
          admin: 'AdminRoot',
          super_admin: 'AdminRoot',
          faculty: 'FacultyRoot',
          student: 'StudentRoot',
          parent: 'ParentRoot',
        };
        navigation.replace(routes[user.role] || 'RoleSelect');
      } else {
        navigation.replace('RoleSelect');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={Colors.gradients.primaryBlue}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>
      <Animated.View
        style={[styles.content, {transform: [{scale: scaleAnim}], opacity: fadeAnim}]}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>MS</Text>
        </View>
        <Text style={styles.appName}>Mini Sems</Text>
        <Text style={styles.tagline}>Secure Examination System</Text>
        <View style={styles.examBadges}>
          {['EAMCET', 'JEE', 'NEET', 'BITSAT'].map(e => (
            <View key={e} style={styles.badge}>
              <Text style={styles.badgeText}>{e}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
      <Text style={styles.footer}>AP & TS Intermediate Colleges</Text>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  content: {alignItems: 'center'},
  logo: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoText: {fontFamily: FontFamily.black, fontSize: 40, color: Colors.white, letterSpacing: -1},
  appName: {fontFamily: FontFamily.bold, fontSize: FontSize['4xl'], color: Colors.white, letterSpacing: -0.8},
  tagline: {fontFamily: FontFamily.medium, fontSize: FontSize.md, color: 'rgba(255,255,255,0.8)', marginTop: 6},
  examBadges: {flexDirection: 'row', gap: 8, marginTop: 24},
  badge: {
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  badgeText: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.white},
  footer: {
    position: 'absolute', bottom: 48,
    fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)',
  },
});

export default SplashScreen;
