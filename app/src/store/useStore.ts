import { create } from 'zustand';
import type { FormField, FormItem, UserItem, Company, Plant, Department, Team, Role, PermissionRow, ResponseItem, TemplatePack, LogicRule, FormSchedule, AccountItem, AccountSubscription } from './types';

interface AppState {
  // Auth
  isAuthed: boolean;
  currentUserId: number | string | null;
  currentUserRole: string;
  currentUserName: string;
  isDockformAdmin: boolean;
  isPlatformAdmin: boolean;
  activeCompanyId: number | string | null;
  onboardingComplete: boolean;
  onboardingStep: number;
  authMode: 'login' | 'signup';
  inviteToken: string;
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
  currentFormId: string | null;
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
  editingUserId: string | null;
  menuOpenId: string | null;

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
  accounts: AccountItem[];

  // Actions
  setAuth: (isAuthed: boolean, authUser?: { id?: string; roleKey?: string; companyId?: string | null }) => void;
  setAuthMode: (mode: 'login' | 'signup') => void;
  setAuthField: (key: 'authEmail' | 'authPassword', val: string) => void;
  setAuthError: (err: string) => void;
  logout: () => void;
  setActiveCompany: (id: number | string | null) => void;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;

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
  setEditingUserId: (id: string | null) => void;
  setMenuOpenId: (id: string | null) => void;

  // CRUD
  addCompany: (name: string, code: string, type: string) => void;
  addPlant: (name: string, code: string, company: string, location: string, capacity: string) => void;
  addDepartment: (name: string, plant: string) => void;
  addTeam: (name: string, department: string) => void;
  addRole: (name: string, description: string) => void;
  addUser: (name: string, email: string, role: string, department: string) => void;
  updateUser: (id: string, data: Partial<UserItem>) => void;
  deleteForm: (id: string) => Promise<void>;
  refreshForms: () => Promise<void>;
  openNewForm: () => void;
  editForm: (id: string) => void;
  saveDraft: () => Promise<void>;
  publishForm: (assignedUserIds?: string[], schedule?: FormSchedule) => Promise<void>;
  showAssignModal: boolean;
  assignModalUserIds: string[];
  setShowAssignModal: (show: boolean) => void;
  toggleAssignUser: (userId: string) => void;
  setAssignModalUserIds: (ids: string[]) => void;
  fillingFormId: string | null;
  fillForm: (id: string) => void;
  submitResponse: (formId: string, values: Record<string, string>) => void;
  viewingFormId: string | null;
  viewFormResponses: (id: string) => void;
  updateFormAssignment: (formId: string, userIds: string[]) => Promise<void>;

  // Account management
  addAccount: (account: Omit<AccountItem, 'id'>) => void;
  activateAccount: (id: number, subscription: AccountSubscription) => void;
  suspendAccount: (id: number) => void;
  updateAccountSubscription: (id: number, updates: Partial<AccountSubscription>) => void;
}

const FIELD_LABELS: Record<string, string> = {
  textbox: 'Text Field', textarea: 'Text Area', richtext: 'Rich Text', number: 'Number', currency: 'Currency', percent: 'Percentage',
  date: 'Date', time: 'Time', datetime: 'Date & Time', dropdown: 'Dropdown', multiselect: 'Multi Select', checkbox: 'Checkbox',
  radio: 'Radio', toggle: 'Toggle', lookup: 'Lookup', formula: 'Formula', image: 'Image', camera: 'Camera', video: 'Video',
  beforeafter: 'Before/After Photo', audio: 'Audio', upload: 'File Upload', signature: 'Signature', gps: 'GPS Location', qr: 'QR Code', barcode: 'Barcode',
  email: 'Email', phone: 'Phone', url: 'URL', rating: 'Rating', color: 'Color Picker', hidden: 'Hidden Field', system: 'System Field', ai: 'AI Field',
};

