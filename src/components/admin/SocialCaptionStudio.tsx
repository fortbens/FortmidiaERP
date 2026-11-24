import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  Loader2,
  Newspaper,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { aiApi } from '../../services/api';
import { EditorialPauta } from '../../types/fortmidia';
import { PautaSearchPicker } from './PautaSearchPicker';

export const SOCIAL_PLATFORMS = [
  'Instagram Feed',
  'Reels / Stories',
  'Facebook',
  'LinkedIn',
  'YouTube',
  'WhatsApp / Transmissão',
] as const;

export const CAPTION_TONES = [
  'Jornalístico / Direto',
  'Institucional / Corporativo',
  'Comercial / Conversão',
  'Convite Podcast / Entrevista',
  'Informativo / Serviço',
] as const;

export const BRAND_SIGNATURES = [
  'Jornal FortNews',
  'Grupo FortMídia',
  'Podcast FortNews',
] as const;

export const QUICK_HASHTAGS = [
  '#JornalFortNews',
  '#GrupoFortMidia',
  '#CIMBAJU',
  '#FrancoDaRocha',
  '#Caieiras',
  '#FranciscoMorato',
  '#Cajamar',
  '#Mairipora',
  '#Noticias',
  '#JornalismoRegional',
  '#PodcastFortNews',
  '#MidiaExterior',
  '#RegiaoMetropolitanaSP',
  '#Empreendedorismo',
  '#Publicidade',
];

const EMOJI_PATTERN =
  /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0E\uFE0F\u200D\u20E3\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}]/gu;

/**
 * Remove qualquer emoji durante a digitação sem alterar quebras de linha ou espaços finais.
 */
export function stripEmojisLive(text: string): string {
  return String(text || '').replace(EMOJI_PATTERN, '');
}

/**
 * Remove qualquer emoji e normaliza espaços extras preservando parágrafos.
 */
