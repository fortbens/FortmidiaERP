import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

function readCliArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  const prefixed = process.argv.find((arg) => arg.startsWith(`${flag}=`));
  return prefixed ? prefixed.slice(flag.length + 1) : undefined;
}

const PORT = Number(readCliArg('--port') || process.env.PORT || 3000);
const HOST = readCliArg('--host') || process.env.HOST || '0.0.0.0';
const isProduction = process.env.NODE_ENV === 'production';

const VALID_SEALS = [
  'Break News',
  'Urgente',
  'Cidade & Política',
  'Tempo',
  'Esporte',
  'Entretenimento',
  'Lazer',
  'Fofoca',
  'Horóscopo',
  'Humor',
  'Economia & Negócios',
  'Segurança',
  'Saúde & Educação',
  'Geral',
];

const VALID_CITIES = [
  'Franco da Rocha',
  'Caieiras',
  'Francisco Morato',
  'Cajamar',
  'Mairiporã',
  'Regional CIMBAJU',
  'São Paulo (Capital & RMSP)',
  'Brasil',
  'Mundo',
  'Outras Cidades',
];

interface ScanRequestBody {
  territory?: string;
  region?: string;
  topics?: string;
  topic?: string;
  sourceHint?: string;
  count?: number;
}

interface TickerRequestBody {
  territory?: string;
  region?: string;
  existingHeadlines?: string[];
  count?: number;
}

interface ThumbnailRequestBody {
  prompt?: string;
  programName?: string;
  guestName?: string;
  hostName?: string;
  themeColor?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1' | '3:4' | '4:3';
}

interface SocialCaptionRequestBody {
  platform?: string;
  tone?: string;
  brand?: string;
  headline?: string;
  subtitle?: string;
  city?: string;
  category?: string;
  details?: string;
  ctaLink?: string;
  hashtagCount?: number;
}

function stripEmojisClean(input: string): string {
  return input
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0E\uFE0F\u200D\u20E3\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeHashtagList(rawTags: string[], maxCount: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of rawTags) {
    const cleaned = stripEmojisClean(String(raw || ''))
      .replace(/^#+/, '')
      .replace(/[^0-9A-Za-zÀ-ÖØ-öø-ÿ_]/g, '')
      .trim();
    if (!cleaned || cleaned.length < 2) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(`#${cleaned}`);
    if (result.length >= maxCount) break;
  }

  return result;
}

interface RawAiArticle {
  title?: string;
  summary?: string;
  body?: string;
  suggestedSeal?: string;
  city?: string;
  socialCreative?: {
    instagramCaption?: string;
    headlineOverlay?: string;
    storyCta?: string;
    hashtags?: string;
    visualDirection?: string;
  };
}

function formatGeminiError(
  err: unknown,
  contextLabel: string
): { status: number; code: string; error: string; billingUrl?: string; details?: string } {
  const raw = err instanceof Error ? err.message : String(err || 'Erro interno ao consultar IA');

  let parsedCode: number | undefined;
  let parsedMessage = raw;
  let parsedStatus = '';

  const errObj = err as { status?: number; code?: number } | undefined;
  if (typeof errObj?.status === 'number') parsedCode = errObj.status;
  if (typeof errObj?.code === 'number') parsedCode = errObj.code;

  const jsonStart = raw.indexOf('{');
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart)) as {
        error?: { code?: number; message?: string; status?: string };
      };
      if (parsed?.error) {
        if (typeof parsed.error.code === 'number') parsedCode = parsed.error.code;
        if (parsed.error.message) parsedMessage = parsed.error.message;
        if (parsed.error.status) parsedStatus = parsed.error.status;
      }
    } catch {
      // Keep raw message if not valid JSON
    }
  }

  const lower = `${parsedMessage} ${parsedStatus}`.toLowerCase();

  if (parsedCode === 402 || lower.includes('prepayment credits are depleted')) {
    return {
      status: 402,
      code: 'CREDITS_DEPLETED',
      error: `${contextLabel}: créditos pré-pagos esgotados na chave Gemini (Erro 402). Recarregue os créditos em https://ai.studio/projects ou selecione outra chave com faturamento ativo em Settings > Secrets.`,
      billingUrl: 'https://ai.studio/projects',
      details: parsedMessage,
    };
  }

  if (parsedCode === 429 || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      code: 'QUOTA_EXHAUSTED',
      error: `${contextLabel}: cota ou limite de requisições atingido (Erro 429). Aguarde alguns instantes ou verifique o faturamento da chave em Settings > Secrets.`,
      billingUrl: 'https://ai.studio/projects',
      details: parsedMessage,
    };
  }

  if (
    parsedCode === 403 ||
    parsedCode === 400 ||
    lower.includes('permission_denied') ||
    lower.includes('api_key_invalid')
  ) {
    return {
      status: parsedCode === 400 ? 400 : 403,
      code: 'INVALID_API_KEY',
      error: `${contextLabel}: chave da API Gemini inválida ou sem permissão. Verifique a chave configurada em Settings > Secrets.`,
      details: parsedMessage,
    };
  }

  if (parsedCode === 404 || lower.includes('not_found')) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      error: `${contextLabel}: modelo Gemini indisponível no momento.`,
      details: parsedMessage,
    };
  }

  return {
    status: 500,
    code: 'AI_INTERNAL_ERROR',
    error: `${contextLabel}: ${parsedMessage}`,
    details: parsedMessage,
  };
}

