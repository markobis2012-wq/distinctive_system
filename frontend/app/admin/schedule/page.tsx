'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, Calendar as CalendarIcon, User, Plus, X, Users, MessageSquare, Filter, Printer, Clock } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const THEMES: Record<string, string> = {
  purple: 'bg-fuchsia-100 border-fuchsia-300 text-fuchsia-800',
  green: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  blue: 'bg-blue-100 border-blue-300 text-blue-800',
  pink: 'bg-pink-100 border-pink-300 text-pink-800',
  orange: 'bg-orange-100 border-orange-300 text-orange-800',
};

const THEME_HEX: Record<string, string> = {
  purple: '#c026d3',
  green: '#059669',
  blue: '#2563eb',
  pink: '#db2777',
  orange: '#ea580c',
};

const formatTime = (time24: string) => {
  if (!time24) return '';
  const [h, m] = time24.split(':');
  const d = new Date();
  d.setHours(parseInt(h, 10), parseInt(m, 10));
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const parseLocalDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-');
  return new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
};

const formatLocalDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const resolveBookingColor = (theme?: string) => {
  if (theme && theme.startsWith('#')) return theme;
  return THEME_HEX[theme || ''] || '#4f46e5';
};

export default function SchedulePage() {
  const [entities, setEntities] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'fortnight' | 'month'>('month');
  const [filterEntityId, setFilterEntityId] = useState<string>('all');
  const [draggedBooking, setDraggedBooking] = useState<any>(null);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  });
  
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  
  const [bookingForm, setBookingForm] = useState({ 
    entity_id: '0', project_id: 0, title: '', subtitle: '', task: '', notes: '', 
    start_date: '', end_date: '', start_time: '09:00', end_time: '17:00', color_theme: '#6366f1' 
  });
  const [groupForm, setGroupForm] = useState({ name: '', resource_ids: [] as number[] });

  const getDaysArray = () => {
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);

    if (viewMode === 'month') {
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      const startGrid = new Date(firstDay);
      startGrid.setDate(startGrid.getDate() - startGrid.getDay()); 
      const endGrid = new Date(lastDay);
      if (endGrid.getDay() !== 6) endGrid.setDate(endGrid.getDate() + (6 - endGrid.getDay())); 
      
      const grid = [];
      let current = new Date(startGrid);
      while (current <= endGrid) { grid.push(new Date(current)); current.setDate(current.getDate() + 1); }
      return grid;
    }
    
    if (viewMode === 'day') return [new Date(d)];
    if (viewMode === 'week') return Array.from({ length: 7 }).map((_, i) => { const nd = new Date(d); nd.setDate(d.getDate() + i); return nd; });
    return Array.from({ length: 14 }).map((_, i) => { const nd = new Date(d); nd.setDate(d.getDate() + i); return nd; });
  };
  
  const days = getDaysArray();

  useEffect(() => {
    fetch(`${API_URL}/api/projects`).then(r => r.json()).then(data => setProjects(Array.isArray(data) ? data : (data?.data || []))).catch(() => setProjects([]));
  }, []);

  const fetchSchedule = async () => {
    if (days.length === 0) return;
    const startStr = formatLocalDate(days[0]);
    const endStr = formatLocalDate(days[days.length - 1]);
    try {
      const res = await fetch(`${API_URL}/api/schedule?start=${startStr}&end=${endStr}`);
      if (res.ok) setEntities(await res.json() || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSchedule(); }, [startDate, viewMode]);

  const handlePrev = () => {
    const d = new Date(startDate);
    if (viewMode === 'month') { d.setMonth(d.getMonth() - 1); d.setDate(1); }
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else d.setDate(d.getDate() - 14);
    setStartDate(d);
  };

  const handleNext = () => {
    const d = new Date(startDate);
    if (viewMode === 'month') { d.setMonth(d.getMonth() + 1); d.setDate(1); }
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else d.setDate(d.getDate() + 14);
    setStartDate(d);
  };

  const handleToday = (mode = viewMode) => {
    const d = new Date();
    d.setHours(0,0,0,0);
    if (mode === 'month') d.setDate(1);
    else if (mode !== 'day') d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1));
    setStartDate(d);
  };

  const handleSelectDay = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
    setViewMode('day');
  };

  const handleSaveBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const isGroup = bookingForm.entity_id.startsWith('g_');
    const actualId = parseInt(bookingForm.entity_id.replace('g_', '').replace('r_', ''));
    if (actualId === 0) return alert("Select an assignee");
    if (bookingForm.project_id === 0) return alert("Select a project");

    const payload = { 
      ...bookingForm, 
      start_time: bookingForm.start_time.length === 5 ? bookingForm.start_time + ':00' : bookingForm.start_time,
      end_time: bookingForm.end_time.length === 5 ? bookingForm.end_time + ':00' : bookingForm.end_time,
      resource_id: isGroup ? 0 : actualId, 
      group_id: isGroup ? actualId : 0 
    };
    await fetch(`${API_URL}/api/schedule/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setIsBookingModalOpen(false);
    fetchSchedule();
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupForm.resource_ids.length === 0) return alert("Select at least one member");
    await fetch(`${API_URL}/api/schedule/groups`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(groupForm) });
    setIsGroupModalOpen(false);
    fetchSchedule();
  };

  const handleDeleteBooking = async (id: number) => {
    if (!confirm("Delete this booking?")) return;
    await fetch(`${API_URL}/api/schedule/bookings/${id}`, { method: 'DELETE' });
    fetchSchedule();
  };

  const handleDropBooking = async (targetDate: Date, targetEntity: any) => {
    if (!draggedBooking) return;
    const oldStart = parseLocalDate(draggedBooking.start_date);
    const oldEnd = parseLocalDate(draggedBooking.end_date);
    const durationDays = Math.round((oldEnd.getTime() - oldStart.getTime()) / (1000 * 60 * 60 * 24));

    const newStart = new Date(targetDate);
    const newEnd = new Date(targetDate);
    newEnd.setDate(newStart.getDate() + durationDays);

    const payload = {
      start_date: formatLocalDate(newStart),
      end_date: formatLocalDate(newEnd),
      resource_id: targetEntity.type === 'resource' ? targetEntity.id : 0,
      group_id: targetEntity.type === 'group' ? targetEntity.id : 0
    };

    setDraggedBooking(null);
    await fetch(`${API_URL}/api/schedule/bookings/${draggedBooking.booking_id}/move`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    fetchSchedule();
  };

  const getGridStyle = (start: string, end: string) => {
    const bookingStart = parseLocalDate(start); 
    const bookingEnd = parseLocalDate(end);
    const viewStart = new Date(days[0]); 
    const viewEnd = new Date(days[days.length - 1]);
    
    bookingStart.setHours(0,0,0,0); bookingEnd.setHours(0,0,0,0); 
    viewStart.setHours(0,0,0,0); viewEnd.setHours(0,0,0,0);

    if (bookingEnd < viewStart || bookingStart > viewEnd) return { display: 'none' };
    const effectiveStart = bookingStart < viewStart ? viewStart : bookingStart;
    const effectiveEnd = bookingEnd > viewEnd ? viewEnd : bookingEnd;

    const startDiff = Math.floor((effectiveStart.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return { gridColumnStart: startDiff + 1, gridColumnEnd: `span ${duration}` };
  };

  const resourcesOnly = entities.filter(e => e.type === 'resource');
  const visibleEntities = entities.filter(ent => filterEntityId === 'all' || `${ent.type === 'group' ? 'g' : 'r'}_${ent.id}` === filterEntityId);

  const getBookingsForDay = (d: Date) => {
    return visibleEntities.flatMap(e => (e.bookings || []).map((b: any) => ({ ...b, entity: e }))).filter((b: any) => {
      const s = parseLocalDate(b.start_date); s.setHours(0,0,0,0);
      const e = parseLocalDate(b.end_date); e.setHours(23,59,59,999);
      const curr = new Date(d); curr.setHours(12,0,0,0);
      return curr >= s && curr <= e;
    }).sort((a: any, b: any) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00'));
  };

  const getScheduleLegend = () => {
    const map = new Map<string, { name: string; type: string; colors: string[] }>();
    days.forEach(d => {
      getBookingsForDay(d).forEach((b: any) => {
        if (!b.entity) return;
        const id = `${b.entity.type}_${b.entity.id}`;
        const color = resolveBookingColor(b.color_theme);
        const existing = map.get(id);
        if (!existing) {
          map.set(id, { name: b.entity.name, type: b.entity.type, colors: [color] });
        } else if (!existing.colors.includes(color)) {
          existing.colors.push(color);
        }
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'group' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  };

  const scheduleLegend = getScheduleLegend();

  const currentFilterName = filterEntityId === 'all' 
    ? 'All Groups & Individuals' 
    : entities.find(e => `${e.type === 'group' ? 'g' : 'r'}_${e.id}` === filterEntityId)?.name || 'Filtered';

  return (
    <div className="bg-white min-h-screen flex flex-col font-sans">
      
      <div className="flex-1 flex flex-col overflow-hidden print:hidden">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-indigo-600" /> Schedule
            </div>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            
            <select 
              value={viewMode} 
              onChange={e => { 
                const newMode = e.target.value as any; 
                setViewMode(newMode); 
                if (newMode === 'day') {
                  const d = new Date();
                  d.setHours(0, 0, 0, 0);
                  setStartDate(d);
                } else {
                  handleToday(newMode);
                }
              }}
              className="border border-slate-300 rounded-lg text-sm px-3 py-1.5 outline-none bg-slate-50 font-medium text-slate-700 focus:border-indigo-500 cursor-pointer"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="fortnight">14 Days</option>
              <option value="month">Month</option>
            </select>

            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
              <button onClick={() => handleToday()} className="px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 border-r border-slate-300">Today</button>
              <button onClick={handlePrev} className="px-2 py-1.5 hover:bg-slate-50 text-slate-600 border-r border-slate-300"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={handleNext} className="px-2 py-1.5 hover:bg-slate-50 text-slate-600"><ChevronRight className="h-4 w-4" /></button>
            </div>
            
            <span className="text-sm font-bold text-slate-700 ml-2">
              {viewMode === 'month' 
                ? startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                : viewMode === 'day' 
                  ? startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                  : `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${days[days.length - 1].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
              }
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-slate-50 shadow-sm transition-colors">
              <Printer className="h-4 w-4" /> Print
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <div className="relative">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select 
                value={filterEntityId} 
                onChange={e => setFilterEntityId(e.target.value)} 
                className="pl-8 pr-4 py-1.5 border border-slate-300 rounded-full text-sm outline-none focus:border-indigo-500 w-48 bg-white cursor-pointer appearance-none"
              >
                <option value="all">All Schedules</option>
                <optgroup label="Groups">
                  {entities.filter(e => e.type === 'group').map(g => <option key={`g_${g.id}`} value={`g_${g.id}`}>👥 {g.name}</option>)}
                </optgroup>
                <optgroup label="Individuals">
                  {entities.filter(e => e.type === 'resource').map(r => <option key={`r_${r.id}`} value={`r_${r.id}`}>👤 {r.name}</option>)}
                </optgroup>
              </select>
            </div>
            <button onClick={() => setIsGroupModalOpen(true)} className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-1.5 rounded-full text-sm font-medium hover:bg-slate-50 shadow-sm">
              <Users className="h-4 w-4" /> Manage Groups
            </button>
            <button onClick={() => setIsBookingModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-indigo-700 shadow-sm">
              <Plus className="h-4 w-4" /> New Booking
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {viewMode === 'month' && (
            <div className="flex-1 flex flex-col bg-white overflow-y-auto min-w-[900px]">
              {scheduleLegend.length > 0 && (
                <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Legend — Groups & Individuals on this schedule
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {scheduleLegend.map((item) => (
                      <div key={`${item.type}_${item.name}`} className="flex items-center gap-1.5 text-[12px]">
                        <span className="flex items-center gap-0.5">
                          {item.colors.map((color) => (
                            <span
                              key={color}
                              className="inline-block w-3 h-3 rounded-sm border border-slate-300"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </span>
                        <span className="font-bold" style={{ color: item.colors[0] }}>{item.name}</span>
                        <span className="text-slate-500">({item.type === 'group' ? 'Group' : 'Individual'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-7 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <div key={day} className="py-2 text-center text-sm font-bold text-slate-600 border-r border-slate-200">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 flex-1 auto-rows-[minmax(130px,1fr)]">
                {days.map((d, i) => {
                  const isCurrentMonth = d.getMonth() === startDate.getMonth();
                  const isToday = d.toDateString() === new Date().toDateString();
                  const dayBookings = getBookingsForDay(d);

                  return (
                    <div 
                      key={i} 
                      className={`border-r border-b border-slate-200 p-1 flex flex-col cursor-pointer hover:bg-indigo-50/40 transition-colors ${!isCurrentMonth ? 'bg-slate-50/60' : 'bg-white'}`}
                      onClick={() => handleSelectDay(d)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); if (draggedBooking) handleDropBooking(d, draggedBooking.entity); }}
                    >
                      <div className={`text-right p-1 text-sm ${isToday ? 'font-bold text-white bg-indigo-600 w-7 h-7 rounded-full flex items-center justify-center ml-auto mb-1' : 'text-slate-500 font-medium'}`}>
                        {d.getDate()}
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 mt-1">
                        {dayBookings.map((b: any) => {
                          const isHex = b.color_theme && b.color_theme.startsWith('#');
                          const themeClass = !isHex ? (THEMES[b.color_theme] || THEMES.purple) : '';
                          const isDragging = draggedBooking?.booking_id === b.booking_id;

                          return (
                            <div 
                              key={`${b.booking_id}_${i}`}
                              draggable
                              onDragStart={(e) => { setDraggedBooking(b); e.dataTransfer.effectAllowed = 'move'; }}
                              onDragEnd={() => setDraggedBooking(null)}
                              style={isHex ? { backgroundColor: `${b.color_theme}20`, borderLeft: `3px solid ${b.color_theme}`, color: b.color_theme } : {}}
                              className={`text-[11px] p-1.5 leading-tight truncate rounded cursor-grab active:cursor-grabbing mb-1 shadow-sm ${themeClass} ${isDragging ? 'opacity-40 scale-95' : 'hover:scale-[1.02] transition-transform duration-150'}`}
                              title={`${b.title} ${b.task ? `\nTask: ${b.task}` : ''}\nAssignee: ${b.entity.name}`}
                            >
                              <span className="font-bold">{b.title}</span>
                              {b.task && <span> - {b.task}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'day' && (
            <div className="flex-1 overflow-auto bg-slate-50">
              <div style={{ minWidth: '1000px' }}>
                <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
                  <div className="w-64 flex-shrink-0 border-r border-slate-200 p-4 bg-white"></div>
                  <div className="flex-1 flex">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <div key={i} className="flex-1 border-r border-slate-100 flex flex-col items-center justify-center p-2 text-slate-500">
                        <span className="text-[10px] uppercase font-bold tracking-wider">
                          {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {visibleEntities.map(ent => (
                  <div key={`${ent.type}_${ent.id}`} className={`flex border-b border-slate-200 bg-white hover:bg-slate-50/50 transition-colors group ${ent.type === 'group' ? 'bg-indigo-50/30' : ''}`}>
                    <div className="w-64 flex-shrink-0 border-r border-slate-200 p-4 flex items-center gap-3 bg-white sticky left-0 z-10 group-hover:bg-slate-50/50">
                      {ent.type === 'group' ? (
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center"><Users className="h-5 w-5 text-indigo-600" /></div>
                      ) : ent.avatar_url ? (
                        <img src={ent.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center"><User className="h-5 w-5 text-slate-500" /></div>
                      )}
                      <div className="overflow-hidden">
                        <div className={`font-bold text-sm text-slate-800 truncate ${ent.type === 'group' ? 'text-indigo-900' : ''}`}>{ent.name}</div>
                        <div className="text-xs text-slate-500 truncate">{ent.type === 'group' ? 'Team Schedule' : ent.role}</div>
                      </div>
                    </div>

                    <div className="flex-1 relative h-16 min-h-[70px]">
                      <div className="absolute inset-0 flex">
                        {Array.from({ length: 24 }).map((_, i) => <div key={i} className="flex-1 border-r border-slate-100"></div>)}
                      </div>

                      {ent.bookings && ent.bookings.map((b: any) => {
                        const s = parseLocalDate(b.start_date); s.setHours(0,0,0,0);
                        const e = parseLocalDate(b.end_date); e.setHours(23,59,59,999);
                        const curr = new Date(days[0]); curr.setHours(12,0,0,0);
                        
                        if (curr < s || curr > e) return null;

                        let startHour = 0; 
                        let endHour = 24;  

                        const isStartDay = curr.getFullYear() === s.getFullYear() && curr.getMonth() === s.getMonth() && curr.getDate() === s.getDate();
                        const isEndDay = curr.getFullYear() === e.getFullYear() && curr.getMonth() === e.getMonth() && curr.getDate() === e.getDate();

                        if (isStartDay && b.start_time) {
                          const parts = b.start_time.split(':');
                          startHour = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
                        }
                        
                        if (isEndDay && b.end_time) {
                          const parts = b.end_time.split(':');
                          endHour = parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
                        }

                        const left = (startHour / 24) * 100;
                        const width = Math.max(1, ((endHour - startHour) / 24) * 100);

                        const isHex = b.color_theme && b.color_theme.startsWith('#');
                        const bgStyle = isHex ? { backgroundColor: `${b.color_theme}20`, borderLeft: `4px solid ${b.color_theme}` } : {};
                        const themeClass = !isHex ? (THEMES[b.color_theme] || THEMES.purple) : 'text-slate-800 border-y border-r border-slate-200';

                        return (
                          <div 
                            key={b.booking_id} 
                            style={{ left: `${left}%`, width: `${width}%`, ...bgStyle }} 
                            className={`absolute top-1 bottom-1 rounded px-2 py-1 text-xs shadow-sm overflow-hidden ${themeClass} hover:scale-[1.01] transition-transform duration-150 cursor-pointer`}
                            title={`${formatTime(b.start_time)} - ${formatTime(b.end_time)}\n${b.title}\n${b.task || ''}\n${b.notes || ''}`}
                          >
                            <div className="font-bold truncate" style={{ color: isHex ? b.color_theme : undefined }}>{b.title}</div>
                            <div className="text-[10px] truncate opacity-80 mt-0.5">{formatTime(b.start_time)} - {formatTime(b.end_time)}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(viewMode === 'week' || viewMode === 'fortnight') && (
            <div className="flex-1 overflow-auto bg-slate-50">
              <div style={{ minWidth: Math.max(1000, days.length * 100) + 'px' }}>
                <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
                  <div className="w-64 flex-shrink-0 border-r border-slate-200 p-4 bg-white"></div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                    {days.map((d, i) => {
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                      return (
                        <div 
                          key={i} 
                          onClick={() => handleSelectDay(d)}
                          title={`Open ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} in Day view`}
                          className={`p-2 border-r border-slate-100 flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition-colors ${isWeekend ? 'bg-slate-50 text-slate-400' : 'text-slate-700'}`}
                        >
                          <span className="text-[10px] uppercase font-bold tracking-wider">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className={`text-lg font-light ${d.toDateString() === new Date().toDateString() ? 'bg-indigo-600 text-white h-7 w-7 flex items-center justify-center rounded-full mt-1' : ''}`}>
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {visibleEntities.map(ent => (
                  <div key={`${ent.type}_${ent.id}`} className={`flex border-b border-slate-200 bg-white hover:bg-slate-50/50 transition-colors group ${ent.type === 'group' ? 'bg-indigo-50/30' : ''}`}>
                    <div className="w-64 flex-shrink-0 border-r border-slate-200 p-4 flex items-center gap-3 bg-white sticky left-0 z-10 group-hover:bg-slate-50/50">
                      {ent.type === 'group' ? (
                        <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center"><Users className="h-5 w-5 text-indigo-600" /></div>
                      ) : ent.avatar_url ? (
                        <img src={ent.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover border border-slate-200" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center"><User className="h-5 w-5 text-slate-500" /></div>
                      )}
                      <div className="overflow-hidden">
                        <div className={`font-bold text-sm text-slate-800 truncate ${ent.type === 'group' ? 'text-indigo-900' : ''}`}>{ent.name}</div>
                        <div className="text-xs text-slate-500 truncate">{ent.type === 'group' ? 'Team Schedule' : ent.role}</div>
                      </div>
                    </div>

                    <div 
                      className="flex-1 relative"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const colIndex = Math.floor(x / (rect.width / days.length));
                        if (colIndex >= 0 && colIndex < days.length) handleDropBooking(days[colIndex], ent); 
                      }}
                    >
                      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
                        {days.map((d, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleSelectDay(d)}
                            className={`border-r border-slate-100 cursor-pointer hover:bg-indigo-50/40 ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-slate-50/80' : ''}`}
                          />
                        ))}
                      </div>

                      <div className="relative z-10 grid p-2 gap-y-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`, gridAutoRows: 'minmax(50px, auto)' }}>
                        {ent.bookings && ent.bookings.map((b: any) => {
                          const isHex = b.color_theme && b.color_theme.startsWith('#');
                          const bgStyle = isHex ? { backgroundColor: `${b.color_theme}20`, borderLeft: `4px solid ${b.color_theme}` } : {};
                          const themeClass = !isHex ? (THEMES[b.color_theme] || THEMES.purple) : 'text-slate-800 border-y border-r border-slate-200';
                          const isDragging = draggedBooking?.booking_id === b.booking_id;

                          return (
                            <div 
                              key={b.booking_id} 
                              draggable
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectDay(parseLocalDate(b.start_date));
                              }}
                              onDragStart={(e) => { setDraggedBooking({...b, entity: ent}); e.dataTransfer.effectAllowed = 'move'; }}
                              onDragEnd={() => setDraggedBooking(null)}
                              style={{ ...getGridStyle(b.start_date, b.end_date), ...bgStyle }} 
                              className={`relative rounded px-2 py-1.5 text-xs mx-0.5 group/booking shadow-sm cursor-pointer ${themeClass} ${isDragging ? 'opacity-40 scale-95' : 'hover:scale-[1.01] transition-transform duration-150'}`}
                            >
                              <div className="flex items-start justify-between mb-0.5">
                                <span className="font-bold opacity-80 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {formatTime(b.start_time)}
                                </span>
                                <div className="flex gap-1">
                                  {b.notes && (
                                    <span title={b.notes} className="cursor-help">
                                      <MessageSquare className="h-3 w-3 opacity-60" />
                                    </span>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteBooking(b.booking_id); }} className="opacity-0 group-hover/booking:opacity-100 hover:text-red-700 transition-opacity">
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="font-bold truncate" title={b.title} style={{ color: isHex ? b.color_theme : undefined }}>{b.title}</div>
                              {b.task && <div className="font-medium truncate opacity-90 italic">Task: {b.task}</div>}
                              <div className="truncate opacity-75">{b.subtitle}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #printable-schedule, #printable-schedule * { visibility: visible; }
          #printable-schedule {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page { size: ${viewMode === 'month' ? 'landscape A4' : 'portrait A4'}; margin: 10mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; color: black !important; }
          ::-webkit-scrollbar { display: none !important; }
        }
      `}} />

      <div id="printable-schedule" className="hidden print:block w-full bg-white text-black p-4">
        
        {viewMode === 'month' && (
          <div className="w-full">
            <div className="flex justify-between items-end mb-3 border-b-[3px] border-black pb-2">
              <h1 className="text-3xl font-bold">{startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h1>
              <div className="text-right text-sm">
                <div className="font-bold">Filter: {currentFilterName}</div>
                <div className="text-slate-600" suppressHydrationWarning>Printed: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            {scheduleLegend.length > 0 && (
              <div className="mb-3 border border-slate-400">
                <div className="bg-slate-100 border-b border-slate-400 px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                  Legend — Groups & Individuals on this schedule
                </div>
                <div className="p-2 flex flex-wrap gap-x-4 gap-y-2">
                  {scheduleLegend.map((item) => (
                    <div key={`${item.type}_${item.name}`} className="flex items-center gap-1.5 text-[11px]">
                      <span className="flex items-center gap-0.5">
                        {item.colors.map((color) => (
                          <span
                            key={color}
                            className="inline-block w-3 h-3 rounded-sm border border-slate-400"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </span>
                      <span className="font-bold" style={{ color: item.colors[0] }}>{item.name}</span>
                      <span className="text-slate-500">({item.type === 'group' ? 'Group' : 'Individual'})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <table className="w-full border-collapse border-2 border-slate-500 table-fixed">
              <thead>
                <tr>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                    <th key={day} className="border border-slate-400 p-1 text-center text-xs bg-slate-100 uppercase font-bold">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(days.length / 7) }).map((_, weekIdx) => (
                  <tr key={weekIdx}>
                    {days.slice(weekIdx * 7, (weekIdx + 1) * 7).map((d, i) => {
                        const dayBookings = getBookingsForDay(d);
                        const isCurrentMonth = d.getMonth() === startDate.getMonth();
                        return (
                          <td key={i} className={`border border-slate-400 p-1 align-top h-24 ${!isCurrentMonth ? 'bg-slate-100/50 text-slate-500' : ''}`}>
                            <div className="text-xs font-bold mb-1 ml-1">{d.getDate()}</div>
                            <div className="space-y-1">
                              {dayBookings.map((b: any, bIdx: number) => {
                                const hex = resolveBookingColor(b.color_theme);
                                return (
                                  <div key={bIdx} className="text-[10px] leading-tight border-l-[3px] pl-1 truncate mb-0.5" style={{ borderLeftColor: hex, color: hex }}>
                                    <span className="font-bold">{formatTime(b.start_time)}</span> {b.entity.name}: {b.title}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="w-full">
            <div className="flex justify-between items-end mb-6 border-b-[3px] border-black pb-2">
              <h1 className="text-3xl font-bold">{days[0].toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</h1>
              <div className="text-right text-sm">
                <div className="font-bold">Filter: {currentFilterName}</div>
                <div className="text-slate-600" suppressHydrationWarning>Printed: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-2/3 flex flex-col gap-6">
                <div className="border border-slate-400 relative">
                  <div className="bg-slate-100 border-b border-slate-400 p-1.5 flex justify-between items-baseline">
                    <span className="font-bold uppercase tracking-wider text-sm ml-1">{days[0].toLocaleDateString('en-US', { weekday: 'long' })}</span>
                    <span className="font-bold text-lg mr-1">{days[0].getDate()}</span>
                  </div>
                  
                  <div className="relative h-[800px] w-full bg-white">
                    {Array.from({ length: 12 }).map((_, i) => {
                      const hour = i + 7;
                      return (
                        <div key={i} className="absolute w-full flex" style={{ top: `${(i / 12) * 100}%`, height: `${(1/12)*100}%` }}>
                          <div className="w-16 border-r border-b border-slate-300 flex items-start justify-end pr-2 pt-1 font-medium text-[11px] text-slate-500">
                            {hour > 12 ? hour - 12 : hour} {hour >= 12 ? 'PM' : 'AM'}
                          </div>
                          <div className="flex-1 border-b border-slate-300">
                            <div className="w-full h-1/2 border-b border-dashed border-slate-200"></div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="absolute inset-0 ml-16 p-2">
                      {getBookingsForDay(days[0]).map((b: any, bIdx: number) => {
                        const hex = resolveBookingColor(b.color_theme);
                        const startParts = (b.start_time || '09:00').split(':');
                        const startHour = parseInt(startParts[0], 10) + parseInt(startParts[1], 10) / 60;
                        const endParts = (b.end_time || '17:00').split(':');
                        const endHour = parseInt(endParts[0], 10) + parseInt(endParts[1], 10) / 60;

                        const topPercent = Math.max(0, ((startHour - 7) / 12) * 100);
                        const heightPercent = Math.max(2, Math.min(100 - topPercent, ((endHour - startHour) / 12) * 100));

                        return (
                          <div key={bIdx} className="absolute left-2 right-2 border rounded shadow-sm p-1.5 overflow-hidden leading-tight" 
                               style={{ top: `${topPercent}%`, height: `${heightPercent}%`, backgroundColor: `${hex}15`, borderLeft: `4px solid ${hex}`, borderColor: `${hex}40` }}>
                            <div className="font-bold text-xs" style={{ color: hex }}>{formatTime(b.start_time)} - {formatTime(b.end_time)}</div>
                            <div className="font-bold text-sm mt-0.5">{b.entity.name}: {b.title}</div>
                            {b.task && <div className="italic text-xs text-slate-700 mt-0.5">{b.task}</div>}
                            {b.notes && <div className="text-[10px] text-slate-600 mt-0.5 line-clamp-2">{b.notes}</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-1/3 flex flex-col gap-6">
                <div className="border border-slate-400 flex-1 flex flex-col min-h-[300px]">
                  <div className="bg-slate-100 border-b border-slate-400 p-1.5 text-center font-bold text-xs uppercase tracking-wider">Daily Task List</div>
                  <div className="flex-1 p-3 space-y-6">
                    {Array.from({ length: 7 }).map((_, idx) => <div key={idx} className="border-b border-slate-300 mt-6"></div>)}
                  </div>
                </div>
                <div className="border border-slate-400 flex-1 flex flex-col min-h-[300px]">
                  <div className="bg-slate-100 border-b border-slate-400 p-1.5 text-center font-bold text-xs uppercase tracking-wider">Notes</div>
                  <div className="flex-1 p-3">
                    {Array.from({ length: 7 }).map((_, idx) => <div key={idx} className="border-b border-slate-300 mt-6"></div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {(viewMode === 'week' || viewMode === 'fortnight') && (
          <div className="w-full">
            <div className="flex justify-between items-end mb-6 border-b-[3px] border-black pb-2">
              <h1 className="text-3xl font-bold">
                {days[0].toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} to {days[days.length-1].toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </h1>
              <div className="text-right text-sm">
                <div className="font-bold">Filter: {currentFilterName}</div>
                <div className="text-slate-600" suppressHydrationWarning>Printed: {new Date().toLocaleDateString()}</div>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="w-2/3 flex flex-col gap-6">
                {days.map((d, i) => {
                  const dayBookings = getBookingsForDay(d);
                  return (
                    <div key={i} className="border border-slate-400 print:break-inside-avoid">
                      <div className="bg-slate-100 border-b border-slate-400 p-1.5 flex justify-between items-baseline">
                        <span className="font-bold uppercase tracking-wider text-sm ml-1">{d.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                        <span className="font-bold text-lg mr-1">{d.getDate()}</span>
                      </div>
                      <div className="p-2 min-h-[60px]">
                        {dayBookings.length === 0 ? (
                          <div className="text-xs text-slate-400 italic text-center py-4">No scheduled tasks</div>
                        ) : (
                          <table className="w-full text-xs">
                            <tbody>
                              {dayBookings.map((b: any, bIdx: number) => {
                                const hex = resolveBookingColor(b.color_theme);
                                return (
                                  <tr key={bIdx} className="border-b border-slate-200 border-dashed last:border-0">
                                    <td className="py-2 w-1/4 align-top font-bold border-l-4 pl-2" style={{ borderLeftColor: hex }}>{b.entity.name}</td>
                                    <td className="py-2 w-1/2 align-top pr-2">
                                      <div className="font-bold text-[13px] leading-tight">{b.title}</div>
                                      {b.task && <div className="italic text-slate-700 mt-0.5">{b.task}</div>}
                                      {b.notes && <div className="text-[10px] text-slate-500 mt-0.5">{b.notes}</div>}
                                    </td>
                                    <td className="py-2 w-1/4 align-top text-right font-bold text-slate-700">
                                      {formatTime(b.start_time)} - {formatTime(b.end_time)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="w-1/3 flex flex-col gap-6">
                <div className="border border-slate-400 flex-1 flex flex-col min-h-[300px]">
                  <div className="bg-slate-100 border-b border-slate-400 p-1.5 text-center font-bold text-xs uppercase tracking-wider">Weekly Task List</div>
                  <div className="flex-1 p-3 space-y-6">
                    {Array.from({ length: 6 }).map((_, idx) => <div key={idx} className="border-b border-slate-300 mt-6"></div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">New Booking</h3>
              <button onClick={() => setIsBookingModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Assign To *</label>
                <select required value={bookingForm.entity_id} onChange={e => setBookingForm({...bookingForm, entity_id: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:border-indigo-500">
                  <option value="0">Select Group or Person...</option>
                  <optgroup label="Groups">
                    {entities.filter(e => e.type === 'group').map(g => <option key={`g_${g.id}`} value={`g_${g.id}`}>👥 {g.name}</option>)}
                  </optgroup>
                  <optgroup label="Individuals">
                    {entities.filter(e => e.type === 'resource').map(r => <option key={`r_${r.id}`} value={`r_${r.id}`}>👤 {r.name}</option>)}
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Project Name *</label>
                  <select required value={bookingForm.project_id} onChange={e => {
                    const pid = parseInt(e.target.value);
                    const proj = projects.find(p => p.projects_id === pid);
                    setBookingForm({...bookingForm, project_id: pid, title: proj?.project_name || '', subtitle: proj?.company_name || proj?.client_name || proj?.client || ''});
                  }} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-white focus:border-indigo-500">
                    <option value="0">Select Project...</option>
                    {projects.map(p => <option key={p.projects_id} value={p.projects_id}>{p.project_number} - {p.project_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Client (Auto-filled)</label>
                  <input readOnly type="text" value={bookingForm.subtitle} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm bg-slate-50 text-slate-500" placeholder="Select project first" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Specific Task</label>
                <input type="text" value={bookingForm.task} onChange={e => setBookingForm({...bookingForm, task: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500" placeholder="e.g. Configure AWS Load Balancer" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Notes / Instructions</label>
                <textarea rows={2} value={bookingForm.notes} onChange={e => setBookingForm({...bookingForm, notes: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500 resize-none" placeholder="Add specific instructions here..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Start Date *</label><input required type="date" value={bookingForm.start_date} onChange={e => setBookingForm({...bookingForm, start_date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500" /></div>
                <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">End Date *</label><input required type="date" value={bookingForm.end_date} onChange={e => setBookingForm({...bookingForm, end_date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500" /></div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Start Time *</label><input required type="time" value={bookingForm.start_time} onChange={e => setBookingForm({...bookingForm, start_time: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500" /></div>
                <div><label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">End Time *</label><input required type="time" value={bookingForm.end_time} onChange={e => setBookingForm({...bookingForm, end_time: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500" /></div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Color Theme *</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={bookingForm.color_theme} onChange={e => setBookingForm({...bookingForm, color_theme: e.target.value})} className="h-10 w-16 p-1 border border-slate-300 rounded-lg cursor-pointer bg-white" />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsBookingModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-md">Save Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-[100] flex items-center justify-center p-4 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">Create New Group</h3>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveGroup} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Group Name *</label>
                <input required type="text" value={groupForm.name} onChange={e => setGroupForm({...groupForm, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none text-sm focus:border-indigo-500" placeholder="e.g. Design Team" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Select Members *</label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                  {resourcesOnly.map(r => (
                    <label key={r.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input type="checkbox" checked={groupForm.resource_ids.includes(r.id)} onChange={e => { setGroupForm({...groupForm, resource_ids: e.target.checked ? [...groupForm.resource_ids, r.id] : groupForm.resource_ids.filter(id => id !== r.id)}); }} className="rounded text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-sm text-slate-700">{r.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg text-sm hover:bg-indigo-700 transition-colors shadow-md">Save Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}