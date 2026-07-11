export interface LogicRule {
  id: string;
  action: 'show' | 'hide' | 'require';
  sourceFieldId: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_empty' | 'empty' | 'greater_than' | 'less_than';
  value: string;
}

export interface FormField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  helpText: string;
  defaultValue: string;
  required: boolean;
  readOnly: boolean;
  hidden: boolean;
  searchable: boolean;
  indexed: boolean;
  options: string[];
  validation: { min: string; max: string; pattern: string; message: string };
  logic: LogicRule[];
}

export interface FormSchedule {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  dueDay?: number;
  time?: string;
}

export interface FormItem {
  id: number;
  name: string;
  fields: number;
  responses: number;
  status: string;
  updated: string;
  category: string;
  description?: string;
  fieldDefs?: FormField[];
  assignedUserIds?: number[];
  schedule?: FormSchedule;
  companyId?: number | string;
}

export interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  status: string;
  initials: string;
  color: string;
  companyId?: number | string;
}

export interface Company {
  id: number;
  name: string;
  code: string;
  type: string;
  plants: number;
  employees: number;
  status: string;
}

export interface Plant {
  id: number;
  name: string;
  code: string;
  company: string;
  location: string;
  capacity: string;
  status: string;
}

export interface Department {
  id: number;
  name: string;
  plant: string;
  head: string;
  headcount: number;
  status: string;
}

export interface Team {
  id: number;
  name: string;
  department: string;
  lead: string;
  members: number;
  status: string;
}

export interface Role {
  id: number;
  name: string;
  permKey: string;
  description: string;
  users: number;
  permissions: string;
  status: string;
}

export interface PermissionRow {
  id: number;
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface ResponseItem {
  id: number;
  formId: number;
  form: string;
  packId: string;
  submittedBy: string;
  plant: string;
  date: string;
  status: string;
  values?: Record<string, string>;
  companyId?: number | string;
}

export interface AccountSubscription {
  maxCompanies: number;
  maxPlantsPerCompany: number;
  freeUsersPerPlant: number;
  accountExpiry: string;
  plan: 'trial' | 'starter' | 'professional' | 'enterprise';
  multiCompany: boolean;
  multiPlant: boolean;
}

export interface AccountItem {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  status: 'pending' | 'active' | 'suspended' | 'expired';
  createdAt: string;
  subscription: AccountSubscription;
  companiesUsed: number;
  plantsUsed: number;
}

export interface TemplatePack {
  id: string;
  name: string;
  description: string;
  domain: string;
  tag: string;
  color: string;
  chips: string[];
  fields: Omit<FormField, 'id'>[];
  isCustom?: boolean;
}
