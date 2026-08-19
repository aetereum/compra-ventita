'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Vehicle, VehicleListing, PaginatedResponse } from '@automotive-ai-saas/types';
import { format } from 'date-fns';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { VehicleFormModal } from '@/components/vehicles/VehicleFormModal';
import { ListingCard } from '@/components/vehicles/ListingCard';
import { RadarConfigModal } from '@/components/vehicles/RadarConfigModal';

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'vehicles' | 'listings' | 'radar'>('vehicles');
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showRadarConfig, setShowRadarConfig] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles', searchQuery, statusFilter],
    queryFn: () => api.get<PaginatedResponse<Vehicle>>('/vehicles', {
      params: { search: searchQuery, status: statusFilter, limit: 50 }
    }),
  });

  const { data: listingsData, isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', searchQuery],
    queryFn: () => api.get<PaginatedResponse<VehicleListing>>('/vehicles/listings', {
      params: { search: searchQuery, limit: 50 }
    }),
  });

  const createVehicleMutation = useMutation({
    mutationFn: (data: Partial<Vehicle>) => api.post<Vehicle>('/vehicles', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowVehicleForm(false);
      setEditingVehicle(null);
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vehicle> }) =>
      api.patch<Vehicle>(`/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setShowVehicleForm(false);
      setEditingVehicle(null);
    },
  });

  const deleteVehicleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/vehicles/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });

  const handleVehicleSubmit = (data: Partial<Vehicle>) => {
    if (editingVehicle) {
      updateVehicleMutation.mutate({ id: editingVehicle.id, data });
    } else {
      createVehicleMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este vehículo?')) {
      deleteVehicleMutation.mutate(id);
    }
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-gray-100 text-gray-800',
    SOLD: 'bg-blue-100 text-blue-800',
    RESERVED: 'bg-yellow-100 text-yellow-800',
    DRAFT: 'bg-purple-100 text-purple-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-gray-500 mt-1">Gestiona tu inventario de vehículos y listados</p>
        </div>
        {activeTab === 'vehicles' && (
          <button
            onClick={() => { setEditingVehicle(null); setShowVehicleForm(true); }}
            className="btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Vehículo
          </button>
        )}
        {activeTab === 'radar' && (
          <button
            onClick={() => setShowRadarConfig(true)}
            className="btn-primary"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 01-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            Configurar Radar
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'vehicles' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Inventario
          </button>
          <button
            onClick={() => setActiveTab('listings')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'listings' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Listados Externos
          </button>
          <button
            onClick={() => setActiveTab('radar')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'radar' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Radar & Oportunidades
          </button>
        </nav>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar vehículos, listados..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>
        {activeTab === 'vehicles' && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-48"
          >
            <option value="all">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
            <option value="SOLD">Vendidos</option>
            <option value="RESERVED">Reservados</option>
            <option value="DRAFT">Borradores</option>
          </select>
        )}
      </div>

      {/* Content */}
      {activeTab === 'vehicles' && (
        <div className="card">
          {vehiclesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
              {[...Array(8)].map((_, i) => (
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
          ) : vehiclesData?.data.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay vehículos</h3>
              <p className="mt-1 text-sm text-gray-500">Comienza agregando tu primer vehículo al inventario.</p>
              <button
                onClick={() => { setEditingVehicle(null); setShowVehicleForm(true); }}
                className="mt-4 btn-primary"
              >
                Agregar Vehículo
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
                {vehiclesData?.data.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onEdit={() => { setEditingVehicle(vehicle); setShowVehicleForm(true); }}
                    onDelete={() => handleDelete(vehicle.id)}
                  />
                ))}
              </div>
              {vehiclesData && vehiclesData.total > vehiclesData.data.length && (
                <div className="px-4 py-3 border-t border-gray-200">
                  <button
                    className="w-full btn-secondary"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['vehicles'] })}
                  >
                    Cargar más ({vehiclesData.data.length} de {vehiclesData.total})
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'listings' && (
        <div className="card">
          {listingsLoading ? (
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
          ) : listingsData?.data.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay listados</h3>
              <p className="mt-1 text-sm text-gray-500">Los listados externos aparecerán aquí cuando el Radar detecte vehículos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {listingsData?.data.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'radar' && (
        <div className="space-y-6">
          <RadarConfigModal isOpen={showRadarConfig} onClose={() => setShowRadarConfig(false)} />
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Configuración del Radar</h2>
            <p className="text-gray-500 mb-6">
              El Radar monitorea continuamente fuentes externas (portales, APIs, scrapers) 
              y detecta oportunidades basándose en tus reglas de negocio.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-900">Fuentes Configuradas</h3>
                <p className="text-2xl font-bold text-primary-600 mt-2">3</p>
                <p className="text-sm text-gray-500 mt-1">CarDeals, MercadoLibre, WebScraper</p>
              </div>
              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-900">Reglas Activas</h3>
                <p className="text-2xl font-bold text-primary-600 mt-2">5</p>
                <p className="text-sm text-gray-500 mt-1">Filtros de precio, año, km, margen</p>
              </div>
              <div className="p-4 border rounded-lg bg-gray-50">
                <h3 className="font-medium text-gray-900">Oportunidades Hoy</h3>
                <p className="text-2xl font-bold text-green-600 mt-2">12</p>
                <p className="text-sm text-gray-500 mt-1">Nuevos vehículos con buen margen</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showVehicleForm && (
        <VehicleFormModal
          isOpen={showVehicleForm}
          onClose={() => { setShowVehicleForm(false); setEditingVehicle(null); }}
          vehicle={editingVehicle}
          onSubmit={handleVehicleSubmit}
          isSubmitting={createVehicleMutation.isPending || updateVehicleMutation.isPending}
        />
      )}
    </div>
  );
}