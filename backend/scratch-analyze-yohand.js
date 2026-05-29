import mysql from "mysql2/promise";

async function main() {
  const connection = await mysql.createConnection({
    host: "202.155.95.118",
    port: 3306,
    user: "root",
    password: "terserah",
    database: "dbati",
    namedPlaceholders: true
  });

  // Query all steps of tb_control for FOs that yohand worked on
  const [rows] = await connection.execute(
    `SELECT id, no_fo, status_awal, status_lanjutan, username, datetime_awal, datetime_lanjutan
     FROM tb_control
     WHERE no_fo IN (
       SELECT DISTINCT no_fo FROM tb_control WHERE LOWER(TRIM(username)) = 'yohand'
     )
     ORDER BY no_fo, id ASC`
  );

  console.log("Total control rows for yohand's FOs:", rows.length);

  // Group by FO
  const foGroups = {};
  for (const row of rows) {
    if (!foGroups[row.no_fo]) {
      foGroups[row.no_fo] = [];
    }
    foGroups[row.no_fo].push(row);
  }

  // Analyze each FO to see if yohand has an active outstanding step
  const outstandingFos = [];
  const completedFos = [];

  for (const [no_fo, steps] of Object.entries(foGroups)) {
    // Find the latest step by yohand
    let latestUserStep = null;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (steps[i].username && steps[i].username.toLowerCase().trim() === 'yohand') {
        latestUserStep = steps[i];
        break;
      }
    }

    if (latestUserStep) {
      // Check if the latest user step is a "Start" status
      const isStart = latestUserStep.status_lanjutan && latestUserStep.status_lanjutan.toLowerCase().startsWith('start');
      
      // Check if there is any subsequent step in tb_control (larger ID)
      const userIndex = steps.findIndex(s => s.id === latestUserStep.id);
      const subsequentStepExists = userIndex < steps.length - 1;
      
      if (isStart && !subsequentStepExists) {
        outstandingFos.push({ no_fo, latestUserStep, steps });
      } else {
        completedFos.push({ no_fo, latestUserStep, nextStep: subsequentStepExists ? steps[userIndex + 1] : null });
      }
    }
  }

  console.log("Analyzed outstanding FOs for yohand:", outstandingFos.length);
  if (outstandingFos.length > 0) {
    console.log("Outstanding FOs:", outstandingFos.map(o => ({ no_fo: o.no_fo, status: o.latestUserStep.status_lanjutan })));
  }

  console.log("Analyzed completed FOs for yohand:", completedFos.length);
  // Show a few completed ones
  console.log("Sample completed FOs:", completedFos.slice(0, 3).map(c => ({
    no_fo: c.no_fo,
    userLatest: c.latestUserStep.status_lanjutan,
    nextStep: c.nextStep ? c.nextStep.status_lanjutan : 'none'
  })));

  await connection.end();
}

main().catch(console.error);
