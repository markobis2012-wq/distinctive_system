'use client';

import { useState, useEffect, useRef, use } from 'react';
import { 
  FolderKanban, ArrowLeft, Save, Package, Paperclip, 
  Plus, Trash2, Edit2, Check, X, Image as ImageIcon, Download, Layers
} from 'lucide-react';
import Link from 'next/link';

// Searchable Select Component
const SearchableSelect = ({ options, value, onChange, placeholder = "Select..." }: any) => {
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
  const filteredOptions = options.filter((o: any) =>
    o.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full text-sm">
      <div
        className="w-full p-2 border border-slate-300 rounded-lg bg-white cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-slate-900 truncate pr-2" : "text-slate-400 truncate"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="text-slate-400 text-[10px] shrink-0 ml-2">▼</span>
      </div>
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-xl max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <input
              autoFocus
              type="text"
              className="w-full p-1.5 border border-slate-300 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            <div
              className="p-2 hover:bg-red-50 cursor-pointer text-slate-400 italic text-xs border-b border-slate-100"
              onClick={() => { onChange(""); setIsOpen(false); setSearchTerm(""); }}
            >
              Clear Selection
            </div>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((o: any) => (
                <div
                  key={o.value}
                  className="p-2 hover:bg-blue-50 cursor-pointer text-slate-700 text-xs truncate"
                  onClick={() => { onChange(o.value); setIsOpen(false); setSearchTerm(""); }}
                >
                  {o.label}
                </div>
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

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState<'items' | 'attachments'>('items');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dropdown Dictionaries
  const [companies, setCompanies] = useState<any[]>([]);
  const [biddings, setBiddings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Project Form State
  const [form, setForm] = useState({
    project_number: '',
    project_name: '',
    client_id: 0,
    bidding_id: 0,
    dbos_department_id: 0,
    projects_category: '',
    contract_amount: 0,
    project_date_start_date: '',
    project_date_end_date: '',
    project_status: 'Today'
  });

  // --- Project Items State ---
  const [projectItems, setProjectItems] = useState<any[]>([]);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemForm, setItemForm] = useState({ 
    product_name: '', product_description: '', suppliers_description: '', 
    qty: 0, unit_price: 0
  });
  const [itemImage, setItemImage] = useState<File | null>(null);
  const [dbosImage, setDbosImage] = useState<File | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  const [activeItemForComponents, setActiveItemForComponents] = useState<any>(null);
  const [components, setComponents] = useState<any[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
  
  const [compForm, setCompForm] = useState({
    supplier_id: 0, supplier_product_id: 0, qty_per_item: 1, prod_qty: 1,
    unit_price: '0', landed_price: '0', total_price: '0', selling_price: 0, total_selling_price: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [compRes, bidRes, deptRes, catRes, projRes, itemsRes] = await Promise.all([
          fetch('http://localhost:8081/api/companies'),
          fetch('http://localhost:8081/api/biddings?limit=1000'),
          fetch('http://localhost:8081/api/departments'),
          fetch('http://localhost:8081/api/project-categories'),
          fetch(`http://localhost:8081/api/projects/${projectId}`),
          fetch(`http://localhost:8081/api/projects/${projectId}/items`) // Fetch Items
        ]);

        if (compRes.ok) setCompanies(await compRes.json());
        if (bidRes.ok) setBiddings((await bidRes.json()).data || []);
        if (deptRes.ok) setDepartments(await deptRes.json());
        if (catRes.ok) setCategories(await catRes.json());

        if (projRes.ok) {
          const data = await projRes.json();
          setForm({
            project_number: data.project_number || '',
            project_name: data.project_name || '',
            client_id: data.client_id || 0,
            bidding_id: data.bidding_id || 0,
            dbos_department_id: data.dbos_department_id || 0,
            projects_category: data.projects_category || '',
            contract_amount: data.contract_amount || 0,
            project_date_start_date: data.project_date_start_date || '',
            project_date_end_date: data.project_date_end_date || '',
            project_status: data.project_status || 'Today'
          });
        }

        if (itemsRes.ok) setProjectItems(await itemsRes.json());

      } catch (err) {
        console.error("Failed to load project details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:8081/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        alert("Project details updated successfully!");
      } else {
        alert("Failed to update project.");
      }
    } catch (err) {
      alert("Error saving project.");
    } finally {
      setSaving(false);
    }
  };

  // --- Project Item Handlers ---
  const fetchProjectItems = async () => {
    try {
      const res = await fetch(`http://localhost:8081/api/projects/${projectId}/items`);
      if (res.ok) setProjectItems(await res.json());
    } catch (err) {}
  };

  const openItemModal = (item: any = null) => {
    if (item) {
      setEditingItemId(item.project_items_id);
      setItemForm({ 
        product_name: item.product_name, 
        product_description: item.product_description, 
        suppliers_description: item.suppliers_description, 
        qty: item.qty, 
        unit_price: item.unit_price
      });
    } else {
      setEditingItemId(null);
      setItemForm({ product_name: '', product_description: '', suppliers_description: '', qty: 0, unit_price: 0 });
    }
    setItemImage(null);
    setDbosImage(null);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(itemForm).forEach(([key, value]) => formData.append(key, String(value)));
    formData.append('total_price', String(itemForm.qty * itemForm.unit_price)); // Auto-calculate total price
    if (itemImage) formData.append('image_path', itemImage);
    if (dbosImage) formData.append('dbos_image_path', dbosImage);

    const url = editingItemId ? `http://localhost:8081/api/projects/${projectId}/items/${editingItemId}` : `http://localhost:8081/api/projects/${projectId}/items`;
    try {
      const res = await fetch(url, { method: editingItemId ? 'PUT' : 'POST', body: formData });
      if (res.ok) { 
        setIsItemModalOpen(false); 
        fetchProjectItems(); 
      }
    } catch (err) { alert("Failed to save item."); }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm("Are you sure you want to delete this project item?")) return;
    try {
      const res = await fetch(`http://localhost:8081/api/projects/items/${id}`, { method: 'DELETE' });
      if (res.ok) fetchProjectItems();
    } catch (err) {}
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

  const statusOptions = ["Today", "On-going", "Finished"];
  const companyOptions = companies.map(c => ({ value: c.company_id, label: c.company_name }));
  const biddingOptions = biddings.map(b => ({ value: b.bidding_id, label: `${b.reference_no} - ${b.title || 'No Title'}` }));
  const departmentOptions = departments.map(d => ({ value: d.department_id, label: d.department }));
  const categoryOptions = categories.map(c => ({ value: c.category, label: c.category }));

  // --- Component Handlers ---
  const openComponentManager = async (item: any) => {
    setActiveItemForComponents(item);
    try {
      const res = await fetch(`http://localhost:8081/api/project-items/${item.project_items_id}/components`);
      if (res.ok) setComponents(await res.json());
    } catch (err) {}
  };

  // Fetch supplier products when supplier changes
  useEffect(() => {
    if (compForm.supplier_id > 0) {
      fetch(`http://localhost:8081/api/suppliers/${compForm.supplier_id}/products`)
        .then(res => res.json())
        .then(data => {
          // Safety check! If the backend sends an error object, fallback to an empty array
          if (Array.isArray(data)) {
            setSupplierProducts(data);
          } else {
            console.error("Backend returned an error instead of an array:", data);
            setSupplierProducts([]);
          }
        })
        .catch(err => {
          console.error(err);
          setSupplierProducts([]);
        });
    } else {
      setSupplierProducts([]);
    }
  }, [compForm.supplier_id]);

  // Auto-compute logic
  useEffect(() => {
    const qty = compForm.prod_qty || 1;
    
    // Parse landed price (fallback to unit price if landed is 0)
    const unitPrice = parseFloat(compForm.unit_price) || 0;
    const landedPrice = parseFloat(compForm.landed_price) || unitPrice;
    const sellingPrice = compForm.selling_price || 0;

    setCompForm(prev => ({
      ...prev,
      total_price: (qty * landedPrice).toFixed(2),
      total_selling_price: parseFloat((qty * sellingPrice).toFixed(2))
    }));
  }, [compForm.prod_qty, compForm.unit_price, compForm.landed_price, compForm.selling_price]);

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForComponents) return;

    const payload = { ...compForm, project_items_id: activeItemForComponents.project_items_id };
    try {
      const res = await fetch(`http://localhost:8081/api/project-items/components`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        // Refresh component list
        const refreshRes = await fetch(`http://localhost:8081/api/project-items/${activeItemForComponents.project_items_id}/components`);
        if (refreshRes.ok) setComponents(await refreshRes.json());
        
        // Reset form
        setCompForm({ supplier_id: 0, supplier_product_id: 0, qty_per_item: 1, prod_qty: 1, unit_price: '0', landed_price: '0', total_price: '0', selling_price: 0, total_selling_price: 0 });
      }
    } catch (err) { alert("Error saving component"); }
  };

  const handleDeleteComponent = async (id: number) => {
    if (!confirm("Delete this component?")) return;
    try {
      const res = await fetch(`http://localhost:8081/api/project-items/components/${id}`, { method: 'DELETE' });
      if (res.ok) setComponents(components.filter(c => c.project_item_component_id !== id));
    } catch (err) {}
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px] text-slate-500">
        Loading project details...
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-12 w-full">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-8 rounded-b-3xl shadow-md mb-8">
        <Link 
          href="/projects" 
          className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
        </Link>
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-sm font-semibold tracking-wide">
                {form.project_number}
              </span>
              <h1 className="text-2xl font-bold">{form.project_name || 'Project Details'}</h1>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Status: <span className="text-slate-200 font-medium">{form.project_status}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: 30% Left (Details Form) / 70% Right (Tabs) */}
      <div className="w-full px-8">
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          
          {/* LEFT CARD (30% -> col-span-3) */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-md font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-blue-600" /> Project Details
            </h2>

            <form onSubmit={handleSaveDetails} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={form.project_name}
                  onChange={(e) => setForm({ ...form, project_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Client Company</label>
                <SearchableSelect
                  options={companyOptions}
                  value={form.client_id}
                  onChange={(val: string) => setForm({ ...form, client_id: parseInt(val) || 0 })}
                  placeholder="Select Client..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Linked Bidding</label>
                <SearchableSelect
                  options={biddingOptions}
                  value={form.bidding_id}
                  onChange={(val: string) => setForm({ ...form, bidding_id: parseInt(val) || 0 })}
                  placeholder="Optional: Link Bidding..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Department *</label>
                <SearchableSelect
                  options={departmentOptions}
                  value={form.dbos_department_id}
                  onChange={(val: string) => setForm({ ...form, dbos_department_id: parseInt(val) || 0 })}
                  placeholder="Select Department..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category *</label>
                <SearchableSelect
                  options={categoryOptions}
                  value={form.projects_category}
                  onChange={(val: string) => setForm({ ...form, projects_category: val })}
                  placeholder="Select Category..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contract Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.contract_amount}
                  onChange={(e) => setForm({ ...form, contract_amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.project_date_start_date}
                    onChange={(e) => setForm({ ...form, project_date_start_date: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={form.project_date_end_date}
                    onChange={(e) => setForm({ ...form, project_date_end_date: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded-lg outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Status</label>
                <select
                  value={form.project_status}
                  onChange={(e) => setForm({ ...form, project_status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none bg-white"
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Project"}
              </button>
            </form>
          </div>

          {/* RIGHT CARD (70% -> col-span-7) */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200 min-h-[640px] flex flex-col overflow-hidden">
            {/* Tabs Header */}
            <div className="border-b border-slate-200 px-4 pt-2 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                <button
                  type="button"
                  onClick={() => setActiveTab('items')}
                  className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    activeTab === 'items'
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Package className="h-4 w-4" /> Project Items
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('attachments')}
                  className={`inline-flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                    activeTab === 'attachments'
                      ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Paperclip className="h-4 w-4" /> Attachments
                </button>
              </div>
            </div>

            {/* Tabs Content */}
            <div className="flex-1 p-6">
              {/* TAB 1: Project Items */}
              {activeTab === 'items' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-slate-800">Project Items & Bill of Materials</h3>
                      <p className="text-xs text-slate-500">Products and deliverables scoped for this project</p>
                    </div>
                    <button onClick={() => openItemModal()} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm shrink-0">
                      <Plus className="h-4 w-4" /> Add Item
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 font-medium">Images (Prod / DBOS)</th>
                          <th className="px-4 py-3 font-medium">Product Name</th>
                          <th className="px-4 py-3 font-medium">Description</th>
                          <th className="px-4 py-3 font-medium text-center">Qty</th>
                          <th className="px-4 py-3 font-medium text-center">Delivered</th>
                          <th className="px-4 py-3 font-medium text-center">Pending</th>
                          <th className="px-4 py-3 font-medium">Unit Price</th>
                          <th className="px-4 py-3 font-medium">Total Price</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectItems.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="px-4 py-12 text-center text-slate-400 italic">
                              No project items added yet. Click &quot;Add Item&quot; to begin.
                            </td>
                          </tr>
                        ) : projectItems.map(item => (
                          <tr key={item.project_items_id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="px-4 py-2 flex gap-2">
                              {item.image_path ? (
                                <img src={`http://localhost:8081${item.image_path}`} onClick={() => setEnlargedImage(`http://localhost:8081${item.image_path}`)} alt="Product" className="h-10 w-10 object-cover rounded border border-slate-200 cursor-zoom-in hover:opacity-80" />
                              ) : (
                                <div className="h-10 w-10 bg-slate-100 rounded border border-slate-200 flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-300" /></div>
                              )}
                              {item.dbos_image_path ? (
                                <img src={`http://localhost:8081${item.dbos_image_path}`} onClick={() => setEnlargedImage(`http://localhost:8081${item.dbos_image_path}`)} alt="DBOS" className="h-10 w-10 object-cover rounded border border-slate-200 cursor-zoom-in hover:opacity-80" />
                              ) : (
                                <div className="h-10 w-10 bg-slate-100 rounded border border-slate-200 flex items-center justify-center"><ImageIcon className="h-4 w-4 text-slate-300" /></div>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900 truncate max-w-[150px]">{item.product_name}</td>
                            <td className="px-4 py-3 truncate max-w-[150px]">{item.product_description}</td>
                            <td className="px-4 py-3 text-center font-bold">{item.qty}</td>
                            <td className="px-4 py-3 text-center text-emerald-600 font-bold">{item.item_delivered}</td>
                            <td className="px-4 py-3 text-center text-orange-600 font-bold">{item.item_pending}</td>
                            <td className="px-4 py-3 text-slate-500">{formatCurrency(item.unit_price)}</td>
                            <td className="px-4 py-3 font-bold text-emerald-700">{formatCurrency(item.total_price)}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${item.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : item.status === 'Partial' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button onClick={() => openComponentManager(item)} className="text-emerald-600 hover:text-emerald-800 p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors flex items-center gap-1 text-xs font-bold" title="Manage Components">
                                  <Layers className="h-4 w-4" /> Components
                                </button>

                                <button onClick={() => openItemModal(item)} className="text-blue-600 hover:text-blue-800 p-1.5 bg-blue-50 hover:bg-blue-100 rounded transition-colors"><Edit2 className="h-4 w-4" /></button>
                                <button onClick={() => handleDeleteItem(item.project_items_id)} className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: Attachments */}
              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-800">Project Attachments</h3>
                      <p className="text-xs text-slate-500">Contracts, purchase orders, drawings, and files</p>
                    </div>
                    <button className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm">
                      <Plus className="h-4 w-4" /> Upload File
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 font-medium">Filename</th>
                          <th className="px-4 py-3 font-medium">File Type</th>
                          <th className="px-4 py-3 font-medium">Date Uploaded</th>
                          <th className="px-4 py-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-slate-400 italic">
                            No project attachments uploaded yet.
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* PROJECT ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white rounded-t-xl sticky top-0">
              <h3 className="font-bold text-lg">{editingItemId ? 'Edit Project Item' : 'Add Project Item'}</h3>
              <button onClick={() => setIsItemModalOpen(false)} className="hover:text-blue-200 transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveItem} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label>
                  <input required type="text" value={itemForm.product_name} onChange={e => setItemForm({...itemForm, product_name: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 text-sm" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                  <input required type="number" min="1" value={itemForm.qty} onChange={e => setItemForm({...itemForm, qty: parseInt(e.target.value) || 0})} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price *</label>
                  <input required type="number" step="0.01" value={itemForm.unit_price} onChange={e => setItemForm({...itemForm, unit_price: parseFloat(e.target.value) || 0})} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 text-sm" />
                </div>
              </div>
              <div className="text-right text-sm text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 p-2 rounded">
                Total Price: {formatCurrency(itemForm.qty * itemForm.unit_price)}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Description</label>
                <textarea rows={2} value={itemForm.product_description} onChange={e => setItemForm({...itemForm, product_description: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 text-sm resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Suppliers Description</label>
                <textarea rows={2} value={itemForm.suppliers_description} onChange={e => setItemForm({...itemForm, suppliers_description: e.target.value})} className="w-full p-2 border border-slate-300 rounded outline-none focus:border-blue-500 text-sm resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Product Image</label>
                  <input type="file" accept="image/*" onChange={e => setItemImage(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border border-slate-300 rounded outline-none text-sm bg-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">DBOS Image</label>
                  <input type="file" accept="image/*" onChange={e => setDbosImage(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border border-slate-300 rounded outline-none text-sm bg-white" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enlarged Image Lightbox */}
      {enlargedImage && (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setEnlargedImage(null)}>
          <button onClick={() => setEnlargedImage(null)} className="absolute top-6 right-6 text-white/70 hover:text-white p-2 transition-colors"><X className="h-8 w-8" /></button>
          <img src={enlargedImage} alt="Enlarged" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* COMPONENTS MANAGER MODAL */}
      {activeItemForComponents && (
        <div className="fixed inset-0 bg-slate-900/60 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b flex justify-between items-center bg-emerald-600 text-white rounded-t-xl">
              <div>
                <h3 className="font-bold text-lg">Manage Components</h3>
                <p className="text-emerald-100 text-xs">Item: {activeItemForComponents.product_name}</p>
              </div>
              <button onClick={() => setActiveItemForComponents(null)} className="hover:text-emerald-200 transition-colors"><X className="h-6 w-6" /></button>
            </div>
            
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
              {/* Add Component Form */}
              <div className="w-full lg:w-1/3 bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto">
                <h4 className="font-bold text-slate-700 mb-4 border-b pb-2">Add New Component</h4>
                <form onSubmit={handleSaveComponent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier *</label>
                    <SearchableSelect 
                      options={companyOptions} 
                      value={compForm.supplier_id} 
                      onChange={(v: string) => setCompForm({...compForm, supplier_id: parseInt(v) || 0, supplier_product_id: 0, unit_price: '0'})} 
                      placeholder="Select Supplier..." 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Product *</label>
                    <SearchableSelect 
                      options={supplierProducts.map(p => ({value: p.supplier_product_id, label: p.product_name}))} 
                      value={compForm.supplier_product_id} 
                      onChange={(v: string) => {
                        const prod = supplierProducts.find(p => String(p.supplier_product_id) === String(v));
                        setCompForm({
                          ...compForm, 
                          supplier_product_id: parseInt(v) || 0, 
                          unit_price: prod ? String(prod.unit_price) : '0',
                          landed_price: prod ? String(prod.land_price) : '0' // <-- Add this line!
                        });
                      }} 
                      placeholder={compForm.supplier_id ? "Select Product..." : "Select Supplier first"} 
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Qty per Item</label>
                      <input required type="number" value={compForm.qty_per_item} onChange={e => setCompForm({...compForm, qty_per_item: parseInt(e.target.value)||0})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Prod Qty</label>
                      <input required type="number" value={compForm.prod_qty} onChange={e => setCompForm({...compForm, prod_qty: parseInt(e.target.value)||0})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-emerald-500" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Price</label>
                      <input disabled type="text" value={compForm.unit_price} className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-100 text-slate-500 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Landed Price</label>
                      <input type="text" value={compForm.landed_price} onChange={e => setCompForm({...compForm, landed_price: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Selling Price</label>
                      <input type="number" step="0.01" value={compForm.selling_price} onChange={e => setCompForm({...compForm, selling_price: parseFloat(e.target.value)||0})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none focus:border-emerald-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Total Selling</label>
                      <input disabled type="text" value={compForm.total_selling_price} className="w-full p-2 border border-slate-300 rounded text-sm bg-slate-100 text-slate-500 font-bold cursor-not-allowed" />
                    </div>
                  </div>

                  <div className="text-right text-sm font-bold text-emerald-700 bg-emerald-100 p-2 rounded border border-emerald-200">
                    Total Component Cost: {formatCurrency(parseFloat(compForm.total_price))}
                  </div>

                  <button type="submit" className="w-full py-2 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 transition-colors shadow-sm mt-4">
                    Add Component
                  </button>
                </form>
              </div>

              {/* Component Table List */}
              <div className="w-full lg:w-2/3 p-4 overflow-y-auto">
                <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 font-medium">Supplier / Product</th>
                      <th className="px-3 py-2 font-medium text-center">Qtys</th>
                      <th className="px-3 py-2 font-medium">Prices</th>
                      <th className="px-3 py-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">No components attached to this item.</td></tr>
                    ) : components.map(c => (
                      <tr key={c.project_item_component_id} className="border-b border-slate-100">
                        <td className="px-3 py-2">
                          <div className="font-bold text-slate-800">{c.product_name}</div>
                          <div className="text-xs text-slate-400">{c.supplier_name}</div>
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          Per Item: {c.qty_per_item}<br/>
                          Total: <span className="font-bold">{c.prod_qty}</span>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          Unit: {formatCurrency(parseFloat(c.unit_price))}<br/>
                          Landed: {formatCurrency(parseFloat(c.landed_price))}<br/>
                          <span className="font-bold text-emerald-600">Total: {formatCurrency(parseFloat(c.total_price))}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => handleDeleteComponent(c.project_item_component_id)} className="text-red-600 hover:text-red-800 p-1.5 bg-red-50 hover:bg-red-100 rounded transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}