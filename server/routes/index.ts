// server/routes/index.ts
import { Router, Request, Response } from 'express';
import {
  db,
  User,
  AttendanceRecord,
  Assessment,
  Task,
  EventItem,
  ProofSubmission,
  Feedback,
  RiskScore,
  Intervention,
  EventRegistration,
} from '../db';
import {
  authenticateJwt,
  requirePermission,
  signAccessToken,
  sendSuccess,
  sendError,
} from '../auth';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & SESSIONS
// ==========================================
export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email) {
    return sendError(res, 'Email is required', 400);
  }

  const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return sendError(res, 'Invalid email or password', 401);
  }

  if (user.status !== 'ACTIVE') {
    return sendError(res, 'Account is inactive or pending activation', 403);
  }

  const accessToken = signAccessToken({
    sub: user.id,
    roleId: user.roleId,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  res.cookie('refreshToken', `mock-refresh-${user.id}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return sendSuccess(res, {
    accessToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      year: user.year,
      status: user.status,
    },
  });
});

authRouter.post('/refresh', (req: Request, res: Response) => {
  const tokenCookie = req.cookies?.refreshToken;
  // If no cookie, try default student or fallback user
  let userId = 'user-student-1';
  if (tokenCookie && tokenCookie.startsWith('mock-refresh-')) {
    userId = tokenCookie.replace('mock-refresh-', '');
  }

  const user = db.users.find((u) => u.id === userId) || db.users[0];
  const accessToken = signAccessToken({
    sub: user.id,
    roleId: user.roleId,
    role: user.role,
    email: user.email,
    name: user.name,
  });

  return sendSuccess(res, { accessToken });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  return sendSuccess(res, { message: 'Logged out successfully' });
});

authRouter.post('/change-password', authenticateJwt, (req: Request, res: Response) => {
  return sendSuccess(res, { message: 'Password updated successfully' });
});

// ==========================================
// 2. USERS & PROFILES
// ==========================================
export const usersRouter = Router();

usersRouter.get('/me', authenticateJwt, (req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.sub);
  if (!user) return sendError(res, 'User not found', 404);

  return sendSuccess(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    department: user.department,
    year: user.year,
    status: user.status,
    role: { id: user.roleId, name: user.role },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

usersRouter.patch('/me', authenticateJwt, (req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === req.user!.sub);
  if (!user) return sendError(res, 'User not found', 404);

  if (req.body.name) user.name = req.body.name;
  if (req.body.phone !== undefined) user.phone = req.body.phone;
  if (req.body.department !== undefined) user.department = req.body.department;
  user.updatedAt = new Date().toISOString();

  return sendSuccess(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    department: user.department,
    year: user.year,
    status: user.status,
    role: { id: user.roleId, name: user.role },
  });
});

usersRouter.get(
  '/',
  authenticateJwt,
  requirePermission('users:read:any', 'users:read:assigned', 'users:read:own'),
  (req: Request, res: Response) => {
    let list = [...db.users];
    const role = req.user!.role;

    if (role === 'STUDENT') {
      list = list.filter((u) => u.id === req.user!.sub);
    } else if (role === 'MENTOR') {
      const assignedIds = db.mentorAssignments
        .filter((ma) => ma.mentorId === req.user!.sub)
        .map((ma) => ma.studentId);
      list = list.filter((u) => u.id === req.user!.sub || assignedIds.includes(u.id));
    }

    if (req.query.role) {
      list = list.filter((u) => u.role === req.query.role);
    }
    if (req.query.search) {
      const q = String(req.query.search).toLowerCase();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    return sendSuccess(res, list.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      department: u.department,
      year: u.year,
      status: u.status,
      role: { id: u.roleId, name: u.role },
    })));
  }
);

usersRouter.get('/:id', authenticateJwt, (req: Request, res: Response) => {
  const user = db.users.find((u) => u.id === req.params.id);
  if (!user) return sendError(res, 'User not found', 404);
  return sendSuccess(res, {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    department: user.department,
    year: user.year,
    status: user.status,
    role: { id: user.roleId, name: user.role },
  });
});

usersRouter.post(
  '/',
  authenticateJwt,
  requirePermission('users:create'),
  (req: Request, res: Response) => {
    const { name, email, role, department, year, phone } = req.body;
    if (!name || !email || !role) {
      return sendError(res, 'Name, email, and role are required', 400);
    }

    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return sendError(res, 'Email already exists', 409);
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name,
      email,
      role,
      roleId: `role-${role.toLowerCase()}`,
      department: department || 'General',
      year: year ? Number(year) : undefined,
      phone: phone || '',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.users.push(newUser);
    return sendSuccess(res, newUser, 201);
  }
);

usersRouter.patch(
  '/:id/role',
  authenticateJwt,
  requirePermission('users:change_role'),
  (req: Request, res: Response) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) return sendError(res, 'User not found', 404);
    if (!req.body.role) return sendError(res, 'Role is required', 400);

    user.role = req.body.role;
    user.roleId = `role-${req.body.role.toLowerCase()}`;
    user.updatedAt = new Date().toISOString();
    return sendSuccess(res, user);
  }
);

usersRouter.patch(
  '/:id/status',
  authenticateJwt,
  requirePermission('users:activate'),
  (req: Request, res: Response) => {
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) return sendError(res, 'User not found', 404);
    if (!req.body.status) return sendError(res, 'Status is required', 400);

    user.status = req.body.status;
    user.updatedAt = new Date().toISOString();
    return sendSuccess(res, user);
  }
);

// ==========================================
// 3. BATCHES & SESSIONS
// ==========================================
export const batchesRouter = Router();

batchesRouter.get(
  '/',
  requirePermission('batches:read:own', 'batches:read:assigned', 'batches:read:any'),
  (req: Request, res: Response) => {
    const role = req.user!.role;
    const userId = req.user!.sub;

    let batches = db.batches;
    if (role === 'STUDENT') {
      batches = batches.filter((b) => b.members.includes(userId));
    } else if (role === 'TRAINER') {
      batches = batches.filter((b) => b.trainers.includes(userId));
    } else if (role === 'MENTOR') {
      const assignedStudents = db.mentorAssignments
        .filter((ma) => ma.mentorId === userId)
        .map((ma) => ma.studentId);
      batches = batches.filter((b) => b.members.some((m) => assignedStudents.includes(m)));
    }

    const data = batches.map((b) => ({
      ...b,
      memberCount: b.members.length,
      trainerCount: b.trainers.length,
    }));
    return sendSuccess(res, data);
  }
);

batchesRouter.get(
  '/:id',
  requirePermission('batches:read:own', 'batches:read:assigned', 'batches:read:any'),
  (req: Request, res: Response) => {
    const batch = db.batches.find((b) => b.id === req.params.id);
    if (!batch) return sendError(res, 'Batch not found', 404);

    const members = db.users.filter((u) => batch.members.includes(u.id));
    const trainers = db.users.filter((u) => batch.trainers.includes(u.id));
    const sessions = db.sessions.filter((s) => s.batchId === batch.id);

    return sendSuccess(res, {
      ...batch,
      members,
      trainers,
      sessions,
    });
  }
);

batchesRouter.post(
  '/',
  requirePermission('batches:create'),
  (req: Request, res: Response) => {
    const { name, department, description, startDate, endDate } = req.body;
    if (!name || !startDate) {
      return sendError(res, 'Name and startDate are required', 400);
    }

    const batch = {
      id: `batch-${Date.now()}`,
      name,
      department: department || 'Computer Science',
      description,
      startDate,
      endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [],
      trainers: [],
    };
    db.batches.push(batch);
    return sendSuccess(res, batch, 201);
  }
);

batchesRouter.put(
  '/:id',
  requirePermission('batches:update:any'),
  (req: Request, res: Response) => {
    const batch = db.batches.find((b) => b.id === req.params.id);
    if (!batch) return sendError(res, 'Batch not found', 404);

    if (req.body.name) batch.name = req.body.name;
    if (req.body.department !== undefined) batch.department = req.body.department;
    if (req.body.description !== undefined) batch.description = req.body.description;
    if (req.body.startDate) batch.startDate = req.body.startDate;
    if (req.body.endDate !== undefined) batch.endDate = req.body.endDate;
    batch.updatedAt = new Date().toISOString();

    return sendSuccess(res, batch);
  }
);

batchesRouter.delete(
  '/:id',
  requirePermission('batches:update:any'),
  (req: Request, res: Response) => {
    const idx = db.batches.findIndex((b) => b.id === req.params.id);
    if (idx === -1) return sendError(res, 'Batch not found', 404);
    db.batches.splice(idx, 1);
    return sendSuccess(res, { message: 'Batch deleted' });
  }
);

batchesRouter.get('/:id/roster', (req: Request, res: Response) => {
  const batch = db.batches.find((b) => b.id === req.params.id);
  if (!batch) return sendError(res, 'Batch not found', 404);
  const students = db.users.filter((u) => batch.members.includes(u.id));
  return sendSuccess(res, students);
});

batchesRouter.post(
  '/:id/students',
  requirePermission('batches:update:any'),
  (req: Request, res: Response) => {
    const batch = db.batches.find((b) => b.id === req.params.id);
    if (!batch) return sendError(res, 'Batch not found', 404);
    const { studentId } = req.body;
    if (!batch.members.includes(studentId)) {
      batch.members.push(studentId);
    }
    return sendSuccess(res, { message: 'Student added to batch' }, 201);
  }
);

batchesRouter.delete(
  '/:id/students/:studentId',
  requirePermission('batches:update:any'),
  (req: Request, res: Response) => {
    const batch = db.batches.find((b) => b.id === req.params.id);
    if (!batch) return sendError(res, 'Batch not found', 404);
    batch.members = batch.members.filter((id) => id !== req.params.studentId);
    return sendSuccess(res, { message: 'Student removed from batch' });
  }
);

batchesRouter.get('/:id/trainers', (req: Request, res: Response) => {
  const batch = db.batches.find((b) => b.id === req.params.id);
  if (!batch) return sendError(res, 'Batch not found', 404);
  const trainers = db.users.filter((u) => batch.trainers.includes(u.id));
  return sendSuccess(res, trainers);
});

batchesRouter.post(
  '/:id/trainers',
  requirePermission('batches:update:any'),
  (req: Request, res: Response) => {
    const batch = db.batches.find((b) => b.id === req.params.id);
    if (!batch) return sendError(res, 'Batch not found', 404);
    const { trainerId } = req.body;
    if (!batch.trainers.includes(trainerId)) {
      batch.trainers.push(trainerId);
    }
    return sendSuccess(res, { message: 'Trainer assigned to batch' }, 201);
  }
);

batchesRouter.delete(
  '/:id/trainers/:trainerId',
  requirePermission('batches:update:any'),
  (req: Request, res: Response) => {
    const batch = db.batches.find((b) => b.id === req.params.id);
    if (!batch) return sendError(res, 'Batch not found', 404);
    batch.trainers = batch.trainers.filter((id) => id !== req.params.trainerId);
    return sendSuccess(res, { message: 'Trainer removed from batch' });
  }
);

batchesRouter.get('/:id/sessions', (req: Request, res: Response) => {
  const sessions = db.sessions.filter((s) => s.batchId === req.params.id);
  return sendSuccess(res, sessions);
});

batchesRouter.post(
  '/:id/sessions',
  requirePermission('sessions:create:batch', 'sessions:create:any'),
  (req: Request, res: Response) => {
    const { title, topic, scheduledDate, startTime, endTime, room } = req.body;
    if (!title || !scheduledDate) {
      return sendError(res, 'Title and scheduledDate are required', 400);
    }

    const session = {
      id: `sess-${Date.now()}`,
      batchId: req.params.id,
      trainerId: req.user!.sub,
      title,
      topic,
      scheduledDate,
      startTime: startTime || `${scheduledDate}T08:00:00Z`,
      endTime: endTime || `${scheduledDate}T10:00:00Z`,
      room: room || 'Room 301',
      createdAt: new Date().toISOString(),
    };
    db.sessions.push(session);

    // Auto-create default 7:50-8:05 AM attendance window
    db.attendanceWindows.push({
      id: `win-${session.id}`,
      sessionId: session.id,
      label: 'Morning Check-in (8:05 AM Cutoff)',
      startTime: `${scheduledDate}T07:50:00Z`,
      endTime: `${scheduledDate}T08:05:00Z`,
      qrToken: `qr-${session.id}-${Date.now()}`,
      createdAt: new Date().toISOString(),
    });

    return sendSuccess(res, session, 201);
  }
);

export const sessionsRouter = Router();

sessionsRouter.get('/:id', (req: Request, res: Response) => {
  const session = db.sessions.find((s) => s.id === req.params.id);
  if (!session) return sendError(res, 'Session not found', 404);
  const batch = db.batches.find((b) => b.id === session.batchId);
  const windows = db.attendanceWindows.filter((w) => w.sessionId === session.id);
  return sendSuccess(res, { ...session, batch, windows });
});

sessionsRouter.put(
  '/:id',
  requirePermission('sessions:update:batch', 'sessions:update:any'),
  (req: Request, res: Response) => {
    const session = db.sessions.find((s) => s.id === req.params.id);
    if (!session) return sendError(res, 'Session not found', 404);

    if (req.body.title) session.title = req.body.title;
    if (req.body.topic !== undefined) session.topic = req.body.topic;
    if (req.body.scheduledDate) session.scheduledDate = req.body.scheduledDate;
    if (req.body.startTime) session.startTime = req.body.startTime;
    if (req.body.endTime) session.endTime = req.body.endTime;
    if (req.body.room !== undefined) session.room = req.body.room;

    return sendSuccess(res, session);
  }
);

sessionsRouter.delete(
  '/:id',
  requirePermission('sessions:update:batch', 'sessions:update:any'),
  (req: Request, res: Response) => {
    const idx = db.sessions.findIndex((s) => s.id === req.params.id);
    if (idx === -1) return sendError(res, 'Session not found', 404);
    db.sessions.splice(idx, 1);
    return sendSuccess(res, { message: 'Session deleted' });
  }
);

// ==========================================
// 4. ATTENDANCE MODULE
// ==========================================
export const attendanceRouter = Router();

attendanceRouter.post(
  '/windows',
  requirePermission('attendance:mark:batch', 'attendance:update:any'),
  (req: Request, res: Response) => {
    const { sessionId, label, startTime, endTime } = req.body;
    if (!sessionId || !label || !startTime || !endTime) {
      return sendError(res, 'Missing required window fields', 400);
    }
    const win = {
      id: `win-${Date.now()}`,
      sessionId,
      label,
      startTime,
      endTime,
      qrToken: `qr-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      createdAt: new Date().toISOString(),
    };
    db.attendanceWindows.push(win);
    return sendSuccess(res, win, 201);
  }
);

