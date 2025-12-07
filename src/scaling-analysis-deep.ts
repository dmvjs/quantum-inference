#!/usr/bin/env node
/**
 * DEEP SCALING ANALYSIS
 *
 * 1. Find minimum shots needed for naive to succeed at each N
 * 2. Determine exact scaling law for framework (O(N^k))
 * 3. Fair comparison: both methods at their minimum required shots
 */

import { GroverSearchFramework } from './grover-search-framework.js';

interface ScalingDataPoint {
  N: number;
  naiveMinShots: number;
  naiveMinConfidence: number;
  frameworkShots: number;
  frameworkConfidence: number;
  improvement: number;
}

/**
 * Binary search to find minimum shots needed for naive to succeed
 */
function findMinimumShotsNaive(
  N: number,
  target: number,
  database: number[],
  targetConfidence: number = 0.60,
  errorRate: number = 0.85
): { minShots: number; confidence: number } {
  const grover = new GroverSearchFramework();

  let low = 100;
  let high = 100000;
  let bestShots = high;
  let bestConfidence = 0;

  console.log(`    Finding minimum shots for N=${N}...`);

  // Binary search
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);

    // Test at this shot count
    const result = grover.search(database, target, mid, errorRate);

    if (result.actualSuccess && result.confidence >= targetConfidence) {
      // Success! Try fewer shots
      bestShots = mid;
      bestConfidence = result.confidence;
      high = mid - 1;
      console.log(`      ✓ ${mid} shots works (${(result.confidence*100).toFixed(1)}% conf)`);
    } else {
      // Failed, need more shots
      low = mid + 1;
      console.log(`      ✗ ${mid} shots insufficient (${(result.confidence*100).toFixed(1)}% conf)`);
    }
  }

  return { minShots: bestShots, confidence: bestConfidence };
}

/**
 * Test framework at size N
 */
function testFramework(
  N: number,
  target: number,
  database: number[],
  errorRate: number = 0.85
): { shots: number; confidence: number; success: boolean } {
  const grover = new GroverSearchFramework();
  const result = grover.searchProgressive(database, target, 100000, errorRate);

  return {
    shots: result.measurementsUsed,
    confidence: result.confidence,
    success: result.actualSuccess
  };
}

/**
 * Fit scaling law: measurements = a * N^k
 * Returns exponent k
 */
function fitScalingLaw(dataPoints: Array<{ N: number; measurements: number }>): {
  exponent: number;
  coefficient: number;
  rSquared: number;
} {
  // Linear regression on log-log plot: log(m) = log(a) + k*log(N)
  const n = dataPoints.length;
  const logN = dataPoints.map(p => Math.log(p.N));
  const logM = dataPoints.map(p => Math.log(p.measurements));

  const sumLogN = logN.reduce((a, b) => a + b, 0);
  const sumLogM = logM.reduce((a, b) => a + b, 0);
  const sumLogNLogM = logN.map((x, i) => x * logM[i]).reduce((a, b) => a + b, 0);
  const sumLogNSq = logN.map(x => x * x).reduce((a, b) => a + b, 0);

  // Slope (exponent k)
  const k = (n * sumLogNLogM - sumLogN * sumLogM) / (n * sumLogNSq - sumLogN * sumLogN);

  // Intercept (log(a))
  const logA = (sumLogM - k * sumLogN) / n;
  const a = Math.exp(logA);

  // R-squared
  const meanLogM = sumLogM / n;
  const ssTotal = logM.map(y => (y - meanLogM) ** 2).reduce((a, b) => a + b, 0);
  const predicted = logN.map(x => logA + k * x);
  const ssResidual = logM.map((y, i) => (y - predicted[i]) ** 2).reduce((a, b) => a + b, 0);
  const rSquared = 1 - ssResidual / ssTotal;

  return { exponent: k, coefficient: a, rSquared };
}

/**
 * Run comprehensive scaling analysis
 */
