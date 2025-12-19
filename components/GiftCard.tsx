
import React from 'react';
import { Gift, Payer } from '../types';

interface Props {
  gift: Gift;
  variant?: 'grid' | 'list' | 'compact' | 'table';
  onEdit: (gift: Gift) => void;
  onDelete: (id: string) => void;
  onImageClick?: (url: string) => void;
  onToggleExcluded?: (id: string) => void;
}

const GiftCard: React.FC<Props> = ({ gift, variant = 'grid', onEdit, onDelete, onImageClick, onToggleExcluded }) => {
  
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(gift);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(gift.id);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExcluded?.(gift.id);
  };

  const ProductIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
  );

  const TrackingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
  );

  const OrderDetailIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
  );

  // LAYOUT TABELLA
  if (variant === 'table') {
    return (
      <div className={`group flex items-center px-4 py-3 border-b border-slate-100 transition-colors hover:bg-slate-50 relative ${gift.isReturned || gift.isExcluded ? 'opacity-60 grayscale' : ''}`}>
        <div className="w-12 flex-shrink-0 flex items-center justify-center">
           <div 
            onClick={() => gift.imageUrl && onImageClick?.(gift.imageUrl)}
            className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden cursor-zoom-in"
          >
            {gift.imageUrl ? <img src={gift.imageUrl} className="w-full h-full object-contain" alt="" /> : <span className="text-[8px] text-slate-300">NO</span>}
          </div>
        </div>

        <div className="flex-1 min-w-0 pl-3">
          <div className="flex items-center gap-2">
            <h3 className={`font-bold text-xs truncate ${gift.isReturned || gift.isExcluded ? 'line-through' : ''}`}>{gift.title}</h3>
            <div className="flex items-center gap-1">
              {gift.productUrl && <a href={gift.productUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-600"><ProductIcon /></a>}
              {gift.trackingUrl && <a href={gift.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-600" title="Tracking Spedizione"><TrackingIcon /></a>}
              {gift.orderDetailUrl && <a href={gift.orderDetailUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-slate-600" title="Dettaglio Ordine"><OrderDetailIcon /></a>}
            </div>
          </div>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{gift.source || 'Senza Negozio'}</p>
        </div>

        <div className="w-24 text-center">
          <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{gift.recipient}</span>
        </div>

        <div className="w-24 text-right">
          <span className="text-xs font-black">€{gift.cost.toFixed(2)}</span>
        </div>

        <div className="w-24 text-center">
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${gift.payer === Payer.PAOLO ? 'bg-indigo-50 text-indigo-500' : 'bg-pink-50 text-pink-500'}`}>
            {gift.payer}
          </span>
        </div>

        <div className="w-24 flex items-center justify-center gap-1">
          {gift.isReceived && !gift.isReturned && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Ricevuto"></div>}
          {gift.isReturned && <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="Reso"></div>}
          <input 
            type="checkbox" 
            checked={!gift.isExcluded} 
            onChange={handleToggleClick}
            className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer"
            title="Contabilizza"
          />
        </div>

        <div className="w-24 flex items-center justify-end gap-1">
          <button type="button" onClick={handleEditClick} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
          <button type="button" onClick={handleDeleteClick} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
        </div>
      </div>
    );
  }

  // LAYOUT COMPATTO (GRIGLIA PICCOLA)
  if (variant === 'compact') {
    return (
      <div className={`group bg-white rounded-2xl border p-2 transition-all relative ${gift.isReturned || gift.isExcluded ? 'opacity-70 grayscale border-slate-200' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
        <div 
          onClick={() => gift.imageUrl && onImageClick?.(gift.imageUrl)}
          className="aspect-square w-full rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center mb-2 relative cursor-zoom-in"
        >
          {gift.imageUrl ? <img src={gift.imageUrl} className="w-full h-full object-contain p-1" alt="" /> : <svg className="h-6 w-6 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        </div>
        <h3 className={`font-bold text-[10px] truncate leading-tight mb-1 ${gift.isReturned || gift.isExcluded ? 'line-through text-slate-400' : 'text-slate-800'}`}>{gift.title}</h3>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-900">€{gift.cost.toFixed(2)}</span>
          <div className="flex items-center gap-1">
            {gift.trackingUrl && <a href={gift.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-amber-500"><TrackingIcon /></a>}
            {gift.orderDetailUrl && <a href={gift.orderDetailUrl} target="_blank" rel="noopener noreferrer" className="text-slate-400"><OrderDetailIcon /></a>}
            <span className={`text-[7px] font-black px-1 rounded-sm uppercase ${gift.payer === Payer.PAOLO ? 'text-indigo-500' : 'text-pink-500'}`}>{gift.payer[0]}</span>
          </div>
        </div>
        
        <div className="absolute inset-0 bg-white/95 rounded-2xl flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <button type="button" onClick={handleEditClick} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
          {gift.productUrl && <a href={gift.productUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600"><ProductIcon /></a>}
          {gift.orderDetailUrl && <a href={gift.orderDetailUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600"><OrderDetailIcon /></a>}
          <button type="button" onClick={handleToggleClick} className={`w-8 h-8 flex items-center justify-center ${gift.isExcluded ? 'text-slate-800' : 'text-slate-300 hover:text-indigo-600'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg></button>
          <button type="button" onClick={handleDeleteClick} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
        </div>
      </div>
    );
  }

  // LAYOUT LISTA
  if (variant === 'list') {
    return (
      <div className={`group bg-white rounded-2xl border transition-all duration-300 flex items-center p-3 gap-4 relative ${gift.isReturned || gift.isExcluded ? 'opacity-70 grayscale border-slate-200' : 'border-slate-100 shadow-sm hover:shadow-md'}`}>
        <input 
          type="checkbox" 
          checked={!gift.isExcluded} 
          onChange={handleToggleClick}
          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0"
        />
        <div onClick={() => gift.imageUrl && onImageClick?.(gift.imageUrl)} className="w-14 h-14 rounded-xl bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-100 flex items-center justify-center cursor-zoom-in">
          {gift.imageUrl ? <img src={gift.imageUrl} className="w-full h-full object-contain p-0.5" alt="" /> : <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        </div>
        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-slate-800 text-sm truncate ${gift.isReturned || gift.isExcluded ? 'text-slate-400 line-through' : ''}`}>{gift.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{gift.source}</span>
              <div className="flex items-center gap-1.5">
                {gift.productUrl && <a href={gift.productUrl} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-indigo-500"><ProductIcon /></a>}
                {gift.trackingUrl && <a href={gift.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-500"><TrackingIcon /></a>}
                {gift.orderDetailUrl && <a href={gift.orderDetailUrl} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-slate-500"><OrderDetailIcon /></a>}
              </div>
              <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
              <span className="text-[8px] font-black text-indigo-500 uppercase tracking-tighter">PER {gift.recipient}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <span className="text-sm font-black block">€{gift.cost.toFixed(2)}</span>
              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${gift.payer === Payer.PAOLO ? 'bg-indigo-50 text-indigo-500' : 'bg-pink-50 text-pink-500'}`}>{gift.payer}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 pl-2 border-l border-slate-100">
          <button type="button" onClick={handleEditClick} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
          <button type="button" onClick={handleDeleteClick} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
        </div>
      </div>
    );
  }

  // DEFAULT GRID LAYOUT
  return (
    <div className={`group bg-white rounded-3xl border transition-all duration-300 overflow-hidden relative ${gift.isReturned || gift.isExcluded ? 'opacity-70 grayscale border-slate-200' : 'border-slate-100 shadow-sm hover:shadow-lg'}`}>
      <div className="relative">
        <div className="flex p-5 gap-5">
          <div onClick={() => gift.imageUrl && onImageClick?.(gift.imageUrl)} className="w-24 h-24 rounded-2xl bg-slate-50 flex-shrink-0 overflow-hidden border border-slate-100 flex items-center justify-center relative cursor-zoom-in">
            {gift.imageUrl ? <img src={gift.imageUrl} className="w-full h-full object-contain p-1" alt="" /> : <svg className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
               <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[8px] font-black uppercase">PER {gift.recipient}</span>
               {gift.isReceived && !gift.isReturned && <span className="text-[8px] font-black text-green-600 uppercase">● RICEVUTO</span>}
            </div>
            <h3 className={`font-black text-slate-800 text-base leading-tight truncate ${gift.isReturned || gift.isExcluded ? 'text-slate-400 line-through' : ''}`}>{gift.title}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-2">{gift.source}</p>
            <div className="flex items-end justify-between">
              <span className="text-xl font-black">€{gift.cost.toFixed(2)}</span>
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${gift.payer === Payer.PAOLO ? 'bg-indigo-50 text-indigo-500' : 'bg-pink-50 text-pink-500'}`}>{gift.payer} PAGATO</span>
            </div>
          </div>
        </div>
      </div>
      <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex gap-2">
          {gift.productUrl && (
            <a href={gift.productUrl} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-colors" title="Link Prodotto">
              <ProductIcon />
            </a>
          )}
          {gift.trackingUrl && (
            <a href={gift.trackingUrl} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-amber-500 text-white rounded-xl shadow-md hover:bg-amber-600 transition-colors" title="Tracking Spedizione">
              <TrackingIcon />
            </a>
          )}
          {gift.orderDetailUrl && (
            <a href={gift.orderDetailUrl} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-slate-600 text-white rounded-xl shadow-md hover:bg-slate-700 transition-colors" title="Dettaglio Ordine">
              <OrderDetailIcon />
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleEditClick} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 rounded-xl shadow-sm transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg></button>
          <button type="button" onClick={handleDeleteClick} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-xl shadow-sm transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg></button>
        </div>
      </div>
    </div>
  );
};

export default GiftCard;
