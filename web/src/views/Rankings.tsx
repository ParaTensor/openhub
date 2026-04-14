import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, Zap, DollarSign, Award } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { apiGet } from '../lib/api';

interface ModelRanking {
  id: string;
  name: string;
  provider: string;
  score: number;
  latency: string;
  cost: string;
  trend: string;
}

interface RankingStats {
  topGainer: { name: string; score: number } | null;
  fastest: { name: string; latency: string } | null;
  bestValue: { name: string; cost: string } | null;
}

export default function RankingsView() {
  const { t } = useTranslation();
  const [rankings, setRankings] = useState<ModelRanking[]>([]);
  const [stats, setStats] = useState<RankingStats>({
    topGainer: null,
    fastest: null,
    bestValue: null
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('Overall');

  useEffect(() => {
    async function loadRankings() {
      setLoading(true);
      try {
        const url = selectedTab === 'Overall' 
          ? '/api/rankings' 
          : `/api/rankings?category=${selectedTab}`;
        const data = await apiGet<{ models: ModelRanking[], stats: RankingStats }>(url);
        setRankings(data.models);
        setStats(data.stats);
      } catch (error) {
        console.error('Failed to load rankings:', error);
      } finally {
        setLoading(false);
      }
    }
    loadRankings();
  }, [selectedTab]);

  if (loading && rankings.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-widest border border-amber-100">
            <Trophy size={12} />
            {t('rankings.leaderboard')}</div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">{t('rankings.model_rankings')}</h1>
          <p className="text-zinc-500 max-w-xl">
            {t('rankings.the_most_comprehensive_and_up_')}</p>
        </div>
        
        <div className="flex bg-white border border-zinc-100 rounded-xl p-1 shadow-sm">
          {['Overall', 'Coding', 'Reasoning', 'Creative'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${selectedTab === tab ? 'bg-zinc-900 text-white shadow-lg scale-105' : 'text-zinc-500 hover:text-black hover:bg-zinc-50'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{t('rankings.top_gainer')}</span>
          </div>
          <h3 className="text-sm font-bold text-zinc-500 mb-1">{stats.topGainer?.name || '---'}</h3>
          <p className="text-2xl font-black">{stats.topGainer ? `${stats.topGainer.score} pts` : '---'}</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Zap size={20} />
            </div>
            <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">{t('rankings.fastest')}</span>
          </div>
          <h3 className="text-sm font-bold text-zinc-500 mb-1">{stats.fastest?.name || '---'}</h3>
          <p className="text-2xl font-black">{stats.fastest?.latency || '---'}</p>
        </div>
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">{t('rankings.best_value')}</span>
          </div>
          <h3 className="text-sm font-bold text-zinc-500 mb-1">{stats.bestValue?.name || '---'}</h3>
          <p className="text-2xl font-black">{stats.bestValue?.cost || '---'}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('rankings.rank')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('rankings.model')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('rankings.provider')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">{t('rankings.score')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-center">{t('rankings.latency')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest text-right">{t('rankings.cost_1m')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
            {rankings.map((model, i) => (
              <tr key={model.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : 
                      i === 1 ? 'bg-zinc-100 text-zinc-600' : 
                      i === 2 ? 'bg-orange-50 text-orange-700' : 
                      'text-zinc-400'
                    }`}>
                      {i + 1}
                    </span>
                    {i === 0 && <Award size={16} className="text-amber-500" />}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="font-bold text-zinc-900 group-hover:text-black">{model.name}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm text-zinc-500">{model.provider}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-zinc-900 text-white text-xs font-bold">
                    {model.score}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-medium text-zinc-600">{model.latency}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className="text-sm font-bold text-zinc-900">{model.cost}</span>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
          {rankings.length === 0 && (
            <div className="px-6 py-12 text-center text-zinc-500">
              {t('rankings.empty_leaderboard')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