attendanceRouter.get('/session/:sessionId/windows', (req: Request, res: Response) => {
  const windows = db.attendanceWindows.filter((w) => w.sessionId === req.params.sessionId);
  return sendSuccess(res, windows);
});

attendanceRouter.get('/window/:windowId/qr', (req: Request, res: Response) => {
  const win = db.attendanceWindows.find((w) => w.id === req.params.windowId);
  if (!win) return sendError(res, 'Attendance window not found', 404);
  return sendSuccess(res, {
    windowId: win.id,
    qrToken: win.qrToken || `qr-live-${win.id}`,
    label: win.label,
    startTime: win.startTime,
    endTime: win.endTime,
    refreshIntervalSeconds: 60,
  });
});

attendanceRouter.post(
  '/check-in',
  requirePermission('attendance:mark:self'),
  (req: Request, res: Response) => {
    const studentId = req.user!.sub;
    const { windowId, qrToken } = req.body;

    const win = db.attendanceWindows.find(
      (w) => w.id === windowId || (qrToken && w.qrToken === qrToken)
    );
    if (!win) return sendError(res, 'Invalid attendance window or QR token', 400);

    const now = new Date();
    const end = new Date(win.endTime);
    const status = now > end ? 'LATE' : 'PRESENT';

    let record = db.attendanceRecords.find(
      (r) => r.sessionId === win.sessionId && r.studentId === studentId
    );

    if (record) {
      return sendError(res, 'Attendance already marked for this session', 409);
    }

    record = {
      id: `att-${Date.now()}`,
      windowId: win.id,
      sessionId: win.sessionId,
      studentId,
      status,
      markedAt: now.toISOString(),
      markedBy: studentId,
    };
    db.attendanceRecords.push(record);

    return sendSuccess(res, {
      message: `Checked in successfully as ${status}`,
      record,
    }, 201);
  }
);

