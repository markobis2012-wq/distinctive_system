'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Package } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_URL}/${path.replace('./', '')}`;
};

export default function PrintLoadingList() {
    const params = useParams();
    const searchParams = useSearchParams();
    const deliveryId = params.id;

    const [items, setItems] = useState<any[]>([]);
    const [deliveryInfo, setDeliveryInfo] = useState<any>(null);

    const headings = searchParams.get('headings') || 'Loading List';
    const address = searchParams.get('address') || '';

    useEffect(() => {
        if (!deliveryId) return;

        // Fetch the Delivery Record
        fetch(`${API_URL}/api/deliveries/${deliveryId}`)
            .then(res => res.json())
            .then(data => setDeliveryInfo(data));

        // Fetch the Raw Components (The standard items endpoint)
        fetch(`${API_URL}/api/deliveries/${deliveryId}/items`)
            .then(res => res.json())
            .then(data => setItems(Array.isArray(data) ? data : []));
    }, [deliveryId]);

    if (!deliveryInfo) return <div className="p-10 text-center font-bold text-gray-400 animate-pulse">Generating Warehouse Pick List...</div>;

    return (
        <div className="bg-white text-gray-900 p-8 font-sans max-w-4xl mx-auto min-h-screen">
            {/* Header: Hide button when printing */}
            <div className="flex justify-between items-end border-b-4 border-gray-900 pb-4 mb-8 relative">
                <button 
                    onClick={() => window.print()} 
                    className="absolute -top-4 -right-4 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm print:hidden hover:bg-blue-700 transition-colors"
                >
                    Print List
                </button>
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tight flex items-center gap-3">
                        <Package className="h-8 w-8 text-gray-800" />
                        Warehouse Pick List
                    </h1>
                    <p className="text-gray-500 mt-2 font-bold tracking-widest uppercase">{headings}</p>
                </div>
                <div className="text-right">
                    <h2 className="font-black text-3xl text-gray-900">{deliveryInfo.delivery_no}</h2>
                    <p className="text-sm font-bold text-gray-500 mt-1">Date: {deliveryInfo.delivery_date}</p>
                </div>
            </div>

            {/* Target Information */}
            <div className="bg-gray-100 p-5 rounded-lg mb-8 border border-gray-300">
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Target Project</p>
                        <p className="font-bold text-xl text-gray-900">{deliveryInfo.project_name}</p>
                        <p className="font-medium text-gray-600 text-sm mt-0.5">Ref: {deliveryInfo.project_number}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Destination Address</p>
                        <p className="font-medium text-gray-800 text-sm">{address || 'Warehouse / Unspecified'}</p>
                    </div>
                </div>
            </div>

            {/* Component Table with Checkboxes */}
            <table className="w-full text-left mb-12 border-collapse">
                <thead>
                    <tr className="bg-gray-900 text-white">
                        <th className="py-3 px-4 text-xs uppercase font-black text-center w-20">Loaded</th>
                        <th className="py-3 px-4 text-xs uppercase font-black w-24 text-center">Visual</th>
                        <th className="py-3 px-4 text-xs uppercase font-black">Component / Part Description</th>
                        <th className="py-3 px-4 text-xs uppercase font-black text-center w-32">Qty to Load</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr><td colSpan={4} className="py-8 text-center text-gray-500 italic border-b border-gray-300">No items attached to this shipment.</td></tr>
                    ) : items.map((item, idx) => (
                        <tr key={idx} className="border-b-2 border-gray-200">
                            {/* The Pen Checkbox! */}
                            <td className="py-4 px-4 text-center align-middle">
                                <div className="w-8 h-8 border-2 border-gray-400 rounded mx-auto bg-white"></div>
                            </td>
                            
                            <td className="py-4 px-4 align-middle text-center">
                                {item.image_path ? (
                                    <img src={getImageUrl(item.image_path)} className="w-16 h-16 object-cover border border-gray-300 rounded mx-auto" alt="part" />
                                ) : (
                                    <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded mx-auto flex items-center justify-center text-[10px] text-gray-400">No Image</div>
                                )}
                            </td>
                            
                            <td className="py-4 px-4 align-middle">
                                <div className="font-bold text-gray-900 text-lg uppercase">{item.item_name || item.product_name}</div>
                                <div className="text-sm font-medium text-gray-500 mt-1">Parent Item: {item.product_name}</div>
                                {item.remarks && <div className="text-xs text-gray-600 italic mt-2 bg-yellow-50 inline-block px-2 py-1 rounded border border-yellow-200">Note: {item.remarks}</div>}
                            </td>
                            
                            <td className="py-4 px-4 text-center align-middle">
                                <span className="text-3xl font-black text-gray-900">{item.qty || item.item_qty}</span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Warehouse Signatures */}
            <div className="grid grid-cols-3 gap-8 mt-16 pt-8 break-inside-avoid">
                <div>
                    <div className="border-t-2 border-gray-400 mb-2"></div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Prepared By (Picker)</p>
                </div>
                <div>
                    <div className="border-t-2 border-gray-400 mb-2"></div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Checked By (Quality/Count)</p>
                </div>
                <div>
                    <div className="border-t-2 border-gray-400 mb-2"></div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Received By (Driver)</p>
                </div>
            </div>
            
            <div className="mt-12 text-center text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                Internal Document - Do Not Give To Client
            </div>
        </div>
    );
}