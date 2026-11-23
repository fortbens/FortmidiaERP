import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookmarkCheck,
  Check,
  Edit3,
  ExternalLink,
  Eye,
  Layers,
  Lock,
  Newspaper,
  Plus,
  RefreshCw,
  Save,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  GlobalLayoutPreset,
  GlobalLayoutPresetCategory,
  GlobalPresetScope,
} from '../../types/fortmidia';
import { MediaFrame } from '../MediaFrame';

interface PresetsManagerModuleProps {
  onPreviewPortal: () => void;
  onOpenFortNewsPortal?: () => void;
}

const CATEGORIES: GlobalLayoutPresetCategory[] = [
  'Oficial Grupo',
  'Portal FortNews',
  'Campanha Sazonal',
  'Operacional Equipe',
];

export const PresetsManagerModule: React.FC<PresetsManagerModuleProps> = ({
  onPreviewPortal,
  onOpenFortNewsPortal,
}) => {
  const {
    siteSettings,
    newsPortalSettings,
    popupConfig,
    globalLayoutPresets,
    activeGlobalPresetId,
    onlySuperAdminCreatesGlobalPresets,
    teamMembers,
    activeAdminUserId,
    saveGlobalLayoutPreset,
    updateGlobalPresetMeta,
    loadGlobalLayoutPreset,
    toggleGlobalLayoutPresetLock,
    deleteGlobalLayoutPreset,
    setOnlySuperAdminCreatesGlobalPresets,
  } = useFortMidia();

  const activeOperator =
    teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];

  const isSuperAdmin =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1;

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | GlobalLayoutPresetCategory>('Todas');
  const [lockFilter, setLockFilter] = useState<'all' | 'protected' | 'editable'>('all');

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    activeGlobalPresetId || globalLayoutPresets[0]?.id || ''
  );

  // Create / Edit form states
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<GlobalLayoutPresetCategory>('Oficial Grupo');
  const [formLockBySuperAdmin, setFormLockBySuperAdmin] = useState(true);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const pushFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => {
      setFeedback((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const canCreatePreset = isSuperAdmin || !onlySuperAdminCreatesGlobalPresets;

  const isRecordProtectedForUser = (preset: GlobalLayoutPreset): boolean =>
    !isSuperAdmin && (preset.definedBySuperAdmin || preset.lockedBySuperAdmin);

  const filteredPresets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return globalLayoutPresets.filter((p) => {
      if (categoryFilter !== 'Todas' && p.category !== categoryFilter) return false;
      if (lockFilter === 'protected' && !(p.definedBySuperAdmin || p.lockedBySuperAdmin)) {
        return false;
      }
      if (lockFilter === 'editable' && (p.definedBySuperAdmin || p.lockedBySuperAdmin)) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.createdBy.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [globalLayoutPresets, searchQuery, categoryFilter, lockFilter]);

  const inspectedPreset =
    globalLayoutPresets.find((p) => p.id === selectedPresetId) ||
    filteredPresets[0] ||
    globalLayoutPresets[0] ||
    null;

  const activePreset = globalLayoutPresets.find((p) => p.id === activeGlobalPresetId) || null;
  const protectedCount = globalLayoutPresets.filter(
    (p) => p.definedBySuperAdmin || p.lockedBySuperAdmin
  ).length;

  const openNewPresetForm = () => {
    if (!canCreatePreset) {
      pushFeedback(
        'error',
        'Modo restrito ativo: apenas o Super Admin pode salvar novos presets globais.'
      );
      return;
    }
    setEditingPresetId(null);
    setFormName('');
    setFormDescription('');
    setFormCategory(isSuperAdmin ? 'Oficial Grupo' : 'Operacional Equipe');
    setFormLockBySuperAdmin(isSuperAdmin);
    setShowSaveForm(true);
  };

  const openEditMetaForm = (preset: GlobalLayoutPreset) => {
    if (isRecordProtectedForUser(preset)) {
      pushFeedback(
        'error',
        'Ação bloqueada: usuários comuns não podem alterar registros definidos pelo Super Admin.'
      );
      return;
    }
    setEditingPresetId(preset.id);
    setFormName(preset.name);
    setFormDescription(preset.description);
    setFormCategory(preset.category);
    setFormLockBySuperAdmin(preset.lockedBySuperAdmin);
    setShowSaveForm(true);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      pushFeedback('error', 'Informe um nome para o preset de layout.');
      return;
    }

    if (editingPresetId) {
      const res = updateGlobalPresetMeta(editingPresetId, {
        name: formName.trim(),
        description: formDescription.trim(),
        category: formCategory,
      });
      if (!res.ok) {
        pushFeedback('error', res.error || 'Não foi possível atualizar o preset.');
        return;
      }
      setShowSaveForm(false);
      setEditingPresetId(null);
      pushFeedback('success', `Metadados do preset "${formName.trim()}" atualizados.`);
      return;
    }

    const res = saveGlobalLayoutPreset({
      name: formName.trim(),
      description: formDescription.trim(),
      category: formCategory,
      lockRecord: isSuperAdmin ? formLockBySuperAdmin : false,
    });

    if (!res.ok) {
      pushFeedback('error', res.error || 'Não foi possível salvar o preset.');
      return;
    }

    if (res.preset) {
      setSelectedPresetId(res.preset.id);
    }
    setShowSaveForm(false);
    setFormName('');
    setFormDescription('');
    pushFeedback(
      'success',
      `Preset "${res.preset?.name}" salvo com as configurações de layout globais atuais.`
    );
  };

  const handleOverwriteWithCurrent = (preset: GlobalLayoutPreset) => {
    if (isRecordProtectedForUser(preset)) {
      pushFeedback(
        'error',
        'Registro protegido: apenas o Super Admin pode sobrescrever este preset.'
      );
      return;
    }

    const res = saveGlobalLayoutPreset({
      id: preset.id,
      name: preset.name,
      description: preset.description,
      category: preset.category,
      lockRecord: preset.lockedBySuperAdmin,
    });

    if (!res.ok) {
      pushFeedback('error', res.error || 'Falha ao atualizar snapshot do preset.');
      return;
    }

    pushFeedback(
      'success',
      `Snapshot do preset "${preset.name}" atualizado com o layout global atual.`
    );
  };

  const handleLoadPreset = (preset: GlobalLayoutPreset, scope: GlobalPresetScope = 'all') => {
    const res = loadGlobalLayoutPreset(preset.id, scope);
    if (!res.ok) {
      pushFeedback('error', res.error || 'Erro ao carregar preset.');
      return;
    }

    setSelectedPresetId(preset.id);
    const scopeText: Record<GlobalPresetScope, string> = {
      all: 'todos os portais (FortMídia, FortNews e Pop-up)',
      fortmidia: 'Site FortMídia',
      fortnews: 'Portal Jornal FortNews',
      popup: 'Pop-up Global',
    };
    pushFeedback('success', `Preset "${preset.name}" carregado em ${scopeText[scope]}.`);
  };

  const handleToggleLock = (preset: GlobalLayoutPreset) => {
    const res = toggleGlobalLayoutPresetLock(preset.id);
    if (!res.ok) {
      pushFeedback('error', res.error || 'Somente o Super Admin pode alterar a trava.');
      return;
    }
    pushFeedback(
      'success',
      preset.lockedBySuperAdmin
        ? `Preset "${preset.name}" destravado pelo Super Admin.`
        : `Preset "${preset.name}" travado contra alterações de usuários comuns.`
    );
  };

  const handleDeletePreset = (preset: GlobalLayoutPreset) => {
    const res = deleteGlobalLayoutPreset(preset.id);
    if (!res.ok) {
      pushFeedback('error', res.error || 'Não foi possível excluir este preset.');
      return;
    }
    if (selectedPresetId === preset.id) {
      const fallback = globalLayoutPresets.find((p) => p.id !== preset.id);
      if (fallback) setSelectedPresetId(fallback.id);
    }
    pushFeedback('success', `Preset "${preset.name}" removido do catálogo.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">
            Gerenciador de Presets &amp; Layout Global
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Salve, liste e carregue configurações globais do Site FortMídia, Portal Jornal FortNews e Pop-up com proteção de escrita para registros do Super Admin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openNewPresetForm}
            disabled={!canCreatePreset}
            className="inline-flex items-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Salvar Layout Atual como Preset
          </button>
        </div>
      </div>

      {/* Super Admin Governance & Permission Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111114] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {isSuperAdmin ? (
            <Shield className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <Lock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">
              {isSuperAdmin
                ? `Governança Ativa: ${activeOperator?.name || 'Super Admin'} (${activeOperator?.role || 'Super Admin / Diretoria'})`
                : `Perfil Operacional: ${activeOperator?.name || 'Usuário'} (${activeOperator?.role || 'Equipe'})`}
            </div>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              {isSuperAdmin
                ? 'Você tem permissão irrestrita para salvar, sobrescrever, travar, destravar e excluir qualquer preset global.'
                : 'Você pode listar, inspecionar e carregar presets aprovados. Registros definidos ou travados pelo Super Admin são somente leitura.'}
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <label className="inline-flex items-center gap-2.5 rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={onlySuperAdminCreatesGlobalPresets}
              onChange={(e) => {
                setOnlySuperAdminCreatesGlobalPresets(e.target.checked);
                pushFeedback(
                  'success',
                  e.target.checked
                    ? 'Modo estrito ativado: apenas o Super Admin pode salvar ou excluir presets.'
                    : 'Modo colaborativo ativado: usuários comuns podem salvar rascunhos próprios, mas continuam bloqueados nos presets do Super Admin.'
                );
              }}
              className="h-4 w-4 accent-[#FF6600]"
            />
            <span className="whitespace-nowrap">Somente Super Admin cria novos presets</span>
          </label>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs ${
            feedback.type === 'success'
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200'
              : 'border-red-500/35 bg-red-500/10 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {feedback.type === 'success' ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Fechar aviso"
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 4-Column KPI Summary Strip (Tabular Numerals) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-[11px] text-zinc-400">Presets Globais Salvos</div>
          <div className="mt-1 font-mono text-2xl font-bold text-white tabular-nums">
            {globalLayoutPresets.length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-[11px] text-zinc-400">Protegidos pelo Super Admin</div>
          <div className="mt-1 font-mono text-2xl font-bold text-[#D4AF37] tabular-nums">
            {protectedCount}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-[11px] text-zinc-400">Logos Ativas (FortMídia / FortNews)</div>
          <div className="mt-1 font-mono text-lg font-bold text-white tabular-nums">
            {siteSettings.logoHeightPx || 48}px / {newsPortalSettings.logoHeightPx || 46}px
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-[11px] text-zinc-400">Preset Ativo no Momento</div>
          <div className="mt-1 truncate text-sm font-semibold text-[#FF6600]">
            {activePreset?.name || 'Configuração Personalizada'}
          </div>
        </div>
      </div>

      {/* Save / Edit Preset Panel */}
      {showSaveForm && (
        <form
          onSubmit={handleSaveSubmit}
          className="rounded-xl border border-[#FF6600]/40 bg-[#111114] p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="font-display text-sm font-bold text-white">
              {editingPresetId
                ? 'Editar Identificação do Preset'
                : 'Capturar Layout Global Atual como Novo Preset'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowSaveForm(false);
                setEditingPresetId(null);
              }}
              className="text-zinc-400 hover:text-white cursor-pointer"
              aria-label="Cancelar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-6">
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Nome do Preset Global *
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex.: Padrão Black Friday CIMBAJU 2026"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Categoria do Registro
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as GlobalLayoutPresetCategory)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {isSuperAdmin && !editingPresetId && (
              <div className="md:col-span-2 flex items-end">
                <label className="flex w-full items-center gap-2 rounded-lg border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-2 text-xs text-[#D4AF37] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formLockBySuperAdmin}
                    onChange={(e) => setFormLockBySuperAdmin(e.target.checked)}
                    className="h-4 w-4 accent-[#D4AF37]"
                  />
                  <span className="truncate font-medium">Travar p/ Equipe</span>
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Descrição do Layout &amp; Finalidade
            </label>
            <textarea
              rows={2}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Descreva cores, proporção das logos, visibilidade de preços e quando aplicar este preset..."
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            />
          </div>

          {!editingPresetId && (
            <div className="rounded-lg border border-white/10 bg-[#0A0A0A] px-4 py-3 text-[11px] text-zinc-400 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Site FortMídia: <strong className="text-white">{siteSettings.primaryColor}</strong> · Logo{' '}
                <strong className="font-mono text-white tabular-nums">{siteSettings.logoHeightPx || 48}px</strong> · Preços{' '}
                <strong className="text-white">{siteSettings.showPublicPrices ? 'Visíveis' : siteSettings.consultPriceLabel}</strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Jornal FortNews: <strong className="text-white">{newsPortalSettings.primaryColor}</strong> · Logo{' '}
                <strong className="font-mono text-white tabular-nums">{newsPortalSettings.logoHeightPx}px</strong> ({newsPortalSettings.logoFitMode})
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Pop-up: <strong className="text-white">{popupConfig.enabled ? 'Ativo' : 'Desativado'}</strong>
              </span>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowSaveForm(false);
                setEditingPresetId(null);
              }}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              {editingPresetId ? 'Salvar Alterações' : 'Salvar Preset Global'}
            </button>
          </div>
        </form>
      )}

      {/* Search & Segmented Filter Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#111114] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar preset por nome, categoria ou autor..."
            className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] pl-9 pr-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-[#0A0A0A] p-1">
            {(['Todas', ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-[#FF6600] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0A0A0A] p-1">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'protected', label: 'Protegidos' },
              { id: 'editable', label: 'Editáveis' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setLockFilter(item.id as 'all' | 'protected' | 'editable')}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  lockFilter === item.id
                    ? 'bg-white/15 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Split: Presets List + Global Layout Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Presets List */}
        <div className="lg:col-span-7 space-y-3">
          {filteredPresets.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#111114] p-8 text-center space-y-3">
              <Layers className="mx-auto h-8 w-8 text-zinc-600" aria-hidden="true" />
              <div className="text-sm font-semibold text-white">
                Nenhum preset global encontrado para este filtro
              </div>
              <p className="text-xs text-zinc-400">
                Ajuste sua busca ou salve a configuração atual dos sites como um novo preset global.
              </p>
              {canCreatePreset && (
                <button
                  type="button"
                  onClick={openNewPresetForm}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Criar Primeiro Preset
                </button>
              )}
            </div>
          ) : (
            filteredPresets.map((preset) => {
              const isSelected = inspectedPreset?.id === preset.id;
              const isActiveLive = activeGlobalPresetId === preset.id;
              const isProtected = preset.definedBySuperAdmin || preset.lockedBySuperAdmin;
              const blockedForUser = isRecordProtectedForUser(preset);

              return (
                <div
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`rounded-xl border p-4 transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#FF6600] bg-[#151519]'
                      : 'border-white/10 bg-[#111114] hover:border-white/25'
                  }`}
                >
                  {/* Top Row: Title & Protection Label */}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-sm font-bold text-white truncate">
                          {preset.name}
                        </h3>
                        {isActiveLive && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 whitespace-nowrap shrink-0">
                            <BookmarkCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            Aplicado Agora
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-400">
                        <span>{preset.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>Por {preset.createdBy}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{preset.updatedAt}</span>
                      </div>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap shrink-0 ${
                        isProtected ? 'text-[#D4AF37]' : 'text-emerald-400'
                      }`}
                    >
                      {isProtected ? (
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {isProtected
                          ? 'Protegido · Super Admin'
                          : 'Editável pela Equipe'}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                    {preset.description}
                  </p>

                  {/* Compact Visual Swatch & Dimension Summary (Unboxed Hairline Dividers) */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-white/10 pt-3 text-[11px] text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded border border-white/20 shrink-0"
                        style={{ backgroundColor: preset.siteSettings.primaryColor }}
                        title={`Cor FortMídia: ${preset.siteSettings.primaryColor}`}
                      />
                      <span>
                        FortMídia{' '}
                        <strong className="font-mono text-zinc-200 tabular-nums">
                          {preset.siteSettings.logoHeightPx || 48}px
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded border border-white/20 shrink-0"
                        style={{ backgroundColor: preset.newsPortalSettings.primaryColor }}
                        title={`Cor FortNews: ${preset.newsPortalSettings.primaryColor}`}
                      />
                      <span>
                        FortNews{' '}
                        <strong className="font-mono text-zinc-200 tabular-nums">
                          {preset.newsPortalSettings.logoHeightPx}px
                        </strong>{' '}
                        ({preset.newsPortalSettings.logoFitMode})
                      </span>
                    </div>

                    <span>
                      Vitrine:{' '}
                      <strong className="text-zinc-200">
                        {preset.siteSettings.showPublicPrices
                          ? 'Preços Visíveis'
                          : `Modo "${preset.siteSettings.consultPriceLabel || 'Consulte'}"`}
                      </strong>
                    </span>
                  </div>

                  {/* Action Controls */}
                  <div
                    className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => handleLoadPreset(preset, 'all')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                      Carregar Layout Global
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={blockedForUser}
                        onClick={() => handleOverwriteWithCurrent(preset)}
                        title={
                          blockedForUser
                            ? 'Bloqueado: apenas o Super Admin pode sobrescrever este registro'
                            : 'Atualizar este preset com as configurações atuais dos portais'
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
                        Atualizar
                      </button>

                      <button
                        type="button"
                        disabled={blockedForUser}
                        onClick={() => openEditMetaForm(preset)}
                        title={
                          blockedForUser
                            ? 'Bloqueado: apenas o Super Admin pode editar este registro'
                            : 'Editar nome e descrição'
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Edit3 className="h-3 w-3" aria-hidden="true" />
                        Editar
                      </button>

                      {isSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => handleToggleLock(preset)}
                          title={
                            preset.lockedBySuperAdmin
                              ? 'Destravar preset para edição da equipe'
                              : 'Travar preset (somente Super Admin)'
                          }
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                            preset.lockedBySuperAdmin
                              ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#D4AF37]'
                              : 'border-white/15 bg-[#0A0A0A] text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          {preset.lockedBySuperAdmin ? (
                            <Lock className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <Unlock className="h-3 w-3" aria-hidden="true" />
                          )}
                          {preset.lockedBySuperAdmin ? 'Travado' : 'Travar'}
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={blockedForUser || globalLayoutPresets.length <= 1}
                        onClick={() => handleDeletePreset(preset)}
                        title={
                          blockedForUser
                            ? 'Bloqueado: apenas o Super Admin pode excluir este registro'
                            : 'Excluir preset'
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden="true" />
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Detailed Visual & Technical Inspector */}
        <div className="lg:col-span-5 rounded-xl border border-white/10 bg-[#111114] p-5 space-y-5 lg:sticky lg:top-20">
          {inspectedPreset ? (
            <>
              <div className="border-b border-white/10 pb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-[#D4AF37]">
                    Inspetor de Layout Global
                  </div>
                  <h2 className="mt-0.5 font-display text-base font-bold text-white truncate">
                    {inspectedPreset.name}
                  </h2>
                </div>
                {(inspectedPreset.definedBySuperAdmin || inspectedPreset.lockedBySuperAdmin) && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[#D4AF37] shrink-0"
                    title="Registro protegido pelo Super Admin"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                    Somente Super Admin
                  </span>
                )}
              </div>

              {/* Dual Portal Visual Miniature Preview */}
              <div className="space-y-3">
                {/* FortMídia Mini Header Preview */}
                <div
                  className="rounded-lg border border-white/10 p-3 space-y-2"
                  style={{ backgroundColor: inspectedPreset.siteSettings.backgroundColor }}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                    {inspectedPreset.siteSettings.logoMode === 'image' &&
                    inspectedPreset.siteSettings.logoUrl ? (
                      <MediaFrame
                        src={inspectedPreset.siteSettings.logoUrl}
                        alt="Logo FortMídia no preset"
                        style={{
                          height: `${Math.min(
                            64,
                            Math.max(24, Math.round((inspectedPreset.siteSettings.logoHeightPx || 48) * 0.65))
                          )}px`,
                        }}
                        className="w-auto max-w-[180px] object-contain"
                      />
                    ) : (
                      <span className="font-display text-xs font-bold text-white">
                        {inspectedPreset.siteSettings.brandName}{' '}
                        <span style={{ color: inspectedPreset.siteSettings.primaryColor }}>
                          {inspectedPreset.siteSettings.brandHighlight}
                        </span>
                      </span>
                    )}
                    <span
                      className="rounded px-2 py-1 text-[10px] font-semibold text-white"
                      style={{ backgroundColor: inspectedPreset.siteSettings.primaryColor }}
                    >
                      {inspectedPreset.siteSettings.heroPrimaryCta}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white truncate">
                    {inspectedPreset.siteSettings.heroHeadline}
                  </div>
                </div>

                {/* Portal FortNews Mini Masthead Preview */}
                <div className="overflow-hidden rounded-lg border border-white/10 bg-white">
                  <div
                    className="flex items-center gap-3 px-3 py-2 text-white"
                    style={{ backgroundColor: inspectedPreset.newsPortalSettings.primaryColor }}
                  >
                    <div
                      className="overflow-hidden rounded bg-white p-0.5 shrink-0 flex items-center justify-center"
                      style={{
                        height: `${Math.min(
                          56,
                          Math.max(24, Math.round(inspectedPreset.newsPortalSettings.logoHeightPx * 0.65))
                        )}px`,
                        width:
                          inspectedPreset.newsPortalSettings.logoFitMode === 'wide'
                            ? `${Math.min(
                                140,
                                Math.round(inspectedPreset.newsPortalSettings.logoHeightPx * 0.65 * 2.4)
                              )}px`
                            : inspectedPreset.newsPortalSettings.logoFitMode === 'auto'
                              ? 'auto'
                              : `${Math.min(
                                  56,
                                  Math.round(inspectedPreset.newsPortalSettings.logoHeightPx * 0.65)
                                )}px`,
                      }}
                    >
                      <MediaFrame
                        src={inspectedPreset.newsPortalSettings.logoUrl}
                        alt="Logo FortNews no preset"
                        className={
                          inspectedPreset.newsPortalSettings.logoFitMode === 'auto'
                            ? 'h-full w-auto object-contain'
                            : 'h-full w-full object-contain'
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-none truncate">
                        {inspectedPreset.newsPortalSettings.portalName}
                      </div>
                      <div className="mt-0.5 text-[10px] text-white/80 truncate">
                        {inspectedPreset.newsPortalSettings.portalTagline}
                      </div>
                    </div>
                  </div>
                  <div
                    className="px-3 py-1 text-[10px] font-medium text-white truncate"
                    style={{ backgroundColor: inspectedPreset.newsPortalSettings.secondaryColor }}
                  >
                    Break News · Cidade &amp; Política · Esporte · Tempo
                  </div>
                </div>
              </div>

              {/* Technical Spec Grid */}
              <div className="divide-y divide-white/10 rounded-lg border border-white/10 bg-[#0A0A0A] text-xs">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-zinc-400">Logo FortMídia</span>
                  <span className="font-mono text-white tabular-nums">
                    {inspectedPreset.siteSettings.logoHeightPx || 48}px ·{' '}
                    {inspectedPreset.siteSettings.logoMode === 'image' ? 'Imagem' : 'Texto'}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-zinc-400">Logo Jornal FortNews</span>
                  <span className="font-mono text-white tabular-nums">
                    {inspectedPreset.newsPortalSettings.logoHeightPx}px ·{' '}
                    {inspectedPreset.newsPortalSettings.logoFitMode}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-zinc-400">Preços Públicos na Vitrine</span>
                  <span className="font-medium text-white">
                    {inspectedPreset.siteSettings.showPublicPrices
                      ? 'Exibir Valores'
                      : `Ocultos ("${inspectedPreset.siteSettings.consultPriceLabel || 'Consulte'}")`}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-zinc-400">Legenda Circulante (Ticker)</span>
                  <span className="font-mono text-white tabular-nums">
                    {inspectedPreset.newsPortalSettings.marqueeTickerEnabled
                      ? `Ativa (${inspectedPreset.newsPortalSettings.marqueeSpeedSeconds}s)`
                      : 'Desativada'}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-zinc-400">Pop-up Promocional</span>
                  <span className="text-white">
                    {inspectedPreset.popupConfig.enabled
                      ? `Ativo (${inspectedPreset.popupConfig.delaySeconds}s)`
                      : 'Desativado'}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-zinc-400">Última Edição</span>
                  <span className="font-mono text-zinc-300 tabular-nums">
                    {inspectedPreset.updatedBy} · {inspectedPreset.updatedAt}
                  </span>
                </div>
              </div>

              {/* Granular Load Actions */}
              <div className="space-y-2">
                <div className="text-[11px] font-medium text-zinc-400">
                  Carregar Configuração nos Portais
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadPreset(inspectedPreset, 'all')}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                >
                  <Layers className="h-4 w-4" aria-hidden="true" />
                  Carregar Preset Completo (Tudo)
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadPreset(inspectedPreset, 'fortmidia')}
                    className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-2 text-[11px] font-medium text-zinc-200 hover:bg-white/5 cursor-pointer truncate"
                  >
                    Só FortMídia
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset(inspectedPreset, 'fortnews')}
                    className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-2 text-[11px] font-medium text-zinc-200 hover:bg-white/5 cursor-pointer truncate"
                  >
                    Só FortNews
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset(inspectedPreset, 'popup')}
                    className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-2 text-[11px] font-medium text-zinc-200 hover:bg-white/5 cursor-pointer truncate"
                  >
                    Só Pop-up
                  </button>
                </div>
              </div>

              {/* Quick Portal Verification Buttons */}
              <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={onPreviewPortal}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
                >
                  <Eye className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                  Ver Site FortMídia
                </button>
                {onOpenFortNewsPortal && (
                  <button
                    type="button"
                    onClick={onOpenFortNewsPortal}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#fa6607]/40 bg-[#fa6607]/15 px-3 py-2 text-xs font-medium text-white hover:bg-[#fa6607]/25 cursor-pointer whitespace-nowrap"
                  >
                    <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                    Ver Jornal FortNews
                    <ExternalLink className="h-3 w-3 opacity-70" aria-hidden="true" />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-zinc-500">
              Selecione um preset à esquerda para inspecionar e carregar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
