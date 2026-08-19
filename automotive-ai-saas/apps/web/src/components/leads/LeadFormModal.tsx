'use client';

import { useState, useEffect } from 'react';
import { Lead, Vehicle } from '@automotive-ai-saas/types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSubmit: (data: Partial<Lead>) => void;
  isSubmitting: boolean;
}

const sources = ['WEBSITE', 'WHATSAPP', 'INSTAGRAM', 'FACEBOOK', 'REFERRAL', 'WALK_IN', 'PHONE', 'EMAIL', 'RADAR', 'OTHER'];
const leadStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

export function LeadFormModal({ isOpen, onClose, lead, onSubmit, isSubmitting }: LeadFormModalProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'WEBSITE',
    status: 'NEW',
    estimatedValue: 0,
    score: 0,
    notes: '',
    vehicleInterestId: '',
    assignedToId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (lead) {
      setFormData({
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        estimatedValue: lead.estimatedValue || 0,
        score: lead.score,
        notes: lead.notes || '',
        vehicleInterestId: lead.vehicleInterest?.id || '',
        assignedToId: lead.assignedTo || '',
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        source: 'WEBSITE',
        status: 'NEW',
        estimatedValue: 0,
        score: 0,
        notes: '',
        vehicleInterestId: '',
        assignedToId: '',
      });
    }
    setErrors({});
  }, [lead, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName) newErrors.firstName = 'Nombre es requerido';
    if (!formData.lastName) newErrors.lastName = 'Apellido es requerido';
    if (!formData.email) newErrors.email = 'Email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Email inválido';
    if (!formData.phone) newErrors.phone = 'Teléfono es requerido';
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">
              {lead ? 'Editar Lead' : 'Nuevo Lead'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b border-gray-200">Información Personal</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Nombre *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className="input-field"
                    required
                  />
                  {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
                </div>
                <div>
                  <label className="label">Apellido *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className="input-field"
                    required
                  />
                  {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="input-field"
                    required
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
                <div>
                  <label className="label">Teléfono *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="input-field"
                    required
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
              </div>

              <h3 className="text-sm font-medium text-gray-700 mt-6 mb-3 pb-2 border-b border-gray-200">Detalles del Lead</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fuente *</label>
                  <select
                    value={formData.source}
                    onChange={(e) => handleChange('source', e.target.value)}
                    className="input-field"
                  >
                    {sources.map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
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
                    {leadStatuses.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valor Estimado</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      value={formData.estimatedValue}
                      onChange={(e) => handleChange('estimatedValue', parseFloat(e.target.value) || 0)}
                      className="input-field pl-8"
                      min={0}
                      step={100}
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Score (0-100)</label>
                  <input
                    type="number"
                    value={formData.score}
                    onChange={(e) => handleChange('score', parseInt(e.target.value) || 0)}
                    className="input-field"
                    min={0}
                    max={100}
                  />
                </div>
              </div>

              <div>
                <label className="label">Vehículo de Interés</label>
                <select
                  value={formData.vehicleInterestId}
                  onChange={(e) => handleChange('vehicleInterestId', e.target.value)}
                  className="input-field"
                >
                  <option value="">Seleccionar vehículo (opcional)</option>
                  {/* Vehicle options would be loaded from API */}
                </select>
              </div>

              <div>
                <label className="label">Asignado a</label>
                <select
                  value={formData.assignedToId}
                  onChange={(e) => handleChange('assignedToId', e.target.value)}
                  className="input-field"
                >
                  <option value="">Sin asignar</option>
                  {/* User options would be loaded from API */}
                </select>
              </div>

              <div>
                <label className="label">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Notas adicionales sobre el lead..."
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
                  lead ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}