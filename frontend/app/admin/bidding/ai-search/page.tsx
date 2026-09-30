'use client';

import { useState } from 'react';
import { Search, Bot, ExternalLink, ArrowLeft, Loader2, Sparkles, AlertCircle, RefreshCw, Filter, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // <-- ADDED ROUTER

interface RecommendedBid {
  title: string;
  budget: string;
  link: string;
  reason: string;
}

const PHILGEPS_CATEGORIES = [
  { id: '4', name: 'Furniture' },
  { id: '46', name: 'Safety and Personal Protection Equipment (PPE)' },
  { id: '22', name: 'Printing Supplies' },
  { id: '21', name: 'Printing Services' },
  { id: '43', name: 'Information Technology (Computers/Tech)' },
  { id: '15', name: 'Electronic Parts and Components' },
  { id: '5', name: 'General Merchandise' },
  { id: '9', name: 'Construction Materials and Supplies' },
  { id: '18', name: 'Medical Supplies and Laboratory Instrument' },
];

export default function AISearchPage() {
  const router = useRouter(); // <-- INITIALIZE ROUTER
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [results, setResults] = useState<RecommendedBid[]>([]);
  const [error, setError] = useState('');

  const [importingId, setImportingId] = useState<string | null>(null);
  
  const [selectedCategory, setSelectedCategory] = useState('4');

  const handleStartScan = async () => {
    setIsScanning(true);
    setHasScanned(false);
    setError('');
    setResults([]);

    try {
      const res = await fetch(`/api/bidding/ai-search?category=${selectedCategory}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan PhilGEPS');
      }
      
      setResults(data.recommended_bids || []);
      setHasScanned(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsScanning(false);
    }
  };

  // --- NEW: FUNCTION TO SEND DATA TO MAIN PAGE ---
  const handleImportToSystem = async (bid: RecommendedBid) => {
    const refMatch = bid.link.match(/refid=(\d+)/i);
    const refNo = refMatch ? refMatch[1] : '';
    
    if (!refNo) return;
    setImportingId(refNo); 

    try {
      const detailRes = await fetch(`/api/bidding/ai-search/details?url=${encodeURIComponent(bid.link)}`);
      const details = detailRes.ok ? await detailRes.json() : {};

      // MAP CLASSIFICATION
      let classValue = '';
      if (details.classification?.toLowerCase().includes('goods')) classValue = 'Goods';
      if (details.classification?.toLowerCase().includes('services')) classValue = 'Services';

      // MAP PROCUREMENT MODE
      let procModeValue = '';
      const rawMode = (details.procurement_mode || '').toLowerCase();
      if (rawMode.includes('small value') || rawMode.includes('shopping') || rawMode.includes('negotiated')) procModeValue = 'Small Procurement';
      else if (rawMode.includes('public bidding')) procModeValue = 'Public Bidding';
      else if (rawMode.includes('corporate')) procModeValue = 'Corporate Bidding';

      // NEW: MAP TRADE AGREEMENT
      let tradeValue = '';
      const rawTrade = (details.trade_agreement || '').toLowerCase();
      if (rawTrade.includes('implementing')) tradeValue = 'Implementing Rules and Regulations';
      else if (rawTrade.includes('foreign')) tradeValue = 'Foreign Donations';

      const prefillData = {
        title: bid.title,
        reference_no: refNo,
        category: PHILGEPS_CATEGORIES.find(c => c.id === selectedCategory)?.name || '',
        itb_status: 'New',
        
        solicitation_no: details.solicitation_no || '',
        approved_budget: details.approved_budget || 0,
        date_published: details.date_published || '',
        closing_date_time: details.closing_date_time || '',
        pre_bid_datetime: details.pre_bid_datetime || '',
        contact_person: details.contact_person || '',
        
        // NEW: Fill the requested fields
        delivery_period: details.delivery_period || '',
        full_address: details.area_of_delivery || '',
        trade_agreement: tradeValue,
        classification: classValue,
        procurement_mode: procModeValue,
        
        note_desc: `--- IMPORTED FROM PHILGEPS ---\nLink: ${bid.link}\n\nPhilGEPS Entity: ${details.procuring_entity_text || 'N/A'}\nArea of Delivery: ${details.area_of_delivery || 'N/A'}\nRaw Proc. Mode: ${details.procurement_mode || 'N/A'}\n\nMatcher Reason: ${bid.reason}`
      };

      sessionStorage.setItem('philgeps_import', JSON.stringify(prefillData));
      router.push('/admin/bidding');
    } catch (err) {
      console.error(err);
      setImportingId(null);
    }
  };

  const currentCategoryName = PHILGEPS_CATEGORIES.find(c => c.id === selectedCategory)?.name || 'Category';

  return (
    <div className="p-6 w-full flex flex-col h-full font-sans">
      
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/admin/bidding" 
          className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            PhilGEPS AI Scanner <Sparkles className="h-5 w-5 text-amber-500" />
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Opportunity Matcher
          </p>
        </div>
      </div>

      {!isScanning && !hasScanned && results.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white p-12 text-center shadow-sm">
          <div className="h-20 w-20 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mb-5">
            <Bot className="h-10 w-10 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Scan PhilGEPS Opportunities</h2>
          <p className="text-slate-500 max-w-lg mb-6 text-sm leading-relaxed">
            Select an industry category below to fetch the latest active projects directly from the PhilGEPS registry.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md mb-6">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-slate-400" />
              </div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none"
              >
                {PHILGEPS_CATEGORIES.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleStartScan}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-md text-sm w-full sm:w-auto whitespace-nowrap"
            >
              <Search className="h-4 w-4" /> Scan
            </button>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Scraping {currentCategoryName}...</h2>
          <p className="text-slate-500 text-sm">Extracting the newest PhilGEPS tenders. This takes 5–15 seconds.</p>
        </div>
      )}

      {error && !isScanning && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-xl mx-auto w-full">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-red-800 mb-1">Scan Encountered an Issue</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => { setError(''); setHasScanned(false); }} 
            className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Change Category & Try Again
          </button>
        </div>
      )}

      {!isScanning && hasScanned && results.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white p-12 text-center shadow-sm">
          <div className="h-16 w-16 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">No Matching Bids Today</h2>
          <p className="text-slate-500 max-w-md mb-6 text-sm leading-relaxed">
            The scanner didn't find any open opportunities for {currentCategoryName} right now.
          </p>
          <button 
            onClick={() => { setHasScanned(false); }}
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-6 py-3 rounded-lg font-semibold border border-indigo-200 hover:bg-indigo-100 transition-colors text-sm"
          >
            <Filter className="h-4 w-4" /> Try a Different Category
          </button>
        </div>
      )}

      {!isScanning && results.length > 0 && (
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Matched Opportunities ({results.length})
              </h2>
              <p className="text-sm text-slate-500">Filtered by: <span className="font-medium text-slate-700">{currentCategoryName}</span></p>
            </div>
            <button 
              onClick={() => { setHasScanned(false); setResults([]); }} 
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              <Filter className="h-3.5 w-3.5" /> Change Category
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {results.map((bid, idx) => (
              <div 
                key={idx} 
                className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-colors flex flex-col md:flex-row justify-between md:items-center gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {bid.budget || 'N/A'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-800 leading-snug">
                    {bid.title}
                  </h3>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-900">Details:</strong> {bid.reason}</span>
                  </div>
                </div>
                
                {/* --- NEW BUTTON ADDED HERE --- */}
                <div className="shrink-0 flex flex-col sm:flex-row justify-end gap-2">
                  <button 
                    onClick={() => handleImportToSystem(bid)}
                    disabled={importingId === bid.link.match(/refid=(\d+)/i)?.[1]}
                    className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors w-full md:w-auto shadow-sm"
                  >
                    {importingId === bid.link.match(/refid=(\d+)/i)?.[1] ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Extracting...</>
                    ) : (
                      <><Plus className="h-3.5 w-3.5" /> Add to Biddings</>
                    )}
                  </button>
                  <a 
                    href={bid.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-xs font-bold transition-colors w-full md:w-auto"
                  >
                    View Notice <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>

              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}