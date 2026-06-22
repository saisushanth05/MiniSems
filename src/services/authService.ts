// Mini Sems — Auth Service
// OTP-based authentication using otp_logs table (no edge functions required)

import {supabase, db} from './supabase';
import DeviceInfo from 'react-native-device-info';
import {MMKV} from 'react-native-mmkv';
import type {OTPVerifyRequest, OTPVerifyResponse, AuthUser, LoginRequest} from '@apptypes/user.types';
import type {ApiResponse} from '@apptypes/database.types';

// ── MMKV-persisted OTP cache (survives navigation & React re-renders) ──
// Using MMKV instead of plain JS object ensures OTP persists during the
// Login → OTP screen transition (module may be reloaded in dev mode).
const otpStorage = new MMKV({id: 'otp-cache'});

interface CachedOTP {
  otp: string;
  expiresAt: number;
  attempts: number;
}

const memoryOTPCache = new Map<string, CachedOTP>();

const otpCache = {
  set: (mobile: string, data: CachedOTP) => {
    memoryOTPCache.set(mobile, data);
    try {
      otpStorage.set(mobile, JSON.stringify(data));
    } catch (e) {
      console.warn('[AUTH] MMKV set failed:', e);
    }
  },
  get: (mobile: string): CachedOTP | null => {
    if (memoryOTPCache.has(mobile)) {
      return memoryOTPCache.get(mobile)!;
    }
    try {
      const raw = otpStorage.getString(mobile);
      if (!raw) return null;
      const data = JSON.parse(raw) as CachedOTP;
      memoryOTPCache.set(mobile, data);
      return data;
    } catch {
      return null;
    }
  },
  delete: (mobile: string) => {
    memoryOTPCache.delete(mobile);
    try {
      otpStorage.delete(mobile);
    } catch (e) {
      console.warn('[AUTH] MMKV delete failed:', e);
    }
  },
};

// ── Demo mobile numbers (seeded accounts – use OTP 123456) ──
const DEMO_MOBILES = ['9999999999', '8888888888', '7777777777'];

