'use client';

import { Lead, Vehicle } from '@automotive-ai-saas/types';
import { format } from 'date-fns';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

const stageColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-purple-100 text-purple-800',
  QUALIFIED: 'bg-yellow-100 text-yellow-800',
  PROPOSAL: 'bg-orange-100 text-orange-800',
  NEGOTIATION: 'bg-indigo-100 text-indigo-800',
  WON: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
};

const stageLabels: Record<string, string> = {
  NEW: 'Nuevo',
  CONTACTED: 'Contactado',
  QUALIFIED: 'Calificado',
  PROPOSAL: 'Propuesta',
  NEGOTIATION: 'Negociación',
  WON: 'Ganado',
  LOST: 'Perdido',
};

export function LeadCard({ lead, onClick, onEdit, onDelete, draggable, onDragStart }: LeadCardProps) {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      draggable={draggable || false}
      onDragStart={onDragStart}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="text-xs text-gray-500 truncate">{lead.email}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${stageColors[lead.status] || 'bg-gray-100 text-gray-800'}`}>
          {stageLabels[lead.status] || lead.status}
        </span>
      </div>

      {lead.vehicleInterest && (
        <div className="mb-2 p-2 bg-gray-50 rounded text-xs">
          <p className="font-medium text-gray-900 truncate">
            {lead.vehicleInterest.year} {lead.vehicleInterest.make} {lead.vehicleInterest.model}
          </p>
          <p className="text-gray-500">${lead.vehicleInterest.price?.toLocaleString() || '0'}</p>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {lead.score}/100
        </span>
        <span>${(lead.estimatedValue || 0).toLocaleString()}</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        {lead.assignedToName && (
          <span className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-medium text-primary-700">
                {lead.assignedToName.charAt(0)}
              </span>
            </div>
            {lead.assignedToName}
          </span>
        )}
        <span>{lead.lastActivityAt ? format(new Date(lead.lastActivityAt), 'dd/MM') : 'Sin actividad'}</span>
      </div>

      <div className="flex gap-1 pt-2 border-t border-gray-100">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="flex-1 py-1.5 text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
        >
          Editar
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex-1 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}