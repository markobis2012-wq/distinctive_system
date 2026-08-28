'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowLeft, Save, Check, X } from 'lucide-react';
import Link from 'next/link';

interface LocationData {
  islands: { id: number; name: string }[];
  regions: { id: number; name: string; island_group_id: number }[];
  provinces: { id: number; name: string; region_id: number }[];
  cities: { id: number; name: string; province_id: number; region_id: number }[];
}

export default function AddCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<LocationData>({ islands: [], regions: [], provinces: [], cities: [] });
  
  const [formData, setFormData] = useState({
    company_name: '', full_address: '', island_group_id: 0, region_id: 0, 
    province_id: 0, city_id: 0, zipcode: 0, company_type: '', website_url: ''
  });

  const [addingRegion, setAddingRegion] = useState(false);
  const [addingProvince, setAddingProvince] = useState(false);
  const [addingCity, setAddingCity] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [isAddingLoc, setIsAddingLoc] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch('http://localhost:8081/api/locations');
        if (res.ok) setLocations(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchLocations();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (value === 'ADD_NEW') {
      if (name === 'region_id') setAddingRegion(true);
      if (name === 'province_id') setAddingProvince(true);
      if (name === 'city_id') setAddingCity(true);
      setNewLocName('');
      return;
    }
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('_id') || name === 'zipcode' ? parseInt(value) || 0 : value
    }));
  };

  // REAL DATABASE SAVING LOGIC
  const handleSaveNewLocation = async (type: string) => {
    if (!newLocName.trim()) return;
    setIsAddingLoc(true);

    try {
      if (type === 'region') {
        const res = await fetch('http://localhost:8081/api/locations/region', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newLocName, island_group_id: formData.island_group_id })
        });
        const newRegion = await res.json();
        setLocations(prev => ({ ...prev, regions: [...prev.regions, newRegion] }));
        setFormData(prev => ({ ...prev, region_id: newRegion.id }));
        setAddingRegion(false);
      }
      
      if (type === 'province') {
        const res = await fetch('http://localhost:8081/api/locations/province', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newLocName, region_id: formData.region_id })
        });
        const newProv = await res.json();
        setLocations(prev => ({ ...prev, provinces: [...prev.provinces, newProv] }));
        setFormData(prev => ({ ...prev, province_id: newProv.id }));
        setAddingProvince(false);
      }
      
      if (type === 'city') {
        const res = await fetch('http://localhost:8081/api/locations/city', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newLocName, province_id: formData.province_id, region_id: formData.region_id })
        });
        const newCity = await res.json();
        setLocations(prev => ({ ...prev, cities: [...prev.cities, newCity] }));
        setFormData(prev => ({ ...prev, city_id: newCity.id }));
        setAddingCity(false);
      }
    } catch (err) {
      console.error("Failed to save location", err);
    } finally {
      setIsAddingLoc(false);
      setNewLocName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8081/api/companies', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/admin/directory/${data.company_id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const filteredRegions = formData.island_group_id ? locations.regions.filter(r => r.island_group_id === formData.island_group_id) : locations.regions;
  const filteredProvinces = formData.region_id ? locations.provinces.filter(p => p.region_id === formData.region_id) : locations.provinces;
  const filteredCities = formData.province_id ? locations.cities.filter(c => c.province_id === formData.province_id) : locations.cities;

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="mb-6">
        <Link href="/admin/directory" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Directory
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Building2 className="text-blue-600" /> Add New Company</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 w-full">
        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
            <input type="text" name="company_name" required value={formData.company_name} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
          </div>

          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Type *</label>
            <select name="company_type" required value={formData.company_type} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none bg-white">
              <option value="" disabled>Select a type...</option>
              <option value="Client Government">Client Government</option>
              <option value="Client Private">Client Private</option>
              <option value="Supplier Local">Supplier Local</option>
              <option value="Supplier International">Supplier International</option>
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Street Address *</label>
            <input type="text" name="full_address" required value={formData.full_address} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Island Group</label>
            <select name="island_group_id" value={formData.island_group_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white">
              <option value={0}>Select Island...</option>
              {locations.islands.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Region</label>
            {addingRegion ? (
              <div className="flex items-center gap-2">
                <input autoFocus type="text" placeholder="New Region..." value={newLocName} onChange={e => setNewLocName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveNewLocation('region'))} disabled={isAddingLoc} className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
                <button type="button" onClick={() => handleSaveNewLocation('region')} disabled={isAddingLoc} className="p-2 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"><Check className="h-4 w-4"/></button>
                <button type="button" onClick={() => setAddingRegion(false)} disabled={isAddingLoc} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"><X className="h-4 w-4"/></button>
              </div>
            ) : (
              <select name="region_id" value={formData.region_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white">
                <option value={0}>Select Region...</option>
                {filteredRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                {formData.island_group_id > 0 && <option value="ADD_NEW" className="font-bold text-blue-600">+ Add New Region...</option>}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Province</label>
            {addingProvince ? (
              <div className="flex items-center gap-2">
                <input autoFocus type="text" placeholder="New Province..." value={newLocName} onChange={e => setNewLocName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveNewLocation('province'))} disabled={isAddingLoc} className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
                <button type="button" onClick={() => handleSaveNewLocation('province')} disabled={isAddingLoc} className="p-2 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"><Check className="h-4 w-4"/></button>
                <button type="button" onClick={() => setAddingProvince(false)} disabled={isAddingLoc} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"><X className="h-4 w-4"/></button>
              </div>
            ) : (
              <select name="province_id" value={formData.province_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white">
                <option value={0}>Select Province...</option>
                {filteredProvinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                {formData.region_id > 0 && formData.island_group_id > 0 && <option value="ADD_NEW" className="font-bold text-blue-600">+ Add New Province...</option>}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            {addingCity ? (
              <div className="flex items-center gap-2">
                <input autoFocus type="text" placeholder="New City..." value={newLocName} onChange={e => setNewLocName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSaveNewLocation('city'))} disabled={isAddingLoc} className="w-full px-3 py-2 border border-blue-400 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
                <button type="button" onClick={() => handleSaveNewLocation('city')} disabled={isAddingLoc} className="p-2 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"><Check className="h-4 w-4"/></button>
                <button type="button" onClick={() => setAddingCity(false)} disabled={isAddingLoc} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"><X className="h-4 w-4"/></button>
              </div>
            ) : (
              <select name="city_id" value={formData.city_id} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white">
                <option value={0}>Select City...</option>
                {filteredCities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                {formData.province_id > 0 && formData.region_id > 0 && <option value="ADD_NEW" className="font-bold text-blue-600">+ Add New City...</option>}
              </select>
            )}
          </div>
          
          {/* RESTORED FIELDS */}
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Zipcode</label>
            <input type="number" name="zipcode" value={formData.zipcode || ''} onChange={handleChange} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
          </div>
          <div className="md:col-span-2 lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Website URL</label>
            <input type="text" name="website_url" value={formData.website_url} onChange={handleChange} placeholder="https://" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 outline-none" />
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end gap-3">
          <Link href="/admin/directory" className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors">Cancel</Link>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-70 flex items-center gap-2">
            <Save className="h-4 w-4" /> {loading ? 'Saving...' : 'Save Company'}
          </button>
        </div>
      </form>
    </div>
  );
}