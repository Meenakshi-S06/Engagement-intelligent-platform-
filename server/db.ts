// server/db.ts
// In-memory data store seeded with HOPE platform domain records,
// mirroring the Prisma models and permission catalog.

export const ROLES = [
  'STUDENT',
  'TRAINER',
  'FACULTY',
  'MENTOR',
  'COORDINATOR',
  'ADMIN',
] as const;

export type RoleName = (typeof ROLES)[number];

export const ROLE_PERMISSIONS: Record<RoleName, string[]> = {
  STUDENT: [
    'users:read:own',
    'users:update:self',
    'batches:read:own',
    'sessions:read:own',
    'attendance:mark:self',
    'attendance:read:own',
    'assessments:read:own',
    'feedback:read:own_received',
    'mentor_assignments:read:own',
    'risk_scores:read:own',
    'interventions:read:own',
    'notifications:read:own',
    'events:read:any',
    'event_registrations:create:self',
    'event_registrations:read:own',
    'proofs:submit:self',
    'proofs:read:own',
    'tasks:read:own',
    'tasks:update:own',
  ],
  TRAINER: [
    'users:read:own',
    'users:update:self',
    'batches:read:own',
    'sessions:create:batch',
    'sessions:update:batch',
    'sessions:read:own',
    'attendance:mark:batch',
    'attendance:read:batch',
    'attendance:update:batch',
    'attendance:export',
    'assessments:create:batch',
    'assessments:read:batch',
    'assessments:update:batch',
    'feedback:create:batch',
    'feedback:read:own_given',
    'risk_scores:read:category:batch',
    'risk_scores:calculate:batch',
    'notifications:read:own',
    'events:read:any',
    'proofs:read:batch',
    'proofs:approve:batch',
    'tasks:create:batch',
    'tasks:read:batch',
    'tasks:update:batch',
    'tasks:delete:batch',
    'tasks:grade:batch',
  ],
  FACULTY: [
    'users:read:own',
    'users:update:self',
    'users:read:any',
    'batches:read:any',
    'sessions:read:any',
    'attendance:read:any',
    'attendance:export',
    'assessments:read:any',
    'feedback:read:any',
    'mentor_assignments:read:any',
    'risk_scores:read:any',
    'interventions:read:any',
    'notifications:read:own',
    'events:read:any',
    'tasks:read:any',
  ],
  MENTOR: [
    'users:read:own',
    'users:update:self',
    'users:read:assigned',
    'batches:read:assigned',
    'sessions:read:assigned',
    'attendance:read:assigned',
    'assessments:read:assigned',
    'feedback:read:assigned',
    'mentor_assignments:read:own',
    'risk_scores:read:assigned',
    'interventions:create:assigned',
    'interventions:update:own',
    'interventions:log_outcome:own',
    'interventions:read:assigned',
    'notifications:read:own',
    'events:read:any',
  ],
  COORDINATOR: [
    'users:read:own',
    'users:update:self',
    'users:read:any',
    'batches:read:any',
    'sessions:read:any',
    'attendance:read:any',
    'attendance:export',
    'assessments:read:any',
    'risk_scores:read:any',
    'notifications:read:own',
    'events:create',
    'events:update:any',
    'events:read:any',
    'event_registrations:read:any',
    'proofs:read:any',
    'proofs:approve:any',
  ],
  ADMIN: [
    'users:create',
    'users:read:own',
    'users:update:self',
    'users:read:any',
    'users:update:any',
    'users:change_role',
    'users:activate',
    'users:recover_account',
    'batches:create',
    'batches:update:any',
    'batches:read:any',
    'sessions:read:any',
    'attendance:read:any',
    'attendance:update:any',
    'attendance:export',
    'assessments:read:any',
    'assessments:update:any',
    'feedback:read:any',
    'mentor_assignments:create',
    'mentor_assignments:read:any',
    'risk_scores:read:any',
    'risk_scores:calculate:any',
    'interventions:read:any',
    'notifications:read:own',
    'events:create',
    'events:update:any',
    'events:read:any',
    'event_registrations:read:any',
    'proofs:read:any',
    'proofs:approve:any',
    'tasks:create:any',
    'tasks:read:any',
    'tasks:update:any',
    'tasks:delete:any',
    'tasks:grade:any',
    'audit_logs:read',
  ],
};

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: RoleName;
  roleId: string;
  department?: string;
  year?: number;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  name: string;
  department?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  members: string[]; // user IDs
  trainers: string[]; // trainer user IDs
}

