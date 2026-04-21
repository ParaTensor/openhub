import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, Code2} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '../lib/utils';
import LocaleSwitcher from '../components/LocaleSwitcher';
import {APP_SHELL_MAX_CLASS, APP_SHELL_PAD_CLASS, LANDING_CONTENT_COLUMN_CLASS} from '../lib/appShellLayout';

const LandingCatalogSection = React.lazy(() => import('./landing/LandingCatalogSection'));

const accent = 'text-purple-600';
const accentBg = 'bg-purple-600 hover:bg-purple-500';

function CatalogSectionFallback() {
  return (
    <section id="models" className="border-t border-zinc-100 bg-zinc-50/40 py-14 sm:py-16">
      <div className={LANDING_CONTENT_COLUMN_CLASS}>
        <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 shadow-sm">
          <div className="h-7 w-48 animate-pulse rounded bg-zinc-200" />
          <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded bg-zinc-100" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({length: 4}).map((_, index) => (
              <div key={index} className="rounded-xl border border-zinc-100 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200" />
                <div className="mt-3 h-3 w-full animate-pulse rounded bg-zinc-100" />
                <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-zinc-100" />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="h-14 animate-pulse rounded bg-zinc-50" />
                  <div className="h-14 animate-pulse rounded bg-zinc-50" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const {t} = useTranslation();
  const catalogLoadRef = React.useRef<HTMLDivElement | null>(null);
  const [shouldLoadCatalogSection, setShouldLoadCatalogSection] = React.useState(false);

  React.useEffect(() => {
    if (shouldLoadCatalogSection) {
      return;
    }

    const node = catalogLoadRef.current;
    if (!node || typeof window === 'undefined') {
      setShouldLoadCatalogSection(true);
      return;
    }

    if (!('IntersectionObserver' in window)) {
      setShouldLoadCatalogSection(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoadCatalogSection(true);
          observer.disconnect();
        }
      },
      {rootMargin: '240px 0px'},
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoadCatalogSection]);

  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased">
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur-md">
        <div
          className={`mx-auto grid h-14 ${APP_SHELL_MAX_CLASS} grid-cols-[auto_1fr_auto] items-center gap-3 ${APP_SHELL_PAD_CLASS} sm:gap-4`}
        >
          <Link to="/" className="flex shrink-0 items-center gap-2.5 font-bold tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
              <div className="h-3.5 w-3.5 rotate-45 rounded-sm bg-white" />
            </div>
            <span>{t('navbar.pararouter')}</span>
          </Link>

          <nav className="hidden min-w-0 justify-self-center self-center md:flex md:items-center md:gap-5 md:text-sm md:font-medium md:text-zinc-600 lg:gap-6">
            <a href="#models" className="whitespace-nowrap transition-colors hover:text-zinc-900">
              {t('navbar.models')}
            </a>
            <Link to="/docs" className="whitespace-nowrap transition-colors hover:text-zinc-900">
              {t('navbar.docs')}
            </Link>
          </nav>

          <div className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
            <LocaleSwitcher className="gap-2 sm:gap-3" />
            <Link
              to="/login?mode=register"
              className={cn(
                'whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors sm:px-4',
                accentBg,
              )}
            >
              {t('landing.nav_sign_up')}
            </Link>
          </div>
        </div>
      </header>

      <div className={`${LANDING_CONTENT_COLUMN_CLASS} pb-6 pt-12 sm:pt-16 lg:pt-20`}>
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12 lg:items-center">
          <div className="max-w-2xl lg:col-span-6 xl:col-span-7">
            <h1 className="text-balance text-4xl font-bold tracking-tight text-zinc-950 sm:text-5xl lg:text-6xl">
              {t('landing.hero_title')}
            </h1>
            <p className="mt-5 text-pretty text-lg text-zinc-600 sm:text-xl">
              {t('landing.hero_desc_start')}
              <span className={`font-semibold ${accent}`}>{t('landing.hero_kw_price')}</span>
              {t('landing.hero_desc_mid')}
              <span className={`font-semibold ${accent}`}>{t('landing.hero_kw_speed')}</span>
              {t('landing.hero_desc_end')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/login?next=/keys"
                className={cn(
                  'inline-flex w-full items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white shadow-md transition-colors sm:w-auto',
                  accentBg,
                )}
              >
                {t('landing.cta_key')}
              </Link>
              <a
                href="#models"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white px-8 py-3.5 text-base font-semibold text-zinc-800 shadow-sm transition-colors hover:bg-zinc-50 sm:w-auto"
              >
                {t('landing.cta_models')}
                <ArrowRight className="h-4 w-4 text-zinc-500" />
              </a>
            </div>
          </div>

          <div className="relative lg:col-span-6 xl:col-span-5">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-purple-100/80 via-white to-zinc-50 blur-2xl lg:-inset-6"
            />
            <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-lg shadow-zinc-200/60 ring-1 ring-zinc-900/[0.04]">
              <div className="relative flex items-center justify-center border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
                <div className="absolute left-4 flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-red-400/90" />
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
                </div>
                <span className="flex items-center gap-1.5 px-10 text-center text-xs font-medium text-zinc-500">
                  <Code2 className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                  {t('landing.hero_card_title')}
                </span>
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                <p className="text-xs leading-relaxed text-zinc-500 sm:text-sm">{t('landing.hero_card_sub')}</p>
                <pre className="overflow-x-auto rounded-xl border border-zinc-100 bg-zinc-950 p-4 text-left text-[11px] leading-relaxed text-zinc-100 sm:text-xs">
                  <code>
                    <span className="text-purple-300">POST</span> <span className="text-zinc-300">/v1/chat/completions</span>
                    {'\n'}
                    <span className="text-zinc-500">Authorization:</span> <span className="text-emerald-300/90">Bearer $PARAROUTER_API_KEY</span>
                    {'\n\n'}
                    <span className="text-zinc-500">{'{'}</span>
                    {'\n'}
                    {'  '}
                    <span className="text-sky-300">&quot;model&quot;</span>
                    <span className="text-zinc-500">: </span>
                    <span className="text-amber-200/90">&quot;gpt-4o&quot;</span>
                    <span className="text-zinc-500">,</span>
                    {'\n'}
                    {'  '}
                    <span className="text-sky-300">&quot;messages&quot;</span>
                    <span className="text-zinc-500">: [ ... ]</span>
                    {'\n'}
                    <span className="text-zinc-500">{'}'}</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-5 border-y border-zinc-100 py-6 text-sm lg:grid-cols-4 lg:gap-x-8">
          {(
            [
              ['landing.stat1_val', 'landing.stat1_label'],
              ['landing.stat2_val', 'landing.stat2_label'],
              ['landing.stat3_val', 'landing.stat3_label'],
              ['landing.stat4_val', 'landing.stat4_label'],
            ] as const
          ).map(([valKey, labelKey], i) => (
            <div key={labelKey}>
              <p className={cn('text-lg font-bold tracking-tight text-zinc-900 sm:text-xl', i === 3 && accent)}>{t(valKey)}</p>
              <p className="mt-0.5 text-zinc-500">{t(labelKey)}</p>
            </div>
          ))}
        </div>
      </div>

      <div ref={catalogLoadRef}>
        <React.Suspense fallback={<CatalogSectionFallback />}>
          {shouldLoadCatalogSection ? <LandingCatalogSection /> : <CatalogSectionFallback />}
        </React.Suspense>
      </div>

      <section className={`${LANDING_CONTENT_COLUMN_CLASS} py-16`}>
        <div className={cn('rounded-2xl border px-6 py-12 text-center sm:px-12', 'border-purple-100 bg-gradient-to-br from-purple-50 to-white')}>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{t('landing.bottom_title')}</h2>
          <p className="mx-auto mt-3 max-w-3xl text-balance text-zinc-600">{t('landing.bottom_desc')}</p>
          <Link
            to="/login?next=/keys"
            className={cn('mt-8 inline-flex rounded-full px-8 py-3.5 text-base font-semibold text-white shadow-md transition-colors', accentBg)}
          >
            {t('landing.cta_key')}
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-100 py-8 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} ParaRouter
      </footer>
    </div>
  );
}