export function stripEmojisClean(text: string): string {
  return stripEmojisLive(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function parseHashtags(raw: string | string[]): string[] {
  const tokens = Array.isArray(raw) ? raw : String(raw || '').split(/[\s,;]+/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const token of tokens) {
    const cleaned = stripEmojisClean(token)
      .replace(/^#+/, '')
      .replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ_]/g, '')
      .trim();
    if (!cleaned || cleaned.length < 2) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(`#${cleaned}`);
  }
  return result;
}

export function normalizeHashtagsString(raw: string | string[], maxCount?: number): string {
  const list = parseHashtags(raw);
  return (typeof maxCount === 'number' ? list.slice(0, maxCount) : list).join(' ');
}

export async function copyTextSafe(text: string): Promise<boolean> {
  const sanitized = stripEmojisClean(text);
  if (!sanitized) return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(sanitized);
      return true;
    }
  } catch {
    // Fallback below for iframe contexts where Clipboard API is restricted
  }
  try {
    const textarea = document.createElement('textarea');
    textarea.value = sanitized;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function toHashtagToken(text: string): string {
  const clean = stripEmojisClean(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9A-Za-z\s]/g, ' ')
    .trim();
  if (!clean) return '';
  return clean
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

const STOP_WORDS = new Set([
  'para',
  'com',
  'sem',
  'sobre',
  'entre',
  'mais',
  'menos',
  'como',
  'onde',
  'quando',
  'pelo',
  'pela',
  'pelos',
  'pelas',
  'nesta',
  'neste',
  'nessa',
  'nesse',
  'apos',
  'antes',
  'novo',
  'nova',
  'novos',
  'novas',
  'regiao',
  'cidade',
  'portal',
  'noticia',
  'noticias',
]);

export interface EditorialSocialCopyParams {
  platform: string;
  tone: string;
  brand: string;
  headline: string;
  subtitle: string;
  city: string;
  category: string;
  details?: string;
  ctaLink: string;
  hashtagCount: number;
}

/**
 * Monta legenda estruturada e hashtags contextuais sem depender de API externa,
 * garantindo texto limpo e estritamente sem emojis.
 */
export function buildEditorialSocialCopy(params: EditorialSocialCopyParams): {
  caption: string;
  hashtags: string;
} {
  const headline = stripEmojisClean(params.headline) || 'Atualização Regional CIMBAJU';
  const subtitle = stripEmojisClean(params.subtitle);
  const city = stripEmojisClean(params.city) || 'Regional CIMBAJU';
  const category = stripEmojisClean(params.category) || 'Notícias';
  const details = stripEmojisClean(params.details || '');
  const brand = stripEmojisClean(params.brand) || 'Jornal FortNews';
  const ctaLink = stripEmojisClean(params.ctaLink) || 'jornalfortnews.com.br';
  const platform = params.platform || 'Instagram Feed';
  const tone = params.tone || 'Jornalístico / Direto';

  const paragraphs: string[] = [];

  if (tone === 'Convite Podcast / Entrevista') {
    paragraphs.push(`${brand.toUpperCase()} | ${headline}`);
    if (subtitle) paragraphs.push(subtitle);
    if (details) paragraphs.push(details);
    paragraphs.push(
      `Acompanhe ao vivo e participe enviando suas perguntas nos comentários. Transmissão oficial: ${ctaLink}.`
    );
  } else if (tone === 'Comercial / Conversão') {
    paragraphs.push(`${headline}`);
    if (subtitle) paragraphs.push(subtitle);
    if (details) paragraphs.push(details);
    paragraphs.push(
      `Destaque sua marca em ${city} com a força multiplataforma do ${brand}. Fale com a nossa equipe comercial e solicite uma proposta personalizada em ${ctaLink}.`
    );
  } else if (tone === 'Institucional / Corporativo') {
    paragraphs.push(`${headline}`);
    if (subtitle) paragraphs.push(subtitle);
    if (details) paragraphs.push(details);
    paragraphs.push(
      `Compromisso com informação de qualidade e visibilidade estratégica para ${city}. Saiba mais em ${ctaLink}.`
    );
  } else if (tone === 'Informativo / Serviço') {
    paragraphs.push(`UTILIDADE PÚBLICA | ${city.toUpperCase()} — ${headline}`);
    if (subtitle) paragraphs.push(subtitle);
    if (details) paragraphs.push(details);
    paragraphs.push(
      `Salve esta publicação para consultar depois e compartilhe com quem precisa desta informação. Mais detalhes em ${ctaLink}.`
    );
  } else {
    // Jornalístico / Direto
    const prefix = category ? `${category.toUpperCase()} | ${city.toUpperCase()}` : city.toUpperCase();
    paragraphs.push(`${prefix} — ${headline}`);
    if (subtitle) paragraphs.push(subtitle);
    if (details) paragraphs.push(details);
  }

  // Adaptação final por rede social
  if (platform === 'Reels / Stories') {
    if (tone === 'Jornalístico / Direto') {
      paragraphs.push(`Assista completo e acesse todos os detalhes em ${ctaLink}.`);
    }
    paragraphs.push(`Siga ${brand === 'Grupo FortMídia' ? '@grupofortmidia' : '@jornalfortnews'} para acompanhar as atualizações da região.`);
  } else if (platform === 'LinkedIn') {
    if (tone === 'Jornalístico / Direto') {
      paragraphs.push(`Confira a análise e a cobertura completa no portal oficial: ${ctaLink}.`);
    }
    paragraphs.push(`Qual é a sua visão sobre este tema em ${city}? Compartilhe nos comentários.`);
  } else if (platform === 'YouTube') {
    if (tone === 'Jornalístico / Direto') {
      paragraphs.push(`Leia a matéria completa no portal: ${ctaLink}.`);
    }
    paragraphs.push(`Inscreva-se no canal do ${brand} e ative as notificações para receber a cobertura diária do CIMBAJU.`);
  } else if (platform === 'WhatsApp / Transmissão') {
    paragraphs.push(`Leia a matéria completa: ${ctaLink}`);
    paragraphs.push(`Equipe ${brand} — Informação em tempo real.`);
  } else if (platform === 'Facebook') {
    if (tone === 'Jornalístico / Direto') {
      paragraphs.push(`Leia a reportagem completa em ${ctaLink}.`);
    }
    paragraphs.push(`Curta, comente e compartilhe com os moradores de ${city}.`);
  } else {
    // Instagram Feed
    if (tone === 'Jornalístico / Direto') {
      paragraphs.push(`Confira a cobertura completa no link da bio ou acesse ${ctaLink}.`);
    }
    paragraphs.push(`Acompanhe o ${brand} e fique por dentro do que acontece em ${city}.`);
  }

  const candidateTags: string[] = [];
  if (brand.toLowerCase().includes('fortmídia') || brand.toLowerCase().includes('fortmidia')) {
    candidateTags.push('#GrupoFortMidia', '#JornalFortNews');
  } else if (brand.toLowerCase().includes('podcast')) {
    candidateTags.push('#PodcastFortNews', '#JornalFortNews', '#GrupoFortMidia');
  } else {
    candidateTags.push('#JornalFortNews', '#GrupoFortMidia');
  }

  candidateTags.push('#CIMBAJU');

  const cityToken = toHashtagToken(city);
  if (cityToken && cityToken.toLowerCase() !== 'regionalcimbaju') {
    candidateTags.push(`#${cityToken}`);
  } else {
    candidateTags.push('#FrancoDaRocha', '#Caieiras', '#Cajamar');
  }

  const categoryToken = toHashtagToken(category);
  if (categoryToken && categoryToken.length >= 3 && categoryToken.length <= 26) {
    candidateTags.push(`#${categoryToken}`);
  }

  // Extrai palavras-chave relevantes do título e resumo
  const keywordSource = `${headline} ${subtitle}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9A-Za-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOP_WORDS.has(w.toLowerCase()));

  for (const kw of keywordSource) {
    const token = kw.charAt(0).toUpperCase() + kw.slice(1).toLowerCase();
    candidateTags.push(`#${token}`);
  }

  if (tone === 'Convite Podcast / Entrevista') {
    candidateTags.push('#PodcastBrasil', '#Entrevista', '#AoVivo');
  } else if (tone === 'Comercial / Conversão') {
    candidateTags.push('#MidiaExterior', '#Publicidade', '#MarketingRegional', '#Negocios');
  } else {
    candidateTags.push('#Noticias', '#JornalismoRegional', '#NoticiasSP', '#RegiaoMetropolitanaSP');
  }

  candidateTags.push('#FrancoDaRocha', '#Caieiras', '#FranciscoMorato', '#Cajamar', '#Mairipora');

  const finalCaption = stripEmojisClean(paragraphs.join('\n\n'));
  const finalHashtags = normalizeHashtagsString(candidateTags, params.hashtagCount);

  return {
    caption: finalCaption,
    hashtags: finalHashtags,
  };
}

