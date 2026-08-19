'use client';

import { Vehicle } from '@automotive-ai-saas/types';
import { format } from 'date-fns';

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit: () => void;
  onDelete: () => void;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SOLD: 'bg-blue-100 text-blue-800',
  RESERVED: 'bg-yellow-100 text-yellow-800',
  DRAFT: 'bg-purple-100 text-purple-800',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  SOLD: 'Vendido',
  RESERVED: 'Reservado',
  DRAFT: 'Borrador',
};

export function VehicleCard({ vehicle, onEdit, onDelete }: VehicleCardProps) {
  const primaryImage = vehicle.images?.[0]?.url || '/placeholder-vehicle.svg';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-gray-100">
        <img
          src={primaryImage}
          alt={`${vehicle.make} ${vehicle.model}`}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = '/placeholder-vehicle.svg'; }}
        />
        <div className="absolute top-3 right-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[vehicle.status] || 'bg-gray-100 text-gray-800'}`}>
            {statusLabels[vehicle.status] || vehicle.status}
          </span>
        </div>
        {vehicle.isFeatured && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              ⭐ Destacado
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h3>
            {vehicle.trim && (
              <p className="text-sm text-gray-500 truncate">{vehicle.trim}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              ${vehicle.price?.toLocaleString() || '0'}
            </p>
            {vehicle.cost && (
              <p className="text-xs text-gray-500">
                Costo: ${vehicle.cost.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {vehicle.mileage?.toLocaleString()} km
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {vehicle.fuelType}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {vehicle.transmission}
          </span>
        </div>

        {vehicle.vin && (
          <p className="text-xs text-gray-400 font-mono mb-3">VIN: {vehicle.vin}</p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Actualizado: {format(new Date(vehicle.updatedAt), 'dd/MM/yyyy')}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Editar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Eliminar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}