// Mini Sems — Navigation Types

export type RootStackParamList = {
  Splash: undefined;
  RoleSelect: undefined;
  Login: {role: 'admin' | 'faculty' | 'student' | 'parent'};
  OTP: {
    mobile: string;
    role: 'admin' | 'faculty' | 'student' | 'parent';
    rollNumber?: string;
  };
  AdminRoot: undefined;
  FacultyRoot: undefined;
  StudentRoot: undefined;
  ParentRoot: undefined;
};

// Admin Navigation
export type AdminTabParamList = {
  Dashboard: undefined;
  Students: undefined;
  Faculty: undefined;
  Calendar: undefined;
  Reports: undefined;
};

export type AdminStackParamList = {
  AdminTabs: undefined;
  AddStudent: {studentId?: string};
  AddFaculty: {facultyId?: string};
  CreateExam: undefined;
  ExamDetail: {examId: string};
  StudentDetail: {studentId: string};
  FacultyDetail: {facultyId: string};
  BulkUpload: undefined;
  ReportDetail: {reportType: string; examId?: string};
  Profile: undefined;
};

// Faculty Navigation
export type FacultyTabParamList = {
  Dashboard: undefined;
  Questions: undefined;
  Exams: undefined;
  Monitor: undefined;
  Results: undefined;
};

export type FacultyStackParamList = {
  FacultyTabs: undefined;
  QuestionBuilder: {questionId?: string};
  ExamBuilder: {examId?: string; step?: number};
  ExamMonitor: {examId: string};
  ResultDetail: {examId: string};
  QuestionPreview: {questionId: string};
  Profile: undefined;
};

// Student Navigation
export type StudentStackParamList = {
  StudentDashboard: undefined;
  ExamLobby: {examId: string};
  ExamInterface: {examId: string; sessionId: string};
  ExamResult: {sessionId: string; examId: string};
  MyPerformance: undefined;
  ExamHistory: undefined;
  Profile: undefined;
};

// Parent Navigation
export type ParentStackParamList = {
  ParentDashboard: undefined;
  StudentReport: {examId?: string};
  ExamSchedule: undefined;
};
