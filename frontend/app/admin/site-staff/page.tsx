'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, User as UserIcon, Mail, Phone, Building2, UploadCloud } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function SiteStaffPage() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // NEW: Image Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '', role: '', avatar_url: '', department_id: 0, 
    position: '', address: '', mobile_no: '', email: ''
  });

  useEffect(() => {
    fetchData();
    fetchDepartments();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/staff`);
      if (res.ok) setStaffList(await res.json() || []);
    } catch (err) { console.error(err); }
  };

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/departments`);
      if (res.ok) setDepartments(await res.json() || []);
    } catch (err) { console.error(err); }
  };

  const openModal = (staff: any = null) => {
    // Reset file states when opening modal
    setSelectedFile(null);
    setPreviewUrl('');

    if (staff) {
      setEditingId(staff.resource_id);
      setFormData({
        name: staff.name || '', role: staff.role || '', avatar_url: staff.avatar_url || '',
        department_id: staff.department_id || 0, position: staff.position || '',
        address: staff.address || '', mobile_no: staff.mobile_no || '', email: staff.email || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', role: '', avatar_url: '', department_id: 0, position: '', address: '', mobile_no: '', email: '' });
    }
    setIsModalOpen(true);
  };

  // NEW: Handle Image Selection & Preview
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Creates a temporary local URL for instant preview!
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalAvatarUrl = formData.avatar_url;

    // 1. If a new file was selected, upload it first!
    if (selectedFile) {
      const uploadData = new FormData();
      uploadData.append('avatar', selectedFile);

      try {
        const uploadRes = await fetch(`${API_URL}/api/staff/upload-avatar`, {
          method: 'POST',
          body: uploadData, // Note: fetch automatically sets the correct multipart/form-data headers
        });
        
        if (uploadRes.ok) {
          const result = await uploadRes.json();
          finalAvatarUrl = result.avatar_url; // Grab the new path from the server
        } else {
          alert("Failed to upload image. Saving profile without a new image.");
        }
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    // 2. Save the staff profile with the final Avatar URL
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/api/staff/${editingId}` : `${API_URL}/api/staff`;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, avatar_url: finalAvatarUrl })
    });
    
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this staff member? They will be removed from future schedules.")) return;
    await fetch(`${API_URL}/api/staff/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.department || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.position || '').toLowerCase().includes(search.toLowerCase())
  );

  // Helper to ensure proper image loading regardless of external link or local file
  const getAvatarSrc = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url; // External URL (like dummy pravatar links)
    return `${API_URL}${url}`;              // Local Server File
  };

  return (
    <div className="p-6 w-full flex flex-col h-full">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Site Staff</h1>
          <p className="text-slate-500 mt-1">Manage employees, departments, and contact details.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors">
          <Plus className="h-5 w-5" /> Add Staff
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 w-full">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, position, or department..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden w-full flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Employee</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Contact Details</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Department & Role</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStaff.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500 italic">No staff members found.</td></tr>
            ) : (
              filteredStaff.map((staff) => (
                <tr key={staff.resource_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4 flex items-center gap-4">
                    {staff.avatar_url ? (
                      <img src={getAvatarSrc(staff.avatar_url)} alt="" className="h-12 w-12 rounded-full object-cover border border-slate-200" />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <UserIcon className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-800">{staff.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{staff.position || 'No Position Set'}</div>
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2 text-slate-700 mb-1">
                      <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" /> {staff.email || '-'}
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" /> {staff.mobile_no || '-'}
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2 font-medium text-indigo-700 mb-1 bg-indigo-50 w-max px-2.5 py-0.5 rounded-full">
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0" /> {staff.department || 'Unassigned'}
                    </div>
                    <div className="text-slate-500 text-xs ml-1 mt-1">App Role: {staff.role || 'Basic'}</div>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => openModal(staff)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 className="h-5 w-5" /></button>
                    <button onClick={() => handleDelete(staff.resource_id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors ml-1"><Trash2 className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-xl text-slate-800">{editingId ? 'Edit Staff Member' : 'Add New Staff'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
              
              {/* IMAGE UPLOAD UI */}
              <div className="flex items-center gap-6 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                <div className="h-20 w-20 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                  {previewUrl ? (
                    <img src={previewUrl} className="h-full w-full object-cover" alt="Preview" />
                  ) : formData.avatar_url ? (
                    <img src={getAvatarSrc(formData.avatar_url)} className="h-full w-full object-cover" alt="Current Avatar" />
                  ) : (
                    <UserIcon className="h-8 w-8 text-slate-300" />
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Profile Photo</label>
                  <label className="flex items-center justify-center w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                      <UploadCloud className="h-4 w-4 text-indigo-500" />
                      {selectedFile ? selectedFile.name : 'Click to upload new image...'}
                    </div>
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1.5">Recommended: Square image, 200x200px or larger. JPEG, PNG.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Full Name *</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Job Position</label>
                  <input type="text" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} placeholder="e.g. Lead Engineer" className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Department</label>
                  <select value={formData.department_id} onChange={e => setFormData({...formData, department_id: parseInt(e.target.value)})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm bg-white">
                    <option value="0">Select Department...</option>
                    {departments.map(d => <option key={d.department_id} value={d.department_id}>{d.department}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">System Role / Tag</label>
                  <input type="text" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} placeholder="e.g. Admin, User, or Specialization Tag" className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Email Address</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Mobile Number</label>
                  <input type="text" value={formData.mobile_no} onChange={e => setFormData({...formData, mobile_no: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Physical Address</label>
                <textarea rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm resize-none" />
              </div>

              <div className="pt-2 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md">
                  {editingId ? 'Save Changes' : 'Add Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}