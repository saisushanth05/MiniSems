// Mini Sems — Add/Edit Faculty Screen (Admin)

import React, {useState, useEffect} from 'react';
import {
  SafeAreaView, StyleSheet, Text, TextInput,
  TouchableOpacity, View, ScrollView, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RouteProp} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useAuthStore} from '@stores/authStore';
import {db, supabase} from '@services/supabase';
import {useTranslation} from 'react-i18next';
import type {AdminStackParamList} from '@apptypes/navigation.types';
import type {Subject} from '@apptypes/database.types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AddFaculty'>;
type Route = RouteProp<AdminStackParamList, 'AddFaculty'>;

const AddFacultyScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  
  const facultyId = route.params?.facultyId;

  // Form Fields
  const [name, setName] = useState('');
  const [qualification, setQualification] = useState('');
  const [mobile, setMobile] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch subjects
    const fetchSubjects = async () => {
      if (!user?.collegeId) return;
      const {data} = await db.subjects().select('*').eq('college_id', user.collegeId);
      setSubjects((data || []) as Subject[]);
    };
    
    // Fetch faculty if editing
    const fetchFaculty = async () => {
      if (!facultyId) return;
      const {data} = await db.faculty().select('*').eq('id', facultyId).single();
      if (data) {
        setName(data.name);
        setQualification(data.qualification || '');
        setMobile(data.mobile);
        // In full system, fetch assigned subjects via join table
      }
    };

    fetchSubjects().then(fetchFaculty);
  }, [facultyId, user?.collegeId]);

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!name || !mobile) {
      Alert.alert('Error', 'Please fill in name and mobile number');
      return;
    }
    
    setSaving(true);
    try {
      if (facultyId) {
        const {error} = await db.faculty()
          .update({
            name,
            qualification,
            mobile,
          })
          .eq('id', facultyId);
          
        if (error) throw error;
        Alert.alert('Success', 'Faculty updated successfully');
      } else {
        if (!user?.collegeId) return;
        
        const dummyUserId = 'd3b07384-d113-4ec6-a558-86babd9f36f9'; // Placeholder
        const {error} = await db.faculty()
          .insert({
            college_id: user.collegeId,
            user_id: dummyUserId,
            name,
            qualification,
            mobile,
            is_active: true,
          });
          
        if (error) throw error;
        Alert.alert('Success', 'Faculty added successfully');
      }
      navigation.goBack();
    } catch (err: any) {
      console.error('Save faculty error:', err);
      Alert.alert('Error', err.message || 'Failed to save faculty');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradients.adminHeader} style={styles.header}>
        <Text style={styles.title}>
          {facultyId ? t('faculty.editFaculty') : t('faculty.addFaculty')}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('faculty.facultyName')} *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Dr. Prasad Rao"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Qualification / Degree</Text>
          <TextInput
            style={styles.input}
            value={qualification}
            onChangeText={setQualification}
            placeholder="e.g. M.Sc, Ph.D in Physics"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Mobile Number *</Text>
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            placeholder="10-digit mobile number"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        {/* Subjects list */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('faculty.assignSubjects')}</Text>
          <View style={styles.selectors}>
            {subjects.map(sub => {
              const isSelected = selectedSubjectIds.includes(sub.id);
              return (
                <TouchableOpacity
                  key={sub.id}
                  style={[styles.selectorCell, isSelected && styles.selectorSelected]}
                  onPress={() => toggleSubject(sub.id)}>
                  <Text style={[styles.selectorText, isSelected && styles.selectorTextSelected]}>
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={styles.saveBtn}>
          <LinearGradient colors={Colors.gradients.primaryBlue} style={styles.saveBtnGradient}>
            <Text style={styles.saveBtnText}>
              {saving ? t('common.loading') : t('common.save')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.base, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontFamily: FontFamily.bold, fontSize: FontSize.xl, color: Colors.white},
  closeBtn: {padding: 8},
  closeText: {color: Colors.white, fontSize: 18, fontWeight: 'bold'},
  scroll: {padding: Spacing.base, paddingBottom: 40},
  formGroup: {marginBottom: Spacing.md},
  label: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 6},
  input: {height: 48, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Spacing.base, fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textPrimary},
  selectors: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  selectorCell: {paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border},
  selectorSelected: {backgroundColor: Colors.primarySurface, borderColor: Colors.primaryBorder},
  selectorText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary},
  selectorTextSelected: {color: Colors.primary, fontFamily: FontFamily.bold},
  saveBtn: {borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.lg},
  saveBtnGradient: {height: 48, alignItems: 'center', justifyContent: 'center'},
  saveBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.white},
});

export default AddFacultyScreen;