attendanceRouter.post(
  '/mark',
  requirePermission('attendance:mark:batch', 'attendance:update:any'),
  (req: Request, res: Response) => {
    const { sessionId, studentId, status, remarks, windowId } = req.body;
    if (!sessionId || !studentId || !status) {
      return sendError(res, 'sessionId, studentId, and status are required', 400);
    }

    let record = db.attendanceRecords.find(
      (r) => r.sessionId === sessionId && r.studentId === studentId
    );

    if (record) {
      record.status = status;
      record.remarks = remarks;
      record.markedAt = new Date().toISOString();
      record.markedBy = req.user!.sub;
    } else {
      record = {
        id: `att-${Date.now()}`,
        windowId: windowId || 'win-manual',
        sessionId,
        studentId,
        status,
        remarks,
        markedAt: new Date().toISOString(),
        markedBy: req.user!.sub,
      };
      db.attendanceRecords.push(record);
    }

    return sendSuccess(res, record);
  }
);

attendanceRouter.post(
  '/bulk',
  requirePermission('attendance:mark:batch', 'attendance:update:any'),
  (req: Request, res: Response) => {
    const { sessionId, records, windowId } = req.body;
    if (!sessionId || !Array.isArray(records)) {
      return sendError(res, 'sessionId and records array are required', 400);
    }

    records.forEach((rec: { studentId: string; status: AttendanceRecord['status']; remarks?: string }) => {
      let existing = db.attendanceRecords.find(
        (r) => r.sessionId === sessionId && r.studentId === rec.studentId
      );
      if (existing) {
        existing.status = rec.status;
        existing.remarks = rec.remarks;
        existing.markedAt = new Date().toISOString();
        existing.markedBy = req.user!.sub;
      } else {
        db.attendanceRecords.push({
          id: `att-${Date.now()}-${rec.studentId}`,
          windowId: windowId || 'win-manual',
          sessionId,
          studentId: rec.studentId,
          status: rec.status,
          remarks: rec.remarks,
          markedAt: new Date().toISOString(),
          markedBy: req.user!.sub,
        });
      }
    });

    return sendSuccess(res, { count: records.length, message: 'Bulk attendance recorded' });
  }
);

attendanceRouter.put(
  '/:id',
  requirePermission('attendance:update:batch', 'attendance:update:any'),
  (req: Request, res: Response) => {
    const record = db.attendanceRecords.find((r) => r.id === req.params.id);
    if (!record) return sendError(res, 'Attendance record not found', 404);

    if (req.body.status) record.status = req.body.status;
    if (req.body.remarks !== undefined) record.remarks = req.body.remarks;
    record.markedAt = new Date().toISOString();
    record.markedBy = req.user!.sub;

    return sendSuccess(res, record);
  }
);

attendanceRouter.get('/session/:sessionId', (req: Request, res: Response) => {
  const session = db.sessions.find((s) => s.id === req.params.sessionId);
  if (!session) return sendError(res, 'Session not found', 404);

  const batch = db.batches.find((b) => b.id === session.batchId);
  const records = db.attendanceRecords.filter((r) => r.sessionId === session.id);

  const studentMap = new Map(db.users.map((u) => [u.id, u]));
  const formatted = records.map((r) => ({
    ...r,
    student: studentMap.get(r.studentId) || { id: r.studentId, name: 'Unknown' },
  }));

  const presentCount = records.filter((r) => r.status === 'PRESENT').length;
  const lateCount = records.filter((r) => r.status === 'LATE').length;
  const absentCount = records.filter((r) => r.status === 'ABSENT').length;
  const excusedCount = records.filter((r) => r.status === 'EXCUSED').length;

  return sendSuccess(res, {
    session,
    batch,
    stats: {
      total: records.length,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      excused: excusedCount,
      rate: records.length > 0 ? Math.round(((presentCount + lateCount) / records.length) * 100) : 0,
    },
    records: formatted,
  });
});

attendanceRouter.get(
  '/student/:studentId',
  requirePermission('attendance:read:own', 'attendance:read:assigned', 'attendance:read:any'),
  (req: Request, res: Response) => {
    const studentId = req.params.studentId;
    const records = db.attendanceRecords.filter((r) => r.studentId === studentId);

    const sessionMap = new Map(db.sessions.map((s) => [s.id, s]));
    const history = records.map((r) => ({
      ...r,
      session: sessionMap.get(r.sessionId),
    }));

    const total = records.length;
    const present = records.filter((r) => r.status === 'PRESENT').length;
    const late = records.filter((r) => r.status === 'LATE').length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return sendSuccess(res, {
      studentId,
      total,
      present,
      late,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      excused: records.filter((r) => r.status === 'EXCUSED').length,
      attendanceRate: rate,
      history,
    });
  }
);

attendanceRouter.get('/batch/:batchId/stats', (req: Request, res: Response) => {
  const batch = db.batches.find((b) => b.id === req.params.batchId);
  if (!batch) return sendError(res, 'Batch not found', 404);

  const batchSessions = db.sessions.filter((s) => s.batchId === batch.id);
  const sessionIds = batchSessions.map((s) => s.id);
  const records = db.attendanceRecords.filter((r) => sessionIds.includes(r.sessionId));

  const total = records.length;
  const present = records.filter((r) => r.status === 'PRESENT').length;
  const late = records.filter((r) => r.status === 'LATE').length;
  const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return sendSuccess(res, {
    batchId: batch.id,
    sessionCount: batchSessions.length,
    totalRecords: total,
    attendanceRate: rate,
  });
});

attendanceRouter.get(
  '/excused',
  requirePermission('attendance:update:batch', 'attendance:read:any'),
  (_req: Request, res: Response) => {
    const excused = db.attendanceRecords.filter((r) => r.status === 'EXCUSED');
    const studentMap = new Map(db.users.map((u) => [u.id, u]));
    const sessionMap = new Map(db.sessions.map((s) => [s.id, s]));

    const result = excused.map((r) => ({
      ...r,
      student: studentMap.get(r.studentId),
      session: sessionMap.get(r.sessionId),
    }));

    return sendSuccess(res, result);
  }
);

// ==========================================
// 5. ASSESSMENTS MODULE
// ==========================================
export const assessmentsRouter = Router();

