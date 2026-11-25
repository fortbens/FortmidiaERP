import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Mail,
  Mic2,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { OfficialLetterDocument, OfficialLetterType } from '../../types/fortmidia';
import { downloadOfficialLetterPdf } from '../../utils/pdfGenerator';
import {
  FortMidiaLogo,
  FortNewsLogo,
  OFFICIAL_FORTMIDIA_LOGO_URL,
  OFFICIAL_FORTNEWS_LOGO_URL,
  isOfficialFortNewsLogo,
} from '../FortMidiaLogo';

const LETTER_TYPE_LABELS: Record<OfficialLetterType, string> = {
  convite_empresarial: 'Convite Empresarial',
  convite_podcast: 'Carta Convite Podcast',
  apresentacao_fortmidia: 'Apresentação FortMídia',
  convite_patrocinio: 'Convite de Patrocínio',
  assessoria_mandato: 'Assessoria de Mandato',
};

const LETTER_TYPE_PREFIX: Record<OfficialLetterType, string> = {
  convite_empresarial: 'CONV-EMP',
  convite_podcast: 'CTR-POD',
  apresentacao_fortmidia: 'APRES-FM',
  convite_patrocinio: 'PAT-360',
  assessoria_mandato: 'ASS-MAN',
};

const OFFICIAL_EMAIL = 'comercial@fortmidia.com.br';

const resolveOfficialLetterBrand = (letter: OfficialLetterDocument): 'fortnews' | 'fortmidia' => {
  if (
    letter.type === 'convite_podcast' ||
    isOfficialFortNewsLogo(letter.headerLogoUrl) ||
    (letter.headerLogoUrl || '').toLowerCase().includes('fortnews')
  ) {
    return 'fortnews';
  }
  return 'fortmidia';
};

