
import React, { useState, useEffect } from 'react';
import { Gift, Recipient, Payer, Occasion } from '../types';

interface GiftFormProps {
  onSave: (gift: Omit<Gift, 'id' | 'createdAt'> & { id?: string }) => void;
  onClose: () => void;
  initialGift?: Gift | null;
  onFetchMetadata: (url: string) => Promise<{ images: string[], title: string, source: string, sku?: string } | null>;
}

const GiftForm: React.FC<GiftFormProps> = ({ onSave, onClose, initialGift, onFetchMetadata }) => {
  const currentYear = new Date().getFullYear();
  const [formData, setFormData] = useState({
    title: '',
    source: '',
    cost: 0,
    recipient: Recipient.JACOPO,
    isReceived: false,
    payer: Payer.PAOLO,
    isSplit: false,
    isReturned: false,
    isRepaid: false,
    isExcluded: false,
    occasion: Occasion.NATALE,
    year: currentYear,
    imageUrl: '',
    productUrl: '',
    trackingUrl: '',
    orderDetailUrl: ''
  });

  const [isFetching, setIsFetching] = useState(false);
  const [fetchedImages, setFetchedImages] = useState<string[]>([]);

  useEffect(() => {
    if (initialGift) {
      setFormData({
        title: initialGift.title,
        source: initialGift.source || '',
        cost: initialGift.cost,
        recipient: initialGift.recipient,
        isReceived: initialGift.isReceived,
        payer: initialGift.payer,
        isSplit: initialGift.isSplit,
        isReturned: initialGift.isReturned || false,
        isRepaid: initialGift.isRepaid || false,
        isExcluded: initialGift.isExcluded || false,
        occasion: initialGift.occasion,
        year: initialGift.year || currentYear,
        imageUrl: initialGift.imageUrl || '',
        productUrl: initialGift.productUrl || '',
        trackingUrl: initialGift.trackingUrl || '',
        orderDetailUrl: initialGift.orderDetailUrl || ''
      });
      if (initialGift.imageUrl) setFetchedImages([initialGift.imageUrl]);
    }
  }, [initialGift]);

  const extractDomain = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '');
    } catch (e) { return ''; }
  };

  const handleFetchMetadata = async () => {
    if (!formData.productUrl) return;
    setIsFetching(true);
    setFetchedImages([]);
    const meta = await onFetchMetadata(formData.productUrl);
    const domain = extractDomain(formData.productUrl);

    if (meta) {
      if (meta.images && meta.images.length > 0) {
        setFetchedImages(meta.images.filter(img => img.startsWith('http')));
      }
      setFormData(prev => ({
        ...prev,
        title: prev.title || meta.title,
        source: prev.source || domain || meta.source || ''
      }));
    } else if (domain) {
      setFormData(prev => ({ ...prev, source: prev.source || domain }));
    }
    setIsFetching(false);
  };

  const adjustPrice = (amount: number) => {
    setFormData(prev => ({ ...prev, cost: Math.max(0, prev.cost + amount) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(initialGift ? { ...formData, id: initialGift.id } : formData);
  };

  const handleDuplicate = () => {
    onSave(formData);
  };

  const yearsList = [];
  for(let y = currentYear + 1; y >= currentYear - 5; y--) yearsList.push(y);

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900 leading-none mb-1">
              {initialGift ? 'Modifica Regalo' : 'Nuovo Regalo'}
            </h2>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Dettagli e Contabilizzazione</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-100/50 p-5 rounded-3xl border border-slate-200/50">
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Link Prodotto</label>
                <div className="flex gap-2">
                  <input type="url" value={formData.productUrl} onChange={e => setFormData({ ...formData, productUrl: e.target.value })} className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="https://..." />
                  <button type="button" onClick={handleFetchMetadata} disabled={isFetching} className="bg-indigo-600 text-white px-3 py-2 rounded-xl font-black text-[10px] disabled:opacity-50 hover:bg-indigo-700 shadow-md">{isFetching ? "..." : "SCAN"}</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Tracking Link</label>
                  <input type="url" value={formData.trackingUrl} onChange={e => setFormData({ ...formData, trackingUrl: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="Spedizione..." />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Dettaglio Ordine</label>
                  <input type="url" value={formData.orderDetailUrl} onChange={e => setFormData({ ...formData, orderDetailUrl: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="Dettaglio..." />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">URL Immagine Manuale</label>
                <input type="url" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-100 outline-none" placeholder="Link diretto .jpg / .png" />
              </div>
              {fetchedImages.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1 custom-scrollbar">
                  {fetchedImages.slice(0, 8).map((img, idx) => (
                    <button key={idx} type="button" onClick={() => setFormData({ ...formData, imageUrl: img })} className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 bg-white overflow-hidden transition-all ${formData.imageUrl === img ? 'border-indigo-600' : 'border-slate-200'}`}>
                      <img src={img} className="w-full h-full object-contain p-0.5" alt="thumb" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Titolo Regalo</label>
              <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white text-sm font-bold outline-none" />
            </div>
            
            {/* INSERIMENTO PREZZO SEMPLIFICATO */}
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Prezzo (€)</label>
              <div className="flex items-center gap-1.5 mb-2">
                <button type="button" onClick={() => adjustPrice(-1)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-black text-sm">-</button>
                <input required type="number" step="0.01" value={formData.cost} onChange={e => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} className="flex-1 px-2 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white text-sm font-black outline-none text-center" />
                <button type="button" onClick={() => adjustPrice(1)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-black text-sm">+</button>
              </div>
              <div className="flex gap-1">
                {[10, 20, 50, 100].map(val => (
                  <button key={val} type="button" onClick={() => setFormData(prev => ({ ...prev, cost: val }))} className="flex-1 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-[9px] font-black hover:bg-indigo-100 transition-colors border border-indigo-100">€{val}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Negozio</label>
              <input type="text" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white text-xs font-bold outline-none" placeholder="es: amazon.it" />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Destinatario</label>
              <select value={formData.recipient} onChange={e => setFormData({ ...formData, recipient: e.target.value as Recipient })} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white text-xs font-bold">
                {Object.values(Recipient).map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Occasione</label>
                <select value={formData.occasion} onChange={e => setFormData({ ...formData, occasion: e.target.value as Occasion })} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white text-[10px] font-bold">
                  {Object.values(Occasion).map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Anno</label>
                <select value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 focus:bg-white text-[10px] font-bold">
                  {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
              {(['isReceived', 'isReturned', 'isSplit', 'isRepaid', 'isExcluded'] as const).map(key => {
                const labels: Record<string, string> = {
                  isReceived: 'RICEVUTO',
                  isReturned: 'RESO',
                  isSplit: 'DIVIDI 50/50',
                  isRepaid: 'RIMBORSATO',
                  isExcluded: 'ESCLUDI CONTI'
                };
                const colors: Record<string, string> = {
                  isReceived: 'indigo',
                  isReturned: 'red',
                  isSplit: 'indigo',
                  isRepaid: 'green',
                  isExcluded: 'slate'
                };
                return (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${formData[key] ? `bg-${colors[key]}-600 border-${colors[key]}-600 text-white` : 'bg-white border-slate-300'}`}>
                      {formData[key] && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.checked })} />
                    <span className="text-[9px] font-black uppercase text-slate-500 group-hover:text-slate-900">{labels[key]}</span>
                  </label>
                );
              })}
            </div>

            <div className="pt-2 border-t border-indigo-100/50">
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-widest">Pagato da</label>
              <select value={formData.payer} onChange={e => setFormData({ ...formData, payer: e.target.value as Payer })} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold shadow-sm outline-none">
                {Object.values(Payer).map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3.5 bg-slate-100 text-slate-500 font-black rounded-2xl hover:bg-slate-200 text-[10px] tracking-widest uppercase transition-all">ANNULLA</button>
            {initialGift && (
              <button type="button" onClick={handleDuplicate} className="flex-1 px-4 py-3.5 bg-amber-500 text-white font-black rounded-2xl hover:bg-amber-600 shadow-lg shadow-amber-100 text-[10px] tracking-widest uppercase transition-all flex items-center justify-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7v8a2 2 0 002 2h6M8 7a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" /></svg>DUPLICA
              </button>
            )}
            <button type="submit" className="flex-[2] px-4 py-3.5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 text-[10px] tracking-widest uppercase transition-all">
              {initialGift ? 'SALVA MODIFICHE' : 'AGGIUNGI REGALO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GiftForm;
