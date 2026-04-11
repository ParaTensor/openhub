import React, {useEffect, useState} from 'react';
import {AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer} from 'recharts';
import {Calendar, Download, Zap, TrendingUp, Clock, DollarSign, Loader2} from 'lucide-react';
import {apiGet} from '../lib/api';
import {localUser} from '../lib/session';
import { useTranslation } from "react-i18next";

interface ActivityStats {
  summary: {
    totalTokens: number;
    totalCost: number;
    avgLatency: number;
    changes: {
      tokens: string | null;
      cost: string | null;
      latency: string | null;
    };
  };
  trend: Array<{
    date: string;
    tokens: number;
    cost: number;
  }>;
}

export default function ActivityView() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = localUser.role === 'admin';

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [logsRow, statsData] = await Promise.all([
          apiGet<any[]>('/api/activity?limit=50'),
          apiGet<ActivityStats>('/api/activity/stats')
        ]);

        const logsData = logsRow.map((row) => {
          const dateObj = new Date(Number(row.timestamp));
          return {
            id: String(row.id),
            time: dateObj.toLocaleTimeString(),
            date: dateObj.toLocaleDateString(),
            model: row.model,
            tokens: row.tokens || 0,
            cost: row.cost || '$0.00',
            status: row.status === 200 ? t('activity.success') : t('activity.error'),
            latency: `${((row.latency || 0) / 1000).toFixed(1)}s`,
          };
        });

        setLogs(logsData);
        setStats(statsData);
      } catch (error) {
        console.error('Load activity failed:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [isAdmin, t]);

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  const summary = stats?.summary || {
    totalTokens: 0,
    totalCost: 0,
    avgLatency: 0,
    changes: { tokens: null, cost: null, latency: null }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('activity.activity')}</h1>
          <p className="text-gray-500 mt-1">{t('activity.monitor_your_usage_and_spendin')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-bold hover:border-black transition-all">
            <Calendar size={16} />
            {t('activity.last_7_days')}</button>
          <button className="flex items-center gap-2 border border-gray-200 bg-white px-4 py-2 rounded-lg text-sm font-bold hover:border-black transition-all">
            <Download size={16} />
            {t('activity.export')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Zap size={14} />
            <p className="text-[11px] font-bold uppercase tracking-widest">{t('activity.total_tokens')}</p>
          </div>
          <h3 className="text-3xl font-bold tracking-tight">
            {summary.totalTokens.toLocaleString()}
          </h3>
          {summary.changes.tokens && (
            <div className="flex items-center gap-1.5 mt-2">
              <TrendingUp size={12} className={summary.changes.tokens.startsWith('+') ? "text-emerald-500" : "text-red-500"} />
              <span className={`text-xs font-bold ${summary.changes.tokens.startsWith('+') ? "text-emerald-600" : "text-red-600"}`}>
                {summary.changes.tokens}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">{t('activity.vs_last_week')}</span>
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <DollarSign size={14} />
            <p className="text-[11px] font-bold uppercase tracking-widest">{t('activity.total_cost')}</p>
          </div>
          <h3 className="text-3xl font-bold tracking-tight">${summary.totalCost.toFixed(2)}</h3>
          {summary.changes.cost && (
            <div className="flex items-center gap-1.5 mt-2">
              <TrendingUp size={12} className={summary.changes.cost.startsWith('+') ? "text-emerald-500" : "text-red-500"} />
              <span className={`text-xs font-bold ${summary.changes.cost.startsWith('+') ? "text-emerald-600" : "text-red-600"}`}>
                {summary.changes.cost}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">{t('activity.vs_last_week')}</span>
            </div>
          )}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-400 mb-2">
            <Clock size={14} />
            <p className="text-[11px] font-bold uppercase tracking-widest">{t('activity.avg_latency')}</p>
          </div>
          <h3 className="text-3xl font-bold tracking-tight">{(summary.avgLatency / 1000).toFixed(2)}s</h3>
          {summary.changes.latency && (
            <div className="flex items-center gap-1.5 mt-2">
              <TrendingUp size={12} className={summary.changes.latency.startsWith('-') ? "text-emerald-500 rotate-180" : "text-red-500"} />
              <span className={`text-xs font-bold ${summary.changes.latency.startsWith('-') ? "text-emerald-600" : "text-red-600"}`}>
                {summary.changes.latency}
              </span>
              <span className="text-[10px] text-zinc-400 font-medium">{t('activity.vs_last_week')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400">{t('activity.token_usage_history')}</h3>
        </div>
        <div className="h-[300px] w-full">
          {stats?.trend && stats.trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.trend}>
                <defs>
                  <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#000" stopOpacity={0.05} />
                    <stop offset="95%" stopColor="#000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a1a1aa', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#a1a1aa', fontWeight: 600}} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #f4f4f5',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                />
                <Area type="monotone" dataKey="tokens" stroke="#000" fillOpacity={1} fill="url(#colorTokens)" strokeWidth={2} animationDuration={1500} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic">
              No trend data available for the last 7 days.
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-sm uppercase tracking-widest text-zinc-400">{t('activity.recent_requests')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-50">
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('activity.time')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('activity.model')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('activity.tokens')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('activity.latency')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('activity.cost')}</th>
                <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t('activity.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-900">{log.time}</span>
                      <span className="text-[10px] text-zinc-400 font-medium">{log.date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-[11px] font-bold bg-zinc-100 text-zinc-600 px-2 py-1 rounded border border-zinc-200">
                      {log.model}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-zinc-700">{log.tokens.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500">
                      <Clock size={12} className="text-zinc-300" />
                      {log.latency}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-zinc-900">{log.cost}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      log.status === t('activity.success') 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="px-6 py-12 text-center text-zinc-500 italic">
              No recent requests found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
