// Mini Sems — OTP Verification Screen

import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {OTPInput} from '@components/common/OTPInput';
import {Button} from '@components/common/Button';
import {verifyOTPAndLogin, sendOTP, getDeviceInfo} from '@services/authService';
import {useAuthStore} from '@stores/authStore';
import {useTranslation} from 'react-i18next';
import type {RootStackParamList} from '@apptypes/navigation.types';
import Toast from 'react-native-toast-message';

type Nav = NativeStackNavigationProp<RootStackParamList, 'OTP'>;
type Route = RouteProp<RootStackParamList, 'OTP'>;

const ROLE_GRADIENT: Record<string, string[]> = {
  admin: ['#1E3A8A', '#2563EB'],
  faculty: ['#0284C7', '#0EA5E9'],
  student: ['#16A34A', '#22C55E'],
  parent: ['#6D28D9', '#8B5CF6'],
};

const RESEND_COOLDOWN = 30;

const OTPScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {mobile, role, rollNumber, otpHint} = route.params;
  const {t} = useTranslation();
  const {setUser, setDeviceId} = useAuthStore();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);
  const [resending, setResending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const successAnim = useRef(new Animated.Value(0)).current;

  const gradient = ROLE_GRADIENT[role] || ROLE_GRADIENT.student;

  // Show OTP hint in development/preview mode
  useEffect(() => {
    if (otpHint) {
      Toast.show({
        type: 'info',
        text1: '🔑 Testing OTP Code',
        text2: otpHint,
        visibilityTime: 12000,
      });
    }
  }, [otpHint]);

  // Cooldown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleVerify = useCallback(async (otpValue: string) => {
    if (otpValue.length < 6) return;
    setLoading(true);
    setHasError(false);

    try {
      const device = await getDeviceInfo();
      const response = await verifyOTPAndLogin({
        mobile,
        otp: otpValue,
        role,
        rollNumber,
        deviceId: device.deviceId,
        deviceModel: device.model,
        osVersion: device.systemVersion,
        appVersion: device.appVersion,
      });

      if (response.error) {
        setHasError(true);
        Toast.show({type: 'error', text1: t('auth.invalidOTP'), text2: response.error.message});
        return;
      }

      if (response.data) {
        // Success animation
        Animated.spring(successAnim, {
          toValue: 1,
          tension: 80,
          friction: 6,
          useNativeDriver: true,
        }).start();

        setDeviceId(device.deviceId);
        setUser(response.data.user);

        // Navigate based on role
        const roleRoutes: Record<string, keyof RootStackParamList> = {
          admin: 'AdminRoot',
          super_admin: 'AdminRoot',
          faculty: 'FacultyRoot',
          student: 'StudentRoot',
          parent: 'ParentRoot',
        };

        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{name: roleRoutes[role] || 'RoleSelect'}],
          });
        }, 600);
      }
    } catch {
      setHasError(true);
      Toast.show({type: 'error', text1: 'Error', text2: t('common.networkError')});
    } finally {
      setLoading(false);
    }
  }, [mobile, role, rollNumber]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      await sendOTP({role, mobile, rollNumber});
      setResendCooldown(RESEND_COOLDOWN);
      timerRef.current = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      Toast.show({type: 'success', text1: 'OTP Resent', text2: `New OTP sent to +91${mobile}`});
    } finally {
      setResending(false);
    }
  }, [resendCooldown, resending, role, mobile, rollNumber]);

  const maskedMobile = `+91 XXXXX${mobile.slice(-5)}`;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          {/* Header */}
          <LinearGradient
            colors={gradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <Animated.View
              style={[
                styles.otpIcon,
                {
                  transform: [
                    {
                      scale: successAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.3],
                      }),
                    },
                  ],
                },
              ]}>
              <Text style={styles.otpEmoji}>
                {loading ? '⏳' : hasError ? '❌' : '📲'}
              </Text>
            </Animated.View>
            <Text style={styles.headerTitle}>{t('auth.otpTitle')}</Text>
            <Text style={styles.headerSubtitle}>
              {t('auth.otpSubtitle')} {'\n'}{maskedMobile}
            </Text>
          </LinearGradient>

          {/* OTP form */}
          <View style={styles.formCard}>
            <Text style={styles.formLabel}>{t('auth.enterOTP')}</Text>

            <OTPInput
              length={6}
              onComplete={handleVerify}
              onChange={val => {
                setOtp(val);
                if (hasError) setHasError(false);
              }}
              error={hasError}
              disabled={loading}
            />

            {hasError && (
              <Text style={styles.errorMsg}>{t('auth.invalidOTP')}</Text>
            )}

            {/* Verify button */}
            <Button
              title={loading ? 'Verifying...' : t('auth.verifyOTP')}
              variant="gradient"
              gradientColors={gradient}
              size="lg"
              fullWidth
              loading={loading}
              disabled={otp.length < 6}
              onPress={() => handleVerify(otp)}
              style={styles.verifyBtn}
            />

            {/* Resend */}
            <View style={styles.resendRow}>
              <Text style={styles.resendLabel}>Didn't receive OTP? </Text>
              {resendCooldown > 0 ? (
                <Text style={styles.resendCooldown}>
                  {t('auth.resendIn', {seconds: resendCooldown})}
                </Text>
              ) : (
                <Pressable onPress={handleResend} disabled={resending}>
                  <Text style={styles.resendLink}>
                    {resending ? 'Sending...' : t('auth.resendOTP')}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                The OTP is valid for 5 minutes. Do not share it with anyone.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
  },
  backText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.9)',
  },
  otpIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  otpEmoji: {
    fontSize: 40,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: FontSize.base * 1.6,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    marginTop: -Spacing.xl,
    padding: Spacing.xl,
    flex: 1,
    alignItems: 'center',
    ...Shadow.lg,
  },
  formLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    alignSelf: 'flex-start',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  errorMsg: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.danger,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  verifyBtn: {
    marginTop: Spacing.xl,
    width: '100%',
  },
  resendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  resendLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  resendCooldown: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textMuted,
  },
  resendLink: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xl,
    gap: 8,
    width: '100%',
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
  },
});

export default OTPScreen;
