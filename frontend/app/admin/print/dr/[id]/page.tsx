'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { CheckCircle, ShieldCheck } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${API_URL}/${path.replace('./', '')}`;
};

export default function ClientHandoverDeliveryReceipt() {
    const params = useParams();
    const searchParams = useSearchParams();
    const deliveryId = params.id;

    const [items, setItems] = useState<any[]>([]);
    const [deliveryInfo, setDeliveryInfo] = useState<any>(null);

    // Get Print Parameters from the URL
    const drNumber = searchParams.get('dr') || 'DRAFT';
    const address = searchParams.get('address') || '';
    const contactPerson = searchParams.get('person') || '';
    const contactNumber = searchParams.get('contact') || '';

    useEffect(() => {
        if (!deliveryId) return;

        // Fetch the Delivery Record
        fetch(`${API_URL}/api/deliveries/${deliveryId}`)
            .then(res => res.json())
            .then(data => setDeliveryInfo(data));

        // Fetch the ROLL-UP Client Report from the endpoint we built earlier
        fetch(`${API_URL}/api/deliveries/${deliveryId}/client-report`)
            .then(res => res.json())
            .then(data => setItems(Array.isArray(data) ? data : []));
    }, [deliveryId]);

    if (!deliveryInfo) return <div className="p-10 text-center font-bold text-gray-400 animate-pulse">Generating Client Handover Document...</div>;

    return (
        <div className="bg-white text-gray-900 p-10 font-sans max-w-5xl mx-auto min-h-screen">
            {/* Header: Hide button when printing */}
            <div className="flex justify-between items-start border-b-4 border-gray-900 pb-6 mb-8 relative">
                <button 
                    onClick={() => window.print()} 
                    className="absolute -top-6 -right-6 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm print:hidden hover:bg-blue-700 transition-colors"
                >
                    Print Document
                </button>
                
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tight text-gray-900">Delivery Receipt</h1>
                    <p className="text-gray-500 mt-1 font-bold tracking-wide uppercase flex items-center gap-1">
                        <ShieldCheck className="h-4 w-4"/> External Client Handover
                    </p>
                </div>
                <div className="text-right">
                    <h2 className="font-black text-3xl text-blue-700">{drNumber}</h2>
                    <p className="text-sm font-bold text-gray-500 mt-1">Date: {deliveryInfo.delivery_date}</p>
                </div>
            </div>

            {/* Client Information */}
            <div className="grid grid-cols-2 gap-8 mb-10 bg-gray-50 p-6 rounded-lg border border-gray-200">
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Deliver To</p>
                    <p className="font-black text-xl text-gray-900 uppercase">{deliveryInfo.company_name}</p>
                    <p className="text-sm text-gray-700 mt-1 font-medium">{address || 'Address not provided'}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Project Details</p>
                    <p className="font-bold text-lg text-gray-800">{deliveryInfo.project_name}</p>
                    <p className="font-medium text-gray-600 text-sm">Ref: {deliveryInfo.project_number}</p>

                    {(contactPerson || contactNumber) && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Site Contact</p>
                            <p className="font-medium text-gray-800 text-sm">{contactPerson}</p>
                            <p className="font-medium text-gray-600 text-sm">{contactNumber}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Assembled Items List */}
            <h3 className="text-lg font-black uppercase tracking-wider text-gray-800 border-b-2 border-gray-200 pb-2 mb-6">Assembled Deliverables</h3>
            
            <div className="flex flex-col gap-6 mb-12">
                {items.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 italic">No items attached to this delivery receipt.</div>
                ) : items.map((item, idx) => {
                    // Explode the component text string into bullets
                    const components = item.components_list ? item.components_list.split('|').filter((c: string) => c.trim() !== '') : [];

                    return (
                        <div key={idx} className="flex gap-6 p-4 border border-gray-200 rounded-xl bg-white shadow-sm break-inside-avoid">
                            {/* Visual Spec Image */}
                            <div className="w-40 h-40 shrink-0 border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center p-2">
                                {item.image_path ? (
                                    <img src={getImageUrl(item.image_path)} alt="Product" className="w-full h-full object-cover rounded" />
                                ) : (
                                    <span className="text-xs text-gray-400 uppercase font-bold">No Visual</span>
                                )}
                            </div>
                            
                            {/* Spec Details & Components */}
                            <div className="flex-1 flex flex-col">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-xl font-black text-gray-900">{item.product_name}</h4>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2 max-w-lg">{item.description || 'No specific description provided.'}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className="text-xs text-gray-400 font-bold uppercase mb-1">Delivered</div>
                                        <div className="text-2xl font-black text-blue-700 bg-blue-50 px-4 py-1 rounded-lg border border-blue-100">1 {item.uom_abbr}</div>
                                    </div>
                                </div>

                                {/* Component Breakdown */}
                                <div className="mt-auto pt-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500"/> Included Sub-components
                                    </p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-700 font-medium">
                                        {components.map((comp: string, i: number) => (
                                            <div key={i}>{comp}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Formal Signatures */}
            <div className="grid grid-cols-2 gap-16 mt-16 pt-8 break-inside-avoid">
                <div>
                    <div className="border-t-2 border-gray-400 mb-2"></div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Delivered By (Logistics Team)</p>
                    <p className="text-xs text-gray-400 text-center mt-2">Print Name, Sign, and Date</p>
                </div>
                <div>
                    <div className="border-t-2 border-gray-400 mb-2"></div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Received in Good Order By (Client)</p>
                    <p className="text-xs text-gray-400 text-center mt-2">Print Name, Sign, and Date</p>
                </div>
            </div>
            
            <div className="mt-16 text-center text-[10px] text-gray-400 uppercase tracking-wider font-bold">
                Document Generated via Enterprise FSM System
            </div>
        </div>
    );
}