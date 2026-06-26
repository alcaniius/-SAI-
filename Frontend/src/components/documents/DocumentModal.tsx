'use client';

import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { CreateDocumentInput, Document, DocType, DocCategory, EnvironmentalProgram } from '@/lib/services';

const docTypeValues: DocType[] = ['PLAN', 'PROGRAM', 'PROTOCOL', 'INSTRUCTIVE', 'MATRIX', 'FORMAT', 'CHECKLIST', 'REPORT', 'CERTIFICATE', 'DATA_SHEET', 'INDICATOR', 'SCHEDULE', 'OTHER'];
const docCategoryValues: DocCategory[] = ['GUIDE', 'CHECKLIST_TEMPLATE', 'DATA_FORMAT', 'CERTIFICATE', 'REPORT'];

const documentSchema = z.object({
  title: z.string().min(1, { message: 'El título es requerido' }),
  code: z.string().optional(),
  type: z.enum(docTypeValues as [string, ...string[]], { message: 'Selecciona un tipo de documento' }),
  category: z.enum(docCategoryValues as [string, ...string[]]).optional(),
  programId: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
});

type DocumentFormData = z.infer<typeof documentSchema>;

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDocumentInput, file?: File) => Promise<void>;
  document?: Document | null;
  programs: EnvironmentalProgram[];
}

export function DocumentModal({ isOpen, onClose, onSubmit, document, programs }: DocumentModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      code: '',
      type: undefined,
      category: undefined,
      programId: '',
      description: '',
      dueDate: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        title: document?.title ?? '',
        code: document?.code ?? '',
        type: (document?.type as DocType) ?? undefined,
        category: (document?.category as DocCategory) ?? undefined,
        programId: document?.programId ?? '',
        description: document?.description ?? '',
        dueDate: document?.dueDate ? document.dueDate.slice(0, 10) : '',
      });
    }
  }, [isOpen, document, reset]);

  if (!isOpen) return null;

  const handleFormSubmit = handleSubmit(async (data) => {
    const file = fileInputRef.current?.files?.[0];
    await onSubmit(
      {
        title: data.title,
        code: data.code,
        type: data.type as DocType,
        category: data.category as DocCategory,
        programId: data.programId,
        description: data.description,
        dueDate: data.dueDate,
      },
      file,
    );
    reset();
    onClose();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-4 text-xl font-bold text-gray-900">
          {document ? 'Editar Documento' : 'Nuevo Documento'}
        </h2>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Título
            </label>
            <input
              id="title"
              {...register('title')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Código
            </label>
            <input
              id="code"
              {...register('code')}
              placeholder="Ej: SIG-MA-GA-PL01"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="programId" className="block text-sm font-medium text-gray-700">
              Programa Ambiental
            </label>
            <select
              id="programId"
              {...register('programId')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Sin programa</option>
              {programs?.map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.code} - {prog.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Tipo
              </label>
              <select
                id="type"
                {...register('type')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecciona un tipo</option>
                {docTypeValues.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {errors.type && (
                <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Categoría
              </label>
              <select
                id="category"
                {...register('category')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Selecciona una categoría</option>
                {docCategoryValues.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              id="description"
              {...register('description')}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
              Fecha de vencimiento
            </label>
            <input
              id="dueDate"
              type="date"
              {...register('dueDate')}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
              Archivo
            </label>
            <input
              id="file"
              type="file"
              ref={fileInputRef}
              className="mt-1 block w-full text-sm text-gray-600"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando...' : document ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
