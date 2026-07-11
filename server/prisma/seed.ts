import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Roles
  await prisma.role.create({ data: { key: 'platform_admin', name: 'Platform Admin', description: 'DockForm staff — approves companies, no tenant data access' } });
  const adminRole = await prisma.role.create({ data: { key: 'admin', name: 'Administrator', description: 'Full platform access, user & role management' } });
  const editorRole = await prisma.role.create({ data: { key: 'editor', name: 'Form Editor', description: 'Create and edit forms, view responses' } });
  const auditorRole = await prisma.role.create({ data: { key: 'auditor', name: 'Compliance Auditor', description: 'Fill and submit compliance checklists' } });
  const viewerRole = await prisma.role.create({ data: { key: 'viewer', name: 'Viewer', description: 'Read-only access to dashboards and reports' } });

  // Permissions
  const modules = ['Forms', 'Templates', 'Responses', 'Users', 'Companies & Plants', 'Reports', 'Settings'];
  for (const mod of modules) {
    await prisma.permission.create({ data: { roleId: adminRole.id, module: mod, canView: true, canCreate: true, canEdit: true, canDelete: mod !== 'Settings' } });
    await prisma.permission.create({ data: { roleId: editorRole.id, module: mod, canView: ['Forms', 'Templates', 'Responses', 'Companies & Plants', 'Reports'].includes(mod), canCreate: mod === 'Forms' || mod === 'Templates', canEdit: mod === 'Forms', canDelete: false } });
    await prisma.permission.create({ data: { roleId: auditorRole.id, module: mod, canView: ['Forms', 'Templates', 'Responses', 'Companies & Plants', 'Reports'].includes(mod), canCreate: mod === 'Responses', canEdit: false, canDelete: false } });
    await prisma.permission.create({ data: { roleId: viewerRole.id, module: mod, canView: ['Forms', 'Templates', 'Responses', 'Companies & Plants', 'Reports'].includes(mod), canCreate: false, canEdit: false, canDelete: false } });
  }

  // Companies
  const acme = await prisma.company.create({ data: { name: 'Acme Precision Industries', code: 'ACM-001', type: 'Parent Company' } });
  const acmeText = await prisma.company.create({ data: { name: 'Acme Textiles Pvt Ltd', code: 'ACM-002', type: 'Subsidiary' } });
  const acmeAuto = await prisma.company.create({ data: { name: 'Acme Auto Components', code: 'ACM-003', type: 'Subsidiary' } });
  await prisma.company.create({ data: { name: 'Acme Green Energy', code: 'ACM-004', type: 'Joint Venture', status: 'inactive' } });

  // Plants
  const chennai = await prisma.plant.create({ data: { companyId: acme.id, name: 'Chennai Manufacturing Plant', code: 'PLT-CH01', location: 'Chennai, Tamil Nadu', capacityWorkers: 450 } });
  const coimbatore = await prisma.plant.create({ data: { companyId: acmeText.id, name: 'Coimbatore Textile Unit', code: 'PLT-CB01', location: 'Coimbatore, Tamil Nadu', capacityWorkers: 320 } });
  const pune = await prisma.plant.create({ data: { companyId: acmeAuto.id, name: 'Pune Auto Parts Facility', code: 'PLT-PN01', location: 'Pune, Maharashtra', capacityWorkers: 310 } });
  const bengaluru = await prisma.plant.create({ data: { companyId: acme.id, name: 'Bengaluru Electronics Unit', code: 'PLT-BL01', location: 'Bengaluru, Karnataka', capacityWorkers: 260, status: 'review' } });
  await prisma.plant.create({ data: { companyId: acme.id, name: 'Nagpur Ancillary Plant', code: 'PLT-NG01', location: 'Nagpur, Maharashtra', capacityWorkers: 180, status: 'draft' } });

  // Departments
  const production = await prisma.department.create({ data: { plantId: chennai.id, name: 'Production' } });
  const qa = await prisma.department.create({ data: { plantId: chennai.id, name: 'Quality Assurance' } });
  const maintenance = await prisma.department.create({ data: { plantId: coimbatore.id, name: 'Maintenance' } });
  const ehs = await prisma.department.create({ data: { plantId: pune.id, name: 'Environment, Health & Safety' } });
  const hr = await prisma.department.create({ data: { plantId: bengaluru.id, name: 'Human Resources' } });

  // Teams
  await prisma.team.create({ data: { departmentId: production.id, name: 'Line 1 — Assembly' } });
  await prisma.team.create({ data: { departmentId: qa.id, name: 'Incoming Inspection' } });
  await prisma.team.create({ data: { departmentId: maintenance.id, name: 'Preventive Maintenance Crew' } });
  await prisma.team.create({ data: { departmentId: ehs.id, name: 'Safety Committee' } });

  // Users
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.create({ data: { email: 'admin@dockform.local', passwordHash: hash, fullName: 'Admin User', roleId: adminRole.id, companyId: acme.id, plantId: chennai.id, departmentId: production.id } });
  await prisma.user.create({ data: { email: 'sarah@acme.com', passwordHash: hash, fullName: 'Sarah Chen', roleId: adminRole.id, companyId: acme.id, plantId: chennai.id, departmentId: production.id } });
  await prisma.user.create({ data: { email: 'm.torres@acme.com', passwordHash: hash, fullName: 'Michael Torres', roleId: editorRole.id, companyId: acme.id, plantId: chennai.id, departmentId: production.id } });
  await prisma.user.create({ data: { email: 'emily.n@acme.com', passwordHash: hash, fullName: 'Emily Nakamura', roleId: viewerRole.id, companyId: acmeText.id, plantId: coimbatore.id, departmentId: qa.id, status: 'inactive' } });
  await prisma.user.create({ data: { email: 'j.wilson@acme.com', passwordHash: hash, fullName: 'James Wilson', roleId: editorRole.id, companyId: acmeAuto.id, plantId: pune.id, departmentId: ehs.id } });

  // Sample forms
  await prisma.form.create({ data: { name: 'Employee Onboarding', description: 'Onboarding form for new hires', domain: 'HR', status: 'published', companyId: acme.id } });
  await prisma.form.create({ data: { name: 'Plant Safety Checklist', description: 'Daily safety inspection checklist', domain: 'Safety', status: 'draft', companyId: acme.id } });
  await prisma.form.create({ data: { name: 'Equipment Inspection Report', description: 'Equipment maintenance inspection', domain: 'Maintenance', status: 'published', companyId: acme.id } });
  await prisma.form.create({ data: { name: 'Supplier Quality Audit', description: 'Supplier quality assessment form', domain: 'Quality', status: 'review', companyId: acme.id } });

  console.log('Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
