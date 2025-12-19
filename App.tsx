
import React, { useState, useEffect, useMemo } from 'react';
import { Gift, Recipient, Payer, FinancialSummary as IFinancialSummary, Occasion } from './types';
import GiftForm from './components/GiftForm';
import FinancialSummary from './components/FinancialSummary';
import GiftCard from './components/GiftCard';
import { GoogleGenAI, Type } from "@google/genai";

const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbw4MQtmHuzN4X8Wc2yvSQsW4WfpIoYcqZF5GyznsyXsj6Jmv5Uy00ZRcivJ3U1SiYB0YQ/exec';

const APPS_SCRIPT_CODE = `function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  const headers = data[0];
  const jsonData = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    headers.forEach((header, index) => {
      if (!header) return;
      let val = row[index];
      if (['cost', 'createdAt', 'year'].includes(header)) {
        val = val !== "" ? Number(val) : 0;
      }
      if (['isReceived', 'isSplit', 'isReturned', 'isRepaid', 'isExcluded', 'isDeleted'].includes(header)) {
        val = (val === true || val === 'TRUE' || val === 1);
      }
      obj[header] = val;
    });
    if (obj.id) jsonData.push(obj);
  }
  return ContentService.createTextOutput(JSON.stringify(jsonData)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid JSON' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const action = body.action;
  const gift = body.data;
  // headers: 19 colonne (da A a S)
  const headers = ['id', 'title', 'source', 'cost', 'recipient', 'isReceived', 'payer', 'isSplit', 'isReturned', 'occasion', 'year', 'createdAt', 'imageUrl', 'productUrl', 'trackingUrl', 'isRepaid', 'isExcluded', 'isDeleted', 'orderDetailUrl'];
  
  let data = sheet.getDataRange().getValues();
  
  // Aggiorna intestazioni se non coincidono o mancano colonne
  if (data[0].length < headers.length || data[0][0] !== 'id') {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    data = sheet.getDataRange().getValues();
  }

  if (action === 'save' || action === 'delete') {
    let rowIndex = -1;
    const searchId = gift.id.toString().trim();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === searchId) { 
        rowIndex = i + 1; 
        break; 
      }
    }
    
    if (action === 'delete') {
      gift.isDeleted = true;
    }

    const rowValues = headers.map(h => {
      const val = gift[h];
      return val !== undefined ? val : "";
    });

    if (rowIndex > -1) {
      sheet.getRange(rowIndex, 1, 1, headers.length).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'error' })).setMimeType(ContentService.MimeType.JSON);
}`;

type ViewMode = 'grid' | 'list' | 'compact' | 'table';
type SortCriteria = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc' | 'title-asc' | 'recipient-asc';