export interface Session {
  id: string;
  batchId: string;
  trainerId?: string;
  title: string;
  topic?: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  room?: string;
  createdAt: string;
}

export interface AttendanceWindow {
  id: string;
  sessionId: string;
  label: string;
  startTime: string;
  endTime: string;
  trainerIp?: string;
  qrToken?: string;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  windowId: string;
  sessionId: string;
  studentId: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  markedAt: string;
  markedBy?: string;
  remarks?: string;
  ipAddress?: string;
}

export interface AssessmentQuestion {
  id: string;
  sectionId: string;
  label: string;
  maxScore: number;
  sortOrder: number;
}

export interface AssessmentSection {
  id: string;
  assessmentId: string;
  title: string;
  sortOrder: number;
  weightage?: number;
  questions: AssessmentQuestion[];
}

export interface Assessment {
  id: string;
  batchId: string;
  title: string;
  type: 'QUIZ' | 'ASSIGNMENT' | 'CODING_TEST' | 'CONTEST';
  assessmentDate: string;
  maxScore: number;
  sections: AssessmentSection[];
  createdAt: string;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  studentId: string;
  score: number;
  remarks?: string;
  createdAt: string;
}

export interface Feedback {
  id: string;
  sessionId: string;
  studentId: string;
  trainerId: string;
  effortRating: number; // 1-5
  participationRating: number; // 1-5
  comments?: string;
  createdAt: string;
}

export interface MentorAssignment {
  id: string;
  mentorId: string;
  studentId: string;
  assignedAt: string;
}

export interface RiskScore {
  id: string;
  studentId: string;
  attendanceRisk: number;
  assessmentRisk: number;
  feedbackRisk: number;
  totalScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  factors?: {
    attendanceRate: number;
    avgAssessmentScore: number;
    negativeFeedbackCount: number;
    decliningTrend?: boolean;
    mlSuggestedEscalation?: boolean;
  };
  generatedAt: string;
}

export interface MentorAlert {
  id: number;
  mentorId: string;
  studentId: string;
  riskScore: number;
  riskCategory: 'MEDIUM' | 'HIGH';
  suggestedAction: string;
  status: 'pending' | 'seen' | 'acted' | 'dismissed';
  createdAt: string;
  updatedAt: string;
  outcome?: {
    mentorResponse: 'acted' | 'dismissed' | 'ignored';
    responseTimeHours?: number;
    wasRecommendationFollowed: boolean;
    outcomeNotes?: string;
  };
}

