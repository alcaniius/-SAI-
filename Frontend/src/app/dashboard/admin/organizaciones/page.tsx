'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import {
  Plus, Loader2, Check, X, Pencil, Trash2, ChevronDown, ChevronRight,
  Building2, MapPin,
} from 'lucide-react';

// ── Zod schemas ──────────────────────────────────────────
const organizationSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  subdomain: z.string().min(1, 'Requerido'),
});

const editOrganizationSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  active: z.boolean(),
});

const siteSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  code: z.string().min(1, 'Requerido'),
  address: z.string().min(1, 'Requerido'),
  municipality: z.string().min(1, 'Requerido'),
});

type OrgFormData = z.infer<typeof organizationSchema>;
type EditOrgFormData = z.infer<typeof editOrganizationSchema>;
type SiteFormData = z.infer<typeof siteSchema>;

// ── Types ────────────────────────────────────────────────
interface Organization {
  id: string;
  name: string;
  subdomain: string;
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

// ── Component ────────────────────────────────────────────
export default function AdminOrganizacionesPage() {
  const router = useRouter();
  const { user, isInitialized, isAuthenticated } = useAuthStore();

  // Role guard
  useEffect(() => {
    if (isInitialized && isAuthenticated && user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isInitialized, isAuthenticated, user, router]);

  // ── Org state ──────────────────────────────────────────
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [orgMessage, setOrgMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateOrgModal, setShowCreateOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);
  const [deleteOrgLoading, setDeleteOrgLoading] = useState(false);

  // ── Site state ─────────────────────────────────────────
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [sitesMap, setSitesMap] = useState<Record<string, Site[]>>({});
  const [sitesLoading, setSitesLoading] = useState<Record<string, boolean>>({});
  const [siteMessage, setSiteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateSiteModal, setShowCreateSiteModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deletingSite, setDeletingSite] = useState<Site | null>(null);
  const [deleteSiteLoading, setDeleteSiteLoading] = useState(false);
  const [siteFormLoading, setSiteFormLoading] = useState(false);

  // ── Org form ───────────────────────────────────────────
  const orgCreateForm = useForm<OrgFormData>({ resolver: zodResolver(organizationSchema) });
  const orgEditForm = useForm<EditOrgFormData>({ resolver: zodResolver(editOrganizationSchema) });

  // ── Site form ──────────────────────────────────────────
  const siteForm = useForm<SiteFormData>({ resolver: zodResolver(siteSchema) });

  // ── Load orgs ──────────────────────────────────────────
  const loadOrganizations = useCallback(async () => {
    try {
      setLoadingOrgs(true);
      const res = await api.get('/users/organizations');
      setOrganizations(res.data);
    } catch {
      // ignore
    } finally {
      setLoadingOrgs(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadOrganizations();
    }
  }, [user, loadOrganizations]);

  // ── Load sites for a specific org ──────────────────────
  const loadSites = useCallback(async (orgId: string) => {
    setSitesLoading((prev) => ({ ...prev, [orgId]: true }));
    try {
      const res = await api.get('/sites', {
        params: { organizationId: orgId },
        headers: { 'X-Tenant-ID': orgId },
      });
      setSitesMap((prev) => ({ ...prev, [orgId]: res.data }));
    } catch {
      setSitesMap((prev) => ({ ...prev, [orgId]: [] }));
    } finally {
      setSitesLoading((prev) => ({ ...prev, [orgId]: false }));
    }
  }, []);

  // ── Toggle expand ──────────────────────────────────────
  const toggleExpand = (orgId: string) => {
    if (expandedOrgId === orgId) {
      setExpandedOrgId(null);
    } else {
      setExpandedOrgId(orgId);
      if (!sitesMap[orgId]) {
        loadSites(orgId);
      }
    }
  };

  // ════════════════════════════════════════════════════════
  //  ORG CRUD
  // ════════════════════════════════════════════════════════

  const onCreateOrg = async (data: OrgFormData) => {
    setLoadingOrgs(true);
    setOrgMessage(null);
    try {
      await api.post('/users/organizations', data);
      setOrgMessage({ type: 'success', text: 'Organización creada exitosamente' });
      setShowCreateOrgModal(false);
      orgCreateForm.reset();
      await loadOrganizations();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al crear organización';
      setOrgMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al crear organización' });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const openEditOrg = (org: Organization) => {
    setEditingOrg(org);
    orgEditForm.setValue('name', org.name);
    orgEditForm.setValue('active', org.active);
  };

  const onEditOrg = async (data: EditOrgFormData) => {
    if (!editingOrg) return;
    setLoadingOrgs(true);
    setOrgMessage(null);
    try {
      await api.put(`/users/organizations/${editingOrg.id}`, data);
      setOrgMessage({ type: 'success', text: 'Organización actualizada exitosamente' });
      setEditingOrg(null);
      await loadOrganizations();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al actualizar organización';
      setOrgMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al actualizar organización' });
    } finally {
      setLoadingOrgs(false);
    }
  };

  const onDeleteOrg = async () => {
    if (!deletingOrg) return;
    setDeleteOrgLoading(true);
    setOrgMessage(null);
    try {
      await api.delete(`/users/organizations/${deletingOrg.id}`);
      setOrgMessage({ type: 'success', text: 'Organización eliminada exitosamente' });
      setDeletingOrg(null);
      // Clean up cached sites
      const newSitesMap = { ...sitesMap };
      delete newSitesMap[deletingOrg.id];
      setSitesMap(newSitesMap);
      if (expandedOrgId === deletingOrg.id) setExpandedOrgId(null);
      await loadOrganizations();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al eliminar organización';
      setOrgMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al eliminar organización' });
    } finally {
      setDeleteOrgLoading(false);
    }
  };

  // ════════════════════════════════════════════════════════
  //  SITE CRUD
  // ════════════════════════════════════════════════════════

  const onCreateSite = async (data: SiteFormData) => {
    if (!expandedOrgId) return;
    setSiteFormLoading(true);
    setSiteMessage(null);
    try {
      await api.post('/sites', data, {
        headers: { 'X-Tenant-ID': expandedOrgId },
      });
      setSiteMessage({ type: 'success', text: 'Sede creada exitosamente' });
      setShowCreateSiteModal(false);
      siteForm.reset();
      await loadSites(expandedOrgId);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al crear sede';
      setSiteMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al crear sede' });
    } finally {
      setSiteFormLoading(false);
    }
  };

  const openEditSite = (site: Site) => {
    setEditingSite(site);
    siteForm.setValue('name', site.name);
    siteForm.setValue('code', site.code);
    siteForm.setValue('address', site.address);
    siteForm.setValue('municipality', site.municipality);
  };

  const onEditSite = async (data: SiteFormData) => {
    if (!editingSite || !expandedOrgId) return;
    setSiteFormLoading(true);
    setSiteMessage(null);
    try {
      await api.put(`/sites/${editingSite.id}`, data, {
        headers: { 'X-Tenant-ID': expandedOrgId },
      });
      setSiteMessage({ type: 'success', text: 'Sede actualizada exitosamente' });
      setEditingSite(null);
      await loadSites(expandedOrgId);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al actualizar sede';
      setSiteMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al actualizar sede' });
    } finally {
      setSiteFormLoading(false);
    }
  };

  const onDeleteSite = async () => {
    if (!deletingSite || !expandedOrgId) return;
    setDeleteSiteLoading(true);
    setSiteMessage(null);
    try {
      await api.delete(`/sites/${deletingSite.id}`, {
        headers: { 'X-Tenant-ID': expandedOrgId },
      });
      setSiteMessage({ type: 'success', text: 'Sede eliminada exitosamente' });
      setDeletingSite(null);
      await loadSites(expandedOrgId);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Error al eliminar sede';
      setSiteMessage({ type: 'error', text: typeof errorMsg === 'string' ? errorMsg : 'Error al eliminar sede' });
    } finally {
      setDeleteSiteLoading(false);
    }
  };

  // ── Loading / Auth guards ──────────────────────────────
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

  // ── Render helpers ─────────────────────────────────────
  const messageBanner = (
    msg: { type: 'success' | 'error'; text: string } | null,
    onClose?: () => void,
  ) => {
    if (!msg) return null;
    return (
      <div
        className={`p-4 rounded-lg flex items-center gap-2 ${
          msg.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}
      >
        {msg.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <X className="w-5 h-5 flex-shrink-0" />}
        <span className="flex-1">{msg.text}</span>
        {onClose && (
          <button onClick={onClose} className="text-current opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Organizaciones y Sedes</h1>
          <p className="text-gray-600 mt-2">
            Gestionar organizaciones y sus sedes
          </p>
        </div>
        <button
          onClick={() => setShowCreateOrgModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nueva Organización
        </button>
      </div>

      {/* Org messages */}
      {messageBanner(orgMessage, () => setOrgMessage(null))}

      {/* Orgs list */}
      {loadingOrgs && organizations.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => {
            const isExpanded = expandedOrgId === org.id;
            const sites = sitesMap[org.id];
            const isLoadingSites = sitesLoading[org.id];

            return (
              <div key={org.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Org header row */}
                <div
                  className="flex items-center px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleExpand(org.id)}
                >
                  <button className="mr-3 text-gray-400 hover:text-gray-600">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>
                  <Building2 className="w-5 h-5 mr-3 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900">{org.name}</span>
                    <span className="ml-3 text-xs text-gray-500">{org.subdomain}</span>
                    {org.active ? (
                      <span className="ml-3 inline-flex items-center gap-1 text-xs text-green-700">
                        <Check className="w-3 h-3" /> Activo
                      </span>
                    ) : (
                      <span className="ml-3 inline-flex items-center gap-1 text-xs text-red-700">
                        <X className="w-3 h-3" /> Inactivo
                      </span>
                    )}
                    {sites && (
                      <span className="ml-3 text-xs text-gray-400">
                        {sites.length} sede{sites.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditOrg(org)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar organización"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingOrg(org)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar organización"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded sites section */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    <div className="px-6 py-4">
                      {/* Site messages */}
                      {siteMessage && (
                        <div className="mb-4">
                          {messageBanner(siteMessage, () => setSiteMessage(null))}
                        </div>
                      )}

                      {/* Sites table */}
                      {isLoadingSites ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                      ) : sites && sites.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Municipio</th>
                                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {sites.map((site) => (
                                <tr key={site.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{site.name}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{site.code}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{site.address}</td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{site.municipality}</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => openEditSite(site)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Editar sede"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => setDeletingSite(site)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Eliminar sede"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No hay sedes para esta organización</p>
                        </div>
                      )}

                      {/* Add site button */}
                      <button
                        onClick={() => {
                          siteForm.reset();
                          setShowCreateSiteModal(true);
                        }}
                        className="mt-4 px-4 py-2 text-sm border border-dashed border-gray-300 text-gray-500 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar Sede
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {organizations.length === 0 && !loadingOrgs && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No hay organizaciones para mostrar</p>
              <button
                onClick={() => setShowCreateOrgModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Crear primera organización
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/*  CREATE ORG MODAL                                  */}
      {/* ══════════════════════════════════════════════════ */}
      {showCreateOrgModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Nueva Organización</h3>
              <button
                onClick={() => { setShowCreateOrgModal(false); orgCreateForm.reset(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={orgCreateForm.handleSubmit(onCreateOrg)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  {...orgCreateForm.register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre de la organización"
                />
                {orgCreateForm.formState.errors.name && (
                  <p className="text-red-600 text-sm mt-1">{orgCreateForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subdominio</label>
                <input
                  type="text"
                  {...orgCreateForm.register('subdomain')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="subdominio"
                />
                {orgCreateForm.formState.errors.subdomain && (
                  <p className="text-red-600 text-sm mt-1">{orgCreateForm.formState.errors.subdomain.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateOrgModal(false); orgCreateForm.reset(); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loadingOrgs}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {loadingOrgs && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingOrgs ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/*  EDIT ORG MODAL                                    */}
      {/* ══════════════════════════════════════════════════ */}
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
            <form onSubmit={orgEditForm.handleSubmit(onEditOrg)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  {...orgEditForm.register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {orgEditForm.formState.errors.name && (
                  <p className="text-red-600 text-sm mt-1">{orgEditForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...orgEditForm.register('active')}
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
                  disabled={loadingOrgs}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {loadingOrgs && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingOrgs ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/*  DELETE ORG MODAL                                  */}
      {/* ══════════════════════════════════════════════════ */}
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
                onClick={onDeleteOrg}
                disabled={deleteOrgLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {deleteOrgLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleteOrgLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/*  CREATE SITE MODAL                                 */}
      {/* ══════════════════════════════════════════════════ */}
      {showCreateSiteModal && expandedOrgId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Nueva Sede
              </h3>
              <button
                onClick={() => { setShowCreateSiteModal(false); siteForm.reset(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={siteForm.handleSubmit(onCreateSite)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  {...siteForm.register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre de la sede"
                />
                {siteForm.formState.errors.name && (
                  <p className="text-red-600 text-sm mt-1">{siteForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  {...siteForm.register('code')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Código de la sede"
                />
                {siteForm.formState.errors.code && (
                  <p className="text-red-600 text-sm mt-1">{siteForm.formState.errors.code.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  {...siteForm.register('address')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dirección"
                />
                {siteForm.formState.errors.address && (
                  <p className="text-red-600 text-sm mt-1">{siteForm.formState.errors.address.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                <input
                  type="text"
                  {...siteForm.register('municipality')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Municipio"
                />
                {siteForm.formState.errors.municipality && (
                  <p className="text-red-600 text-sm mt-1">{siteForm.formState.errors.municipality.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateSiteModal(false); siteForm.reset(); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={siteFormLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {siteFormLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {siteFormLoading ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/*  EDIT SITE MODAL                                   */}
      {/* ══════════════════════════════════════════════════ */}
      {editingSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Editar Sede</h3>
              <button
                onClick={() => { setEditingSite(null); siteForm.reset(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={siteForm.handleSubmit(onEditSite)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  type="text"
                  {...siteForm.register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {siteForm.formState.errors.name && (
                  <p className="text-red-600 text-sm mt-1">{siteForm.formState.errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <input
                  type="text"
                  {...siteForm.register('code')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {siteForm.formState.errors.code && (
                  <p className="text-red-600 text-sm mt-1">{siteForm.formState.errors.code.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  {...siteForm.register('address')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {siteForm.formState.errors.address && (
                  <p className="text-red-600 text-sm mt-1">{siteForm.formState.errors.address.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Municipio</label>
                <input
                  type="text"
                  {...siteForm.register('municipality')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {siteForm.formState.errors.municipality && (
                  <p className="text-red-600 text-sm mt-1">{siteForm.formState.errors.municipality.message}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setEditingSite(null); siteForm.reset(); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={siteFormLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {siteFormLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {siteFormLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/*  DELETE SITE MODAL                                 */}
      {/* ══════════════════════════════════════════════════ */}
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
                onClick={onDeleteSite}
                disabled={deleteSiteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {deleteSiteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleteSiteLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
