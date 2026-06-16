// Mini Sems — User Profile Screen
// Displays detailed profile info, language switcher, and logout button inside a premium card UI

import React, {useState, useEffect, useCallback} from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import {LanguageSwitcher} from '@components/common/LanguageSwitcher';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {user, logout} = useAuthStore();
  const {t} = useTranslation();
  
  const [loading, setLoading] = useState(true);
  const [collegeName, setCollegeName] = useState('');
  const [profileData, setProfileData] = useState<any>(null);

  const fetchProfileDetails = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch college details
      const {data: college} = await db.colleges()
        .select('name')
        .eq('id', user.collegeId)
        .single();
      if (college) {
        setCollegeName(college.name);
      }

      // 2. Fetch role-specific details
      if (user.role === 'student' && user.studentId) {
        const {data: student} = await db.students()
          .select('*, section:sections(*)')
          .eq('id', user.studentId)
          .single();
        setProfileData(student);
      } else if (user.role === 'faculty' && user.facultyId) {
        const [facultyRes, subjsRes, sectsRes] = await Promise.all([
          db.faculty().select('*').eq('id', user.facultyId).single(),
          db.facultySubjects().select('*, subject:subjects(name)').eq('faculty_id', user.facultyId),
          db.facultySections().select('*, section:sections(name)').eq('faculty_id', user.facultyId),
        ]);
        
        setProfileData({
          ...facultyRes.data,
          subjects: subjsRes.data?.map((s: any) => s.subject?.name).filter(Boolean) || [],
          sections: sectsRes.data?.map((s: any) => s.section?.name).filter(Boolean) || [],
        });
      }
    } catch (err) {
      console.error('Error fetching profile details:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileDetails();
  }, [fetchProfileDetails]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('auth.logout'),
      t('auth.logoutConfirm'),
      [
        {text: t('common.cancel'), style: 'cancel'},
        {
          text: t('auth.logout'),
          style: 'destructive',
          onPress: () => {
            logout();
            navigation.reset({
              index: 0,
              routes: [{name: 'RoleSelect'}],
            });
          },
        },
      ],
    );
  }, [logout, navigation, t]);

  const getAvatarChar = () => {
    return (user?.name || 'U').charAt(0).toUpperCase();
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      case 'faculty':
        return 'Faculty';
      case 'student':
        return 'Student';
      case 'parent':
        return 'Parent';
      default:
        return 'User';
    }
  };

  const gradientColors = 
    user?.role === 'student' ? [...Colors.gradients.studentHeader] :
    user?.role === 'faculty' ? [...Colors.gradients.facultyHeader] :
    [...Colors.gradients.adminHeader];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title') || 'My Profile'}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar Area */}
        <View style={styles.avatarSection}>
          <LinearGradient colors={gradientColors} style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getAvatarChar()}</Text>
          </LinearGradient>
          <Text style={styles.profileName}>{user?.name}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{getRoleLabel()}</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{marginTop: 40}} />
        ) : (
          <>
            {/* Details Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('profile.details') || 'Personal Details'}</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('profile.mobile') || 'Mobile Number'}</Text>
                <Text style={styles.detailValue}>{user?.mobile || '—'}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('profile.college') || 'College'}</Text>
                <Text style={styles.detailValue}>{collegeName || '—'}</Text>
              </View>

              {user?.role === 'student' && profileData && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Roll Number</Text>
                    <Text style={styles.detailValue}>{profileData.roll_number || '—'}</Text>
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Section</Text>
                    <Text style={styles.detailValue}>{profileData.section?.name || '—'}</Text>
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Stream & Year</Text>
                    <Text style={styles.detailValue}>{`${profileData.stream || '—'} - Year ${profileData.year || '—'}`}</Text>
                  </View>
                </>
              )}

              {user?.role === 'faculty' && profileData && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Qualification</Text>
                    <Text style={styles.detailValue}>{profileData.qualification || '—'}</Text>
                  </View>

                  {profileData.subjects?.length > 0 && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Subjects</Text>
                        <Text style={styles.detailValue}>{profileData.subjects.join(', ')}</Text>
                      </View>
                    </>
                  )}

                  {profileData.sections?.length > 0 && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Sections</Text>
                        <Text style={styles.detailValue}>{profileData.sections.join(', ')}</Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>

            {/* Language & Settings Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t('profile.settings') || 'Settings'}</Text>
              <View style={styles.settingsRow}>
                <View>
                  <Text style={styles.settingsLabel}>{t('profile.language') || 'Language'}</Text>
                  <Text style={styles.settingsDesc}>Switch app language</Text>
                </View>
                <LanguageSwitcher />
              </View>
            </View>

            {/* Logout Action */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.logoutBtnText}>🚪 {t('auth.logout') || 'Logout'}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceVariant,
  },
  backBtnText: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    color: Colors.textPrimary,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  headerPlaceholder: {
    width: 40,
  },
  scroll: {
    padding: Spacing.base,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 36,
    color: Colors.white,
  },
  profileName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  roleBadge: {
    backgroundColor: Colors.primarySurface,
    borderColor: Colors.primaryBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },
  roleBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
    textAlign: 'right',
    flex: 1,
    marginLeft: Spacing.lg,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingsLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  settingsDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  logoutBtn: {
    height: 48,
    backgroundColor: Colors.dangerSurface,
    borderColor: Colors.dangerBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.base,
  },
  logoutBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.danger,
  },
});

export default ProfileScreen;
