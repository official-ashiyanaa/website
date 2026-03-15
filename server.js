require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(express.static("./"));
app.use(bodyParser.json());

let sheetUrlCache = process.env.GOOGLE_SHEET_URL || '';

function formatTimestamp(d = new Date()) {
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mon = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  const hrs = String(hours).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${mon}/${year} ${hrs}:${mins}:${secs} ${ampm}`;
}

function getSheetIdFromUrl(url) {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

async function appendToGoogleSheet(rowValues) {
  const sheetUrl = sheetUrlCache;
  const sheetId = getSheetIdFromUrl(sheetUrl);
  if (!sheetId) {
    console.warn('GOOGLE_SHEET_URL not configured or invalid, skipping sheet append.');
    return;
  }

  // Prefer loading full service account JSON from file to avoid key formatting issues.
  let serviceAccountJson;
  try {
    // Path is relative to server.js
    // eslint-disable-next-line global-require, import/no-dynamic-require
    serviceAccountJson = require('./peak-castle-490314-n4-f7221ea7cc77.json');
  } catch (e) {
    serviceAccountJson = null;
  }

  const credentials = serviceAccountJson || {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
  };

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const headerRange = 'Sheet1!A1:Z1';
  const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: headerRange });
  const headerRow = headerRes.data.values && headerRes.data.values[0];
  if (!headerRow || headerRow.length === 0) {
    const headers = ['Timestamp', 'Name', 'Phone', 'Email', 'Project / Interested In', 'Message'];
    await sheets.spreadsheets.values.append({ spreadsheetId: sheetId, range: headerRange, valueInputOption: 'USER_ENTERED', requestBody: { values: [headers] } });
  }
  await sheets.spreadsheets.values.append({ spreadsheetId: sheetId, range: 'Sheet1!A:Z', valueInputOption: 'USER_ENTERED', requestBody: { values: [rowValues] } });
}

function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// ─── Email Templates ───

function clientConfirmationEmail(name, phone, email, project) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thank You – Ashiyanaa Constructions</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1120;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0B1120;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header / Logo Band -->
          <tr>
            <td style="background:linear-gradient(135deg,#0B1120 0%,#111827 100%);border-radius:16px 16px 0 0;padding:36px 40px 28px;text-align:center;border-top:3px solid #C9A84C;">
              <div style="display:inline-block;margin-bottom:10px;">
                <span style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#C9A84C;font-weight:600;">EST. IN EXCELLENCE</span>
              </div>
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#F0EDE5;letter-spacing:0.04em;">ASHIYANAA</h1>
              <p style="margin:4px 0 0;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#C9A84C;font-weight:500;">CONSTRUCTIONS</p>
              <!-- Gold divider -->
              <div style="margin:20px auto 0;width:60px;height:2px;background:linear-gradient(90deg,transparent,#C9A84C,transparent);"></div>
            </td>
          </tr>

          <!-- Hero Message -->
          <tr>
            <td style="background:#111827;padding:36px 40px 28px;text-align:center;">
              <p style="margin:0 0 10px;font-size:13px;letter-spacing:0.15em;text-transform:uppercase;color:#C9A84C;font-weight:600;">ENQUIRY RECEIVED</p>
              <h2 style="margin:0 0 16px;font-size:24px;color:#F0EDE5;font-weight:600;line-height:1.4;">Thank you, ${name}.</h2>
              <p style="margin:0;font-size:15px;color:#9CA3AF;line-height:1.7;max-width:440px;margin:0 auto;">
                We've received your enquiry and our team is already reviewing your requirements. 
                Expect to hear from us within <strong style="color:#C9A84C;">24 hours</strong>.
              </p>
            </td>
          </tr>

          <!-- Details Card -->
          <tr>
            <td style="background:#111827;padding:0 40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#0B1120;border-radius:12px;border:1px solid rgba(201,168,76,0.2);overflow:hidden;">
                <tr>
                  <td style="padding:18px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;font-weight:600;">YOUR ENQUIRY SUMMARY</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                          <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;display:block;margin-bottom:3px;">Full Name</span>
                          <span style="font-size:14px;color:#F0EDE5;font-weight:500;">${name}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                          <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;display:block;margin-bottom:3px;">Phone</span>
                          <span style="font-size:14px;color:#F0EDE5;font-weight:500;">${phone}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                          <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;display:block;margin-bottom:3px;">Email</span>
                          <span style="font-size:14px;color:#F0EDE5;font-weight:500;">${email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;display:block;margin-bottom:3px;">Interested In</span>
                          <span style="font-size:14px;color:#C9A84C;font-weight:600;">${project}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- What Happens Next -->
          <tr>
            <td style="background:#111827;padding:0 40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:rgba(201,168,76,0.06);border-radius:12px;border:1px solid rgba(201,168,76,0.15);">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;font-weight:600;">WHAT HAPPENS NEXT</p>
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="28" valign="top" style="padding-top:1px;">
                          <div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#9A7A30);text-align:center;line-height:20px;font-size:10px;color:#fff;font-weight:700;">1</div>
                        </td>
                        <td style="padding-bottom:12px;padding-left:10px;">
                          <span style="font-size:13px;color:#D1D5DB;line-height:1.5;">Our team reviews your project requirements</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="28" valign="top" style="padding-top:1px;">
                          <div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#9A7A30);text-align:center;line-height:20px;font-size:10px;color:#fff;font-weight:700;">2</div>
                        </td>
                        <td style="padding-bottom:12px;padding-left:10px;">
                          <span style="font-size:13px;color:#D1D5DB;line-height:1.5;">A dedicated consultant will contact you within 24 hours</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="28" valign="top" style="padding-top:1px;">
                          <div style="width:20px;height:20px;border-radius:50%;background:linear-gradient(135deg,#C9A84C,#9A7A30);text-align:center;line-height:20px;font-size:10px;color:#fff;font-weight:700;">3</div>
                        </td>
                        <td style="padding-left:10px;">
                          <span style="font-size:13px;color:#D1D5DB;line-height:1.5;">We'll schedule a consultation at your convenience</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="background:#111827;padding:0 40px 36px;text-align:center;">
              <a href="https://ashiyanaaconstruction.com" 
                style="display:inline-block;padding:13px 36px;background:linear-gradient(135deg,#C9A84C,#9A7A30);border-radius:999px;color:#fff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;">
                Visit Our Website
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0B1120;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid rgba(201,168,76,0.15);">
              <p style="margin:0 0 6px;font-size:12px;color:#6B7280;line-height:1.6;">
                Ashiyanaa Constructions &nbsp;|&nbsp; Building Dreams, Crafting Excellence
              </p>
              <p style="margin:0;font-size:11px;color:#374151;">
                © ${new Date().getFullYear()} Ashiyanaa Constructions. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function officeNotificationEmail(name, phone, email, project, message) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Enquiry – Ashiyanaa Constructions</title>
</head>
<body style="margin:0;padding:0;background-color:#0B1120;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0B1120;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0B1120 0%,#111827 100%);border-radius:16px 16px 0 0;padding:28px 40px 22px;border-top:3px solid #C9A84C;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <h1 style="margin:0;font-size:22px;font-weight:700;color:#F0EDE5;letter-spacing:0.04em;">ASHIYANAA CONSTRUCTIONS</h1>
                    <p style="margin:4px 0 0;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;color:#C9A84C;">Internal Notification</p>
                  </td>
                  <td align="right" valign="top">
                    <div style="background:rgba(201,168,76,0.15);border:1px solid rgba(201,168,76,0.4);border-radius:999px;padding:5px 14px;display:inline-block;">
                      <span style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C9A84C;">NEW LEAD</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Alert Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#C9A84C,#9A7A30);padding:12px 40px;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#fff;">
                🏠 New Website Enquiry — ${project}
              </p>
            </td>
          </tr>

          <!-- Client Details -->
          <tr>
            <td style="background:#111827;padding:28px 40px 20px;">
              <p style="margin:0 0 16px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;font-weight:600;">CLIENT DETAILS</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#0B1120;border-radius:10px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">
                <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                  <td width="140" style="padding:12px 16px;background:rgba(255,255,255,0.03);">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;font-weight:600;">Name</span>
                  </td>
                  <td style="padding:12px 16px;border-left:1px solid rgba(255,255,255,0.06);">
                    <span style="font-size:14px;color:#F0EDE5;font-weight:600;">${name}</span>
                  </td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                  <td width="140" style="padding:12px 16px;background:rgba(255,255,255,0.03);">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;font-weight:600;">Phone</span>
                  </td>
                  <td style="padding:12px 16px;border-left:1px solid rgba(255,255,255,0.06);">
                    <span style="font-size:14px;color:#F0EDE5;font-weight:500;">${phone}</span>
                  </td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                  <td width="140" style="padding:12px 16px;background:rgba(255,255,255,0.03);">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;font-weight:600;">Email</span>
                  </td>
                  <td style="padding:12px 16px;border-left:1px solid rgba(255,255,255,0.06);">
                    <a href="mailto:${email}" style="font-size:14px;color:#C9A84C;font-weight:500;text-decoration:none;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td width="140" style="padding:12px 16px;background:rgba(255,255,255,0.03);">
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;font-weight:600;">Interested In</span>
                  </td>
                  <td style="padding:12px 16px;border-left:1px solid rgba(255,255,255,0.06);">
                    <span style="font-size:14px;color:#C9A84C;font-weight:700;">${project}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Message -->
          <tr>
            <td style="background:#111827;padding:0 40px 28px;">
              <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#C9A84C;font-weight:600;">CLIENT MESSAGE</p>
              <div style="background:#0B1120;border-radius:10px;border:1px solid rgba(255,255,255,0.07);padding:18px 20px;border-left:3px solid #C9A84C;">
                <p style="margin:0;font-size:14px;color:#D1D5DB;line-height:1.8;">${message.replace(/\n/g, '<br/>')}</p>
              </div>
            </td>
          </tr>

          <!-- Quick Actions -->
          <tr>
            <td style="background:#111827;padding:0 40px 32px;text-align:center;">
              <table align="center" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px;">
                    <a href="tel:${phone}"
                      style="display:inline-block;padding:11px 28px;background:linear-gradient(135deg,#C9A84C,#9A7A30);border-radius:999px;color:#fff;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                      📞 Call Client
                    </a>
                  </td>
                  <td>
                    <a href="mailto:${email}"
                      style="display:inline-block;padding:11px 28px;background:transparent;border:1px solid rgba(201,168,76,0.5);border-radius:999px;color:#C9A84C;text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                      ✉️ Reply by Email
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0B1120;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid rgba(201,168,76,0.15);">
              <p style="margin:0 0 4px;font-size:11px;color:#6B7280;">
                This is an automated notification from the Ashiyanaa Constructions website.
              </p>
              <p style="margin:0;font-size:11px;color:#374151;">
                © ${new Date().getFullYear()} Ashiyanaa Constructions. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ─── Routes ───
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/enquiry', async (req, res) => {
  const { name, phone, email, project, message } = req.body || {};

  if (!name || !phone || !email || !project || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  try {
    const transporter = createTransport();

    // Email to user
    await transporter.sendMail({
      from: `"Ashiyanaa Constructions" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Thank you for your enquiry – Ashiyanaa Constructions',
      html: clientConfirmationEmail(name, phone, email, project),
    });

    // Email to office
    await transporter.sendMail({
      from: `"Ashiyanaa Website" <${process.env.SMTP_USER}>`,
      to: 'official@ashiyanaaconstruction.com',
      replyTo: email,
      subject: `New Website Enquiry – ${project} | ${name}`,
      html: officeNotificationEmail(name, phone, email, project, message),
    });

    // Append to Google Sheet (non-blocking)
    appendToGoogleSheet([
      formatTimestamp(),
      name,
      phone,
      email,
      project,
      message,
    ]).catch((err) => {
      console.error('Failed to append to Google Sheet', err);
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Enquiry handler error', err);
    res.status(500).json({ success: false, error: 'Failed to process enquiry' });
  }
});

