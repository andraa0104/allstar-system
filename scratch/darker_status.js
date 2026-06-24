const fs = require('fs');

const files = [
  'src/app/form-order/order-job/page.tsx',
  'src/app/form-order/order-control/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Change font-medium to font-bold
  content = content.replace(/font-medium \$\{/g, 'font-bold ${');
  content = content.replace(/font-medium text-cyan-400/g, 'font-bold text-cyan-700');

  // Replace text colors
  content = content.replace(/"text-emerald-400"/g, '"text-emerald-700"');
  content = content.replace(/"text-cyan-400"/g, '"text-cyan-700"');
  
  fs.writeFileSync(file, content);
});
console.log("Darker and bolder status applied");
