#!/usr/bin/env node
// Test Workday coverage

const { runCoverageTest } = require('../lib/workdayCoverageHarness.ts');

console.log('Starting Workday Coverage Test...\n');

runCoverageTest()
  .then(() => {
    console.log('Coverage test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Coverage test failed:', error);
    process.exit(1);
  });
