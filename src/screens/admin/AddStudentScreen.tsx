// Mini Sems — Add/Edit Student Screen (Admin)

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
import type {Section} from '@apptypes/database.types';

type Nav = NativeStackNavigationProp<AdminStackParamList, 'AddStudent'>;
type Route = RouteProp<AdminStackParamList, 'AddStudent'>;

const AddStudentScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  
  const studentId = route.params?.studentId;

  // Form Fields
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [parentMobile, setParentMobile] = useState('');
  const [stream, setStream] = useState<'MPC' | 'BiPC' | 'MEC' | 'CEC' | 'HEC'>('MPC');
  const [year, setYear] = useState<1 | 2>(1);
  const [sectionId, setSectionId] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch sections
    const fetchSections = async () => {
      if (!user?.collegeId) return;
      const {data} = await db.sections().select('*').eq('college_id', user.collegeId);
      setSections((data || []) as Section[]);
      if (data && data.length > 0) {
        setSectionId(data[0].id);
      }
    };
    
    // Fetch student if editing
    const fetchStudent = async () => {
      if (!studentId) return;
      const {data} = await db.students().select('*').eq('id', studentId).single();
      if (data) {
        setName(data.name);
        setRollNumber(data.roll_number);
        setMobile(data.mobile);
        setParentMobile(data.parent_mobile);
        setStream(data.stream);
        setYear(data.year);
        setSectionId(data.section_id);
      }
    };

    fetchSections().then(fetchStudent);
  }, [studentId, user?.collegeId]);

  const handleSave = async () => {
    if (!name || !rollNumber || !mobile || !parentMobile || !sectionId) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      if (studentId) {
        // Update
        const {error} = await db.students()
          .update({
            name,
            roll_number: rollNumber,
            mobile,
            parent_mobile: parentMobile,
            stream,
            year,
            section_id: sectionId,
          })
          .eq('id', studentId);
          
        if (error) throw error;
        Alert.alert('Success', 'Student updated successfully');
      } else {
        // Insert
        if (!user?.collegeId) return;
        
        // In real system, we first create a user auth record, or we just insert profile
        // Let's create user entry or link to dummy user id
        const dummyUserId = 'd3b07384-d113-4ec6-a558-86babd9f36f9'; // Placeholder
        const {error} = await db.students()
          .insert({
            college_id: user.collegeId,
            user_id: dummyUserId,
            name,
            roll_number: rollNumber,
            mobile,
            parent_mobile: parentMobile,
            stream,
            year,
            section_id: sectionId,
            status: 'active',
          });
          
        if (error) throw error;
        Alert.alert('Success', 'Student added successfully');
      }
      navigation.goBack();
    } catch (err: any) {
      console.error('Save student error:', err);
      Alert.alert('Error', err.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradients.adminHeader} style={styles.header}>
        <Text style={styles.title}>
          {studentId ? t('students.editStudent') : t('students.addStudent')}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('students.studentName')} *</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rahul Kumar"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('students.rollNumber')} *</Text>
          <TextInput
            style={styles.input}
            value={rollNumber}
            onChangeText={setRollNumber}
            placeholder="e.g. 24021A0501"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('students.mobile')} *</Text>
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            placeholder="10-digit mobile number"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('students.parentMobile')} *</Text>
          <TextInput
            style={styles.input}
            value={parentMobile}
            onChangeText={setParentMobile}
            placeholder="Parent's 10-digit mobile number"
            placeholderTextColor={Colors.textMuted}
            keyboardType="phone-pad"
          />
        </View>

        {/* Stream Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('students.stream')}</Text>
          <View style={styles.selectors}>
            {['MPC', 'BiPC', 'MEC', 'CEC'].map(st => (
              <TouchableOpacity
                key={st}
                style={[styles.selectorCell, stream === st && styles.selectorSelected]}
                onPress={() => setStream(st as any)}>
                <Text style={[styles.selectorText, stream === st && styles.selectorTextSelected]}>
                  {st}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Year Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('students.year')}</Text>
          <View style={styles.selectors}>
            {[1, 2].map(yr => (
              <TouchableOpacity
                key={yr}
                style={[styles.selectorCell, year === yr && styles.selectorSelected]}
                onPress={() => setYear(yr as any)}>
                <Text style={[styles.selectorText, year === yr && styles.selectorTextSelected]}>
                  {yr === 1 ? '1st Year' : '2nd Year'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Section Picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('students.section')}</Text>
          <View style={styles.selectors}>
            {sections.map(sec => (
              <TouchableOpacity
                key={sec.id}
                style={[styles.selectorCell, sectionId === sec.id && styles.selectorSelected]}
                onPress={() => setSectionId(sec.id)}>
                <Text style={[styles.selectorText, sectionId === sec.id && styles.selectorTextSelected]}>
                  {sec.name}
                </Text>
              </TouchableOpacity>
            ))}
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

export default AddStudentScreen;
