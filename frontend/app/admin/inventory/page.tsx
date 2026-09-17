'use client';

import { useState, useEffect } from 'react';
import { Package, Plus, PackagePlus, Search, ArrowLeft, X, Save, Edit2, History, Image as ImageIcon, ClipboardCheck, Eye } from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function InventoryPage() {
    // MRF Notification States
    const [pendingMRFs, setPendingMRFs] = useState<any[]>([]);
    const [isMRFPanelOpen, setIsMRFPanelOpen] = useState(false);
    const [selectedMRF, setSelectedMRF] = useState<any>(null);
    const [mrfItems, setMrfItems] = useState<any[]>([]);
    const [username, setUsername] = useState('Warehouse Admin');

    // MRF History States
    const [mrfHistory, setMrfHistory] = useState<any[]>([]);
    const [isMrfHistoryModalOpen, setIsMrfHistoryModalOpen] = useState(false);
    const [selectedHistoryMRF, setSelectedHistoryMRF] = useState<any>(null); // To view items of a past MRF
    const [historyItems, setHistoryItems] = useState<any[]>([]);

    // Inventory States
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddStockModalOpen, setIsAddStockModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [stockHistory, setStockHistory] = useState<any[]>([]);

    // Forms
    const [createForm, setCreateForm] = useState({ dbos_code: '', inventory_name: '', description: '' });
    const [imageFile, setImageFile] = useState<File | null>(null);
    
    const [editForm, setEditForm] = useState({ inventory_name: '', description: '', is_active: true });
    const [stockForm, setStockForm] = useState({ supplier_id: 0, supplier_product_id: 0, qty_added: 0, uom_id: 1, remarks: '' });

    // History Edit Form
    const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
    const [historyEditForm, setHistoryEditForm] = useState({ qty_added: 0, remarks: '' });

    const [suppliers, setSuppliers] = useState<any[]>([]);

    // Fetch Functions
    const fetchInventory = async () => {
        try {
            const res = await fetch(`${API_URL}/api/inventory`);
            if (res.ok) setInventory(await res.json());
        } catch (err) {} finally { setLoading(false); }
    };

    const fetchSuppliers = async () => {
        try {
            const res = await fetch(`${API_URL}/api/companies`);
            if (res.ok) setSuppliers(await res.json());
        } catch (err) {}
    };

    const fetchPendingMRFs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/warehouse/mrfs/pending`);
            if (res.ok) setPendingMRFs(await res.json());
        } catch (err) {}
    };

    const fetchMRFHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/api/warehouse/mrfs/history`);
            if (res.ok) setMrfHistory(await res.json());
        } catch (err) {}
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('username');
        if (storedUser) setUsername(storedUser);
        
        fetchInventory();
        fetchSuppliers();
        fetchPendingMRFs();
        fetchMRFHistory();
    }, []);

    const handleCreateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('dbos_code', createForm.dbos_code);
        formData.append('inventory_name', createForm.inventory_name);
        formData.append('description', createForm.description);
        if (imageFile) formData.append('image', imageFile);

        try {
            const res = await fetch(`${API_URL}/api/inventory`, { method: 'POST', body: formData });
            if (res.ok) {
                setIsCreateModalOpen(false);
                setCreateForm({ dbos_code: '', inventory_name: '', description: '' });
                setImageFile(null);
                fetchInventory();
            } else { alert("DBOS Code must be unique."); }
        } catch (err) { alert("Error connecting to server."); }
    };

    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editForm.is_active && selectedItem.qty_on_hand > 0) {
            return alert("Cannot deactivate item. Quantity on hand must be exactly 0.");
        }

        const formData = new FormData();
        formData.append('inventory_name', editForm.inventory_name);
        formData.append('description', editForm.description);
        formData.append('is_active', editForm.is_active.toString());
        if (imageFile) formData.append('image', imageFile);

        try {
            const res = await fetch(`${API_URL}/api/inventory/${selectedItem.inventory_id}`, { method: 'PUT', body: formData });
            if (res.ok) {
                setIsEditModalOpen(false);
                setImageFile(null);
                fetchInventory();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update item.");
            }
        } catch (err) { alert("Error connecting to server."); }
    };

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/inventory/${selectedItem.inventory_id}/add-stock`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stockForm)
            });
            if (res.ok) {
                setIsAddStockModalOpen(false);
                setStockForm({ supplier_id: 0, supplier_product_id: 0, qty_added: 0, uom_id: 1, remarks: '' });
                fetchInventory();
            }
        } catch (err) { alert("Error adding stock."); }
    };

    const openHistory = async (item: any) => {
        setSelectedItem(item);
        try {
            const res = await fetch(`${API_URL}/api/inventory/${item.inventory_id}/history`);
            if (res.ok) setStockHistory(await res.json());
        } catch (err) {}
        setIsHistoryModalOpen(true);
    };

    const handleUpdateHistoryRecord = async (addID: number) => {
        try {
            const res = await fetch(`${API_URL}/api/inventory/history/${addID}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(historyEditForm)
            });
            if (res.ok) {
                setEditingHistoryId(null);
                openHistory(selectedItem);
                fetchInventory();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (err) { alert("Error updating stock record."); }
    };

    const openMRFFulfillment = async (mrf: any) => {
        setSelectedMRF(mrf);
        try {
            const res = await fetch(`${API_URL}/api/warehouse/mrfs/${mrf.mrf_id}/items`);
            if (res.ok) setMrfItems(await res.json());
        } catch (err) {}
    };

    const handleApproveMRF = async () => {
        try {
            const res = await fetch(`${API_URL}/api/warehouse/mrfs/fulfill`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mrf_id: selectedMRF.mrf_id,
                    project_id: selectedMRF.project_id,
                    approved_by: username,
                    items: mrfItems
                })
            });
            if (res.ok) {
                alert("MRF Approved! Stock has been deducted.");
                setSelectedMRF(null);
                fetchPendingMRFs();
                fetchMRFHistory();
                fetchInventory();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (err) { alert("Error fulfilling MRF"); }
    };

    const viewHistoryMRFItems = async (mrf: any) => {
        setSelectedHistoryMRF(mrf);
        try {
            const res = await fetch(`${API_URL}/api/warehouse/mrfs/${mrf.mrf_id}/items`);
            if (res.ok) setHistoryItems(await res.json());
        } catch (err) {}
    };

    const filteredInventory = inventory?.filter(item => 
        item.inventory_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.dbos_code.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="bg-slate-50 min-h-screen pb-12 w-full flex flex-col items-center">
            
            <div className="w-full px-8 max-w-[1600px] flex flex-col gap-6 pt-4">
                
                {/* Header Banner */}
                <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-md w-full relative">
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
                    </Link>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Package className="h-6 w-6 text-blue-400" /> Master Inventory
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Manage stock levels, components, and inbound deliveries</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {/* MRF HISTORY BUTTON */}
                            <button 
                                onClick={() => setIsMrfHistoryModalOpen(true)} 
                                className="flex items-center gap-2 p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 font-medium text-sm"
                                title="MRF History"
                            >
                                <ClipboardCheck className="h-5 w-5" />
                                <span className="hidden sm:inline">MRF History</span>
                            </button>

                            {/* NOTIFICATION BELL */}
                            <button 
                                onClick={() => setIsMRFPanelOpen(!isMRFPanelOpen)} 
                                className="relative p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                {pendingMRFs.length > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-lg animate-pulse">
                                        {pendingMRFs.length}
                                    </span>
                                )}
                            </button>

                            <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 shadow-sm">
                                <Plus className="h-4 w-4" /> New Item Code
                            </button>
                        </div>
                    </div>

                    {/* MRF NOTIFICATION DROPDOWN PANEL */}
                    {isMRFPanelOpen && (
                        <div className="absolute top-24 right-8 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-40 overflow-hidden text-slate-800">
                            <div className="bg-slate-100 p-4 border-b border-slate-200 flex justify-between items-center">
                                <h3 className="font-bold">Pending Requisitions (MRF)</h3>
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">{pendingMRFs.length}</span>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {pendingMRFs.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400 text-sm italic">No pending MRFs.</div>
                                ) : pendingMRFs.map(mrf => (
                                    <div key={mrf.mrf_id} className="p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => { setIsMRFPanelOpen(false); openMRFFulfillment(mrf); }}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-blue-600">{mrf.mrf_number}</span>
                                            <span className="text-xs text-slate-400">{mrf.date_requested.split('T')[0]}</span>
                                        </div>
                                        <div className="font-medium text-sm text-slate-700">{mrf.project_name}</div>
                                        <div className="text-xs text-slate-500 mt-1">Requested by: {mrf.requested_by}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Table Container */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full">
                    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="text" placeholder="Search by name or code..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Image</th>
                                    <th className="px-6 py-4 font-medium">DBOS Code</th>
                                    <th className="px-6 py-4 font-medium">Item Name</th>
                                    <th className="px-6 py-4 font-medium text-center">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Qty On Hand</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading inventory...</td></tr>
                                ) : filteredInventory.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No inventory items found.</td></tr>
                                ) : filteredInventory.map(item => (
                                    <tr key={item.inventory_id} className={`border-b border-slate-100 transition-colors ${!item.is_active ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50'}`}>
                                        <td className="px-6 py-4">
                                            {item.image_path ? (
                                                <img src={`${API_URL}${item.image_path}`} alt="Item" className="h-12 w-12 object-cover rounded border border-slate-200" />
                                            ) : (
                                                <div className="h-12 w-12 bg-slate-100 rounded border border-slate-200 flex items-center justify-center"><ImageIcon className="h-5 w-5 text-slate-300" /></div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{item.dbos_code}</td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{item.inventory_name}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-xs">{item.description}</div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {!item.is_active ? (
                                                 <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 text-slate-600">Inactive</span>
                                            ) : (
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.qty_on_hand > 10 ? 'bg-emerald-100 text-emerald-700' : item.qty_on_hand > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                    {item.qty_on_hand > 10 ? 'In Stock' : item.qty_on_hand > 0 ? 'Low Stock' : 'Out of Stock'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-lg text-slate-800">
                                            {item.qty_on_hand}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openHistory(item)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="View History"><History className="h-4 w-4" /></button>
                                                <button onClick={() => { setSelectedItem(item); setEditForm({ inventory_name: item.inventory_name, description: item.description, is_active: item.is_active }); setImageFile(null); setIsEditModalOpen(true); }} className="p-1.5 text-slate-600 hover:bg-slate-200 rounded" title="Edit Item"><Edit2 className="h-4 w-4" /></button>
                                                <button onClick={() => { setSelectedItem(item); setIsAddStockModalOpen(true); }} disabled={!item.is_active} className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded disabled:opacity-50 border border-emerald-200">
                                                    <PackagePlus className="h-4 w-4" /> Receive
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* CREATE MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-4 bg-blue-600 flex justify-between items-center text-white"><h3 className="font-bold">Create Item</h3><button onClick={() => setIsCreateModalOpen(false)}><X className="h-5 w-5"/></button></div>
                        <form onSubmit={handleCreateItem} className="p-6 space-y-4">
                            <div><label className="block text-sm font-semibold mb-1">DBOS Code *</label><input required value={createForm.dbos_code} onChange={e => setCreateForm({...createForm, dbos_code: e.target.value})} className="w-full p-2 border rounded" /></div>
                            <div><label className="block text-sm font-semibold mb-1">Item Name *</label><input required value={createForm.inventory_name} onChange={e => setCreateForm({...createForm, inventory_name: e.target.value})} className="w-full p-2 border rounded" /></div>
                            <div><label className="block text-sm font-semibold mb-1">Description</label><textarea value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} className="w-full p-2 border rounded resize-none" /></div>
                            <div><label className="block text-sm font-semibold mb-1">Image</label><input type="file" accept="image/*" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded" /></div>
                            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Save</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {isEditModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-4 bg-slate-800 flex justify-between items-center text-white"><h3 className="font-bold">Edit Item: {selectedItem.dbos_code}</h3><button onClick={() => setIsEditModalOpen(false)}><X className="h-5 w-5"/></button></div>
                        <form onSubmit={handleUpdateItem} className="p-6 space-y-4">
                            <div><label className="block text-sm font-semibold mb-1">Item Name *</label><input required value={editForm.inventory_name} onChange={e => setEditForm({...editForm, inventory_name: e.target.value})} className="w-full p-2 border rounded" /></div>
                            <div><label className="block text-sm font-semibold mb-1">Description</label><textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-2 border rounded resize-none" /></div>
                            <div><label className="block text-sm font-semibold mb-1">Update Image</label><input type="file" accept="image/*" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded" /></div>
                            <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 border rounded">
                                <input type="checkbox" id="activeToggle" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="h-4 w-4" />
                                <label htmlFor="activeToggle" className="text-sm font-semibold">Active Item</label>
                            </div>
                            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button><button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded">Update</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* RECEIVE STOCK MODAL */}
            {isAddStockModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="p-4 bg-emerald-600 flex justify-between items-center text-white"><h3 className="font-bold">Receive Stock</h3><button onClick={() => setIsAddStockModalOpen(false)}><X className="h-5 w-5"/></button></div>
                        <form onSubmit={handleAddStock} className="p-6 space-y-4">
                            <div><label className="block text-sm font-semibold mb-1">Supplier *</label>
                                <select required value={stockForm.supplier_id} onChange={e => setStockForm({...stockForm, supplier_id: parseInt(e.target.value)})} className="w-full p-2 border rounded">
                                    <option value="0">Select Supplier...</option>
                                    {(suppliers || [])
                                        .filter(s => s.company_type === 'Supplier Local' || s.company_type === 'Supplier International')
                                        .map(s => <option key={s.company_id} value={s.company_id}>{s.company_name}</option>)}
                                </select>
                            </div>
                            <div><label className="block text-sm font-semibold mb-1">Quantity Added *</label><input required type="number" step="0.01" value={stockForm.qty_added || ''} onChange={e => setStockForm({...stockForm, qty_added: parseFloat(e.target.value)})} className="w-full p-2 border rounded" /></div>
                            <div><label className="block text-sm font-semibold mb-1">Remarks</label><textarea value={stockForm.remarks} onChange={e => setStockForm({...stockForm, remarks: e.target.value})} className="w-full p-2 border rounded" /></div>
                            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsAddStockModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button><button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded">Confirm Delivery</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* HISTORY MODAL WITH INLINE EDITING */}
            {isHistoryModalOpen && selectedItem && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-4 bg-blue-600 flex justify-between items-center text-white shrink-0">
                            <div><h3 className="font-bold text-lg">Stock History</h3><p className="text-xs text-blue-100">{selectedItem.dbos_code} - {selectedItem.inventory_name}</p></div>
                            <button onClick={() => setIsHistoryModalOpen(false)}><X className="h-6 w-6"/></button>
                        </div>
                        <div className="overflow-y-auto p-4">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                    <tr><th className="p-3">Date</th><th className="p-3">Supplier</th><th className="p-3 text-center">Qty Added</th><th className="p-3">Remarks</th><th className="p-3 text-right">Action</th></tr>
                                </thead>
                                <tbody>
                                    {stockHistory.length === 0 ? (<tr><td colSpan={5} className="p-6 text-center text-slate-400">No stock history recorded.</td></tr>) : stockHistory.map(h => (
                                        <tr key={h.add_inventory_id} className="border-b border-slate-100">
                                            <td className="p-3">{h.date_added.split('T')[0]}</td>
                                            <td className="p-3">{h.supplier_name}</td>
                                            {editingHistoryId === h.add_inventory_id ? (
                                                <>
                                                    <td className="p-2 text-center"><input type="number" step="0.01" value={historyEditForm.qty_added} onChange={e => setHistoryEditForm({...historyEditForm, qty_added: parseFloat(e.target.value) || 0})} className="w-24 p-1 border rounded text-center" /></td>
                                                    <td className="p-2"><input type="text" value={historyEditForm.remarks} onChange={e => setHistoryEditForm({...historyEditForm, remarks: e.target.value})} className="w-full p-1 border rounded" /></td>
                                                    <td className="p-2 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <button onClick={() => handleUpdateHistoryRecord(h.add_inventory_id)} className="p-1.5 bg-emerald-100 text-emerald-700 rounded"><Save className="h-4 w-4"/></button>
                                                            <button onClick={() => setEditingHistoryId(null)} className="p-1.5 bg-slate-100 text-slate-600 rounded"><X className="h-4 w-4"/></button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="p-3 text-center font-bold text-emerald-600">+{h.qty_added}</td>
                                                    <td className="p-3 text-slate-500">{h.remarks}</td>
                                                    <td className="p-3 text-right"><button onClick={() => {setEditingHistoryId(h.add_inventory_id); setHistoryEditForm({ qty_added: h.qty_added, remarks: h.remarks });}} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="h-4 w-4"/></button></td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* THE MRF FULFILLMENT MODAL */}
            {selectedMRF && (
                <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b flex justify-between items-center bg-blue-600 text-white rounded-t-xl shrink-0">
                            <div>
                                <h3 className="font-bold text-lg">Fulfill Material Requisition</h3>
                                <p className="text-blue-100 text-sm">MRF No: {selectedMRF.mrf_number} | Project: {selectedMRF.project_name}</p>
                            </div>
                            <button onClick={() => setSelectedMRF(null)} className="hover:text-blue-200 transition-colors"><X className="h-6 w-6" /></button>
                        </div>
                        
                        <div className="overflow-y-auto p-6 bg-slate-50 flex-1">
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">DBOS Code</th>
                                            <th className="px-4 py-3 font-medium">Inventory Item</th>
                                            <th className="px-4 py-3 font-medium text-center">Requested</th>
                                            <th className="px-4 py-3 font-medium text-center">In Stock</th>
                                            <th className="px-4 py-3 font-medium text-center">Qty to Issue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mrfItems.map((item, index) => (
                                            <tr key={item.mrf_item_id} className={`border-b border-slate-100 ${item.qty_on_hand < item.qty_requested ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                                                <td className="px-4 py-3 font-bold text-slate-700">{item.dbos_code}</td>
                                                <td className="px-4 py-3 font-medium">{item.inventory_name}</td>
                                                <td className="px-4 py-3 text-center font-bold text-blue-600">{item.qty_requested}</td>
                                                <td className={`px-4 py-3 text-center font-bold ${item.qty_on_hand < item.qty_requested ? 'text-red-600' : 'text-emerald-600'}`}>
                                                    {item.qty_on_hand}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <input 
                                                        type="number" 
                                                        step="0.01"
                                                        max={item.qty_on_hand} 
                                                        value={item.qty_issued} 
                                                        onChange={(e) => {
                                                            const newItems = [...mrfItems];
                                                            newItems[index].qty_issued = parseFloat(e.target.value) || 0;
                                                            setMrfItems(newItems);
                                                        }}
                                                        className={`w-24 p-1.5 border rounded text-center font-bold outline-none focus:ring-2 ${item.qty_on_hand < item.qty_requested ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-200'}`} 
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            
                            {mrfItems.some(i => i.qty_on_hand < i.qty_requested) && (
                                <div className="mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                                    <strong>Warning:</strong> Some items have insufficient stock. They will only be partially issued, or you need to receive a PO delivery first.
                                </div>
                            )}
                        </div>

                        <div className="p-5 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 rounded-b-xl">
                            <button onClick={() => setSelectedMRF(null)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Close</button>
                            <button onClick={handleApproveMRF} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2">
                                <Package className="h-4 w-4"/> Issue Materials & Approve MRF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MRF HISTORY LIST MODAL */}
            {isMrfHistoryModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b flex justify-between items-center bg-slate-800 text-white rounded-t-xl shrink-0">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5" /> Fulfillment History</h3>
                                <p className="text-slate-300 text-sm">Log of all processed Material Requisition Forms</p>
                            </div>
                            <button onClick={() => setIsMrfHistoryModalOpen(false)} className="hover:text-slate-300 transition-colors"><X className="h-6 w-6" /></button>
                        </div>
                        
                        <div className="overflow-y-auto p-0 bg-slate-50 flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 font-bold">MRF No.</th>
                                        <th className="px-6 py-3 font-bold">Project</th>
                                        <th className="px-6 py-3 font-bold">Date</th>
                                        <th className="px-6 py-3 font-bold">Requested By</th>
                                        <th className="px-6 py-3 font-bold">Processed By</th>
                                        <th className="px-6 py-3 font-bold text-center">Status</th>
                                        <th className="px-6 py-3 font-bold text-right">View</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mrfHistory.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No history available.</td></tr>
                                    ) : mrfHistory.map(mrf => (
                                        <tr key={mrf.mrf_id} className="border-b border-slate-100 hover:bg-white transition-colors">
                                            <td className="px-6 py-3 font-bold text-blue-600">{mrf.mrf_number}</td>
                                            <td className="px-6 py-3 font-medium text-slate-800">{mrf.project_name}</td>
                                            <td className="px-6 py-3 text-slate-600">{mrf.date_requested.split('T')[0]}</td>
                                            <td className="px-6 py-3 text-slate-600">{mrf.requested_by}</td>
                                            <td className="px-6 py-3 font-medium text-emerald-700">{mrf.approved_by}</td>
                                            <td className="px-6 py-3 text-center">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${mrf.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {mrf.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button onClick={() => viewHistoryMRFItems(mrf)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"><Eye className="h-5 w-5" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* READ-ONLY VIEW OF HISTORY ITEMS */}
            {selectedHistoryMRF && (
                <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[80vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-blue-600 text-white rounded-t-xl shrink-0">
                            <div>
                                <h3 className="font-bold">Items Issued: {selectedHistoryMRF.mrf_number}</h3>
                                <p className="text-blue-100 text-xs">Project: {selectedHistoryMRF.project_name}</p>
                            </div>
                            <button onClick={() => setSelectedHistoryMRF(null)} className="hover:text-blue-200 transition-colors"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="overflow-y-auto p-4 bg-slate-50 flex-1">
                            {selectedHistoryMRF.status === 'Partial' && (
                                <div className="mb-4 p-3 bg-orange-100 border border-orange-200 text-orange-800 rounded-lg text-sm flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    <strong>Partial Fulfillment:</strong> This MRF contains shortages. Purchasing must canvas and buy the remaining items.
                                </div>
                            )}

                            <table className="w-full text-left text-sm bg-white rounded-lg shadow-sm border border-slate-200">
                                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 font-bold">DBOS Code</th>
                                        <th className="px-4 py-3 font-bold">Inventory Item</th>
                                        <th className="px-4 py-3 font-bold text-center">Requested</th>
                                        <th className="px-4 py-3 font-bold text-center">Issued</th>
                                        <th className="px-4 py-3 font-bold text-center">Shortage (To Buy)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyItems.map((item) => {
                                        const shortage = item.qty_requested - item.qty_issued;
                                        return (
                                            <tr key={item.mrf_item_id} className={`border-b border-slate-100 ${shortage > 0 ? 'bg-red-50/50' : ''}`}>
                                                <td className="px-4 py-3 font-bold text-slate-700">{item.dbos_code}</td>
                                                <td className="px-4 py-3 font-medium">{item.inventory_name}</td>
                                                <td className="px-4 py-3 text-center text-slate-500 font-bold">{item.qty_requested}</td>
                                                <td className="px-4 py-3 text-center font-bold text-emerald-600">{item.qty_issued}</td>
                                                <td className="px-4 py-3 text-center font-bold">
                                                    {shortage > 0 ? (
                                                        <span className="text-red-600">{shortage}</span>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}