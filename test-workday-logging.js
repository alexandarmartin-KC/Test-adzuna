// Test Workday connector with new logging
import { discoverWorkdaySource } from './lib/workdayConnector.js';

async function test() {
  console.log('=== Testing Coloplast Workday Discovery ===\n');
  const result = await discoverWorkdaySource('https://coloplast.wd3.myworkdayjobs.com/Coloplast');
  console.log('\nResult:', result ? 'SUCCESS' : 'FAILED');
  if (result) {
    console.log('Source:', result);
  }
}

test().catch(console.error);
