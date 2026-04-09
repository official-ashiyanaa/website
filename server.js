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
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

const Project = require('./models/Project');
const Founder = require('./models/Founder');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'ashiyanaa_secret_2025';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Ashiyanaa@2025';

// ─── Ensure uploads dir exists ───
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─── Multer config ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    if (allowed.test(file.mimetype) && allowed.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ─── Middleware ───
app.use(compression());
app.use(cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(express.static('./', { index: false }));
app.use('/uploads', express.static(uploadsDir));
app.use(bodyParser.json());

// ─── MongoDB Connection ───
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('  ✅ MongoDB connected');
    await seedProjects();
    await seedFounders();
  })
  .catch(err => console.error('  ❌ MongoDB connection error:', err.message));

// ─── JWT Auth Middleware ───
function authenticateAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// ─── Seed Projects ───
async function seedProjects() {
  const count = await Project.countDocuments();
  if (count > 0) return;
  console.log('  🌱 Seeding initial projects...');

  const projects = [
    // Nagaon
    { name: 'Kalpana Sabhapandit', ownerName: 'Kalpana Sabhapandit', location: 'P.S. Road, Amolapatty, Nagaon', city: 'nagaon', type: 'residential', status: 'completed', completionPercent: 100, description: 'Major residential project completed in Nagaon. A landmark example of Ashiyanaa\'s commitment to quality construction and on-time delivery.', seriesLabel: 'Project 5 — Nagaon', displayOrder: 1 },
    { name: 'Nagaon Projects 6–14', ownerName: '', location: 'Nagaon, Assam', city: 'nagaon', type: 'residential', status: 'ongoing', description: 'A portfolio of 9 residential and commercial projects across Nagaon, including Projects 12, 13 & 14 — completed and actively under construction, shaping the city\'s skyline.', seriesLabel: 'Projects 6–14 — Nagaon', displayOrder: 2 },
    // Lumding
    { name: 'Ujjal Day', ownerName: 'Ujjal Day', location: 'Jhoolanpool Road, By Lane, Lumding', city: 'lumding', type: 'residential', status: 'ongoing', completionPercent: 95, description: 'Residential project nearing completion in Lumding. Delivering modern living spaces with quality craftsmanship in the heart of Lumding.', seriesLabel: 'Project 1 — Lumding', displayOrder: 3 },
    { name: 'Mrityunjay Kar', ownerName: 'Mrityunjay Kar', location: 'Lanka Road Tinali, By Lane, Lumding', city: 'lumding', type: 'residential', status: 'ongoing', completionPercent: 80, description: 'Residential project at 80% completion in Lumding, showcasing Ashiyanaa\'s signature quality in every detail.', seriesLabel: 'Project 2 — Lumding', displayOrder: 4 },
    { name: 'Munna Gupta', ownerName: 'Munna Gupta', location: 'Lanka Road, Lumding', city: 'lumding', type: 'residential', status: 'completed', completionPercent: 100, description: 'Successfully completed commercial-residential project in Lumding. A proud symbol of Ashiyanaa\'s promise of timely delivery.', seriesLabel: 'Project 3 — Lumding', displayOrder: 5 },
    { name: 'Japan Dutta', ownerName: 'Japan Dutta', location: 'Anand Polly, Lumding', city: 'lumding', type: 'residential', status: 'completed', description: 'Residential project completed at Anand Polly, Lumding.', seriesLabel: 'Project 4 — Lumding', displayOrder: 6 },
    { name: 'Babul Ghosh', ownerName: 'Babul Ghosh', location: 'Brahma Kumari Road, Lanka Road, Lumding', city: 'lumding', type: 'residential', status: 'completed', description: 'Residential project at Brahma Kumari Road area of Lumding.', seriesLabel: 'Project 5 — Lumding', displayOrder: 7 },
    { name: 'Swapan Debnath', ownerName: 'Swapan Debnath', location: 'Ananda Polly, By Lane, Lumding', city: 'lumding', type: 'residential', status: 'completed', description: 'Residential project at Ananda Polly, By Lane, Lumding.', seriesLabel: 'Project 6 — Lumding', displayOrder: 8 },
    { name: 'Tapash Dey', ownerName: 'Tapash Dey', location: 'Ananda Polly, By Lane, Lumding', city: 'lumding', type: 'residential', status: 'completed', description: 'Residential project at Ananda Polly, By Lane, Lumding.', seriesLabel: 'Project 7 — Lumding', displayOrder: 9 },
    { name: 'Sudip Bhattacharjee', ownerName: 'Sudip Bhattacharjee', location: 'Manasha Mandir Road, Loco Colony, Lumding', city: 'lumding', type: 'residential', status: 'completed', description: 'Residential project at Manasha Mandir Road, Loco Colony, Lumding.', seriesLabel: 'Project 8 — Lumding', displayOrder: 10 },
    // Hojai
    { name: 'Sanjay Banerjee — Swadist Restaurant', ownerName: 'Sanjay Banerjee', location: 'Jora Pukhuri, NH 36 Nagaon Lumding Road, Hojai', city: 'hojai', type: 'commercial', status: 'ongoing', description: 'Commercial construction project in Hojai — a testament to Ashiyanaa\'s growing footprint beyond residential projects into commercial development.', seriesLabel: 'Project 1 — Hojai', displayOrder: 11 },
  ];

  await Project.insertMany(projects);
  console.log(`  ✅ Seeded ${projects.length} projects`);
}

