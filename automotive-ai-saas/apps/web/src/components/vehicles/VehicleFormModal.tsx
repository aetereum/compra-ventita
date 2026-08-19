'use client';

import { useState, useEffect } from 'react';
import { Vehicle } from '@automotive-ai-saas/types';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSubmit: (data: Partial<Vehicle>) => void;
  isSubmitting: boolean;
}

const makes = [
  'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'Hyundai', 'Kia',
  'Volkswagen', 'Mazda', 'Subaru', 'BMW', 'Mercedes-Benz', 'Audi',
  'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Lincoln', 'Buick', 'GMC',
  'Jeep', 'Ram', 'Dodge', 'Chrysler', 'Fiat', 'Alfa Romeo', 'Maserati',
  'Ferrari', 'Lamborghini', 'Porsche', 'Tesla', 'Rivian', 'Lucid',
];

const fuelTypes = ['GASOLINE', 'DIESEL', 'HYBRID', 'PLUGIN_HYBRID', 'ELECTRIC'];
const transmissions = ['AUTOMATIC', 'MANUAL', 'CVT', 'DUAL_CLUTCH'];
const bodyTypes = ['SEDAN', 'SUV', 'TRUCK', 'COUPE', 'CONVERTIBLE', 'HATCHBACK', 'WAGON', 'VAN', 'PICKUP'];
const colors = ['BLANCO', 'NEGRO', 'GRIS', 'PLATEADO', 'AZUL', 'ROJO', 'VERDE', 'AMARILLO', 'NARANJA', 'MARRÓN'];

