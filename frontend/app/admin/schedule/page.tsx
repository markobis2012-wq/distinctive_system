'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, Truck, Users, Trash2, PackagePlus, UserPlus, X, Save, GripVertical, Printer, CheckCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
const formatDateYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

const parseYMD = (str: string) => {
    if (!str) return new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
};

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
            <div className="w-full p-2 border border-slate-300 rounded outline-none bg-white cursor-pointer flex justify-between items-center" onClick={() => setIsOpen(!isOpen)}>
                <span className={selectedOption ? "text-slate-900 truncate pr-2" : "text-slate-500 truncate"}>{selectedOption ? selectedOption.label : placeholder}</span>
                <span className="text-slate-400 text-[10px] shrink-0">▼</span>
            </div>
            {isOpen && (
                <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-300 rounded shadow-xl max-h-64 flex flex-col overflow-hidden">
                    <div className="p-2 border-b border-slate-200 bg-slate-50"><input autoFocus type="text" className="w-full p-1.5 border border-slate-300 rounded outline-none text-xs focus:ring-1 focus:ring-blue-500" placeholder="Type to search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                    <div className="overflow-y-auto flex-1">
                        <div className="p-2 hover:bg-red-50 cursor-pointer text-slate-400 italic text-xs border-b border-slate-100" onClick={() => { onChange(""); setIsOpen(false); setSearchTerm(""); }}>Clear Selection</div>
                        {filteredOptions.length > 0 ? filteredOptions.map((o: any) => (
                            <div key={o.value} className="p-2 hover:bg-blue-50 cursor-pointer text-slate-700 truncate text-xs" onClick={() => { onChange(o.value); setIsOpen(false); setSearchTerm(""); }}>{o.label}</div>
                        )) : <div className="p-3 text-slate-500 text-xs text-center italic">No results found</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function ScheduleDispatchPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState<'month' | 'week' | 'day'>('week');
    const [bookings, setBookings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const [projects, setProjects] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [projectComponents, setProjectComponents] = useState<any[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<any>(null);

    const defaultJoForm = {
        booking_id: 0, booking_number: '', project_id: 0, title: '', location_venue: '',
        start_date: '', end_date: '', start_time: '08:00', end_time: '17:00',
        status: 'Scheduled', color_theme: '#3b82f6', notes: '', accomplishment_notes: '', resource_id: 0, group_id: 0
    };
    const [form, setForm] = useState(defaultJoForm);
    const [items, setItems] = useState<any[]>([]);
    const [crew, setCrew] = useState<any[]>([]);

    useEffect(() => {
        fetchScheduleData();
        fetchDictionaries();
    }, [currentDate, view]);

    const fetchDictionaries = async () => {
        try {
            const [projRes, staffRes] = await Promise.all([
                fetch(`${API_URL}/api/projects?limit=1000`),
                fetch(`${API_URL}/api/staff`)
            ]);
            if (projRes.ok) setProjects((await projRes.json()).data || []);
            if (staffRes.ok) setStaff(await staffRes.json() || []);
        } catch (err) { }
    };

    const fetchScheduleData = async () => {
        setLoading(true);
        const y = currentDate.getFullYear();
        const m = currentDate.getMonth();
        let start = '', end = '';

        if (view === 'month') {
            start = formatDateYYYYMMDD(new Date(y, m, 1));
            end = formatDateYYYYMMDD(new Date(y, m + 1, 0));
        } else if (view === 'week') {
            const d = currentDate.getDay();
            const diff = currentDate.getDate() - d;
            start = formatDateYYYYMMDD(new Date(y, m, diff));
            end = formatDateYYYYMMDD(new Date(y, m, diff + 6));
        } else {
            start = formatDateYYYYMMDD(currentDate);
            end = formatDateYYYYMMDD(currentDate);
        }

        try {
            const res = await fetch(`${API_URL}/api/schedule?start=${start}&end=${end}`);
            if (res.ok) {
                const data = await res.json();
                const flatBookings = data.flatMap((e: any) => e.bookings || []);
                const uniqueBookings = Array.from(new Map(flatBookings.map((b: any) => [b.booking_id, b])).values());
                setBookings(uniqueBookings);
            }
        } catch (err) { } finally { setLoading(false); }
    };

    const fetchProjectComponents = async (projectId: number) => {
        if (projectId > 0) {
            try {
                const res = await fetch(`${API_URL}/api/projects/${projectId}/components`);
                if (res.ok) setProjectComponents(await res.json() || []);
            } catch (err) { }
        } else {
            setProjectComponents([]);
        }
    };

    const handleProjectChange = (projectId: number) => {
        setForm(prev => ({ ...prev, project_id: projectId }));
        setItems([]); 
        fetchProjectComponents(projectId);
    };

    const extractSafeDate = (dt: string) => {
        if (!dt) return '';
        const match = dt.match(/^\d{4}-\d{2}-\d{2}/);
        return match ? match[0] : '';
    };

    const openModal = async (b: any = null, dateStr: string = '') => {
        if (b) {
            setSelectedBooking(b);
            setForm({
                booking_id: b.booking_id, booking_number: b.booking_number || '', project_id: b.project_id || 0,
                title: b.title || '', location_venue: b.location_venue || '', 
                start_date: extractSafeDate(b.start_date), end_date: extractSafeDate(b.end_date), 
                start_time: b.start_time ? b.start_time.substring(0,5) : '08:00', end_time: b.end_time ? b.end_time.substring(0,5) : '17:00',
                status: b.status || 'Scheduled', color_theme: b.color_theme?.startsWith('#') ? b.color_theme : '#3b82f6', 
                notes: b.notes || '', accomplishment_notes: b.accomplishment_notes || '', 
                resource_id: b.resource_id || 0, group_id: b.group_id || 0
            });
            if (b.project_id > 0) fetchProjectComponents(b.project_id);
            else setProjectComponents([]);

            try {
                const res = await fetch(`${API_URL}/api/schedule/bookings/${b.booking_id}/details`);
                if (res.ok) {
                    const details = await res.json();
                    setItems(details.items || []);
                    setCrew(details.crew || []);
                }
            } catch (err) { }
        } else {
            setSelectedBooking(null);
            setForm({ ...defaultJoForm, start_date: dateStr, end_date: dateStr });
            setItems([]);
            setCrew([]);
            setProjectComponents([]);
        }
        setIsModalOpen(true);
    };

    const handleSaveJobOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...form, items, crew };
            const method = form.booking_id > 0 ? 'PUT' : 'POST';
            const url = form.booking_id > 0 ? `${API_URL}/api/schedule/bookings/${form.booking_id}` : `${API_URL}/api/schedule/bookings`;

            const res = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            if (res.ok) {
                setIsModalOpen(false);
                fetchScheduleData();
            } else { alert("Failed to save Job Order."); }
        } catch (err) { alert("Error connecting to server."); }
    };

    // --- NEW: PHASE 2 BRIDGE (JO -> DELIVERY/LOADING LIST) ---
    const handlePushToWarehouse = async () => {
        if (!confirm("Are you sure? This will save the Job Order, generate the Delivery Receipt for the warehouse, and mark this truck as 'In Transit'.")) return;

        try {
            // STEP 1: FORCE SAVE THE JOB ORDER FIRST!
            // This ensures all items in React are actually pushed to MySQL before Go bridges them.
            const payload = { ...form, items, crew };
            const saveRes = await fetch(`${API_URL}/api/schedule/bookings/${form.booking_id}`, { 
                method: 'PUT', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload) 
            });

            if (!saveRes.ok) {
                return alert("Failed to save the FSM payload. Cannot push to warehouse.");
            }

            // STEP 2: NOW TRIGGER THE BRIDGE
            const res = await fetch(`${API_URL}/api/delivery/generate-from-booking/${form.booking_id}`, {
                method: 'POST'
            });

            if (res.ok) {
                alert("Success! Job Order saved and Delivery Receipt generated.");
                setIsModalOpen(false);
                fetchScheduleData(); 
            } else {
                const data = await res.json();
                alert(data.error || "Failed to push to warehouse.");
            }
        } catch (err) {
            alert("Server error while connecting to Delivery module.");
        }
    };

    // --- PHASE 4: PRINT ACCOMPLISHMENT REPORT ---
    const handlePrintReport = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=1000');
        if (!printWindow) return alert("Please allow popups to print reports.");

        // Resolve staff names and items for the print layout
        const crewListHTML = crew.map(c => {
            const s = staff.find(staff => staff.id === c.resource_id || staff.resource_id === c.resource_id);
            return `<tr><td class="py-2 border-b border-gray-200 text-sm">${s?.name || 'Unknown Staff'}</td><td class="py-2 border-b border-gray-200 text-sm text-gray-600">${c.specific_task || 'General Duties'}</td></tr>`;
        }).join('');

        const itemsListHTML = items.map(item => {
            let itemName = item.custom_item_name;
            if (form.project_id > 0 && item.project_item_component_id > 0) {
                const pc = projectComponents.find(c => c.project_item_component_id === item.project_item_component_id);
                if (pc) itemName = pc.inventory_name;
            }
            return `<tr><td class="py-2 border-b border-gray-200 text-sm">${itemName || 'Item #'+item.project_item_component_id}</td><td class="py-2 border-b border-gray-200 text-sm text-center font-bold">${item.qty_to_deliver}</td><td class="py-2 border-b border-gray-200 text-sm text-center"></td></tr>`;
        }).join('');

        const statusColor = form.status === 'Completed' ? 'text-green-700 border-green-700' : 'text-blue-700 border-blue-700';

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Accomplishment Report - ${form.booking_number || 'DRAFT'}</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <style>
                    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                </style>
            </head>
            <body class="bg-white text-gray-900 p-10 font-sans">
                
                <!-- Header -->
                <div class="flex justify-between items-start border-b-2 border-gray-800 pb-6 mb-8">
                    <div>
                        <h1 class="text-3xl font-bold uppercase tracking-widest text-gray-900">Job Order Report</h1>
                        <p class="text-gray-500 mt-1 font-medium tracking-wide">FIELD SERVICE MANAGEMENT</p>
                    </div>
                    <div class="text-right">
                        <h2 class="font-bold text-2xl text-gray-900">${form.booking_number || 'DRAFT TICKET'}</h2>
                        <div class="inline-block mt-2 px-3 py-1 border-2 font-bold uppercase tracking-wider text-xs rounded ${statusColor}">${form.status}</div>
                    </div>
                </div>

                <!-- Job Details -->
                <div class="grid grid-cols-2 gap-8 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                    <div>
                        <p class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Job Title / Assignment</p>
                        <p class="font-bold text-lg text-gray-900">${form.title}</p>
                        
                        <p class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 mt-4">Location / Venue</p>
                        <p class="font-medium text-gray-800">${form.location_venue || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Schedule execution</p>
                        <p class="font-medium text-gray-800">Start: ${form.start_date} at ${form.start_time}</p>
                        <p class="font-medium text-gray-800">End: ${form.end_date} at ${form.end_time}</p>

                        <p class="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 mt-4">Linked Project ID</p>
                        <p class="font-medium text-gray-800">${form.project_id > 0 ? '#' + form.project_id : 'General FSM Task'}</p>
                    </div>
                </div>

                <!-- Logistics Payload -->
                <div class="mb-8">
                    <h3 class="text-sm font-bold uppercase tracking-wider text-gray-800 border-b-2 border-gray-200 pb-2 mb-4">Logistics & Delivery Payload</h3>
                    <table class="w-full text-left">
                        <thead>
                            <tr>
                                <th class="py-2 text-xs text-gray-500 uppercase">Item Description</th>
                                <th class="py-2 text-xs text-gray-500 uppercase text-center w-32">Qty Dispatched</th>
                                <th class="py-2 text-xs text-gray-500 uppercase text-center w-32">Qty Received</th>
                            </tr>
                        </thead>
                        <tbody>${itemsListHTML || '<tr><td colspan="3" class="py-4 text-gray-400 italic text-sm">No physical payload recorded for this job.</td></tr>'}</tbody>
                    </table>
                </div>

                <!-- Crew -->
                <div class="mb-8">
                    <h3 class="text-sm font-bold uppercase tracking-wider text-gray-800 border-b-2 border-gray-200 pb-2 mb-4">Assigned Crew</h3>
                    <table class="w-full text-left">
                        <thead>
                            <tr>
                                <th class="py-2 text-xs text-gray-500 uppercase">Staff Name</th>
                                <th class="py-2 text-xs text-gray-500 uppercase">Role / Task</th>
                            </tr>
                        </thead>
                        <tbody>${crewListHTML || '<tr><td colspan="2" class="py-4 text-gray-400 italic text-sm">No crew assigned.</td></tr>'}</tbody>
                    </table>
                </div>

                <!-- Execution Notes -->
                <div class="mb-12">
                    <h3 class="text-sm font-bold uppercase tracking-wider text-gray-800 border-b-2 border-gray-200 pb-2 mb-4">Accomplishment Notes / Executive Summary</h3>
                    <div class="p-4 border border-gray-300 rounded-lg min-h-[100px] text-sm text-gray-700 bg-gray-50 whitespace-pre-wrap">
                        ${form.accomplishment_notes || '<span class="text-gray-400 italic">No accomplishment notes provided.</span>'}
                    </div>
                </div>

                <!-- Signatures -->
                <div class="grid grid-cols-2 gap-16 mt-16 pt-8">
                    <div>
                        <div class="border-t border-gray-400 mb-2"></div>
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">FSM Dispatcher / Team Lead</p>
                        <p class="text-xs text-gray-400 text-center mt-1">Date Signed: _________________</p>
                    </div>
                    <div>
                        <div class="border-t border-gray-400 mb-2"></div>
                        <p class="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Client / Authorized Representative</p>
                        <p class="text-xs text-gray-400 text-center mt-1">Date Signed: _________________</p>
                    </div>
                </div>

                <div class="mt-12 text-center text-xs text-gray-400">
                    Generated by Distinctive FSM Enterprise System
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
        
        // Wait 500ms for Tailwind CDN to process styles before opening print dialog
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    const getMinutes = (t: string) => {
        if (!t) return 0;
        const [h, m] = t.split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
    };

    const handleDropToTimeSlot = async (e: any, newStartTimeStr: string) => {
        e.preventDefault();
        const bookingId = e.dataTransfer.getData('booking_id');
        setDraggingId(null); 

        if (!bookingId) return;
        const booking = bookings.find(b => String(b.booking_id) === String(bookingId));
        if (!booking) return;

        let startMins = getMinutes(booking.start_time);
        let endMins = getMinutes(booking.end_time);
        let durationMins = endMins - startMins;
        if (durationMins <= 0) durationMins = 60; 

        const [newStartH, newStartM] = newStartTimeStr.split(':').map(Number);
        const totalNewEndMins = newStartH * 60 + newStartM + durationMins;
        const newEndH = Math.floor(totalNewEndMins / 60);
        const newEndM = totalNewEndMins % 60;

        const newStartFmt = `${String(newStartH).padStart(2, '0')}:${String(newStartM).padStart(2, '0')}:00`;
        const newEndFmt = `${String(newEndH).padStart(2, '0')}:${String(newEndM).padStart(2, '0')}:00`;

        setBookings(prev => prev.map(b => String(b.booking_id) === String(bookingId) ? { ...b, start_time: newStartFmt, end_time: newEndFmt } : b));

        try {
            await fetch(`${API_URL}/api/schedule/bookings/${bookingId}/move`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_date: extractSafeDate(booking.start_date), end_date: extractSafeDate(booking.end_date), 
                    start_time: newStartFmt, end_time: newEndFmt,
                    resource_id: booking.resource_id, group_id: booking.group_id
                })
            });
        } catch (err) {}
    };

    const handleDropToDateSlot = async (e: any, newDateStr: string) => {
        e.preventDefault();
        const bookingId = e.dataTransfer.getData('booking_id');
        setDraggingId(null); 

        if (!bookingId) return;
        const booking = bookings.find(b => String(b.booking_id) === String(bookingId));
        if (!booking) return;

        const oldStart = parseYMD(extractSafeDate(booking.start_date));
        const oldEnd = parseYMD(extractSafeDate(booking.end_date));
        const newStart = parseYMD(newDateStr);

        const diffTime = oldEnd.getTime() - oldStart.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        const newEnd = new Date(newStart);
        newEnd.setDate(newEnd.getDate() + diffDays);

        const newStartFmt = formatDateYYYYMMDD(newStart);
        const newEndFmt = formatDateYYYYMMDD(newEnd);

        setBookings(prev => prev.map(b => String(b.booking_id) === String(bookingId) ? { ...b, start_date: newStartFmt, end_date: newEndFmt } : b));

        try {
            await fetch(`${API_URL}/api/schedule/bookings/${bookingId}/move`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_date: newStartFmt, end_date: newEndFmt, 
                    start_time: booking.start_time, end_time: booking.end_time,
                    resource_id: booking.resource_id, group_id: booking.group_id
                })
            });
        } catch (err) {}
    };

    const nextPeriod = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
        if (view === 'week') newDate.setDate(newDate.getDate() + 7);
        if (view === 'day') newDate.setDate(newDate.getDate() + 1);
        setCurrentDate(newDate);
    };
    const prevPeriod = () => {
        const newDate = new Date(currentDate);
        if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
        if (view === 'week') newDate.setDate(newDate.getDate() - 7);
        if (view === 'day') newDate.setDate(newDate.getDate() - 1);
        setCurrentDate(newDate);
    };
    const getPeriodLabel = () => {
        if (view === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        if (view === 'day') return currentDate.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - currentDate.getDay());
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        return `${start.toLocaleDateString('default', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    const projectOptions = [
        { value: 0, label: "None (General Task)" },
        ...projects.filter(p => p.project_status !== 'Finished' && p.project_status !== 'Completed').sort((a, b) => b.projects_id - a.projects_id).map(p => ({ value: p.projects_id, label: `${p.project_number} - ${p.project_name}` }))
    ];

    const renderMonth = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];
        
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="bg-slate-50 border-r border-b border-slate-200 min-h-[120px]"></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = formatDateYYYYMMDD(new Date(year, month, d));
            const dayEvents = bookings.filter(b => extractSafeDate(b.start_date) === dateStr);
            const isToday = dateStr === formatDateYYYYMMDD(new Date());

            days.push(
                <div key={d} onClick={() => openModal(null, dateStr)} className="bg-white border-r border-b border-slate-200 min-h-[120px] p-2 cursor-pointer hover:bg-blue-50/30 transition-colors group relative">
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>{d}</span>
                        <Plus className="h-4 w-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex flex-col gap-1">
                        {dayEvents.map(event => {
                            const color = event.color_theme?.startsWith('#') ? event.color_theme : '#3b82f6';
                            return (
                                <div key={event.booking_id} onClick={(e) => { e.stopPropagation(); openModal(event); }} 
                                     style={{ backgroundColor: `${color}15`, borderLeftColor: color, borderLeftWidth: '4px' }}
                                     className={`text-left p-1.5 rounded border border-slate-200 text-[10px] leading-tight shadow-sm text-slate-800`}>
                                    <div className="font-bold truncate">{event.title}</div>
                                    <div className="flex items-center gap-1 mt-0.5 opacity-80"><Clock className="h-3 w-3" /> {event.start_time.substring(0,5)}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }
        return <div className="grid grid-cols-7 border-t border-l border-slate-200 bg-white rounded-b-xl overflow-hidden shadow-sm">{days}</div>;
    };

    const renderWeekView = () => { 
        if (loading) return <div className="p-12 text-center text-slate-500">Loading schedule...</div>;

        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            weekDates.push(d);
        }

        return (
            <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
                    {weekDates.map(date => {
                        const dateStr = formatDateYYYYMMDD(date);
                        const isToday = dateStr === formatDateYYYYMMDD(new Date());
                        return (
                            <div key={dateStr} className="p-3 text-center border-r border-slate-200 last:border-0 relative">
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">{date.toLocaleDateString('default', { weekday: 'short' })}</div>
                                <div className={`text-lg font-bold mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700'}`}>{date.getDate()}</div>
                                <button onClick={() => openModal(null, dateStr)} className="absolute top-2 right-2 text-blue-500 opacity-0 hover:opacity-100 transition-opacity p-1 hover:bg-blue-50 rounded"><Plus className="h-4 w-4"/></button>
                            </div>
                        );
                    })}
                </div>

                <div className="grid grid-cols-7 flex-1 overflow-hidden bg-slate-50/30">
                    {weekDates.map(date => {
                        const dateStr = formatDateYYYYMMDD(date);
                        const dayEvents = bookings
                            .filter(b => extractSafeDate(b.start_date) === dateStr)
                            .sort((a, b) => getMinutes(a.start_time) - getMinutes(b.start_time));
                        
                        return (
                            <div 
                                key={dateStr}
                                className={`border-r border-slate-200 last:border-0 p-2 overflow-y-auto transition-colors ${draggingId ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}
                                onDragOver={e => e.preventDefault()}
                                onDrop={e => handleDropToDateSlot(e, dateStr)}
                            >
                                <div className="flex flex-col gap-2 min-h-full">
                                    {dayEvents.map(b => {
                                        const color = b.color_theme?.startsWith('#') ? b.color_theme : '#3b82f6';
                                        
                                        return (
                                            <div 
                                                key={b.booking_id}
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('booking_id', String(b.booking_id));
                                                    setTimeout(() => setDraggingId(String(b.booking_id)), 0);
                                                }}
                                                onDragEnd={() => setDraggingId(null)}
                                                onClick={() => openModal(b)}
                                                style={{ borderLeftColor: color, borderLeftWidth: '4px' }}
                                                className={`border border-slate-300 rounded shadow-sm bg-white overflow-hidden cursor-grab active:cursor-grabbing hover:border-blue-400 transition-all ${draggingId === String(b.booking_id) ? 'opacity-50 scale-95' : ''}`}
                                            >
                                                <div className="p-2 border-b flex items-start gap-1" style={{ backgroundColor: `${color}15` }}>
                                                    <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                                                    <div className="w-full">
                                                        <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                                                            <span style={{ backgroundColor: color }} className={`text-[8px] text-white font-bold px-1 py-0.5 rounded uppercase tracking-wider w-max`}>{b.status}</span>
                                                            <div className="flex items-center gap-1 text-[9px] font-bold text-slate-700 opacity-90"><Clock className="h-2.5 w-2.5"/>{b.start_time.substring(0,5)} - {b.end_time.substring(0,5)}</div>
                                                        </div>
                                                        <h3 className="text-[11px] font-bold leading-tight line-clamp-2 text-slate-900">{b.title}</h3>
                                                    </div>
                                                </div>

                                                <div className="p-2 flex flex-col gap-1.5">
                                                    {b.crew && b.crew.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {b.crew.slice(0, 3).map((c:any, i:number) => (
                                                                <div key={i} className="h-5 w-5 rounded bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-[8px]" title={c.staff_name}>{c.staff_name.substring(0, 2).toUpperCase()}</div>
                                                            ))}
                                                            {b.crew.length > 3 && <div className="h-5 w-5 rounded bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[8px]">+{b.crew.length - 3}</div>}
                                                        </div>
                                                    ) : <div className="text-[9px] text-slate-400 italic flex items-center gap-1"><Users className="h-3 w-3"/>Unassigned</div>}

                                                    {b.location_venue && <div className="text-[9px] text-slate-500 flex items-start gap-1 truncate"><MapPin className="h-2.5 w-2.5 shrink-0 mt-0.5"/>{b.location_venue}</div>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        if (loading) return <div className="p-12 text-center text-slate-500">Loading schedule...</div>;
        
        const dateStr = formatDateYYYYMMDD(currentDate);
        const dayEvents = bookings.filter(b => extractSafeDate(b.start_date) === dateStr);

        const START_HOUR = 5; 
        const END_HOUR = 23;  
        const ROW_HEIGHT = 60; 
        const PIXELS_PER_MINUTE = (ROW_HEIGHT * 2) / 60; 

        const timeSlots = [];
        for (let i = START_HOUR; i < END_HOUR; i++) {
            const h = String(i).padStart(2, '0');
            timeSlots.push(`${h}:00`);
            timeSlots.push(`${h}:30`);
        }

        const sortedEvents = [...dayEvents].sort((a, b) => getMinutes(a.start_time) - getMinutes(b.start_time));
        const columns: any[][] = [];
        
        sortedEvents.forEach(ev => {
            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const lastEvent = columns[i][columns[i].length - 1];
                if (getMinutes(ev.start_time) >= getMinutes(lastEvent.end_time)) {
                    columns[i].push(ev);
                    placed = true;
                    break;
                }
            }
            if (!placed) columns.push([ev]);
        });
        const totalCols = columns.length || 1;

        return (
            <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 shadow-sm flex overflow-y-auto max-h-[800px] relative">
                <div className="w-20 shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col z-10 sticky left-0">
                    {timeSlots.map((time, idx) => (
                        <div key={time} className="h-[60px] min-h-[60px] shrink-0 text-right pr-3 pt-1 text-[10px] font-bold text-slate-400 border-b border-slate-200/50">
                            {idx % 2 === 0 ? time : ''}
                        </div>
                    ))}
                </div>

                <div className="flex-1 relative bg-slate-50/20 min-w-[600px] flex flex-col">
                    {timeSlots.map(time => (
                        <div 
                            key={time} 
                            className={`h-[60px] min-h-[60px] shrink-0 border-b border-slate-200 w-full transition-colors ${draggingId ? 'bg-blue-50/20' : 'hover:bg-slate-100/50'}`}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDropToTimeSlot(e, time)}
                        />
                    ))}

                    {sortedEvents.map(b => {
                        let startMins = getMinutes(b.start_time);
                        let endMins = getMinutes(b.end_time);
                        let durationMins = endMins - startMins;
                        if (durationMins <= 0) durationMins = 60; 

                        const clampedStartMins = Math.max(START_HOUR * 60, startMins);
                        
                        const top = (clampedStartMins - (START_HOUR * 60)) * PIXELS_PER_MINUTE;
                        const height = Math.max(ROW_HEIGHT, durationMins * PIXELS_PER_MINUTE);

                        let colIdx = 0;
                        for (let i = 0; i < columns.length; i++) {
                            if (columns[i].some(e => e.booking_id === b.booking_id)) { colIdx = i; break; }
                        }

                        const widthPct = 100 / totalCols;
                        const leftPct = colIdx * widthPct;

                        const color = b.color_theme?.startsWith('#') ? b.color_theme : '#3b82f6';

                        return (
                            <div 
                                key={b.booking_id} 
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('booking_id', String(b.booking_id));
                                    setTimeout(() => setDraggingId(String(b.booking_id)), 0);
                                }}
                                onDragEnd={() => setDraggingId(null)}
                                style={{
                                    position: 'absolute',
                                    top: `${top}px`,
                                    height: `${height}px`, 
                                    width: `calc(${widthPct}% - 16px)`,
                                    left: `calc(${leftPct}% + 8px)`,
                                    padding: '2px', 
                                    zIndex: draggingId === String(b.booking_id) ? 50 : 10
                                }}
                                className={`transition-all ${draggingId ? 'pointer-events-none' : ''} ${draggingId === String(b.booking_id) ? 'opacity-70 scale-[0.98]' : ''}`}
                            >
                                <div style={{ borderLeftColor: color, borderLeftWidth: '4px' }} className="h-full w-full border border-slate-300 rounded-lg shadow-sm flex flex-col bg-white overflow-hidden cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-400 transition-colors">
                                    <div className="p-2 border-b flex items-start justify-between gap-2 shrink-0" style={{ backgroundColor: `${color}15` }}>
                                        <div className="flex items-start gap-1">
                                            <GripVertical className="h-4 w-4 text-slate-400 shrink-0 mt-0.5 cursor-grab" />
                                            <div>
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span style={{ backgroundColor: color }} className={`text-[8px] text-white font-bold px-1.5 py-0.5 rounded uppercase tracking-wider`}>{b.status}</span>
                                                    {b.booking_number && <span className="text-[10px] font-bold opacity-80 text-slate-700">#{b.booking_number}</span>}
                                                </div>
                                                <h3 className="text-xs font-bold leading-tight text-slate-900">{b.title}</h3>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 text-[10px] font-medium opacity-90 text-slate-700 shrink-0">
                                            <div className="flex items-center gap-1"><Clock className="h-3 w-3"/> {b.start_time.substring(0,5)} - {b.end_time.substring(0,5)}</div>
                                            <button onClick={() => openModal(b)} className="px-1.5 py-0.5 bg-white border border-slate-300 rounded shadow-sm hover:bg-slate-100 cursor-pointer pointer-events-auto relative z-20">EDIT</button>
                                        </div>
                                    </div>

                                    <div className="p-2 flex-1 overflow-y-auto bg-white grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
                                        <div>
                                            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Users className="h-3 w-3 text-purple-500"/> Crew</h4>
                                            {b.crew && b.crew.length > 0 ? (
                                                <div className="space-y-1">
                                                    {b.crew.map((c:any, i:number) => (
                                                        <div key={i} className="flex items-center gap-1.5 bg-slate-50 p-1 rounded border border-slate-100">
                                                            <div className="h-5 w-5 rounded bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0 text-[8px]">{c.staff_name.substring(0, 2).toUpperCase()}</div>
                                                            <div className="text-[10px] truncate w-full">
                                                                <span className="font-bold text-slate-800 mr-1">{c.staff_name}</span>
                                                                <span className="text-slate-400 italic">({c.specific_task || 'General'})</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <div className="text-[10px] text-slate-400 italic">No crew</div>}
                                        </div>

                                        <div>
                                            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1"><PackagePlus className="h-3 w-3 text-emerald-500"/> Payload</h4>
                                            {b.items && b.items.length > 0 ? (
                                                <div className="space-y-1">
                                                    {b.items.map((item:any, i:number) => (
                                                        <div key={i} className="flex justify-between items-center text-[10px] border-b border-slate-50 pb-0.5 last:border-0">
                                                            <span className="text-slate-600 truncate pr-2">{item.custom_item_name || `BOM #${item.project_item_component_id}`}</span>
                                                            <span className="font-bold text-emerald-600">{item.qty_to_deliver}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <div className="text-[10px] text-slate-400 italic">No payload</div>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-slate-50 min-h-screen p-8">
            <div className="mb-6 flex flex-col md:flex-row justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Truck className="text-blue-600" /> Dispatch & Scheduling</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage Job Orders, vehicle dispatch, and site installations.</p>
                </div>
                <button onClick={() => openModal(null, formatDateYYYYMMDD(new Date()))} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors">
                    <Plus className="h-4 w-4" /> Create Job Order
                </button>
            </div>

            <div className="bg-white border border-slate-200 border-b-0 rounded-t-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button onClick={prevPeriod} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600"><ChevronLeft className="h-5 w-5" /></button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-bold text-slate-700 hover:bg-white hover:shadow-sm rounded transition-all">Today</button>
                        <button onClick={nextPeriod} className="p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-slate-600"><ChevronRight className="h-5 w-5" /></button>
                    </div>
                    <h2 className="text-lg font-bold text-slate-800 w-48 text-center">{getPeriodLabel()}</h2>
                </div>

                <div className="flex bg-slate-100 rounded-lg p-1">
                    <button onClick={() => setView('month')} className={`px-4 py-1.5 text-sm font-bold rounded transition-all ${view === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Month</button>
                    <button onClick={() => setView('week')} className={`px-4 py-1.5 text-sm font-bold rounded transition-all ${view === 'week' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Week</button>
                    <button onClick={() => setView('day')} className={`px-4 py-1.5 text-sm font-bold rounded transition-all ${view === 'day' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Day</button>
                </div>
            </div>

            {view === 'month' && <><div className="grid grid-cols-7 bg-slate-50 border-t border-l border-r border-slate-200">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (<div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">{day}</div>))}</div>{renderMonth()}</>}
            {view === 'week' && renderWeekView()}
            {view === 'day' && renderDayView()}

            {/* FULL JOB ORDER MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl my-8 flex flex-col">
                        <div className="p-5 bg-blue-600 text-white flex justify-between items-center rounded-t-xl sticky top-0 z-10">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Truck className="h-5 w-5"/> {selectedBooking ? 'Edit Job Order / Schedule' : 'Create Job Order'}</h3>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="hover:text-blue-200"><X className="h-6 w-6" /></button>
                        </div>
                        
                        <form onSubmit={handleSaveJobOrder} className="p-6 bg-slate-50 flex flex-col gap-6">
                            
                            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><Clock className="h-4 w-4 text-blue-500"/> Schedule Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div><label className="block text-slate-600 mb-1 font-medium">Job Order Title *</label><input required type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded outline-none focus:border-blue-500" placeholder="e.g., Furniture Delivery" /></div>
                                    <div><label className="block text-slate-600 mb-1 font-medium">JO / Ticket Number</label><input type="text" value={form.booking_number} onChange={e => setForm({...form, booking_number: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded outline-none focus:border-blue-500" placeholder="Leave blank to auto-generate" disabled={form.booking_id > 0} title={form.booking_id > 0 ? "JO Number cannot be changed after creation" : ""} /></div>
                                    
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="block text-slate-600 mb-1 font-medium">Start Date *</label><input required type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded outline-none" /></div>
                                        <div><label className="block text-slate-600 mb-1 font-medium">Start Time</label><input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded outline-none" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div><label className="block text-slate-600 mb-1 font-medium">End Date *</label><input required type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded outline-none" /></div>
                                        <div><label className="block text-slate-600 mb-1 font-medium">End Time</label><input type="time" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded outline-none" /></div>
                                    </div>

                                    <div className="md:col-span-2"><label className="block text-slate-600 mb-1 font-medium">Location / Venue</label><input type="text" value={form.location_venue} onChange={e => setForm({...form, location_venue: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded outline-none focus:border-blue-500" placeholder="Where is the team going?" /></div>
                                    
                                    <div><label className="block text-slate-600 mb-1 font-medium">Status</label>
                                        <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded outline-none bg-white">
                                            {["Scheduled", "In Transit", "On-Site", "Completed", "Cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-slate-600 mb-1 font-medium">Color Theme</label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="color" 
                                                value={form.color_theme?.startsWith('#') && form.color_theme.length === 7 ? form.color_theme : '#3b82f6'} 
                                                onChange={e => setForm({...form, color_theme: e.target.value})} 
                                                className="h-[42px] w-14 p-1 border border-slate-300 rounded cursor-pointer bg-white" 
                                            />
                                            <span className="text-sm font-bold text-slate-600 uppercase">{form.color_theme?.startsWith('#') ? form.color_theme : '#3b82f6'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4 border-b pb-2">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2"><PackagePlus className="h-4 w-4 text-emerald-500"/> Delivery Payload</h4>
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-medium text-slate-600">Link Project:</label>
                                        <div className="w-72">
                                            <SearchableSelect 
                                                options={projectOptions}
                                                value={form.project_id}
                                                onChange={(val: string) => handleProjectChange(parseInt(val) || 0)}
                                                placeholder="Search and Link Project..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <table className="w-full text-left text-sm mb-3">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="p-2 border font-medium w-2/3">Item Description {form.project_id > 0 && "(From Project BOM)"}</th>
                                            <th className="p-2 border font-medium w-1/4 text-center">Qty to Deliver</th>
                                            <th className="p-2 border w-12 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.length === 0 ? <tr><td colSpan={3} className="p-4 text-center text-slate-400 italic border border-t-0">No items added. The truck is empty.</td></tr> : items.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="p-1.5 border">
                                                    {form.project_id > 0 ? (
                                                        <select value={item.project_item_component_id} onChange={(e) => { const newItems = [...items]; newItems[idx].project_item_component_id = parseInt(e.target.value); setItems(newItems); }} className="w-full p-2 border border-slate-200 rounded outline-none">
                                                            <option value={0}>Select BOM Component...</option>
                                                            {projectComponents.map(pc => <option key={pc.project_item_component_id} value={pc.project_item_component_id}>{pc.inventory_name}</option>)}
                                                        </select>
                                                    ) : (
                                                        <input type="text" value={item.custom_item_name} onChange={(e) => { const newItems = [...items]; newItems[idx].custom_item_name = e.target.value; setItems(newItems); }} placeholder="Enter item name manually..." className="w-full p-2 border border-slate-200 rounded outline-none" />
                                                    )}
                                                </td>
                                                <td className="p-1.5 border"><input type="number" step="0.01" value={item.qty_to_deliver} onChange={(e) => { const newItems = [...items]; newItems[idx].qty_to_deliver = parseFloat(e.target.value); setItems(newItems); }} className="w-full p-2 border border-slate-200 rounded text-center outline-none" /></td>
                                                <td className="p-1.5 border text-center"><button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button type="button" onClick={() => setItems([...items, { project_item_component_id: 0, custom_item_name: '', qty_to_deliver: 1 }])} className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"><Plus className="h-4 w-4"/> Add Item to Truck</button>
                            </div>

                            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><Users className="h-4 w-4 text-purple-500"/> Assigned Crew & Tasks</h4>
                                
                                <table className="w-full text-left text-sm mb-3">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="p-2 border font-medium w-1/3">Staff Member</th>
                                            <th className="p-2 border font-medium w-auto">Specific Task / Role on Site</th>
                                            <th className="p-2 border w-12 text-center"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {crew.length === 0 ? <tr><td colSpan={3} className="p-4 text-center text-slate-400 italic border border-t-0">No staff assigned yet.</td></tr> : crew.map((c, idx) => (
                                            <tr key={idx}>
                                                <td className="p-1.5 border">
                                                    <select value={c.resource_id} onChange={(e) => { const newCrew = [...crew]; newCrew[idx].resource_id = parseInt(e.target.value); setCrew(newCrew); }} className="w-full p-2 border border-slate-200 rounded outline-none bg-white">
                                                        <option value={0}>Select Staff...</option>
                                                        {staff.map(s => <option key={s.resource_id || s.id} value={s.resource_id || s.id}>{s.name} - {s.position || 'Staff'}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-1.5 border"><input type="text" value={c.specific_task} onChange={(e) => { const newCrew = [...crew]; newCrew[idx].specific_task = e.target.value; setCrew(newCrew); }} placeholder="e.g., Driver, Installer, Quality Check..." className="w-full p-2 border border-slate-200 rounded outline-none" /></td>
                                                <td className="p-1.5 border text-center"><button type="button" onClick={() => setCrew(crew.filter((_, i) => i !== idx))} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4"/></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button type="button" onClick={() => setCrew([...crew, { resource_id: 0, specific_task: '' }])} className="text-sm font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"><UserPlus className="h-4 w-4"/> Assign Staff Member</button>
                            </div>

                            {/* PHASE 4: Execution Notes */}
                            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2"><CheckCircle className="h-4 w-4 text-orange-500"/> Execution & Accomplishment Notes</h4>
                                <textarea 
                                    value={form.accomplishment_notes} 
                                    onChange={e => setForm({...form, accomplishment_notes: e.target.value})}
                                    placeholder="Add summary notes upon completion of the job (e.g. 'Delivered securely, missing 1 bolt, client signed off')"
                                    className="w-full p-3 border border-slate-300 rounded outline-none focus:border-blue-500 min-h-[100px] text-sm"
                                />
                            </div>

                            {/* Action Footer */}
                            <div className="flex justify-between gap-3 pt-4 border-t border-slate-200 mt-4">
                                <div>
                                    {/* Print Job Order Report (Phase 4) */}
                                    {form.booking_id > 0 && (
                                        <button type="button" onClick={handlePrintReport} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-100 transition-colors flex items-center gap-2">
                                            <Printer className="h-4 w-4"/> Print JO Report
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-100 transition-colors">Cancel</button>
                                    <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"><Save className="h-4 w-4"/> Save Job Order</button>
                                    
                                    {/* NEW: Bridge Button to Delivery System */}
                                    {form.booking_id > 0 && form.status === 'Scheduled' && (
                                        <button 
                                            type="button" 
                                            onClick={handlePushToWarehouse} 
                                            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
                                        >
                                            <Truck className="h-4 w-4"/> Push to Warehouse
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}