'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Course, Module, Lesson, Enrollment, PaginatedResponse } from '@automotive-ai-saas/types';
import { format } from 'date-fns';
import { CourseCard } from '@/components/academy/CourseCard';
import { CourseFormModal } from '@/components/academy/CourseFormModal';
import { CourseDetailModal } from '@/components/academy/CourseDetailModal';

const courseStatuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const enrollmentStatuses = ['ACTIVE', 'COMPLETED', 'DROPPED', 'EXPIRED'];

export default function AcademyPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'courses' | 'enrollments' | 'students'>('courses');
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: coursesData, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses', searchQuery, statusFilter],
    queryFn: () => api.get<PaginatedResponse<Course>>('/courses', {
      params: { 
        search: searchQuery, 
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 50 
      }
    }),
  });

  const { data: enrollmentsData, isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['enrollments', searchQuery],
    queryFn: () => api.get<PaginatedResponse<Enrollment>>('/academy/enrollments', {
      params: { search: searchQuery, limit: 50 }
    }),
  });

  const createCourseMutation = useMutation({
    mutationFn: (data: Partial<Course>) => api.post<Course>('/courses', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowCourseForm(false);
      setEditingCourse(null);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Course> }) =>
      api.patch<Course>(`/courses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      setShowCourseForm(false);
      setEditingCourse(null);
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/courses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['courses'] }),
  });

  const handleCourseSubmit = (data: Partial<Course>) => {
    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, data });
    } else {
      createCourseMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este curso?')) {
      deleteCourseMutation.mutate(id);
    }
  };

  const publishedCourses = coursesData?.data.filter(c => c.status === 'PUBLISHED').length || 0;
  const totalStudents = enrollmentsData?.data.length || 0;
  const activeEnrollments = enrollmentsData?.data.filter(e => e.status === 'ACTIVE').length || 0;
  const completedEnrollments = enrollmentsData?.data.filter(e => e.status === 'COMPLETED').length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Academia & Formación</h1>
          <p className="text-gray-500 mt-1">Gestiona cursos, certificaciones y progreso de estudiantes</p>
        </div>
        {activeTab === 'courses' && (
          <button
            onClick={() => { setEditingCourse(null); setShowCourseForm(true); }}
            className="btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Curso
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Cursos Publicados</p>
          <p className="text-2xl font-bold text-gray-900">{publishedCourses}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Estudiantes</p>
          <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Inscripciones Activas</p>
          <p className="text-2xl font-bold text-blue-600">{activeEnrollments}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Completados</p>
          <p className="text-2xl font-bold text-green-600">{completedEnrollments}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('courses')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'courses' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Cursos ({(coursesData?.data.length || 0)})
          </button>
          <button
            onClick={() => setActiveTab('enrollments')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'enrollments' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Inscripciones ({(enrollmentsData?.data.length || 0)})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'students' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Estudiantes
          </button>
        </nav>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={activeTab === 'courses' ? 'Buscar cursos...' : 'Buscar inscripciones...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        {activeTab === 'courses' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-40"
          >
            <option value="all">Todos</option>
            {courseStatuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Courses Tab */}
      {activeTab === 'courses' && (
        <div className="card">
          {coursesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : coursesData?.data.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay cursos</h3>
              <p className="mt-1 text-sm text-gray-500">Crea tu primer curso de formación.</p>
              <button
                onClick={() => { setEditingCourse(null); setShowCourseForm(true); }}
                className="mt-4 btn-primary"
              >
                Crear Curso
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {coursesData?.data.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={() => setSelectedCourse(course)}
                  onEdit={() => { setEditingCourse(course); setShowCourseForm(true); }}
                  onDelete={() => handleDelete(course.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Enrollments Tab */}
      {activeTab === 'enrollments' && (
        <div className="card overflow-hidden">
          {enrollmentsLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="w-32 h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : enrollmentsData?.data.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay inscripciones</h3>
              <p className="mt-1 text-sm text-gray-500">Las inscripciones aparecerán aquí cuando los estudiantes se registren.</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estudiante</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Curso</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progreso</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscrito</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Certificado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {enrollmentsData?.data.map(enrollment => (
                    <tr key={enrollment.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{enrollment.user?.firstName} {enrollment.user?.lastName}</p>
                          <p className="text-sm text-gray-500">{enrollment.user?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-medium text-gray-900">{enrollment.course?.title}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 rounded-full"
                              style={{ width: `${enrollment.progress}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{enrollment.progress}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          enrollment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                          enrollment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                          enrollment.status === 'DROPPED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {enrollment.status === 'ACTIVE' ? 'Activo' :
                           enrollment.status === 'COMPLETED' ? 'Completado' :
                           enrollment.status === 'DROPPED' ? 'Abandonado' : 'Expirado'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {format(new Date(enrollment.enrolledAt), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {enrollment.completedAt ? format(new Date(enrollment.completedAt), 'dd/MM/yyyy') : '—'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {enrollment.certificateId ? (
                          <span className="text-green-600 font-medium">✓ Emitido</span>
                        ) : enrollment.status === 'COMPLETED' ? (
                          <button className="text-sm text-primary-600 hover:text-primary-800">Generar</button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestión de Estudiantes</h2>
          <p className="text-gray-500">
            La vista detallada de estudiantes se implementará con paginación, filtros avanzados,
            exportación a CSV, y acciones masivas (reenviar certificados, extender accesos, etc.)
          </p>
        </div>
      )}

      {/* Modals */}
      {showCourseForm && (
        <CourseFormModal
          isOpen={showCourseForm}
          onClose={() => { setShowCourseForm(false); setEditingCourse(null); }}
          course={editingCourse}
          onSubmit={handleCourseSubmit}
          isSubmitting={createCourseMutation.isPending || updateCourseMutation.isPending}
        />
      )}

      {selectedCourse && (
        <CourseDetailModal
          isOpen={!!selectedCourse}
          onClose={() => setSelectedCourse(null)}
          course={selectedCourse}
        />
      )}
    </div>
  );
}