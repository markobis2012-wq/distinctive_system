'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Trash2, Edit2, Check, X, FolderKanban, Filter, ArrowUp, ArrowDown } from 'lucide-react';
import Link from 'next/link';

const SearchableSelect = ({ options, value, onChange, placeholder = "Select...", onAddNew }: any) => {
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
          <div className="p-2 border-b border-slate-200 bg-slate-50"><input autoFocus type="text" className="w-full p-1.5 border border-slate-300 rounded outline-none text-xs focus:ring-1 focus:ring-blue-500" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="overflow-y-auto flex-1">
            <div className="p-2 hover:bg-red-50 cursor-pointer text-slate-400 italic text-xs border-b border-slate-100" onClick={() => { onChange(""); setIsOpen(false); setSearchTerm(""); }}>Clear Selection</div>
            {filteredOptions.length > 0 ? filteredOptions.map((o: any) => (
              <div key={o.value} className="p-2 hover:bg-blue-50 cursor-pointer text-slate-700 truncate text-xs" onClick={() => { onChange(o.value); setIsOpen(false); setSearchTerm(""); }}>{o.label}</div>
            )) : <div className="p-3 text-slate-500 text-xs text-center italic">No results found</div>}
          </div>
          {onAddNew && (
            <div className="p-2 border-t border-blue-200 bg-blue-50 hover:bg-blue-100 cursor-pointer text-blue-700 text-sm font-bold flex items-center justify-center gap-1 transition-colors" onClick={(e) => { e.stopPropagation(); setIsOpen(false); onAddNew(); }}><Plus className="h-4 w-4" /> Add new</div>
          )}
        </div>
      )}
    </div>
  );
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [biddings, setBiddings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 20;

  const [sortConfig, setSortConfig] = useState({ field: 'project_number', order: 'desc' });
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ client_id: 0, department_id: 0, status: '', category: '' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const defaultForm = { dbos_department_id: 0, projects_category: '', project_date_start_date: '', project_date_end_date: '', contract_amount: 0, project_name: '', bidding_id: 0, client_id: 0, project_status: 'Today' };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    const fetchDictionaries = async () => {
      try {
        const [compRes, bidRes, deptRes, catRes] = await Promise.all([
          fetch('http://localhost:8081/api/companies'),
          fetch('http://localhost:8081/api/biddings?limit=1000'), // Get all biddings for the dropdown
          fetch('http://localhost:8081/api/departments'),
          fetch('http://localhost:8081/api/project-categories')
        ]);
        if (compRes.ok) setCompanies(await compRes.json());
        if (bidRes.ok) setBiddings((await bidRes.json()).data);
        if (deptRes.ok) setDepartments(await deptRes.json());
        if (catRes.ok) setCategories(await catRes.json());
      } catch (err) {}
    };
    fetchDictionaries();
  }, []);

  const fetchProjects = async () => {
    try {
      const query = new URLSearchParams({
        page: String(page), limit: String(limit), search: searchQuery, sortField: sortConfig.field, sortOrder: sortConfig.order,
        client_id: String(filters.client_id), department_id: String(filters.department_id), status: filters.status, category: filters.category
      });
      const res = await fetch(`http://localhost:8081/api/projects?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setProjects(json.data);
        setTotalRecords(json.total);
      }
    } catch (err) {}
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchProjects(), 300);
    return () => clearTimeout(timer);
  }, [page, searchQuery, sortConfig, filters]);

  const openModal = (p: any = null) => {
    if (p) {
      setEditingId(p.projects_id);
      setForm({
        dbos_department_id: p.dbos_department_id, projects_category: p.projects_category,
        project_date_start_date: p.project_date_start_date, project_date_end_date: p.project_date_end_date,
        contract_amount: p.contract_amount, project_name: p.project_name, bidding_id: p.bidding_id,
        client_id: p.client_id, project_status: p.project_status
      });
    } else {
      setEditingId(null);
      setForm(defaultForm);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingId ? `http://localhost:8081/api/projects/${editingId}` : 'http://localhost:8081/api/projects';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (res.ok) { setIsModalOpen(false); fetchProjects(); }
    } catch (err) { alert("Error saving."); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this project?")) return;
    try {
      const res = await fetch(`http://localhost:8081/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) fetchProjects();
    } catch (err) {}
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  const SortHeader = ({ label, field }: { label: string, field: string }) => (
    <th className="px-4 py-3 font-medium cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => { setSortConfig(prev => ({ field, order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc' })); setPage(1); }}>
      <div className="flex items-center gap-1 whitespace-nowrap">{label} {sortConfig.field === field && (sortConfig.order === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-600" /> : <ArrowDown className="h-3 w-3 text-blue-600" />)}</div>
    </th>
  );

  const statusOptions = ["Today", "Under Evaluation", "Awarded", "Failed",  "On-going", "Completed"];
  const companyOptions = companies.map(c => ({ value: c.company_id, label: c.company_name }));
  const biddingOptions = biddings.map(b => ({ value: b.bidding_id, label: `${b.reference_no} - ${b.title || 'No Title'}` }));
  const departmentOptions = departments.map(d => ({ value: d.department_id, label: d.department }));
  const categoryOptions = categories.map(c => ({ value: c.category, label: c.category })); // Saving category string, not ID

  return (
    <div className="bg-slate-50 min-h-screen p-8">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><FolderKanban className="text-blue-600" /> Project Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track internal projects, timelines, and contract amounts</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm"><Plus className="h-4 w-4" /> Add Project</button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search by Project No, Name, or Client..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}><Filter className="h-4 w-4" /> Filters</button>
          </div>

          {showFilters && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Client</label><SearchableSelect options={companyOptions} value={filters.client_id} onChange={(v: string) => { setFilters({...filters, client_id: parseInt(v) || 0}); setPage(1); }} placeholder="All Clients" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Department</label><SearchableSelect options={departmentOptions} value={filters.department_id} onChange={(v: string) => { setFilters({...filters, department_id: parseInt(v) || 0}); setPage(1); }} placeholder="All Departments" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Category</label><SearchableSelect options={categoryOptions} value={filters.category} onChange={(v: string) => { setFilters({...filters, category: v}); setPage(1); }} placeholder="All Categories" /></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Status</label><SearchableSelect options={statusOptions.map(s=>({value:s, label:s}))} value={filters.status} onChange={(v: string) => { setFilters({...filters, status: v}); setPage(1); }} placeholder="All Statuses" /></div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                <SortHeader label="Project No." field="project_number" />
                <SortHeader label="Project Name" field="project_name" />
                <SortHeader label="Client" field="client_name" />
                <th className="px-4 py-3 font-medium">Department</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <SortHeader label="Contract Amount" field="contract_amount" />
                <SortHeader label="Start Date" field="start_date" />
                <SortHeader label="Status" field="status" />
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">No records found.</td></tr> : projects.map(p => (
                <tr key={p.projects_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-900">{p.project_number}</td>
                  <td className="px-4 py-3">{p.project_name}</td>
                  <td className="px-4 py-3">{p.client_name}</td>
                  <td className="px-4 py-3">{p.department_name}</td>
                  <td className="px-4 py-3">{p.projects_category}</td>
                  <td className="px-4 py-3 font-medium text-emerald-600">{formatCurrency(p.contract_amount)}</td>
                  <td className="px-4 py-3">{p.project_date_start_date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${p.project_status === 'Finished' ? 'bg-emerald-100 text-emerald-700' : p.project_status === 'On-going' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {p.project_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
                    <Link
                        href={`/admin/projects/${p.projects_id}`}
                        className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                        <Edit2 className="h-4 w-4" />
                    </Link>
                    <button
                        onClick={() => handleDelete(p.projects_id)}
                        className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded hover:bg-red-100 transition-colors"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-slate-50 rounded-b-xl">
          <span className="text-sm text-slate-500">Showing {projects.length} of {totalRecords} records</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 border border-slate-300 text-sm font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50">Previous</button>
            <span className="text-sm font-medium text-slate-600 px-2">Page {page} of {Math.max(1, Math.ceil(totalRecords / limit))}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(totalRecords / limit)} className="px-3 py-1.5 border border-slate-300 text-sm font-medium rounded-lg text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {/* PROJECT ADD/EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-screen p-4 pt-10 pb-20">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
              <div className="flex justify-between items-center bg-blue-600 text-white px-6 py-4 rounded-t-lg sticky top-0 z-10">
                <h3 className="font-bold text-lg">{editingId ? 'Edit Project' : 'Add New Project'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="hover:text-blue-200"><X className="h-5 w-5" /></button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-4 text-sm bg-slate-50">
                {!editingId && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 p-3 rounded flex gap-2 items-center mb-4">
                    <FolderKanban className="h-5 w-5" /> 
                    <p>The <strong>Project Number</strong> (e.g., 2026-001) will be generated automatically when you click Save.</p>
                  </div>
                )}
                
                <div><label className="block text-slate-600 mb-1">Project Name *</label><input required type="text" value={form.project_name} onChange={e => setForm({...form, project_name: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-slate-600 mb-1">Client Company</label><SearchableSelect options={companyOptions} value={form.client_id} onChange={(v: string) => setForm({...form, client_id: parseInt(v) || 0})} placeholder="Select Client..." onAddNew={() => window.open('/admin/directory', '_blank')} /></div>
                  <div><label className="block text-slate-600 mb-1">Linked Bidding Record</label><SearchableSelect options={biddingOptions} value={form.bidding_id} onChange={(v: string) => setForm({...form, bidding_id: parseInt(v) || 0})} placeholder="Optional: Link to Bidding..." /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-slate-600 mb-1">Department *</label><SearchableSelect options={departmentOptions} value={form.dbos_department_id} onChange={(v: string) => setForm({...form, dbos_department_id: parseInt(v) || 0})} placeholder="Select Dept..." /></div>
                  <div><label className="block text-slate-600 mb-1">Category *</label><SearchableSelect options={categoryOptions} value={form.projects_category} onChange={(v: string) => setForm({...form, projects_category: v})} placeholder="Select Category..." /></div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-slate-600 mb-1">Contract Amount *</label><input required type="number" step="0.01" value={form.contract_amount} onChange={e => setForm({...form, contract_amount: parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 rounded outline-none" /></div>
                  <div><label className="block text-slate-600 mb-1">Start Date</label><input type="date" value={form.project_date_start_date} onChange={e => setForm({...form, project_date_start_date: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none" /></div>
                  <div><label className="block text-slate-600 mb-1">End Date</label><input type="date" value={form.project_date_end_date} onChange={e => setForm({...form, project_date_end_date: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none" /></div>
                </div>

                <div><label className="block text-slate-600 mb-1">Status</label><select value={form.project_status} onChange={e => setForm({...form, project_status: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none bg-white">{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 mt-6 bg-white -mx-6 -mb-6 p-4 rounded-b-lg">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-slate-300 text-slate-700 rounded font-medium hover:bg-slate-50">Cancel</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Save Project</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}