// ─── Seed Founders ───
async function seedFounders() {
  console.log('  🌱 Upserting founders from catalogue...');

  const founders = [
    {
      name: 'Paramveer Singh',
      title: 'Founder & Partner',
      bio: 'Paramveer Singh is a dynamic entrepreneur with a strong foundation in the construction supply industry. He successfully managed and grew his hardware business "Mayank Steels", gaining in-depth knowledge of materials, quality standards, and market dynamics. Building on this expertise, he co-founded "Ashiyanaa Construction" with a vision to deliver high-quality residential and commercial spaces. His practical expertise, business acumen, and commitment to excellence play a key role in ensuring superior execution and long-term value in every project. "Driven By Experience. Built With Integrity"',
      phone: '+91 94350 65225',
      email: 'official@ashiyanaaconstruction.com',
      displayOrder: 1,
      isActive: true,
    },
    {
      name: 'Biju (Bijoy) Roy',
      title: 'Founder & Partner',
      bio: 'Biju (Bijoy) Roy is an experienced architect and design professional with over 17 years of expertise in architecture and interior design. As the founder of a successful architectural firm, he has been instrumental in designing some of the finest buildings in his region, known for their functionality, aesthetics, and attention to detail. As a Founder and Partner at Ashiyanaa Construction, he brings creative vision and technical excellence to every project. With a passion to expand his work across Assam, he aims to deliver innovative, high-quality spaces that set new benchmarks in design and construction. "Designing Excellence. Shaping The Future"',
      phone: '+91 94350 09017',
      email: 'official@ashiyanaaconstruction.com',
      displayOrder: 2,
      isActive: true,
    },
    {
      name: 'Sukhdip Singh Virdi',
      title: 'Partner',
      bio: 'Sukhdip Singh Virdi brings over 11 years of experience in finance and banking, having begun his journey with Axis Bank in 2017. He is committed to maintaining the highest standards of quality, transparency, and timely delivery. His strong financial acumen, practical approach, and attention to detail enable him to understand client needs deeply and deliver projects with precision and trust. Focused on creating durable, well-designed spaces, he continues to build reliable infrastructure and long-term client relationships. "Building Trust. Delivering Excellence"',
      phone: '+91 88225 83969',
      email: 'official@ashiyanaaconstruction.com',
      displayOrder: 3,
      isActive: true,
    },
  ];

  for (const f of founders) {
    await Founder.findOneAndUpdate(
      { name: f.name },
      { $set: f },
      { upsert: true, new: true }
    );
  }

  // Remove any old placeholder entries
  await Founder.deleteMany({ name: { $in: ['Founder Name', 'Co-Founder Name'] } });

  console.log(`  ✅ Seeded ${founders.length} founders`);
}