const App: React.FC = () => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [filterRecipient, setFilterRecipient] = useState<Recipient | 'TUTTI'>('TUTTI');
  const [filterOccasion, setFilterOccasion] = useState<Occasion | 'TUTTI'>('TUTTI');
  const [filterYear, setFilterYear] = useState<number | 'TUTTI'>('TUTTI');
  const [viewMode, setViewMode] = useState<ViewMode>(localStorage.getItem('view_mode') as ViewMode || 'grid');
  const [sortCriteria, setSortCriteria] = useState<SortCriteria>(localStorage.getItem('sort_criteria') as SortCriteria || 'date-desc');
  
  const [sheetUrl, setSheetUrl] = useState<string>(localStorage.getItem('sheet_api_url') || DEFAULT_SHEET_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const fetchData = async (url: string) => {
    if (!url) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${url}?t=${Date.now()}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setGifts(data.map(g => ({ 
          ...g, 
          id: g.id.toString().trim(),
          isDeleted: g.isDeleted === true || g.isDeleted === 'TRUE' || g.isDeleted === 1
        })));
        setLastSync(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error("Fetch error", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (sheetUrl) fetchData(sheetUrl); }, []);
  
  useEffect(() => { localStorage.setItem('view_mode', viewMode); }, [viewMode]);
  useEffect(() => { localStorage.setItem('sort_criteria', sortCriteria); }, [sortCriteria]);

  const fetchMetadata = async (url: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analizza URL: ${url}. Estrai immagini e titolo. JSON con images, title, source.`,
        config: {
          tools: [{googleSearch: {}}],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              images: { type: Type.ARRAY, items: { type: Type.STRING } },
              title: { type: Type.STRING },
              source: { type: Type.STRING }
            },
            required: ["images", "title"]
          }
        }
      });
      return JSON.parse(response.text || '{}');
    } catch (e) { return null; }
  };

  const saveToSheet = async (gift: Gift, action: 'save' | 'delete') => {
    if (!sheetUrl) return true;
    try {
      await fetch(sheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action, data: gift })
      });
      return true;
    } catch (e) {
      console.error("Cloud Sync Error:", e);
      return false;
    }
  };

  const handleSaveGift = async (data: Omit<Gift, 'id' | 'createdAt'> & { id?: string }) => {
    setIsLoading(true);
    const giftToSave: Gift = data.id 
      ? { ...gifts.find(g => g.id === data.id)!, ...data }
      : {
          ...data,
          id: Math.random().toString(36).substring(2, 11),
          createdAt: Date.now(),
          isExcluded: data.isExcluded ?? false,
          isDeleted: false
        };

    const oldGifts = [...gifts];
    setGifts(prev => data.id ? prev.map(g => g.id === data.id ? giftToSave : g) : [giftToSave, ...prev]);
    
    const success = await saveToSheet(giftToSave, 'save');
    if (!success) {
      alert("Errore durante il salvataggio cloud.");
      setGifts(oldGifts);
    }
    
    setIsLoading(false);
    setIsFormOpen(false);
    setEditingGift(null);
  };

  const toggleExcluded = async (id: string) => {
    const gift = gifts.find(g => g.id === id);
    if (!gift) return;
    const updated = { ...gift, isExcluded: !gift.isExcluded };
    setGifts(prev => prev.map(g => g.id === id ? updated : g));
    await saveToSheet(updated, 'save');
  };

  const handleDeleteGift = async (id: string) => {
    const giftToDelete = gifts.find(g => g.id.toString().trim() === id.toString().trim());
    if (!giftToDelete) {
        console.error("Regalo non trovato per ID:", id);
        return;
    }
    
    if (!window.confirm(`Vuoi nascondere "${giftToDelete.title}"? (Verrà segnato come eliminato nel foglio)`)) return;
    
    setIsLoading(true);
    const oldGifts = [...gifts];
    
    // UI Update immediato (eliminazione logica locale)
    setGifts(prev => prev.filter(g => g.id.toString().trim() !== id.toString().trim()));
    
    try {
      // Invia il flag isDeleted = true al cloud
      const success = await saveToSheet({ ...giftToDelete, isDeleted: true }, 'delete');
      if (!success) throw new Error("Cloud update failed");
    } catch (e) {
      console.error("Delete failed:", e);
      setGifts(oldGifts);
      alert("L'eliminazione cloud è fallita. Controlla la console.");
    } finally {
      setIsLoading(false);
    }
  };

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    years.add(new Date().getFullYear());
    gifts.forEach(g => { if (g.year && !g.isDeleted) years.add(g.year); });
    return Array.from(years).sort((a, b) => b - a);
  }, [gifts]);

  const filteredGifts = useMemo(() => {
    let result = gifts.filter(gift => {
      // FILTRO PRINCIPALE: Non mostrare mai i cancellati
      if (gift.isDeleted) return false;

      const matchRecipient = filterRecipient === 'TUTTI' || gift.recipient === filterRecipient;
      const matchOccasion = filterOccasion === 'TUTTI' || gift.occasion === filterOccasion;
      const matchYear = filterYear === 'TUTTI' || gift.year === filterYear;
      return matchRecipient && matchOccasion && matchYear;
    });

    result.sort((a, b) => {
      switch (sortCriteria) {
        case 'date-desc': return (b.createdAt || 0) - (a.createdAt || 0);
        case 'date-asc': return (a.createdAt || 0) - (b.createdAt || 0);
        case 'price-desc': return b.cost - a.cost;
        case 'price-asc': return a.cost - b.cost;
        case 'title-asc': return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
        case 'recipient-asc': return a.recipient.toLowerCase().localeCompare(b.recipient.toLowerCase());
        default: return (b.createdAt || 0) - (a.createdAt || 0);
      }
    });

    return result;
  }, [gifts, filterRecipient, filterOccasion, filterYear, sortCriteria]);

  const financialSummary = useMemo((): IFinancialSummary => {
    let totalSpent = 0, totalPaoloPaid = 0, totalMaryPaid = 0, maryOwesPaolo = 0, paoloOwesMary = 0;
    const recipientMap = new Map<Recipient, { count: number, value: number }>();

    filteredGifts.forEach(g => {
      if (g.isReturned || g.isExcluded) return;
      totalSpent += g.cost;
      if (g.payer === Payer.PAOLO) {
        if (g.isRepaid) {
          const repaidAmount = g.isSplit ? g.cost / 2 : g.cost;
          totalPaoloPaid += (g.cost - repaidAmount);
          totalMaryPaid += repaidAmount;
        } else {
          totalPaoloPaid += g.cost;
          if (g.isSplit) maryOwesPaolo += g.cost / 2;
        }
      } else {
        if (g.isRepaid) {
          const repaidAmount = g.isSplit ? g.cost / 2 : g.cost;
          totalMaryPaid += (g.cost - repaidAmount);
          totalPaoloPaid += repaidAmount;
        } else {
          totalMaryPaid += g.cost;
          if (g.isSplit) paoloOwesMary += g.cost / 2;
        }
      }
      const current = recipientMap.get(g.recipient) || { count: 0, value: 0 };
      recipientMap.set(g.recipient, { count: current.count + 1, value: current.value + g.cost });
    });

    const recipientStats = Object.values(Recipient).map(r => ({
      name: r,
      count: recipientMap.get(r)?.count || 0,
      value: recipientMap.get(r)?.value || 0
    }));

    return { totalSpent, totalPaoloPaid, totalMaryPaid, maryOwesPaolo, paoloOwesMary, netSettlement: maryOwesPaolo - paoloOwesMary, recipientStats };
  }, [filteredGifts]);

  const gridClass = useMemo(() => {
    switch (viewMode) {
      case 'grid': return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
      case 'compact': return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3";
      case 'list': return "flex flex-col gap-4";
      case 'table': return "flex flex-col border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm";
      default: return "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6";
    }
  }, [viewMode]);

  return (
    <div className="h-screen flex flex-col bg-slate-50 overflow-hidden font-sans text-slate-900">
      <div className="bg-white/80 border-b border-slate-100 backdrop-blur-md z-40 flex-shrink-0 shadow-sm">
        <header className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none">GiftManager</h1>
              {lastSync && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sinc: {lastSync}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchData(sheetUrl)} disabled={isLoading} className={`p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 ${isLoading ? 'animate-spin text-indigo-600' : ''}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
            <button type="button" onClick={() => setIsConfigOpen(true)} className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg></button>
            <button type="button" onClick={() => { setEditingGift(null); setIsFormOpen(true); }} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2 text-sm transition-all"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 011-1z" clipRule="evenodd" /></svg><span>Nuovo</span></button>
          </div>
        </header>
        
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <FinancialSummary summary={financialSummary} />
          
          <div className="flex flex-col md:flex-row md:items-end gap-4 mt-4">
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block tracking-widest">Anno</label>
                <select value={filterYear} onChange={e => setFilterYear(e.target.value === 'TUTTI' ? 'TUTTI' : Number(e.target.value))} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-100 shadow-sm outline-none"><option value="TUTTI">TUTTI GLI ANNI</option>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block tracking-widest">Occasione</label>
                <select value={filterOccasion} onChange={e => setFilterOccasion(e.target.value as Occasion | 'TUTTI')} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-100 shadow-sm outline-none"><option value="TUTTI">TUTTE LE OCCASIONI</option>{Object.values(Occasion).map(o => <option key={o} value={o}>{o.toUpperCase()}</option>)}</select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block tracking-widest">Destinatario</label>
                <select value={filterRecipient} onChange={e => setFilterRecipient(e.target.value as Recipient | 'TUTTI')} className="w-full px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-100 shadow-sm outline-none"><option value="TUTTI">TUTTI I DESTINATARI</option>{Object.values(Recipient).map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}</select>
              </div>
            </div>
            
            <div className="flex items-end gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block tracking-widest">Ordina Per</label>
                <select value={sortCriteria} onChange={e => setSortCriteria(e.target.value as SortCriteria)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-100 shadow-sm outline-none min-w-[140px]">
                  <option value="date-desc">PIÙ RECENTI ↓</option>
                  <option value="date-asc">MENO RECENTI ↑</option>
                  <option value="price-desc">PREZZO: CARI ↓</option>
                  <option value="price-asc">PREZZO: ECONOMICI ↑</option>
                  <option value="title-asc">TITOLO (A-Z)</option>
                  <option value="recipient-asc">DESTINATARIO (A-Z)</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-1.5 block tracking-widest">Visualizza</label>
                <div className="bg-white border border-slate-100 p-1 rounded-xl shadow-sm flex items-center gap-1 self-start">
                  <button type="button" onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`} title="Griglia"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></button>
                  <button type="button" onClick={() => setViewMode('compact')} className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`} title="Compatto"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zM5 9a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg></button>
                  <button type="button" onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`} title="Lista"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg></button>
                  <button type="button" onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`} title="Tabella"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2-1h10a1 1 0 011 1v3H4V5a1 1 0 011-1zm11 5H4v5a1 1 0 001 1h10a1 1 0 001-1V9z" clipRule="evenodd" /></svg></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4 py-8 relative">
          {isLoading && (
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col items-center gap-4 bg-white/95 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 animate-pulse">Sincronizzazione Cloud...</p>
            </div>
          )}
          
          <div className={gridClass}>
            {viewMode === 'table' && filteredGifts.length > 0 && (
              <div className="hidden md:flex items-center px-4 py-3 bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                <div className="w-12 flex-shrink-0"></div>
                <div className="flex-1 font-black text-[9px] uppercase tracking-widest text-slate-400">Regalo / Negozio</div>
                <div className="w-24 font-black text-[9px] uppercase tracking-widest text-slate-400 text-center">Destinatario</div>
                <div className="w-24 font-black text-[9px] uppercase tracking-widest text-slate-400 text-right">Costo</div>
                <div className="w-24 font-black text-[9px] uppercase tracking-widest text-slate-400 text-center">Pagatore</div>
                <div className="w-24 font-black text-[9px] uppercase tracking-widest text-slate-400 text-center">Status</div>
                <div className="w-24 font-black text-[9px] uppercase tracking-widest text-slate-400 text-right">Azioni</div>
              </div>
            )}

            {filteredGifts.length > 0 ? filteredGifts.map(gift => (
              <GiftCard key={gift.id} gift={gift} variant={viewMode} onEdit={(g) => { setEditingGift(g); setIsFormOpen(true); }} onDelete={handleDeleteGift} onImageClick={(url) => setViewingImage(url)} onToggleExcluded={toggleExcluded} />
            )) : (
              <div className="col-span-full py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Nessun regalo trovato.</p>
              </div>
            )}
          </div>
          <div className="h-20"></div>
        </div>
      </main>

      {viewingImage && <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200" onClick={() => setViewingImage(null)}><img src={viewingImage} className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" alt="Preview" /></div>}
      
      {isConfigOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-2xl font-black text-slate-900">Configurazione Cloud</h2>
              <button type="button" onClick={() => setIsConfigOpen(false)} className="text-slate-400 hover:text-slate-900"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600">🚀 Risoluzione Problemi Eliminazione</h3>
                <p className="text-xs text-indigo-900">Se il click sul cestino non fa nulla, segui questi 3 step:</p>
                <ol className="text-xs font-medium text-indigo-900 space-y-2 list-decimal pl-4">
                  <li><b>Copia</b> il codice nero in fondo a questa finestra.</li>
                  <li>Vai su Google Sheets &rarr; Estensioni &rarr; Apps Script e <b>sostituisci tutto</b>.</li>
                  <li><b>Distribuisci &rarr; Nuova Distribuzione</b> (IMPORTANTE: seleziona "App Web", esegui come "Io" e chi ha accesso "Chiunque").</li>
                  <li>Incolla il NUOVO URL qui sotto e clicca "Salva".</li>
                </ol>
                <p className="text-[10px] text-indigo-500 italic mt-2">La colonna 'isDeleted' verrà aggiunta automaticamente dal codice come Colonna R (18ª). La colonna 'orderDetailUrl' come Colonna S (19ª).</p>
              </div>

               <form onSubmit={(e) => { e.preventDefault(); localStorage.setItem('sheet_api_url', sheetUrl); setIsConfigOpen(false); if(sheetUrl) fetchData(sheetUrl); }} className="space-y-4">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">URL Web App Google Script</label>
                <input required type="url" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-sm font-medium shadow-inner outline-none focus:ring-2 focus:ring-indigo-100" placeholder="https://script.google.com/..." />
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 text-xs tracking-widest uppercase shadow-lg transition-all">SALVA E SINCRONIZZA</button>
              </form>
              
              <div className="bg-slate-900 p-6 rounded-2xl relative group">
                 <div className="flex justify-between items-center mb-3">
                   <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Codice Script (Copia Tutto):</p>
                   <button type="button" onClick={() => { navigator.clipboard.writeText(APPS_SCRIPT_CODE); alert("Codice copiato!"); }} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-500 transition-colors">Copia Codice</button>
                 </div>
                 <pre className="text-[9px] font-mono text-indigo-200 overflow-x-auto h-48 custom-scrollbar opacity-80 select-all">{APPS_SCRIPT_CODE}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {isFormOpen && <GiftForm onClose={() => { setIsFormOpen(false); setEditingGift(null); }} onSave={handleSaveGift} initialGift={editingGift} onFetchMetadata={fetchMetadata} />}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }`}</style>
    </div>
  );
};

export default App;
