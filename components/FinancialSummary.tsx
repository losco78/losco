
import React from 'react';
import { FinancialSummary as IFinancialSummary } from '../types';

interface Props {
  summary: IFinancialSummary;
}

const FinancialSummary: React.FC<Props> = ({ summary }) => {
  const { totalSpent, totalPaoloPaid, totalMaryPaid, netSettlement, recipientStats } = summary;

  return (
    <div className="space-y-4">
      {/* Top Main Cards - Più compatte */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 group hover:border-indigo-100 transition-colors">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">Totale Speso</p>
          <p className="text-2xl font-black text-slate-800">€{totalSpent.toFixed(2)}</p>
          <div className="mt-1.5 h-1 w-6 bg-slate-200 rounded-full group-hover:w-12 transition-all duration-500"></div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 group hover:border-indigo-100 transition-colors">
          <p className="text-indigo-400 text-[9px] font-black uppercase tracking-widest mb-1">Pagato Paolo</p>
          <p className="text-2xl font-black text-indigo-600">€{totalPaoloPaid.toFixed(2)}</p>
          <div className="mt-1.5 h-1 w-6 bg-indigo-200 rounded-full group-hover:w-12 transition-all duration-500"></div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 group hover:border-pink-100 transition-colors">
          <p className="text-pink-400 text-[9px] font-black uppercase tracking-widest mb-1">Pagato Mary</p>
          <p className="text-2xl font-black text-pink-600">€{totalMaryPaid.toFixed(2)}</p>
          <div className="mt-1.5 h-1 w-6 bg-pink-200 rounded-full group-hover:w-12 transition-all duration-500"></div>
        </div>

        <div className={`p-4 rounded-2xl shadow-md border-2 transition-all hover:scale-[1.02] ${netSettlement >= 0 ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-pink-600 border-pink-400 text-white'}`}>
          <p className="text-white/70 text-[9px] font-black uppercase tracking-widest mb-1">Debiti</p>
          {netSettlement === 0 ? (
            <p className="text-xl font-black italic">Tutto Pari! ✨</p>
          ) : netSettlement > 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-xl font-black">M → P</p>
              <p className="text-xl font-black opacity-90">€{Math.abs(netSettlement).toFixed(2)}</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xl font-black">P → M</p>
              <p className="text-xl font-black opacity-90">€{Math.abs(netSettlement).toFixed(2)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recipient Breakdown - Più basso e compatto */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
          <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Destinatari</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {recipientStats.map((stat) => (
            <div key={stat.name} className="flex-1 min-w-[120px] bg-white px-3 py-2 rounded-xl border border-slate-100 flex items-center justify-between shadow-sm">
              <div className="min-w-0">
                <span className="text-[10px] font-black text-slate-700 uppercase block truncate leading-none mb-1">{stat.name}</span>
                <p className="text-sm font-black text-slate-900 leading-none">€{stat.value.toFixed(2)}</p>
              </div>
              <span className="bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-black ml-2">x{stat.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
