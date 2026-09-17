'use client';

import { useState, useEffect } from 'react';
import { ArchiveRestore, X, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface RTSModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: number; // Pass the active project ID if available
}

export default function ReturnToStockModal({ isOpen, onClose, projectId = 0 }: RTSModalProps) {
    const [inventoryList, setInventoryList] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [form, setForm] = useState({
        inventory_id: 0,
        return_qty: 1,
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetch(`${API_URL}/api/inventory`)
                .then(res => res.json())
                .then(data => setInventoryList(Array.isArray(data) ? data : []));
        } else {
            // Reset form on close
            setForm({ inventory_id: 0, return_qty: 1, notes: '' });
            setSearchTerm("");
        }
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.inventory_id === 0) return alert("Please select a raw material to return.");
        if (form.return_qty <= 0) return alert("Quantity must be greater than zero.");

        try {
            const res = await fetch(`${API_URL}/api/inventory/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    project_id: projectId
                })
            });

            if (res.ok) {
                alert("Materials successfully returned to stock!");
                onClose();
            } else {
                const err = await res.json();
                alert(err.error || "Failed to process RTS.");
            }
        } catch (error) {
            alert("Server connection error.");
        }
    };

    if (!isOpen) return null;

    const filteredInventory = inventoryList.filter(i => 
        i.inventory_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        i.dbos_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedItem = inventoryList.find(i => i.inventory_id === form.inventory_id);

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[90] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <ArchiveRestore className="h-5 w-5"/> Declare Excess / RTS
                    </h3>
                    <button onClick={onClose} className="hover:text-emerald-200 transition-colors"><X className="h-5 w-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-slate-50">
                    
                    <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg text-xs font-medium flex gap-2 border border-emerald-100">
                        <AlertCircle className="h-4 w-4 shrink-0 text-emerald-600"/>
                        Declaring items here will immediately add them back to your available warehouse inventory.
                    </div>

                    {/* Search & Select Material */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Select Raw Material / Part</label>
                        <input 
                            type="text" 
                            placeholder="Search inventory by name or code..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full p-2 border border-slate-300 rounded-t-lg outline-none text-sm focus:border-emerald-500"
                        />
                        <select 
                            size={4}
                            required
                            value={form.inventory_id} 
                            onChange={e => setForm({ ...form, inventory_id: parseInt(e.target.value) })} 
                            className="w-full p-2 border border-slate-300 border-t-0 rounded-b-lg outline-none text-sm bg-white overflow-y-auto"
                        >
                            {filteredInventory.length === 0 ? <option disabled>No items found...</option> : null}
                            {filteredInventory.map(item => (
                                <option key={item.inventory_id} value={item.inventory_id} className="p-1 cursor-pointer">
                                    [{item.dbos_code}] {item.inventory_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Quantity & Remarks */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Qty to Return</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    min="0.01" 
                                    step="0.01"
                                    required
                                    value={form.return_qty} 
                                    onChange={e => setForm({ ...form, return_qty: parseFloat(e.target.value) || 0 })} 
                                    className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 text-sm font-bold text-emerald-700" 
                                />
                            </div>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-1.5">RTS Reason / Notes</label>
                            <input 
                                type="text" 
                                value={form.notes} 
                                onChange={e => setForm({ ...form, notes: e.target.value })} 
                                className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-emerald-500 text-sm" 
                                placeholder="e.g. Excess from assembly, rejected cut..." 
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 mt-6">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-700 transition-colors">Confirm Return to Stock</button>
                    </div>
                </form>
            </div>
        </div>
    );
}