'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsService, programsService, CreateDocumentInput, Document, EnvironmentalProgram } from '@/lib/services';
import { DocumentModal } from '@/components/documents/DocumentModal';
import { Plus, FileText, Calendar, CheckCircle, XCircle, Clock, FolderOpen } from 'lucide-react';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  ARCHIVED: 'bg-blue-100 text-blue-800',
};

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <FileText className="w-4 h-4" />,
  IN_REVIEW: <Clock className="w-4 h-4" />,
  APPROVED: <CheckCircle className="w-4 h-4" />,
  REJECTED: <XCircle className="w-4 h-4" />,
  ARCHIVED: <FileText className="w-4 h-4" />,
};

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsService.getAll(),
  });

  const { data: programs, isLoading: progsLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: () => programsService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: ({ data, file }: { data: CreateDocumentInput; file?: File }) =>
      documentsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowCreateModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateDocumentInput> }) =>
      documentsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setEditingDocument(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleSubmit = async (data: CreateDocumentInput, file?: File) => {
    if (editingDocument) {
      await updateMutation.mutateAsync({ id: editingDocument.id, data });
    } else {
      await createMutation.mutateAsync({ data, file });
    }
  };

  if (docsLoading || progsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Agrupar documentos por programa
  const groupedDocuments: Record<string, Document[]> = {};
  const noProgramDocs: Document[] = [];

  documents?.forEach((doc) => {
    if (doc.programId) {
      if (!groupedDocuments[doc.programId]) {
        groupedDocuments[doc.programId] = [];
      }
      groupedDocuments[doc.programId].push(doc);
    } else {
      noProgramDocs.push(doc);
    }
  });

  const DocumentTable = ({ docs }: { docs: Document[] }) => {
    if (docs.length === 0) return <p className="text-gray-500 text-sm py-4 px-6">No hay documentos en este programa.</p>;
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Versión</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{doc.code ? `${doc.code} - ${doc.title}` : doc.title}</div>
                      <div className="text-sm text-gray-500">{doc.description}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{doc.category || doc.type}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${statusColors[doc.status]}`}>
                    {statusIcons[doc.status]}
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">v{doc.version}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button className="text-blue-600 hover:text-blue-900">Ver</button>
                  <button onClick={() => setEditingDocument(doc)} className="text-blue-600 hover:text-blue-900">Editar</button>
                  <button onClick={() => deleteMutation.mutate(doc.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión Documental</h1>
          <p className="text-gray-600 mt-1">Administra y controla los documentos por Programa Ambiental</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Documento
        </button>
      </div>

      <div className="space-y-6">
        {programs?.map((program) => (
          <div key={program.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center">
              <FolderOpen className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-bold text-blue-900">{program.code} — {program.name}</h2>
            </div>
            <DocumentTable docs={groupedDocuments[program.id] || []} />
          </div>
        ))}

        {noProgramDocs.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex items-center">
              <FolderOpen className="w-5 h-5 text-gray-500 mr-2" />
              <h2 className="text-lg font-bold text-gray-700">Otros Documentos (Sin Programa)</h2>
            </div>
            <DocumentTable docs={noProgramDocs} />
          </div>
        )}

        {(!documents || documents.length === 0) && (
          <div className="bg-white rounded-lg shadow text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No hay documentos creados aún</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              Crear tu primer documento →
            </button>
          </div>
        )}
      </div>

      <DocumentModal
        isOpen={showCreateModal || !!editingDocument}
        onClose={() => {
          setShowCreateModal(false);
          setEditingDocument(null);
        }}
        onSubmit={handleSubmit}
        document={editingDocument}
        programs={programs || []}
      />
    </div>
  );
}
