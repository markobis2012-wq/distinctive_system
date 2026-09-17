'use client';

import { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, List, FileText, X, Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Edit2, Package, ArrowRightCircle, Printer, FileDown, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const getImageUrl = (path: string) => {
    if (!path) return 'https://via.placeholder.com/150?text=No+Image';
    if (path.startsWith('http')) return path;
    return `${API_URL}/${path.replace('./', '')}`;
};

export default function DeliveryPage() {
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Modal State
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

    // Unified Item State
    const [deliveryItems, setDeliveryItems] = useState<any[]>([]);
    const [availableProjItems, setAvailableProjItems] = useState<any[]>([]);
    const [itemSearchTerm, setItemSearchTerm] = useState("");

    const [itemForm, setItemForm] = useState({
        delivery_item_id: 0,
        project_item_id: 0,
        deliver_qty: 1,
        remarks: ''
    });
    const [maxAllowedQty, setMaxAllowedQty] = useState(1);

    // Print Modal State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printForm, setPrintForm] = useState({
        type: 'dr', // 'dr' or 'll'
        printer: 'inkjet',
        dr_number: '',
        address: '',
        contact_person: '',
        contact_number: '',
        items_per_page: 5
    });

    // --- PHASE 4: Accomplishment Report State ---
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
    const [completeNotes, setCompleteNotes] = useState("");
    const [drFile, setDrFile] = useState<File | null>(null);

    // Filter, Sort, Pagination
    const [searchTerm, setSearchTerm] = useState("");
    const [filterProjectId, setFilterProjectId] = useState<string>("all");
    const [sortField, setSortField] = useState<string>("delivery_date");
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const [form, setForm] = useState({
        delivery_date: new Date().toISOString().split('T')[0],
        project_id: 0
    });

    const fetchDeliveries = async () => {
        try {
            const res = await fetch(`${API_URL}/api/deliveries`);
            if (res.ok) setDeliveries(await res.json() || []);
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        fetchDeliveries();
        fetch(`${API_URL}/api/projects`).then(r => r.json()).then(data => {
            if (Array.isArray(data)) setProjects(data);
            else if (data && Array.isArray(data.data)) setProjects(data.data);
            else setProjects([]);
        }).catch(() => setProjects([]));
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterProjectId]);

    const handleAddDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        const selectedProj = projects.find(p => p.projects_id === form.project_id);
        if (!selectedProj) return alert("Select a project");

        await fetch(`${API_URL}/api/deliveries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                delivery_date: form.delivery_date,
                project_id: form.project_id,
                project_number: selectedProj.project_number,
                is_loading_list: 0 // Legacy field, ignored by standard
            })
        });

        setIsAddModalOpen(false);
        fetchDeliveries();
    };

    useEffect(() => {
        if (isManageModalOpen && selectedDelivery) {
            fetch(`${API_URL}/api/projects/${selectedDelivery.project_id}/available-items`)
                .then(res => res.json()).then(data => setAvailableProjItems(Array.isArray(data) ? data : []));

            fetch(`${API_URL}/api/deliveries/${selectedDelivery.delivery_id}/items`)
                .then(res => res.json()).then(data => setDeliveryItems(Array.isArray(data) ? data : []));
        } else {
            setDeliveryItems([]); setAvailableProjItems([]);
            setItemForm({ delivery_item_id: 0, project_item_id: 0, deliver_qty: 1, remarks: '' });
        }
    }, [isManageModalOpen, selectedDelivery]);

    const handleMarkInTransit = async () => {
        if (!confirm("Are you sure you want to mark this load as IN TRANSIT? This will update the Dispatcher's calendar.")) return;
        try {
            const res = await fetch(`${API_URL}/api/deliveries/${selectedDelivery.delivery_id}/status`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'In Transit' })
            });
            if (res.ok) alert("Truck marked as In Transit! The dispatcher has been updated.");
            else alert("Failed to update status.");
        } catch (err) { alert("Server error connecting to FSM Calendar."); }
    };

    // --- PHASE 4: Handle Accomplishment Submission ---
    const handleCompleteDelivery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirm("Are you sure? This will officially close the Delivery and deduct the items from the Project Inventory!")) return;

        const formData = new FormData();
        formData.append('notes', completeNotes);
        if (drFile) formData.append('dr_image', drFile);

        try {
            const res = await fetch(`${API_URL}/api/deliveries/${selectedDelivery.delivery_id}/complete`, {
                method: 'POST',
                body: formData // No Content-Type header needed for FormData
            });

            if (res.ok) {
                alert("Success! Delivery Completed and Inventory Deducted.");
                setIsCompleteModalOpen(false);
                setIsManageModalOpen(false);
                fetchDeliveries();
            } else {
                alert("Failed to complete delivery.");
            }
        } catch (err) {
            alert("Server error during completion.");
        }
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (itemForm.project_item_id === 0) return alert("Select an item");
        if (itemForm.deliver_qty > maxAllowedQty && itemForm.delivery_item_id === 0) {
            return alert(`Quantity exceeds available pending limit (${maxAllowedQty}).`);
        }

        const url = itemForm.delivery_item_id > 0
            ? `${API_URL}/api/deliveries/items/${itemForm.delivery_item_id}`
            : `${API_URL}/api/deliveries/items`;

        const method = itemForm.delivery_item_id > 0 ? 'PUT' : 'POST';
        const payload = { ...itemForm, delivery_id: selectedDelivery.delivery_id };

        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) {
            setItemForm({ delivery_item_id: 0, project_item_id: 0, deliver_qty: 1, remarks: '' });
            setMaxAllowedQty(1);
            fetch(`${API_URL}/api/deliveries/${selectedDelivery.delivery_id}/items`)
                .then(r => r.json()).then(d => setDeliveryItems(Array.isArray(d) ? d : []));
            fetch(`${API_URL}/api/projects/${selectedDelivery.project_id}/available-items`)
                .then(r => r.json()).then(d => setAvailableProjItems(Array.isArray(d) ? d : []));
        } else {
            alert("Failed to save item");
        }
    };

    const handleDeleteItem = async (id: number) => {
        if (!confirm("Remove this item from the shipment?")) return;
        await fetch(`${API_URL}/api/deliveries/items/${id}`, { method: 'DELETE' });
        fetch(`${API_URL}/api/deliveries/${selectedDelivery.delivery_id}/items`)
            .then(r => r.json()).then(d => setDeliveryItems(Array.isArray(d) ? d : []));
        fetch(`${API_URL}/api/projects/${selectedDelivery.project_id}/available-items`)
            .then(r => r.json()).then(d => setAvailableProjItems(Array.isArray(d) ? d : []));
    };

    const handleDeleteDelivery = async (id: number) => {
        if (!confirm("Are you sure you want to delete this entire shipment?")) return;
        await fetch(`${API_URL}/api/deliveries/${id}`, { method: 'DELETE' });
        fetchDeliveries();
    };

    const handleSort = (field: string) => {
        if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDirection('asc'); }
    };
    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-slate-400 ml-1 inline" />;
        return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3 text-blue-600 ml-1 inline" /> : <ChevronDown className="h-3 w-3 text-blue-600 ml-1 inline" />;
    };

    // Filter, Search, Sort
    const activeProjects = (Array.isArray(projects) ? projects : []).filter(p => p.project_status === 'On Going');
    let processed = Array.isArray(deliveries) ? deliveries : [];
    
    if (filterProjectId !== "all") processed = processed.filter(d => String(d.project_id) === filterProjectId);
    if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        processed = processed.filter(d =>
            (d.delivery_no || '').toLowerCase().includes(lower) ||
            (d.company_name || '').toLowerCase().includes(lower) ||
            (d.project_name || '').toLowerCase().includes(lower) ||
            (d.project_number || '').toLowerCase().includes(lower)
        );
    }
    processed.sort((a, b) => {
        let valA = String(a[sortField] || '').toLowerCase();
        let valB = String(b[sortField] || '').toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const filteredItems = deliveryItems.filter(i => 
        (i.product_name || '').toLowerCase().includes(itemSearchTerm.toLowerCase()) || 
        (i.supplier_product_name || '').toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        (i.item_name || '').toLowerCase().includes(itemSearchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(processed.length / itemsPerPage) || 1;
    const paginatedDeliveries = processed.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="bg-slate-50 min-h-screen pb-12 w-full">
            <div className="bg-slate-900 text-white p-8 rounded-b-3xl shadow-md mb-8">
                <div className="flex items-center gap-3">
                    <Truck className="h-8 w-8 text-blue-400" />
                    <h1 className="text-2xl font-bold">Logistics & Shipments</h1>
                </div>
                <p className="text-slate-400 text-sm mt-2">Unified dashboard for Warehouse Loading and Client Deliveries.</p>
            </div>

            <div className="px-8 w-full mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
                        
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto flex-1">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Search shipments..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" />
                            </div>

                            <div className="relative w-full md:w-64">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <select value={filterProjectId} onChange={e => setFilterProjectId(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 appearance-none bg-white">
                                    <option value="all">All Projects</option>
                                    {activeProjects.map(p => <option key={p.projects_id} value={p.projects_id}>{p.project_number} - {p.company_name}</option>)}
                                </select>
                            </div>
                        </div>

                        <button onClick={() => setIsAddModalOpen(true)} className="flex shrink-0 items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm w-full md:w-auto justify-center">
                            <Plus className="h-4 w-4" /> Create Shipment
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('delivery_date')}>Date <SortIcon field="delivery_date" /></th>
                                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('delivery_no')}>Number <SortIcon field="delivery_no" /></th>
                                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('company_name')}>Project & Client <SortIcon field="company_name" /></th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedDeliveries.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No shipments found.</td></tr>
                                ) : paginatedDeliveries.map(d => (
                                    <tr key={d.delivery_id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">{d.delivery_date}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">{d.delivery_no}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{d.project_number}</div>
                                            <div className="font-medium text-slate-600">{d.company_name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => { setSelectedDelivery(d); setIsManageModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors font-medium flex items-center gap-1">
                                                    <List className="h-4 w-4" /> Manage
                                                </button>
                                                <button onClick={() => handleDeleteDelivery(d.delivery_id)} className="text-red-600 hover:text-red-800 p-2 bg-red-50 hover:bg-red-100 rounded transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {processed.length > 0 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600 bg-white">
                            <div>Showing <b>{((currentPage - 1) * itemsPerPage) + 1}</b> to <b>{Math.min(currentPage * itemsPerPage, processed.length)}</b> of <b>{processed.length}</b></div>
                            <div className="flex gap-1">
                                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /></button>
                                <div className="px-3 py-1.5 font-medium">Page {currentPage} of {totalPages}</div>
                                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"><ChevronRight className="h-4 w-4" /></button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD SHIPMENT MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-8 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                            <h3 className="font-bold text-lg">New Shipment</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="hover:text-blue-200"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleAddDelivery} className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label><input required type="date" value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} className="w-full p-2 border border-slate-300 rounded outline-none" /></div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Project</label>
                                <select required value={form.project_id} onChange={e => setForm({ ...form, project_id: parseInt(e.target.value) })} className="w-full p-2 border border-slate-300 rounded outline-none bg-white">
                                    <option value="0">Select On-Going Project...</option>
                                    {activeProjects.map(p => <option key={p.projects_id} value={p.projects_id}>({p.project_number}) {p.company_name}</option>)}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium shadow-sm">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* UNIFIED MANAGE SHIPMENT MODAL */}
            {isManageModalOpen && selectedDelivery && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden">
                        
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white shrink-0">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2"><Package className="h-5 w-5"/> Manage Shipment Items</h3>
                                <p className="text-blue-100 text-xs mt-0.5">Shipment ID: {selectedDelivery.delivery_no}</p>
                            </div>
                            <div className="flex gap-3 items-center">
                                <button onClick={handleMarkInTransit} className="bg-emerald-500 text-white px-4 py-2 rounded text-sm font-bold shadow-sm hover:bg-emerald-600 flex items-center gap-1 border border-emerald-400">
                                    <Truck className="h-4 w-4"/> Dispatch / In Transit
                                </button>

                                {/* PHASE 4 BUTTON! */}
                                <button onClick={() => setIsCompleteModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold shadow-sm hover:bg-indigo-700 flex items-center gap-1 border border-indigo-500">
                                    <CheckCircle2 className="h-4 w-4"/> Complete Delivery
                                </button>
                                
                                {/* DUAL PRINT BUTTONS */}
                                <button onClick={() => { setPrintForm({ ...printForm, type: 'll', dr_number: 'Loading List', printer: 'loadinglist' }); setIsPrintModalOpen(true); }} className="bg-slate-800 text-white px-4 py-2 rounded text-sm font-bold shadow-sm hover:bg-slate-900 flex items-center gap-1 border border-slate-700"><FileDown className="h-4 w-4"/> Print Loading List</button>
                                <button onClick={() => { setPrintForm({ ...printForm, type: 'dr', dr_number: selectedDelivery.delivery_no, printer: 'inkjet' }); setIsPrintModalOpen(true); }} className="bg-white text-blue-600 px-4 py-2 rounded text-sm font-bold shadow-sm hover:bg-blue-50 flex items-center gap-1"><FileText className="h-4 w-4"/> Print Delivery Receipt</button>
                                
                                <button onClick={() => setIsManageModalOpen(false)} className="hover:text-blue-200 ml-3"><X className="h-6 w-6" /></button>
                            </div>
                        </div>

                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                            {/* Left Side: Add Components */}
                            <div className="w-full lg:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
                                <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">{itemForm.delivery_item_id > 0 ? 'Edit Item' : 'Add Parts / Components'}</h4>
                                <form onSubmit={handleSaveItem} className="space-y-4">
                                    {itemForm.delivery_item_id === 0 && (
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Project Item *</label>
                                            <select required value={itemForm.project_item_id} onChange={e => {
                                                const id = parseInt(e.target.value);
                                                const selected = availableProjItems.find(i => i.project_items_id === id);
                                                const max = selected ? selected.pending : 1;
                                                if (max <= 0 && id !== 0) alert("All items for this product have already been delivered.");
                                                setItemForm({ ...itemForm, project_item_id: id, deliver_qty: max > 0 ? 1 : 0 });
                                                setMaxAllowedQty(max);
                                            }} className="w-full p-2 border border-slate-300 rounded outline-none text-sm bg-white">
                                                <option value="0">Select item...</option>
                                                {availableProjItems.map(p => <option key={p.project_items_id} value={p.project_items_id}>{p.product_name} (Pending: {p.pending})</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Qty <span className="text-orange-600 ml-1">(Max: {maxAllowedQty})</span></label>
                                        <input type="number" min={maxAllowedQty > 0 ? "1" : "0"} max={itemForm.delivery_item_id === 0 ? maxAllowedQty : undefined} required disabled={maxAllowedQty <= 0 && itemForm.project_item_id !== 0} value={itemForm.deliver_qty} onChange={e => setItemForm({ ...itemForm, deliver_qty: parseInt(e.target.value) || 0 })} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 text-sm disabled:bg-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks</label>
                                        <textarea rows={2} value={itemForm.remarks} disabled={maxAllowedQty <= 0 && itemForm.project_item_id !== 0} onChange={e => setItemForm({ ...itemForm, remarks: e.target.value })} className="w-full p-2 border border-slate-300 rounded outline-none text-sm resize-none" placeholder="Condition, tags..." />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        {itemForm.delivery_item_id > 0 && <button type="button" onClick={() => setItemForm({ delivery_item_id: 0, project_item_id: 0, deliver_qty: 1, remarks: '' })} className="flex-1 py-2 border border-slate-300 rounded font-medium text-sm">Cancel</button>}
                                        <button type="submit" disabled={maxAllowedQty <= 0 && itemForm.project_item_id !== 0} className={`flex-1 py-2 text-white rounded font-medium shadow-sm text-sm ${maxAllowedQty <= 0 && itemForm.project_item_id !== 0 ? 'bg-slate-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{itemForm.delivery_item_id > 0 ? 'Update Item' : 'Add to Shipment'}</button>
                                    </div>
                                </form>
                            </div>

                            {/* Right Side: List of Items */}
                            <div className="w-full lg:w-2/3 p-6 flex flex-col h-full bg-white overflow-hidden">
                                <div className="flex justify-between items-center mb-4 shrink-0">
                                    <h4 className="font-bold text-slate-700">Physical Items on Truck</h4>
                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                        <input type="text" placeholder="Search components..." value={itemSearchTerm} onChange={e => setItemSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                                    </div>
                                </div>
                                <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                                    <table className="w-full text-left text-sm text-slate-600 relative">
                                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0">
                                            <tr>
                                                <th className="px-4 py-3 font-medium w-16 text-center">Visual</th>
                                                <th className="px-4 py-3 font-medium">Product / Component Info</th>
                                                <th className="px-4 py-3 font-medium text-center">Qty Loaded</th>
                                                <th className="px-4 py-3 font-medium text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredItems.length === 0 ? <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">No items loaded yet.</td></tr> : filteredItems.map((i, idx) => (
                                                <tr key={i.loading_list_id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                                                    <td className="px-4 py-3">
                                                        <img src={getImageUrl(i.image_path)} className="w-10 h-10 object-cover rounded border bg-white mx-auto" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image'; }} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-800">{i.product_name}</div>
                                                        <div className="text-xs font-medium text-slate-500 mt-0.5"><span className="text-slate-400 mr-1">Part:</span> {i.supplier_product_name || i.item_name || 'Main Item'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-black text-emerald-600 text-lg">{i.qty || i.item_qty}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <button onClick={() => setItemForm({ ...i, project_item_id: i.project_item_id, deliver_qty: i.qty || i.item_qty })} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 hover:bg-blue-100 rounded transition-colors"><Edit2 className="h-4 w-4" /></button>
                                                            <button onClick={() => handleDeleteItem(i.delivery_item_id)} className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* UNIFIED PRINT MODAL */}
            {isPrintModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                            <h3 className="font-bold text-lg">Print {printForm.type === 'll' ? 'Loading List' : 'Delivery Receipt'}</h3>
                            <button onClick={() => setIsPrintModalOpen(false)} className="hover:text-blue-200"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {printForm.type !== 'll' && (
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-sm font-medium text-slate-700">Select Printer</label>
                                    <select value={printForm.printer} onChange={e => setPrintForm({ ...printForm, printer: e.target.value })} className="col-span-2 p-2 border border-slate-300 rounded outline-none text-sm bg-white">
                                        <option value="inkjet">Ink Jet / Laser</option>
                                        <option value="dotmatrix">Dot Matrix</option>
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-sm font-medium text-slate-700">{printForm.type === 'll' ? 'Headings' : 'DR Number'}</label>
                                <input type="text" value={printForm.dr_number} onChange={e => setPrintForm({ ...printForm, dr_number: e.target.value })} className="col-span-2 p-2 border border-slate-300 rounded outline-none text-sm" />
                            </div>
                            
                            <div className="grid grid-cols-3 items-start gap-4">
                                <label className="text-sm font-medium text-slate-700 pt-2">Address</label>
                                <textarea rows={2} value={printForm.address} onChange={e => setPrintForm({ ...printForm, address: e.target.value })} className="col-span-2 p-2 border border-slate-300 rounded outline-none text-sm resize-none" />
                            </div>
                            
                            {printForm.type !== 'll' && (
                                <>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-sm font-medium text-slate-700">Contact Person</label>
                                        <input type="text" value={printForm.contact_person} onChange={e => setPrintForm({ ...printForm, contact_person: e.target.value })} className="col-span-2 p-2 border border-slate-300 rounded outline-none text-sm" />
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label className="text-sm font-medium text-slate-700">Contact Number</label>
                                        <input type="text" value={printForm.contact_number} onChange={e => setPrintForm({ ...printForm, contact_number: e.target.value })} className="col-span-2 p-2 border border-slate-300 rounded outline-none text-sm" />
                                    </div>
                                </>
                            )}

                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-sm font-medium text-slate-700">Items Per Page</label>
                                <input type="number" value={printForm.items_per_page} onChange={e => setPrintForm({ ...printForm, items_per_page: parseInt(e.target.value) || 5 })} className="col-span-2 p-2 border border-slate-300 rounded outline-none text-sm" />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button onClick={() => setIsPrintModalOpen(false)} className="px-5 py-2 border border-slate-300 rounded text-slate-700 text-sm font-medium hover:bg-slate-100">Cancel</button>
                            <button
                                onClick={() => {
                                    // 1. Generate the correct URL based on the selected print type
                                    const url = printForm.type === 'll'
                                        ? `/print/ll/${selectedDelivery?.delivery_id}?headings=${encodeURIComponent(printForm.dr_number)}&address=${encodeURIComponent(printForm.address)}&limit=${printForm.items_per_page}`
                                        : `/print/dr/${selectedDelivery?.delivery_id}?printer=${printForm.printer}&dr=${printForm.dr_number}&address=${encodeURIComponent(printForm.address)}&person=${encodeURIComponent(printForm.contact_person)}&contact=${encodeURIComponent(printForm.contact_number)}&limit=${printForm.items_per_page}`;
                                    
                                    // 2. Open the tab first
                                    window.open(url, '_blank');
                                    
                                    // 3. Then close the modal
                                    setIsPrintModalOpen(false);
                                }}
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm font-medium shadow-sm"
                            >
                                Print Document
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PHASE 4 COMPLETE MODAL */}
            {isCompleteModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white">
                            <h3 className="font-bold text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5"/> Accomplishment Report</h3>
                            <button onClick={() => setIsCompleteModalOpen(false)} className="hover:text-indigo-200"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleCompleteDelivery} className="p-6 space-y-4">
                            <div className="bg-indigo-50 text-indigo-800 p-3 rounded-lg text-xs font-medium mb-4">
                                Submitting this report will mark the Job Order as Completed and automatically deduct the items from the Project Manager's pending inventory.
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Signed Delivery Receipt (Photo)</label>
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={e => setDrFile(e.target.files ? e.target.files[0] : null)} 
                                    className="w-full p-2 border border-slate-300 rounded outline-none text-sm bg-slate-50 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200" 
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Crew Notes / Exceptions</label>
                                <textarea 
                                    rows={4} 
                                    value={completeNotes} 
                                    onChange={e => setCompleteNotes(e.target.value)} 
                                    className="w-full p-3 border border-slate-300 rounded outline-none focus:border-indigo-500 text-sm resize-none" 
                                    placeholder="Enter any notes from the installation, missing items, or client remarks..." 
                                />
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                                <button type="button" onClick={() => setIsCompleteModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700">Submit Report</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}