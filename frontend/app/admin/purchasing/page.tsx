'use client';

import { useState, useEffect, useRef } from 'react';
import { 
    ShoppingCart, ArrowLeft, Plus, X, 
    FileText, CheckCircle, Building2, Calculator, Search, Award, Printer, Edit3, Save, CheckSquare, FileSignature, Box, AlertTriangle, RefreshCw, Truck, Calendar, DollarSign, Star
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", disabled = false }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => { 
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) { 
                setIsOpen(false); 
            } 
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((o: any) => String(o.value) === String(value));
    const filteredOptions = options.filter((o: any) => o.label.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div ref={wrapperRef} className="relative w-full text-sm">
            <div className={`w-full p-2 border border-slate-300 rounded-lg flex justify-between items-center ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'bg-white cursor-pointer hover:border-blue-400 transition-colors'}`} onClick={() => !disabled && setIsOpen(!isOpen)}>
                <span className={selectedOption ? "text-slate-900 truncate pr-2 font-medium" : "text-slate-400 truncate"}>{selectedOption ? selectedOption.label : placeholder}</span>
                <span className="text-slate-400 text-[10px] shrink-0 ml-2">▼</span>
            </div>
            {isOpen && !disabled && (
                <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-200 bg-slate-50">
                        <input autoFocus type="text" className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="overflow-y-auto flex-1">
                        <div className="p-2 hover:bg-red-50 cursor-pointer text-slate-400 italic text-xs border-b border-slate-100" onClick={() => { onChange(""); setIsOpen(false); setSearchTerm(""); }}>Clear Selection</div>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((o: any) => (
                                <div key={o.value} className="p-2 hover:bg-blue-50 cursor-pointer text-slate-700 text-xs truncate" onClick={() => { onChange(o.value); setIsOpen(false); setSearchTerm(""); }}>{o.label}</div>
                            ))
                        ) : (
                            <div className="p-3 text-slate-400 text-xs text-center italic">No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function PurchasingPage() {
    const [activeTab, setActiveTab] = useState<'canvass' | 'rfq' | 'po' | 'receiving'>('canvass');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [items, setItems] = useState<any[]>([]); 
    const [companies, setCompanies] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]); 
    const [rfqs, setRfqs] = useState<any[]>([]);

    // PO & Receiving States
    const [awardedItems, setAwardedItems] = useState<any[]>([]);
    const [selectedPOMRFItemIds, setSelectedPOMRFItemIds] = useState<number[]>([]);
    const [incomingPOs, setIncomingPOs] = useState<any[]>([]);
    const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
    const [itemToReceive, setItemToReceive] = useState<any>(null);
    const [receiveQty, setReceiveQty] = useState('');

    // Canvass & RFQ States
    const [selectedMRFItemIds, setSelectedMRFItemIds] = useState<number[]>([]);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkForm, setBulkForm] = useState({ supplier_id: 0, rfq_number: '' });
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [quotes, setQuotes] = useState<any[]>([]);
    const [isCanvasModalOpen, setIsCanvasModalOpen] = useState(false);
    const [prospectForm, setProspectForm] = useState({ supplier_id: 0, supplier_product_id: 0, rfq_number: '' });
    const [supplierCatalog, setSupplierCatalog] = useState<any[]>([]);
    const [isCatalogLoading, setIsCatalogLoading] = useState(false);

    // RFQ Management Modal States
    const [isRFQManageModalOpen, setIsRFQManageModalOpen] = useState(false);
    const [selectedRFQ, setSelectedRFQ] = useState<any>(null);
    const [rfqLineItems, setRfqLineItems] = useState<any[]>([]);
    const [editingQuoteId, setEditingQuoteId] = useState<number | null>(null);
    const [priceForm, setPriceForm] = useState({ quoted_unit_price: '', quoted_landed_price: '', quoted_selling_price: '', remarks: '' });

    const fetchData = async () => {
        try {
            const [itemsRes, compRes, awardedRes, invRes, incomingRes, rfqRes] = await Promise.all([
                fetch(`${API_URL}/api/canvass/items`), 
                fetch(`${API_URL}/api/companies`),
                fetch(`${API_URL}/api/po/awarded-items`),
                fetch(`${API_URL}/api/inventory`),
                fetch(`${API_URL}/api/po/incoming`),
                fetch(`${API_URL}/api/rfqs`)
            ]);
            if (itemsRes.ok) setItems(await itemsRes.json() || []);
            if (compRes.ok) setCompanies(await compRes.json() || []);
            if (awardedRes.ok) setAwardedItems(await awardedRes.json() || []);
            if (invRes.ok) setInventory(await invRes.json() || []);
            if (incomingRes.ok) setIncomingPOs(await incomingRes.json() || []);
            if (rfqRes.ok) setRfqs(await rfqRes.json() || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const fetchCatalog = async () => {
        if (prospectForm.supplier_id > 0) {
            setIsCatalogLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/companies/${prospectForm.supplier_id}/products`);
                if (res.ok) setSupplierCatalog(await res.json() || []);
            } catch (err) { console.error(err); }
            setIsCatalogLoading(false);
        } else {
            setSupplierCatalog([]);
        }
    };

    useEffect(() => {
        fetchCatalog();
        setProspectForm(prev => ({ ...prev, supplier_product_id: 0 })); 
    }, [prospectForm.supplier_id]);

    const handleCheckAllCanvass = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allUnawardedIds = filteredItems.filter(i => !i.has_selected_supplier).map(i => i.mrf_item_id);
            setSelectedMRFItemIds(allUnawardedIds);
        } else { setSelectedMRFItemIds([]); }
    };

    const handleCheckItemCanvass = (id: number) => {
        setSelectedMRFItemIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const handleGenerateBulkRFQ = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bulkForm.supplier_id === 0) return alert("Select a supplier to generate RFQ.");
        if (selectedMRFItemIds.length === 0) return alert("No items selected.");
        
        const rfqNum = bulkForm.rfq_number || `RFQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const selectedSupplier = companies.find(c => c.company_id === bulkForm.supplier_id);
        const selectedComponentsData = items.filter(i => selectedMRFItemIds.includes(i.mrf_item_id));

        try {
            const res = await fetch(`${API_URL}/api/canvass/quotes/bulk`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ supplier_id: bulkForm.supplier_id, rfq_number: rfqNum, mrf_item_ids: selectedMRFItemIds })
            });
            if (res.ok) {
                printConsolidatedRFQ(selectedSupplier.company_name, rfqNum, selectedComponentsData);
                setIsBulkModalOpen(false); 
                setSelectedMRFItemIds([]); 
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
            tableRows += `<tr><td>${item.dbos_code}</td><td><strong>${item.inventory_name}</strong><br/><small style="color:#64748b">Project: ${item.project_name}</small><br/><small style="color:#dc2626">Shortage From: ${item.mrf_number}</small></td><td style="text-align: center; font-weight: bold;">${item.qty_backordered} ${item.uom_abbr}</td><td></td><td></td></tr>`; 
        });
        const html = `<html><head><title>Consolidated RFQ - ${rfqNum}</title><style>body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; } .header { text-align: center; margin-bottom: 40px; } table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; } th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; } th { background-color: #f1f5f9; }</style></head><body><div class="header"><h1>REQUEST FOR QUOTATION</h1><p>Reference No: <strong>${rfqNum}</strong></p></div><p><strong>To Supplier:</strong> ${supplierName}</p><table><tr><th>Item Code</th><th>Description / Project</th><th style="text-align: center;">Required Qty</th><th>Unit Price</th><th>Total Amount</th></tr>${tableRows}</table></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const handleReprintRFQ = async (rfqNum: string, supplierName: string) => {
        try {
            const res = await fetch(`${API_URL}/api/rfqs/${rfqNum}/items`);
            if (res.ok) {
                const fetchedItems = await res.json();
                printConsolidatedRFQ(supplierName, rfqNum, fetchedItems);
            } else { alert("Failed to fetch RFQ details."); }
        } catch (err) { alert("Server error while fetching RFQ items."); }
    };

    // --- INDIVIDUAL CANVASSING MODAL (Bid Matrix) ---
    const openCanvassModal = async (item: any) => {
        setSelectedItem(item);
        setIsCanvasModalOpen(true);
        setProspectForm({ supplier_id: 0, supplier_product_id: 0, rfq_number: '' });
        try {
            const res = await fetch(`${API_URL}/api/canvass/item/${item.mrf_item_id}/quotes`);
            if (res.ok) setQuotes(await res.json() || []);
        } catch (err) { console.error(err); }
    };

    const handleAddProspect = async (e: React.FormEvent) => {
        e.preventDefault();
        if (prospectForm.supplier_id === 0) return alert("Please select a vendor.");
        if (prospectForm.supplier_product_id === 0) return alert("Please select the vendor's specific product mapping.");
        
        const rfqNumToSubmit = prospectForm.rfq_number.trim();

        try {
            const res = await fetch(`${API_URL}/api/canvass/quotes`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ mrf_item_id: selectedItem.mrf_item_id, supplier_id: prospectForm.supplier_id, supplier_product_id: prospectForm.supplier_product_id, rfq_number: rfqNumToSubmit, quoted_unit_price: 0, quoted_landed_price: 0, quoted_selling_price: 0, remarks: '' })
            });
            if (res.ok) {
                const refreshRes = await fetch(`${API_URL}/api/canvass/item/${selectedItem.mrf_item_id}/quotes`);
                if (refreshRes.ok) setQuotes(await refreshRes.json() || []);
                setProspectForm({ supplier_id: 0, supplier_product_id: 0, rfq_number: '' });
            }
        } catch (err) {}
    };

    // --- RFQ MANAGEMENT MODAL LOGIC (Pricing Input) ---
    const openRFQManageModal = async (rfq: any) => {
        setSelectedRFQ(rfq);
        setIsRFQManageModalOpen(true);
        setEditingQuoteId(null);
        try {
            const res = await fetch(`${API_URL}/api/rfqs/${rfq.rfq_number}/quotes`);
            if (res.ok) setRfqLineItems(await res.json() || []);
        } catch (err) { console.error(err); }
    };

    const handleSavePrices = async (canvassId: number, refreshSource: 'rfq' | 'canvass') => {
        try {
            const res = await fetch(`${API_URL}/api/canvass/quotes/${canvassId}`, {
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quoted_unit_price: parseFloat(priceForm.quoted_unit_price) || 0, quoted_landed_price: parseFloat(priceForm.quoted_landed_price) || 0, quoted_selling_price: parseFloat(priceForm.quoted_selling_price) || 0, remarks: priceForm.remarks })
            });
            if (res.ok) {
                setEditingQuoteId(null);
                if (refreshSource === 'rfq') {
                    const refreshRes = await fetch(`${API_URL}/api/rfqs/${selectedRFQ.rfq_number}/quotes`);
                    if (refreshRes.ok) setRfqLineItems(await refreshRes.json() || []);
                }
                fetchData();
            }
        } catch (err) {}
    };

    // SHARED AWARD FUNCTION (Works from both Item View and Document View)
    const handleAwardSupplier = async (canvassId: number, mrfItemId: number, refreshSource: 'rfq' | 'canvass') => {
        if (!confirm("Award this supplier? This will lock the price and push the item to the PO queue.")) return;
        try {
            const res = await fetch(`${API_URL}/api/canvass/award`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ canvass_id: canvassId, mrf_item_id: mrfItemId })
            });
            if (res.ok) {
                alert("Supplier awarded successfully!");
                if (refreshSource === 'rfq') {
                    const refreshRes = await fetch(`${API_URL}/api/rfqs/${selectedRFQ.rfq_number}/quotes`);
                    if (refreshRes.ok) setRfqLineItems(await refreshRes.json() || []);
                } else if (refreshSource === 'canvass') {
                    setIsCanvasModalOpen(false); // Close item view after awarding
                }
                fetchData();
            } else {
                const errData = await res.json();
                alert(errData.error || "Failed to award supplier");
            }
        } catch (err) {}
    };

    // --- PURCHASE ORDER LOGIC ---
    const handleCheckItemPO = (id: number) => { 
        setSelectedPOMRFItemIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]); 
    };

    const handleGeneratePO = async () => {
        if (selectedPOMRFItemIds.length === 0) return alert("Select at least one item.");
        
        const selectedData = awardedItems.filter(i => selectedPOMRFItemIds.includes(i.mrf_item_id));
        const supplierId = selectedData[0].supplier_id;
        const isSameSupplier = selectedData.every(i => i.supplier_id === supplierId);
        
        if (!isSameSupplier) return alert("You can only generate a Purchase Order for one supplier at a time.");
        const projectId = selectedData[0].project_id; 
        const poNum = prompt("Enter PO Number (or leave blank to auto-generate):");
        if (poNum === null) return; 
        
        const finalPONum = poNum.trim() || `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

        try {
            const res = await fetch(`${API_URL}/api/po/generate`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ po_number: finalPONum, project_id: projectId, supplier_id: supplierId, mrf_item_ids: selectedPOMRFItemIds })
            });
            if (res.ok) {
                printPurchaseOrder(selectedData[0].supplier_name, finalPONum, selectedData);
                setSelectedPOMRFItemIds([]);
                fetchData();
            } else { alert("Failed to generate PO."); }
        } catch (err) { alert("Error connecting to server."); }
    };

    const handleCancelAward = async (mrfItemId: number) => {
        if (!confirm("Are you sure you want to cancel this award? The item will be returned to the Canvassing Board.")) return;
        try {
            const res = await fetch(`${API_URL}/api/canvass/cancel-award`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ mrf_item_id: mrfItemId })
            });
            if (res.ok) {
                alert("Award cancelled.");
                fetchData(); 
            } else {
                const data = await res.json();
                alert(data.error || "Failed to cancel award.");
            }
        } catch (err) { alert("Error connecting to server."); }
    };

    const handleReprintPO = (poNum: string) => {
        const poData = awardedItems.filter(i => i.po_number === poNum);
        if (poData.length > 0) printPurchaseOrder(poData[0].supplier_name, poNum, poData);
    };

    const printPurchaseOrder = (supplierName: string, poNum: string, groupedItems: any[]) => {
        const printWindow = window.open('', '', 'width=900,height=700');
        if (!printWindow) return;
        let tableRows = '';
        let grandTotal = 0;
        groupedItems.forEach(item => {
            grandTotal += item.total_price;
            tableRows += `<tr><td>${item.dbos_code}</td><td><strong>${item.inventory_name}</strong><br/><small style="color:#64748b">Project: ${item.project_name}</small><br/><small style="color:#dc2626">Ref MRF: ${item.mrf_number}</small></td><td style="text-align: center; font-weight: bold;">${item.qty_backordered}</td><td style="text-align: right;">${formatCurrency(item.landed_price)}</td><td style="text-align: right; font-weight: bold;">${formatCurrency(item.total_price)}</td></tr>`;
        });
        const html = `<html><head><title>Purchase Order - ${poNum}</title><style>body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #333; } .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #1e40af; padding-bottom: 20px;} .header h1 { margin: 0; color: #1e40af; font-size: 32px;} table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; } th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; } th { background-color: #f8fafc; } .total-row td { background-color: #f1f5f9; font-size: 16px; }</style></head><body><div class="header"><h1>PURCHASE ORDER</h1><p>PO Number: <strong>${poNum}</strong></p></div><p><strong>To Supplier:</strong> ${supplierName}</p><p><strong>Date Issued:</strong> ${new Date().toLocaleDateString()}</p><br/><table><tr><th>Item Code</th><th>Material / Project Allocation</th><th style="text-align: center;">Qty</th><th style="text-align: right;">Unit Cost</th><th style="text-align: right;">Total Amount</th></tr>${tableRows}<tr class="total-row"><td colspan="4" style="text-align: right; font-weight: bold;">GRAND TOTAL:</td><td style="text-align: right; font-weight: bold; color: #047857;">${formatCurrency(grandTotal)}</td></tr></table><br/><br/><p><strong>Authorized By:</strong> ___________________________</p></body></html>`;
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    // --- ETA AND RECEIVING LOGIC ---
    const handleUpdateETA = async (poNumber: string, etaDate: string) => {
        setIncomingPOs(prev => prev.map(p => p.po_number === poNumber ? {...p, expected_delivery: etaDate} : p));
        try {
            await fetch(`${API_URL}/api/po/${poNumber}/eta`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eta: etaDate }) 
            });
        } catch (err) { console.error("Failed to update ETA"); }
    };

    const handleReceiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const qty = parseFloat(receiveQty);
        if (isNaN(qty) || qty <= 0) return alert("Please enter a valid quantity.");
        
        try {
            const res = await fetch(`${API_URL}/api/po/receive`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ po_item_id: itemToReceive.po_item_id, qty_received: qty })
            });
            if (res.ok) {
                alert("Goods successfully received and added to Master Inventory!");
                setIsReceivingModalOpen(false);
                setReceiveQty('');
                fetchData();
            } else { alert("Failed to receive goods."); }
        } catch (err) { alert("Server error."); }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
    
    const supplierOptions = (companies || [])
        .filter(c => c.company_type === 'Supplier Local' || c.company_type === 'Supplier International')
        .map(c => ({ value: c.company_id, label: c.company_name }));

    const catalogOptions = supplierCatalog.map(p => ({
        value: p.supplier_product_id, 
        label: `${p.sup_product_code ? `[${p.sup_product_code}] ` : ''}${p.supplier_product_name}`
    }));

    const filteredItems = items.filter(i => (i.project_name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (i.inventory_name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (i.mrf_number||'').toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredAwarded = awardedItems.filter(i => (i.project_name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (i.inventory_name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (i.supplier_name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (i.po_number||'').toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredIncoming = incomingPOs.filter(i => (i.item_name||'').toLowerCase().includes(searchTerm.toLowerCase()) || (i.po_number||'').toLowerCase().includes(searchTerm.toLowerCase()) || (i.supplier_name||'').toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredRFQs = rfqs.filter(r => (r.rfq_number||'').toLowerCase().includes(searchTerm.toLowerCase()) || (r.supplier_name||'').toLowerCase().includes(searchTerm.toLowerCase()));

    // Helper to find the lowest price in the Bid Matrix
    const getLowestLandedPrice = () => {
        const validQuotes = quotes.filter(q => q.quoted_landed_price > 0);
        if (validQuotes.length === 0) return null;
        return Math.min(...validQuotes.map(q => q.quoted_landed_price));
    };
    const lowestPriceValue = getLowestLandedPrice();

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
                            <p className="text-slate-400 text-sm mt-1">Manage MRF Shortages, map supplier catalogs, award vendors, track ETAs, and execute Goods Receipts.</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 border-b border-slate-300 w-full px-2 overflow-x-auto">
                    <button onClick={() => setActiveTab('canvass')} className={`whitespace-nowrap px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'canvass' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}><Search className="h-4 w-4"/> Canvassing Board</button>
                    <button onClick={() => setActiveTab('rfq')} className={`whitespace-nowrap px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'rfq' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}><FileText className="h-4 w-4"/> Active RFQs</button>
                    <button onClick={() => setActiveTab('po')} className={`whitespace-nowrap px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'po' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}><FileSignature className="h-4 w-4"/> Purchase Orders (PO)</button>
                    <button onClick={() => setActiveTab('receiving')} className={`whitespace-nowrap px-6 py-3 font-bold text-sm rounded-t-lg transition-colors flex items-center gap-2 ${activeTab === 'receiving' ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}><Truck className="h-4 w-4"/> Goods Receipt & Tracking</button>
                </div>

                {/* ------------------------------------------------------------------------- */}
                {/* TAB 1: CANVASS BOARD */}
                {/* ------------------------------------------------------------------------- */}
                {activeTab === 'canvass' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full relative">
                        {selectedMRFItemIds.length > 0 && (
                            <div className="absolute top-0 left-0 w-full bg-blue-600 text-white p-3 flex justify-between items-center z-10 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3 ml-4">
                                    <CheckSquare className="h-5 w-5 text-blue-200" />
                                    <span className="font-bold">{selectedMRFItemIds.length} shortages selected for canvassing</span>
                                </div>
                                <div className="flex gap-3 pr-4">
                                    <button onClick={() => setSelectedMRFItemIds([])} className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 rounded text-sm font-medium transition-colors">Cancel</button>
                                    <button onClick={() => setIsBulkModalOpen(true)} className="px-4 py-1.5 bg-white text-blue-700 hover:bg-blue-50 rounded text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"><FileText className="h-4 w-4"/> Generate RFQ for Selected</button>
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
                                        <th className="px-4 py-4 w-12 text-center"><input type="checkbox" onChange={handleCheckAllCanvass} checked={filteredItems.length > 0 && selectedMRFItemIds.length === filteredItems.filter(i => !i.has_selected_supplier).length} className="h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer" /></th>
                                        <th className="px-4 py-4 font-medium">Project Source</th>
                                        <th className="px-4 py-4 font-medium">Material Required</th>
                                        <th className="px-4 py-4 font-medium text-center">Shortage Qty</th>
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
                                        <tr key={idx} className={`border-b border-slate-100 transition-colors ${selectedMRFItemIds.includes(item.mrf_item_id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-4 py-4 text-center">
                                                {!item.has_selected_supplier && (
                                                    <input type="checkbox" checked={selectedMRFItemIds.includes(item.mrf_item_id)} onChange={() => handleCheckItemCanvass(item.mrf_item_id)} className="h-4 w-4 rounded border-slate-300 text-blue-600 cursor-pointer" />
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-slate-800">{item.project_name}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Via: {item.mrf_number}</div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-slate-900">{item.inventory_name}</div>
                                                <div className="text-xs text-slate-400">{item.dbos_code}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-lg text-blue-600">{item.qty_backordered} <span className="text-xs uppercase text-slate-400 font-normal">{item.uom_abbr || 'UNIT'}</span></td>
                                            <td className="px-4 py-4 text-center">
                                                {item.has_selected_supplier ? (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Supplier Awarded</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700 animate-pulse">Needs Sourcing</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <button onClick={() => openCanvassModal(item)} className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
                                                    <Calculator className="h-4 w-4" /> Compare Bids & Award
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------------------- */}
                {/* TAB 2: ACTIVE RFQs (VIRTUAL TAB) */}
                {/* ------------------------------------------------------------------------- */}
                {activeTab === 'rfq' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full relative">
                        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <div className="relative w-full sm:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Search RFQ Number or Supplier..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500" />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-4 font-medium">RFQ Number</th>
                                        <th className="px-4 py-4 font-medium">Supplier</th>
                                        <th className="px-4 py-4 font-medium text-center">Items Requested</th>
                                        <th className="px-4 py-4 font-medium text-center">Date Generated</th>
                                        <th className="px-4 py-4 font-medium text-center">Status</th>
                                        <th className="px-4 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRFQs.length === 0 ? (
                                        <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No Active RFQs found.</td></tr>
                                    ) : filteredRFQs.map((rfq, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4 font-bold text-slate-800">{rfq.rfq_number}</td>
                                            <td className="px-4 py-4 font-bold text-slate-900">{rfq.supplier_name}</td>
                                            <td className="px-4 py-4 text-center font-bold text-slate-700">{rfq.item_count}</td>
                                            <td className="px-4 py-4 text-center text-slate-500">{new Date(rfq.date_quoted).toLocaleDateString()}</td>
                                            <td className="px-4 py-4 text-center">
                                                {rfq.status === 'Fully Awarded' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">{rfq.status}</span>}
                                                {rfq.status === 'Partially Awarded' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{rfq.status} ({rfq.awarded_count}/{rfq.item_count})</span>}
                                                {rfq.status === 'Pending Bids' && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 animate-pulse">{rfq.status}</span>}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => openRFQManageModal(rfq)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                                                        <DollarSign className="h-4 w-4" /> Manage Bids & Award
                                                    </button>
                                                    <button onClick={() => handleReprintRFQ(rfq.rfq_number, rfq.supplier_name)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors">
                                                        <Printer className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------------------- */}
                {/* TAB 3: PURCHASE ORDERS */}
                {/* ------------------------------------------------------------------------- */}
                {activeTab === 'po' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full relative">
                        {selectedPOMRFItemIds.length > 0 && (
                            <div className="absolute top-0 left-0 w-full bg-emerald-600 text-white p-3 flex justify-between items-center z-10 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3 ml-4">
                                    <CheckSquare className="h-5 w-5 text-emerald-200" />
                                    <span className="font-bold">{selectedPOMRFItemIds.length} awarded items selected</span>
                                </div>
                                <div className="flex gap-3 pr-4">
                                    <button onClick={() => setSelectedPOMRFItemIds([])} className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 rounded text-sm font-medium transition-colors">Cancel</button>
                                    <button onClick={handleGeneratePO} className="px-4 py-1.5 bg-white text-emerald-700 hover:bg-emerald-50 rounded text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"><FileSignature className="h-4 w-4"/> Generate PO for Selected</button>
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
                                        <th className="px-4 py-4 font-medium text-center">Shortage Qty</th>
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
                                        <tr key={idx} className={`border-b border-slate-100 transition-colors ${selectedPOMRFItemIds.includes(item.mrf_item_id) ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                                            <td className="px-4 py-4 text-center">
                                                {!item.po_number && (
                                                    <input type="checkbox" checked={selectedPOMRFItemIds.includes(item.mrf_item_id)} onChange={() => handleCheckItemPO(item.mrf_item_id)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 cursor-pointer" />
                                                )}
                                            </td>
                                            <td className="px-4 py-4 font-bold text-slate-800">{item.supplier_name}</td>
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-slate-900">{item.inventory_name}</div>
                                                <div className="text-xs text-slate-400">Project: {item.project_name}</div>
                                            </td>
                                            <td className="px-4 py-4 text-center font-bold text-slate-700">{item.qty_backordered}</td>
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
                                                    <button onClick={() => handleReprintPO(item.po_number)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors"><Printer className="h-4 w-4" /> Print PO</button>
                                                ) : (
                                                    <button onClick={() => handleCancelAward(item.mrf_item_id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-lg border border-red-200 transition-colors"><X className="h-4 w-4" /> Cancel Award</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ------------------------------------------------------------------------- */}
                {/* TAB 4: GOODS RECEIPT (GRN) & TRACKING */}
                {/* ------------------------------------------------------------------------- */}
                {activeTab === 'receiving' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full relative">
                        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <div className="relative w-full sm:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Search POs or items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-purple-500" />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-4 font-medium">PO Number</th>
                                        <th className="px-4 py-4 font-medium">Supplier</th>
                                        <th className="px-4 py-4 font-medium">Item Name</th>
                                        <th className="px-4 py-4 font-medium text-center">Ordered Qty</th>
                                        <th className="px-4 py-4 font-medium text-center">Received Qty</th>
                                        <th className="px-4 py-4 font-medium">Expected Delivery (ETA)</th>
                                        <th className="px-4 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400">Loading incoming deliveries...</td></tr>
                                    ) : filteredIncoming.length === 0 ? (
                                        <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">No incoming deliveries at the moment.</td></tr>
                                    ) : filteredIncoming.map((item, idx) => (
                                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="font-bold text-slate-800">{item.po_number}</div>
                                                {item.status === 'Partially Received' ? (
                                                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Partial Delivery</span>
                                                ) : (
                                                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Pending Receipt</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 font-medium text-slate-700">{item.supplier_name}</td>
                                            <td className="px-4 py-4 font-bold text-slate-900">{item.item_name}</td>
                                            <td className="px-4 py-4 text-center font-bold text-slate-700">{item.ordered_qty}</td>
                                            <td className="px-4 py-4 text-center font-bold text-purple-600">{item.received_qty}</td>
                                            
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-slate-400" />
                                                    <input 
                                                        type="date" 
                                                        value={item.expected_delivery || ''}
                                                        onChange={(e) => handleUpdateETA(item.po_number, e.target.value)}
                                                        className="p-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 outline-none focus:border-purple-500 cursor-pointer"
                                                    />
                                                </div>
                                            </td>

                                            <td className="px-4 py-4 text-right">
                                                <button onClick={() => { setItemToReceive(item); setReceiveQty(''); setIsReceivingModalOpen(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"><Truck className="h-4 w-4" /> Receive Goods</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* ------------------------------------------------------------------------- */}
            {/* GLOBAL MODALS */}
            {/* ------------------------------------------------------------------------- */}

            {/* Goods Receipt Modal */}
            {isReceivingModalOpen && itemToReceive && (
                <div className="fixed inset-0 bg-slate-900/70 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-5 bg-purple-700 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-lg flex items-center gap-2"><Truck className="h-5 w-5" /> Receive Delivery</h3>
                                <p className="text-purple-200 text-xs mt-1">PO Ref: {itemToReceive.po_number}</p>
                            </div>
                            <button onClick={() => setIsReceivingModalOpen(false)} className="hover:text-purple-200 transition-colors p-1"><X className="h-6 w-6" /></button>
                        </div>
                        <form onSubmit={handleReceiveSubmit} className="p-6 space-y-5 bg-slate-50">
                            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                <h4 className="font-bold text-slate-800 mb-1">{itemToReceive.item_name}</h4>
                                <div className="flex justify-between text-sm mt-3 border-t border-purple-200/50 pt-2">
                                    <span className="text-slate-500">Total Ordered:</span><strong className="text-slate-800">{itemToReceive.ordered_qty}</strong>
                                </div>
                                <div className="flex justify-between text-sm mt-1">
                                    <span className="text-slate-500">Previously Received:</span><strong className="text-purple-700">{itemToReceive.received_qty}</strong>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Quantity Arrived Today *</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    required 
                                    value={receiveQty} 
                                    onChange={e => setReceiveQty(e.target.value)} 
                                    className="w-full p-3 border border-slate-300 rounded-lg text-lg font-bold text-center outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all" 
                                    placeholder="Enter physical count..." 
                                    autoFocus
                                />
                                <div className="text-[10px] text-slate-400 italic text-center">This quantity will be permanently added to the Master Inventory Ledger.</div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setIsReceivingModalOpen(false)} className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg font-bold">Cancel</button>
                                <button type="submit" className="px-5 py-2.5 bg-purple-700 text-white rounded-lg font-bold hover:bg-purple-800 flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4"/> Confirm Receipt
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk RFQ Modal */}
            {isBulkModalOpen && activeTab === 'canvass' && (
                <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">
                        <div className="p-5 bg-blue-600 text-white flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Building2 className="h-5 w-5" /> Generate Grouped RFQ</h3>
                            <button onClick={() => setIsBulkModalOpen(false)} className="hover:text-blue-200 transition-colors p-1"><X className="h-6 w-6" /></button>
                        </div>
                        <form onSubmit={handleGenerateBulkRFQ} className="p-6 space-y-5 bg-slate-50">
                            <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm border border-blue-100">
                                You are generating a single consolidated Request for Quotation for <strong>{selectedMRFItemIds.length} materials</strong>.
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Vendor / Supplier *</label>
                                <SearchableSelect options={supplierOptions} value={bulkForm.supplier_id} onChange={(v: string) => setBulkForm({ ...bulkForm, supplier_id: parseInt(v) || 0 })} placeholder="Search vendors..." />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">RFQ Number</label>
                                <input type="text" value={bulkForm.rfq_number} onChange={e => setBulkForm({ ...bulkForm, rfq_number: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Leave blank to group later..." />
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

            {/* Individual Item Canvass Modal (BID MATRIX & AWARDING) */}
            {isCanvasModalOpen && selectedItem && activeTab === 'canvass' && (
                <div className="fixed inset-0 bg-slate-900/70 z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        <div className="p-5 bg-slate-800 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-xl flex items-center gap-2"><Calculator className="h-5 w-5" /> Compare Bids & Award[cite: 1]</h3>
                                <p className="text-slate-300 text-sm mt-1">Material: <strong>{selectedItem.inventory_name} (Shortage: {selectedItem.qty_backordered} {selectedItem.uom_abbr || 'UNIT'})</strong>[cite: 1]</p>
                            </div>
                            <button onClick={() => setIsCanvasModalOpen(false)} className="hover:text-slate-300 transition-colors p-1"><X className="h-7 w-7" /></button>
                        </div>

                        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden bg-slate-50">
                            
                            {/* Left Pane: Prospect Supplier Form */}
                            <div className="w-full lg:w-1/3 bg-white border-r border-slate-200 p-6 overflow-y-auto shrink-0 shadow-sm z-10 flex flex-col">
                                <h4 className="font-bold text-slate-800 mb-5 flex items-center gap-2 border-b border-slate-100 pb-3"><Plus className="h-5 w-5 text-blue-600" /> Prospect a Supplier[cite: 1]</h4>
                                
                                <form onSubmit={handleAddProspect} className="space-y-4 flex-1">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 1: Select Vendor *[cite: 1]</label>
                                        <SearchableSelect options={supplierOptions} value={prospectForm.supplier_id} onChange={(v: string) => setProspectForm({ ...prospectForm, supplier_id: parseInt(v) || 0 })} placeholder="Search vendors..." />
                                    </div>

                                    <div className={`space-y-1 transition-opacity duration-300 ${prospectForm.supplier_id > 0 ? 'opacity-100' : 'opacity-40'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                Step 2: Map to Vendor Catalog *[cite: 1]
                                            </label>
                                            {prospectForm.supplier_id > 0 && (
                                                <button type="button" onClick={fetchCatalog} className="text-blue-600 hover:text-blue-800 text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                                                    <RefreshCw className={`h-3 w-3 ${isCatalogLoading ? 'animate-spin' : ''}`} /> Refresh
                                                </button>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <SearchableSelect 
                                                options={catalogOptions} 
                                                value={prospectForm.supplier_product_id} 
                                                onChange={(v: string) => setProspectForm({ ...prospectForm, supplier_product_id: parseInt(v) || 0 })} 
                                                placeholder={catalogOptions.length > 0 ? "Select existing catalog item..." : "No products found."} 
                                                disabled={prospectForm.supplier_id === 0} 
                                            />
                                            <button 
                                                type="button" 
                                                disabled={prospectForm.supplier_id === 0}
                                                onClick={() => window.open(`/admin/directory/${prospectForm.supplier_id}`, '_blank')}
                                                className="w-full py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1.5"
                                            >
                                                <Box className="h-4 w-4" /> Add New Item to Catalog[cite: 1]
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Step 3: RFQ Number (Optional)</label>
                                        <input type="text" value={prospectForm.rfq_number} onChange={e => setProspectForm({ ...prospectForm, rfq_number: e.target.value })} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Leave blank to group later..." disabled={prospectForm.supplier_id === 0} />
                                    </div>
                                    
                                    <button type="submit" disabled={prospectForm.supplier_id === 0 || prospectForm.supplier_product_id === 0} className="w-full py-3 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors shadow-md mt-4 disabled:opacity-50 disabled:cursor-not-allowed">Add to Canvas Board[cite: 1]</button>
                                </form>
                            </div>

                            {/* Right Pane: BID MATRIX */}
                            <div className="w-full lg:w-2/3 p-6 overflow-y-auto bg-slate-100/50">
                                <h4 className="font-bold text-slate-800 mb-5 flex items-center gap-2"><Award className="h-5 w-5 text-emerald-600" /> Bid Matrix & Awarding</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {quotes.length === 0 ? (
                                        <div className="col-span-2 p-12 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 bg-white">No suppliers prospected for this item yet.</div>
                                    ) : quotes.map(q => {
                                        const isLowest = q.quoted_landed_price > 0 && q.quoted_landed_price === lowestPriceValue;
                                        return (
                                            <div key={q.canvass_id} className={`p-5 rounded-xl border-2 transition-all flex flex-col ${q.is_selected ? 'border-emerald-500 bg-emerald-50 shadow-md ring-4 ring-emerald-500/10' : isLowest ? 'border-amber-300 bg-white shadow-sm relative' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                                
                                                {isLowest && !q.is_selected && (
                                                    <div className="absolute -top-3 -right-3 bg-amber-400 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full shadow flex items-center gap-1 border border-amber-500">
                                                        <Star className="h-3 w-3 fill-amber-900"/> BEST PRICE
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h5 className="font-bold text-base text-slate-800 truncate max-w-[200px]" title={q.supplier_name}>{q.supplier_name}[cite: 1]</h5>
                                                        <p className="text-xs text-slate-500 font-medium mt-0.5">RFQ: {q.rfq_number || 'Pending'}[cite: 1]</p>
                                                    </div>
                                                </div>

                                                <div className="flex-1">
                                                    {q.quoted_landed_price === 0 ? (
                                                        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 text-xs italic mt-2">
                                                            <Clock className="h-4 w-4"/> Awaiting quote via RFQ Document...[cite: 1]
                                                        </div>
                                                    ) : (
                                                        <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 mt-2">
                                                            <div className="flex justify-between items-end mb-2 border-b border-slate-200 pb-2">
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Landed Cost[cite: 1]</span>
                                                                <span className={`text-xl font-black ${isLowest ? 'text-amber-600' : 'text-slate-800'}`}>{formatCurrency(q.quoted_landed_price)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unit: <span className="text-slate-700 font-semibold">{formatCurrency(q.quoted_unit_price)}</span>[cite: 1]</span>
                                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sell: <span className="text-blue-700 font-semibold">{formatCurrency(q.quoted_selling_price)}</span>[cite: 1]</span>
                                                            </div>
                                                            {q.remarks && <div className="mt-3 text-[10px] text-slate-500 italic">" {q.remarks} "[cite: 1]</div>}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                                    {q.is_selected ? (
                                                        <div className="flex items-center justify-center w-full gap-1.5 px-3 py-2 bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm"><CheckCircle className="h-4 w-4" /> SUPPLIER AWARDED</div>
                                                    ) : q.quoted_landed_price > 0 ? (
                                                        <button onClick={() => handleAwardSupplier(q.canvass_id, q.mrf_item_id, 'canvass')} className="w-full flex justify-center items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"><Award className="h-4 w-4" /> Award Supplier</button>
                                                    ) : (
                                                        <button disabled className="w-full px-4 py-2 bg-slate-100 text-slate-400 text-xs font-bold rounded-lg cursor-not-allowed">Cannot Award Yet</button>
                                                    )}
                                                </div>

                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* NEW: RFQ MANAGEMENT MODAL (Pricing Input for Documents) */}
            {isRFQManageModalOpen && selectedRFQ && activeTab === 'rfq' && (
                <div className="fixed inset-0 bg-slate-900/70 z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[90vh] overflow-hidden">
                        
                        <div className="p-5 bg-indigo-700 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-bold text-xl flex items-center gap-2"><DollarSign className="h-5 w-5" /> Manage RFQ Bids & Awards</h3>
                                <p className="text-indigo-200 text-sm mt-1">Supplier: <strong>{selectedRFQ.supplier_name}</strong> | Ref: <strong>{selectedRFQ.rfq_number}</strong></p>
                            </div>
                            <button onClick={() => setIsRFQManageModalOpen(false)} className="hover:text-indigo-200 transition-colors p-1"><X className="h-7 w-7" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                            <div className="space-y-4">
                                {rfqLineItems.length === 0 ? (
                                    <div className="p-12 text-center text-slate-400">Loading items...</div>
                                ) : rfqLineItems.map(q => (
                                    <div key={q.canvass_id} className={`p-5 rounded-xl border-2 transition-all ${q.is_selected ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h5 className="font-bold text-lg text-slate-800">{q.inventory_name}</h5>
                                                <p className="text-xs text-slate-500 font-medium">Qty Needed: {q.qty_backordered} {q.uom_abbr}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {q.is_selected ? (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-full shadow-sm"><CheckCircle className="h-4 w-4" /> AWARDED</div>
                                                ) : q.quoted_landed_price > 0 && editingQuoteId !== q.canvass_id ? (
                                                    <button onClick={() => handleAwardSupplier(q.canvass_id, q.mrf_item_id, 'rfq')} className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"><Award className="h-4 w-4" /> Award Item</button>
                                                ) : null}
                                            </div>
                                        </div>

                                        {editingQuoteId === q.canvass_id ? (
                                            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                                                <div className="grid grid-cols-3 gap-3 mb-3">
                                                    <div><label className="text-[10px] uppercase font-bold text-indigo-800">Unit Price</label><input type="number" step="0.01" value={priceForm.quoted_unit_price} onChange={e => setPriceForm({...priceForm, quoted_unit_price: e.target.value})} className="w-full p-2 border border-indigo-200 rounded text-sm" /></div>
                                                    <div><label className="text-[10px] uppercase font-bold text-indigo-800">Landed Price</label><input type="number" step="0.01" value={priceForm.quoted_landed_price} onChange={e => setPriceForm({...priceForm, quoted_landed_price: e.target.value})} className="w-full p-2 border border-emerald-300 bg-emerald-50 rounded text-sm font-bold" /></div>
                                                    <div><label className="text-[10px] uppercase font-bold text-indigo-800">Selling Price</label><input type="number" step="0.01" value={priceForm.quoted_selling_price} onChange={e => setPriceForm({...priceForm, quoted_selling_price: e.target.value})} className="w-full p-2 border border-indigo-200 rounded text-sm" /></div>
                                                </div>
                                                <div className="mb-3"><label className="text-[10px] uppercase font-bold text-indigo-800">Supplier Remarks</label><input type="text" value={priceForm.remarks} onChange={e => setPriceForm({...priceForm, remarks: e.target.value})} className="w-full p-2 border border-indigo-200 rounded text-sm" placeholder="Delivery time, payment terms..." /></div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingQuoteId(null)} className="px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-slate-600">Cancel</button>
                                                    <button onClick={() => handleSavePrices(q.canvass_id, 'rfq')} className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700"><Save className="h-3 w-3"/> Save Prices</button>
                                                </div>
                                            </div>
                                        ) : q.quoted_landed_price === 0 ? (
                                            <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                                                <span className="text-sm font-medium text-orange-800 animate-pulse flex items-center gap-2"><Clock className="h-4 w-4"/> Waiting for supplier quotation...</span>
                                                <button onClick={() => { setEditingQuoteId(q.canvass_id); setPriceForm({ quoted_unit_price: String(q.quoted_unit_price), quoted_landed_price: String(q.quoted_landed_price), quoted_selling_price: String(q.quoted_selling_price), remarks: q.remarks }); }} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm transition-colors"><Edit3 className="h-4 w-4" /> Input Received Prices</button>
                                            </div>
                                        ) : (
                                            <div className="relative group">
                                                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                                    <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Unit Price</p><p className="font-medium text-slate-700">{formatCurrency(q.quoted_unit_price)}</p></div>
                                                    <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Landed Price</p><p className="font-bold text-emerald-700 text-lg">{formatCurrency(q.quoted_landed_price)}</p></div>
                                                    <div><p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Selling Price</p><p className="font-medium text-indigo-700">{formatCurrency(q.quoted_selling_price)}</p></div>
                                                </div>
                                                {q.remarks && <div className="mt-2 text-xs text-slate-500 italic bg-white p-2 rounded border border-slate-100">" {q.remarks} "</div>}
                                                {!q.is_selected && (
                                                    <button onClick={() => { setEditingQuoteId(q.canvass_id); setPriceForm({ quoted_unit_price: String(q.quoted_unit_price), quoted_landed_price: String(q.quoted_landed_price), quoted_selling_price: String(q.quoted_selling_price), remarks: q.remarks }); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 rounded shadow-sm transition-all"><Edit3 className="h-4 w-4" /> Edit</button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
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