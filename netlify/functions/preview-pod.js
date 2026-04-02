// netlify/functions/preview-pod.js
//
// Sends a preview POD email to jon@handslogistics.com ONLY.
// Photos are already uploaded to Cloudinary by the client before calling this.
// Does NOT write to monday, does NOT send to the client.
// The [PREVIEW] banner in the email makes it clear this is an internal check.
//
// Required env vars: MONDAY_TOKEN, RESEND_KEY

const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const RESEND_KEY   = process.env.RESEND_KEY;
const PREVIEW_TO   = ['jon@handslogistics.com', 'charles@handslogistics.com'];
const FROM         = 'HANDS Logistics <concierge@handslogistics.com>';
const GREEN        = '#a0d6b4';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
};

async function mondayQuery(query) {
  const res = await fetch('https://api.monday.com/v2', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': MONDAY_TOKEN,
      'API-Version':   '2023-04'
    },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error('monday API error: ' + res.status);
  const data = await res.json();
  if (data.errors) throw new Error('monday: ' + JSON.stringify(data.errors));
  return data;
}

function getCol(columns, id) {
  const col = columns.find(c => c.id === id);
  return (col && col.text && col.text.trim()) ? col.text.trim() : '';
}

function getLinkUrl(columns, id) {
  const col = columns.find(c => c.id === id);
  if (!col || !col.value) return '';
  try { return JSON.parse(col.value).url || ''; } catch(e) { return getCol(columns, id); }
}

function infoRow(label, value, border) {
  var bdr = border !== false ? 'border-bottom:1px solid #e0e0e0;' : '';
  return '<tr>' +
    '<td style="padding:11px 18px;font-size:12px;color:#888;' + bdr + 'width:38%;text-transform:uppercase;letter-spacing:0.5px;">' + label + '</td>' +
    '<td style="padding:11px 18px;font-size:13px;color:#0a0a0a;' + bdr + '">' + (value || '—') + '</td>' +
  '</tr>';
}

function stripe() {
  return '<tr><td width="68%" height="3" style="background:#1a1a1a;font-size:0;line-height:0;">&nbsp;</td>' +
         '<td width="32%" height="3" style="background:' + GREEN + ';font-size:0;line-height:0;">&nbsp;</td></tr>';
}

function photoButton(label, url) {
  if (!url) return '';
  return '<td style="padding:0 8px;">' +
    '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="background:' + GREEN + ';border-radius:8px;text-align:center;">' +
        '<a href="' + url + '" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#0a0a0a;text-decoration:none;letter-spacing:1px;text-transform:uppercase;">' + label + '</a>' +
      '</td>' +
    '</tr></table>' +
  '</td>';
}

