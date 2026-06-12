// Mini Sems — User/Auth Types

import {UserRole} from './database.types';

export interface AuthUser {
  id: string;
  collegeId: string;
  role: UserRole;
  mobile: string;
  name: string;
  profilePhotoUrl?: string;
  // Role-specific
  studentId?: string;
  facultyId?: string;
  rollNumber?: string;
  sectionId?: string;
  // Token
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  deviceId: string;
}

export interface LoginRequest {
  role: UserRole;
  mobile: string;
  rollNumber?: string;    // Required for student & parent
  collegeCode?: string;   // Optional — college identifier
}

export interface OTPVerifyRequest {
  mobile: string;
  otp: string;
  role: UserRole;
  rollNumber?: string;
  deviceId: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
}

export interface OTPVerifyResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  isNewDevice: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
