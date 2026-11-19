'use client';

import React from 'react';
import { CompatibilityResponse } from '@/lib/api';
import { CheckCircle2, XCircle, AlertTriangle, Zap, Gauge } from 'lucide-react';

interface CompatibilityBannerProps {
  data: CompatibilityResponse | null;
  loading?: boolean;
}

export default function CompatibilityBanner({ data, loading }: CompatibilityBannerProps) {
  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-slate-800" />
          <div className="space-y-1">
            <div className="h-4 w-48 bg-slate-800 rounded" />
            <div className="h-3 w-64 bg-slate-800/60 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        data.is_compatible
          ? 'bg-emerald-950/20 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
          : 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-500/5'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Main Status */}
        <div className="flex items-start space-x-3">
          {data.is_compatible ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-8 h-8 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className={`font-bold text-lg ${data.is_compatible ? 'text-emerald-400' : 'text-rose-400'}`}>
              {data.is_compatible ? 'Cấu hình hoàn toàn tương thích!' : 'Phát hiện xung đột linh kiện!'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {data.is_compatible
                ? 'Tất cả socket, chuẩn RAM và công suất nguồn đều phù hợp để hoạt động ổn định.'
                : 'Vui lòng kiểm tra lại các linh kiện bị xung đột socket hoặc thiếu công suất nguồn bên dưới.'}
            </p>
          </div>
        </div>

        {/* Wattage Stats */}
        <div className="flex items-center space-x-4 bg-slate-900/80 px-4 py-2.5 rounded-lg border border-slate-800">
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Công suất ước tính</div>
              <div className="text-base font-bold text-white font-mono">{data.estimated_wattage} W</div>
            </div>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="flex items-center space-x-2">
            <Gauge className="w-5 h-5 text-sky-400" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase font-mono">Nguồn khuyến nghị</div>
              <div className="text-base font-bold text-sky-400 font-mono">≥ {data.recommended_psu_wattage} W</div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages breakdown */}
      {data.messages && data.messages.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
          {data.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2 text-xs rounded-lg p-2.5 ${
                msg.type === 'error'
                  ? 'bg-rose-950/40 text-rose-300 border border-rose-900/50'
                  : msg.type === 'warning'
                  ? 'bg-amber-950/40 text-amber-300 border border-amber-900/50'
                  : 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/50'
              }`}
            >
              {msg.type === 'error' ? (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : msg.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div>
                <strong className="font-semibold uppercase tracking-wider text-[10px] mr-1">
                  [{msg.component}]:
                </strong>
                <span>{msg.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
