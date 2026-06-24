const fs = require('fs');

const files = [
  'src/app/form-order/order-job/page.tsx',
  'src/app/form-order/order-control/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix the fallback conditional back to full styling, just cyan
  content = content.replace(/: "text-cyan-400"/g, ': "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"');
  
  // Fix the modal pill back to full styling, just cyan
  content = content.replace(/className="inline-flex items-center px-2\.5 py-0\.5 font-medium text-cyan-400"/g, 'className="inline-flex items-center bg-cyan-500/5 px-2.5 py-0.5 font-medium text-cyan-400 border border-cyan-500/10"');
  
  fs.writeFileSync(file, content);
});
console.log("Fixed");
