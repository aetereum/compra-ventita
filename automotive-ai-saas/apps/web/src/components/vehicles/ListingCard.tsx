'use client';

import { VehicleListing } from '@automotive-ai-saas/types';
import { format } from 'date-fns';

interface ListingCardProps {
  listing: VehicleListing;
}

const sourceColors: Record<string, string> = {
  CARDEALS: 'bg-blue-100 text-blue-800',
  MERCADOLIBRE: 'bg-yellow-100 text-yellow-800',
  WEBSCRAPER: 'bg-purple-100 text-purple-800',
  MANUAL: 'bg-gray-100 text-gray-800',
};

const opportunityColors: Record<string, string> = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-gray-100 text-gray-800',
};

const opportunityLabels: Record<string, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Media',
  LOW: 'Baja',
};

export function ListingCard({ listing }: ListingCardProps) {
  const primaryImage = listing.images?.[0] || '/placeholder-vehicle.svg';
  const margin = listing.marketPrice 
    ? ((listing.marketPrice - listing.price) / listing.marketPrice * 100).toFixed(1)
    : 'N/A';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative h-48 bg-gray-100">
        <img
          src={primaryImage}
          alt={`${listing.make} ${listing.model}`}
          className="w-full h-full object-cover"
          onError={(e) => { e.currentTarget.src = '/placeholder-vehicle.svg'; }}
        />
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${sourceColors[listing.source] || 'bg-gray-100 text-gray-800'}`}>
            {listing.source}
          </span>
          {listing.opportunityScore !== undefined && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${opportunityColors[listing.opportunityLevel] || 'bg-gray-100 text-gray-800'}`}>
              Oportunidad: {opportunityLabels[listing.opportunityLevel] || 'N/A'}
            </span>
          )}
        </div>
        {listing.isAnalyzed && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/70 text-white px-3 py-1 rounded text-xs">
            Analizado por IA · Score: {listing.opportunityScore}/100
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {listing.year} {listing.make} {listing.model}
            </h3>
            {listing.trim && (
              <p className="text-sm text-gray-500 truncate">{listing.trim}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">
              ${listing.price?.toLocaleString() || '0'}
            </p>
            {listing.marketPrice && (
              <p className="text-xs text-gray-500">
                Mercado: ${listing.marketPrice.toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {listing.mileage?.toLocaleString()} km
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {listing.fuelType}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {listing.transmission}
          </span>
        </div>

        {listing.location && (
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {listing.location}
          </p>
        )}

        {listing.sellerName && (
          <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {listing.sellerName} {listing.sellerType ? `(${listing.sellerType})` : ''}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {listing.marginPercent !== undefined && (
              <span className={`text-sm font-medium ${
                listing.marginPercent > 15 ? 'text-green-600' : 
                listing.marginPercent > 5 ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                Margen: {listing.marginPercent > 0 ? '+' : ''}{listing.marginPercent.toFixed(1)}%
              </span>
            )}
            {listing.opportunityScore !== undefined && (
              <span className="text-sm font-medium text-primary-600">
                Score: {listing.opportunityScore}/100
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver origen
            </a>
            <button className="btn-primary text-sm">
              Importar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}