assessmentsRouter.get(
  '/',
  requirePermission('assessments:read:own', 'assessments:read:batch', 'assessments:read:assigned', 'assessments:read:any'),
  (req: Request, res: Response) => {
    const { batchId } = req.query;
    let list = db.assessments;
    if (batchId) {
      list = list.filter((a) => a.batchId === batchId);
    }

    const batchMap = new Map(db.batches.map((b) => [b.id, b]));
    const enriched = list.map((a) => ({
      ...a,
      batch: batchMap.get(a.batchId),
      resultCount: db.assessmentResults.filter((r) => r.assessmentId === a.id).length,
    }));

    return sendSuccess(res, enriched);
  }
);

assessmentsRouter.get('/:id', (req: Request, res: Response) => {
  const assessment = db.assessments.find((a) => a.id === req.params.id);
  if (!assessment) return sendError(res, 'Assessment not found', 404);
  const batch = db.batches.find((b) => b.id === assessment.batchId);
  return sendSuccess(res, { ...assessment, batch });
});

assessmentsRouter.post(
  '/',
  requirePermission('assessments:create:batch', 'assessments:update:any'),
  (req: Request, res: Response) => {
    const { batchId, title, type, assessmentDate, maxScore, sections } = req.body;
    if (!batchId || !title || !type || !assessmentDate) {
      return sendError(res, 'Missing required assessment parameters', 400);
    }

    const newAssessment: Assessment = {
      id: `assess-${Date.now()}`,
      batchId,
      title,
      type,
      assessmentDate,
      maxScore: maxScore || 100,
      createdAt: new Date().toISOString(),
      sections: sections || [
        {
          id: `sec-${Date.now()}`,
          assessmentId: `assess-${Date.now()}`,
          title: 'Section 1',
          sortOrder: 1,
          weightage: 100,
          questions: [
            { id: `q-${Date.now()}`, sectionId: `sec-${Date.now()}`, label: 'Question 1', maxScore: maxScore || 100, sortOrder: 1 },
          ],
        },
      ],
    };

    db.assessments.push(newAssessment);
    return sendSuccess(res, newAssessment, 201);
  }
);

assessmentsRouter.put(
  '/:id',
  requirePermission('assessments:update:batch', 'assessments:update:any'),
  (req: Request, res: Response) => {
    const assessment = db.assessments.find((a) => a.id === req.params.id);
    if (!assessment) return sendError(res, 'Assessment not found', 404);

    if (req.body.title) assessment.title = req.body.title;
    if (req.body.type) assessment.type = req.body.type;
    if (req.body.assessmentDate) assessment.assessmentDate = req.body.assessmentDate;
    if (req.body.maxScore) assessment.maxScore = req.body.maxScore;
    if (req.body.sections) assessment.sections = req.body.sections;

    return sendSuccess(res, assessment);
  }
);

assessmentsRouter.delete(
  '/:id',
  requirePermission('assessments:update:any'),
  (req: Request, res: Response) => {
    const idx = db.assessments.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return sendError(res, 'Assessment not found', 404);
    db.assessments.splice(idx, 1);
    return sendSuccess(res, { message: 'Assessment deleted' });
  }
);

assessmentsRouter.post(
  '/:id/scores',
  requirePermission('assessments:create:batch', 'assessments:update:any'),
  (req: Request, res: Response) => {
    const assessment = db.assessments.find((a) => a.id === req.params.id);
    if (!assessment) return sendError(res, 'Assessment not found', 404);

    const { studentId, score, remarks } = req.body;
    let result = db.assessmentResults.find(
      (r) => r.assessmentId === assessment.id && r.studentId === studentId
    );

    if (result) {
      result.score = Number(score);
      result.remarks = remarks;
    } else {
      result = {
        id: `res-${Date.now()}`,
        assessmentId: assessment.id,
        studentId,
        score: Number(score),
        remarks,
        createdAt: new Date().toISOString(),
      };
      db.assessmentResults.push(result);
    }

    return sendSuccess(res, result, 201);
  }
);

assessmentsRouter.post(
  '/:id/scores/bulk',
  requirePermission('assessments:create:batch', 'assessments:update:any'),
  (req: Request, res: Response) => {
    const assessment = db.assessments.find((a) => a.id === req.params.id);
    if (!assessment) return sendError(res, 'Assessment not found', 404);

    const { scores } = req.body;
    if (!Array.isArray(scores)) return sendError(res, 'Scores array required', 400);

    scores.forEach((s: { studentId: string; score: number; remarks?: string }) => {
      let existing = db.assessmentResults.find(
        (r) => r.assessmentId === assessment.id && r.studentId === s.studentId
      );
      if (existing) {
        existing.score = Number(s.score);
        existing.remarks = s.remarks;
      } else {
        db.assessmentResults.push({
          id: `res-${Date.now()}-${s.studentId}`,
          assessmentId: assessment.id,
          studentId: s.studentId,
          score: Number(s.score),
          remarks: s.remarks,
          createdAt: new Date().toISOString(),
        });
      }
    });

    return sendSuccess(res, { count: scores.length, message: 'Scores submitted successfully' });
  }
);

assessmentsRouter.get(
  '/:id/results',
  requirePermission('assessments:read:own', 'assessments:read:batch', 'assessments:read:assigned', 'assessments:read:any'),
  (req: Request, res: Response) => {
    const assessment = db.assessments.find((a) => a.id === req.params.id);
    if (!assessment) return sendError(res, 'Assessment not found', 404);

    let results = db.assessmentResults.filter((r) => r.assessmentId === assessment.id);
    if (req.user!.role === 'STUDENT') {
      results = results.filter((r) => r.studentId === req.user!.sub);
    }

    const studentMap = new Map(db.users.map((u) => [u.id, u]));
    const formatted = results.map((r) => ({
      ...r,
      student: studentMap.get(r.studentId) || { id: r.studentId, name: 'Student' },
    }));

    return sendSuccess(res, formatted);
  }
);

assessmentsRouter.get('/:id/results/:studentId', (req: Request, res: Response) => {
  const result = db.assessmentResults.find(
    (r) => r.assessmentId === req.params.id && r.studentId === req.params.studentId
  );
  if (!result) return sendError(res, 'Result not found', 404);
  return sendSuccess(res, result);
});

// ==========================================
// 6. FEEDBACK MODULE
// ==========================================
export const feedbackRouter = Router();

feedbackRouter.get(
  '/',
  requirePermission('feedback:read:own_received', 'feedback:read:own_given', 'feedback:read:assigned', 'feedback:read:any'),
  (req: Request, res: Response) => {
    const role = req.user!.role;
    const userId = req.user!.sub;

    let list = db.feedbackRecords;
    if (role === 'STUDENT') {
      list = list.filter((f) => f.studentId === userId);
    } else if (role === 'TRAINER') {
      list = list.filter((f) => f.trainerId === userId);
    } else if (role === 'MENTOR') {
      const assigned = db.mentorAssignments
        .filter((ma) => ma.mentorId === userId)
        .map((ma) => ma.studentId);
      list = list.filter((f) => assigned.includes(f.studentId));
    }

    const studentMap = new Map(db.users.map((u) => [u.id, u]));
    const trainerMap = new Map(db.users.map((u) => [u.id, u]));
    const sessionMap = new Map(db.sessions.map((s) => [s.id, s]));

    const formatted = list.map((f) => ({
      ...f,
      student: studentMap.get(f.studentId),
      trainer: trainerMap.get(f.trainerId),
      session: sessionMap.get(f.sessionId),
    }));

    return sendSuccess(res, formatted);
  }
);

