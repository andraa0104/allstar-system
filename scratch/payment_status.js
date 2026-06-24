const fs = require('fs');

const files = [
  'src/app/form-order/order-job/page.tsx',
  'src/app/form-order/order-control/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // We are going to modify the function renderPaymentStatus block
  // Belum Bayar
  content = content.replace(/text-red-400 border border-red-500\/20">\s+Belum Bayar/g, 'text-red-700 border border-red-500/20">\n        Belum Bayar');
  content = content.replace(/rounded bg-red-500\/10 px-1\.5 py-0\.5 text-\[10px\] font-medium/g, 'rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold');

  // Lunas
  content = content.replace(/text-emerald-400 border border-emerald-500\/20">\s+Lunas/g, 'text-emerald-700 border border-emerald-500/20">\n        Lunas');
  content = content.replace(/rounded bg-emerald-500\/10 px-1\.5 py-0\.5 text-\[10px\] font-medium/g, 'rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold');

  // Belum Lunas
  content = content.replace(/text-amber-400 border border-amber-500\/20">\s+Belum Lunas/g, 'text-amber-700 border border-amber-500/20">\n        Belum Lunas');
  content = content.replace(/rounded bg-amber-500\/10 px-1\.5 py-0\.5 text-\[10px\] font-medium/g, 'rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold');

  fs.writeFileSync(file, content);
});
console.log("Payment status styled");
