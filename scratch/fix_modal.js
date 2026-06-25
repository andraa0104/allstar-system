const fs = require('fs');
const path = require('path');

const monitoringStaffPath = path.join('src', 'app', 'form-order', 'monitoring-staff', 'page.tsx');
const orderControlPath = path.join('src', 'app', 'form-order', 'order-control', 'page.tsx');

let monitoringCode = fs.readFileSync(monitoringStaffPath, 'utf8');
let orderControlCode = fs.readFileSync(orderControlPath, 'utf8');

// Extract the selectedFo modal from orderControlCode
const modalStartToken = '{selectedFo ? (';
let modalStart = orderControlCode.indexOf(modalStartToken);
// The exact end of the modal in order-control is right before `</>` which is near the very end.
let modalEndToken = ') : null}\n    </>\n  );\n}';
let modalEnd = orderControlCode.lastIndexOf(modalEndToken);
if (modalEnd === -1) {
  modalEndToken = ') : null}\r\n    </>\r\n  );\r\n}';
  modalEnd = orderControlCode.lastIndexOf(modalEndToken);
}

if (modalEnd === -1) {
    // just find the last ) : null}
    let lastNull = orderControlCode.lastIndexOf(') : null}');
    if (lastNull !== -1) {
        modalEnd = lastNull + ') : null}'.length;
    }
} else {
    modalEnd += ') : null}'.length;
}

const modalCode = orderControlCode.substring(modalStart, modalEnd);

// Replace the mangled modal in monitoring-staff
const oldModalStart = monitoringCode.indexOf(modalStartToken);
// find the last ) : null} in monitoringCode
const oldModalEnd = monitoringCode.lastIndexOf(') : null}') + ') : null}'.length;

if (oldModalStart !== -1 && oldModalEnd !== -1) {
  monitoringCode = monitoringCode.substring(0, oldModalStart) + modalCode + monitoringCode.substring(oldModalEnd);
}

fs.writeFileSync(monitoringStaffPath, monitoringCode);
console.log('Successfully fixed modal block in monitoring-staff/page.tsx');
