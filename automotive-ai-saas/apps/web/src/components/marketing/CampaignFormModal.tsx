'use client';

import { useState, useEffect } from 'react';
import { Campaign } from '@automotive-ai-saas/types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CampaignFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Campaign | null;
  onSubmit: (data: Partial<Campaign>) => void;
  isSubmitting: boolean;
}

const campaignTypes = ['VEHICLE_PROMOTION', 'BRAND_AWARENESS', 'LEAD_GENERATION', 'RETARGETING', 'EVENT_PROMOTION', 'SEASONAL_OFFER'];
const channels = ['EMAIL', 'WHATSAPP', 'INSTAGRAM', 'SMS', 'PUSH'];
const statuses = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];

export function CampaignFormModal({ isOpen, onClose, campaign, onSubmit, isSubmitting }: CampaignFormModalProps) {
  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: '',
    description: '',
    type: 'VEHICLE_PROMOTION',
    channels: ['EMAIL'],
    status: 'DRAFT',
    subject: '',
    content: '',
    thumbnailUrl: '',
    scheduledAt: '',
    targetAudience: {},
    abTestConfig: {},
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        description: campaign.description,
        type: campaign.type,
        channels: campaign.channels,
        status: campaign.status,
        subject: campaign.subject || '',
        content: campaign.content || '',
        thumbnailUrl: campaign.thumbnailUrl || '',
        scheduledAt: campaign.scheduledAt ? new Date(campaign.scheduledAt).toISOString().slice(0, 16) : '',
        targetAudience: campaign.targetAudience || {},
        abTestConfig: campaign.abTestConfig || {},
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'VEHICLE_PROMOTION',
        channels: ['EMAIL'],
        status: 'DRAFT',
        subject: '',
        content: '',
        thumbnailUrl: '',
        scheduledAt: '',
        targetAudience: {},
        abTestConfig: {},
      });
    }
    setErrors({});
  }, [campaign, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Nombre es requerido';
    if (!formData.description) newErrors.description = 'Descripción es requerida';
    if (formData.channels.length === 0) newErrors.channels = 'Selecciona al menos un canal';
    if (formData.status !== 'DRAFT' && !formData.scheduledAt) newErrors.scheduledAt = 'Fecha programada requerida';
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

  const toggleChannel = (channel: string) => {
    const current = formData.channels || [];
    const updated = current.includes(channel)
      ? current.filter(c => c !== channel)
      : [...current, channel];
    handleChange('channels', updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">
              {campaign ? 'Editar Campaña' : 'Nueva Campaña'}
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
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Información Básica</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Nombre *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="input-field"
                      required
                    />
                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <label className="label">Descripción *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="input-field"
                      rows={3}
                      required
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Tipo *</label>
                      <select
                        value={formData.type}
                        onChange={(e) => handleChange('type', e.target.value)}
                        className="input-field"
                      >
                        {campaignTypes.map(t => (
                          <option key={t} value={t}>{t.replace('_', ' ')}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Estado *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value as any)}
                        className="input-field"
                      >
                        {statuses.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Canales de Envío</h3>
                <div className="flex flex-wrap gap-3">
                  {channels.map(channel => (
                    <label key={channel} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(formData.channels || []).includes(channel)}
                        onChange={() => toggleChannel(channel)}
                        className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm font-medium">{channel}</span>
                    </label>
                  ))}
                </div>
                {errors.channels && <p className="text-red-500 text-sm mt-1">{errors.channels}</p>}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Contenido</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Asunto (Email/Push)</label>
                    <input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => handleChange('subject', e.target.value)}
                      className="input-field"
                      placeholder="Asunto del mensaje"
                    />
                  </div>

                  <div>
                    <label className="label">Contenido del Mensaje</label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => handleChange('content', e.target.value)}
                      className="input-field font-mono text-sm"
                      rows={8}
                      placeholder="Contenido del mensaje... Usa {{variable}} para personalización"
                    />
                  </div>

                  <div>
                    <label className="label">URL de Imagen/Thumbnail</label>
                    <input
                      type="url"
                      value={formData.thumbnailUrl}
                      onChange={(e) => handleChange('thumbnailUrl', e.target.value)}
                      className="input-field"
                      placeholder="https://ejemplo.com/imagen.jpg"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Programación</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Fecha y Hora de Envío</label>
                    <input
                      type="datetime-local"
                      value={formData.scheduledAt}
                      onChange={(e) => handleChange('scheduledAt', e.target.value)}
                      className="input-field"
                    />
                    {errors.scheduledAt && <p className="text-red-500 text-sm mt-1">{errors.scheduledAt}</p>}
                    <p className="text-xs text-gray-500 mt-1">Requerido para estados distintos a Borrador</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Audiencia Objetivo (JSON)</h3>
                <textarea
                  value={JSON.stringify(formData.targetAudience, null, 2)}
                  onChange={(e) => {
                    try {
                      handleChange('targetAudience', JSON.parse(e.target.value));
                    } catch {}
                  }}
                  className="input-field font-mono text-sm"
                  rows={4}
                  placeholder='{"segment": "leads_qualified", "filters": {"score": {"gte": 70}}}'
                />
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Test A/B (JSON)</h3>
                <textarea
                  value={JSON.stringify(formData.abTestConfig, null, 2)}
                  onChange={(e) => {
                    try {
                      handleChange('abTestConfig', JSON.parse(e.target.value));
                    } catch {}
                  }}
                  className="input-field font-mono text-sm"
                  rows={4}
                  placeholder='{"enabled": true, "variants": [{"subject": "Variante A"}, {"subject": "Variante B"}], "split": 50}'
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
                    Guardando...
                  </>
                ) : (
                  campaign ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}