const CHOICE_TYPES = ['dropdown', 'multiselect', 'radio', 'checkbox'];

export const useStore = create<AppState>((set) => ({
  isAuthed: false,
  currentUserId: null,
  currentUserRole: '',
  currentUserName: '',
  isDockformAdmin: false,
  isPlatformAdmin: false,
  activeCompanyId: null,
  onboardingComplete: true,
  onboardingStep: 0,
  authMode: 'login',
  inviteToken: '',
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
  currentFormId: null,
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
  companies: [],
  plants: [],
  departments: [],
  teams: [],
  roles: [
    { id: 1, name: 'Administrator', permKey: 'admin', description: 'Full platform access', users: 0, permissions: 'All Permissions', status: 'active' },
    { id: 2, name: 'Editor', permKey: 'editor', description: 'Create and edit forms', users: 0, permissions: 'Forms · Templates · Responses', status: 'active' },
    { id: 3, name: 'Auditor', permKey: 'auditor', description: 'Fill compliance checklists', users: 0, permissions: 'Forms (Fill Only)', status: 'active' },
    { id: 4, name: 'Viewer', permKey: 'viewer', description: 'Read-only access', users: 0, permissions: 'View Only', status: 'active' },
  ],
  users: [],
  forms: [],
  responses: [],
  accounts: [],

  setAuth: (isAuthed, authUser) => set(() => {
    if (isAuthed && authUser) {
      const isPlatformAdmin = authUser.roleKey === 'platform_admin';
      const isDockformAdmin = authUser.roleKey === 'admin';
      const roleKey = authUser.roleKey || 'viewer';
      return {
        isAuthed,
        isDockformAdmin,
        isPlatformAdmin,
        currentUserId: authUser.id ?? null,
        currentUserRole: isPlatformAdmin ? 'Platform Admin' : isDockformAdmin ? 'Admin' : roleKey,
        activeCompanyId: authUser.companyId || null,
        nav: !isPlatformAdmin && !isDockformAdmin && roleKey === 'viewer' ? 'forms' : 'dashboard',
      };
    }
    if (isAuthed) return { isAuthed };
    return { isAuthed, currentUserId: null, currentUserRole: '', isDockformAdmin: false, isPlatformAdmin: false };
  }),
  setAuthMode: (authMode) => set({ authMode, authError: '' }),
  setAuthField: (key, val) => set({ [key]: val, authError: '' }),
  setAuthError: (authError) => set({ authError }),
  logout: () => { import('../lib/api').then(({ setToken }) => setToken(null)); set({ isAuthed: false, currentUserId: null, currentUserRole: '', currentUserName: '', isDockformAdmin: false, isPlatformAdmin: false, activeCompanyId: null, onboardingComplete: true, onboardingStep: 0, authEmail: '', authPassword: '', authMode: 'login' }); },
  setActiveCompany: (activeCompanyId) => set({ activeCompanyId }),
  setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
  completeOnboarding: () => set({ onboardingComplete: true, nav: 'dashboard' }),

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
      users: [...s.users, { id: crypto.randomUUID(), name, email, role, department, status: 'active', initials, color: colors[s.users.length % colors.length] }],
      showModal: null, modalData: {},
    };
  }),

  updateUser: (id, data) => set((s) => ({
    users: s.users.map(u => u.id === id ? { ...u, ...data } : u),
    showModal: null, modalData: {}, editingUserId: null,
  })),

  deleteForm: async (id) => {
    const { api } = await import('../lib/api');
    await api.deleteForm(id);
    set((s) => ({ forms: s.forms.filter(f => f.id !== id), menuOpenId: null }));
  },

  refreshForms: async () => {
    const { api } = await import('../lib/api');
    try {
      const forms = await api.getForms();
      set({ forms });
    } catch { /* leave forms as-is if the fetch fails */ }
  },

  openNewForm: () => set({
    fields: [],
    selectedId: null,
    currentFormId: null,
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
      currentFormId: form.id,
      currentFormName: form.name,
      currentFormDesc: form.description ?? `${form.category} form — ${form.fields} fields`,
      fields: form.fieldDefs ? [...form.fieldDefs] : [],
      activePackId: null,
      builderTab: 'build',
      nav: 'builder',
    };
  }),

  saveDraft: async () => {
    const { api } = await import('../lib/api');
    const s = useStore.getState();
    const name = s.currentFormName || 'Untitled Form';
    const description = s.currentFormDesc;
    const fields = [...s.fields];
    if (s.currentFormId) {
      await api.updateForm(s.currentFormId, { name, description, status: 'draft', fields });
    } else {
      const created = await api.createForm({ name, description, domain: 'Custom', fields });
      set({ currentFormId: created.id });
    }
    await useStore.getState().refreshForms();
  },

  setShowAssignModal: (showAssignModal) => set({ showAssignModal }),
  toggleAssignUser: (userId) => set((s) => ({
    assignModalUserIds: s.assignModalUserIds.includes(userId)
      ? s.assignModalUserIds.filter(id => id !== userId)
      : [...s.assignModalUserIds, userId],
  })),
  setAssignModalUserIds: (assignModalUserIds) => set({ assignModalUserIds }),

  publishForm: async (assignedUserIds, schedule) => {
    const { api } = await import('../lib/api');
    const s = useStore.getState();
    const name = s.currentFormName || 'Untitled Form';
    const description = s.currentFormDesc;
    const fields = [...s.fields];
    const ids = assignedUserIds || s.assignModalUserIds;
    let formId: string;
    if (s.currentFormId) {
      formId = s.currentFormId;
      await api.updateForm(formId, { name, description, status: 'published', fields, schedule });
    } else {
      const created = await api.createForm({ name, description, domain: 'Custom', fields });
      formId = created.id;
      await api.updateForm(formId, { status: 'published', schedule });
    }
    if (ids.length > 0) {
      await api.updateFormAssignment(formId, ids);
    }
    await useStore.getState().refreshForms();
    set({ nav: 'forms', showAssignModal: false, assignModalUserIds: [], currentFormId: null });
  },

  fillingFormId: null as string | null,
  fillForm: (id: string) => set({ fillingFormId: id, nav: 'fill' }),

  submitResponse: (formId: string, values: Record<string, string>) => set((s) => {
    const form = s.forms.find(f => f.id === formId);
    if (!form) return {};
    const now = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newId = Math.max(0, ...s.responses.map(r => r.id)) + 1;
    const newResponse: ResponseItem = {
      id: newId,
      formId,
      form: form.name,
      packId: '',
      submittedBy: s.currentUserName || 'Unknown User',
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

  viewingFormId: null as string | null,
  viewFormResponses: (id: string) => set({ viewingFormId: id, nav: 'form-responses' }),
  updateFormAssignment: async (formId, userIds) => {
    const { api } = await import('../lib/api');
    await api.updateFormAssignment(formId, userIds);
    set((s) => ({
      forms: s.forms.map(f => f.id === formId ? { ...f, assignedUserIds: userIds.length > 0 ? userIds : undefined } : f),
    }));
  },

  addAccount: (account) => set((s) => ({
    accounts: [...s.accounts, { ...account, id: Math.max(0, ...s.accounts.map(a => a.id)) + 1 }],
  })),

  activateAccount: (id, subscription) => set((s) => ({
    accounts: s.accounts.map(a => a.id === id ? { ...a, status: 'active' as const, subscription } : a),
  })),

  suspendAccount: (id) => set((s) => ({
    accounts: s.accounts.map(a => a.id === id ? { ...a, status: 'suspended' as const } : a),
  })),

  updateAccountSubscription: (id, updates) => set((s) => ({
    accounts: s.accounts.map(a => a.id === id ? { ...a, subscription: { ...a.subscription, ...updates } } : a),
  })),
}));
