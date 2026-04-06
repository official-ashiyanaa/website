require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Founder = require('../models/Founder');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  // List all founders first
  const all = await Founder.find({}, 'name image');
  console.log('Current founders:', all.map(f => `${f.name} (image: ${f.image || 'none'})`));

  const founders = [
    {
      name: 'Paramveer Singh',
      title: 'Founder & Partner',
      bio: 'Paramveer Singh is a dynamic entrepreneur with a strong foundation in the construction supply industry. He successfully managed and grew his hardware business "Mayank Steels", gaining in-depth knowledge of materials, quality standards, and market dynamics. Building on this expertise, he co-founded "Ashiyanaa Construction" with a vision to deliver high-quality residential and commercial spaces. His practical expertise, business acumen, and commitment to excellence play a key role in ensuring superior execution and long-term value in every project. "Driven By Experience. Built With Integrity"',
      phone: '+91 94350 65225',
      email: 'official@ashiyanaaconstruction.com',
      image: '/uploads/founder-paramveer-singh.jpg',
      displayOrder: 1,
      isActive: true,
    },
    {
      name: 'Sukhdip Singh Virdi',
      title: 'Partner',
      bio: 'Sukhdip Singh Virdi brings over 11 years of experience in finance and banking, having begun his journey with Axis Bank in 2017. He is committed to maintaining the highest standards of quality, transparency, and timely delivery. His strong financial acumen, practical approach, and attention to detail enable him to understand client needs deeply and deliver projects with precision and trust. Focused on creating durable, well-designed spaces, he continues to build reliable infrastructure and long-term client relationships. "Building Trust. Delivering Excellence"',
      phone: '+91 88225 83969',
      email: 'official@ashiyanaaconstruction.com',
      image: '/uploads/founder-sukhdip-singh-virdi.png',
      displayOrder: 3,
      isActive: true,
    },
    {
      name: 'Biju (Bijoy) Roy',
      title: 'Founder & Partner',
      bio: 'Biju (Bijoy) Roy is an experienced architect and design professional with over 17 years of expertise in architecture and interior design. As the founder of a successful architectural firm, he has been instrumental in designing some of the finest buildings in his region, known for their functionality, aesthetics, and attention to detail. As a Founder and Partner at Ashiyanaa Construction, he brings creative vision and technical excellence to every project. With a passion to expand his work across Assam, he aims to deliver innovative, high-quality spaces that set new benchmarks in design and construction. "Designing Excellence. Shaping The Future"',
      phone: '+91 94350 09017',
      email: 'official@ashiyanaaconstruction.com',
      image: '/uploads/founder-biju-bijoy-roy.jpg',
      displayOrder: 2,
      isActive: true,
    },
  ];

  // Remove old placeholders
  await Founder.deleteMany({ name: { $in: ['Founder Name', 'Co-Founder Name'] } });

  for (const f of founders) {
    const result = await Founder.findOneAndUpdate(
      { name: f.name },
      { $set: f },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`✅ Upserted: ${f.name} → image: ${f.image}`);
  }

  const final = await Founder.find({}, 'name title image displayOrder').sort({ displayOrder: 1 });
  console.log('\nFinal founders in DB:');
  final.forEach(f => console.log(`  ${f.displayOrder}. ${f.name} (${f.title}) — ${f.image}`));

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(console.error);
