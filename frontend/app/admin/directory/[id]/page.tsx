'use client';

import { useState, useEffect, use, useRef } from 'react';
import {
  Building2, ArrowLeft, Edit2, Check, X, MapPin, FileText, Package, Paperclip, 
  FolderKanban, Plus, UserCheck, Trash2, Image as ImageIcon, Search
} from 'lucide-react';
import Link from 'next/link';

// Editable Field Component
const EditableField = ({ label, value, onSave }: { label: string; value: string; onSave: (val: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value);

  const handleSave = () => {
    onSave(tempVal);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
        <div className="flex items-center gap-2">
          <input autoFocus type="text" value={tempVal} onChange={(e) => setTempVal(e.target.value)} className="w-full px-3 py-1.5 border border-blue-400 rounded focus:ring-2 focus:ring-blue-600 outline-none text-sm" />
          <button onClick={handleSave} className="p-1.5 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"><Check className="h-4 w-4" /></button>
          <button onClick={() => { setTempVal(value); setIsEditing(false); }} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="group flex flex-col gap-1 w-full p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors relative cursor-pointer" onDoubleClick={() => setIsEditing(true)}>
      <span className="text-xs font-semibold text-slate-500 uppercase">{label}</span>
      <span className="text-slate-900 font-medium break-words">{value || <span className="text-slate-400 italic">Not specified</span>}</span>
      <button onClick={() => setIsEditing(true)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-blue-600 transition-all hover:bg-white rounded shadow-sm"><Edit2 className="h-4 w-4" /></button>
    </div>
  );
};

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4"><FileText className="h-5 w-5 text-slate-400" /></div>
      <p className="text-slate-800 font-semibold">{title}</p>
      <p className="text-sm text-slate-500 mt-1 max-w-md">{description}</p>
    </div>
  );
}