let sheetUrlCache = process.env.GOOGLE_SHEET_URL || '';
function formatTimestamp(d = new Date()) {
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mon = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12; if (hours === 0) hours = 12;
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
  if (!sheetId) { console.warn('GOOGLE_SHEET_URL not configured, skipping.'); return; }
  let serviceAccountJson;
  try { serviceAccountJson = require('./peak-castle-490314-n4-f7221ea7cc77.json'); } catch { serviceAccountJson = null; }
  const credentials = serviceAccountJson || {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
  };
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });
  const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Sheet1!A1:Z1' });
  const headerRow = headerRes.data.values?.[0];
  if (!headerRow || headerRow.length === 0) {
    await sheets.spreadsheets.values.append({ spreadsheetId: sheetId, range: 'Sheet1!A1:Z1', valueInputOption: 'USER_ENTERED', requestBody: { values: [['Timestamp','Name','Phone','Email','Project / Interested In','Message']] } });
  }
  await sheets.spreadsheets.values.append({ spreadsheetId: sheetId, range: 'Sheet1!A:Z', valueInputOption: 'USER_ENTERED', requestBody: { values: [rowValues] } });
}

// ─── Email Templates ───
function createTransport() {
  return nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}
function clientConfirmationEmail(name, phone, email, project) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Thank You – Ashiyanaa Constructions</title></head><body style="margin:0;padding:0;background-color:#0B1120;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0B1120;padding:40px 16px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;"><tr><td style="background:linear-gradient(135deg,#0B1120 0%,#111827 100%);border-radius:16px 16px 0 0;padding:36px 40px 28px;text-align:center;border-top:3px solid #C9A84C;"><h1 style="margin:0;font-size:28px;font-weight:700;color:#F0EDE5;">ASHIYANAA</h1><p style="margin:4px 0 0;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#C9A84C;">CONSTRUCTIONS</p></td></tr><tr><td style="background:#111827;padding:36px 40px 28px;text-align:center;"><h2 style="margin:0 0 16px;font-size:24px;color:#F0EDE5;">Thank you, ${name}.</h2><p style="margin:0;font-size:15px;color:#9CA3AF;line-height:1.7;">We've received your enquiry. Expect to hear from us within <strong style="color:#C9A84C;">24 hours</strong>.</p></td></tr><tr><td style="background:#0B1120;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border-top:1px solid rgba(201,168,76,0.15);"><p style="margin:0;font-size:12px;color:#6B7280;">© ${new Date().getFullYear()} Ashiyanaa Constructions. All rights reserved.</p></td></tr></table></td></tr></table></body></html>`;
}
function officeNotificationEmail(name, phone, email, project, message) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#0B1120;font-family:sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;"><tr><td style="background:#111827;border-radius:16px 16px 0 0;padding:28px 40px;border-top:3px solid #C9A84C;"><h1 style="margin:0;color:#F0EDE5;font-size:22px;">ASHIYANAA CONSTRUCTIONS</h1><p style="margin:4px 0 0;color:#C9A84C;font-size:12px;text-transform:uppercase;">New Enquiry — ${project}</p></td></tr><tr><td style="background:#111827;padding:28px 40px;"><table width="100%" style="background:#0B1120;border-radius:10px;border:1px solid rgba(255,255,255,0.07);"><tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:#6B7280;font-size:11px;">NAME</span><br/><span style="color:#F0EDE5;font-size:14px;">${name}</span></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:#6B7280;font-size:11px;">PHONE</span><br/><span style="color:#F0EDE5;font-size:14px;">${phone}</span></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:#6B7280;font-size:11px;">EMAIL</span><br/><a href="mailto:${email}" style="color:#C9A84C;font-size:14px;">${email}</a></td></tr><tr><td style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);"><span style="color:#6B7280;font-size:11px;">INTERESTED IN</span><br/><span style="color:#C9A84C;font-size:14px;font-weight:700;">${project}</span></td></tr><tr><td style="padding:12px 16px;"><span style="color:#6B7280;font-size:11px;">MESSAGE</span><br/><span style="color:#D1D5DB;font-size:14px;line-height:1.7;">${message.replace(/\n/g,'<br/>')}</span></td></tr></table></td></tr><tr><td style="background:#0B1120;border-radius:0 0 16px 16px;padding:20px 40px;text-align:center;border-top:1px solid rgba(201,168,76,0.15);"><p style="margin:0;font-size:11px;color:#6B7280;">Automated notification from Ashiyanaa Constructions website.</p></td></tr></table></td></tr></table></body></html>`;
}

