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
const organizationSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  subdomain: z.string().min(1, 'Requerido'),
});

const editOrganizationSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  active: z.boolean(),
});

type FormData = z.infer<typeof organizationSchema>;
type EditFormData = z.infer<typeof editOrganizationSchema>;

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  active: boolean;
}

export default function AdminOrganizacionesPage() {
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<FormData>({
    resolver: zodResolver(organizationSchema),
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    setValue: setEditValue,
    formState: { errors: editErrors },
  } = useForm<EditFormData>({
    resolver: zodResolver(editOrganizationSchema),
  });

  // Load organizations
  const loadOrganizations = useCallback(async () => {
    try {
      const res = await api.get('/users/organizations');
      setOrganizations(res.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadOrganizations();
    }
  }, [user, loadOrganizations]);

  // Create
  const onCreate = async (data: FormData) => {
    setLoading(true);
    setMessage(null);
    try {
      await api.post('/users/organizations', data);
      setMessage({ type: 'success', text: 'Organización creada exitosamente' });
      setShowCreateModal(false);
      resetCreate();
      await loadOrganizations();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al crear organización';
      setMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al crear organización' });
    } finally {
      setLoading(false);
    }
  };

  // Open edit
  const openEdit = (org: Organization) => {
    setEditingOrg(org);
    setEditValue('name', org.name);
    setEditValue('active', org.active);
  };

  // Update
  const onEdit = async (data: EditFormData) => {
    if (!editingOrg) return;
    setLoading(true);
    setMessage(null);
    try {
      await api.put(`/users/organizations/${editingOrg.id}`, data);
      setMessage({ type: 'success', text: 'Organización actualizada exitosamente' });
      setEditingOrg(null);
      await loadOrganizations();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al actualizar organización';
      setMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al actualizar organización' });
    } finally {
      setLoading(false);
    }
  };

  // Delete
  const onDelete = async () => {
    if (!deletingOrg) return;
    setDeleteLoading(true);
    setMessage(null);
    try {
      await api.delete(`/users/organizations/${deletingOrg.id}`);
      setMessage({ type: 'success', text: 'Organización eliminada exitosamente' });
      setDeletingOrg(null);
      await loadOrganizations();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al eliminar organización';
      setMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al eliminar organización' });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organizaciones</h1>
          <p className="text-gray-600 mt-2">Gestionar organizaciones del sistema</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear Organización
        </button>
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

      {/* Organization List Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Lista de Organizaciones ({organizations.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subdominio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{org.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{org.subdomain}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {org.active ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-700">
                        <Check className="w-4 h-4" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-red-700">
                        <X className="w-4 h-4" /> Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(org)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingOrg(org)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No hay organizaciones para mostrar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Organización</h3>
              <button
                onClick={() => { setShowCreateModal(false); resetCreate(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitCreate(onCreate)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  {...registerCreate('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre de la organización"
                />
                {createErrors.name && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subdominio</label>
                <input
                  type="text"
                  {...registerCreate('subdomain')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="subdominio"
                />
                {createErrors.subdomain && (
                  <p className="text-red-600 text-sm mt-1">{createErrors.subdomain.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetCreate(); }}
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
      {editingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Editar Organización</h3>
              <button
                onClick={() => setEditingOrg(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitEdit(onEdit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  {...registerEdit('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {editErrors.name && (
                  <p className="text-red-600 text-sm mt-1">{editErrors.name.message}</p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...registerEdit('active')}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Activo</span>
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
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
      {deletingOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Confirmar Eliminación</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                ¿Está seguro de eliminar la organización <strong>{deletingOrg.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Esta acción no se puede deshacer. Si la organización tiene dependencias, no podrá ser eliminada.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setDeletingOrg(null)}
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
    </div>
  );
}