feedbackRouter.post(
  '/',
  requirePermission('feedback:create:batch', 'feedback:read:any'),
  (req: Request, res: Response) => {
    const { sessionId, studentId, effortRating, participationRating, comments } = req.body;
    if (!sessionId || !studentId || !effortRating || !participationRating) {
      return sendError(res, 'Missing feedback fields', 400);
    }

    const record: Feedback = {
      id: `fb-${Date.now()}`,
      sessionId,
      studentId,
      trainerId: req.user!.sub,
      effortRating: Number(effortRating),
      participationRating: Number(participationRating),
      comments,
      createdAt: new Date().toISOString(),
    };

    db.feedbackRecords.push(record);
    return sendSuccess(res, record, 201);
  }
);

feedbackRouter.get('/:id', (req: Request, res: Response) => {
  const f = db.feedbackRecords.find((item) => item.id === req.params.id);
  if (!f) return sendError(res, 'Feedback not found', 404);
  const student = db.users.find((u) => u.id === f.studentId);
  const trainer = db.users.find((u) => u.id === f.trainerId);
  const session = db.sessions.find((s) => s.id === f.sessionId);
  return sendSuccess(res, { ...f, student, trainer, session });
});

// ==========================================
// 7. MENTOR ASSIGNMENTS & MENTOR ALERTS
// ==========================================
export const mentorAssignmentsRouter = Router();

mentorAssignmentsRouter.get('/', (req: Request, res: Response) => {
  const { mentorId, studentId } = req.query;
  let list = db.mentorAssignments;
  if (mentorId) list = list.filter((m) => m.mentorId === mentorId);
  if (studentId) list = list.filter((m) => m.studentId === studentId);

  const userMap = new Map(db.users.map((u) => [u.id, u]));
  const formatted = list.map((a) => ({
    ...a,
    mentor: userMap.get(a.mentorId),
    student: userMap.get(a.studentId),
  }));

  return sendSuccess(res, formatted);
});

mentorAssignmentsRouter.post(
  '/',
  requirePermission('mentor_assignments:create'),
  (req: Request, res: Response) => {
    const { mentorId, studentId } = req.body;
    if (!mentorId || !studentId) return sendError(res, 'mentorId and studentId are required', 400);

    const existing = db.mentorAssignments.find(
      (m) => m.mentorId === mentorId && m.studentId === studentId
    );
    if (existing) return sendError(res, 'Assignment already exists', 409);

    const assign = {
      id: `massign-${Date.now()}`,
      mentorId,
      studentId,
      assignedAt: new Date().toISOString(),
    };
    db.mentorAssignments.push(assign);
    return sendSuccess(res, assign, 201);
  }
);

mentorAssignmentsRouter.delete(
  '/:id',
  requirePermission('mentor_assignments:create'),
  (req: Request, res: Response) => {
    const idx = db.mentorAssignments.findIndex((m) => m.id === req.params.id);
    if (idx === -1) return sendError(res, 'Assignment not found', 404);
    db.mentorAssignments.splice(idx, 1);
    return sendSuccess(res, { message: 'Assignment deleted' });
  }
);

export const mentorAlertsRouter = Router();

mentorAlertsRouter.get('/mentor/:mentorId', (req: Request, res: Response) => {
  const alerts = db.mentorAlerts.filter((a) => a.mentorId === req.params.mentorId);
  const studentMap = new Map(db.users.map((u) => [u.id, u]));
  const formatted = alerts.map((a) => ({
    ...a,
    student: studentMap.get(a.studentId),
  }));
  return sendSuccess(res, formatted);
});

mentorAlertsRouter.get('/student/:studentId', (req: Request, res: Response) => {
  const alerts = db.mentorAlerts.filter((a) => a.studentId === req.params.studentId);
  return sendSuccess(res, alerts);
});

mentorAlertsRouter.get('/stats', (_req: Request, res: Response) => {
  const total = db.mentorAlerts.length;
  const pending = db.mentorAlerts.filter((a) => a.status === 'pending').length;
  const acted = db.mentorAlerts.filter((a) => a.status === 'acted').length;
  const dismissed = db.mentorAlerts.filter((a) => a.status === 'dismissed').length;
  return sendSuccess(res, { total, pending, acted, dismissed });
});

mentorAlertsRouter.put('/:alertId/status', (req: Request, res: Response) => {
  const alertId = Number(req.params.alertId);
  const alert = db.mentorAlerts.find((a) => a.id === alertId);
  if (!alert) return sendError(res, 'Alert not found', 404);
  if (req.body.status) {
    alert.status = req.body.status;
    alert.updatedAt = new Date().toISOString();
  }
  return sendSuccess(res, alert);
});

mentorAlertsRouter.post('/:alertId/outcome', (req: Request, res: Response) => {
  const alertId = Number(req.params.alertId);
  const alert = db.mentorAlerts.find((a) => a.id === alertId);
  if (!alert) return sendError(res, 'Alert not found', 404);

  alert.outcome = {
    mentorResponse: req.body.mentor_response || 'acted',
    responseTimeHours: req.body.response_time_hours || 2,
    wasRecommendationFollowed: req.body.was_recommendation_followed ?? true,
    outcomeNotes: req.body.outcome_notes,
  };
  alert.status = 'acted';
  alert.updatedAt = new Date().toISOString();

  return sendSuccess(res, alert, 201);
});

// ==========================================
// 8. RISK ANALYSIS MODULE
// ==========================================
export const riskRouter = Router();

riskRouter.get(
  '/high',
  requirePermission('risk_scores:read:assigned', 'risk_scores:read:any'),
  (req: Request, res: Response) => {
    let highRisks = db.riskScores.filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'MEDIUM');
    const role = req.user!.role;
    const userId = req.user!.sub;

    if (role === 'MENTOR') {
      const assigned = db.mentorAssignments
        .filter((ma) => ma.mentorId === userId)
        .map((ma) => ma.studentId);
      highRisks = highRisks.filter((r) => assigned.includes(r.studentId));
    }

    const studentMap = new Map(db.users.map((u) => [u.id, u]));
    const formatted = highRisks.map((r) => ({
      ...r,
      student: studentMap.get(r.studentId),
    }));

    return sendSuccess(res, formatted);
  }
);

riskRouter.get(
  '/student/:studentId',
  requirePermission('risk_scores:read:own', 'risk_scores:read:assigned', 'risk_scores:read:category:batch', 'risk_scores:read:any'),
  (req: Request, res: Response) => {
    const studentId = req.params.studentId;
    let score = db.riskScores.find((r) => r.studentId === studentId);
    if (!score) {
      score = {
        id: `risk-${studentId}`,
        studentId,
        attendanceRisk: 10,
        assessmentRisk: 15,
        feedbackRisk: 5,
        totalScore: 30,
        riskLevel: 'LOW',
        factors: { attendanceRate: 92, avgAssessmentScore: 84, negativeFeedbackCount: 0 },
        generatedAt: new Date().toISOString(),
      };
      db.riskScores.push(score);
    }
    const student = db.users.find((u) => u.id === studentId);
    return sendSuccess(res, { ...score, student });
  }
);

riskRouter.get('/student/:studentId/history', (req: Request, res: Response) => {
  const studentId = req.params.studentId;
  const history = db.riskScores.filter((r) => r.studentId === studentId);
  return sendSuccess(res, history);
});

