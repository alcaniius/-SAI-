'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { fetchProfile, updateProfile } from '@/lib/api';
import { Loader2, Check, X, User, Building2, MapPin, ShieldCheck, Mail, KeyRound, Save } from 'lucide-react';

// ── Zod schemas ──────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1, 'Requerido'),
  lastName: z.string().min(1, 'Requerido'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Requerido'),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string().min(1, 'Requerido'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

// ── Types ────────────────────────────────────────────────
interface Organization {
  id: string;
  name: string;
  active: boolean;
}

interface Site {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  active: boolean;
  organizationId?: string;
  siteId?: string;
  createdAt: string;
  updatedAt: string;
  organization?: Organization | null;
  site?: Site | null;
}

// ── Helpers ──────────────────────────────────────────────
const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const roleLabel: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  USER: 'Usuario',
  AUDITOR: 'Auditor',
};

const roleColor: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  USER: 'bg-green-100 text-green-800',
  AUDITOR: 'bg-gray-100 text-gray-800',
};

// ── Component ────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, isInitialized, isAuthenticated, updateUser } = useAuthStore();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Auth guard
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      router.push('/login');
    }
  }, [isInitialized, isAuthenticated, router]);

  // Load profile
  useEffect(() => {
    if (isAuthenticated) {
      loadProfile();
    }
  }, [isAuthenticated]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetchProfile();
      setProfile(res.data);
      profileForm.setValue('firstName', res.data.firstName);
      profileForm.setValue('lastName', res.data.lastName);
    } catch {
      setMessage({ type: 'error', text: 'Error al cargar el perfil' });
    } finally {
      setLoading(false);
    }
  };

  const onUpdateProfile = async (data: ProfileFormData) => {
    setMessage(null);
    try {
      const res = await updateProfile(data);
      setProfile(res.data);
      if (user) {
        updateUser({ ...user, firstName: res.data.firstName, lastName: res.data.lastName });
      }
      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al actualizar perfil';
      setMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al actualizar perfil' });
    }
  };

  const onUpdatePassword = async (data: PasswordFormData) => {
    setMessage(null);
    try {
      await updateProfile({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      passwordForm.reset();
      setMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al cambiar contraseña';
      setMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al cambiar contraseña' });
    }
  };

  // Loading / Auth guards
  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-2">Gestiona tu información personal y seguridad</p>
      </div>

      {/* Message banner */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Profile card */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-white text-3xl font-bold">
              {profile?.firstName?.[0]}{profile?.lastName?.[0]}
            </div>
            <div className="text-white">
              <h2 className="text-2xl font-bold">
                {profile?.firstName} {profile?.lastName}
              </h2>
              <p className="text-blue-100">{profile?.email}</p>
              <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleColor[profile?.role || 'USER']}`}>
                {roleLabel[profile?.role || 'USER']}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Información
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'security'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Seguridad
            </button>
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Personal info form */}
              <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                    <input
                      type="text"
                      {...profileForm.register('firstName')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="text-red-600 text-sm mt-1">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                    <input
                      type="text"
                      {...profileForm.register('lastName')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="text-red-600 text-sm mt-1">{profileForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={profileForm.formState.isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {profileForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </button>
                </div>
              </form>

              {/* Account details */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles de la Cuenta</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Correo electrónico</p>
                      <p className="text-sm text-gray-900">{profile?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Rol</p>
                      <p className="text-sm text-gray-900">{roleLabel[profile?.role || 'USER']}</p>
                    </div>
                  </div>
                  {profile?.organization && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Organización</p>
                        <p className="text-sm text-gray-900">{profile.organization.name}</p>
                        {!profile.organization.active && (
                          <span className="text-xs text-red-600">Inactiva</span>
                        )}
                      </div>
                    </div>
                  )}
                  {profile?.site && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">Sede</p>
                        <p className="text-sm text-gray-900">{profile.site.name} ({profile.site.code})</p>
                        {!profile.site.active && (
                          <span className="text-xs text-red-600">Inactiva</span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Miembro desde</p>
                      <p className="text-sm text-gray-900">{profile?.createdAt ? formatDate(profile.createdAt) : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Check className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Estado</p>
                      <p className="text-sm text-gray-900">
                        {profile?.active ? (
                          <span className="text-green-700">Activo</span>
                        ) : (
                          <span className="text-red-700">Inactivo</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Cambiar Contraseña
              </h3>
              <form onSubmit={passwordForm.handleSubmit(onUpdatePassword)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual</label>
                  <input
                    type="password"
                    {...passwordForm.register('currentPassword')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="text-red-600 text-sm mt-1">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <input
                    type="password"
                    {...passwordForm.register('newPassword')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-red-600 text-sm mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    {...passwordForm.register('confirmPassword')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-red-600 text-sm mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={passwordForm.formState.isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    {passwordForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Actualizar Contraseña
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
