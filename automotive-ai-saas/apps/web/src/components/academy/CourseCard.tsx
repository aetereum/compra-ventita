'use client';

import { Course } from '@automotive-ai-saas/types';
import { format } from 'date-fns';

interface CourseCardProps {
  course: Course;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
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

export function CourseCard({ course, onClick, onEdit, onDelete }: CourseCardProps) {
  const totalLessons = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  const totalDuration = course.modules?.reduce((sum, m) => sum + (m.lessons?.reduce((s, l) => s + (l.durationMinutes || 0), 0) || 0), 0) || 0;

  return (
    <div 
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative h-48 bg-gray-100">
        {course.thumbnailUrl ? (
          <img src={course.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
            <svg className="w-16 h-16 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[course.status] || 'bg-gray-100 text-gray-800'}`}>
            {statusLabels[course.status] || course.status}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${difficultyColors[course.difficulty] || 'bg-gray-100 text-gray-800'}`}>
            {course.difficulty}
          </span>
        </div>
        {course.isFeatured && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              ⭐ Destacado
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 truncate">{course.title}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{course.description}</p>

        {/* Instructor */}
        {course.instructor && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-500">
            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-medium text-primary-700">
                {course.instructor.firstName?.charAt(0)}{course.instructor.lastName?.charAt(0)}
              </span>
            </div>
            <span>{course.instructor.firstName} {course.instructor.lastName}</span>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {course.modules?.length || 0} módulos
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            {totalLessons} lecciones
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {Math.floor(totalDuration / 60)}h {totalDuration % 60}min
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center py-3 border-t border-gray-100 mb-3">
          <div>
            <p className="text-lg font-bold text-gray-900">{course.enrollmentCount || 0}</p>
            <p className="text-xs text-gray-500">Inscritos</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary-600">
              {course.completionRate ? course.completionRate.toFixed(0) : 0}%
            </p>
            <p className="text-xs text-gray-500">Completan</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">
              {course.averageRating ? course.averageRating.toFixed(1) : '—'}
            </p>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
        </div>

        {/* Tags */}
        {course.tags && course.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {course.tags.slice(0, 4).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                {tag}
              </span>
            ))}
            {course.tags.length > 4 && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">
                +{course.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Schedule info */}
        {course.publishedAt && (
          <p className="text-xs text-gray-500 mb-2">
            Publicado: {format(new Date(course.publishedAt), 'dd/MM/yyyy')}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex-1 py-1.5 text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
          >
            Editar
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="flex-1 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}