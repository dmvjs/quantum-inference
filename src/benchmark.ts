import { QuantumSimulator } from './quantum-simulator.js';
import { eulerTotient, getDivisors } from './math.js';
import * as fs from 'fs';

interface BenchmarkResult {
  N: number;
  factors: [number, number];
  phi: number;
  phiDivisorCount: number;
  strategy: 'smooth' | 'random';
  trial: number;
  success: boolean;
  basesAttempted: number;
  winningBase?: number;
  timeMs: number;
  confidence?: number;
  period?: number;
}

// Generate test numbers (semiprimes)
function generateTestNumbers(): number[] {
  const primes = [
    3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73,
    79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157,
    163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239,
    241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331
  ];

  const numbers: number[] = [];

  // Generate semiprimes in range 100-1200
  for (let i = 0; i < primes.length; i++) {
    for (let j = i; j < primes.length; j++) {
      const N = primes[i] * primes[j];
      if (N >= 100 && N <= 1200) {
        numbers.push(N);
      }
    }
  }

  // Sort and take evenly spaced samples
  numbers.sort((a, b) => a - b);
  const sampled: number[] = [];
  const step = Math.floor(numbers.length / 30); // ~30 test numbers
  for (let i = 0; i < numbers.length; i += step) {
    sampled.push(numbers[i]);
  }

  return sampled;
}

async function benchmarkNumber(
  N: number,
  factors: [number, number],
  strategy: 'smooth' | 'random',
  trial: number
): Promise<BenchmarkResult> {
  const phi = eulerTotient(N);
  const phiDivisors = getDivisors(phi);

  const startTime = Date.now();
  const simulator = new QuantumSimulator();

  // Temporarily override strategy if needed
  // (Would need to add a parameter to multiBaseFactoring)
  // For now, assume current implementation is "smooth"

  try {
    const result = await simulator.multiBaseFactoring(N, 25); // Max 25 bases
    const timeMs = Date.now() - startTime;

    if (result && result[0] * result[1] === N) {
      return {
        N,
        factors,
        phi,
        phiDivisorCount: phiDivisors.length,
        strategy,
        trial,
        success: true,
        basesAttempted: 0, // Would need to track this
        winningBase: undefined, // Would need to track this
        timeMs,
        confidence: undefined, // Would need to pass this through
        period: undefined
      };
    } else {
      return {
        N,
        factors,
        phi,
        phiDivisorCount: phiDivisors.length,
        strategy,
        trial,
        success: false,
        basesAttempted: 25,
        timeMs,
      };
    }
  } catch (error) {
    return {
      N,
      factors,
      phi,
      phiDivisorCount: phiDivisors.length,
      strategy,
      trial,
      success: false,
      basesAttempted: 25,
      timeMs: Date.now() - startTime,
    };
  }
}

async function runBenchmark() {
  const testNumbers = generateTestNumbers();
  const trialsPerNumber = 5;
  const strategies: Array<'smooth' | 'random'> = ['smooth']; // Add 'random' when implemented

  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  Quantum Factoring Benchmark Suite                        ║`);
  console.log(`║  Testing ${testNumbers.length} numbers × ${trialsPerNumber} trials × ${strategies.length} strategies              ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  const results: BenchmarkResult[] = [];

  for (const N of testNumbers) {
    // Factor N to know the answer
    let p = 0, q = 0;
    for (let i = 2; i <= Math.sqrt(N); i++) {
      if (N % i === 0) {
        p = i;
        q = N / i;
        break;
      }
    }

    if (p === 0) continue; // Skip primes

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Testing N=${N} (${p}×${q}), φ=${eulerTotient(N)}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    for (const strategy of strategies) {
      let successCount = 0;
      let totalTime = 0;

      console.log(`\nStrategy: ${strategy}`);

      for (let trial = 1; trial <= trialsPerNumber; trial++) {
        const result = await benchmarkNumber(N, [p, q], strategy, trial);
        results.push(result);

        if (result.success) {
          successCount++;
          totalTime += result.timeMs;
          process.stdout.write(`  Trial ${trial}/${trialsPerNumber}: ✓ (${(result.timeMs/1000).toFixed(1)}s)\n`);
        } else {
          process.stdout.write(`  Trial ${trial}/${trialsPerNumber}: ✗\n`);
        }
      }

      const successRate = (successCount / trialsPerNumber * 100).toFixed(0);
      const avgTime = successCount > 0 ? (totalTime / successCount / 1000).toFixed(1) : 'N/A';
      console.log(`  Result: ${successCount}/${trialsPerNumber} (${successRate}%) | Avg time: ${avgTime}s`);
    }
  }

  // Save results to CSV
  const csv = [
    'N,p,q,phi,phi_divisors,strategy,trial,success,bases_attempted,time_ms',
    ...results.map(r =>
      `${r.N},${r.factors[0]},${r.factors[1]},${r.phi},${r.phiDivisorCount},${r.strategy},${r.trial},${r.success},${r.basesAttempted},${r.timeMs}`
    )
  ].join('\n');

  fs.writeFileSync('benchmark-results.csv', csv);

  // Summary statistics
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  BENCHMARK COMPLETE                                        ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);

  for (const strategy of strategies) {
    const stratResults = results.filter(r => r.strategy === strategy);
    const totalTrials = stratResults.length;
    const successes = stratResults.filter(r => r.success).length;
    const successRate = (successes / totalTrials * 100).toFixed(1);

    console.log(`${strategy.toUpperCase()} Strategy:`);
    console.log(`  Success: ${successes}/${totalTrials} (${successRate}%)`);
    console.log(`  Avg time: ${(stratResults.filter(r => r.success).reduce((a, b) => a + b.timeMs, 0) / successes / 1000).toFixed(1)}s\n`);
  }

  // Group by N ranges
  const ranges = [
    [100, 300],
    [300, 500],
    [500, 700],
    [700, 900],
    [900, 1200]
  ];

  console.log(`\nSuccess rate by N range:`);
  for (const [min, max] of ranges) {
    const rangeResults = results.filter(r => r.N >= min && r.N < max);
    if (rangeResults.length === 0) continue;
    const successes = rangeResults.filter(r => r.success).length;
    const rate = (successes / rangeResults.length * 100).toFixed(0);
    console.log(`  N ∈ [${min}, ${max}): ${successes}/${rangeResults.length} (${rate}%)`);
  }

  console.log(`\nResults saved to: benchmark-results.csv`);
  console.log(`\nNext steps:`);
  console.log(`  1. Plot success rate vs N`);
  console.log(`  2. Plot success rate vs φ(N) divisor count`);
  console.log(`  3. Analyze time to factorization distribution`);
  console.log(`  4. Compare smooth vs random strategies (when random implemented)`);
}

runBenchmark().catch(console.error);
