'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    ShoppingCart, ArrowLeft, Plus, X, 
    FileText, CheckCircle, Building2, Calculator, Search, Award, Printer, Edit3, Save, CheckSquare, FileSignature
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Reusable Searchable Dropdown
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
                <span className={selectedOption ? "text-slate-900 truncate pr-2 font-medium" : "text-slate-400 truncate"}>{selectedOption ? selectedOption.label : placeholder}</span>
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

export default function PurchasingPage() {
    const [activeTab, setActiveTab] = useState<'canvass' | 'po'>('canvass');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState<any[]>([]);
    const [companies, setCompanies] = useState<any[]>([]);

    // PO States
    const [awardedItems, setAwardedItems] = useState<any[]>([]);
    const [selectedPOComponentIds, setSelectedPOComponentIds] = useState<number[]>([]);

    // Canvass Bulk Select States
    const [selectedComponentIds, setSelectedComponentIds] = useState<number[]>([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkForm, setBulkForm] = useState({ supplier_id: 0, rfq_number: '' });

    // Individual Item Modal States
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
    const [prospectForm, setProspectForm] = useState({ supplier_id: 0, rfq_number: '' });
    const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
    const [priceForm, setPriceForm] = useState({ quoted_unit_price: '', quoted_landed_price: '', quoted_selling_price: '', remarks: '' });

    const fetchData = async () => {
        try {
            const [itemsRes, compRes, awardedRes] = await Promise.all([
                fetch(`${API_URL}/api/canvass/items`),
                fetch(`${API_URL}/api/companies`),
                fetch(`${API_URL}/api/po/awarded-items`) // Fetch items ready for PO
            ]);
            if (itemsRes.ok) setItems(await itemsRes.json() || []);
            if (compRes.ok) setCompanies(await compRes.json() || []);
            if (awardedRes.ok) setAwardedItems(await awardedRes.json() || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // ----------------------------------------------------------------------
    // PHASE 3: CANVASSING LOGIC (Unchanged)
    // ----------------------------------------------------------------------
    const handleCheckAllCanvass = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allUnawardedIds = filteredItems.filter(i => !i.has_selected_supplier).map(i => i.project_item_component_id);
            setSelectedComponentIds(allUnawardedIds);
        } else { setSelectedComponentIds([]); }
    };

    const handleCheckItemCanvass = (id: number) => {
        setSelectedComponentIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleGenerateBulkRFQ = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bulkForm.supplier_id === 0) return alert("Select a supplier to generate RFQ.");
        if (selectedComponentIds.length === 0) return alert("No items selected.");

        const rfqNum = bulkForm.rfq_number || `RFQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const selectedSupplier = companies.find(c => c.company_id === bulkForm.supplier_id);
        const selectedComponentsData = items.filter(i => selectedComponentIds.includes(i.project_item_component_id));

        try {
            const res = await fetch(`${API_URL}/api/canvass/quotes/bulk`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ supplier_id: bulkForm.supplier_id, rfq_number: rfqNum, component_ids: selectedComponentIds })
            });
            
            if (res.ok) {
                printConsolidatedRFQ(selectedSupplier.company_name, rfqNum, selectedComponentsData);
                setIsBulkModalOpen(false);
                setSelectedComponentIds([]);
                setBulkForm({ supplier_id: 0, rfq_number: '' });
                fetchData();
            } else { alert("Failed to generate bulk RFQ."); }
        } catch (err) { alert("Error connecting to server."); }
    };

    const printConsolidatedRFQ = (supplierName: string, rfqNum: string, groupedItems: any[]) => {
        const printWindow = window.open('', '', 'width=900,height=700');
        if (!printWindow) return;

        let tableRows = '';
        groupedItems.forEach(item => {
            tableRows += `<tr><td>${item.dbos_code}</td><td><strong>${item.inventory_name}</strong><br/><small style="color:#64748b">Project: ${item.project_name}</small></td><td style="text-align: center; font-weight: bold;">${item.prod_qty}</td><td></td><td></td></tr>`;
        });

        const html = `<html><head><title>Consolidated RFQ - ${rfqNum}</title><style>body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; } .header { text-align: center; margin-bottom: 40px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; } th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; } th { background-color: #f1f5f9; }</style></head><body><div class="header"><h1>REQUEST FOR QUOTATION</h1><p>Reference No: <strong>${rfqNum}</strong></p></div><p><strong>To Supplier:</strong> ${supplierName}</p><table><tr><th>Item Code</th><th>Description / Allocation</th><th style="text-align: center;">Total Qty</th><th>Unit Price</th><th>Total Amount</th></tr>${tableRows}</table></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const openCanvassModal = async (item: any) => {
        setSelectedItem(item);
        setIsCanvasModalOpen(true);
        setEditingQuoteId(null);
        try {
            const res = await fetch(`${API_URL}/api/canvass/component/${item.project_item_component_id}/quotes`);
            if (res.ok) setQuotes(await res.json() || []);
        } catch (err) { console.error(err); }
    };

    const handleAddProspect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (prospectForm.supplier_id === 0) return alert("Please select a supplier.");
        const rfqNum = prospectForm.rfq_number || `RFQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
            const res = await fetch(`${API_URL}/api/canvass/quotes`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ project_item_component_id: selectedItem.project_item_component_id, supplier_id: prospectForm.supplier_id, rfq_number: rfqNum, quoted_unit_price: 0, quoted_landed_price: 0, quoted_selling_price: 0, remarks: '' })
            });
            if (res.ok) {
                const refreshRes = await fetch(`${API_URL}/api/canvass/component/${selectedItem.project_item_component_id}/quotes`);
                if (refreshRes.ok) setQuotes(await refreshRes.json() || []);
                setProspectForm({ supplier_id: 0, rfq_number: '' });
            }
        } catch (err) {}
    };

    const handleSavePrices = async (canvassId: number) => {
        try {
            const res = await fetch(`${API_URL}/api/canvass/quotes/${canvassId}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quoted_unit_price: parseFloat(priceForm.quoted_unit_price) || 0, quoted_landed_price: parseFloat(priceForm.quoted_landed_price) || 0, quoted_selling_price: parseFloat(priceForm.quoted_selling_price) || 0, remarks: priceForm.remarks })
            });

            if (res.ok) {
                setEditingQuoteId(null);
                const refreshRes = await fetch(`${API_URL}/api/canvass/component/${selectedItem.project_item_component_id}/quotes`);
                if (refreshRes.ok) setQuotes(await refreshRes.json() || []);
            }
        } catch (err) {}
    };

    const handleAwardSupplier = async (canvassId: number) => {
        if (!confirm("Award this supplier? This locks the prices for the BOM.")) return;
        try {
            const res = await fetch(`${API_URL}/api/canvass/award`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ canvass_id: canvassId, project_item_component_id: selectedItem.project_item_component_id })
            });

            if (res.ok) {
                alert("Supplier awarded successfully!");
                setIsCanvasModalOpen(false);
                fetchData();
            }
        } catch (err) {}
    };

    // ----------------------------------------------------------------------
    // PHASE 4: PURCHASE ORDER LOGIC (NEW)
    // ----------------------------------------------------------------------
    const handleCheckItemPO = (id: number) => {
        setSelectedPOComponentIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleGeneratePO = async () => {
        if (selectedPOComponentIds.length === 0) return alert("Select at least one item.");

        // Rule: All selected items MUST belong to the exact same supplier to generate a valid PO
        const selectedData = awardedItems.filter(i => selectedPOComponentIds.includes(i.project_item_component_id));
        const supplierId = selectedData[0].supplier_id;
        const isSameSupplier = selectedData.every(i => i.supplier_id === supplierId);
        
        if (!isSameSupplier) {
            return alert("You can only generate a Purchase Order for one supplier at a time. Please uncheck items from other suppliers.");
        }

        const poNum = prompt("Enter PO Number (or leave blank to auto-generate):");
        if (poNum === null) return; // User cancelled
        const finalPONum = poNum.trim() || `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
            const res = await fetch(`${API_URL}/api/po/generate`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ po_number: finalPONum, component_ids: selectedPOComponentIds })
            });

            if (res.ok) {
                printPurchaseOrder(selectedData[0].supplier_name, finalPONum, selectedData);
                setSelectedPOComponentIds([]);
                fetchData();
            } else { alert("Failed to generate PO."); }
        } catch (err) { alert("Error connecting to server."); }
    };

    const handleCancelAward = async (componentId: number) => {
        if (!confirm("Are you sure you want to cancel this award? The item will be returned to the Canvassing Board.")) return;

        try {
            const res = await fetch(`${API_URL}/api/canvass/cancel-award`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_item_component_id: componentId })
            });

            if (res.ok) {
                alert("Award cancelled. Item moved back to Canvassing Board.");
                fetchData(); // This refreshes both tabs instantly!
            } else {
                const data = await res.json();
                alert(data.error || "Failed to cancel award.");
            }
        } catch (err) { alert("Error connecting to server."); }
    };

    const handleReprintPO = (poNum: string) => {
        const poData = awardedItems.filter(i => i.po_number === poNum);
        if (poData.length > 0) {
            printPurchaseOrder(poData[0].supplier_name, poNum, poData);
        }
    };

    const printPurchaseOrder = (supplierName: string, poNum: string, groupedItems: any[]) => {
        const printWindow = window.open('', '', 'width=900,height=700');
        if (!printWindow) return;

        let tableRows = '';
        let grandTotal = 0;

        groupedItems.forEach(item => {
            grandTotal += item.total_price;
            tableRows += `<tr><td>${item.dbos_code}</td><td><strong>${item.inventory_name}</strong><br/><small style="color:#64748b">Project: ${item.project_name}</small></td><td style="text-align: center; font-weight: bold;">${item.prod_qty}</td><td style="text-align: right;">${formatCurrency(item.landed_price)}</td><td style="text-align: right; font-weight: bold;">${formatCurrency(item.total_price)}</td></tr>`;
        });

        const html = `<html><head><title>Purchase Order - ${poNum}</title><style>body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; } .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1e40af; padding-bottom: 20px;} .header h1 { margin: 0; color: #1e40af; font-size: 32px;} table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; } th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; } th { background-color: #f8fafc; } .total-row td { background-color: #f1f5f9; font-size: 16px; }</style></head><body><div class="header"><h1>PURCHASE ORDER</h1><p>PO Number: <strong>${poNum}</strong></p></div><p><strong>To Supplier:</strong> ${supplierName}</p><p><strong>Date Issued:</strong> ${new Date().toLocaleDateString()}</p><br/><table><tr><th>Item Code</th><th>Description / Allocation</th><th style="text-align: center;">Qty</th><th style="text-align: right;">Unit Cost</th><th style="text-align: right;">Total Amount</th></tr>${tableRows}<tr class="total-row"><td colspan="4" style="text-align: right; font-weight: bold;">GRAND TOTAL:</td><td style="text-align: right; font-weight: bold; color: #047857;">${formatCurrency(grandTotal)}</td></tr></table><br/><br/><p><strong>Authorized By:</strong> ___________________________</p></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
    
    // Strict Filter for valid suppliers
    const supplierOptions = (companies || [])
        .filter(c => c.company_type === 'Supplier Local' || c.company_type === 'Supplier International')
        .map(c => ({ value: c.company_id, label: c.company_name }));

    const filteredItems = items.filter(i => 
        i.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.inventory_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAwarded = awardedItems.filter(i => 
        i.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.inventory_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.po_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="bg-slate-50 min-h-screen pb-12 w-full flex flex-col items-center">
            <div className="w-full px-8 max-w-[1600px] flex flex-col gap-6 pt-4">
                
                <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-md w-full relative">
                    <Link href="/admin" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-4 transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
                    </Link>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <ShoppingCart className="h-6 w-6 text-blue-400" /> Procurement & Purchasing
                            </h1>
                            <p className="text-slate-400 text-sm mt-1">Manage RFQs, award vendors, and issue official Purchase Orders.</p>
                        </div>
                    </div>
                </div>

                {/* TABS NAVIGATION */}
                <div className="flex gap-2 border-b border-slate-300 w-full px-2">
                    <button 
                        onClick={() => setActiveTab('canvass')} 
                        className={`px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'canvass' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                        <Search className="h-4 w-4"/> Canvassing Board
                    </button>
                    <button 
                        onClick={() => setActiveTab('po')} 
                        className={`px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'po' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                    >
                        <FileSignature className="h-4 w-4"/> Purchase Orders (PO)
                    </button>
                </div>

                {/* ========================================================================= */}
                {/* TAB 1: CANVASSING BOARD (Prospecting & Awarding)                          */}
                {/* ========================================================================= */}
                {activeTab === 'canvass' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full relative">
                        {/* BULK ACTION BAR */}
                        {selectedComponentIds.length > 0 && (
                            <div className="absolute top-0 left-0 w-full bg-blue-600 text-white p-3 flex justify-between items-center z-10 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3 ml-4">
                                    <CheckSquare className="h-5 w-5 text-blue-200" />
                                    <span className="font-bold">{selectedComponentIds.length} items selected for canvassing</span>
                                </div>
                                <div className="flex gap-3 pr-4">
                                    <button onClick={() => setSelectedComponentIds([])} className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 rounded text-sm font-medium transition-colors">Cancel</button>
                                    <button onClick={() => setIsBulkModalOpen(true)} className="px-4 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
                                        <FileText className="h-4 w-4"/> Generate RFQ for Selected
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <div className="relative w-full sm:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Search projects or materials..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-4 w-12 text-center"><input type="checkbox" onChange={handleCheckAllCanvass} checked={filteredItems.length > 0 && selectedComponentIds.length === filteredItems.filter(i => !i.has_selected_supplier).length} className="h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer" /></th>
                                        <th className="px-4 py-4 font-medium">Project</th>
                                        <th className="px-4 py-4 font-medium">Material Required</th>
                                        <th className="px-4 py-4 font-medium text-center">Qty Needed</th>
                                        <th className="px-4 py-4 font-medium text-center">Status</th>
                                        <th className="px-4 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading requirements...</td></tr>
                                    ) : filteredItems.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">All project requirements have been successfully sourced!</td></tr>
                                    ) : filteredItems.map((item, idx) => (
                                        <tr key={idx} className={`border-b border-slate-100 transition-colors ${selectedComponentIds.includes(item.project_item_component_id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-4 py-4 text-center">
                                                {!item.has_selected_supplier && (
                                                    <input type="checkbox" checked={selectedComponentIds.includes(item.project_item_component_id)} onChange={() => handleCheckItemCanvass(item.project_item_component_id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                                )}
                                            </td>
                                            <td className="px-4 py-4 font-bold text-slate-800">{item.project_name}</td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-slate-900">{item.inventory_name}</div>
                                                <div className="text-xs text-slate-400">{item.dbos_code}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-lg text-blue-600">{item.prod_qty}</td>
                                            <td className="px-4 py-4 text-center">
                                                {item.has_selected_supplier ? (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Supplier Awarded</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 animate-pulse">Needs Sourcing</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button onClick={() => openCanvassModal(item)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"><FileText className="h-4 w-4" /> View Quotes</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* TAB 2: PURCHASE ORDERS (Issuing POs for Awarded Items)                    */}
                {/* ========================================================================= */}
                {activeTab === 'po' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full relative">
                        {/* BULK ACTION BAR FOR PO */}
                        {selectedPOComponentIds.length > 0 && (
                            <div className="absolute top-0 left-0 w-full bg-emerald-600 text-white p-3 flex justify-between items-center z-10 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3 ml-4">
                                    <CheckSquare className="h-5 w-5 text-emerald-200" />
                                    <span className="font-bold">{selectedPOComponentIds.length} awarded items selected</span>
                                </div>
                                <div className="flex gap-3 pr-4">
                                    <button onClick={() => setSelectedPOComponentIds([])} className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 rounded text-sm font-medium transition-colors">Cancel</button>
                                    <button onClick={handleGeneratePO} className="px-4 py-1.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded text-sm font-bold shadow-sm flex items-center gap-2 transition-colors">
                                        <FileSignature className="h-4 w-4"/> Generate PO for Selected
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <div className="relative w-full sm:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Search POs or suppliers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-emerald-500" />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-4 w-12 text-center"></th>
                                        <th className="px-4 py-4 font-medium">Supplier</th>
                                        <th className="px-4 py-4 font-medium">Material</th>
                                        <th className="px-4 py-4 font-medium text-center">Qty</th>
                                        <th className="px-4 py-4 font-medium text-right">Cost</th>
                                        <th className="px-4 py-4 font-medium text-center">PO Status</th>
                                        <th className="px-4 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Loading awarded items...</td></tr>
                                    ) : filteredAwarded.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No awarded items available for PO generation.</td></tr>
                                    ) : filteredAwarded.map((item, idx) => (
                                        <tr key={idx} className={`border-b border-slate-100 transition-colors ${selectedPOComponentIds.includes(item.project_item_component_id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-4 py-4 text-center">
                                                {!item.po_number && (
                                                    <input type="checkbox" checked={selectedPOComponentIds.includes(item.project_item_component_id)} onChange={() => handleCheckItemPO(item.project_item_component_id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 cursor-pointer" />
                                                )}
                                            </td>
                                            <td className="px-4 py-4 font-bold text-slate-800">{item.supplier_name}</td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-slate-900">{item.inventory_name}</div>
                                                <div className="text-xs text-slate-400">Project: {item.project_name}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-slate-700">{item.prod_qty}</td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="font-bold text-emerald-700">{formatCurrency(item.total_price)}</div>
                                                <div className="text-[10px] text-slate-400">{formatCurrency(item.landed_price)} / unit</div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {item.po_number ? (
                                                    <span className="px-2.5 py-1 rounded bg-slate-800 text-white text-xs font-bold shadow-sm">{item.po_number}</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">Pending PO</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                {item.po_number ? (
                                                    <button onClick={() => handleReprintPO(item.po_number)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors">
                                                        <Printer className="h-4 w-4" /> Print PO
                                                    </button>
                                                ) : (
                                                    <button onClick={() => handleCancelAward(item.project_item_component_id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-200 transition-colors">
                                                        <X className="h-4 w-4" /> Cancel Award
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALS RETAINED FROM TAB 1 FOR CANVASSING LOGIC */}
            {isBulkModalOpen && activeTab === 'canvass' && (
                <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
                        <div className="p-5 bg-blue-600 text-white flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Building2 className="h-5 w-5" /> Generate Grouped RFQ</h3>
                            <button onClick={() => setIsBulkModalOpen(false)} className="hover:text-blue-200 transition-colors p-1"><X className="h-6 w-6" /></button>
                        </div>
                        <form onSubmit={handleGenerateBulkRFQ} className="p-6 space-y-5 bg-slate-50">
                            <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm border border-blue-100">
                                You are generating a single consolidated Request for Quotation for <strong>{selectedComponentIds.length} materials</strong>.
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Vendor / Supplier *</label>
                                <SearchableSelect options={supplierOptions} value={bulkForm.supplier_id} onChange={(v: string) => setBulkForm({ ...bulkForm, supplier_id: parseInt(v) || 0 })} placeholder="Search vendors..." />
                            </div>
                            
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">RFQ Number</label>
                                <input type="text" value={bulkForm.rfq_number} onChange={e => setBulkForm({ ...bulkForm, rfq_number: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Leave blank to auto-generate" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setIsBulkModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                                    <Printer className="h-4 w-4"/> Generate & Print RFQ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isCanvasModalOpen && selectedItem && activeTab === 'canvass' && (
                <div className="fixed inset-0 bg-slate-900/70 z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        <div className="p-5 bg-slate-800 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-xl flex items-center gap-2"><FileText className="h-5 w-5" /> Manage Item Quotations</h3>
                                <p className="text-slate-300 text-sm mt-1">Material: <strong>{selectedItem.inventory_name} (Qty: {selectedItem.prod_qty})</strong></p>
                            </div>
                            <button onClick={() => setIsCanvasModalOpen(false)} className="hover:text-slate-300 transition-colors p-1"><X className="h-7 w-7" /></button>
                        </div>

                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-50">
                            
                            {/* Left Pane: Prospect Supplier Form */}
                            <div className="w-full lg:w-1/3 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0 shadow-sm z-10">
                                <h4 className="font-bold text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3"><Plus className="h-5 w-5 text-blue-600" /> Prospect a Supplier</h4>
                                <form onSubmit={handleAddProspect} className="space-y-4">
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Vendor *</label><SearchableSelect options={supplierOptions} value={prospectForm.supplier_id} onChange={(v: string) => setProspectForm({ ...prospectForm, supplier_id: parseInt(v) || 0 })} placeholder="Search vendors..." /></div>
                                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wider">RFQ Number (Optional)</label><input type="text" value={prospectForm.rfq_number} onChange={e => setProspectForm({ ...prospectForm, rfq_number: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Leave blank to auto-generate" /></div>
                                    <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors shadow-md mt-4">Add to Canvas Board</button>
                                </form>
                            </div>

                            {/* Right Pane: Canvas Board */}
                            <div className="w-full lg:w-2/3 p-6 overflow-y-auto">
                                <h4 className="font-bold text-slate-800 mb-5 flex items-center gap-2"><Calculator className="h-5 w-5 text-slate-500" /> Received Quotes</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {quotes.length === 0 ? (
                                        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 bg-white">No suppliers added to the canvas yet.</div>
                                    ) : quotes.map(q => (
                                        <div key={q.canvass_id} className={`p-5 rounded-xl border-2 transition-all ${q.is_selected ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div><h5 className="font-bold text-lg text-slate-800">{q.supplier_name}</h5><p className="text-xs text-slate-500 font-medium">Ref: {q.rfq_number || 'N/A'} | Prospected: {q.date_quoted.split(' ')[0]}</p></div>
                                                <div className="flex gap-2">
                                                    {q.is_selected ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-sm"><CheckCircle className="h-4 w-4" /> AWARDED</div>
                                                    ) : q.quoted_landed_price > 0 && editingQuoteId !== q.canvass_id ? (
                                                        <button onClick={() => handleAwardSupplier(q.canvass_id)} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"><Award className="h-4 w-4" /> Award Winner</button>
                                                    ) : null}
                                                </div>
                                            </div>

                                            {editingQuoteId === q.canvass_id ? (
                                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                                    <div className="grid grid-cols-3 gap-3 mb-3">
                                                        <div><label className="text-[10px] uppercase font-bold text-blue-800">Unit Price</label><input type="number" step="0.01" value={priceForm.quoted_unit_price} onChange={e => setPriceForm({...priceForm, quoted_unit_price: e.target.value})} className="w-full p-2 border border-blue-200 rounded text-sm" /></div>
                                                        <div><label className="text-[10px] uppercase font-bold text-blue-800">Landed Price</label><input type="number" step="0.01" value={priceForm.quoted_landed_price} onChange={e => setPriceForm({...priceForm, quoted_landed_price: e.target.value})} className="w-full p-2 border border-emerald-300 bg-emerald-50 rounded text-sm font-bold" /></div>
                                                        <div><label className="text-[10px] uppercase font-bold text-blue-800">Selling Price</label><input type="number" step="0.01" value={priceForm.quoted_selling_price} onChange={e => setPriceForm({...priceForm, quoted_selling_price: e.target.value})} className="w-full p-2 border border-blue-200 rounded text-sm" /></div>
                                                    </div>
                                                    <div className="mb-3"><label className="text-[10px] uppercase font-bold text-blue-800">Supplier Remarks</label><input type="text" value={priceForm.remarks} onChange={e => setPriceForm({...priceForm, remarks: e.target.value})} className="w-full p-2 border border-blue-200 rounded text-sm" placeholder="Delivery time, payment terms..." /></div>
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setEditingQuoteId(null)} className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-600">Cancel</button>
                                                        <button onClick={() => handleSavePrices(q.canvass_id)} className="flex items-center gap-1 px-4 py-1.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"><Save className="h-3 w-3"/> Save Prices</button>
                                                    </div>
                                                </div>
                                            ) : q.quoted_landed_price === 0 ? (
                                                <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                                    <span className="text-sm font-medium text-orange-800 animate-pulse flex items-center gap-2"><Clock className="h-4 w-4"/> Waiting for supplier quotation...</span>
                                                    <button onClick={() => { setEditingQuoteId(q.canvass_id); setPriceForm({ quoted_unit_price: '', quoted_landed_price: '', quoted_selling_price: '', remarks: '' }); }} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded shadow-sm transition-colors"><Edit3 className="h-4 w-4" /> Input Received Prices</button>
                                                </div>
                                            ) : (
                                                <div className="relative group">
                                                    <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                        <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unit Price</p><p className="font-medium text-slate-700">{formatCurrency(q.quoted_unit_price)}</p></div>
                                                        <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Landed Price</p><p className="font-bold text-emerald-700 text-lg">{formatCurrency(q.quoted_landed_price)}</p></div>
                                                        <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Selling Price</p><p className="font-medium text-blue-700">{formatCurrency(q.quoted_selling_price)}</p></div>
                                                    </div>
                                                    {q.remarks && <div className="mt-2 text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-100">" {q.remarks} "</div>}
                                                    {!q.is_selected && (
                                                        <button onClick={() => { setEditingQuoteId(q.canvass_id); setPriceForm({ quoted_unit_price: String(q.quoted_unit_price), quoted_landed_price: String(q.quoted_landed_price), quoted_selling_price: String(q.quoted_selling_price), remarks: q.remarks }); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-blue-600 rounded shadow-sm transition-all"><Edit3 className="h-4 w-4" /> Edit</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const Clock = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);