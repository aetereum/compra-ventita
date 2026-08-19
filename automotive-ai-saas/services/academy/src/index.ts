import { createDB, schema } from '@automotive/database';
import { createEventBus } from '@automotive/events';
import type { 
  UUID, 
  ISODateString, 
  Course,
  CourseStatus,
  CourseLevel,
  Lesson,
  LessonType,
  Enrollment,
  EnrollmentStatus,
  Certificate,
  Quiz,
  QuizQuestion,
} from '@automotive/types';
import { and, eq, desc, sql, count } from 'drizzle-orm';

interface Env {
  DB: D1Database;
  EVENT_QUEUE: Queue;
  AI: Ai;
}

export class AcademyService {
  private db: ReturnType<typeof createDB>;
  private eventBus: ReturnType<typeof createEventBus>;
  private env: Env;

  constructor(env: Env) {
    this.db = createDB(env.DB);
    this.eventBus = createEventBus(env.DB);
    this.env = env;
  }

  // Course Management
  async createCourse(data: Partial<Course>, organizationId: UUID, instructorId: UUID): Promise<Course> {
    const courseId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const course: Course = {
      id: courseId,
      organizationId,
      title: data.title!,
      description: data.description!,
      shortDescription: data.shortDescription,
      thumbnailUrl: data.thumbnailUrl,
      instructorId,
      category: data.category || 'General',
      level: data.level || 'BEGINNER',
      language: data.language || 'es',
      price: data.price || 0,
      currency: data.currency || 'USD',
      status: 'DRAFT',
      modules: data.modules || [],
      requirements: data.requirements || [],
      learningOutcomes: data.learningOutcomes || [],
      targetAudience: data.targetAudience,
      durationMinutes: 0,
      enrolledCount: 0,
      rating: 0,
      reviewCount: 0,
      tags: data.tags || [],
      certificateTemplate: data.certificateTemplate,
      settings: data.settings || {},
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.courses).values(course as any);
    await this.eventBus.publish({
      type: 'course.created',
      payload: course,
      organizationId,
      userId: instructorId,
    });

    return course;
  }

  async getCourse(courseId: UUID, organizationId: UUID): Promise<Course | null> {
    return this.db
      .select()
      .from(schema.courses)
      .where(and(eq(schema.courses.id, courseId), eq(schema.courses.organizationId, organizationId)))
      .get() as any;
  }

  async listCourses(organizationId: UUID, params: { 
    page?: number; 
    limit?: number; 
    status?: CourseStatus;
    category?: string;
    level?: CourseLevel;
    instructorId?: UUID;
  }): Promise<{ data: Course[]; meta: any }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = this.db
      .select()
      .from(schema.courses)
      .where(and(
        eq(schema.courses.organizationId, organizationId),
        eq(schema.courses.deletedAt, null)
      ));

    if (params.status) query = query.where(eq(schema.courses.status, params.status));
    if (params.category) query = query.where(eq(schema.courses.category, params.category));
    if (params.level) query = query.where(eq(schema.courses.level, params.level));
    if (params.instructorId) query = query.where(eq(schema.courses.instructorId, params.instructorId));

    const [courses, totalResult] = await Promise.all([
      query.orderBy(desc(schema.courses.createdAt)).limit(limit).offset(offset).all(),
      this.db.select({ count: count() }).from(schema.courses).where(
        and(eq(schema.courses.organizationId, organizationId), eq(schema.courses.deletedAt, null))
      ).get(),
    ]);

    const total = totalResult?.count || 0;
    return {
      data: courses as any[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
    };
  }

  async updateCourse(courseId: UUID, organizationId: UUID, updates: Partial<Course>): Promise<Course | null> {
    const existing = await this.getCourse(courseId, organizationId);
    if (!existing) return null;

    // Recalculate duration if modules changed
    let durationMinutes = existing.durationMinutes;
    if (updates.modules) {
      durationMinutes = updates.modules.reduce((sum, m) => sum + (m.durationMinutes || 0), 0);
    }

    const updateData = { ...updates, durationMinutes, updatedAt: new Date().toISOString() };
    await this.db.update(schema.courses).set(updateData).where(eq(schema.courses.id, courseId));

    return this.getCourse(courseId, organizationId);
  }

  async publishCourse(courseId: UUID, organizationId: UUID): Promise<Course | null> {
    return this.updateCourse(courseId, organizationId, { status: 'PUBLISHED' });
  }

