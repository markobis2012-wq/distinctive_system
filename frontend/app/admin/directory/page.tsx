'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, Building2, ChevronDown, ChevronUp, Phone, UserCircle, Plus, Trash2, X, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081';

interface Contact {
  type: string;
  details: string;
}

interface ContactPerson {
  name: string;
  department: string;
  phone: string;
  mobile: string;
  email: string;
}

interface Company {
  company_id: number;
  company_name: string;
  full_address: string;
  island_group: string;
  region: string;
  province: string;
  city: string;
  zipcode: number;
  company_type: string;
  website_url: string;
  contacts: Contact[];
  primary_person?: ContactPerson;
}

export default function DirectoryPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  // Add Company Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    company_type: '',
    full_address: '',
    island_group: '',
    region: '',
    province: '',
    city: '',
    zipcode: '',
    website_url: ''
  });

  // Filters and Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterIsland, setFilterIsland] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const [sortKey, setSortKey] = useState<keyof Company>('company_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/companies`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setCompanies(data);
      } else {
        setCompanies([]); 
      }
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      setCompanies([]); 
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  // Form Handlers
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          zipcode: parseInt(formData.zipcode as string) || 0
        })
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setFormData({
          company_name: '', company_type: '', full_address: '',
          island_group: '', region: '', province: '', city: '', zipcode: '', website_url: ''
        });
        fetchCompanies(); // Refresh the list
      } else {
        alert("Failed to create company.");
      }
    } catch (error) {
      alert("Server connection error.");
    }
  };

  const handleDeleteCompany = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents the row click (navigation) from triggering
    if (!confirm("Are you sure you want to delete this company? This action cannot be undone.")) return;

    try {
      const res = await fetch(`${API_URL}/api/companies/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCompanies(); // Refresh after deletion
      } else {
        alert("Failed to delete company.");
      }
    } catch (error) {
      alert("Server error.");
    }
  };

  const types = Array.from(new Set(companies.map(c => c.company_type))).filter(v => v !== 'N/A' && v !== '0' && v !== '');
  const islands = Array.from(new Set(companies.map(c => c.island_group))).filter(v => v !== 'N/A');
  const regions = Array.from(new Set(companies.map(c => c.region))).filter(v => v !== 'N/A');
  const provinces = Array.from(new Set(companies.map(c => c.province))).filter(v => v !== 'N/A');
  const cities = Array.from(new Set(companies.map(c => c.city))).filter(v => v !== 'N/A');

  const handleSort = (key: keyof Company) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleRow = (companyId: number) => {
    if (expandedRows.includes(companyId)) {
      setExpandedRows(expandedRows.filter(id => id !== companyId));
    } else {
      setExpandedRows([...expandedRows, companyId]);
    }
  };

  const getPrimaryContact = (contacts: Contact[]) => {
    if (!contacts || contacts.length === 0) return 'N/A';
    const mobile = contacts.find(c => c.type.toLowerCase().includes('mobile'));
    if (mobile) return mobile.details;
    const phone = contacts.find(c => c.type.toLowerCase().includes('phone'));
    if (phone) return phone.details;
    return contacts[0].details;
  };

  const filteredAndSortedData = useMemo(() => {
    let result = companies;

    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(c => 
        (c.company_name && c.company_name.toLowerCase().includes(lowerQuery)) || 
        (c.full_address && c.full_address.toLowerCase().includes(lowerQuery))
      );
    }

    if (filterType) result = result.filter(c => c.company_type === filterType);
    if (filterIsland) result = result.filter(c => c.island_group === filterIsland);
    if (filterRegion) result = result.filter(c => c.region === filterRegion);
    if (filterProvince) result = result.filter(c => c.province === filterProvince);
    if (filterCity) result = result.filter(c => c.city === filterCity);

    result.sort((a, b) => {
      const aValue: any = a[sortKey] ?? '';
      const bValue: any = b[sortKey] ?? '';

      if (aValue < bValue) return sortDir === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, searchQuery, filterType, filterIsland, filterRegion, filterProvince, filterCity, sortKey, sortDir]);

  return (
    <div className="bg-slate-50 min-h-screen p-8 w-full">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="text-blue-600" /> Company Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage and filter active registered companies</p>
        </div>
        
        {/* ADD COMPANY BUTTON RESTORED */}
        <button 
          onClick={() => setIsAddModalOpen(true)} 
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2 shrink-0 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Company
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-slate-50">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500" value={filterIsland} onChange={(e) => setFilterIsland(e.target.value)}>
            <option value="">All Islands</option>
            {islands.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
            <option value="">All Regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500" value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)}>
            <option value="">All Provinces</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <tr>
                {[
                  { key: 'company_name', label: 'Company Name' },
                  { key: 'company_type', label: 'Type' },
                  { key: 'contacts', label: 'Primary Contact' },
                  { key: 'region', label: 'Region' },
                  { key: 'province', label: 'Province' },
                  { key: 'city', label: 'City' }
                ].map((col) => (
                  <th 
                    key={col.key} 
                    className={`px-6 py-4 font-medium transition-colors ${col.key !== 'contacts' && 'cursor-pointer hover:bg-slate-100'}`}
                    onClick={() => col.key !== 'contacts' && handleSort(col.key as keyof Company)}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.key !== 'contacts' && <ArrowUpDown className={`h-3 w-3 ${sortKey === col.key ? 'text-blue-600' : 'text-slate-400'}`} />}
                    </div>
                  </th>
                ))}
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">Loading directory...</td></tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">No companies found.</td></tr>
              ) : (
                filteredAndSortedData.map((company) => {
                  const isExpanded = expandedRows.includes(company.company_id);
                  const contactsArray = company.contacts || [];
                  const hasExpandableData = contactsArray.length > 0 || company.primary_person;
                  
                  return (
                    <React.Fragment key={company.company_id}>
                      <tr 
                        onClick={() => router.push(`/admin/directory/${company.company_id}`)}
                        className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900">{company.company_name}</td>
                        <td className="px-6 py-4">
                          {company.company_type && company.company_type !== '0' ? (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                              {company.company_type}
                            </span>
                          ) : <span className="text-slate-400 italic">N/A</span>}
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-700">
                              {getPrimaryContact(contactsArray)}
                            </span>
                            
                            {hasExpandableData && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation(); // Stops row click navigation
                                  toggleRow(company.company_id);
                                }}
                                className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">{company.region}</td>
                        <td className="px-6 py-4">{company.province}</td>
                        <td className="px-6 py-4">{company.city}</td>
                        
                        {/* DELETE BUTTON RESTORED */}
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={(e) => handleDeleteCompany(company.company_id, e)}
                            className="p-2 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition-colors"
                            title="Delete Company"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Section */}
                      {isExpanded && hasExpandableData && (
                        <tr className="bg-blue-50/50 border-b border-slate-200 cursor-default">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="flex flex-col md:flex-row gap-6">
                              {contactsArray.length > 0 && (
                                <div className="rounded-lg bg-white p-4 border border-blue-100 shadow-sm min-w-[300px]">
                                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">Associated Numbers</h4>
                                  <ul className="space-y-2">
                                    {contactsArray.map((contact, idx) => (
                                      <li key={idx} className="flex items-center gap-3 text-sm">
                                        <div className="flex items-center justify-center h-6 w-6 rounded bg-slate-100 text-slate-500">
                                          <Phone className="h-3 w-3" />
                                        </div>
                                        <span className="font-medium text-slate-700 w-16">{contact.type}:</span>
                                        <span className="text-slate-600">{contact.details}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {company.primary_person && (
                                <div className="rounded-lg bg-white p-4 border border-emerald-100 shadow-sm min-w-[300px]">
                                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <UserCircle className="h-4 w-4 text-emerald-600" /> Primary Contact Person
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium text-slate-500 w-16">Name:</span>
                                      <span className="text-slate-900 font-bold">{company.primary_person.name}</span>
                                    </div>
                                    {company.primary_person.department && (
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium text-slate-500 w-16">Dept:</span>
                                        <span className="text-slate-700">{company.primary_person.department}</span>
                                      </div>
                                    )}
                                    {company.primary_person.mobile && (
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium text-slate-500 w-16">Mobile:</span>
                                        <span className="text-slate-700">{company.primary_person.mobile}</span>
                                      </div>
                                    )}
                                    {company.primary_person.email && (
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium text-slate-500 w-16">Email:</span>
                                        <span className="text-slate-700">{company.primary_person.email}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-slate-200 text-sm text-slate-500 bg-white">
          Showing <b>{filteredAndSortedData.length}</b> records
        </div>
      </div>

      {/* ADD COMPANY MODAL RESTORED */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-blue-600 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2"><Building2 className="h-5 w-5"/> Register New Company</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="hover:text-blue-200"><X className="h-5 w-5" /></button>
            </div>
            
            <form onSubmit={handleAddCompany} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Company Name *</label>
                  <input required type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="Full Registered Name" />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Company Type</label>
                  <select value={formData.company_type} onChange={e => setFormData({...formData, company_type: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm bg-white">
                    <option value="">Select Type...</option>
                    <option value="Client Government">Client Government</option>
                    <option value="Supplier Local">Supplier Local</option>
                    <option value="Supplier International">Supplier International</option>
                    <option value="Client Private">Client Private</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Website URL</label>
                  <input type="url" value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="https://..." />
                </div>

                <div className="col-span-2 mt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-1 mb-2">Location Details</h4>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Full Address *</label>
                  <textarea required rows={2} value={formData.full_address} onChange={e => setFormData({...formData, full_address: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm resize-none" placeholder="Unit, Building, Street..." />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Island Group</label>
                  <select value={formData.island_group} onChange={e => setFormData({...formData, island_group: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm bg-white">
                    <option value="">Select Island...</option>
                    <option value="Luzon">Luzon</option>
                    <option value="Visayas">Visayas</option>
                    <option value="Mindanao">Mindanao</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Region</label>
                  <input type="text" value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="e.g. NCR" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Province</label>
                  <input type="text" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="Province" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">City / Municipality *</label>
                  <input required type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="City" />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Zip Code</label>
                  <input type="number" value={formData.zipcode} onChange={e => setFormData({...formData, zipcode: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-sm" placeholder="0000" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 hover:bg-blue-700 transition-colors">
                  <Save className="h-4 w-4" /> Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}