// ── Generate a 6-digit OTP ──
const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ── Send OTP ──
// Stores OTP in MMKV cache & attempts storing in otp_logs table
export const sendOTP = async (
  request: LoginRequest,
): Promise<ApiResponse<{message: string; expiresIn: number; otp?: string}>> => {
  // Demo bypass for seeded test accounts
  if (DEMO_MOBILES.includes(request.mobile)) {
    return {
      data: {message: 'Demo account: use OTP 123456', expiresIn: 300, otp: '123456'},
      error: null,
    };
  }

  try {
    const mobile = request.mobile.startsWith('+91')
      ? request.mobile
      : `+91${request.mobile}`;

    const otp = generateOTP();
    const expiresAtMs = Date.now() + 5 * 60 * 1000; // 5 minutes
    const expiresAtISO = new Date(expiresAtMs).toISOString();

    // Store in MMKV-persisted cache (reliable across navigation)
    otpCache.set(mobile, {otp, expiresAt: expiresAtMs, attempts: 0});

    // Also attempt storing OTP in otp_logs (best effort; may fail due to RLS)
    try {
      await db.otpLogs().insert({
        mobile,
        otp_hash: otp,
        purpose: 'login',
        is_verified: false,
        attempts: 0,
        expires_at: expiresAtISO,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('[AUTH] DB OTP log insert failed (likely RLS):', e?.message || e);
    }

    // Try sending real SMS via edge function (non-blocking – best effort)
    supabase.functions
      .invoke('send-otp', {body: {mobile, otp}})
      .catch(e => console.warn('[AUTH] SMS edge function not available:', e));

    // Log OTP to console for debugging / testing
    console.log(`[AUTH] Generated OTP for ${mobile}: ${otp}`);

    return {
      data: {
        message: `OTP sent to ${mobile}. Code: ${otp}`,
        expiresIn: 300,
        otp, // returned so OTPScreen can show the hint banner
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP';
    return {data: null, error: {message}};
  }
};

// ── Verify OTP & Login ──
// Verifies against MMKV cache (primary) or otp_logs table (fallback).
export const verifyOTPAndLogin = async (
  request: OTPVerifyRequest,
): Promise<ApiResponse<OTPVerifyResponse>> => {
  // Demo bypass for seeded test accounts
  if (DEMO_MOBILES.includes(request.mobile)) {
    if (request.otp === '123456') {
      const isStudent = request.role === 'student';
      const isFaculty = request.role === 'faculty';
      const isAdmin = request.role === 'admin';
      const isParent = request.role === 'parent';

      const userId = isStudent
        ? 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b'
        : isAdmin
        ? 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d8'
        : isFaculty
        ? 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
        : 'parent_demo_user_id';

      return {
        data: {
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
          isNewDevice: false,
          user: {
            id: userId,
            collegeId: 'd3b07384-d113-4c9b-8e12-421739c99182',
            role: request.role,
            mobile: request.mobile,
            name: isParent
              ? 'Demo Parent'
              : 'Demo ' + request.role.charAt(0).toUpperCase() + request.role.slice(1),
            rollNumber: request.rollNumber || (isStudent || isParent ? 'ROLL001' : undefined),
            studentId: (isStudent || isParent) ? 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b' : undefined,
            facultyId: isFaculty ? 'f47ac10b-58cc-4372-a567-0e02b2c3d479' : undefined,
            sectionId: (isStudent || isParent) ? 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' : undefined,
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: Date.now() + 3600000,
            deviceId: request.deviceId,
          },
        },
        error: null,
      };
    }
    return {data: null, error: {message: 'Invalid OTP! Demo accounts use 123456.'}};
  }

  try {
    const mobile = request.mobile.startsWith('+91')
      ? request.mobile
      : `+91${request.mobile}`;
    const mobileWithCode = mobile;
    const mobileRaw = request.mobile.startsWith('+91')
      ? request.mobile.slice(3)
      : request.mobile;

    console.log(`[AUTH] verifyOTPAndLogin: Checking OTP for mobile: ${mobile}, entered OTP: "${request.otp}" (type: ${typeof request.otp})`);

    let isVerified = false;

    // ── 1. Verify against MMKV-persisted cache (primary – always reliable) ──
    const cached = otpCache.get(mobile);
    console.log(`[AUTH] verifyOTPAndLogin: Cached OTP record:`, cached);

    if (cached) {
      if (cached.expiresAt < Date.now()) {
        console.log(`[AUTH] verifyOTPAndLogin: OTP has expired (Expires: ${cached.expiresAt}, Now: ${Date.now()})`);
        otpCache.delete(mobile);
        return {data: null, error: {message: 'OTP has expired. Please request a new OTP.'}};
      }

      cached.attempts += 1;

      if (cached.attempts > 5) {
        console.log(`[AUTH] verifyOTPAndLogin: Too many incorrect attempts (${cached.attempts})`);
        otpCache.delete(mobile);
        return {data: null, error: {message: 'Too many incorrect attempts. Please request a new OTP.'}};
      }

      if (cached.otp === request.otp) {
        console.log(`[AUTH] verifyOTPAndLogin: OTP matched successfully!`);
        isVerified = true;
        otpCache.delete(mobile); // consume OTP — one-time use
      } else {
        console.log(`[AUTH] verifyOTPAndLogin: OTP mismatch. Expected: "${cached.otp}", Got: "${request.otp}"`);
        // Update attempt count in cache
        otpCache.set(mobile, cached);
      }
    }

    // ── 2. Fall back to DB lookup if not found in MMKV cache ──
    if (!isVerified) {
      console.log(`[AUTH] verifyOTPAndLogin: Not verified via cache. Falling back to DB lookup for ${mobile}...`);
      try {
        const {data: otpLog, error: lookupError} = await db.otpLogs()
          .select('*')
          .eq('mobile', mobile)
          .eq('is_verified', false)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', {ascending: false})
          .limit(1)
          .maybeSingle();

        if (lookupError) {
          console.warn('[AUTH] DB OTP lookup error:', lookupError.message);
        }

        console.log(`[AUTH] verifyOTPAndLogin: DB OTP log response:`, otpLog);

        if (otpLog) {
          // Check max attempts
          if ((otpLog.attempts || 0) >= 5) {
            console.log(`[AUTH] verifyOTPAndLogin: Too many DB attempts (${otpLog.attempts})`);
            return {data: null, error: {message: 'Too many incorrect attempts. Please request a new OTP.'}};
          }

          // Increment attempts (swallow RLS update errors)
          try {
            await db.otpLogs()
              .update({attempts: (otpLog.attempts || 0) + 1})
              .eq('id', otpLog.id);
          } catch (_) {/* swallow RLS error */}

          if (otpLog.otp_hash === request.otp) {
            console.log(`[AUTH] verifyOTPAndLogin: OTP matched successfully via DB!`);
            isVerified = true;
            // Mark as verified
            try {
              await db.otpLogs()
                .update({is_verified: true, verified_at: new Date().toISOString()})
                .eq('id', otpLog.id);
            } catch (_) {/* swallow RLS error */}
          } else {
            console.log(`[AUTH] verifyOTPAndLogin: DB OTP mismatch. Expected: "${otpLog.otp_hash}", Got: "${request.otp}"`);
          }
        } else {
          console.log(`[AUTH] verifyOTPAndLogin: No active OTP found in DB for ${mobile}`);
        }
      } catch (dbErr: any) {
        console.warn('[AUTH] DB OTP fallback failed:', dbErr?.message || dbErr);
      }
    }

    if (!isVerified) {
      console.log(`[AUTH] verifyOTPAndLogin: OTP verification failed. Returning error.`);
      return {data: null, error: {message: 'Incorrect OTP. Please check and try again.'}};
    }

    // ── 3. Fetch the user/student record from DB ──
    let userRecord: any = null;
    let userErr: any = null;

    if (request.role === 'parent') {
      // Parents do not have direct user records in 'users' table, they are stored on students.
      // Lookup the student record by parent_mobile to verify they exist and get college details.
      let studentRecord = null;
      let stdErr = null;

      // Try with prefixed parent_mobile first
      let queryPref = db.students()
        .select('id, college_id, name, roll_number, mobile, parent_mobile, section_id')
        .eq('parent_mobile', mobileWithCode)
        .eq('status', 'active');
      if (request.rollNumber) queryPref = queryPref.eq('roll_number', request.rollNumber);

      const {data: prefData, error: prefErr} = await queryPref.maybeSingle();
      if (prefData) {
        studentRecord = prefData;
      } else {
        // Try with raw parent_mobile fallback
        let queryRaw = db.students()
          .select('id, college_id, name, roll_number, mobile, parent_mobile, section_id')
          .eq('parent_mobile', mobileRaw)
          .eq('status', 'active');
        if (request.rollNumber) queryRaw = queryRaw.eq('roll_number', request.rollNumber);

        const {data: rawData, error: rawErr} = await queryRaw.maybeSingle();
        studentRecord = rawData;
        stdErr = rawErr || prefErr;
      }

      if (stdErr) throw new Error(stdErr.message);
      if (!studentRecord) {
        return {
          data: null,
          error: {
            message: `No active student found linked to parent mobile number ${request.mobile}.`,
          },
        };
      }

      // Mock userRecord to satisfy session contract
      userRecord = {
        id: studentRecord.id, // using student ID as base
        college_id: studentRecord.college_id,
        role: 'parent',
        mobile: mobile,
        is_active: true,
      };
    } else {
      // Try fetching user with prefixed mobile format first
      const {data: prefData, error: prefErr} = await db.users()
        .select('*')
        .eq('mobile', mobileWithCode)
        .eq('role', request.role)
        .eq('is_active', true)
        .maybeSingle();

      if (prefData) {
        userRecord = prefData;
      } else {
        // Fallback to raw mobile format
        const {data: rawData, error: rawErr} = await db.users()
          .select('*')
          .eq('mobile', mobileRaw)
          .eq('role', request.role)
          .eq('is_active', true)
          .maybeSingle();

        userRecord = rawData;
        userErr = rawErr || prefErr;
      }
    }

    if (userErr) throw new Error(userErr.message);
    if (!userRecord) {
      return {
        data: null,
        error: {
          message: `No ${request.role} account found for this mobile number. Contact your admin.`,
        },
      };
    }

    // ── 4. Fetch role-specific profile ──
    let studentId: string | undefined;
    let facultyId: string | undefined;
    let sectionId: string | undefined;
    let collegeId = userRecord.college_id;
    let name = '';

    if (request.role === 'student') {
      const {data: student} = await db.students()
        .select('id, name, section_id, college_id')
        .eq('user_id', userRecord.id)
        .maybeSingle();
      if (student) {
        studentId = student.id;
        sectionId = student.section_id;
        collegeId = student.college_id;
        name = student.name;
      }
    } else if (request.role === 'parent') {
      // Find student details mapped to parent
      let queryPref = db.students()
        .select('id, name, section_id, college_id')
        .eq('parent_mobile', mobileWithCode);
      if (request.rollNumber) queryPref = queryPref.eq('roll_number', request.rollNumber);

      const {data: prefData} = await queryPref.maybeSingle();
      let student = prefData;

      if (!student) {
        let queryRaw = db.students()
          .select('id, name, section_id, college_id')
          .eq('parent_mobile', mobileRaw);
        if (request.rollNumber) queryRaw = queryRaw.eq('roll_number', request.rollNumber);
        const {data: rawData} = await queryRaw.maybeSingle();
        student = rawData;
      }

      if (student) {
        studentId = student.id;
        sectionId = student.section_id;
        collegeId = student.college_id;
        name = `${student.name}'s Parent`;
      }
    } else if (request.role === 'faculty') {
      const {data: faculty} = await db.faculty()
        .select('id, name, college_id')
        .eq('user_id', userRecord.id)
        .maybeSingle();
      if (faculty) {
        facultyId = faculty.id;
        collegeId = faculty.college_id;
        name = faculty.name;
      }
    } else if (request.role === 'admin' || request.role === 'super_admin') {
      name = 'Admin';
    }

    return {
      data: {
        accessToken: 'db-verified-token',
        refreshToken: 'db-verified-refresh',
        isNewDevice: false,
        user: {
          id: userRecord.id,
          collegeId,
          role: request.role,
          mobile: request.mobile,
          name,
          rollNumber: request.rollNumber,
          studentId,
          facultyId,
          sectionId,
          accessToken: 'db-verified-token',
          refreshToken: 'db-verified-refresh',
          expiresAt: Date.now() + 3600000,
          deviceId: request.deviceId,
        },
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OTP verification failed';
    return {data: null, error: {message}};
  }
};

// ── Get Device ID ──
export const getDeviceId = async (): Promise<string> => {
  try {
    return await DeviceInfo.getUniqueId();
  } catch {
    return `device_${Date.now()}`;
  }
};

// ── Get Device Info ──
export const getDeviceInfo = async () => {
  const [deviceId, model, systemVersion, appVersion] = await Promise.all([
    DeviceInfo.getUniqueId(),
    DeviceInfo.getModel(),
    DeviceInfo.getSystemVersion(),
    DeviceInfo.getVersion(),
  ]);
  return {deviceId, model, systemVersion, appVersion};
};

// ── Register Device ──
export const registerDevice = async (params: {
  collegeId: string;
  studentId: string;
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}): Promise<ApiResponse<boolean>> => {
  try {
    const {error} = await db.deviceRegistrations().upsert(
      {
        college_id: params.collegeId,
        student_id: params.studentId,
        device_id: params.deviceId,
        device_model: params.deviceModel,
        os_version: params.osVersion,
        app_version: params.appVersion,
        is_active: true,
        registered_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      },
      {onConflict: 'student_id,device_id'},
    );

    if (error) throw error;
    return {data: true, error: null};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Device registration failed';
    return {data: null, error: {message}};
  }
};

// ── Verify Device ──
export const verifyDevice = async (params: {
  studentId: string;
  deviceId: string;
  collegeId: string;
}): Promise<{isValid: boolean; isNewDevice: boolean}> => {
  try {
    const {data} = await db.deviceRegistrations()
      .select('*')
      .eq('student_id', params.studentId)
      .eq('college_id', params.collegeId)
      .eq('is_active', true)
      .single();

    if (!data) {
      return {isValid: true, isNewDevice: true};
    }

    if (data.device_id !== params.deviceId) {
      return {isValid: false, isNewDevice: false};
    }

    await db.deviceRegistrations()
      .update({last_used_at: new Date().toISOString()})
      .eq('id', data.id);

    return {isValid: true, isNewDevice: false};
  } catch {
    return {isValid: true, isNewDevice: true};
  }
};

// ── Invalidate Other Sessions ──
export const invalidateOtherSessions = async (userId: string): Promise<void> => {
  try {
    await supabase.functions.invoke('invalidate-sessions', {body: {userId}});
  } catch {
    // Non-critical — continue
  }
};

// ── Logout ──
export const logout = async (): Promise<void> => {
  await supabase.auth.signOut();
};

// ── Refresh Token ──
export const refreshSession = async (): Promise<boolean> => {
  try {
    const {data, error} = await supabase.auth.refreshSession();
    return !error && !!data.session;
  } catch {
    return false;
  }
};

// ── Get Current User Profile ──
export const getCurrentUserProfile = async (): Promise<ApiResponse<AuthUser>> => {
  try {
    const {data: session} = await supabase.auth.getSession();
    if (!session.session) {
      return {data: null, error: {message: 'No active session'}};
    }

    const {data: profile, error} = await supabase.functions.invoke('get-user-profile');
    if (error) throw error;

    return {data: profile as AuthUser, error: null};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to get user profile';
    return {data: null, error: {message}};
  }
};

// ── Audit log helper ──
export const logAuthAudit = async (params: {
  collegeId: string;
  userId: string;
  action: 'login' | 'logout' | 'otp_sent' | 'otp_verified' | 'session_terminated';
  deviceId?: string;
}): Promise<void> => {
  try {
    await db.auditLogs().insert({
      college_id: params.collegeId,
      user_id: params.userId,
      action: params.action,
      entity_type: 'auth',
      device_id: params.deviceId,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Non-critical
  }
};