  async deleteCourse(courseId: UUID, organizationId: UUID): Promise<boolean> {
    const course = await this.getCourse(courseId, organizationId);
    if (!course) return false;

    await this.db.update(schema.courses).set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(schema.courses.id, courseId));
    return true;
  }

  // Module & Lesson Management
  async addModule(courseId: UUID, organizationId: UUID, module: Omit<Course['modules'][0], 'id' | 'courseId'>): Promise<Course | null> {
    const course = await this.getCourse(courseId, organizationId);
    if (!course) return null;

    const newModule = {
      ...module,
      id: crypto.randomUUID() as UUID,
      courseId,
      order: course.modules.length + 1,
      lessons: module.lessons?.map((l, i) => ({ ...l, id: crypto.randomUUID() as UUID, moduleId: '', order: i + 1 })) || [],
    } as any;

    const updatedModules = [...course.modules, newModule];
    return this.updateCourse(courseId, organizationId, { modules: updatedModules });
  }

  async updateModule(courseId: UUID, organizationId: UUID, moduleId: UUID, updates: Partial<Course['modules'][0]>): Promise<Course | null> {
    const course = await this.getCourse(courseId, organizationId);
    if (!course) return null;

    const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) return null;

    const updatedModules = [...course.modules];
    updatedModules[moduleIndex] = { ...updatedModules[moduleIndex], ...updates };

    return this.updateCourse(courseId, organizationId, { modules: updatedModules });
  }

  async deleteModule(courseId: UUID, organizationId: UUID, moduleId: UUID): Promise<Course | null> {
    const course = await this.getCourse(courseId, organizationId);
    if (!course) return null;

    const updatedModules = course.modules.filter(m => m.id !== moduleId);
    return this.updateCourse(courseId, organizationId, { modules: updatedModules });
  }

  async addLesson(moduleId: UUID, courseId: UUID, organizationId: UUID, lesson: Omit<Lesson, 'id' | 'moduleId'>): Promise<Course | null> {
    const course = await this.getCourse(courseId, organizationId);
    if (!course) return null;

    const moduleIndex = course.modules.findIndex(m => m.id === moduleId);
    if (moduleIndex === -1) return null;

    const newLesson: Lesson = {
      ...lesson,
      id: crypto.randomUUID() as UUID,
      moduleId,
      order: course.modules[moduleIndex].lessons.length + 1,
    } as any;

    const updatedModules = [...course.modules];
    updatedModules[moduleIndex] = {
      ...updatedModules[moduleIndex],
      lessons: [...updatedModules[moduleIndex].lessons, newLesson],
    };

    return this.updateCourse(courseId, organizationId, { modules: updatedModules });
  }

  async updateLesson(courseId: UUID, organizationId: UUID, lessonId: UUID, updates: Partial<Lesson>): Promise<Course | null> {
    const course = await this.getCourse(courseId, organizationId);
    if (!course) return null;

    let found = false;
    const updatedModules = course.modules.map(module => ({
      ...module,
      lessons: module.lessons.map(lesson => {
        if (lesson.id === lessonId) {
          found = true;
          return { ...lesson, ...updates };
        }
        return lesson;
      }),
    }));

    if (!found) return null;

    return this.updateCourse(courseId, organizationId, { modules: updatedModules });
  }

  // Enrollment Management
  async enrollStudent(courseId: UUID, organizationId: UUID, userId: UUID): Promise<Enrollment | null> {
    const course = await this.getCourse(courseId, organizationId);
    if (!course || course.status !== 'PUBLISHED') return null;

    // Check existing enrollment
    const existing = await this.db
      .select()
      .from(schema.enrollments)
      .where(and(
        eq(schema.enrollments.courseId, courseId),
        eq(schema.enrollments.userId, userId),
        eq(schema.enrollments.organizationId, organizationId)
      ))
      .get();

    if (existing) return existing as any;

    const enrollmentId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;

    const enrollment: Enrollment = {
      id: enrollmentId,
      organizationId,
      userId,
      courseId,
      status: 'ACTIVE',
      progress: 0,
      completedModules: [],
      completedLessons: [],
      quizScores: [],
      startedAt: now,
      lastAccessAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.enrollments).values(enrollment as any);

    // Update course enrolled count
    await this.db.update(schema.courses)
      .set({ enrolledCount: (course.enrolledCount || 0) + 1, updatedAt: now })
      .where(eq(schema.courses.id, courseId));

    await this.eventBus.publish({
      type: 'course.enrolled',
      payload: enrollment,
      organizationId,
      userId,
    });

    return enrollment;
  }

  async getEnrollment(enrollmentId: UUID, organizationId: UUID): Promise<Enrollment | null> {
    return this.db
      .select()
      .from(schema.enrollments)
      .where(and(eq(schema.enrollments.id, enrollmentId), eq(schema.enrollments.organizationId, organizationId)))
      .get() as any;
  }

  async getUserEnrollment(courseId: UUID, organizationId: UUID, userId: UUID): Promise<Enrollment | null> {
    return this.db
      .select()
      .from(schema.enrollments)
      .where(and(
        eq(schema.enrollments.courseId, courseId),
        eq(schema.enrollments.userId, userId),
        eq(schema.enrollments.organizationId, organizationId)
      ))
      .get() as any;
  }

  async listEnrollments(organizationId: UUID, params: { 
    userId?: UUID;
    courseId?: UUID;
    status?: EnrollmentStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: Enrollment[]; meta: any }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    let query = this.db
      .select()
      .from(schema.enrollments)
      .where(and(eq(schema.enrollments.organizationId, organizationId)));

    if (params.userId) query = query.where(eq(schema.enrollments.userId, params.userId));
    if (params.courseId) query = query.where(eq(schema.enrollments.courseId, params.courseId));
    if (params.status) query = query.where(eq(schema.enrollments.status, params.status));

    const [enrollments, totalResult] = await Promise.all([
      query.orderBy(desc(schema.enrollments.createdAt)).limit(limit).offset(offset).all(),
      this.db.select({ count: count() }).from(schema.enrollments).where(eq(schema.enrollments.organizationId, organizationId)).get(),
    ]);

    const total = totalResult?.count || 0;
    return {
      data: enrollments as any[],
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNext: page < Math.ceil(total / limit), hasPrev: page > 1 },
    };
  }

  async updateLessonProgress(
    enrollmentId: UUID, 
    organizationId: UUID, 
    lessonId: UUID, 
    completed: boolean
  ): Promise<Enrollment | null> {
    const enrollment = await this.getEnrollment(enrollmentId, organizationId);
    if (!enrollment) return null;

    const course = await this.getCourse(enrollment.courseId, organizationId);
    if (!course) return null;

    const completedLessons = [...new Set([...enrollment.completedLessons, ...(completed ? [lessonId] : [])])];
    
    // Check if module completed
    const module = course.modules.find(m => m.lessons.some(l => l.id === lessonId));
    let completedModules = [...enrollment.completedModules];
    
    if (module) {
      const moduleLessonsComplete = module.lessons.every(l => completedLessons.includes(l.id));
      if (moduleLessonsComplete && !completedModules.includes(module.id)) {
        completedModules = [...completedModules, module.id];
      }
    }

    // Calculate progress
    const totalLessons = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const progress = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

    const newStatus = progress >= 100 ? 'COMPLETED' : enrollment.status;

    const updates: any = {
      completedLessons,
      completedModules,
      progress,
      status: newStatus,
      lastAccessAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (newStatus === 'COMPLETED') {
      updates.completedAt = new Date().toISOString();
      // Generate certificate
      await this.generateCertificate(enrollmentId, organizationId);
    }

    await this.db.update(schema.enrollments).set(updates).where(eq(schema.enrollments.id, enrollmentId));

    return this.getEnrollment(enrollmentId, organizationId);
  }

  // Quiz Management
  async submitQuiz(
    enrollmentId: UUID,
    organizationId: UUID,
    quizId: UUID,
    answers: Record<string, string | string[]>
  ): Promise<{ passed: boolean; score: number; maxScore: number; certificateId?: UUID }> {
    const enrollment = await this.getEnrollment(enrollmentId, organizationId);
    if (!enrollment) throw new Error('Enrollment not found');

    const course = await this.getCourse(enrollment.courseId, organizationId);
    if (!course) throw new Error('Course not found');

    // Find quiz in course
    let quiz: Quiz | null = null;
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (lesson.quiz?.id === quizId) {
          quiz = lesson.quiz;
          break;
        }
      }
      if (quiz) break;
    }

    if (!quiz) throw new Error('Quiz not found');

    // Grade quiz
    let score = 0;
    const maxScore = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const gradedAnswers: any[] = [];

    for (const question of quiz.questions) {
      const userAnswer = answers[question.id];
      const isCorrect = this.gradeAnswer(question, userAnswer);
      const points = isCorrect ? question.points : 0;
      score += points;
      gradedAnswers.push({ questionId: question.id, answer: userAnswer, isCorrect, points });
    }

    const passed = score >= (quiz.passingScore / 100) * maxScore;
    const attempt = (enrollment.quizScores?.filter(qs => qs.quizId === quizId).length || 0) + 1;

    const quizScore = {
      quizId,
      score,
      maxScore,
      passed,
      attempt,
      completedAt: new Date().toISOString(),
      answers: gradedAnswers,
    };

    await this.db.update(schema.enrollments).set({
      quizScores: [...(enrollment.quizScores || []), quizScore],
      updatedAt: new Date().toISOString(),
    }).where(eq(schema.enrollments.id, enrollmentId));

    // Check if lesson/module can be unlocked
    if (passed) {
      const lesson = this.findLessonWithQuiz(course, quizId);
      if (lesson?.unlockCondition?.type === 'PASS_QUIZ') {
        await this.updateLessonProgress(enrollmentId, organizationId, lesson.id, true);
      }
    }

    return { passed, score, maxScore };
  }

  private gradeAnswer(question: QuizQuestion, userAnswer: string | string[] | undefined): boolean {
    if (!userAnswer) return false;

    if (question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE') {
      return userAnswer === question.correctAnswer;
    }

    if (question.type === 'MULTIPLE_CHOICE') {
      const correct = Array.isArray(question.correctAnswer) ? question.correctAnswer : [question.correctAnswer];
      const user = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
      return correct.length === user.length && correct.every(c => user.includes(c));
    }

    if (question.type === 'SHORT_ANSWER') {
      // Simple text matching - in production would use AI
      return String(userAnswer).toLowerCase().trim() === String(question.correctAnswer).toLowerCase().trim();
    }

    return false;
  }

  private findLessonWithQuiz(course: Course, quizId: UUID): Lesson | null {
    for (const module of course.modules) {
      for (const lesson of module.lessons) {
        if (lesson.quiz?.id === quizId) return lesson;
      }
    }
    return null;
  }

  // Certificate Generation
  async generateCertificate(enrollmentId: UUID, organizationId: UUID): Promise<Certificate | null> {
    const enrollment = await this.getEnrollment(enrollmentId, organizationId);
    if (!enrollment || enrollment.status !== 'COMPLETED') return null;

    const course = await this.getCourse(enrollment.courseId, organizationId);
    if (!course) return null;

    const existingCert = await this.db
      .select()
      .from(schema.certificates)
      .where(eq(schema.certificates.enrollmentId, enrollmentId))
      .get();

    if (existingCert) return existingCert as any;

    const certificateId = crypto.randomUUID() as UUID;
    const now = new Date().toISOString() as ISODateString;
    const certificateNumber = `CERT-${organizationId.slice(0, 8)}-${enrollmentId.slice(0, 8)}`.toUpperCase();

    const certificate: Certificate = {
      id: certificateId,
      organizationId,
      enrollmentId,
      userId: enrollment.userId,
      courseId: enrollment.courseId,
      templateId: course.certificateTemplate || 'default',
      certificateNumber,
      issuedAt: now,
      expiresAt: course.settings.certificateExpiryMonths 
        ? new Date(Date.now() + course.settings.certificateExpiryMonths * 30 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      verificationUrl: `https://verify.automotive-ai-saas.com/${certificateNumber}`,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(schema.certificates).values(certificate as any);

    // Update enrollment with certificate ID
    await this.db.update(schema.enrollments).set({ certificateId, updatedAt: now }).where(eq(schema.enrollments.id, enrollmentId));

    await this.eventBus.publish({
      type: 'certificate.issued',
      payload: certificate,
      organizationId,
      userId: enrollment.userId,
    });

    return certificate;
  }

  async getCertificate(certificateId: UUID, organizationId: UUID): Promise<Certificate | null> {
    return this.db
      .select()
      .from(schema.certificates)
      .where(and(eq(schema.certificates.id, certificateId), eq(schema.certificates.organizationId, organizationId)))
      .get() as any;
  }

  async verifyCertificate(certificateNumber: string): Promise<Certificate | null> {
    // This would be a public endpoint
    return this.db
      .select()
      .from(schema.certificates)
      .where(eq(schema.certificates.certificateNumber, certificateNumber))
      .get() as any;
  }

  // AI Tutor
  async askTutor(enrollmentId: UUID, organizationId: UUID, question: string): Promise<string> {
    const enrollment = await this.getEnrollment(enrollmentId, organizationId);
    if (!enrollment) throw new Error('Enrollment not found');

    const course = await this.getCourse(enrollment.courseId, organizationId);
    if (!course) throw new Error('Course not found');

    // Get current lesson context
    const currentLesson = enrollment.currentLessonId 
      ? this.findLessonById(course, enrollment.currentLessonId)
      : null;

    const context = `
Curso: ${course.title}
Módulo actual: ${currentLesson ? 'Lección ' + currentLesson.order : 'No iniciado'}
Progreso: ${enrollment.progress}%
Nivel del estudiante: ${course.level}
    `.trim();

    const response = await this.env.AI.run('@cf/meta/llama-3-8b-instruct', {
      messages: [
        { role: 'system', content: `Eres un tutor experto en ${course.category}. Ayuda al estudiante a entender los conceptos. Contexto: ${context}` },
        { role: 'user', content: question },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.response || 'Lo siento, no pude generar una respuesta en este momento.';
  }

  private findLessonById(course: Course, lessonId: UUID): Lesson | null {
    for (const module of course.modules) {
      const lesson = module.lessons.find(l => l.id === lessonId);
      if (lesson) return lesson;
    }
    return null;
  }

  // SaaS Integration in Lessons
  async getSaasIntegrationData(enrollmentId: UUID, organizationId: UUID, integrationType: string): Promise<any> {
    const enrollment = await this.getEnrollment(enrollmentId, organizationId);
    if (!enrollment) return null;

    // Based on integration type, return relevant data
    switch (integrationType) {
      case 'RADAR':
        // Return radar opportunities for student to analyze
        return { opportunities: [], message: 'Integración con Radar disponible' };
      case 'VEHICLE_SEARCH':
        return { vehicles: [], message: 'Búsqueda de vehículos disponible' };
      case 'CRM':
        return { leads: [], message: 'CRM disponible para práctica' };
      case 'CALCULATOR':
        return { calculator: 'financing', message: 'Calculadora de financiamiento' };
      case 'SIMULATOR':
        return { simulator: 'negotiation', message: 'Simulador de negociación' };
      default:
        return null;
    }
  }

  // Analytics
  async getCourseAnalytics(organizationId: UUID, courseId?: UUID): Promise<any> {
    let query = this.db
      .select()
      .from(schema.courses)
      .where(and(eq(schema.courses.organizationId, organizationId), eq(schema.courses.deletedAt, null)));

    if (courseId) query = query.where(eq(schema.courses.id, courseId));

    const courses = await query.all();

    if (courseId) {
      const course = courses[0];
      const enrollments = await this.db
        .select()
        .from(schema.enrollments)
        .where(and(eq(schema.enrollments.courseId, courseId), eq(schema.enrollments.organizationId, organizationId)))
        .all();

      const completed = enrollments.filter(e => e.status === 'COMPLETED').length;
      const avgProgress = enrollments.length > 0 
        ? enrollments.reduce((sum, e) => sum + (e.progress || 0), 0) / enrollments.length 
        : 0;

      return {
        course: course?.title,
        totalEnrolled: enrollments.length,
        completed,
        completionRate: enrollments.length > 0 ? completed / enrollments.length : 0,
        avgProgress,
        revenue: enrollments.reduce((sum, e) => sum + (course?.price || 0), 0),
      };
    }

    const allEnrollments = await this.db
      .select()
      .from(schema.enrollments)
      .where(eq(schema.enrollments.organizationId, organizationId))
      .all();

    return {
      totalCourses: courses.length,
      publishedCourses: courses.filter(c => c.status === 'PUBLISHED').length,
      totalEnrollments: allEnrollments.length,
      activeEnrollments: allEnrollments.filter(e => e.status === 'ACTIVE').length,
      completedEnrollments: allEnrollments.filter(e => e.status === 'COMPLETED').length,
      totalRevenue: courses.reduce((sum, c) => sum + (c.price * (c.enrolledCount || 0)), 0),
    };
  }
}

import { count } from 'drizzle-orm';

export function createAcademyService(env: Env): AcademyService {
  return new AcademyService(env);
}