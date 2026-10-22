// Command line version of the LeaxPanel Doctor.
// Run with: npm run doctor
require('dotenv').config();
const doctorService = require('../services/doctorService');

(async () => {
  console.log('');
  console.log('============================================================================');
  console.log('  LeaxPanel Doctor');
  console.log('============================================================================');
  console.log('');

  const report = await doctorService.runAll();

  for (const check of report.checks) {
    const mark = check.status === 'ok' ? 'OK  ' : check.status === 'warn' ? 'WARN' : 'FAIL';
    console.log(`  [${mark}] ${check.label.padEnd(26)} ${check.message}`);
    if (check.fixable && check.fix) {
      console.log(`         -> automatic fix available: npm run doctor -- --fix=${check.fix}`);
    }
  }

  console.log('');
  console.log(`  Score: ${report.summary.score}%  (${report.summary.ok} ok, ${report.summary.warn} warnings, ${report.summary.fail} failures)`);
  console.log('');

  if (report.summary.fail || report.summary.warn) {
    console.log('  Run the panel and open http://localhost:3000/doctor to apply the fixes.');
  } else {
    console.log('  Everything looks healthy.');
  }
  console.log('');
})();
