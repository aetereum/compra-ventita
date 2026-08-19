'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Campaign, PaginatedResponse } from '@automotive-ai-saas/types';
import { format } from 'date-fns';
import { CampaignCard } from '@/components/marketing/CampaignCard';
import { CampaignFormModal } from '@/components/marketing/CampaignFormModal';
import { CampaignDetailModal } from '@/components/marketing/CampaignDetailModal';

const campaignTypes = ['VEHICLE_PROMOTION', 'BRAND_AWARENESS', 'LEAD_GENERATION', 'RETARGETING', 'EVENT_PROMOTION', 'SEASONAL_OFFER'];
const campaignStatuses = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];

export default function MarketingPage() {
  const queryClient = useQueryClient();
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['campaigns', searchQuery, statusFilter, typeFilter],
    queryFn: () => api.get<PaginatedResponse<Campaign>>('/campaigns', {
      params: { 
        search: searchQuery, 
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        limit: 50 
      }
    }),
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data: Partial<Campaign>) => api.post<Campaign>('/campaigns', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCampaignForm(false);
      setEditingCampaign(null);
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Campaign> }) =>
      api.patch<Campaign>(`/campaigns/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      setShowCampaignForm(false);
      setEditingCampaign(null);
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  const handleCampaignSubmit = (data: Partial<Campaign>) => {
    if (editingCampaign) {
      updateCampaignMutation.mutate({ id: editingCampaign.id, data });
    } else {
      createCampaignMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta campaña?')) {
      deleteCampaignMutation.mutate(id);
    }
  };

  const totalSent = campaignsData?.data.reduce((sum, c) => sum + (c.sentCount || 0), 0) || 0;
  const totalOpened = campaignsData?.data.reduce((sum, c) => sum + (c.openCount || 0), 0) || 0;
  const totalClicked = campaignsData?.data.reduce((sum, c) => sum + (c.clickCount || 0), 0) || 0;
  const avgOpenRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0';
  const avgClickRate = totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing & Campañas</h1>
          <p className="text-gray-500 mt-1">Gestiona tus campañas de marketing multicanal</p>
        </div>
        <button
          onClick={() => { setEditingCampaign(null); setShowCampaignForm(true); }}
          className="btn-primary"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva Campaña
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Campañas</p>
          <p className="text-2xl font-bold text-gray-900">{campaignsData?.total || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Enviados</p>
          <p className="text-2xl font-bold text-gray-900">{totalSent.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Tasa Apertura</p>
          <p className="text-2xl font-bold text-primary-600">{avgOpenRate}%</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Tasa Click</p>
          <p className="text-2xl font-bold text-primary-600">{avgClickRate}%</p>
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
            placeholder="Buscar campañas..."
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
          <option value="all">Todos</option>
          {campaignStatuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input-field w-48"
        >
          <option value="all">Todos los tipos</option>
          {campaignTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
      </div>

      {/* Campaigns Grid */}
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
        ) : campaignsData?.data.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay campañas</h3>
            <p className="mt-1 text-sm text-gray-500">Crea tu primera campaña de marketing.</p>
            <button
              onClick={() => { setEditingCampaign(null); setShowCampaignForm(true); }}
              className="mt-4 btn-primary"
            >
              Crear Campaña
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {campaignsData?.data.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onClick={() => setSelectedCampaign(campaign)}
                onEdit={() => { setEditingCampaign(campaign); setShowCampaignForm(true); }}
                onDelete={() => handleDelete(campaign.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCampaignForm && (
        <CampaignFormModal
          isOpen={showCampaignForm}
          onClose={() => { setShowCampaignForm(false); setEditingCampaign(null); }}
          campaign={editingCampaign}
          onSubmit={handleCampaignSubmit}
          isSubmitting={createCampaignMutation.isPending || updateCampaignMutation.isPending}
        />
      )}

      {selectedCampaign && (
        <CampaignDetailModal
          isOpen={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          campaign={selectedCampaign}
        />
      )}
    </div>
  );
}