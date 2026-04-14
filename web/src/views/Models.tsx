import React, {useEffect, useMemo, useState} from 'react';
import {Search, ArrowUpRight, Zap, SlidersHorizontal, Layers, Database} from 'lucide-react';
import {apiGet} from '../lib/api';
import {localUser} from '../lib/session';
import {useTranslation} from 'react-i18next';
import {Link} from 'react-router-dom';
import {sortByNameThenId} from '../lib/modelSort';

type RoutedModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  context: string;
  pricing: {
    prompt: string;
    completion: string;
    cache_read?: string | null;
    cache_write?: string | null;
    reasoning?: string | null;
  };
  isPopular?: boolean;
  latency: string;
  /** Present on API-routed rows; omitted for synthesized catalog cards. */
  provider_account_id?: string;
};

type RegistryRow = {
  id: string;
  name: string;
  description: string;
  context_length: number | null;
  global_pricing?: {
    prompt?: number;
    completion?: number;
    cache_read?: number;
    cache_write?: number;
    reasoning?: number;
  };
};

function formatUsd(n: number | undefined | null) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  return `$${n.toFixed(2)}`;
}

function registryRowToCatalogModel(row: RegistryRow, catalogLabel: string): RoutedModel {
  const gp = row.global_pricing || {};
  const cl = row.context_length;
  const context =
    cl != null && cl > 0 ? (cl >= 1000 ? `${Math.round(cl / 1000)}k` : String(cl)) : '';
  return {
    id: row.id,
    name: row.name || row.id,
    provider: catalogLabel,
    description: row.description || '',
    context,
    pricing: {
      prompt: formatUsd(gp.prompt) || '$0.00',
      completion: formatUsd(gp.completion) || '$0.00',
      cache_read: formatUsd(gp.cache_read),
      cache_write: formatUsd(gp.cache_write),
      reasoning: formatUsd(gp.reasoning),
    },
    isPopular: false,
    latency: '—',
  };
}

function matchesSearch(m: RoutedModel, q: string) {
  if (!q) return true;
  const s = q.toLowerCase();
  return `${m.name} ${m.provider} ${m.id} ${m.description}`.toLowerCase().includes(s);
}

