import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  MapPin,
  Package,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import {
  BudgetItemCategory,
  CimbajuCity,
  OutdoorAvailability,
  OutdoorLighting,
} from '../../types/fortmidia';
import {
  downloadOutdoorInventoryPdf,
  downloadPriceTablePdf,
} from '../../utils/pdfGenerator';
import { OutdoorMapView } from './OutdoorMapView';

type SubTab = 'catalogo' | 'outdoors';

const BUDGET_CATEGORIES: BudgetItemCategory[] = [
  'Redes Sociais & Story',
  'Podcast & Estúdio',
  'Mídia Exterior (Outdoors 9x3m)',
  'Portal & Impressos',
  'FortTech & Soluções IA',
  'Eventos & Outros',
];

const OUTDOOR_AVAILABILITIES: OutdoorAvailability[] = [
  'Disponível',
  'Reservado',
  'Ocupado',
  'Em Manutenção',
];

const OUTDOOR_LIGHTINGS: OutdoorLighting[] = [
  'Iluminado (Frontlight)',
  'Convencional (Lona)',
  'Painel LED Digital',
];

const DIMENSION_PRESETS = ['9x3m', '6x3m', '10x4m', 'Painel LED 4x2m', 'Empena 12x6m'];

function formatBRL(val: number): string {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const CatalogOutdoorModule: React.FC = () => {
  const {
    budgetCatalog,
    outdoorPoints,
    quotas,
    siteSettings,
    addCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    updateQuota,
    addOutdoorPoint,
    updateOutdoorPoint,
    deleteOutdoorPoint,
  } = useFortMidia();

  const [subTab, setSubTab] = useState<SubTab>('catalogo');
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const mapSectionRef = useRef<HTMLDivElement | null>(null);

  // Catalog form state
  const [showNewCatalogForm, setShowNewCatalogForm] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [catCategoryFilter, setCatCategoryFilter] = useState<'Todas' | BudgetItemCategory>('Todas');
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState<BudgetItemCategory>('Redes Sociais & Story');
  const [newProdUnitLabel, setNewProdUnitLabel] = useState('mês');
  const [newProdUnitValue, setNewProdUnitValue] = useState('1500');
  const [newProdPeriod, setNewProdPeriod] = useState('30 dias');
  const [newProdDesc, setNewProdDesc] = useState('');

  // Outdoor form & filters state
  const [showNewOutdoorForm, setShowNewOutdoorForm] = useState(false);
  const [outSearch, setOutSearch] = useState('');
  const [outAvailFilter, setOutAvailFilter] = useState<'Todos' | OutdoorAvailability>('Todos');
  const [outCityFilter, setOutCityFilter] = useState<'Todas' | CimbajuCity>('Todas');

  const [outCode, setOutCode] = useState('');
  const [outTitle, setOutTitle] = useState('');
  const [outAddress, setOutAddress] = useState('');
  const [outCity, setOutCity] = useState<CimbajuCity>('Franco da Rocha');
  const [outDimensions, setOutDimensions] = useState('9x3m');
  const [outLighting, setOutLighting] = useState<OutdoorLighting>('Iluminado (Frontlight)');
  const [outPrice, setOutPrice] = useState('3600');
  const [outAvailability, setOutAvailability] = useState<OutdoorAvailability>('Disponível');
  const [outAdvertiser, setOutAdvertiser] = useState('');
  const [outAvailableFrom, setOutAvailableFrom] = useState('');
  const [outNotes, setOutNotes] = useState('');
  const [outLat, setOutLat] = useState('-23.3219');
  const [outLng, setOutLng] = useState('-46.7272');
  const [selectedMapPointId, setSelectedMapPointId] = useState<string | null>(null);
  const [pickCoordsOnMap, setPickCoordsOnMap] = useState(false);

  const showTempNotice = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const filteredCatalog = useMemo(() => {
    const q = catSearch.trim().toLowerCase();
    return budgetCatalog.filter((item) => {
      const mCat = catCategoryFilter === 'Todas' || item.category === catCategoryFilter;
      const mQuery =
        !q ||
        item.productName.toLowerCase().includes(q) ||
        item.defaultDescription.toLowerCase().includes(q);
      return mCat && mQuery;
    });
  }, [budgetCatalog, catSearch, catCategoryFilter]);

  const filteredOutdoors = useMemo(() => {
    const q = outSearch.trim().toLowerCase();
    return outdoorPoints.filter((o) => {
      const mAvail = outAvailFilter === 'Todos' || o.availability === outAvailFilter;
      const mCity = outCityFilter === 'Todas' || o.city === outCityFilter;
      const mQuery =
        !q ||
        o.code.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        (o.currentAdvertiser ?? '').toLowerCase().includes(q);
      return mAvail && mCity && mQuery;
    });
  }, [outdoorPoints, outSearch, outAvailFilter, outCityFilter]);

  // Outdoor KPIs
  const totalOutdoors = outdoorPoints.length;
  const availableOutdoors = outdoorPoints.filter((o) => o.availability === 'Disponível').length;
  const reservedOutdoors = outdoorPoints.filter((o) => o.availability === 'Reservado').length;
  const occupiedOutdoors = outdoorPoints.filter((o) => o.availability === 'Ocupado').length;
  const potentialCycleRevenue = outdoorPoints.reduce((s, o) => s + o.bimonthlyPrice, 0);

  const handleCreateCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) return;
    addCatalogItem({
      productName: newProdName.trim(),
      category: newProdCategory,
      defaultUnitLabel: newProdUnitLabel.trim() || 'unidade',
      defaultUnitValue: Math.max(0, Number(newProdUnitValue) || 0),
      defaultPeriodLabel: newProdPeriod.trim() || '30 dias',
      defaultDescription:
        newProdDesc.trim() || 'Serviço comercial personalizado do Grupo FortMídia.',
    });
    setNewProdName('');
    setNewProdDesc('');
    setShowNewCatalogForm(false);
    showTempNotice('Produto/serviço adicionado à tabela oficial e sincronizado com Orçamentos.');
  };

  const handleCreateOutdoor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outTitle.trim() || !outAddress.trim()) return;
    const autoCode = `OUT-${outCity.slice(0, 3).toUpperCase()}-${String(outdoorPoints.length + 1).padStart(2, '0')}`;
    addOutdoorPoint({
      code: outCode.trim() || autoCode,
      title: outTitle.trim(),
      address: outAddress.trim(),
      city: outCity,
      lat: Number(outLat) || -23.3219,
      lng: Number(outLng) || -46.7272,
      dimensions: outDimensions.trim() || '9x3m',
      lighting: outLighting,
      bimonthlyPrice: Math.max(0, Number(outPrice) || 0),
      availability: outAvailability,
      currentAdvertiser: outAdvertiser.trim() || undefined,
      availableFrom: outAvailableFrom || undefined,
      notes: outNotes.trim() || undefined,
    });
    setOutCode('');
    setOutTitle('');
    setOutAddress('');
    setOutAdvertiser('');
    setOutAvailableFrom('');
    setOutNotes('');
    setPickCoordsOnMap(false);
    setShowNewOutdoorForm(false);
    showTempNotice('Novo ponto de Outdoor cadastrado no inventário OOH e pin adicionado ao mapa.');
  };

  const handleDownloadCatalogPdf = async () => {
    setPdfBusy('catalogo');
    try {
      await downloadPriceTablePdf(budgetCatalog, siteSettings);
      showTempNotice('PDF da Tabela Oficial de Preços gerado e baixado.');
    } finally {
      setPdfBusy(null);
    }
  };

  const handleDownloadOutdoorsPdf = async () => {
    setPdfBusy('outdoors');
    try {
      await downloadOutdoorInventoryPdf(outdoorPoints, siteSettings);
      showTempNotice('PDF do Mapa de Outdoors OOH gerado e baixado.');
    } finally {
      setPdfBusy(null);
    }
  };

  const availBadgeStyle = (avail: OutdoorAvailability) => {
    switch (avail) {
      case 'Disponível':
        return 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300';
      case 'Reservado':
        return 'border-yellow-400/50 bg-yellow-400/15 text-yellow-300';
      case 'Ocupado':
        return 'border-red-500/50 bg-red-500/15 text-red-400';
      default:
        return 'border-zinc-500/40 bg-zinc-500/10 text-zinc-300';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header + Sub-tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Produtos, Tabela de Preços & Outdoors OOH
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Cadastre serviços, ajuste valores da tabela comercial (sincronizados com Orçamentos) e controle endereços, tamanhos e disponibilidade dos Outdoors.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#121215] p-1">
          <button
            type="button"
            onClick={() => setSubTab('catalogo')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              subTab === 'catalogo'
                ? 'bg-[#FF6600] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Package className="h-3.5 w-3.5" aria-hidden="true" />
            Serviços & Tabela de Preços
          </button>
          <button
            type="button"
            onClick={() => setSubTab('outdoors')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              subTab === 'outdoors'
                ? 'bg-[#FF6600] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Outdoors ({availableOutdoors}/{totalOutdoors} livres)
          </button>
        </div>
      </div>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs font-medium text-emerald-300">
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {/* ==================== SUB-TAB 1: SERVIÇOS, PRODUTOS & TABELA DE PREÇOS ==================== */}
      {subTab === 'catalogo' && (
        <div className="space-y-6">
          {/* Action bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#121215] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Buscar produto ou serviço..."
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] pl-9 pr-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>

              <select
                value={catCategoryFilter}
                onChange={(e) =>
                  setCatCategoryFilter(e.target.value as 'Todas' | BudgetItemCategory)
                }
                aria-label="Filtrar categoria"
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                <option value="Todas">Todas as Categorias</option>
                {BUDGET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadCatalogPdf}
                disabled={pdfBusy === 'catalogo'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                {pdfBusy === 'catalogo' ? 'Gerando PDF...' : 'Gerar PDF Tabela de Preços'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewCatalogForm((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {showNewCatalogForm ? 'Fechar Formulário' : 'Novo Serviço / Produto'}
              </button>
            </div>
          </div>

          {/* Add Catalog Product Form */}
          {showNewCatalogForm && (
            <form
              onSubmit={handleCreateCatalogItem}
              className="rounded-xl border border-[#FF6600]/40 bg-[#121215] p-6 space-y-4"
            >
              <div className="border-b border-white/10 pb-3">
                <h2 className="font-display text-sm font-semibold text-white">
                  Cadastrar Novo Serviço ou Produto na Tabela Oficial
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Nome do Serviço / Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="Ex.: Produção de Vídeo Institucional Drone 4K"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Categoria</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value as BudgetItemCategory)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  >
                    {BUDGET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Valor Tabela (R$) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newProdUnitValue}
                    onChange={(e) => setNewProdUnitValue(e.target.value)}
                    className="w-full rounded-lg border border-[#FF6600]/40 bg-[#0A0A0A] px-3 py-2 font-mono text-xs font-semibold text-white tabular-nums"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Unidade de Cobrança</label>
                  <input
                    type="text"
                    value={newProdUnitLabel}
                    onChange={(e) => setNewProdUnitLabel(e.target.value)}
                    placeholder="mês, hora, face, diária..."
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Prazo Padrão</label>
                  <input
                    type="text"
                    value={newProdPeriod}
                    onChange={(e) => setNewProdPeriod(e.target.value)}
                    placeholder="Ex.: 30 dias / Bimestral"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Descrição / Entregáveis</label>
                  <input
                    type="text"
                    value={newProdDesc}
                    onChange={(e) => setNewProdDesc(e.target.value)}
                    placeholder="O que está incluso na entrega..."
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewCatalogForm(false)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#FF6600] px-5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                >
                  Salvar na Tabela de Preços
                </button>
              </div>
            </form>
          )}

          {/* Inline Editable Catalog Table */}
          <div className="rounded-xl border border-white/10 bg-[#121215] overflow-hidden">
            <div className="border-b border-white/10 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-sm font-semibold text-white">
                  Tabela Oficial de Produtos & Serviços ({filteredCatalog.length})
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Qualquer alteração de preço aqui atualiza instantaneamente o seletor de Orçamentos & Planos de Mídia.
                </p>
              </div>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 grid gap-3 lg:grid-cols-12 lg:items-center hover:bg-white/[0.02]"
                >
                  <div className="lg:col-span-4 space-y-1.5">
                    <input
                      type="text"
                      value={item.productName}
                      onChange={(e) =>
                        updateCatalogItem(item.id, { productName: e.target.value })
                      }
                      aria-label="Nome do produto"
                      className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-xs font-semibold text-white focus:border-[#FF6600] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={item.defaultDescription}
                      onChange={(e) =>
                        updateCatalogItem(item.id, { defaultDescription: e.target.value })
                      }
                      aria-label="Descrição do produto"
                      className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-[11px] text-zinc-300 focus:border-[#FF6600] focus:outline-none"
                    />
                  </div>

                  <div className="lg:col-span-3">
                    <label className="block text-[10px] text-zinc-500 mb-1">Categoria</label>
                    <select
                      value={item.category}
                      onChange={(e) =>
                        updateCatalogItem(item.id, {
                          category: e.target.value as BudgetItemCategory,
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-zinc-200"
                    >
                      {BUDGET_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Unidade</label>
                      <input
                        type="text"
                        value={item.defaultUnitLabel}
                        onChange={(e) =>
                          updateCatalogItem(item.id, { defaultUnitLabel: e.target.value })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 mb-1">Prazo</label>
                      <input
                        type="text"
                        value={item.defaultPeriodLabel}
                        onChange={(e) =>
                          updateCatalogItem(item.id, { defaultPeriodLabel: e.target.value })
                        }
                        className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[10px] text-[#FF6600] font-medium mb-1">
                      Valor Tabela (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.defaultUnitValue}
                      onChange={(e) =>
                        updateCatalogItem(item.id, {
                          defaultUnitValue: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full rounded-lg border border-[#FF6600]/40 bg-[#0A0A0A] px-3 py-1.5 font-mono text-xs font-bold text-white tabular-nums focus:border-[#FF6600] focus:outline-none"
                    />
                  </div>

                  <div className="lg:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => deleteCatalogItem(item.id)}
                      aria-label={`Excluir ${item.productName}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vitrine Pública Quotas Price Sync */}
          <div className="rounded-xl border border-white/10 bg-[#121215] p-5 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="font-display text-sm font-semibold text-white">
                Valores Exibidos na Vitrine Pública do Site ({quotas.length} cotas)
              </h2>
              <p className="text-[11px] text-zinc-400">
                Edite diretamente o rótulo de preço exibido aos clientes na página inicial do Portal FortMídia.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {quotas.map((q) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4 space-y-2.5"
                >
                  <div className="text-xs font-semibold text-white">{q.title}</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="block text-[10px] text-[#D4AF37] mb-1">
                        Rótulo de Preço na Vitrine
                      </label>
                      <input
                        type="text"
                        value={q.priceLabel}
                        onChange={(e) => updateQuota(q.id, { priceLabel: e.target.value })}
                        className="w-full rounded-lg border border-white/15 bg-[#121215] px-2.5 py-1.5 font-mono text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-400 mb-1">
                        Ciclo de Cobrança
                      </label>
                      <input
                        type="text"
                        value={q.billingCycle}
                        onChange={(e) => updateQuota(q.id, { billingCycle: e.target.value })}
                        className="w-full rounded-lg border border-white/15 bg-[#121215] px-2.5 py-1.5 text-xs text-zinc-200"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: INVENTÁRIO DE OUTDOORS (ENDEREÇOS, TAMANHO & DISPONIBILIDADE) ==================== */}
      {subTab === 'outdoors' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-[#121215] p-5">
              <div className="text-xs text-zinc-400">Pontos Cadastrados</div>
              <div className="mt-2 font-mono text-2xl font-bold text-white tabular-nums">
                {totalOutdoors}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                Carteira total ({formatBRL(potentialCycleRevenue)}/ciclo)
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/25 bg-[#121215] p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Livres (Verde)
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                {availableOutdoors}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">Prontos para comercialização</div>
            </div>

            <div className="rounded-xl border border-yellow-400/25 bg-[#121215] p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                Reservados (Amarelo)
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-yellow-400 tabular-nums">
                {reservedOutdoors}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">Proposta ou pré-reserva</div>
            </div>

            <div className="rounded-xl border border-red-500/25 bg-[#121215] p-5">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                Ocupados (Vermelho)
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-red-400 tabular-nums">
                {occupiedOutdoors}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">Em veiculação ativa no circuito</div>
            </div>
          </div>

          {/* Interactive Google Maps Outdoor Pins */}
          <div ref={mapSectionRef}>
            <OutdoorMapView
              points={filteredOutdoors}
              selectedPointId={selectedMapPointId}
              onSelectPoint={(pt) => setSelectedMapPointId(pt ? pt.id : null)}
              onQuickStatusChange={(id, availability) => {
                updateOutdoorPoint(id, { availability });
                showTempNotice('Disponibilidade do Outdoor atualizada pelo mapa.');
              }}
              pickMode={showNewOutdoorForm && pickCoordsOnMap}
              pickedCoords={{
                lat: Number(outLat) || -23.3219,
                lng: Number(outLng) || -46.7272,
              }}
              onPickCoords={({ lat, lng }) => {
                setOutLat(String(lat));
                setOutLng(String(lng));
                showTempNotice(`Pin posicionado em ${lat}, ${lng}.`);
              }}
            />
          </div>

          {/* Filter & Actions Bar */}
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#121215] p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={outSearch}
                  onChange={(e) => setOutSearch(e.target.value)}
                  placeholder="Código, rua, rodovia ou anunciante..."
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] pl-9 pr-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
                />
              </div>

              <select
                value={outAvailFilter}
                onChange={(e) =>
                  setOutAvailFilter(e.target.value as 'Todos' | OutdoorAvailability)
                }
                aria-label="Filtrar disponibilidade"
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                <option value="Todos">Status: Todos</option>
                {OUTDOOR_AVAILABILITIES.map((av) => (
                  <option key={av} value={av}>
                    {av}
                  </option>
                ))}
              </select>

              <select
                value={outCityFilter}
                onChange={(e) => setOutCityFilter(e.target.value as 'Todas' | CimbajuCity)}
                aria-label="Filtrar cidade do outdoor"
                className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                <option value="Todas">Todas as Cidades</option>
                {NEWS_TERRITORIES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadOutdoorsPdf}
                disabled={pdfBusy === 'outdoors'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/5 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                {pdfBusy === 'outdoors' ? 'Gerando PDF...' : 'Gerar PDF Mapa de Outdoors'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewOutdoorForm((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                {showNewOutdoorForm ? 'Fechar Formulário' : 'Cadastrar Outdoor'}
              </button>
            </div>
          </div>

          {/* New Outdoor Form */}
          {showNewOutdoorForm && (
            <form
              onSubmit={handleCreateOutdoor}
              className="rounded-xl border border-[#FF6600]/40 bg-[#121215] p-6 space-y-4"
            >
              <div className="border-b border-white/10 pb-3">
                <h2 className="font-display text-sm font-semibold text-white">
                  Cadastrar Novo Ponto de Outdoor (Mídia OOH)
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Código do Ponto</label>
                  <input
                    type="text"
                    value={outCode}
                    onChange={(e) => setOutCode(e.target.value)}
                    placeholder="Ex.: OUT-FRC-07"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Nome de Referência do Ponto *
                  </label>
                  <input
                    type="text"
                    required
                    value={outTitle}
                    onChange={(e) => setOutTitle(e.target.value)}
                    placeholder="Ex.: Rotatória Shopping Franco (Sentido Bairro)"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Cidade / Praça</label>
                  <select
                    value={outCity}
                    onChange={(e) => setOutCity(e.target.value as CimbajuCity)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  >
                    {NEWS_TERRITORIES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-zinc-400 mb-1">
                    Endereço Completo (Rua, Av., Rodovia, Km, Bairro) *
                  </label>
                  <input
                    type="text"
                    required
                    value={outAddress}
                    onChange={(e) => setOutAddress(e.target.value)}
                    placeholder="Ex.: Av. dos Expedicionários, 1420 — Centro"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Tamanho / Dimensões</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={outDimensions}
                      onChange={(e) => setOutDimensions(e.target.value)}
                      placeholder="9x3m"
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                    />
                    <select
                      aria-label="Predefinição de tamanho"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setOutDimensions(e.target.value);
                      }}
                      className="rounded-lg border border-white/15 bg-[#0A0A0A] px-2 py-2 text-xs text-zinc-300"
                    >
                      <option value="">Padrão</option>
                      {DIMENSION_PRESETS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-5">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Estrutura / Iluminação</label>
                  <select
                    value={outLighting}
                    onChange={(e) => setOutLighting(e.target.value as OutdoorLighting)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  >
                    {OUTDOOR_LIGHTINGS.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[#FF6600] mb-1">
                    Valor Ciclo / Bimestre (R$)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={outPrice}
                    onChange={(e) => setOutPrice(e.target.value)}
                    className="w-full rounded-lg border border-[#FF6600]/40 bg-[#0A0A0A] px-3 py-2 font-mono text-xs font-semibold text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Disponibilidade</label>
                  <select
                    value={outAvailability}
                    onChange={(e) => setOutAvailability(e.target.value as OutdoorAvailability)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  >
                    {OUTDOOR_AVAILABILITIES.map((av) => (
                      <option key={av} value={av}>
                        {av}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Anunciante Atual</label>
                  <input
                    type="text"
                    value={outAdvertiser}
                    onChange={(e) => setOutAdvertiser(e.target.value)}
                    placeholder="Se ocupado/reservado"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Livre a partir de</label>
                  <input
                    type="date"
                    value={outAvailableFrom}
                    onChange={(e) => setOutAvailableFrom(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 items-end">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Latitude do Pin (Mapa)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={outLat}
                    onChange={(e) => setOutLat(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    Longitude do Pin (Mapa)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={outLng}
                    onChange={(e) => setOutLng(e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setPickCoordsOnMap((v) => !v)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold cursor-pointer ${
                      pickCoordsOnMap
                        ? 'border-sky-400 bg-sky-500/20 text-sky-300'
                        : 'border-white/15 bg-[#0A0A0A] text-zinc-200 hover:bg-white/5'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5 text-[#FF6600]" aria-hidden="true" />
                    {pickCoordsOnMap
                      ? 'Clique no Mapa Acima...'
                      : 'Marcar Pin no Mapa Acima'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1">Observações de Visibilidade</label>
                <input
                  type="text"
                  value={outNotes}
                  onChange={(e) => setOutNotes(e.target.value)}
                  placeholder="Sentido do fluxo, iluminação, visibilidade..."
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewOutdoorForm(false)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#FF6600] px-5 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                >
                  Cadastrar Ponto de Outdoor
                </button>
              </div>
            </form>
          )}

          {/* Outdoors List with Inline Management */}
          <div className="space-y-3">
            {filteredOutdoors.map((point) => (
              <div
                key={point.id}
                className="rounded-xl border border-white/10 bg-[#121215] p-5 space-y-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-white/10 pb-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#D4AF37]">
                        {point.code}
                      </span>
                      <span className="text-xs text-zinc-500">·</span>
                      <span className="text-xs font-medium text-zinc-300">{point.city}</span>
                      <span className="text-xs text-zinc-500">·</span>
                      <span className="font-mono text-xs font-semibold text-white">
                        {point.dimensions}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={point.title}
                      onChange={(e) => updateOutdoorPoint(point.id, { title: e.target.value })}
                      aria-label="Título do ponto de outdoor"
                      className="w-full bg-transparent font-display text-base font-bold text-white focus:outline-none focus:underline"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMapPointId(point.id);
                        mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:border-[#FF6600] hover:text-[#FF6600] cursor-pointer"
                    >
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      Pin no Mapa
                    </button>
                    <select
                      value={point.availability}
                      onChange={(e) =>
                        updateOutdoorPoint(point.id, {
                          availability: e.target.value as OutdoorAvailability,
                        })
                      }
                      aria-label={`Disponibilidade de ${point.code}`}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${availBadgeStyle(
                        point.availability
                      )}`}
                    >
                      {OUTDOOR_AVAILABILITIES.map((av) => (
                        <option key={av} value={av} className="bg-[#0A0A0A] text-white">
                          {av}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => deleteOutdoorPoint(point.id)}
                      aria-label={`Excluir outdoor ${point.code}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 text-zinc-400 hover:border-red-500/40 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <div className="lg:col-span-2">
                    <label className="block text-[10px] text-zinc-500 mb-1">
                      Endereço Completo
                    </label>
                    <input
                      type="text"
                      value={point.address}
                      onChange={(e) => updateOutdoorPoint(point.id, { address: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#FF6600] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Tamanho</label>
                    <input
                      type="text"
                      value={point.dimensions}
                      onChange={(e) =>
                        updateOutdoorPoint(point.id, { dimensions: e.target.value })
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-1.5 font-mono text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">Iluminação</label>
                    <select
                      value={point.lighting}
                      onChange={(e) =>
                        updateOutdoorPoint(point.id, {
                          lighting: e.target.value as OutdoorLighting,
                        })
                      }
                      className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-2.5 py-1.5 text-xs text-zinc-200"
                    >
                      {OUTDOOR_LIGHTINGS.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#FF6600] font-medium mb-1">
                      Valor Ciclo (R$)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={point.bimonthlyPrice}
                      onChange={(e) =>
                        updateOutdoorPoint(point.id, {
                          bimonthlyPrice: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full rounded-lg border border-[#FF6600]/40 bg-[#0A0A0A] px-3 py-1.5 font-mono text-xs font-bold text-white tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 mb-1">
                      Anunciante / Liberação
                    </label>
                    <input
                      type="text"
                      value={point.currentAdvertiser ?? ''}
                      onChange={(e) =>
                        updateOutdoorPoint(point.id, {
                          currentAdvertiser: e.target.value || undefined,
                        })
                      }
                      placeholder="Sem ocupante"
                      className="w-full rounded-lg border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-xs text-zinc-200"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