// ═══════════════════════════════════════════════════════
// ─── ROUTES ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════

// ─── SSR helpers ───
function renderFounderCard(f, i) {
  const initials = f.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const imgHtml = f.image
    ? `<img src="${f.image}" alt="${f.name}">`
    : `<div class="founder-initials">${initials}</div>`;
  const phone = f.phone
    ? `<div class="founder-contact-item"><div class="founder-contact-icon">📞</div><a href="tel:${f.phone.replace(/\s/g, '')}">${f.phone}</a></div>`
    : '';
  return `
  <div class="founder-card fade-up" style="transition-delay:${i * 0.1}s">
    <div class="founder-card-top">
      ${imgHtml}
      <div class="founder-card-top-overlay"></div>
      <div class="founder-badge">${f.title.split(' ')[0]}</div>
    </div>
    <div class="founder-card-body">
      <div class="founder-name">${f.name}</div>
      <div class="founder-title">${f.title}</div>
      <div class="founder-divider"></div>
      ${f.bio ? `<p class="founder-bio">${f.bio}</p>` : ''}
      <div class="founder-contacts">${phone}</div>
    </div>
  </div>`;
}

const gradients = [
  'linear-gradient(135deg,#1a2a4e,#0d2e3d)',
  'linear-gradient(135deg,#2a1a4e,#0d3d5e)',
  'linear-gradient(135deg,#1a4e2a,#0d3d2e)',
  'linear-gradient(135deg,#4e2a1a,#3d0d1a)',
];
function renderProjectCard(p, i) {
  const statusLabel = p.status === 'completed' ? '● Completed'
    : p.status === 'ongoing' ? (p.completionPercent ? `● ${p.completionPercent}% Completed` : '● Ongoing')
    : '◆ Upcoming';
  const statusClass = p.status === 'upcoming' ? 'status-upcoming' : 'status-ongoing';
  const cityIcons = { nagaon: '🏗️', lumding: '🏘️', hojai: '🏢' };
  const imgHtml = p.image
    ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">`
    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:56px;opacity:0.25">${cityIcons[p.city] || '🏗️'}</div>`;
  const cityLabel = p.city.charAt(0).toUpperCase() + p.city.slice(1);
  const seriesHtml = p.seriesLabel
    ? `<div class="meta-item"><strong>${p.seriesLabel.split('—')[0].trim()}</strong>Series</div>` : '';
  const descHtml = p.description ? `<div class="project-card-desc">${p.description}</div>` : '';
  const eyeBtn = p.image
    ? `<button class="project-eye-btn" data-img="${p.image}" data-title="${p.name}" aria-label="View full image">👁</button>`
    : '';
  return `
  <div class="project-card fade-in" data-type="${p.city}">
    <div class="project-card-img">
      <div class="project-card-img-bg" style="background:${gradients[i % gradients.length]}">${imgHtml}</div>
      <div class="project-card-status ${statusClass}">${statusLabel}</div>
      ${eyeBtn}
    </div>
    <div class="project-card-body">
      <div class="project-card-location">📍 ${p.location}</div>
      <div class="project-card-title">${p.name}</div>
      ${descHtml}
      <div class="project-card-meta">
        <div class="meta-item"><strong>${cityLabel}</strong>City</div>
        ${seriesHtml}
        <div class="meta-item"><strong>${p.type === 'commercial' ? 'Commercial' : 'Residential'}</strong>Type</div>
      </div>
      <a href="#contact" class="project-card-link">Enquire →</a>
    </div>
  </div>`;
}

