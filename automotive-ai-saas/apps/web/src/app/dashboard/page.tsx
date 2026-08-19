'use client';

import { useAuth } from '@/contexts/auth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { 
  Car, 
  Users, 
  MessageSquare, 
  Megaphone, 
  Video, 
  GraduationCap,
  TrendingUp,
  Target,
  Clock,
  DollarSign,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

const statsCards = [
  { name: 'Vehículos', icon: Car, color: 'bg-blue-500', key: 'vehicles' },
  { name: 'Leads', icon: Users, color: 'bg-green-500', key: 'leads' },
  { name: 'Conversaciones', icon: MessageSquare, color: 'bg-purple-500', key: 'conversations' },
  { name: 'Campañas', icon: Megaphone, color: 'bg-orange-500', key: 'campaigns' },
  { name: 'Videos', icon: Video, color: 'bg-pink-500', key: 'videoJobs' },
  { name: 'Cursos', icon: GraduationCap, color: 'bg-indigo-500', key: 'courses' },
];

export default function DashboardPage() {
  const { organization } = useAuth();
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', organization?.id],
    queryFn: () => api.get('/api/v1/dashboard/stats'),
    enabled: !!organization?.id,
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Bienvenido a {organization?.name}, aquí tienes un resumen de tu negocio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Vehículo
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statsCards.map((stat) => (
            <StatCard
              key={stat.key}
              name={stat.name}
              icon={stat.icon}
              color={stat.color}
              value={isLoading ? '—' : stats?.data?.summary?.[stat.key] || 0}
              loading={isLoading}
            />
          ))}
        </div>

        {/* Charts & Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Opportunities */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Oportunidades</h2>
              <a href="/dashboard/vehicles?status=OPPORTUNITY" className="text-sm text-primary-600 hover:text-primary-500">
                Ver todas
              </a>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 animate-pulse">
                    <div className="w-16 h-10 bg-gray-200 dark:bg-slate-700 rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-200 dark:bg-slate-700 rounded" />
                      <div className="h-3 w-1/2 bg-gray-200 dark:bg-slate-700 rounded" />
                    </div>
                    <div className="w-20 h-6 bg-gray-200 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : stats?.data?.opportunities?.length > 0 ? (
              <div className="space-y-3">
                {stats.data.opportunities.slice(0, 5).map((vehicle: any) => (
                  <div key={vehicle.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors">
                    {vehicle.photos?.[0] ? (
                      <img src={vehicle.photos[0].url} alt="" className="w-16 h-10 object-cover rounded" />
                    ) : (
                      <div className="w-16 h-10 bg-gray-200 dark:bg-slate-700 rounded flex items-center justify-center">
                        <Car className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {vehicle.make} {vehicle.model} {vehicle.year}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {vehicle.mileage.toLocaleString()} km · {vehicle.location.city}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full text-xs font-medium">
                        <Target className="w-3 h-3" />
                        {vehicle.dealScore}
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                        {vehicle.price.toLocaleString()} {vehicle.currency}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay oportunidades detectadas</p>
                <p className="text-sm mt-1">El radar buscará automáticamente</p>
              </div>
            )}
          </div>

          {/* Recent Leads */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Leads Recientes</h2>
              <a href="/dashboard/leads" className="text-sm text-primary-600 hover:text-primary-500">
                Ver todos
              </a>
            </div>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-slate-700 rounded-full" />
                      <div className="space-y-1">
                        <div className="h-4 w-24 bg-gray-200 dark:bg-slate-700 rounded" />
                        <div className="h-3 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
                      </div>
                    </div>
                    <div className="w-20 h-6 bg-gray-200 dark:bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : stats?.data?.recentLeads?.length > 0 ? (
              <div className="space-y-3">
                {stats.data.recentLeads.slice(0, 5).map((lead: any) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                          {lead.contact.firstName.charAt(0)}{lead.contact.lastName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {lead.contact.firstName} {lead.contact.lastName}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {lead.source} · {new Date(lead.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        lead.status === 'NEW' ? 'badge-info' :
                        lead.status === 'WON' ? 'badge-success' :
                        lead.status === 'LOST' ? 'badge-danger' :
                        'badge-warning'
                      }`}>
                        {lead.status}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        Score: {lead.score}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay leads recientes</p>
              </div>
            )}
          </div>
        </div>

        {/* Pipeline & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Stats */}
          <div className="lg:col-span-2 card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipeline de Ventas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { stage: 'Nuevos', icon: Target, color: 'blue', count: stats?.data?.leadsByStatus?.NEW || 0 },
                { stage: 'Contactados', icon: MessageSquare, color: 'purple', count: stats?.data?.leadsByStatus?.CONTACTED || 0 },
                { stage: 'Calificados', icon: Users, color: 'yellow', count: stats?.data?.leadsByStatus?.QUALIFIED || 0 },
                { stage: 'Propuesta', icon: DollarSign, color: 'orange', count: stats?.data?.leadsByStatus?.PROPOSAL || 0 },
                { stage: 'Negociación', icon: TrendingUp, color: 'indigo', count: stats?.data?.leadsByStatus?.NEGOTIATION || 0 },
                { stage: 'Ganados', icon: Car, color: 'green', count: stats?.data?.leadsByStatus?.WON || 0 },
                { stage: 'Perdidos', icon: Clock, color: 'red', count: stats?.data?.leadsByStatus?.LOST || 0 },
              ].map((item) => (
                <div key={item.stage} className={`p-4 rounded-lg border border-${item.color}-200 dark:border-${item.color}-800 bg-${item.color}-50 dark:bg-${item.color}-900/20`}>
                  <div className="flex items-center gap-2 mb-2">
                    <item.icon className={`w-5 h-5 text-${item.color}-600 dark:text-${item.color}-400`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item.stage}</span>
                  </div>
                  <p className="text-3xl font-bold text-${item.color}-600 dark:text-${item.color}-400">{item.count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Acciones Rápidas</h2>
            <div className="space-y-2">
              {[
                { label: 'Agregar Vehículo', href: '/dashboard/vehicles/new', icon: Car, color: 'blue' },
                { label: 'Crear Lead', href: '/dashboard/leads/new', icon: Users, color: 'green' },
                { label: 'Nueva Campaña', href: '/dashboard/marketing/new', icon: Megaphone, color: 'orange' },
                { label: 'Generar Video', href: '/dashboard/videos/new', icon: Video, color: 'pink' },
                { label: 'Crear Curso', href: '/dashboard/academy/new', icon: GraduationCap, color: 'indigo' },
                { label: 'Configurar Radar', href: '/dashboard/settings/radar', icon: Target, color: 'purple' },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/30 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <action.icon className={`w-5 h-5 text-${action.color}-600 dark:text-${action.color}-400`} />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ name, icon: Icon, color, value, loading }: { 
  name: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string; 
  value: number | string; 
  loading: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{name}</p>
          {loading ? (
            <div className="h-8 w-24 animate-pulse bg-gray-200 dark:bg-slate-700 rounded mt-1" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg ${color}/20 flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
    </div>
  );
}

import { Plus } from 'lucide-react';