export interface CurrentArtContext {
  mode: string;
  headline: string;
  subtitle: string;
  city: string;
  badge: string;
  ctaLink: string;
  programName: string;
  guestName: string;
  guestRole: string;
  hostName: string;
  inviteDate: string;
  inviteTime: string;
  inviteChannel: string;
}

interface SocialCaptionStudioProps {
  pautas: EditorialPauta[];
  selectedPautaId: string;
  onSelectPauta: (pautaId: string) => void;
  socialCaption: string;
  setSocialCaption: (val: string) => void;
  hashtags: string;
  setHashtags: (val: string) => void;
  currentArtContext: CurrentArtContext;
  defaultPortalDomain: string;
  autoSyncTick?: number;
}

export const SocialCaptionStudio: React.FC<SocialCaptionStudioProps> = ({
  pautas,
  selectedPautaId,
  onSelectPauta,
  socialCaption,
  setSocialCaption,
  hashtags,
  setHashtags,
  currentArtContext,
  defaultPortalDomain,
  autoSyncTick = 0,
}) => {
  const [platform, setPlatform] = useState<string>(SOCIAL_PLATFORMS[0]);
  const [tone, setTone] = useState<string>(CAPTION_TONES[0]);
  const [brand, setBrand] = useState<string>(BRAND_SIGNATURES[0]);
  const [hashtagCount, setHashtagCount] = useState<number>(8);

  const [topicHeadline, setTopicHeadline] = useState<string>(
    stripEmojisClean(currentArtContext.headline)
  );
  const [topicSubtitle, setTopicSubtitle] = useState<string>(
    stripEmojisClean(currentArtContext.subtitle)
  );
  const [topicCity, setTopicCity] = useState<string>(
    stripEmojisClean(currentArtContext.city || 'Regional CIMBAJU')
  );
  const [topicCategory, setTopicCategory] = useState<string>(
    stripEmojisClean(currentArtContext.badge || 'Notícias')
  );
  const [topicDetails, setTopicDetails] = useState<string>('');
  const [topicCtaLink, setTopicCtaLink] = useState<string>(
    stripEmojisClean(currentArtContext.ctaLink || defaultPortalDomain || 'jornalfortnews.com.br')
  );

  const [generatingAi, setGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<{
    message: string;
    billingUrl?: string;
  } | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<'all' | 'caption' | 'hashtags' | null>(null);

  const flashNotice = (msg: string) => {
    setStatusNotice(msg);
    window.setTimeout(() => setStatusNotice(null), 3500);
  };

  const pullFromCurrentArt = (notify = true) => {
    const isInvite = currentArtContext.mode === 'convite';
    if (isInvite) {
      setTone('Convite Podcast / Entrevista');
      setBrand('Podcast FortNews');
      setTopicHeadline(
        stripEmojisClean(
          `${currentArtContext.programName} recebe ${currentArtContext.guestName}`
        )
      );
      setTopicSubtitle(
        stripEmojisClean(
          `${currentArtContext.guestRole ? `${currentArtContext.guestName} (${currentArtContext.guestRole})` : currentArtContext.guestName} participa de entrevista conduzida por ${currentArtContext.hostName}.`
        )
      );
      setTopicDetails(
        stripEmojisClean(
          `Data: ${currentArtContext.inviteDate} | Horário: ${currentArtContext.inviteTime} | Transmissão: ${currentArtContext.inviteChannel}. Tema central: ${currentArtContext.headline}.`
        )
      );
      setTopicCategory('Podcast');
      setTopicCity('Regional CIMBAJU');
      setTopicCtaLink(stripEmojisClean(currentArtContext.inviteChannel || defaultPortalDomain));
    } else {
      setTopicHeadline(stripEmojisClean(currentArtContext.headline));
      setTopicSubtitle(stripEmojisClean(currentArtContext.subtitle));
      setTopicCity(stripEmojisClean(currentArtContext.city || 'Regional CIMBAJU'));
      setTopicCategory(stripEmojisClean(currentArtContext.badge || 'Notícias'));
      setTopicCtaLink(stripEmojisClean(defaultPortalDomain || 'jornalfortnews.com.br'));
      setTopicDetails('');
    }
    if (notify) {
      flashNotice('Dados importados da arte atual do Estúdio de Marketing.');
    }
  };

  useEffect(() => {
    if (autoSyncTick > 0) {
      pullFromCurrentArt(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSyncTick]);

  const handleSelectPautaInternal = (pautaId: string) => {
    onSelectPauta(pautaId);
    const art = pautas.find((p) => p.id === pautaId);
    if (!art) return;
    setTopicHeadline(stripEmojisClean(art.title));
    setTopicSubtitle(stripEmojisClean(art.summary));
    setTopicCity(stripEmojisClean(art.city || 'Regional CIMBAJU'));
    setTopicCategory(stripEmojisClean(art.seal || 'Notícias'));
    setTopicDetails(
      stripEmojisClean(art.body ? art.body.slice(0, 420) : '')
    );
    setTopicCtaLink(stripEmojisClean(defaultPortalDomain || 'jornalfortnews.com.br'));
    flashNotice(`Pauta "${art.title.slice(0, 48)}..." carregada no gerador.`);
  };

  const handleGenerateWithAi = async () => {
    if (!topicHeadline.trim() && !topicSubtitle.trim() && !topicDetails.trim()) {
      setAiError({
        message: 'Preencha ao menos o Título/Tema ou o Resumo antes de gerar a legenda.',
      });
      return;
    }

    setGeneratingAi(true);
    setAiError(null);
    try {
      const res = await aiApi.generateSocialCaption({
        platform,
        tone,
        brand,
        headline: topicHeadline,
        subtitle: topicSubtitle,
        city: topicCity,
        category: topicCategory,
        details: topicDetails,
        ctaLink: topicCtaLink,
        hashtagCount,
      });

      if (!res.ok || !res.data?.caption) {
        setAiError({
          message:
            res.error ||
            'Não foi possível gerar a legenda com IA. Você pode usar o botão "Gerar Modelo Editorial" abaixo.',
          billingUrl: res.billingUrl,
        });
        return;
      }

      const cleanCaption = stripEmojisClean(res.data.caption);
      const cleanTags = normalizeHashtagsString(
        res.data.hashtagList?.length ? res.data.hashtagList : res.data.hashtags || '',
        hashtagCount
      );

      setSocialCaption(cleanCaption);
      setHashtags(cleanTags);
      flashNotice(`Legenda e ${parseHashtags(cleanTags).length} hashtags geradas com IA (sem emojis).`);
    } catch {
      setAiError({
        message:
          'Erro de conexão com o servidor de IA. Tente novamente ou clique em "Gerar Modelo Editorial".',
      });
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleGenerateEditorialTemplate = () => {
    setAiError(null);
    const result = buildEditorialSocialCopy({
      platform,
      tone,
      brand,
      headline: topicHeadline,
      subtitle: topicSubtitle,
      city: topicCity,
      category: topicCategory,
      details: topicDetails,
      ctaLink: topicCtaLink,
      hashtagCount,
    });
    setSocialCaption(result.caption);
    setHashtags(result.hashtags);
    flashNotice(
      `Modelo editorial montado para ${platform} com ${parseHashtags(result.hashtags).length} hashtags (sem emojis).`
    );
  };

  const parsedTags = parseHashtags(hashtags);
  const cleanCaptionPreview = stripEmojisClean(socialCaption);
  const cleanHashtagsPreview = parsedTags.join(' ');
  const combinedFinalText = [cleanCaptionPreview, cleanHashtagsPreview]
    .filter(Boolean)
    .join('\n\n');

  const handleCopy = async (kind: 'all' | 'caption' | 'hashtags') => {
    const textToCopy =
      kind === 'all'
        ? combinedFinalText
        : kind === 'caption'
          ? cleanCaptionPreview
          : cleanHashtagsPreview;
    const ok = await copyTextSafe(textToCopy);
    if (ok) {
      setCopiedKey(kind);
      window.setTimeout(() => setCopiedKey(null), 2400);
    } else {
      flashNotice('Não foi possível acessar a área de transferência automaticamente.');
    }
  };

  const toggleQuickHashtag = (tag: string) => {
    const normalized = parseHashtags(tag)[0];
    if (!normalized) return;
    const current = parseHashtags(hashtags);
    const exists = current.some((t) => t.toLowerCase() === normalized.toLowerCase());
    const next = exists
      ? current.filter((t) => t.toLowerCase() !== normalized.toLowerCase())
      : [...current, normalized];
    setHashtags(next.join(' '));
  };

  const removeHashtag = (tag: string) => {
    const next = parseHashtags(hashtags).filter(
      (t) => t.toLowerCase() !== tag.toLowerCase()
    );
    setHashtags(next.join(' '));
  };

  return (
    <div className="space-y-5">
      {/* Top Info Banner */}
      <div className="rounded-xl border border-white/10 bg-[#121215] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-[#fa6607]" />
            <h2 className="text-sm font-bold text-white">
              Gerador de Legendas & Hashtags (#) para Redes Sociais
            </h2>
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              <ShieldCheck className="h-3 w-3" />
              Padrão Editorial: Sempre Sem Emojis
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Crie legendas prontas para Instagram, Reels, Facebook, LinkedIn, YouTube e WhatsApp com
            hashtags otimizadas e cópia rápida em um clique. Qualquer emoji é bloqueado e removido automaticamente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => pullFromCurrentArt(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5 cursor-pointer whitespace-nowrap"
        >
          <RefreshCw className="h-3.5 w-3.5 text-[#fa6607]" />
          Puxar da Arte / Convite Atual
        </button>
      </div>

      {statusNotice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
          <Check className="h-4 w-4 shrink-0" />
          <span>{statusNotice}</span>
        </div>
      )}

      {aiError && (
        <div className="rounded-lg border border-red-500/35 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-200 space-y-1.5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{aiError.message}</span>
          </div>
          {aiError.billingUrl && (
            <a
              href={aiError.billingUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D4AF37] hover:underline"
            >
              Verificar créditos da API
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left: Briefing & Configuration */}
        <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#121215] p-5 space-y-4">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              1. Briefing & Parâmetros da Publicação
            </h3>
          </div>

          {/* Pauta Importer */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 mb-1.5">
              <Newspaper className="h-3.5 w-3.5 text-[#fa6607]" />
              Importar Matéria do Portal FortNews (Opcional)
            </label>
            <PautaSearchPicker
              pautas={pautas}
              selectedPautaId={selectedPautaId}
              onSelect={(id) => {
                if (!id) {
                  onSelectPauta('');
                } else {
                  handleSelectPautaInternal(id);
                }
              }}
            />
          </div>

          {/* Selectors */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Rede Social
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Tom de Voz
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {CAPTION_TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Marca / Assinatura
              </label>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                {BRAND_SIGNATURES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Quantidade de Hashtags (#)
              </label>
              <select
                value={hashtagCount}
                onChange={(e) => setHashtagCount(Number(e.target.value))}
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              >
                <option value={5}>5 hashtags (enxuto)</option>
                <option value={8}>8 hashtags (equilibrado)</option>
                <option value={12}>12 hashtags (alcance regional)</option>
                <option value={15}>15 hashtags (máximo alcance)</option>
              </select>
            </div>
          </div>

          {/* Content Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Título / Tema Principal
              </label>
              <input
                type="text"
                value={topicHeadline}
                onChange={(e) => setTopicHeadline(stripEmojisLive(e.target.value))}
                placeholder="Ex: Nova obra viária melhora acesso entre Franco da Rocha e Caieiras"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Resumo / Linha-fina
              </label>
              <textarea
                rows={3}
                value={topicSubtitle}
                onChange={(e) => setTopicSubtitle(stripEmojisLive(e.target.value))}
                placeholder="Principais fatos, benefício, convidado ou destaque da publicação..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Cidade / Região
                </label>
                <input
                  type="text"
                  value={topicCity}
                  onChange={(e) => setTopicCity(stripEmojisLive(e.target.value))}
                  placeholder="Ex: Regional CIMBAJU, Caieiras..."
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                  Editoria / Selo
                </label>
                <input
                  type="text"
                  value={topicCategory}
                  onChange={(e) => setTopicCategory(stripEmojisLive(e.target.value))}
                  placeholder="Ex: Cidade & Política, Podcast, Comercial"
                  className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Detalhes Adicionais / Horário / Pontos-chave (Opcional)
              </label>
              <textarea
                rows={2}
                value={topicDetails}
                onChange={(e) => setTopicDetails(stripEmojisLive(e.target.value))}
                placeholder="Ex: Data, horário da transmissão, nomes de entrevistados, oferta ou telefone..."
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Link ou Chamada Final (CTA)
              </label>
              <input
                type="text"
                value={topicCtaLink}
                onChange={(e) => setTopicCtaLink(stripEmojisLive(e.target.value))}
                placeholder="Ex: jornalfortnews.com.br ou @jornalfortnews"
                className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          {/* Generation Action Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={handleGenerateWithAi}
              disabled={generatingAi}
              className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 rounded-lg bg-[#fa6607] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-60 cursor-pointer"
            >
              {generatingAi ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generatingAi ? 'Gerando com IA...' : 'Gerar Legenda e # com IA'}
            </button>

            <button
              type="button"
              onClick={handleGenerateEditorialTemplate}
              disabled={generatingAi}
              className="flex-1 min-w-[180px] inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-[#0A0A0A] px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-white/5 cursor-pointer"
            >
              <FileText className="h-4 w-4 text-[#D4AF37]" />
              Gerar Modelo Editorial
            </button>
          </div>
        </div>

        {/* Right: Output, Hashtag Manager & Copy Buttons */}
        <div className="lg:col-span-6 rounded-xl border border-white/10 bg-[#121215] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              2. Legenda & Hashtags Prontas (Sem Emojis)
            </h3>
            <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
              <span>{cleanCaptionPreview.length} caracteres</span>
              <span>{parsedTags.length} hashtags</span>
            </div>
          </div>

          {/* Copy Action Bar */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleCopy('all')}
              disabled={!combinedFinalText}
              className="flex-1 min-w-[190px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#fa6607] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#e55a00] disabled:opacity-50 cursor-pointer"
            >
              {copiedKey === 'all' ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedKey === 'all' ? 'Legenda + # Copiadas!' : 'Copiar Tudo (Legenda + #)'}
            </button>

            <button
              type="button"
              onClick={() => handleCopy('caption')}
              disabled={!cleanCaptionPreview}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5 disabled:opacity-50 cursor-pointer"
            >
              {copiedKey === 'caption' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copiedKey === 'caption' ? 'Legenda Copiada!' : 'Copiar Legenda'}
            </button>

            <button
              type="button"
              onClick={() => handleCopy('hashtags')}
              disabled={!cleanHashtagsPreview}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-2 text-xs font-semibold text-[#D4AF37] hover:bg-[#D4AF37]/20 disabled:opacity-50 cursor-pointer"
            >
              {copiedKey === 'hashtags' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Hash className="h-3.5 w-3.5" />
              )}
              {copiedKey === 'hashtags' ? '# Copiadas!' : 'Copiar #'}
            </button>
          </div>

          {/* Caption Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-zinc-300">
                Texto da Legenda
              </label>
              {socialCaption && (
                <button
                  type="button"
                  onClick={() => setSocialCaption('')}
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-red-400 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  Limpar
                </button>
              )}
            </div>
            <textarea
              rows={8}
              value={socialCaption}
              onChange={(e) => setSocialCaption(stripEmojisLive(e.target.value))}
              placeholder="Clique em 'Gerar Legenda e # com IA' ou 'Gerar Modelo Editorial' para criar o texto..."
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-xs leading-relaxed text-white"
            />
          </div>

          {/* Hashtags Editor & Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-300">
                <Hash className="h-3.5 w-3.5 text-[#D4AF37]" />
                Hashtags (#) da Publicação
              </label>
              <button
                type="button"
                onClick={() => setHashtags(normalizeHashtagsString(hashtags))}
                className="text-[11px] text-zinc-400 hover:text-white cursor-pointer"
              >
                Padronizar #
              </button>
            </div>

            <input
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(stripEmojisLive(e.target.value))}
              placeholder="#JornalFortNews #GrupoFortMidia #CIMBAJU"
              className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3 py-2 text-xs text-[#D4AF37]"
            />

            {parsedTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-2 py-0.5 text-[11px] font-medium text-[#D4AF37]"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remover ${tag}`}
                      onClick={() => removeHashtag(tag)}
                      className="text-[#D4AF37]/70 hover:text-white cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Quick Regional Suggestions */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Sugestões Rápidas FortMídia / CIMBAJU (clique para adicionar ou remover)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_HASHTAGS.map((tag) => {
                  const active = parsedTags.some(
                    (t) => t.toLowerCase() === tag.toLowerCase()
                  );
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleQuickHashtag(tag)}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] cursor-pointer transition-colors ${
                        active
                          ? 'border-[#fa6607] bg-[#fa6607]/20 text-white font-semibold'
                          : 'border-white/10 bg-[#0A0A0A] text-zinc-400 hover:text-white hover:border-white/25'
                      }`}
                    >
                      {active ? (
                        <Check className="h-3 w-3 text-[#fa6607]" />
                      ) : (
                        <Plus className="h-3 w-3 opacity-60" />
                      )}
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Final Combined Preview */}
          <div className="rounded-lg border border-white/10 bg-[#08080A] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              <span>Prévia Exata da Cópia Final (Legenda + #)</span>
              <span className="text-emerald-400">0 emojis</span>
            </div>
            <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-zinc-200 max-h-52 overflow-y-auto">
              {combinedFinalText || 'Nenhuma legenda preenchida ainda.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