async function runDeepScalingAnalysis(): Promise<void> {
  console.log('\n'.repeat(2));
  console.log('█'.repeat(70));
  console.log('DEEP SCALING ANALYSIS');
  console.log('█'.repeat(70));
  console.log();

  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  const results: ScalingDataPoint[] = [];

  console.log('Part 1: Finding Minimum Shots for Naive Method');
  console.log('='.repeat(70));
  console.log();

  for (const N of sizes) {
    console.log(`\n  Testing N=${N}:`);

    const database = Array.from({ length: N }, (_, i) => i + 1);
    const target = Math.floor(N / 2);

    // Find minimum shots for naive
    const naiveMin = findMinimumShotsNaive(N, target, database);

    // Test framework
    console.log(`    Testing framework...`);
    const framework = testFramework(N, target, database);
    console.log(`      → ${framework.shots} shots (${(framework.confidence*100).toFixed(1)}% conf)`);

    const improvement = naiveMin.minShots / framework.shots;

    results.push({
      N,
      naiveMinShots: naiveMin.minShots,
      naiveMinConfidence: naiveMin.confidence,
      frameworkShots: framework.shots,
      frameworkConfidence: framework.confidence,
      improvement
    });

    console.log(`    📊 Fair comparison: ${improvement.toFixed(1)}× improvement`);
  }

  // Analysis
  console.log('\n\n');
  console.log('█'.repeat(70));
  console.log('PART 2: SCALING LAW ANALYSIS');
  console.log('█'.repeat(70));
  console.log();

  // Fit scaling laws
  const naiveData = results.map(r => ({ N: r.N, measurements: r.naiveMinShots }));
  const frameworkData = results.map(r => ({ N: r.N, measurements: r.frameworkShots }));

  const naiveFit = fitScalingLaw(naiveData);
  const frameworkFit = fitScalingLaw(frameworkData);

  console.log('Naive Method Scaling:');
  console.log(`  Measurements = ${naiveFit.coefficient.toFixed(2)} × N^${naiveFit.exponent.toFixed(3)}`);
  console.log(`  R² = ${naiveFit.rSquared.toFixed(4)} (fit quality)`);

  if (naiveFit.exponent < 0.5) {
    console.log(`  Classification: Sub-linear (very efficient!)`);
  } else if (naiveFit.exponent < 1.5) {
    console.log(`  Classification: ~Linear scaling`);
  } else if (naiveFit.exponent < 2.5) {
    console.log(`  Classification: Super-linear O(N^${naiveFit.exponent.toFixed(1)})`);
  } else {
    console.log(`  Classification: Polynomial O(N^${naiveFit.exponent.toFixed(1)})`);
  }

  console.log();
  console.log('Framework Method Scaling:');
  console.log(`  Measurements = ${frameworkFit.coefficient.toFixed(2)} × N^${frameworkFit.exponent.toFixed(3)}`);
  console.log(`  R² = ${frameworkFit.rSquared.toFixed(4)} (fit quality)`);

  if (frameworkFit.exponent < 0.5) {
    console.log(`  Classification: Sub-linear (very efficient!)`);
  } else if (frameworkFit.exponent < 1.5) {
    console.log(`  Classification: ~Linear scaling`);
  } else if (frameworkFit.exponent < 2.5) {
    console.log(`  Classification: Super-linear O(N^${frameworkFit.exponent.toFixed(1)})`);
  } else {
    console.log(`  Classification: Polynomial O(N^${frameworkFit.exponent.toFixed(1)})`);
  }

  console.log();
  console.log('Comparative Analysis:');
  const exponentDiff = naiveFit.exponent - frameworkFit.exponent;
  if (exponentDiff > 0.3) {
    console.log(`  ✅ Framework has BETTER asymptotic scaling (exponent ${frameworkFit.exponent.toFixed(2)} vs ${naiveFit.exponent.toFixed(2)})`);
  } else if (exponentDiff < -0.3) {
    console.log(`  ⚠️  Naive has BETTER asymptotic scaling (exponent ${naiveFit.exponent.toFixed(2)} vs ${frameworkFit.exponent.toFixed(2)})`);
  } else {
    console.log(`  📊 Similar asymptotic scaling (both ~O(N^${frameworkFit.exponent.toFixed(2)}))`);
  }

  // Results table
  console.log('\n\n');
  console.log('█'.repeat(70));
  console.log('FAIR COMPARISON RESULTS');
  console.log('█'.repeat(70));
  console.log();

  console.log('┌────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│   N    │ Naive (min)  │  Framework   │  Improvement │');
  console.log('├────────┼──────────────┼──────────────┼──────────────┤');

  for (const r of results) {
    const naive = String(r.naiveMinShots.toLocaleString()).padEnd(12);
    const framework = String(r.frameworkShots.toLocaleString()).padEnd(12);
    const improvement = `${r.improvement.toFixed(1)}×`.padEnd(12);

    console.log(`│ ${String(r.N).padStart(6)} │ ${naive} │ ${framework} │ ${improvement} │`);
  }

  console.log('└────────┴──────────────┴──────────────┴──────────────┘');
  console.log();

  // Statistics
  const avgImprovement = results.reduce((sum, r) => sum + r.improvement, 0) / results.length;
  const minImprovement = Math.min(...results.map(r => r.improvement));
  const maxImprovement = Math.max(...results.map(r => r.improvement));

  console.log('📊 Fair Comparison Statistics:');
  console.log(`   Average improvement:  ${avgImprovement.toFixed(1)}×`);
  console.log(`   Range:                ${minImprovement.toFixed(1)}× to ${maxImprovement.toFixed(1)}×`);
  console.log();

  // Predictions
  console.log('📈 Predictions (using fitted models):');
  const testSizes = [2048, 4096, 8192];
  for (const N of testSizes) {
    const naivePredicted = naiveFit.coefficient * Math.pow(N, naiveFit.exponent);
    const frameworkPredicted = frameworkFit.coefficient * Math.pow(N, frameworkFit.exponent);
    const predictedImprovement = naivePredicted / frameworkPredicted;

    console.log(`   N=${N}:  Naive ~${Math.round(naivePredicted).toLocaleString()}, Framework ~${Math.round(frameworkPredicted).toLocaleString()}, Improvement ~${predictedImprovement.toFixed(1)}×`);
  }

  // Verdict
  console.log('\n\n');
  console.log('█'.repeat(70));
  console.log('FINAL VERDICT');
  console.log('█'.repeat(70));
  console.log();

  if (exponentDiff > 0.3) {
    console.log('✅ ASYMPTOTIC ADVANTAGE: Framework has better scaling');
    console.log();
    console.log(`   Framework: O(N^${frameworkFit.exponent.toFixed(2)})`);
    console.log(`   Naive:     O(N^${naiveFit.exponent.toFixed(2)})`);
    console.log();
    console.log('   Advantage GROWS with problem size!');
  } else if (exponentDiff < -0.3) {
    console.log('⚠️  ASYMPTOTIC DISADVANTAGE: Naive has better scaling');
    console.log();
    console.log(`   Framework: O(N^${frameworkFit.exponent.toFixed(2)})`);
    console.log(`   Naive:     O(N^${naiveFit.exponent.toFixed(2)})`);
    console.log();
    console.log('   Advantage SHRINKS at large N (eventually naive wins)');
  } else {
    console.log('📊 CONSTANT FACTOR ADVANTAGE: Similar asymptotic scaling');
    console.log();
    console.log(`   Both methods: ~O(N^${frameworkFit.exponent.toFixed(2)})`);
    console.log(`   Framework has ${avgImprovement.toFixed(1)}× constant factor advantage`);
    console.log();
    console.log('   Advantage persists but doesn\'t grow with N');
  }

  console.log();
  console.log('█'.repeat(70));
  console.log();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDeepScalingAnalysis().catch(console.error);
}

export { runDeepScalingAnalysis, findMinimumShotsNaive, fitScalingLaw };
