import { create } from 'zustand';
import type { FormField, FormItem, UserItem, Company, Plant, Department, Team, Role, PermissionRow, ResponseItem, TemplatePack, LogicRule, FormSchedule } from './types';

interface AppState {
  // Auth
  isAuthed: boolean;
  currentUserId: number | null;
  currentUserRole: string;
  activeCompanyId: number | null;
  authMode: 'login' | 'signup';
  authEmail: string;
  authPassword: string;
  authError: string;

  // UI
  nav: string;
  accent: string;
  dark: boolean;
  sidebarOpen: boolean;
  winWidth: number;

  // Builder
  builderTab: 'build' | 'logic' | 'preview';
  fieldPropTab: 'props' | 'validation' | 'logic';
  currentFormName: string;
  currentFormDesc: string;
  fields: FormField[];
  selectedId: string | null;
  fieldCounter: number;
  dragSrcIdx: number | null;

  // Templates
  activePackId: string | null;
  previewPackId: string | null;
  packSearch: string;
  packDomainFilter: string;
  customPacks: TemplatePack[];
  showSaveTemplateModal: boolean;
  saveTemplateName: string;

  // Modals
  showModal: string | null;
  modalData: Record<string, string>;
  editingUserId: number | null;
  menuOpenId: number | null;

  // Permissions
  selectedPermRole: string;
  permissionsByRole: Record<string, PermissionRow[]>;
  permsDirty: boolean;

  // Data
  companies: Company[];
  plants: Plant[];
  departments: Department[];
  teams: Team[];
  roles: Role[];
  users: UserItem[];
  forms: FormItem[];
  responses: ResponseItem[];

  // Actions
  setAuth: (isAuthed: boolean) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  setAuthField: (key: 'authEmail' | 'authPassword', val: string) => void;
  setAuthError: (err: string) => void;
  logout: () => void;
  setActiveCompany: (id: number | null) => void;

  setNav: (nav: string) => void;
  setAccent: (c: string) => void;
  toggleDark: () => void;
  toggleSidebar: () => void;
  setWinWidth: (w: number) => void;

  setBuilderTab: (t: 'build' | 'logic' | 'preview') => void;
  setFieldPropTab: (t: 'props' | 'validation' | 'logic') => void;
  setFormName: (name: string) => void;
  setFormDesc: (desc: string) => void;

  addField: (type: string) => void;
  selectField: (id: string | null) => void;
  updateField: (id: string, key: string, value: unknown) => void;
  updateValidation: (id: string, key: string, value: string) => void;
  deleteField: (id: string) => void;
  duplicateField: (id: string) => void;
  reorderFields: (from: number, to: number) => void;
  setDragSrcIdx: (idx: number | null) => void;
  addLogicRule: (fieldId: string) => void;
  updateLogicRule: (fieldId: string, ruleId: string, updates: Partial<LogicRule>) => void;
  deleteLogicRule: (fieldId: string, ruleId: string) => void;

  activatePack: (pack: TemplatePack) => void;
  setPreviewPackId: (id: string | null) => void;
  setPackSearch: (s: string) => void;
  setPackDomainFilter: (d: string) => void;
  setShowSaveTemplateModal: (show: boolean) => void;
  setSaveTemplateName: (name: string) => void;
  saveAsTemplate: (pack: TemplatePack) => void;
  deleteCustomPack: (id: string) => void;

  setPermRole: (key: string) => void;
  togglePermission: (roleKey: string, moduleId: number, action: 'view' | 'create' | 'edit' | 'delete') => void;
  savePermissions: () => void;

  // Modals
  openModal: (modal: string, data?: Record<string, string>) => void;
  closeModal: () => void;
  setModalField: (key: string, val: string) => void;
  setEditingUserId: (id: number | null) => void;
  setMenuOpenId: (id: number | null) => void;

