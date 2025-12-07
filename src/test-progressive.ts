/**
 * FOCUSED TEST: Progressive Inference with Early Stopping
 *
 * Demonstrates the framework's ability to stop early and save measurements
 */

import { GroverSearchFramework } from './grover-search-framework.js';
import { QuantumPhaseEstimationFramework } from './qpe-framework.js';

console.log('=== PROGRESSIVE INFERENCE DEMONSTRATION ===\n');

// Test 1: Grover's search
console.log('Test 1: Grover\'s Search\n');
const grover = new GroverSearchFramework();
const database = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const target = 9;

console.log('Standard (non-progressive):');
const groverStandard = grover.search(database, target, 10000, 0.85);
console.log(`  Measurements used: ${groverStandard.measurementsUsed}`);
console.log(`  Found: ${groverStandard.found}, Correct: ${groverStandard.actualSuccess}`);
console.log(`  Confidence: ${(groverStandard.confidence * 100).toFixed(1)}%`);
console.log(`  Early stop: ${groverStandard.earlyStop}\n`);

console.log('Progressive (with early stopping):');
const groverProgressive = grover.searchProgressive(database, target, 10000, 0.85);
console.log(`  Measurements used: ${groverProgressive.measurementsUsed}`);
console.log(`  Found: ${groverProgressive.found}, Correct: ${groverProgressive.actualSuccess}`);
console.log(`  Confidence: ${(groverProgressive.confidence * 100).toFixed(1)}%`);
console.log(`  Early stop: ${groverProgressive.earlyStop}`);

const groverSavings = ((10000 - groverProgressive.measurementsUsed) / 10000) * 100;
console.log(`  Savings: ${groverSavings.toFixed(1)}% (${10000 - groverProgressive.measurementsUsed} measurements)\n`);

// Test 2: Quantum Phase Estimation
console.log('\nTest 2: Quantum Phase Estimation\n');
const qpe = new QuantumPhaseEstimationFramework();
const truePhase = 0.25;

console.log('Standard (non-progressive):');
const qpeStandard = qpe.estimatePhase(truePhase, 8, 10000, 0.85);
console.log(`  Measurements used: ${qpeStandard.measurementsUsed}`);
console.log(`  Estimated: ${qpeStandard.estimatedPhase?.toFixed(4)}, Error: ${qpeStandard.error.toFixed(4)}`);
console.log(`  Confidence: ${(qpeStandard.confidence * 100).toFixed(1)}%`);
console.log(`  Early stop: ${qpeStandard.earlyStop}\n`);

console.log('Progressive (with early stopping):');
const qpeProgressive = qpe.estimatePhaseProgressive(truePhase, 8, 10000, 0.85);
console.log(`  Measurements used: ${qpeProgressive.measurementsUsed}`);
console.log(`  Estimated: ${qpeProgressive.estimatedPhase?.toFixed(4)}, Error: ${qpeProgressive.error.toFixed(4)}`);
console.log(`  Confidence: ${(qpeProgressive.confidence * 100).toFixed(1)}%`);
console.log(`  Early stop: ${qpeProgressive.earlyStop}`);

const qpeSavings = ((10000 - qpeProgressive.measurementsUsed) / 10000) * 100;
console.log(`  Savings: ${qpeSavings.toFixed(1)}% (${10000 - qpeProgressive.measurementsUsed} measurements)\n`);

// Summary
console.log('\n=== SUMMARY ===');
console.log(`Grover: ${groverProgressive.earlyStop ? 'STOPPED EARLY' : 'Used all measurements'} - ${groverSavings.toFixed(0)}% savings`);
console.log(`QPE: ${qpeProgressive.earlyStop ? 'STOPPED EARLY' : 'Used all measurements'} - ${qpeSavings.toFixed(0)}% savings`);

const avgSavings = (groverSavings + qpeSavings) / 2;
console.log(`\nAverage savings: ${avgSavings.toFixed(0)}%`);

if (avgSavings > 50) {
  console.log('✓ Progressive inference provides significant measurement savings!');
} else if (avgSavings > 20) {
  console.log('~ Progressive inference provides moderate savings');
} else {
  console.log('✗ Early stopping not triggering effectively');
}