export default function CompanyDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const companyId = resolvedParams.id;

  const [company, setCompany] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<string>('other');

  // Contact Persons State
  const [contactPersons, setContactPersons] = useState<any[]>([]);
  const [isCpModalOpen, setIsCpModalOpen] = useState(false);
  const [editingCpId, setEditingCpId] = useState<number | null>(null);
  const [cpForm, setCpForm] = useState({ contact_person_name: '', department: '', phone: '', mobile: '', email: '', is_primary: 0 });

  // Products State
  const [products, setProducts] = useState<any[]>([]);
  const [prodSearchQuery, setProdSearchQuery] = useState('');
  const [isProdModalOpen, setIsProdModalOpen] = useState(false);
  const [editingProdId, setEditingProdId] = useState<number | null>(null);
  const [prodForm, setProdForm] = useState({ 
    sup_product_code: '', dbos_code: '', supplier_product_name: '', 
    prod_description: '', products_price: '', land_price: 0, 
    product_image: '' // <-- Added this to track existing image
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null); // <-- Added preview state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Generate a live preview URL when a new image file is selected
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl); // Clean up memory
  }, [imageFile]);

  // Attachments State
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attSearchQuery, setAttSearchQuery] = useState('');
  const [isAttModalOpen, setIsAttModalOpen] = useState(false);
  const [editingAttId, setEditingAttId] = useState<number | null>(null);
  const [attForm, setAttForm] = useState({ 
    file_name: '', reference_no: '', has_expiration: 0, expiration_date: '', 
    is_overwritable: 0, is_catalogue: 0, file_path: '' 
  });
  const [attFile, setAttFile] = useState<File | null>(null);
  const [attPreviewUrl, setAttPreviewUrl] = useState<string | null>(null);
  const attFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!attFile) { setAttPreviewUrl(null); return; }
    const url = URL.createObjectURL(attFile);
    setAttPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [attFile]);

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`http://localhost:8081/api/companies/${companyId}/attachments`);
      if (res.ok) setAttachments(await res.json());
    } catch (err) {}
  };

  // Add fetchAttachments() to your existing useEffect that fetches everything else:
  useEffect(() => {
    fetchCompany();
    fetchContactPersons();
    fetchProducts();
    fetchAttachments(); // <-- Add this
  }, [companyId]);

  // Attachment Handlers
  const openAttModal = (att: any = null) => {
    if (att) {
      setEditingAttId(att.comp_attachments_id);
      setAttForm({
        file_name: att.file_name, reference_no: att.reference_no, has_expiration: att.has_expiration,
        expiration_date: att.expiration_date || '', is_overwritable: att.is_overwritable,
        is_catalogue: att.is_catalogue, file_path: att.file_path
      });
    } else {
      setEditingAttId(null);
      setAttForm({ file_name: '', reference_no: '', has_expiration: 0, expiration_date: '', is_overwritable: 0, is_catalogue: 0, file_path: '' });
    }
    setAttFile(null);
    if (attFileInputRef.current) attFileInputRef.current.value = '';
    setIsAttModalOpen(true);
  };

  const handleSaveAtt = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(attForm).forEach(([key, value]) => formData.append(key, String(value)));
    if (attFile) formData.append('file_path', attFile);

    const url = editingAttId ? `http://localhost:8081/api/companies/${companyId}/attachments/${editingAttId}` : `http://localhost:8081/api/companies/${companyId}/attachments`;
    try {
      const res = await fetch(url, { method: editingAttId ? 'PUT' : 'POST', body: formData });
      if (res.ok) { setIsAttModalOpen(false); fetchAttachments(); }
    } catch (err) {}
  };

  const handleDeleteAtt = async (attId: number) => {
    if (!confirm("Are you sure you want to permanently delete this attachment?")) return;
    try {
      const res = await fetch(`http://localhost:8081/api/companies/attachments/${attId}`, { method: 'DELETE' });
      if (res.ok) fetchAttachments();
    } catch (err) {}
  };

  const filteredAttachments = attachments.filter(a => {
    const query = attSearchQuery.toLowerCase();
    return (a.file_name && a.file_name.toLowerCase().includes(query)) || (a.reference_no && a.reference_no.toLowerCase().includes(query));
  });

  // Filter products based on the search query
  const filteredProducts = products.filter(p => {
    const query = prodSearchQuery.toLowerCase();
    return (
      (p.supplier_product_name && p.supplier_product_name.toLowerCase().includes(query)) ||
      (p.sup_product_code && p.sup_product_code.toLowerCase().includes(query)) ||
      (p.dbos_code && p.dbos_code.toLowerCase().includes(query))
    );
  });

  const fetchCompany = async () => {
    try {
      const res = await fetch(`http://localhost:8081/api/companies/${companyId}`);
      if (res.ok) setCompany(await res.json());
    } catch (err: any) { setError(err.message); }
  };
  const fetchContactPersons = async () => {
    try {
      const res = await fetch(`http://localhost:8081/api/companies/${companyId}/contacts`);
      if (res.ok) setContactPersons(await res.json());
    } catch (err) {}
  };
  const fetchProducts = async () => {
    try {
      const res = await fetch(`http://localhost:8081/api/companies/${companyId}/products`);
      if (res.ok) setProducts(await res.json());
    } catch (err) {}
  };

  useEffect(() => {
    fetchCompany();
    fetchContactPersons();
    fetchProducts();
  }, [companyId]);

  // --- Contact Person Handlers ---
  const openCpModal = (cp: any = null) => {
    if (cp) {
      setEditingCpId(cp.contact_person_id);
      setCpForm({ contact_person_name: cp.contact_person_name, department: cp.department, phone: cp.phone, mobile: cp.mobile, email: cp.email, is_primary: cp.is_primary });
    } else {
      setEditingCpId(null);
      setCpForm({ contact_person_name: '', department: '', phone: '', mobile: '', email: '', is_primary: 0 });
    }
    setIsCpModalOpen(true);
  };

  const handleSaveCp = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingCpId ? `http://localhost:8081/api/companies/contacts/${editingCpId}` : `http://localhost:8081/api/companies/${companyId}/contacts`;
    try {
      const res = await fetch(url, {
        method: editingCpId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cpForm, company_id: parseInt(companyId) })
      });
      if (res.ok) { setIsCpModalOpen(false); fetchContactPersons(); }
    } catch (err) {}
  };

  const handleDeleteContact = async (cp: any) => {
    if (cp.is_primary === 1) { alert("You cannot delete the Primary Contact Person."); return; }
    if (!confirm(`Remove ${cp.contact_person_name}?`)) return;
    try {
      const res = await fetch(`http://localhost:8081/api/companies/contacts/${cp.contact_person_id}`, { method: 'DELETE' });
      if (res.ok) fetchContactPersons();
    } catch (err) {}
  };

  // --- Product Handlers ---
    const openProdModal = (prod: any = null) => {
    if (prod) {
      setEditingProdId(prod.supplier_product_id);
      setProdForm({
        sup_product_code: prod.sup_product_code, dbos_code: prod.dbos_code, 
        supplier_product_name: prod.supplier_product_name, prod_description: prod.prod_description, 
        products_price: prod.products_price, land_price: prod.land_price,
        product_image: prod.product_image // <-- Load existing image
      });
    } else {
      setEditingProdId(null);
      setProdForm({ 
        sup_product_code: '', dbos_code: '', supplier_product_name: '', 
        prod_description: '', products_price: '', land_price: 0, 
        product_image: '' 
      });
    }
    setImageFile(null);
    setPreviewUrl(null); // Clear preview
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsProdModalOpen(true);
  };

  const handleSaveProd = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use FormData for file uploads
    const formData = new FormData();
    Object.entries(prodForm).forEach(([key, value]) => formData.append(key, String(value)));
    if (imageFile) formData.append('product_image', imageFile);

    const url = editingProdId ? `http://localhost:8081/api/companies/${companyId}/products/${editingProdId}` : `http://localhost:8081/api/companies/${companyId}/products`;
    
    try {
      const res = await fetch(url, {
        method: editingProdId ? 'PUT' : 'POST',
        body: formData, // Do NOT set Content-Type header, browser handles boundary automatically
      });
      if (res.ok) { setIsProdModalOpen(false); fetchProducts(); }
    } catch (err) {}
  };

  const handleDeleteProd = async (prodId: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`http://localhost:8081/api/companies/products/${prodId}`, { method: 'DELETE' });
      if (res.ok) fetchProducts();
    } catch (err) {}
  };

  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!company) return <div className="p-6 text-slate-500">Loading company details...</div>;

  // Dynamic Tabs Logic
  const isSupplier = company.company_type === 'Supplier Local' || company.company_type === 'Supplier International';
  const TABS = [
    { key: 'other', label: 'Other Details', icon: FileText },
    ...(isSupplier ? [{ key: 'products', label: 'Supplier Products', icon: Package }] : []),
    { key: 'attachments', label: 'Attachments', icon: Paperclip },
    { key: 'projects', label: 'Projects', icon: FolderKanban },
  ];

  return (
    <div className="w-full px-6">
      <div className="bg-slate-50 min-h-screen pb-12">
        <div className="bg-slate-900 text-white p-8 rounded-b-3xl shadow-md mb-8">
          <Link href="/admin/directory" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-6 transition-colors"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Directory</Link>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Building2 className="h-8 w-8 text-white" /></div>
            <div>
              <h1 className="text-3xl font-bold">{company.company_name}</h1>
              <p className="text-blue-300 mt-1 flex items-center gap-2"><span className="px-2 py-0.5 bg-blue-900/50 rounded-full text-xs border border-blue-700">{company.company_type}</span>ID: {company.company_id}</p>
            </div>
          </div>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">General Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <EditableField label="Company Name" value={company.company_name} onSave={(v) => setCompany({ ...company, company_name: v })} />
                <EditableField label="Company Type" value={company.company_type} onSave={(v) => setCompany({ ...company, company_type: v })} />
                <EditableField label="Website URL" value={company.website_url} onSave={(v) => setCompany({ ...company, website_url: v })} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-slate-400" /> Location Details</h3>
              <div className="grid grid-cols-1 gap-4">
                <EditableField label="Full Address" value={company.full_address} onSave={(v) => setCompany({ ...company, full_address: v })} />
                <EditableField label="Island Group" value={company.island_group} onSave={() => {}} />
                <EditableField label="Region" value={company.region} onSave={() => {}} />
                <EditableField label="Province" value={company.province} onSave={() => {}} />
                <EditableField label="City" value={company.city} onSave={() => {}} />
                <EditableField label="Zipcode" value={company.zipcode} onSave={(v) => setCompany({ ...company, zipcode: v })} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[640px] flex flex-col overflow-hidden">
              <div className="border-b border-slate-200 px-2 pt-2 overflow-x-auto">
                <div className="flex gap-1 min-w-max">
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                        className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-700 bg-blue-50/60' : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
                      >
                        <Icon className="h-4 w-4" />{tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 p-6">
                {/* OTHER DETAILS TAB */}
                {activeTab === 'other' && (
                  <div className="space-y-8">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-md font-bold text-slate-800">Assigned Contact Persons</h4>
                        <button onClick={() => openCpModal()} className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Contact</button>
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-sm text-slate-600">
                          <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 font-medium">Name</th><th className="px-4 py-3 font-medium">Department</th>
                              <th className="px-4 py-3 font-medium">Mobile / Phone</th><th className="px-4 py-3 font-medium">Email</th>
                              <th className="px-4 py-3 font-medium">Status</th><th className="px-4 py-3 font-medium text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {contactPersons.length === 0 ? (
                              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">No contact persons added.</td></tr>
                            ) : (
                              contactPersons.map((cp: any) => (
                                <tr key={cp.contact_person_id} className="border-b border-slate-100 hover:bg-slate-50">
                                  <td className="px-4 py-3 font-medium text-slate-900">{cp.contact_person_name}</td>
                                  <td className="px-4 py-3">{cp.department || '-'}</td>
                                  <td className="px-4 py-3">{cp.mobile || cp.phone || '-'}</td>
                                  <td className="px-4 py-3">{cp.email || '-'}</td>
                                  <td className="px-4 py-3">{cp.is_primary === 1 && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800"><UserCheck className="h-3 w-3 mr-1" /> Primary</span>}</td>
                                  <td className="px-4 py-3 text-right space-x-3">
                                    <button onClick={() => openCpModal(cp)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Edit</button>
                                    <button onClick={() => handleDeleteContact(cp)} className="text-red-600 hover:text-red-800 font-medium text-xs">Delete</button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* PRODUCTS TAB */}
                {activeTab === 'products' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <h4 className="text-md font-bold text-slate-800">Supplier Products</h4>
                      
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* NEW SEARCH BAR */}
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search products..."
                            value={prodSearchQuery}
                            onChange={(e) => setProdSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        
                        <button onClick={() => openProdModal()} className="shrink-0 flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">
                          <Plus className="h-4 w-4" /> Add Product
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 font-medium w-16">Image</th>
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Sup Code</th>
                            <th className="px-4 py-3 font-medium">DBOS Code</th>
                            <th className="px-4 py-3 font-medium">Price</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Changed to filteredProducts! */}
                          {filteredProducts.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">
                                {prodSearchQuery ? 'No products match your search.' : 'No products added yet.'}
                              </td>
                            </tr>
                          ) : (
                            filteredProducts.map((p: any) => (
                              <tr key={p.supplier_product_id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  {p.product_image ? (
                                    <img 
                                        src={`http://localhost:8081${p.product_image}`} 
                                        alt={p.supplier_product_name} 
                                        onClick={() => setEnlargedImage(`http://localhost:8081${p.product_image}`)}
                                        className="h-10 w-10 object-cover rounded shadow-sm border border-slate-200 cursor-zoom-in hover:opacity-80 transition-opacity" 
                                        />
                                  ) : (
                                    <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center border border-slate-200"><ImageIcon className="h-4 w-4 text-slate-300" /></div>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">{p.supplier_product_name}</td>
                                <td className="px-4 py-3">{p.sup_product_code}</td>
                                <td className="px-4 py-3">{p.dbos_code}</td>
                                <td className="px-4 py-3 font-medium text-emerald-600">{p.products_price}</td>
                                <td className="px-4 py-3 text-right space-x-3">
                                  <button onClick={() => openProdModal(p)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Edit</button>
                                  <button onClick={() => handleDeleteProd(p.supplier_product_id)} className="text-red-600 hover:text-red-800 font-medium text-xs">Delete</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ATTACHMENTS TAB */}
                {activeTab === 'attachments' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <h4 className="text-md font-bold text-slate-800">Company Attachments</h4>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input type="text" placeholder="Search attachments..." value={attSearchQuery} onChange={(e) => setAttSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <button onClick={() => openAttModal()} className="shrink-0 flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">
                          <Plus className="h-4 w-4" /> Upload
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 font-medium w-16">Preview</th>
                            <th className="px-4 py-3 font-medium">File Name</th>
                            <th className="px-4 py-3 font-medium">Ref No.</th>
                            <th className="px-4 py-3 font-medium">Tags</th>
                            <th className="px-4 py-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredAttachments.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 italic">No attachments found.</td></tr>
                          ) : (
                            filteredAttachments.map((a: any) => (
                              <tr key={a.comp_attachments_id} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="px-4 py-3">
                                  {a.file_path ? (
                                    <img src={`http://localhost:8081${a.file_path}`} onClick={() => setEnlargedImage(`http://localhost:8081${a.file_path}`)} alt={a.file_name} className="h-10 w-10 object-cover rounded shadow-sm border border-slate-200 cursor-zoom-in hover:opacity-80" />
                                  ) : (
                                    <div className="h-10 w-10 bg-slate-100 rounded flex items-center justify-center border border-slate-200"><ImageIcon className="h-4 w-4 text-slate-300" /></div>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">{a.file_name}</td>
                                <td className="px-4 py-3">{a.reference_no}</td>
                                <td className="px-4 py-3 flex gap-2 flex-wrap">
                                  {a.is_catalogue === 1 && <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">Catalogue</span>}
                                  {a.is_overwritable === 1 && <span className="px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">Overwritable</span>}
                                  {a.has_expiration === 1 && <span className="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">Exp: {a.expiration_date}</span>}
                                </td>
                                <td className="px-4 py-3 text-right space-x-3">
                                  <button onClick={() => openAttModal(a)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Edit</button>
                                  <button onClick={() => handleDeleteAtt(a.comp_attachments_id)} className="text-red-600 hover:text-red-800 font-medium text-xs">Delete</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {activeTab === 'projects' && <EmptyState title="No projects yet" description="Projects associated with this company will be listed here." />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTACT PERSON MODAL */}
      {isCpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">{editingCpId ? 'Edit Contact' : 'Add Contact'}</h3>
            <form onSubmit={handleSaveCp} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label><input type="text" required value={cpForm.contact_person_name} onChange={(e) => setCpForm({ ...cpForm, contact_person_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
              <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setIsCpModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Save</button></div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT MODAL */}
      {isProdModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-2xl w-full p-6 my-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">{editingProdId ? 'Edit Product' : 'Add New Product'}</h3>
            <form onSubmit={handleSaveProd} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Product Name *</label><input type="text" required value={prodForm.supplier_product_name} onChange={(e) => setProdForm({ ...prodForm, supplier_product_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Product Image</label>
                <div className="flex items-center gap-3">
                    {/* Preview Thumbnail Box */}
                    <div className="h-12 w-12 shrink-0 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                    {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                    ) : prodForm.product_image ? (
                        <img src={`http://localhost:8081${prodForm.product_image}`} alt="Current" className="h-full w-full object-cover" />
                    ) : (
                        <ImageIcon className="h-5 w-5 text-slate-300" />
                    )}
                    </div>
                    {/* File Input */}
                    <input 
                    type="file" accept="image/*" ref={fileInputRef} 
                    onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)} 
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none bg-white" 
                    />
                </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Sup Product Code *</label><input type="text" required value={prodForm.sup_product_code} onChange={(e) => setProdForm({ ...prodForm, sup_product_code: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">DBOS Code *</label><input type="text" required value={prodForm.dbos_code} onChange={(e) => setProdForm({ ...prodForm, dbos_code: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Selling Price *</label><input type="text" required value={prodForm.products_price} onChange={(e) => setProdForm({ ...prodForm, products_price: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Land Price *</label><input type="number" step="0.01" required value={prodForm.land_price} onChange={(e) => setProdForm({ ...prodForm, land_price: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Description</label><textarea rows={3} required value={prodForm.prod_description} onChange={(e) => setProdForm({ ...prodForm, prod_description: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none"></textarea></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100"><button type="button" onClick={() => setIsProdModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save Product</button></div>
            </form>
          </div>
        </div>
      )}

      {/* ENLARGED IMAGE LIGHTBOX */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setEnlargedImage(null)}
        >
          <button 
            onClick={() => setEnlargedImage(null)}
            className="absolute top-6 right-6 text-white/70 hover:text-white p-2 transition-colors"
          >
            <X className="h-8 w-8" />
          </button>
          <img 
            src={enlargedImage} 
            alt="Enlarged preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevents clicking the image itself from closing the modal
          />
        </div>
      )}

      {/* ATTACHMENT MODAL */}
      {isAttModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 max-w-lg w-full p-6 my-8">
            <h3 className="text-lg font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">{editingAttId ? 'Edit Attachment' : 'Upload Attachment'}</h3>
            <form onSubmit={handleSaveAtt} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attachment File</label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
                    {attPreviewUrl ? (
                      <img src={attPreviewUrl} className="h-full w-full object-cover" />
                    ) : attForm.file_path ? (
                      <img src={`http://localhost:8081${attForm.file_path}`} className="h-full w-full object-cover" />
                    ) : (
                      <Paperclip className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <input type="file" ref={attFileInputRef} onChange={(e) => setAttFile(e.target.files ? e.target.files[0] : null)} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white outline-none" />
                </div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">File Name *</label><input type="text" required value={attForm.file_name} onChange={(e) => setAttForm({ ...attForm, file_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Reference No.</label><input type="text" value={attForm.reference_no} onChange={(e) => setAttForm({ ...attForm, reference_no: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none" /></div>
              
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={attForm.has_expiration === 1} onChange={(e) => setAttForm({ ...attForm, has_expiration: e.target.checked ? 1 : 0 })} className="rounded" /> Has Expiration</label>
                {attForm.has_expiration === 1 && (
                  <input type="date" value={attForm.expiration_date} onChange={(e) => setAttForm({ ...attForm, expiration_date: e.target.value })} className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm outline-none" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={attForm.is_overwritable === 1} onChange={(e) => setAttForm({ ...attForm, is_overwritable: e.target.checked ? 1 : 0 })} className="rounded" /> Is Overwritable</label>
                <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={attForm.is_catalogue === 1} onChange={(e) => setAttForm({ ...attForm, is_catalogue: e.target.checked ? 1 : 0 })} className="rounded" /> Is Catalogue</label>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100"><button type="button" onClick={() => setIsAttModalOpen(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}