function buildPreviewEmail(fields) {
  var { pulseId, clientName, account, projectName, receivedBy, description,
        deliveryDate, deliveryTime, deliveryAddress, photoUrl, photoUrl2, clientEmail } = fields;

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
  '<body style="margin:0;padding:0;background:#f2f2f2;font-family:Arial,sans-serif;">' +
  '<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 0;">' +
  '<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;max-width:600px;border-radius:8px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">' +

  // ── PREVIEW BANNER ──────────────────────────────────────────
  '<tr><td style="background:#f5a623;padding:14px 40px;text-align:center;">' +
    '<p style="margin:0;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#fff;">&#128064; PREVIEW — Not sent to client yet</p>' +
    '<p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.85);">Client: <strong>' + (clientEmail || 'No email on file') + '</strong></p>' +
  '</td></tr>' +

  // Header
  '<tr><td style="background:#0a0a0a;padding:32px 40px 28px;">' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td><img src="https://res.cloudinary.com/dxkpbjicu/image/upload/v1774556178/HANDS_Logo_BlackBG_HiRes_qtkac8.png" alt="HANDS Logistics" width="145" style="display:block;border:0;"></td>' +
      '<td align="right"><p style="margin:0;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#555;">Brand Activations<br>Concierge Logistics</p></td>' +
    '</tr></table>' +
    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">' + stripe() + '</table>' +
  '</td></tr>' +

  // Banner
  '<tr><td style="background:' + GREEN + ';padding:14px 40px;text-align:center;">' +
    '<p style="margin:0;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#0a0a0a;">Proof of Delivery</p>' +
  '</td></tr>' +

  // Body
  '<tr><td style="padding:36px 40px 0;">' +
    '<h1 style="margin:0 0 28px;font-size:28px;font-weight:800;color:#0a0a0a;text-align:center;">PO #' + pulseId + '</h1>' +
    '<p style="margin:0 0 28px;font-size:14px;color:#444;line-height:1.6;">This email confirms your delivery has been completed successfully. Please retain this document for your records.</p>' +

    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #d0d0d0;border-radius:6px;overflow:hidden;">' +
      '<tr><td colspan="2" style="background:#e2e2e2;padding:10px 18px;border-bottom:1px solid #d0d0d0;">' +
        '<p style="margin:0;font-size:9.5px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:' + GREEN + ';">01 &mdash; Order Information</p>' +
      '</td></tr>' +
      infoRow('Client',       clientName) +
      infoRow('Account',      account) +
      infoRow('PO Number',    pulseId) +
      infoRow('Project Name', projectName) +
      infoRow('Received By',  receivedBy, false) +
    '</table>' +

    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #d0d0d0;border-radius:6px;overflow:hidden;">' +
      '<tr><td style="background:#e2e2e2;padding:10px 18px;border-bottom:1px solid #d0d0d0;">' +
        '<p style="margin:0;font-size:9.5px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:' + GREEN + ';">02 &mdash; Items Delivered</p>' +
      '</td></tr>' +
      '<tr><td style="padding:16px 18px;font-size:13px;color:#0a0a0a;line-height:1.9;white-space:pre-line;">' + (description || 'See order details on file.') + '</td></tr>' +
    '</table>' +

    '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border:1px solid #d0d0d0;border-radius:6px;overflow:hidden;">' +
      '<tr><td colspan="2" style="background:#e2e2e2;padding:10px 18px;border-bottom:1px solid #d0d0d0;">' +
        '<p style="margin:0;font-size:9.5px;font-weight:900;letter-spacing:3px;text-transform:uppercase;color:' + GREEN + ';">03 &mdash; Delivery Details</p>' +
      '</td></tr>' +
      infoRow('Date Delivered',   deliveryDate) +
      infoRow('Delivery Time',    deliveryTime) +
      infoRow('Delivery Address', deliveryAddress, false) +
    '</table>' +

    (photoUrl || photoUrl2 ? (
      '<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;"><tr><td align="center">' +
        '<table cellpadding="0" cellspacing="0"><tr>' +
          photoButton('View Photo 1', photoUrl) +
          photoButton('View Photo 2', photoUrl2) +
        '</tr></table>' +
      '</td></tr></table>'
    ) : '') +

  '</td></tr>' +

  '<tr><td style="background:#e8e8e8;padding:20px 40px;border-top:1px solid #d5d5d5;">' +
    '<p style="margin:0;font-size:12px;color:#888;line-height:1.7;text-align:center;">' +
      'Please contact <a href="mailto:concierge&#64;handslogistics.com" style="color:' + GREEN + ';text-decoration:none;">concierge&#64;handslogistics.com</a> with any discrepancies within 48 hours.' +
    '</p>' +
  '</td></tr>' +

  '<tr><td style="padding:0;font-size:0;">' +
    '<table width="100%" cellpadding="0" cellspacing="0">' + stripe() + '</table>' +
    '<table width="100%" cellpadding="0" cellspacing="0"><tr>' +
      '<td style="background:#0a0a0a;padding:24px 40px;">' +
        '<p style="margin:0;font-size:9px;letter-spacing:1px;color:#444;line-height:2;">' +
          'HANDS Logistics &nbsp;&middot;&nbsp; concierge&#64;handslogistics.com &nbsp;&middot;&nbsp; Las Vegas, NV 89139' +
        '</p>' +
      '</td>' +
    '</tr></table>' +
  '</td></tr>' +

  '</table></td></tr></table>' +
  '</body></html>';
}

exports.handler = async function(event) {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST')    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const body = JSON.parse(event.body);
    const { itemId, photoUrl, photoUrl2, receivedBy } = body;
    if (!itemId) throw new Error('Missing itemId');

    // Fetch item data from monday
    const query = `{ items (ids: [${itemId}]) { id name column_values { id type text value } } }`;
    const data  = await mondayQuery(query);
    if (!data.data.items || !data.data.items.length) throw new Error('Item not found');
    const item    = data.data.items[0];
    const columns = item.column_values;

    const pulseId         = item.id;
    const clientName      = getCol(columns, 'text')          || 'Valued Client';
    const account         = getCol(columns, 'text4')         || '';
    const projectName     = getCol(columns, 'text5')         || '';
    const deliveryDate    = getCol(columns, 'text2')         || 'TBD';
    const deliveryTime    = getCol(columns, 'text9')         || 'TBD';
    const deliveryAddress = getCol(columns, 'long_text8')    || 'N/A';
    const description     = getCol(columns, 'long_text')     || 'See order details on file.';
    const clientEmail     = getCol(columns, 'client_email1') || '';

    const photo1 = photoUrl  || getLinkUrl(columns, 'link_mm1pgr61');
    const photo2 = photoUrl2 || getLinkUrl(columns, 'link_mm1pay5j');

    const subject   = '[PREVIEW] POD — PO #' + pulseId + ' | ' + projectName;
    const emailHtml = buildPreviewEmail({
      pulseId, clientName, account, projectName,
      receivedBy: receivedBy || 'Pending',
      description, deliveryDate, deliveryTime, deliveryAddress,
      photoUrl: photo1, photoUrl2: photo2, clientEmail
    });

    // Send ONLY to HANDS team
    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: PREVIEW_TO, subject, html: emailHtml })
    });

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ success: true, previewSentTo: PREVIEW_TO, clientEmail })
    };

  } catch (err) {
    console.error('preview-pod error:', err.message);
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};
