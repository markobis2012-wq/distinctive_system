'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, ArrowUpDown, Building2, ChevronDown, ChevronUp, Phone, UserCircle, Plus, Pencil } from 'lucide-react';
import Link from 'next/link';

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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterIsland, setFilterIsland] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterCity, setFilterCity] = useState('');

  const [sortKey, setSortKey] = useState<keyof Company>('company_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await fetch('http://localhost:8081/api/companies');
        const data = await res.json();

        if (Array.isArray(data)) {
          setCompanies(data);
        } else {
          setCompanies([]);
        }
      } catch (error) {
        console.error("Failed to fetch", error);
        setCompanies([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);

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
        c.company_name.toLowerCase().includes(lowerQuery) ||
        c.full_address.toLowerCase().includes(lowerQuery)
      );
    }

    if (filterType) result = result.filter(c => c.company_type === filterType);
    if (filterIsland) result = result.filter(c => c.island_group === filterIsland);
    if (filterRegion) result = result.filter(c => c.region === filterRegion);
    if (filterProvince) result = result.filter(c => c.province === filterProvince);
    if (filterCity) result = result.filter(c => c.city === filterCity);

    result.sort((a, b) => {
      const aValue = String(a[sortKey] || '');
      const bValue = String(b[sortKey] || '');

      if (aValue < bValue) return sortDir === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [companies, searchQuery, filterType, filterIsland, filterRegion, filterProvince, filterCity, sortKey, sortDir]);

  return (
    <div className="bg-slate-50">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="text-blue-600" /> Company Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage and filter active registered companies</p>
        </div>
        <Link
          href="/admin/directory/add"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> Add New Company
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filterIsland} onChange={(e) => setFilterIsland(e.target.value)}>
            <option value="">All Islands</option>
            {islands.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
            <option value="">All Regions</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)}>
            <option value="">All Provinces</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
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
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">Loading directory...</td></tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-400">No companies found.</td></tr>
              ) : (
                filteredAndSortedData.map((company) => {
                  const isExpanded = expandedRows.includes(company.company_id);
                  const hasExpandableData = company.contacts.length > 0 || company.primary_person;

                  return (
                    <React.Fragment key={company.company_id}>
                      <tr className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                        <td className="px-6 py-4 font-medium text-slate-900">{company.company_name}</td>
                        <td className="px-6 py-4">
                          {company.company_type && company.company_type !== '0' ? (
                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs border border-slate-200">
                              {company.company_type}
                            </span>
                          ) : <span className="text-slate-400 italic">N/A</span>}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-700">
                              {getPrimaryContact(company.contacts)}
                            </span>

                            {hasExpandableData && (
                              <button
                                onClick={() => toggleRow(company.company_id)}
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
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/admin/directory/${company.company_id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Link>
                        </td>
                      </tr>

                      {isExpanded && hasExpandableData && (
                        <tr className="bg-blue-50/50 border-b border-slate-200">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="flex flex-col md:flex-row gap-6">
                              {company.contacts.length > 0 && (
                                <div className="rounded-lg bg-white p-4 border border-blue-100 shadow-sm min-w-[300px]">
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Associated Numbers</h4>
                                  <ul className="space-y-2">
                                    {company.contacts.map((contact, idx) => (
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
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <UserCircle className="h-4 w-4 text-emerald-600" /> Primary Contact Person
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium text-slate-500 w-20">Name:</span>
                                      <span className="text-slate-900 font-semibold">{company.primary_person.name}</span>
                                    </div>
                                    {company.primary_person.department && (
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium text-slate-500 w-20">Dept:</span>
                                        <span className="text-slate-700">{company.primary_person.department}</span>
                                      </div>
                                    )}
                                    {company.primary_person.mobile && (
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium text-slate-500 w-20">Mobile:</span>
                                        <span className="text-slate-700">{company.primary_person.mobile}</span>
                                      </div>
                                    )}
                                    {company.primary_person.email && (
                                      <div className="flex items-center gap-3">
                                        <span className="font-medium text-slate-500 w-20">Email:</span>
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

        <div className="p-4 border-t border-slate-200 text-sm text-slate-500">
          Showing {filteredAndSortedData.length} records
        </div>
      </div>
    </div>
  );
}