riskRouter.post(
  '/calculate/:studentId',
  requirePermission('risk_scores:calculate:batch', 'risk_scores:calculate:any'),
  (req: Request, res: Response) => {
    const studentId = req.params.studentId;
    // Calculate based on attendance, assessments, and feedback
    const studentAtt = db.attendanceRecords.filter((r) => r.studentId === studentId);
    const present = studentAtt.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const attRate = studentAtt.length > 0 ? (present / studentAtt.length) * 100 : 85;

    const studentRes = db.assessmentResults.filter((r) => r.studentId === studentId);
    const avgScore = studentRes.length > 0
      ? studentRes.reduce((acc, r) => acc + r.score, 0) / studentRes.length
      : 75;

    const studentFb = db.feedbackRecords.filter((r) => r.studentId === studentId);
    const negFbCount = studentFb.filter((f) => f.effortRating <= 2 || f.participationRating <= 2).length;

    let attRisk = attRate < 75 ? 20 : 0;
    let assRisk = avgScore < 50 ? 25 : 0;
    let fbRisk = negFbCount > 0 ? 15 : 0;
    let total = attRisk + assRisk + fbRisk;

    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (total > 60) riskLevel = 'HIGH';
    else if (total > 30) riskLevel = 'MEDIUM';

    const updated: RiskScore = {
      id: `risk-${studentId}-${Date.now()}`,
      studentId,
      attendanceRisk: attRisk,
      assessmentRisk: assRisk,
      feedbackRisk: fbRisk,
      totalScore: total,
      riskLevel,
      factors: {
        attendanceRate: Math.round(attRate),
        avgAssessmentScore: Math.round(avgScore),
        negativeFeedbackCount: negFbCount,
        decliningTrend: attRate < 70,
        mlSuggestedEscalation: riskLevel === 'HIGH',
      },
      generatedAt: new Date().toISOString(),
    };

    // Update in-memory risk score
    const existingIdx = db.riskScores.findIndex((r) => r.studentId === studentId);
    if (existingIdx !== -1) {
      db.riskScores[existingIdx] = updated;
    } else {
      db.riskScores.push(updated);
    }

    return sendSuccess(res, updated);
  }
);

// ==========================================
// 9. INTERVENTIONS MODULE
// ==========================================
export const interventionsRouter = Router();

interventionsRouter.get(
  '/',
  requirePermission('interventions:read:own', 'interventions:read:assigned', 'interventions:read:any'),
  (req: Request, res: Response) => {
    const role = req.user!.role;
    const userId = req.user!.sub;

    let list = db.interventions;
    if (role === 'STUDENT') {
      list = list.filter((i) => i.studentId === userId);
    } else if (role === 'MENTOR') {
      list = list.filter((i) => i.mentorId === userId);
    }

    const studentMap = new Map(db.users.map((u) => [u.id, u]));
    const mentorMap = new Map(db.users.map((u) => [u.id, u]));
    const riskMap = new Map(db.riskScores.map((r) => [r.id, r]));

    const formatted = list.map((i) => ({
      ...i,
      student: studentMap.get(i.studentId),
      mentor: mentorMap.get(i.mentorId),
      riskScore: i.riskScoreId ? riskMap.get(i.riskScoreId) : undefined,
    }));

    return sendSuccess(res, formatted);
  }
);

interventionsRouter.get('/:id', (req: Request, res: Response) => {
  const item = db.interventions.find((i) => i.id === req.params.id);
  if (!item) return sendError(res, 'Intervention not found', 404);

  const student = db.users.find((u) => u.id === item.studentId);
  const mentor = db.users.find((u) => u.id === item.mentorId);
  const riskScore = item.riskScoreId ? db.riskScores.find((r) => r.id === item.riskScoreId) : undefined;

  return sendSuccess(res, { ...item, student, mentor, riskScore });
});

interventionsRouter.post(
  '/',
  requirePermission('interventions:create:assigned'),
  (req: Request, res: Response) => {
    const { studentId, riskScoreId, title, description, deadline } = req.body;
    if (!studentId || !title || !description) {
      return sendError(res, 'studentId, title, and description are required', 400);
    }

    const intervention: Intervention = {
      id: `interv-${Date.now()}`,
      studentId,
      mentorId: req.user!.sub,
      riskScoreId,
      title,
      description,
      status: 'PENDING',
      deadline,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      updates: [],
    };

    db.interventions.push(intervention);
    return sendSuccess(res, intervention, 201);
  }
);

interventionsRouter.put(
  '/:id',
  requirePermission('interventions:update:own'),
  (req: Request, res: Response) => {
    const item = db.interventions.find((i) => i.id === req.params.id);
    if (!item) return sendError(res, 'Intervention not found', 404);

    if (req.body.title) item.title = req.body.title;
    if (req.body.description) item.description = req.body.description;
    if (req.body.status) item.status = req.body.status;
    if (req.body.deadline !== undefined) item.deadline = req.body.deadline;
    item.updatedAt = new Date().toISOString();

    return sendSuccess(res, item);
  }
);

interventionsRouter.post(
  '/:id/updates',
  requirePermission('interventions:update:own'),
  (req: Request, res: Response) => {
    const item = db.interventions.find((i) => i.id === req.params.id);
    if (!item) return sendError(res, 'Intervention not found', 404);
    if (!req.body.note) return sendError(res, 'Note is required', 400);

    const update = {
      id: `upd-${Date.now()}`,
      note: req.body.note,
      createdAt: new Date().toISOString(),
    };
    item.updates.unshift(update);
    item.updatedAt = new Date().toISOString();

    return sendSuccess(res, update, 201);
  }
);

interventionsRouter.post(
  '/:id/outcome',
  requirePermission('interventions:log_outcome:own'),
  (req: Request, res: Response) => {
    const item = db.interventions.find((i) => i.id === req.params.id);
    if (!item) return sendError(res, 'Intervention not found', 404);
    if (!req.body.outcome) return sendError(res, 'Outcome is required', 400);

    item.outcome = {
      id: `out-${Date.now()}`,
      outcome: req.body.outcome,
      remarks: req.body.remarks,
      recordedAt: new Date().toISOString(),
    };
    item.status = 'COMPLETED';
    item.updatedAt = new Date().toISOString();

    return sendSuccess(res, item.outcome, 201);
  }
);

// ==========================================
// 10. TASKS & ASSIGNMENTS
// ==========================================
export const tasksRouter = Router();

tasksRouter.get('/my-tasks', requirePermission('tasks:read:own'), (req: Request, res: Response) => {
  const studentId = req.user!.sub;
  const submissions = db.taskSubmissions.filter((s) => s.studentId === studentId);
  const taskIds = submissions.map((s) => s.taskId);

  // Also include tasks assigned to student's batch
  const studentBatches = db.batches.filter((b) => b.members.includes(studentId)).map((b) => b.id);
  const batchTasks = db.tasks.filter((t) => t.batchIds.some((bid) => studentBatches.includes(bid)));

  const combined = batchTasks.map((task) => {
    const sub = submissions.find((s) => s.taskId === task.id);
    return {
      task,
      submission: sub || {
        id: `tsub-temp-${task.id}`,
        taskId: task.id,
        studentId,
        progress: 'NOT_STARTED',
        isInterested: false,
      },
    };
  });

  return sendSuccess(res, combined);
});

tasksRouter.get(
  '/',
  requirePermission('tasks:read:batch', 'tasks:read:any'),
  (_req: Request, res: Response) => {
    const creatorMap = new Map(db.users.map((u) => [u.id, u]));
    const formatted = db.tasks.map((t) => ({
      ...t,
      createdBy: creatorMap.get(t.createdById),
      submissionCount: db.taskSubmissions.filter((s) => s.taskId === t.id).length,
    }));
    return sendSuccess(res, formatted);
  }
);

tasksRouter.get('/:id', (req: Request, res: Response) => {
  const task = db.tasks.find((t) => t.id === req.params.id);
  if (!task) return sendError(res, 'Task not found', 404);

  const submissions = db.taskSubmissions.filter((s) => s.taskId === task.id);
  const studentMap = new Map(db.users.map((u) => [u.id, u]));
  const formattedSubmissions = submissions.map((s) => ({
    ...s,
    student: studentMap.get(s.studentId),
  }));

  return sendSuccess(res, { ...task, submissions: formattedSubmissions });
});

