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
  // Only meaningful for type === 'section': whether this section repeats at fill time
  // ("Add Another"). Member fields are the ordinary top-level fields that follow this
  // marker up to the next section marker (or end of form) — they are edited in place on
  // the canvas like any other field, not in a separate config editor.
  repeatable?: boolean;
  // Only meaningful for a repeatable section: render instances as a table (columns =
  // member fields, one row per instance) instead of stacked cards. Lets one row per
  // machine/item show all its fields side by side, e.g. 20 machines x status/photos.
  tableLayout?: boolean;
  // Only meaningful for a repeatable table section: admin-typed row labels (one per
  // line in the Builder), pre-populating that many instances with a fixed label when
  // the form is first filled. Filler can still add further rows beyond the seeded ones.
  seedRows?: string[];
  // Marks a dropdown field (e.g. "Nature of Work" on a work-permit form) whose options
  // are the company's trades (Electrician, Plumber, ...) rather than admin-typed text.
  // Submitting a response with a value here triggers server-side auto-assignment: the
  // least-recently-assigned free user holding that trade is set as assignedToId. Reuses
  // the plain 'dropdown' field type/rendering everywhere (builder, filler, exports) --
  // this flag only changes where its options come from and what submit does with it.
  isTradeSelector?: boolean;
}

// For a repeatable section: instances are stored as a JSON array under the section
// marker field's own response id. Each instance holds one value per member-field id.
// Member-field schema is derived by walking the fields between this marker and the next,
// not read from defaultValue. Stable instance ids (never array index) so values don't
// scramble when instances are added/removed/reordered.
export interface SectionInstance {
  id: string;
  values: Record<string, string>;
  // Row label for a table-layout section (e.g. a seeded machine name), shown in the
  // dedicated first column. `seeded` marks a row that came from the admin's seedRows
  // list -- its label is fixed/non-editable. Rows the filler adds themselves at fill
  // time have `seeded` unset and get an editable label input in that same column.
  label?: string;
  seeded?: boolean;
}

export interface ChecklistItemDef {
  id: string;
  text: string;
  direction: 'present' | 'absent';
}

// For photochecklist fields: baseline items are seeded from the field's defaultValue
// (JSON-encoded ChecklistItemDef[]) and stored/appended per-response alongside AI/manual items.
export interface ChecklistItem extends ChecklistItemDef {
  source: 'builder' | 'ai' | 'manual';
}

export interface ChecklistResult {
  itemId: string;
  found: boolean;
  note: string;
}

export interface FormSchedule {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  dueDay?: number;
  time?: string;
}

export interface FormItem {
  id: string;
  name: string;
  fields: number;
  responses: number;
  status: string;
  updated: string;
  category: string;
  description?: string;
  fieldDefs?: FormField[];
  assignedUserIds?: string[] | null;
  schedule?: FormSchedule;
  companyId?: number | string;
}

export interface UserItem {
  id: string;
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
  id: string;
  formId: string;
  form: string;
  packId: string;
  submittedBy: string;
  submittedById?: string | null;
  assignedToId?: string | null;
  assignedToName?: string | null;
  // The maintenance worker auto-assigned by trade/availability for a work-permit-style form
  // (see server's lib/workPermitAssignment.ts) -- separate from assignedToId, which is the
  // approval-routing target (a manager), not a worker.
  autoAssignedUserId?: string | null;
  autoAssignedUserName?: string | null;
  plant: string;
  date: string;
  status: string;
  values?: Record<string, string>;
  companyId?: number | string;
}

// Response.status values that mean "still in progress, someone can resume editing it" --
// i.e. not a final submission (submitted/approved). Used wherever code decides whether an
// existing response can be reopened/resumed, or whether it should show up as "sent to me"/
// "awaiting my action" for the current user. Kept in one place since it's easy to add a new
// approval-loop status and forget one of the several places that gate on this list.
export const RESUMABLE_RESPONSE_STATUSES = ['draft', 'awaiting_supervisor', 'awaiting_approval', 'changes_requested'];

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
  // Two-level grouping used only by the Templates screen's filters (independent of
  // `domain`, which stays as the display tag / becomes the created form's category).
  industry: string;
  subCategory: string;
  // Optional real photo for the template card header. Falls back to the subCategory's
  // icon + gradient illustration when absent.
  image?: string;
}
