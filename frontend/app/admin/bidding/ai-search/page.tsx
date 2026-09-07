'use client';

import { useState } from 'react';
import { Search, Bot, ExternalLink, ArrowLeft, Loader2, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface RecommendedBid {
  title: string;
  budget: string;
  link: string;
  reason: string;
}

export default function AISearchPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<RecommendedBid[]>([]);
  const [error, setError] = useState('');

  const handleStartScan = async () => {
    setIsScanning(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch(`${API_URL}/api/biddings/ai-search`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to scan PhilGEPS');
      }
      
      setResults(data.recommended_bids || []);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="p-6 w-full flex flex-col h-full font-sans">
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/admin/biddings" 
          className="p-2 hover:bg-slate-100 rounded-full transition-colors border border-slate-200"
        >
          <ArrowLeft className="h-5 w-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            PhilGEPS AI Scanner <Sparkles className="h-5 w-5 text-amber-500" />
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Distinctive Blinds & Office Systems Opportunity Matcher
          </p>
        </div>
      </div>

      {/* Initial Empty State */}
      {!isScanning && results.length === 0 && !error && (
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-white p-12 text-center shadow-sm">
          <div className="h-20 w-20 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center mb-5">
            <Bot className="h-10 w-10 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Scan PhilGEPS Opportunities</h2>
          <p className="text-slate-500 max-w-lg mb-6 text-sm leading-relaxed">
            The AI filters active PhilGEPS postings against Distinctive Blinds product lines (window blinds, office furniture, seating, and modular partitions) and flags matching tenders.
          </p>
          <button 
            onClick={handleStartScan}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-md text-sm"
          >
            <Search className="h-4 w-4" /> Start PhilGEPS Scan
          </button>
        </div>
      )}

      {/* Loading State */}
      {isScanning && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="h-8 w-8 text-indigo-600 animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-1">Scraping & Evaluating Bids...</h2>
          <p className="text-slate-500 text-sm">Evaluating tenders with OpenRouter. This usually takes 5–15 seconds.</p>
        </div>
      )}

      {/* Error State */}
      {error && !isScanning && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center max-w-xl mx-auto w-full">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-red-800 mb-1">Scan Encountered an Issue</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button 
            onClick={handleStartScan} 
            className="bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Retry Scan
          </button>
        </div>
      )}

      {/* Results State */}
      {!isScanning && results.length > 0 && (
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-800">
              Matched Opportunities ({results.length})
            </h2>
            <button 
              onClick={handleStartScan} 
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Re-scan
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
                      Budget: {bid.budget || 'N/A'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 leading-snug">
                    {bid.title}
                  </h3>

                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs text-slate-700 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><strong className="text-slate-900">Match Reason:</strong> {bid.reason}</span>
                  </div>
                </div>

                <div className="shrink-0 flex md:flex-col justify-end">
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