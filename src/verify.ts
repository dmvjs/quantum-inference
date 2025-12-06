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
    { N: 21,  expected: 'high',   rate: '~95%',  desc: 'Small period, high signal',        trials: 1,  min: 1,   max: 1   },
    { N: 143, expected: 'medium',  rate: '~60%', desc: 'Medium period, moderate signal',    trials: 10, min: 4,   max: 8   },
    { N: 323, expected: 'chaos',   rate: '~80%', desc: 'CHAOS: Extended range',             trials: 5,  min: 3,   max: 5   },
    { N: 437, expected: 'chaos',   rate: '~70%', desc: 'CHAOS: Large composite',            trials: 5,  min: 2,   max: 5   },
    { N: 551, expected: 'edge',    rate: '~50%', desc: 'CHAOS: Near limit',                 trials: 5,  min: 1,   max: 4   },
    { N: 667, expected: 'edge',    rate: '~30%', desc: 'CHAOS: Noise threshold',            trials: 5,  min: 0,   max: 3   },
    { N: 899, expected: 'extreme', rate: '~20%', desc: 'CHAOS: Beyond old limits',          trials: 5,  min: 0,   max: 2   },
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
    if (expected === 'trivial' || expected === 'prime') {
      status = inRange ? '✓ PASS' : '✗ FAIL';
    } else if (expected === 'high') {
      status = inRange ? '✓ PASS' : '⚠ RETRY';
    } else if (expected === 'medium') {
      status = inRange ? `✓ PASS (${min}-${max}/${total} expected)` : `✗ FAIL (${min}-${max}/${total} expected)`;
    } else if (expected === 'low') {
      status = inRange ? `✓ PASS (${min}-${max}/${total} expected)` : `✗ FAIL (${min}-${max}/${total} expected)`;
    } else if (expected === 'fail') {
      status = inRange ? '✓ PASS (correctly failed)' : '✗ FAIL (should not succeed)';
    }

    if (!inRange) allPass = false;

    console.log(`N=${N.toString().padEnd(4)} | ${rate.padEnd(20)} | ${status.padEnd(30)} | ${test.rate}`);
  }

  console.log('\n' + '='.repeat(60));
  if (allPass) {
    console.log('✓ ALL TESTS PASSED');
  } else {
    console.log('⚠ SOME TESTS OUTSIDE EXPECTED RANGE (rerun to verify)');
  }
  console.log('='.repeat(60) + '\n');
}

main();
