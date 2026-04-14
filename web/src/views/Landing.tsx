import React, {useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, Code2, Globe, Search, Zap} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '../lib/utils';
import LocaleSwitcher from '../components/LocaleSwitcher';
import {apiGet} from '../lib/api';
import {sortByNameThenId} from '../lib/modelSort';
import {APP_SHELL_MAX_CLASS, APP_SHELL_PAD_CLASS, LANDING_CONTENT_COLUMN_CLASS} from '../lib/appShellLayout';
import {MODEL_CARD_GRID, MODEL_CARD_SHELL} from '../lib/modelCardShell';

const accent = 'text-purple-600';
const accentBg = 'bg-purple-600 hover:bg-purple-500';

type PublicGlobalModel = {
  id: string;
  name: string;
  description?: string;
  context_length: number | null;
  global_pricing?: {
    prompt?: number;
    completion?: number;
    cache_read?: number;
    cache_write?: number;
    reasoning?: number;
  } | null;
};

type RoutedRow = {id: string; name: string; provider?: string};

function orderRegistryLikeModelsPage(registry: PublicGlobalModel[], routed: RoutedRow[]) {
  if (!registry.length) return [];
  if (!routed.length) return sortByNameThenId(registry);
  const sortedRouted = sortByNameThenId(routed);
  const routedIdsOrdered: string[] = [];
  const seen = new Set<string>();
  for (const m of sortedRouted) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      routedIdsOrdered.push(m.id);
    }
  }
  const catalogOnly = registry.filter((r) => r.id && !seen.has(r.id));
  const sortedCatalog = sortByNameThenId(catalogOnly);
  const byId = new Map(registry.map((r) => [r.id, r]));
  return [...routedIdsOrdered, ...sortedCatalog.map((r) => r.id)]
    .map((id) => byId.get(id))
    .filter((r): r is PublicGlobalModel => r != null);
}

function fmtUsdShort(v: unknown): string {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  return `$${v.toFixed(2)}`;
}

function contextShort(cl: number | null): string {
  if (cl == null || cl <= 0) return '';
  return cl >= 1000 ? `${Math.round(cl / 1000)}K` : String(cl);
}