// Simple admin page to set Google Sheet URL
app.get('/admin/sheet', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Configure Google Sheet</title>
      <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0B1120; color:#F0EDE5; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:16px; }
        .card { max-width:520px; width:100%; background:#111827; border-radius:12px; padding:24px 24px 20px; box-shadow:0 18px 45px rgba(0,0,0,0.7); border:1px solid rgba(201,168,76,0.25); }
        h1 { font-size:22px; margin:0 0 12px; }
        p { font-size:13px; color:#9CA3AF; margin:0 0 14px; }
        label { font-size:12px; text-transform:uppercase; letter-spacing:0.08em; color:#9CA3AF; display:block; margin-bottom:6px; }
        input[type="url"] { width:100%; padding:11px 12px; border-radius:8px; border:1px solid rgba(156,163,175,0.5); background:#020617; color:#F9FAFB; font-size:13px; }
        input[type="url"]:focus { outline:none; border-color:#C9A84C; box-shadow:0 0 0 1px rgba(201,168,76,0.4); }
        button { margin-top:14px; width:100%; padding:10px 16px; border-radius:999px; border:none; background:linear-gradient(135deg,#C9A84C,#9A7A30); color:white; font-weight:600; font-size:13px; letter-spacing:0.08em; text-transform:uppercase; cursor:pointer; }
        button:hover { transform:translateY(-1px); box-shadow:0 10px 30px rgba(201,168,76,0.45); }
        #status { margin-top:8px; font-size:12px; min-height:16px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Google Sheet URL</h1>
        <p>Paste the full URL of the Google Sheet where enquiries should be logged. Make sure the service account has edit access.</p>
        <label for="sheet-url">Sheet URL</label>
        <input type="url" id="sheet-url" placeholder="https://docs.google.com/spreadsheets/d/..." value="${sheetUrlCache || ''}" />
        <button id="save-btn">Save</button>
        <div id="status"></div>
      </div>
      <script>
        const input = document.getElementById('sheet-url');
        const statusEl = document.getElementById('status');
        document.getElementById('save-btn').addEventListener('click', async () => {
          const url = input.value.trim();
          statusEl.style.color = '#9CA3AF';
          statusEl.textContent = 'Saving...';
          try {
            const res = await fetch('/admin/sheet', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.success === false) throw new Error(data.error || 'Failed to save');
            statusEl.style.color = '#4ade80';
            statusEl.textContent = 'Saved successfully.';
          } catch (err) {
            statusEl.style.color = '#f97373';
            statusEl.textContent = 'Failed to save sheet URL.';
          }
        });
      </script>
    </body>
    </html>
  `);
});

app.post('/admin/sheet', (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }
  sheetUrlCache = url.trim();
  res.json({ success: true });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n  🏠 Ashiyanaa Constructions Server`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  → Running on http://localhost:${PORT}`);
  console.log(`  → Environment: ${process.env.NODE_ENV || 'development'}\n`);
});