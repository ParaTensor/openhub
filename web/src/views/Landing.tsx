import React from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight, Code2, Lock} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '../lib/utils';
import LocaleSwitcher from '../components/LocaleSwitcher';

const accent = 'text-purple-600';
const accentBg = 'bg-purple-600 hover:bg-purple-500';

export default function Landing() {
  const {t} = useTranslation();

  return (
    <div className="min-h-screen bg-white text-zinc-900 antialiased">
      <header className="sticky top-0 z-50 border-b border-zinc-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
              <div className="h-3.5 w-3.5 rotate-45 rounded-sm bg-white" />
            </div>
            <span>{t('navbar.pararouter')}</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-zinc-600 md:flex">
            <a href="#models" className="transition-colors hover:text-zinc-900">
              {t('landing.nav_models')}
            </a>
            <Link to="/login" className="transition-colors hover:text-zinc-900">
              {t('landing.nav_login')}
            </Link>
          </nav>

          <LocaleSwitcher className="gap-2 sm:gap-3" />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-6 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pt-20">
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12 lg:items-center">
          <div className="max-w-2xl lg:col-span-6 lg:max-w-none xl:col-span-7">
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{t('landing.explorer_title')}</h2>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base">{t('landing.explorer_subtitle')}</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm sm:p-12">
            <div className="mx-auto max-w-lg text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50/80 text-purple-700">
                <Lock className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-5 text-sm leading-relaxed text-zinc-600 sm:text-base">{t('landing.models_locked_desc')}</p>
              <Link
                to="/login?next=/models"
                className={cn(
                  'mt-8 inline-flex w-full items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white shadow-md transition-colors sm:w-auto',
                  accentBg,
                )}
              >
                {t('landing.models_locked_cta')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className={cn('rounded-2xl border px-6 py-12 text-center sm:px-12', 'border-purple-100 bg-gradient-to-br from-purple-50 to-white')}>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{t('landing.bottom_title')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-zinc-600">{t('landing.bottom_desc')}</p>
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
