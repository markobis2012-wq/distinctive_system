'use client';

import { useState, useEffect, useRef, use } from 'react';
import { Search, Plus, Trash2, Edit2, X, FileSignature, ArrowLeft, Paperclip, FileText, Download } from 'lucide-react';
import Link from 'next/link';

// Copy your SearchableSelect component from the previous file here...
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
          <div className="p-2 border-b border-slate-200 bg-slate-50"><input autoFocus type="text" className="w-full p-1.5 border border-slate-300 rounded outline-none text-xs focus:ring-1 focus:ring-blue-500" placeholder="Type to search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
          <div className="overflow-y-auto flex-1">
            <div className="p-2 hover:bg-red-50 cursor-pointer text-slate-400 italic text-xs border-b border-slate-100" onClick={() => { onChange(""); setIsOpen(false); setSearchTerm(""); }}>Clear Selection</div>
            {filteredOptions.length > 0 ? filteredOptions.map((o: any) => (
              <div key={o.value} className="p-2 hover:bg-blue-50 cursor-pointer text-slate-700 truncate text-xs" onClick={() => { onChange(o.value); setIsOpen(false); setSearchTerm(""); }}>{o.label}</div>
            )) : <div className="p-3 text-slate-500 text-xs text-center italic">No results found</div>}
          </div>
        </div>
      )}
    </div>
  );
};

