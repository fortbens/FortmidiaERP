import { useEffect, useState } from 'react';
import { Building2, LayoutDashboard, Newspaper } from 'lucide-react';
import { FortMidiaProvider } from './context/FortMidiaContext';
import { Navbar } from './components/public/Navbar';
import { HeroSection } from './components/public/HeroSection';
import { NewsSection } from './components/public/NewsSection';
import { OutdoorMapSection } from './components/public/OutdoorMapSection';
import { ProductsSection } from './components/public/ProductsSection';
import { GallerySection } from './components/public/GallerySection';
import { PodcastSection } from './components/public/PodcastSection';
import { CimbajuExpansionSection } from './components/public/CimbajuExpansionSection';
import { FalaCidadaoSection } from './components/public/FalaCidadaoSection';
import { FortNewsPortal } from './components/public/FortNewsPortal';
import { ClientPortalBoard } from './components/public/ClientPortalBoard';
import { InstitutionalPresentation } from './components/public/InstitutionalPresentation';
import { Footer } from './components/public/Footer';
import { ProposalModal } from './components/public/ProposalModal';
import { WhatsAppBubble } from './components/public/WhatsAppBubble';
import { CmsPopupModal } from './components/public/CmsPopupModal';
import { AdminDashboard } from './components/admin/AdminDashboard';

type AppRouteView = 'public' | 'fortnews' | 'cliente' | 'apresentacao' | 'admin';
type DomainContext = 'fortnews' | 'fortmidia' | 'preview';

function detectDomainContext(): DomainContext {
  if (typeof window === 'undefined') return 'preview';
  const hostname = window.location.hostname.toLowerCase();

  if (
    hostname === 'fortnews.com.br' ||
    hostname === 'www.fortnews.com.br' ||
    hostname === 'jornalfortnews.com.br' ||
    hostname === 'www.jornalfortnews.com.br'
  ) {
    return 'fortnews';
  }

  if (hostname === 'fortmidia.com.br' || hostname === 'www.fortmidia.com.br') {
    return 'fortmidia';
  }

  return 'preview';
}

