'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { Plus, Loader2, Check, X, Pencil, Trash2 } from 'lucide-react';

// Zod v4 schema: use `message` (NOT `required_error`)
const siteSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  code: z.string().min(1, 'Requerido'),
  address: z.string().min(1, 'Requerido'),
  municipality: z.string().min(1, 'Requerido'),
});

type FormData = z.infer<typeof siteSchema>;

interface Organization {
  id: string;
  name: string;
  active: boolean;
}

interface Site {
  id: string;
  name: string;
  code: string;
  address: string;
  municipality: string;
  active: boolean;
  organizationId: string;
}

export default function AdminSedesPage() {
  const router = useRouter();
  const { user, isInitialized, isAuthenticated } = useAuthStore();

  // Role guard
  useEffect(() => {
    if (isInitialized && isAuthenticated && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isInitialized, isAuthenticated, user, router]);

  // State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = useState<Site | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(siteSchema),
  });

  // Load organizations for the dropdown
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/users/organizations')
        .then((res) => setOrganizations(res.data))
        .catch(() => {});
    }
  }, [user]);

  // Load sites when org changes
  const loadSites = useCallback(async (orgId: string) => {
    if (!orgId) {
      setSites([]);
      return;
    }
    try {
      // Pass X-Tenant-ID explicitly to match the selected org
      const res = await api.get('/sites', {
        params: { organizationId: orgId },
        headers: { 'X-Tenant-ID': orgId },
      });
      setSites(res.data);
    } catch {
      setSites([]);
    }
  }, []);

  useEffect(() => {
    loadSites(selectedOrgId);
  }, [selectedOrgId, loadSites]);

  // Create
  const onCreate = async (data: FormData) => {
    if (!selectedOrgId) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/sites', data, {
        headers: { 'X-Tenant-ID': selectedOrgId },
      });
      setMessage({ type: 'success', text: 'Sede creada exitosamente' });
      setShowCreateModal(false);
      reset();
      await loadSites(selectedOrgId);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al crear sede';
      setMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al crear sede' });
    } finally {
      setLoading(false);
    }
  };

  // Open edit
  const openEdit = (site: Site) => {
    setEditingSite(site);
    setValue('name', site.name);
    setValue('code', site.code);
    setValue('address', site.address);
    setValue('municipality', site.municipality);
  };

  // Update
  const onEdit = async (data: FormData) => {
    if (!editingSite || !selectedOrgId) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.put(`/sites/${editingSite.id}`, data, {
        headers: { 'X-Tenant-ID': selectedOrgId },
      });
      setMessage({ type: 'success', text: 'Sede actualizada exitosamente' });
      setEditingSite(null);
      await loadSites(selectedOrgId);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al actualizar sede';
      setMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al actualizar sede' });
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const onDelete = async () => {
    if (!deletingSite || !selectedOrgId) return;
    setDeleteLoading(true);
    setMessage(null);
    try {
      await api.delete(`/sites/${deletingSite.id}`, {
        headers: { 'X-Tenant-ID': selectedOrgId },
      });
      setMessage({ type: 'success', text: 'Sede eliminada exitosamente' });
      setDeletingSite(null);
      await loadSites(selectedOrgId);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al eliminar sede';
      setMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al eliminar sede' });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Loading state
  if (!isInitialized || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sedes</h1>
        <p className="text-gray-600 mt-2">Gestionar sedes de organizaciones</p>
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

      {/* Organization Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organización
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Seleccione una organización</option>
              {organizations
                .filter((org) => org.active)
                .map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
            </select>
          </div>
          {selectedOrgId && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Sede
            </button>
          )}
        </div>
      </div>

      {/* Sites Table */}
      {selectedOrgId && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              Lista de Sedes ({sites.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Municipio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{site.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.address}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{site.municipality}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(site)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingSite(site)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {sites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No hay sedes para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Sede</h3>
              <button
                onClick={() => { setShowCreateModal(false); reset(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onCreate)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre de la sede"
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  {...register('code')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Código de la sede"
                />
                {errors.code && <p className="text-red-600 text-sm mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  {...register('address')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dirección"
                />
                {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                <input
                  type="text"
                  {...register('municipality')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Municipio"
                />
                {errors.municipality && <p className="text-red-600 text-sm mt-1">{errors.municipality.message}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); reset(); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Editar Sede</h3>
              <button
                onClick={() => setEditingSite(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onEdit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  {...register('code')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.code && <p className="text-red-600 text-sm mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  {...register('address')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.address && <p className="text-red-600 text-sm mt-1">{errors.address.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                <input
                  type="text"
                  {...register('municipality')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.municipality && <p className="text-red-600 text-sm mt-1">{errors.municipality.message}</p>}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSite(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                ¿Está seguro de eliminar la sede <strong>{deletingSite.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setDeletingSite(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No org selected message */}
      {!selectedOrgId && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-gray-500">Seleccione una organización para ver sus sedes</p>
        </div>
      )}
    </div>
  );
}
