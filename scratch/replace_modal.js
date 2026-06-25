const fs = require('fs');
const path = require('path');

const monitoringStaffPath = path.join('src', 'app', 'form-order', 'monitoring-staff', 'page.tsx');
const orderControlPath = path.join('src', 'app', 'form-order', 'order-control', 'page.tsx');

let monitoringCode = fs.readFileSync(monitoringStaffPath, 'utf8');
let orderControlCode = fs.readFileSync(orderControlPath, 'utf8');

// Extract RemainingDeadlineWidget from orderControlCode
const widgetStart = orderControlCode.indexOf('interface RemainingDeadlineWidgetProps');
const widgetEnd = orderControlCode.indexOf('export default function OrderControlPage()');
const widgetCode = orderControlCode.substring(widgetStart, widgetEnd);

// Extract the selectedFo modal from orderControlCode
const modalStartToken = '{selectedFo ? (';
let modalStart = orderControlCode.indexOf(modalStartToken);
// Find the matching closing bracket for the modal
let modalEnd = orderControlCode.indexOf(') : null}', modalStart);
if (modalEnd !== -1) {
  modalEnd += 9; // length of ') : null}'
}
const modalCode = orderControlCode.substring(modalStart, modalEnd);

// In monitoring-staff, insert widgetCode before export default function MonitoringStaffPage
if (!monitoringCode.includes('RemainingDeadlineWidgetProps')) {
  monitoringCode = monitoringCode.replace('export default function MonitoringStaffPage()', widgetCode + '\nexport default function MonitoringStaffPage()');
}

// In monitoring-staff, replace the old modal
const oldModalStartToken = '{selectedFo ? (';
const oldModalStart = monitoringCode.indexOf(oldModalStartToken);
const oldModalEnd = monitoringCode.indexOf(') : null}', oldModalStart) + 9;

if (oldModalStart !== -1 && oldModalEnd !== -1) {
  monitoringCode = monitoringCode.substring(0, oldModalStart) + modalCode + monitoringCode.substring(oldModalEnd);
}

// Fix formatIndonesianDateTime signature if needed
monitoringCode = monitoringCode.replace(/function formatIndonesianDateTime\(input: string \| Date \| null\)/g, 'function formatIndonesianDateTime(input: string | Date | null | undefined)');

// Fix text colors for no job
monitoringCode = monitoringCode.replace(/text-cyan-900 dark:text-cyan-400/g, 'text-slate-800 dark:text-cyan-400');

// Fix text colors for Pcs
monitoringCode = monitoringCode.replace(/text-slate-300 font-mono/g, 'text-slate-700 dark:text-slate-300 font-mono');
monitoringCode = monitoringCode.replace(/text-white font-mono/g, 'text-slate-800 dark:text-white font-mono');

// Also fix standard text-white in modal that says Pcs
// The modal code itself was copied from order-control, which might have text-white. 
// We will replace Pcs related text-white later if needed.

fs.writeFileSync(monitoringStaffPath, monitoringCode);
console.log('Successfully updated monitoring-staff/page.tsx');
