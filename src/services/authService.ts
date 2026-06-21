// Mini Sems — Auth Service
// OTP-based authentication for all 4 roles

import {supabase, db} from './supabase';
import DeviceInfo from 'react-native-device-info';
import type {OTPVerifyRequest, OTPVerifyResponse, AuthUser, LoginRequest} from '@apptypes/user.types';
import type {ApiResponse} from '@apptypes/database.types';

// ── Send OTP ──
export const sendOTP = async (
  request: LoginRequest,
): Promise<ApiResponse<{message: string; expiresIn: number}>> => {
  // Demo bypass ONLY for seeded test accounts
  const isDemoNumber = request.mobile === '9999999999' || request.mobile === '8888888888';
  if (isDemoNumber) {
    console.log('Demo account: Bypassing real OTP send');
    return {
      data: { message: 'OTP sent (Demo mode — use 123456)', expiresIn: 300 },
      error: null,
    };
  }

  try {
    const {data, error} = await supabase.functions.invoke('send-otp', {
      body: {
        mobile: request.mobile,
        role: request.role,
        rollNumber: request.rollNumber,
      },
    });

    if (error) throw error;
    return {data, error: null};
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to send OTP';
    return {data: null, error: {message}};
  }
};

// ── Verify OTP & Login ──
export const verifyOTPAndLogin = async (
  request: OTPVerifyRequest,
): Promise<ApiResponse<OTPVerifyResponse>> => {
  // Demo bypass ONLY for seeded test accounts (use OTP 123456)
  const isDemoNumber = request.mobile === '9999999999' || request.mobile === '8888888888';
  if (isDemoNumber) {
    console.log('Demo account: Bypassing real OTP verification');
    if (request.otp === '123456') {
      const isStudent = request.role === 'student';
      const isFaculty = request.role === 'faculty';
      const isAdmin = request.role === 'admin';
      
      const userId = isStudent 
        ? 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b' 
        : (isAdmin ? 'a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d8' : 'f47ac10b-58cc-4372-a567-0e02b2c3d479');
      
      const studentId = isStudent ? 'e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b' : undefined;
      const facultyId = isFaculty ? 'f47ac10b-58cc-4372-a567-0e02b2c3d479' : undefined;
      const sectionId = isStudent ? 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e' : undefined;

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
            studentId,
            facultyId,
            sectionId,
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            expiresAt: Date.now() + 3600000,
            deviceId: request.deviceId,
          },
        },
        error: null,
      };
    } else {
      return { data: null, error: { message: 'Invalid OTP! For demo accounts, use 123456.' } };
    }
  }

  try {
    const {data, error} = await supabase.functions.invoke('verify-otp-login', {
      body: request,
    });

    if (error) throw error;

    if (data?.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    return {data, error: null};
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

    // Update last_used_at
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
