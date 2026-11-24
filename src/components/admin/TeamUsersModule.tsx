import React, { useState } from 'react';
import {
  AlertTriangle,
  AtSign,
  Check,
  Database,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Plus,
  Save,
  Shield,
  ShieldCheck,
  Sliders,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { ALL_ADMIN_TABS, ROLE_PRESETS } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { AdminTabId, TeamMember, TeamRole, UserPermissions } from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';

const TEAM_ROLES: TeamRole[] = [
  'Super Admin / Diretoria',
  'Administrador',
  'Redator-Chefe',
  'Executivo Comercial',
  'Apresentador',
  'Repórter / Jornalista',
  'Designer / Social Media',
  'Produtor Podcast',
  'Financeiro',
  'Cliente / Anunciante',
];

const MODULE_LABELS: Record<AdminTabId, string> = {
  cockpit: 'Cockpit Executivo',
  financeiro: 'Financeiro & Fluxo',
  orcamento: 'Orçamentos & Mídia',
  catalogo: 'Preços & Outdoors',
  publicidade: 'Gestão de Publicidade',
  comercial: 'Contratos & Leads',
  cartas: 'Cartas & Convites PDF',
  clientes: 'Pipeline',
  portal_noticias: 'Portal · Matérias',
  jornalismo: 'Redação & Fala Cidadão',
  reporteres: 'Repórteres & Distribuição',
  fontes: 'Fontes Jornalísticas',
  marketing: 'Marketing & Artes',
  estudio: 'Estúdio Podcast',
  agenda: 'Agenda & Prazos',
  notificacoes: 'Notificações',
  relatorios: 'Relatórios & Checking',
  institucional: 'Apresentação Empresa',
  equipe: 'Equipe & Permissões',
  presets: 'Presets & Layout Global',
  auditoria: 'Log de Auditoria',
  cms: 'CMS Portais & Deploy',
};

function slugifySimpleLogin(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');
}

function deriveSimpleLogin(member: Pick<TeamMember, 'loginName' | 'email' | 'name'>): string {
  if (member.loginName && member.loginName.trim()) {
    return slugifySimpleLogin(member.loginName);
  }
  if (member.email && member.email.includes('@')) {
    return slugifySimpleLogin(member.email.split('@')[0]);
  }
  return slugifySimpleLogin(member.name.split(/\s+/)[0] || '');
}

export const TeamUsersModule: React.FC = () => {
  const {
    teamMembers,
    activeAdminUserId,
    setActiveAdminUserId,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    apiMode,
  } = useFortMidia();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingProfileDraft, setEditingProfileDraft] = useState<TeamMember | null>(null);
  const [editNewPassword, setEditNewPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [applyRolePresetOnSave, setApplyRolePresetOnSave] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'Todos' | TeamRole>('Todos');
  const [notice, setNotice] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [savingUser, setSavingUser] = useState(false);

  // Create form state (Super Admin only)
  const [name, setName] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginTouched, setLoginTouched] = useState(false);
  const [role, setRole] = useState<TeamRole>('Executivo Comercial');
  const [department, setDepartment] = useState('Comercial & Mídia 360°');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [bio, setBio] = useState('');
  const [linkedClientName, setLinkedClientName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(
    '/assets/aistudio/Log_tipo_3D_Fortmidia_em_destaque_6b2bcf98.png'
  );

  const activeUser: TeamMember | undefined =
    teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];

  const isSuperAdmin =
    activeUser?.role === 'Super Admin / Diretoria' || activeUser?.hierarchyLevel === 1;
  const canEditBasicProfiles = Boolean(isSuperAdmin || activeUser?.permissions?.canEdit);

  const showTempNotice = (msg: string) => {
    setErrorBanner(null);
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 5000);
  };

  const handlePhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onResult(reader.result);
        showTempNotice('Foto de perfil carregada. Salve para gravar no banco.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin || savingUser) return;

    const cleanName = name.trim();
    const cleanLogin = slugifySimpleLogin(loginName || cleanName.split(/\s+/)[0] || '');
    const cleanEmail = email.trim().toLowerCase() || (cleanLogin ? `${cleanLogin}@fortmidia.local` : '');
    const cleanPassword = password.trim();

    if (!cleanName) {
      setErrorBanner('Informe o nome completo do usuário ou empresa.');
      return;
    }
    if (!cleanLogin && !cleanEmail) {
      setErrorBanner('Informe um nome de login simples (ex.: joao) ou um e-mail.');
      return;
    }
    if (cleanPassword.length < 6) {
      setErrorBanner('A senha de acesso deve ter pelo menos 6 caracteres.');
      return;
    }

    setSavingUser(true);
    setErrorBanner(null);
    try {
      const preset = ROLE_PRESETS[role];
      const result = await addTeamMember({
        name: cleanName,
        loginName: cleanLogin || undefined,
        role,
        hierarchyLevel: preset.hierarchyLevel,
        department: department.trim() || 'Operações FortMídia',
        email: cleanEmail,
        phone: phone.trim() || '(11) 99999-0000',
        password: cleanPassword,
        avatarUrl:
          avatarUrl.trim() || '/assets/aistudio/Log_tipo_3D_Fortmidia_em_destaque_6b2bcf98.png',
        bio: bio.trim() || preset.labelDesc,
        active: true,
        allowedModules: [...preset.allowedModules],
        permissions: { ...preset.permissions },
        linkedClientName:
          role === 'Cliente / Anunciante'
            ? linkedClientName.trim() || cleanName
            : undefined,
      });

      if (!result.ok) {
        setErrorBanner(result.error || 'Erro ao salvar credenciais na tabela de usuários.');
        return;
      }

      setName('');
      setLoginName('');
      setLoginTouched(false);
      setEmail('');
      setPhone('');
      setPassword('');
      setShowCreatePassword(false);
      setBio('');
      setLinkedClientName('');
      setShowCreateForm(false);
      showTempNotice(
        result.savedInMysql
          ? `Credenciais de "${cleanName}" (login: ${cleanLogin || cleanEmail}) gravadas na tabela users do MySQL.`
          : `Usuário "${cleanName}" (login: ${cleanLogin || cleanEmail}) cadastrado com sucesso.`
      );
    } finally {
      setSavingUser(false);
    }
  };

  const applyRoleChange = async (member: TeamMember, nextRole: TeamRole) => {
    if (!isSuperAdmin) return;
    const preset = ROLE_PRESETS[nextRole];
    const result = await updateTeamMember(member.id, {
      role: nextRole,
      hierarchyLevel: preset.hierarchyLevel,
      allowedModules: [...preset.allowedModules],
      permissions: { ...preset.permissions },
    });
    if (!result.ok) {
      setErrorBanner(result.error || 'Não foi possível atualizar a hierarquia no banco.');
      return;
    }
    showTempNotice(
      `Perfil de ${member.name} atualizado para "${nextRole}" (Nível ${preset.hierarchyLevel}).`
    );
  };

  const toggleModulePermission = async (member: TeamMember, tabId: AdminTabId) => {
    if (!isSuperAdmin) return;
    const current = member.allowedModules || [];
    const next = current.includes(tabId)
      ? current.filter((t) => t !== tabId)
      : [...current, tabId];
    const result = await updateTeamMember(member.id, { allowedModules: next });
    if (!result.ok) {
      setErrorBanner(result.error || 'Erro ao salvar permissões de módulo no MySQL.');
    }
  };

  const toggleCrudPermission = async (
    member: TeamMember,
    key: keyof UserPermissions
  ) => {
    if (!isSuperAdmin) return;
    const base = member.permissions ?? ROLE_PRESETS[member.role].permissions;
    const result = await updateTeamMember(member.id, {
      permissions: { ...base, [key]: !base[key] },
    });
    if (!result.ok) {
      setErrorBanner(result.error || 'Erro ao salvar permissões no MySQL.');
    }
  };

  const openEditProfileModal = (member: TeamMember) => {
    setErrorBanner(null);
    setEditingProfileDraft({
      ...member,
      loginName: deriveSimpleLogin(member),
    });
    setEditNewPassword('');
    setShowEditPassword(false);
    setApplyRolePresetOnSave(false);
  };

  const handleSaveProfileDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfileDraft || savingUser) return;

    const cleanName = editingProfileDraft.name.trim();
    const cleanLogin = slugifySimpleLogin(
      editingProfileDraft.loginName || deriveSimpleLogin(editingProfileDraft)
    );
    const cleanEmail =
      editingProfileDraft.email.trim().toLowerCase() ||
      (cleanLogin ? `${cleanLogin}@fortmidia.local` : '');

    if (!cleanName) {
      setErrorBanner('Informe o nome completo do usuário.');
      return;
    }

    const trimmedNewPass = editNewPassword.trim();
    if (isSuperAdmin && trimmedNewPass.length > 0 && trimmedNewPass.length < 6) {
      setErrorBanner('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    const preset = ROLE_PRESETS[editingProfileDraft.role];
    const patch: Partial<TeamMember> = {
      name: cleanName,
      department: editingProfileDraft.department.trim() || 'Operações FortMídia',
      phone: editingProfileDraft.phone.trim() || '(11) 95779-2424',
      avatarUrl:
        editingProfileDraft.avatarUrl.trim() ||
        '/assets/aistudio/Log_tipo_3D_Fortmidia_em_destaque_6b2bcf98.png',
      bio: editingProfileDraft.bio.trim(),
      linkedClientName: editingProfileDraft.linkedClientName?.trim() || undefined,
    };

    if (isSuperAdmin) {
      patch.loginName = cleanLogin || undefined;
      patch.email = cleanEmail;
      patch.role = editingProfileDraft.role;
      patch.hierarchyLevel = editingProfileDraft.hierarchyLevel;
      patch.active = editingProfileDraft.active;

      if (trimmedNewPass.length >= 6) {
        patch.password = trimmedNewPass;
      }

      if (applyRolePresetOnSave) {
        patch.hierarchyLevel = preset.hierarchyLevel;
        patch.allowedModules = [...preset.allowedModules];
        patch.permissions = { ...preset.permissions };
      }
    }

    setSavingUser(true);
    setErrorBanner(null);
    try {
      const result = await updateTeamMember(editingProfileDraft.id, patch);
      if (!result.ok) {
        setErrorBanner(
          result.error || 'Falha ao gravar as credenciais na tabela users do MySQL.'
        );
        return;
      }

      setEditingProfileDraft(null);
      setEditNewPassword('');
      setShowEditPassword(false);
      showTempNotice(
        result.savedInMysql
          ? trimmedNewPass
            ? `Credenciais e nova senha de "${cleanName}" (login: ${cleanLogin || cleanEmail}) salvas na tabela users do MySQL.`
            : `Cadastro de "${cleanName}" (login: ${cleanLogin || cleanEmail}) salvo na tabela users do MySQL.`
          : `Usuário "${cleanName}" atualizado com sucesso.`
      );
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteMember = async (member: TeamMember) => {
    if (!isSuperAdmin) return;
    const result = await deleteTeamMember(member.id);
    if (!result.ok) {
      setErrorBanner(result.error || 'Não foi possível excluir o usuário no MySQL.');
      return;
    }
    showTempNotice(`Usuário "${member.name}" removido do sistema.`);
  };

  const editingMember =
    teamMembers.find((m) => m.id === editingMemberId) ?? null;

  const filteredMembers = teamMembers.filter(
    (m) => roleFilter === 'Todos' || m.role === roleFilter
  );

  const hierarchyBadgeClass = (level: number) => {
    if (level === 1) return 'bg-[#fa6607]/20 text-[#fa6607] border-[#fa6607]/40';
    if (level <= 3) return 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/40';
    if (level <= 5) return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Hierarquia, Usuários &amp; Permissões de Acesso
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Apenas o <strong className="text-white">Super Admin</strong> pode cadastrar usuários, criar ou redefinir senhas e salvar credenciais na tabela <code className="text-[#fa6607]">users</code>. O acesso ao painel funciona tanto com <strong className="text-zinc-200">nome simples</strong> quanto com e-mail.
          </p>
        </div>

        {isSuperAdmin ? (
          <button
            type="button"
            onClick={() => {
              setErrorBanner(null);
              setShowCreateForm((v) => !v);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {showCreateForm ? 'Fechar Cadastro' : 'Cadastrar Usuário / Senha'}
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-[11px] font-medium text-amber-200 self-start sm:self-auto">
            <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Criação de senhas restrita ao Super Admin
          </div>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {errorBanner && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-xs font-medium text-red-200"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
            <span>{errorBanner}</span>
          </span>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            aria-label="Fechar aviso de erro"
            className="rounded p-1 text-red-300 hover:bg-white/10 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Active Operator Highlight */}
      {activeUser && (
        <div className="rounded-xl border border-[#D4AF37]/30 bg-gradient-to-r from-[#141418] to-[#111114] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-[#FF6600] bg-[#0A0A0A] shrink-0">
              <MediaFrame
                src={activeUser.avatarUrl}
                alt={activeUser.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#D4AF37]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Operador Conectado · Nível {activeUser.hierarchyLevel}
              </div>
              <div className="mt-0.5 font-display text-lg font-bold text-white truncate">
                {activeUser.name}
              </div>
              <div className="text-xs text-zinc-400 truncate">
                Login simples: <span className="font-mono text-zinc-200">{deriveSimpleLogin(activeUser)}</span> · {activeUser.role} · {activeUser.email}
              </div>
            </div>
          </div>

          <div className="text-xs text-zinc-300 space-y-1 shrink-0">
            <div className="font-semibold text-white">Privilégios Ativos:</div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded border border-white/10 bg-black/40 px-2 py-0.5">
                {activeUser.allowedModules?.length ?? 0} módulos liberados
              </span>
              {isSuperAdmin && (
                <span className="rounded border border-[#fa6607]/40 bg-[#fa6607]/15 px-2 py-0.5 text-[#fa6607] font-semibold">
                  Gestão de Senhas (Super Admin)
                </span>
              )}
              {activeUser.permissions?.canEdit && (
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-300">
                  Editar
                </span>
              )}
              {activeUser.permissions?.canApprove && (
                <span className="rounded border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-0.5 text-[#D4AF37]">
                  Aprovar
                </span>
              )}
              {activeUser.permissions?.canDelete && (
                <span className="rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-300">
                  Excluir
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create New Team Member Form — Exclusivo Super Admin */}
      {showCreateForm && isSuperAdmin && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="rounded-xl border border-[#FF6600]/40 bg-[#121215] p-6 space-y-5"
        >
          <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-sm font-bold text-white">
                Cadastrar Novo Usuário &amp; Credenciais de Acesso (Super Admin)
              </h2>
              <p className="mt-0.5 text-[11px] text-zinc-400">
                As credenciais são gravadas diretamente na tabela <code className="text-[#fa6607]">users</code> do MySQL com criptografia bcrypt.
              </p>
            </div>
            {apiMode === 'online' && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/35 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                Gravação direta no MySQL
              </span>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
            {/* Avatar Preview + Upload */}
            <div className="lg:col-span-3 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0A0A0A] p-5 text-center space-y-3">
              <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-[#FF6600] bg-[#121215]">
                <MediaFrame
                  src={avatarUrl}
                  alt="Prévia foto de perfil"
                  className="h-full w-full object-cover"
                />
              </div>
              <label className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                Enviar Foto de Perfil
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handlePhotoUpload(e, setAvatarUrl)}
                />
              </label>
              <input
                type="text"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="Ou cole a URL da foto..."
                className="w-full rounded-lg border border-white/10 bg-[#121215] px-2.5 py-1.5 text-[11px] text-zinc-300"
              />
            </div>

            {/* Form Fields */}
            <div className="lg:col-span-9 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nome / Empresa *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setName(val);
                      if (!loginTouched) {
                        setLoginName(slugifySimpleLogin(val.split(/\s+/)[0] || ''));
                      }
                    }}
                    placeholder="Ex.: Rafael Nogueira"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Hierarquia / Perfil</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      const r = e.target.value as TeamRole;
                      setRole(r);
                      setBio(ROLE_PRESETS[r].labelDesc);
                    }}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  >
                    {TEAM_ROLES.map((r) => (
                      <option key={r} value={r}>
                        Nível {ROLE_PRESETS[r].hierarchyLevel} · {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Departamento / Núcleo</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Ex.: Redação CIMBAJU"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {role === 'Cliente / Anunciante' && (
                <div>
                  <label className="block text-xs text-[#D4AF37] mb-1">
                    Nome Exato do Anunciante (para filtrar o Quadro e Veiculações do Cliente)
                  </label>
                  <input
                    type="text"
                    value={linkedClientName}
                    onChange={(e) => setLinkedClientName(e.target.value)}
                    placeholder="Ex.: Auto Shopping Franco"
                    className="w-full rounded-lg border border-[#D4AF37]/30 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
              )}

              {/* Credenciais de Login (Login Simples + E-mail + Senha exclusiva Super Admin) */}
              <div className="rounded-xl border border-[#fa6607]/30 bg-[#0A0A0A] p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#fa6607]">
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  Credenciais de Acesso (exclusivo Super Admin)
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-zinc-300 mb-1">
                      Login Simples (nome curto) *
                    </label>
                    <input
                      type="text"
                      required
                      value={loginName}
                      onChange={(e) => {
                        setLoginTouched(true);
                        setLoginName(slugifySimpleLogin(e.target.value));
                      }}
                      placeholder="Ex.: rafael, maria, comercial"
                      className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                    <p className="mt-1 text-[10px] text-zinc-500">
                      Permite entrar digitando apenas este nome.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      E-mail (opcional se houver login simples)
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@fortmidia.com.br"
                      className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-300 mb-1">
                      Senha de Acesso (mín. 6 caracteres) *
                    </label>
                    <div className="relative">
                      <input
                        type={showCreatePassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Digite a senha inicial"
                        className="w-full rounded-lg border border-white/15 bg-[#121215] pl-3 pr-9 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword((v) => !v)}
                        aria-label={showCreatePassword ? 'Ocultar senha' : 'Mostrar senha'}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white cursor-pointer"
                      >
                        {showCreatePassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 95779-2424"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Bio / Atribuições</label>
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Responsabilidades comerciais, editoriais ou técnicas..."
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] disabled:opacity-60 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  {savingUser ? 'Salvando em Usuários...' : 'Salvar Credenciais em Usuários'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Role Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-white/10 bg-[#121215] p-3">
        <button
          type="button"
          onClick={() => setRoleFilter('Todos')}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
            roleFilter === 'Todos' ? 'bg-[#FF6600] text-white' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Todos ({teamMembers.length})
        </button>
        {TEAM_ROLES.map((r) => {
          const count = teamMembers.filter((m) => m.role === r).length;
          if (count === 0) return null;
          return (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                roleFilter === r
                  ? 'bg-[#FF6600] text-white'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {r} ({count})
            </button>
          );
        })}
      </div>

      {/* Team Members Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {filteredMembers.map((member) => {
          const isCurrent = member.id === activeUser?.id;
          const perms = member.permissions ?? ROLE_PRESETS[member.role].permissions;
          const level = member.hierarchyLevel ?? ROLE_PRESETS[member.role].hierarchyLevel;
          const simpleLogin = deriveSimpleLogin(member);
          const canEditThisMember =
            isSuperAdmin || (canEditBasicProfiles && level !== 1);

          return (
            <div
              key={member.id}
              className={`rounded-xl border p-5 space-y-4 transition-colors ${
                isCurrent
                  ? 'border-[#FF6600]/60 bg-[#141418]'
                  : 'border-white/10 bg-[#121215]'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative h-14 w-14 shrink-0">
                    <div className="h-14 w-14 overflow-hidden rounded-full border border-white/15 bg-[#0A0A0A]">
                      <MediaFrame
                        src={member.avatarUrl}
                        alt={member.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {isSuperAdmin && (
                      <label
                        title="Alterar foto de perfil"
                        className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#18181B] text-[#FF6600] hover:bg-[#FF6600] hover:text-white cursor-pointer"
                      >
                        <Upload className="h-3 w-3" aria-hidden="true" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) =>
                            handlePhotoUpload(e, (url) => {
                              void updateTeamMember(member.id, { avatarUrl: url });
                            })
                          }
                        />
                      </label>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold ${hierarchyBadgeClass(
                          level
                        )}`}
                      >
                        <Shield className="h-2.5 w-2.5" />
                        Nível {level}
                      </span>
                      {simpleLogin && (
                        <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-200">
                          <AtSign className="h-2.5 w-2.5 text-[#fa6607]" aria-hidden="true" />
                          {simpleLogin}
                        </span>
                      )}
                      {member.linkedClientName && (
                        <span className="text-[10px] text-emerald-300 font-medium">
                          Cliente: {member.linkedClientName}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-1 font-display text-base font-bold text-white truncate">
                      {member.name}
                    </h3>
                    <select
                      disabled={!isSuperAdmin}
                      value={member.role}
                      onChange={(e) => void applyRoleChange(member, e.target.value as TeamRole)}
                      aria-label={`Função de ${member.name}`}
                      className="mt-1 rounded border border-white/10 bg-[#0A0A0A] px-2 py-0.5 text-[11px] font-semibold text-[#D4AF37] disabled:opacity-75"
                    >
                      {TEAM_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAdminUserId(member.id);
                        showTempNotice(`Visualizando painel como ${member.name} (${member.role}).`);
                      }}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'border border-white/15 text-zinc-200 hover:bg-white/5'
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {isCurrent ? 'Ativo' : 'Testar'}
                    </button>
                  )}

                  {canEditThisMember && (
                    <button
                      type="button"
                      onClick={() => openEditProfileModal(member)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#fa6607]/45 bg-[#fa6607]/15 px-2.5 py-1.5 text-[11px] font-semibold text-[#fa6607] hover:bg-[#fa6607] hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      {isSuperAdmin ? 'Editar & Senha' : 'Editar'}
                    </button>
                  )}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditingMemberId(member.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#E6C868] hover:bg-[#D4AF37]/20 cursor-pointer"
                    >
                      <Sliders className="h-3.5 w-3.5" />
                      Permissões
                    </button>
                  )}

                  {isSuperAdmin && teamMembers.length > 1 && !isCurrent && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteMember(member)}
                      aria-label={`Remover ${member.name}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs leading-relaxed text-zinc-400">{member.bio}</p>

              {/* Permissions Summary Badges */}
              <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                <span className="rounded bg-white/5 px-2 py-0.5 text-zinc-300">
                  Módulos: {member.allowedModules?.length ?? 0}/{ALL_ADMIN_TABS.length}
                </span>
                {perms.canView && (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">Visualizar</span>
                )}
                {perms.canEdit && (
                  <span className="rounded bg-sky-500/15 px-2 py-0.5 text-sky-300">Editar</span>
                )}
                {perms.canApprove && (
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                    Aprovar
                  </span>
                )}
                {perms.canDelete && (
                  <span className="rounded bg-red-500/15 px-2 py-0.5 text-red-300">Excluir</span>
                )}
              </div>

              <div className="grid gap-2 border-t border-white/10 pt-3 text-[11px] text-zinc-300 sm:grid-cols-3">
                <div className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 text-[#FF6600] shrink-0" aria-hidden="true" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <Phone className="h-3.5 w-3.5 text-[#FF6600] shrink-0" aria-hidden="true" />
                  <span className="truncate">{member.phone}</span>
                </div>
                <div className="flex items-center gap-2 justify-between sm:justify-end">
                  <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
                    <Lock className="h-3 w-3 text-[#D4AF37]" aria-hidden="true" />
                    Senha protegida
                  </span>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={member.active}
                      onChange={(e) =>
                        void updateTeamMember(member.id, { active: e.target.checked })
                      }
                      className="accent-[#FF6600]"
                    />
                    <span className={member.active ? 'text-emerald-400' : 'text-zinc-500'}>
                      {member.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full User Profile & Credentials Editor Modal */}
      {editingProfileDraft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={(e) => void handleSaveProfileDraft(e)}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#fa6607]/40 bg-[#121215] p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#fa6607]">
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                  {isSuperAdmin
                    ? 'Editar Cadastro, Login Simples & Senha (Super Admin)'
                    : 'Editar Dados do Perfil'}
                </div>
                <h3 id="edit-user-modal-title" className="mt-1 font-display text-lg font-bold text-white">
                  {editingProfileDraft.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingProfileDraft(null)}
                aria-label="Fechar edição de usuário"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorBanner && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/50 px-3.5 py-2.5 text-xs text-red-200"
              >
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
                <span>{errorBanner}</span>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Avatar Column */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0A0A0A] p-4 text-center space-y-3">
                <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-[#fa6607] bg-[#121215]">
                  <MediaFrame
                    src={editingProfileDraft.avatarUrl}
                    alt={editingProfileDraft.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <label className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer">
                  <Upload className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                  Trocar Foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) =>
                      handlePhotoUpload(e, (url) =>
                        setEditingProfileDraft((prev) => (prev ? { ...prev, avatarUrl: url } : prev))
                      )
                    }
                  />
                </label>
                <input
                  type="text"
                  value={editingProfileDraft.avatarUrl}
                  onChange={(e) =>
                    setEditingProfileDraft({ ...editingProfileDraft, avatarUrl: e.target.value })
                  }
                  placeholder="URL da foto de perfil..."
                  className="w-full rounded-lg border border-white/10 bg-[#121215] px-2.5 py-1.5 text-[11px] text-zinc-300"
                />
                {isSuperAdmin && (
                  <label className="inline-flex items-center gap-2 pt-1 text-xs text-zinc-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingProfileDraft.active}
                      onChange={(e) =>
                        setEditingProfileDraft({
                          ...editingProfileDraft,
                          active: e.target.checked,
                        })
                      }
                      className="accent-[#fa6607]"
                    />
                    <span>Usuário Ativo no Sistema</span>
                  </label>
                )}
              </div>

              {/* Details Column */}
              <div className="lg:col-span-8 space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={editingProfileDraft.name}
                      onChange={(e) =>
                        setEditingProfileDraft({ ...editingProfileDraft, name: e.target.value })
                      }
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Departamento / Núcleo</label>
                    <input
                      type="text"
                      value={editingProfileDraft.department}
                      onChange={(e) =>
                        setEditingProfileDraft({
                          ...editingProfileDraft,
                          department: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                  </div>
                </div>

                {isSuperAdmin && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Hierarquia / Cargo</label>
                      <select
                        value={editingProfileDraft.role}
                        onChange={(e) => {
                          const nextRole = e.target.value as TeamRole;
                          const preset = ROLE_PRESETS[nextRole];
                          setEditingProfileDraft({
                            ...editingProfileDraft,
                            role: nextRole,
                            hierarchyLevel: preset.hierarchyLevel,
                          });
                          setApplyRolePresetOnSave(true);
                        }}
                        className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                      >
                        {TEAM_ROLES.map((r) => (
                          <option key={r} value={r}>
                            Nível {ROLE_PRESETS[r].hierarchyLevel} · {r}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Nível Hierárquico</label>
                      <select
                        value={editingProfileDraft.hierarchyLevel}
                        onChange={(e) =>
                          setEditingProfileDraft({
                            ...editingProfileDraft,
                            hierarchyLevel: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
                          })
                        }
                        className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                      >
                        <option value={1}>Nível 1 · Super Admin (Controle Total)</option>
                        <option value={2}>Nível 2 · Administrador Geral</option>
                        <option value={3}>Nível 3 · Chefia / Redator-Chefe</option>
                        <option value={4}>Nível 4 · Apresentador / Executivo / Financeiro</option>
                        <option value={5}>Nível 5 · Repórter / Designer / Produtor</option>
                        <option value={6}>Nível 6 · Cliente / Anunciante</option>
                      </select>
                    </div>
                  </div>
                )}

                {isSuperAdmin && applyRolePresetOnSave && (
                  <label className="flex items-center gap-2 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-2 text-[11px] text-[#E6C868] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyRolePresetOnSave}
                      onChange={(e) => setApplyRolePresetOnSave(e.target.checked)}
                      className="accent-[#fa6607]"
                    />
                    <span>Aplicar automaticamente os módulos e permissões padrão do novo cargo</span>
                  </label>
                )}

                {/* Credenciais & Senha — Restrito ao Super Admin */}
                {isSuperAdmin ? (
                  <div className="rounded-xl border border-[#fa6607]/30 bg-[#0A0A0A] p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fa6607]">
                        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                        Credenciais de Login (tabela users)
                      </span>
                      <span className="text-[10px] text-zinc-400">Exclusivo Super Admin</span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className="block text-xs text-zinc-300 mb-1">
                          Login Simples (nome)
                        </label>
                        <input
                          type="text"
                          value={editingProfileDraft.loginName || ''}
                          onChange={(e) =>
                            setEditingProfileDraft({
                              ...editingProfileDraft,
                              loginName: slugifySimpleLogin(e.target.value),
                            })
                          }
                          placeholder="Ex.: emerson, joao"
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">E-mail</label>
                        <input
                          type="email"
                          value={editingProfileDraft.email}
                          onChange={(e) =>
                            setEditingProfileDraft({
                              ...editingProfileDraft,
                              email: e.target.value,
                            })
                          }
                          className="w-full rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-300 mb-1">
                          Nova Senha (opcional)
                        </label>
                        <div className="relative">
                          <input
                            type={showEditPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={editNewPassword}
                            onChange={(e) => setEditNewPassword(e.target.value)}
                            placeholder="Manter senha atual"
                            className="w-full rounded-lg border border-white/15 bg-[#121215] pl-3 pr-9 py-2 font-mono text-xs text-white focus:border-[#fa6607] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditPassword((v) => !v)}
                            aria-label={showEditPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white cursor-pointer"
                          >
                            {showEditPassword ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-200">
                    <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      Apenas o Super Admin pode alterar login, e-mail de acesso, hierarquia ou definir senhas.
                    </span>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">WhatsApp / Telefone</label>
                    <input
                      type="text"
                      value={editingProfileDraft.phone}
                      onChange={(e) =>
                        setEditingProfileDraft({ ...editingProfileDraft, phone: e.target.value })
                      }
                      placeholder="(11) 95779-2424"
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">
                      Empresa Cliente Vinculada (opcional)
                    </label>
                    <input
                      type="text"
                      value={editingProfileDraft.linkedClientName || ''}
                      onChange={(e) =>
                        setEditingProfileDraft({
                          ...editingProfileDraft,
                          linkedClientName: e.target.value || undefined,
                        })
                      }
                      placeholder="Ex.: Auto Shopping Franco"
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Bio / Atribuições</label>
                  <textarea
                    rows={2}
                    value={editingProfileDraft.bio}
                    onChange={(e) =>
                      setEditingProfileDraft({ ...editingProfileDraft, bio: e.target.value })
                    }
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              {isSuperAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    const id = editingProfileDraft.id;
                    setEditingProfileDraft(null);
                    setEditingMemberId(id);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3.5 py-2 text-xs font-medium text-[#E6C868] hover:bg-[#D4AF37]/20 cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Configurar Módulos &amp; Permissões
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProfileDraft(null)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-5 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-60 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  {savingUser
                    ? 'Gravando no Banco...'
                    : isSuperAdmin
                      ? 'Salvar Credenciais em Usuários'
                      : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Granular Permissions Editor Modal (Super Admin Only) */}
      {editingMember && isSuperAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="perm-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-[#121215] p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37]">
                  <Lock className="h-3.5 w-3.5" />
                  Controle Granular de Hierarquia (Super Admin)
                </div>
                <h3 id="perm-modal-title" className="mt-1 font-display text-lg font-bold text-white">
                  Permissões de {editingMember.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMemberId(null)}
                aria-label="Fechar permissões"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Nível Hierárquico</label>
                <select
                  value={editingMember.hierarchyLevel}
                  onChange={(e) =>
                    void updateTeamMember(editingMember.id, {
                      hierarchyLevel: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6,
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                >
                  <option value={1}>Nível 1 · Super Admin (Controle Total)</option>
                  <option value={2}>Nível 2 · Administrador Geral</option>
                  <option value={3}>Nível 3 · Chefia / Redator-Chefe</option>
                  <option value={4}>Nível 4 · Apresentador / Executivo / Financeiro</option>
                  <option value={5}>Nível 5 · Repórter / Designer / Produtor</option>
                  <option value={6}>Nível 6 · Cliente / Anunciante</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Empresa Cliente Vinculada (opcional)
                </label>
                <input
                  type="text"
                  defaultValue={editingMember.linkedClientName || ''}
                  onBlur={(e) =>
                    void updateTeamMember(editingMember.id, {
                      linkedClientName: e.target.value.trim() || undefined,
                    })
                  }
                  placeholder="Ex.: Auto Shopping Franco"
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Action Permissions */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-white">Ações Permitidas nos Módulos</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(
                  [
                    ['canView', 'Visualizar Dados'],
                    ['canEdit', 'Criar & Editar'],
                    ['canApprove', 'Aprovar / Publicar'],
                    ['canDelete', 'Excluir Registros'],
                  ] as const
                ).map(([key, label]) => {
                  const checked = Boolean(
                    (editingMember.permissions ?? ROLE_PRESETS[editingMember.role].permissions)[key]
                  );
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs cursor-pointer ${
                        checked
                          ? 'border-[#FF6600]/50 bg-[#FF6600]/10 text-white'
                          : 'border-white/10 bg-[#0A0A0A] text-zinc-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => void toggleCrudPermission(editingMember, key)}
                        className="accent-[#FF6600]"
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Allowed Modules Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">
                  Módulos Visíveis no Painel ({editingMember.allowedModules?.length ?? 0})
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void updateTeamMember(editingMember.id, {
                        allowedModules: [...ALL_ADMIN_TABS],
                      })
                    }
                    className="text-[11px] text-[#FF6600] hover:underline cursor-pointer"
                  >
                    Liberar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => void applyRoleChange(editingMember, editingMember.role)}
                    className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
                  >
                    Restaurar Padrão do Cargo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ALL_ADMIN_TABS.map((tabId) => {
                  const active = (editingMember.allowedModules || []).includes(tabId);
                  return (
                    <label
                      key={tabId}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11px] cursor-pointer ${
                        active
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-white'
                          : 'border-white/10 bg-[#0A0A0A] text-zinc-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => void toggleModulePermission(editingMember, tabId)}
                        className="accent-[#FF6600]"
                      />
                      <span className="truncate">{MODULE_LABELS[tabId]}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => {
                  setEditingMemberId(null);
                  showTempNotice('Permissões salvas na tabela de usuários.');
                }}
                className="rounded-lg bg-[#FF6600] px-5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                Concluir Permissões
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer note */}
      <div className="rounded-xl border border-white/10 bg-[#111114] p-4 flex items-center gap-3 text-xs text-zinc-400">
        <Users className="h-4 w-4 text-[#D4AF37] shrink-0" aria-hidden="true" />
        <span>
          Apenas o Super Admin (Nível 1) pode criar contas, definir ou alterar senhas e ajustar permissões. Todos os usuários salvos na tabela <code className="text-zinc-200">users</code> podem acessar o painel informando apenas o <strong className="text-zinc-200">login simples</strong> ou o e-mail.
        </span>
      </div>
    </div>
  );
};