export const LettersModule: React.FC = () => {
  const {
    officialLetters,
    addOfficialLetter,
    updateOfficialLetter,
    deleteOfficialLetter,
    podcastShows,
    siteSettings,
    teamMembers,
    activeAdminUserId,
  } = useFortMidia();

  const activeOperator = teamMembers.find((m) => m.id === activeAdminUserId) ?? teamMembers[0];
  const canDelete =
    !activeOperator ||
    activeOperator.role === 'Super Admin / Diretoria' ||
    activeOperator.hierarchyLevel === 1 ||
    Boolean(activeOperator.permissions?.canDelete);

  const [selectedId, setSelectedId] = useState<string>(officialLetters[0]?.id || '');
  const [typeFilter, setTypeFilter] = useState<'Todos' | OfficialLetterType>('Todos');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  const filteredLetters = useMemo(
    () =>
      officialLetters.filter((l) => (typeFilter === 'Todos' ? true : l.type === typeFilter)),
    [officialLetters, typeFilter]
  );

  const selectedLetter: OfficialLetterDocument | undefined =
    officialLetters.find((l) => l.id === selectedId) ?? filteredLetters[0] ?? officialLetters[0];

  const selectedBrand = selectedLetter ? resolveOfficialLetterBrand(selectedLetter) : 'fortmidia';

  const flashNotice = (msg: string) => {
    setCopiedMsg(msg);
    window.setTimeout(() => setCopiedMsg(null), 3400);
  };

  const handleCreateTemplate = (type: OfficialLetterType) => {
    const codeNum = String(Math.floor(100 + Math.random() * 899));
    const code = `${LETTER_TYPE_PREFIX[type]}-2026-${codeNum}`;
    const todayFormatted = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const presetsByType: Record<
      OfficialLetterType,
      Omit<OfficialLetterDocument, 'id' | 'createdAt' | 'updatedAt'>
    > = {
      convite_podcast: {
        code,
        type: 'convite_podcast',
        title: `Convite Podcast FortNews — ${code}`,
        dateCityLine: `Franco da Rocha, SP · ${todayFormatted}`,
        recipientName: 'Nome do(a) Convidado(a)',
        recipientRole: 'Cargo / Liderança / Empresário(a)',
        recipientCompany: 'Empresa ou Instituição',
        recipientContact: '(11) 99000-0000',
        subjectRef: 'REF: CONVITE OFICIAL PARA PARTICIPAÇÃO NO PODCAST FORTNEWS',
        greeting: 'Prezado(a) Convidado(a),',
        bodyText:
          'O Grupo FortNews tem a honra de convidá-lo(a) para uma entrevista especial ao vivo em nosso estúdio oficial com gravação multicâmera e cortes para redes sociais.\n\nSua trajetória e visão estratégica enriquecerão o debate regional junto à nossa audiência em Franco da Rocha, Caieiras, Francisco Morato, Cajamar e Mairiporã.',
        highlights: [
          'Transmissão ao vivo YouTube & Portal FortNews',
          'Entrega de cortes verticais (Reels / Shorts) após gravação',
          'Matéria escrita publicada no Portal Jornal FortNews',
        ],
        closingLine: 'Aguardamos sua confirmação de agenda.',
        senderName: 'Emerson Carneiro dos Santos',
        senderRole: 'Editor-Chefe & Diretor Executivo · Grupo FortMídia / FortNews',
        senderEmail: OFFICIAL_EMAIL,
        senderPhone: '(11) 95779-2424',
        podcastShowTitle: podcastShows[1]?.title || 'A Regra do Jogo',
        podcastEpisodeDate: 'A confirmar',
        podcastEpisodeTime: podcastShows[1]?.schedule || '17h00 às 18h30',
        podcastStudioAddress: 'Estúdio Oficial Grupo FortNews · Centro, Franco da Rocha — SP',
        headerLogoUrl: OFFICIAL_FORTNEWS_LOGO_URL,
        accentColor: '#fa6607',
      },
      apresentacao_fortmidia: {
        code,
        type: 'apresentacao_fortmidia',
        title: `Carta Apresentação FortMídia — ${code}`,
        dateCityLine: `Franco da Rocha, SP · ${todayFormatted}`,
        recipientName: 'À Diretoria Executiva / Marketing',
        recipientRole: 'Decisor Comercial',
        recipientCompany: 'Empresa Convidada',
        recipientContact: 'contato@empresa.com.br',
        subjectRef: 'REF: APRESENTAÇÃO INSTITUCIONAL & ECOSSISTEMA 360° GRUPO FORTMÍDIA',
        greeting: 'Prezados Diretores,',
        bodyText:
          'Apresentamos o Grupo FortMídia & Grupo FortNews (CNPJ 66.550.817/0001-41), ecossistema que integra Jornalismo Digital 24/7, Rede de Outdoors 9x3m no CIMBAJU, Estúdio Podcast (16h–20h), Revista A4 Mensal, Agência 360° e soluções FortTech (FortChat com IA e ERP/CRM AcertGo).\n\nNossa direção executiva liderada por Emerson Carneiro dos Santos (22+ anos e mais de R$ 2 Bi em VGV) garante execução comercial, autoridade editorial e retorno estratégico.',
        highlights: [
          'Rede FortMídia OOH: Outdoors iluminados 9x3m nas 5 cidades do CIMBAJU',
          'Portal FortNews: cobertura 24/7 em Franco, Caieiras, Morato, Cajamar e Mairiporã',
          'FortTech IA: FortChat (Multiatendimento com IA) e ERP/CRM AcertGo para Imobiliárias',
        ],
        closingLine: 'Permanecemos à disposição para apresentar nosso Mídia Kit 2026.',
        senderName: 'Emerson Carneiro dos Santos',
        senderRole: 'Editor-Chefe & Diretor Executivo · Grupo FortMídia',
        senderEmail: OFFICIAL_EMAIL,
        senderPhone: '(11) 95779-2424',
        headerLogoUrl: OFFICIAL_FORTMIDIA_LOGO_URL,
        accentColor: '#fa6607',
      },
      convite_patrocinio: {
        code,
        type: 'convite_patrocinio',
        title: `Convite Patrocínio Estratégico — ${code}`,
        dateCityLine: `Franco da Rocha, SP · ${todayFormatted}`,
        recipientName: 'Diretoria Comercial & Presidência',
        recipientRole: 'Patrocinador Oficial',
        recipientCompany: 'Marca Parceira',
        recipientContact: '(11) 99000-0000',
        subjectRef: 'REF: CONVITE PARA COTA DE PATROCÍNIO OFICIAL — FORTMÍDIA 360°',
        greeting: 'Prezado(a) Parceiro(a),',
        bodyText:
          'Convidamos sua empresa para assumir a cota oficial de patrocínio em nosso circuito integrado: Outdoors Rodoviários 9x3m no CIMBAJU, Podcasts FortNews (16h–20h), Portal de Notícias, Revista Mensal A4 e Eventos Proprietários (Melhores do Ano e Trio Elétrico).\n\nTemos cotas moduláveis desde Editorial & Revista A4 (R$ 2.950) e Cota Master Podcast (R$ 3.800/mês) até Circuito Outdoor 9x3m e Assessoria 360°.',
        highlights: [
          'Editorial & Revista A4 (R$ 2.950/edição) · Cota Master Podcast (R$ 3.800/mês)',
          'Circuito Outdoor 9x3m (R$ 4.600/bimestre) · Agência & Branding 360° (R$ 5.400/mês)',
          'Checking mensal em PDF e acesso ao Pipeline do Cliente',
        ],
        closingLine: 'Garantimos prioridade de segmento mediante retorno em até 10 dias.',
        senderName: 'Emerson Carneiro dos Santos',
        senderRole: 'Editor-Chefe & Diretor Executivo Comercial · Grupo FortMídia',
        senderEmail: OFFICIAL_EMAIL,
        senderPhone: '(11) 95779-2424',
        headerLogoUrl: OFFICIAL_FORTMIDIA_LOGO_URL,
        accentColor: '#fa6607',
      },
      assessoria_mandato: {
        code,
        type: 'assessoria_mandato',
        title: `Proposta Assessoria Mandato — ${code}`,
        dateCityLine: `Franco da Rocha, SP · ${todayFormatted}`,
        recipientName: 'Exmo(a). Vereador(a) / Prefeito(a) / Liderança',
        recipientRole: 'Mandato Público',
        recipientCompany: 'Gabinete Regional — CIMBAJU',
        recipientContact: '(11) 99000-0000',
        subjectRef: 'REF: ASSESSORIA DE MANDATO, PERSONAL BRANDING & PRESTAÇÃO DE CONTAS',
        greeting: 'Prezado(a) Liderança,',
        bodyText:
          'Apresentamos nossa Assessoria de Comunicação Integrada para Mandatos e Lideranças: produção mensal de Reels/Shorts, presença estratégica no Jornal FortNews, entrevistas no Podcast e tráfego pago geolocalizado por CEP.\n\nTransformamos entregas parlamentares em visibilidade real e autoridade junto aos cidadãos.',
        highlights: [
          '12 vídeos verticais mensais com captação em estúdio ou campo',
          'Tráfego pago segmentado por CEP no CIMBAJU',
          'Media training e monitoramento de demandas comunitárias',
        ],
        closingLine: 'Estamos prontos para apresentar o diagnóstico inicial de comunicação.',
        senderName: 'Emerson Carneiro dos Santos',
        senderRole: 'Editor-Chefe & Estrategista de Comunicação · Grupo FortMídia',
        senderEmail: OFFICIAL_EMAIL,
        senderPhone: '(11) 95779-2424',
        headerLogoUrl: OFFICIAL_FORTMIDIA_LOGO_URL,
        accentColor: '#fa6607',
      },
      convite_empresarial: {
        code,
        type: 'convite_empresarial',
        title: `Convite Empresarial — Grupo FortMídia (${code})`,
        dateCityLine: `Franco da Rocha, SP · ${todayFormatted}`,
        recipientName: 'Ao empresariado e às lideranças comerciais',
        recipientRole: 'Empresário(a) / Diretoria Comercial',
        recipientCompany: 'Empresas da Região do CIMBAJU',
        recipientContact: '(11) 95779-2424 · comercial@fortnews.com.br',
        subjectRef: 'REF: CONVITE PARA PARTICIPAÇÃO NO ECOSSISTEMA GRUPO FORTMÍDIA',
        greeting:
          'Ao empresariado e às lideranças comerciais da região do CIMBAJU (Franco da Rocha, Caieiras, Francisco Morato, Cajamar e Mairiporã),',
        bodyText:
          'Temos a satisfação de convidar a sua empresa para conhecer e integrar o ecossistema de comunicação, mídia e tecnologia do Grupo FortMídia — uma estrutura sediada em Franco da Rocha e dedicada a ampliar a visibilidade, o posicionamento e a geração de negócios para marcas que atuam na nossa região.\n\nO Grupo FortMídia reúne, em uma operação integrada, o jornalismo e a audiência regional do FortNews, FortNews Podcast e FortNews TV, a presença física em mídias urbanas e exteriores, os serviços da Agência FortMídia e as soluções de desenvolvimento e automação da FortTech.\n\n1. COMO A SUA EMPRESA PODE PARTICIPAR:\n• Patrocínios e Cotas no Ecossistema (Portal FortNews, FortNews Podcast e FortNews TV).\n• Agência FortMídia (gestão de social media, campanhas online, tráfego segmentado e posicionamento digital).\n• Mídia Exterior e Pontos de Fluxo (outdoors e circuitos estratégicos no CIMBAJU).\n• Tecnologia e Estúdio Corporativo (sites, aplicativos, sistemas FortTech e locação do estúdio para gravações institucionais).\n• Projetos e Eventos Regionais (ativações, patrocínios e iniciativas comunitárias e setoriais).\n\nConvidamos você e sua equipe para uma conversa institucional ou visita à nossa sede em Franco da Rocha (Rua Dr. Hamilton Prado, 289 — Centro).',
        highlights: [
          'Alcance Digital Comprovado: Mais de 1,8 milhão de visualizações mensais nas redes conectando sua marca ao público regional.',
          'Presença em Rotas de Outdoors: Mais de 70.000 visualizações nas rotas de outdoors nos principais fluxos da região.',
          'Segmentação Regional Direcionada: Ações pensadas para Franco da Rocha, Caieiras, Francisco Morato, Cajamar e Mairiporã.',
          'Soluções Sob Medida: Planejamento alinhado ao porte, ao momento e às metas comerciais de cada negócio.',
          'Atendimento Próximo e Estrutura Local: Operação sediada na Rua Dr. Hamilton Prado, 289 — Centro, Franco da Rocha.',
        ],
        closingLine:
          'Para agendar uma reunião ou solicitar uma proposta comercial, entre em contato pelos canais oficiais: fortmidia.com.br · jornalfortnews.com.br · comercial@fortnews.com.br ou redacao@fortnews.com.br · WhatsApp (11) 95779-2424.',
        senderName: 'Emerson Carneiro',
        senderRole: 'Diretor Executivo · Grupo FortMídia',
        senderEmail: 'comercial@fortnews.com.br',
        senderPhone: '(11) 95779-2424',
        referencePdfUrl: '/assets/aistudio/Convite_Empresarial_-_Grupo_FortM_dia_287f1a39.pdf',
        headerLogoUrl: OFFICIAL_FORTMIDIA_LOGO_URL,
        accentColor: '#fa6607',
      },
    };

    const created = addOfficialLetter(presetsByType[type]);
    setTypeFilter('Todos');
    setSelectedId(created.id);
    flashNotice(`Novo documento "${LETTER_TYPE_LABELS[type]}" criado e salvo.`);
  };

  const handlePatch = (patch: Partial<OfficialLetterDocument>) => {
    if (!selectedLetter) return;
    updateOfficialLetter(selectedLetter.id, patch);
  };

  const handleExplicitSave = () => {
    if (!selectedLetter) return;
    const officialLogo =
      selectedBrand === 'fortnews' ? OFFICIAL_FORTNEWS_LOGO_URL : OFFICIAL_FORTMIDIA_LOGO_URL;
    updateOfficialLetter(selectedLetter.id, {
      ...selectedLetter,
      headerLogoUrl: officialLogo,
      senderEmail: selectedLetter.senderEmail?.trim() || OFFICIAL_EMAIL,
    });
    flashNotice(`Documento "${selectedLetter.title}" (${selectedLetter.code}) salvo com sucesso!`);
  };

  const handleSaveAsNewCopy = () => {
    if (!selectedLetter) return;
    const codeNum = String(Math.floor(100 + Math.random() * 899));
    const newCode = `${LETTER_TYPE_PREFIX[selectedLetter.type]}-2026-${codeNum}`;
    const officialLogo =
      selectedBrand === 'fortnews' ? OFFICIAL_FORTNEWS_LOGO_URL : OFFICIAL_FORTMIDIA_LOGO_URL;
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = selectedLetter;
    const created = addOfficialLetter({
      ...rest,
      code: newCode,
      title: `${selectedLetter.title} (Cópia)`,
      headerLogoUrl: officialLogo,
      senderEmail: selectedLetter.senderEmail?.trim() || OFFICIAL_EMAIL,
    });
    setTypeFilter('Todos');
    setSelectedId(created.id);
    flashNotice(`Nova cópia "${created.code}" incluída e salva na biblioteca.`);
  };

  const handleApplyPodcastShow = (showId: string) => {
    if (!selectedLetter) return;
    const show = podcastShows.find((s) => s.id === showId);
    if (!show) return;
    handlePatch({
      podcastShowTitle: show.title,
      podcastEpisodeTime: show.schedule,
      headerLogoUrl: OFFICIAL_FORTNEWS_LOGO_URL,
      subjectRef: `REF: CONVITE OFICIAL — PROGRAMA ${show.title.toUpperCase()} (FORTNEWS PODCAST)`,
    });
    flashNotice(`Programa "${show.title}" vinculado à Carta Convite.`);
  };

  const handleDownloadPdf = async () => {
    if (!selectedLetter) return;
    setExportingPdf(true);
    try {
      const normalizedLetter: OfficialLetterDocument = {
        ...selectedLetter,
        headerLogoUrl:
          selectedBrand === 'fortnews' ? OFFICIAL_FORTNEWS_LOGO_URL : OFFICIAL_FORTMIDIA_LOGO_URL,
        senderEmail: selectedLetter.senderEmail?.trim() || OFFICIAL_EMAIL,
      };
      await downloadOfficialLetterPdf(normalizedLetter, siteSettings);
      flashNotice(`PDF oficial "${normalizedLetter.code}" gerado com sucesso.`);
    } finally {
      setExportingPdf(false);
    }
  };

  const handleCopyWhatsAppText = async () => {
    if (!selectedLetter) return;
    const lines = [
      `*${selectedLetter.subjectRef}*`,
      `${selectedLetter.dateCityLine}`,
      '',
      `A/C: ${selectedLetter.recipientName} (${selectedLetter.recipientCompany})`,
      selectedLetter.type === 'convite_podcast' && selectedLetter.podcastShowTitle
        ? `🎙️ Programa: ${selectedLetter.podcastShowTitle} · ${selectedLetter.podcastEpisodeDate} · ${selectedLetter.podcastEpisodeTime}`
        : '',
      '',
      selectedLetter.greeting,
      selectedLetter.bodyText,
      '',
      ...selectedLetter.highlights.filter(Boolean).map((h) => `✅ ${h}`),
      '',
      selectedLetter.closingLine,
      `— ${selectedLetter.senderName}`,
      `${selectedLetter.senderRole}`,
      `📞 ${selectedLetter.senderPhone} · ✉️ ${selectedLetter.senderEmail || OFFICIAL_EMAIL}`,
    ]
      .filter((v) => v !== '')
      .join('\n');

    try {
      await navigator.clipboard.writeText(lines);
      flashNotice('Texto da carta copiado para WhatsApp/E-mail.');
    } catch {
      flashNotice('Selecione e copie o conteúdo da prévia ao lado.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-white">
            Cartas Oficiais, Convites &amp; Propostas em PDF
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Inclua novas cartas, salve na biblioteca e exporte em PDF papel timbrado oficial FortMídia ou FortNews, assinadas por Emerson Carneiro ({OFFICIAL_EMAIL}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              handleCreateTemplate(
                typeFilter === 'Todos' ? 'apresentacao_fortmidia' : typeFilter
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Incluir Nova Carta
          </button>
          {(
            [
              ['convite_empresarial', 'Convite Empresarial'],
              ['convite_podcast', 'Convite Podcast'],
              ['apresentacao_fortmidia', 'Apresentação FortMídia'],
              ['convite_patrocinio', 'Convite Patrocínio'],
              ['assessoria_mandato', 'Assessoria Mandato'],
            ] as [OfficialLetterType, string][]
          ).map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => handleCreateTemplate(type)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#121215] px-3 py-2 text-xs font-medium text-zinc-200 hover:border-[#fa6607]/50 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {copiedMsg && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-200"
        >
          <Check className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{copiedMsg}</span>
        </div>
      )}

      {/* Filter & Document Selector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left column: Saved letters list + Editor form */}
        <div className="lg:col-span-6 space-y-5">
          <div className="rounded-xl border border-white/10 bg-[#111114] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                Modelos &amp; Documentos Salvos ({filteredLetters.length})
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {(['Todos', 'convite_empresarial', 'convite_podcast', 'apresentacao_fortmidia', 'convite_patrocinio', 'assessoria_mandato'] as const).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTypeFilter(t)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                        typeFilter === t
                          ? 'bg-[#fa6607] text-white'
                          : 'bg-[#0A0A0A] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t === 'Todos' ? 'Todos' : LETTER_TYPE_LABELS[t]}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {filteredLetters.map((ltr) => {
                const isSelected = selectedLetter?.id === ltr.id;
                return (
                  <div
                    key={ltr.id}
                    onClick={() => setSelectedId(ltr.id)}
                    className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#fa6607] bg-[#fa6607]/10'
                        : 'border-white/10 bg-[#0A0A0A] hover:border-white/25'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-[#D4AF37] tabular-nums shrink-0">
                          {ltr.code}
                        </span>
                        <span className="text-[11px] text-zinc-500">·</span>
                        <span className="text-[11px] font-medium text-[#fa6607] truncate">
                          {LETTER_TYPE_LABELS[ltr.type]}
                        </span>
                        {ltr.referencePdfUrl && (
                          <span className="rounded border border-emerald-500/35 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300 shrink-0">
                            PDF Anexo
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs font-semibold text-white truncate">
                        {ltr.title}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        Para: {ltr.recipientName} ({ltr.recipientCompany})
                      </div>
                    </div>

                    {canDelete && officialLetters.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteOfficialLetter(ltr.id);
                        }}
                        title="Excluir documento"
                        className="rounded-md border border-red-500/25 p-1.5 text-red-400 hover:bg-red-500/10 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selectedLetter && (
            <div className="rounded-xl border border-white/10 bg-[#111114] p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
                  <h2 className="font-display text-sm font-bold text-white">
                    Editar Conteúdo do Documento
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveAsNewCopy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-2.5 py-1.5 text-[11px] font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
                  >
                    <FilePlus2 className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
                    Salvar como Nova
                  </button>
                  <button
                    type="button"
                    onClick={handleExplicitSave}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden="true" />
                    Salvar Carta
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Tipo de Carta</label>
                  <select
                    value={selectedLetter.type}
                    onChange={(e) => {
                      const nextType = e.target.value as OfficialLetterType;
                      handlePatch({
                        type: nextType,
                        headerLogoUrl:
                          nextType === 'convite_podcast'
                            ? OFFICIAL_FORTNEWS_LOGO_URL
                            : OFFICIAL_FORTMIDIA_LOGO_URL,
                      });
                    }}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  >
                    {Object.entries(LETTER_TYPE_LABELS).map(([k, lbl]) => (
                      <option key={k} value={k}>
                        {lbl}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Protocolo / Código</label>
                  <input
                    type="text"
                    value={selectedLetter.code}
                    onChange={(e) => handlePatch({ code: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Título Interno</label>
                  <input
                    type="text"
                    value={selectedLetter.title}
                    onChange={(e) => handlePatch({ title: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Local &amp; Data</label>
                  <input
                    type="text"
                    value={selectedLetter.dateCityLine}
                    onChange={(e) => handlePatch({ dateCityLine: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Quick Podcast Selector when Convite Podcast */}
              {selectedLetter.type === 'convite_podcast' && (
                <div className="rounded-lg border border-[#fa6607]/30 bg-[#fa6607]/5 p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#fa6607]">
                      <Mic2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Dados da Gravação — Podcast FortNews
                    </span>
                    <select
                      aria-label="Vincular programa oficial da grade"
                      onChange={(e) => handleApplyPodcastShow(e.target.value)}
                      defaultValue=""
                      className="rounded-md border border-white/15 bg-[#0A0A0A] px-2.5 py-1 text-[11px] text-zinc-200"
                    >
                      <option value="" disabled>
                        Carregar da Grade Oficial...
                      </option>
                      {podcastShows.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title} ({s.daySlot})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <input
                      type="text"
                      value={selectedLetter.podcastShowTitle || ''}
                      onChange={(e) => handlePatch({ podcastShowTitle: e.target.value })}
                      placeholder="Programa"
                      className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={selectedLetter.podcastEpisodeDate || ''}
                      onChange={(e) => handlePatch({ podcastEpisodeDate: e.target.value })}
                      placeholder="Data (ex: 25/11/2026)"
                      className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={selectedLetter.podcastEpisodeTime || ''}
                      onChange={(e) => handlePatch({ podcastEpisodeTime: e.target.value })}
                      placeholder="Horário (ex: 17h00)"
                      className="rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={selectedLetter.podcastStudioAddress || ''}
                    onChange={(e) => handlePatch({ podcastStudioAddress: e.target.value })}
                    placeholder="Endereço do Estúdio"
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-1.5 text-xs text-white"
                  />
                </div>
              )}

              {/* Recipient Fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">A/C Destinatário</label>
                  <input
                    type="text"
                    value={selectedLetter.recipientName}
                    onChange={(e) => handlePatch({ recipientName: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    value={selectedLetter.recipientRole}
                    onChange={(e) => handlePatch({ recipientRole: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Empresa / Instituição</label>
                  <input
                    type="text"
                    value={selectedLetter.recipientCompany}
                    onChange={(e) => handlePatch({ recipientCompany: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Contato / E-mail</label>
                  <input
                    type="text"
                    value={selectedLetter.recipientContact}
                    onChange={(e) => handlePatch({ recipientContact: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Assunto (REF:)</label>
                <input
                  type="text"
                  value={selectedLetter.subjectRef}
                  onChange={(e) => handlePatch({ subjectRef: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Saudação</label>
                <input
                  type="text"
                  value={selectedLetter.greeting}
                  onChange={(e) => handlePatch({ greeting: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Corpo da Carta (use linha em branco para separar parágrafos)
                </label>
                <textarea
                  rows={6}
                  value={selectedLetter.bodyText}
                  onChange={(e) => handlePatch({ bodyText: e.target.value })}
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs leading-relaxed text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">
                  Destaques / Benefícios Oficiais (1 por linha)
                </label>
                <textarea
                  rows={3}
                  value={selectedLetter.highlights.join('\n')}
                  onChange={(e) =>
                    handlePatch({
                      highlights: e.target.value.split('\n'),
                    })
                  }
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs leading-relaxed text-white"
                />
              </div>

              {/* Official Brand Letterhead Toggle + Accent Color */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">
                    Timbre Oficial do PDF
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePatch({ headerLogoUrl: OFFICIAL_FORTMIDIA_LOGO_URL })}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                        selectedBrand === 'fortmidia'
                          ? 'border-[#fa6607] bg-[#fa6607]/15 text-white'
                          : 'border-white/15 bg-[#0A0A0A] text-zinc-400 hover:text-white'
                      }`}
                    >
                      FortMídia (Oficial)
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePatch({ headerLogoUrl: OFFICIAL_FORTNEWS_LOGO_URL })}
                      className={`rounded-lg border px-2.5 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                        selectedBrand === 'fortnews'
                          ? 'border-[#fa6607] bg-[#fa6607]/15 text-white'
                          : 'border-white/15 bg-[#0A0A0A] text-zinc-400 hover:text-white'
                      }`}
                    >
                      FortNews (Oficial)
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Cor de Destaque</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedLetter.accentColor}
                      onChange={(e) => handlePatch({ accentColor: e.target.value })}
                      className="h-9 w-11 rounded border border-white/15 bg-[#0A0A0A] p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedLetter.accentColor}
                      onChange={(e) => handlePatch({ accentColor: e.target.value })}
                      className="flex-1 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 font-mono text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Signature fields */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 border-t border-white/10 pt-3">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Assinante</label>
                  <input
                    type="text"
                    value={selectedLetter.senderName}
                    onChange={(e) => handlePatch({ senderName: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Cargo do Assinante</label>
                  <input
                    type="text"
                    value={selectedLetter.senderRole}
                    onChange={(e) => handlePatch({ senderRole: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">E-mail Oficial</label>
                  <input
                    type="email"
                    value={selectedLetter.senderEmail}
                    onChange={(e) => handlePatch({ senderEmail: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={selectedLetter.senderPhone}
                    onChange={(e) => handlePatch({ senderPhone: e.target.value })}
                    className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-3">
                <button
                  type="button"
                  onClick={handleSaveAsNewCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer"
                >
                  <FilePlus2 className="h-3.5 w-3.5 text-[#D4AF37]" aria-hidden="true" />
                  Salvar como Nova Cópia
                </button>
                <button
                  type="button"
                  onClick={handleExplicitSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  Salvar Alterações
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Live A4 Print Preview + PDF & Copy actions */}
        <div className="lg:col-span-6 space-y-4 lg:sticky lg:top-20">
          {selectedLetter && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#111114] p-3.5">
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <Sparkles className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
                  <span>
                    Pré-visualização Papel Timbrado A4 ({selectedBrand === 'fortnews' ? 'FortNews' : 'FortMídia'})
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedLetter.referencePdfUrl && (
                    <a
                      href={selectedLetter.referencePdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/20 cursor-pointer whitespace-nowrap"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      PDF Original (Anexo)
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyWhatsAppText}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                    Copiar Texto
                  </button>
                  <button
                    type="button"
                    disabled={exportingPdf}
                    onClick={handleDownloadPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-4 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    {exportingPdf ? 'Gerando PDF...' : 'Baixar PDF Oficial'}
                  </button>
                </div>
              </div>

              {/* A4 White Paper Simulation */}
              <div className="overflow-hidden rounded-xl border border-white/15 bg-white text-zinc-900 shadow-2xl">
                <div className="flex h-1.5 w-full">
                  <div className="w-[72%]" style={{ backgroundColor: selectedLetter.accentColor || '#fa6607' }} />
                  <div className="w-[28%] bg-[#D4AF37]" />
                </div>

                <div className="p-6 sm:p-8 space-y-5">
                  {/* Letterhead — Always Official FortMídia or Official FortNews Logo */}
                  <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4">
                    <div className="flex items-center">
                      {selectedBrand === 'fortnews' ? (
                        <FortNewsLogo
                          onLightSurface
                          className="h-11 sm:h-12"
                          alt="Jornal FortNews — Logo Oficial"
                        />
                      ) : (
                        <FortMidiaLogo
                          onLightSurface
                          className="h-12 sm:h-14"
                          alt="Grupo FortMídia — Logo Oficial"
                        />
                      )}
                    </div>
                    <div className="text-right">
                      <div
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: selectedLetter.accentColor || '#fa6607' }}
                      >
                        {LETTER_TYPE_LABELS[selectedLetter.type]}
                      </div>
                      <div className="text-xs text-zinc-600">{selectedLetter.dateCityLine}</div>
                      <div className="font-mono text-[10px] text-zinc-400">
                        {selectedLetter.code}
                      </div>
                    </div>
                  </div>

                  {/* Recipient Card */}
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">A/C</div>
                      <div className="font-bold text-zinc-900">{selectedLetter.recipientName}</div>
                      <div className="text-zinc-600">{selectedLetter.recipientCompany}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Cargo &amp; Contato</div>
                      <div className="font-semibold text-zinc-800">{selectedLetter.recipientRole}</div>
                      <div className="text-zinc-600 break-all">{selectedLetter.recipientContact}</div>
                    </div>
                  </div>

                  {/* Subject */}
                  <div
                    className="text-xs sm:text-sm font-bold leading-snug"
                    style={{ color: selectedLetter.accentColor || '#fa6607' }}
                  >
                    {selectedLetter.subjectRef}
                  </div>

                  {/* Podcast Session Box */}
                  {selectedLetter.type === 'convite_podcast' && selectedLetter.podcastShowTitle && (
                    <div
                      className="rounded-lg border p-3 text-xs space-y-0.5"
                      style={{
                        borderColor: selectedLetter.accentColor || '#fa6607',
                        backgroundColor: '#FFF7F0',
                      }}
                    >
                      <div
                        className="font-bold uppercase text-[11px]"
                        style={{ color: selectedLetter.accentColor || '#fa6607' }}
                      >
                        Programa: {selectedLetter.podcastShowTitle}
                      </div>
                      <div className="text-zinc-800">
                        Data: <strong>{selectedLetter.podcastEpisodeDate}</strong> · Horário:{' '}
                        <strong>{selectedLetter.podcastEpisodeTime}</strong>
                      </div>
                      <div className="text-zinc-600 text-[11px]">
                        {selectedLetter.podcastStudioAddress}
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div className="space-y-3 text-xs sm:text-[13px] leading-relaxed text-zinc-700">
                    <p className="font-bold text-zinc-900">{selectedLetter.greeting}</p>
                    {selectedLetter.bodyText
                      .split(/\n\s*\n/)
                      .filter(Boolean)
                      .map((para, idx) => (
                        <p key={idx}>{para.trim()}</p>
                      ))}
                  </div>

                  {/* Highlights */}
                  {selectedLetter.highlights.filter((h) => h.trim()).length > 0 && (
                    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3.5 space-y-1.5">
                      <div
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: selectedLetter.accentColor || '#fa6607' }}
                      >
                        Diferenciais &amp; Entregas Oficiais
                      </div>
                      <ul className="space-y-1 text-xs text-zinc-800">
                        {selectedLetter.highlights
                          .filter((h) => h.trim())
                          .map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span
                                className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: selectedLetter.accentColor || '#fa6607' }}
                              />
                              <span>{item}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {/* Closing & Signature */}
                  <div className="pt-2 space-y-5 text-xs text-zinc-700">
                    <p>{selectedLetter.closingLine}</p>
                    <div className="pt-2 border-t border-zinc-300 max-w-xs">
                      <div className="font-bold text-sm text-zinc-900">
                        {selectedLetter.senderName}
                      </div>
                      <div className="text-[11px] text-zinc-600">{selectedLetter.senderRole}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                        <span>{selectedLetter.senderPhone}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" aria-hidden="true" />
                          {selectedLetter.senderEmail || OFFICIAL_EMAIL}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-200 pt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-zinc-400">
                    <span>GRUPO FORT NEWS LTDA · CNPJ 66.550.817/0001-41</span>
                    <span>{OFFICIAL_EMAIL} · fortmidia.com.br</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
