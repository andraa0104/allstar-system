const fs = require('fs');

const files = [
  'src/app/form-order/order-job/page.tsx',
  'src/app/form-order/order-control/page.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace text colors with dual light/dark mode classes
  content = content.replace(/"text-cyan-700"/g, '"text-cyan-700 dark:text-cyan-400"');
  content = content.replace(/"text-emerald-700"/g, '"text-emerald-700 dark:text-emerald-400"');
  content = content.replace(/"text-amber-700"/g, '"text-amber-700 dark:text-amber-400"');
  content = content.replace(/"text-red-700"/g, '"text-red-700 dark:text-red-400"');
  
  // Also check if there's any text-cyan-700 or text-emerald-700 inside template literals that didn't use double quotes.
  // We matched "text-cyan-700" earlier, so if there were classes like 'text-cyan-700' or inside `` we might need to be careful.
  // Let's also do a generic string replace for those specific strings just in case they were single quoted or part of a larger class string.
  
  content = content.replace(/text-cyan-700(?! dark)/g, 'text-cyan-700 dark:text-cyan-400');
  content = content.replace(/text-emerald-700(?! dark)/g, 'text-emerald-700 dark:text-emerald-400');
  content = content.replace(/text-amber-700(?! dark)/g, 'text-amber-700 dark:text-amber-400');
  content = content.replace(/text-red-700(?! dark)/g, 'text-red-700 dark:text-red-400');

  // Clean up any double replacements (e.g., if "text-cyan-700 dark:text-cyan-400" became "text-cyan-700 dark:text-cyan-400 dark:text-cyan-400")
  content = content.replace(/dark:text-cyan-400 dark:text-cyan-400/g, 'dark:text-cyan-400');
  content = content.replace(/dark:text-emerald-400 dark:text-emerald-400/g, 'dark:text-emerald-400');
  content = content.replace(/dark:text-amber-400 dark:text-amber-400/g, 'dark:text-amber-400');
  content = content.replace(/dark:text-red-400 dark:text-red-400/g, 'dark:text-red-400');

  fs.writeFileSync(file, content);
});
console.log("Dark mode classes added");
