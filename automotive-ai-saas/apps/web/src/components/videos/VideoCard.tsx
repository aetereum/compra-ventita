'use client';

import { VideoJob } from '@automotive-ai-saas/types';
import { format } from 'date-fns';

interface VideoCardProps {
  job: VideoJob;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRetry: () => void;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-800',
  QUEUED: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-yellow-100 text-yellow-800',
  RENDERING: 'bg-orange-100 text-orange-800',
  UPLOADING: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  QUEUED: 'En Cola',
  PROCESSING: 'Procesando',
  RENDERING: 'Renderizando',
  UPLOADING: 'Subiendo',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
  CANCELLED: 'Cancelado',
};

const templateLabels: Record<string, string> = {
  showcase: 'Showcase',
  reel: 'Reel Vertical',
  walkaround: 'Walkaround 360°',
};

export function VideoCard({ job, onClick, onEdit, onDelete, onRetry }: VideoCardProps) {
  const progress = job.progress || 0;

  return (
    <div 
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail/Preview */}
      <div className="relative h-48 bg-gray-100">
        {job.outputUrl ? (
          <video 
            src={job.outputUrl} 
            className="w-full h-full object-cover" 
            muted 
            preload="metadata"
          />
        ) : job.thumbnailUrl ? (
          <img src={job.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
            <svg className="w-16 h-16 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-800'}`}>
            {statusLabels[job.status] || job.status}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-900/80 text-white">
            {templateLabels[job.template] || job.template}
          </span>
        </div>
        
        {/* Progress bar for processing states */}
        {['QUEUED', 'PROCESSING', 'RENDERING', 'UPLOADING'].includes(job.status) && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200">
            <div 
              className="h-full bg-primary-600 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-4">
        {/* Vehicle Info */}
        {job.vehicle && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 truncate">
              {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
            </h3>
            <p className="text-sm text-gray-500">${job.vehicle.price?.toLocaleString() || '0'}</p>
          </div>
        )}

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-1 truncate">{job.title}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{job.description}</p>

        {/* Progress for active jobs */}
        {['QUEUED', 'PROCESSING', 'RENDERING', 'UPLOADING'].includes(job.status) && (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-600 transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message for failed jobs */}
        {job.status === 'FAILED' && job.errorMessage && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {job.errorMessage}
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {job.createdAt && format(new Date(job.createdAt), 'dd/MM HH:mm')}
          </span>
          {job.duration && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {job.duration}s
            </span>
          )}
          {job.fileSize && (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              {(job.fileSize / 1024 / 1024).toFixed(1)} MB
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {job.status === 'FAILED' && (
            <button
              onClick={(e) => { e.stopPropagation(); onRetry(); }}
              className="flex-1 py-1.5 text-xs text-white bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
            >
              Reintentar
            </button>
          )}
          {job.status === 'COMPLETED' && job.outputUrl && (
            <a
              href={job.outputUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 py-1.5 text-xs text-white bg-green-600 hover:bg-green-700 rounded transition-colors text-center"
            >
              Ver Video
            </a>
          )}
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