  // CRUD
  addCompany: (name: string, code: string, type: string) => void;
  addPlant: (name: string, code: string, company: string, location: string, capacity: string) => void;
  addDepartment: (name: string, plant: string) => void;
  addTeam: (name: string, department: string) => void;
  addRole: (name: string, description: string) => void;
  addUser: (name: string, email: string, role: string, department: string) => void;
  updateUser: (id: number, data: Partial<UserItem>) => void;
  deleteUser: (id: number) => void;
  deleteForm: (id: number) => void;
  openNewForm: () => void;
  editForm: (id: number) => void;
  saveDraft: () => void;
  publishForm: (assignedUserIds?: number[], schedule?: FormSchedule) => void;
  showAssignModal: boolean;
  assignModalUserIds: number[];
  setShowAssignModal: (show: boolean) => void;
  toggleAssignUser: (userId: number) => void;
  setAssignModalUserIds: (ids: number[]) => void;
  fillingFormId: number | null;
  fillForm: (id: number) => void;
  submitResponse: (formId: number, values: Record<string, string>) => void;
  viewingFormId: number | null;
  viewFormResponses: (id: number) => void;
}

const FIELD_LABELS: Record<string, string> = {
  textbox: 'Text Field', textarea: 'Text Area', richtext: 'Rich Text', number: 'Number', currency: 'Currency', percent: 'Percentage',
  date: 'Date', time: 'Time', datetime: 'Date & Time', dropdown: 'Dropdown', multiselect: 'Multi Select', checkbox: 'Checkbox',
  radio: 'Radio', toggle: 'Toggle', lookup: 'Lookup', formula: 'Formula', image: 'Image', camera: 'Camera', video: 'Video',
  audio: 'Audio', upload: 'File Upload', signature: 'Signature', gps: 'GPS Location', qr: 'QR Code', barcode: 'Barcode',
  email: 'Email', phone: 'Phone', url: 'URL', rating: 'Rating', color: 'Color Picker', hidden: 'Hidden Field', system: 'System Field', ai: 'AI Field',
};

const CHOICE_TYPES = ['dropdown', 'multiselect', 'radio', 'checkbox'];

