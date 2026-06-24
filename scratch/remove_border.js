const fs = require('fs');

const files = [
  'src/app/form-order/order-job/page.tsx',
  'src/app/form-order/order-control/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // For the conditional status pills:
  // Remove "border" from the main wrapper
  content = content.replace(/className=\{`inline-flex items-center px-2\.5 py-0\.5 text-xs font-medium border \$\{/g, 'className={`inline-flex items-center text-xs font-medium ${');
  content = content.replace(/className=\{`inline-flex items-center px-2 py-0\.5 text-\[10px\] font-medium border \$\{/g, 'className={`inline-flex items-center text-[10px] font-medium ${');

  // Remove backgrounds and borders from the conditional options
  content = content.replace(/"bg-emerald-500\/10 border-emerald-500\/20 text-emerald-400"/g, '"text-emerald-400"');
  content = content.replace(/"bg-cyan-500\/10 border-cyan-500\/20 text-cyan-400"/g, '"text-cyan-400"');
  content = content.replace(/"bg-cyan-500\/10 border-cyan-500\/20 text-cyan-400"/g, '"text-cyan-400"'); // For fallback

  // For the modal status pills:
  // Current: className="inline-flex items-center bg-cyan-500/5 px-2.5 py-0.5 font-medium text-cyan-400 border border-cyan-500/10"
  content = content.replace(/className="inline-flex items-center bg-cyan-500\/5 px-2\.5 py-0\.5 font-medium text-cyan-400 border border-cyan-500\/10"/g, 'className="inline-flex items-center font-medium text-cyan-400"');
  
  // Wait, there might be other occurrences. Let's make it generic if needed.
  // In `order-job/page.tsx`, there's another status pill for the table "Status" column.
  
  fs.writeFileSync(file, content);
});
console.log("Borders removed");
