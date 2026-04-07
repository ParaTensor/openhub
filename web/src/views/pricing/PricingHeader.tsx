import React from 'react';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';
import { Select } from '../../components/Select';
import { PriceRange, PricingPreview } from './types';
import { useTranslation } from "react-i18next";

interface PricingHeaderProps {
  search: string;
  setSearch: (v: string) => void;
  providerFilter: string;
  setProviderFilter: (v: string) => void;
  statusFilter: 'all' | 'published' | 'draft';
  setStatusFilter: React.Dispatch<React.SetStateAction<'all' | 'published' | 'draft'>>;
  priceRange: PriceRange;
  setPriceRange: (v: PriceRange) => void;
  providers: string[];
  openProviderDrawer: () => void;
  openCreateDrawer: (tab: 'quick' | 'batch') => void;
  preview: PricingPreview | null;
  busy: boolean;
  handlePreview: () => Promise<void>;
}

export default function PricingHeader({
  search, setSearch, providerFilter, setProviderFilter, statusFilter, setStatusFilter,
  priceRange, setPriceRange, providers, openProviderDrawer, openCreateDrawer,
  preview, busy, handlePreview
}: PricingHeaderProps) {
    const { t } = useTranslation();
  const hasProviders = providers.length > 0;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex-1 min-w-0">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('pricingheader.search_placeholder')}
              className="w-full pl-10 pr-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-[180px]"
            value={providerFilter}
            onChange={(val) => setProviderFilter(val)}
            options={[
              { value: 'all', label: t('pricingheader.provider_all') },
              ...providers.map(p => ({ value: p, label: p }))
            ]}
          />

          <Select
            className="w-[140px]"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as 'all' | 'published' | 'draft')}
            options={[
              { value: 'all', label: t('pricingheader.status_all') },
              { value: 'published', label: t('pricingheader.status_published') }
            ]}
          />

          <Select
            className="w-[160px]"
            value={priceRange}
            onChange={(val) => setPriceRange(val as PriceRange)}
            options={[
              { value: 'all', label: t('pricingheader.price_all') },
              { value: 'lt1', label: t('pricingheader.price_lt1') },
              { value: '1to10', label: t('pricingheader.price_1to10') },
              { value: 'gte10', label: t('pricingheader.price_gte10') }
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={openProviderDrawer}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            <Plus size={14} /> {t('pricingheader.provider')}</button>
          <button
            onClick={() => {
              if (!hasProviders) {
                openProviderDrawer();
                return;
              }
              openCreateDrawer('quick');
            }}
            className={`inline-flex items-center gap-1.5 bg-black text-white rounded-lg px-3.5 py-2 text-sm font-semibold ${!hasProviders ? 'opacity-70' : ''}`}
            title={!hasProviders ? t('pricingheader.tooltip_create_provider_first') : t('pricingheader.tooltip_add_new_price')}
          >
            <Plus size={14} /> {t('pricingheader.new_price')}</button>
          <button
            onClick={() => {
              if (!hasProviders) {
                openProviderDrawer();
                return;
              }
              openCreateDrawer('batch');
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-200 text-sm font-semibold hover:bg-zinc-50 ${!hasProviders ? 'opacity-70' : ''}`}
            title={!hasProviders ? t('pricingheader.tooltip_create_provider_first') : t('pricingheader.tooltip_batch_rules')}
          >
            <SlidersHorizontal size={14} /> {t('pricingheader.batch_rules')}</button>
        </div>
      </div>
    </div>
  );
}
