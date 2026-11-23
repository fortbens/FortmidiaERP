import React, { useState } from 'react';
import {
  Check,
  Edit3,
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

export const TeamUsersModule: React.FC = () => {
  const {
    teamMembers,
    activeAdminUserId,
    setActiveAdminUserId,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
  } = useFortMidia();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingProfileDraft, setEditingProfileDraft] = useState<TeamMember | null>(null);
  const [applyRolePresetOnSave, setApplyRolePresetOnSave] = useState(false);
  const [roleFilter, setRoleFilter] = useState<'Todos' | TeamRole>('Todos');
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [role, setRole] = useState<TeamRole>('Executivo Comercial');
  const [department, setDepartment] = useState('Comercial & Mídia 360°');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('fortmidia2026');
  const [bio, setBio] = useState('');
  const [linkedClientName, setLinkedClientName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(
    '/assets/aistudio/Log_tipo_3D_Fortmidia_em_destaque_6b2bcf98.png'
  );

  const activeUser: TeamMember | undefined =
    teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];

  const isSuperAdmin =
    activeUser?.role === 'Super Admin / Diretoria' || activeUser?.hierarchyLevel === 1;
  const canManageUsers = Boolean(isSuperAdmin || activeUser?.permissions?.canEdit);

  const showTempNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
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
        showTempNotice('Foto de perfil atualizada com sucesso.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const preset = ROLE_PRESETS[role];

    addTeamMember({
      name: name.trim(),
      role,
      hierarchyLevel: preset.hierarchyLevel,
      department: department.trim() || 'Operações FortMídia',
      email: email.trim(),
      phone: phone.trim() || '(11) 99999-0000',
      password: password.trim() || 'fortmidia2026',
      avatarUrl:
        avatarUrl.trim() || '/assets/aistudio/Log_tipo_3D_Fortmidia_em_destaque_6b2bcf98.png',
      bio: bio.trim() || preset.labelDesc,
      active: true,
      allowedModules: [...preset.allowedModules],
      permissions: { ...preset.permissions },
      linkedClientName:
        role === 'Cliente / Anunciante'
          ? linkedClientName.trim() || name.trim()
          : undefined,
    });

    setName('');
    setEmail('');
    setPhone('');
    setBio('');
    setLinkedClientName('');
    setShowCreateForm(false);
    showTempNotice('Novo perfil cadastrado com hierarquia e permissões aplicadas.');
  };

  const applyRoleChange = (member: TeamMember, nextRole: TeamRole) => {
    const preset = ROLE_PRESETS[nextRole];
    updateTeamMember(member.id, {
      role: nextRole,
      hierarchyLevel: preset.hierarchyLevel,
      allowedModules: [...preset.allowedModules],
      permissions: { ...preset.permissions },
    });
    showTempNotice(
      `Perfil de ${member.name} atualizado para "${nextRole}" (Nível ${preset.hierarchyLevel}).`
    );
  };

  const toggleModulePermission = (member: TeamMember, tabId: AdminTabId) => {
    const current = member.allowedModules || [];
    const next = current.includes(tabId)
      ? current.filter((t) => t !== tabId)
      : [...current, tabId];
    updateTeamMember(member.id, { allowedModules: next });
  };

  const toggleCrudPermission = (
    member: TeamMember,
    key: keyof UserPermissions
  ) => {
    const base = member.permissions ?? ROLE_PRESETS[member.role].permissions;
    updateTeamMember(member.id, {
      permissions: { ...base, [key]: !base[key] },
    });
  };

  const openEditProfileModal = (member: TeamMember) => {
    setEditingProfileDraft({ ...member });
    setApplyRolePresetOnSave(false);
  };

  const handleSaveProfileDraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfileDraft) return;
    if (!editingProfileDraft.name.trim() || !editingProfileDraft.email.trim()) return;

    const preset = ROLE_PRESETS[editingProfileDraft.role];
    const patch: Partial<TeamMember> = {
      name: editingProfileDraft.name.trim(),
      role: editingProfileDraft.role,
      hierarchyLevel: editingProfileDraft.hierarchyLevel,
      department: editingProfileDraft.department.trim() || 'Operações FortMídia',
      email: editingProfileDraft.email.trim(),
      phone: editingProfileDraft.phone.trim() || '(11) 95779-2424',
      password: editingProfileDraft.password.trim() || 'fortmidia2026',
      avatarUrl:
        editingProfileDraft.avatarUrl.trim() ||
        '/assets/aistudio/Log_tipo_3D_Fortmidia_em_destaque_6b2bcf98.png',
      bio: editingProfileDraft.bio.trim(),
      active: editingProfileDraft.active,
      linkedClientName: editingProfileDraft.linkedClientName?.trim() || undefined,
    };

    if (applyRolePresetOnSave) {
      patch.hierarchyLevel = preset.hierarchyLevel;
      patch.allowedModules = [...preset.allowedModules];
      patch.permissions = { ...preset.permissions };
    }

    updateTeamMember(editingProfileDraft.id, patch);
    setEditingProfileDraft(null);
    showTempNotice(`Usuário "${patch.name}" atualizado com sucesso.`);
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
            Hierarquia, Usuários & Permissões de Acesso
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Super Admin possui controle absoluto (visualizar, editar, aprovar e excluir). Gerencie perfis de Administradores, Redatores, Repórteres, Apresentadores e Área do Cliente.
          </p>
        </div>

        {canManageUsers && (
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {showCreateForm ? 'Fechar Cadastro' : 'Cadastrar Pessoa / Cliente'}
          </button>
        )}
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
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
                {activeUser.role} · {activeUser.department} · {activeUser.email}
              </div>
            </div>
          </div>

          <div className="text-xs text-zinc-300 space-y-1 shrink-0">
            <div className="font-semibold text-white">Privilégios Ativos:</div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="rounded border border-white/10 bg-black/40 px-2 py-0.5">
                {activeUser.allowedModules?.length ?? 0} módulos liberados
              </span>
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

      {/* Create New Team Member Form */}
      {showCreateForm && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-[#FF6600]/40 bg-[#121215] p-6 space-y-5"
        >
          <div className="border-b border-white/10 pb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold text-white">
              Cadastrar Novo Usuário, Colaborador, Apresentador ou Cliente
            </h2>
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
                    onChange={(e) => setName(e.target.value)}
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

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">E-mail de Login *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@fortmidia.com.br"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
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
                  <label className="block text-xs text-zinc-400 mb-1">Chave / Senha de Acesso</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Bio / Atribuições
                </label>
                <textarea
                  rows={2}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Responsabilidades comerciais, editoriais ou técnicas..."
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
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
                  className="rounded-lg bg-[#FF6600] px-5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                >
                  Salvar Perfil com Permissões
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
                            handlePhotoUpload(e, (url) =>
                              updateTeamMember(member.id, { avatarUrl: url })
                            )
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
                      {member.linkedClientName && (
                        <span className="text-[10px] text-emerald-300 font-medium">
                          Cliente: {member.linkedClientName}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      disabled={!isSuperAdmin}
                      value={member.name}
                      onChange={(e) => updateTeamMember(member.id, { name: e.target.value })}
                      aria-label={`Nome de ${member.name}`}
                      className="mt-1 w-full bg-transparent font-display text-base font-bold text-white focus:outline-none focus:underline disabled:opacity-90"
                    />
                    <select
                      disabled={!isSuperAdmin}
                      value={member.role}
                      onChange={(e) => applyRoleChange(member, e.target.value as TeamRole)}
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
                  <button
                    type="button"
                    onClick={() => {
                      setActiveAdminUserId(member.id);
                      showTempNotice(`Operando painel agora como ${member.name} (${member.role}).`);
                    }}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'border border-white/15 text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    {isCurrent ? 'Ativo' : 'Testar Perfil'}
                  </button>

                  {canManageUsers && (
                    <button
                      type="button"
                      onClick={() => openEditProfileModal(member)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#fa6607]/45 bg-[#fa6607]/15 px-2.5 py-1.5 text-[11px] font-semibold text-[#fa6607] hover:bg-[#fa6607] hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Editar
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

                  {isSuperAdmin && teamMembers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteTeamMember(member.id)}
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
                <div className="flex items-center gap-1.5 justify-between sm:justify-end">
                  <span className="inline-flex items-center gap-1 font-mono text-zinc-400">
                    <KeyRound className="h-3 w-3" aria-hidden="true" />
                    {member.password}
                  </span>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!isSuperAdmin}
                      checked={member.active}
                      onChange={(e) => updateTeamMember(member.id, { active: e.target.checked })}
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

      {/* Full User Profile Editor Modal */}
      {editingProfileDraft && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-user-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <form
            onSubmit={handleSaveProfileDraft}
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-[#fa6607]/40 bg-[#121215] p-6 shadow-2xl space-y-5"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#fa6607]">
                  <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                  Editar Cadastro &amp; Hierarquia de Usuário
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
                <label className="inline-flex items-center gap-2 pt-1 text-xs text-zinc-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProfileDraft.active}
                    onChange={(e) =>
                      setEditingProfileDraft({ ...editingProfileDraft, active: e.target.checked })
                    }
                    className="accent-[#fa6607]"
                  />
                  <span>Usuário Ativo no Sistema</span>
                </label>
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
                        setEditingProfileDraft({ ...editingProfileDraft, department: e.target.value })
                      }
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                    />
                  </div>
                </div>

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

                {applyRolePresetOnSave && (
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

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">E-mail de Login *</label>
                    <input
                      type="email"
                      required
                      value={editingProfileDraft.email}
                      onChange={(e) =>
                        setEditingProfileDraft({ ...editingProfileDraft, email: e.target.value })
                      }
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                    />
                  </div>
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
                    <label className="block text-xs text-zinc-400 mb-1">Senha de Acesso</label>
                    <input
                      type="text"
                      value={editingProfileDraft.password}
                      onChange={(e) =>
                        setEditingProfileDraft({ ...editingProfileDraft, password: e.target.value })
                      }
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Empresa Cliente Vinculada (opcional — para perfil Cliente / Anunciante)
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-5 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  Salvar Alterações
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Granular Permissions Editor Modal (Super Admin Only) */}
      {editingMember && (
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
                    updateTeamMember(editingMember.id, {
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
                  value={editingMember.linkedClientName || ''}
                  onChange={(e) =>
                    updateTeamMember(editingMember.id, {
                      linkedClientName: e.target.value || undefined,
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
                        onChange={() => toggleCrudPermission(editingMember, key)}
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
                      updateTeamMember(editingMember.id, { allowedModules: [...ALL_ADMIN_TABS] })
                    }
                    className="text-[11px] text-[#FF6600] hover:underline cursor-pointer"
                  >
                    Liberar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRoleChange(editingMember, editingMember.role)}
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
                        onChange={() => toggleModulePermission(editingMember, tabId)}
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
                  showTempNotice('Permissões salvas com sucesso.');
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
          Super Admin tem liberdade total para criar, editar, aprovar e excluir usuários, matérias, contratos e cadastros. Clientes cadastrados como Nível 6 enxergam apenas sua área de veiculações e aprovações.
        </span>
      </div>
    </div>
  );
};
