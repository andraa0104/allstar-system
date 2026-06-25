const fs = require('fs');

let monitoringCode = fs.readFileSync('src/app/form-order/monitoring-staff/page.tsx', 'utf8');
let orderControlCode = fs.readFileSync('src/app/form-order/order-control/page.tsx', 'utf8');

// 1. Extract RemainingDeadlineWidget from orderControl
const widgetStart = orderControlCode.indexOf('interface RemainingDeadlineWidgetProps');
// find the end of the widget which is right before export default function OrderControlPage
const widgetEnd = orderControlCode.indexOf('export default function OrderControlPage');
const widgetCode = orderControlCode.substring(widgetStart, widgetEnd);

// Insert widgetCode before export default function MonitoringStaffPage
if (!monitoringCode.includes('RemainingDeadlineWidgetProps')) {
  monitoringCode = monitoringCode.replace('export default function MonitoringStaffPage()', widgetCode + '\nexport default function MonitoringStaffPage()');
}

// 2. Fix activeTab and add Job states
monitoringCode = monitoringCode.replace(
  'const [activeTab, setActiveTab] = useState<"summary" | "detail" | "job">("summary");',
  `const [activeTab, setActiveTab] = useState<"summary" | "detail" | "job">("summary");
  const [jobSearch, setJobSearch] = useState("");
  const [jobLimit, setJobLimit] = useState<number | "all">(5);
  const [jobPage, setJobPage] = useState(1);
  const [jobImageModal, setJobImageModal] = useState<string | null>(null);
  const [jobModalData, setJobModalData] = useState<any>(null);`
);
// In case it was just "summary" | "detail"
monitoringCode = monitoringCode.replace(
  'const [activeTab, setActiveTab] = useState<"summary" | "detail">("summary");',
  `const [activeTab, setActiveTab] = useState<"summary" | "detail" | "job">("summary");
  const [jobSearch, setJobSearch] = useState("");
  const [jobLimit, setJobLimit] = useState<number | "all">(5);
  const [jobPage, setJobPage] = useState(1);
  const [jobImageModal, setJobImageModal] = useState<string | null>(null);
  const [jobModalData, setJobModalData] = useState<any>(null);`
);

// 3. Add foJobDetailsQuery hook after foDetailItemsQuery
const detailQueryEnd = monitoringCode.indexOf('});', monitoringCode.indexOf('const foDetailItemsQuery')) + 3;
const foJobQuerySnippet = `

  const foJobDetailsQuery = useQuery({
    queryKey: ["fo-job-details", selectedFo?.no_fo, jobPage, jobLimit, jobSearch],
    queryFn: () =>
      api.getFoJobDetails({
        no_fo: selectedFo!.no_fo,
        page: jobPage,
        limit: jobLimit,
        search: jobSearch,
      }),
    enabled: !!selectedFo?.no_fo && activeTab === "job",
  });`;

if (!monitoringCode.includes('foJobDetailsQuery')) {
  monitoringCode = monitoringCode.substring(0, detailQueryEnd) + foJobQuerySnippet + monitoringCode.substring(detailQueryEnd);
}

// 4. Extract modal from orderControl
const modalStartToken = '{selectedFo ? (';
const modalStart = orderControlCode.indexOf(modalStartToken);
// Find the exact last ) : null} in orderControl
let lastNull = orderControlCode.lastIndexOf(') : null}');
const modalEnd = lastNull + ') : null}'.length;
const modalCode = orderControlCode.substring(modalStart, modalEnd);

// Replace modal in monitoringStaff
const oldModalStart = monitoringCode.indexOf(modalStartToken);
const oldLastNull = monitoringCode.lastIndexOf(') : null}');
const oldModalEnd = oldLastNull + ') : null}'.length;

if (oldModalStart !== -1 && oldModalEnd !== -1) {
  monitoringCode = monitoringCode.substring(0, oldModalStart) + modalCode + monitoringCode.substring(oldModalEnd);
}

// 5. Fix formatIndonesianDateTime
monitoringCode = monitoringCode.replace(/function formatIndonesianDateTime\(input: string \| Date \| null\)/g, 'function formatIndonesianDateTime(input: string | Date | null | undefined)');

// 6. Fix text colors outside modal
// text-cyan-900 to text-slate-800 for no_job
monitoringCode = monitoringCode.replace(/text-cyan-900 dark:text-cyan-400/g, 'text-slate-800 dark:text-cyan-400');
// text-slate-300 to text-slate-700 dark:text-slate-300 for Pcs (except in header totalPcs)
monitoringCode = monitoringCode.replace(/text-\[11px\] text-slate-300 font-mono/g, 'text-[11px] text-slate-700 dark:text-slate-300 font-mono');
// and total Pcs badge: text-amber-700 to text-amber-900
monitoringCode = monitoringCode.replace(/text-amber-700 dark:text-amber-400/g, 'text-amber-900 dark:text-amber-400');

fs.writeFileSync('src/app/form-order/monitoring-staff/page.tsx', monitoringCode);
console.log('Done rewriting monitoring-staff!');
