import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Bot,
  Building,
  Building2,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  Facebook,
  Instagram,
  Layers,
  MapPin,
  MessageSquare,
  Mic2,
  Newspaper,
  Phone,
  ShieldCheck,
  TrendingUp,
  Youtube,
} from 'lucide-react';
import { useFortMidia } from '../../context/FortMidiaContext';
import { downloadInstitutionalDossierPdf } from '../../utils/pdfGenerator';
import { MediaFrame } from '../MediaFrame';
import { FortMidiaLogo, OFFICIAL_FORTMIDIA_LOGO_URL } from '../FortMidiaLogo';

interface InstitutionalPresentationProps {
  adminMode?: boolean;
  onBackToPortal?: () => void;
  onOpenProposal?: (quotaName?: string) => void;
  onOpenFortNews?: () => void;
}

const COMMERCIAL_PACKAGES = [
  {
    name: 'Editorial & Revista A4',
    price: 'R$ 2.950',
    cycle: '/ edição',
    duration: 'Mensal + Portal 24/7',
    scope: 'Matéria Especial no Portal FortNews + Página Dupla na Revista A4',
    audience: 'Distribuição dirigida em consultórios, gabinetes, condomínios e empresas do CIMBAJU',
  },
  {
    name: 'Master Podcast 16h–20h',
    price: 'R$ 3.800',
    cycle: '/ mês',
    duration: '7 programas oficiais',
    scope: 'Vinheta + QR Code Ao Vivo + 8 Reels/Shorts + 1 Bancada Mensal',
    audience: 'Audiência qualificada no horário nobre digital com cortes virais em collab',
  },
  {
    name: 'Circuito Outdoor 9x3m',
    price: 'R$ 4.600',
    cycle: '/ bimestre',
    duration: '60 dias contínuos',
    scope: 'Estrutura Frontlight 9×3m com lona, instalação e checking fotográfico',
    audience: 'Corredores rodoviários e acessos estratégicos nas 5 cidades do CIMBAJU',
  },
  {
    name: 'Agência & Branding 360°',
    price: 'R$ 5.400',
    cycle: '/ mês',
    duration: 'Assessoria dedicada',
    scope: '12 Reels/Shorts + Tráfego Pago por CEP + Assessoria de Imprensa',
    audience: 'Posicionamento executivo para empresas, marcas líderes e mandatos regionais',
  },
];

const FORTTECH_PRODUCTS = [
  {
    id: 'fortchat',
    badge: 'FORTTECH · MULTIAUTOMAÇÃO & IA',
    name: 'FortChat',
    subtitle: 'Plataforma de Multiatendimento Empresarial com IA Integrada',
    price: 'R$ 497',
    cycle: '/ mês',
    icon: MessageSquare,
    summary:
      'Centralize WhatsApp, Instagram Direct, Facebook Messenger e Chat Web em uma única operação comercial e de suporte com agentes de Inteligência Artificial 24/7.',
    features: [
      'Agentes de IA treinados no catálogo da empresa para atendimento e pré-vendas 24/7',
      'Múltiplos atendentes no mesmo número oficial de WhatsApp com filas por setor',
      'Funil Kanban de leads, etiquetas inteligentes, disparo de campanhas e métricas em tempo real',
      'Integração direta com CRM, agendamentos automáticos e histórico completo do cliente',
    ],
    ctaLabel: 'Solicitar Orçamento FortChat',
    proposalKey: 'FortChat — Plataforma de Multiatendimento com IA (FortTech)',
  },
  {
    id: 'acertgo',
    badge: 'FORTTECH · REAL ESTATE PRO',
    name: 'ERP/CRM AcertGo',
    subtitle: 'ERP/CRM para Imobiliárias de Alta Performance com Site e IA Integrados',
    price: 'R$ 790',
    cycle: '/ mês',
    icon: Building,
    summary:
      'Ecossistema completo desenhado para imobiliárias, incorporadoras e corretores de alta performance: gestão de carteira, site imobiliário próprio de alta conversão e IA qualificando compradores.',
    features: [
      'Site imobiliário responsivo e otimizado para SEO integrado em tempo real à carteira de imóveis',
      'IA comercial integrada para atendimento imediato de leads, match de imóveis e agendamento de visitas',
      'ERP completo com funil de vendas e locação, comissões, propostas digitais e controle de corretores',
      'Publicação integrada em portais e acompanhamento executivo de VGV e conversão por equipe',
    ],
    ctaLabel: 'Solicitar Orçamento ERP/CRM AcertGo',
    proposalKey: 'ERP/CRM AcertGo — Plataforma Imobiliária com Site e IA (FortTech)',
  },
];