tasksRouter.post(
  '/',
  requirePermission('tasks:create:batch', 'tasks:create:any'),
  (req: Request, res: Response) => {
    const { title, description, isMandatory, isInternal, maxMarks, deadlineType, deadline, batchIds } = req.body;
    if (!title) return sendError(res, 'Task title is required', 400);

    const task: Task = {
      id: `task-${Date.now()}`,
      title,
      description,
      isMandatory: isMandatory ?? true,
      isInternal: isInternal ?? false,
      maxMarks: maxMarks ? Number(maxMarks) : undefined,
      deadlineType: deadlineType || 'NONE',
      deadline,
      createdById: req.user!.sub,
      batchIds: batchIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.tasks.push(task);
    return sendSuccess(res, task, 201);
  }
);

tasksRouter.post(
  '/:id/progress',
  requirePermission('tasks:update:own'),
  (req: Request, res: Response) => {
    const studentId = req.user!.sub;
    const task = db.tasks.find((t) => t.id === req.params.id);
    if (!task) return sendError(res, 'Task not found', 404);

    let sub = db.taskSubmissions.find((s) => s.taskId === task.id && s.studentId === studentId);
    if (!sub) {
      sub = {
        id: `tsub-${Date.now()}`,
        taskId: task.id,
        studentId,
        progress: req.body.progress || 'IN_PROGRESS',
        isInterested: req.body.isInterested ?? true,
        studentNotes: req.body.studentNotes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.taskSubmissions.push(sub);
    } else {
      if (req.body.progress) sub.progress = req.body.progress;
      if (req.body.isInterested !== undefined) sub.isInterested = req.body.isInterested;
      if (req.body.studentNotes !== undefined) sub.studentNotes = req.body.studentNotes;
      if (req.body.progress === 'COMPLETED') sub.completedAt = new Date().toISOString();
      sub.updatedAt = new Date().toISOString();
    }

    return sendSuccess(res, sub);
  }
);

tasksRouter.post(
  '/:id/marks',
  requirePermission('tasks:grade:batch', 'tasks:grade:any'),
  (req: Request, res: Response) => {
    const { studentId, marksAwarded } = req.body;
    let sub = db.taskSubmissions.find((s) => s.taskId === req.params.id && s.studentId === studentId);
    if (!sub) {
      sub = {
        id: `tsub-${Date.now()}`,
        taskId: req.params.id,
        studentId,
        progress: 'COMPLETED',
        isInterested: true,
        marksAwarded: Number(marksAwarded),
        gradedById: req.user!.sub,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.taskSubmissions.push(sub);
    } else {
      sub.marksAwarded = Number(marksAwarded);
      sub.gradedById = req.user!.sub;
      sub.updatedAt = new Date().toISOString();
    }

    return sendSuccess(res, sub);
  }
);

// ==========================================
// 11. EVENTS & PROOFS
// ==========================================
export const eventsRouter = Router();

eventsRouter.get('/', (_req: Request, res: Response) => {
  const formatted = db.events.map((e) => ({
    ...e,
    _count: {
      registrations: db.eventRegistrations.filter((r) => r.eventId === e.id).length,
      proofSubmissions: db.proofs.filter((p) => p.eventId === e.id).length,
    },
  }));
  return sendSuccess(res, formatted);
});

eventsRouter.get('/:id', (req: Request, res: Response) => {
  const event = db.events.find((e) => e.id === req.params.id);
  if (!event) return sendError(res, 'Event not found', 404);

  const studentMap = new Map(db.users.map((u) => [u.id, u]));
  const registrations = db.eventRegistrations
    .filter((r) => r.eventId === event.id)
    .map((r) => ({ ...r, student: studentMap.get(r.studentId) }));
  const proofs = db.proofs
    .filter((p) => p.eventId === event.id)
    .map((p) => ({ ...p, student: studentMap.get(p.studentId) }));

  return sendSuccess(res, { ...event, registrations, proofs });
});

eventsRouter.post(
  '/',
  requirePermission('events:create'),
  (req: Request, res: Response) => {
    const { title, description, eventType, eventDate, registrationDeadline } = req.body;
    if (!title || !eventType || !eventDate) {
      return sendError(res, 'title, eventType, and eventDate are required', 400);
    }

    const event: EventItem = {
      id: `evt-${Date.now()}`,
      title,
      description,
      eventType,
      eventDate,
      registrationDeadline,
      createdAt: new Date().toISOString(),
    };
    db.events.push(event);
    return sendSuccess(res, event, 201);
  }
);

eventsRouter.post(
  '/:id/register',
  requirePermission('event_registrations:create:self'),
  (req: Request, res: Response) => {
    const eventId = req.params.id;
    const studentId = req.user!.sub;

    const existing = db.eventRegistrations.find(
      (r) => r.eventId === eventId && r.studentId === studentId
    );
    if (existing) return sendError(res, 'Already registered for this event', 409);

    const reg: EventRegistration = {
      id: `ereg-${Date.now()}`,
      eventId,
      studentId,
      registeredAt: new Date().toISOString(),
    };
    db.eventRegistrations.push(reg);
    return sendSuccess(res, reg, 201);
  }
);

export const proofsRouter = Router();

proofsRouter.get(
  '/',
  requirePermission('proofs:read:batch', 'proofs:read:any'),
  (_req: Request, res: Response) => {
    const studentMap = new Map(db.users.map((u) => [u.id, u]));
    const eventMap = new Map(db.events.map((e) => [e.id, e]));

    const formatted = db.proofs.map((p) => ({
      ...p,
      student: studentMap.get(p.studentId),
      event: eventMap.get(p.eventId),
    }));
    return sendSuccess(res, formatted);
  }
);

proofsRouter.get('/my', requirePermission('proofs:read:own'), (req: Request, res: Response) => {
  const studentId = req.user!.sub;
  const list = db.proofs.filter((p) => p.studentId === studentId);
  const eventMap = new Map(db.events.map((e) => [e.id, e]));

  const formatted = list.map((p) => ({
    ...p,
    event: eventMap.get(p.eventId),
  }));
  return sendSuccess(res, formatted);
});

proofsRouter.post(
  '/',
  requirePermission('proofs:submit:self'),
  (req: Request, res: Response) => {
    const { eventId, fileName, fileUrl } = req.body;
    if (!eventId || !fileName) {
      return sendError(res, 'eventId and fileName are required', 400);
    }

    const studentId = req.user!.sub;
    let proof = db.proofs.find((p) => p.eventId === eventId && p.studentId === studentId);

    if (proof) {
      proof.fileName = fileName;
      proof.fileUrl = fileUrl || 'https://drive.google.com/file/d/sample-proof/view';
      proof.status = 'PENDING';
      proof.remarks = undefined;
    } else {
      proof = {
        id: `proof-${Date.now()}`,
        eventId,
        studentId,
        fileName,
        fileUrl: fileUrl || 'https://drive.google.com/file/d/sample-proof/view',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };
      db.proofs.push(proof);
    }

    return sendSuccess(res, proof, 201);
  }
);

proofsRouter.patch(
  '/:id/review',
  requirePermission('proofs:approve:batch', 'proofs:approve:any'),
  (req: Request, res: Response) => {
    const proof = db.proofs.find((p) => p.id === req.params.id);
    if (!proof) return sendError(res, 'Proof not found', 404);
    if (!req.body.status) return sendError(res, 'Status is required', 400);

    proof.status = req.body.status;
    if (req.body.remarks !== undefined) proof.remarks = req.body.remarks;

    return sendSuccess(res, proof);
  }
);

// ==========================================
// 12. ENGAGEMENT DASHBOARD
// ==========================================
export const engagementRouter = Router();

engagementRouter.get('/dashboard', (_req: Request, res: Response) => {
  const totalStudents = db.users.filter((u) => u.role === 'STUDENT').length;
  const totalBatches = db.batches.length;
  const totalSessions = db.sessions.length;

  const totalAtt = db.attendanceRecords.length;
  const attended = db.attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
  const attendanceRate = totalAtt > 0 ? Math.round((attended / totalAtt) * 100) : 0;

  const avgAssessment = db.assessmentResults.length > 0
    ? Math.round(db.assessmentResults.reduce((a, b) => a + b.score, 0) / db.assessmentResults.length)
    : 0;

  const avgEffort = db.feedbackRecords.length > 0
    ? Math.round((db.feedbackRecords.reduce((a, b) => a + b.effortRating, 0) / db.feedbackRecords.length) * 10) / 10
    : 0;

  const highRiskCount = db.riskScores.filter((r) => r.riskLevel === 'HIGH').length;

  return sendSuccess(res, {
    totalStudents,
    totalBatches,
    totalSessions,
    attendanceRate,
    avgAssessmentScore: avgAssessment,
    avgEffortRating: avgEffort,
    highRiskCount,
    batches: db.batches.map((b) => ({
      id: b.id,
      name: b.name,
      department: b.department,
      studentCount: b.members.length,
    })),
  });
});

engagementRouter.get('/batch/:batchId', (req: Request, res: Response) => {
  const batch = db.batches.find((b) => b.id === req.params.batchId);
  if (!batch) return sendError(res, 'Batch not found', 404);

  const students = db.users.filter((u) => batch.members.includes(u.id));
  const batchSessions = db.sessions.filter((s) => s.batchId === batch.id);
  const sessionIds = batchSessions.map((s) => s.id);

  const studentBreakdown = students.map((student) => {
    const att = db.attendanceRecords.filter(
      (r) => sessionIds.includes(r.sessionId) && r.studentId === student.id
    );
    const present = att.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const attRate = att.length > 0 ? Math.round((present / att.length) * 100) : 0;

    const scores = db.assessmentResults.filter((r) => r.studentId === student.id);
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length)
      : 0;

    const fbs = db.feedbackRecords.filter((f) => f.studentId === student.id);
    const avgEffort = fbs.length > 0
      ? Math.round((fbs.reduce((a, b) => a + b.effortRating, 0) / fbs.length) * 10) / 10
      : 0;

    const risk = db.riskScores.find((r) => r.studentId === student.id);

    return {
      student: { id: student.id, name: student.name, email: student.email, department: student.department },
      attendanceRate: attRate,
      assessmentAverage: avgScore,
      effortRating: avgEffort,
      riskLevel: risk?.riskLevel || 'LOW',
    };
  });

  return sendSuccess(res, {
    batch: { id: batch.id, name: batch.name, department: batch.department },
    students: studentBreakdown,
  });
});

engagementRouter.get('/batch/:batchId/trends', (req: Request, res: Response) => {
  const batch = db.batches.find((b) => b.id === req.params.batchId);
  if (!batch) return sendError(res, 'Batch not found', 404);

  const sessions = db.sessions.filter((s) => s.batchId === batch.id);
  const sessionTrends = sessions.map((sess) => {
    const records = db.attendanceRecords.filter((r) => r.sessionId === sess.id);
    const present = records.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;

    return {
      sessionId: sess.id,
      title: sess.title,
      date: sess.scheduledDate,
      attendanceRate: rate,
    };
  });

  return sendSuccess(res, { batchId: batch.id, sessions: sessionTrends });
});

engagementRouter.get('/student/:studentId', (req: Request, res: Response) => {
  const student = db.users.find((u) => u.id === req.params.studentId);
  if (!student) return sendError(res, 'Student not found', 404);

  const att = db.attendanceRecords.filter((r) => r.studentId === student.id);
  const present = att.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
  const attRate = att.length > 0 ? Math.round((present / att.length) * 100) : 0;

  const results = db.assessmentResults.filter((r) => r.studentId === student.id);
  const avgScore = results.length > 0
    ? Math.round(results.reduce((a, b) => a + b.score, 0) / results.length)
    : 0;

  const feedback = db.feedbackRecords.filter((f) => f.studentId === student.id);
  const risk = db.riskScores.find((r) => r.studentId === student.id);

  return sendSuccess(res, {
    student,
    attendanceRate: attRate,
    avgAssessmentScore: avgScore,
    feedbackCount: feedback.length,
    risk,
  });
});

// ==========================================
// 13. MODULE 18 — WEEKLY HIGH-ACHIEVER LEADERBOARD
// GET /api/leaderboard/batch/:batchId?week=YYYY-MM-DD
// Formula: attendance (30%), avg assessment (50%), contest participation (20%)
// ==========================================
export const leaderboardRouter = Router();

leaderboardRouter.get('/batch/:batchId', (req: Request, res: Response) => {
  const batchId = req.params.batchId;
  const weekParam = req.query.week ? String(req.query.week) : '2026-10-05';

  const batch = db.batches.find((b) => b.id === batchId);
  if (!batch) {
    return sendError(res, 'Batch not found', 404);
  }

  const batchStudents = db.users.filter((u) => batch.members.includes(u.id));
  const batchSessions = db.sessions.filter((s) => s.batchId === batch.id);
  const sessionIds = batchSessions.map((s) => s.id);

  // Contests in the system
  const contestAssessments = db.assessments.filter((a) => a.batchId === batch.id && a.type === 'CONTEST');
  const hasContestData = contestAssessments.length > 0;

  // Calculate scores for each student
  const studentScores = batchStudents.map((student) => {
    // 1. Attendance (30%)
    const attRecords = db.attendanceRecords.filter(
      (r) => sessionIds.includes(r.sessionId) && r.studentId === student.id
    );
    const attended = attRecords.filter((r) => r.status === 'PRESENT' || r.status === 'LATE').length;
    const attendanceRate = attRecords.length > 0 ? (attended / attRecords.length) * 100 : 85;

    // 2. Avg Assessment (50%)
    const results = db.assessmentResults.filter((r) => r.studentId === student.id);
    const assessmentAvg = results.length > 0
      ? results.reduce((acc, r) => acc + r.score, 0) / results.length
      : 70;

    // 3. Contest Participation / Score (20%)
    let contestScore = 0;
    if (hasContestData) {
      const contestResults = results.filter((r) =>
        contestAssessments.some((c) => c.id === r.assessmentId)
      );
      if (contestResults.length > 0) {
        contestScore = contestResults.reduce((acc, r) => acc + r.score, 0) / contestResults.length;
      } else {
        contestScore = 50; // Participated baseline
      }
    } else {
      // If no contest recorded for the week, estimate based on event proofs or mark warning
      const proofCount = db.proofs.filter((p) => p.studentId === student.id && p.status === 'APPROVED').length;
      contestScore = proofCount > 0 ? 80 : 40;
    }

    // Weighted final score
    const finalScore = Math.round(
      (attendanceRate * 0.3) + (assessmentAvg * 0.5) + (contestScore * 0.2)
    );

    return {
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        department: student.department,
        year: student.year,
      },
      attendanceRate: Math.round(attendanceRate),
      assessmentAverage: Math.round(assessmentAvg),
      contestScore: Math.round(contestScore),
      finalScore,
    };
  });

  // Sort by final score descending
  studentScores.sort((a, b) => b.finalScore - a.finalScore);

  // Take top 10 with ranks
  const top10 = studentScores.slice(0, 10).map((item, idx) => ({
    rank: idx + 1,
    ...item,
  }));

  return sendSuccess(res, {
    batch: { id: batch.id, name: batch.name, department: batch.department },
    week: weekParam,
    contestDataWarning: !hasContestData
      ? 'Note: Direct contest metrics for this week were incomplete; contest component weighted from verified event proofs.'
      : null,
    leaderboard: top10,
    totalEvaluated: studentScores.length,
  });
});
