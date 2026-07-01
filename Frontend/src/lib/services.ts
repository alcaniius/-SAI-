import { api } from '@/lib/api';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationId?: string;
}

export type DocCategory = 'GUIDE' | 'CHECKLIST_TEMPLATE' | 'DATA_FORMAT' | 'CERTIFICATE' | 'REPORT';
export type DocType = 'PLAN' | 'PROGRAM' | 'PROTOCOL' | 'INSTRUCTIVE' | 'MATRIX' | 'FORMAT' | 'CHECKLIST' | 'REPORT' | 'CERTIFICATE' | 'DATA_SHEET' | 'INDICATOR' | 'SCHEDULE' | 'OTHER';
export type DocStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';

export interface EnvironmentalProgram {
  id: string;
  code: string;
  name: string;
  description?: string;
  organizationId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    templates: number;
  };
  documents?: Document[];
  templates?: InspectionTemplate[];
}

export interface Document {
  id: string;
  title: string;
  description?: string;
  code?: string;
  type: DocType;
  category: DocCategory;
  status: DocStatus;
  version: number;
  filePath?: string;
  fileFormat?: string;
  fileSize?: number;
  dueDate?: string;
  programId?: string;
  program?: { name: string; code: string };
  linkedTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title: string;
  description?: string;
  code?: string;
  type: DocType;
  category?: DocCategory;
  dueDate?: string;
  programId?: string;
  linkedTemplateId?: string;
  file?: File;
}

export type OperationCondition = 'NORMAL' | 'ABNORMAL' | 'EMERGENCY';
export type AspectCharacter = 'POSITIVE' | 'NEGATIVE';
export type SignificanceLevel = 'HIGH_SIGNIFICANCE' | 'MEDIUM_SIGNIFICANCE' | 'LOW_SIGNIFICANCE' | 'NOT_SIGNIFICANT';

export interface EnvironmentalAspectInput {
  process: string;
  activity: string;
  operationCondition: OperationCondition;
  aspectType: string;
  aspectDescription?: string;
  impactDescription?: string;
  character: AspectCharacter;
  legalExistence: number;
  legalCompliance: number;
  frequency: number;
  dangerousness: number;
  magnitude: number;
  stakeholderDemand: number;
  stakeholderMgmt: number;
  controls?: string;
  active?: boolean;
}

export interface EnvironmentalAspect extends EnvironmentalAspectInput {
  id: string;
  legalScore: number;
  environmentalScore: number;
  stakeholderScore: number;
  significanceTotal: number;
  significanceLevel: SignificanceLevel;
  organizationId?: string;
  createdAt: string;
  updatedAt: string;
}

export const authService = {
  async login(data: LoginInput) {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterInput) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  },
};

