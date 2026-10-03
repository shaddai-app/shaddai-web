import { api } from './http';

export const ENROLLMENT_STATUSES = ['active', 'completed', 'dropped'] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

type Counts = Record<EnrollmentStatus, number>;

export interface CourseLevel {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  teacher: { id: number; name: string } | null;
  /** Asistencia mínima (%) para aprobar; solo informa. */
  minAttendancePct: number | null;
  /** null si el usuario no ve las inscripciones de ese nivel (alcance propio). */
  counts: Counts | null;
  canView: boolean;
  canEnroll: boolean;
}

export interface Course {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  milestoneType: { id: number; name: string | null; systemKey: string | null } | null;
  levels: CourseLevel[];
}

export interface CourseInput {
  name: string;
  description?: string | null;
  milestoneTypeId?: number | null;
  isActive?: boolean;
}

export interface LevelInput {
  name: string;
  description?: string | null;
  teacherPersonId?: number | null;
  minAttendancePct?: number | null;
  isActive?: boolean;
}

/** Avance: asistencias sobre las clases en que se le tomó lista. */
export interface Progress {
  sessions: number;
  attended: number;
  pct: number | null;
  /** null: el nivel no pide mínimo o todavía no hubo clases. */
  meetsMinimum: boolean | null;
}

export interface CourseSessionSummary {
  id: number;
  /** "YYYY-MM-DD". */
  date: string;
  topic: string | null;
  notes: string | null;
  present: number;
  total: number;
}

export interface RosterEntry {
  enrollmentId: number;
  person: { id: number; firstName: string; lastName: string };
  /** null = todavía no se tomó para esta persona. */
  present: boolean | null;
}

export interface CourseSession {
  id: number;
  levelId: number;
  date: string;
  topic: string | null;
  notes: string | null;
  roster: RosterEntry[];
}

export interface SessionInput {
  date: string;
  topic?: string | null;
  notes?: string | null;
  attendance: { enrollmentId: number; present: boolean }[];
}

export interface Enrollment {
  id: number;
  levelId: number;
  status: EnrollmentStatus;
  /** Días "YYYY-MM-DD". */
  enrolledAt: string;
  completedAt: string | null;
  droppedAt: string | null;
  notes: string | null;
  person: { id: number; firstName: string; lastName: string; phone: string | null };
  progress: Progress;
}

export interface EnrollmentUpdateResult {
  enrollment: Enrollment;
  /** Se cargó el hito del curso en la ficha (completó el último nivel). */
  milestoneAdded: boolean;
  /** Nivel siguiente en el que todavía no está inscripta. */
  nextLevel: { id: number; name: string } | null;
}

export interface PersonCourse {
  id: number;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  droppedAt: string | null;
  level: { id: number; name: string; course: { id: number; name: string } };
  progress: Progress;
}

export const coursesApi = {
  list: (includeInactive = false) => api.get<{ items: Course[] }>('/courses', { includeInactive }),
  get: (id: number) => api.get<Course>(`/courses/${id}`),
  create: (body: CourseInput & { levels: LevelInput[] }) => api.post<Course>('/courses', body),
  update: (id: number, body: Partial<CourseInput>) => api.patch<Course>(`/courses/${id}`, body),
  remove: (id: number) => api.delete<void>(`/courses/${id}`),
  addLevel: (courseId: number, body: LevelInput) => api.post<Course>(`/courses/${courseId}/levels`, body),
  updateLevel: (id: number, body: Partial<LevelInput>) => api.patch<Course>(`/course-levels/${id}`, body),
  reorderLevels: (courseId: number, ids: number[]) =>
    api.put<Course>(`/courses/${courseId}/levels/order`, { ids }),
  removeLevel: (id: number) => api.delete<void>(`/course-levels/${id}`),
  enrollments: (levelId: number, status: EnrollmentStatus) =>
    api.get<{ items: Enrollment[] }>(`/course-levels/${levelId}/enrollments`, { status }),
  enroll: (levelId: number, personIds: number[], enrolledAt?: string) =>
    api.post<{ created: number; skipped: number }>(`/course-levels/${levelId}/enrollments`, {
      personIds,
      ...(enrolledAt ? { enrolledAt } : {}),
    }),
  updateEnrollment: (id: number, body: { status?: EnrollmentStatus; date?: string; notes?: string | null }) =>
    api.patch<EnrollmentUpdateResult>(`/course-enrollments/${id}`, body),
  removeEnrollment: (id: number) => api.delete<void>(`/course-enrollments/${id}`),
  sessions: (levelId: number) =>
    api.get<{ items: CourseSessionSummary[] }>(`/course-levels/${levelId}/sessions`),
  roster: (levelId: number, date: string) =>
    api.get<{ items: RosterEntry[] }>(`/course-levels/${levelId}/roster`, { date }),
  session: (id: number) => api.get<CourseSession>(`/course-sessions/${id}`),
  createSession: (levelId: number, body: SessionInput) =>
    api.post<CourseSession>(`/course-levels/${levelId}/sessions`, body),
  updateSession: (id: number, body: Partial<SessionInput>) =>
    api.patch<CourseSession>(`/course-sessions/${id}`, body),
  removeSession: (id: number) => api.delete<void>(`/course-sessions/${id}`),
  personCourses: (personId: number) => api.get<{ items: PersonCourse[] }>(`/people/${personId}/courses`),
};
