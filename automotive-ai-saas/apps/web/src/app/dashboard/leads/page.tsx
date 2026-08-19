'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Lead, LeadStatus, PaginatedResponse } from '@automotive-ai-saas/types';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadFormModal } from '@/components/leads/LeadFormModal';
import { LeadDetailModal } from '@/components/leads/LeadDetailModal';

const PIPELINE_STAGES: { value: LeadStatus; label: string; color: string }[] = [
  { value: 'NEW', label: 'Nuevo', color: 'bg-blue-100 text-blue-800' },
  { value: 'CONTACTED', label: 'Contactado', color: 'bg-purple-100 text-purple-800' },
  { value: 'QUALIFIED', label: 'Calificado', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PROPOSAL', label: 'Propuesta', color: 'bg-orange-100 text-orange-800' },
  { value: 'NEGOTIATION', label: 'Negociación', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'WON', label: 'Ganado', color: 'bg-green-100 text-green-800' },
  { value: 'LOST', label: 'Perdido', color: 'bg-red-100 text-red-800' },
];

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', searchQuery, assignedFilter],
    queryFn: () => api.get<PaginatedResponse<Lead>>('/leads', {
      params: { search: searchQuery, assignedTo: assignedFilter, limit: 100 }
    }),
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) =>
      api.patch<Lead>(`/leads/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const createLeadMutation = useMutation({
    mutationFn: (data: Partial<Lead>) => api.post<Lead>('/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setShowLeadForm(false);
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/leads/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const handleLeadSubmit = (data: Partial<Lead>) => {
    if (editingLead) {
      updateLeadMutation.mutate({ id: editingLead.id, data });
    } else {
      createLeadMutation.mutate(data);
    }
  };

  const handleStatusChange = (lead: Lead, newStatus: LeadStatus) => {
    if (lead.status !== newStatus) {
      updateLeadMutation.mutate({ id: lead.id, data: { status: newStatus } });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este lead?')) {
      deleteLeadMutation.mutate(id);
    }
  };

  const leadsByStatus = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.value] = leadsData?.data.filter(l => l.status === stage.value) || [];
    return acc;
  }, {} as Record<LeadStatus, Lead[]>);

  const totalLeads = leadsData?.data.length || 0;
  const totalValue = leadsData?.data.reduce((sum, l) => sum + (l.estimatedValue || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline de Leads</h1>
          <p className="text-gray-500 mt-1">
            {totalLeads} leads · ${totalValue.toLocaleString()} valor estimado
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'kanban' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => { setEditingLead(null); setShowLeadForm(true); }}
            className="btn-primary hidden sm:flex"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Lead
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar leads por nombre, email, teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value="all">Todos los asignados</option>
          <option value="me">Mis leads</option>
          <option value="unassigned">Sin asignar</option>
        </select>
        <button
          onClick={() => { setEditingLead(null); setShowLeadForm(true); }}
          className="btn-primary sm:hidden"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Lead
        </button>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max" style={{ minWidth: '100%' }}>
            {PIPELINE_STAGES.map(stage => {
              const leads = leadsByStatus[stage.value] || [];
              return (
                <div key={stage.value} className="w-80 flex-shrink-0">
                  <div className="bg-gray-50 rounded-xl p-3 h-full min-h-[500px]">
                    {/* Column Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stage.color}`}>
                          {stage.label}
                        </span>
                        <span className="text-lg font-bold text-gray-900">{leads.length}</span>
                      </div>
                      {stage.value !== 'WON' && stage.value !== 'LOST' && (
                        <span className="text-xs text-gray-400">${leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0).toLocaleString()}</span>
                      )}
                    </div>

                    {/* Drop Zone */}
                    <div
                      className="space-y-3 min-h-[400px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const leadId = e.dataTransfer.getData('leadId');
                        const lead = leadsData?.data.find(l => l.id === leadId);
                        if (lead && lead.status !== stage.value) {
                          handleStatusChange(lead, stage.value);
                        }
                      }}
                    >
                      {leads.length === 0 ? (
                        <div className="text-center text-gray-400 py-8 text-sm">
                          Arrastra leads aquí
                        </div>
                      ) : (
                        leads.map(lead => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            onClick={() => setSelectedLead(lead)}
                            onEdit={() => { setEditingLead(lead); setShowLeadForm(true); }}
                            onDelete={() => handleDelete(lead.id)}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('leadId', lead.id)}
                          />
                        ))
                      )}
                    </div>

                    {/* Add Lead Button */}
                    {stage.value !== 'WON' && stage.value !== 'LOST' && (
                      <button
                        onClick={() => { setEditingLead(null); setShowLeadForm(true); }}
                        className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Agregar lead
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card overflow-hidden">
          {isLoading ? (
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
          ) : leadsData?.data.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay leads</h3>
              <p className="mt-1 text-sm text-gray-500">Comienza agregando tu primer lead al pipeline.</p>
              <button
                onClick={() => { setEditingLead(null); setShowLeadForm(true); }}
                className="mt-4 btn-primary"
              >
                Agregar Lead
              </button>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última actividad</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leadsData?.data.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50" onClick={() => setSelectedLead(lead)}>
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</p>
                          <p className="text-sm text-gray-500">{lead.email} · {lead.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {lead.vehicleInterest ? (
                          <p className="text-sm text-gray-900">
                            {lead.vehicleInterest.year} {lead.vehicleInterest.make} {lead.vehicleInterest.model}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">Sin vehículo</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageColors[lead.status]}`}>
                          {stageLabels[lead.status]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-900">
                          ${(lead.estimatedValue || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-600 rounded-full"
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{lead.score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-500">{lead.assignedToName || 'Sin asignar'}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-500">
                          {lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleDateString() : 'Nunca'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingLead(lead); setShowLeadForm(true); }}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="Editar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Eliminar"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      {showLeadForm && (
        <LeadFormModal
          isOpen={showLeadForm}
          onClose={() => { setShowLeadForm(false); setEditingLead(null); }}
          lead={editingLead}
          onSubmit={handleLeadSubmit}
          isSubmitting={createLeadMutation.isPending || updateLeadMutation.isPending}
        />
      )}

      {selectedLead && (
        <LeadDetailModal
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          lead={selectedLead}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

const stageColors: Record<LeadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-purple-100 text-purple-800',
  QUALIFIED: 'bg-yellow-100 text-yellow-800',
  PROPOSAL: 'bg-orange-100 text-orange-800',
  NEGOTIATION: 'bg-indigo-100 text-indigo-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
};

const stageLabels: Record<LeadStatus, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  QUALIFIED: 'Calificado',
  PROPOSAL: 'Propuesta',
  NEGOTIATION: 'Negociación',
  WON: 'Ganado',
  LOST: 'Perdido',
};