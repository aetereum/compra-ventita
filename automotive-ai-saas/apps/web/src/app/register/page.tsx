'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth';
import { useForm } from 'react-hook-form';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  organizationName: string;
  acceptTerms: boolean;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError('');
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        organizationName: data.organizationName,
      });
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al registrar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-primary-600 dark:text-primary-400">
            Automotive AI
          </Link>
          <p className="mt-2 text-gray-500 dark:text-gray-400">Crea tu cuenta y organización</p>
        </div>

        {/* Register Card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre
                </label>
                <input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  {...register('firstName', { required: 'Nombre es requerido' })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isLoading}
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>}
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Apellido
                </label>
                <input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  {...register('lastName', { required: 'Apellido es requerido' })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isLoading}
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.lastName.message}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre de la Organización
              </label>
              <input
                id="organizationName"
                type="text"
                {...register('organizationName', { required: 'Nombre de organización es requerido' })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isLoading}
              />
              {errors.organizationName && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.organizationName.message}</p>}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email', {
                  required: 'Email es requerido',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email inválido',
                  },
                })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isLoading}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                {...register('password', {
                  required: 'Contraseña es requerida',
                  minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isLoading}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword', {
                  required: 'Confirma tu contraseña',
                  validate: value => value === password || 'Las contraseñas no coinciden',
                })}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={isLoading}
              />
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="acceptTerms"
                {...register('acceptTerms', { required: 'Debes aceptar los términos' })}
                className="w-4 h-4 mt-0.5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700 dark:text-gray-300">
                Acepto los {' '}
                <Link href="/terms" className="text-primary-600 hover:text-primary-500">Términos y Condiciones</Link>{' '}
                y la {' '}
                <Link href="/privacy" className="text-primary-600 hover:text-primary-500">Política de Privacidad</Link>
              </label>
            </div>
            {errors.acceptTerms && <p className="text-sm text-red-600 dark:text-red-400">{errors.acceptTerms.message}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creando cuenta...
                </span>
              ) : (
                'Crear Cuenta'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary-600 hover:text-primary-500 dark:text-primary-400 font-medium">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}