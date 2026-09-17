'use client';

import React, { useState, useEffect } from 'react';
import { Hammer, CheckCircle2, Factory, PackageCheck, AlertCircle, Save, X, ChevronDown, ChevronRight, Search, Filter, Layers, ArchiveRestore } from 'lucide-react';
import ReturnToStockModal from '@/components/ReturnToStockModal';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProductionBoardPage() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [qtyToMove, setQtyToMove] = useState<number>(0);

    // Phase 5 RTS State
    const [isRTSOpen, setIsRTSOpen] = useState(false);

    // Accordion, Search, and Sort State
    const [expandedProjects, setExpandedProjects] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, name-asc, name-desc

    useEffect(() => {
        fetchPipeline();
    }, []);

    const fetchPipeline = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/production/pipeline`);
            if (res.ok) {
                const data = await res.json();
                setItems(data || []);
            }
        } catch (err) { 
            console.error("Fetch Error:", err); 
        } finally { 
            setLoading(false); 
        }
    };

    const openMoveModal = (item: any) => {
        setSelectedItem(item);
        setQtyToMove(item.qty_in_production); 
        setIsModalOpen(true);
    };

    const handleAdvanceProgress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || qtyToMove <= 0 || qtyToMove > selectedItem.qty_in_production) {
            return alert("Invalid quantity. You cannot move more items than are currently in production.");
        }

        try {
            const res = await fetch(`${API_URL}/api/production/items/${selectedItem.project_items_id}/advance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ qty_to_move: parseFloat(qtyToMove.toString()) })
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchPipeline(); 
            } else {
                alert("Failed to update production status.");
            }
        } catch (err) { alert("Server error."); }
    };

    const toggleProject = (projectId: number) => {
        const newSet = new Set(expandedProjects);
        if (newSet.has(projectId)) newSet.delete(projectId);
        else newSet.add(projectId);
        setExpandedProjects(newSet);
    };

    // --- DATA PROCESSING: Grouping, Searching, and Sorting ---
    
    // 1. Group flat items into Projects
    const groupedProjectsMap = items.reduce((acc: any, item: any) => {
        if (!acc[item.project_id]) {
            acc[item.project_id] = {
                project_id: item.project_id,
                project_name: item.project_name,
                total_qty: 0,
                qty_in_production: 0,
                qty_ready_for_delivery: 0,
                qty_delivered: 0,
                items: []
            };
        }
        acc[item.project_id].total_qty += item.total_qty;
        acc[item.project_id].qty_in_production += item.qty_in_production;
        acc[item.project_id].qty_ready_for_delivery += item.qty_ready_for_delivery;
        acc[item.project_id].qty_delivered += item.qty_delivered;
        acc[item.project_id].items.push(item);
        return acc;
    }, {});

    let projectArray = Object.values(groupedProjectsMap) as any[];

    // 2. Filter by Search Query
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        projectArray = projectArray.filter(p => 
            p.project_name.toLowerCase().includes(q) || 
            p.items.some((i: any) => i.product_name.toLowerCase().includes(q))
        );
    }

    // 3. Sort Projects
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
                
                {/* NEW PHASE 5 RTS BUTTON */}
                <button 
                    onClick={() => setIsRTSOpen(true)} 
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2 transition-colors shrink-0"
                >
                    <ArchiveRestore className="h-4 w-4" />
                    Declare Excess / RTS
                </button>
            </div>

            {/* Toolbar: Search and Sort */}
            <div className="bg-white border border-slate-200 border-b-0 rounded-t-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search by project or item name..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 transition-colors text-sm"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="p-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm bg-white cursor-pointer w-full sm:w-auto"
                    >
                        <option value="newest">Newest Projects First</option>
                        <option value="oldest">Oldest Projects First</option>
                        <option value="name-asc">Project Name (A-Z)</option>
                        <option value="name-desc">Project Name (Z-A)</option>
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
                            <th className="p-4 font-bold text-center w-32 border-l border-slate-200">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">Loading pipeline...</td></tr> : 
                        projectArray.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-slate-400">No active projects match your search.</td></tr> :
                        projectArray.map(project => {
                            const isExpanded = expandedProjects.has(project.project_id);
                            
                            // Aggregate Project Percentages
                            const prodPct = project.total_qty > 0 ? (project.qty_in_production / project.total_qty) * 100 : 0;
                            const readyPct = project.total_qty > 0 ? (project.qty_ready_for_delivery / project.total_qty) * 100 : 0;
                            const delPct = project.total_qty > 0 ? (project.qty_delivered / project.total_qty) * 100 : 0;

                            return (
                                <React.Fragment key={`proj-${project.project_id}`}>
                                    {/* MAIN PROJECT ROW (Accordion Header) */}
                                    <tr 
                                        onClick={() => toggleProject(project.project_id)} 
                                        className="bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors group"
                                    >
                                        <td className="p-4 border-l-4 border-blue-500">
                                            <div className="flex items-center gap-3">
                                                <div className="p-1 rounded bg-white border border-slate-200 shadow-sm text-slate-500 group-hover:text-blue-600 transition-colors">
                                                    {isExpanded ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-0.5 flex items-center gap-1"><Layers className="h-3 w-3"/> Project #{project.project_id}</div>
                                                    <div className="font-bold text-slate-800 text-base">{project.project_name}</div>
                                                    
                                                    {/* Aggregate Visual Progress Bar */}
                                                    <div className="w-full max-w-sm h-1.5 bg-slate-200 rounded-full mt-2 flex overflow-hidden">
                                                        <div style={{ width: `${delPct}%` }} className="bg-emerald-500 h-full" title="Delivered"></div>
                                                        <div style={{ width: `${readyPct}%` }} className="bg-blue-500 h-full" title="Ready for Delivery"></div>
                                                        <div style={{ width: `${prodPct}%` }} className="bg-orange-400 h-full" title="In Production"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td className="p-4 text-center border-l border-slate-200 bg-orange-50/30">
                                            <div className="text-xs text-slate-400 mb-1 font-medium">Total</div>
                                            <span className={`text-lg font-bold ${project.qty_in_production > 0 ? 'text-orange-600' : 'text-slate-400'}`}>{project.qty_in_production}</span>
                                        </td>
                                        
                                        <td className="p-4 text-center border-l border-slate-200 bg-blue-50/30">
                                            <div className="text-xs text-slate-400 mb-1 font-medium">Total</div>
                                            <span className={`text-lg font-bold ${project.qty_ready_for_delivery > 0 ? 'text-blue-600' : 'text-slate-400'}`}>{project.qty_ready_for_delivery}</span>
                                        </td>
                                        
                                        <td className="p-4 text-center border-l border-slate-200 bg-emerald-50/30">
                                            <div className="text-xs text-slate-400 mb-1 font-medium">Total</div>
                                            <span className={`text-lg font-bold ${project.qty_delivered > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>{project.qty_delivered}</span>
                                        </td>
                                        
                                        <td className="p-4 text-center border-l border-slate-200">
                                            <span className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-full shadow-sm">{project.items.length} Items</span>
                                        </td>
                                    </tr>

                                    {/* EXPANDED ITEM ROWS */}
                                    {isExpanded && project.items.map((item: any) => {
                                        const iProdPct = item.total_qty > 0 ? (item.qty_in_production / item.total_qty) * 100 : 0;
                                        const iReadyPct = item.total_qty > 0 ? (item.qty_ready_for_delivery / item.total_qty) * 100 : 0;
                                        const iDelPct = item.total_qty > 0 ? (item.qty_delivered / item.total_qty) * 100 : 0;

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
                                                
                                                <td className="p-4 text-center border-l border-slate-100">
                                                    <span className={`text-sm font-bold ${item.qty_in_production > 0 ? 'text-orange-600' : 'text-slate-300'}`}>{item.qty_in_production}</span>
                                                </td>
                                                
                                                <td className="p-4 text-center border-l border-slate-100">
                                                    <span className={`text-sm font-bold ${item.qty_ready_for_delivery > 0 ? 'text-blue-600' : 'text-slate-300'}`}>{item.qty_ready_for_delivery}</span>
                                                </td>
                                                
                                                <td className="p-4 text-center border-l border-slate-100">
                                                    <span className={`text-sm font-bold ${item.qty_delivered > 0 ? 'text-emerald-600' : 'text-slate-300'}`}>{item.qty_delivered}</span>
                                                </td>
                                                
                                                <td className="p-4 text-center border-l border-slate-100">
                                                    <button 
                                                        disabled={item.qty_in_production <= 0}
                                                        onClick={() => openMoveModal(item)}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded shadow-sm transition-colors w-full ${item.qty_in_production > 0 ? 'bg-white border border-blue-300 text-blue-700 hover:bg-blue-50' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
                                                    >
                                                        Mark as Ready
                                                    </button>
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

            {/* ACTION MODAL: Move Items to "Ready" */}
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

                            <div className="mb-6">
                                <label className="block text-slate-700 font-bold mb-2">How many items are finished and ready for delivery?</label>
                                <div className="flex items-center gap-4">
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0.01"
                                        max={selectedItem.qty_in_production}
                                        value={qtyToMove} 
                                        onChange={e => setQtyToMove(parseFloat(e.target.value))}
                                        className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-lg font-bold text-center"
                                        required 
                                    />
                                    <span className="text-sm font-bold text-slate-400 whitespace-nowrap">/ {selectedItem.qty_in_production} max</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 flex items-start gap-1"><AlertCircle className="h-3.5 w-3.5 shrink-0"/> Moving these items will make them available for the Dispatcher to schedule.</p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"><Save className="h-4 w-4"/> Confirm Move</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PHASE 5: Return To Stock Modal */}
            <ReturnToStockModal 
                isOpen={isRTSOpen} 
                onClose={() => setIsRTSOpen(false)} 
                projectId={0} 
            />
        </div>
    );
}