export const useStore = create<AppState>((set) => ({
  isAuthed: false,
  currentUserId: null,
  currentUserRole: '',
  activeCompanyId: 1,
  authMode: 'login',
  authEmail: '',
  authPassword: '',
  authError: '',
  showAssignModal: false,
  assignModalUserIds: [],
  nav: 'dashboard',
  accent: '#2563EB',
  dark: false,
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 720 : true,
  winWidth: typeof window !== 'undefined' ? window.innerWidth : 1440,
  builderTab: 'build',
  fieldPropTab: 'props',
  currentFormName: 'New Form',
  currentFormDesc: 'Add a description…',
  fields: [],
  selectedId: null,
  fieldCounter: 0,
  dragSrcIdx: null,
  activePackId: null,
  previewPackId: null,
  packSearch: '',
  packDomainFilter: 'All',
  customPacks: [],
  showSaveTemplateModal: false,
  saveTemplateName: '',
  showModal: null,
  modalData: {},
  editingUserId: null,
  menuOpenId: null,
  permsDirty: false,
  selectedPermRole: 'admin',
  permissionsByRole: {
    admin: [
      { id: 1, module: 'Forms', view: true, create: true, edit: true, delete: true },
      { id: 2, module: 'Templates', view: true, create: true, edit: true, delete: true },
      { id: 3, module: 'Responses', view: true, create: true, edit: true, delete: true },
      { id: 4, module: 'Users', view: true, create: true, edit: true, delete: true },
      { id: 5, module: 'Companies & Plants', view: true, create: true, edit: true, delete: true },
      { id: 6, module: 'Reports', view: true, create: true, edit: true, delete: true },
      { id: 7, module: 'Settings', view: true, create: true, edit: true, delete: false },
    ],
    editor: [
      { id: 1, module: 'Forms', view: true, create: true, edit: true, delete: false },
      { id: 2, module: 'Templates', view: true, create: true, edit: false, delete: false },
      { id: 3, module: 'Responses', view: true, create: false, edit: false, delete: false },
      { id: 4, module: 'Users', view: false, create: false, edit: false, delete: false },
      { id: 5, module: 'Companies & Plants', view: true, create: false, edit: false, delete: false },
      { id: 6, module: 'Reports', view: true, create: false, edit: false, delete: false },
      { id: 7, module: 'Settings', view: false, create: false, edit: false, delete: false },
    ],
    auditor: [
      { id: 1, module: 'Forms', view: true, create: false, edit: false, delete: false },
      { id: 2, module: 'Templates', view: true, create: false, edit: false, delete: false },
      { id: 3, module: 'Responses', view: true, create: true, edit: false, delete: false },
      { id: 4, module: 'Users', view: false, create: false, edit: false, delete: false },
      { id: 5, module: 'Companies & Plants', view: true, create: false, edit: false, delete: false },
      { id: 6, module: 'Reports', view: true, create: false, edit: false, delete: false },
      { id: 7, module: 'Settings', view: false, create: false, edit: false, delete: false },
    ],
    viewer: [
      { id: 1, module: 'Forms', view: true, create: false, edit: false, delete: false },
      { id: 2, module: 'Templates', view: true, create: false, edit: false, delete: false },
      { id: 3, module: 'Responses', view: true, create: false, edit: false, delete: false },
      { id: 4, module: 'Users', view: false, create: false, edit: false, delete: false },
      { id: 5, module: 'Companies & Plants', view: true, create: false, edit: false, delete: false },
      { id: 6, module: 'Reports', view: true, create: false, edit: false, delete: false },
      { id: 7, module: 'Settings', view: false, create: false, edit: false, delete: false },
    ],
  },
  companies: [
    { id: 1, name: 'Acme Precision Industries', code: 'ACM-001', type: 'Parent Company', plants: 4, employees: 1240, status: 'active' },
    { id: 2, name: 'Acme Textiles Pvt Ltd', code: 'ACM-002', type: 'Subsidiary', plants: 2, employees: 680, status: 'active' },
    { id: 3, name: 'Acme Auto Components', code: 'ACM-003', type: 'Subsidiary', plants: 1, employees: 310, status: 'active' },
    { id: 4, name: 'Acme Green Energy', code: 'ACM-004', type: 'Joint Venture', plants: 1, employees: 95, status: 'inactive' },
  ],
  plants: [
    { id: 1, name: 'Chennai Manufacturing Plant', code: 'PLT-CH01', company: 'Acme Precision Industries', location: 'Chennai, Tamil Nadu', capacity: '450 workers', status: 'active' },
    { id: 2, name: 'Coimbatore Textile Unit', code: 'PLT-CB01', company: 'Acme Textiles Pvt Ltd', location: 'Coimbatore, Tamil Nadu', capacity: '320 workers', status: 'active' },
    { id: 3, name: 'Pune Auto Parts Facility', code: 'PLT-PN01', company: 'Acme Auto Components', location: 'Pune, Maharashtra', capacity: '310 workers', status: 'active' },
    { id: 4, name: 'Bengaluru Electronics Unit', code: 'PLT-BL01', company: 'Acme Precision Industries', location: 'Bengaluru, Karnataka', capacity: '260 workers', status: 'review' },
    { id: 5, name: 'Nagpur Ancillary Plant', code: 'PLT-NG01', company: 'Acme Precision Industries', location: 'Nagpur, Maharashtra', capacity: '180 workers', status: 'draft' },
  ],
  departments: [
    { id: 1, name: 'Production', plant: 'Chennai Manufacturing Plant', head: 'Ravi Kumar', headcount: 180, status: 'active' },
    { id: 2, name: 'Quality Assurance', plant: 'Chennai Manufacturing Plant', head: 'Priya Iyer', headcount: 42, status: 'active' },
    { id: 3, name: 'Maintenance', plant: 'Coimbatore Textile Unit', head: 'Suresh Babu', headcount: 36, status: 'active' },
    { id: 4, name: 'Environment, Health & Safety', plant: 'Pune Auto Parts Facility', head: 'Anita Desai', headcount: 14, status: 'active' },
    { id: 5, name: 'Human Resources', plant: 'Bengaluru Electronics Unit', head: 'Kavya Reddy', headcount: 9, status: 'active' },
  ],
  teams: [
    { id: 1, name: 'Line 1 — Assembly', department: 'Production', lead: 'Ravi Kumar', members: 24, status: 'active' },
    { id: 2, name: 'Incoming Inspection', department: 'Quality Assurance', lead: 'Priya Iyer', members: 8, status: 'active' },
    { id: 3, name: 'Preventive Maintenance Crew', department: 'Maintenance', lead: 'Suresh Babu', members: 12, status: 'active' },
    { id: 4, name: 'Safety Committee', department: 'Environment, Health & Safety', lead: 'Anita Desai', members: 6, status: 'active' },
  ],
  roles: [
    { id: 1, name: 'Administrator', permKey: 'admin', description: 'Full platform access, user & role management', users: 3, permissions: 'All Permissions', status: 'active' },
    { id: 2, name: 'Form Editor', permKey: 'editor', description: 'Create and edit forms, view responses', users: 12, permissions: 'Forms · Templates · Responses', status: 'active' },
    { id: 3, name: 'Compliance Auditor', permKey: 'auditor', description: 'Fill and submit compliance checklists', users: 28, permissions: 'Forms (Fill Only) · Responses (Own)', status: 'active' },
    { id: 4, name: 'Viewer', permKey: 'viewer', description: 'Read-only access to dashboards and reports', users: 47, permissions: 'View Only', status: 'active' },
  ],
  users: [
    { id: 1, name: 'Sarah Chen', email: 'sarah@acme.com', role: 'Admin', department: 'Engineering', status: 'active', initials: 'SC', color: '#2563EB', companyId: 1 },
    { id: 2, name: 'Michael Torres', email: 'm.torres@acme.com', role: 'Editor', department: 'Operations', status: 'active', initials: 'MT', color: '#059669', companyId: 1 },
    { id: 3, name: 'Emily Nakamura', email: 'emily.n@acme.com', role: 'Viewer', department: 'Quality', status: 'inactive', initials: 'EN', color: '#7C3AED', companyId: 2 },
    { id: 4, name: 'James Wilson', email: 'j.wilson@acme.com', role: 'Editor', department: 'Safety', status: 'active', initials: 'JW', color: '#0D9488', companyId: 1 },
  ],
  forms: [
    { id: 1, name: 'Employee Onboarding', fields: 12, responses: 47, status: 'published', updated: 'Jun 28', category: 'HR', companyId: 1 },
    { id: 2, name: 'Plant Safety Checklist', fields: 8, responses: 0, status: 'draft', updated: 'Jun 30', category: 'Safety', companyId: 1 },
    { id: 3, name: 'Equipment Inspection Report', fields: 15, responses: 23, status: 'published', updated: 'Jun 25', category: 'Maintenance', companyId: 2 },
    { id: 4, name: 'Supplier Quality Audit', fields: 20, responses: 5, status: 'review', updated: 'Jun 29', category: 'Quality', companyId: 1 },
  ],
  responses: [
    { id: 1, formId: 0, form: 'Tamil Nadu Factory Act Compliance Checklist', packId: 'tn-factory-act', submittedBy: 'Ravi Kumar', plant: 'Chennai Manufacturing Plant', date: 'Jun 30, 2026', status: 'published' },
    { id: 2, formId: 0, form: 'Preventive Maintenance Work Order', packId: 'preventive-maint', submittedBy: 'Suresh Babu', plant: 'Coimbatore Textile Unit', date: 'Jun 29, 2026', status: 'published' },
    { id: 3, formId: 0, form: 'Workplace Incident & Accident Report', packId: 'incident-report', submittedBy: 'Anita Desai', plant: 'Pune Auto Parts Facility', date: 'Jun 29, 2026', status: 'review' },
    { id: 4, formId: 0, form: 'Employee Onboarding Form', packId: 'employee-onboarding', submittedBy: 'Kavya Reddy', plant: 'Bengaluru Electronics Unit', date: 'Jun 27, 2026', status: 'published' },
    { id: 5, formId: 0, form: 'Visitor Entry & Exit Register', packId: 'visitor-log', submittedBy: 'Security Desk', plant: 'Chennai Manufacturing Plant', date: 'Jun 26, 2026', status: 'draft' },
  ],

  setAuth: (isAuthed) => set((s) => {
    if (isAuthed) {
      const user = s.users.find(u => u.email === s.authEmail);
      return { isAuthed, currentUserId: user?.id || 1, currentUserRole: user?.role || 'Admin' };
    }
    return { isAuthed, currentUserId: null, currentUserRole: '' };
  }),
  setAuthMode: (authMode) => set({ authMode, authError: '' }),
  setAuthField: (key, val) => set({ [key]: val, authError: '' }),
  setAuthError: (authError) => set({ authError }),
  logout: () => set({ isAuthed: false, currentUserId: null, currentUserRole: '', activeCompanyId: null, authEmail: '', authPassword: '', authMode: 'login' }),
  setActiveCompany: (activeCompanyId) => set({ activeCompanyId }),

  setNav: (nav) => set({ nav }),
  setAccent: (accent) => set({ accent }),
  toggleDark: () => set((s) => ({ dark: !s.dark })),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setWinWidth: (winWidth) => set({ winWidth }),

  setBuilderTab: (builderTab) => set({ builderTab }),
  setFieldPropTab: (fieldPropTab) => set({ fieldPropTab }),
  setFormName: (currentFormName) => set({ currentFormName }),
  setFormDesc: (currentFormDesc) => set({ currentFormDesc }),

  addField: (type) => set((s) => {
    const id = 'f' + (s.fieldCounter + 1);
    const hasOpts = CHOICE_TYPES.includes(type);
    const newField: FormField = {
      id, type, label: FIELD_LABELS[type] || type,
      placeholder: '', helpText: '', defaultValue: '',
      required: false, readOnly: false, hidden: false, searchable: false, indexed: false,
      options: hasOpts ? ['Option 1', 'Option 2', 'Option 3'] : [],
      validation: { min: '', max: '', pattern: '', message: '' },
      logic: [],
    };
    return { fields: [...s.fields, newField], selectedId: id, fieldCounter: s.fieldCounter + 1 };
  }),

  selectField: (id) => set({ selectedId: id }),

  updateField: (id, key, value) => set((s) => ({
    fields: s.fields.map(f => f.id === id ? { ...f, [key]: value } : f),
  })),

  updateValidation: (id, key, value) => set((s) => ({
    fields: s.fields.map(f => f.id === id ? { ...f, validation: { ...f.validation, [key]: value } } : f),
  })),

  deleteField: (id) => set((s) => ({
    fields: s.fields.filter(f => f.id !== id),
    selectedId: s.selectedId === id ? null : s.selectedId,
  })),

  duplicateField: (id) => set((s) => {
    const idx = s.fields.findIndex(f => f.id === id);
    if (idx === -1) return {};
    const orig = s.fields[idx];
    const nf: FormField = { ...orig, id: 'f' + (s.fieldCounter + 1), label: orig.label + ' (Copy)', options: [...orig.options] };
    const nfields = [...s.fields];
    nfields.splice(idx + 1, 0, nf);
    return { fields: nfields, fieldCounter: s.fieldCounter + 1, selectedId: nf.id };
  }),

  reorderFields: (from, to) => set((s) => {
    if (from === to) return {};
    const nf = [...s.fields];
    const [item] = nf.splice(from, 1);
    nf.splice(to, 0, item);
    return { fields: nf, dragSrcIdx: null };
  }),

  setDragSrcIdx: (dragSrcIdx) => set({ dragSrcIdx }),

  addLogicRule: (fieldId) => set((s) => ({
    fields: s.fields.map(f => f.id === fieldId ? {
      ...f,
      logic: [...f.logic, { id: 'lr' + Date.now(), action: 'show' as const, sourceFieldId: '', operator: 'equals' as const, value: '' }],
    } : f),
  })),

  updateLogicRule: (fieldId, ruleId, updates) => set((s) => ({
    fields: s.fields.map(f => f.id === fieldId ? {
      ...f,
      logic: f.logic.map((r: LogicRule) => r.id === ruleId ? { ...r, ...updates } : r),
    } : f),
  })),

  deleteLogicRule: (fieldId, ruleId) => set((s) => ({
    fields: s.fields.map(f => f.id === fieldId ? {
      ...f,
      logic: f.logic.filter((r: LogicRule) => r.id !== ruleId),
    } : f),
  })),

  activatePack: (pack) => {
    const fields = pack.fields.map((f, i) => ({ ...f, id: 'f' + (i + 1) })) as FormField[];
    set({
      fields, selectedId: null,
      currentFormName: pack.name,
      currentFormDesc: pack.description,
      activePackId: pack.id,
      fieldCounter: fields.length,
      builderTab: 'build',
      nav: 'builder',
      previewPackId: null,
    });
  },

  setPreviewPackId: (previewPackId) => set({ previewPackId }),
  setPackSearch: (packSearch) => set({ packSearch }),
  setPackDomainFilter: (packDomainFilter) => set({ packDomainFilter }),
  setShowSaveTemplateModal: (showSaveTemplateModal) => set({ showSaveTemplateModal }),
  setSaveTemplateName: (saveTemplateName) => set({ saveTemplateName }),

  saveAsTemplate: (pack) => set((s) => ({
    customPacks: [pack, ...s.customPacks],
    showSaveTemplateModal: false,
    saveTemplateName: '',
  })),

  deleteCustomPack: (id) => set((s) => ({
    customPacks: s.customPacks.filter(p => p.id !== id),
  })),

  setPermRole: (selectedPermRole) => set({ selectedPermRole }),

  togglePermission: (roleKey, moduleId, action) => set((s) => ({
    permsDirty: true,
    permissionsByRole: {
      ...s.permissionsByRole,
      [roleKey]: s.permissionsByRole[roleKey].map(row =>
        row.id === moduleId ? { ...row, [action]: !row[action as keyof PermissionRow] } : row
      ),
    },
  })),

  savePermissions: () => set({ permsDirty: false }),

  openModal: (modal, data) => set({ showModal: modal, modalData: data || {} }),
  closeModal: () => set({ showModal: null, modalData: {}, editingUserId: null }),
  setModalField: (key, val) => set((s) => ({ modalData: { ...s.modalData, [key]: val } })),
  setEditingUserId: (editingUserId) => set({ editingUserId }),
  setMenuOpenId: (menuOpenId) => set({ menuOpenId }),

  addCompany: (name, code, type) => set((s) => ({
    companies: [...s.companies, { id: Math.max(0, ...s.companies.map(c => c.id)) + 1, name, code, type, plants: 0, employees: 0, status: 'active' }],
    showModal: null, modalData: {},
  })),

  addPlant: (name, code, company, location, capacity) => set((s) => ({
    plants: [...s.plants, { id: Math.max(0, ...s.plants.map(p => p.id)) + 1, name, code, company, location, capacity, status: 'active' }],
    showModal: null, modalData: {},
  })),

  addDepartment: (name, plant) => set((s) => ({
    departments: [...s.departments, { id: Math.max(0, ...s.departments.map(d => d.id)) + 1, name, plant, head: '—', headcount: 0, status: 'active' }],
    showModal: null, modalData: {},
  })),

  addTeam: (name, department) => set((s) => ({
    teams: [...s.teams, { id: Math.max(0, ...s.teams.map(t => t.id)) + 1, name, department, lead: '—', members: 0, status: 'active' }],
    showModal: null, modalData: {},
  })),

  addRole: (name, description) => set((s) => ({
    roles: [...s.roles, { id: Math.max(0, ...s.roles.map(r => r.id)) + 1, name, permKey: name.toLowerCase().replace(/\s+/g, '_'), description, users: 0, permissions: 'Custom', status: 'active' }],
    showModal: null, modalData: {},
  })),

  addUser: (name, email, role, department) => set((s) => {
    const parts = name.split(' ');
    const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
    const colors = ['#2563EB', '#059669', '#7C3AED', '#0D9488', '#DC2626', '#D97706'];
    return {
      users: [...s.users, { id: Math.max(0, ...s.users.map(u => u.id)) + 1, name, email, role, department, status: 'active', initials, color: colors[s.users.length % colors.length] }],
      showModal: null, modalData: {},
    };
  }),

  updateUser: (id, data) => set((s) => ({
    users: s.users.map(u => u.id === id ? { ...u, ...data } : u),
    showModal: null, modalData: {}, editingUserId: null,
  })),

  deleteUser: (id) => set((s) => ({
    users: s.users.filter(u => u.id !== id),
    menuOpenId: null,
  })),

  deleteForm: (id) => set((s) => ({
    forms: s.forms.filter(f => f.id !== id),
    menuOpenId: null,
  })),

  openNewForm: () => set({
    fields: [],
    selectedId: null,
    currentFormName: 'New Form',
    currentFormDesc: 'Add a description…',
    activePackId: null,
    fieldCounter: 0,
    builderTab: 'build',
    nav: 'builder',
  }),

  editForm: (id) => set((s) => {
    const form = s.forms.find(f => f.id === id);
    if (!form) return {};
    return {
      currentFormName: form.name,
      currentFormDesc: `${form.category} form — ${form.fields} fields`,
      activePackId: null,
      builderTab: 'build',
      nav: 'builder',
    };
  }),

  saveDraft: () => set((s) => {
    const name = s.currentFormName || 'Untitled Form';
    const desc = s.currentFormDesc;
    const defs = [...s.fields];
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const existing = s.forms.find(f => f.name === name);
    if (existing) {
      return { forms: s.forms.map(f => f.id === existing.id ? { ...f, fields: defs.length, fieldDefs: defs, description: desc, status: 'draft', updated: now } : f) };
    }
    const newId = Math.max(0, ...s.forms.map(f => f.id)) + 1;
    return { forms: [...s.forms, { id: newId, name, fields: defs.length, fieldDefs: defs, description: desc, responses: 0, status: 'draft', updated: now, category: 'Custom', companyId: s.activeCompanyId || undefined }] };
  }),

  setShowAssignModal: (showAssignModal) => set({ showAssignModal }),
  toggleAssignUser: (userId) => set((s) => ({
    assignModalUserIds: s.assignModalUserIds.includes(userId)
      ? s.assignModalUserIds.filter(id => id !== userId)
      : [...s.assignModalUserIds, userId],
  })),
  setAssignModalUserIds: (assignModalUserIds) => set({ assignModalUserIds }),

  publishForm: (assignedUserIds, schedule) => set((s) => {
    const name = s.currentFormName || 'Untitled Form';
    const desc = s.currentFormDesc;
    const defs = [...s.fields];
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const ids = assignedUserIds || s.assignModalUserIds;
    const existing = s.forms.find(f => f.name === name);
    if (existing) {
      return { forms: s.forms.map(f => f.id === existing.id ? { ...f, fields: defs.length, fieldDefs: defs, description: desc, status: 'published', updated: now, assignedUserIds: ids.length > 0 ? ids : undefined, schedule } : f), nav: 'forms', showAssignModal: false, assignModalUserIds: [] };
    }
    const newId = Math.max(0, ...s.forms.map(f => f.id)) + 1;
    return { forms: [...s.forms, { id: newId, name, fields: defs.length, fieldDefs: defs, description: desc, responses: 0, status: 'published', updated: now, category: 'Custom', assignedUserIds: ids.length > 0 ? ids : undefined, schedule, companyId: s.activeCompanyId || undefined }], nav: 'forms', showAssignModal: false, assignModalUserIds: [] };
  }),

  fillingFormId: null as number | null,
  fillForm: (id: number) => set({ fillingFormId: id, nav: 'fill' }),

  submitResponse: (formId: number, values: Record<string, string>) => set((s) => {
    const form = s.forms.find(f => f.id === formId);
    if (!form) return {};
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newId = Math.max(0, ...s.responses.map(r => r.id)) + 1;
    const newResponse: ResponseItem = {
      id: newId,
      formId,
      form: form.name,
      packId: '',
      submittedBy: 'Sarah Chen',
      plant: 'Chennai Manufacturing Plant',
      date: now,
      status: 'published',
      values,
      companyId: s.activeCompanyId || undefined,
    };
    return {
      responses: [...s.responses, newResponse],
      forms: s.forms.map(f => f.id === formId ? { ...f, responses: f.responses + 1 } : f),
      nav: 'responses',
    };
  }),

  viewingFormId: null as number | null,
  viewFormResponses: (id: number) => set({ viewingFormId: id, nav: 'form-responses' }),
}));