function detectInitialRoute(): AppRouteView {
  if (typeof window === 'undefined') return 'public';

  const domain = detectDomainContext();
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const hash = window.location.hash.toLowerCase();
  const combined = `${path} ${hash}`;

  // Rotas administrativas protegidas por login (/admin, /crm, /sistema, /dashboard, /painel)
  if (
    /(?:^|\/|#\/)(admin|crm|sistema|dashboard|painel)(?:\/|$|\s)/.test(combined)
  ) {
    return 'admin';
  }

  // Em fortnews.com.br, qualquer outra rota abre diretamente o Portal Público FortNews
  if (domain === 'fortnews') {
    return 'fortnews';
  }

  if (/(?:^|\/|#\/)apresentacao(?:\/|$|\s)/.test(combined)) {
    return 'apresentacao';
  }
  if (/(?:^|\/|#\/)cliente(?:\/|$|\s)/.test(combined)) {
    return 'cliente';
  }
  if (/(?:^|\/|#\/)fortnews(?:\/|$|\s)/.test(combined)) {
    return 'fortnews';
  }

  // Em fortmidia.com.br, abre diretamente a interface da Agência / CRM FortMídia
  if (domain === 'fortmidia') {
    return 'public';
  }

  // Fallback opcional de build target (quando configurado manualmente)
  const appTarget = (import.meta.env.VITE_APP_TARGET || '').toLowerCase();
  if (appTarget === 'fortnews') {
    return 'fortnews';
  }
  return 'public';
}

export default function App() {
  const [domainContext] = useState<DomainContext>(detectDomainContext);
  const [view, setView] = useState<AppRouteView>(detectInitialRoute);
  const [proposalOpen, setProposalOpen] = useState(false);
  const [selectedQuota, setSelectedQuota] = useState('Cota Master FortNews Podcast');
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  const isPreviewOrLocal = domainContext === 'preview';

  useEffect(() => {
    const titleByView: Record<AppRouteView, string> = {
      public: 'CRM FORTMIDIA',
      admin: 'CRM FORTMIDIA · Sistema',
      fortnews: 'Portal Jornal FortNews · CIMBAJU',
      cliente: 'CRM FORTMIDIA · Pipeline',
      apresentacao: 'CRM FORTMIDIA · Apresentação',
    };
    document.title = titleByView[view] || 'CRM FORTMIDIA';
  }, [view]);

  useEffect(() => {
    const onHashOrPop = () => {
      setView(detectInitialRoute());
    };
    const onQuotaExceeded = () => {
      setMapsQuotaExceeded(true);
    };
    window.addEventListener('hashchange', onHashOrPop);
    window.addEventListener('popstate', onHashOrPop);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => {
      window.removeEventListener('hashchange', onHashOrPop);
      window.removeEventListener('popstate', onHashOrPop);
      window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
    };
  }, []);

  const updateRouteUrl = (cleanPath: string, hashPath: string) => {
    try {
      if (domainContext !== 'preview' && window.history?.pushState) {
        window.history.pushState({}, '', cleanPath);
      } else {
        window.location.hash = hashPath;
      }
    } catch {
      window.location.hash = hashPath;
    }
  };

  const navigateToAdmin = () => {
    updateRouteUrl('/crm', '#/crm');
    setView('admin');
    window.scrollTo({ top: 0 });
  };

  const navigateToPublic = () => {
    if (domainContext === 'fortnews') {
      updateRouteUrl('/', '#/');
      setView('fortnews');
      window.scrollTo({ top: 0 });
      return;
    }
    updateRouteUrl('/', '#/');
    setView('public');
    window.scrollTo({ top: 0 });
  };

  const navigateToFortNews = () => {
    updateRouteUrl(domainContext === 'fortnews' ? '/' : '/fortnews', '#/fortnews');
    setView('fortnews');
    window.scrollTo({ top: 0 });
  };

  const navigateToClientPortal = () => {
    updateRouteUrl('/cliente', '#/cliente');
    setView('cliente');
    window.scrollTo({ top: 0 });
  };

  const navigateToPresentation = () => {
    updateRouteUrl('/apresentacao', '#/apresentacao');
    setView('apresentacao');
    window.scrollTo({ top: 0 });
  };

  const navigateToFalaCidadao = () => {
    if (domainContext === 'fortnews') {
      window.location.href = 'https://fortmidia.com.br/#fala-cidadao';
      return;
    }
    window.location.hash = '#fala-cidadao';
    setView('public');
    window.setTimeout(() => {
      document.getElementById('fala-cidadao')?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const handleOpenProposal = (quotaName?: string) => {
    if (quotaName) {
      setSelectedQuota(quotaName);
    }
    setProposalOpen(true);
  };

  return (
    <FortMidiaProvider>
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {view === 'admin' ? (
        <AdminDashboard
          onBackToPortal={navigateToPublic}
          onOpenFortNewsPortal={navigateToFortNews}
        />
      ) : view === 'fortnews' ? (
        <FortNewsPortal
          onBackToHolding={
            domainContext === 'fortnews'
              ? () => {
                  window.location.href = 'https://fortmidia.com.br';
                }
              : navigateToPublic
          }
          onOpenFalaCidadao={navigateToFalaCidadao}
          onOpenAdmin={navigateToAdmin}
        />
      ) : view === 'cliente' ? (
        <ClientPortalBoard onBackToPortal={navigateToPublic} />
      ) : view === 'apresentacao' ? (
        <InstitutionalPresentation
          onBackToPortal={navigateToPublic}
          onOpenProposal={handleOpenProposal}
          onOpenFortNews={navigateToFortNews}
        />
      ) : (
        <div
          className="min-h-screen text-[#F5F5F7]"
          style={{ backgroundColor: 'var(--fort-bg)' }}
        >
          <Navbar
            onOpenProposal={handleOpenProposal}
            onOpenFortNews={navigateToFortNews}
          />
          <main>
            <HeroSection
              onOpenProposal={handleOpenProposal}
              onOpenFortNews={navigateToFortNews}
            />
            <NewsSection onOpenFortNews={navigateToFortNews} />
            <ProductsSection onSelectQuota={handleOpenProposal} />
            <OutdoorMapSection onSelectOutdoor={handleOpenProposal} />
            <GallerySection onOpenProposal={handleOpenProposal} />
            <PodcastSection />
            <CimbajuExpansionSection onOpenProposal={handleOpenProposal} />
            <FalaCidadaoSection />
          </main>
          <Footer
            onOpenAdmin={navigateToAdmin}
            onOpenFortNews={navigateToFortNews}
            onOpenClientPortal={navigateToClientPortal}
            onOpenPresentation={navigateToPresentation}
          />
          <WhatsAppBubble />
          <CmsPopupModal onOpenProposal={handleOpenProposal} />
          <ProposalModal
            isOpen={proposalOpen}
            initialQuota={selectedQuota}
            onClose={() => setProposalOpen(false)}
          />
        </div>
      )}

      {/* Seletor rápido de navegação multi-domínio exclusivo para localhost / preview */}
      {isPreviewOrLocal && (
        <nav
          aria-label="Navegação rápida de ambientes"
          className="no-print fixed bottom-4 left-4 z-50 flex items-center gap-1 rounded-xl border border-white/15 bg-[#0D0D10]/95 p-1 shadow-2xl backdrop-blur-md"
        >
          <button
            type="button"
            onClick={navigateToPublic}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
              view === 'public' || view === 'apresentacao' || view === 'cliente'
                ? 'bg-[#fa6607] text-white'
                : 'text-zinc-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">FortMídia</span>
          </button>
          <button
            type="button"
            onClick={navigateToFortNews}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
              view === 'fortnews'
                ? 'bg-[#fa6607] text-white'
                : 'text-zinc-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">FortNews</span>
          </button>
          <button
            type="button"
            onClick={navigateToAdmin}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
              view === 'admin'
                ? 'bg-[#fa6607] text-white'
                : 'text-zinc-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">CRM / Admin</span>
          </button>
        </nav>
      )}
    </FortMidiaProvider>
  );
}
