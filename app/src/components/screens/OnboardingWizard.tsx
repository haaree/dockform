import { useState, type CSSProperties } from 'react';
import { Building2, Factory, BookOpen, CheckCircle, ChevronRight, ChevronLeft, Plus, X, Briefcase } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getThemeVars } from '../../lib/theme';
import { getBuiltInPacks } from '../../data/templatePacks';

const STEPS = [
  { icon: Briefcase, label: 'Your Profile' },
  { icon: Building2, label: 'Add Company' },
  { icon: Factory, label: 'Add Plants' },
  { icon: BookOpen, label: 'Pick Templates' },
];

const inputStyle: CSSProperties = {
  width: '100%', padding: '11px 13px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 14,
  background: 'var(--surface)', color: 'var(--text)', outline: 'none',
};

const labelStyle: CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--text)', marginBottom: 6,
};

export default function OnboardingWizard() {
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const step = useStore((s) => s.onboardingStep);
  const setStep = useStore((s) => s.setOnboardingStep);
  const completeOnboarding = useStore((s) => s.completeOnboarding);
  const addCompany = useStore((s) => s.addCompany);
  const addPlant = useStore((s) => s.addPlant);
  const addAccount = useStore((s) => s.addAccount);
  const setActiveCompany = useStore((s) => s.setActiveCompany);
  const activatePack = useStore((s) => s.activatePack);
  const winWidth = useStore((s) => s.winWidth);

  const isMobile = winWidth < 720;
  const themeVars = getThemeVars(accent, dark) as CSSProperties;

  // Step 1: Profile
  const [profileName, setProfileName] = useState('');
  const [profileRole, setProfileRole] = useState('');
  const [profileOtherRole, setProfileOtherRole] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');

  // Step 2: Company
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyType, setCompanyType] = useState('Client');
  const [addedCompanies, setAddedCompanies] = useState<{ name: string; code: string; type: string }[]>([]);

  // Step 3: Plants
  const [plantName, setPlantName] = useState('');
  const [plantLocation, setPlantLocation] = useState('');
  const [plantCompany, setPlantCompany] = useState('');
  const [addedPlants, setAddedPlants] = useState<{ name: string; location: string; company: string }[]>([]);

  // Step 4: Templates
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const handleAddCompany = () => {
    if (!companyName.trim()) return;
    const code = companyCode.trim() || companyName.substring(0, 3).toUpperCase() + '-001';
    setAddedCompanies([...addedCompanies, { name: companyName.trim(), code, type: companyType }]);
    setCompanyName(''); setCompanyCode(''); setCompanyType('Client');
  };

  const handleAddPlant = () => {
    if (!plantName.trim() || !plantCompany) return;
    setAddedPlants([...addedPlants, { name: plantName.trim(), location: plantLocation.trim(), company: plantCompany }]);
    setPlantName(''); setPlantLocation('');
  };

  const resolvedRole = profileRole === 'Other' ? profileOtherRole.trim() : profileRole;

  const handleFinish = () => {
    const addUser = useStore.getState().addUser;
    addedCompanies.forEach(c => addCompany(c.name, c.code, c.type));
    addedPlants.forEach(p => addPlant(p.name, '', p.company, p.location, ''));

    const state = useStore.getState();
    const newCompanyId = addedCompanies.length > 0
      ? state.companies[state.companies.length - 1]?.id || null
      : null;

    if (newCompanyId) {
      setActiveCompany(newCompanyId);
    }

    addUser(profileName.trim(), profileEmail.trim(), resolvedRole || 'Viewer', '—');
    const updatedState = useStore.getState();
    const newUser = updatedState.users[updatedState.users.length - 1];
    if (newUser && newCompanyId) {
      useStore.setState({
        users: updatedState.users.map(u => u.id === newUser.id ? { ...u, companyId: newCompanyId } : u),
        currentUserId: newUser.id,
        currentUserRole: newUser.role,
      });
    } else if (newUser) {
      useStore.setState({ currentUserId: newUser.id, currentUserRole: newUser.role });
    }

    selectedTemplates.forEach(tid => {
      const pack = getBuiltInPacks().find(p => p.id === tid);
      if (pack) activatePack(pack);
    });

    // Send welcome email + notify admin
    import('../../lib/api').then(({ api }) => {
      api.sendWelcomeEmail(profileEmail.trim(), profileName.trim());
    });

    addAccount({
      name: profileName.trim(),
      email: profileEmail.trim(),
      role: resolvedRole || 'User',
      phone: profilePhone.trim(),
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 10),
      subscription: {
        maxCompanies: 1,
        maxPlantsPerCompany: 1,
        freeUsersPerPlant: 4,
        accountExpiry: '',
        plan: 'trial',
        multiCompany: false,
        multiPlant: false,
      },
      companiesUsed: addedCompanies.length,
      plantsUsed: addedPlants.length,
    });
    completeOnboarding();
  };

  const canProceed = () => {
    switch (step) {
      case 0: return profileName.trim().length > 0 && profileEmail.trim().length > 0;
      case 1: return addedCompanies.length > 0;
      case 2: return true;
      case 3: return true;
      default: return true;
    }
  };

  const allCompanyNames = addedCompanies.map(c => c.name);

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Welcome to DockForm</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Tell us about yourself so we can set up your workspace.</div>
            </div>
            <div>
              <label style={labelStyle}>Your Name *</label>
              <input value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="Enter your full name" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Work Email *</label>
              <input value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="you@company.com" type="email" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Your Role</label>
              <select value={profileRole} onChange={e => setProfileRole(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select your role…</option>
                <option value="Consultant">ISO Consultant / Auditor</option>
                <option value="Admin">Factory Administrator</option>
                <option value="Manager">Plant Manager</option>
                <option value="Safety">Safety Officer</option>
                <option value="Quality">Quality Manager</option>
                <option value="Maintenance">Maintenance Head</option>
                <option value="HR">HR Manager</option>
                <option value="Production">Production Manager</option>
                <option value="Environment">EHS Officer</option>
                <option value="Other">Other</option>
              </select>
            </div>
            {profileRole === 'Other' && (
              <div>
                <label style={labelStyle}>Specify Role</label>
                <input value={profileOtherRole} onChange={e => setProfileOtherRole(e.target.value)} placeholder="Enter your role" style={inputStyle} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Phone (Optional)</label>
              <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+91 98765 43210" style={inputStyle} />
            </div>
          </div>
        );

      case 1:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Add Your Companies</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Add the companies you audit or manage. You can add more later.</div>
            </div>

            {addedCompanies.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {addedCompanies.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <Building2 size={16} color={accent} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{c.code} · {c.type}</div>
                    </div>
                    <button onClick={() => setAddedCompanies(addedCompanies.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Company Name *</label>
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Enter company name" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Company Code</label>
                  <input value={companyCode} onChange={e => setCompanyCode(e.target.value)} placeholder="e.g. ASN-001" style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Type</label>
                  <select value={companyType} onChange={e => setCompanyType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    <option value="Client">Client</option>
                    <option value="Parent Company">Parent Company</option>
                    <option value="Subsidiary">Subsidiary</option>
                    <option value="Joint Venture">Joint Venture</option>
                  </select>
                </div>
              </div>
              <button onClick={handleAddCompany} disabled={!companyName.trim()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: companyName.trim() ? accent : 'var(--muted)', fontWeight: 600, fontSize: 13, cursor: companyName.trim() ? 'pointer' : 'default' }}>
                <Plus size={14} /> Add Company
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Add Plants / Locations</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Add factory locations for your companies. You can skip and add later.</div>
            </div>

            {addedPlants.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {addedPlants.map((p, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 20, background: '#DCFCE7', color: '#15803D', fontSize: 12, fontWeight: 600 }}>
                    <Factory size={11} /> {p.name} ({p.company})
                    <button onClick={() => setAddedPlants(addedPlants.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803D', padding: 0, marginLeft: 2 }}><X size={11} /></button>
                  </span>
                ))}
              </div>
            )}

            <div style={{ background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={labelStyle}>Plant Name</label>
                  <input value={plantName} onChange={e => setPlantName(e.target.value)} placeholder="e.g. Chennai Factory" style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={labelStyle}>Location</label>
                  <input value={plantLocation} onChange={e => setPlantLocation(e.target.value)} placeholder="e.g. Chennai, Tamil Nadu" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Company</label>
                <select value={plantCompany} onChange={e => setPlantCompany(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">Select company…</option>
                  {allCompanyNames.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <button onClick={handleAddPlant} disabled={!plantName.trim() || !plantCompany}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: plantName.trim() && plantCompany ? accent : 'var(--muted)', fontWeight: 600, fontSize: 13, cursor: plantName.trim() && plantCompany ? 'pointer' : 'default' }}>
                <Plus size={14} /> Add Plant
              </button>
            </div>

            <div style={{ padding: '10px 14px', background: '#EFF6FF', borderRadius: 8, fontSize: 12, color: '#2563EB', fontWeight: 500 }}>
              Each plant includes 4 free users. Additional users can be added later.
            </div>
          </div>
        );

      case 3:
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Pick Compliance Templates</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Select industry templates to get started. All templates are free during early access.</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
              {getBuiltInPacks().filter(p => !p.isCustom).slice(0, 8).map(pack => {
                const isSelected = selectedTemplates.includes(pack.id);
                return (
                  <button key={pack.id}
                    onClick={() => setSelectedTemplates(isSelected ? selectedTemplates.filter(id => id !== pack.id) : [...selectedTemplates, pack.id])}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12,
                      borderRadius: 10, border: isSelected ? `2px solid ${accent}` : '1px solid var(--border)',
                      background: isSelected ? `${accent}10` : 'var(--surface)',
                      cursor: 'pointer', textAlign: 'left',
                    }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: pack.color + '20', color: pack.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700 }}>
                      {isSelected ? <CheckCircle size={16} /> : <BookOpen size={16} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{pack.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{pack.fields.length} fields · {pack.domain}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedTemplates.length > 0 && (
              <div style={{ fontSize: 12, color: accent, fontWeight: 600 }}>
                {selectedTemplates.length} template{selectedTemplates.length > 1 ? 's' : ''} selected — Free
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      ...themeVars,
      minHeight: '100vh', width: '100%', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ width: '100%', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
        <img src="/icon.png" alt="DockForm" style={{ width: 28, height: 28, borderRadius: 8 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>DockForm</span>
        <div style={{ flex: 1 }} />
        <button onClick={completeOnboarding}
          style={{ fontSize: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
          Skip Setup →
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 600, padding: isMobile ? '24px 16px 0' : '32px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < step;
            const isCurrent = i === step;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: isDone ? accent : isCurrent ? `${accent}20` : 'var(--surface2)',
                    color: isDone ? '#fff' : isCurrent ? accent : 'var(--muted)',
                    border: isCurrent ? `2px solid ${accent}` : '2px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                  }}>
                    {isDone ? <CheckCircle size={16} /> : <Icon size={16} />}
                  </div>
                  {!isMobile && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: isCurrent ? accent : 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {s.label}
                    </span>
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: 2, margin: isMobile ? '0 4px' : '0 8px',
                    background: i < step ? accent : 'var(--border)',
                    borderRadius: 1, transition: 'background 0.2s',
                    marginBottom: isMobile ? 0 : 18,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 600, padding: isMobile ? '0 16px' : '0 24px', flex: 1, overflowY: 'auto' }}>
        {renderStep()}
      </div>

      <div style={{
        width: '100%', maxWidth: 600, padding: isMobile ? '20px 16px' : '24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <ChevronLeft size={14} /> Back
          </button>
        ) : <div />}

        {step < STEPS.length - 1 ? (
          <button onClick={() => canProceed() && setStep(step + 1)} disabled={!canProceed()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: canProceed() ? accent : 'var(--surface2)', color: canProceed() ? '#fff' : 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: canProceed() ? 'pointer' : 'default' }}>
            Continue <ChevronRight size={14} />
          </button>
        ) : (
          <button onClick={handleFinish}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <CheckCircle size={14} /> Submit & Launch
          </button>
        )}
      </div>

      <div style={{ width: '100%', padding: '12px 24px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--muted)' }}>
          Your account will be reviewed and activated by the DockForm team. You'll receive an email once approved.
        </span>
      </div>
    </div>
  );
}
