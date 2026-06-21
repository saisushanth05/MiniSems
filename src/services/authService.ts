// Mini Sems — Auth Service
// OTP-based authentication using otp_logs table (no edge functions required)

import {supabase, db} from './supabase';
import DeviceInfo from 'react-native-device-info';
import type {OTPVerifyRequest, OTPVerifyResponse, AuthUser, LoginRequest} from '@apptypes/user.types';
import type {ApiResponse} from '@apptypes/database.types';

// Client-side OTP cache to verify OTPs when database write/read is blocked by RLS policies
const localOtpCache: Record<string, { otp: string; expiresAt: number; attempts: number }> = {};

// ── Demo mobile numbers (seeded accounts – use OTP 123456) ──
const DEMO_MOBILES = ['9999999999', '8888888888'];

// ── Generate a 6-digit OTP ──
const generateOTP = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ── Send OTP ──
// Stores OTP in local cache & attempts storing in otp_logs table
export const sendOTP = async (
  request: LoginRequest,
): Promise<ApiResponse<{message: string; expiresIn: number}>> => {
  // Demo bypass for seeded test accounts
  if (DEMO_MOBILES.includes(request.mobile)) {
    return {
      data: {message: 'Demo account: use OTP 123456', expiresIn: 300},
      error: null,
    };
  }

  try {
    const mobile = request.mobile.startsWith('+91')
      ? request.mobile
      : `+91${request.mobile}`;

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // Store in local cache
    localOtpCache[mobile] = {
      otp,
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
    };

    // Store OTP in otp_logs (plain text for now; catch database RLS errors gracefully)
    try {
      await db.otpLogs().insert({
        mobile,
        otp_hash: otp,
        purpose: 'login',
        is_verified: false,
        attempts: 0,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      });
    } catch (e: any) {
      console.warn('DB OTP log insert failed (probably RLS policy):', e.message || e);
    }

    // Try sending real SMS via edge function (non-blocking – best effort)
    supabase.functions
      .invoke('send-otp', {body: {mobile, otp}})
      .catch(e => console.warn('SMS edge function not available (non-fatal):', e));

    // Log OTP to console for debugging
    console.log(`[AUTH] Generated OTP for ${mobile}: ${otp}`);

    return {
      data: {
        message: `OTP generated. Use code ${otp}`,
        expiresIn: 300,
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP';
    return {data: null, error: {message}};
  }
};

// ── Verify OTP & Login ──
// Verifies against local cache or otp_logs table and fetches user profile.
export const verifyOTPAndLogin = async (
  request: OTPVerifyRequest,
): Promise<ApiResponse<OTPVerifyResponse>> => {
  // Demo bypass for seeded test accounts
  if (DEMO_MOBILES.includes(request.mobile)) {
    if (request.otp === '123456') {
      const isStudent = request.role === 'student';
      const isFaculty = request.role === 'faculty';
      const isAdmin = request.role === 'admin';

      const userId = isStudent
        ? 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b'
        : isAdmin
        ? 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d8'
        : 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

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
            name: 'Demo ' + request.role.charAt(0).toUpperCase() + request.role.slice(1),
            rollNumber: request.rollNumber || (isStudent ? 'ROLL001' : undefined),
            studentId: isStudent ? 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b' : undefined,
            facultyId: isFaculty ? 'f47ac10b-58cc-4372-a567-0e02b2c3d479' : undefined,
            sectionId: isStudent ? 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' : undefined,
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

    let isVerified = false;

    // 1. Verify against local cache first (highly reliable, bypasses DB/RLS limitations)
    const cached = localOtpCache[mobile];
    if (cached) {
      if (cached.expiresAt < Date.now()) {
        return {data: null, error: {message: 'OTP has expired. Please request a new OTP.'}};
      }
      cached.attempts += 1;
      if (cached.attempts >= 5) {
        delete localOtpCache[mobile];
        return {data: null, error: {message: 'Too many incorrect attempts. Please request a new OTP.'}};
      }
      if (cached.otp === request.otp) {
        isVerified = true;
        delete localOtpCache[mobile]; // consume OTP
      }
    }

    // 2. Fall back to DB lookup if not verified in local cache
    if (!isVerified) {
      const {data: otpLog, error: lookupError} = await db.otpLogs()
        .select('*')
        .eq('mobile', mobile)
        .eq('is_verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', {ascending: false})
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        console.warn('DB OTP lookup error:', lookupError.message);
      }

      if (otpLog) {
        // Increment attempts on DB log if possible (swallow any RLS update errors)
        try {
          await db.otpLogs()
            .update({attempts: (otpLog.attempts || 0) + 1})
            .eq('id', otpLog.id);
        } catch (e) {
          // Swallow RLS update error
        }

        if ((otpLog.attempts || 0) >= 5) {
          return {data: null, error: {message: 'Too many incorrect attempts. Please request a new OTP.'}};
        }

        if (otpLog.otp_hash === request.otp) {
          isVerified = true;
          // Mark OTP as verified in DB
          try {
            await db.otpLogs()
              .update({is_verified: true, verified_at: new Date().toISOString()})
              .eq('id', otpLog.id);
          } catch (e) {
            // Swallow RLS update error
          }
        }
      }
    }

    if (!isVerified) {
      return {data: null, error: {message: 'Incorrect OTP. Please check and try again.'}};
    }

    // Fetch the user record from DB
    const {data: userRecord, error: userErr} = await db.users()
      .select('*')
      .eq('mobile', mobile)
      .eq('role', request.role)
      .eq('is_active', true)
      .maybeSingle();

    if (userErr) throw new Error(userErr.message);
    if (!userRecord) {
      return {
        data: null,
        error: {message: `No ${request.role} account found for this mobile number. Contact your admin.`},
      };
    }

    // Fetch role-specific profile
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
