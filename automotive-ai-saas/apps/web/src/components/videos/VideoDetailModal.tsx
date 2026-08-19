'use client';

import { VideoJob } from '@automotive-ai-saas/types';
import { format } from 'date-fns';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface VideoDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: VideoJob | null;
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

export function VideoDetailModal({ isOpen, onClose, job }: VideoDetailModalProps) {
  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Video Preview */}
              <div className="space-y-4">
                <div className="card p-0 overflow-hidden">
                  <h3 className="font-medium text-gray-900 p-4 border-b border-gray-200">Vista Previa</h3>
                  <div className="aspect-video bg-gray-100 relative">
                    {job.outputUrl ? (
                      <video 
                        src={job.outputUrl} 
                        className="w-full h-full object-contain" 
                        controls
                        muted
                      />
                    ) : job.thumbnailUrl ? (
                      <img src={job.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {['QUEUED', 'PROCESSING', 'RENDERING', 'UPLOADING'].includes(job.status) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mx-auto mb-3" />
                          <p className="text-lg font-medium">{statusLabels[job.status]}</p>
                          <p className="text-sm opacity-75 mt-1">{job.progress || 0}% completado</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Video Info */}
                {job.vehicle && (
                  <div className="card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Vehículo</h3>
                    <div className="flex gap-4">
                      <div className="w-24 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {job.vehicle.images?.[0]?.url ? (
                          <img src={job.vehicle.images[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {job.vehicle.year} {job.vehicle.make} {job.vehicle.model}
                        </h4>
                        {job.vehicle.trim && <p className="text-gray-500 text-sm">{job.vehicle.trim}</p>}
                        <p className="text-lg font-bold text-primary-600 mt-1">${job.vehicle.price?.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Config */}
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Configuración</h3>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-64">
                    {JSON.stringify(job.config, null, 2) || '{}'}
                  </pre>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[job.status] || job.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Plantilla</span>
                      <span className="font-medium">{templateLabels[job.template] || job.template}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Prioridad</span>
                      <span className="font-medium">{job.priority}</span>
                    </div>
                    {['QUEUED', 'PROCESSING', 'RENDERING', 'UPLOADING'].includes(job.status) && (
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">Progreso</span>
                          <span className="font-medium">{job.progress || 0}%</span>
                        </div>
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-600 transition-all duration-300" 
                            style={{ width: `${job.progress || 0}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {job.status === 'FAILED' && job.errorMessage && (
                      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        <strong>Error:</strong> {job.errorMessage}
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Cronología</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Creado', date: job.createdAt, icon: 'plus' },
                      { label: 'Encolado', date: job.queuedAt, icon: 'clock' },
                      { label: 'Procesando', date: job.processingStartedAt, icon: 'cog' },
                      { label: 'Renderizando', date: job.renderingStartedAt, icon: 'film' },
                      { label: 'Subiendo', date: job.uploadingStartedAt, icon: 'upload' },
                      { label: 'Completado', date: job.completedAt, icon: 'check' },
                    ].map((event, i) => (
                      <div 
                        key={i} 
                        className={`flex items-start gap-3 ${event.date ? '' : 'text-gray-300'}`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium
                          {event.date ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}
                        ">
                          {event.icon === 'plus' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
                          {event.icon === 'clock' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                          {event.icon === 'cog' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                          {event.icon === 'film' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                          {event.icon === 'upload' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                          {event.icon === 'check' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{event.label}</p>
                          <p className="text-xs text-gray-500">
                            {event.date ? format(new Date(event.date), 'dd/MM/yyyy HH:mm') : 'Pendiente'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* File Info */}
                {job.outputUrl && (
                  <div className="card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Archivo Generado</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">URL</dt>
                        <dd className="font-medium truncate max-w-[200px]">{job.outputUrl}</dd>
                      </div>
                      {job.duration && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Duración</dt>
                          <dd className="font-medium">{job.duration}s</dd>
                        </div>
                      )}
                      {job.fileSize && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Tamaño</dt>
                          <dd className="font-medium">{(job.fileSize / 1024 / 1024).toFixed(1)} MB</dd>
                        </div>
                      )}
                      {job.format && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Formato</dt>
                          <dd className="font-medium">{job.format}</dd>
                        </div>
                      )}
                      {job.resolution && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Resolución</dt>
                          <dd className="font-medium">{job.resolution}</dd>
                        </div>
                      )}
                    </dl>
                    <a
                      href={job.outputUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block text-center btn-primary text-sm"
                    >
                      Descargar Video
                    </a>
                  </div>
                )}

                {/* Description */}
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Descripción</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description || 'Sin descripción'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}