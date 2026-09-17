'use client';

import { useState, useEffect } from 'react';
import { Truck, PackageSearch, MapPin, Clock, FileDown, ArrowRightCircle, CheckCircle2, Package, X, FileText } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;
// Fallback logic for images. Adjust standard path if needed.
const getImageUrl = (path: string) => {
    if (!path) return 'https://via.placeholder.com/150?text=No+Image';
    if (path.startsWith('http')) return path;
    return `${API_URL}/${path.replace('./', '')}`;
};

export default function DeliveryBoardPage() {
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedLoad, setSelectedLoad] = useState<any>(null);
    const [loadingItems, setLoadingItems] = useState<any[]>([]);

    useEffect(() => {
        fetchActiveDeliveries();
    }, []);

    // Fetch the last 30 days of schedules to populate the delivery board
    const fetchActiveDeliveries = async () => {
        setLoading(true);
        const start = new Date();
        start.setDate(start.getDate() - 15);
        const end = new Date();
        end.setDate(end.getDate() + 15);
        
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        try {
            const res = await fetch(`${API_URL}/api/schedule?start=${startStr}&end=${endStr}`);
            if (res.ok) {
                const data = await res.json();
                const flatBookings = data.flatMap((e: any) => e.bookings || []);
                const uniqueBookings = Array.from(new Map(flatBookings.map((b: any) => [b.booking_id, b])).values());
                setBookings(uniqueBookings);
            }
        } catch (err) { console.error(err); } 
        finally { setLoading(false); }
    };

    const openLoadingModal = async (booking: any) => {
        setSelectedLoad(booking);
        setIsModalOpen(true);
        setLoadingItems([]);

        try {
            // Find the delivery ID linked to this booking
            const delRes = await fetch(`${API_URL}/api/deliveries`);
            if (delRes.ok) {
                const deliveries = await delRes.json();
                const linkedDelivery = deliveries.find((d: any) => String(d.booking_id) === String(booking.booking_id));
                
                if (linkedDelivery) {
                    // Temporarily store the delivery ID in the booking object so our print buttons can use it
                    booking.linked_delivery_id = linkedDelivery.delivery_id;
                    
                    const res = await fetch(`${API_URL}/api/deliveries/${linkedDelivery.delivery_id}/loading-list`);
                    // Note: If the endpoint is still /api/loading-lists/... adjust the URL above.
                    if (res.ok) setLoadingItems(await res.json());
                }
            }
        } catch (err) { console.error("Failed to fetch loading items"); }
    };

    const updateStatus = async (bookingId: number, newStatus: string) => {
        try {
            const res = await fetch(`${API_URL}/api/delivery/bookings/${bookingId}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchActiveDeliveries();
            } else {
                alert("Failed to update status");
            }
        } catch (err) { alert("Server error"); }
    };

    // --- PHASE 2: WAREHOUSE LOADING LIST PDF (WITH IMAGES) ---
    const printLoadingList = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=1000');
        if (!printWindow) return alert("Please allow popups to print.");

        const itemsHTML = loadingItems.map((item, idx) => `
            <tr class="border-b border-gray-200">
                <td class="py-4 text-center">
                    <div class="w-6 h-6 border-2 border-gray-400 rounded-sm mx-auto"></div>
                </td>
                <td class="py-4">
                    <img src="${getImageUrl(item.image_path)}" class="h-16 w-16 object-cover rounded shadow-sm border border-gray-200" alt="Item Image" onerror="this.src='https://via.placeholder.com/150?text=No+Image'" />
                </td>
                <td class="py-4 font-bold text-gray-800 text-lg">${item.item_name || item.product_name}</td>
                <td class="py-4 text-center font-bold text-2xl text-blue-600">${item.qty || item.item_qty}</td>
            </tr>
        `).join('');

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loading List - ${selectedLoad.booking_number || 'JO'}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }</style>
            </head>
            <body class="bg-white text-gray-900 p-8 font-sans">
                
                <div class="flex justify-between items-end border-b-4 border-gray-900 pb-4 mb-8">
                    <div>
                        <h1 class="text-4xl font-black uppercase tracking-tight text-gray-900">Warehouse Loading List</h1>
                        <p class="text-gray-500 mt-1 font-bold tracking-wide uppercase">Internal Pick & Load Document</p>
                    </div>
                    <div class="text-right">
                        <h2 class="font-black text-3xl text-gray-900">${selectedLoad.booking_number || 'DRAFT JO'}</h2>
                        <p class="text-sm font-bold text-gray-500 mt-1">Date: ${selectedLoad.start_date}</p>
                    </div>
                </div>

                <div class="bg-gray-100 p-4 rounded-lg mb-8 border border-gray-300">
                    <p class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Target Job Order</p>
                    <p class="font-bold text-xl text-gray-900">${selectedLoad.title}</p>
                    <p class="text-sm text-gray-600 mt-1 flex items-center gap-2">📍 ${selectedLoad.location_venue || 'Warehouse/Pickup'}</p>
                </div>

                <table class="w-full text-left mb-12">
                    <thead>
                        <tr class="bg-gray-900 text-white">
                            <th class="py-3 px-2 text-xs uppercase text-center w-16">Loaded</th>
                            <th class="py-3 px-2 text-xs uppercase w-24">Visual Ref</th>
                            <th class="py-3 px-2 text-xs uppercase">Component / Item Description</th>
                            <th class="py-3 px-2 text-xs uppercase text-center w-32">Qty to Load</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHTML || '<tr><td colspan="4" class="py-8 text-center text-gray-500 italic">No items attached to this Job Order.</td></tr>'}</tbody>
                </table>

                <div class="grid grid-cols-2 gap-16 mt-16 pt-8">
                    <div>
                        <div class="border-t-2 border-gray-400 mb-2"></div>
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Prepared By (Warehouse)</p>
                    </div>
                    <div>
                        <div class="border-t-2 border-gray-400 mb-2"></div>
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Received By (Driver / FSM Lead)</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
    };

    const scheduled = bookings.filter(b => b.status === 'Scheduled');
    const inTransit = bookings.filter(b => b.status === 'In Transit');
    const completed = bookings.filter(b => b.status === 'Completed');

    const Column = ({ title, icon: Icon, items, color, bg }: any) => (
        <div className={`flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden h-[750px]`}>
            <div className={`p-4 border-b border-slate-200 flex justify-between items-center bg-white`}>
                <h2 className="font-bold text-slate-800 flex items-center gap-2"><Icon className={`h-5 w-5 ${color}`}/> {title}</h2>
                <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{items.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
                {items.length === 0 && <div className="text-center text-slate-400 italic text-sm mt-10">No items in this queue.</div>}
                {items.map((b: any) => (
                    <div key={b.booking_id} onClick={() => openLoadingModal(b)} className="bg-white border border-slate-300 rounded-lg p-4 shadow-sm hover:shadow-md hover:border-blue-400 cursor-pointer transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-white ${bg}`}>{b.status}</span>
                            <span className="text-[10px] font-bold text-slate-400">{b.start_date}</span>
                        </div>
                        <h3 className="font-bold text-sm text-slate-800 leading-tight mb-2 line-clamp-2">{b.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><MapPin className="h-3 w-3 shrink-0"/> <span className="truncate">{b.location_venue || 'No Location'}</span></div>
                        <div className="flex items-center gap-2 text-xs text-slate-500"><Clock className="h-3 w-3 shrink-0"/> {b.start_time.substring(0,5)}</div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="bg-slate-50 min-h-screen p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Truck className="text-blue-600" /> Delivery & Warehouse Operations</h1>
                <p className="text-sm text-slate-500 mt-1">Generate Loading Lists, print Delivery Receipts, and dispatch trucks.</p>
            </div>

            {loading ? <div className="p-12 text-center text-slate-500 font-medium animate-pulse">Loading active deliveries...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Column title="To Load (Scheduled)" icon={PackageSearch} items={scheduled} color="text-orange-500" bg="bg-orange-500" />
                    <Column title="In Transit" icon={Truck} items={inTransit} color="text-blue-500" bg="bg-blue-500" />
                    <Column title="Delivered / Done" icon={CheckCircle2} items={completed} color="text-emerald-500" bg="bg-emerald-500" />
                </div>
            )}

            {/* ACTION MODAL */}
            {isModalOpen && selectedLoad && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 bg-slate-900 text-white flex justify-between items-center shrink-0">
                            <h3 className="font-bold flex items-center gap-2"><Package className="h-5 w-5"/> Load Details: {selectedLoad.booking_number || selectedLoad.title}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="hover:text-slate-300"><X className="h-5 w-5"/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                            <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Raw Parts to Load (Internal)</h4>
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                                        <tr>
                                            <th className="p-3 font-bold w-20 text-center">Image</th>
                                            <th className="p-3 font-bold">Component Name</th>
                                            <th className="p-3 font-bold text-center w-32">Qty to Load</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loadingItems.length === 0 ? <tr><td colSpan={3} className="p-6 text-center text-slate-400 italic">No items found for this load.</td></tr> : 
                                        loadingItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="p-3">
                                                    <div className="w-12 h-12 rounded border border-slate-200 overflow-hidden bg-white mx-auto">
                                                        <img src={getImageUrl(item.image_path)} alt="part" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image'; }} />
                                                    </div>
                                                </td>
                                                <td className="p-3 font-bold text-slate-800">{item.item_name || item.product_name}</td>
                                                <td className="p-3 text-center font-black text-blue-600 text-lg">{item.qty || item.item_qty}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shrink-0">
                            <div className="flex gap-2">
                                <button onClick={printLoadingList} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors flex items-center gap-2 shadow-sm text-sm">
                                    <FileDown className="h-4 w-4"/> Internal Loading List
                                </button>
                                
                                {/* NEW: PRINT DR BUTTON LINKED TO PHASE 3 */}
                                {selectedLoad.linked_delivery_id && (
                                    <button 
                                        onClick={() => window.open(`/print/dr/${selectedLoad.linked_delivery_id}?dr=${selectedLoad.booking_number}`, '_blank')}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
                                    >
                                        <FileText className="h-4 w-4"/> External Client DR
                                    </button>
                                )}
                            </div>
                            
                            <div className="flex gap-3">
                                {selectedLoad.status === 'Scheduled' && (
                                    <button onClick={() => updateStatus(selectedLoad.booking_id, 'In Transit')} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm">
                                        Mark as Loaded <ArrowRightCircle className="h-4 w-4"/>
                                    </button>
                                )}
                                {selectedLoad.status === 'In Transit' && (
                                    <span className="text-sm font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg flex items-center gap-2 border border-blue-200">
                                        <Truck className="h-4 w-4"/> Currently In Transit
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}