// Mini Sems — Bulk Upload Screen (Admin)

import React, {useState, useEffect} from 'react';
import {
  StyleSheet, Text,
  TouchableOpacity, View, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useTranslation} from 'react-i18next';
import {useAuthStore} from '@stores/authStore';
import {db} from '@services/supabase';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {read, utils} from 'xlsx';

const BulkUploadScreen: React.FC = () => {
  const navigation = useNavigation();
  const {user} = useAuthStore();
  const {t} = useTranslation();
  
  const [fileSelected, setFileSelected] = useState<{uri: string; name: string} | null>(null);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<{successCount: number; errors: string[]} | null>(null);
  const [parsedStudents, setParsedStudents] = useState<any[]>([]);
  const [sectionsList, setSectionsList] = useState<any[]>([]);

  // Fetch sections for section mapping validation
  useEffect(() => {
    const fetchSections = async () => {
      if (!user?.collegeId) return;
      try {
        const {data} = await db.sections().select('*').eq('college_id', user.collegeId);
        if (data) {
          setSectionsList(data);
        }
      } catch (err) {
        console.error('Failed to load sections:', err);
      }
    };
    fetchSections();
  }, [user?.collegeId]);

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'text/comma-separated-values',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFileSelected({
          uri: asset.uri,
          name: asset.name,
        });
        setReport(null);
        setParsedStudents([]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick file: ' + err.message);
    }
  };

  const handleUpload = async () => {
    if (!fileSelected) return;
    
    setValidating(true);
    try {
      // Read Excel/CSV file as base64
      const b64 = await FileSystem.readAsStringAsync(fileSelected.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const workbook = read(b64, {type: 'base64'});
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = utils.sheet_to_json(worksheet, {header: 1}) as any[][];
      
      if (rows.length < 2) {
        throw new Error('The spreadsheet is empty or has no data rows.');
      }

      // Identify header indexes
      const headers = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
      
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const rollIdx = headers.findIndex(h => h.includes('roll') || h.includes('rollno') || h.includes('id'));
      const streamIdx = headers.findIndex(h => h.includes('stream'));
      const sectionIdx = headers.findIndex(h => h.includes('section') || h.includes('class'));
      const mobileIdx = headers.findIndex(h => h.includes('student mobile') || h.includes('student phone') || (h.includes('mobile') && !h.includes('parent')));
      const parentMobileIdx = headers.findIndex(h => h.includes('parent mobile') || h.includes('parent phone') || h.includes('parent_mobile'));
      const yearIdx = headers.findIndex(h => h.includes('year'));

      if (nameIdx === -1 || rollIdx === -1 || mobileIdx === -1 || parentMobileIdx === -1 || sectionIdx === -1 || streamIdx === -1) {
        throw new Error(
          'Required columns not found. Ensure columns for "Name", "Roll Number", "Stream", "Section", "Mobile", and "Parent Mobile" exist in the first row.'
        );
      }

      // Map sections using a composite key: STREAM|YEAR|SECTION_NAME
      const sectionMap = sectionsList.reduce((acc: any, sec: any) => {
        const key = `${sec.stream.trim().toUpperCase()}|${sec.year}|${sec.name.trim().toUpperCase()}`;
        acc[key] = sec.id;
        return acc;
      }, {} as Record<string, string>);

      const studentsToValidate = [];
      const errors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) {
          continue; // Skip empty rows
        }

        const rowNum = i + 1;
        const name = String(row[nameIdx] || '').trim();
        const rollNumber = String(row[rollIdx] || '').trim();
        const streamStr = String(row[streamIdx] || '').trim().toUpperCase();
        const sectionName = String(row[sectionIdx] || '').trim().toUpperCase();
        const mobile = String(row[mobileIdx] || '').trim();
        const parentMobile = String(row[parentMobileIdx] || '').trim();
        const yearVal = yearIdx !== -1 ? parseInt(String(row[yearIdx])) : 1;

        if (!name) {
          errors.push(`Row ${rowNum}: Name is empty`);
          continue;
        }
        if (!rollNumber) {
          errors.push(`Row ${rowNum}: Roll Number is empty`);
          continue;
        }
        if (!mobile || mobile.length !== 10) {
          errors.push(`Row ${rowNum}: Invalid mobile number "${mobile}" (must be 10 digits)`);
          continue;
        }
        if (!parentMobile || parentMobile.length !== 10) {
          errors.push(`Row ${rowNum}: Invalid parent mobile number "${parentMobile}" (must be 10 digits)`);
          continue;
        }

        const validStreams = ['MPC', 'BiPC', 'MEC', 'CEC', 'HEC'];
        if (!validStreams.includes(streamStr)) {
          errors.push(`Row ${rowNum}: Invalid stream "${streamStr}". Must be one of: ${validStreams.join(', ')}`);
          continue;
        }

        if (yearVal !== 1 && yearVal !== 2) {
          errors.push(`Row ${rowNum}: Invalid year "${yearVal}". Must be 1 or 2`);
          continue;
        }

        // Section composite lookup
        const sectionKey = `${streamStr}|${yearVal}|${sectionName}`;
        const sectionId = sectionMap[sectionKey];

        if (!sectionId) {
          errors.push(
            `Row ${rowNum}: Section "${sectionName}" for ${streamStr} Year ${yearVal} does not exist in college dashboard`
          );
          continue;
        }

        studentsToValidate.push({
          name,
          rollNumber,
          stream: streamStr,
          year: yearVal,
          sectionId,
          mobile,
          parentMobile,
        });
      }

      setReport({
        successCount: studentsToValidate.length,
        errors,
      });
      setParsedStudents(studentsToValidate);

    } catch (err: any) {
      Alert.alert('Validation Error', err.message || 'Failed to parse the file.');
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedStudents.length === 0) return;
    
    setUploading(true);
    try {
      if (!user?.collegeId) throw new Error('College ID not found.');

      for (const student of parsedStudents) {
        // 1. Check or insert user record
        let newUserId = null;
        const {data: existingUser} = await db.users().select('*')
          .eq('college_id', user.collegeId)
          .eq('mobile', student.mobile)
          .eq('role', 'student')
          .maybeSingle();

        if (existingUser) {
          newUserId = existingUser.id;
        } else {
          const {data: userData, error: userError} = await db.users().insert({
            college_id: user.collegeId,
            role: 'student',
            mobile: student.mobile,
            is_active: true,
          }).select().single();

          if (userError) throw userError;
          if (userData) newUserId = userData.id;
        }

        if (!newUserId) throw new Error('Failed to associate user record.');

        // 2. Check duplicate roll number in same college
        const {data: existingStudent} = await db.students().select('id')
          .eq('college_id', user.collegeId)
          .eq('roll_number', student.rollNumber)
          .maybeSingle();

        if (existingStudent) {
          // Update existing student record
          const {error: updateError} = await db.students()
            .update({
              user_id: newUserId,
              name: student.name,
              mobile: student.mobile,
              parent_mobile: student.parentMobile,
              stream: student.stream,
              year: student.year,
              section_id: student.sectionId,
              status: 'active',
            })
            .eq('id', existingStudent.id);

          if (updateError) throw updateError;
        } else {
          // Insert new student record
          const {error: insertError} = await db.students()
            .insert({
              college_id: user.collegeId,
              user_id: newUserId,
              name: student.name,
              roll_number: student.rollNumber,
              mobile: student.mobile,
              parent_mobile: student.parentMobile,
              stream: student.stream,
              year: student.year,
              section_id: student.sectionId,
              status: 'active',
            });

          if (insertError) throw insertError;
        }
      }

      Alert.alert('Success', `Imported ${parsedStudents.length} students successfully.`);
      navigation.goBack();
    } catch (err: any) {
      console.error('Import Error:', err);
      Alert.alert('Import Failed', err.message || 'Error occurred during database insertion.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={Colors.gradients.adminHeader} style={styles.header}>
        <Text style={styles.title}>{t('students.bulkUpload')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.instructionsHeader}>Instructions</Text>
        <Text style={styles.instructionsText}>
          1. Download the Excel template below.{'\n'}
          2. Fill in the student details (Name, Roll Number, Stream, Section, Mobile, Parent Mobile).{'\n'}
          3. Upload the filled Excel sheet to import up to 500 students in one go.
        </Text>

        <TouchableOpacity style={styles.templateBtn}>
          <Text style={styles.templateBtnText}>⬇ Download Excel Template</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSelectFile} style={styles.uploadZone} activeOpacity={0.8}>
          <Text style={styles.uploadIcon}>📊</Text>
          <Text style={styles.uploadZoneTitle}>
            {fileSelected ? fileSelected.name : 'Tap to select Excel File'}
          </Text>
          <Text style={styles.uploadZoneSub}>Supports .xls, .xlsx files up to 5MB</Text>
        </TouchableOpacity>

        {fileSelected && !report && !validating && !uploading && (
          <TouchableOpacity onPress={handleUpload} style={styles.actionBtn}>
            <LinearGradient colors={Colors.gradients.primaryBlue} style={styles.actionBtnGradient}>
              <Text style={styles.actionBtnText}>Validate & Upload File</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {validating && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>⏳ Validating columns and check data types...</Text>
          </View>
        )}

        {uploading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>⚙ Importing students into database...</Text>
          </View>
        )}

        {report && (
          <View style={styles.reportContainer}>
            <Text style={styles.reportHeader}>Validation Report</Text>
            <Text style={styles.reportSuccess}>
              ✅ {report.successCount} students ready to import.
            </Text>
            
            {report.errors.length > 0 && (
              <View style={styles.errorSection}>
                <Text style={styles.errorTitle}>Warnings & Errors ({report.errors.length}):</Text>
                {report.errors.map((err, idx) => (
                  <Text key={idx} style={styles.errorText}>⚠️ {err}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={handleConfirmImport} style={styles.confirmBtn}>
              <LinearGradient colors={Colors.gradients.successGreen} style={styles.actionBtnGradient}>
                <Text style={styles.actionBtnText}>Confirm & Import {report.successCount} Students</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
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
  instructionsHeader: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.textPrimary, marginBottom: 8},
  instructionsText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, marginBottom: Spacing.md},
  templateBtn: {height: 40, borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg},
  templateBtnText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.primary},
  uploadZone: {backgroundColor: Colors.surface, height: 180, borderRadius: BorderRadius.xl, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.borderDark, alignItems: 'center', justifyContent: 'center', padding: Spacing.base, marginBottom: Spacing.lg, ...Shadow.sm},
  uploadIcon: {fontSize: 44, marginBottom: 8},
  uploadZoneTitle: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary, textAlign: 'center'},
  uploadZoneSub: {fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textTertiary, marginTop: 4},
  actionBtn: {borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.base},
  actionBtnGradient: {height: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.base},
  actionBtnText: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.white},
  loadingContainer: {padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, alignItems: 'center', ...Shadow.sm},
  loadingText: {fontFamily: FontFamily.medium, fontSize: FontSize.base, color: Colors.textSecondary},
  reportContainer: {backgroundColor: Colors.surface, padding: Spacing.base, borderRadius: BorderRadius.xl, ...Shadow.sm},
  reportHeader: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: Spacing.md},
  reportSuccess: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.success, marginBottom: Spacing.md},
  errorSection: {backgroundColor: Colors.dangerSurface, padding: 12, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.dangerBorder},
  errorTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.dangerDark, marginBottom: 6},
  errorText: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4},
  confirmBtn: {borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.md},
});

export default BulkUploadScreen;
