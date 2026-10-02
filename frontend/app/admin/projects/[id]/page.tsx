'use client';

import { useState, useEffect, useRef, use } from 'react';
import {
    FolderKanban, ArrowLeft, Save, Package, Paperclip,
    Plus, Trash2, Edit2, X, Image as ImageIcon,
    ClipboardList, Send, Download, Layers, Component, CheckSquare, Clock, Truck
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

const safeParse = async (res: Response | null) => {
    if (!res || !res.ok) return null;
    try { return await res.json(); } catch (e) { return null; }
};

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const projectId = resolvedParams.id;

    const [activeTab, setActiveTab] = useState<'items' | 'bom' | 'attachments' | 'mrf'>('items');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [companies, setCompanies] = useState<any[]>([]);
    const [biddings, setBiddings] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [inventoryList, setInventoryList] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [uoms, setUoms] = useState<any[]>([]);

    const [form, setForm] = useState({
        project_number: '', project_name: '', client_id: 0, bidding_id: 0, dbos_department_id: 0,
        projects_category: '', contract_amount: 0, project_date_start_date: '', project_date_end_date: '', project_status: 'Today'
    });

    const [projectItems, setProjectItems] = useState<any[]>([]);
    const [isItemModalOpen, setIsItemModalOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<number | null>(null);
    const [itemForm, setItemForm] = useState({ product_name: '', product_description: '', qty: 0, uom_id: 1 }); 
    const [itemImage, setItemImage] = useState<File | null>(null);
    const [dbosImage, setDbosImage] = useState<File | null>(null);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    // --- PARTS LIST STATES ---
    const [projectPartsList, setProjectPartsList] = useState<any[]>([]);
    const [activeItemForParts, setActiveItemForParts] = useState<any>(null);
    const [partsForm, setPartsForm] = useState({ part_name: '', description: '', qty_per_item: 1, uom_id: 1 });

    // --- MASTER BOM STATES ---
    const [masterBOMList, setMasterBOMList] = useState<any[]>([]);
    const [selectedPartsForBOM, setSelectedPartsForBOM] = useState<number[]>([]);
    const [partAllocations, setPartAllocations] = useState<{ [partId: number]: number }>({}); 
    const [isCustomBOM, setIsCustomBOM] = useState(false);
    const [bomForm, setBomForm] = useState({
        inventory_id: 0, custom_item_name: '', description: '', 
        qty_needed: 1, uom_id: 1, 
        currency_id: 1, unit_cost: 0, landed_cost: 0
    });

    const totalAllocated = selectedPartsForBOM.reduce((sum, partId) => {
        const part = projectPartsList.find(p => p.project_item_component_id === partId);
        const qtyPerPart = partAllocations[partId] || 0;
        return sum + (Number(qtyPerPart) * (part?.prod_qty || 1));
    }, 0);

    useEffect(() => {
        if (selectedPartsForBOM.length > 0) {
            setBomForm(prev => ({ ...prev, qty_needed: totalAllocated }));
        }
    }, [selectedPartsForBOM, partAllocations, totalAllocated]);

    const togglePartSelection = (partId: number) => {
        if (selectedPartsForBOM.includes(partId)) {
            setSelectedPartsForBOM(prev => prev.filter(id => id !== partId));
            setPartAllocations(prev => { const newAlloc = { ...prev }; delete newAlloc[partId]; return newAlloc; });
        } else {
            setSelectedPartsForBOM(prev => [...prev, partId]);
            setPartAllocations(prev => ({ ...prev, [partId]: 1 }));
        }
    };

    const updateAllocationQty = (partId: number, qtyStr: string) => {
        const qty = parseFloat(qtyStr) || 0;
        setPartAllocations(prev => ({ ...prev, [partId]: qty }));
    };

    // --- ATTACHMENTS & MRF ---
    const [attachments, setAttachments] = useState<any[]>([]);
    const [fileTypes, setFileTypes] = useState<any[]>([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [attachForm, setAttachForm] = useState({ file_type_id: 0, has_expiration: 0, expiration_date: '', version: '' });
    const [attachFile, setAttachFile] = useState<File | null>(null);
    const [previewFile, setPreviewFile] = useState<{ url: string, type: 'image' | 'pdf', name: string } | null>(null);

    const [mrfList, setMrfList] = useState<any[]>([]);
    const [isMrfModalOpen, setIsMrfModalOpen] = useState(false);
    const [mrfForm, setMrfForm] = useState({ date_requested: new Date().toISOString().split('T')[0], requested_by: '' });
    const [mrfRequestItems, setMrfRequestItems] = useState([{ bom_id: 0, inventory_id: 0, qty_requested: 1 }]);
    const [viewingMrf, setViewingMrf] = useState<any>(null);
    const [mrfDetails, setMrfDetails] = useState<any[]>([]);

    useEffect(() => {
        const user = localStorage.getItem('username');
        if (user) setMrfForm(prev => ({ ...prev, requested_by: user }));

        const fetchData = async () => {
            try {
                const [compRes, bidRes, deptRes, catRes, projRes, itemsRes, typesRes, attachRes, mrfRes, invRes, currRes, uomRes, partsRes, bomRes] = await Promise.all([
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
                    fetch(`${API_URL}/api/currencies`).catch(() => null),
                    fetch(`${API_URL}/api/uoms`).catch(() => null),
                    fetch(`${API_URL}/api/projects/${projectId}/parts`).catch(() => null),
                    fetch(`${API_URL}/api/projects/${projectId}/bom`).catch(() => null)
                ]);

                if (compRes) setCompanies(await safeParse(compRes) || []);
                if (bidRes) { const b = await safeParse(bidRes); setBiddings(b?.data || []); }
                if (deptRes) setDepartments(await safeParse(deptRes) || []);
                if (catRes) setCategories(await safeParse(catRes) || []);
                if (typesRes) setFileTypes(await safeParse(typesRes) || []);
                if (invRes) setInventoryList(await safeParse(invRes) || []);
                if (currRes) setCurrencies(await safeParse(currRes) || []);
                if (uomRes) setUoms(await safeParse(uomRes) || []);
                if (attachRes) setAttachments(await safeParse(attachRes) || []);
                if (mrfRes) setMrfList(await safeParse(mrfRes) || []);
                if (partsRes) setProjectPartsList(await safeParse(partsRes) || []);
                if (bomRes) setMasterBOMList(await safeParse(bomRes) || []);

                const projData = await safeParse(projRes);
                if (projData) {
                    const cleanDate = (d: string) => (!d || d.startsWith('0000-00-00')) ? '' : d.split(' ')[0];
                    setForm({
                        project_number: projData.project_number || '', project_name: projData.project_name || '',
                        client_id: projData.client_id || 0, bidding_id: projData.bidding_id || 0,
                        dbos_department_id: projData.dbos_department_id || 0, projects_category: projData.projects_category || '',
                        contract_amount: projData.contract_amount || 0, project_date_start_date: cleanDate(projData.project_date_start_date),
                        project_date_end_date: cleanDate(projData.project_date_end_date), project_status: projData.project_status || 'Today'
                    });
                }

                const itemsData = await safeParse(itemsRes);
                if (itemsData && Array.isArray(itemsData)) setProjectItems(itemsData);

            } catch (err) { console.error(err); } finally { setLoading(false); }
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

    // --- ITEM HANDLERS ---
    const fetchProjectItems = async () => {
        const res = await fetch(`${API_URL}/api/projects/${projectId}/items`);
        setProjectItems(await safeParse(res) || []);
    };

    const openItemModal = (item: any = null) => {
        if (item) {
            setEditingItemId(item.project_items_id);
            setItemForm({ product_name: item.product_name || '', product_description: item.product_description || '', qty: item.qty || 0, uom_id: item.uom_id || 1 });
        } else {
            setEditingItemId(null);
            setItemForm({ product_name: '', product_description: '', qty: 0, uom_id: 1 });
        }
        setItemImage(null); setDbosImage(null); setIsItemModalOpen(true);
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData();
        Object.entries(itemForm).forEach(([key, value]) => formData.append(key, String(value)));
        if (itemImage) formData.append('image_path', itemImage);
        if (dbosImage) formData.append('dbos_image_path', dbosImage);

        const url = editingItemId ? `${API_URL}/api/projects/${projectId}/items/${editingItemId}` : `${API_URL}/api/projects/${projectId}/items`;
        try {
            const res = await fetch(url, { method: editingItemId ? 'PUT' : 'POST', body: formData });
            if (res.ok) { setIsItemModalOpen(false); fetchProjectItems(); }
        } catch (err) { alert("Failed to save item."); }
    };

    const handleDeleteItem = async (id: number) => {
        if (!confirm("Delete this deliverable item?")) return;
        try {
            const res = await fetch(`${API_URL}/api/projects/items/${id}`, { method: 'DELETE' });
            if (res.ok) fetchProjectItems();
        } catch (err) { }
    };

    // --- PARTS LIST HANDLERS ---
    const fetchParts = async () => {
        const res = await fetch(`${API_URL}/api/projects/${projectId}/parts`);
        setProjectPartsList(await safeParse(res) || []);
    };

    const handleSavePart = async (e: React.FormEvent) => {
        e.preventDefault();
        const prodQty = (activeItemForParts?.qty || 1) * partsForm.qty_per_item;
        
        try {
            const res = await fetch(`${API_URL}/api/project-items/parts`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_items_id: activeItemForParts.project_items_id, ...partsForm, prod_qty: prodQty })
            });
            if (res.ok) {
                fetchParts();
                setPartsForm({ part_name: '', description: '', qty_per_item: 1, uom_id: 1 });
            }
        } catch (err) { alert("Error saving part"); }
    };

    const handleDeletePart = async (id: number) => {
        if (!confirm("Delete this part? This will remove it from the loading list.")) return;
        try {
            const res = await fetch(`${API_URL}/api/project-items/parts/${id}`, { method: 'DELETE' });
            if (res.ok) fetchParts();
        } catch (err) {}
    };

    // --- MASTER BOM HANDLERS WITH COST ALLOCATION ---
    const fetchMasterBOM = async () => {
        const res = await fetch(`${API_URL}/api/projects/${projectId}/bom`);
        setMasterBOMList(await safeParse(res) || []);
    };

    const handleSaveBOM = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isCustomBOM && bomForm.inventory_id === 0) return alert("Select a master inventory material");
        if (isCustomBOM && bomForm.custom_item_name.trim() === '') return alert("Please enter the custom material name");

        const finalQtyNeeded = parseFloat(String(bomForm.qty_needed)) || 0;
        if (finalQtyNeeded <= 0) return alert("Quantity needed must be greater than zero.");

        const landedCost = parseFloat(String(bomForm.landed_cost)) || 0;
        
        const allocations = selectedPartsForBOM.map(partId => {
            const part = projectPartsList.find(p => p.project_item_component_id === partId);
            const uniqueQtyPerPart = parseFloat(String(partAllocations[partId])) || 0;
            return {
                part_id: partId,
                qty_per_part: uniqueQtyPerPart,
                allocated_qty: uniqueQtyPerPart * (part?.prod_qty || 1)
            };
        });

        const payload = {
            project_id: parseInt(projectId),
            inventory_id: isCustomBOM ? 0 : bomForm.inventory_id,
            custom_item_name: isCustomBOM ? bomForm.custom_item_name : '',
            description: isCustomBOM ? bomForm.description : '',
            qty_needed: finalQtyNeeded,
            uom_id: bomForm.uom_id || 1,
            currency_id: bomForm.currency_id,
            unit_cost: parseFloat(String(bomForm.unit_cost)) || 0,
            landed_cost: landedCost,
            total_cost: finalQtyNeeded * landedCost,
            allocations: allocations 
        };

        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/bom`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchMasterBOM();
                setBomForm({ inventory_id: 0, custom_item_name: '', description: '', qty_needed: 1, uom_id: 1, currency_id: 1, unit_cost: 0, landed_cost: 0 });
                setSelectedPartsForBOM([]);
                setPartAllocations({});
                setIsCustomBOM(false);
            }
        } catch (err) { alert("Error saving BOM material"); }
    };

    const handleDeleteBOM = async (id: number) => {
        if (!confirm("Delete this material from the Master BOM?")) return;
        try {
            const res = await fetch(`${API_URL}/api/projects/bom/${id}`, { method: 'DELETE' });
            if (res.ok) fetchMasterBOM();
        } catch (err) {}
    };

    // --- MRF HANDLERS ---
    const fetchMRFs = async () => {
        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/mrfs`);
            if (res.ok) setMrfList(await res.json());
        } catch (err) {}
    };

    const handleOpenCreateMRF = () => {
        if (masterBOMList && masterBOMList.length > 0) {
            const autoPopulated = masterBOMList.map(bom => ({
                bom_id: bom.bom_id,
                inventory_id: bom.inventory_id || 0,
                qty_requested: bom.qty_needed || 1,
                custom_item_name: bom.custom_item_name || ''
            }));
            setMrfRequestItems(autoPopulated);
        } else {
            setMrfRequestItems([{ bom_id: 0, inventory_id: 0, qty_requested: 1 }]);
        }
        setIsMrfModalOpen(true);
    };

    const handleCreateMRF = async (e: React.FormEvent) => {
        e.preventDefault();
        const validItems = mrfRequestItems.filter(i => i.bom_id > 0 && i.qty_requested > 0);
        if (validItems.length === 0) return alert("Please map at least one valid BOM material to request.");

        try {
            const res = await fetch(`${API_URL}/api/projects/${projectId}/mrfs`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date_requested: mrfForm.date_requested, requested_by: mrfForm.requested_by, items: validItems })
            });

            if (res.ok) {
                setIsMrfModalOpen(false); 
                fetchMRFs(); 
                alert("MRF created and sent to warehouse!");
            } else { const data = await res.json(); alert(data.error || "Failed to create MRF"); }
        } catch (err) {}
    };

    const openMRFView = async (mrf: any) => {
        setViewingMrf(mrf);
        try {
            const res = await fetch(`${API_URL}/api/warehouse/mrfs/${mrf.mrf_id}/items`);
            const data = await safeParse(res);
            if (data) setMrfDetails(data);
        } catch (err) { console.error(err); }
    };

    // --- ATTACHMENT HANDLERS ---
    const fetchAttachments = async () => {
        const res = await fetch(`${API_URL}/api/projects/${projectId}/attachments`);
        const data = await safeParse(res);
        if (data) setAttachments(data);
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


    const formatCurrency = (val: number, code: string = 'PHP') => new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(val || 0);

    const statusOptions = ["Today", "Under Evaluation", "Awarded", "Failed", "On-going", "Completed"];
    const companyOptions = (companies || []).map(c => ({ value: c.company_id, label: c.company_name }));
    const biddingOptions = (biddings || []).map(b => ({ value: b.bidding_id, label: `${b.reference_no} - ${b.title || 'No Title'}` }));
    const departmentOptions = (departments || []).map(d => ({ value: d.department_id, label: d.department }));
    const categoryOptions = (categories || []).map(c => ({ value: c.category, label: c.category }));
    const inventoryOptions = (inventoryList || []).map(i => ({ value: i.inventory_id, label: `${i.dbos_code} - ${i.inventory_name}` }));

    const mrfBOMOptions = (masterBOMList || []).map(bom => ({
        value: bom.bom_id,
        label: bom.inventory_id > 0 
            ? `${bom.dbos_code} - ${bom.inventory_name} (Need: ${bom.qty_needed} ${bom.uom_abbr})`
            : `[CUSTOM] ${bom.custom_item_name} (Need: ${bom.qty_needed} ${bom.uom_abbr})`
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
                    
                    {/* LEFT PANEL: PROJECT DETAILS */}
                    <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                            <FolderKanban className="h-5 w-5 text-blue-600" /> Project Details
                        </h2>
                        
                        <form onSubmit={handleSaveDetails} className="space-y-4 text-sm">
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Project Name *</label><input type="text" required value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" /></div>
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Client Company</label><SearchableSelect options={companyOptions} value={form.client_id} onChange={(val: string) => setForm({ ...form, client_id: parseInt(val) || 0 })} placeholder="Select Client..." /></div>
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Linked Bidding</label><SearchableSelect options={biddingOptions} value={form.bidding_id} onChange={(val: string) => setForm({ ...form, bidding_id: parseInt(val) || 0 })} placeholder="Optional: Link Bidding..." /></div>
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Department *</label><SearchableSelect options={departmentOptions} value={form.dbos_department_id} onChange={(val: string) => setForm({ ...form, dbos_department_id: parseInt(val) || 0 })} placeholder="Select Department..." /></div>
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category *</label><SearchableSelect options={categoryOptions} value={form.projects_category} onChange={(val: string) => setForm({ ...form, projects_category: val })} placeholder="Select Category..." /></div>
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contract Amount *</label><input type="number" step="0.01" required value={form.contract_amount} onChange={(e) => setForm({ ...form, contract_amount: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500" /></div>
                            <div className="grid grid-cols-2 gap-2">
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label><input type="date" value={form.project_date_start_date} onChange={(e) => setForm({ ...form, project_date_start_date: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none text-xs" /></div>
                                <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label><input type="date" value={form.project_date_end_date} onChange={(e) => setForm({ ...form, project_date_end_date: e.target.value })} className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none text-xs" /></div>
                            </div>
                            <div><label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label><select value={form.project_status} onChange={(e) => setForm({ ...form, project_status: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white">{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                            <button type="submit" disabled={saving} className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Project"}</button>
                        </form>
                    </div>

                    {/* RIGHT PANEL: TABS */}
                    <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[640px] flex flex-col overflow-hidden">
                        <div className="border-b border-slate-200 px-4 pt-2 overflow-x-auto">
                            <div className="flex gap-2 min-w-max">
                                <button type="button" onClick={() => setActiveTab('items')} className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === 'items' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><Package className="h-4 w-4" /> Finished Goods & Parts</button>
                                <button type="button" onClick={() => setActiveTab('bom')} className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === 'bom' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><Layers className="h-4 w-4" /> Master Project BOM</button>
                                <button type="button" onClick={() => setActiveTab('attachments')} className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === 'attachments' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><Paperclip className="h-4 w-4" /> Attachments</button>
                                <button type="button" onClick={() => setActiveTab('mrf')} className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === 'mrf' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}><ClipboardList className="h-4 w-4" /> Requisitions (MRF)</button>
                            </div>
                        </div>

                        <div className="flex-1 p-6">
                            
                            {/* TAB 1: ITEMS & PARTS */}
                            {activeTab === 'items' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div><h3 className="font-bold text-slate-800">Deliverable Items & Parts List</h3><p className="text-xs text-slate-500">Define finished goods and their physical delivery parts</p></div>
                                        <button onClick={() => openItemModal()} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Finished Good</button>
                                    </div>
                                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                                        <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                                            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Images</th>
                                                    <th className="px-4 py-3 font-medium">Finished Good Name</th>
                                                    <th className="px-4 py-3 font-medium text-center">Project Qty</th>
                                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {!projectItems || projectItems.length === 0 ? (
                                                    <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">No deliverable items added yet.</td></tr>
                                                ) : projectItems.map(item => (
                                                    <tr key={item.project_items_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-2 flex gap-2">
                                                            {item.image_path ? <img src={`${API_URL}${item.image_path}`} onClick={() => setEnlargedImage(`${API_URL}${item.image_path}`)} alt="Req" className="h-10 w-10 object-cover rounded border cursor-zoom-in" /> : <div className="h-10 w-10 bg-slate-100 rounded border flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-300" /></div>}
                                                            {item.dbos_image_path ? <img src={`${API_URL}${item.dbos_image_path}`} onClick={() => setEnlargedImage(`${API_URL}${item.dbos_image_path}`)} alt="DBOS" className="h-10 w-10 object-cover rounded border cursor-zoom-in" /> : <div className="h-10 w-10 bg-slate-100 rounded border flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-300" /></div>}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-bold text-slate-800">{item.product_name}</div>
                                                            <div className="text-xs text-slate-400 truncate max-w-[200px]" title={item.product_description}>{item.product_description}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-blue-600 text-lg">
                                                            {item.qty} <span className="text-xs font-normal text-slate-400">{item.uom_abbr || 'Units'}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => setActiveItemForParts(item)} className="text-emerald-600 hover:text-emerald-800 p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded flex items-center gap-1 text-xs font-bold" title="Manage Loading Parts"><Package className="h-4 w-4" /> Parts List</button>
                                                                <button onClick={() => openItemModal(item)} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 hover:bg-blue-100 rounded"><Edit2 className="h-4 w-4" /></button>
                                                                <button onClick={() => handleDeleteItem(item.project_items_id)} className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 hover:bg-red-100 rounded"><Trash2 className="h-4 w-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: MASTER PROJECT BOM (WITH COST ALLOCATION) */}
                            {activeTab === 'bom' && (
                                <div className="flex flex-col h-full space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div><h3 className="font-bold text-slate-800">Master Project BOM (Raw Materials)</h3><p className="text-xs text-slate-500">Allocate bulk materials to physical parts to generate Job Costs</p></div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        
                                        {/* BOM Left: Select Parts (CLEAN CHECKBOXES) */}
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-[400px] overflow-y-auto">
                                            <h4 className="text-xs font-bold text-slate-700 uppercase mb-3 flex items-center gap-2"><CheckSquare className="h-4 w-4" /> 1. Select Associated Parts</h4>
                                            <p className="text-[10px] text-slate-500 mb-3 leading-tight">Check the parts that use this material.</p>
                                            
                                            {projectPartsList.length === 0 ? (
                                                <div className="text-sm italic text-slate-400">Please define project parts first in the Items tab.</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {projectPartsList.map(part => (
                                                        <label key={part.project_item_component_id} className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${selectedPartsForBOM.includes(part.project_item_component_id) ? 'bg-blue-50 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedPartsForBOM.includes(part.project_item_component_id)} 
                                                                onChange={() => togglePartSelection(part.project_item_component_id)} 
                                                                className="rounded text-blue-600 w-4 h-4" 
                                                            />
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-800 leading-tight">{part.part_name}</span>
                                                                <span className="text-[10px] text-slate-500">For: {part.parent_item_name} (Need: {part.prod_qty} {part.uom_abbr})</span>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* BOM Right: Material Form */}
                                        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
                                            <h4 className="text-xs font-bold text-blue-700 uppercase mb-4 border-b border-slate-100 pb-2">2. Add Bulk Material & Costs</h4>
                                            <form onSubmit={handleSaveBOM} className="space-y-4">
                                                
                                                <div className="flex items-center gap-3">
                                                    <input type="checkbox" id="customBomToggle" checked={isCustomBOM} onChange={e => setIsCustomBOM(e.target.checked)} className="rounded text-blue-600" />
                                                    <label htmlFor="customBomToggle" className="text-xs font-bold text-blue-600 uppercase cursor-pointer">Custom Material</label>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Material / Supply *</label>
                                                    {isCustomBOM ? (
                                                        <input required value={bomForm.custom_item_name} onChange={e => setBomForm({...bomForm, custom_item_name: e.target.value})} placeholder="Describe custom material name..." className="w-full p-2 border rounded text-sm outline-none focus:border-blue-500" />
                                                    ) : (
                                                        <SearchableSelect options={inventoryOptions} value={bomForm.inventory_id} onChange={(v: string) => setBomForm({ ...bomForm, inventory_id: parseInt(v) || 0 })} placeholder="Search Master Inventory..." />
                                                    )}
                                                </div>

                                                {/* CONDITIONAL DESCRIPTION FIELD */}
                                                {isCustomBOM && (
                                                    <div>
                                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Specifications</label>
                                                        <textarea value={bomForm.description} onChange={e => setBomForm({...bomForm, description: e.target.value})} placeholder="e.g. 18mm thickness, specific brand required..." className="w-full p-2 border rounded text-sm outline-none focus:border-blue-500" rows={2} />
                                                    </div>
                                                )}

                                                {/* DYNAMIC ALLOCATION INPUTS */}
                                                {selectedPartsForBOM.length > 0 && (
                                                    <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-3 space-y-3">
                                                        <label className="block text-[11px] font-bold text-blue-800 uppercase border-b border-blue-200 pb-1">Define Material Qty Per Part</label>
                                                        {selectedPartsForBOM.map(partId => {
                                                            const part = projectPartsList.find(p => p.project_item_component_id === partId);
                                                            return (
                                                                <div key={partId} className="flex items-center justify-between gap-3 bg-white p-2 rounded border border-blue-100">
                                                                    <div className="flex-1 truncate text-sm font-medium text-slate-700">{part?.part_name} <span className="text-[10px] text-slate-400 block font-normal">Project Total Needed: {part?.prod_qty} {part?.uom_abbr}</span></div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] text-slate-500 font-bold uppercase">Qty Per Part:</span>
                                                                        <input 
                                                                            type="number" step="0.01" min="0" 
                                                                            value={partAllocations[partId] === undefined ? '' : partAllocations[partId]} 
                                                                            onChange={(e) => updateAllocationQty(partId, e.target.value)} 
                                                                            className="w-24 p-1.5 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-200 text-center font-bold text-blue-700" 
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Total Qty Needed</label>
                                                        <input 
                                                            required type="number" step="0.01" min="0.01" 
                                                            value={bomForm.qty_needed} 
                                                            onChange={e => setBomForm({...bomForm, qty_needed: parseFloat(e.target.value) || 0})} 
                                                            disabled={selectedPartsForBOM.length > 0} 
                                                            className={`w-full p-2 border rounded text-sm outline-none font-bold ${selectedPartsForBOM.length > 0 ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'focus:border-blue-500'}`} 
                                                            title={selectedPartsForBOM.length > 0 ? "Auto-calculated from allocations above" : "Manual entry"}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit of Measure</label>
                                                        <select value={bomForm.uom_id} onChange={e => setBomForm({...bomForm, uom_id: parseInt(e.target.value) || 1})} className="w-full p-2 border rounded text-sm outline-none bg-white">
                                                            {uoms.map((u: any) => <option key={u.uom_id} value={u.uom_id}>{u.uom_desc} ({u.uom_abbr})</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Supplier Currency</label>
                                                        <select value={bomForm.currency_id} onChange={e => setBomForm({...bomForm, currency_id: parseInt(e.target.value)})} className="w-full p-2 border rounded text-sm outline-none bg-white">
                                                            {currencies.map(c => <option key={c.currency_id} value={c.currency_id}>{c.currency_code} - {c.currency_name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 space-y-3">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div><label className="block text-[10px] font-bold text-orange-700 uppercase">Unit Cost</label><input type="number" step="0.01" value={bomForm.unit_cost} onChange={e => setBomForm({...bomForm, unit_cost: parseFloat(e.target.value) || 0})} className="w-full p-1.5 border-b border-orange-300 text-sm outline-none bg-white focus:ring-2 focus:ring-orange-200 rounded" /></div>
                                                        <div><label className="block text-[10px] font-bold text-orange-700 uppercase">Landed Cost (Incl. Shipping)</label><input type="number" step="0.01" value={bomForm.landed_cost} onChange={e => setBomForm({...bomForm, landed_cost: parseFloat(e.target.value) || 0})} className="w-full p-1.5 border-b border-orange-300 text-sm outline-none bg-white focus:ring-2 focus:ring-orange-200 rounded" /></div>
                                                    </div>
                                                    <div className="border-t border-orange-200 pt-2 flex justify-between items-center">
                                                        <label className="text-xs font-bold text-orange-800 uppercase">Total Estimated Job Cost</label>
                                                        <div className="font-black text-xl text-orange-700">{formatCurrency(bomForm.qty_needed * bomForm.landed_cost, currencies.find(c => c.currency_id === bomForm.currency_id)?.currency_code || 'PHP')}</div>
                                                    </div>
                                                </div>
                                                
                                                <button type="submit" className="w-full py-2.5 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm"><Plus className="h-4 w-4"/> Save Material & Allocations</button>
                                            </form>
                                        </div>
                                    </div>

                                    {/* BOM Master List Table */}
                                    <div className="border border-slate-200 rounded-lg overflow-x-auto mt-4">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Material</th>
                                                    <th className="px-4 py-3 font-medium">Allocated To Parts (Qty)</th>
                                                    <th className="px-4 py-3 font-medium text-center bg-blue-50/50">Total Qty Needed</th>
                                                    <th className="px-4 py-3 font-medium bg-orange-50/50">Landed Job Cost</th>
                                                    <th className="px-4 py-3 font-medium text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {masterBOMList.length === 0 ? (
                                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No materials requested for this project yet.</td></tr>
                                                ) : masterBOMList.map(b => (
                                                    <tr key={b.bom_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            {b.inventory_id > 0 ? (
                                                                <><div className="font-bold text-slate-800">{b.inventory_name}</div><div className="text-xs text-slate-400">{b.dbos_code}</div></>
                                                            ) : (
                                                                <><div className="font-bold text-blue-700">{b.custom_item_name} <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[9px] rounded uppercase">Custom</span></div></>
                                                            )}
                                                            {b.description && <div className="text-[10px] text-slate-500 mt-1 max-w-[200px] truncate" title={b.description}>{b.description}</div>}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="text-xs bg-slate-100 text-slate-600 px-2 py-1.5 rounded max-w-[300px] truncate border border-slate-200 font-medium" title={b.used_for_parts}>{b.used_for_parts}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-blue-700 text-base bg-blue-50/30">
                                                            {b.qty_needed} <span className="text-xs font-normal text-blue-500 ml-0.5">{b.uom_abbr}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs bg-orange-50/30">
                                                            <span className="text-slate-500">Unit: {formatCurrency(b.landed_cost, b.currency_code)}</span><br />
                                                            <span className="font-bold text-orange-700">Total: {formatCurrency(b.total_cost, b.currency_code)}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button onClick={() => handleDeleteBOM(b.bom_id)} className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 hover:bg-red-100 rounded"><Trash2 className="h-4 w-4" /></button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: ATTACHMENTS */}
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

                            {/* TAB 4: MRF */}
                            {activeTab === 'mrf' && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div><h3 className="font-bold text-slate-800">Material Requisition Forms</h3><p className="text-xs text-slate-500">Internal requests for materials required for this project</p></div>
                                        <button onClick={handleOpenCreateMRF} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm"><Plus className="h-4 w-4" /> Create MRF</button>
                                    </div>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-sm text-slate-600">
                                            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">MRF No.</th>
                                                    <th className="px-4 py-3 font-medium">Date Requested</th>
                                                    <th className="px-4 py-3 font-medium">Requested By</th>
                                                    <th className="px-4 py-3 font-medium">Status</th>
                                                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {mrfList.length === 0 ? (<tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400 italic">No Material Requisition Forms found.</td></tr>) : mrfList.map((mrf: any) => (
                                                    <tr key={mrf.mrf_id} className="border-b border-slate-100 hover:bg-slate-50">
                                                        <td className="px-4 py-3 font-bold text-blue-600">{mrf.mrf_number}</td>
                                                        <td className="px-4 py-3">{mrf.date_requested.split('T')[0]}</td>
                                                        <td className="px-4 py-3">{mrf.requested_by}</td>
                                                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${mrf.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : mrf.status === 'Partial' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>{mrf.status}</span></td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button onClick={() => openMRFView(mrf)} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 rounded font-medium text-xs">View Details</button>
                                                        </td>
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

            {/* MODALS */}

            {/* ADD FINISHED GOOD MODAL */}
            {isItemModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
                        <div className="p-4 border-b bg-blue-600 text-white rounded-t-xl flex justify-between">
                            <h3 className="font-bold">{editingItemId ? 'Edit Deliverable' : 'Add Finished Good'}</h3>
                            <button onClick={() => setIsItemModalOpen(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                            <div><label className="block text-sm font-medium mb-1">Item Name *</label><input required type="text" value={itemForm.product_name} onChange={e => setItemForm({ ...itemForm, product_name: e.target.value })} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500" placeholder="e.g. Custom Dining Table" /></div>
                            <div><label className="block text-sm font-medium mb-1">Description</label><textarea rows={3} value={itemForm.product_description} onChange={e => setItemForm({ ...itemForm, product_description: e.target.value })} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500" placeholder="Detailed specs..." /></div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1">Total Project Qty *</label><input required type="number" min="1" value={itemForm.qty} onChange={e => setItemForm({ ...itemForm, qty: parseInt(e.target.value) || 0 })} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500" /></div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-slate-700">Unit of Measure *</label>
                                    <select value={itemForm.uom_id} onChange={e => setItemForm({...itemForm, uom_id: parseInt(e.target.value) || 1})} className="w-full p-2 border rounded text-sm outline-none bg-white">
                                        {uoms.map((u: any) => <option key={u.uom_id} value={u.uom_id}>{u.uom_desc} ({u.uom_abbr})</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                                <div><label className="block text-sm font-medium mb-1 text-slate-700">Client Image</label><input type="file" accept="image/*" onChange={e => setItemImage(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded text-xs bg-slate-50" /></div>
                                <div><label className="block text-sm font-medium mb-1 text-slate-700">DBOS Image</label><input type="file" accept="image/*" onChange={e => setDbosImage(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border rounded text-xs bg-slate-50" /></div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-5 py-2 border rounded font-medium">Cancel</button>
                                <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded font-medium shadow-sm">Save Deliverable</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PARTS MANAGER MODAL */}
            {activeItemForParts && (
                <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b flex justify-between items-center bg-emerald-600 text-white rounded-t-xl shrink-0">
                            <div>
                                <h3 className="font-bold text-lg">Parts & Assembly List</h3>
                                <p className="text-emerald-100 text-xs">For: {activeItemForParts.product_name} | Qty: {activeItemForParts.qty} {activeItemForParts.uom_abbr}</p>
                            </div>
                            <button onClick={() => setActiveItemForParts(null)} className="hover:text-emerald-200"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                            
                            <div className="w-full lg:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto shrink-0">
                                <h4 className="font-bold text-slate-700 mb-4 border-b border-slate-200 pb-2">Add Physical Part</h4>
                                <form onSubmit={handleSavePart} className="space-y-4">
                                    <div><label className="block text-xs font-semibold mb-1">Part Name *</label><input required value={partsForm.part_name} onChange={e => setPartsForm({...partsForm, part_name: e.target.value})} placeholder="e.g. Table Top" className="w-full p-2 border rounded text-sm outline-none" /></div>
                                    <div><label className="block text-xs font-semibold mb-1">Dimensions / Specs</label><input value={partsForm.description} onChange={e => setPartsForm({...partsForm, description: e.target.value})} placeholder="e.g. 4ft x 8ft" className="w-full p-2 border rounded text-sm outline-none" /></div>
                                    
                                    <div className="grid grid-cols-3 gap-3 bg-white p-3 rounded border border-slate-200">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Qty per Item</label>
                                            <input required type="number" min="0.01" step="0.01" value={partsForm.qty_per_item} onChange={e => setPartsForm({ ...partsForm, qty_per_item: parseFloat(e.target.value) || 0 })} className="w-full p-1.5 border-b text-sm outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">UOM</label>
                                            <select value={partsForm.uom_id} onChange={e => setPartsForm({...partsForm, uom_id: parseInt(e.target.value) || 1})} className="w-full p-1.5 border-b text-sm outline-none bg-white text-slate-700">
                                                {uoms.map((u: any) => <option key={u.uom_id} value={u.uom_id}>{u.uom_abbr}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Total Needed</label>
                                            <div className="flex items-end gap-1 w-full p-1.5 border-b">
                                                <span className="text-sm text-slate-700 font-bold truncate">{(activeItemForParts.qty || 1) * partsForm.qty_per_item}</span>
                                                <span className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">{uoms.find((u: any) => u.uom_id === partsForm.uom_id)?.uom_abbr || ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"><Plus className="h-4 w-4"/> Add Part</button>
                                </form>
                            </div>

                            <div className="w-full lg:w-2/3 p-0 overflow-y-auto bg-white">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 sticky top-0">
                                        <tr><th className="px-4 py-3 font-medium">Part Name & Specs</th><th className="px-4 py-3 font-medium text-center">Quantities</th><th className="px-4 py-3 font-medium text-right">Action</th></tr>
                                    </thead>
                                    <tbody>
                                        {projectPartsList.filter(p => p.project_items_id === activeItemForParts.project_items_id).length === 0 ? (
                                            <tr><td colSpan={3} className="px-4 py-12 text-center text-slate-400 italic">No parts defined for this item yet.</td></tr>
                                        ) : projectPartsList.filter(p => p.project_items_id === activeItemForParts.project_items_id).map(p => {
                                            
                                            // SMART LOOKUP: This guarantees the UOM shows even if the backend misses it
                                            const partUom = uoms.find((u: any) => String(u.uom_id) === String(p.uom_id))?.uom_abbr || p.uom_abbr || 'Units';

                                            return (
                                                <tr key={p.project_item_component_id} className="border-b border-slate-100">
                                                    <td className="px-4 py-3"><div className="font-bold text-slate-800">{p.part_name}</div><div className="text-xs text-slate-400">{p.description}</div></td>
                                                    <td className="px-4 py-3 text-center text-xs">
                                                        Per Item: {p.qty_per_item} <span className="text-slate-400 font-bold uppercase ml-0.5">{partUom}</span><br />
                                                        <span className="font-bold text-blue-600 text-sm">
                                                            Total: {p.prod_qty} <span className="text-blue-400 text-xs font-bold uppercase ml-0.5">{partUom}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right"><button onClick={() => handleDeletePart(p.project_item_component_id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded"><Trash2 className="h-4 w-4" /></button></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE MRF MODAL */}
            {isMrfModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-blue-600 text-white rounded-t-xl flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-lg">Create Material Requisition</h3>
                                <p className="text-blue-100 text-xs mt-0.5">Review requested quantities from Master BOM and submit to warehouse.</p>
                            </div>
                            <button onClick={() => setIsMrfModalOpen(false)} className="hover:text-blue-200"><X className="h-6 w-6" /></button>
                        </div>
                        
                        <div className="p-6 pb-32 overflow-y-auto bg-slate-50 flex-1">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Date Requested</label><input type="date" value={mrfForm.date_requested} onChange={e => setMrfForm({...mrfForm, date_requested: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none" /></div>
                                <div><label className="block text-sm font-semibold text-slate-700 mb-1">Requested By</label><input type="text" value={mrfForm.requested_by} onChange={e => setMrfForm({...mrfForm, requested_by: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none" /></div>
                            </div>
                            
                            <div className="bg-white border border-slate-200 rounded-lg overflow-visible">
                                <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center rounded-t-lg">
                                    <h4 className="font-bold text-slate-700 text-sm">Requested BOM Items</h4>
                                    <button onClick={() => setMrfRequestItems([...mrfRequestItems, { bom_id: 0, inventory_id: 0, qty_requested: 1 }])} className="text-xs bg-white border border-slate-300 px-2 py-1 rounded flex items-center gap-1 hover:bg-slate-50"><Plus className="h-3 w-3" /> Add Row</button>
                                </div>
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr><th className="p-3 w-3/4">Master BOM Material</th><th className="p-3 text-center">Qty Needed</th><th className="p-3 text-right"></th></tr>
                                    </thead>
                                    <tbody>
                                        {mrfRequestItems.map((item, idx) => (
                                            <tr key={idx} className="border-b border-slate-100">
                                                <td className="p-2">
                                                    <SearchableSelect 
                                                        options={mrfBOMOptions} value={item.bom_id} 
                                                        onChange={(v: string) => { 
                                                            const id = parseInt(v) || 0;
                                                            const selectedBom = masterBOMList.find(b => b.bom_id === id);
                                                            const newItems = [...mrfRequestItems]; 
                                                            newItems[idx].bom_id = id;
                                                            newItems[idx].inventory_id = selectedBom ? selectedBom.inventory_id : 0;
                                                            newItems[idx].qty_requested = selectedBom ? selectedBom.qty_needed : 1;
                                                            setMrfRequestItems(newItems); 
                                                        }} placeholder="Select a material from the Master BOM..." 
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    <input type="number" min="0.01" step="0.01" value={item.qty_requested} onChange={e => { const newItems = [...mrfRequestItems]; newItems[idx].qty_requested = parseFloat(e.target.value) || 0; setMrfRequestItems(newItems); }} className="w-24 p-2 border border-slate-300 rounded text-center outline-none font-bold" />
                                                </td>
                                                <td className="p-2 text-right">
                                                    {mrfRequestItems.length > 1 && (<button onClick={() => setMrfRequestItems(mrfRequestItems.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700 p-1.5 bg-red-50 rounded" title="Remove from MRF"><Trash2 className="h-4 w-4" /></button>)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0 rounded-b-xl">
                            <button onClick={() => setIsMrfModalOpen(false)} className="px-5 py-2 border rounded-lg font-medium hover:bg-slate-50">Cancel</button>
                            <button onClick={handleCreateMRF} className="px-5 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"><Send className="h-4 w-4 mr-2 inline"/>Submit Request</button>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOAD ATTACHMENT MODAL */}
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

            {/* PREVIEW MODALS */}
            {enlargedImage && (
                <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setEnlargedImage(null)}>
                    <img src={enlargedImage} alt="Enlarged" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>
            )}

            {previewFile && (
                <div className="fixed inset-0 bg-slate-900/95 z-[100] flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-6xl flex justify-between items-center mb-4">
                        <h3 className="text-white font-bold">{previewFile.name}</h3>
                        <button onClick={() => setPreviewFile(null)} className="text-white p-2 bg-red-500 rounded"><X className="h-5 w-5" /> Close</button>
                    </div>
                    <div className="bg-slate-100 rounded-lg shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex items-center justify-center relative">
                        {previewFile.type === 'image' ? <img src={previewFile.url} alt="Preview" className="max-h-full object-contain" /> : <iframe src={previewFile.url} className="w-full h-full border-0" />}
                    </div>
                </div>
            )}

            {/* UPGRADED: MRF DETAILS VIEW MODAL */}
            {viewingMrf && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b bg-slate-800 text-white rounded-t-xl flex justify-between items-center">
                            <div><h3 className="font-bold text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5" /> MRF: {viewingMrf.mrf_number}</h3></div>
                            <button onClick={() => setViewingMrf(null)} className="hover:text-slate-200"><X className="h-6 w-6" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                            <table className="w-full text-left text-sm text-slate-600 bg-white border border-slate-200 rounded-lg overflow-hidden">
                                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                    <tr>
                                        <th className="p-3">Material</th>
                                        <th className="p-3 text-center">Req Qty</th>
                                        <th className="p-3 text-center">Issued</th>
                                        <th className="p-3 text-center">Pending (PO)</th>
                                        <th className="p-3">Status / Delivery</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mrfDetails.length === 0 ? (
                                        <tr><td colSpan={5} className="p-6 text-center italic">Loading...</td></tr>
                                    ) : mrfDetails.map(d => {
                                        const qtyIssued = d.qty_issued || 0;
                                        const pendingQty = d.qty_requested - qtyIssued;

                                        return (
                                            <tr key={d.mrf_item_id} className="border-b border-slate-100">
                                                <td className="p-3">
                                                    {d.inventory_id === 0 ? (
                                                        <span className="font-bold text-blue-700">{d.custom_item_name} <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded">CUSTOM</span></span>
                                                    ) : (
                                                        <><div className="font-bold text-slate-800">{d.inventory_name}</div><div className="text-xs text-slate-400">{d.dbos_code}</div></>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center font-bold text-blue-700">{d.qty_requested}</td>
                                                <td className="p-3 text-center font-bold text-emerald-600">{qtyIssued > 0 ? qtyIssued : '-'}</td>
                                                <td className="p-3 text-center font-bold text-orange-600">{pendingQty > 0 ? pendingQty : 0}</td>
                                                <td className="p-3">
                                                    {pendingQty <= 0 ? (
                                                        <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded">Fully Issued</span>
                                                    ) : (
                                                        <div className="flex flex-col gap-1">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider w-max ${
                                                                d.status?.includes('PO') ? 'bg-blue-100 text-blue-700' :
                                                                d.status?.includes('Canvassing') ? 'bg-amber-100 text-amber-700' : 
                                                                'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                {d.status || 'Pending Sourcing'}
                                                            </span>
                                                            {d.po_number && d.po_number !== 'N/A' && (
                                                                <div className="text-xs mt-1">
                                                                    <div className="font-bold text-slate-700 flex items-center gap-1"><Truck className="h-3 w-3" /> PO: {d.po_number}</div>
                                                                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> ETA: <span className="font-medium text-slate-700">{d.po_eta || d.expected_delivery_date || 'Pending Update'}</span></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t bg-white flex justify-end rounded-b-xl"><button onClick={() => setViewingMrf(null)} className="px-5 py-2 border rounded-lg font-medium hover:bg-slate-50 transition-colors">Close Details</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}