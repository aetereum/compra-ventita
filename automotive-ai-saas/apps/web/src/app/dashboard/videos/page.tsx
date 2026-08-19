'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { VideoJob, PaginatedResponse, VideoTemplate } from '@automotive-ai-saas/types';
import { format } from 'date-fns';
import { VideoCard } from '@/components/videos/VideoCard';
import { VideoFormModal } from '@/components/videos/VideoFormModal';
import { VideoDetailModal } from '@/components/videos/VideoDetailModal';

const jobStatuses = ['PENDING', 'QUEUED', 'PROCESSING', 'RENDERING', 'UPLOADING', 'COMPLETED', 'FAILED', 'CANCELLED'];
const templates: VideoTemplate[] = [
  { id: 'showcase', name: 'Showcase', description: 'Video completo del vehículo con detalles', duration: 60 },
  { id: 'reel', name: 'Reel Vertical', description: 'Formato vertical para Reels/TikTok', duration: 30 },
  { id: 'walkaround', name: 'Walkaround 360°', description: 'Recorrido completo 360 grados', duration: 90 },
];

export default function VideosPage() {
  const queryClient = useQueryClient();
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [editingJob, setEditingJob] = useState<VideoJob | null>(null);
  const [selectedJob, setSelectedJob] = useState<VideoJob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['videoJobs', searchQuery, statusFilter, templateFilter],
    queryFn: () => api.get<PaginatedResponse<VideoJob>>('/videos/jobs', {
      params: { 
        search: searchQuery, 
        status: statusFilter !== 'all' ? statusFilter : undefined,
        template: templateFilter !== 'all' ? templateFilter : undefined,
        limit: 50 
      }
    }),
  });

  const createJobMutation = useMutation({
    mutationFn: (data: Partial<VideoJob>) => api.post<VideoJob>('/videos/jobs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoJobs'] });
      setShowVideoForm(false);
      setEditingJob(null);
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<VideoJob> }) =>
      api.patch<VideoJob>(`/videos/jobs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoJobs'] });
      setShowVideoForm(false);
      setEditingJob(null);
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/videos/jobs/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videoJobs'] }),
  });

  const handleJobSubmit = (data: Partial<VideoJob>) => {
    if (editingJob) {
      updateJobMutation.mutate({ id: editingJob.id, data });
    } else {
      createJobMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este trabajo de video?')) {
      deleteJobMutation.mutate(id);
    }
  };

  const handleRetry = (id: string) => {
    api.post(`/videos/jobs/${id}/retry`).then(() => {
      queryClient.invalidateQueries({ queryKey: ['videoJobs'] });
    });
  };

  const statusCounts = jobStatuses.reduce((acc, status) => {
    acc[status] = jobsData?.data.filter(j => j.status === status).length || 0;
    return acc;
  }, {} as Record<string, number>);

  const completedJobs = jobsData?.data.filter(j => j.status === 'COMPLETED').length || 0;
  const failedJobs = jobsData?.data.filter(j => j.status === 'FAILED').length || 0;
  const processingJobs = jobsData?.data.filter(j => ['QUEUED', 'PROCESSING', 'RENDERING', 'UPLOADING'].includes(j.status)).length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generación de Videos</h1>
          <p className="text-gray-500 mt-1">Crea videos profesionales de vehículos con IA</p>
        </div>
        <button
          onClick={() => { setEditingJob(null); setShowVideoForm(true); }}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Video
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{jobsData?.total || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Procesando</p>
          <p className="text-2xl font-bold text-blue-600">{processingJobs}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Completados</p>
          <p className="text-2xl font-bold text-green-600">{completedJobs}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Fallidos</p>
          <p className="text-2xl font-bold text-red-600">{failedJobs}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Tasa Éxito</p>
          <p className="text-2xl font-bold text-primary-600">
            {jobsData?.total ? ((completedJobs / jobsData.total) * 100).toFixed(0) : 0}%
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-40"
        >
          <option value="all">Todos los estados</option>
          {jobStatuses.map(s => (
            <option key={s} value={s}>{s} ({statusCounts[s]})</option>
          ))}
        </select>
        <select
          value={templateFilter}
          onChange={(e) => setTemplateFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value="all">Todas las plantillas</option>
          {templates.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Jobs Grid */}
      <div className="card">
        {isLoading ? (
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
        ) : jobsData?.data.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay trabajos de video</h3>
            <p className="mt-1 text-sm text-gray-500">Crea tu primer video con IA.</p>
            <button
              onClick={() => { setEditingJob(null); setShowVideoForm(true); }}
              className="mt-4 btn-primary"
            >
              Crear Video
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {jobsData?.data.map(job => (
              <VideoCard
                key={job.id}
                job={job}
                onClick={() => setSelectedJob(job)}
                onEdit={() => { setEditingJob(job); setShowVideoForm(true); }}
                onDelete={() => handleDelete(job.id)}
                onRetry={() => handleRetry(job.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Templates Info */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Plantillas Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templates.map(template => (
            <div key={template.id} className="p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>⏱️ {template.duration}s</span>
                <span>🎬 {template.aspectRatio || '16:9'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showVideoForm && (
        <VideoFormModal
          isOpen={showVideoForm}
          onClose={() => { setShowVideoForm(false); setEditingJob(null); }}
          job={editingJob}
          onSubmit={handleJobSubmit}
          isSubmitting={createJobMutation.isPending || updateJobMutation.isPending}
        />
      )}

      {selectedJob && (
        <VideoDetailModal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          job={selectedJob}
        />
      )}
    </div>
  );
}