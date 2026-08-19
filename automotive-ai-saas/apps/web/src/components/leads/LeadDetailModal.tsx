'use client';

import { useState } from 'react';
import { Lead, Message, Conversation } from '@automotive-ai-saas/types';
import { api } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onStatusChange: (lead: Lead, newStatus: Lead['status']) => void;
}

const leadStatuses: Lead['status'][] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
const statusColors: Record<Lead['status'], string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-purple-100 text-purple-800',
  QUALIFIED: 'bg-yellow-100 text-yellow-800',
  PROPOSAL: 'bg-orange-100 text-orange-800',
  NEGOTIATION: 'bg-indigo-100 text-indigo-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
};
const statusLabels: Record<Lead['status'], string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  QUALIFIED: 'Calificado',
  PROPOSAL: 'Propuesta',
  NEGOTIATION: 'Negociación',
  WON: 'Ganado',
  LOST: 'Perdido',
};

export function LeadDetailModal({ isOpen, onClose, lead, onStatusChange }: LeadDetailModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'details' | 'conversation' | 'activity'>('details');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const { data: conversation } = useQuery({
    queryKey: ['conversation', lead?.id],
    queryFn: () => api.get<Conversation>(`/leads/${lead?.id}/conversation`),
    enabled: !!lead && activeTab === 'conversation',
  });

  const { data: messages } = useQuery({
    queryKey: ['messages', lead?.id],
    queryFn: () => api.get<Message[]>(`/leads/${lead?.id}/messages`),
    enabled: !!lead && activeTab === 'conversation',
  });

  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; channel: 'WHATSAPP' | 'EMAIL' | 'SMS' }) =>
      api.post<Message>(`/leads/${lead?.id}/messages`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', lead?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversation', lead?.id] });
      setNewMessage('');
    },
  });

  const handleSendMessage = (channel: 'WHATSAPP' | 'EMAIL' | 'SMS') => {
    if (!newMessage.trim() || !lead) return;
    setSending(true);
    sendMessageMutation.mutate({ content: newMessage, channel }, {
      onSettled: () => setSending(false),
    });
  };

  const handleStatusChange = (newStatus: Lead['status']) => {
    if (lead && lead.status !== newStatus) {
      onStatusChange(lead, newStatus);
    }
  };

  if (!isOpen || !lead) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {lead.firstName} {lead.lastName}
              </h2>
              <p className="text-gray-500">{lead.email} · {lead.phone}</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value as Lead['status'])}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-300 ${statusColors[lead.status]}`}
              >
                {leadStatuses.map(s => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 sticky top-14 bg-white z-10">
            <nav className="flex gap-8 px-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'details' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Detalles
              </button>
              <button
                onClick={() => setActiveTab('conversation')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'conversation' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Conversación
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'activity' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Actividad
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Vehicle Interest */}
                  {lead.vehicleInterest && (
                    <div className="card p-4">
                      <h3 className="font-medium text-gray-900 mb-3">Vehículo de Interés</h3>
                      <div className="flex gap-4">
                        <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          {lead.vehicleInterest.images?.[0]?.url ? (
                            <img src={lead.vehicleInterest.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {lead.vehicleInterest.year} {lead.vehicleInterest.make} {lead.vehicleInterest.model}
                          </h4>
                          {lead.vehicleInterest.trim && <p className="text-gray-500">{lead.vehicleInterest.trim}</p>}
                          <p className="text-lg font-bold text-primary-600 mt-1">${lead.vehicleInterest.price?.toLocaleString()}</p>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                            <span>{lead.vehicleInterest.mileage?.toLocaleString()} km</span>
                            <span>{lead.vehicleInterest.fuelType}</span>
                            <span>{lead.vehicleInterest.transmission}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lead Info */}
                  <div className="card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Información del Lead</h3>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="text-gray-500">Fuente</dt>
                        <dd className="font-medium">{lead.source.replace('_', ' ')}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Score</dt>
                        <dd className="font-medium">{lead.score}/100</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Valor Estimado</dt>
                        <dd className="font-medium">${(lead.estimatedValue || 0).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">Asignado a</dt>
                        <dd className="font-medium">{lead.assignedToName || 'Sin asignar'}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-gray-500">Notas</dt>
                        <dd className="font-medium mt-1 whitespace-pre-wrap">{lead.notes || 'Sin notas'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Resumen Rápido</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Estado</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.status]}`}>
                          {statusLabels[lead.status]}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Creado</span>
                        <span className="font-medium">{format(new Date(lead.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Última actividad</span>
                        <span className="font-medium">
                          {lead.lastActivityAt ? format(new Date(lead.lastActivityAt), 'dd/MM/yyyy HH:mm') : 'Nunca'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Score IA</span>
                        <span className="font-medium">{lead.score}/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="card p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Acciones Rápidas</h3>
                    <div className="space-y-2">
                      <button className="w-full btn-secondary text-left justify-start gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Llamar
                      </button>
                      <button className="w-full btn-secondary text-left justify-start gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        WhatsApp
                      </button>
                      <button className="w-full btn-secondary text-left justify-start gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Enviar Email
                      </button>
                      <button className="w-full btn-secondary text-left justify-start gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar Nota
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Tab */}
            {activeTab === 'conversation' && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 pb-4">
                  {messages?.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          msg.direction === 'OUTBOUND'
                            ? 'bg-primary-600 text-white rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.direction === 'OUTBOUND' ? 'text-primary-100' : 'text-gray-500'}`}>
                          {format(new Date(msg.createdAt), 'HH:mm')} · {msg.channel}
                          {msg.status === 'FAILED' && ' · ❌ Fallido'}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!messages || messages.length === 0) && (
                    <div className="text-center text-gray-500 py-8">
                      No hay mensajes aún. Inicia la conversación abajo.
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="border-t border-gray-200 p-4">
                  <div className="flex gap-2">
                    <select
                      value="WHATSAPP"
                      className="input-field w-32"
                    >
                      <option value="WHATSAPP">WhatsApp</option>
                      <option value="EMAIL">Email</option>
                      <option value="SMS">SMS</option>
                    </select>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage('WHATSAPP')}
                      placeholder="Escribe un mensaje..."
                      className="input-field flex-1"
                    />
                    <button
                      onClick={() => handleSendMessage('WHATSAPP')}
                      disabled={!newMessage.trim() || sending}
                      className="btn-primary"
                    >
                      {sending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <div className="space-y-4">
                <div className="card p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Historial de Actividad</h3>
                  <div className="space-y-4">
                    {[
                      { type: 'CREATED', text: 'Lead creado', time: lead.createdAt },
                      { type: 'STATUS_CHANGED', text: `Estado cambiado a ${statusLabels[lead.status]}`, time: lead.updatedAt },
                      ...(lead.lastActivityAt && lead.lastActivityAt !== lead.updatedAt ? [{
                        type: 'ACTIVITY', text: 'Última actividad registrada', time: lead.lastActivityAt
                      }] : []),
                    ].map((activity, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                          <p className="text-xs text-gray-500">{format(new Date(activity.time), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}