function extractJsonArray(text: string): RawAiArticle[] {
  const cleaned = text.trim();
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1].trim() : cleaned;

  try {
    const parsed = JSON.parse(candidate);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.articles)) return parsed.articles;
  } catch {
    const startIdx = candidate.indexOf('[');
    const endIdx = candidate.lastIndexOf(']');
    if (startIdx !== -1 && endIdx > startIdx) {
      try {
        const sliced = JSON.parse(candidate.slice(startIdx, endIdx + 1));
        if (Array.isArray(sliced)) return sliced;
      } catch {
        return [];
      }
    }
  }
  return [];
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferEditorialSeal(text: string): string {
  const lower = text.toLowerCase();
  if (/(urgente|alerta|emergência|acidente|interditad|incêndio)/.test(lower)) return 'Urgente';
  if (/(polícia|segurança|roubo|delegacia|gcm|pm|crime|operação)/.test(lower)) return 'Segurança';
  if (/(saúde|hospital|ubs|vacina|educação|escola|creche|fatec)/.test(lower)) return 'Saúde & Educação';
  if (/(economia|emprego|comércio|vaga|investimento|indústria|imposto|pib|dólar)/.test(lower))
    return 'Economia & Negócios';
  if (/(futebol|esporte|campeonato|copa|atleta|corrida|time)/.test(lower)) return 'Esporte';
  if (/(chuva|tempo|clima|previsão|temperatura|frente fria|defesa civil)/.test(lower)) return 'Tempo';
  if (/(show|festival|cultura|teatro|cinema|evento|lazer)/.test(lower)) return 'Entretenimento';
  if (/(prefeitura|câmara|vereador|prefeito|obra|asfalto|cptm|rodovia|trânsito|ônibus)/.test(lower))
    return 'Cidade & Política';
  return 'Break News';
}

interface GoogleNewsRssItem {
  title: string;
  link: string;
  pubDate: string;
  sourceName: string;
  description: string;
}

async function fetchGoogleNewsRss(query: string, limit: number): Promise<GoogleNewsRssItem[]> {
  const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;

  const response = await fetch(rssUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; FortNewsEditorialBot/1.0)',
      Accept: 'application/rss+xml, application/xml, text/xml',
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Google Notícias RSS respondeu HTTP ${response.status}`);
  }

  const xml = await response.text();
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  const items: GoogleNewsRssItem[] = [];

  for (const rawItem of itemMatches.slice(0, limit * 2)) {
    const rawTitle = rawItem.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
    const rawLink = rawItem.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '';
    const rawDate = rawItem.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
    const rawSource = rawItem.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || '';
    const rawDesc = rawItem.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';

    const fullTitle = decodeXmlEntities(rawTitle);
    const sourceName = decodeXmlEntities(rawSource) || 'Google Notícias';
    const cleanTitle = fullTitle.replace(new RegExp(`\\s+-\\s+${sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'), '').trim();
    const link = decodeXmlEntities(rawLink);
    const description = decodeXmlEntities(rawDesc);

    if (cleanTitle && link) {
      items.push({
        title: cleanTitle,
        link,
        pubDate: decodeXmlEntities(rawDate),
        sourceName,
        description,
      });
    }
    if (items.length >= limit) break;
  }

  return items;
}

