#!/usr/bin/env node
/**
 * SCALING VALIDATION
 *
 * Critical question: Does the 2000× improvement hold at larger problem sizes?
 *
 * Tests Grover's search at N = 16, 32, 64, 128, 256, 512, 1024
 * Measures: framework vs naive, looks for scaling laws
 */

import { GroverSearchFramework } from './grover-search-framework.js';

interface ScalingResult {
  N: number;
  naiveMeasurements: number;
  naiveConfidence: number;
  naiveSuccess: boolean;
  frameworkMeasurements: number;
  frameworkConfidence: number;
  frameworkSuccess: boolean;
  improvement: number;
  earlyStop: boolean;
}

/**
 * Test Grover at a specific database size
 */
function testGroverAtSize(N: number, errorRate: number = 0.85): ScalingResult {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing N=${N} (database size ${N})`);
  console.log('='.repeat(70));

  // Create database [1, 2, 3, ..., N]
  const database = Array.from({ length: N }, (_, i) => i + 1);
  const target = Math.floor(N / 2); // Pick middle element as target

  const grover = new GroverSearchFramework();
  const maxShots = 50000;

  console.log(`  Target: ${target}`);
  console.log(`  Noise:  ${(errorRate * 100).toFixed(0)}% depolarizing`);
  console.log();

  // Test 1: Naive approach (all measurements at once)
  console.log('  [1/2] Testing naive frequency counting...');
  const naiveResult = grover.search(database, target, maxShots, errorRate);
  console.log(`        → ${naiveResult.measurementsUsed} shots, ${(naiveResult.confidence*100).toFixed(1)}% conf, ${naiveResult.actualSuccess ? '✓' : '✗'}`);

  // Test 2: Framework with progressive batching
  console.log('  [2/2] Testing framework (progressive)...');
  const frameworkResult = grover.searchProgressive(database, target, maxShots, errorRate);
  console.log(`        → ${frameworkResult.measurementsUsed} shots, ${(frameworkResult.confidence*100).toFixed(1)}% conf, ${frameworkResult.actualSuccess ? '✓' : '✗'}`);

  const improvement = naiveResult.measurementsUsed / frameworkResult.measurementsUsed;

  console.log();
  console.log(`  📊 Improvement: ${improvement.toFixed(1)}× fewer measurements`);

  if (frameworkResult.actualSuccess && !naiveResult.actualSuccess) {
    console.log(`  🎯 Framework succeeds where naive fails!`);
  } else if (!frameworkResult.actualSuccess && naiveResult.actualSuccess) {
    console.log(`  ⚠️  Framework failed but naive succeeded`);
  }

  return {
    N,
    naiveMeasurements: naiveResult.measurementsUsed,
    naiveConfidence: naiveResult.confidence,
    naiveSuccess: naiveResult.actualSuccess,
    frameworkMeasurements: frameworkResult.measurementsUsed,
    frameworkConfidence: frameworkResult.confidence,
    frameworkSuccess: frameworkResult.actualSuccess,
    improvement,
    earlyStop: frameworkResult.earlyStop
  };
}

/**
 * Run full scaling validation across multiple sizes
 */
async function runScalingValidation(): Promise<void> {
  console.log('\n'.repeat(2));
  console.log('█'.repeat(70));
  console.log('SCALING VALIDATION');
  console.log('Critical Question: Does the 2000× improvement hold at scale?');
  console.log('█'.repeat(70));

  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  const results: ScalingResult[] = [];

  console.log(`\nTesting ${sizes.length} database sizes: ${sizes.join(', ')}`);
  console.log('This will take a few minutes...\n');

  // Run tests
  for (const N of sizes) {
    const result = testGroverAtSize(N);
    results.push(result);
  }

  // Analysis
  console.log('\n\n');
  console.log('█'.repeat(70));
  console.log('SCALING ANALYSIS');
  console.log('█'.repeat(70));
  console.log();

  // Print table
  console.log('┌────────┬─────────────┬─────────────┬──────────────┬───────────┐');
  console.log('│   N    │    Naive    │  Framework  │  Improvement │ Early Stop│');
  console.log('├────────┼─────────────┼─────────────┼──────────────┼───────────┤');

  for (const r of results) {
    const naive = `${r.naiveMeasurements.toLocaleString()}${r.naiveSuccess ? '✓' : '✗'}`.padEnd(11);
    const framework = `${r.frameworkMeasurements.toLocaleString()}${r.frameworkSuccess ? '✓' : '✗'}`.padEnd(11);
    const improvement = `${r.improvement.toFixed(1)}×`.padEnd(12);
    const earlyStop = (r.earlyStop ? 'YES' : 'NO').padEnd(9);

    console.log(`│ ${String(r.N).padStart(6)} │ ${naive} │ ${framework} │ ${improvement} │ ${earlyStop} │`);
  }

  console.log('└────────┴─────────────┴─────────────┴──────────────┴───────────┘');
  console.log();

  // Compute statistics
  const avgImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length;
  const minImprovement = Math.min(...results.map(r => r.improvement));
  const maxImprovement = Math.max(...results.map(r => r.improvement));

  const frameworkSuccesses = results.filter(r => r.frameworkSuccess).length;
  const naiveSuccesses = results.filter(r => r.naiveSuccess).length;

  const earlyStops = results.filter(r => r.earlyStop).length;

  console.log('📊 Statistics:');
  console.log(`   Average improvement:  ${avgImprovement.toFixed(1)}×`);
  console.log(`   Range:                ${minImprovement.toFixed(1)}× to ${maxImprovement.toFixed(1)}×`);
  console.log(`   Framework success:    ${frameworkSuccesses}/${results.length}`);
  console.log(`   Naive success:        ${naiveSuccesses}/${results.length}`);
  console.log(`   Early stops:          ${earlyStops}/${results.length}`);
  console.log();

  // Scaling law analysis
  console.log('📈 Scaling Behavior:');

  // Check if improvement grows, stays constant, or shrinks with N
  const smallN = results.slice(0, 3); // First 3 sizes
  const largeN = results.slice(-3); // Last 3 sizes
  const smallAvg = smallN.reduce((sum, r) => sum + r.improvement, 0) / smallN.length;
  const largeAvg = largeN.reduce((sum, r) => sum + r.improvement, 0) / largeN.length;

  if (largeAvg > smallAvg * 1.5) {
    console.log('   ✅ Improvement GROWS with N (better at scale!)');
  } else if (largeAvg > smallAvg * 0.7) {
    console.log('   ✅ Improvement HOLDS at scale (stable)');
  } else {
    console.log('   ⚠️  Improvement SHRINKS at scale (degrades)');
  }

  // Check framework measurements scaling
  const avgGrowthRate = [];
  for (let i = 1; i < results.length; i++) {
    const ratio = results[i].frameworkMeasurements / results[i-1].frameworkMeasurements;
    const Nratio = results[i].N / results[i-1].N;
    avgGrowthRate.push(ratio / Nratio);
  }
  const avgRate = avgGrowthRate.reduce((a, b) => a + b, 0) / avgGrowthRate.length;

  if (avgRate < 0.5) {
    console.log(`   Framework scales sub-linearly (measurements grow ~O(√N))`);
  } else if (avgRate < 1.5) {
    console.log(`   Framework scales ~linearly (measurements grow ~O(N))`);
  } else {
    console.log(`   Framework scales super-linearly (measurements grow >O(N))`);
  }

  console.log();

  // Verdict
  console.log('█'.repeat(70));
  console.log('VERDICT');
  console.log('█'.repeat(70));
  console.log();

  if (avgImprovement > 100 && frameworkSuccesses === results.length) {
    console.log('✅ SCALING VALIDATION PASSED');
    console.log();
    console.log(`   The framework maintains ${avgImprovement.toFixed(0)}× improvement across`);
    console.log(`   problem sizes from N=16 to N=${Math.max(...sizes)}.`);
    console.log();
    console.log('   This is STRONG evidence the results are not artifacts of small N.');
  } else if (avgImprovement > 10 && frameworkSuccesses >= results.length * 0.8) {
    console.log('⚠️  SCALING VALIDATION: PARTIAL SUCCESS');
    console.log();
    console.log(`   Framework shows ${avgImprovement.toFixed(0)}× improvement but with some failures.`);
    console.log('   Further investigation needed for reliability at scale.');
  } else {
    console.log('❌ SCALING VALIDATION FAILED');
    console.log();
    console.log('   Framework advantage degrades significantly at larger problem sizes.');
    console.log('   The 2000× improvement may be specific to small N.');
  }

  console.log();
  console.log('█'.repeat(70));
  console.log();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScalingValidation().catch(console.error);
}

export { runScalingValidation, testGroverAtSize };
