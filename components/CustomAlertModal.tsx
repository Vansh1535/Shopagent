'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, XCircle, Info, X, ShieldAlert } from 'lucide-react';

export type AlertType = 'warning' | 'info' | 'success' | 'error';

export interface AlertState {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: AlertType;
  onConfirm?: () => void;
}

interface CustomAlertModalProps {
  alert: AlertState | null;
  onClose: () => void;
}

export default function CustomAlertModal({ alert, onClose }: CustomAlertModalProps) {
  if (!alert || !alert.isOpen) return null;

  const type = alert.type || 'info';
  const title = alert.title || (type === 'warning' ? 'Action Required' : type === 'error' ? 'Error Encountered' : type === 'success' ? 'Success' : 'Notice');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-[#09090d] p-7 space-y-5 shadow-2xl shadow-black">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-500 hover:text-white transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon & Title Header */}
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
              type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : type === 'error'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#e5c178]/10 border-[#e5c178]/30 text-[#e5c178]'
            }`}
          >
            {type === 'warning' && <AlertTriangle className="h-6 w-6" />}
            {type === 'error' && <XCircle className="h-6 w-6" />}
            {type === 'success' && <CheckCircle2 className="h-6 w-6" />}
            {type === 'info' && <Info className="h-6 w-6" />}
          </div>

          <div>
            <span
              className={`inline-block text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                type === 'warning'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : type === 'error'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-[#e5c178]/10 text-[#e5c178] border-[#e5c178]/20'
              }`}
            >
              {type.toUpperCase()} NOTIFICATION
            </span>
            <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">{title}</h3>
          </div>
        </div>

        {/* Message Content */}
        <div className="rounded-2xl border border-zinc-800/80 bg-[#050507] p-4 text-xs text-zinc-300 leading-relaxed font-sans">
          {alert.message}
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            onClick={() => {
              if (alert.onConfirm) alert.onConfirm();
              onClose();
            }}
            className="btn-ivory w-full flex items-center justify-center rounded-full py-3 text-xs font-bold shadow-xl cursor-pointer"
          >
            <span>Got It</span>
          </button>
        </div>
      </div>
    </div>
  );
}
