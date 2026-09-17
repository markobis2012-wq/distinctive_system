'use client';

import { useState, useEffect, useRef, use } from 'react';
import {
    FolderKanban, ArrowLeft, Save, Package, Paperclip,
    Plus, Trash2, Edit2, X, Image as ImageIcon,
    ClipboardList, Send, Download, Layers 
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SearchableSelect = ({ options, value, onChange, placeholder = "Select..." }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) { setIsOpen(false); } };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((o: any) => String(o.value) === String(value));
    const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative w-full text-sm">
            <div className="w-full p-2 border border-slate-300 rounded-lg bg-white cursor-pointer flex justify-between items-center" onClick={() => setIsOpen(!isOpen)}>
                <span className={selectedOption ? "text-slate-900 truncate pr-2" : "text-slate-400 truncate"}>{selectedOption ? selectedOption.label : placeholder}</span>
                <span className="text-slate-400 text-[10px] shrink-0 ml-2">▼</span>
            </div>
            {isOpen && (
                <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-200 bg-slate-50"><input autoFocus type="text" className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    <div className="overflow-y-auto flex-1">
                        <div className="p-2 hover:bg-red-50 cursor-pointer text-slate-400 italic text-xs border-b border-slate-100" onClick={() => { onChange(""); setIsOpen(false); setSearchTerm(""); }}>Clear Selection</div>
                        {filteredOptions.length > 0 ? (filteredOptions.map((o: any) => (<div key={o.value} className="p-2 hover:bg-blue-50 cursor-pointer text-slate-700 text-xs truncate" onClick={() => { onChange(o.value); setIsOpen(false); setSearchTerm(""); }}>{o.label}</div>))) : (<div className="p-3 text-slate-400 text-xs text-center italic">No results found</div>)}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;

    const [activeTab, setActiveTab] = useState<'items' | 'attachments' | 'mrf'>('items');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [companies, setCompanies] = useState<any[]>([]);
    const [biddings, setBiddings] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [inventoryList, setInventoryList] = useState<any[]>([]);

    const [form, setForm] = useState({
        project_number: '', project_name: '', client_id: 0, bidding_id: 0, dbos_department_id: 0,
        projects_category: '', contract_amount: 0, project_date_start_date: '', project_date_end_date: '', project_status: 'Today'
    });

    const [projectItems, setProjectItems] = useState<any[]>([]);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [itemForm, setItemForm] = useState({ product_name: '', product_description: '', suppliers_description: '', qty: 0, unit_price: 0 });
    const [itemImage, setItemImage] = useState<File | null>(null);
    const [dbosImage, setDbosImage] = useState<File | null>(null);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    // COMPONENT MANAGER STATE
    const [activeItemForComponents, setActiveItemForComponents] = useState<any>(null);
    const [components, setComponents] = useState<any[]>([]);
    const [compForm, setCompForm] = useState({
        inventory_id: 0, qty_per_item: 1, prod_qty: 1, unit_price: '0', total_price: '0'
    });

    const [attachments, setAttachments] = useState<any[]>([]);
    const [fileTypes, setFileTypes] = useState<any[]>([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [attachForm, setAttachForm] = useState({ file_type_id: 0, has_expiration: 0, expiration_date: '', version: '' });
    const [attachFile, setAttachFile] = useState<File | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string, type: 'image' | 'pdf', name: string } | null>(null);

    // --- MRF STATES ---
    const [mrfList, setMrfList] = useState<any[]>([]);
    const [projectBOMList, setProjectBOMList] = useState<any[]>([]); // New: Full BOM for MRF
    const [isMrfModalOpen, setIsMrfModalOpen] = useState(false);
    const [mrfForm, setMrfForm] = useState({ date_requested: new Date().toISOString().split('T')[0], requested_by: '' });
    
    // Updated: Now tracks project_item_component_id
    const [mrfRequestItems, setMrfRequestItems] = useState([{ project_item_component_id: 0, inventory_id: 0, qty_requested: 1 }]);

    useEffect(() => {
        const user = localStorage.getItem('username');
        if (user) setMrfForm(prev => ({ ...prev, requested_by: user }));

        const fetchData = async () => {
            try {
                const [compRes, bidRes, deptRes, catRes, projRes, itemsRes, typesRes, attachRes, mrfRes, invRes, bomRes] = await Promise.all([
                    fetch(`${API_URL}/api/companies`).catch(() => null),
                    fetch(`${API_URL}/api/biddings?limit=1000`).catch(() => null),
                    fetch(`${API_URL}/api/departments`).catch(() => null),
                    fetch(`${API_URL}/api/project-categories`).catch(() => null),
                    fetch(`${API_URL}/api/projects/${projectId}`).catch(() => null),
                    fetch(`${API_URL}/api/projects/${projectId}/items`).catch(() => null),
                    fetch(`${API_URL}/api/attachment-types`).catch(() => null),
                    fetch(`${API_URL}/api/projects/${projectId}/attachments`).catch(() => null),
                    fetch(`${API_URL}/api/projects/${projectId}/mrfs`).catch(() => null),
                    fetch(`${API_URL}/api/inventory`).catch(() => null),
                    fetch(`${API_URL}/api/projects/${projectId}/components`).catch(() => null) // Fetch Full BOM
                ]);

                if (compRes?.ok) setCompanies(await compRes.json());
                if (bidRes?.ok) setBiddings((await bidRes.json()).data || []);
                if (deptRes?.ok) setDepartments(await deptRes.json());
                if (catRes?.ok) setCategories(await catRes.json());
                if (typesRes?.ok) setFileTypes(await typesRes.json());
                if (invRes?.ok) setInventoryList(await invRes.json());

                if (projRes?.ok) {
                    const data = await projRes.json();
                    const cleanDate = (d: string) => (!d || d.startsWith('0000-00-00')) ? '' : d.split(' ')[0];
                    setForm({
                        project_number: data.project_number || '', project_name: data.project_name || '',
                        client_id: data.client_id || 0, bidding_id: data.bidding_id || 0,
                        dbos_department_id: data.dbos_department_id || 0, projects_category: data.projects_category || '',
                        contract_amount: data.contract_amount || 0, project_date_start_date: cleanDate(data.project_date_start_date),
                        project_date_end_date: cleanDate(data.project_date_end_date), project_status: data.project_status || 'Today'
                    });
                }

                if (attachRes?.ok) setAttachments(await attachRes.json());
                if (itemsRes?.ok) setProjectItems(await itemsRes.json());
                
                if (mrfRes?.ok) {
                    const mrfData = await mrfRes.json();
                    setMrfList(Array.isArray(mrfData) ? mrfData : []);
                }

                // Load BOM
                if (bomRes?.ok) {
                    const bomData = await bomRes.json();
                    setProjectBOMList(Array.isArray(bomData) ? bomData : []);
                }

            } catch (err) { console.error("Failed to load details", err); } finally { setLoading(false); }
        };
        fetchData();
    }, [projectId]);

    const handleSaveDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await fetch(`${API_URL}/api/projects/${projectId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            alert("Project details updated successfully!");
        } catch (err) { alert("Error saving project."); } finally { setSaving(false); }
    };

    // ITEM HANDLERS
    const fetchProjectItems = async () => {
        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/items`);
            if (res.ok) setProjectItems(await res.json());
        } catch (err) { }
    };

    const openItemModal = (item: any = null) => {
        if (item) {
            setEditingItemId(item.project_items_id);
            setItemForm({ product_name: item.product_name, product_description: item.product_description, suppliers_description: item.suppliers_description, qty: item.qty, unit_price: item.unit_price });
        } else {
            setEditingItemId(null);
            setItemForm({ product_name: '', product_description: '', suppliers_description: '', qty: 0, unit_price: 0 });
        }
        setItemImage(null); setDbosImage(null); setIsItemModalOpen(true);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        Object.entries(itemForm).forEach(([key, value]) => formData.append(key, String(value)));
        formData.append('total_price', String(itemForm.qty * itemForm.unit_price));
        if (itemImage) formData.append('image_path', itemImage);
        if (dbosImage) formData.append('dbos_image_path', dbosImage);

        const url = editingItemId ? `${API_URL}/api/projects/${projectId}/items/${editingItemId}` : `${API_URL}/api/projects/${projectId}/items`;
        try {
            const res = await fetch(url, { method: editingItemId ? 'PUT' : 'POST', body: formData });
            if (res.ok) { setIsItemModalOpen(false); fetchProjectItems(); }
        } catch (err) { alert("Failed to save item."); }
    };

    const handleDeleteItem = async (id: number) => {
        if (!confirm("Are you sure you want to delete this project item?")) return;
        try {
            const res = await fetch(`${API_URL}/api/projects/items/${id}`, { method: 'DELETE' });
            if (res.ok) fetchProjectItems();
        } catch (err) { }
    };

    // COMPONENT HANDLERS
    const openComponentManager = async (item: any) => {
        setActiveItemForComponents(item);
        try {
            const res = await fetch(`${API_URL}/api/project-items/${item.project_items_id}/components`);
            if (res.ok) setComponents(await res.json());
        } catch (err) { }
    };

    useEffect(() => {
        const parentQty = activeItemForComponents?.qty || 1;
        const qtyPerItem = compForm.qty_per_item || 0;
        const totalQty = parentQty * qtyPerItem;
        const estUnitPrice = parseFloat(compForm.unit_price) || 0;

        setCompForm(prev => ({
            ...prev,
            prod_qty: totalQty,
            total_price: (totalQty * estUnitPrice).toFixed(2)
        }));
    }, [compForm.qty_per_item, compForm.unit_price, activeItemForComponents]);

    const handleSaveComponent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeItemForComponents || compForm.inventory_id === 0) return alert("Select a master inventory item");

        const payload = { ...compForm, project_items_id: activeItemForComponents.project_items_id };
        try {
            const res = await fetch(`${API_URL}/api/project-items/components`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (res.ok) {
                const refreshRes = await fetch(`${API_URL}/api/project-items/${activeItemForComponents.project_items_id}/components`);
                if (refreshRes.ok) setComponents(await refreshRes.json());
                setCompForm({ inventory_id: 0, qty_per_item: 1, prod_qty: 1, unit_price: '0', total_price: '0' });

                // Refresh BOM list silently so it's ready for MRF
                const bomRes = await fetch(`${API_URL}/api/projects/${projectId}/components`);
                if (bomRes.ok) setProjectBOMList(await bomRes.json());
            }
        } catch (err) { alert("Error saving component"); }
    };

    const handleDeleteComponent = async (id: number) => {
        if (!confirm("Delete this component from the BOM?")) return;
        try {
            const res = await fetch(`${API_URL}/api/project-items/components/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setComponents(components.filter(c => c.project_item_component_id !== id));
                // Refresh BOM list silently
                fetch(`${API_URL}/api/projects/${projectId}/components`).then(r => r.json()).then(d => setProjectBOMList(d));
            }
        } catch (err) { }
    };

    // ATTACHMENT HANDLERS
    const fetchAttachments = async () => {
        const res = await fetch(`${API_URL}/api/projects/${projectId}/attachments`);
        if (res.ok) setAttachments(await res.json());
    };

    const handleUploadAttachment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!attachFile || attachForm.file_type_id === 0) return alert("Select type and file.");
        const formData = new FormData();
        formData.append('file_type_id', String(attachForm.file_type_id));
        formData.append('has_expiration', String(attachForm.has_expiration));
        formData.append('expiration_date', attachForm.expiration_date);
        formData.append('version', attachForm.version);
        formData.append('file', attachFile);

        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/attachments`, { method: 'POST', body: formData });
            if (res.ok) { setIsUploadModalOpen(false); setAttachForm({ file_type_id: 0, has_expiration: 0, expiration_date: '', version: '' }); setAttachFile(null); fetchAttachments(); } else { alert("Failed to upload"); }
        } catch (err) { }
    };

    const handleDeleteAttachment = async (id: number) => {
        if (!confirm("Delete this attachment?")) return;
        try {
            const res = await fetch(`${API_URL}/api/projects/attachments/${id}`, { method: 'DELETE' });
            if (res.ok) fetchAttachments();
        } catch (err) { }
    };

    const handlePreviewFile = (filePath: string, fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const url = `${API_URL}${filePath}`;
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) { setPreviewFile({ url, type: 'image', name: fileName }); } else if (ext === 'pdf') { setPreviewFile({ url, type: 'pdf', name: fileName }); } else { const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.download = fileName; document.body.appendChild(link); link.click(); document.body.removeChild(link); }
    };

    // --- MRF HANDLERS ---
    const fetchMRFs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/mrfs`);
            if (res.ok) {
                const data = await res.json();
                setMrfList(Array.isArray(data) ? data : []);
            }
        } catch (err) { console.error(err); }
    };

    const handleCreateMRF = async (e: React.FormEvent) => {
        e.preventDefault();
        // Check that they actually selected a BOM component and valid qty
        const validItems = mrfRequestItems.filter(i => i.project_item_component_id > 0 && i.qty_requested > 0);
        if (validItems.length === 0) return alert("Please map at least one valid BOM component to request.");

        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/mrfs`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date_requested: mrfForm.date_requested, requested_by: mrfForm.requested_by, items: validItems })
            });

            if (res.ok) {
                setIsMrfModalOpen(false); 
                setMrfRequestItems([{ project_item_component_id: 0, inventory_id: 0, qty_requested: 1 }]);
                fetchMRFs(); 
                alert("MRF linked to BOM created and sent to warehouse!");
            } else { const data = await res.json(); alert(data.error || "Failed to create MRF"); }
        } catch (err) { alert("Error connecting to server."); }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

    const statusOptions = ["Today", "Under Evaluation", "Awarded", "Failed",  "On-going", "Completed"];
    const companyOptions = (companies || []).map(c => ({ value: c.company_id, label: c.company_name }));
    const biddingOptions = (biddings || []).map(b => ({ value: b.bidding_id, label: `${b.reference_no} - ${b.title || 'No Title'}` }));
    const departmentOptions = (departments || []).map(d => ({ value: d.department_id, label: d.department }));
    const categoryOptions = (categories || []).map(c => ({ value: c.category, label: c.category }));
    const inventoryOptions = (inventoryList || []).map(i => ({ value: i.inventory_id, label: `${i.dbos_code} - ${i.inventory_name}` }));

    // NEW: Dropdown options specific to the project's Bill of Materials
    const bomOptions = (projectBOMList || []).map(bom => ({
        value: bom.project_item_component_id,
        label: `For ${bom.parent_item_name}: ${bom.dbos_code} - ${bom.inventory_name} (Need: ${bom.prod_qty})`
    }));

    if (loading) return <div className="p-8 flex items-center justify-center min-h-[400px] text-slate-500">Loading project details...</div>;

    return (
        <div className="bg-slate-50 min-h-screen pb-12 w-full">
            <div className="bg-slate-900 text-white p-8 rounded-b-3xl shadow-md mb-8">
                <Link href="/admin/projects" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-4 transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-sm font-semibold tracking-wide">{form.project_number}</span>
                        <h1 className="text-2xl font-bold">{form.project_name || 'Project Details'}</h1>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">Status: <span className="text-slate-200 font-medium">{form.project_status}</span></p>
                </div>
            </div>

            <div className="w-full px-8">
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
                    
                    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-blue-600" /> Project Details
                        </h2>
                        
                        <form onSubmit={handleSaveDetails} className="space-y-4 text-sm">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Project Name *</label>
                                <input type="text" required value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Client Company</label>
                                <SearchableSelect options={companyOptions} value={form.client_id} onChange={(val: string) => setForm({ ...form, client_id: parseInt(val) || 0 })} placeholder="Select Client..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Linked Bidding</label>
                                <SearchableSelect options={biddingOptions} value={form.bidding_id} onChange={(val: string) => setForm({ ...form, bidding_id: parseInt(val) || 0 })} placeholder="Optional: Link Bidding..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Department *</label>
                                <SearchableSelect options={departmentOptions} value={form.dbos_department_id} onChange={(val: string) => setForm({ ...form, dbos_department_id: parseInt(val) || 0 })} placeholder="Select Department..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category *</label>
                                <SearchableSelect options={categoryOptions} value={form.projects_category} onChange={(val: string) => setForm({ ...form, projects_category: val })} placeholder="Select Category..." />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contract Amount *</label>
                                <input type="number" step="0.01" required value={form.contract_amount} onChange={(e) => setForm({ ...form, contract_amount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
                                    <input type="date" value={form.project_date_start_date} onChange={(e) => setForm({ ...form, project_date_start_date: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none text-xs" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
                                    <input type="date" value={form.project_date_end_date} onChange={(e) => setForm({ ...form, project_date_end_date: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none text-xs" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                                <select value={form.project_status} onChange={(e) => setForm({ ...form, project_status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">
                                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <button type="submit" disabled={saving} className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Project"}
                            </button>
                        </form>
                    </div>

                    <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[640px] flex flex-col overflow-hidden">
                        <div className="border-b border-slate-200 px-4 pt-2 overflow-x-auto">
                            <div className="flex gap-2 min-w-max">
                                <button type="button" onClick={() => setActiveTab('items')} className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === 'items' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><Package className="h-4 w-4" /> Project Items</button>
                                <button type="button" onClick={() => setActiveTab('attachments')} className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === 'attachments' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><Paperclip className="h-4 w-4" /> Attachments</button>
                                <button type="button" onClick={() => setActiveTab('mrf')} className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === 'mrf' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><ClipboardList className="h-4 w-4" /> Material Requisitions</button>
                            </div>
                        </div>

                        <div className="flex-1 p-6">
                            
                            {activeTab === 'items' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div><h3 className="font-bold text-slate-800">Project Items & Bill of Materials</h3><p className="text-xs text-slate-500">Products and deliverables scoped for this project</p></div>
                                        <button onClick={() => openItemModal()} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Item</button>
                                    </div>
                                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                                        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                                <tr><th className="px-4 py-3 font-medium">Images</th><th className="px-4 py-3 font-medium">Product Name</th><th className="px-4 py-3 font-medium text-center">Qty</th><th className="px-4 py-3 font-medium">Unit Price</th><th className="px-4 py-3 font-medium">Total Price</th><th className="px-4 py-3 font-medium text-right">Actions</th></tr>
                                            </thead>
                                            <tbody>
                                                {projectItems.length === 0 ? (<tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 italic">No project items added yet.</td></tr>) : projectItems.map(item => (
                                                    <tr key={item.project_items_id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-2 flex gap-2">
                                                            {item.image_path ? <img src={`${API_URL}${item.image_path}`} onClick={() => setEnlargedImage(`${API_URL}${item.image_path}`)} alt="Prod" className="h-10 w-10 object-cover rounded border cursor-zoom-in" /> : <div className="h-10 w-10 bg-slate-100 rounded border flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-300" /></div>}
                                                            {item.dbos_image_path ? <img src={`${API_URL}${item.dbos_image_path}`} onClick={() => setEnlargedImage(`${API_URL}${item.dbos_image_path}`)} alt="DBOS" className="h-10 w-10 object-cover rounded border cursor-zoom-in" /> : <div className="h-10 w-10 bg-slate-100 rounded border flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-300" /></div>}
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                                                        <td className="px-4 py-3 text-center font-bold">{item.qty}</td>
                                                        <td className="px-4 py-3 text-slate-500">{formatCurrency(item.unit_price)}</td>
                                                        <td className="px-4 py-3 font-bold text-emerald-700">{formatCurrency(item.total_price)}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => openComponentManager(item)} className="text-emerald-600 hover:text-emerald-800 p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors flex items-center gap-1 text-xs font-bold" title="Manage Components">
                                                                    <Layers className="h-4 w-4" /> Components
                                                                </button>
                                                                <button onClick={() => openItemModal(item)} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded hover:bg-blue-100 transition-colors"><Edit2 className="h-4 w-4" /></button>
                                                                <button onClick={() => handleDeleteItem(item.project_items_id)} className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 rounded hover:bg-red-100 transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'attachments' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div><h3 className="font-bold text-slate-800">Project Attachments</h3><p className="text-xs text-slate-500">Contracts, drawings, and files</p></div>
                                        <button onClick={() => setIsUploadModalOpen(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="h-4 w-4" /> Upload File</button>
                                    </div>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-sm text-slate-600">
                                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                                <tr><th className="px-4 py-3 font-medium">File Type</th><th className="px-4 py-3 font-medium">Filename / Version</th><th className="px-4 py-3 font-medium">Date Uploaded</th><th className="px-4 py-3 font-medium text-right">Actions</th></tr>
                                            </thead>
                                            <tbody>
                                                {attachments.length === 0 ? (<tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">No attachments uploaded yet.</td></tr>) : attachments.map(a => (
                                                    <tr key={a.attachments_id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-bold text-slate-800">{a.attachment_file_type}</td>
                                                        <td className="px-4 py-3"><button onClick={() => handlePreviewFile(a.file_path, a.file_name)} className="text-blue-600 hover:underline flex items-center gap-1 text-left"><Paperclip className="h-3 w-3 shrink-0" /> <span className="truncate max-w-[200px]">{a.file_name}</span></button>{a.version && <span className="text-xs text-slate-400 block mt-0.5">Version: {a.version}</span>}</td>
                                                        <td className="px-4 py-3">{a.date_uploaded}</td>
                                                        <td className="px-4 py-3 text-right"><button onClick={() => handleDeleteAttachment(a.attachments_id)} className="text-red-600 hover:bg-red-100 p-1.5 rounded"><Trash2 className="h-4 w-4" /></button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'mrf' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div><h3 className="font-bold text-slate-800">Material Requisition Forms</h3><p className="text-xs text-slate-500">Internal requests for materials required for this project</p></div>
                                        <button onClick={() => setIsMrfModalOpen(true)} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"><Plus className="h-4 w-4" /> Create MRF</button>
                                    </div>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-sm text-slate-600">
                                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                                <tr><th className="px-4 py-3 font-medium">MRF No.</th><th className="px-4 py-3 font-medium">Date Requested</th><th className="px-4 py-3 font-medium">Requested By</th><th className="px-4 py-3 font-medium">Status</th></tr>
                                            </thead>
                                            <tbody>
                                                {mrfList.length === 0 ? (<tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">No Material Requisition Forms found.</td></tr>) : mrfList.map((mrf: any) => (
                                                    <tr key={mrf.mrf_id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-bold text-blue-600">{mrf.mrf_number}</td>
                                                        <td className="px-4 py-3">{mrf.date_requested.split('T')[0]}</td>
                                                        <td className="px-4 py-3">{mrf.requested_by}</td>
                                                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${mrf.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : mrf.status === 'Partial' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>{mrf.status}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* CREATE MRF MODAL - NOW PULLS FROM BOM */}
            {isMrfModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-blue-600 text-white rounded-t-xl flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-lg">Create Material Requisition</h3>
                                <p className="text-blue-100 text-xs mt-0.5">Request materials specifically linked to this project's BOM</p>
                            </div>
                            <button onClick={() => setIsMrfModalOpen(false)} className="hover:text-blue-200"><X className="h-6 w-6" /></button>
                        </div>
                        
                        {/* 1. ADDED pb-32 TO GIVE DROPDOWN ROOM TO BREATHE */}
                        <div className="p-6 pb-32 overflow-y-auto bg-slate-50 flex-1">
                            
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Date Requested</label><input type="date" value={mrfForm.date_requested} onChange={e => setMrfForm({...mrfForm, date_requested: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none" /></div>
                                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Requested By</label><input type="text" value={mrfForm.requested_by} onChange={e => setMrfForm({...mrfForm, requested_by: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none" /></div>
                            </div>
                            
                            {/* 2. CHANGED overflow-hidden TO overflow-visible SO DROPDOWN CAN ESCAPE */}
                            <div className="bg-white border border-slate-200 rounded-lg overflow-visible">
                                <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center rounded-t-lg">
                                    <h4 className="font-bold text-slate-700 text-sm">Requested BOM Items</h4>
                                    <button onClick={() => setMrfRequestItems([...mrfRequestItems, { project_item_component_id: 0, inventory_id: 0, qty_requested: 1 }])} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-50"><Plus className="h-3 w-3" /> Add Row</button>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3 w-3/4">BOM Component / Used For</th>
                                            <th className="p-3 text-center">Qty Needed</th>
                                            <th className="p-3 text-right"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mrfRequestItems.map((item, idx) => (
                                            <tr key={idx} className="border-b border-slate-100">
                                                <td className="p-2">
                                                    <SearchableSelect 
                                                        options={bomOptions} 
                                                        value={item.project_item_component_id} 
                                                        onChange={(v: string) => { 
                                                            const compId = parseInt(v) || 0;
                                                            const selectedBom = projectBOMList.find(b => b.project_item_component_id === compId);
                                                            
                                                            const newItems = [...mrfRequestItems]; 
                                                            newItems[idx].project_item_component_id = compId;
                                                            newItems[idx].inventory_id = selectedBom ? selectedBom.inventory_id : 0;
                                                            newItems[idx].qty_requested = selectedBom ? selectedBom.prod_qty : 1;
                                                            setMrfRequestItems(newItems); 
                                                        }} 
                                                        placeholder="Select a material from the project BOM..." 
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input 
                                                        type="number" min="0.01" step="0.01" 
                                                        value={item.qty_requested} 
                                                        onChange={e => { const newItems = [...mrfRequestItems]; newItems[idx].qty_requested = parseFloat(e.target.value) || 0; setMrfRequestItems(newItems); }} 
                                                        className="w-24 p-2 border border-slate-300 rounded text-center outline-none font-bold" 
                                                    />
                                                </td>
                                                <td className="p-2 text-right">
                                                    {mrfRequestItems.length > 1 && (
                                                        <button onClick={() => setMrfRequestItems(mrfRequestItems.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 rounded-b-xl">
                            <button onClick={() => setIsMrfModalOpen(false)} className="px-5 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50">Cancel</button>
                            <button onClick={handleCreateMRF} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"><Send className="h-4 w-4"/> Submit Request</button>
                        </div>
                    </div>
                </div>
            )}

            {/* PHASE 1: COMPONENT MANAGER MODAL (BOM CREATION) */}
            {activeItemForComponents && (
                <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-emerald-600 text-white rounded-t-xl shrink-0">
                            <div>
                                <h3 className="font-bold text-lg">Bill of Materials (Components)</h3>
                                <p className="text-emerald-100 text-xs">Item: {activeItemForComponents.product_name} | Qty: {activeItemForComponents.qty}</p>
                            </div>
                            <button onClick={() => setActiveItemForComponents(null)} className="hover:text-emerald-200 transition-colors"><X className="h-6 w-6" /></button>
                        </div>

                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                            <div className="w-full lg:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto shrink-0">
                                <h4 className="font-bold text-slate-700 mb-4 border-b border-slate-200 pb-2">Add Required Material</h4>
                                
                                <form onSubmit={handleSaveComponent} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Master Inventory Item *</label>
                                        <SearchableSelect 
                                            options={inventoryOptions} 
                                            value={compForm.inventory_id} 
                                            onChange={(v: string) => setCompForm({ ...compForm, inventory_id: parseInt(v) || 0 })} 
                                            placeholder="Select component..." 
                                        />
                                        <p className="text-[10px] text-slate-400 mt-1 italic">Suppliers will be assigned later during Canvassing.</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Qty per Item</label>
                                            <input required type="number" min="0.01" step="0.01" value={compForm.qty_per_item} onChange={e => setCompForm({ ...compForm, qty_per_item: parseFloat(e.target.value) || 0 })} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Total Qty Needed</label>
                                            <input disabled type="number" value={compForm.prod_qty} className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-200 text-slate-600 font-bold cursor-not-allowed" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Est. Unit Cost</label>
                                            <input type="number" step="0.01" value={compForm.unit_price} onChange={e => setCompForm({ ...compForm, unit_price: e.target.value })} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Est. Total Cost</label>
                                            <input disabled type="text" value={compForm.total_price} className="w-full p-2 border border-slate-300 rounded text-sm bg-emerald-50 text-emerald-700 font-bold cursor-not-allowed" />
                                        </div>
                                    </div>

                                    <button type="submit" className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm mt-4 flex items-center justify-center gap-2">
                                        <Plus className="h-4 w-4"/> Add to BOM
                                    </button>
                                </form>
                            </div>

                            <div className="w-full lg:w-2/3 p-0 overflow-y-auto bg-white">
                                <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 font-medium">Material / Component</th>
                                            <th className="px-4 py-3 font-medium text-center">Required Qty</th>
                                            <th className="px-4 py-3 font-medium">Est. Cost</th>
                                            <th className="px-4 py-3 font-medium text-center">Status</th>
                                            <th className="px-4 py-3 font-medium text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {components.length === 0 ? (
                                            <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">No materials added to BOM yet.</td></tr>
                                        ) : components.map(c => (
                                            <tr key={c.project_item_component_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-slate-800">{c.inventory_name}</div>
                                                    <div className="text-xs text-slate-400">{c.dbos_code}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-xs">
                                                    Per Item: {c.qty_per_item}<br />
                                                    <span className="font-bold text-blue-600 text-sm">Total: {c.prod_qty}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                    Unit: {formatCurrency(parseFloat(c.unit_price))}<br />
                                                    <span className="font-bold text-slate-700">Total: {formatCurrency(parseFloat(c.total_price))}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {c.supplier_id ? (
                                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold">Sourced</span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">Pending Canvas</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => handleDeleteComponent(c.project_item_component_id)} className="text-red-600 hover:text-red-800 p-2 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ITEM MODAL */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
                        <div className="p-4 border-b bg-blue-600 text-white rounded-t-xl flex justify-between"><h3 className="font-bold">{editingItemId ? 'Edit Item' : 'Add Item'}</h3><button onClick={() => setIsItemModalOpen(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium mb-1">Product Name *</label><input required type="text" value={itemForm.product_name} onChange={e => setItemForm({ ...itemForm, product_name: e.target.value })} className="w-full p-2 border rounded" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1">Quantity *</label><input required type="number" min="1" value={itemForm.qty} onChange={e => setItemForm({ ...itemForm, qty: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded" /></div>
                                <div><label className="block text-sm font-medium mb-1">Unit Price *</label><input required type="number" step="0.01" value={itemForm.unit_price} onChange={e => setItemForm({ ...itemForm, unit_price: parseFloat(e.target.value) || 0 })} className="w-full p-2 border rounded" /></div>
                            </div>
                            <div className="text-right font-bold text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100">Total: {formatCurrency(itemForm.qty * itemForm.unit_price)}</div>
                            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsItemModalOpen(false)} className="px-5 py-2 border rounded">Cancel</button><button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded">Save Item</button></div>
                        </form>
                    </div>
                </div>
            )}
            
            {/* ATTACHMENT MODAL */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-4 border-b bg-blue-600 text-white rounded-t-xl flex justify-between"><h3 className="font-bold">Upload File</h3><button onClick={() => setIsUploadModalOpen(false)}><X className="h-5 w-5" /></button></div>
                        <form onSubmit={handleUploadAttachment} className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium mb-1">File Type *</label><select required value={attachForm.file_type_id} onChange={e => setAttachForm({ ...attachForm, file_type_id: parseInt(e.target.value) || 0 })} className="w-full p-2 border rounded"><option value="0">Select Type...</option>{fileTypes.map(t => <option key={t.attachment_file_type_id} value={t.attachment_file_type_id}>{t.attachment_file_type}</option>)}</select></div>
                            <div><label className="block text-sm font-medium mb-1">Select File *</label><input required type="file" onChange={e => setAttachFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded" /></div>
                            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsUploadModalOpen(false)} className="px-5 py-2 border rounded">Cancel</button><button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded">Upload File</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* ENLARGED IMAGE PREVIEW */}
            {enlargedImage && (
                <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setEnlargedImage(null)}>
                    <button onClick={() => setEnlargedImage(null)} className="absolute top-6 right-6 text-white/70 hover:text-white p-2 transition-colors"><X className="h-8 w-8" /></button>
                    <img src={enlargedImage} alt="Enlarged" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            )}

            {/* UNIVERSAL FILE PREVIEW MODAL */}
            {previewFile && (
                <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-6xl flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold truncate max-w-2xl">{previewFile.name}</h3>
                        <div className="flex items-center gap-4">
                            <a href={previewFile.url} download={previewFile.name} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded transition-colors text-sm font-medium border border-slate-600">
                                <Download className="h-4 w-4" /> Download
                            </a>
                            <button onClick={() => setPreviewFile(null)} className="text-white/70 hover:text-white p-2 transition-colors flex items-center gap-1 bg-red-500/20 hover:bg-red-500/40 rounded">
                                <X className="h-5 w-5" /> Close
                            </button>
                        </div>
                    </div>
                    <div className="bg-slate-100 rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex items-center justify-center relative">
                        {previewFile.type === 'image' ? (
                            <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
                        ) : previewFile.type === 'pdf' ? (
                            <iframe src={previewFile.url} className="w-full h-full border-0" title={previewFile.name} />
                        ) : null}
                    </div>
                </div>
            )}

        </div>
    );
}