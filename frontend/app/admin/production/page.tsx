'use client';

import React, { useState, useEffect } from 'react';
import { Hammer, CheckCircle2, Factory, PackageCheck, AlertCircle, Save, X, ChevronDown, ChevronRight, Search, Filter, Layers, ArchiveRestore, Database, PlayCircle } from 'lucide-react';
import ReturnToStockModal from '@/components/ReturnToStockModal';

// const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProductionBoardPage() {
    const [items, setItems] = useState<any[]>([]);
    const [inventoryList, setInventoryList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [username, setUsername] = useState('System');

    // "Advance to Staging" Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [qtyToMove, setQtyToMove] = useState<number>(0);
    const [insertToLedger, setInsertToLedger] = useState(false);
    const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');

    // "Start Production" Modal State
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [qtyToStart, setQtyToStart] = useState<number>(0);
    const [maxQtyToStart, setMaxQtyToStart] = useState<number>(0);

    // Phase 5 RTS State
    const [isRTSOpen, setIsRTSOpen] = useState(false);

    // Accordion & Search State
    const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest');

    useEffect(() => {
        fetchPipeline();
        fetchInventory();
        const storedUser = localStorage.getItem('username');
        if (storedUser) setUsername(storedUser);
    }, []);

    const fetchPipeline = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/production/pipeline');
            if (res.ok) setItems(await res.json() || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const fetchInventory = async () => {
        try {
            const res = await fetch('/api/inventory');
            if (res.ok) setInventoryList(await res.json());
        } catch (err) { console.error(err); }
    };

    // --- MODAL OPENERS ---
    const openStartModal = (item: any) => {
        setSelectedItem(item);
        const pending = Math.max(0, item.total_qty - (item.qty_in_production + item.qty_ready_for_delivery + item.qty_delivered));
        setMaxQtyToStart(pending);
        setQtyToStart(pending); 
        setIsStartModalOpen(true);
    };

    const openMoveModal = (item: any) => {
        setSelectedItem(item);
        setQtyToMove(item.qty_in_production); 
        setInsertToLedger(false);
        setSelectedInventoryId('');
        setIsModalOpen(true);
    };

    // --- ACTION HANDLERS ---
    const handleStartProduction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || qtyToStart <= 0 || qtyToStart > maxQtyToStart) {
            return alert("Invalid quantity to start.");
        }

        try {
            const res = await fetch(`/api/production/items/${selectedItem.project_items_id}/start`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qty_to_start: parseFloat(qtyToStart.toString()) })
            });

            if (res.ok) {
                setIsStartModalOpen(false);
                fetchPipeline(); 
            } else {
                alert("Failed to start production.");
            }
        } catch (err) { alert("Server error."); }
    };

    const handleAdvanceProgress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || qtyToMove <= 0 || qtyToMove > selectedItem.qty_in_production) return alert("Invalid quantity.");
        if (insertToLedger && !selectedInventoryId) return alert("Please select a Master Inventory item to map this finished good into.");

        try {
            const payload: any = { 
                qty_to_move: parseFloat(qtyToMove.toString()),
                insert_to_ledger: insertToLedger,
                username: username
            };
            if (insertToLedger) payload.inventory_id = parseInt(selectedInventoryId);

            const res = await fetch(`/api/production/items/${selectedItem.project_items_id}/advance`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchPipeline(); 
                if (insertToLedger) alert("Success! Item advanced to staging and added to Master Inventory.");
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update production status.");
            }
        } catch (err) { alert("Server error."); }
    };

    const toggleProject = (projectId: number) => {
        const newSet = new Set(expandedProjects);
        if (newSet.has(projectId)) newSet.delete(projectId);
        else newSet.add(projectId);
        setExpandedProjects(newSet);
    };

    // --- DATA PROCESSING ---
    const groupedProjectsMap = items.reduce((acc: any, item: any) => {
        if (!acc[item.project_id]) {
            acc[item.project_id] = { project_id: item.project_id, project_name: item.project_name, total_qty: 0, qty_in_production: 0, qty_ready_for_delivery: 0, qty_delivered: 0, items: [] };
        }
        acc[item.project_id].total_qty += item.total_qty;
        acc[item.project_id].qty_in_production += item.qty_in_production;
        acc[item.project_id].qty_ready_for_delivery += item.qty_ready_for_delivery;
        acc[item.project_id].qty_delivered += item.qty_delivered;
        acc[item.project_id].items.push(item);
        return acc;
    }, {});

    let projectArray = Object.values(groupedProjectsMap) as any[];

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        projectArray = projectArray.filter(p => p.project_name.toLowerCase().includes(q) || p.items.some((i: any) => i.product_name.toLowerCase().includes(q)));
    }

    projectArray.sort((a, b) => {
        if (sortBy === 'newest') return b.project_id - a.project_id;
        if (sortBy === 'oldest') return a.project_id - b.project_id;
        if (sortBy === 'name-asc') return a.project_name.localeCompare(b.project_name);
        if (sortBy === 'name-desc') return b.project_name.localeCompare(a.project_name);
        return 0;
    });

    return (
        <div className="bg-slate-50 min-h-screen p-8">
            <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Factory className="text-blue-600" /> Production & Staging Board</h1>
                    <p className="text-sm text-slate-500 mt-1">Track manufacturing progress and declare finished items as Ready for Delivery.</p>
                </div>
                
                <button onClick={() => setIsRTSOpen(true)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2 shrink-0">
                    <ArchiveRestore className="h-4 w-4" /> Declare Excess / RTS
                </button>
            </div>

            <div className="bg-white border border-slate-200 border-b-0 rounded-t-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm bg-white">
                        <option value="newest">Newest Projects</option>
                        <option value="oldest">Oldest Projects</option>
                        <option value="name-asc">Name (A-Z)</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-b-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                        <tr>
                            <th className="p-4 font-bold">Project / Item Details</th>
                            <th className="p-4 font-bold text-center w-32 border-l border-slate-200"><Hammer className="h-4 w-4 mx-auto mb-1 text-orange-500"/> In Production</th>
                            <th className="p-4 font-bold text-center w-32 border-l border-slate-200"><PackageCheck className="h-4 w-4 mx-auto mb-1 text-blue-500"/> Staged / Ready</th>
                            <th className="p-4 font-bold text-center w-32 border-l border-slate-200"><CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-emerald-500"/> Delivered</th>
                            <th className="p-4 font-bold text-center w-32 border-l border-slate-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading pipeline...</td></tr> : 
                        projectArray.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">No active projects match your search.</td></tr> :
                        projectArray.map(project => {
                            const isExpanded = expandedProjects.has(project.project_id);
                            
                            const prodPct = project.total_qty > 0 ? (project.qty_in_production / project.total_qty) * 100 : 0;
                            const readyPct = project.total_qty > 0 ? (project.qty_ready_for_delivery / project.total_qty) * 100 : 0;
                            const delPct = project.total_qty > 0 ? (project.qty_delivered / project.total_qty) * 100 : 0;

                            return (
                                <React.Fragment key={`proj-${project.project_id}`}>
                                    <tr onClick={() => toggleProject(project.project_id)} className="bg-slate-50 hover:bg-slate-100 cursor-pointer group">
                                        <td className="p-4 border-l-4 border-blue-500">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1 rounded bg-white border border-slate-200 shadow-sm text-slate-500"><ChevronRight className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}/></div>
                                                <div>
                                                    <div className="text-xs font-bold text-blue-600 uppercase mb-0.5 flex items-center gap-1"><Layers className="h-3 w-3"/> Project #{project.project_id}</div>
                                                    <div className="font-bold text-slate-800 text-base">{project.project_name}</div>
                                                    <div className="w-full max-w-sm h-1.5 bg-slate-200 rounded-full mt-2 flex overflow-hidden">
                                                        <div style={{ width: `${delPct}%` }} className="bg-emerald-500 h-full"></div>
                                                        <div style={{ width: `${readyPct}%` }} className="bg-blue-500 h-full"></div>
                                                        <div style={{ width: `${prodPct}%` }} className="bg-orange-400 h-full"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center border-l bg-orange-50/30"><div className="text-xs text-slate-400 mb-1 font-medium">Total</div><span className={`text-lg font-bold ${project.qty_in_production > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{project.qty_in_production}</span></td>
                                        <td className="p-4 text-center border-l bg-blue-50/30"><div className="text-xs text-slate-400 mb-1 font-medium">Total</div><span className={`text-lg font-bold ${project.qty_ready_for_delivery > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{project.qty_ready_for_delivery}</span></td>
                                        <td className="p-4 text-center border-l bg-emerald-50/30"><div className="text-xs text-slate-400 mb-1 font-medium">Total</div><span className={`text-lg font-bold ${project.qty_delivered > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{project.qty_delivered}</span></td>
                                        <td className="p-4 text-center border-l"><span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full shadow-sm">{project.items.length} Items</span></td>
                                    </tr>

                                    {isExpanded && project.items.map((item: any) => {
                                        const iProdPct = item.total_qty > 0 ? (item.qty_in_production / item.total_qty) * 100 : 0;
                                        const iReadyPct = item.total_qty > 0 ? (item.qty_ready_for_delivery / item.total_qty) * 100 : 0;
                                        const iDelPct = item.total_qty > 0 ? (item.qty_delivered / item.total_qty) * 100 : 0;
                                        
                                        // Calculate how many items are waiting to be started
                                        const pendingToStart = Math.max(0, item.total_qty - (item.qty_in_production + item.qty_ready_for_delivery + item.qty_delivered));

                                        return (
                                            <tr key={item.project_items_id} className="bg-white hover:bg-slate-50/50 transition-colors">
                                                <td className="p-4 pl-14">
                                                    <div className="font-semibold text-slate-700 text-sm">{item.product_name}</div>
                                                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-4">
                                                        <span>Target: <span className="font-bold text-slate-700">{item.total_qty}</span></span>
                                                        <div className="w-32 h-1 bg-slate-100 rounded-full flex overflow-hidden">
                                                            <div style={{ width: `${iDelPct}%` }} className="bg-emerald-400 h-full"></div>
                                                            <div style={{ width: `${iReadyPct}%` }} className="bg-blue-400 h-full"></div>
                                                            <div style={{ width: `${iProdPct}%` }} className="bg-orange-300 h-full"></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-center border-l"><span className={`text-sm font-bold ${item.qty_in_production > 0 ? 'text-orange-600' : 'text-slate-300'}`}>{item.qty_in_production}</span></td>
                                                <td className="p-4 text-center border-l"><span className={`text-sm font-bold ${item.qty_ready_for_delivery > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{item.qty_ready_for_delivery}</span></td>
                                                <td className="p-4 text-center border-l"><span className={`text-sm font-bold ${item.qty_delivered > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{item.qty_delivered}</span></td>
                                                <td className="p-4 text-center border-l">
                                                    <div className="flex flex-col gap-2">
                                                        <button 
                                                            disabled={pendingToStart <= 0}
                                                            onClick={() => openStartModal(item)}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded shadow-sm transition-colors w-full ${pendingToStart > 0 ? 'bg-indigo-50 border border-indigo-300 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed hidden'}`}
                                                        >
                                                            Start Build ({pendingToStart})
                                                        </button>
                                                        <button 
                                                            disabled={item.qty_in_production <= 0}
                                                            onClick={() => openMoveModal(item)}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded shadow-sm transition-colors w-full ${item.qty_in_production > 0 ? 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50' : 'bg-slate-50 text-slate-300 border border-slate-200 cursor-not-allowed'}`}
                                                        >
                                                            Mark as Ready
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* START PRODUCTION MODAL */}
            {isStartModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><PlayCircle className="h-5 w-5"/> Start Production</h3>
                            <button onClick={() => setIsStartModalOpen(false)} className="hover:text-indigo-200"><X className="h-5 w-5"/></button>
                        </div>
                        <form onSubmit={handleStartProduction} className="p-6">
                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6">
                                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mb-1">Target Item</p>
                                <p className="font-bold text-slate-800">{selectedItem.product_name}</p>
                            </div>
                            <div className="mb-4">
                                <label className="block text-slate-700 font-bold mb-2">How many items are you starting to build right now?</label>
                                <div className="flex items-center gap-4">
                                    <input type="number" step="0.01" min="0.01" max={maxQtyToStart} value={qtyToStart} onChange={e => setQtyToStart(parseFloat(e.target.value) || 0)} className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-lg font-bold text-center" required />
                                    <span className="text-sm font-bold text-slate-400 whitespace-nowrap">/ {maxQtyToStart} max</span>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsStartModalOpen(false)} className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm"><PlayCircle className="h-4 w-4"/> Start Build</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ADVANCE TO STAGING MODAL (Existing code unchanged) */}
            {isModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><PackageCheck className="h-5 w-5"/> Advance to Staging</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-200"><X className="h-5 w-5"/></button>
                        </div>
                        
                        <form onSubmit={handleAdvanceProgress} className="p-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Target Item</p>
                                <p className="font-bold text-slate-800">{selectedItem.product_name}</p>
                                <p className="text-xs text-slate-500 italic mt-1">Project: {selectedItem.project_name}</p>
                            </div>

                            <div className="mb-4">
                                <label className="block text-slate-700 font-bold mb-2">How many items are finished and ready for delivery?</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="number" step="0.01" min="0.01" max={selectedItem.qty_in_production}
                                        value={qtyToMove} onChange={e => setQtyToMove(parseFloat(e.target.value) || 0)}
                                        className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-lg font-bold text-center"
                                        required 
                                    />
                                    <span className="text-sm font-bold text-slate-400 whitespace-nowrap">/ {selectedItem.qty_in_production} max</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 flex items-start gap-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/> Moving these items will make them available for the Dispatcher to schedule.</p>
                            </div>

                            <div className="mb-6 pt-4 border-t border-slate-100">
                                <div className="flex items-start gap-3 mb-3">
                                    <input type="checkbox" id="insertLedger" checked={insertToLedger} onChange={e => setInsertToLedger(e.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                    <div>
                                        <label htmlFor="insertLedger" className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-1">
                                            <Database className="h-4 w-4 text-slate-400" /> Insert into Master Inventory?
                                        </label>
                                        <p className="text-xs text-slate-500 mt-1">Enable this if you want to store these finished goods in the master ledger for tracking or future use.</p>
                                    </div>
                                </div>

                                {insertToLedger && (
                                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-3 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Select Master Inventory Mapping</label>
                                        <select 
                                            value={selectedInventoryId} onChange={e => setSelectedInventoryId(e.target.value)}
                                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:border-blue-500 font-medium"
                                            required={insertToLedger}
                                        >
                                            <option value="" disabled>-- Select an Inventory Item --</option>
                                            {inventoryList.map(inv => (
                                                <option key={inv.inventory_id} value={inv.inventory_id}>
                                                    {inv.dbos_code} - {inv.inventory_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"><Save className="h-4 w-4"/> Confirm Move</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ReturnToStockModal isOpen={isRTSOpen} onClose={() => setIsRTSOpen(false)} projectId={0} />
        </div>
    );
}