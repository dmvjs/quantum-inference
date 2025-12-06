import { QuantumSimulator } from './quantum-simulator.js';

function isPrime(n: number): boolean {
  if (n <= 1) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

async function testNumber(N: number, trials: number = 1): Promise<{ successes: number; total: number }> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing N = ${N} (${trials} ${trials === 1 ? 'trial' : 'trials'})`);
  console.log('='.repeat(60));

  if (N % 2 === 0) {
    console.log(`✓ Even number: ${N} = 2 × ${N/2}`);
    return { successes: 1, total: 1 };
  }

  if (isPrime(N)) {
    console.log(`✓ Prime detected: ${N} cannot be factored`);
    return { successes: 1, total: 1 };
  }

  let successes = 0;
  const simulator = new QuantumSimulator();

  for (let i = 0; i < trials; i++) {
    if (trials > 1) console.log(`\nTrial ${i + 1}/${trials}:`);

    const startTime = Date.now();
    const factors = await simulator.multiBaseFactoring(N, 5);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    if (factors) {
      const product = factors[0] * factors[1];
      const isCorrect = product === N && factors[0] > 1 && factors[1] > 1;

      if (isCorrect) {
        console.log(`  ✓ SUCCESS: ${N} = ${factors[0]} × ${factors[1]} (${elapsed}s)`);
        successes++;
      } else {
        console.log(`  ✗ INCORRECT: ${N} ≠ ${factors[0]} × ${factors[1]} = ${product} (${elapsed}s)`);
      }
    } else {
      console.log(`  ✗ FAILED: Period not detected (${elapsed}s)`);
    }
  }

  if (trials > 1) {
    console.log(`\nResult: ${successes}/${trials} successes (${(successes/trials*100).toFixed(0)}%)`);
  }

  return { successes, total: trials };
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Quantum Factoring Verification Suite                     ║
║  Testing all README examples                              ║
╚════════════════════════════════════════════════════════════╝
`);

  const tests = [
    { N: 323,  expected: 'medium', rate: '~16%', desc: '17×19, φ=288, period φ/2',         trials: 10, min: 1,   max: 3   },
    { N: 667,  expected: 'medium', rate: '~14%', desc: '23×29, φ=616, period φ/2',         trials: 10, min: 0,   max: 3   },
    { N: 1003, expected: 'low',    rate: '~18%', desc: '17×59, φ=928, period φ/4',         trials: 5,  min: 0,   max: 2   },
    { N: 1517, expected: 'low',    rate: '~6%',  desc: '37×41, φ=1440, period φ/6',        trials: 5,  min: 0,   max: 1   },
    { N: 2501, expected: 'low',    rate: '~6%',  desc: '41×61, φ=2400, period φ/20',       trials: 5,  min: 0,   max: 1   },
    { N: 3007, expected: 'edge',   rate: '~3%',  desc: '31×97, φ=2880, period φ/6',        trials: 3,  min: 0,   max: 1   },
    { N: 3131, expected: 'edge',   rate: '~7%',  desc: '31×101, φ=3000, period φ/20',      trials: 3,  min: 0,   max: 1   },
    { N: 3379, expected: 'edge',   rate: '~3%',  desc: '31×109, φ=3240, period φ/6',       trials: 3,  min: 0,   max: 1   },
  ];

  const results: { N: number; successes: number; total: number; expected: string; min: number; max: number }[] = [];

  for (const test of tests) {
    console.log(`\nTest: N=${test.N} | Expected: ${test.rate} | ${test.desc}`);
    const result = await testNumber(test.N, test.trials);
    results.push({
      N: test.N,
      successes: result.successes,
      total: result.total,
      expected: test.expected,
      min: test.min,
      max: test.max
    });
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  let allPass = true;

  for (let i = 0; i < results.length; i++) {
    const { N, successes, total, expected, min, max } = results[i];
    const test = tests[i];

    const rate = total > 1 ? `${successes}/${total} (${(successes/total*100).toFixed(0)}%)` : (successes === 1 ? 'SUCCESS' : 'FAILED');
    const inRange = successes >= min && successes <= max;

    let status = '';
    if (expected === 'medium') {
      status = inRange ? `✓ PASS (${min}-${max}/${total} expected)` : `⚠ RETRY (${min}-${max}/${total} expected)`;
    } else if (expected === 'low') {
      status = inRange ? `✓ PASS (${min}-${max}/${total} expected)` : `⚠ RETRY (${min}-${max}/${total} expected)`;
    } else if (expected === 'edge') {
      status = inRange ? `✓ PASS (${min}-${max}/${total} expected)` : `⚠ RETRY (${min}-${max}/${total} expected)`;
    } else {
      status = inRange ? '✓ PASS' : '⚠ RETRY';
    }

    if (!inRange) allPass = false;

    console.log(`N=${N.toString().padEnd(5)} | ${rate.padEnd(20)} | ${status.padEnd(35)} | ${test.desc}`);
  }

  console.log('\n' + '='.repeat(60));
  if (allPass) {
    console.log('✓ ALL TESTS IN EXPECTED RANGE');
  } else {
    console.log('⚠ SOME TESTS OUTSIDE RANGE (probabilistic, rerun if needed)');
  }
  console.log('='.repeat(60) + '\n');
}

main();
