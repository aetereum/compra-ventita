'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Organization, User, RadarSource, RadarRule, PaginatedResponse } from '@automotive-ai-saas/types';
import { format } from 'date-fns';
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const tabs = [
  { id: 'general', label: 'General', icon: 'cog' },
  { id: 'members', label: 'Miembros', icon: 'users' },
  { id: 'billing', label: 'Facturación', icon: 'credit-card' },
  { id: 'radar', label: 'Radar', icon: 'radar' },
  { id: 'integrations', label: 'Integraciones', icon: 'puzzle' },
  { id: 'api', label: 'API Keys', icon: 'key' },
  { id: 'notifications', label: 'Notificaciones', icon: 'bell' },
];

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('general');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: () => api.get<Organization>('/organization'),
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['organization', 'members'],
    queryFn: () => api.get<any[]>('/organization/members'),
  });

  const { data: apiKeysData } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => api.get<any[]>('/api-keys'),
  });

  const updateOrgMutation = useMutation({
    mutationFn: (data: Partial<Organization>) => api.patch<Organization>('/organization', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization'] }),
  });

  const inviteMemberMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) => api.post('/organization/members/invite', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', 'members'] });
      setShowMemberModal(false);
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: { role: string } }) =>
      api.patch(`/organization/members/${userId}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'members'] }),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/organization/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['organization', 'members'] }),
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (data: { name: string; permissions: string[] }) => api.post('/api-keys', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const roles = [
    { value: 'OWNER', label: 'Propietario', description: 'Acceso total a la organización' },
    { value: 'ADMIN', label: 'Administrador', description: 'Gestiona miembros, configuración y facturación' },
    { value: 'MANAGER', label: 'Gerente', description: 'Gestiona leads, vehículos y campañas' },
    { value: 'SALES', label: 'Vendedor', description: 'Acceso a leads, conversaciones y vehículos' },
    { value: 'MARKETING', label: 'Marketing', description: 'Gestiona campañas, videos y contenido' },
    { value: 'BUYER', label: 'Comprador', description: 'Acceso al radar y oportunidades de compra' },
    { value: 'INSTRUCTOR', label: 'Instructor', description: 'Crea y gestiona cursos en la academia' },
    { value: 'STUDENT', label: 'Estudiante', description: 'Acceso a cursos y certificaciones' },
  ];

  const plans = [
    { id: 'FREE', name: 'Free', price: 0, limits: { vehicles: 10, leads: 50, videos: 5, campaigns: 2, users: 1 } },
    { id: 'STARTER', name: 'Starter', price: 49, limits: { vehicles: 50, leads: 500, videos: 20, campaigns: 10, users: 3 } },
    { id: 'PRO', name: 'Professional', price: 149, limits: { vehicles: 200, leads: 2000, videos: 100, campaigns: 50, users: 10 } },
    { id: 'DEALER', name: 'Dealer', price: 399, limits: { vehicles: 1000, leads: 10000, videos: 500, campaigns: 200, users: 25 } },
    { id: 'ENTERPRISE', name: 'Enterprise', price: 999, limits: { vehicles: -1, leads: -1, videos: -1, campaigns: -1, users: -1 } },
  ];

  const currentPlan = plans.find(p => p.id === orgData?.plan) || plans[0];

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    inviteMemberMutation.mutate({
      email: formData.get('email') as string,
      role: formData.get('role') as string,
    });
  };

  const handleUpdateMemberRole = (userId: string, role: string) => {
    updateMemberMutation.mutate({ userId, data: { role } });
  };

  const handleRemoveMember = (userId: string) => {
    if (confirm('¿Eliminar a este miembro de la organización?')) {
      removeMemberMutation.mutate(userId);
    }
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createApiKeyMutation.mutate({
      name: formData.get('name') as string,
      permissions: formData.getAll('permissions') as string[],
    });
  };

  const handleRevokeApiKey = (id: string) => {
    if (confirm('¿Revocar esta API Key?')) {
      revokeApiKeyMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 mt-1">Administra tu organización, miembros, facturación e integraciones</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto pb-3" aria-label="Settings tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && (
        <div className="card p-6 max-w-2xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Información de la Organización</h2>
          <form onSubmit={(e) => { e.preventDefault(); updateOrgMutation.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
            <div>
              <label className="label">Nombre de la Organización *</label>
              <input
                type="text"
                name="name"
                defaultValue={orgData?.name}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="label">Slug (URL)</label>
              <input
                type="text"
                name="slug"
                defaultValue={orgData?.slug}
                className="input-field"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">El slug no se puede cambiar después de crearlo</p>
            </div>
            <div>
              <label className="label">Email de Contacto</label>
              <input
                type="email"
                name="contactEmail"
                defaultValue={orgData?.contactEmail}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input
                type="tel"
                name="phone"
                defaultValue={orgData?.phone}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Dirección</label>
              <textarea
                name="address"
                defaultValue={orgData?.address}
                className="input-field"
                rows={3}
              />
            </div>
            <div>
              <label className="label">Sitio Web</label>
              <input
                type="url"
                name="website"
                defaultValue={orgData?.website}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Logo URL</label>
              <input
                type="url"
                name="logoUrl"
                defaultValue={orgData?.logoUrl}
                className="input-field"
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button type="submit" className="btn-primary" disabled={updateOrgMutation.isPending}>
                {updateOrgMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Miembros de la Organización</h2>
            <button
              onClick={() => { setEditingMember(null); setShowMemberModal(true); }}
              className="btn-primary"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Invitar Miembro
            </button>
          </div>
          
          {membersLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                  </div>
                  <div className="w-32 h-6 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : membersData?.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mt-2">No hay miembros aún</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {membersData?.map(member => (
                <div key={member.userId} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700">
                        {member.user?.firstName?.charAt(0)}{member.user?.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.user?.firstName} {member.user?.lastName}</p>
                      <p className="text-sm text-gray-500">{member.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.role === 'OWNER' ? 'bg-purple-100 text-purple-800' :
                      member.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                      member.role === 'MANAGER' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {roles.find(r => r.value === member.role)?.label || member.role}
                    </span>
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateMemberRole(member.userId, e.target.value)}
                      className="input-field w-40 text-sm"
                      disabled={member.role === 'OWNER'}
                    >
                      {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    {member.role !== 'OWNER' && (
                      <button
                        onClick={() => handleRemoveMember(member.userId)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Eliminar"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Current Plan */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Plan Actual</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentPlan.id === 'FREE' ? 'bg-gray-100 text-gray-800' :
                currentPlan.id === 'ENTERPRISE' ? 'bg-purple-100 text-purple-800' :
                'bg-primary-100 text-primary-800'
              }`}>
                {currentPlan.name}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold text-gray-900">${currentPlan.price}</span>
              <span className="text-gray-500">/mes</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{currentPlan.limits.vehicles === -1 ? '∞' : currentPlan.limits.vehicles}</p>
                <p className="text-xs text-gray-500">Vehículos</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{currentPlan.limits.leads === -1 ? '∞' : currentPlan.limits.leads.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Leads</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{currentPlan.limits.videos === -1 ? '∞' : currentPlan.limits.videos}</p>
                <p className="text-xs text-gray-500">Videos</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{currentPlan.limits.campaigns === -1 ? '∞' : currentPlan.limits.campaigns}</p>
                <p className="text-xs text-gray-500">Campañas</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{currentPlan.limits.users === -1 ? '∞' : currentPlan.limits.users}</p>
                <p className="text-xs text-gray-500">Usuarios</p>
              </div>
            </div>
            <button className="mt-6 btn-primary w-full sm:w-auto">Actualizar Plan</button>
          </div>

          {/* Plan Comparison */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Comparar Planes</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-gray-500">Característica</th>
                    {plans.map(plan => (
                      <th key={plan.id} className="text-center p-3 font-medium text-gray-900">
                        {plan.name}<br />
                        <span className="text-sm text-gray-500">${plan.price}/mes</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="p-3 text-gray-700">Vehículos</td>
                    {plans.map(plan => (
                      <td key={plan.id} className="text-center p-3">{plan.limits.vehicles === -1 ? 'Ilimitado' : plan.limits.vehicles}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Leads/mes</td>
                    {plans.map(plan => (
                      <td key={plan.id} className="text-center p-3">{plan.limits.leads === -1 ? 'Ilimitado' : plan.limits.leads.toLocaleString()}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Videos/mes</td>
                    {plans.map(plan => (
                      <td key={plan.id} className="text-center p-3">{plan.limits.videos === -1 ? 'Ilimitado' : plan.limits.videos}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Campañas activas</td>
                    {plans.map(plan => (
                      <td key={plan.id} className="text-center p-3">{plan.limits.campaigns === -1 ? 'Ilimitado' : plan.limits.campaigns}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Usuarios</td>
                    {plans.map(plan => (
                      <td key={plan.id} className="text-center p-3">{plan.limits.users === -1 ? 'Ilimitado' : plan.limits.users}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Radar API</td>
                    {plans.map((plan, i) => (
                      <td key={plan.id} className="text-center p-3">{i >= 2 ? '✓' : '✗'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">IA Generativa</td>
                    {plans.map((plan, i) => (
                      <td key={plan.id} className="text-center p-3">{i >= 1 ? '✓' : '✗'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">Soporte Prioritario</td>
                    {plans.map((plan, i) => (
                      <td key={plan.id} className="text-center p-3">{i >= 3 ? '✓' : '✗'}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-3 text-gray-700">API Access</td>
                    {plans.map((plan, i) => (
                      <td key={plan.id} className="text-center p-3">{i >= 2 ? '✓' : '✗'}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Billing History */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Historial de Facturación</h2>
            <p className="text-gray-500">El historial de facturas se cargará desde Stripe.</p>
          </div>
        </div>
      )}

      {activeTab === 'radar' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuración del Radar</h2>
            <p className="text-gray-500 mb-6">
              Configura las fuentes de datos y reglas para la detección automática de oportunidades.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Fuentes Configuradas</h3>
                <p className="text-sm text-gray-500">Gestiona las fuentes de listados (CarDeals, MercadoLibre, WebScrapers, etc.)</p>
                <button className="mt-3 btn-secondary text-sm">Configurar Fuentes</button>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Reglas de Filtrado</h3>
                <p className="text-sm text-gray-500">Define criterios para incluir/excluir vehículos automáticamente</p>
                <button className="mt-3 btn-secondary text-sm">Gestionar Reglas</button>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Programación</h3>
                <p className="text-sm text-gray-500">Configura la frecuencia de sincronización y horarios</p>
                <button className="mt-3 btn-secondary text-sm">Configurar Schedule</button>
              </div>
              <div className="p-4 border rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Notificaciones</h3>
                <p className="text-sm text-gray-500">Alertas por nuevas oportunidades, cambios de precio, etc.</p>
                <button className="mt-3 btn-secondary text-sm">Configurar Alertas</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Integraciones</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'WhatsApp Business', desc: 'Envía y recibe mensajes por WhatsApp', configured: true, color: 'green' },
                { name: 'Instagram', desc: 'Gestiona mensajes directos de Instagram', configured: false, color: 'pink' },
                { name: 'Stripe', desc: 'Procesamiento de pagos y suscripciones', configured: true, color: 'blue' },
                { name: 'Google Calendar', desc: 'Sincroniza citas y pruebas de manejo', configured: false, color: 'blue' },
                { name: 'Zapier', desc: 'Conecta con 5000+ aplicaciones', configured: false, color: 'orange' },
                { name: 'Webhooks', desc: 'Recibe eventos en tiempo real', configured: true, color: 'purple' },
              ].map(integration => (
                <div key={integration.name} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{integration.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{integration.desc}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      integration.configured ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {integration.configured ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>
                  <button className="mt-3 btn-secondary text-sm w-full">
                    {integration.configured ? 'Configurar' : 'Conectar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="card">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
            <button
              onClick={() => { /* show create modal */ }}
              className="btn-primary"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Crear API Key
            </button>
          </div>
          
          <div className="p-4">
            {apiKeysData?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <p className="mt-2">No hay API Keys creadas</p>
                <p className="text-sm">Genera una clave para acceder a la API programáticamente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeysData?.map(key => (
                  <div key={key.id} className="p-4 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900">{key.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          key.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {key.isActive ? 'Activa' : 'Revoked'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Creada: {format(new Date(key.createdAt), 'dd/MM/yyyy')} · 
                        {key.lastUsedAt ? `Último uso: ${format(new Date(key.lastUsedAt), 'dd/MM/yyyy HH:mm')}` : 'Nunca usada'}
                        {key.expiresAt && ` · Expira: ${format(new Date(key.expiresAt), 'dd/MM/yyyy')}`}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-700">
                          {key.prefix}••••••••
                        </code>
                        <button className="btn-secondary text-sm">Copiar</button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" onClick={() => handleRevokeApiKey(key.id)}>
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Preferencias de Notificación</h2>
          <div className="space-y-4">
            {[
              { id: 'email_leads', label: 'Nuevos Leads', desc: 'Recibir email cuando llegue un nuevo lead', default: true },
              { id: 'email_deals', label: 'Oportunidades Radar', desc: 'Alertas de vehículos con buen margen detectados por el Radar', default: true },
              { id: 'email_campaigns', label: 'Campañas Completadas', desc: 'Resumen cuando termine una campaña de marketing', default: true },
              { id: 'email_videos', label: 'Videos Listos', desc: 'Notificación cuando se complete la generación de un video', default: true },
              { id: 'email_billing', label: 'Facturación', desc: 'Recibos, renovaciones y alertas de pago', default: true },
              { id: 'push_leads', label: 'Push: Nuevos Leads', desc: 'Notificación push en el navegador/móvil', default: false },
              { id: 'push_messages', label: 'Push: Mensajes', desc: 'Notificación push para nuevos mensajes en conversaciones', default: true },
              { id: 'weekly_digest', label: 'Resumen Semanal', desc: 'Reporte semanal de métricas y actividad', default: true },
            ].map(notification => (
              <div key={notification.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{notification.label}</p>
                  <p className="text-sm text-gray-500">{notification.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={notification.default} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowMemberModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold">{editingMember ? 'Editar Miembro' : 'Invitar Miembro'}</h3>
                <button onClick={() => setShowMemberModal(false)} className="p-2 text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleInviteMember} className="p-4 space-y-4">
                <div>
                  <label className="label">Email *</label>
                  <input type="email" name="email" className="input-field" required />
                </div>
                <div>
                  <label className="label">Rol *</label>
                  <select name="role" className="input-field" required>
                    {roles.filter(r => r.value !== 'OWNER').map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button type="button" onClick={() => setShowMemberModal(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={inviteMemberMutation.isPending}>
                    {inviteMemberMutation.isPending ? 'Enviando...' : 'Enviar Invitación'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}