function buildArticlesFromRss(
  rssItems: GoogleNewsRssItem[],
  territory: string
) {
  const city = VALID_CITIES.includes(territory) ? territory : 'Regional CIMBAJU';
  return rssItems.map((item) => {
    const seal = inferEditorialSeal(`${item.title} ${item.description}`);
    const dateLabel = item.pubDate
      ? new Date(item.pubDate).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');
    const summary =
      item.description && item.description.length > 35 && item.description !== item.title
        ? item.description.slice(0, 190)
        : `Apuração regional publicada por ${item.sourceName} em ${dateLabel} com impacto direto para ${city}.`;

    const body = [
      `${item.title}. A ocorrência foi registrada pela cobertura de ${item.sourceName} em ${dateLabel}, com repercussão em ${city}.`,
      `A equipe de redação do Jornal FortNews selecionou esta pauta via monitoramento ao vivo do Google Notícias para revisão editorial, checagem complementar de fontes locais e publicação no portal.`,
      `Recomenda-se ao editor confirmar detalhes adicionais junto aos órgãos oficiais ou envolvidos antes da liberação final pelo Editor-Chefe. Fonte original disponível no link de referência abaixo.`,
    ].join('\n\n');

    return {
      title: item.title.slice(0, 120),
      summary,
      body,
      suggestedSeal: seal,
      city,
      sources: [{ title: item.sourceName, uri: item.link }],
      socialCreative: {
        headlineOverlay: item.title.split(' ').slice(0, 8).join(' '),
        instagramCaption: `${item.title}\n\n${summary}\n\nLeia a cobertura completa no Portal Jornal FortNews (jornalfortnews.com.br).`,
        storyCta: 'Leia a matéria completa em jornalfortnews.com.br',
        hashtags: `#JornalFortNews #FortMidia #${city.replace(/[^a-zA-Z0-9]+/g, '')} #Noticias`,
        visualDirection: 'Card editorial laranja FortNews (#fa6607) com selo de destaque no topo e foto de capa.',
      },
    };
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      database: false,
      service: 'fortmidia-fortnews-erp-preview',
      timestamp: new Date().toISOString(),
    });
  });

  // Serve uploaded media files safely (videos uploaded from Portal News Editor)
  const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');
  const uploadedVideosDir = path.join(uploadsRoot, 'videos');
  fs.mkdirSync(uploadedVideosDir, { recursive: true });
  app.use(
    '/uploads',
    express.static(uploadsRoot, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  const ALLOWED_VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogg']);
  const MAX_VIDEO_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

  app.post('/api/media/upload', (req, res) => {
    const rawExt = String(req.query.ext || 'mp4')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const ext = ALLOWED_VIDEO_EXTS.has(rawExt) ? rawExt : 'mp4';
    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (contentType && !contentType.startsWith('video/') && contentType !== 'application/octet-stream') {
      res.status(415).json({ error: 'Tipo de mídia inválido. Envie um vídeo MP4, WebM ou MOV.' });
      return;
    }

    const randomHex = Math.random().toString(16).slice(2, 10);
    const fileName = `vid-${Date.now()}-${randomHex}.${ext}`;
    const targetPath = path.join(uploadedVideosDir, fileName);

    let totalBytes = 0;
    let aborted = false;
    const writeStream = fs.createWriteStream(targetPath);

    const failUpload = (status: number, error: string) => {
      if (aborted) return;
      aborted = true;
      writeStream.destroy();
      fs.unlink(targetPath, () => {});
      if (!res.headersSent) {
        res.status(status).json({ error });
      }
    };

    req.on('data', (chunk: Buffer) => {
      if (aborted) return;
      totalBytes += chunk.length;
      if (totalBytes > MAX_VIDEO_UPLOAD_BYTES) {
        failUpload(413, 'O vídeo excede o limite de 100 MB.');
        req.resume();
        return;
      }
      if (!writeStream.write(chunk)) {
        req.pause();
        writeStream.once('drain', () => {
          if (!aborted) req.resume();
        });
      }
    });

    req.on('end', () => {
      if (aborted) return;
      writeStream.end(() => {
        if (aborted) return;
        if (totalBytes === 0) {
          fs.unlink(targetPath, () => {});
          res.status(400).json({ error: 'Arquivo de vídeo vazio.' });
          return;
        }
        res.status(201).json({
          ok: true,
          url: `/uploads/videos/${fileName}`,
          sizeBytes: totalBytes,
        });
      });
    });

    req.on('error', () => failUpload(500, 'Erro ao receber o arquivo de vídeo.'));
    writeStream.on('error', () => failUpload(500, 'Erro ao gravar o vídeo no servidor.'));
  });

  app.get('/api/public-config', (_req, res) => {
    const mapsApiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({
      mapsApiKey,
      aiScannerReady: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // Unified AI proxy endpoint matching the PHP cPanel backend (/api/ai)
  app.post('/api/ai', (req, res, next) => {
    const action = typeof req.body?.action === 'string' ? req.body.action.trim().toLowerCase() : '';
    if (action === 'scan-news') {
      req.url = '/api/ai/scan-news';
      next();
      return;
    }
    if (action === 'generate-ticker') {
      req.url = '/api/ai/generate-ticker';
      next();
      return;
    }
    if (action === 'generate-thumbnail') {
      req.url = '/api/ai/generate-thumbnail';
      next();
      return;
    }
    if (action === 'generate-social-caption') {
      req.url = '/api/ai/generate-social-caption';
      next();
      return;
    }
    res.status(400).json({
      error:
        'Ação IA inválida. Utilize action: "scan-news", "generate-ticker", "generate-thumbnail" ou "generate-social-caption".',
    });
  });

  app.post('/api/ai/scan-news', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = (req.body || {}) as ScanRequestBody;
    const territory = (body.territory || body.region || 'Regional CIMBAJU').trim();
    const topics = (
      body.topics ||
      body.topic ||
      'infraestrutura, mobilidade, saúde pública, segurança, economia local e eventos'
    ).trim();
    const sourceHint = (body.sourceHint || '').trim();
    const count = Math.max(1, Math.min(4, Number(body.count) || 2));

    const runLiveGoogleNewsFallback = async (fallbackReason?: string) => {
      const geoTerms =
        territory === 'Regional CIMBAJU'
          ? '"Franco da Rocha" OR Caieiras OR "Francisco Morato" OR Cajamar OR Mairiporã'
          : `"${territory}"`;
      const shortTopics = topics
        .split(/[,;]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 3)
        .join(' OR ');
      const primaryQuery = [geoTerms, shortTopics ? `(${shortTopics})` : '', sourceHint]
        .filter(Boolean)
        .join(' ');

      let rssItems = await fetchGoogleNewsRss(primaryQuery, count);
      if (rssItems.length === 0) {
        rssItems = await fetchGoogleNewsRss(`${territory} notícias`, count);
      }
      if (rssItems.length === 0) {
        rssItems = await fetchGoogleNewsRss('Franco da Rocha Caieiras Cajamar notícias', count);
      }

      const articles = buildArticlesFromRss(rssItems, territory);
      const sources = rssItems.map((i) => ({ title: i.sourceName, uri: i.link })).slice(0, 6);

      res.json({
        articles,
        sources,
        searchQueries: [primaryQuery],
        scannedAt: new Date().toLocaleString('pt-BR'),
        engine: 'google-news-live',
        notice: fallbackReason
          ? `Extração realizada ao vivo pelo Google Notícias (modo direto ativo).`
          : undefined,
      });
    };

    if (!apiKey) {
      try {
        await runLiveGoogleNewsFallback('no-key');
      } catch (rssErr) {
        res.status(503).json({
          error: rssErr instanceof Error ? rssErr.message : 'Falha ao consultar Google Notícias ao vivo.',
        });
      }
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const prompt = `Você é o editor-chefe de apuração digital do portal Jornal FortNews (Grupo FortMídia), especializado na região do CIMBAJU (Franco da Rocha, Caieiras, Francisco Morato, Cajamar e Mairiporã), São Paulo, Brasil e Mundo.

Use a ferramenta de busca na web (Google Search) para fazer uma varredura e extrair notícias reais e atuais relacionadas a:
- Território/Abrangência prioritária: "${territory}"
- Temas/Palavras-chave: "${topics}"${
        sourceHint
          ? `\n- Foco/Fonte/Referência adicional solicitada pelo editor: "${sourceHint}"`
          : ''
      }

Gere exatamente ${count} rascunhos jornalísticos completos em Português do Brasil (PT-BR), baseados nas informações encontradas na busca, prontos para o editor revisar/editar e enviar ao Redator-Chefe (NUNCA invente declarações falsas; relate fatos verificados na pesquisa em tom jornalístico claro, objetivo e informativo).

Para CADA notícia, também elabore um CRIATIVO COMPLETO PARA REDES SOCIAIS (Instagram Feed, Stories e WhatsApp).

Retorne EXCLUSIVAMENTE um JSON Array válido (sem comentários fora do JSON), onde cada item segue exatamente esta estrutura:
[
  {
    "title": "Manchete jornalística clara e impactante (até 110 caracteres)",
    "summary": "Linha-fina objetiva em 1 ou 2 frases (até 190 caracteres)",
    "body": "Texto completo da reportagem em 3 a 4 parágrafos separados por \\n\\n, contextualizando os fatos encontrados.",
    "suggestedSeal": "Escolha EXATAMENTE um entre: ${VALID_SEALS.join(', ')}",
    "city": "Escolha EXATAMENTE um entre: ${VALID_CITIES.join(', ')}",
    "socialCreative": {
      "headlineOverlay": "Título curto de até 7 palavras para estampar a arte 1080x1350 do Instagram",
      "instagramCaption": "Legenda pronta para Instagram/Facebook com gancho inicial, resumo jornalístico e chamada para ler no Portal Jornal FortNews",
      "storyCta": "Texto curto para botão/adesivo de Story (ex: Leia a matéria completa em jornalfortnews.com.br)",
      "hashtags": "#JornalFortNews #FortMidia #CIMBAJU ...",
      "visualDirection": "Orientação visual breve para a foto/layout do card"
    }
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = response.text || '';
      const parsedArticles = extractJsonArray(rawText);

      const candidate = response.candidates?.[0] as
        | {
            groundingMetadata?: {
              groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
              webSearchQueries?: string[];
            };
          }
        | undefined;

      const chunks = candidate?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .filter((c) => c.web?.uri)
        .map((c) => ({
          title: c.web?.title || 'Fonte verificada na web',
          uri: c.web?.uri || '',
        }))
        .slice(0, 6);

      const searchQueries = candidate?.groundingMetadata?.webSearchQueries || [];

      if (parsedArticles.length === 0) {
        res.status(502).json({
          error: 'Não foi possível estruturar os rascunhos da varredura web. Tente novamente.',
          rawPreview: rawText.slice(0, 260),
        });
        return;
      }

      const normalized = parsedArticles.map((art, idx) => {
        const seal = VALID_SEALS.includes(art.suggestedSeal || '')
          ? (art.suggestedSeal as string)
          : 'Break News';
        const city = VALID_CITIES.includes(art.city || '')
          ? (art.city as string)
          : VALID_CITIES.includes(territory)
            ? territory
            : 'Regional CIMBAJU';

        const title = (art.title || `Atualização Regional ${idx + 1}`).trim();
        const summary = (art.summary || title).trim();

        return {
          title,
          summary,
          body: (art.body || summary).trim(),
          suggestedSeal: seal,
          city,
          sources,
          socialCreative: {
            headlineOverlay: (
              art.socialCreative?.headlineOverlay || title.slice(0, 64)
            ).trim(),
            instagramCaption: (
              art.socialCreative?.instagramCaption ||
              `${title}\n\n${summary}\n\nAcompanhe a cobertura completa no Portal Jornal FortNews.`
            ).trim(),
            storyCta: (
              art.socialCreative?.storyCta || 'Saiba mais em jornalfortnews.com.br'
            ).trim(),
            hashtags: (
              art.socialCreative?.hashtags || '#JornalFortNews #GrupoFortMidia #CIMBAJU #Noticias'
            ).trim(),
            visualDirection: (
              art.socialCreative?.visualDirection ||
              'Card editorial vermelho/laranja com selo de urgência no topo e foto em destaque.'
            ).trim(),
          },
        };
      });

      res.json({
        articles: normalized,
        sources,
        searchQueries,
        scannedAt: new Date().toLocaleString('pt-BR'),
      });
    } catch (err) {
      try {
        await runLiveGoogleNewsFallback(err instanceof Error ? err.message : 'gemini-unavailable');
      } catch {
        const formatted = formatGeminiError(err, 'Falha na varredura editorial com IA');
        res.status(formatted.status).json(formatted);
      }
    }
  });

  app.post('/api/ai/generate-ticker', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    const body = (req.body || {}) as TickerRequestBody;
    const territory = (body.territory || body.region || 'Regional CIMBAJU, São Paulo e Brasil').trim();
    const existingHeadlines = Array.isArray(body.existingHeadlines)
      ? body.existingHeadlines.slice(0, 8)
      : [];
    const count = Math.max(3, Math.min(8, Number(body.count) || 6));

    const runTickerRssFallback = async () => {
      const q =
        territory.includes('CIMBAJU')
          ? '"Franco da Rocha" OR Caieiras OR Cajamar OR "Francisco Morato" OR Mairiporã'
          : `${territory} notícias`;
      const rssItems = await fetchGoogleNewsRss(q, count);
      const items = rssItems.map((it) => {
        const seal = inferEditorialSeal(it.title).toUpperCase().split(' ')[0];
        return `${seal}: ${it.title.slice(0, 84)}`;
      });
      const sources = rssItems.map((i) => ({ title: i.sourceName, uri: i.link })).slice(0, 5);
      res.json({
        items,
        sources,
        generatedAt: new Date().toLocaleString('pt-BR'),
        engine: 'google-news-live',
      });
    };

    if (!apiKey) {
      try {
        await runTickerRssFallback();
      } catch {
        res.status(503).json({ error: 'Não foi possível atualizar o ticker ao vivo.' });
      }
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const prompt = `Você é o editor de plantão do Jornal FortNews.
Use a busca na web (Google Search) para consultar os principais acontecimentos recentes relacionados a "${territory}" (Franco da Rocha, Caieiras, Francisco Morato, Cajamar, Mairiporã, São Paulo e Brasil).
${
  existingHeadlines.length > 0
    ? `Considere também as manchetes já publicadas no portal:\n- ${existingHeadlines.join('\n- ')}\n`
    : ''
}
Gere exatamente ${count} legendas curtas e objetivas para a barra circulante de últimas notícias (ticker horizontal de plantão jornalístico).
Cada legenda deve começar com uma tag curta em maiúsculo seguida de dois pontos (ex: "URGENTE:", "CIMBAJU:", "MOBILIDADE:", "ECONOMIA:", "TEMPO:", "BRASIL:") e ter no máximo 98 caracteres no total.

Retorne EXCLUSIVAMENTE um JSON Array de strings (sem markdown ou texto fora do array), exemplo:
["URGENTE: ...", "CIMBAJU: ..."]`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = (response.text || '').trim();
      const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const candidateStr = fenceMatch ? fenceMatch[1].trim() : rawText;

      let items: string[] = [];
      try {
        const parsed = JSON.parse(candidateStr);
        if (Array.isArray(parsed)) {
          items = parsed.map((v) => String(v).trim()).filter(Boolean);
        }
      } catch {
        const startIdx = candidateStr.indexOf('[');
        const endIdx = candidateStr.lastIndexOf(']');
        if (startIdx !== -1 && endIdx > startIdx) {
          try {
            const sliced = JSON.parse(candidateStr.slice(startIdx, endIdx + 1));
            if (Array.isArray(sliced)) {
              items = sliced.map((v) => String(v).trim()).filter(Boolean);
            }
          } catch {
            items = [];
          }
        }
      }

      if (items.length === 0) {
        res.status(502).json({
          error: 'Não foi possível gerar as legendas circulantes com IA. Tente novamente.',
        });
        return;
      }

      const candidate = response.candidates?.[0] as
        | {
            groundingMetadata?: {
              groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
            };
          }
        | undefined;

      const sources = (candidate?.groundingMetadata?.groundingChunks || [])
        .filter((c) => c.web?.uri)
        .map((c) => ({
          title: c.web?.title || 'Fonte verificada',
          uri: c.web?.uri || '',
        }))
        .slice(0, 5);

      res.json({
        items: items.slice(0, count),
        sources,
        generatedAt: new Date().toLocaleString('pt-BR'),
      });
    } catch (err) {
      try {
        await runTickerRssFallback();
      } catch {
        const formatted = formatGeminiError(err, 'Falha ao gerar legenda circulante por IA');
        res.status(formatted.status).json(formatted);
      }
    }
  });

  app.post('/api/ai/generate-thumbnail', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error:
          'GEMINI_API_KEY não configurada no servidor. Selecione uma chave paga em Settings > Secrets.',
      });
      return;
    }

    const body = (req.body || {}) as ThumbnailRequestBody;
    const allowedRatios = new Set(['1:1', '3:4', '4:3', '9:16', '16:9']);
    const aspectRatio = allowedRatios.has(body.aspectRatio || '')
      ? (body.aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9')
      : '16:9';
    const programName = (body.programName || 'FortNews Podcast').trim();
    const guestName = (body.guestName || '').trim();
    const hostName = (body.hostName || '').trim();
    const customPrompt = (body.prompt || '').trim();

    const contextTail = `${
      programName ? ` Context: "${programName}".` : ''
    }${guestName ? ` Guest interview atmosphere for ${guestName}.` : ''}${
      hostName ? ` Hosted by ${hostName}.` : ''
    } Clean composition with open space for overlay portraits and typography. NO text, letters, logos, or watermarks inside the generated image.`;

    const fullPrompt = customPrompt
      ? `${customPrompt}.${contextTail}`
      : `Professional high-contrast broadcast podcast studio backdrop and editorial graphic background.${contextTail} Sleek dark charcoal architecture, warm orange (#FF6600) and gold (#D4AF37) rim lighting, subtle acoustic panels, bokeh depth of field.`;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: fullPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio,
          },
        },
      });

      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts ?? []) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          break;
        }
      }

      if (!imageUrl) {
        res.status(502).json({
          code: 'EMPTY_IMAGE_RESPONSE',
          error: 'A IA não retornou uma imagem válida para a thumbnail. Tente ajustar a descrição.',
        });
        return;
      }

      res.json({
        imageUrl,
        generatedAt: new Date().toLocaleString('pt-BR'),
      });
    } catch (err) {
      const formatted = formatGeminiError(err, 'Falha ao gerar thumbnail com IA');
      res.status(formatted.status).json(formatted);
    }
  });

  app.post('/api/ai/generate-social-caption', async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        code: 'MISSING_API_KEY',
        error:
          'GEMINI_API_KEY não configurada no servidor. Configure a chave no servidor ou utilize o botão "Gerar Modelo Editorial" para montar a legenda instantaneamente.',
      });
      return;
    }

    const body = (req.body || {}) as SocialCaptionRequestBody;
    const platform = stripEmojisClean(String(body.platform || 'Instagram Feed')).slice(0, 60);
    const tone = stripEmojisClean(String(body.tone || 'Jornalístico / Direto')).slice(0, 60);
    const brand = stripEmojisClean(String(body.brand || 'Jornal FortNews')).slice(0, 80);
    const headline = stripEmojisClean(String(body.headline || '')).slice(0, 260);
    const subtitle = stripEmojisClean(String(body.subtitle || '')).slice(0, 600);
    const city = stripEmojisClean(String(body.city || 'Regional CIMBAJU')).slice(0, 80);
    const category = stripEmojisClean(String(body.category || 'Notícias')).slice(0, 60);
    const details = stripEmojisClean(String(body.details || '')).slice(0, 1200);
    const ctaLink = stripEmojisClean(String(body.ctaLink || 'jornalfortnews.com.br')).slice(0, 180);
    const hashtagCount = Math.max(3, Math.min(20, Number(body.hashtagCount) || 8));

    if (!headline && !subtitle && !details) {
      res.status(400).json({
        error: 'Informe ao menos um título, resumo ou briefing para gerar a legenda.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const systemInstruction = `Você é redator sênior de redes sociais do Grupo FortMídia e do Portal Jornal FortNews (região do CIMBAJU: Franco da Rocha, Caieiras, Francisco Morato, Cajamar e Mairiporã).
REGRAS OBRIGATÓRIAS:
1. Escreva sempre em Português do Brasil (PT-BR) claro, profissional e envolvente.
2. NUNCA use emojis, emoticons, ícones pictográficos ou símbolos gráficos decorativos em nenhuma parte da legenda ou das hashtags.
3. NÃO use formatação Markdown (sem asteriscos **, sem crases, sem títulos com # na legenda).
4. NÃO coloque hashtags dentro do campo "caption"; coloque todas as hashtags exclusivamente no array "hashtags".
5. Adapte estrutura, tamanho e chamada para ação (CTA) à rede social e ao tom solicitados.`;

      const prompt = `Crie uma legenda pronta para publicação e exatamente ${hashtagCount} hashtags relevantes para o seguinte conteúdo:
- Rede social de destino: ${platform}
- Tom de voz: ${tone}
- Marca / Assinatura: ${brand}
- Cidade / Abrangência: ${city}
- Editoria / Selo: ${category}
- Título / Tema principal: ${headline || '(não informado)'}
- Resumo / Linha-fina: ${subtitle || '(não informado)'}
- Informações adicionais / Briefing: ${details || '(não informado)'}
- Link ou chamada final (CTA): ${ctaLink}

Lembrete crítico: ZERO emojis em todo o texto. Separe parágrafos com quebra de linha dupla para fácil leitura no celular.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              caption: {
                type: Type.STRING,
                description:
                  'Legenda pronta para a rede social, em PT-BR, sem hashtags no texto e estritamente sem emojis.',
              },
              hashtags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description:
                  'Lista de hashtags iniciadas com #, sem espaços internos e estritamente sem emojis.',
              },
            },
            required: ['caption', 'hashtags'],
          },
        },
      });

      const rawText = (response.text || '').trim();
      const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
      const jsonStr = fenceMatch ? fenceMatch[1].trim() : rawText;

      let parsed: { caption?: string; hashtags?: string[] | string } = {};
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        res.status(502).json({
          error: 'A IA retornou um formato inesperado ao gerar a legenda. Tente novamente.',
        });
        return;
      }

      const cleanCaption = stripEmojisClean(String(parsed.caption || ''))
        .replace(/\*\*/g, '')
        .trim();

      const rawTagArray = Array.isArray(parsed.hashtags)
        ? parsed.hashtags
        : typeof parsed.hashtags === 'string'
          ? parsed.hashtags.split(/[\s,;]+/)
          : [];

      const hashtagList = normalizeHashtagList(rawTagArray, hashtagCount);

      if (!cleanCaption) {
        res.status(502).json({
          error: 'Não foi possível gerar o texto da legenda. Tente ajustar o tema informado.',
        });
        return;
      }

      res.json({
        caption: cleanCaption,
        hashtags: hashtagList.join(' '),
        hashtagList,
        generatedAt: new Date().toLocaleString('pt-BR'),
      });
    } catch (err) {
      const formatted = formatGeminiError(err, 'Falha ao gerar legenda com IA');
      res.status(formatted.status).json(formatted);
    }
  });

  if (!isProduction) {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: !disableHmr,
        watch: disableHmr ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`FortMídia & FortNews server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start FortMídia & FortNews server:', err);
  process.exit(1);
});
