'use client';

import { Course, Module, Lesson } from '@automotive-ai-saas/types';
import { format } from 'date-fns';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CourseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PUBLISHED: 'bg-green-100 text-green-800',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};

const difficultyColors: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-800',
  INTERMEDIATE: 'bg-yellow-100 text-yellow-800',
  ADVANCED: 'bg-red-100 text-red-800',
};

const lessonTypeIcons: Record<string, React.ReactNode> = {
  VIDEO: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
  TEXT: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  QUIZ: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  ASSIGNMENT: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  LIVE: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>,
  SCORM: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

export function CourseDetailModal({ isOpen, onClose, course }: CourseDetailModalProps) {
  if (!isOpen || !course) return null;

  const totalLessons = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  const totalDuration = course.modules?.reduce((sum, m) => sum + (m.lessons?.reduce((s, l) => s + (l.durationMinutes || 0), 0) || 0), 0) || 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">{course.title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Thumbnail */}
                <div className="card p-0 overflow-hidden">
                  {course.thumbnailUrl ? (
                    <img src={course.thumbnailUrl} alt="" className="w-full h-64 object-cover" />
                  ) : (
                    <div className="w-full h-64 flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
                      <svg className="w-24 h-24 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Descripción</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{course.description}</p>
                </div>

                {/* Learning Objectives */}
                {course.learningObjectives && course.learningObjectives.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Objetivos de Aprendizaje</h3>
                    <ul className="space-y-2">
                      {course.learningObjectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-700">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {obj}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Prerequisites */}
                {course.prerequisites && course.prerequisites.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Prerrequisitos</h3>
                    <ul className="space-y-1">
                      {course.prerequisites.map((req, i) => (
                        <li key={i} className="text-gray-700 flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Modules */}
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Contenido del Curso ({course.modules?.length || 0} módulos, {totalLessons} lecciones)</h3>
                  <div className="space-y-4">
                    {course.modules?.map((module, mIndex) => (
                      <div key={mIndex} className="border-l-2 border-primary-200 pl-4">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">Módulo {mIndex + 1}: {module.title}</h4>
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                            {module.lessons?.length || 0} lecciones
                          </span>
                          {module.unlockCondition?.type !== 'NONE' && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">
                              🔒 {module.unlockCondition.type}
                            </span>
                          )}
                        </div>
                        {module.description && (
                          <p className="text-sm text-gray-500 mb-2 ml-4">{module.description}</p>
                        )}
                        <div className="space-y-1 ml-4">
                          {module.lessons?.map((lesson, lIndex) => (
                            <div key={lIndex} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                              {lessonTypeIcons[lesson.type] || lessonTypeIcons.TEXT}
                              <span className="font-medium">{lIndex + 1}. {lesson.title}</span>
                              <span className="text-gray-400">({lesson.type})</span>
                              {lesson.durationMinutes > 0 && (
                                <span className="text-gray-400">· {lesson.durationMinutes} min</span>
                              )}
                              {lesson.isPreview && (
                                <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-800 rounded">Preview</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Status */}
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Estado</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Estado</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[course.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[course.status] || course.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Dificultad</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[course.difficulty] || 'bg-gray-100 text-gray-800'}`}>
                        {course.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Precio</span>
                      <span className="font-medium">
                        {course.price > 0 ? `${course.currency} ${course.price.toLocaleString()}` : 'Gratis'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Destacado</span>
                      <span className={course.isFeatured ? 'text-green-600' : 'text-gray-400'}>
                        {course.isFeatured ? 'Sí' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Estadísticas</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Inscritos</span>
                      <span className="font-medium">{course.enrollmentCount || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Tasa Completación</span>
                      <span className="font-medium">{course.completionRate ? course.completionRate.toFixed(1) : '0'}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Rating Promedio</span>
                      <span className="font-medium">{course.averageRating ? course.averageRating.toFixed(1) : '—'} / 5</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Duración Total</span>
                      <span className="font-medium">{Math.floor(totalDuration / 60)}h {totalDuration % 60}min</span>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Fechas</h3>
                  <dl className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Creado</dt>
                      <dd className="font-medium">{format(new Date(course.createdAt), 'dd/MM/yyyy HH:mm')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Actualizado</dt>
                      <dd className="font-medium">{format(new Date(course.updatedAt), 'dd/MM/yyyy HH:mm')}</dd>
                    </div>
                    {course.publishedAt && (
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Publicado</dt>
                        <dd className="font-medium">{format(new Date(course.publishedAt), 'dd/MM/yyyy HH:mm')}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Tags */}
                {course.tags && course.tags.length > 0 && (
                  <div className="card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-1">
                      {course.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certificate */}
                {course.certificateTemplateId && (
                  <div className="card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Certificado</h3>
                    <p className="text-sm text-gray-600">
                      Plantilla: {course.certificateTemplateId}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}