// ─── Page Routes (SSR) ───
app.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
    const projectsHtml = projects.length
      ? projects.map((p, i) => renderProjectCard(p, i)).join('\n')
      : '<div style="grid-column:1/-1;text-align:center;padding:80px 20px;color:var(--muted)">No projects yet.</div>';
    const template = require('fs').readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    const html = template.replace('<!-- PROJECTS_GRID -->', projectsHtml);
    res.send(html);
  } catch (err) {
    console.error('SSR / error:', err);
    res.status(500).send('<pre>' + err.stack + '</pre>');
  }
});

app.get('/founders', async (req, res) => {
  try {
    const founders = await Founder.find({ isActive: true }).sort({ displayOrder: 1 });
    const foundersHtml = founders.length
      ? founders.map((f, i) => renderFounderCard(f, i)).join('\n')
      : '<div class="no-founders"><div class="no-founders-icon">👥</div><h3>Coming Soon</h3><p>Founder profiles will be available shortly.</p></div>';
    const template = require('fs').readFileSync(path.join(__dirname, 'founders.html'), 'utf-8');
    const html = template.replace('<!-- FOUNDERS_GRID -->', foundersHtml);
    res.send(html);
  } catch (err) {
    console.error('SSR /founders error:', err);
    res.sendFile(path.join(__dirname, 'founders.html'));
  }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));


// ─── Admin Auth ───
app.post('/api/admin/login', async (req, res) => {
  const { password } = req.body || {};
  if (!password) return res.status(400).json({ success: false, error: 'Password required' });

  const valid = password === ADMIN_PASSWORD;
  if (!valid) return res.status(401).json({ success: false, error: 'Invalid password' });

  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token });
});

app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
  res.json({ success: true, role: req.admin.role });
});

