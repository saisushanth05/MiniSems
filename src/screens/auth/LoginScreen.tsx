// Mini Sems — Login Screen
// OTP-based login for all 4 roles

import React, {useState, useCallback} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {LanguageSwitcher} from '@components/common/LanguageSwitcher';
import {Button} from '@components/common/Button';
import {sendOTP} from '@services/authService';
import {useTranslation} from 'react-i18next';
import type {RootStackParamList} from '@apptypes/navigation.types';
import Toast from 'react-native-toast-message';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;
type Route = RouteProp<RootStackParamList, 'Login'>;

const ROLE_CONFIG = {
  admin: {
    gradient: ['#1E3A8A', '#2563EB'] as string[],
    emoji: '🏛️',
    title: 'Admin Login',
    fields: ['mobile'],
  },
  faculty: {
    gradient: ['#0284C7', '#0EA5E9'] as string[],
    emoji: '👨‍🏫',
    title: 'Faculty Login',
    fields: ['mobile'],
  },
  student: {
    gradient: ['#16A34A', '#22C55E'] as string[],
    emoji: '🎓',
    title: 'Student Login',
    fields: ['rollNumber', 'mobile'],
  },
  parent: {
    gradient: ['#6D28D9', '#8B5CF6'] as string[],
    emoji: '👨‍👩‍👧',
    title: 'Parent Login',
    fields: ['rollNumber', 'mobile'],
  },
};

const LoginScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {role} = route.params;
  const {t} = useTranslation();

  const config = ROLE_CONFIG[role];

  const [mobile, setMobile] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{mobile?: string; rollNumber?: string}>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (config.fields.includes('mobile')) {
      if (!mobile || mobile.length !== 10 || !/^\d+$/.test(mobile)) {
        newErrors.mobile = t('errors.invalidMobile');
      }
    }
    if (config.fields.includes('rollNumber')) {
      if (!rollNumber || rollNumber.trim().length < 2) {
        newErrors.rollNumber = t('errors.invalidRollNumber');
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const response = await sendOTP({
        role,
        mobile,
        rollNumber: rollNumber || undefined,
      });

      if (response.error) {
        Toast.show({type: 'error', text1: 'Error', text2: response.error.message});
        return;
      }

      navigation.navigate('OTP', {
        mobile,
        role,
        rollNumber: rollNumber || undefined,
        otpHint: response.data?.message,
      });
    } catch {
      Toast.show({type: 'error', text1: 'Error', text2: t('common.networkError')});
    } finally {
      setLoading(false);
    }
  }, [mobile, rollNumber, role, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{flex: 1}}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">
          {/* Header gradient */}
          <LinearGradient
            colors={config.gradient}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.header}>
            {/* Back + language */}
            <View style={styles.headerTop}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
              </Pressable>
              <LanguageSwitcher compact />
            </View>
            {/* Role info */}
            <Text style={styles.headerEmoji}>{config.emoji}</Text>
            <Text style={styles.headerTitle}>{config.title}</Text>
            <Text style={styles.headerSubtitle}>{t('auth.loginSubtitle')}</Text>
          </LinearGradient>

          {/* Form card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{t('auth.loginTitle')}</Text>
            <Text style={styles.formSubtitle}>
              Enter your details to receive an OTP
            </Text>

            {/* Roll Number field (student & parent only) */}
            {config.fields.includes('rollNumber') && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>{t('auth.rollNumber')}</Text>
                <View style={[styles.inputContainer, errors.rollNumber ? styles.inputError : null]}>
                  <Text style={styles.inputIcon}>🎫</Text>
                  <TextInput
                    style={styles.input}
                    value={rollNumber}
                    onChangeText={text => {
                      setRollNumber(text.toUpperCase());
                      setErrors(e => ({...e, rollNumber: undefined}));
                    }}
                    placeholder={t('auth.enterRollNumber')}
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="characters"
                    returnKeyType="next"
                  />
                </View>
                {errors.rollNumber && (
                  <Text style={styles.errorText}>{errors.rollNumber}</Text>
                )}
              </View>
            )}

            {/* Mobile field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('auth.mobileNumber')}</Text>
              <View style={[styles.inputContainer, errors.mobile ? styles.inputError : null]}>
                <Text style={styles.inputIcon}>📱</Text>
                <Text style={styles.countryCode}>+91</Text>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.input}
                  value={mobile}
                  onChangeText={text => {
                    const digits = text.replace(/\D/g, '').slice(0, 10);
                    setMobile(digits);
                    setErrors(e => ({...e, mobile: undefined}));
                  }}
                  placeholder={t('auth.enterMobile')}
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="done"
                  onSubmitEditing={handleSendOTP}
                />
              </View>
              {errors.mobile && (
                <Text style={styles.errorText}>{errors.mobile}</Text>
              )}
            </View>

            {/* Send OTP button */}
            <Button
              title={loading ? 'Sending OTP...' : t('auth.sendOTP')}
              variant="gradient"
              gradientColors={config.gradient}
              size="lg"
              fullWidth
              loading={loading}
              onPress={handleSendOTP}
              style={styles.sendBtn}
            />

            {/* Security note */}
            <View style={styles.securityNote}>
              <Text style={styles.securityIcon}>🔒</Text>
              <Text style={styles.securityText}>
                OTP will be sent to your registered mobile number. No passwords required.
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
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  backText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.9)',
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.white,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius['2xl'],
    borderTopRightRadius: BorderRadius['2xl'],
    marginTop: -Spacing.xl,
    padding: Spacing.xl,
    flex: 1,
    ...Shadow.lg,
  },
  formTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
  },
  fieldGroup: {
    marginBottom: Spacing.base,
  },
  fieldLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerSurface,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  countryCode: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginRight: 6,
  },
  phoneDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    height: '100%',
    padding: 0,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.danger,
    marginTop: 6,
  },
  sendBtn: {
    marginTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: 8,
  },
  securityIcon: {
    fontSize: 16,
  },
  securityText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: FontSize.sm * 1.5,
  },
});

export default LoginScreen;
