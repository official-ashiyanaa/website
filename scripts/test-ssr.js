require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Project = require('../models/Project');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  try {
    const projects = await Project.find({ isActive: true }).sort({ displayOrder: 1, createdAt: 1 });
    console.log('Projects retrieved:', projects.length);
    
    // Test the render function
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
      return `CARD_OK`;
    }

    const projectsHtml = projects.map((p, i) => renderProjectCard(p, i)).join('\n');
    console.log('Tested render:', projectsHtml);

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await mongoose.disconnect();
  }
}
test();