export default function Landing() {
  const {t} = useTranslation();
  const [catalog, setCatalog] = useState<PublicGlobalModel[]>([]);
  const [routedSnapshot, setRoutedSnapshot] = useState<RoutedRow[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [reg, routed] = await Promise.all([
          apiGet<PublicGlobalModel[]>('/api/llm-models'),
          apiGet<RoutedRow[]>('/api/models').catch(() => [] as RoutedRow[]),
        ]);
        if (!cancelled) {
          if (Array.isArray(reg)) setCatalog(reg);
          if (Array.isArray(routed)) setRoutedSnapshot(routed);
        }
      } catch {
        if (!cancelled) {
          setCatalogError(true);
          setCatalog([]);
          setRoutedSnapshot([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const catalogOrdered = useMemo(
    () => orderRegistryLikeModelsPage(catalog, routedSnapshot),
    [catalog, routedSnapshot],
  );

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    const list = !q
      ? catalogOrdered
      : catalogOrdered.filter((m) => `${m.name} ${m.id}`.toLowerCase().includes(q));
    return list;
  }, [catalogOrdered, catalogSearch]);

  const routedIdSet = useMemo(() => new Set(routedSnapshot.map((r) => r.id)), [routedSnapshot]);

  const routedProviderById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of routedSnapshot) {
      const p = typeof r.provider === 'string' ? r.provider.trim() : '';
      if (p && !map.has(r.id)) map.set(r.id, p);
    }
    return map;
  }, [routedSnapshot]);

  const gridClass = MODEL_CARD_GRID;

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

      <section id="models" className="border-t border-zinc-100 bg-zinc-50/40 py-14 sm:py-16">
        <div className={LANDING_CONTENT_COLUMN_CLASS}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{t('landing.explorer_title')}</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base">{t('landing.explorer_subtitle')}</p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden />
              <input
                type="search"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder={t('models.placeholder_search')}
                className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-3 text-sm text-zinc-900 shadow-sm outline-none ring-zinc-900/5 placeholder:text-zinc-400 focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
              />
            </div>
          </div>

          <div className="mt-8">
            {catalogLoading ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 shadow-sm">
                {t('landing.models_loading')}
              </div>
            ) : catalogError ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-red-600 shadow-sm">
                {t('landing.models_error')}
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-16 text-center text-sm text-zinc-500 shadow-sm">
                {t('landing.models_empty')}
              </div>
            ) : (
              <div className={gridClass}>
                {filteredCatalog.map((m) => {
                  const gp = m.global_pricing || {};
                  const isRouted = routedIdSet.has(m.id);
                  const providerLine = isRouted
                    ? routedProviderById.get(m.id) || t('landing.model_provider_routed')
                    : t('models.catalog_no_provider');
                  const ctx = contextShort(m.context_length);
                  const desc = t(`models.descriptions.${m.id}`, {
                    defaultValue: m.description || '',
                  });
                  const cacheRead = fmtUsdShort(gp.cache_read);
                  const reasoning = fmtUsdShort(gp.reasoning);
                  const showExtra = cacheRead !== '—' || reasoning !== '—';

                  return (
                    <div
                      key={m.id}
                      className={MODEL_CARD_SHELL}
                    >
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-100 bg-zinc-50 text-sm font-bold text-zinc-400">
                            {isRouted ? (
                              <span className="leading-none">{providerLine ? providerLine[0] : '?'}</span>
                            ) : (
                              <Globe className="h-4 w-4 text-zinc-400" aria-hidden />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="flex flex-col gap-0.5 text-sm font-bold leading-snug text-zinc-900">
                              <span className="line-clamp-2">{m.name || m.id}</span>
                              <span className="w-fit max-w-full truncate rounded border border-zinc-200 bg-zinc-100 px-1 py-0.5 font-mono text-[10px] text-zinc-500">
                                {m.id}
                              </span>
                            </h3>
                            <p className="mt-0.5 truncate text-[11px] font-medium text-zinc-400">{providerLine}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          {!isRouted && (
                            <span className="rounded border border-amber-100 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                              {t('models.catalog_badge')}
                            </span>
                          )}
                          {ctx ? (
                            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-300">{ctx}</span>
                          ) : null}
                        </div>
                      </div>

                      {desc ? (
                        <p className="mb-3 line-clamp-3 flex-grow text-xs leading-relaxed text-zinc-500">{desc}</p>
                      ) : (
                        <div className="mb-3 flex-grow" />
                      )}

                      <div className="mb-2 grid grid-cols-2 gap-1.5">
                        <div className="rounded-lg border border-gray-50 bg-zinc-50/50 p-2">
                          <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                            {t('models.prompt')}
                          </p>
                          <p className="truncate font-mono text-[11px] font-semibold text-zinc-700">
                            {fmtUsdShort(gp.prompt)}
                            <span className="ml-0.5 text-[9px] font-normal text-zinc-400">/1M</span>
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-50 bg-zinc-50/50 p-2">
                          <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                            {t('models.completion')}
                          </p>
                          <p className="truncate font-mono text-[11px] font-semibold text-zinc-700">
                            {fmtUsdShort(gp.completion)}
                            <span className="ml-0.5 text-[9px] font-normal text-zinc-400">/1M</span>
                          </p>
                        </div>
                      </div>

                      {showExtra ? (
                        <div className="mb-2 grid grid-cols-2 gap-1.5 border-t border-gray-50/50 pt-1">
                          {cacheRead !== '—' ? (
                            <div className="rounded-lg border border-emerald-50/50 bg-emerald-50/30 p-2">
                              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-500">
                                {t('models.cache_hit')}
                              </p>
                              <p className="truncate font-mono text-[11px] font-semibold text-emerald-700">{cacheRead}</p>
                            </div>
                          ) : (
                            <div />
                          )}
                          {reasoning !== '—' ? (
                            <div className="rounded-lg border border-indigo-50/50 bg-indigo-50/30 p-2">
                              <p className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                                {t('models.reasoning')}
                              </p>
                              <p className="truncate font-mono text-[11px] font-semibold text-indigo-700">{reasoning}</p>
                            </div>
                          ) : (
                            <div />
                          )}
                        </div>
                      ) : null}

                      <div className="mt-auto flex items-center gap-1 border-t border-gray-50 pt-2 text-[10px] font-medium text-zinc-400">
                        {isRouted ? (
                          <>
                            <Zap size={10} className="shrink-0 text-emerald-500" aria-hidden />
                            <span className="min-w-0 truncate">{t('landing.model_footer_routed')}</span>
                          </>
                        ) : (
                          <span className="min-w-0 truncate">{t('models.catalog_latency_hint')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

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
