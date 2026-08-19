'use client';

import { useState, useEffect } from 'react';
import { VideoJob, Vehicle } from '@automotive-ai-saas/types';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface VideoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: VideoJob | null;
  onSubmit: (data: Partial<VideoJob>) => void;
  isSubmitting: boolean;
}

const templates = [
  { id: 'showcase', name: 'Showcase', description: 'Video completo del vehículo con detalles', duration: 60 },
  { id: 'reel', name: 'Reel Vertical', description: 'Formato vertical para Reels/TikTok', duration: 30 },
  { id: 'walkaround', name: 'Walkaround 360°', description: 'Recorrido completo 360 grados', duration: 90 },
];

export function VideoFormModal({ isOpen, onClose, job, onSubmit, isSubmitting }: VideoFormModalProps) {
  const [formData, setFormData] = useState<Partial<VideoJob>>({
    title: '',
    description: '',
    template: 'showcase',
    vehicleId: '',
    config: {},
    priority: 100,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', 'active'],
    queryFn: () => api.get<{ data: Vehicle[] }>('/vehicles', { params: { status: 'ACTIVE', limit: 100 } }),
  });

  useEffect(() => {
    if (vehiclesData) {
      setVehicles(vehiclesData.data);
    }
  }, [vehiclesData]);

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title,
        description: job.description || '',
        template: job.template,
        vehicleId: job.vehicleId || '',
        config: job.config || {},
        priority: job.priority || 100,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        template: 'showcase',
        vehicleId: '',
        config: {},
        priority: 100,
      });
    }
    setErrors({});
  }, [job, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = 'Título es requerido';
    if (!formData.vehicleId) newErrors.vehicleId = 'Vehículo es requerido';
    if (!formData.template) newErrors.template = 'Plantilla es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  const selectedTemplate = templates.find(t => t.id === formData.template);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">
              {job ? 'Editar Video' : 'Nuevo Video'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Configuración del Video</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Título *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className="input-field"
                      required
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="label">Descripción</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="input-field"
                      rows={3}
                      placeholder="Descripción del video para referencia interna"
                    />
                  </div>

                  <div>
                    <label className="label">Plantilla *</label>
                    <select
                      value={formData.template}
                      onChange={(e) => handleChange('template', e.target.value)}
                      className="input-field"
                    >
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.duration}s)</option>
                      ))}
                    </select>
                    {errors.template && <p className="text-red-500 text-sm mt-1">{errors.template}</p>}
                  </div>

                  <div>
                    <label className="label">Vehículo *</label>
                    <select
                      value={formData.vehicleId}
                      onChange={(e) => handleChange('vehicleId', e.target.value)}
                      className="input-field"
                    >
                      <option value="">Seleccionar vehículo</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.year} {v.make} {v.model} {v.trim ? `- ${v.trim}` : ''} - ${v.price?.toLocaleString()}
                        </option>
                      ))}
                    </select>
                    {errors.vehicleId && <p className="text-red-500 text-sm mt-1">{errors.vehicleId}</p>}
                  </div>

                  <div>
                    <label className="label">Prioridad</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => handleChange('priority', parseInt(e.target.value) || 100)}
                      className="input-field"
                      min={1}
                      max={1000}
                    />
                    <p className="text-xs text-gray-500 mt-1">Mayor prioridad = se procesa primero (1-1000)</p>
                  </div>
                </div>
              </div>

              {/* Template Preview */}
              {selectedTemplate && (
                <div className="card p-4 bg-primary-50 border-primary-200">
                  <h3 className="font-medium text-gray-900 mb-2">Vista Previa de Plantilla: {selectedTemplate.name}</h3>
                  <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                  <div className="mt-2 flex gap-4 text-sm text-gray-500">
                    <span>Duración estimada: {selectedTemplate.duration}s</span>
                    <span>Formato: {selectedTemplate.aspectRatio || '16:9'}</span>
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Configuración Avanzada (JSON)</h3>
                <textarea
                  value={JSON.stringify(formData.config, null, 2)}
                  onChange={(e) => {
                    try {
                      handleChange('config', JSON.parse(e.target.value));
                    } catch {}
                  }}
                  className="input-field font-mono text-sm"
                  rows={6}
                  placeholder='{"music": "upbeat", "voiceover": true, "branding": true, "cta": "Agenda tu prueba", "colors": {"primary": "#1e40af"}}'
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creando...
                  </>
                ) : (
                  job ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}