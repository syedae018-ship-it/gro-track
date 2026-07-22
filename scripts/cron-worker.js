const http = require('http');

const POLLING_INTERVAL_MS = 10000; // 10 seconds for testing
const CRON_URL = 'http://localhost:3000/api/cron/process-reminders';

console.log(`[Local Scheduler] Starting standalone background worker.`);
console.log(`[Local Scheduler] Polling ${CRON_URL} every ${POLLING_INTERVAL_MS / 1000} seconds...`);

const options = { headers: {} };

setInterval(() => {
  const req = http.get(CRON_URL, options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log(`[Local Scheduler] Response (${res.statusCode}):`, data);
    });
  });

  req.on('error', (err) => {
    if (err.code !== 'ECONNREFUSED') {
      console.error(`[Local Scheduler] Error pinging cron route:`, err.message);
    }
  });

}, POLLING_INTERVAL_MS);