export default function EditBiddingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const biddingId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState('details');
  const [companies, setCompanies] = useState<any[]>([]);
  const [locations, setLocations] = useState<any>({ islands: [], regions: [], provinces: [], cities: [] });
  const [form, setForm] = useState<any>(null);

  // Attachment State
  const [attachments, setAttachments] = useState<any[]>([]);
  const [attachmentTypes, setAttachmentTypes] = useState<any[]>([]);
  const [isAttModalOpen, setIsAttModalOpen] = useState(false);
  const [attForm, setAttForm] = useState({ filename: '', bidding_attachment_file_type_id: 0 });
  const [attFile, setAttFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [compRes, locRes, bidRes, attRes, typesRes] = await Promise.all([
          fetch('http://localhost:8081/api/companies'),
          fetch('http://localhost:8081/api/locations'),
          fetch(`http://localhost:8081/api/biddings/${biddingId}`),
          fetch(`http://localhost:8081/api/biddings/${biddingId}/attachments`),
          fetch('http://localhost:8081/api/bidding-attachment-types')
        ]);
        if (compRes.ok) setCompanies(await compRes.json());
        if (locRes.ok) setLocations(await locRes.json());
        if (bidRes.ok) {
          const data = await bidRes.json();
          // Format datetimes for input type="datetime-local"
          const formatForInput = (dt: string) => dt && dt !== '0000-00-00 00:00:00' ? dt.replace(' ', 'T') : '';
          data.last_update_time = formatForInput(data.last_update_time);
          data.closing_date_time = formatForInput(data.closing_date_time);
          data.pre_bid_datetime = formatForInput(data.pre_bid_datetime);
          setForm(data);
        }
        if (attRes.ok) setAttachments(await attRes.json());
        if (typesRes.ok) setAttachmentTypes(await typesRes.json());
      } catch (err) {}
    };
    fetchAll();
  }, [biddingId]);

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8081/api/biddings/${biddingId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      });
      if (res.ok) alert("Saved successfully!");
    } catch (err) { alert("Error saving."); }
  };

  const handleSaveAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attFile || attForm.bidding_attachment_file_type_id === 0) return alert("File and File Type are required.");
    
    const formData = new FormData();
    formData.append("filename", attForm.filename || attFile.name);
    formData.append("bidding_attachment_file_type_id", String(attForm.bidding_attachment_file_type_id));
    formData.append("file", attFile);

    try {
      const res = await fetch(`http://localhost:8081/api/biddings/${biddingId}/attachments`, { method: 'POST', body: formData });
      if (res.ok) {
        setIsAttModalOpen(false); setAttFile(null); setAttForm({ filename: '', bidding_attachment_file_type_id: 0 });
        const attRes = await fetch(`http://localhost:8081/api/biddings/${biddingId}/attachments`);
        if (attRes.ok) setAttachments(await attRes.json());
      }
    } catch (err) {}
  };

  const handleDeleteAttachment = async (attId: number) => {
    if (!confirm("Delete this attachment?")) return;
    try {
      const res = await fetch(`http://localhost:8081/api/biddings/attachments/${attId}`, { method: 'DELETE' });
      if (res.ok) setAttachments(attachments.filter(a => a.bidding_attachments_id !== attId));
    } catch (err) {}
  };

  if (!form) return <div className="p-8">Loading...</div>;

  const statusOptions = ["New", "Prospecting", "Today", "Declined", "Under Evaluation", "Lost", "Awarded"];
  const categoryOptions = ["Furniture", "Blinds", "Medical Equipment", "Paper Supplies"];
  const tradeOptions = ["Implementing Rules and Regulations", "Foreign Donations"];
  const procurementOptions = ["Small Procurement", "Public Bidding", "Corporate Bidding"];
  const classificationOptions = ["Goods", "Services"];
  const companyOptions = companies.map(c => ({ value: c.company_id, label: c.company_name }));
  const islandOptions = locations.islands?.map((i: any) => ({ value: i.id, label: i.name })) || [];
  const formRegionOptions = locations.regions?.filter((r: any) => form.island_group_id ? r.island_group_id === form.island_group_id : true).map((r: any) => ({ value: r.id, label: r.name })) || [];
  const formProvinceOptions = locations.provinces?.filter((p: any) => form.region_id ? p.region_id === form.region_id : true).map((p: any) => ({ value: p.id, label: p.name })) || [];
  const formCityOptions = locations.cities?.filter((c: any) => form.province_id ? c.province_id === form.province_id : true).map((c: any) => ({ value: c.id, label: c.name })) || [];

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      <div className="bg-slate-900 text-white p-8 rounded-b-3xl shadow-md mb-8 px-8">
        <Link href="/admin/bidding" className="inline-flex items-center text-sm font-medium text-slate-400 hover:text-white mb-6 transition-colors"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Biddings</Link>
        <h1 className="text-3xl font-bold flex items-center gap-3"><FileSignature className="text-blue-500 h-8 w-8" /> Edit Bidding Record</h1>
        <p className="text-slate-400 mt-2">Ref: {form.reference_no} | Procuring Entity: {form.procuring_entity}</p>
      </div>

      <div className="w-full px-8"> {/* Changed to w-full and px-8 to align with header */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex border-b border-slate-200">
                {/* Tabs are here... */}
                <button onClick={() => setActiveTab('details')} className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'details' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}><FileText className="h-4 w-4" /> Bidding Details</button>
                <button onClick={() => setActiveTab('attachments')} className={`flex items-center gap-2 px-6 py-4 font-medium text-sm transition-colors border-b-2 ${activeTab === 'attachments' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}><Paperclip className="h-4 w-4" /> Attachments</button>
              </div>

          <div className="p-6">
                {activeTab === 'details' && (
                  <form onSubmit={handleSaveDetails} className="space-y-4 text-sm w-full"> {/* Changed max-w-4xl to w-full */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Type</label><select value={form.is_rfq} onChange={(e) => setForm({...form, is_rfq: parseInt(e.target.value)})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white"><option value={0}>Invitation To Bid</option><option value={1}>Request For Quotation</option></select></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Must Join</label><select value={form.must_join} onChange={(e) => setForm({...form, must_join: parseInt(e.target.value)})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white"><option value={0}>No</option><option value={1}>Yes</option></select></div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Reference No.</label><input type="text" value={form.reference_no} onChange={e => setForm({...form, reference_no: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Solicitation No.</label><input type="text" value={form.solicitation_no} onChange={e => setForm({...form, solicitation_no: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>
                <div className="flex items-center gap-4">
                  <label className="w-[16%] text-slate-600">Procuring Entity</label>
                  <div className="w-[84%]"><SearchableSelect options={companyOptions} value={form.client_id} onChange={(val: string) => { const comp = companies.find(c => String(c.company_id) === String(val)); if (comp) setForm({...form, client_id: comp.company_id, procuring_entity: comp.company_name}); else setForm({...form, client_id: 0, procuring_entity: ""}); }} /></div>
                </div>
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Title</label><input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none" /></div>
                <div className="flex items-start gap-4"><label className="w-[16%] text-slate-600 pt-2">Full Address</label><textarea rows={3} value={form.full_address} onChange={e => setForm({...form, full_address: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none resize-none" /></div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Island Group</label><div className="w-2/3"><SearchableSelect options={islandOptions} value={form.island_group_id} onChange={(val: string) => setForm({...form, island_group_id: parseInt(val) || 0, region_id: 0, province_id: 0, city_id: 0})} /></div></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Region</label><div className="w-2/3"><SearchableSelect options={formRegionOptions} value={form.region_id} onChange={(val: string) => setForm({...form, region_id: parseInt(val) || 0, province_id: 0, city_id: 0})} /></div></div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Province</label><div className="w-2/3"><SearchableSelect options={formProvinceOptions} value={form.province_id} onChange={(val: string) => setForm({...form, province_id: parseInt(val) || 0, city_id: 0})} /></div></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">City</label><div className="w-2/3"><SearchableSelect options={formCityOptions} value={form.city_id} onChange={(val: string) => setForm({...form, city_id: parseInt(val) || 0})} /></div></div>
                </div>

                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Trade Agreement</label><select value={form.trade_agreement} onChange={e => setForm({...form, trade_agreement: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none bg-white"><option value="">Select...</option>{tradeOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>

                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Procurement Mode</label><select value={form.procurement_mode} onChange={e => setForm({...form, procurement_mode: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white"><option value="">Select...</option>{procurementOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Classification</label><select value={form.classification} onChange={e => setForm({...form, classification: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white"><option value="">Select...</option>{classificationOptions.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none bg-white"><option value="">Select...</option>{categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Contact Numbers</label><input type="text" value={form.contact_numbers} onChange={e => setForm({...form, contact_numbers: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Approved Budget</label><input type="number" step="0.01" value={form.approved_budget} onChange={e => setForm({...form, approved_budget: parseFloat(e.target.value)})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Delivery Period</label><input type="text" value={form.delivery_period} onChange={e => setForm({...form, delivery_period: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>

                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Date Published</label><input type="date" value={form.date_published} onChange={e => setForm({...form, date_published: e.target.value})} className="w-[31.5%] p-2 border border-slate-300 rounded outline-none" /></div>
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Last Update Date/Time</label><input type="datetime-local" value={form.last_update_time} onChange={e => setForm({...form, last_update_time: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none" /></div>
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Closing Date/Time</label><input type="datetime-local" value={form.closing_date_time} onChange={e => setForm({...form, closing_date_time: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none" /></div>

                {/* Contacts */}
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Contact Person</label><input type="text" value={form.contact_person} onChange={e => setForm({...form, contact_person: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none" /></div>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Contact Person Dept.</label><input type="text" value={form.contact_person_dept} onChange={e => setForm({...form, contact_person_dept: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                  <div className="flex items-center gap-4"><label className="w-1/3 text-slate-600">Contact Number</label><input type="text" value={form.contact_number} onChange={e => setForm({...form, contact_number: e.target.value})} className="w-2/3 p-2 border border-slate-300 rounded outline-none" /></div>
                </div>
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-[31.5%] p-2 border border-slate-300 rounded outline-none" /></div>

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
                
                <div className="flex items-center gap-4"><label className="w-[16%] text-slate-600">Status</label><select value={form.itb_status} onChange={e => setForm({...form, itb_status: e.target.value})} className="w-[84%] p-2 border border-slate-300 rounded outline-none bg-white">{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div>

                <div className="flex justify-end pt-4"><button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">Save Changes</button></div>
              </form>
            )}

            {activeTab === 'attachments' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800">Attachments</h3>
                  <button onClick={() => setIsAttModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 text-sm"><Plus className="h-4 w-4" /> Upload</button>
                </div>
                <table className="w-full text-left text-sm text-slate-600 border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">File Type</th><th className="px-4 py-3 font-medium">Filename</th><th className="px-4 py-3 font-medium text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {attachments.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-slate-400">No attachments found.</td></tr> : attachments.map(a => (
                      <tr key={a.bidding_attachments_id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">{a.date_attached}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{a.bidding_attachment_file_type}</td>
                        <td className="px-4 py-3">{a.filename}</td>
                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                          {a.file_path && <a href={`http://localhost:8081${a.file_path}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 p-1"><Download className="h-4 w-4" /></a>}
                          <button onClick={() => handleDeleteAttachment(a.bidding_attachments_id)} className="text-red-600 hover:text-red-800 p-1"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {isAttModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-800">Upload Attachment</h3>
              <button onClick={() => setIsAttModalOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleSaveAttachment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File Type *</label>
                <select required value={attForm.bidding_attachment_file_type_id} onChange={e => setAttForm({...attForm, bidding_attachment_file_type_id: parseInt(e.target.value)})} className="w-full p-2 border border-slate-300 rounded text-sm bg-white outline-none">
                  <option value={0}>Select type...</option>
                  {attachmentTypes.map(t => <option key={t.bidding_attachment_file_type_id} value={t.bidding_attachment_file_type_id}>{t.bidding_attachment_file_type}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
                <input required type="file" onChange={e => setAttFile(e.target.files ? e.target.files[0] : null)} className="w-full p-2 border border-slate-300 rounded text-sm outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Display Filename</label>
                <input type="text" placeholder="(Optional) Defaults to original filename" value={attForm.filename} onChange={e => setAttForm({...attForm, filename: e.target.value})} className="w-full p-2 border border-slate-300 rounded text-sm outline-none" />
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setIsAttModalOpen(false)} className="px-4 py-2 border rounded text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Upload</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}