export const documentsService = {
  async getAll(): Promise<Document[]> {
    const response = await api.get('/documents');
    return response.data;
  },

  async getById(id: string): Promise<Document> {
    const response = await api.get(`/documents/${id}`);
    return response.data;
  },

  async create(data: CreateDocumentInput): Promise<Document> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('type', data.type);
    if (data.description) formData.append('description', data.description);
    if (data.code) formData.append('code', data.code);
    if (data.category) formData.append('category', data.category);
    if (data.programId) formData.append('programId', data.programId);
    if (data.linkedTemplateId) formData.append('linkedTemplateId', data.linkedTemplateId);
    if (data.dueDate) formData.append('dueDate', data.dueDate);
    if (data.file) formData.append('file', data.file);

    const response = await api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async update(id: string, data: Partial<CreateDocumentInput>): Promise<Document> {
    const response = await api.patch(`/documents/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  async approve(id: string, action: 'APPROVED' | 'REJECTED', comment?: string) {
    const response = await api.post(`/documents/${id}/approve`, { action, comment });
    return response.data;
  },

  async getDownloadUrl(id: string): Promise<{ url: string; expiresInSeconds: number }> {
    const response = await api.get(`/documents/${id}/download-url`);
    return response.data;
  },
};

export interface Alert {
  id: string;
  type: string;
  message: string;
  priority: string;
  read: boolean;
  createdAt: string;
}

export const alertsService = {
  getAll: async (): Promise<Alert[]> => {
    const response = await api.get('/alerts');
    return response.data;
  },
  markAsRead: async (id: string): Promise<void> => {
    await api.patch(`/alerts/${id}/read`);
  },
};

export interface Site {
  id: string;
  name: string;
  code: string;
  address?: string;
  municipality?: string;
  active: boolean;
}

export const sitesService = {
  getAll: async (): Promise<Site[]> => {
    const response = await api.get('/sites');
    return response.data;
  },
  getByOrg: async (orgId: string): Promise<Site[]> => {
    const response = await api.get('/sites', {
      params: { organizationId: orgId },
      headers: { 'X-Tenant-ID': orgId },
    });
    return response.data;
  },
  create: async (data: any): Promise<Site> => {
    const response = await api.post('/sites', data);
    return response.data;
  },
  update: async (id: string, data: any): Promise<Site> => {
    const response = await api.put(`/sites/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<void> => {
    await api.delete(`/sites/${id}`);
  },
};

export interface WasteRecord {
  id: string;
  siteId: string;
  year: number;
  month: number;
  entries: WasteEntry[];
}

export interface WasteEntry {
  id: string;
  day: number;
  ordinary: number;
}

export const wasteService = {
  getRecords: async (): Promise<WasteRecord[]> => {
    const response = await api.get('/waste/records');
    return response.data;
  },
};

export interface CarbonFootprint {
  id: string;
  organization: string;
  period: string;
  co2Emissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
}

export interface CreateCarbonFootprintInput {
  organization: string;
  period: string;
  co2Emissions: number;
  scope1: number;
  scope2: number;
  scope3: number;
}

export const carbonFootprintService = {
  getAll: async (): Promise<CarbonFootprint[]> => {
    const response = await api.get('/carbon-footprint');
    return response.data;
  },
  create: async (data: CreateCarbonFootprintInput): Promise<CarbonFootprint> => {
    const response = await api.post('/carbon-footprint', data);
    return response.data;
  },
};

export interface InspectionTemplate {
  id: string;
  code: string;
  name: string;
  description?: string;
  frequency: string;
}

export interface InspectionItem {
  id: string;
  templateId: string;
  description: string;
  order: number;
}

export interface InspectionRecord {
  id: string;
  templateId: string;
  siteId: string;
  date: string;
  score?: number;
}

export const inspectionsService = {
  getTemplates: async (): Promise<InspectionTemplate[]> => {
    const response = await api.get('/inspections/templates');
    return response.data;
  },
  getRecords: async (): Promise<InspectionRecord[]> => {
    const response = await api.get('/inspections/records');
    return response.data;
  },
};

export const environmentalService = {
  getAspects: async (): Promise<EnvironmentalAspect[]> => {
    const response = await api.get('/environmental/aspects');
    return response.data;
  },
  getAspectById: async (id: string): Promise<EnvironmentalAspect> => {
    const response = await api.get(`/environmental/aspects/${id}`);
    return response.data;
  },
  createAspect: async (data: EnvironmentalAspectInput): Promise<EnvironmentalAspect> => {
    const response = await api.post('/environmental/aspects', data);
    return response.data;
  },
  updateAspect: async (id: string, data: Partial<EnvironmentalAspectInput>): Promise<EnvironmentalAspect> => {
    const response = await api.patch(`/environmental/aspects/${id}`, data);
    return response.data;
  },
  deleteAspect: async (id: string): Promise<void> => {
    await api.delete(`/environmental/aspects/${id}`);
  },
  recalculateSignificance: async (id: string) => {
    const response = await api.post(`/environmental/aspects/${id}/significance`);
    return response.data;
  },
  getPMAs: async () => {
    const response = await api.get('/environmental/pma');
    return response.data;
  },
  createPMA: async (data: any) => {
    const response = await api.post('/environmental/pma', data);
    return response.data;
  },
  getANLAReports: async () => {
    const response = await api.get('/environmental/anla');
    return response.data;
  },
  createANLAReport: async (data: any) => {
    const response = await api.post('/environmental/anla', data);
    return response.data;
  },
};

export const programsService = {
  async getAll(): Promise<EnvironmentalProgram[]> {
    const response = await api.get('/programs');
    return response.data;
  },

  async getById(id: string): Promise<EnvironmentalProgram> {
    const response = await api.get(`/programs/${id}`);
    return response.data;
  },

  async create(data: Partial<EnvironmentalProgram>): Promise<EnvironmentalProgram> {
    const response = await api.post('/programs', data);
    return response.data;
  },
  
  async update(id: string, data: Partial<EnvironmentalProgram>): Promise<EnvironmentalProgram> {
    const response = await api.patch(`/programs/${id}`, data);
    return response.data;
  },
  
  async delete(id: string): Promise<void> {
    await api.delete(`/programs/${id}`);
  },
};
