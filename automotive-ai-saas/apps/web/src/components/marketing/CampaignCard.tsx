'use client';

import { Campaign } from '@automotive-ai-saas/types';
import { format } from 'date-fns';

interface CampaignCardProps {
  campaign: Campaign;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  SCHEDULED: 'Programada',
  ACTIVE: 'Activa',
  PAUSED: 'Pausada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const typeLabels: Record<string, string> = {
  VEHICLE_PROMOTION: 'Promo Vehículo',
  BRAND_AWARENESS: 'Conciencia Marca',
  LEAD_GENERATION: 'Generación Leads',
  RETARGETING: 'Retargeting',
  EVENT_PROMOTION: 'Promo Evento',
  SEASONAL_OFFER: 'Oferta Estacional',
};

const channelIcons: Record<string, React.ReactNode> = {
  EMAIL: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
  WHATSAPP: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.472.099-.174.05-.372-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378 9.86 9.86 0 01-1.378-5.031c0-5.431 4.402-9.864 9.831-9.864 5.43 0 9.864 4.433 9.864 9.864 0 2.646-1.059 5.088-2.838 6.857a9.825 9.825 0 01-3.46 2.238 9.824 9.824 0 01-3.556.93" /></svg>,
  INSTAGRAM: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-.129-.128-.547-.21-4.947-.21zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
  SMS: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
  PUSH: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
};

export function CampaignCard({ campaign, onClick, onEdit, onDelete }: CampaignCardProps) {
  const openRate = campaign.sentCount > 0 ? ((campaign.openCount || 0) / campaign.sentCount * 100).toFixed(1) : '0';
  const clickRate = campaign.openCount > 0 ? ((campaign.clickCount || 0) / campaign.openCount * 100).toFixed(1) : '0';

  return (
    <div 
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Image/Preview */}
      <div className="relative h-48 bg-gray-100">
        {campaign.thumbnailUrl ? (
          <img src={campaign.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200">
            <svg className="w-16 h-16 text-primary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status] || 'bg-gray-100 text-gray-800'}`}>
            {statusLabels[campaign.status] || campaign.status}
          </span>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-900/80 text-white">
            {typeLabels[campaign.type] || campaign.type}
          </span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 truncate">{campaign.name}</h3>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{campaign.description}</p>

        {/* Channels */}
        <div className="flex flex-wrap gap-1 mb-3">
          {campaign.channels.map(channel => (
            <span key={channel} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {channelIcons[channel]}
              {channel}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 text-center py-3 border-t border-gray-100 mb-3">
          <div>
            <p className="text-lg font-bold text-gray-900">{campaign.sentCount?.toLocaleString() || '0'}</p>
            <p className="text-xs text-gray-500">Enviados</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary-600">{openRate}%</p>
            <p className="text-xs text-gray-500">Apertura</p>
          </div>
          <div>
            <p className="text-lg font-bold text-primary-600">{clickRate}%</p>
            <p className="text-xs text-gray-500">Click</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-600">{campaign.conversionCount?.toLocaleString() || '0'}</p>
            <p className="text-xs text-gray-500">Conversiones</p>
          </div>
        </div>

        {/* Schedule info */}
        {campaign.scheduledAt && (
          <p className="text-xs text-gray-500 mb-2">
            {campaign.status === 'SCHEDULED' ? 'Programada para ' : 'Enviada el '}
            {format(new Date(campaign.scheduledAt), 'dd/MM/yyyy HH:mm')}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
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
    </div>
  );
}