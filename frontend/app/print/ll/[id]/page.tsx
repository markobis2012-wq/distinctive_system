'use client';

import { useEffect, useState, use } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function PrintLoadingListPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const deliveryId = resolvedParams.id;

  const [delivery, setDelivery] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryParams, setQueryParams] = useState<any>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setQueryParams({
      headings: urlParams.get('headings') || 'Delivery Loading List',
      address: urlParams.get('address') || '',
      limit: parseInt(urlParams.get('limit') || '5', 10),
    });

    const fetchData = async () => {
      try {
        const drRes = await fetch(`${API_URL}/api/deliveries/${deliveryId}`);
        if (drRes.ok) setDelivery(await drRes.json());
        
        // UPDATED: Now fetches from the Unified Shipment Items endpoint!
        const itemsRes = await fetch(`${API_URL}/api/deliveries/${deliveryId}/items`);
        if (itemsRes.ok) setItems(await itemsRes.json());
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [deliveryId]);

  useEffect(() => {
    if (!loading && delivery) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, delivery]);

  if (loading) return <div className="p-8 text-center">Preparing Loading List...</div>;

  const pages = [];
  for (let i = 0; i < items.length; i += queryParams.limit) {
    pages.push(items.slice(i, i + queryParams.limit));
  }
  if (pages.length === 0) pages.push([]);

  return (
    <div className="bg-white min-h-screen text-black" style={{ fontFamily: 'sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A3 portrait; margin: 0; }
        body { margin: 0; padding: 0; }
        .page-break { page-break-after: always; }
        @media print { nav, header, footer, button { display: none !important; } }
      `}} />

      {pages.map((pageItems, pageIndex) => (
        <div key={pageIndex} className="page-break" style={{ position: 'relative', width: '100%', padding: '20px', boxSizing: 'border-box' }}>
          
          {/* HEADER */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ width: '200px' }}>
              <img src="/distinctive-logo.jpg" style={{ width: '200px' }} alt="Logo" />
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <b style={{ fontSize: '19px' }}>{queryParams.headings}</b><br/>
              <span style={{ fontSize: '14px' }}>(Internal DBOS Document)</span><br/>
              <span style={{ fontSize: '14px' }}>Loading List No. {delivery.delivery_no}</span>
            </div>
            <div style={{ width: '200px' }}></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: '5px', fontSize: '16px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid #888', padding: '10px' }}>Project Number:</div>
            <div style={{ border: '1px solid #888', padding: '10px' }}>{delivery.project_number}</div>
            <div style={{ border: '1px solid #888', padding: '10px' }}>Project Name:</div>
            <div style={{ border: '1px solid #888', padding: '10px' }}>{delivery.project_name}</div>
            <div style={{ border: '1px solid #888', padding: '10px' }}>Entity:</div>
            <div style={{ border: '1px solid #888', padding: '10px' }}>{delivery.company_name}</div>
            <div style={{ border: '1px solid #888', padding: '10px' }}>Project Address:</div>
            <div style={{ border: '1px solid #888', padding: '10px' }}>{queryParams.address}</div>
            <div style={{ border: '1px solid #888', padding: '10px' }}>Delivery Date:</div>
            <div style={{ border: '1px solid #888', padding: '10px' }}>{delivery.delivery_date}</div>
          </div>

          {/* ITEMS TABLE */}
          <div style={{ display: 'flex', fontSize: '14px', border: '1px solid #888', backgroundColor: '#f0f0f0', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', fontWeight: 'bold', textAlign: 'center' }}>
            {/* CHANGED: "No." is now "Load" */}
            <div style={{ width: '50px', padding: '5px', borderRight: '1px solid #888' }}>Load</div>
            <div style={{ width: '140px', padding: '5px', borderRight: '1px solid #888' }}>Item Image</div>
            <div style={{ width: '150px', padding: '5px', borderRight: '1px solid #888' }}>Item Desc</div>
            <div style={{ width: '240px', padding: '5px', borderRight: '1px solid #888' }}>Component Description</div>
            <div style={{ width: '140px', padding: '5px', borderRight: '1px solid #888' }}>Component Image</div>
            <div style={{ width: '100px', padding: '5px', borderRight: '1px solid #888' }}>QTY</div>
            <div style={{ flex: 1, padding: '5px', fontSize: '10px' }}>Remarks on Progression</div>
          </div>

          {pageItems.map((item, index) => {
            return (
              <div key={item.loading_list_id || index} style={{ display: 'flex', fontSize: '14px', border: '1px solid #888', borderTop: 'none', minHeight: '60px', alignItems: 'center' }}>
                {/* CHANGED: ADDED THE WAREHOUSE CHECKBOX */}
                <div style={{ width: '50px', padding: '5px', borderRight: '1px solid #888', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '20px', height: '20px', border: '2px solid #555', backgroundColor: '#fff', borderRadius: '3px' }}></div>
                </div>
                
                <div style={{ width: '140px', padding: '5px', borderRight: '1px solid #888', textAlign: 'center' }}>
                  {item.dbos_image_path && <img src={`${API_URL}${item.dbos_image_path}`} style={{ width: '100px', maxHeight: '100px', objectFit: 'contain' }} alt="" />}
                </div>
                <div style={{ width: '150px', padding: '5px', borderRight: '1px solid #888' }}>{item.product_name}<br/><span style={{ fontSize:'10px' }}>{item.product_description}</span></div>
                <div style={{ width: '240px', padding: '5px', borderRight: '1px solid #888' }}><b>{item.supplier_product_name || item.item_name}</b><br/>{item.prod_description}</div>
                <div style={{ width: '140px', padding: '5px', borderRight: '1px solid #888', textAlign: 'center' }}>
                  {item.product_image && <img src={`${API_URL}/uploads/suppliers_product_images/${item.product_image}`} style={{ width: '100px', maxHeight: '100px', objectFit: 'contain' }} alt="" />}
                </div>
                <div style={{ width: '100px', padding: '5px', borderRight: '1px solid #888', textAlign: 'center', fontWeight: 'bold' }}>{item.item_qty || item.qty}</div>
                <div style={{ flex: 1, padding: '5px' }}>{item.remarks}</div>
              </div>
            );
          })}

          {/* SIGNATORIES (Untouched to match your exact corporate layout) */}
          {pageIndex === pages.length - 1 && (
            <div style={{ marginTop: '20px', border: '1px solid #888' }}>
              <div style={{ fontSize: '16px', backgroundColor: '#b3b3b3', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', textAlign: 'center', padding: '5px', borderBottom: '1px solid #888', color: '#000' }}>
                <b>SIGNATORIES / APPROVALS (Indicate date signed)</b>
              </div>
              <div style={{ display: 'flex' }}>
                <div style={{ flex: 1, borderRight: '1px solid #888', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ borderBottom: '1px solid #888', padding: '5px', textAlign: 'center' }}><b>Approved for Release</b></div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {['Prepared by:', 'Accounting:', 'Logistic:', 'Design & Furniture Dept.:', 'President/Manager:', 'DBOS Guards-on-duty:', 'DBOS Driver:', 'Vehicle Plate No.:'].map((label, i) => (
                      <div key={label} style={{ width: '50%', borderBottom: i < 6 ? '1px solid #888' : 'none', borderRight: i % 2 === 0 ? '1px solid #888' : 'none', padding: '5px', minHeight: '50px' }}>
                        <b>{label}</b>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ borderBottom: '1px solid #888', padding: '5px', textAlign: 'center' }}><b>Received in Good Condition by:</b></div>
                  <div style={{ height: '80px', position: 'relative', borderBottom: '1px solid #888' }}>
                    <div style={{ position: 'absolute', bottom: '10px', left: '10%', right: '10%', borderTop: '1px solid #888', textAlign: 'center', fontSize: '12px', paddingTop: '5px' }}>
                      <b>Signature over Printed Name of Entity Representative</b>
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '5px', minHeight: '100px' }}>
                    <b>Remarks:</b>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}