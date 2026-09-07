'use client';

import { useState, useEffect } from 'react';
import { Truck, Plus, Trash2, List, FileText, X, Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Edit2, Package } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DeliveryPage() {
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    const [viewType, setViewType] = useState<number>(1); // 1 = Loading List, 0 = DR
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    // Phase 2 Modal State
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedDelivery, setSelectedDelivery] = useState<any>(null);

    // Delivery Item State
    const [drItems, setDrItems] = useState<any[]>([]);
    const [llItems, setLlItems] = useState<any[]>([]);
    const [availableProjItems, setAvailableProjItems] = useState<any[]>([]);
    
    const [drSearchTerm, setDrSearchTerm] = useState("");
    const [llSearchTerm, setLlSearchTerm] = useState("");

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
        printer: 'inkjet',
        dr_number: '',
        address: '',
        contact_person: '',
        contact_number: '',
        items_per_page: 5
    });

    // Filter, Sort, Pagination State
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
            if (res.ok) {
                const data = await res.json();
                setDeliveries(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchDeliveries();
        fetch(`${API_URL}/api/projects`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setProjects(data);
                else if (data && Array.isArray(data.data)) setProjects(data.data);
                else setProjects([]);
            })
            .catch(() => setProjects([]));
    }, []);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [viewType, searchTerm, filterProjectId]);

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
                is_loading_list: viewType
            })
        });

        setIsAddModalOpen(false);
        fetchDeliveries();
    };

    // Fetch modal data when it opens
    useEffect(() => {
        if (isManageModalOpen && selectedDelivery) {
            // Fetch available project items for BOTH DR and Loading List
            fetch(`${API_URL}/api/projects/${selectedDelivery.project_id}/available-items`)
                .then(res => res.json()).then(data => setAvailableProjItems(Array.isArray(data) ? data : []));

            if (selectedDelivery.is_loading_list === 0) {
                fetch(`${API_URL}/api/deliveries/${selectedDelivery.delivery_id}/items`)
                    .then(res => res.json()).then(data => setDrItems(Array.isArray(data) ? data : []));
            } else {
                fetch(`${API_URL}/api/loading-lists/${selectedDelivery.delivery_id}/items`)
                    .then(res => res.json()).then(data => setLlItems(Array.isArray(data) ? data : []));
            }
        } else {
            setDrItems([]); setLlItems([]); setAvailableProjItems([]);
            setItemForm({ delivery_item_id: 0, project_item_id: 0, deliver_qty: 1, remarks: '' });
        }
    }, [isManageModalOpen, selectedDelivery]);

    // --- DR Item Handlers ---
    const handleSaveDRItem = async (e: React.FormEvent) => {
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
                .then(r => r.json()).then(d => setDrItems(Array.isArray(d) ? d : []));
            fetch(`${API_URL}/api/projects/${selectedDelivery.project_id}/available-items`)
                .then(r => r.json()).then(d => setAvailableProjItems(Array.isArray(d) ? d : []));
        } else {
            const err = await res.json();
            alert(err.error || "Failed to save item");
        }
    };

    const handleDeleteDRItem = async (id: number) => {
        if (!confirm("Remove this item from the delivery?")) return;
        await fetch(`${API_URL}/api/deliveries/items/${id}`, { method: 'DELETE' });
        fetch(`${API_URL}/api/deliveries/${selectedDelivery.delivery_id}/items`)
            .then(r => r.json()).then(d => setDrItems(Array.isArray(d) ? d : []));
        fetch(`${API_URL}/api/projects/${selectedDelivery.project_id}/available-items`)
            .then(r => r.json()).then(d => setAvailableProjItems(Array.isArray(d) ? d : []));
    };

    // --- Loading List Handlers ---
    const handleSaveLLItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (itemForm.project_item_id === 0) return alert("Select an item");
        
        await fetch(`${API_URL}/api/loading-lists/items`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
                delivery_id: selectedDelivery.delivery_id,
                project_item_id: itemForm.project_item_id,
                deliver_qty: itemForm.deliver_qty
            }) 
        });

        setItemForm({ delivery_item_id: 0, project_item_id: 0, deliver_qty: 1, remarks: '' });
        fetch(`${API_URL}/api/loading-lists/${selectedDelivery.delivery_id}/items`)
            .then(r => r.json()).then(d => setLlItems(Array.isArray(d) ? d : []));
    };

    const handleDeleteLLItem = async (id: number) => {
        if (!confirm("Remove this component from the loading list?")) return;
        await fetch(`${API_URL}/api/loading-lists/items/${id}`, { method: 'DELETE' });
        fetch(`${API_URL}/api/loading-lists/${selectedDelivery.delivery_id}/items`)
            .then(r => r.json()).then(d => setLlItems(Array.isArray(d) ? d : []));
    };

    const filteredDrItems = drItems.filter(i => i.product_name.toLowerCase().includes(drSearchTerm.toLowerCase()));
    
    const filteredLlItems = llItems.filter(i => 
        (i.product_name || '').toLowerCase().includes(llSearchTerm.toLowerCase()) || 
        (i.supplier_product_name || '').toLowerCase().includes(llSearchTerm.toLowerCase())
    );

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this record?")) return;
        await fetch(`${API_URL}/api/deliveries/${id}`, { method: 'DELETE' });
        fetchDeliveries();
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortField !== field) return <ChevronsUpDown className="h-3 w-3 text-slate-400 ml-1 inline" />;
        return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3 text-blue-600 ml-1 inline" /> : <ChevronDown className="h-3 w-3 text-blue-600 ml-1 inline" />;
    };

    // --- DATA PROCESSING (Filter -> Search -> Sort -> Paginate) ---
    const activeProjects = (Array.isArray(projects) ? projects : []).filter(p => p.project_status === 'On Going');
    let processed = (Array.isArray(deliveries) ? deliveries : []).filter(d => d.is_loading_list === viewType);

    if (filterProjectId !== "all") {
        processed = processed.filter(d => String(d.project_id) === filterProjectId);
    }

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
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(processed.length / itemsPerPage) || 1;
    const paginatedDeliveries = processed.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="bg-slate-50 min-h-screen pb-12 w-full">
            <div className="bg-slate-900 text-white p-8 rounded-b-3xl shadow-md mb-8">
                <div className="flex items-center gap-3">
                    <Truck className="h-8 w-8 text-blue-400" />
                    <h1 className="text-2xl font-bold">Logistics & Delivery</h1>
                </div>
                <p className="text-slate-400 text-sm mt-2">Manage Loading Lists and Delivery Receipts</p>
            </div>

            <div className="px-8 w-full mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
                        {/* View Tabs */}
                        <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm shrink-0">
                            <button
                                onClick={() => setViewType(1)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewType === 1 ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <List className="h-4 w-4" /> Loading Lists
                            </button>
                            <button
                                onClick={() => setViewType(0)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewType === 0 ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <FileText className="h-4 w-4" /> Delivery Receipts
                            </button>
                        </div>

                        {/* Filters & Actions */}
                        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search records..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                                />
                            </div>

                            <div className="relative w-full md:w-64">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <select
                                    value={filterProjectId}
                                    onChange={e => setFilterProjectId(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 appearance-none bg-white"
                                >
                                    <option value="all">All Projects</option>
                                    {activeProjects.map(p => (
                                        <option key={p.projects_id} value={p.projects_id}>{p.project_number} - {p.company_name}</option>
                                    ))}
                                </select>
                            </div>

                            <button onClick={() => setIsAddModalOpen(true)} className="flex shrink-0 items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm w-full md:w-auto justify-center">
                                <Plus className="h-4 w-4" /> Add {viewType === 1 ? 'Loading List' : 'DR'}
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 min-w-[800px]">
                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('delivery_date')}>
                                        Date <SortIcon field="delivery_date" />
                                    </th>
                                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('delivery_no')}>
                                        Number <SortIcon field="delivery_no" />
                                    </th>
                                    <th className="px-6 py-4 font-medium cursor-pointer hover:bg-slate-100" onClick={() => handleSort('company_name')}>
                                        Project & Client <SortIcon field="company_name" />
                                    </th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedDeliveries.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400">No records found matching your criteria.</td></tr>
                                ) : paginatedDeliveries.map(d => (
                                    <tr key={d.delivery_id} className="border-b border-slate-100 hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">{d.delivery_date}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">{d.delivery_no}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-900">{d.project_number}</div>
                                            <div className="font-medium text-slate-600">{d.company_name}</div>
                                            <div className="text-xs text-slate-400">{formatCurrency(d.contract_amount)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedDelivery(d);
                                                        setIsManageModalOpen(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                                                    title="Manage Items"
                                                >
                                                    <List className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => handleDelete(d.delivery_id)} className="text-red-600 hover:text-red-800 p-2 bg-red-50 hover:bg-red-100 rounded transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {processed.length > 0 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-sm text-slate-600 bg-white">
                            <div>
                                Showing <b>{((currentPage - 1) * itemsPerPage) + 1}</b> to <b>{Math.min(currentPage * itemsPerPage, processed.length)}</b> of <b>{processed.length}</b> entries
                            </div>
                            <div className="flex gap-1">
                                <button
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div className="px-3 py-1.5 font-medium">Page {currentPage} of {totalPages}</div>
                                <button
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    className="p-1.5 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ADD MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md my-8 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                            <h3 className="font-bold text-lg">New {viewType === 1 ? 'Loading List' : 'Delivery Receipt'}</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="hover:text-blue-200"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleAddDelivery} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                                <input required type="date" value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} className="w-full p-2 border border-slate-300 rounded outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Project</label>
                                <select required value={form.project_id} onChange={e => setForm({ ...form, project_id: parseInt(e.target.value) })} className="w-full p-2 border border-slate-300 rounded outline-none bg-white">
                                    <option value="0">Select On-Going Project...</option>
                                    {activeProjects.map(p => (
                                        <option key={p.projects_id} value={p.projects_id}>
                                            ({p.project_number}) {p.company_name}
                                        </option>
                                    ))}
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

            {/* PHASE 2 MANAGE ITEMS MODAL */}
            {isManageModalOpen && selectedDelivery && (
                <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
                        
                        {/* Modal Header */}
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white shrink-0">
                            <div>
                                <h3 className="font-bold text-lg">
                                    Manage {selectedDelivery.is_loading_list === 1 ? 'Loading List' : 'Delivery Receipt'} Items
                                </h3>
                                <p className="text-blue-100 text-xs">{selectedDelivery.delivery_no}</p>
                            </div>

                            <div className="flex gap-4 items-center">
                                {selectedDelivery.is_loading_list === 0 ? (
                                    <button onClick={() => { setPrintForm({ ...printForm, dr_number: selectedDelivery.delivery_no, printer: 'inkjet' }); setIsPrintModalOpen(true); }} className="bg-white text-blue-600 px-4 py-1.5 rounded text-sm font-bold shadow-sm hover:bg-blue-50 transition-colors">Print DR</button>
                                ) : (
                                    <button onClick={() => { setPrintForm({ ...printForm, dr_number: 'Delivery Loading List', printer: 'loadinglist' }); setIsPrintModalOpen(true); }} className="bg-white text-blue-600 px-4 py-1.5 rounded text-sm font-bold shadow-sm hover:bg-blue-50 transition-colors">Print LL</button>
                                )}
                                <button onClick={() => setIsManageModalOpen(false)} className="hover:text-blue-200"><X className="h-6 w-6" /></button>
                            </div>
                        </div>

                        {selectedDelivery.is_loading_list === 0 ? (
                            
                            // --- DELIVERY RECEIPT UI ---
                            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                                {/* Left Side: Add Form */}
                                <div className="w-full lg:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
                                    <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">
                                        {itemForm.delivery_item_id > 0 ? 'Edit Delivery Item' : 'Add Delivery Item'}
                                    </h4>
                                    <form onSubmit={handleSaveDRItem} className="space-y-4">
                                        {itemForm.delivery_item_id === 0 && (
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Select Project Item *</label>
                                                <select
                                                    required
                                                    value={itemForm.project_item_id}
                                                    onChange={e => {
                                                        const id = parseInt(e.target.value);
                                                        const selected = availableProjItems.find(i => i.project_items_id === id);
                                                        const max = selected ? selected.pending : 1;

                                                        if (max <= 0 && id !== 0) {
                                                            alert("All items for this product have already been delivered.");
                                                        }

                                                        setItemForm({ ...itemForm, project_item_id: id, deliver_qty: max > 0 ? 1 : 0 });
                                                        setMaxAllowedQty(max);
                                                    }}
                                                    className="w-full p-2 border border-slate-300 rounded outline-none text-sm bg-white"
                                                >
                                                    <option value="0">Select item to deliver...</option>
                                                    {availableProjItems.map(p => (
                                                        <option key={p.project_items_id} value={p.project_items_id}>
                                                            {p.product_name} (Pending: {p.pending} {p.uom_abbr})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                Delivery Qty {itemForm.delivery_item_id === 0 && <span className="text-orange-600 ml-1">(Max: {maxAllowedQty})</span>}
                                            </label>
                                            <input
                                                type="number"
                                                min={maxAllowedQty > 0 ? "1" : "0"}
                                                max={itemForm.delivery_item_id === 0 ? maxAllowedQty : undefined}
                                                required
                                                disabled={maxAllowedQty <= 0 && itemForm.project_item_id !== 0}
                                                value={itemForm.deliver_qty}
                                                onChange={e => setItemForm({ ...itemForm, deliver_qty: parseInt(e.target.value) || 0 })}
                                                className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Remarks (Optional)</label>
                                            <textarea
                                                rows={3}
                                                value={itemForm.remarks}
                                                disabled={maxAllowedQty <= 0 && itemForm.project_item_id !== 0}
                                                onChange={e => setItemForm({ ...itemForm, remarks: e.target.value })}
                                                className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 text-sm resize-none disabled:bg-slate-100"
                                                placeholder="Condition, box numbers, etc."
                                            />
                                        </div>

                                        <div className="flex gap-2 pt-2">
                                            {itemForm.delivery_item_id > 0 && (
                                                <button type="button" onClick={() => setItemForm({ delivery_item_id: 0, project_item_id: 0, deliver_qty: 1, remarks: '' })} className="flex-1 py-2 border border-slate-300 text-slate-600 rounded font-medium hover:bg-slate-100 transition-colors text-sm">Cancel</button>
                                            )}
                                            <button
                                                type="submit"
                                                disabled={maxAllowedQty <= 0 && itemForm.project_item_id !== 0}
                                                className={`flex-1 py-2 text-white rounded font-medium transition-colors shadow-sm text-sm ${maxAllowedQty <= 0 && itemForm.project_item_id !== 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                            >
                                                {itemForm.delivery_item_id > 0 ? 'Update Item' : 'Add to DR'}
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {/* Right Side: Added Items List */}
                                <div className="w-full lg:w-2/3 p-6 flex flex-col h-full bg-white overflow-hidden">
                                    <div className="flex justify-between items-center mb-4 shrink-0">
                                        <h4 className="font-bold text-slate-700">Items in this Delivery Receipt</h4>
                                        <div className="relative w-64">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <input type="text" placeholder="Search items..." value={drSearchTerm} onChange={e => setDrSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-left text-sm text-slate-600 relative">
                                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Item Name</th>
                                                    <th className="px-4 py-3 font-medium text-center">Qty</th>
                                                    <th className="px-4 py-3 font-medium">Remarks</th>
                                                    <th className="px-4 py-3 font-medium text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredDrItems.length === 0 ? (
                                                    <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">No items added to this receipt yet.</td></tr>
                                                ) : filteredDrItems.map(i => (
                                                    <tr key={i.delivery_item_id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium text-slate-800">{i.product_name}</td>
                                                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{i.deliver_qty} {i.uom_abbr}</td>
                                                        <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={i.remarks}>{i.remarks || '-'}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <button onClick={() => setItemForm({ ...i, project_item_id: i.project_item_id })} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 hover:bg-blue-100 rounded transition-colors"><Edit2 className="h-4 w-4" /></button>
                                                                <button onClick={() => handleDeleteDRItem(i.delivery_item_id)} className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            
                            // --- LOADING LIST UI ---
                            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                                {/* Left Side: Add Form */}
                                <div className="w-full lg:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
                                    <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">Add Components to Loading List</h4>
                                    <p className="text-xs text-slate-500 mb-4">Adding an item automatically fetches and calculates its sub-components.</p>
                                    <form onSubmit={handleSaveLLItem} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Select Project Item *</label>
                                            <select required value={itemForm.project_item_id} onChange={e => {
                                                const id = parseInt(e.target.value);
                                                const selected = availableProjItems.find(i => i.project_items_id === id);
                                                const max = selected ? selected.pending : 1;
                                                
                                                if (max <= 0 && id !== 0) {
                                                    alert("All items for this product have already been delivered.");
                                                }

                                                setItemForm({ ...itemForm, project_item_id: id, deliver_qty: max > 0 ? 1 : 0 });
                                                setMaxAllowedQty(max);
                                            }} className="w-full p-2 border border-slate-300 rounded outline-none text-sm bg-white">
                                                <option value="0">Select item to load...</option>
                                                {availableProjItems.map(p => (
                                                    <option key={p.project_items_id} value={p.project_items_id}>{p.product_name} (Pending: {p.pending})</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                Quantity <span className="text-orange-600 ml-1">(Max: {maxAllowedQty})</span>
                                            </label>
                                            <input 
                                                type="number" 
                                                min={maxAllowedQty > 0 ? "1" : "0"}
                                                max={maxAllowedQty}
                                                required 
                                                disabled={maxAllowedQty <= 0 && itemForm.project_item_id !== 0}
                                                value={itemForm.deliver_qty} 
                                                onChange={e => setItemForm({ ...itemForm, deliver_qty: parseInt(e.target.value) || 0 })} 
                                                className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 text-sm disabled:bg-slate-100 disabled:text-slate-400" 
                                            />
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={maxAllowedQty <= 0 && itemForm.project_item_id !== 0}
                                            className={`w-full py-2 text-white rounded font-medium transition-colors shadow-sm text-sm ${maxAllowedQty <= 0 && itemForm.project_item_id !== 0 ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                        >
                                            Explode & Add Components
                                        </button>
                                    </form>
                                </div>

                                {/* Right Side: Added Components */}
                                <div className="w-full lg:w-2/3 p-6 flex flex-col h-full bg-white overflow-hidden">
                                    <div className="flex justify-between items-center mb-4 shrink-0">
                                        <h4 className="font-bold text-slate-700">Exploded Loading List Components</h4>
                                        <div className="relative w-64">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                            <input type="text" placeholder="Search components..." value={llSearchTerm} onChange={e => setLlSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-sm outline-none" />
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg">
                                        <table className="w-full text-left text-sm text-slate-600 relative whitespace-nowrap">
                                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Project Item</th>
                                                    <th className="px-4 py-3 font-medium">Component</th>
                                                    <th className="px-4 py-3 font-medium text-center">Qty to Load</th>
                                                    <th className="px-4 py-3 font-medium text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredLlItems.length === 0 ? (
                                                    <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">No components loaded yet.</td></tr>
                                                ) : filteredLlItems.map(i => (
                                                    <tr key={i.loading_list_id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-medium text-slate-800">{i.product_name}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium">{i.supplier_product_name || 'Main Item (No Sub-components)'}</div>
                                                            <div className="text-xs text-slate-400 truncate max-w-[200px]">{i.prod_description}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-emerald-600">{i.item_qty}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button onClick={() => handleDeleteLLItem(i.loading_list_id)} className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* PRINT OPTION MODAL */}
            {isPrintModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
                            <h3 className="font-bold text-lg">Print Option</h3>
                            <button onClick={() => setIsPrintModalOpen(false)} className="hover:text-blue-200"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            
                            {/* Hide Printer Select for Loading Lists */}
                            {printForm.printer !== 'loadinglist' && (
                                <div className="grid grid-cols-3 items-center gap-4">
                                    <label className="text-sm font-medium text-slate-700">Select Printer</label>
                                    <select value={printForm.printer} onChange={e => setPrintForm({ ...printForm, printer: e.target.value })} className="col-span-2 p-2 border border-slate-300 rounded outline-none text-sm bg-white">
                                        <option value="inkjet">Ink Jet</option>
                                        <option value="dotmatrix">Dot Matrix</option>
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-3 items-center gap-4">
                                <label className="text-sm font-medium text-slate-700">
                                    {printForm.printer === 'loadinglist' ? 'Headings' : 'DR Number'}
                                </label>
                                <input type="text" value={printForm.dr_number} onChange={e => setPrintForm({ ...printForm, dr_number: e.target.value })} className="col-span-2 p-2 border border-slate-300 rounded outline-none text-sm" />
                            </div>
                            
                            <div className="grid grid-cols-3 items-start gap-4">
                                <label className="text-sm font-medium text-slate-700 pt-2">Address</label>
                                <textarea rows={2} value={printForm.address} onChange={e => setPrintForm({ ...printForm, address: e.target.value })} className="col-span-2 p-2 border border-slate-300 rounded outline-none text-sm resize-none" />
                            </div>
                            
                            {/* Hide Contacts for Loading Lists */}
                            {printForm.printer !== 'loadinglist' && (
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
                            <button onClick={() => setIsPrintModalOpen(false)} className="px-5 py-2 border border-slate-300 rounded text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors">Cancel</button>
                            <Link
                                href={printForm.printer === 'loadinglist'
                                    ? `/print/ll/${selectedDelivery?.delivery_id}?headings=${encodeURIComponent(printForm.dr_number)}&address=${encodeURIComponent(printForm.address)}&limit=${printForm.items_per_page}`
                                    : `/print/dr/${selectedDelivery?.delivery_id}?printer=${printForm.printer}&dr=${printForm.dr_number}&address=${encodeURIComponent(printForm.address)}&person=${encodeURIComponent(printForm.contact_person)}&contact=${encodeURIComponent(printForm.contact_number)}&limit=${printForm.items_per_page}`
                                }
                                target="_blank"
                                onClick={() => setIsPrintModalOpen(false)}
                                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded text-sm font-medium shadow-sm transition-colors"
                            >
                                Print
                            </Link>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}