export function VehicleFormModal({ isOpen, onClose, vehicle, onSubmit, isSubmitting }: VehicleFormModalProps) {
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    trim: '',
    price: 0,
    cost: 0,
    mileage: 0,
    vin: '',
    fuelType: 'GASOLINE',
    transmission: 'AUTOMATIC',
    bodyType: 'SEDAN',
    exteriorColor: '',
    interiorColor: '',
    description: '',
    features: [],
    images: [],
    status: 'DRAFT',
    isFeatured: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (vehicle) {
      setFormData({
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        trim: vehicle.trim || '',
        price: vehicle.price,
        cost: vehicle.cost || 0,
        mileage: vehicle.mileage || 0,
        vin: vehicle.vin || '',
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        bodyType: vehicle.bodyType,
        exteriorColor: vehicle.exteriorColor || '',
        interiorColor: vehicle.interiorColor || '',
        description: vehicle.description || '',
        features: vehicle.features || [],
        images: vehicle.images || [],
        status: vehicle.status,
        isFeatured: vehicle.isFeatured || false,
      });
    } else {
      setFormData({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        trim: '',
        price: 0,
        cost: 0,
        mileage: 0,
        vin: '',
        fuelType: 'GASOLINE',
        transmission: 'AUTOMATIC',
        bodyType: 'SEDAN',
        exteriorColor: '',
        interiorColor: '',
        description: '',
        features: [],
        images: [],
        status: 'DRAFT',
        isFeatured: false,
      });
    }
    setErrors({});
  }, [vehicle, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.make) newErrors.make = 'Marca es requerida';
    if (!formData.model) newErrors.model = 'Modelo es requerido';
    if (!formData.year || formData.year < 1900 || formData.year > new Date().getFullYear() + 1) {
      newErrors.year = 'Año inválido';
    }
    if (!formData.price || formData.price <= 0) newErrors.price = 'Precio debe ser mayor a 0';
    if (!formData.vin) newErrors.vin = 'VIN es requerido';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-900">
              {vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Basic Info */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b border-gray-200">Información Básica</h3>
              </div>

              <div>
                <label className="label">Marca *</label>
                <select
                  value={formData.make}
                  onChange={(e) => handleChange('make', e.target.value)}
                  className="input-field"
                >
                  <option value="">Seleccionar marca</option>
                  {makes.map(make => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>
                {errors.make && <p className="text-red-500 text-sm mt-1">{errors.make}</p>}
              </div>

              <div>
                <label className="label">Modelo *</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleChange('model', e.target.value)}
                  className="input-field"
                  placeholder="Ej: Camry, Civic, F-150"
                />
                {errors.model && <p className="text-red-500 text-sm mt-1">{errors.model}</p>}
              </div>

              <div>
                <label className="label">Año *</label>
                <input
                  type="number"
                  value={formData.year}
                  onChange={(e) => handleChange('year', parseInt(e.target.value))}
                  className="input-field"
                  min={1900}
                  max={new Date().getFullYear() + 1}
                />
                {errors.year && <p className="text-red-500 text-sm mt-1">{errors.year}</p>}
              </div>

              <div>
                <label className="label">Versión/Trim</label>
                <input
                  type="text"
                  value={formData.trim}
                  onChange={(e) => handleChange('trim', e.target.value)}
                  className="input-field"
                  placeholder="Ej: LE, EX, Limited, Platinum"
                />
              </div>

              <div>
                <label className="label">Precio de Venta *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', parseFloat(e.target.value))}
                    className="input-field pl-8"
                    min={0}
                    step={100}
                  />
                </div>
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
              </div>

              <div>
                <label className="label">Costo de Adquisición</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => handleChange('cost', parseFloat(e.target.value))}
                    className="input-field pl-8"
                    min={0}
                    step={100}
                  />
                </div>
              </div>

              <div>
                <label className="label">Kilometraje</label>
                <input
                  type="number"
                  value={formData.mileage}
                  onChange={(e) => handleChange('mileage', parseInt(e.target.value))}
                  className="input-field"
                  min={0}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="label">VIN *</label>
                <input
                  type="text"
                  value={formData.vin}
                  onChange={(e) => handleChange('vin', e.target.value.toUpperCase())}
                  className="input-field font-mono"
                  placeholder="1HGBH41JXMN109186"
                  maxLength={17}
                />
                {errors.vin && <p className="text-red-500 text-sm mt-1">{errors.vin}</p>}
              </div>

              <div>
                <label className="label">Combustible</label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => handleChange('fuelType', e.target.value)}
                  className="input-field"
                >
                  {fuelTypes.map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Transmisión</label>
                <select
                  value={formData.transmission}
                  onChange={(e) => handleChange('transmission', e.target.value)}
                  className="input-field"
                >
                  {transmissions.map(type => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Tipo de Carrocería</label>
                <select
                  value={formData.bodyType}
                  onChange={(e) => handleChange('bodyType', e.target.value)}
                  className="input-field"
                >
                  {bodyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Color Exterior</label>
                <select
                  value={formData.exteriorColor}
                  onChange={(e) => handleChange('exteriorColor', e.target.value)}
                  className="input-field"
                >
                  <option value="">Seleccionar</option>
                  {colors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Color Interior</label>
                <select
                  value={formData.interiorColor}
                  onChange={(e) => handleChange('interiorColor', e.target.value)}
                  className="input-field"
                >
                  <option value="">Seleccionar</option>
                  {colors.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b border-gray-200">Descripción y Características</h3>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="label">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Describe el vehículo, estado, historial, equipamiento destacado..."
                />
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="label flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => handleChange('isFeatured', e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span>Destacado en portada</span>
                </label>
              </div>

              {/* Images */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b border-gray-200">Imágenes</h3>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <label className="label">URLs de imágenes (una por línea)</label>
                <textarea
                  value={formData.images?.map((img: any) => img.url).join('\n') || ''}
                  onChange={(e) => {
                    const urls = e.target.value.split('\n').filter(u => u.trim());
                    handleChange('images', urls.map(url => ({ url: url.trim(), isPrimary: false })));
                  }}
                  className="input-field"
                  rows={3}
                  placeholder="https://ejemplo.com/imagen1.jpg&#10;https://ejemplo.com/imagen2.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">La primera imagen será la principal. Máximo 20 imágenes.</p>
              </div>

              {/* Features */}
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-sm font-medium text-gray-700 mb-3 pb-2 border-b border-gray-200">Características (JSON array)</h3>
              </div>

              <div className="md:col-span-2 lg:col-span-3">
                <textarea
                  value={JSON.stringify(formData.features, null, 2)}
                  onChange={(e) => {
                    try {
                      handleChange('features', JSON.parse(e.target.value));
                    } catch {
                      // Invalid JSON, ignore
                    }
                  }}
                  className="input-field font-mono text-sm"
                  rows={6}
                  placeholder='["Aire acondicionado", "Bluetooth", "Cámara de reversa", "Sensor de estacionamiento"]'
                />
              </div>
            </div>

            {/* Actions */}
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
                  vehicle ? 'Actualizar' : 'Crear'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}