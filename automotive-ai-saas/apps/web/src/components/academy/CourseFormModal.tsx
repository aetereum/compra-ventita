'use client';

import { useState, useEffect } from 'react';
import { Course, Module, Lesson } from '@automotive-ai-saas/types';
import { XMarkIcon, PlusIcon, TrashIcon, GripVerticalIcon } from '@heroicons/react/24/outline';

interface CourseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  onSubmit: (data: Partial<Course>) => void;
  isSubmitting: boolean;
}

const statuses = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];
const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const lessonTypes = ['VIDEO', 'TEXT', 'QUIZ', 'ASSIGNMENT', 'LIVE', 'SCORM'];

const emptyModule: Module = {
  id: '',
  courseId: '',
  title: '',
  description: '',
  order: 0,
  unlockCondition: { type: 'NONE' },
  lessons: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const emptyLesson: Lesson = {
  id: '',
  moduleId: '',
  title: '',
  description: '',
  type: 'VIDEO',
  content: '',
  order: 0,
  durationMinutes: 0,
  isPreview: false,
  resources: [],
  quizConfig: {},
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function CourseFormModal({ isOpen, onClose, course, onSubmit, isSubmitting }: CourseFormModalProps) {
  const [formData, setFormData] = useState<Partial<Course>>({
    title: '',
    description: '',
    shortDescription: '',
    status: 'DRAFT',
    difficulty: 'BEGINNER',
    thumbnailUrl: '',
    tags: [],
    prerequisites: [],
    learningObjectives: [],
    targetAudience: '',
    estimatedHours: 0,
    price: 0,
    currency: 'USD',
    isFeatured: false,
    certificateTemplateId: '',
    modules: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedModules, setExpandedModules] = useState<number[]>([]);

  useEffect(() => {
    if (course) {
      setFormData({
        title: course.title,
        description: course.description,
        shortDescription: course.shortDescription || '',
        status: course.status,
        difficulty: course.difficulty,
        thumbnailUrl: course.thumbnailUrl || '',
        tags: course.tags || [],
        prerequisites: course.prerequisites || [],
        learningObjectives: course.learningObjectives || [],
        targetAudience: course.targetAudience || '',
        estimatedHours: course.estimatedHours || 0,
        price: course.price || 0,
        currency: course.currency || 'USD',
        isFeatured: course.isFeatured || false,
        certificateTemplateId: course.certificateTemplateId || '',
        modules: course.modules?.map((m, i) => ({ ...m, order: i })) || [],
      });
      setExpandedModules(course.modules?.map((_, i) => i) || []);
    } else {
      setFormData({
        title: '',
        description: '',
        shortDescription: '',
        status: 'DRAFT',
        difficulty: 'BEGINNER',
        thumbnailUrl: '',
        tags: [],
        prerequisites: [],
        learningObjectives: [],
        targetAudience: '',
        estimatedHours: 0,
        price: 0,
        currency: 'USD',
        isFeatured: false,
        certificateTemplateId: '',
        modules: [],
      });
      setExpandedModules([]);
    }
    setErrors({});
  }, [course, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title) newErrors.title = 'Título es requerido';
    if (!formData.description) newErrors.description = 'Descripción es requerida';
    if ((formData.modules?.length || 0) === 0) newErrors.modules = 'Agrega al menos un módulo';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addModule = () => {
    const modules = [...(formData.modules || [])];
    modules.push({ ...emptyModule, order: modules.length });
    handleChange('modules', modules);
    setExpandedModules(prev => [...prev, modules.length - 1]);
  };

  const removeModule = (index: number) => {
    const modules = [...(formData.modules || [])];
    modules.splice(index, 1);
    modules.forEach((m, i) => m.order = i);
    handleChange('modules', modules);
    setExpandedModules(prev => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const toggleModule = (index: number) => {
    setExpandedModules(prev => prev.includes(index)
      ? prev.filter(i => i !== index)
      : [...prev, index]
    );
  };

  const updateModule = (index: number, field: string, value: any) => {
    const modules = [...(formData.modules || [])];
    modules[index] = { ...modules[index], [field]: value };
    handleChange('modules', modules);
  };

  const addLesson = (moduleIndex: number) => {
    const modules = [...(formData.modules || [])];
    const module = modules[moduleIndex];
    const lessons = [...(module.lessons || [])];
    lessons.push({ ...emptyLesson, order: lessons.length });
    module.lessons = lessons;
    handleChange('modules', modules);
  };

  const removeLesson = (moduleIndex: number, lessonIndex: number) => {
    const modules = [...(formData.modules || [])];
    modules[moduleIndex].lessons?.splice(lessonIndex, 1);
    modules[moduleIndex].lessons?.forEach((l, i) => l.order = i);
    handleChange('modules', modules);
  };

  const updateLesson = (moduleIndex: number, lessonIndex: number, field: string, value: any) => {
    const modules = [...(formData.modules || [])];
    const lessons = [...(modules[moduleIndex].lessons || [])];
    lessons[lessonIndex] = { ...lessons[lessonIndex], [field]: value };
    modules[moduleIndex].lessons = lessons;
    handleChange('modules', modules);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">
              {course ? 'Editar Curso' : 'Nuevo Curso'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(95vh-80px)]">
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Información Básica</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Título *</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      className="input-field"
                      required
                    />
                    {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="label">Descripción *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="input-field"
                      rows={4}
                      required
                    />
                    {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="label">Descripción Corta</label>
                    <textarea
                      value={formData.shortDescription}
                      onChange={(e) => handleChange('shortDescription', e.target.value)}
                      className="input-field"
                      rows={2}
                      placeholder="Resumen para listados (máx 200 chars)"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="label">Estado *</label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value as any)}
                        className="input-field"
                      >
                        {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Dificultad *</label>
                      <select
                        value={formData.difficulty}
                        onChange={(e) => handleChange('difficulty', e.target.value as any)}
                        className="input-field"
                      >
                        {difficulties.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Horas Estimadas</label>
                      <input
                        type="number"
                        value={formData.estimatedHours}
                        onChange={(e) => handleChange('estimatedHours', parseFloat(e.target.value) || 0)}
                        className="input-field"
                        min={0}
                        step={0.5}
                      />
                    </div>
                    <div>
                      <label className="label">Precio</label>
                      <div className="flex gap-2">
                        <select
                          value={formData.currency}
                          onChange={(e) => handleChange('currency', e.target.value)}
                          className="input-field w-24"
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="CLP">CLP</option>
                        </select>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                          className="input-field flex-1"
                          min={0}
                          step={100}
                          placeholder="0 = Gratis"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="label">URL Thumbnail</label>
                    <input
                      type="url"
                      value={formData.thumbnailUrl}
                      onChange={(e) => handleChange('thumbnailUrl', e.target.value)}
                      className="input-field"
                      placeholder="https://ejemplo.com/thumbnail.jpg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.isFeatured}
                          onChange={(e) => handleChange('isFeatured', e.target.checked)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span>Destacado</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4 pb-2 border-b border-gray-200">Metadatos</h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Tags (separados por comas)</label>
                    <input
                      type="text"
                      value={(formData.tags || []).join(', ')}
                      onChange={(e) => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                      className="input-field"
                      placeholder="ventas, negociación, CRM, automotriz"
                    />
                  </div>

                  <div>
                    <label className="label">Prerrequisitos (un curso por línea)</label>
                    <textarea
                      value={(formData.prerequisites || []).join('\n')}
                      onChange={(e) => handleChange('prerequisites', e.target.value.split('\n').filter(Boolean))}
                      className="input-field"
                      rows={3}
                      placeholder="ID o nombre del curso requerido"
                    />
                  </div>

                  <div>
                    <label className="label">Objetivos de Aprendizaje (uno por línea)</label>
                    <textarea
                      value={(formData.learningObjectives || []).join('\n')}
                      onChange={(e) => handleChange('learningObjectives', e.target.value.split('\n').filter(Boolean))}
                      className="input-field"
                      rows={3}
                      placeholder="Al finalizar el curso el alumno podrá..."
                    />
                  </div>

                  <div>
                    <label className="label">Audiencia Objetivo</label>
                    <textarea
                      value={formData.targetAudience}
                      onChange={(e) => handleChange('targetAudience', e.target.value)}
                      className="input-field"
                      rows={2}
                      placeholder="Ej: Vendedores junior, gerentes de flota, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700">Módulos y Lecciones</h3>
                  <button
                    type="button"
                    onClick={addModule}
                    className="btn-secondary text-sm"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Agregar Módulo
                  </button>
                </div>

                {(formData.modules || []).length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">No hay módulos. Agrega al menos uno para continuar.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(formData.modules || []).map((module, mIndex) => (
                      <div key={mIndex} className="border rounded-lg bg-gray-50">
                        <button
                          type="button"
                          onClick={() => toggleModule(mIndex)}
                          className="w-full p-3 flex items-center justify-between bg-white border-b border-gray-200 hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <GripVerticalIcon className="w-5 h-5 text-gray-400 cursor-move" />
                            <span className="font-medium">Módulo {mIndex + 1}: {module.title || 'Sin título'}</span>
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded">
                              {module.lessons?.length || 0} lecciones
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {expandedModules.includes(mIndex) ? (
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )}
                            <button
                              type="button"
                              onClick={() => removeModule(mIndex)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </button>

                        {expandedModules.includes(mIndex) && (
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="label">Título del Módulo *</label>
                                <input
                                  type="text"
                                  value={module.title}
                                  onChange={(e) => updateModule(mIndex, 'title', e.target.value)}
                                  className="input-field"
                                />
                              </div>
                              <div>
                                <label className="label">Orden</label>
                                <input
                                  type="number"
                                  value={module.order}
                                  onChange={(e) => updateModule(mIndex, 'order', parseInt(e.target.value) || 0)}
                                  className="input-field"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="label">Descripción</label>
                              <textarea
                                value={module.description}
                                onChange={(e) => updateModule(mIndex, 'description', e.target.value)}
                                className="input-field"
                                rows={2}
                              />
                            </div>

                            <div>
                              <label className="label">Condición de Desbloqueo</label>
                              <select
                                value={module.unlockCondition?.type || 'NONE'}
                                onChange={(e) => updateModule(mIndex, 'unlockCondition', { ...module.unlockCondition, type: e.target.value })}
                                className="input-field"
                              >
                                <option value="NONE">Sin condición</option>
                                <option value="PREVIOUS_MODULE_COMPLETED">Módulo anterior completado</option>
                                <option value="MIN_SCORE">Puntuación mínima en quiz</option>
                                <option value="DATE">Fecha específica</option>
                              </select>
                            </div>

                            {module.unlockCondition?.type === 'MIN_SCORE' && (
                              <div>
                                <label className="label">Puntuación Mínima (0-100)</label>
                                <input
                                  type="number"
                                  value={module.unlockCondition?.minScore || 70}
                                  onChange={(e) => updateModule(mIndex, 'unlockCondition', { ...module.unlockCondition, minScore: parseInt(e.target.value) || 70 })}
                                  className="input-field"
                                  min={0}
                                  max={100}
                                />
                              </div>
                            )}

                            {module.unlockCondition?.type === 'DATE' && (
                              <div>
                                <label className="label">Fecha de Disponibilidad</label>
                                <input
                                  type="datetime-local"
                                  value={module.unlockCondition?.availableFrom || ''}
                                  onChange={(e) => updateModule(mIndex, 'unlockCondition', { ...module.unlockCondition, availableFrom: e.target.value })}
                                  className="input-field"
                                />
                              </div>
                            )}

                            {/* Lessons */}
                            <div className="border-t border-gray-200 pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">Lecciones</h4>
                                <button
                                  type="button"
                                  onClick={() => addLesson(mIndex)}
                                  className="btn-secondary text-sm"
                                >
                                  <PlusIcon className="w-4 h-4 mr-1" />
                                  Agregar Lección
                                </button>
                              </div>

                              {(module.lessons || []).length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-4">Sin lecciones</p>
                              ) : (
                                <div className="space-y-2">
                                  {(module.lessons || []).map((lesson, lIndex) => (
                                    <div key={lIndex} className="bg-white border rounded-lg p-3">
                                      <div className="flex items-center gap-3 mb-2">
                                        <GripVerticalIcon className="w-4 h-4 text-gray-400" />
                                        <select
                                          value={lesson.type}
                                          onChange={(e) => updateLesson(mIndex, lIndex, 'type', e.target.value)}
                                          className="input-field w-32 text-sm"
                                        >
                                          {lessonTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <input
                                          type="text"
                                          value={lesson.title}
                                          onChange={(e) => updateLesson(mIndex, lIndex, 'title', e.target.value)}
                                          className="input-field flex-1 text-sm"
                                          placeholder="Título de la lección"
                                        />
                                        <input
                                          type="number"
                                          value={lesson.durationMinutes}
                                          onChange={(e) => updateLesson(mIndex, lIndex, 'durationMinutes', parseInt(e.target.value) || 0)}
                                          className="input-field w-20 text-sm"
                                          placeholder="Min"
                                        />
                                        <label className="flex items-center gap-1 text-sm">
                                          <input
                                            type="checkbox"
                                            checked={lesson.isPreview}
                                            onChange={(e) => updateLesson(mIndex, lIndex, 'isPreview', e.target.checked)}
                                            className="w-3 h-3 text-primary-600"
                                          />
                                          Preview
                                        </label>
                                        <button
                                          type="button"
                                          onClick={() => removeLesson(mIndex, lIndex)}
                                          className="p-1 text-gray-400 hover:text-red-600"
                                        >
                                          <TrashIcon className="w-4 h-4" />
                                        </button>
                                      </div>

                                      <div className="space-y-2 ml-8">
                                        <textarea
                                          value={lesson.description}
                                          onChange={(e) => updateLesson(mIndex, lIndex, 'description', e.target.value)}
                                          className="input-field text-sm"
                                          rows={2}
                                          placeholder="Descripción"
                                        />
                                        <textarea
                                          value={lesson.content}
                                          onChange={(e) => updateLesson(mIndex, lIndex, 'content', e.target.value)}
                                          className="input-field text-sm font-mono"
                                          rows={3}
                                          placeholder="Contenido (Markdown, URL video, JSON quiz, etc.)"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {errors.modules && <p className="text-red-500 text-sm">{errors.modules}</p>}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6 sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  course ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}