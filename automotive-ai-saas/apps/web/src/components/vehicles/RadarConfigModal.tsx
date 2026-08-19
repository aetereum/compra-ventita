'use client';

import { useState, useEffect } from 'react';
import { RadarSource, RadarRule, Opportunity } from '@automotive-ai-saas/types';
import { api } from '@/lib/api';
import { XMarkIcon, PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

interface RadarConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sourceTypes = ['CARDEALS', 'MERCADOLIBRE', 'WEBSCRAPER', 'MANUAL', 'API'];
const ruleFields = ['price', 'year', 'mileage', 'make', 'model', 'fuelType', 'transmission', 'location'];
const operators = ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'IN', 'NOT_IN', 'CONTAINS', 'NOT_CONTAINS'];

export function RadarConfigModal({ isOpen, onClose }: RadarConfigModalProps) {
  const [sources, setSources] = useState<RadarSource[]>([]);
  const [rules, setRules] = useState<RadarRule[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [activeTab, setActiveTab] = useState<'sources' | 'rules' | 'opportunities'>('sources');
  const [loading, setLoading] = useState(false);
  const [showSourceForm, setShowSourceForm] = useState(false);
  const [editingSource, setEditingSource] = useState<RadarSource | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RadarRule | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sourcesRes, rulesRes, oppRes] = await Promise.all([
        api.get<RadarSource[]>('/radar/sources'),
        api.get<RadarRule[]>('/radar/rules'),
        api.get<Opportunity[]>('/radar/opportunities', { params: { limit: 20 } }),
      ]);
      setSources(sourcesRes);
      setRules(rulesRes);
      setOpportunities(oppRes);
    } catch (error) {
      console.error('Error fetching radar data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  const handleSourceSubmit = async (data: Partial<RadarSource>) => {
    try {
      if (editingSource) {
        await api.patch(`/radar/sources/${editingSource.id}`, data);
      } else {
        await api.post('/radar/sources', data);
      }
      fetchData();
      setShowSourceForm(false);
      setEditingSource(null);
    } catch (error) {
      console.error('Error saving source:', error);
    }
  };

  const handleRuleSubmit = async (data: Partial<RadarRule>) => {
    try {
      if (editingRule) {
        await api.patch(`/radar/rules/${editingRule.id}`, data);
      } else {
        await api.post('/radar/rules', data);
      }
      fetchData();
      setShowRuleForm(false);
      setEditingRule(null);
    } catch (error) {
      console.error('Error saving rule:', error);
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (confirm('¿Eliminar esta fuente?')) {
      try {
        await api.delete(`/radar/sources/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting source:', error);
      }
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (confirm('¿Eliminar esta regla?')) {
      try {
        await api.delete(`/radar/rules/${id}`);
        fetchData();
      } catch (error) {
        console.error('Error deleting rule:', error);
      }
    }
  };

  const handleRunRadar = async () => {
    try {
      await api.post('/radar/run');
      fetchData();
    } catch (error) {
      console.error('Error running radar:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">Configuración del Radar</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunRadar}
                className="btn-secondary text-sm"
                disabled={loading}
              >
                <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Ejecutar Ahora
              </button>
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
                onClick={() => setActiveTab('sources')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'sources' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Fuentes ({sources.length})
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'rules' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Reglas ({rules.length})
              </button>
              <button
                onClick={() => setActiveTab('opportunities')}
                className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'opportunities' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Oportunidades ({opportunities.length})
              </button>
            </nav>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(90vh-160px)]">
            {/* Sources Tab */}
            {activeTab === 'sources' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Fuentes de Datos</h3>
                  <button
                    onClick={() => { setEditingSource(null); setShowSourceForm(true); }}
                    className="btn-primary"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Nueva Fuente
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border rounded-lg">
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : sources.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 01-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    <h4 className="mt-2 text-sm font-medium text-gray-900">No hay fuentes configuradas</h4>
                    <p className="mt-1 text-sm text-gray-500">Agrega una fuente para comenzar a monitorear vehículos.</p>
                    <button
                      onClick={() => { setEditingSource(null); setShowSourceForm(true); }}
                      className="mt-4 btn-primary"
                    >
                      Configurar Primera Fuente
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sources.map(source => (
                      <div key={source.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{source.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                source.type === 'CARDEALS' ? 'bg-blue-100 text-blue-800' :
                                source.type === 'MERCADOLIBRE' ? 'bg-yellow-100 text-yellow-800' :
                                source.type === 'WEBSCRAPER' ? 'bg-purple-100 text-purple-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {source.type}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                source.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {source.isActive ? 'Activa' : 'Inactiva'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span>Sync: {source.syncIntervalMinutes} min</span>
                              <span>Último sync: {source.lastSyncAt ? new Date(source.lastSyncAt).toLocaleString() : 'Nunca'}</span>
                              <span>Listados: {source.totalListings || 0}</span>
                            </div>
                            {source.config && Object.keys(source.config).length > 0 && (
                              <details className="mt-2">
                                <summary className="text-sm text-gray-500 cursor-pointer">Ver configuración</summary>
                                <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(source.config, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingSource(source); setShowSourceForm(true); }}
                              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                              title="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSource(source.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Eliminar"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Rules Tab */}
            {activeTab === 'rules' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Reglas de Filtrado</h3>
                  <button
                    onClick={() => { setEditingRule(null); setShowRuleForm(true); }}
                    className="btn-primary"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Nueva Regla
                  </button>
                </div>

                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border rounded-lg">
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : rules.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h4 className="mt-2 text-sm font-medium text-gray-900">No hay reglas configuradas</h4>
                    <p className="mt-1 text-sm text-gray-500">Define reglas para filtrar automáticamente vehículos que cumplan tus criterios.</p>
                    <button
                      onClick={() => { setEditingRule(null); setShowRuleForm(true); }}
                      className="mt-4 btn-primary"
                    >
                      Crear Primera Regla
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map(rule => (
                      <div key={rule.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{rule.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {rule.isActive ? 'Activa' : 'Inactiva'}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                rule.action === 'INCLUDE' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {rule.action === 'INCLUDE' ? 'Incluir' : 'Excluir'}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500">
                              {rule.conditions.map((c, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded mr-2 mb-1">
                                  {c.field} {c.operator} {Array.isArray(c.value) ? c.value.join(', ') : c.value}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Prioridad: {rule.priority}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setEditingRule(rule); setShowRuleForm(true); }}
                              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                              title="Editar"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Eliminar"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Opportunities Tab */}
            {activeTab === 'opportunities' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Oportunidades Detectadas</h3>

                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border rounded-lg">
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <h4 className="mt-2 text-sm font-medium text-gray-900">No hay oportunidades</h4>
                    <p className="mt-1 text-sm text-gray-500">Ejecuta el radar para detectar nuevas oportunidades.</p>
                    <button
                      onClick={handleRunRadar}
                      className="mt-4 btn-primary"
                      disabled={loading}
                    >
                      Ejecutar Radar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {opportunities.map(opp => (
                      <div key={opp.id} className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">
                                {opp.vehicle.year} {opp.vehicle.make} {opp.vehicle.model}
                              </h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                opp.dealScore >= 80 ? 'bg-green-100 text-green-800' :
                                opp.dealScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                Score: {opp.dealScore}/100
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                ${opp.estimatedMargin.toLocaleString()} margen
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                              <span>Precio: ${opp.vehicle.price.toLocaleString()}</span>
                              <span>Mercado: ${opp.marketPrice.toLocaleString()}</span>
                              <span>Fuente: {opp.source}</span>
                              <span>Detectado: {new Date(opp.detectedAt).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="btn-primary text-sm">Ver Detalle</button>
                            <button className="btn-secondary text-sm">Importar</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Source Form Modal */}
        {showSourceForm && (
          <SourceFormModal
            isOpen={showSourceForm}
            onClose={() => { setShowSourceForm(false); setEditingSource(null); }}
            source={editingSource}
            onSubmit={handleSourceSubmit}
          />
        )}

        {/* Rule Form Modal */}
        {showRuleForm && (
          <RuleFormModal
            isOpen={showRuleForm}
            onClose={() => { setShowRuleForm(false); setEditingRule(null); }}
            rule={editingRule}
            onSubmit={handleRuleSubmit}
          />
        )}
      </div>
    </div>
  );
}

function SourceFormModal({ isOpen, onClose, source, onSubmit }: any) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'CARDEALS',
    config: {},
    syncIntervalMinutes: 60,
    isActive: true,
  });

  useEffect(() => {
    if (source) {
      setFormData({
        name: source.name,
        type: source.type,
        config: source.config || {},
        syncIntervalMinutes: source.syncIntervalMinutes,
        isActive: source.isActive,
      });
    } else {
      setFormData({
        name: '',
        type: 'CARDEALS',
        config: {},
        syncIntervalMinutes: 60,
        isActive: true,
      });
    }
  }, [source, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">{source ? 'Editar Fuente' : 'Nueva Fuente'}</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="label">Tipo *</label>
                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="input-field">
                  {sourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Intervalo de Sync (minutos)</label>
                <input type="number" value={formData.syncIntervalMinutes} onChange={e => setFormData({...formData, syncIntervalMinutes: parseInt(e.target.value)})} className="input-field" min={5} />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-primary-600" />
                  Activa
                </label>
              </div>
              <div>
                <label className="label">Configuración (JSON)</label>
                <textarea value={JSON.stringify(formData.config, null, 2)} onChange={e => { try { setFormData({...formData, config: JSON.parse(e.target.value)}); } catch {} }} className="input-field font-mono text-sm" rows={6} placeholder='{"apiKey": "xxx", "region": "US"}' />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary">{source ? 'Actualizar' : 'Crear'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function RuleFormModal({ isOpen, onClose, rule, onSubmit }: any) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    conditions: [{ field: 'price', operator: 'LESS_THAN', value: 20000 }],
    action: 'INCLUDE',
    priority: 100,
    isActive: true,
  });

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        conditions: rule.conditions,
        action: rule.action,
        priority: rule.priority,
        isActive: rule.isActive,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        conditions: [{ field: 'price', operator: 'LESS_THAN', value: 20000 }],
        action: 'INCLUDE',
        priority: 100,
        isActive: true,
      });
    }
  }, [rule, isOpen]);

  const addCondition = () => {
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: 'price', operator: 'LESS_THAN', value: 20000 }],
    }));
  };

  const removeCondition = (index: number) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index),
    }));
  };

  const updateCondition = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map((c, i) => i === index ? { ...c, [field]: value } : c),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.conditions.length === 0) return;
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">{rule ? 'Editar Regla' : 'Nueva Regla'}</h3>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-4">
              <div>
                <label className="label">Nombre *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" required />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="input-field" rows={2} />
              </div>
              <div>
                <label className="label">Acción *</label>
                <select value={formData.action} onChange={e => setFormData({...formData, action: e.target.value})} className="input-field">
                  <option value="INCLUDE">Incluir (match = oportunidad)</option>
                  <option value="EXCLUDE">Excluir (match = descartar)</option>
                </select>
              </div>
              <div>
                <label className="label">Prioridad</label>
                <input type="number" value={formData.priority} onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})} className="input-field" />
                <p className="text-xs text-gray-500 mt-1">Mayor prioridad = se evalúa primero</p>
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-4 h-4 text-primary-600" />
                  Activa
                </label>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Condiciones (TODAS deben cumplirse)</label>
                  <button type="button" onClick={addCondition} className="text-sm text-primary-600 hover:text-primary-800">+ Agregar</button>
                </div>
                <div className="space-y-2">
                  {formData.conditions.map((cond: any, i: number) => (
                    <div key={i} className="flex gap-2">
                      <select value={cond.field} onChange={e => updateCondition(i, 'field', e.target.value)} className="input-field w-32">
                        {ruleFields.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <select value={cond.operator} onChange={e => updateCondition(i, 'operator', e.target.value)} className="input-field w-40">
                        {operators.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input type="text" value={cond.value} onChange={e => updateCondition(i, 'value', e.target.value)} className="input-field flex-1" placeholder="Valor" />
                      {formData.conditions.length > 1 && (
                        <button type="button" onClick={() => removeCondition(i)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" className="btn-primary">{rule ? 'Actualizar' : 'Crear'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}