'use client';

import { useEffect, useState, use } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function PrintDRPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const deliveryId = resolvedParams.id;

  const [delivery, setDelivery] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Extract query params from the URL (from the Print Options modal)
  const [queryParams, setQueryParams] = useState<any>({});

  useEffect(() => {
    // Read the query parameters safely on the client side
    const urlParams = new URLSearchParams(window.location.search);
    setQueryParams({
      printer: urlParams.get('printer') || 'inkjet',
      dr_no: urlParams.get('dr') || '',
      address: urlParams.get('address') || '',
      person: urlParams.get('person') || '',
      contact: urlParams.get('contact') || '',
      limit: parseInt(urlParams.get('limit') || '5', 10),
    });

    const fetchData = async () => {
      try {
        const drRes = await fetch(`${API_URL}/api/deliveries/${deliveryId}`);
        if (drRes.ok) setDelivery(await drRes.json());

        const itemsRes = await fetch(`${API_URL}/api/deliveries/${deliveryId}/items`);
        if (itemsRes.ok) setItems(await itemsRes.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [deliveryId]);

  // Auto-trigger the print dialog once the data is loaded
  useEffect(() => {
    if (!loading && delivery) {
      setTimeout(() => {
        window.print();
      }, 500); // 500ms delay to ensure images load
    }
  }, [loading, delivery]);

  if (loading) return <div className="p-8 text-center">Preparing Document...</div>;
  if (!delivery) return <div className="p-8 text-center text-red-600">Error loading document.</div>;

  // Chunk items into pages based on the modal limit
  const pages = [];
  for (let i = 0; i < items.length; i += queryParams.limit) {
    pages.push(items.slice(i, i + queryParams.limit));
  }
  if (pages.length === 0) pages.push([]); // Ensure at least one blank page prints

  // Shared Header Data mapped from your PHP logic
  const projectNumber = delivery.project_number;
  const deliveryNo = queryParams.dr_no || delivery.delivery_no;
  const deliveryDate = delivery.delivery_date;
  const companyName = delivery.company_name;
  const fullAddress = queryParams.address;
  const contactPerson = queryParams.person;
  const contactNumber = queryParams.contact;

  return (
    <div className="bg-white min-h-screen text-black" style={{ fontFamily: 'sans-serif' }}>
      
      {/* Global CSS specifically for A3 Print formatting to match DOMPDF behavior */}
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A3 portrait; margin: 0; }
        body { margin: 0; padding: 0; }
        .page-break { page-break-after: always; }
        @media print {
          nav, header, footer, button { display: none !important; }
        }
      `}} />

      {pages.map((pageItems, pageIndex) => (
        <div key={pageIndex} className="page-break" style={{ position: 'relative', width: '100%', padding: '20px' }}>
          
          {/* ----- INKJET / DOTMATRIX HEADER SPACING ----- */}
          <div style={{ height: queryParams.printer === 'inkjet' ? '170px' : '175px' }}></div>
          
          <div style={{ fontSize: '16px', width: '100px', padding: '10px', display: 'inline-block' }}></div>
          <div style={{ fontSize: '16px', width: queryParams.printer === 'inkjet' ? '360px' : '360px', padding: '10px', display: 'inline-block' }}>{projectNumber}</div>
          <div style={{ fontSize: '16px', width: '280px', padding: '10px', display: 'inline-block' }}><b>{deliveryNo}</b></div>
          <div style={{ fontSize: '16px', width: '80px', padding: '10px', display: 'inline-block' }}>{deliveryDate}</div>
          
          {queryParams.printer === 'inkjet' ? (
            <>
              <div style={{ height: '5px' }}></div>
              <div style={{ fontSize: '16px', width: '100px', padding: '10px', display: 'inline-block' }}></div>
              <div style={{ fontSize: '16px', width: '1000px', padding: '10px', display: 'inline-block' }}>{fullAddress}</div>
              <div></div>
              <div style={{ fontSize: '16px', width: '100px', padding: '25px', display: 'inline-block' }}></div>
              <div style={{ fontSize: '16px', width: '742px', padding: '10px', display: 'inline-block' }}>{companyName}</div>
              <div></div>
              <div style={{ fontSize: '16px', width: '100px', padding: '25px', display: 'inline-block' }}></div>
              <div style={{ fontSize: '16px', width: '1000px', padding: '10px', display: 'inline-block' }}>{fullAddress}</div>
              <div></div>
              <div style={{ fontSize: '16px', width: '100px', padding: '10px', display: 'inline-block' }}></div>
              <div style={{ fontSize: '16px', width: '600px', padding: '10px', display: 'inline-block' }}>{contactPerson}</div>
              <div style={{ fontSize: '16px', width: '100px', padding: '10px', display: 'inline-block' }}>{contactNumber}</div>
              <div style={{ height: '70px' }}></div>
            </>
          ) : (
            <>
              {/* Dot Matrix Specific Layout */}
              <div style={{ fontSize: '18px', width: '1000px', padding: '10px', position: 'relative', top: '-35px', left: '120px' }}>{fullAddress}</div>
              <div style={{ fontSize: '18px', width: '742px', padding: '10px', position: 'relative', top: '-40px', left: '120px' }}>{companyName}</div>
              <div style={{ fontSize: '18px', width: '1000px', padding: '10px', position: 'relative', top: '-40px', left: '120px' }}>{fullAddress}</div>
              <div style={{ fontSize: '18px', width: '600px', padding: '10px', position: 'relative', top: '-40px', left: '120px' }}>{contactPerson}</div>
              <div style={{ fontSize: '18px', width: '100px', padding: '10px', position: 'relative', top: '-80px', left: '750px' }}>{contactNumber}</div>
              <div style={{ height: '70px' }}></div>
            </>
          )}

          {/* ----- ITEMS LIST ----- */}
          {pageItems.map((item, index) => (
            <div key={item.delivery_item_id} style={{ fontSize: '14px', width: '1018px', display: 'flex', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{ width: '20px', padding: '5px' }}></div>
              <div style={{ width: '42px', padding: '5px' }}>{(pageIndex * queryParams.limit) + index + 1}</div>
              <div style={{ width: '200px', padding: '5px' }}>{item.product_name}</div>
              {/* Product description / remarks */}
              <div style={{ width: '420px', padding: '5px' }}>{item.remarks || '-'}</div>
              {/* Product Image */}
              <div style={{ width: '210px', padding: '5px' }}>
                {item.dbos_image_path && (
                  <img src={`${API_URL}${item.dbos_image_path}`} style={{ width: '180px', objectFit: 'contain' }} alt="" />
                )}
              </div>
              <div style={{ width: '80px', padding: '5px' }}>{item.deliver_qty} {item.uom_abbr}</div>
            </div>
          ))}

          {/* ----- SIGNATORIES (Only prints on the LAST page) ----- */}
          {pageIndex === pages.length - 1 && (
            <div style={{ marginTop: '20px', width: '1010px', boxSizing: 'border-box' }}>
              
              {/* Header - Forced background color for printing */}
              <div style={{ 
                fontSize: '16px', 
                border: '1px solid #888', 
                backgroundColor: '#b3b3b3', 
                WebkitPrintColorAdjust: 'exact', 
                printColorAdjust: 'exact', 
                textAlign: 'center', 
                padding: '5px',
                color: '#000'
              }}>
                <b>SIGNATORIES / APPROVALS (Indicate date signed)</b>
              </div>

              {/* Flex Container perfectly aligns columns without whitespace breaks */}
              <div style={{ display: 'flex', width: '1010px' }}>
                
                {/* Left Column */}
                <div style={{ width: '505px', borderLeft: '1px solid #888', borderBottom: '1px solid #888', borderRight: '1px solid #888', boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '14px', borderBottom: '1px solid #888', padding: '5px', textAlign: 'center' }}>
                    <b>Approved for Release</b>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ fontSize: '14px', borderBottom: '1px solid #888', borderRight: '1px solid #888', width: '50%', height: '50px', padding: '5px', verticalAlign: 'top' }}><b>Prepared by:</b></td>
                        <td style={{ fontSize: '14px', borderBottom: '1px solid #888', width: '50%', height: '50px', padding: '5px', verticalAlign: 'top' }}><b>Accounting:</b></td>
                      </tr>
                      <tr>
                        <td style={{ fontSize: '14px', borderBottom: '1px solid #888', borderRight: '1px solid #888', width: '50%', height: '50px', padding: '5px', verticalAlign: 'top' }}><b>Logistic:</b></td>
                        <td style={{ fontSize: '14px', borderBottom: '1px solid #888', width: '50%', height: '50px', padding: '5px', verticalAlign: 'top' }}><b>President/Manager:</b></td>
                      </tr>
                      <tr>
                        <td colSpan={2} style={{ fontSize: '14px', height: '50px', padding: '5px', verticalAlign: 'top' }}><b>DBOS Guard-on-duty:</b></td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Right Column */}
                <div style={{ width: '505px', borderBottom: '1px solid #888', borderRight: '1px solid #888', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                  <div style={{ fontSize: '14px', borderBottom: '1px solid #888', padding: '5px', textAlign: 'center' }}>
                    <b>Received in Good Condition by:</b>
                  </div>
                  <div style={{ height: '75px', position: 'relative', borderBottom: '1px solid #888', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ position: 'absolute', bottom: '10px', left: '10%', right: '10%', borderTop: '1px solid #888', textAlign: 'center', fontSize: '12px', paddingTop: '2px' }}>
                      <b>Signature over Printed Name of Entity Representative</b>
                    </div>
                  </div>
                  <div style={{ flex: 1, padding: '5px', fontSize: '14px', textAlign: 'left', minHeight: '80px' }}>
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