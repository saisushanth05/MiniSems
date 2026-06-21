// Mini Sems — User Management Screen (Admin)
// Bulk-upload students & faculty via a single CSV / Excel file
// CSV format: Type, Name, Mobile, Roll_Number, Parent_Mobile, Stream, Year, Email, Qualification

import React, {useState} from 'react';
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {read, utils} from 'xlsx';
import Toast from 'react-native-toast-message';

type ParsedUser =
  | {
      type: 'student';
      name: string;
      mobile: string;
      rollNumber: string;
      parentMobile: string;
      stream: string;
      year: number;
    }
  | {
      type: 'faculty';
      name: string;
      mobile: string;
      email: string;
      qualification: string;
    };

const VALID_STREAMS = ['MPC', 'BIPC', 'MEC', 'CEC', 'HEC'];

const CSV_TEMPLATE = `Type,Name,Mobile,Roll_Number,Parent_Mobile,Stream,Year,Email,Qualification
student,Ravi Kumar,9876543210,ROLL001,9123456789,MPC,1,,
student,Priya Sharma,9876543211,ROLL002,9123456780,BiPC,2,,
faculty,Dr. Anitha Rao,9876543212,,,,,anitha@college.edu,M.Sc B.Ed
faculty,Suresh Babu,9876543213,,,,,,M.Tech`;