// ─── Image Upload ───
app.post('/api/upload', authenticateAdmin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

// ─── Projects API ───
// GET all projects (public)
app.get('/api/projects', async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.city) filter.city = req.query.city.toLowerCase();
    if (req.query.status) filter.status = req.query.status.toLowerCase();
    const projects = await Project.find(filter).sort({ displayOrder: 1, createdAt: 1 });
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all projects including inactive (admin only)
app.get('/api/admin/projects', authenticateAdmin, async (req, res) => {
  try {
    const projects = await Project.find().sort({ displayOrder: 1, createdAt: 1 });
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create project (admin)
app.post('/api/projects', authenticateAdmin, async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update project (admin)
app.put('/api/projects/:id', authenticateAdmin, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE project (admin)
app.delete('/api/projects/:id', authenticateAdmin, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Founders API ───
// GET all founders (public)
app.get('/api/founders', async (req, res) => {
  try {
    const founders = await Founder.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
    res.json({ success: true, founders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all founders including inactive (admin)
app.get('/api/admin/founders', authenticateAdmin, async (req, res) => {
  try {
    const founders = await Founder.find().sort({ displayOrder: 1, createdAt: 1 });
    res.json({ success: true, founders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create founder (admin)
app.post('/api/founders', authenticateAdmin, async (req, res) => {
  try {
    const founder = new Founder(req.body);
    await founder.save();
    res.status(201).json({ success: true, founder });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update founder (admin)
app.put('/api/founders/:id', authenticateAdmin, async (req, res) => {
  try {
    const founder = await Founder.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!founder) return res.status(404).json({ success: false, error: 'Founder not found' });
    res.json({ success: true, founder });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE founder (admin)
app.delete('/api/founders/:id', authenticateAdmin, async (req, res) => {
  try {
    const founder = await Founder.findByIdAndDelete(req.params.id);
    if (!founder) return res.status(404).json({ success: false, error: 'Founder not found' });
    res.json({ success: true, message: 'Founder deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Stats (admin) ───
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const [totalProjects, nagaon, lumding, hojai, completed, ongoing, founders] = await Promise.all([
      Project.countDocuments({ isActive: true }),
      Project.countDocuments({ city: 'nagaon', isActive: true }),
      Project.countDocuments({ city: 'lumding', isActive: true }),
      Project.countDocuments({ city: 'hojai', isActive: true }),
      Project.countDocuments({ status: 'completed', isActive: true }),
      Project.countDocuments({ status: 'ongoing', isActive: true }),
      Founder.countDocuments({ isActive: true }),
    ]);
    res.json({ success: true, stats: { totalProjects, nagaon, lumding, hojai, completed, ongoing, founders } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Enquiry Route ───
app.post('/api/enquiry', async (req, res) => {
  const { name, phone, email, project, message } = req.body || {};
  if (!name || !phone || !email || !project || !message) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  try {
    const transporter = createTransport();
    await transporter.sendMail({ from: `"Ashiyanaa Constructions" <${process.env.SMTP_USER}>`, to: email, subject: 'Thank you for your enquiry – Ashiyanaa Constructions', html: clientConfirmationEmail(name, phone, email, project) });
    await transporter.sendMail({ from: `"Ashiyanaa Website" <${process.env.SMTP_USER}>`, to: 'official@ashiyanaaconstruction.com', replyTo: email, subject: `New Website Enquiry – ${project} | ${name}`, html: officeNotificationEmail(name, phone, email, project, message) });
    appendToGoogleSheet([formatTimestamp(), name, phone, email, project, message]).catch(err => console.error('Sheet error:', err));
    res.json({ success: true });
  } catch (err) {
    console.error('Enquiry error:', err);
    res.status(500).json({ success: false, error: 'Failed to process enquiry' });
  }
});

// ─── Admin Sheet Config ───
app.get('/admin/sheet', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Sheet Config</title><style>body{font-family:sans-serif;background:#0B1120;color:#F0EDE5;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:16px}.card{max-width:520px;width:100%;background:#111827;border-radius:12px;padding:24px;border:1px solid rgba(201,168,76,0.25)}h1{margin:0 0 12px;font-size:22px}label{font-size:12px;color:#9CA3AF;display:block;margin-bottom:6px}input{width:100%;padding:11px 12px;border-radius:8px;border:1px solid rgba(156,163,175,0.5);background:#020617;color:#F9FAFB;font-size:13px}button{margin-top:14px;width:100%;padding:10px;border-radius:999px;border:none;background:linear-gradient(135deg,#C9A84C,#9A7A30);color:#fff;font-weight:600;cursor:pointer}#status{margin-top:8px;font-size:12px;min-height:16px}</style></head><body><div class="card"><h1>Google Sheet URL</h1><label for="u">Sheet URL</label><input type="url" id="u" value="${sheetUrlCache||''}"/><button onclick="save()">Save</button><div id="status"></div></div><script>async function save(){const url=document.getElementById('u').value.trim();const s=document.getElementById('status');s.textContent='Saving...';const r=await fetch('/admin/sheet',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});const d=await r.json();s.style.color=d.success?'#4ade80':'#f97373';s.textContent=d.success?'Saved!':'Failed.'}</script></body></html>`);
});
app.post('/admin/sheet', (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ success: false, error: 'Invalid URL' });
  sheetUrlCache = url.trim();
  res.json({ success: true });
});

app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`\n  🏠 Ashiyanaa Constructions Server`);
  console.log(`  ─────────────────────────────────`);
  console.log(`  → Running on http://localhost:${PORT}`);
  console.log(`  → Admin panel: http://localhost:${PORT}/admin`);
  console.log(`  → Founders page: http://localhost:${PORT}/founders`);
  console.log(`  → Environment: ${process.env.NODE_ENV || 'development'}\n`);
});