-- FormOS reference schema (PostgreSQL)
-- Metadata-driven: forms/templates/fields are data, not code. Extend freely.
-- Designed to work either with a custom API (Prisma) or directly via PostgREST + RLS.

create extension if not exists "pgcrypto";

-- ============ USER ENGINE ============

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  type text not null default 'Standalone', -- Parent Company / Subsidiary / Joint Venture / Standalone
  status text not null default 'active',   -- active / inactive
  created_at timestamptz not null default now()
);

create table plants (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  code text unique not null,
  location text,
  capacity_workers int,
  status text not null default 'active',   -- active / review / draft / inactive
  created_at timestamptz not null default now()
);

create table departments (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references plants(id) on delete cascade,
  name text not null,
  head_user_id uuid, -- fk to users, added after users table
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references departments(id) on delete cascade,
  name text not null,
  lead_user_id uuid,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,        -- 'admin' | 'editor' | 'auditor' | 'viewer' | custom
  name text not null,              -- 'Administrator', 'Form Editor', ...
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- One row per (role, module, action) — this IS the editable permissions matrix
create table permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  module text not null,            -- 'Forms' | 'Templates' | 'Responses' | 'Users' | 'Companies & Plants' | 'Reports' | 'Settings'
  can_view boolean not null default false,
  can_create boolean not null default false,
  can_edit boolean not null default false,
  can_delete boolean not null default false,
  unique (role_id, module)
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,              -- null if using external IdP/SSO only
  full_name text not null,
  role_id uuid references roles(id),
  company_id uuid references companies(id),
  plant_id uuid references plants(id),
  department_id uuid references departments(id),
  team_id uuid references teams(id),
  status text not null default 'active', -- active / inactive
  preferences jsonb not null default '{}'::jsonb, -- {accent, dark, language, timezone, dateFormat, numberFormat}
  created_at timestamptz not null default now()
);

alter table departments add constraint fk_dept_head foreign key (head_user_id) references users(id);
alter table teams add constraint fk_team_lead foreign key (lead_user_id) references users(id);

-- ============ FORM ENGINE ============

-- A Template is just a Form flagged is_template=true (built-in packs seed here)
create table forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  domain text,                      -- 'Legal & Compliance' | 'Quality Management' | ... | 'Custom'
  tag text,                         -- e.g. 'TN Factories Act 1948'
  is_template boolean not null default false,
  is_custom_template boolean not null default false, -- user-saved via "Save as Template"
  status text not null default 'draft', -- draft / review / published
  created_by uuid references users(id),
  company_id uuid references companies(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Metadata-driven field definitions — every field type in the Form Engine spec
create table form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  sort_order int not null default 0,
  type text not null,               -- textbox|textarea|richtext|number|currency|percent|date|time|datetime|
                                     -- dropdown|multiselect|checkbox|radio|toggle|lookup|formula|image|camera|
                                     -- video|audio|upload|signature|gps|qr|barcode|email|phone|url|rating|
                                     -- color|hidden|system|ai
  label text not null,
  placeholder text default '',
  help_text text default '',
  default_value text default '',
  options jsonb not null default '[]'::jsonb,      -- for dropdown/multiselect/radio/checkbox
  validation jsonb not null default '{}'::jsonb,   -- {min,max,pattern,message}
  is_required boolean not null default false,
  is_read_only boolean not null default false,
  is_hidden boolean not null default false,
  is_searchable boolean not null default false,
  is_indexed boolean not null default false,
  logic jsonb not null default '[]'::jsonb,        -- conditional-visibility rules: [{fieldId, op, value, action}]
  created_at timestamptz not null default now()
);

create index idx_form_fields_form on form_fields(form_id);
create index idx_form_fields_searchable on form_fields(form_id) where is_searchable;

-- A Response is one filled-out submission of a Form
create table responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id),
  submitted_by uuid references users(id),
  plant_id uuid references plants(id),
  status text not null default 'draft', -- draft / review / published
  submitted_at timestamptz not null default now()
);

-- One row per field per response — flexible metadata-driven value storage
create table response_values (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  field_id uuid not null references form_fields(id),
  value jsonb not null default 'null'::jsonb, -- string, number, array, or {url} for media fields
  unique (response_id, field_id)
);

create index idx_response_values_response on response_values(response_id);

-- File attachments for Image/Camera/Video/Audio/Signature/Upload fields (stored in S3, this table holds pointers)
create table response_attachments (
  id uuid primary key default gen_random_uuid(),
  response_value_id uuid not null references response_values(id) on delete cascade,
  storage_key text not null,       -- S3 object key
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

-- ============ ROW LEVEL SECURITY (if using PostgREST) ============
-- Enable RLS and drive policies off a JWT claim `role_key` set at login.
-- Example pattern (repeat per table, tailored per module per the permissions matrix):

alter table forms enable row level security;
alter table responses enable row level security;

create policy forms_select on forms for select
  using (
    exists (
      select 1 from permissions p
      join roles r on r.id = p.role_id
      where r.key = current_setting('request.jwt.claims', true)::json->>'role_key'
        and p.module = 'Forms' and p.can_view = true
    )
  );

create policy forms_insert on forms for insert
  with check (
    exists (
      select 1 from permissions p
      join roles r on r.id = p.role_id
      where r.key = current_setting('request.jwt.claims', true)::json->>'role_key'
        and p.module = 'Forms' and p.can_create = true
    )
  );

-- Repeat select/insert/update/delete policies per table using the same pattern,
-- swapping the `module` string to match the permissions screen (Templates, Responses,
-- Users, Companies & Plants, Reports, Settings).

-- ============ SEED: default roles + permissions (mirrors the Settings/Permissions screen) ============

insert into roles (key, name, description) values
  ('admin',   'Administrator',       'Full platform access, user & role management'),
  ('editor',  'Form Editor',         'Create and edit forms, view responses'),
  ('auditor', 'Compliance Auditor',  'Fill and submit compliance checklists'),
  ('viewer',  'Viewer',              'Read-only access to dashboards and reports');

-- Grant admin everything; tune the rest to match the Permissions screen defaults in the design.
insert into permissions (role_id, module, can_view, can_create, can_edit, can_delete)
select r.id, m.module, true, true, true, (m.module <> 'Settings')
from roles r, (values ('Forms'),('Templates'),('Responses'),('Users'),('Companies & Plants'),('Reports'),('Settings')) as m(module)
where r.key = 'admin';
