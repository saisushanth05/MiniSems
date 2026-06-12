// Mini Sems — Bulk Upload Screen (Admin)

import React, {useState} from 'react';
import {
  SafeAreaView, StyleSheet, Text,
  TouchableOpacity, View, ScrollView, Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {Colors} from '@theme/colors';
import {FontFamily, FontSize} from '@theme/typography';
import {BorderRadius, Shadow, Spacing} from '@theme/spacing';
import {useTranslation} from 'react-i18next';

const BulkUploadScreen: React.FC = () => {
  const navigation = useNavigation();
  const {t} = useTranslation();
  const [fileSelected, setFileSelected] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<{successCount: number; errors: string[]} | null>(null);

  const handleSelectFile = () => {
    // Mock selecting an excel sheet
    setFileSelected('students_enrollment_2026.xlsx');
    setReport(null);
  };

  const handleUpload = () => {
    if (!fileSelected) return;
    
    setValidating(true);
    // Simulate validation and upload after 1.5s
    setTimeout(() => {
      setValidating(false);
      setUploading(true);
      
      setTimeout(() => {
        setUploading(false);
        setReport({
          successCount: 48,
          errors: [
            'Row 12: Invalid mobile number format for "Rohan Yadav"',
            'Row 24: Duplicate roll number "24021A0512"',
          ],
        });
      }, 1000);
    }, 1500);
  };

  const handleConfirmImport = () => {
    Alert.alert('Success', 'Imported 48 students successfully.');
    navigation.goBack();
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

        {/* Upload Zone */}
        <TouchableOpacity onPress={handleSelectFile} style={styles.uploadZone} activeOpacity={0.8}>
          <Text style={styles.uploadIcon}>📊</Text>
          <Text style={styles.uploadZoneTitle}>
            {fileSelected ? fileSelected : 'Tap to select Excel File'}
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
