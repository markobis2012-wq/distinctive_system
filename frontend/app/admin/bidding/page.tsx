'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Edit2, Check, X, FileSignature, Filter, ArrowUp, ArrowDown, CalendarClock, Calendar } from 'lucide-react';
import Link from 'next/link';

// --- Custom Searchable Select Dropdown ---
const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", onAddNew }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) { setIsOpen(false); }
    };
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
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <input autoFocus type="text" className="w-full p-1.5 border border-slate-300 rounded outline-none text-xs focus:ring-1 focus:ring-blue-500" placeholder="Type to search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="overflow-y-auto flex-1">
            <div className="p-2 hover:bg-red-50 cursor-pointer text-slate-400 italic text-xs border-b border-slate-100" onClick={() => { onChange(""); setIsOpen(false); setSearchTerm(""); }}>Clear Selection</div>
            {filteredOptions.length > 0 ? filteredOptions.map((o: any) => (
              <div key={o.value} className="p-2 hover:bg-blue-50 cursor-pointer text-slate-700 truncate text-xs" onClick={() => { onChange(o.value); setIsOpen(false); setSearchTerm(""); }}>{o.label}</div>
            )) : <div className="p-3 text-slate-500 text-xs text-center italic">No results found</div>}
          </div>
          {onAddNew && (
            <div className="p-2 border-t border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer text-blue-700 text-sm font-bold flex items-center justify-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); setIsOpen(false); onAddNew(); }}>
              <Plus className="h-4 w-4" /> Add new
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Editable Field for Table ---
const EditableField = ({ value, type = "text", options = [], onSave }: { value: string, type?: string, options?: string[], onSave: (val: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        {type === 'select' ? (
          <select value={tempVal} onChange={(e) => setTempVal(e.target.value)} className="w-full px-2 py-1 border border-blue-400 rounded text-sm outline-none">
            <option value="">Select...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} value={tempVal} onChange={(e) => setTempVal(e.target.value)} className="w-full px-2 py-1 border border-blue-400 rounded text-sm outline-none" />
        )}
        <button onClick={() => { onSave(tempVal); setIsEditing(false); }} className="p-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"><Check className="h-3 w-3" /></button>
        <button onClick={() => { setTempVal(value); setIsEditing(false); }} className="p-1 bg-red-100 text-red-700 rounded hover:bg-red-200"><X className="h-3 w-3" /></button>
      </div>
    );
  }
  return (
    <div className="group flex items-center justify-between p-1 -ml-1 rounded hover:bg-slate-100 transition-colors cursor-pointer" onDoubleClick={() => setIsEditing(true)}>
      <span className="truncate">{value || <span className="text-slate-400 italic">Empty</span>}</span>
      <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-all rounded shadow-sm"><Edit2 className="h-3 w-3" /></button>
    </div>
  );
};

export default function BiddingPage() {
  const [biddings, setBiddings] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any>({ islands: [], regions: [], provinces: [], cities: [] });
  
  // Pagination, Search, Sorting, and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [upcomingBids, setUpcomingBids] = useState(0);
  const [upcomingPreBids, setUpcomingPreBids] = useState(0);
  const limit = 20;

  const [sortConfig, setSortConfig] = useState({ field: 'bidding_id', order: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    company: 0, island: 0, region: 0, province: 0, city: 0,
    preBidStart: '', preBidEnd: '', bidStart: '', bidEnd: ''
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [locModal, setLocModal] = useState<{type: 'island'|'region'|'province'|'city'|null, parentId: number, name: string}>({ type: null, parentId: 0, name: '' });

  const defaultForm = {
    is_rfq: 0, must_join: 0, reference_no: '', solicitation_no: '', procuring_entity: '', client_id: 0, title: '', full_address: '',
    island_group_id: 0, region_id: 0, province_id: 0, city_id: 0, trade_agreement: '', procurement_mode: '', classification: '', category: '',
    contact_numbers: '', approved_budget: 0, delivery_period: '', date_published: '', last_update_time: '', closing_date_time: '',
    contact_person: '', contact_person_dept: '', contact_number: '', email: '', alternate_cont_person: '', alternate_cont_dept: '',
    alt_cont_contacts: '', alt_cont_email: '', pre_bid_datetime: '', venue: '', itb_status: 'New', note_desc: ''
  };
  const [form, setForm] = useState(defaultForm);

  const fetchDictionaries = async () => {
    try {
      const [compRes, locRes] = await Promise.all([ fetch('http://localhost:8081/api/companies'), fetch('http://localhost:8081/api/locations') ]);
      if (compRes.ok) setCompanies(await compRes.json());
      if (locRes.ok) setLocations(await locRes.json());
    } catch (err) {}
  };

  useEffect(() => { fetchDictionaries(); }, []);

  const fetchBiddings = async () => {
    try {
      const queryParams = new URLSearchParams({
        page: String(page), limit: String(limit), search: searchQuery,
        sortField: sortConfig.field, sortOrder: sortConfig.order,
        company: String(filters.company), island: String(filters.island), region: String(filters.region), province: String(filters.province), city: String(filters.city),
        preBidStart: filters.preBidStart, preBidEnd: filters.preBidEnd, bidStart: filters.bidStart, bidEnd: filters.bidEnd
      });
      const res = await fetch(`http://localhost:8081/api/biddings?${queryParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setBiddings(json.data);
        setTotalRecords(json.total);
        setUpcomingBids(json.upcoming_bids);
        setUpcomingPreBids(json.upcoming_pre_bids);
      }
    } catch (err) {}
  };

  // Trigger fetch when any search, filter, or sort dependency changes
  useEffect(() => {
    const timer = setTimeout(() => fetchBiddings(), 300);
    return () => clearTimeout(timer);
  }, [page, searchQuery, sortConfig, filters]);

  const handleSort = (field: string) => {
    setSortConfig(prev => ({ field, order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => {
      let updated = { ...prev, [key]: value };
      if (key === 'island') updated = { ...updated, region: 0, province: 0, city: 0 };
      if (key === 'region') updated = { ...updated, province: 0, city: 0 };
      if (key === 'province') updated = { ...updated, city: 0 };
      return updated;
    });
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ company: 0, island: 0, region: 0, province: 0, city: 0, preBidStart: '', preBidEnd: '', bidStart: '', bidEnd: '' });
    setSearchQuery('');
    setPage(1);
  };

  const apply7DayFilter = (type: 'bidding' | 'pre_bidding') => {
    // Calculate local timezone dates correctly
    const today = new Date();
    const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    const nextWeek = new Date(localToday);
    nextWeek.setDate(localToday.getDate() + 7);

    const start = localToday.toISOString().split('T')[0];
    const end = nextWeek.toISOString().split('T')[0];

    setFilters(prev => ({
      ...prev,
      bidStart: type === 'bidding' ? start : '',
      bidEnd: type === 'bidding' ? end : '',
      preBidStart: type === 'pre_bidding' ? start : '',
      preBidEnd: type === 'pre_bidding' ? end : ''
    }));
    
    setShowFilters(true); // Open the drawer so the user sees the dates were filled in!
    setPage(1);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8081/api/biddings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      if (res.ok) { setIsModalOpen(false); fetchBiddings(); }
    } catch (err) {}
  };

  const handleInlineUpdate = async (id: number, field: string, value: any) => {
    const target = biddings.find(b => b.bidding_id === id);
    if (!target) return;
    try {
      const res = await fetch(`http://localhost:8081/api/biddings/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...target, [field]: value })
      });
      if (res.ok) fetchBiddings();
    } catch (err) {}
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this bidding record?")) return;
    try {
      const res = await fetch(`http://localhost:8081/api/biddings/${id}`, { method: 'DELETE' });
      if (res.ok) fetchBiddings();
    } catch (err) {}
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    let endpoint = '';
    let payload: any = {};
    
    if (locModal.type === 'island') {
      endpoint = '/api/locations/island_group';
      payload = { island_group_name: locModal.name };
    } else if (locModal.type === 'region') {
      if (!locModal.parentId) { alert("Please select an Island Group"); return; }
      endpoint = '/api/locations/region';
      payload = { region_name: locModal.name, island_group_id: locModal.parentId };
    } else if (locModal.type === 'province') {
      if (!locModal.parentId) { alert("Please select a Region"); return; }
      endpoint = '/api/locations/province';
      payload = { province_name: locModal.name, region_id: locModal.parentId };
    } else if (locModal.type === 'city') {
      if (!locModal.parentId) { alert("Please select a Province"); return; }
      endpoint = '/api/locations/city';
      payload = { city_name: locModal.name, province_id: locModal.parentId };
    }

    try {
      const res = await fetch(`http://localhost:8081${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        await fetchDictionaries();
        setLocModal({ type: null, parentId: 0, name: '' });
      } else {
        alert("Failed to save location.");
      }
    } catch (err) {
      alert("Error saving location.");
    }
  };

  // Helper function for sortable headers
  const SortHeader = ({ label, field }: { label: string, field: string }) => (
    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1 whitespace-nowrap">
        {label}
        {sortConfig.field === field && (sortConfig.order === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />)}
      </div>
    </th>
  );

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  const formatDate = (val: string) => val && val !== '0000-00-00 00:00:00' ? new Date(val).toLocaleString() : 'N/A';

  const statusOptions = ["New", "Prospecting", "Today", "Declined", "Under Evaluation", "Lost", "Awarded"];
  const categoryOptions = ["Furniture", "Blinds", "Medical Equipment", "Paper Supplies"];
  const tradeOptions = ["Implementing Rules and Regulations", "Foreign Donations"];
  const procurementOptions = ["Small Procurement", "Public Bidding", "Corporate Bidding"];
  const classificationOptions = ["Goods", "Services"];

  // Filter Options
  const companyOptions = companies.map(c => ({ value: c.company_id, label: c.company_name }));
  const islandOptions = locations.islands?.map((i: any) => ({ value: i.id, label: i.name })) || [];
  const filterRegionOptions = locations.regions?.filter((r: any) => filters.island ? r.island_group_id === filters.island : true).map((r: any) => ({ value: r.id, label: r.name })) || [];
  const filterProvinceOptions = locations.provinces?.filter((p: any) => filters.region ? p.region_id === filters.region : true).map((p: any) => ({ value: p.id, label: p.name })) || [];
  const filterCityOptions = locations.cities?.filter((c: any) => filters.province ? c.province_id === filters.province : true).map((c: any) => ({ value: c.id, label: c.name })) || [];

  // Modal Form Filter Options
  const formRegionOptions = locations.regions?.filter((r: any) => form.island_group_id ? r.island_group_id === form.island_group_id : true).map((r: any) => ({ value: r.id, label: r.name })) || [];
  const formProvinceOptions = locations.provinces?.filter((p: any) => form.region_id ? p.region_id === form.region_id : true).map((p: any) => ({ value: p.id, label: p.name })) || [];
  const formCityOptions = locations.cities?.filter((c: any) => form.province_id ? c.province_id === form.province_id : true).map((c: any) => ({ value: c.id, label: c.name })) || [];

  return (
    <div className="bg-slate-50 min-h-screen p-8">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FileSignature className="text-blue-600" /> Bidding Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage Invitations to Bid and Requests for Quotation</p>
        </div>
        <button onClick={() => { setForm(defaultForm); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm">
          <Plus className="h-4 w-4" /> Add Bidding
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text" placeholder="Global search Ref No, Solicitation, Entity, Title..." 
                value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} 
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" 
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
              <Filter className="h-4 w-4" /> Filters
            </button>
          </div>

          {/* ADVANCED FILTERS DRAWER */}
          {showFilters && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Company</label><SearchableSelect options={companyOptions} value={filters.company} onChange={(v: string) => handleFilterChange('company', parseInt(v) || 0)} placeholder="All Companies" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Island Group</label><SearchableSelect options={islandOptions} value={filters.island} onChange={(v: string) => handleFilterChange('island', parseInt(v) || 0)} placeholder="All Islands" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Region</label><SearchableSelect options={filterRegionOptions} value={filters.region} onChange={(v: string) => handleFilterChange('region', parseInt(v) || 0)} placeholder="All Regions" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Province</label><SearchableSelect options={filterProvinceOptions} value={filters.province} onChange={(v: string) => handleFilterChange('province', parseInt(v) || 0)} placeholder="All Provinces" /></div>
              
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Pre-Bid Start</label><input type="date" value={filters.preBidStart} onChange={e => handleFilterChange('preBidStart', e.target.value)} className="w-full p-2 border border-slate-300 rounded outline-none text-sm" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Pre-Bid End</label><input type="date" value={filters.preBidEnd} onChange={e => handleFilterChange('preBidEnd', e.target.value)} className="w-full p-2 border border-slate-300 rounded outline-none text-sm" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Bidding Date Start</label><input type="date" value={filters.bidStart} onChange={e => handleFilterChange('bidStart', e.target.value)} className="w-full p-2 border border-slate-300 rounded outline-none text-sm" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Bidding Date End</label><input type="date" value={filters.bidEnd} onChange={e => handleFilterChange('bidEnd', e.target.value)} className="w-full p-2 border border-slate-300 rounded outline-none text-sm" /></div>

              <div className="md:col-span-4 flex justify-end"><button onClick={clearFilters} className="text-sm font-medium text-slate-500 hover:text-slate-800">Clear All Filters</button></div>
            </div>
          )}
        </div>

        <div className="px-4 pb-4 flex gap-3">
          <button 
            onClick={() => apply7DayFilter('bidding')} 
            className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-orange-100 transition-colors shadow-sm"
          >
            <CalendarClock className="h-4 w-4" />
            Bidding within 7 days: <span className="bg-orange-600 text-white px-2 py-0.5 rounded-full text-xs shadow-inner">{upcomingBids}</span>
          </button>

          <button 
            onClick={() => apply7DayFilter('pre_bidding')} 
            className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors shadow-sm"
          >
            <Calendar className="h-4 w-4" />
            Pre-bidding within 7 days: <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs shadow-inner">{upcomingPreBids}</span>
          </button>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <SortHeader label="Category" field="category" />
                <SortHeader label="Reference No." field="reference_no" />
                <SortHeader label="ABC" field="approved_budget" />
                <SortHeader label="Solicitation No." field="solicitation_no" />
                <SortHeader label="Procuring Entity" field="procuring_entity" />
                <SortHeader label="Island Group" field="island_group" />
                <SortHeader label="Region" field="region" />
                <SortHeader label="Pre-bid Date" field="pre_bid_date" />
                <SortHeader label="Bidding Date" field="bidding_date" />
                <SortHeader label="Status" field="status" />
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {biddings.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-slate-400">No records found. Try clearing your filters.</td></tr>
              ) : biddings.map(b => (
                <tr key={b.bidding_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.is_rfq === 1 ? 'RFQ' : 'ITB'}</td>
                  <td className="px-4 py-3">{b.category}</td>
                  <td className="px-4 py-3">{b.reference_no}</td>
                  <td className="px-4 py-3 font-medium text-emerald-600">{formatCurrency(b.approved_budget)}</td>
                  <td className="px-4 py-3">{b.solicitation_no}</td>
                  <td className="px-4 py-3">{b.procuring_entity}</td>
                  <td className="px-4 py-3">{b.island_group_name}</td>
                  <td className="px-4 py-3">{b.region_name}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(b.pre_bid_datetime)}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(b.closing_date_time)}</td>
                  <td className="px-4 py-3">{b.itb_status}</td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    {/* New Edit Link instead of inline editing! */}
                    <Link href={`/admin/bidding/${b.bidding_id}`} className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded hover:bg-blue-100"><Edit2 className="h-4 w-4" /></Link>
                    <button onClick={() => handleDelete(b.bidding_id)} className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded hover:bg-red-100"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 rounded-b-xl">
          <span className="text-sm text-slate-500">Showing {biddings.length} of {totalRecords} records</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-slate-300 text-sm font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50">Previous</button>
            <span className="text-sm font-medium text-slate-600 px-2">Page {page} of {Math.max(1, Math.ceil(totalRecords / limit))}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalRecords / limit)} className="px-3 py-1.5 border border-slate-300 text-sm font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* ADD MODAL - Fixed scrolling & Cascading Filters */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen p-4 pt-10 pb-20">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full">
              <div className="flex justify-between items-center bg-blue-600 text-white px-6 py-4 rounded-t-lg sticky top-0 z-10">
                <h3 className="font-bold text-lg">Bidding Details</h3>
                <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-200"><X className="h-5 w-5" /></button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-4 text-sm bg-slate-50">
                {/* Row 1 */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Type</label>
                    <select value={form.is_rfq} onChange={(e) => setForm({...form, is_rfq: parseInt(e.target.value)})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white">
                      <option value={0}>Invitation To Bid</option><option value={1}>Request For Quotation</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Must Join</label>
                    <select value={form.must_join} onChange={(e) => setForm({...form, must_join: parseInt(e.target.value)})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white">
                      <option value={0}>No</option><option value={1}>Yes</option>
                    </select>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Reference No.</label><input type="text" value={form.reference_no} onChange={e => setForm({...form, reference_no: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Solicitation No.</label><input type="text" value={form.solicitation_no} onChange={e => setForm({...form, solicitation_no: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>

                {/* Row 3 - Procuring Entity Custom Select */}
                <div className="flex items-center gap-4">
                  <label className="w-[16%] text-slate-600">Procuring Entity</label>
                  <div className="w-[84%]">
                    <SearchableSelect 
                      options={companyOptions} value={form.client_id} placeholder="Search and select company..."
                      onChange={(val: string) => {
                        const comp = companies.find(c => String(c.company_id) === String(val));
                        if (comp) setForm({...form, client_id: comp.company_id, procuring_entity: comp.company_name});
                        else setForm({...form, client_id: 0, procuring_entity: ""});
                      }} 
                      onAddNew={() => window.open('/admin/directory', '_blank')}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Title</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none" /></div>
                <div className="flex items-start gap-4"><label className="w-[16%] text-slate-600 pt-2">Full Address</label><textarea rows={3} value={form.full_address} onChange={e => setForm({...form, full_address: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none resize-none" /></div>

                {/* Location Rows with Cascading Logic */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Island Group</label>
                    <div className="w-2/3">
                      <SearchableSelect 
                        options={islandOptions} value={form.island_group_id} placeholder="Select Island Group..."
                        onChange={(val: string) => setForm({...form, island_group_id: parseInt(val) || 0, region_id: 0, province_id: 0, city_id: 0})} 
                        onAddNew={() => setLocModal({ type: 'island', parentId: 0, name: '' })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Region</label>
                    <div className="w-2/3">
                      <SearchableSelect 
                        options={formRegionOptions} value={form.region_id} placeholder="Select Region..."
                        onChange={(val: string) => setForm({...form, region_id: parseInt(val) || 0, province_id: 0, city_id: 0})} 
                        onAddNew={() => setLocModal({ type: 'region', parentId: form.island_group_id, name: '' })}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Province</label>
                    <div className="w-2/3">
                      <SearchableSelect 
                        options={formProvinceOptions} value={form.province_id} placeholder="Select Province..."
                        onChange={(val: string) => setForm({...form, province_id: parseInt(val) || 0, city_id: 0})} 
                        onAddNew={() => setLocModal({ type: 'province', parentId: form.region_id, name: '' })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">City</label>
                    <div className="w-2/3">
                      <SearchableSelect 
                        options={formCityOptions} value={form.city_id} placeholder="Select City..."
                        onChange={(val: string) => setForm({...form, city_id: parseInt(val) || 0})} 
                        onAddNew={() => setLocModal({ type: 'city', parentId: form.province_id, name: '' })}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Trade Agreement</label>
                  <select value={form.trade_agreement} onChange={e => setForm({...form, trade_agreement: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none bg-white">
                    <option value="">Select...</option>{tradeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Procurement Mode</label>
                    <select value={form.procurement_mode} onChange={e => setForm({...form, procurement_mode: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white">
                      <option value="">Select...</option>{procurementOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Classification</label>
                    <select value={form.classification} onChange={e => setForm({...form, classification: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white">
                      <option value="">Select...</option>{classificationOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Category</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white">
                      <option value="">Select...</option>{categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Contact Numbers</label><input type="text" value={form.contact_numbers} onChange={e => setForm({...form, contact_numbers: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Approved Budget</label><input type="number" step="0.01" value={form.approved_budget} onChange={e => setForm({...form, approved_budget: parseFloat(e.target.value)})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Delivery Period</label><input type="text" value={form.delivery_period} onChange={e => setForm({...form, delivery_period: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>

                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Date Published</label><input type="date" value={form.date_published} onChange={e => setForm({...form, date_published: e.target.value})} className="w-[31.5%] p-2 border border-slate-300 rounded outline-none" /></div>
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Last Update Date/Time</label><input type="datetime-local" value={form.last_update_time} onChange={e => setForm({...form, last_update_time: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none" /></div>
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Closing Date/Time</label><input type="datetime-local" value={form.closing_date_time} onChange={e => setForm({...form, closing_date_time: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none" /></div>

                {/* Primary Contact */}
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Contact Person</label><input type="text" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none" /></div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Contact Person Dept.</label><input type="text" value={form.contact_person_dept} onChange={e => setForm({...form, contact_person_dept: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Contact Number</label><input type="text" value={form.contact_number} onChange={e => setForm({...form, contact_number: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-[31.5%] p-2 border border-slate-300 rounded outline-none" /></div>

                {/* Alternate Contact */}
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Contact Person (Alt)</label><input type="text" value={form.alternate_cont_person} onChange={e => setForm({...form, alternate_cont_person: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none" /></div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Contact Person Dept.</label><input type="text" value={form.alternate_cont_dept} onChange={e => setForm({...form, alternate_cont_dept: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Contact Number</label><input type="text" value={form.alt_cont_contacts} onChange={e => setForm({...form, alt_cont_contacts: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Email</label><input type="email" value={form.alt_cont_email} onChange={e => setForm({...form, alt_cont_email: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Prebid Date/Time</label><input type="datetime-local" value={form.pre_bid_datetime} onChange={e => setForm({...form, pre_bid_datetime: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>

                <div className="flex items-start gap-4"><label className="w-[16%] text-slate-600 pt-2">Venue</label><textarea rows={2} value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none resize-none" /></div>
                <div className="flex items-start gap-4"><label className="w-[16%] text-slate-600 pt-2">Notes / Description</label><textarea rows={3} value={form.note_desc} onChange={e => setForm({...form, note_desc: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none resize-none" /></div>

                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Status</label>
                  <select value={form.itb_status} onChange={e => setForm({...form, itb_status: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none bg-white">
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6 bg-white -mx-6 -mb-6 p-4 rounded-b-lg">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-50">Close</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* DYNAMIC LOCATION ADD MODAL */}
      {locModal.type && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-lg">
              <h3 className="font-bold text-slate-800">
                Add New {locModal.type === 'island' ? 'Island Group' : locModal.type.charAt(0).toUpperCase() + locModal.type.slice(1)}
              </h3>
              <button onClick={() => setLocModal({...locModal, type: null})} className="text-slate-500 hover:text-slate-800"><X className="h-4 w-4"/></button>
            </div>
            
            <form onSubmit={handleSaveLocation} className="p-4 space-y-4">
              {locModal.type === 'region' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Island Group</label>
                  <select required value={locModal.parentId} onChange={e => setLocModal({...locModal, parentId: parseInt(e.target.value)})} className="w-full p-2 border border-slate-300 rounded outline-none bg-white text-sm">
                    <option value={0}>Select Island Group...</option>
                    {locations.islands?.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
              )}
              {locModal.type === 'province' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
                  <select required value={locModal.parentId} onChange={e => setLocModal({...locModal, parentId: parseInt(e.target.value)})} className="w-full p-2 border border-slate-300 rounded outline-none bg-white text-sm">
                    <option value={0}>Select Region...</option>
                    {locations.regions?.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              )}
              {locModal.type === 'city' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Province</label>
                  <select required value={locModal.parentId} onChange={e => setLocModal({...locModal, parentId: parseInt(e.target.value)})} className="w-full p-2 border border-slate-300 rounded outline-none bg-white text-sm">
                    <option value={0}>Select Province...</option>
                    {locations.provinces?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input required autoFocus type="text" value={locModal.name} onChange={e => setLocModal({...locModal, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none text-sm" placeholder="Enter name..." />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setLocModal({...locModal, type: null})} className="px-4 py-2 border border-slate-300 rounded text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save Location</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}