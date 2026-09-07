'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, X, FileText, UploadCloud, Calendar, Download, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function GeneralAttachmentsPage() {
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentTypes, setAttachmentTypes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    date_uploaded: new Date().toISOString().split('T')[0],
    attachment_file_type_id: 0,
    has_expiration: 0,
    expiration_date: '',
    version: '1.0',
    file_path: '',
    file_name: ''
  });

  useEffect(() => {
    fetchData();
    fetchTypes();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/attachments`);
      if (res.ok) setAttachments(await res.json() || []);
    } catch (err) { console.error(err); }
  };

  const fetchTypes = async () => {
    try {
      // Reusing your existing endpoint for attachment types!
      const res = await fetch(`${API_URL}/api/attachment-types`);
      if (res.ok) setAttachmentTypes(await res.json() || []);
    } catch (err) { console.error(err); }
  };

  const openModal = (att: any = null) => {
    setSelectedFile(null);
    if (att) {
      setEditingId(att.attachments_id);
      setFormData({
        date_uploaded: att.date_uploaded || new Date().toISOString().split('T')[0],
        attachment_file_type_id: att.attachment_file_type_id || 0,
        has_expiration: att.has_expiration || 0,
        expiration_date: att.expiration_date || '',
        version: att.version || '1.0',
        file_path: att.file_path || '',
        file_name: att.file_name || ''
      });
    } else {
      setEditingId(null);
      setFormData({ 
        date_uploaded: new Date().toISOString().split('T')[0], 
        attachment_file_type_id: 0, has_expiration: 0, expiration_date: '', 
        version: '1.0', file_path: '', file_name: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-fill the file name if it's empty!
      if (!formData.file_name) {
        setFormData(prev => ({ ...prev, file_name: file.name.split('.')[0] }));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalFilePath = formData.file_path;

    // 1. Upload file if selected
    if (selectedFile) {
      const uploadData = new FormData();
      uploadData.append('document', selectedFile);

      try {
        const uploadRes = await fetch(`${API_URL}/api/attachments/upload`, {
          method: 'POST',
          body: uploadData,
        });
        
        if (uploadRes.ok) {
          const result = await uploadRes.json();
          finalFilePath = result.file_path; 
        } else {
          alert("Failed to upload document.");
          return; // Stop save if upload fails
        }
      } catch (err) {
        console.error("Upload error:", err);
        return;
      }
    }

    // Require a file path for new attachments
    if (!finalFilePath && !editingId) {
      alert("Please upload a file.");
      return;
    }

    // 2. Save Data
    const method = editingId ? 'PUT' : 'POST';
    const url = editingId ? `${API_URL}/api/attachments/${editingId}` : `${API_URL}/api/attachments`;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, file_path: finalFilePath })
    });
    
    setIsModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this attachment permanently?")) return;
    await fetch(`${API_URL}/api/attachments/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const filteredAttachments = attachments.filter(a => 
    (a.file_name || '').toLowerCase().includes(search.toLowerCase()) || 
    (a.version || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 w-full flex flex-col h-full">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Company Documents</h1>
          <p className="text-slate-500 mt-1">Manage general attachments, policies, and files.</p>
        </div>
        <button onClick={() => openModal()} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors">
          <Plus className="h-5 w-5" /> Upload File
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex gap-4 w-full">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by file name or version..." 
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
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-12"></th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Document Details</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">File Type</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Dates & Expiration</th>
              <th className="p-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAttachments.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">No attachments found.</td></tr>
            ) : (
              filteredAttachments.map((att) => {
                const typeObj = attachmentTypes.find(t => t.id === att.attachment_file_type_id);
                const typeName = typeObj?.type_name || typeObj?.name || 'Unknown Type';
                
                // Expiration logic
                const isExpired = att.has_expiration === 1 && att.expiration_date && new Date(att.expiration_date) < new Date();

                return (
                  <tr key={att.attachments_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="h-10 w-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-indigo-500" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 text-sm">{att.file_name || 'Unnamed Document'}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Version {att.version}</div>
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-600">
                      {typeName}
                    </td>
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-2 text-slate-600 mb-1">
                        <Calendar className="h-4 w-4 text-slate-400" /> Uploaded: {att.date_uploaded || '-'}
                      </div>
                      {att.has_expiration === 1 ? (
                        <div className={`flex items-center gap-2 text-xs font-bold ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                          <AlertCircle className="h-3.5 w-3.5" /> 
                          {isExpired ? 'Expired: ' : 'Expires: '} {att.expiration_date}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 ml-6">No Expiration</div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {att.file_path && (
                        <a href={`${API_URL}${att.file_path}`} target="_blank" rel="noopener noreferrer" title="Download File" className="inline-block p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                          <Download className="h-5 w-5" />
                        </a>
                      )}
                      <button onClick={() => openModal(att)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors ml-1"><Edit2 className="h-5 w-5" /></button>
                      <button onClick={() => handleDelete(att.attachments_id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors ml-1"><Trash2 className="h-5 w-5" /></button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="font-bold text-xl text-slate-800">{editingId ? 'Edit Document' : 'Upload Document'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="h-6 w-6" /></button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6">
              
              {/* FILE UPLOAD UI */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer relative">
                <input type="file" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                  <UploadCloud className="h-6 w-6 text-indigo-600" />
                </div>
                {selectedFile ? (
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 mt-1">Ready to upload</p>
                  </div>
                ) : formData.file_path ? (
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">Current file exists</p>
                    <p className="text-xs text-slate-500 mt-1">Click to replace file</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-700">Click to select a file</p>
                    <p className="text-xs text-slate-500 mt-1">PDF, DOCX, XLSX, JPG, PNG</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Document Name *</label>
                  <input required type="text" value={formData.file_name} onChange={e => setFormData({...formData, file_name: e.target.value})} placeholder="e.g. Employee Handbook" className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Version</label>
                  <input type="text" value={formData.version} onChange={e => setFormData({...formData, version: e.target.value})} placeholder="e.g. 1.0 or 2026-Rev" className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">File Type</label>
                  <select value={formData.attachment_file_type_id} onChange={e => setFormData({...formData, attachment_file_type_id: parseInt(e.target.value)})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm bg-white">
                    <option value="0">Select Type...</option>
                    {/* Maps over your existing attachment types payload */}
                    {attachmentTypes.map(t => <option key={t.id || t.type_id} value={t.id || t.type_id}>{t.type_name || t.name || t.type}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Date Uploaded *</label>
                  <input required type="date" value={formData.date_uploaded} onChange={e => setFormData({...formData, date_uploaded: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <label className="flex items-center gap-3 cursor-pointer w-max mb-4">
                  <input type="checkbox" checked={formData.has_expiration === 1} onChange={e => setFormData({...formData, has_expiration: e.target.checked ? 1 : 0})} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm font-bold text-slate-700">Document has an expiration date</span>
                </label>

                {formData.has_expiration === 1 && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Expiration Date *</label>
                    <input required={formData.has_expiration === 1} type="date" value={formData.expiration_date} onChange={e => setFormData({...formData, expiration_date: e.target.value})} className="w-full max-w-xs p-2.5 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 text-sm" />
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-md">
                  {editingId ? 'Save Changes' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}