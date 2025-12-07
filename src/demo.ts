#!/usr/bin/env node
/**
 * THE VALUE: One Perfect Problem
 *
 * Run this to see the framework's value in 10 seconds.
 */

import { GroverSearchFramework } from './grover-search-framework.js';

console.clear();
console.log('█'.repeat(70));
console.log('QUANTUM PATTERN EXTRACTION: THE VALUE');
console.log('█'.repeat(70));
console.log();

const database = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const target = 9;
const noise = 0.85; // 85% error rate

console.log(`PROBLEM: Find the number ${target} in a list of 16 numbers`);
console.log(`         Using a quantum computer with 85% noise\n`);

console.log('─'.repeat(70));
console.log('METHOD 1: Naive (Standard Approach)');
console.log('─'.repeat(70));

const grover = new GroverSearchFramework();

const naive = grover.search(database, target, 50000, noise);

console.log(`  Strategy:    Take 50,000 quantum measurements`);
console.log(`               Pick the most frequent value`);
console.log();
console.log(`  Result:      Found ${naive.found} ${naive.actualSuccess ? '✓' : '✗'}`);
console.log(`  Confidence:  ${(naive.confidence * 100).toFixed(1)}%`);
console.log(`  Measurements: ${naive.measurementsUsed.toLocaleString()}`);

if (!naive.actualSuccess) {
  console.log(`  Status:      ❌ WRONG ANSWER`);
} else {
  console.log(`  Status:      ✓ Correct`);
}

console.log();
console.log('─'.repeat(70));
console.log('METHOD 2: Framework (Bayesian + Progressive)');
console.log('─'.repeat(70));

const framework = grover.searchProgressive(database, target, 50000, noise);

console.log(`  Strategy:    Structured Bayesian inference`);
console.log(`               Progressive batching with early stopping`);
console.log();
console.log(`  Result:      Found ${framework.found} ${framework.actualSuccess ? '✓' : '✗'}`);
console.log(`  Confidence:  ${(framework.confidence * 100).toFixed(1)}%`);
console.log(`  Measurements: ${framework.measurementsUsed.toLocaleString()}`);
console.log(`  Early Stop:  ${framework.earlyStop ? 'YES' : 'NO'}`);

if (!framework.actualSuccess) {
  console.log(`  Status:      ❌ WRONG ANSWER`);
} else {
  console.log(`  Status:      ✓ CORRECT`);
}

console.log();
console.log('█'.repeat(70));
console.log('THE VALUE');
console.log('█'.repeat(70));

const improvement = naive.measurementsUsed / framework.measurementsUsed;
const confImprovement = framework.confidence / (naive.confidence || 0.01);

console.log();
console.log(`  Measurements:  ${improvement.toFixed(0)}× FEWER (${naive.measurementsUsed.toLocaleString()} → ${framework.measurementsUsed.toLocaleString()})`);
console.log(`  Confidence:    ${confImprovement.toFixed(1)}× HIGHER (${(naive.confidence*100).toFixed(1)}% → ${(framework.confidence*100).toFixed(1)}%)`);
console.log(`  Correctness:   ${naive.actualSuccess ? 'Both correct' : 'Naive FAILS, Framework WORKS'}`);
console.log();

if (improvement > 1000 && framework.actualSuccess) {
  console.log(`  🎉 Framework is ${improvement.toFixed(0)}× more efficient!`);
  console.log();
  console.log(`  This is the power of structured statistical pattern extraction`);
  console.log(`  from noisy quantum measurements.`);
} else if (framework.actualSuccess && !naive.actualSuccess) {
  console.log(`  ✓ Framework WORKS where naive FAILS`);
  console.log(`    (using ${improvement.toFixed(0)}× fewer measurements)`);
}

console.log();
console.log('█'.repeat(70));
console.log();