export const InstitutionalPresentation: React.FC<InstitutionalPresentationProps> = ({
  adminMode = false,
  onBackToPortal,
  onOpenProposal,
  onOpenFortNews,
}) => {
  const { siteSettings, outdoorPoints, podcastShows } = useFortMidia();
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const whatsappDigits = (siteSettings.whatsappNumber || '5511957792424').replace(/\D/g, '');
  const instagramUrl = siteSettings.instagramUrl || 'https://www.instagram.com/grupofortnews';
  const facebookUrl = siteSettings.facebookUrl || 'https://www.facebook.com/portalfortnew';
  const youtubeUrl = siteSettings.youtubeUrl || 'https://www.youtube.com/@FortnewsPodcast';

  const handleDownloadDossier = async () => {
    setDownloadingPdf(true);
    try {
      await downloadInstitutionalDossierPdf(siteSettings);
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className={adminMode ? 'space-y-8' : 'min-h-screen bg-[#0A0A0A] text-[#F5F5F7]'}>
      {/* Standalone Public Top Bar */}
      {!adminMode && (
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={onBackToPortal}
              className="inline-flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4 text-[#fa6607]" aria-hidden="true" />
              Voltar ao Portal FortMídia
            </button>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                disabled={downloadingPdf}
                onClick={handleDownloadDossier}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#fa6607] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {downloadingPdf ? 'Gerando PDF...' : 'Baixar Dossiê PDF'}
              </button>
            </div>
          </div>
        </header>
      )}

      <div className={adminMode ? 'space-y-8' : 'mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10'}>
        {/* Hero Executive Deck Banner */}
        <section className="rounded-xl border border-white/10 bg-[#111114] p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <FortMidiaLogo
                  src={siteSettings.logoUrl || OFFICIAL_FORTMIDIA_LOGO_URL}
                  alt="Logo Grupo FortMídia"
                  className="h-12 sm:h-14"
                />
                <span className="text-zinc-600">|</span>
                <div className="rounded-lg bg-white px-2.5 py-1 shadow-sm">
                  <img
                    src="/assets/aistudio/Logo_FortNews_Vetorizado_Nova_Marca__Usar_Esse__9741accd.png"
                    alt="Logo Oficial Jornal FortNews"
                    className="h-9 sm:h-10 w-auto object-contain"
                  />
                </div>
              </div>

              <p className="text-xs font-semibold uppercase tracking-wider text-[#D4AF37]">
                Apresentação Institucional 360° · Holding, Agência de Mídia &amp; FortTech IA
              </p>

              <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
                A maior potência de comunicação e tecnologia integrada do CIMBAJU
              </h1>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-300 max-w-3xl">
                Unimos jornalismo multiplataforma 24/7 no <strong>Jornal FortNews</strong>, rede própria de <strong>Mídia Exterior OOH (Outdoors 9x3m)</strong>, estúdio próprio de <strong>Podcasts (16h–20h)</strong>, divisão impressa (Revista A4 &amp; Tabloide Quinzenal), <strong>Agência 360°</strong> e soluções tecnológicas <strong>FortTech (FortChat &amp; ERP/CRM AcertGo)</strong> em Franco da Rocha, Caieiras, Francisco Morato, Cajamar e Mairiporã.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={handleDownloadDossier}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#fa6607] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {downloadingPdf
                    ? 'Gerando Dossiê Institucional...'
                    : 'Gerar Apresentação Institucional (PDF)'}
                </button>
                {onOpenProposal && (
                  <button
                    type="button"
                    onClick={() => onOpenProposal('Pacote Integrado FortMídia 360°')}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-4 py-2.5 text-xs font-medium text-zinc-200 hover:border-[#fa6607]/60 cursor-pointer whitespace-nowrap"
                  >
                    Solicitar Proposta Comercial
                  </button>
                )}
                {onOpenFortNews && (
                  <button
                    type="button"
                    onClick={onOpenFortNews}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                    Abrir Jornal FortNews
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl border border-white/10 bg-[#0A0A0A] p-5 space-y-4">
              <div className="text-xs font-semibold text-[#fa6607]">
                Indicadores Consolidados do Grupo
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-b border-white/10 pb-2.5">
                  <div className="font-mono text-2xl font-bold text-white tabular-nums">+420k</div>
                  <div className="text-[11px] text-zinc-400">Impactos/dia Mídia OOH</div>
                </div>
                <div className="border-b border-white/10 pb-2.5">
                  <div className="font-mono text-2xl font-bold text-[#D4AF37] tabular-nums">+R$ 2B</div>
                  <div className="text-[11px] text-zinc-400">Histórico em VGV Liderado</div>
                </div>
                <div className="border-b border-white/10 pb-2.5">
                  <div className="font-mono text-2xl font-bold text-white tabular-nums">5</div>
                  <div className="text-[11px] text-zinc-400">Municípios do CIMBAJU</div>
                </div>
                <div className="border-b border-white/10 pb-2.5">
                  <div className="font-mono text-2xl font-bold text-[#fa6607] tabular-nums">
                    {podcastShows.length}
                  </div>
                  <div className="text-[11px] text-zinc-400">Programas Oficiais 16h–20h</div>
                </div>
              </div>
              <div className="text-[11px] text-zinc-400 leading-relaxed">
                <strong className="text-zinc-200">GRUPO FORT NEWS LTDA</strong>
                <br />
                CNPJ 66.550.817/0001-41 · {outdoorPoints.length} Pontos OOH Mapeados
              </div>
            </div>
          </div>
        </section>

        {/* Corporate Governance & Leadership */}
        <section className="rounded-xl border border-white/10 bg-[#111114] p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#D4AF37]" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-white">
                Direção Executiva &amp; Liderança Editorial
              </h2>
            </div>
            <span className="text-xs text-zinc-400">
              {siteSettings.governanceNames}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-5 flex items-start gap-4">
              <MediaFrame
                src="/assets/aistudio/Logo_FortM_dia_ded2b7d7.png"
                alt="Emerson Carneiro dos Santos"
                className="h-14 w-14 rounded-full object-contain bg-white p-1.5 border border-[#fa6607]/50 shrink-0"
              />
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-bold text-white">Emerson Carneiro dos Santos</div>
                <div className="text-xs font-medium text-[#fa6607]">
                  Editor-Chefe &amp; Diretor Executivo Comercial
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">
                  22+ anos de experiência executiva comercial e marketing, certificação Empretec (Sebrae/ONU), mais de R$ 2 Bilhões em VGV imobiliário e financeiro, Editor-Chefe do Jornal FortNews e apresentador titular do A Regra do Jogo.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-5 flex items-start gap-4">
              <MediaFrame
                src="/assets/aistudio/Log_tipo_3D_Fortmidia_em_destaque_6b2bcf98.png"
                alt="Grupo FortMídia Holding"
                className="h-14 w-14 rounded-full object-cover border border-[#D4AF37]/40 shrink-0"
              />
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-bold text-white">Holding Grupo FortMídia &amp; FortNews</div>
                <div className="text-xs font-medium text-[#D4AF37]">
                  Governança Corporativa &amp; Divisão de Tecnologia FortTech
                </div>
                <p className="text-xs leading-relaxed text-zinc-400">
                  Estrutura empresarial consolidada no CIMBAJU com equipe multidisciplinar de redação, comercial, estúdio audiovisual, criação OOH e plataformas próprias de Inteligência Artificial para empresas e imobiliárias.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 6 Strategic Verticals */}
        <section className="space-y-4">
          <h2 className="font-display text-lg font-bold text-white">
            As Verticais Integradas do Grupo FortMídia
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Newspaper,
                title: '01. Portal FortNews & Fala Cidadão',
                desc: 'Portal de notícias 24/7 com curadoria inteligente, aprovação do Editor-Chefe Emerson Carneiro dos Santos e canal participativo direto com a população.',
              },
              {
                icon: MapPin,
                title: '02. Rede FortMídia OOH (Outdoors 9x3m)',
                desc: 'Circuito de outdoors iluminados Frontlight nos principais corredores rodoviários e acessos municipais das 5 cidades do CIMBAJU com mapa em tempo real.',
              },
              {
                icon: Mic2,
                title: '03. Estúdio FortNews Podcast',
                desc: '7 programas oficiais das 16h às 20h com gravação multicâmera, cortes ágeis em Reels/Shorts e locação avulsa a R$ 300/hora.',
              },
              {
                icon: Award,
                title: '04. Impressos & Eventos Proprietários',
                desc: 'Revista Mensal A4 (A Força do CIMBAJU), Tabloide Quinzenal, Melhores do Ano FortNews, Trio Elétrico e Espaço Próprio de Eventos.',
              },
              {
                icon: TrendingUp,
                title: '05. Agência 360° & Assessoria',
                desc: 'Personal branding para CEOs e mandatos parlamentares, tráfego pago segmentado por CEP e acompanhamento transparente no Pipeline de Operações.',
              },
              {
                icon: Layers,
                title: '06. FortTech · Sistemas & IA Corporativa',
                desc: 'Divisão de tecnologia com produtos sob medida para empresas: FortChat (multiatendimento com IA) e ERP/CRM AcertGo para imobiliárias de alta performance.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-[#111114] p-5 space-y-2.5"
                >
                  <Icon className="h-5 w-5 text-[#fa6607]" aria-hidden="true" />
                  <h3 className="font-display text-sm font-bold text-white">{item.title}</h3>
                  <p className="text-xs leading-relaxed text-zinc-400">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* FortTech Digital Products Showcase (FortChat & AcertGo) */}
        <section className="rounded-xl border border-[#fa6607]/35 bg-gradient-to-br from-[#141418] via-[#111114] to-[#0E0E12] p-6 sm:p-7 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#fa6607]">
                <Cpu className="h-4 w-4" aria-hidden="true" />
                FortTech · Tecnologia &amp; Inteligência Artificial para Empresas
              </div>
              <h2 className="font-display text-lg sm:text-xl font-bold text-white">
                Plataformas FortTech Oferecidas aos Nossos Clientes
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1.5 text-[11px] font-semibold text-[#D4AF37]">
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
              IA Integrada + Implantação Consultiva
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {FORTTECH_PRODUCTS.map((product) => {
              const Icon = product.icon;
              return (
                <div
                  key={product.id}
                  className="rounded-xl border border-white/10 bg-[#0A0A0A] p-6 flex flex-col justify-between space-y-5 hover:border-[#fa6607]/50 transition-colors"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#fa6607]/35 bg-[#fa6607]/15 text-[#fa6607]">
                          <Icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold tracking-wider text-[#D4AF37]">
                            {product.badge}
                          </div>
                          <h3 className="font-display text-lg font-bold text-white">
                            {product.name}
                          </h3>
                          <p className="text-xs font-medium text-[#fa6607]">{product.subtitle}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-lg font-bold text-white tabular-nums">
                          {siteSettings.showPublicPrices
                            ? product.price
                            : siteSettings.consultPriceLabel || 'Consulte'}
                        </div>
                        {siteSettings.showPublicPrices && (
                          <div className="text-[10px] text-zinc-400">{product.cycle}</div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs leading-relaxed text-zinc-300">{product.summary}</p>

                    <ul className="space-y-2 border-t border-white/10 pt-3">
                      {product.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2 text-xs text-zinc-300">
                          <CheckCircle2
                            className="h-3.5 w-3.5 shrink-0 text-[#fa6607] mt-0.5"
                            aria-hidden="true"
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {onOpenProposal && (
                    <button
                      type="button"
                      onClick={() => onOpenProposal(product.proposalKey)}
                      className="w-full rounded-lg bg-[#fa6607] py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] transition-colors cursor-pointer"
                    >
                      {product.ctaLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Official Commercial Portfolio & Media Kit 2026 */}
        <section className="rounded-xl border border-white/10 bg-[#111114] p-6 space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-xs font-semibold text-[#fa6607]">
                MÍDIA KIT OFICIAL 2026 · REGIÃO CIMBAJU
              </div>
              <h2 className="font-display text-lg font-bold text-white">
                Portfólio Comercial &amp; Cotas de Domínio Regional
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#D4AF37] tabular-nums">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Franco da Rocha · Caieiras · Morato · Cajamar · Mairiporã
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
            <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4 space-y-1">
              <div className="font-mono text-sm font-bold text-[#fa6607] tabular-nums">185k / mês</div>
              <div className="font-semibold text-white">Portal Jornal FortNews</div>
              <div className="text-zinc-400">Leitores regionais com superbanner, publieditorial e selos</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4 space-y-1">
              <div className="font-mono text-sm font-bold text-[#fa6607] tabular-nums">9 × 3 m</div>
              <div className="font-semibold text-white">Outdoors Rodoviários OOH</div>
              <div className="text-zinc-400">Pontos iluminados com checking fotográfico e mapa ao vivo</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4 space-y-1">
              <div className="font-mono text-sm font-bold text-[#fa6607] tabular-nums">310k / mês</div>
              <div className="font-semibold text-white">Estúdio Podcast 16h–20h</div>
              <div className="text-zinc-400">7 programas oficiais com QR Code ao vivo e cortes Reels/Shorts</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0A0A0A] p-4 space-y-1">
              <div className="font-mono text-sm font-bold text-[#fa6607] tabular-nums">A4 + Tabloide</div>
              <div className="font-semibold text-white">Impressos &amp; Eventos</div>
              <div className="text-zinc-400">Revista executiva mensal, Melhores do Ano e Trio Elétrico</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {COMMERCIAL_PACKAGES.map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-xl border border-white/10 bg-[#0A0A0A] p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-base font-bold text-white">{pkg.name}</span>
                    <span className="font-mono text-[11px] text-[#D4AF37] tabular-nums shrink-0">
                      {pkg.duration}
                    </span>
                  </div>
                  <div className="font-mono text-xl font-bold text-[#fa6607] tabular-nums">
                    {siteSettings.showPublicPrices
                      ? `${pkg.price} ${pkg.cycle}`
                      : siteSettings.consultPriceLabel || 'Consulte'}
                  </div>
                  <p className="text-xs font-medium text-zinc-200">{pkg.scope}</p>
                  <p className="text-[11px] leading-relaxed text-zinc-400">{pkg.audience}</p>
                </div>

                {onOpenProposal && (
                  <button
                    type="button"
                    onClick={() => onOpenProposal(`Plano ${pkg.name} — Grupo FortMídia`)}
                    className="w-full rounded-lg border border-[#fa6607]/40 bg-[#fa6607]/10 py-2 text-xs font-semibold text-[#fa6607] hover:bg-[#fa6607] hover:text-white transition-colors cursor-pointer"
                  >
                    Solicitar {pkg.name}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Monetization Rules & Institutional Contact Footer */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-xl border border-white/10 bg-[#111114] p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Building2 className="h-4 w-4 text-[#D4AF37]" aria-hidden="true" />
              Regras Oficiais de Parceria &amp; Locação de Estúdio
            </div>
            <div className="divide-y divide-white/10 text-xs">
              <div className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">Captação Própria (Apresentadores &amp; Parceiros)</div>
                  <div className="text-zinc-400">
                    Captação de patrocinadores utilizando a estrutura técnica, cenário e canais oficiais do Grupo FortNews.
                  </div>
                </div>
                <span className="font-mono font-bold text-[#fa6607] whitespace-nowrap shrink-0 tabular-nums">
                  Repasse 50/50
                </span>
              </div>
              <div className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">Captação da Casa (Diretoria Comercial)</div>
                  <div className="text-zinc-400">
                    Contratos corporativos fechados pela equipe comercial em cotas globais, outdoors e revistas.
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-400 whitespace-nowrap shrink-0 tabular-nums">
                  100% Matriz
                </span>
              </div>
              <div className="py-3 flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-white">Locação Avulsa de Estúdio Podcast</div>
                  <div className="text-zinc-400">
                    Reserva horária com áudio, multicâmera e operação técnica — locatário retém 100% de seus patrocinadores.
                  </div>
                </div>
                <span className="font-mono font-bold text-[#D4AF37] whitespace-nowrap shrink-0 tabular-nums">
                  R$ 300,00 / h
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-[#fa6607]/30 bg-[#111114] p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#fa6607]">CONTATO DIRETO COMERCIAL</div>
              <h3 className="font-display text-lg font-bold text-white">
                Atendimento Executivo CIMBAJU
              </h3>
              <p className="text-xs leading-relaxed text-zinc-400">
                Fale diretamente com a nossa diretoria para estruturar seu Plano de Mídia OOH, cota no Portal FortNews, entrevista no Podcast ou implantação FortTech (FortChat e AcertGo).
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 bg-[#0A0A0A] p-4 text-xs text-zinc-300">
              <a
                href={`https://wa.me/${whatsappDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white"
              >
                <Phone className="h-3.5 w-3.5 text-[#fa6607]" aria-hidden="true" />
                <span className="font-mono font-semibold text-white tabular-nums">
                  (11) 95779-2424
                </span>
                <span className="text-zinc-500">· WhatsApp Executivo</span>
              </a>
              <div className="text-zinc-400 break-all">
                {siteSettings.contactEmail || 'comercial@fortmidia.com.br'}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:border-[#fa6607]/60 hover:text-white"
                >
                  <Instagram className="h-3 w-3 text-[#fa6607]" aria-hidden="true" />
                  Instagram
                </a>
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:border-[#fa6607]/60 hover:text-white"
                >
                  <Facebook className="h-3 w-3 text-[#fa6607]" aria-hidden="true" />
                  Facebook
                </a>
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded border border-white/10 px-2 py-1 text-[11px] text-zinc-300 hover:border-[#fa6607]/60 hover:text-white"
                >
                  <Youtube className="h-3 w-3 text-[#fa6607]" aria-hidden="true" />
                  YouTube
                </a>
              </div>
              <div className="text-[11px] text-zinc-500">
                Sede: Franco da Rocha, SP · Atuação em todo o Consórcio CIMBAJU
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