const UserManagement: React.FC = () => {
  const navigation = useNavigation();
  const {user} = useAuthStore();

  const [fileSelected, setFileSelected] = useState<{uri: string; name: string} | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [validated, setValidated] = useState(false);

  const studentCount = parsedUsers.filter(u => u.type === 'student').length;
  const facultyCount = parsedUsers.filter(u => u.type === 'faculty').length;

  const handleSelectFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setFileSelected({uri: asset.uri, name: asset.name});
        setParsedUsers([]);
        setErrors([]);
        setValidated(false);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to pick file: ' + err.message);
    }
  };

  const parseCSVText = (text: string): string[][] => {
    const lines = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
    return lines.map(line => {
      const cols: string[] = [];
      let cur = '';
      let inQ = false;
      for (const ch of line) {
        if (ch === '"') { inQ = !inQ; continue; }
        if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
        cur += ch;
      }
      cols.push(cur.trim());
      return cols;
    });
  };

  const handleValidate = async () => {
    if (!fileSelected) return;
    setValidating(true);
    setParsedUsers([]);
    setErrors([]);
    setValidated(false);
    try {
      const isExcel = fileSelected.name.endsWith('.xlsx') || fileSelected.name.endsWith('.xls');
      let rows: any[][];

      if (isExcel) {
        const b64 = await FileSystem.readAsStringAsync(fileSelected.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const wb = read(b64, {type: 'base64'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        rows = utils.sheet_to_json(ws, {header: 1}) as any[][];
      } else {
        const text = await FileSystem.readAsStringAsync(fileSelected.uri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        rows = parseCSVText(text);
      }

      if (rows.length < 2) throw new Error('File has no data rows.');

      // Detect header
      const headerRow = rows[0].map((h: any) => String(h ?? '').trim().toLowerCase());
      const col = (name: string) => headerRow.findIndex(h => h.includes(name));

      const typeIdx = col('type');
      const nameIdx = col('name');
      const mobileIdx = headerRow.findIndex(h =>
        (h.includes('mobile') || h.includes('phone')) && !h.includes('parent')
      );
      const rollIdx = col('roll');
      const parentIdx = headerRow.findIndex(h => h.includes('parent'));
      const streamIdx = col('stream');
      const yearIdx = col('year');
      const emailIdx = col('email');
      const qualIdx = col('qualif');

      if (typeIdx === -1 || nameIdx === -1 || mobileIdx === -1) {
        throw new Error(
          'Required columns missing.\nNeeded: Type, Name, Mobile\nOptional: Roll_Number, Parent_Mobile, Stream, Year, Email, Qualification'
        );
      }

      const users: ParsedUser[] = [];
      const rowErrors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((c: any) => !c)) continue;

        const rowNum = i + 1;
        const get = (idx: number) => String(row[idx] ?? '').trim();

        const type = get(typeIdx).toLowerCase();
        const name = get(nameIdx);
        const mobile = get(mobileIdx).replace(/\s/g, '');
        const roll = rollIdx >= 0 ? get(rollIdx).toUpperCase() : '';
        const parentMobile = parentIdx >= 0 ? get(parentIdx).replace(/\s/g, '') : '';
        const stream = streamIdx >= 0 ? get(streamIdx).toUpperCase() : '';
        const year = yearIdx >= 0 ? parseInt(get(yearIdx)) || 1 : 1;
        const email = emailIdx >= 0 ? get(emailIdx) : '';
        const qualification = qualIdx >= 0 ? get(qualIdx) : '';

        if (!name) { rowErrors.push(`Row ${rowNum}: Name is empty`); continue; }
        if (!/^\d{10}$/.test(mobile)) {
          rowErrors.push(`Row ${rowNum}: Mobile "${mobile}" must be exactly 10 digits`);
          continue;
        }

        if (type === 'student') {
          if (!roll) { rowErrors.push(`Row ${rowNum}: Roll_Number is required for students`); continue; }
          if (!VALID_STREAMS.includes(stream.replace('BIPC', 'BiPC'))) {
            rowErrors.push(`Row ${rowNum}: Stream "${stream}" invalid. Must be: ${VALID_STREAMS.join(', ')}`);
            continue;
          }
          if (year !== 1 && year !== 2) {
            rowErrors.push(`Row ${rowNum}: Year must be 1 or 2`);
            continue;
          }
          if (parentMobile && !/^\d{10}$/.test(parentMobile)) {
            rowErrors.push(`Row ${rowNum}: Parent_Mobile "${parentMobile}" must be 10 digits`);
            continue;
          }
          users.push({
            type: 'student',
            name,
            mobile,
            rollNumber: roll,
            parentMobile: parentMobile || mobile,
            stream: stream === 'BIPC' ? 'BiPC' : stream,
            year,
          });
        } else if (type === 'faculty') {
          users.push({type: 'faculty', name, mobile, email, qualification});
        } else {
          rowErrors.push(`Row ${rowNum}: Type "${type}" is invalid. Must be "student" or "faculty"`);
        }
      }

      setParsedUsers(users);
      setErrors(rowErrors);
      setValidated(true);

      if (users.length === 0 && rowErrors.length === 0) {
        Alert.alert('Empty File', 'No valid rows found in the file.');
      }
    } catch (err: any) {
      Alert.alert('Validation Error', err.message || 'Failed to parse file.');
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (parsedUsers.length === 0 || !user?.collegeId) return;
    setImporting(true);

    let successCount = 0;
    const importErrors: string[] = [];

    try {
      for (const u of parsedUsers) {
        try {
          const mobileWithCode = `+91${u.mobile}`;

          // Upsert user account
          const existingUser = await db.users()
            .select('id')
            .eq('college_id', user.collegeId)
            .eq('mobile', mobileWithCode)
            .eq('role', u.type)
            .maybeSingle();

          let userId: string;

          if (existingUser.data?.id) {
            userId = existingUser.data.id;
          } else {
            const {data: newUser, error: uErr} = await db.users().insert({
              college_id: user.collegeId,
              role: u.type,
              mobile: mobileWithCode,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).select('id').single();

            if (uErr) throw new Error(uErr.message);
            userId = newUser!.id;
          }

          if (u.type === 'student') {
            const existStd = await db.students()
              .select('id')
              .eq('college_id', user.collegeId)
              .eq('roll_number', u.rollNumber)
              .maybeSingle();

            if (existStd.data?.id) {
              await db.students().update({
                user_id: userId,
                name: u.name,
                mobile: mobileWithCode,
                parent_mobile: `+91${u.parentMobile}`,
                stream: u.stream,
                year: u.year,
                status: 'active',
                updated_at: new Date().toISOString(),
              }).eq('id', existStd.data.id);
            } else {
              const {error: sErr} = await db.students().insert({
                college_id: user.collegeId,
                user_id: userId,
                roll_number: u.rollNumber,
                name: u.name,
                mobile: mobileWithCode,
                parent_mobile: `+91${u.parentMobile}`,
                stream: u.stream,
                year: u.year,
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              if (sErr) throw new Error(sErr.message);
            }
          } else {
            // Faculty
            const existFac = await db.faculty()
              .select('id')
              .eq('college_id', user.collegeId)
              .eq('mobile', mobileWithCode)
              .maybeSingle();

            if (existFac.data?.id) {
              await db.faculty().update({
                user_id: userId,
                name: u.name,
                email: u.email || null,
                qualification: u.qualification || null,
                is_active: true,
                updated_at: new Date().toISOString(),
              }).eq('id', existFac.data.id);
            } else {
              const {error: fErr} = await db.faculty().insert({
                college_id: user.collegeId,
                user_id: userId,
                name: u.name,
                mobile: mobileWithCode,
                email: u.email || null,
                qualification: u.qualification || null,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              });
              if (fErr) throw new Error(fErr.message);
            }
          }

          successCount++;
        } catch (err: any) {
          importErrors.push(`${u.name} (${u.mobile}): ${err.message}`);
        }
      }

      if (successCount > 0) {
        Toast.show({
          type: 'success',
          text1: `✅ Imported ${successCount} users`,
          text2: importErrors.length > 0
            ? `${importErrors.length} failed — see errors below`
            : 'All users can now log in via OTP',
        });
      }

      if (importErrors.length > 0) {
        setErrors(importErrors);
      } else {
        // Reset and go back on full success
        setTimeout(() => navigation.goBack(), 1500);
      }

    } catch (err: any) {
      Alert.alert('Import Failed', err.message || 'Unexpected error during import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1E3A8A', '#2563EB']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👥 Bulk User Upload</Text>
        <Text style={styles.headerSub}>
          Import students & faculty from a single CSV / Excel file
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 CSV Format</Text>
          <Text style={styles.instrText}>
            Your file must have these columns in the first row:{'\n'}
            <Text style={styles.mono}>
              Type, Name, Mobile, Roll_Number, Parent_Mobile, Stream, Year, Email, Qualification
            </Text>
            {'\n\n'}
            • <Text style={styles.bold}>Type</Text>: <Text style={styles.mono}>student</Text> or <Text style={styles.mono}>faculty</Text>{'\n'}
            • <Text style={styles.bold}>Mobile</Text>: 10-digit number (login credential){'\n'}
            • <Text style={styles.bold}>Roll_Number</Text>: required for students only{'\n'}
            • <Text style={styles.bold}>Stream</Text>: MPC / BiPC / MEC / CEC / HEC{'\n'}
            • <Text style={styles.bold}>Year</Text>: 1 or 2{'\n'}
            • Email & Qualification are optional (faculty)
          </Text>

          {/* Template preview */}
          <View style={styles.templateBox}>
            <Text style={styles.templateLabel}>📄 Example rows:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.templateText}>{CSV_TEMPLATE}</Text>
            </ScrollView>
          </View>
        </View>

        {/* File picker */}
        <TouchableOpacity
          onPress={handleSelectFile}
          style={[
            styles.uploadZone,
            fileSelected && !validated ? styles.uploadZonePending : null,
            validated ? styles.uploadZoneDone : null,
          ]}
          activeOpacity={0.8}>
          <Text style={styles.uploadIcon}>
            {validated ? '✅' : fileSelected ? '📋' : '📂'}
          </Text>
          <Text style={styles.uploadTitle}>
            {fileSelected ? fileSelected.name : 'Tap to select CSV or Excel file'}
          </Text>
          <Text style={styles.uploadSub}>
            {validated
              ? `${studentCount} students + ${facultyCount} faculty ready`
              : 'Supports .csv, .xls, .xlsx'}
          </Text>
        </TouchableOpacity>

        {/* Validate button */}
        {fileSelected && !validated && (
          <TouchableOpacity
            onPress={handleValidate}
            disabled={validating}
            style={styles.primaryBtn}>
            <LinearGradient colors={['#1E3A8A', '#2563EB']} style={styles.btnGrad}>
              {validating
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnText}>⚙ Validate File</Text>}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Validation report */}
        {validated && (
          <View style={styles.reportBox}>
            <Text style={styles.reportTitle}>Validation Report</Text>

            {parsedUsers.length > 0 && (
              <View style={styles.summaryRow}>
                <View style={[styles.chip, styles.chipStudent]}>
                  <Text style={styles.chipText}>🎓 {studentCount} Students</Text>
                </View>
                <View style={[styles.chip, styles.chipFaculty]}>
                  <Text style={styles.chipText}>👨‍🏫 {facultyCount} Faculty</Text>
                </View>
              </View>
            )}

            {/* Preview first 5 */}
            {parsedUsers.slice(0, 5).map((u, i) => (
              <View key={i} style={styles.previewRow}>
                <Text style={styles.previewBadge}>
                  {u.type === 'student' ? '🎓' : '👨‍🏫'}
                </Text>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>{u.name}</Text>
                  <Text style={styles.previewMeta}>
                    📱 {u.mobile}
                    {u.type === 'student' ? ` · ${u.rollNumber} · ${u.stream} Y${u.year}` : ''}
                  </Text>
                </View>
              </View>
            ))}
            {parsedUsers.length > 5 && (
              <Text style={styles.moreText}>+ {parsedUsers.length - 5} more users...</Text>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>⚠️ {errors.length} validation warnings:</Text>
                {errors.slice(0, 8).map((e, i) => (
                  <Text key={i} style={styles.errorItem}>• {e}</Text>
                ))}
                {errors.length > 8 && (
                  <Text style={styles.errorItem}>...and {errors.length - 8} more</Text>
                )}
              </View>
            )}

            {/* Re-pick */}
            <TouchableOpacity
              onPress={() => {setFileSelected(null); setParsedUsers([]); setErrors([]); setValidated(false);}}
              style={styles.rePick}>
              <Text style={styles.rePickText}>↩ Choose Different File</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Import button */}
        {validated && parsedUsers.length > 0 && (
          <TouchableOpacity onPress={handleImport} disabled={importing} style={styles.primaryBtn}>
            <LinearGradient colors={['#16A34A', '#22C55E']} style={styles.btnGrad}>
              {importing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.btnText}>
                    ✅ Import {parsedUsers.length} Users ({studentCount} students + {facultyCount} faculty)
                  </Text>}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Post-import errors */}
        {importing === false && errors.length > 0 && validated && parsedUsers.length === 0 && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Import errors:</Text>
            {errors.map((e, i) => <Text key={i} style={styles.errorItem}>• {e}</Text>)}
          </View>
        )}

        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            🔑 Each user's <Text style={styles.bold}>mobile number becomes their login ID</Text>.
            They receive a real OTP when logging in. Exams are automatically visible only to
            students in this college.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {padding: Spacing.xl, paddingBottom: Spacing.lg},
  backBtn: {marginBottom: Spacing.sm},
  backText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: 'rgba(255,255,255,0.9)'},
  headerTitle: {fontFamily: FontFamily.bold, fontSize: FontSize['2xl'], color: Colors.white},
  headerSub: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4},
  scroll: {padding: Spacing.base, paddingBottom: 60},
  section: {marginBottom: Spacing.base},
  sectionTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: Spacing.sm},
  instrText: {fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22},
  mono: {fontFamily: 'monospace', fontSize: FontSize.xs, backgroundColor: Colors.surfaceVariant},
  bold: {fontFamily: FontFamily.bold, color: Colors.textPrimary},
  templateBox: {backgroundColor: Colors.surfaceVariant, borderRadius: BorderRadius.lg, padding: Spacing.sm, marginTop: Spacing.sm},
  templateLabel: {fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 4},
  templateText: {fontFamily: 'monospace', fontSize: FontSize.xs, color: Colors.textPrimary, lineHeight: 18},
  uploadZone: {
    backgroundColor: Colors.surface,
    minHeight: 130,
    borderRadius: BorderRadius.xl,
    borderStyle: 'dashed',
    borderWidth: 2,
    borderColor: Colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Shadow.sm,
  },
  uploadZonePending: {borderColor: Colors.primary, backgroundColor: Colors.primarySurface},
  uploadZoneDone: {borderColor: Colors.success, backgroundColor: Colors.successSurface},
  uploadIcon: {fontSize: 40, marginBottom: 8},
  uploadTitle: {fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.textPrimary, textAlign: 'center'},
  uploadSub: {fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4},
  primaryBtn: {borderRadius: BorderRadius.xl, overflow: 'hidden', marginBottom: Spacing.md},
  btnGrad: {height: 52, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.base},
  btnText: {fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.white, textAlign: 'center'},
  reportBox: {backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.base, marginBottom: Spacing.md, ...Shadow.sm},
  reportTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.textPrimary, marginBottom: Spacing.sm},
  summaryRow: {flexDirection: 'row', gap: 10, marginBottom: Spacing.sm},
  chip: {paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.full},
  chipStudent: {backgroundColor: Colors.primarySurface},
  chipFaculty: {backgroundColor: Colors.successSurface},
  chipText: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.textPrimary},
  previewRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderLight},
  previewBadge: {fontSize: 20, marginRight: 10},
  previewInfo: {flex: 1},
  previewName: {fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.textPrimary},
  previewMeta: {fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2},
  moreText: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm},
  errorBox: {backgroundColor: Colors.dangerSurface, borderRadius: BorderRadius.lg, padding: Spacing.sm, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.dangerBorder},
  errorTitle: {fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.dangerDark, marginBottom: 4},
  errorItem: {fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.textSecondary, marginBottom: 3},
  rePick: {marginTop: Spacing.sm, alignItems: 'center'},
  rePickText: {fontFamily: FontFamily.semiBold, fontSize: FontSize.xs, color: Colors.primary, textDecorationLine: 'underline'},
  noticeBox: {backgroundColor: Colors.primarySurface, borderLeftWidth: 4, borderLeftColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.sm, marginTop: Spacing.sm},
  noticeText: {fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: Colors.textSecondary, lineHeight: 18},
});

export default UserManagement;
