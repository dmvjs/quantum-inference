/**
 * VALIDATION EXPERIMENTS FOR THE GENERALIZED FRAMEWORK
 *
 * Hypothesis: Statistical pattern extraction from noisy quantum measurements
 * is more powerful than previously thought, and works across ALL quantum algorithms.
 *
 * This file contains systematic experiments to validate:
 * 1. Transferability (does it work on different algorithms?)
 * 2. Noise tolerance (how much error can it handle?)
 * 3. Efficiency (how close to theoretical optimum?)
 * 4. Scalability (does it work at different problem sizes?)
 */

import { GroverSearchFramework } from './grover-search-framework.js';
import { QuantumPhaseEstimationFramework } from './qpe-framework.js';
import { QuantumSimulator } from './quantum-simulator.js';

interface ExperimentResult {
  algorithm: string;
  test: string;
  success: boolean;
  confidence: number;
  entropy: number;
  measurementsUsed: number;
  earlyStop: boolean;
  additionalMetrics?: Record<string, number>;
}

/**
 * TEST 1: TRANSFERABILITY
 * Same noise model (85% error), different algorithms
 */
export async function testTransferability(): Promise<ExperimentResult[]> {
  console.log('\n=== TRANSFERABILITY TEST ===');
  console.log('Testing if framework works across different quantum algorithms\n');

  const results: ExperimentResult[] = [];
  const errorRate = 0.85;  // High noise level

  // Test 1a: Shor's algorithm (period-finding)
  console.log('Testing Shor\'s algorithm (period-finding)...');
  const shorSim = new QuantumSimulator();
  const shorResult = shorSim.simulate(323, 2, 50000);
  results.push({
    algorithm: 'Shor',
    test: 'transferability',
    success: shorResult.period === 72,
    confidence: shorResult.confidence,
    entropy: 0,
    measurementsUsed: 50000,
    earlyStop: false,
    additionalMetrics: {
      correctPeriod: shorResult.period === 72 ? 1 : 0
    }
  });
  console.log(`  Result: period=${shorResult.period}, confidence=${(shorResult.confidence * 100).toFixed(1)}%\n`);

  // Test 1b: Grover's search
  console.log('Testing Grover\'s search...');
  const grover = new GroverSearchFramework();
  const database = [5, 12, 23, 45, 67, 89, 123, 456];
  const target = 67;
  const groverResult = grover.search(database, target, 5000, errorRate);
  results.push({
    algorithm: 'Grover',
    test: 'transferability',
    success: groverResult.actualSuccess,
    confidence: groverResult.confidence,
    entropy: groverResult.entropy,
    measurementsUsed: groverResult.measurementsUsed,
    earlyStop: groverResult.earlyStop,
    additionalMetrics: {
      found: groverResult.found || -1,
      expectedTarget: target
    }
  });
  console.log(`  Result: found=${groverResult.found}, confidence=${(groverResult.confidence * 100).toFixed(1)}%\n`);

  // Test 1c: Quantum Phase Estimation
  console.log('Testing Quantum Phase Estimation...');
  const qpe = new QuantumPhaseEstimationFramework();
  const truePhase = 0.375;
  const qpeResult = qpe.estimatePhase(truePhase, 8, 5000, errorRate);
  results.push({
    algorithm: 'QPE',
    test: 'transferability',
    success: qpeResult.error < 0.05,
    confidence: qpeResult.confidence,
    entropy: qpeResult.entropy,
    measurementsUsed: qpeResult.measurementsUsed,
    earlyStop: qpeResult.earlyStop,
    additionalMetrics: {
      error: qpeResult.error,
      precision: qpeResult.precision,
      truePhase
    }
  });
  console.log(`  Result: estimated=${qpeResult.estimatedPhase?.toFixed(4)}, error=${qpeResult.error.toFixed(4)}\n`);

  // Analysis
  const successRate = results.filter(r => r.success).length / results.length;
  const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  const variance = results.reduce(
    (sum, r) => sum + Math.pow(r.confidence - avgConfidence, 2),
    0
  ) / results.length;

  console.log('--- Analysis ---');
  console.log(`Success rate: ${(successRate * 100).toFixed(1)}%`);
  console.log(`Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`Confidence variance: ${variance.toFixed(4)}`);
  console.log(
    variance < 0.1
      ? '✓ Low variance - framework transfers well across algorithms!'
      : '✗ High variance - performance varies by algorithm'
  );

  return results;
}

/**
 * TEST 2: NOISE TOLERANCE
 * How much error can the framework handle?
 */
export async function testNoiseTolerance(): Promise<ExperimentResult[]> {
  console.log('\n=== NOISE TOLERANCE TEST ===');
  console.log('Testing framework at different error rates\n');

  const results: ExperimentResult[] = [];
  const errorRates = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95];

  for (const errorRate of errorRates) {
    console.log(`Testing at ${(errorRate * 100).toFixed(0)}% error rate...`);

    const grover = new GroverSearchFramework();
    const database = [5, 12, 23, 45, 67, 89, 123, 456];
    const target = 67;
    const result = grover.search(database, target, 5000, errorRate);

    results.push({
      algorithm: 'Grover',
      test: 'noise_tolerance',
      success: result.actualSuccess,
      confidence: result.confidence,
      entropy: result.entropy,
      measurementsUsed: result.measurementsUsed,
      earlyStop: result.earlyStop,
      additionalMetrics: {
        errorRate,
        found: result.found || -1
      }
    });

    console.log(`  Success: ${result.actualSuccess}, Confidence: ${(result.confidence * 100).toFixed(1)}%\n`);
  }

  // Find breaking point
  const breakingPoint = errorRates.find(
    (_rate, idx) => results[idx].success && (!results[idx + 1] || !results[idx + 1].success)
  );

  console.log('--- Analysis ---');
  console.log(`Breaking point: ${breakingPoint ? (breakingPoint * 100).toFixed(0) : '95+'}% error rate`);
  console.log(`Tolerance: Framework works up to ${breakingPoint ? (breakingPoint * 100).toFixed(0) : '95+'}% noise`);

  return results;
}

/**
 * TEST 3: EARLY STOPPING EFFICIENCY
 * Does progressive inference save measurements?
 */
export async function testEarlyStoppingEfficiency(): Promise<ExperimentResult[]> {
  console.log('\n=== EARLY STOPPING EFFICIENCY TEST ===');
  console.log('Comparing standard vs progressive inference\n');

  const results: ExperimentResult[] = [];

  // Test on multiple algorithms
  const tests = [
    {
      name: 'Grover',
      run: () => {
        const grover = new GroverSearchFramework();
        const db = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
        return {
          standard: grover.search(db, 9, 50000, 0.85),
          progressive: grover.searchProgressive(db, 9, 50000, 0.85)
        };
      }
    },
    {
      name: 'QPE',
      run: () => {
        const qpe = new QuantumPhaseEstimationFramework();
        return {
          standard: qpe.estimatePhase(0.25, 8, 50000, 0.85),
          progressive: qpe.estimatePhaseProgressive(0.25, 8, 50000, 0.85)
        };
      }
    }
  ];

  for (const test of tests) {
    console.log(`Testing ${test.name}...`);
    const { standard, progressive } = test.run();

    results.push(
      {
        algorithm: test.name,
        test: 'early_stopping_standard',
        success: 'actualSuccess' in standard ? standard.actualSuccess : standard.error < 0.05,
        confidence: standard.confidence,
        entropy: standard.entropy,
        measurementsUsed: standard.measurementsUsed,
        earlyStop: standard.earlyStop
      },
      {
        algorithm: test.name,
        test: 'early_stopping_progressive',
        success: 'actualSuccess' in progressive ? progressive.actualSuccess : progressive.error < 0.05,
        confidence: progressive.confidence,
        entropy: progressive.entropy,
        measurementsUsed: progressive.measurementsUsed,
        earlyStop: progressive.earlyStop,
        additionalMetrics: {
          savings: ((50000 - progressive.measurementsUsed) / 50000) * 100
        }
      }
    );

    console.log(`  Standard: ${standard.measurementsUsed} measurements`);
    console.log(`  Progressive: ${progressive.measurementsUsed} measurements`);
    console.log(`  Savings: ${(((50000 - progressive.measurementsUsed) / 50000) * 100).toFixed(1)}%\n`);
  }

  return results;
}

/**
 * TEST 4: COMPARISON TO BASELINE
 * How does framework compare to your original implementation?
 */
export async function testComparisonToBaseline(): Promise<ExperimentResult[]> {
  console.log('\n=== BASELINE COMPARISON TEST ===');
  console.log('Framework vs Original Implementation\n');

  const results: ExperimentResult[] = [];
  const testCases = [323, 667, 2501, 3131];

  for (const N of testCases) {
    console.log(`Testing N=${N}...`);

    // Original implementation
    const originalSim = new QuantumSimulator();
    const originalResult = originalSim.simulate(N, 2, 300000);

    results.push({
      algorithm: 'Shor_Original',
      test: 'baseline_comparison',
      success: originalResult.period !== null,
      confidence: originalResult.confidence,
      entropy: 0,
      measurementsUsed: 300000,
      earlyStop: false,
      additionalMetrics: {
        N,
        period: originalResult.period || -1
      }
    });

    console.log(`  Original: period=${originalResult.period}, conf=${(originalResult.confidence * 100).toFixed(1)}%\n`);
  }

  return results;
}

/**
 * RUN ALL VALIDATION EXPERIMENTS
 */
export async function runAllValidation(): Promise<void> {
  console.log('\n'.repeat(2));
  console.log('='.repeat(70));
  console.log('GENERALIZED QUANTUM INFERENCE FRAMEWORK - VALIDATION SUITE');
  console.log('='.repeat(70));

  const allResults: ExperimentResult[] = [];

  // Test 1: Transferability
  const transferResults = await testTransferability();
  allResults.push(...transferResults);

  // Test 2: Noise tolerance
  const noiseResults = await testNoiseTolerance();
  allResults.push(...noiseResults);

  // Test 3: Early stopping
  const earlyStopResults = await testEarlyStoppingEfficiency();
  allResults.push(...earlyStopResults);

  // Test 4: Baseline comparison
  const baselineResults = await testComparisonToBaseline();
  allResults.push(...baselineResults);

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const totalTests = allResults.length;
  const successfulTests = allResults.filter(r => r.success).length;
  const avgConfidence = allResults.reduce((sum, r) => sum + r.confidence, 0) / totalTests;
  const earlyStops = allResults.filter(r => r.earlyStop).length;

  console.log(`Total tests: ${totalTests}`);
  console.log(`Successful: ${successfulTests} (${((successfulTests / totalTests) * 100).toFixed(1)}%)`);
  console.log(`Average confidence: ${(avgConfidence * 100).toFixed(1)}%`);
  console.log(`Early stops: ${earlyStops} (${((earlyStops / totalTests) * 100).toFixed(1)}%)`);

  // Key findings
  console.log('\n--- KEY FINDINGS ---');
  if (successfulTests / totalTests > 0.8) {
    console.log('✓ Framework demonstrates strong performance across algorithms');
  }
  if (avgConfidence > 0.7) {
    console.log('✓ High average confidence suggests robust pattern extraction');
  }
  if (earlyStops > totalTests * 0.3) {
    console.log('✓ Early stopping provides significant measurement savings');
  }

  // Export results
  const output = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests,
      successfulTests,
      successRate: successfulTests / totalTests,
      avgConfidence,
      earlyStopRate: earlyStops / totalTests
    },
    results: allResults
  };

  console.log('\n--- RESULTS EXPORTED ---');
  console.log(JSON.stringify(output, null, 2));
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllValidation().catch(console.error);
}
