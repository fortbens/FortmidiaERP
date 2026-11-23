import React, { useState } from 'react';
import {
  ArrowRightCircle,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Instagram,
  Loader2,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { NEWS_SEALS, NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { aiApi } from '../../services/api';
import {
  ChiefApprovalStatus,
  CimbajuCity,
  CitizenReport,
  EditorialPauta,
  NewsSeal,
  PautaStatus,
  SocialCreativeDraft,
} from '../../types/fortmidia';
import { SocialCreativeModal } from './SocialCreativeModal';
import { FloatingHorizontalScroll } from '../FloatingHorizontalScroll';
import { matchesPautaQuery } from '../../utils/pautaCode';

const PAUTA_STATUSES: PautaStatus[] = [
  'Apuração de Rua',
  'Roteiro & Entrevista',
  'Edição & Cortes',
  'Publicado',
];

interface AiScanResponseArticle {
  title: string;
  summary: string;
  body: string;
  suggestedSeal: NewsSeal;
  city: CimbajuCity;
  sources: { title: string; uri: string }[];
  socialCreative: SocialCreativeDraft;
}

export const JournalismModule: React.FC = () => {
  const {
    citizenReports,
    pautas,
    reporters,
    teamMembers,
    activeAdminUserId,
    runAutoTriage,
    updateCitizenStatus,
    updateCitizenReport,
    deleteCitizenReport,
    promoteReportToPauta,
    addPauta,
    updatePautaStatus,
    updatePautaSeal,
    updatePautaContent,
    deletePauta,
    chiefEditorApprovePauta,
    publishPautaToSite,
    unpublishPauta,
  } = useFortMidia();

  const activeOperator = teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const canDelete =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1 ||
    Boolean(activeOperator.permissions?.canDelete);

  const [triageFeedback, setTriageFeedback] = useState<string | null>(null);
  const [showNewPauta, setShowNewPauta] = useState(false);
  const [activeView, setActiveView] = useState<'all' | 'pautas' | 'cidadao'>('all');
  const [territoryFilter, setTerritoryFilter] = useState<'Todos' | CimbajuCity>('Todos');
  const [sealFilter, setSealFilter] = useState<'Todos' | NewsSeal>('Todos');
  const [approvalFilter, setApprovalFilter] = useState<'Todos' | ChiefApprovalStatus>('Todos');
  const [pautaSearch, setPautaSearch] = useState('');

  const chiefCandidates = teamMembers.filter(
    (m) =>
      m.active &&
      (m.role === 'Redator-Chefe' ||
        m.role === 'Super Admin / Diretoria' ||
        m.role === 'Administrador')
  );
  const defaultChief =
    chiefCandidates.find((m) => m.role === 'Redator-Chefe') || chiefCandidates[0];
  const [chiefEditorName, setChiefEditorName] = useState(
    defaultChief?.name || 'Emerson Carneiro'
  );
  const [reviewingArticle, setReviewingArticle] = useState<EditorialPauta | null>(null);
  const [creativeModalPauta, setCreativeModalPauta] = useState<EditorialPauta | null>(null);

  // Fala Cidadão — WhatsApp Forward & Nota Devolutiva modals
  const [forwardingReport, setForwardingReport] = useState<CitizenReport | null>(null);
  const [forwardTargetName, setForwardTargetName] = useState('');
  const [forwardTargetPhone, setForwardTargetPhone] = useState('');
  const [forwardMessage, setForwardMessage] = useState('');
  const [forwardCopied, setForwardCopied] = useState(false);

  const [respondingReport, setRespondingReport] = useState<CitizenReport | null>(null);
  const [responseNoteDraft, setResponseNoteDraft] = useState('');
  const [responseCopied, setResponseCopied] = useState(false);

  const sanitizePhoneDigits = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10) return '';
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const openForwardModal = (report: CitizenReport) => {
    const defaultText = [
      `*FALA COM A FORT CIDADÃO · DEMANDA ENCAMINHADA*`,
      `Protocolo: ${report.protocol}`,
      `Cidade / Bairro: ${report.city} — ${report.neighborhood}`,
      `Categoria: ${report.category} | Urgência: ${report.urgency}`,
      `Assunto: ${report.title}`,
      `Relato: ${report.description}`,
      report.officialResponseNote
        ? `Nota Devolutiva Registrada: ${report.officialResponseNote}`
        : '',
      `— Redação Portal FortNews (fortnews.com.br)`,
    ]
      .filter(Boolean)
      .join('\n');

    setForwardingReport(report);
    setForwardTargetName(report.forwardedTo || '');
    setForwardTargetPhone('');
    setForwardMessage(defaultText);
    setForwardCopied(false);
  };

  const openResponseModal = (report: CitizenReport) => {
    setRespondingReport(report);
    setResponseNoteDraft(report.officialResponseNote || '');
    setResponseCopied(false);
  };

  const buildCitizenReplyText = (report: CitizenReport, note: string) =>
    [
      `Olá, ${report.citizenName}!`,
      `Aqui é da equipe do canal *Fala com a Fort Cidadão* (Portal FortNews).`,
      ``,
      `Temos uma atualização / nota devolutiva sobre a sua demanda:`,
      `• Protocolo: ${report.protocol}`,
      `• Assunto: ${report.title} (${report.city} — ${report.neighborhood})`,
      ``,
      `*Nota Devolutiva:*`,
      note.trim() || 'Sua demanda foi recebida e encontra-se em acompanhamento pela nossa equipe.',
      ``,
      `Agradecemos sua participação no Jornalismo Participativo do Grupo FortMídia / FortNews!`,
    ].join('\n');

  // AI Web News Scanner State
  const [showAiScanner, setShowAiScanner] = useState(true);
  const [aiTerritory, setAiTerritory] = useState<CimbajuCity>('Regional CIMBAJU');
  const [aiTopics, setAiTopics] = useState(
    'mobilidade, obras públicas, economia regional, saúde, eventos e segurança'
  );
  const [aiCount, setAiCount] = useState(2);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // New Article / Pauta Form
  const [newTitle, setNewTitle] = useState('');
  const [newCity, setNewCity] = useState<CimbajuCity>('Regional CIMBAJU');
  const [newSeal, setNewSeal] = useState<NewsSeal>('Break News');
  const [newFormat, setNewFormat] = useState<EditorialPauta['format']>('Portal 24/7');
  const [newReporter, setNewReporter] = useState('Redação Central FortNews');
  const [newSummary, setNewSummary] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('/assets/aistudio/outdoor_6fc8fbe7.jpg');

  const pendingCount = citizenReports.filter((r) => r.status === 'Aguardando Triagem').length;
  const awaitingApprovalCount = pautas.filter(
    (p) => p.approvalStatus === 'Aguardando Redator-Chefe' || p.approvalStatus === 'Em Apuração'
  ).length;
  const publishedCount = pautas.filter((p) => p.approvalStatus === 'Publicada no Site').length;

  const handleAutoTriage = () => {
    const count = runAutoTriage();
    setTriageFeedback(
      count > 0
        ? `${count} relato(s) classificados automaticamente por urgência e núcleo regional.`
        : 'Todos os relatos do Fala Cidadão já passaram pela triagem.'
    );
  };

  const handleRunAiScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiScanning(true);
    setAiError(null);
    try {
      const resp = await aiApi.scanNews<{
        articles: AiScanResponseArticle[];
        scannedAt: string;
      }>({
        territory: aiTerritory,
        topics: aiTopics,
        count: aiCount,
      });

      if (!resp.ok || !resp.data) {
        throw new Error(
          resp.error ||
            'Servidor de varredura IA indisponível neste ambiente. Configure o endpoint /api/ai.'
        );
      }

      const data = resp.data;

      const todayStr = new Date().toLocaleDateString('pt-BR');
      const fallbackImages = [
        '/assets/aistudio/outdoor_6fc8fbe7.jpg',
        '/assets/aistudio/Microfone_dc305011.jpg',
        '/assets/aistudio/Mockup_Revista_4c06e73a.jpg',
      ];

      data.articles.forEach((art, idx) => {
        addPauta({
          title: art.title,
          city: art.city,
          seal: art.suggestedSeal,
          format: 'Portal 24/7',
          reporter: 'Robô Editorial IA · Varredura Web',
          deadline: todayStr,
          status: 'Edição & Cortes',
          approvalStatus: 'Aguardando Redator-Chefe',
          summary: art.summary,
          body: art.body,
          imageUrl: fallbackImages[idx % fallbackImages.length],
          aiGenerated: true,
          sourceUrls: art.sources,
          socialCreative: art.socialCreative,
        });
      });

      setTriageFeedback(
        `IA varreu a web e enviou ${data.articles.length} matéria(s) + criativos sociais para aprovação do Redator-Chefe.`
      );
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erro ao executar varredura web com IA.');
    } finally {
      setAiScanning(false);
    }
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    cb: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') cb(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePauta = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    addPauta({
      title: newTitle.trim(),
      city: newCity,
      seal: newSeal,
      format: newFormat,
      reporter: newReporter,
      deadline: new Date().toLocaleDateString('pt-BR'),
      status: 'Roteiro & Entrevista',
      approvalStatus: 'Aguardando Redator-Chefe',
      summary: newSummary.trim() || newTitle.trim(),
      body:
        newBody.trim() ||
        'Matéria redigida pela equipe FortNews aguardando revisão e aprovação do Redator-Chefe.',
      imageUrl: newImageUrl.trim() || undefined,
      socialCreative: {
        headlineOverlay: newTitle.trim().slice(0, 68),
        instagramCaption: `${newTitle.trim()}\n\n${newSummary.trim() || newTitle.trim()}\n\nLeia completo em jornalfortnews.com.br`,
        storyCta: 'Leia a matéria completa no Jornal FortNews',
        hashtags: '#JornalFortNews #GrupoFortMidia #CIMBAJU',
        visualDirection: 'Card editorial com foto de capa e selo da editoria.',
      },
    });
    setNewTitle('');
    setNewSummary('');
    setNewBody('');
    setShowNewPauta(false);
    setTriageFeedback('Matéria + rascunho de criativo enviados para a mesa do Redator-Chefe.');
  };

  const filteredPautas = pautas.filter((p) => {
    const mCity = territoryFilter === 'Todos' || p.city === territoryFilter;
    const mSeal = sealFilter === 'Todos' || p.seal === sealFilter;
    const mApproval = approvalFilter === 'Todos' || p.approvalStatus === approvalFilter;
    const mSearch = matchesPautaQuery(p, pautaSearch);
    return mCity && mSeal && mApproval && mSearch;
  });

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-white">
            Mesa do Redator-Chefe · IA Web Scanner, Selos & Criativos Sociais
          </h2>
          <p className="text-xs text-zinc-400">
            Varra a internet com IA para gerar notícias + criativos do Instagram, revise com fontes reais e aprove para publicar no portal.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#121215] px-3 py-1.5 text-xs">
            <span className="text-zinc-400">Editor-Chefe:</span>
            <select
              aria-label="Selecionar Editor-Chefe responsável"
              value={chiefEditorName}
              onChange={(e) => setChiefEditorName(e.target.value)}
              className="bg-transparent font-semibold text-[#D4AF37] focus:outline-none cursor-pointer"
            >
              {(chiefCandidates.length > 0
                ? chiefCandidates
                : [{ id: 'def-2', name: 'Emerson Carneiro' }]
              ).map((c) => (
                <option key={c.id} value={c.name} className="bg-[#121215] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAiScanner((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF6600]/40 bg-[#FF6600]/10 px-3.5 py-2 text-xs font-semibold text-[#FF6600] hover:bg-[#FF6600]/20 cursor-pointer whitespace-nowrap"
          >
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            {showAiScanner ? 'Ocultar Scanner IA' : 'Scanner IA Web'}
          </button>

          <button
            type="button"
            onClick={handleAutoTriage}
            className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2 text-xs font-semibold text-[#E6C868] hover:bg-[#D4AF37]/20 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Triagem Fala Cidadão ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setShowNewPauta((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nova Matéria
          </button>
        </div>
      </div>

      {/* Quick Navigation Tabs (Instant Jump to Fila de Relatos — Fala Cidadão) */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#111114] p-2">
        <button
          type="button"
          onClick={() => setActiveView('all')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeView === 'all'
              ? 'bg-[#fa6607] text-white'
              : 'text-zinc-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          Visão Completa
        </button>
        <button
          type="button"
          onClick={() => setActiveView('pautas')}
          className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
            activeView === 'pautas'
              ? 'bg-[#fa6607] text-white'
              : 'text-zinc-300 hover:bg-white/5 hover:text-white'
          }`}
        >
          Pautas &amp; Redação ({filteredPautas.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveView('cidadao')}
          className={`inline-flex items-center gap-2 rounded-lg border-2 px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeView === 'cidadao'
              ? 'border-amber-400 bg-amber-400 text-zinc-950 shadow-md shadow-amber-400/25'
              : 'border-amber-400/80 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25'
          }`}
        >
          <Megaphone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Fila de Relatos — Canal Fala Cidadão ({citizenReports.length})
          {pendingCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                activeView === 'cidadao'
                  ? 'bg-zinc-950 text-amber-300'
                  : 'bg-amber-400 text-zinc-950'
              }`}
            >
              {pendingCount} pendente(s)
            </span>
          )}
        </button>
      </div>

      {/* AI AUTOMATED NEWS SCANNER PANEL */}
      {showAiScanner && (
        <form
          onSubmit={handleRunAiScan}
          className="rounded-xl border border-[#FF6600]/40 bg-gradient-to-br from-[#161210] to-[#111114] p-5 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6600]/20 text-[#FF6600]">
                <Bot className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold text-white">
                  Redação Automática IA — Varredura na Internet + Criativo de Redes Sociais
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Busca fontes reais na web via Google Search, redige a matéria com selo e já monta arte 1080×1350 + legenda para fila de aprovação.
                </p>
              </div>
            </div>
          </div>

          {aiError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs text-red-300">
              {aiError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12 items-end">
            <div className="lg:col-span-3">
              <label className="block text-[11px] text-zinc-400 mb-1">
                Território / Praça de Varredura
              </label>
              <select
                value={aiTerritory}
                onChange={(e) => setAiTerritory(e.target.value as CimbajuCity)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {NEWS_TERRITORIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div className="lg:col-span-5">
              <label className="block text-[11px] text-zinc-400 mb-1">
                Assuntos / Palavras-chave para buscar na rede
              </label>
              <input
                type="text"
                value={aiTopics}
                onChange={(e) => setAiTopics(e.target.value)}
                placeholder="Ex: CPTM Linha 7, obras Franco da Rocha, previsão do tempo, economia..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-[11px] text-zinc-400 mb-1">Qtd.</label>
              <select
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-2 text-xs font-mono text-white"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <button
                type="submit"
                disabled={aiScanning}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer disabled:opacity-60"
              >
                {aiScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Varrendo Web & Criando...
                  </>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5" aria-hidden="true" />
                    Varrer Rede e Gerar Rascunhos
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Editorial Counters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-xs text-zinc-400">Aguardando Aprovação do Redator-Chefe</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-amber-400 tabular-nums">
            {awaitingApprovalCount}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#111114] p-4">
          <div className="text-xs text-zinc-400">Matérias Publicadas no Site</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {publishedCount}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setActiveView('cidadao')}
          className="text-left rounded-xl border-2 border-amber-400/80 bg-amber-400/10 p-4 transition-colors hover:bg-amber-400/15 cursor-pointer"
        >
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-amber-300">
            <span>Relatos Fala Cidadão Pendentes</span>
            <span className="text-[10px] uppercase underline">Abrir Fila →</span>
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-amber-300 tabular-nums">
            {pendingCount}
          </div>
        </button>
      </div>

      {triageFeedback && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4" aria-hidden="true" />
            {triageFeedback}
          </span>
          <button
            type="button"
            onClick={() => setTriageFeedback(null)}
            className="text-zinc-400 hover:text-white cursor-pointer"
          >
            Ocultar
          </button>
        </div>
      )}

      {/* New Article / Pauta Form */}
      {showNewPauta && (
        <form
          onSubmit={handleCreatePauta}
          className="rounded-xl border border-white/15 bg-[#141417] p-5 space-y-4"
        >
          <div className="text-sm font-semibold text-white">
            Redigir Nova Matéria para Aprovação
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              required
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Manchete / Título da matéria *"
              className="lg:col-span-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
            />
            <select
              value={newSeal}
              onChange={(e) => setNewSeal(e.target.value as NewsSeal)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            >
              {NEWS_SEALS.map((s) => (
                <option key={s} value={s}>
                  Selo: {s}
                </option>
              ))}
            </select>
            <select
              value={newCity}
              onChange={(e) => setNewCity(e.target.value as CimbajuCity)}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            >
              {NEWS_TERRITORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value as EditorialPauta['format'])}
              className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
            >
              <option value="Portal 24/7">Portal 24/7</option>
              <option value="Reportagem Investigativa">Reportagem Investigativa</option>
              <option value="Tabloide Quinzenal">Tabloide Quinzenal</option>
              <option value="Revista A4 Mensal">Revista A4 Mensal</option>
            </select>
          </div>

          <input
            type="text"
            value={newSummary}
            onChange={(e) => setNewSummary(e.target.value)}
            placeholder="Subtítulo / Linha-fina da matéria"
            className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
          />

          <textarea
            rows={4}
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Corpo completo da reportagem..."
            className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <select
                value={newReporter}
                onChange={(e) => setNewReporter(e.target.value)}
                aria-label="Selecionar repórter responsável"
                className="w-56 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
              >
                <option value="Redação Central FortNews">Redação Central FortNews</option>
                {reporters
                  .filter((r) => r.active)
                  .map((rep) => (
                    <option key={rep.id} value={rep.name}>
                      Repórter: {rep.name} ({rep.city})
                    </option>
                  ))}
              </select>
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="URL da foto de capa"
                className="flex-1 min-w-[180px] rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
              <label className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-zinc-200 cursor-pointer">
                <Upload className="h-3.5 w-3.5 text-[#FF6600]" />
                Foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload(e, setNewImageUrl)}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowNewPauta(false)}
                className="rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
              >
                Enviar ao Redator-Chefe
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Editorial Pautas & Chief Editor Approval Table */}
      {(activeView === 'all' || activeView === 'pautas') && (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="font-display text-base font-bold text-white">
            Matérias, Selos &amp; Publicação no Site ({filteredPautas.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <input
                type="text"
                aria-label="Buscar matéria por número interno, título ou cidade"
                value={pautaSearch}
                onChange={(e) => setPautaSearch(e.target.value)}
                placeholder="Buscar nº (ex: FN-0003), título..."
                className="w-full rounded-lg border border-white/10 bg-[#121215] pl-8 pr-7 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
              {pautaSearch && (
                <button
                  type="button"
                  aria-label="Limpar busca de matérias"
                  onClick={() => setPautaSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              aria-label="Filtrar matérias por selo"
              value={sealFilter}
              onChange={(e) => setSealFilter(e.target.value as 'Todos' | NewsSeal)}
              className="rounded-lg border border-white/10 bg-[#121215] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
            >
              <option value="Todos">Todos os Selos</option>
              {NEWS_SEALS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar matérias por cidade ou região"
              value={territoryFilter}
              onChange={(e) => setTerritoryFilter(e.target.value as 'Todos' | CimbajuCity)}
              className="rounded-lg border border-white/10 bg-[#121215] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
            >
              <option value="Todos">Todas as Cidades / Regiões</option>
              {NEWS_TERRITORIES.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por status de aprovação"
              value={approvalFilter}
              onChange={(e) =>
                setApprovalFilter(e.target.value as 'Todos' | ChiefApprovalStatus)
              }
              className="rounded-lg border border-white/10 bg-[#121215] px-3 py-1.5 text-xs text-zinc-200 focus:border-[#fa6607] focus:outline-none"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Aguardando Redator-Chefe">Aguardando Redator-Chefe</option>
              <option value="Aprovada pelo Redator-Chefe">Aprovada pelo Redator-Chefe</option>
              <option value="Publicada no Site">Publicada no Site</option>
              <option value="Em Apuração">Em Apuração</option>
            </select>
          </div>
        </div>

        <FloatingHorizontalScroll
          label="Rolagem lateral — Matérias e Aprovação Editorial"
          scrollClassName="rounded-xl border border-white/10 bg-[#111114]"
        >
          <table className="w-full min-w-[940px] text-left text-xs">
            <thead className="border-b border-white/10 bg-[#16161A] text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Matéria & Repórter</th>
                <th className="px-4 py-3 font-medium">Selo Editorial</th>
                <th className="px-4 py-3 font-medium">Praça / Formato</th>
                <th className="px-4 py-3 font-medium">Status Redação</th>
                <th className="px-4 py-3 font-medium">Aprovação & Site</th>
                <th className="px-4 py-3 font-medium text-right">Ações & Criativo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredPautas.map((p) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5 max-w-xs">
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        title="Código interno de controle (não exibido nos sites públicos)"
                        className="font-mono text-[11px] font-bold text-[#fa6607] tabular-nums"
                      >
                        {p.internalCode || 'FN-0000'}
                      </span>
                      {p.aiGenerated && (
                        <span
                          title="Gerada por Varredura Web IA"
                          className="text-[10px] font-bold text-amber-400"
                        >
                          · IA
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-white">{p.title}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-400">
                      {p.reporter} · {p.deadline}
                    </div>
                    {p.sourceProtocol && (
                      <div className="font-mono text-[11px] text-[#D4AF37] tabular-nums">
                        Origem Fala Cidadão: {p.sourceProtocol}
                      </div>
                    )}
                    {p.sourceUrls && p.sourceUrls.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {p.sourceUrls.slice(0, 2).map((src, i) => (
                          <a
                            key={i}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline"
                          >
                            <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                            Fonte {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      aria-label={`Alterar selo de ${p.title}`}
                      value={p.seal}
                      onChange={(e) => updatePautaSeal(p.id, e.target.value as NewsSeal)}
                      className="rounded-md border border-white/15 bg-[#0A0A0A] px-2.5 py-1 text-[11px] font-medium text-[#FF6600] focus:border-[#FF6600] focus:outline-none cursor-pointer"
                    >
                      {NEWS_SEALS.map((seal) => (
                        <option key={seal} value={seal}>
                          {seal}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-zinc-200">{p.city}</div>
                    <div className="text-[11px] text-zinc-500">{p.format}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      aria-label={`Estágio da pauta ${p.title}`}
                      value={p.status}
                      onChange={(e) => updatePautaStatus(p.id, e.target.value as PautaStatus)}
                      className="rounded-md border border-white/15 bg-[#0A0A0A] px-2.5 py-1 text-[11px] text-zinc-200 focus:border-[#FF6600] focus:outline-none cursor-pointer"
                    >
                      {PAUTA_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div
                      className={`font-medium ${
                        p.approvalStatus === 'Publicada no Site'
                          ? 'text-emerald-400'
                          : p.approvalStatus === 'Aprovada pelo Redator-Chefe'
                            ? 'text-[#D4AF37]'
                            : 'text-amber-400'
                      }`}
                    >
                      {p.approvalStatus}
                    </div>
                    {p.approvedBy && (
                      <div className="text-[11px] text-zinc-500">{p.approvedBy}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCreativeModalPauta(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#FF6600]/40 bg-[#FF6600]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#FF6600] hover:bg-[#FF6600]/20 cursor-pointer"
                      >
                        <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
                        Criativo Redes
                      </button>

                      <button
                        type="button"
                        onClick={() => setReviewingArticle(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-200 hover:bg-white/5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                        Revisar
                      </button>

                      {(p.approvalStatus === 'Em Apuração' ||
                        p.approvalStatus === 'Aguardando Redator-Chefe') && (
                        <>
                          <button
                            type="button"
                            onClick={() => chiefEditorApprovePauta(p.id, chiefEditorName, false)}
                            className="inline-flex items-center gap-1 rounded-md border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-2.5 py-1.5 text-[11px] font-medium text-[#E6C868] hover:bg-[#D4AF37]/20 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Aprovar
                          </button>
                          <button
                            type="button"
                            onClick={() => chiefEditorApprovePauta(p.id, chiefEditorName, true)}
                            className="inline-flex items-center gap-1 rounded-md bg-[#FF6600] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                          >
                            <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                            Publicar
                          </button>
                        </>
                      )}

                      {p.approvalStatus === 'Aprovada pelo Redator-Chefe' && (
                        <button
                          type="button"
                          onClick={() => publishPautaToSite(p.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-500 cursor-pointer"
                        >
                          <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                          Publicar no Site
                        </button>
                      )}

                      {p.approvalStatus === 'Publicada no Site' && (
                        <button
                          type="button"
                          onClick={() => unpublishPauta(p.id)}
                          className="rounded-md border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-white hover:bg-white/5 cursor-pointer"
                        >
                          Retirar do Ar
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => deletePauta(p.id)}
                          title="Excluir pauta"
                          className="rounded-md border border-red-500/25 p-1.5 text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FloatingHorizontalScroll>
      </div>
      )}

      {/* Citizen Reports Triage Queue — Highlighted in Yellow/Amber */}
      {(activeView === 'all' || activeView === 'cidadao') && (
      <div className="rounded-2xl border-2 border-amber-400 bg-amber-400/[0.06] p-4 sm:p-5 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-zinc-950 shrink-0">
              <Megaphone className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-amber-300">
                Fila de Relatos — Canal Fala Cidadão ({citizenReports.length})
              </h3>
              <span className="text-xs text-amber-200/80">
                Envios públicos podem ser promovidos diretamente para aprovação do Redator-Chefe
              </span>
            </div>
          </div>
          {activeView === 'cidadao' && (
            <button
              type="button"
              onClick={() => setActiveView('all')}
              className="rounded-lg border border-amber-400/40 bg-black/40 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-black/60 cursor-pointer self-start sm:self-auto"
            >
              Mostrar Visão Completa
            </button>
          )}
        </div>

        <FloatingHorizontalScroll
          label="Rolagem lateral — Fila de Relatos Fala Cidadão"
          scrollClassName="rounded-xl border border-amber-400/40 bg-[#111114]"
        >
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="border-b border-amber-400/25 bg-[#16161A] text-amber-200/90">
              <tr>
                <th className="px-4 py-3 font-medium">Protocolo &amp; Relato</th>
                <th className="px-4 py-3 font-medium">Cidade / Bairro</th>
                <th className="px-4 py-3 font-medium">Urgência</th>
                <th className="px-4 py-3 font-medium">Status da Triagem</th>
                <th className="px-4 py-3 font-medium text-right">Ações Editoriais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {citizenReports
                .filter((r) => territoryFilter === 'Todos' || r.city === territoryFilter)
                .map((report) => (
                  <tr key={report.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 max-w-md">
                      <div className="flex items-center gap-2 font-mono text-[11px] text-[#D4AF37] tabular-nums">
                        <span>{report.protocol}</span>
                        <span>·</span>
                        <span className="text-zinc-400 font-sans">{report.category}</span>
                        {report.triageScore && (
                          <>
                            <span>·</span>
                            <span className="text-[#FF6600]">
                              Relevância {report.triageScore}/100
                            </span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 font-medium text-white">{report.title}</div>
                      <p className="mt-0.5 text-[11px] text-zinc-400 line-clamp-2">
                        {report.description}
                      </p>
                      <div className="mt-1 text-[11px] text-zinc-500">
                        Cidadão: {report.citizenName} ({report.contact}) · {report.createdAt}
                      </div>
                      {report.forwardedAt && (
                        <div className="mt-1 text-[11px] text-emerald-400">
                          Encaminhado via WhatsApp{report.forwardedTo ? ` para ${report.forwardedTo}` : ''} · {report.forwardedAt}
                        </div>
                      )}
                      {report.officialResponseNote && (
                        <div className="mt-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[11px] text-sky-200">
                          <span className="font-semibold text-sky-300">Nota Devolutiva:</span>{' '}
                          <span className="line-clamp-2">{report.officialResponseNote}</span>
                          {report.responseSentAt && (
                            <span className="block mt-0.5 text-[10px] text-sky-300/80">
                              Enviada ao cidadão em {report.responseSentAt}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-zinc-200">{report.city}</div>
                      <div className="text-[11px] text-zinc-400">{report.neighborhood}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          report.urgency === 'Crítica'
                            ? 'text-red-400'
                            : report.urgency === 'Alta'
                              ? 'text-amber-400'
                              : 'text-zinc-300'
                        }`}
                      >
                        {report.urgency}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div
                        className={`font-medium ${
                          report.status === 'Nota Devolutiva Enviada'
                            ? 'text-sky-300'
                            : report.status === 'Convertido em Pauta'
                              ? 'text-emerald-400'
                              : report.status === 'Encaminhado / Em Apuração'
                                ? 'text-amber-300'
                                : 'text-zinc-200'
                        }`}
                      >
                        {report.status}
                      </div>
                      {report.assignedEditor && (
                        <div className="text-[11px] text-zinc-400">{report.assignedEditor}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openForwardModal(report)}
                          title="Encaminhar demanda por WhatsApp"
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                          WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => openResponseModal(report)}
                          title="Registrar nota devolutiva e enviar resposta ao cidadão"
                          className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-sky-300 hover:bg-sky-500/20 cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          {report.officialResponseNote ? 'Devolutiva' : 'Responder Cidadão'}
                        </button>
                        {report.status !== 'Convertido em Pauta' && (
                          <button
                            type="button"
                            onClick={() =>
                              promoteReportToPauta(report.id, 'Reportagem Investigativa')
                            }
                            className="inline-flex items-center gap-1 rounded-md bg-[#fa6607] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                          >
                            <ArrowRightCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Virar Matéria
                          </button>
                        )}
                        {report.status !== 'Arquivado' && report.status !== 'Convertido em Pauta' && (
                          <button
                            type="button"
                            onClick={() => updateCitizenStatus(report.id, 'Arquivado')}
                            className="rounded-md border border-white/15 px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/5 cursor-pointer"
                          >
                            Arquivar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => deleteCitizenReport(report.id)}
                            title="Excluir relato"
                            className="rounded-md border border-red-500/25 p-1.5 text-red-400 hover:bg-red-500/10 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </FloatingHorizontalScroll>
      </div>
      )}

      {/* Chief Editor Review & Edit Modal */}
      {reviewingArticle && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="chief-review-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-white/15 bg-[#121215] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="text-xs font-medium text-[#D4AF37]">
                  Revisão Final do Redator-Chefe ({chiefEditorName})
                </div>
                <h3 id="chief-review-title" className="mt-1 font-display text-lg font-bold text-white">
                  Editar, Classificar Selo e Publicar Matéria
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReviewingArticle(null)}
                aria-label="Fechar revisão"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {reviewingArticle.sourceUrls && reviewingArticle.sourceUrls.length > 0 && (
              <div className="rounded-lg border border-sky-500/30 bg-sky-500/10 p-3 text-xs space-y-1">
                <div className="font-semibold text-sky-300">
                  Fontes encontradas na varredura web (Google Search):
                </div>
                <div className="flex flex-wrap gap-3">
                  {reviewingArticle.sourceUrls.map((src, i) => (
                    <a
                      key={i}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-200 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      {src.title}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Selo Editorial</label>
                <select
                  value={reviewingArticle.seal}
                  onChange={(e) => {
                    const nextSeal = e.target.value as NewsSeal;
                    setReviewingArticle({ ...reviewingArticle, seal: nextSeal });
                    updatePautaSeal(reviewingArticle.id, nextSeal);
                  }}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-[#FF6600] font-semibold focus:outline-none"
                >
                  {NEWS_SEALS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Cidade / Abrangência</label>
                <select
                  value={reviewingArticle.city}
                  onChange={(e) => {
                    const nextCity = e.target.value as CimbajuCity;
                    setReviewingArticle({ ...reviewingArticle, city: nextCity });
                    updatePautaContent(reviewingArticle.id, { city: nextCity });
                  }}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {NEWS_TERRITORIES.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Manchete</label>
              <input
                type="text"
                value={reviewingArticle.title}
                onChange={(e) => {
                  const val = e.target.value;
                  setReviewingArticle({ ...reviewingArticle, title: val });
                  updatePautaContent(reviewingArticle.id, { title: val });
                }}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Linha-fina / Resumo</label>
              <input
                type="text"
                value={reviewingArticle.summary}
                onChange={(e) => {
                  const val = e.target.value;
                  setReviewingArticle({ ...reviewingArticle, summary: val });
                  updatePautaContent(reviewingArticle.id, { summary: val });
                }}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">Texto da Matéria</label>
              <textarea
                rows={6}
                value={reviewingArticle.body}
                onChange={(e) => {
                  const val = e.target.value;
                  setReviewingArticle({ ...reviewingArticle, body: val });
                  updatePautaContent(reviewingArticle.id, { body: val });
                }}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs leading-relaxed text-white focus:border-[#FF6600] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => {
                  const art = reviewingArticle;
                  setReviewingArticle(null);
                  setCreativeModalPauta(art);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#FF6600]/40 bg-[#FF6600]/10 px-3.5 py-2 text-xs font-semibold text-[#FF6600] hover:bg-[#FF6600]/20 cursor-pointer"
              >
                <Instagram className="h-3.5 w-3.5" aria-hidden="true" />
                Abrir Criativo Redes Sociais
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReviewingArticle(null)}
                  className="rounded-lg border border-white/15 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    chiefEditorApprovePauta(reviewingArticle.id, chiefEditorName, false);
                    setReviewingArticle(null);
                    setTriageFeedback(`Matéria aprovada por ${chiefEditorName}.`);
                  }}
                  className="rounded-lg border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-2 text-xs font-semibold text-[#E6C868] hover:bg-[#D4AF37]/20 cursor-pointer"
                >
                  Apenas Aprovar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    chiefEditorApprovePauta(reviewingArticle.id, chiefEditorName, true);
                    setReviewingArticle(null);
                    setTriageFeedback(
                      `Matéria aprovada por ${chiefEditorName} e publicada na seção de Notícias do site.`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6600] px-4 py-2 text-xs font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  Aprovar e Publicar no Site
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Social Media Creative Modal */}
      {creativeModalPauta && (
        <SocialCreativeModal
          pauta={creativeModalPauta}
          onClose={() => setCreativeModalPauta(null)}
        />
      )}

      {/* WhatsApp Forward / Share Modal for Fala Cidadão */}
      {forwardingReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="forward-wa-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/15 bg-[#121215] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="font-mono text-xs text-[#D4AF37] tabular-nums">
                  {forwardingReport.protocol} · {forwardingReport.city}
                </div>
                <h3 id="forward-wa-title" className="mt-1 font-display text-lg font-bold text-white">
                  Encaminhar Demanda via WhatsApp
                </h3>
                <p className="text-xs text-zinc-400">
                  Compartilhe com um repórter, secretaria, órgão público ou qualquer contato/grupo do WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForwardingReport(null)}
                aria-label="Fechar encaminhamento"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Selecionar Repórter Cadastrado (opcional)
                </label>
                <select
                  value=""
                  onChange={(e) => {
                    const rep = reporters.find((r) => r.id === e.target.value);
                    if (rep) {
                      setForwardTargetName(rep.name);
                      setForwardTargetPhone(rep.phone);
                    }
                  }}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white focus:border-[#fa6607] focus:outline-none"
                >
                  <option value="">Escolher repórter ou preencher manual...</option>
                  {reporters.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.city}) — {r.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Destinatário (Órgão / Secretaria / Pessoa)
                </label>
                <input
                  type="text"
                  value={forwardTargetName}
                  onChange={(e) => setForwardTargetName(e.target.value)}
                  placeholder="Ex: Secretaria de Obras / Assessoria"
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                WhatsApp de Destino (deixe vazio para escolher o contato/grupo no app do WhatsApp)
              </label>
              <input
                type="text"
                value={forwardTargetPhone}
                onChange={(e) => setForwardTargetPhone(e.target.value)}
                placeholder="(11) 99999-0000 ou vazio para compartilhamento livre"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-mono text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                Mensagem de Encaminhamento
              </label>
              <textarea
                rows={7}
                value={forwardMessage}
                onChange={(e) => setForwardMessage(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs leading-relaxed text-white focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(forwardMessage);
                      setForwardCopied(true);
                      window.setTimeout(() => setForwardCopied(false), 2500);
                    } catch {
                      setForwardCopied(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  {forwardCopied ? 'Texto Copiado!' : 'Copiar Texto'}
                </button>
                {typeof navigator !== 'undefined' && 'share' in navigator && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.share({
                          title: `Fala Cidadão ${forwardingReport.protocol}`,
                          text: forwardMessage,
                        });
                        const stamp = new Date().toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                        updateCitizenReport(forwardingReport.id, {
                          forwardedAt: stamp,
                          forwardedTo: forwardTargetName.trim() || 'Compartilhamento direto',
                          status:
                            forwardingReport.status === 'Aguardando Triagem'
                              ? 'Encaminhado / Em Apuração'
                              : forwardingReport.status,
                        });
                        setTriageFeedback(
                          `Demanda ${forwardingReport.protocol} compartilhada com sucesso.`
                        );
                      } catch {
                        // User cancelled native share sheet
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Compartilhar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setForwardingReport(null)}
                  className="rounded-lg border border-white/15 px-3.5 py-2 text-xs text-zinc-300 hover:bg-white/5 cursor-pointer"
                >
                  Fechar
                </button>
                <a
                  href={(() => {
                    const digits = sanitizePhoneDigits(forwardTargetPhone);
                    const encoded = encodeURIComponent(forwardMessage);
                    return digits
                      ? `https://wa.me/${digits}?text=${encoded}`
                      : `https://wa.me/?text=${encoded}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    const stamp = new Date().toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    updateCitizenReport(forwardingReport.id, {
                      forwardedAt: stamp,
                      forwardedTo:
                        forwardTargetName.trim() ||
                        forwardTargetPhone.trim() ||
                        'WhatsApp (seleção livre)',
                      status:
                        forwardingReport.status === 'Aguardando Triagem'
                          ? 'Encaminhado / Em Apuração'
                          : forwardingReport.status,
                    });
                    setTriageFeedback(
                      `Demanda ${forwardingReport.protocol} aberta para envio no WhatsApp e marcada como encaminhada.`
                    );
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 whitespace-nowrap"
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Enviar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nota Devolutiva & Citizen Reply Modal */}
      {respondingReport && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="citizen-response-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-white/15 bg-[#121215] p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3">
              <div>
                <div className="font-mono text-xs text-sky-300 tabular-nums">
                  {respondingReport.protocol} · {respondingReport.citizenName} ({respondingReport.contact})
                </div>
                <h3 id="citizen-response-title" className="mt-1 font-display text-lg font-bold text-white">
                  Nota Devolutiva &amp; Resposta ao Cidadão
                </h3>
                <p className="text-xs text-zinc-400">
                  Registre a nota devolutiva do órgão ou da redação e responda diretamente ao cidadão — sem precisar transformar em matéria.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRespondingReport(null)}
                aria-label="Fechar nota devolutiva"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-zinc-300 hover:bg-white/5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-3.5 text-xs space-y-1">
              <div className="font-semibold text-white">{respondingReport.title}</div>
              <div className="text-[11px] text-zinc-400">
                {respondingReport.city} — {respondingReport.neighborhood} · {respondingReport.category}
              </div>
              <p className="text-zinc-300 pt-1">{respondingReport.description}</p>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-300 font-medium mb-1.5">
                Texto da Nota Devolutiva (Prefeitura / Órgão / Redação) *
              </label>
              <textarea
                rows={5}
                value={responseNoteDraft}
                onChange={(e) => setResponseNoteDraft(e.target.value)}
                placeholder="Ex: A Secretaria de Obras informou que a equipe realizará o reparo da via até sexta-feira sob protocolo nº 4421..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs leading-relaxed text-white placeholder:text-zinc-500 focus:border-[#fa6607] focus:outline-none"
              />
            </div>

            {respondingReport.responseSentAt && (
              <div className="text-[11px] text-sky-300">
                Última resposta registrada em {respondingReport.responseSentAt}
                {respondingReport.responseAuthor ? ` por ${respondingReport.responseAuthor}` : ''}.
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      buildCitizenReplyText(respondingReport, responseNoteDraft)
                    );
                    setResponseCopied(true);
                    window.setTimeout(() => setResponseCopied(false), 2500);
                  } catch {
                    setResponseCopied(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-xs text-zinc-200 hover:bg-white/5 cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                {responseCopied ? 'Resposta Copiada!' : 'Copiar Resposta'}
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!responseNoteDraft.trim()) return;
                    updateCitizenReport(respondingReport.id, {
                      officialResponseNote: responseNoteDraft.trim(),
                      responseAuthor: activeOperator?.name || chiefEditorName,
                      status:
                        respondingReport.status === 'Aguardando Triagem'
                          ? 'Encaminhado / Em Apuração'
                          : respondingReport.status,
                    });
                    setTriageFeedback(
                      `Nota devolutiva salva no protocolo ${respondingReport.protocol}.`
                    );
                    setRespondingReport(null);
                  }}
                  className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3.5 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 cursor-pointer"
                >
                  Apenas Salvar Nota
                </button>

                <a
                  href={(() => {
                    const citizenDigits = sanitizePhoneDigits(respondingReport.contact);
                    const replyText = buildCitizenReplyText(respondingReport, responseNoteDraft);
                    const encoded = encodeURIComponent(replyText);
                    return citizenDigits
                      ? `https://wa.me/${citizenDigits}?text=${encoded}`
                      : `https://wa.me/?text=${encoded}`;
                  })()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    const stamp = new Date().toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    updateCitizenReport(respondingReport.id, {
                      officialResponseNote:
                        responseNoteDraft.trim() ||
                        'Retorno enviado ao cidadão pela Redação FortNews.',
                      responseAuthor: activeOperator?.name || chiefEditorName,
                      responseSentAt: stamp,
                      status: 'Nota Devolutiva Enviada',
                    });
                    setTriageFeedback(
                      `Nota devolutiva enviada ao cidadão (${respondingReport.citizenName}) via WhatsApp.`
                    );
                    setRespondingReport(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] whitespace-nowrap"
                >
                  <Send className="h-3.5 w-3.5" aria-hidden="true" />
                  Enviar Resposta ao Cidadão (WhatsApp)
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
