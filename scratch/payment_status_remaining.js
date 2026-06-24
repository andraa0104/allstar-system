const fs = require('fs');

const files = [
  'src/app/form-order/order-job/page.tsx',
  'src/app/form-order/order-control/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Fix remaining text-amber-400 in sisa_tagihan
  content = content.replace(/"text-amber-400" : "text-emerald-700"/g, '"text-amber-700" : "text-emerald-700"');

  fs.writeFileSync(file, content);
});
console.log("Remaining amber-400 fixed");