export interface Intervention {
  id: string;
  studentId: string;
  mentorId: string;
  riskScoreId?: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  updates: { id: string; note: string; createdAt: string }[];
  outcome?: {
    id: string;
    outcome: 'IMPROVED' | 'NO_CHANGE' | 'DECLINED';
    remarks?: string;
    recordedAt: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  isMandatory: boolean;
  isInternal: boolean;
  maxMarks?: number;
  deadlineType: 'HARD' | 'SOFT' | 'NONE';
  deadline?: string;
  deadlineNote?: string;
  closedAt?: string;
  createdById: string;
  batchIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  studentId: string;
  progress: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  isInterested: boolean;
  completedAt?: string;
  isLate?: boolean;
  marksAwarded?: number;
  gradedById?: string;
  studentNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EventItem {
  id: string;
  title: string;
  description?: string;
  eventType: 'HACKATHON' | 'CONTEST' | 'WORKSHOP' | 'PLACEMENT_DRIVE';
  eventDate: string;
  registrationDeadline?: string;
  createdAt: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  studentId: string;
  registeredAt: string;
}

export interface ProofSubmission {
  id: string;
  eventId: string;
  studentId: string;
  fileUrl: string;
  fileName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  remarks?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  createdAt: string;
}

class Database {
  users: User[] = [];
  batches: Batch[] = [];
  sessions: Session[] = [];
  attendanceWindows: AttendanceWindow[] = [];
  attendanceRecords: AttendanceRecord[] = [];
  assessments: Assessment[] = [];
  assessmentResults: AssessmentResult[] = [];
  feedbackRecords: Feedback[] = [];
  mentorAssignments: MentorAssignment[] = [];
  riskScores: RiskScore[] = [];
  mentorAlerts: MentorAlert[] = [];
  interventions: Intervention[] = [];
  tasks: Task[] = [];
  taskSubmissions: TaskSubmission[] = [];
  events: EventItem[] = [];
  eventRegistrations: EventRegistration[] = [];
  proofs: ProofSubmission[] = [];
  auditLogs: AuditLog[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    const now = new Date('2026-10-06T09:00:00.000Z');

    // 1. Core Users for each of the 6 roles
    const standardUsers: User[] = [
      {
        id: 'user-admin-1',
        name: 'Admin User',
        email: 'admin@hope.dev',
        role: 'ADMIN',
        roleId: 'role-admin',
        department: 'Administration',
        status: 'ACTIVE',
        phone: '+1-555-0100',
        createdAt: new Date('2026-09-01').toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'user-coord-1',
        name: 'Coordinator User',
        email: 'coordinator@hope.dev',
        role: 'COORDINATOR',
        roleId: 'role-coordinator',
        department: 'Career & Placement',
        status: 'ACTIVE',
        phone: '+1-555-0101',
        createdAt: new Date('2026-09-01').toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'user-mentor-1',
        name: 'Dr. Anand Rao (Mentor)',
        email: 'mentor@hope.dev',
        role: 'MENTOR',
        roleId: 'role-mentor',
        department: 'Computer Science',
        status: 'ACTIVE',
        phone: '+1-555-0102',
        createdAt: new Date('2026-09-01').toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'user-faculty-1',
        name: 'Prof. Ramesh Nair (Faculty)',
        email: 'faculty@hope.dev',
        role: 'FACULTY',
        roleId: 'role-faculty',
        department: 'Information Technology',
        status: 'ACTIVE',
        phone: '+1-555-0103',
        createdAt: new Date('2026-09-01').toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'user-trainer-1',
        name: 'Rajesh Kumar (Lead Trainer)',
        email: 'trainer@hope.dev',
        role: 'TRAINER',
        roleId: 'role-trainer',
        department: 'Technical Training',
        status: 'ACTIVE',
        phone: '+1-555-0104',
        createdAt: new Date('2026-09-01').toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'user-student-1',
        name: 'Aanya Sharma (Student)',
        email: 'student@hope.dev',
        role: 'STUDENT',
        roleId: 'role-student',
        department: 'Computer Science',
        year: 3,
        status: 'ACTIVE',
        phone: '+1-555-0105',
        createdAt: new Date('2026-09-01').toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    // Additional Mentors & Trainers
    const additionalTrainers: User[] = [
      {
        id: 'trainer-2',
        name: 'Priya Venkatesh',
        email: 'priya.venkatesh@hope.dev',
        role: 'TRAINER',
        roleId: 'role-trainer',
        department: 'Technical Training',
        status: 'ACTIVE',
        phone: '+1-555-0112',
        createdAt: new Date('2026-09-01').toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    const additionalMentors: User[] = [
      {
        id: 'mentor-2',
        name: 'Dr. Kavitha Iyer',
        email: 'kavitha.iyer@hope.dev',
        role: 'MENTOR',
        roleId: 'role-mentor',
        department: 'Information Technology',
        status: 'ACTIVE',
        phone: '+1-555-0113',
        createdAt: new Date('2026-09-01').toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    // 50 Student Users
    const studentNames = [
      'Aanya Sharma', 'Bhavya Patel', 'Charvi Reddy', 'Diya Iyer', 'Eshani Nair',
      'Fatima Khan', 'Gauri Joshi', 'Hrithika Das', 'Isha Verma', 'Jhanvi Rao',
      'Kavya Menon', 'Lavanya Gupta', 'Meera Krishnan', 'Nandini Bose', 'Oviya Sundaram',
      'Priya Malhotra', 'Riya Chauhan', 'Saanvi Pillai', 'Tanvi Agarwal', 'Uma Deshmukh',
      'Vaishnavi Hegde', 'Wafa Begum', 'Yamini Thakur', 'Zara Ali', 'Aditi Banerjee',
      'Bhoomika Shetty', 'Chitra Ranganathan', 'Deepika Venkat', 'Ekta Saxena', 'Falguni Modi',
      'Gayathri Subramanian', 'Harini Mahesh', 'Indira Kulkarni', 'Jasmine Fernandes', 'Keerthana Ravi',
      'Lakshmi Narayanan', 'Madhavi Chatterjee', 'Nithya Mohan', 'Ojaswini Patil', 'Pallavi Tripathi',
      'Radhika Srinivasan', 'Shreya Mishra', 'Tanya Kapoor', 'Urvi Mehra', 'Vidya Anand',
      'Wriddhima Sen', 'Xena Joseph', 'Yuktha Gowda', 'Zoya Ansari', 'Anushka Dutta',
    ];

    const departments = ['Computer Science', 'Information Technology', 'AI & Data Science'];
    const generatedStudents: User[] = studentNames.map((name, i) => {
      // First student matches standard user-student-1
      if (i === 0) return standardUsers[5];
      const dept = departments[i % departments.length];
      const year = 2 + (i % 3);
      return {
        id: `student-${i + 1}`,
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '.')}@hope.dev`,
        role: 'STUDENT',
        roleId: 'role-student',
        department: dept,
        year,
        status: 'ACTIVE',
        phone: `+1-555-02${String(i).padStart(2, '0')}`,
        createdAt: new Date('2026-09-01').toISOString(),
        updatedAt: now.toISOString(),
      };
    });

    this.users = [
      ...standardUsers.slice(0, 5),
      ...generatedStudents,
      ...additionalTrainers,
      ...additionalMentors,
    ];

    // 2. Batches
    const batchAlphaStudents = generatedStudents.slice(0, 15).map((s) => s.id);
    const batchBetaStudents = generatedStudents.slice(15, 27).map((s) => s.id);
    const batchGammaStudents = generatedStudents.slice(27, 39).map((s) => s.id);
    const batchDeltaStudents = generatedStudents.slice(39, 50).map((s) => s.id);

    this.batches = [
      {
        id: 'batch-alpha-2026',
        name: 'Batch Alpha 2026',
        department: 'Computer Science',
        description: 'Full-stack web development and modern frameworks cohort',
        startDate: '2026-09-15',
        endDate: '2026-12-15',
        createdAt: new Date('2026-09-10').toISOString(),
        updatedAt: now.toISOString(),
        members: batchAlphaStudents,
        trainers: ['user-trainer-1'],
      },
      {
        id: 'batch-beta-2026',
        name: 'Batch Beta 2026',
        department: 'Computer Science',
        description: 'Data science, ML pipelines and risk analytics cohort',
        startDate: '2026-09-15',
        endDate: '2026-12-15',
        createdAt: new Date('2026-09-10').toISOString(),
        updatedAt: now.toISOString(),
        members: batchBetaStudents,
        trainers: ['user-trainer-1', 'trainer-2'],
      },
      {
        id: 'batch-gamma-2026',
        name: 'Batch Gamma 2026',
        department: 'Information Technology',
        description: 'Cloud architecture and enterprise systems cohort',
        startDate: '2026-09-15',
        endDate: '2026-12-15',
        createdAt: new Date('2026-09-10').toISOString(),
        updatedAt: now.toISOString(),
        members: batchGammaStudents,
        trainers: ['trainer-2'],
      },
      {
        id: 'batch-delta-2026',
        name: 'Batch Delta 2026',
        department: 'Information Technology',
        description: 'Mobile applications and distributed services cohort',
        startDate: '2026-09-15',
        endDate: '2026-12-15',
        createdAt: new Date('2026-09-10').toISOString(),
        updatedAt: now.toISOString(),
        members: batchDeltaStudents,
        trainers: ['user-trainer-1'],
      },
    ];

    // 3. Sessions
    const sessionDefs = [
      { id: 'sess-1', batchId: 'batch-alpha-2026', title: 'TypeScript & Modern JavaScript', topic: 'Interfaces, Generics, and Async Workflows', date: '2026-09-16', start: '08:00', end: '10:00' },
      { id: 'sess-2', batchId: 'batch-alpha-2026', title: 'React 19 & State Architecture', topic: 'Components, Hooks, TanStack & Context', date: '2026-09-18', start: '08:00', end: '10:00' },
      { id: 'sess-3', batchId: 'batch-alpha-2026', title: 'Relational DB & ORM Design', topic: 'Prisma Models, Migrations & Indexing', date: '2026-09-21', start: '08:00', end: '10:00' },
      { id: 'sess-4', batchId: 'batch-alpha-2026', title: 'REST APIs & RBAC Middleware', topic: 'Express, JWT, Scopes & Audit Logging', date: '2026-09-23', start: '08:00', end: '10:00' },
      { id: 'sess-5', batchId: 'batch-alpha-2026', title: 'Integration Testing & QA', topic: 'Jest, Supertest & E2E Verification', date: '2026-09-25', start: '08:00', end: '10:00' },
      { id: 'sess-6', batchId: 'batch-beta-2026', title: 'Python & Data Engineering', topic: 'Pandas, NumPy & Vector Operations', date: '2026-09-17', start: '08:00', end: '10:00' },
      { id: 'sess-7', batchId: 'batch-beta-2026', title: 'Machine Learning Classifiers', topic: 'Scikit-Learn Logistic Regression & Scalers', date: '2026-09-22', start: '08:00', end: '10:00' },
      { id: 'sess-8', batchId: 'batch-gamma-2026', title: 'Cloud Containers & Docker', topic: 'Multi-stage builds and compose networks', date: '2026-09-19', start: '08:00', end: '10:00' },
      { id: 'sess-9', batchId: 'batch-delta-2026', title: 'Cross-platform UI Patterns', topic: 'Adaptive layouts and touch optimization', date: '2026-09-24', start: '08:00', end: '10:00' },
    ];

    this.sessions = sessionDefs.map((def) => ({
      id: def.id,
      batchId: def.batchId,
      trainerId: 'user-trainer-1',
      title: def.title,
      topic: def.topic,
      scheduledDate: def.date,
      startTime: `${def.date}T${def.start}:00Z`,
      endTime: `${def.date}T${def.end}:00Z`,
      room: 'Lab 402 / Virtual Hybrid',
      createdAt: new Date('2026-09-12').toISOString(),
    }));

    // 4. Attendance Windows & Records
    this.sessions.forEach((sess, idx) => {
      const winId = `win-${sess.id}`;
      this.attendanceWindows.push({
        id: winId,
        sessionId: sess.id,
        label: 'Morning Roll-call (8:05 AM Strict Cutoff)',
        startTime: `${sess.scheduledDate}T07:50:00Z`,
        endTime: `${sess.scheduledDate}T08:05:00Z`,
        qrToken: `qr-token-session-${sess.id}-live`,
        trainerIp: '192.168.1.100',
        createdAt: new Date(sess.scheduledDate).toISOString(),
      });

      // Mark records for students in this session's batch
      const batch = this.batches.find((b) => b.id === sess.batchId);
      if (batch) {
        batch.members.forEach((studentId, sIdx) => {
          let status: AttendanceRecord['status'] = 'PRESENT';
          if (sIdx === 3 || sIdx === 7) status = 'LATE';
          else if (sIdx === 5 && idx > 2) status = 'ABSENT';
          else if (sIdx === 9 && idx === 1) status = 'EXCUSED';

          this.attendanceRecords.push({
            id: `att-${sess.id}-${studentId}`,
            windowId: winId,
            sessionId: sess.id,
            studentId,
            status,
            markedAt: `${sess.scheduledDate}T07:58:00Z`,
            markedBy: 'user-trainer-1',
            remarks: status === 'EXCUSED' ? 'Medical leave submitted and approved' : undefined,
          });
        });
      }
    });

    // 5. Assessments & Results
    const assessmentDefs: Array<{
      id: string;
      batchId: string;
      title: string;
      type: Assessment['type'];
      maxScore: number;
      date: string;
    }> = [
      { id: 'assess-1', batchId: 'batch-alpha-2026', title: 'TypeScript Fundamentals Quiz', type: 'QUIZ', maxScore: 100, date: '2026-09-19' },
      { id: 'assess-2', batchId: 'batch-alpha-2026', title: 'React Component Architecture Assignment', type: 'ASSIGNMENT', maxScore: 100, date: '2026-09-22' },
      { id: 'assess-3', batchId: 'batch-alpha-2026', title: 'Weekly Coding Contest #1', type: 'CONTEST', maxScore: 100, date: '2026-09-24' },
      { id: 'assess-4', batchId: 'batch-beta-2026', title: 'Data Cleaning & Feature Engineering', type: 'ASSIGNMENT', maxScore: 100, date: '2026-09-20' },
      { id: 'assess-5', batchId: 'batch-beta-2026', title: 'ML Model Validation Contest', type: 'CONTEST', maxScore: 100, date: '2026-09-24' },
    ];

    assessmentDefs.forEach((def) => {
      const q1Id = `q-${def.id}-1`;
      const q2Id = `q-${def.id}-2`;
      const assessment: Assessment = {
        id: def.id,
        batchId: def.batchId,
        title: def.title,
        type: def.type,
        assessmentDate: def.date,
        maxScore: def.maxScore,
        createdAt: new Date(def.date).toISOString(),
        sections: [
          {
            id: `sec-${def.id}-1`,
            assessmentId: def.id,
            title: 'Technical Implementation & Accuracy',
            sortOrder: 1,
            weightage: 100,
            questions: [
              { id: q1Id, sectionId: `sec-${def.id}-1`, label: 'Core Problem Implementation', maxScore: 60, sortOrder: 1 },
              { id: q2Id, sectionId: `sec-${def.id}-1`, label: 'Edge Case Handling & Optimization', maxScore: 40, sortOrder: 2 },
            ],
          },
        ],
      };
      this.assessments.push(assessment);

      // Results for batch members
      const batch = this.batches.find((b) => b.id === def.batchId);
      if (batch) {
        batch.members.forEach((studentId, idx) => {
          // Generate varying score: high achievers, middle, and low scorers
          const base = 88 - (idx * 4);
          const score = Math.max(35, Math.min(100, base));
          this.assessmentResults.push({
            id: `res-${def.id}-${studentId}`,
            assessmentId: def.id,
            studentId,
            score,
            remarks: score >= 80 ? 'Exceptional submission' : score < 50 ? 'Requires revision on fundamentals' : 'Solid performance',
            createdAt: new Date(def.date).toISOString(),
          });
        });
      }
    });

    // 6. Feedback
    this.sessions.slice(0, 4).forEach((sess) => {
      const batch = this.batches.find((b) => b.id === sess.batchId);
      if (batch) {
        batch.members.slice(0, 8).forEach((studentId, sIdx) => {
          const effort = sIdx === 5 ? 2 : (4 + (sIdx % 2));
          const participation = sIdx === 5 ? 2 : (3 + ((sIdx + 1) % 3));
          this.feedbackRecords.push({
            id: `fb-${sess.id}-${studentId}`,
            sessionId: sess.id,
            studentId,
            trainerId: 'user-trainer-1',
            effortRating: effort,
            participationRating: participation,
            comments: effort <= 2 ? 'Needs improvement in time management and proactiveness.' : 'Strong analytical answers and active participant.',
            createdAt: sess.startTime,
          });
        });
      }
    });

    // 7. Mentor Assignments
    // Assign student-1 (Aanya) through student-15 to Dr. Anand Rao (user-mentor-1)
    batchAlphaStudents.forEach((stId, idx) => {
      const mentorId = idx < 10 ? 'user-mentor-1' : 'mentor-2';
      this.mentorAssignments.push({
        id: `massign-${stId}`,
        mentorId,
        studentId: stId,
        assignedAt: '2026-09-15T09:00:00Z',
      });
    });

    // 8. Risk Scores
    generatedStudents.forEach((student, idx) => {
      let riskLevel: RiskScore['riskLevel'] = 'LOW';
      let attendanceRisk = 5;
      let assessmentRisk = 10;
      let feedbackRisk = 5;
      let totalScore = 20;

      if (idx === 5) {
        // High risk student (Fatima Khan)
        riskLevel = 'HIGH';
        attendanceRisk = 25;
        assessmentRisk = 30;
        feedbackRisk = 20;
        totalScore = 75;
      } else if (idx === 3 || idx === 8) {
        // Medium risk
        riskLevel = 'MEDIUM';
        attendanceRisk = 20;
        assessmentRisk = 20;
        feedbackRisk = 10;
        totalScore = 50;
      }

      this.riskScores.push({
        id: `risk-${student.id}`,
        studentId: student.id,
        attendanceRisk,
        assessmentRisk,
        feedbackRisk,
        totalScore,
        riskLevel,
        factors: {
          attendanceRate: riskLevel === 'HIGH' ? 62 : riskLevel === 'MEDIUM' ? 73 : 95,
          avgAssessmentScore: riskLevel === 'HIGH' ? 42 : riskLevel === 'MEDIUM' ? 58 : 88,
          negativeFeedbackCount: riskLevel === 'HIGH' ? 3 : riskLevel === 'MEDIUM' ? 1 : 0,
          decliningTrend: riskLevel === 'HIGH',
          mlSuggestedEscalation: riskLevel === 'HIGH',
        },
        generatedAt: now.toISOString(),
      });
    });

    // 9. Mentor Alerts
    const highRiskStudent = generatedStudents[5]; // Fatima Khan
    this.mentorAlerts.push(
      {
        id: 1,
        mentorId: 'user-mentor-1',
        studentId: highRiskStudent.id,
        riskScore: 75,
        riskCategory: 'HIGH',
        suggestedAction: 'Schedule 1:1 academic counseling regarding attendance and quiz prep.',
        status: 'pending',
        createdAt: new Date('2026-10-01T10:00:00Z').toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 2,
        mentorId: 'user-mentor-1',
        studentId: generatedStudents[3].id, // Diya Iyer
        riskScore: 50,
        riskCategory: 'MEDIUM',
        suggestedAction: 'Review missed submission for React Assignment 1 and offer lab support.',
        status: 'seen',
        createdAt: new Date('2026-10-02T11:00:00Z').toISOString(),
        updatedAt: now.toISOString(),
      }
    );

    // 10. Interventions
    this.interventions.push({
      id: 'interv-1',
      studentId: highRiskStudent.id,
      mentorId: 'user-mentor-1',
      riskScoreId: `risk-${highRiskStudent.id}`,
      title: 'Attendance Recovery & Hands-on Lab Tutoring',
      description: 'Structured 2-week catch-up plan focusing on React fundamentals and morning session attendance accountability.',
      status: 'IN_PROGRESS',
      deadline: '2026-10-18T18:00:00Z',
      createdAt: '2026-10-01T14:00:00Z',
      updatedAt: now.toISOString(),
      updates: [
        {
          id: 'upd-1',
          note: 'Completed initial review call. Student reported personal commute challenges and agreed to hybrid check-in protocols.',
          createdAt: '2026-10-02T16:00:00Z',
        },
      ],
    });

    // 11. Tasks
    this.tasks.push(
      {
        id: 'task-1',
        title: 'Full-Stack Portfolio Project Milestone 1',
        description: 'Complete user authentication, database models, and protected routing architecture.',
        isMandatory: true,
        isInternal: false,
        maxMarks: 50,
        deadlineType: 'HARD',
        deadline: '2026-10-15T23:59:59Z',
        deadlineNote: 'Hard deadline for mid-term placement evaluation',
        createdById: 'user-trainer-1',
        batchIds: ['batch-alpha-2026', 'batch-beta-2026'],
        createdAt: '2026-09-20T10:00:00Z',
        updatedAt: now.toISOString(),
      },
      {
        id: 'task-2',
        title: 'Algorithmic Problem Set — Dynamic Programming',
        description: 'Solve 5 LeetCode medium DP questions on memoization and tabulation.',
        isMandatory: false,
        isInternal: true,
        maxMarks: 25,
        deadlineType: 'SOFT',
        deadline: '2026-10-20T23:59:59Z',
        createdById: 'user-trainer-1',
        batchIds: ['batch-alpha-2026'],
        createdAt: '2026-09-25T10:00:00Z',
        updatedAt: now.toISOString(),
      }
    );

    // Task submissions
    batchAlphaStudents.forEach((stId, idx) => {
      this.taskSubmissions.push({
        id: `tsub-1-${stId}`,
        taskId: 'task-1',
        studentId: stId,
        progress: idx < 5 ? 'COMPLETED' : idx < 10 ? 'IN_PROGRESS' : 'NOT_STARTED',
        isInterested: true,
        completedAt: idx < 5 ? '2026-10-04T18:30:00Z' : undefined,
        marksAwarded: idx < 5 ? (45 + (idx % 5)) : undefined,
        gradedById: idx < 5 ? 'user-trainer-1' : undefined,
        createdAt: '2026-09-21T09:00:00Z',
        updatedAt: now.toISOString(),
      });
    });

    // 12. Events
    this.events.push(
      {
        id: 'evt-1',
        title: 'State Level Smart Campus Hackathon 2026',
        description: '36-hour offline hackathon focusing on IoT, AI in Education, and CleanTech solutions.',
        eventType: 'HACKATHON',
        eventDate: '2026-10-25T09:00:00Z',
        registrationDeadline: '2026-10-15T23:59:59Z',
        createdAt: '2026-09-18T10:00:00Z',
      },
      {
        id: 'evt-2',
        title: 'Weekly National Coding Championship Round 4',
        description: 'Competitive programming contest with standard ICPC scoring.',
        eventType: 'CONTEST',
        eventDate: '2026-10-12T14:00:00Z',
        registrationDeadline: '2026-10-11T20:00:00Z',
        createdAt: '2026-09-20T10:00:00Z',
      },
      {
        id: 'evt-3',
        title: 'Google Cloud Platform Placement Readiness Workshop',
        description: 'Hands-on training by enterprise cloud architects on Kubernetes & Cloud SQL.',
        eventType: 'WORKSHOP',
        eventDate: '2026-10-30T10:00:00Z',
        registrationDeadline: '2026-10-24T18:00:00Z',
        createdAt: '2026-09-25T10:00:00Z',
      }
    );

    // Event Registrations
    this.eventRegistrations.push(
      {
        id: 'ereg-1',
        eventId: 'evt-1',
        studentId: 'user-student-1',
        registeredAt: '2026-09-22T11:00:00Z',
      },
      {
        id: 'ereg-2',
        eventId: 'evt-2',
        studentId: 'user-student-1',
        registeredAt: '2026-09-24T12:00:00Z',
      }
    );

    // Proof Submissions
    this.proofs.push(
      {
        id: 'proof-1',
        eventId: 'evt-2',
        studentId: 'user-student-1',
        fileUrl: 'https://drive.google.com/file/d/sample-proof-cert-123/view',
        fileName: 'Aanya_Sharma_Coding_Championship_Round_Certificate.pdf',
        status: 'APPROVED',
        remarks: 'Verified certificate credential and rank #14.',
        createdAt: '2026-09-26T14:00:00Z',
      },
      {
        id: 'proof-2',
        eventId: 'evt-1',
        studentId: 'student-2',
        fileUrl: 'https://drive.google.com/file/d/sample-proof-hackathon-456/view',
        fileName: 'Bhavya_Patel_Hackathon_Acceptance_Proof.pdf',
        status: 'PENDING',
        createdAt: '2026-10-04T10:00:00Z',
      }
    );
  }
}

export const db = new Database();
