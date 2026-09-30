'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, X, Plus, Search, ChevronDown, Edit2, Package, ClipboardCheck, Image as ImageIcon, Building2, History, Truck, Activity, Trash2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// --- CUSTOM SEARCHABLE DROPDOWN COMPONENT ---
interface SearchableDropdownProps {
    options: any[];
    value: any;
    onChange: (val: any) => void;
    onAddNew: (searchVal: string) => void;
    placeholder: string;
    disabled?: boolean;
    renderItem?: (item: any) => React.ReactNode;
}

const SearchableDropdown = ({ options, value, onChange, onAddNew, placeholder, disabled = false, renderItem }: SearchableDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) { setIsOpen(false); }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter((opt: any) => (opt.label || '').toLowerCase().includes(search.toLowerCase()));
    const selectedOption = options.find((opt: any) => opt.value === value);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div 
                className={`w-full p-2 border rounded text-sm bg-slate-50 flex justify-between items-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-blue-400'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={selectedOption ? 'text-slate-800' : 'text-slate-400'}>{selectedOption ? selectedOption.label : placeholder}</span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                    <div className="p-2 border-b border-slate-100">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input autoFocus type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-8 pr-2 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded outline-none focus:border-blue-400" />
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt: any) => (
                                <div key={opt.value} className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700" onClick={() => { onChange(opt.value); setIsOpen(false); setSearch(''); }}>
                                    {renderItem ? renderItem(opt.original) : opt.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-3 py-4 text-sm text-center text-slate-400">No results found.</div>
                        )}
                    </div>
                    <div className="p-2 border-t border-slate-100 bg-slate-50 text-blue-600 font-semibold text-sm flex items-center justify-center gap-1 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => { setIsOpen(false); onAddNew(search); setSearch(''); }}>
                        <Plus className="h-4 w-4" /> Add New
                    </div>
                </div>
            )}
        </div>
    );
};

export default function InventoryItemDetail() {
    const params = useParams();
    const router = useRouter();
    const itemId = params.id;

    const [activeTab, setActiveTab] = useState('details');
    const [loading, setLoading] = useState(true);
    const [inventoryItem, setInventoryItem] = useState<any>(null);
    
    // Left Panel Form States
    const [editForm, setEditForm] = useState({ inventory_name: '', description: '', is_active: true });
    const [imageFile, setImageFile] = useState<File | null>(null);
    
    // Tab 1: Metadata States (Other Details)
    const [globalAttributes, setGlobalAttributes] = useState<any[]>([]);
    const [globalClassifications, setGlobalClassifications] = useState<any[]>([]);
    const [itemAttributes, setItemAttributes] = useState<any[]>([]);
    const [itemClassifications, setItemClassifications] = useState<any[]>([]);
    const [newAttrModalOpen, setNewAttrModalOpen] = useState(false);
    const [newAttributeForm, setNewAttributeForm] = useState({ attribute_name: '', data_type: 'string' });
    const [newClassModalOpen, setNewClassModalOpen] = useState(false);
    const [newClassName, setNewClassName] = useState('');

    // Tab 2 & 3: Ledger and MRF History
    const [stockHistory, setStockHistory] = useState<any[]>([]);
    const [mrfHistory, setMrfHistory] = useState<any[]>([]);
    const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
    const [historyEditForm, setHistoryEditForm] = useState({ qty_change: 0, remarks: '' });

    // Tab 4: SUPPLIER STATES (Using Bridge Table)
    const [invSuppliers, setInvSuppliers] = useState<any[]>([]);
    const [catalogOptions, setCatalogOptions] = useState<any[]>([]);
    const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
    
    // Updated Form to strictly use the bridge table fields
    const [supplierForm, setSupplierForm] = useState({ supplier_product_id: '', lead_time_days: 0, moq: 1 });

    useEffect(() => { if (itemId) fetchAllData(); }, [itemId]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            const invRes = await fetch(`${API_URL}/api/inventory`);
            if (!invRes.ok) throw new Error("Failed to fetch inventory");
            const allItems = await invRes.json();
            const currentItem = allItems.find((i: any) => i.inventory_id.toString() === itemId);

            if (currentItem) {
                setInventoryItem(currentItem);
                setEditForm({ inventory_name: currentItem.inventory_name, description: currentItem.description, is_active: currentItem.is_active });
                
                const mappedAttrs = (currentItem.attributes || []).map((a: any) => ({ rowId: Math.random(), attribute_id: a.attribute_id, data_type: a.data_type, value: a.value }));
                mappedAttrs.push({ rowId: Date.now(), attribute_id: '', data_type: '', value: '' });
                setItemAttributes(mappedAttrs);

                const mappedClasses = (currentItem.classifications || []).map((c: any) => ({ rowId: Math.random(), classification_id: c.classification_id }));
                mappedClasses.push({ rowId: Date.now() + 1, classification_id: '' });
                setItemClassifications(mappedClasses);

                // Fetch secondary data concurrently
                const [attrRes, classRes, histRes, supRes, mrfRes, catRes] = await Promise.all([
                    fetch(`${API_URL}/api/attributes`),
                    fetch(`${API_URL}/api/classifications`),
                    fetch(`${API_URL}/api/inventory/${itemId}/ledger`),
                    fetch(`${API_URL}/api/inventory/${itemId}/suppliers`), // Fetching mapped suppliers from bridge table
                    fetch(`${API_URL}/api/inventory/${itemId}/mrfs`),
                    fetch(`${API_URL}/api/inventory/catalog/${encodeURIComponent(currentItem.dbos_code)}`) // Fetching catalog options
                ]);

                if (attrRes.ok) setGlobalAttributes(await attrRes.json());
                if (classRes.ok) setGlobalClassifications(await classRes.json());
                if (histRes.ok) setStockHistory(await histRes.json() || []);
                if (supRes.ok) setInvSuppliers(await supRes.json() || []);
                if (mrfRes.ok) setMrfHistory(await mrfRes.json() || []);
                if (catRes.ok) setCatalogOptions(await catRes.json() || []);
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleUpdateItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('inventory_name', editForm.inventory_name);
        formData.append('description', editForm.description);
        formData.append('is_active', editForm.is_active.toString());
        
        const validAttrs = itemAttributes.filter(a => a.attribute_id && a.value);
        const validClasses = itemClassifications.filter(c => c.classification_id).map(c => c.classification_id);
        
        formData.append('attributes', JSON.stringify(validAttrs));
        formData.append('classifications', JSON.stringify(validClasses));
        if (imageFile) formData.append('image', imageFile);

        try {
            const res = await fetch(`${API_URL}/api/inventory/${itemId}`, { method: 'PUT', body: formData });
            if (res.ok) {
                alert("Inventory updated successfully!");
                fetchAllData(); 
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update item.");
            }
        } catch (err) { alert("Error connecting to server."); }
    };

    const handleAttrSelect = (rowId: number, attributeId: number) => {
        setItemAttributes(prev => {
            const updated = [...prev];
            const index = updated.findIndex(r => r.rowId === rowId);
            const selectedAttr = globalAttributes.find(a => a.attribute_id === attributeId);
            if (index >= 0 && selectedAttr) {
                updated[index] = { ...updated[index], attribute_id: attributeId, data_type: selectedAttr.data_type };
                if (index === updated.length - 1) updated.push({ rowId: Date.now(), attribute_id: '', data_type: '', value: '' });
            }
            return updated;
        });
    };
    const handleAttrValueChange = (rowId: number, value: string) => setItemAttributes(prev => prev.map(row => row.rowId === rowId ? { ...row, value } : row));
    const removeAttrRow = (rowId: number) => setItemAttributes(prev => prev.filter(r => r.rowId !== rowId));

    const handleClassSelect = (rowId: number, classId: number) => {
        setItemClassifications(prev => {
            const updated = [...prev];
            const index = updated.findIndex(r => r.rowId === rowId);
            if (index >= 0) {
                updated[index] = { ...updated[index], classification_id: classId };
                if (index === updated.length - 1) updated.push({ rowId: Date.now(), classification_id: '' });
            }
            return updated;
        });
    };
    const removeClassRow = (rowId: number) => setItemClassifications(prev => prev.filter(r => r.rowId !== rowId));

    const handleUpdateHistoryRecord = async (ledgerID: number) => {
        try {
            const res = await fetch(`${API_URL}/api/inventory/history/${ledgerID}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(historyEditForm) });
            if (res.ok) {
                setEditingHistoryId(null);
                fetchAllData();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (err) { alert("Error updating ledger."); }
    };

    // --- SUPPLIER MAPPING HANDLERS (BRIDGE TABLE) ---
    const handleAddSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/inventory/suppliers`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    inventory_id: parseInt(itemId as string),
                    supplier_product_id: parseInt(supplierForm.supplier_product_id),
                    lead_time_days: supplierForm.lead_time_days,
                    moq: supplierForm.moq
                })
            });
            if (res.ok) {
                setIsAddSupplierOpen(false);
                setSupplierForm({ supplier_product_id: '', lead_time_days: 0, moq: 1 });
                fetchAllData();
            } else alert("Failed to add supplier mapping. It might already exist.");
        } catch (err) {}
    };

    const handleRemoveSupplier = async (mappingId: number) => {
        if (!confirm("Remove this supplier mapping?")) return;
        try {
            await fetch(`${API_URL}/api/inventory/suppliers/${mappingId}`, { method: 'DELETE' });
            fetchAllData();
        } catch (err) {}
    };

    const handleSetPreferred = async (mappingId: number) => {
        try {
            await fetch(`${API_URL}/api/inventory/${itemId}/suppliers/${mappingId}/preferred`, { method: 'PUT' });
            fetchAllData();
        } catch (err) {}
    };

    const handleQuickCreateAttribute = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/attributes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAttributeForm) });
            if (res.ok) {
                const newAttr = await res.json();
                setGlobalAttributes([...globalAttributes, newAttr]);
                setNewAttrModalOpen(false);
                setNewAttributeForm({ attribute_name: '', data_type: 'string' });
            }
        } catch (err) {}
    };

    const handleQuickCreateClassification = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`${API_URL}/api/classifications`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classification_name: newClassName }) });
            if (res.ok) {
                const newClass = await res.json();
                setGlobalClassifications([...globalClassifications, newClass]);
                setNewClassModalOpen(false);
                setNewClassName('');
            }
        } catch (err) {}
    };

    if (loading) return <div className="p-12 text-center text-slate-500">Loading item details...</div>;
    if (!inventoryItem) return <div className="p-12 text-center text-red-500">Item not found.</div>;

    const attrOptions = globalAttributes.map(a => ({ value: a.attribute_id, label: a.attribute_name, original: a }));
    const classOptions = globalClassifications.map(c => ({ value: c.classification_id, label: c.classification_name }));

    return (
        <div className="bg-slate-50 min-h-screen pb-12">
            <div className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 shadow-sm">
                <div className="max-w-[1600px] mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.push('/admin/inventory')} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{inventoryItem.dbos_code}</h1>
                            <p className="text-xs text-slate-500">{inventoryItem.inventory_name}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button form="inventoryDetailForm" type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors">
                            <Save className="h-4 w-4" /> Save Changes
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-[1600px] mx-auto px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* LEFT PANEL */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Item Details</h2>
                        <div className="mb-6 flex justify-center">
                            {inventoryItem.image_path ? (
                                <img src={`${API_URL}${inventoryItem.image_path}`} alt="Item" className="h-40 w-40 object-cover rounded-xl border border-slate-200 shadow-sm" />
                            ) : (
                                <div className="h-40 w-40 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
                                    <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                                    <span className="text-xs">No Image</span>
                                </div>
                            )}
                        </div>
                        <form id="inventoryDetailForm" onSubmit={handleUpdateItem} className="space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Item Name *</label><input required value={editForm.inventory_name} onChange={e => setEditForm({...editForm, inventory_name: e.target.value})} className="w-full p-2.5 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Description</label><textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full p-2.5 text-sm border border-slate-300 rounded-lg resize-none h-24 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Update Image</label><input type="file" accept="image/*" onChange={e => setImageFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 text-sm border border-slate-300 rounded-lg file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" /></div>
                            <div className="flex items-center gap-3 mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg"><input type="checkbox" id="activeToggle" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} className="h-4 w-4 rounded text-blue-600" /><label htmlFor="activeToggle" className="text-sm font-semibold cursor-pointer text-slate-700">Active Status</label></div>
                        </form>
                    </div>

                    <div className={`rounded-xl border p-6 flex justify-between items-center shadow-sm ${inventoryItem.qty_on_hand <= 0 ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                        <div>
                            <div className={`text-xs font-bold uppercase tracking-wider ${inventoryItem.qty_on_hand <= 0 ? 'text-red-600' : 'text-blue-600'}`}>Current Stock</div>
                            <div className="text-3xl font-bold text-slate-800 flex items-baseline gap-2">{inventoryItem.qty_on_hand} <span className="text-sm text-slate-500 font-medium">{inventoryItem.uom_abbr || 'UNIT'}</span></div>
                        </div>
                        <Package className={`h-10 w-10 ${inventoryItem.qty_on_hand <= 0 ? 'text-red-200' : 'text-blue-200'}`} />
                    </div>
                </div>

                {/* RIGHT PANEL: TABS */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full min-h-[600px]">
                        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/50">
                            {[
                                { id: 'details', label: 'Other Details' },
                                { id: 'history', label: 'Stock Ledger (History)' },
                                { id: 'mrfs', label: 'Material Requisitions' },
                                { id: 'suppliers', label: 'Supplier Setup' }
                            ].map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-700 bg-white shadow-[0_4px_0_0_white]' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 p-6 bg-white overflow-y-auto">
                            {/* TAB 1: DETAILS */}
                            {activeTab === 'details' && (
                                <div className="space-y-8 animate-in fade-in duration-200">
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                        <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Classifications / Tags</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {itemClassifications.map((row, index) => (
                                                <div key={row.rowId} className="flex gap-2 items-center">
                                                    <SearchableDropdown placeholder={index === itemClassifications.length - 1 && itemClassifications.length > 1 ? "+ Add another tag..." : "Select Tag..."} options={classOptions} value={row.classification_id} onChange={(val: any) => handleClassSelect(row.rowId, val)} onAddNew={(searchVal: string) => { setNewClassName(searchVal); setNewClassModalOpen(true); }} />
                                                    {row.classification_id && index !== itemClassifications.length - 1 && <button type="button" onClick={() => removeClassRow(row.rowId)} className="p-2 text-slate-400 hover:text-red-500"><X className="h-4 w-4"/></button>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                                        <h4 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">Technical Specifications</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {itemAttributes.map((row, index) => (
                                                <div key={row.rowId} className="flex gap-2 items-start bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                                    <div className="w-1/2">
                                                        <SearchableDropdown placeholder={index === itemAttributes.length - 1 && itemAttributes.length > 1 ? "+ Add spec..." : "Select Spec..."} options={attrOptions} value={row.attribute_id} onChange={(val: any) => handleAttrSelect(row.rowId, val)} onAddNew={(searchVal: string) => { setNewAttributeForm({...newAttributeForm, attribute_name: searchVal}); setNewAttrModalOpen(true); }} renderItem={(attr: any) => (<div><div>{attr.attribute_name}</div><div className="text-[10px] text-slate-400 uppercase font-bold">{attr.data_type}</div></div>)} />
                                                    </div>
                                                    <div className="flex-1">
                                                        {row.attribute_id ? (
                                                            row.data_type === 'boolean' ? <select value={row.value || ''} onChange={e => handleAttrValueChange(row.rowId, e.target.value)} className="w-full p-2 border rounded text-sm bg-slate-50 outline-none focus:border-blue-500"><option value="">N/A</option><option value="Yes">Yes</option><option value="No">No</option></select>
                                                            : row.data_type === 'integer' || row.data_type === 'decimal' ? <input type="number" step={row.data_type === 'decimal' ? '0.01' : '1'} placeholder="Value" value={row.value || ''} onChange={e => handleAttrValueChange(row.rowId, e.target.value)} className="w-full p-2 border rounded text-sm bg-slate-50 outline-none focus:border-blue-500" />
                                                            : row.data_type === 'date' ? <input type="date" value={row.value || ''} onChange={e => handleAttrValueChange(row.rowId, e.target.value)} className="w-full p-2 border rounded text-sm bg-slate-50 outline-none focus:border-blue-500" />
                                                            : <input type="text" placeholder="Value" value={row.value || ''} onChange={e => handleAttrValueChange(row.rowId, e.target.value)} className="w-full p-2 border rounded text-sm bg-slate-50 outline-none focus:border-blue-500" />
                                                        ) : <input disabled value="" placeholder="Select spec first" className="w-full p-2 border border-dashed border-slate-200 rounded text-sm bg-slate-50 text-slate-400 cursor-not-allowed" />}
                                                    </div>
                                                    {row.attribute_id && index !== itemAttributes.length - 1 && <button type="button" onClick={() => removeAttrRow(row.rowId)} className="p-2 text-slate-400 hover:text-red-500 mt-0.5"><X className="h-4 w-4"/></button>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: LEDGER HISTORY */}
                            {activeTab === 'history' && (
                                <div className="animate-in fade-in duration-200">
                                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                                <tr>
                                                    <th className="p-4 font-bold">Date & Time</th>
                                                    <th className="p-4 font-bold">Transaction Type</th>
                                                    <th className="p-4 text-center font-bold">Qty Change</th>
                                                    <th className="p-4 font-bold">Location</th>
                                                    <th className="p-4 font-bold">Reference / Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {stockHistory.length === 0 ? (
                                                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No ledger history recorded for this item yet.</td></tr>
                                                ) : stockHistory.map((h, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 text-slate-600 whitespace-nowrap">{h.created_at}</td>
                                                        <td className="p-4 font-medium">
                                                            {h.transaction_name.includes('PO') ? <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded w-max"><Truck className="h-3.5 w-3.5"/> {h.transaction_name}</span> : 
                                                             h.transaction_name.includes('MRF') ? <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded w-max"><Activity className="h-3.5 w-3.5"/> {h.transaction_name}</span> : 
                                                             <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded w-max">{h.transaction_name}</span>}
                                                        </td>
                                                        <td className={`p-4 text-center font-bold text-base ${h.qty_change > 0 ? 'text-emerald-600' : h.qty_change < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                                                            {h.qty_change > 0 ? '+' : ''}{h.qty_change}
                                                        </td>
                                                        <td className="p-4 text-slate-600 text-sm font-medium">{h.destination}</td>
                                                        <td className="p-4 text-slate-500 text-sm italic">{h.remarks || <span className="text-slate-300">No remarks</span>}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: MRF LIST WITH ETA TRACKING */}
                            {activeTab === 'mrfs' && (
                                <div className="animate-in fade-in duration-200">
                                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                                <tr>
                                                    <th className="p-4 font-bold">MRF Number</th>
                                                    <th className="p-4 font-bold">Project Name</th>
                                                    <th className="p-4 text-center font-bold">Qty Requested</th>
                                                    <th className="p-4 font-bold text-center">Status</th>
                                                    <th className="p-4 font-bold">Procurement (PO)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {mrfHistory.length === 0 ? (
                                                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">No historical MRFs for this item.</td></tr>
                                                ) : mrfHistory.map((mrf, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-4 text-blue-600 font-bold">{mrf.mrf_number}</td>
                                                        <td className="p-4 font-medium text-slate-800">{mrf.project_name}</td>
                                                        <td className="p-4 text-center font-bold text-slate-700">{mrf.qty_requested}</td>
                                                        <td className="p-4 text-center">
                                                            {mrf.status === 'Completed' || mrf.status === 'Issued' ? <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{mrf.status}</span> :
                                                             mrf.status === 'Pending Sourcing' || mrf.status === 'Canvassing' ? <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">{mrf.status}</span> :
                                                             <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{mrf.status}</span>}
                                                        </td>
                                                        <td className="p-4">
                                                            {mrf.po_number === 'N/A' ? (
                                                                <span className="text-slate-400 italic text-xs">No PO Linked</span>
                                                            ) : (
                                                                <div>
                                                                    <div className="font-bold text-slate-700">{mrf.po_number}</div>
                                                                    <div className="text-[10px] uppercase font-bold text-blue-600 mt-0.5 tracking-wider">
                                                                        ETA: <span className="text-slate-600 font-medium">{mrf.po_eta}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: SUPPLIERS (BRIDGE TABLE SETUP) */}
                            {activeTab === 'suppliers' && (
                                <div className="animate-in fade-in duration-200 space-y-6">
                                    <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200 rounded-xl">
                                        <div>
                                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-600" /> Authorized Vendor Products</h3>
                                            <p className="text-xs text-slate-500 mt-1">Configure MOQs, lead times, and preferred suppliers for procurement automation.</p>
                                        </div>
                                        <button onClick={() => setIsAddSupplierOpen(!isAddSupplierOpen)} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                                            {isAddSupplierOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {isAddSupplierOpen ? 'Cancel' : 'Add Rule'}
                                        </button>
                                    </div>

                                    {isAddSupplierOpen && (
                                        <form onSubmit={handleAddSupplier} className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4 shadow-inner">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Select Catalog Item *</label>
                                                    <select required value={supplierForm.supplier_product_id} onChange={e => setSupplierForm({...supplierForm, supplier_product_id: e.target.value})} className="w-full p-2 border border-blue-200 rounded text-sm outline-none focus:border-blue-500 bg-white">
                                                        <option value="" disabled>Choose a product...</option>
                                                        {catalogOptions.map(c => (
                                                            <option key={c.supplier_product_id} value={c.supplier_product_id}>{c.company_name} - {c.supplier_product_name}</option>
                                                        ))}
                                                    </select>
                                                    <p className="text-[10px] text-blue-600 mt-1 italic">Don't see it? Add it to the supplier catalog via the Canvassing board.</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Min Order Qty (MOQ)</label>
                                                    <input type="number" step="0.01" required value={supplierForm.moq} onChange={e => setSupplierForm({...supplierForm, moq: parseFloat(e.target.value) || 1})} className="w-full p-2 border border-blue-200 rounded text-sm outline-none" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Lead Time (Days)</label>
                                                    <input type="number" required value={supplierForm.lead_time_days} onChange={e => setSupplierForm({...supplierForm, lead_time_days: parseInt(e.target.value) || 0})} className="w-full p-2 border border-blue-200 rounded text-sm outline-none" />
                                                </div>
                                            </div>
                                            <div className="flex justify-end pt-2"><button type="submit" className="px-5 py-2 bg-blue-700 text-white text-sm font-bold rounded shadow hover:bg-blue-800">Save Procurement Rule</button></div>
                                        </form>
                                    )}

                                    {invSuppliers.length === 0 ? (
                                        <div className="p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                            <Building2 className="h-12 w-12 mb-4 text-slate-300 mx-auto" />
                                            <h3 className="font-bold text-lg text-slate-600 mb-1">No Procurement Rules</h3>
                                            <p>Map this item to a supplier's catalog to establish lead times and enable quick purchasing.</p>
                                        </div>
                                    ) : (
                                        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                                                    <tr>
                                                        <th className="p-4 font-bold">Vendor Name</th>
                                                        <th className="p-4 font-bold">Supplier SKU / Product</th>
                                                        <th className="p-4 text-center font-bold">Lead Time</th>
                                                        <th className="p-4 text-center font-bold">MOQ</th>
                                                        <th className="p-4 text-right font-bold">Landed Price</th>
                                                        <th className="p-4 text-center font-bold">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {invSuppliers.map((sup) => (
                                                        <tr key={sup.mapping_id} className={`transition-colors ${sup.is_preferred ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}>
                                                            <td className="p-4">
                                                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                                                    {sup.company_name} 
                                                                    {sup.is_preferred && <span className="text-[9px] uppercase tracking-wider bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-bold">Preferred</span>}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 font-medium text-slate-600">
                                                                <div>{sup.supplier_product_name}</div>
                                                                <div className="text-xs text-slate-400">{sup.sup_product_code || 'No SKU'}</div>
                                                            </td>
                                                            <td className="p-4 text-center text-slate-700">{sup.lead_time_days} days</td>
                                                            <td className="p-4 text-center font-bold text-slate-700">{sup.moq}</td>
                                                            <td className="p-4 text-right font-bold text-emerald-600">₱{sup.landed_price.toFixed(2)}</td>
                                                            <td className="p-4 text-center">
                                                                <div className="flex justify-center gap-2">
                                                                    {!sup.is_preferred && (
                                                                        <button onClick={() => handleSetPreferred(sup.mapping_id)} className="p-1.5 text-amber-500 hover:bg-amber-100 rounded" title="Set as Preferred">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => handleRemoveSupplier(sup.mapping_id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Remove Mapping">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Create Modals */}
            {newAttrModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 bg-slate-800 text-white flex justify-between items-center"><h3 className="font-bold">New Attribute</h3><button onClick={() => setNewAttrModalOpen(false)}><X className="h-4 w-4"/></button></div>
                        <form onSubmit={handleQuickCreateAttribute} className="p-5 space-y-4">
                            <div><label className="block text-xs font-bold mb-1 text-slate-600">Attribute Name</label><input required autoFocus value={newAttributeForm.attribute_name} onChange={e => setNewAttributeForm({...newAttributeForm, attribute_name: e.target.value})} className="w-full p-2 text-sm border rounded outline-none focus:border-blue-500" /></div>
                            <div>
                                <label className="block text-xs font-bold mb-1 text-slate-600">Data Type</label>
                                <select value={newAttributeForm.data_type} onChange={e => setNewAttributeForm({...newAttributeForm, data_type: e.target.value})} className="w-full p-2 text-sm border rounded outline-none">
                                    <option value="string">Text</option><option value="integer">Whole Number</option><option value="decimal">Decimal</option><option value="boolean">Yes/No</option><option value="date">Date</option>
                                </select>
                            </div>
                            <div className="pt-2"><button type="submit" className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Create Attribute</button></div>
                        </form>
                    </div>
                </div>
            )}

            {newClassModalOpen && (
                <div className="fixed inset-0 bg-slate-900/70 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 bg-slate-800 text-white flex justify-between items-center"><h3 className="font-bold">New Tag / Classification</h3><button onClick={() => setNewClassModalOpen(false)}><X className="h-4 w-4"/></button></div>
                        <form onSubmit={handleQuickCreateClassification} className="p-5 space-y-4">
                            <div><label className="block text-xs font-bold mb-1 text-slate-600">Tag Name</label><input required autoFocus value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="e.g. Flammable, Summer Collection" className="w-full p-2 text-sm border rounded outline-none focus:border-blue-500" /></div>
                            <div className="pt-2"><button type="submit" className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Create Tag</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}