export default function ModelsView() {
  const {t, i18n} = useTranslation();
  const [search, setSearch] = useState('');
  const [routed, setRouted] = useState<RoutedModel[]>([]);
  const [registry, setRegistry] = useState<RegistryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = localUser.role === 'admin';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [routedRes, registryRes] = await Promise.all([
          apiGet<RoutedModel[]>('/api/models').catch(() => [] as RoutedModel[]),
          apiGet<RegistryRow[]>('/api/llm-models').catch(() => [] as RegistryRow[]),
        ]);
        if (cancelled) return;
        setRouted(Array.isArray(routedRes) ? routedRes : []);
        setRegistry(Array.isArray(registryRes) ? registryRes : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const routedIds = useMemo(() => new Set(routed.map((m) => m.id)), [routed]);

  const catalogOnly = useMemo(() => {
    const label = t('models.catalog_no_provider');
    return registry.filter((r) => r.id && !routedIds.has(r.id)).map((r) => registryRowToCatalogModel(r, label));
  }, [registry, routedIds, t, i18n.language]);

  const filteredRouted = useMemo(() => {
    return sortByNameThenId(routed.filter((m) => matchesSearch(m, search)));
  }, [routed, search]);

  const filteredCatalog = useMemo(() => {
    return sortByNameThenId(catalogOnly.filter((m) => matchesSearch(m, search)));
  }, [catalogOnly, search]);

  if (loading) {
    return <div className="text-center text-zinc-500">{t('models.loading_models')}</div>;
  }

  const gridClass =
    'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3';

  const renderCard = (model: RoutedModel, mode: 'routed' | 'catalog') => (
    <div
      key={mode === 'routed' ? `${model.id}::${model.provider_account_id ?? ''}` : `${model.id}::catalog`}
      className="group bg-white border border-gray-100 rounded-xl p-3 hover:border-zinc-300 transition-all duration-200 flex flex-col min-h-[220px]"
    >
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-lg bg-zinc-50 border border-gray-100 flex items-center justify-center font-bold text-zinc-400 text-sm">
            {model.provider ? model.provider[0] : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-zinc-900 leading-snug flex flex-col gap-0.5">
              <span className="line-clamp-2">{model.name}</span>
              <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-1 py-0.5 rounded border border-zinc-200 w-fit max-w-full truncate">
                {model.id}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400 font-medium mt-0.5 truncate">{model.provider}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {mode === 'catalog' && (
            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-100 text-[9px] font-bold uppercase tracking-wide rounded">
              {t('models.catalog_badge')}
            </span>
          )}
          {model.isPopular && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-zinc-900 text-white text-[9px] font-bold uppercase tracking-wider rounded">
              {t('models.trending')}
            </span>
          )}
          {model.context ? (
            <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">{model.context}</span>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed mb-3 flex-grow line-clamp-3">
        {t(`models.descriptions.${model.id}`, {defaultValue: model.description})}
      </p>

      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="bg-zinc-50/50 rounded-lg p-2 border border-gray-50">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{t('models.prompt')}</p>
          <p className="font-mono text-[11px] font-semibold text-zinc-700 truncate">{model.pricing.prompt}</p>
        </div>
        <div className="bg-zinc-50/50 rounded-lg p-2 border border-gray-50">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-0.5">{t('models.completion')}</p>
          <p className="font-mono text-[11px] font-semibold text-zinc-700 truncate">{model.pricing.completion}</p>
        </div>
      </div>

      {(model.pricing.cache_read || model.pricing.cache_write || model.pricing.reasoning) && (
        <div className="grid grid-cols-2 gap-1.5 mb-2 pt-1 border-t border-gray-50/50">
          {model.pricing.cache_read ? (
            <div className="bg-emerald-50/30 rounded-lg p-2 border border-emerald-50/50">
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider mb-0.5">{t('models.cache_hit')}</p>
              <p className="font-mono text-[11px] font-semibold text-emerald-700 truncate">{model.pricing.cache_read}</p>
            </div>
          ) : (
            <div />
          )}
          {model.pricing.reasoning ? (
            <div className="bg-indigo-50/30 rounded-lg p-2 border border-indigo-50/50">
              <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wider mb-0.5">{t('models.reasoning')}</p>
              <p className="font-mono text-[11px] font-semibold text-indigo-700 truncate">{model.pricing.reasoning}</p>
            </div>
          ) : (
            <div />
          )}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-auto gap-2">
        <div className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 min-w-0">
          {mode === 'routed' ? (
            <>
              <Zap size={10} className="text-emerald-500 shrink-0" />
              <span className="truncate">{model.latency}</span>
            </>
          ) : (
            <span className="text-zinc-400 truncate">{t('models.catalog_latency_hint')}</span>
          )}
        </div>
        {isAdmin && mode === 'routed' && (
          <Link
            to={`/models/${encodeURIComponent(model.id)}/providers`}
            className="flex items-center gap-0.5 text-[10px] font-bold text-zinc-900 opacity-0 group-hover:opacity-100 transition-all shrink-0"
          >
            {t('models.details')}
            <ArrowUpRight size={12} />
          </Link>
        )}
      </div>
    </div>
  );

  const emptyBoth = filteredRouted.length === 0 && filteredCatalog.length === 0;
  const hasAny = routed.length > 0 || catalogOnly.length > 0;

  return (
    <div className="space-y-8 w-full min-w-0 max-w-[1800px] mx-auto pb-16">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 pt-2">
        <div className="space-y-2 max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900">{t('models.the_unified_interface_for_llms')}</h1>
          <p className="text-base sm:text-lg text-zinc-500 font-medium">{t('models.access_any_ai_model_via_a_sing')}</p>
        </div>
        {hasAny && (
          <div className="flex flex-wrap gap-3 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
              <Layers size={14} className="text-zinc-400" />
              {t('models.stat_routed', {count: routed.length})}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5">
              <Database size={14} className="text-zinc-400" />
              {t('models.stat_catalog', {count: catalogOnly.length})}
            </span>
          </div>
        )}
      </div>

      <div className="sticky top-[72px] z-30 bg-white/85 backdrop-blur-md py-2 -mx-1 px-1">
        <div className="relative group max-w-3xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors" size={18} />
          <input
            type="text"
            placeholder={t('models.placeholder_search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button type="button" className="p-1.5 hover:bg-gray-100 rounded-md text-zinc-400 hover:text-black transition-colors" aria-label="Filter">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>
      </div>

      {emptyBoth ? (
        <div className="py-16 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100">
          <p className="text-zinc-500 font-medium mb-1">
            {search ? t('models.empty_all_filtered') : t('models.empty_no_models_title')}
          </p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">{search ? '' : t('models.empty_no_models_hint')}</p>
        </div>
      ) : (
        <div className="space-y-10">
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 tracking-tight">{t('models.section_with_providers')}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{t('models.section_with_providers_sub')}</p>
              </div>
              <span className="text-xs font-semibold text-zinc-400 tabular-nums">
                {t('models.count_shown', {shown: filteredRouted.length, total: routed.length})}
              </span>
            </div>
            {filteredRouted.length > 0 ? (
              <div className={gridClass}>{filteredRouted.map((m) => renderCard(m, 'routed'))}</div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-zinc-50/40 px-4 py-8 text-center text-sm text-zinc-500">
                {search ? t('models.empty_section_filtered') : t('models.empty_routed')}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-zinc-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 tracking-tight">{t('models.section_global_catalog')}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{t('models.section_global_catalog_sub')}</p>
              </div>
              <span className="text-xs font-semibold text-zinc-400 tabular-nums">
                {t('models.count_shown', {shown: filteredCatalog.length, total: catalogOnly.length})}
              </span>
            </div>
            {filteredCatalog.length > 0 ? (
              <div className={gridClass}>{filteredCatalog.map((m) => renderCard(m, 'catalog'))}</div>
            ) : catalogOnly.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-zinc-50/40 px-4 py-8 text-center text-sm text-zinc-500">
                {t('models.empty_global_none')}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 bg-zinc-50/40 px-4 py-8 text-center text-sm text-zinc-500">
                {t('models.empty_section_filtered')}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
