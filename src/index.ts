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

function trialDivision(n: number, limit: number = 100000): [number, number] | null {
  const maxTrial = Math.min(limit, Math.floor(Math.sqrt(n)));

  // Check small primes efficiently
  if (n % 2 === 0) return [2, n / 2];
  if (n % 3 === 0) return [3, n / 3];

  // 6k±1 optimization
  for (let i = 5; i <= maxTrial; i += 6) {
    if (n % i === 0) return [i, n / i];
    if (n % (i + 2) === 0) return [i + 2, n / (i + 2)];
  }

  return null;
}

function fermatFactorization(n: number, maxIterations: number = 10000): [number, number] | null {
  // Only works for odd n
  if (n % 2 === 0) return null;

  let a = Math.ceil(Math.sqrt(n));
  const b2Max = a * a - n;

  for (let i = 0; i < maxIterations; i++) {
    const b2 = a * a - n;
    const b = Math.sqrt(b2);

    if (Number.isInteger(b)) {
      const p = a - b;
      const q = a + b;
      if (p > 1 && q > 1 && p * q === n) {
        return [p, q];
      }
    }

    a++;

    // If a² - n is too large, factors are not close
    if (a * a - n > n / 4) break;
  }

  return null;
}

async function main() {
  const N = process.argv[2] ? parseInt(process.argv[2]) : 21;

  console.log(`\nQuantum Integer Factorization: N = ${N}`);
  console.log('='.repeat(50));

  // Classical preprocessing
  console.log('\n[Classical Preprocessing]');

  if (N % 2 === 0) {
    console.log(`Trivial case (even): ${N} = 2 × ${N/2}\n`);
    return;
  }

  if (isPrime(N)) {
    console.log(`Prime detected: ${N} cannot be factored\n`);
    return;
  }

  // Trial division (fast for small factors)
  const trialStart = Date.now();
  const trialFactors = trialDivision(N, 100000);
  const trialTime = Date.now() - trialStart;

  if (trialFactors) {
    console.log(`✓ Trial division: ${N} = ${trialFactors[0]} × ${trialFactors[1]} (${trialTime}ms)`);
    console.log('='.repeat(50));
    console.log(`Result: ${N} = ${trialFactors[0]} × ${trialFactors[1]} (classical)\n`);
    return;
  } else {
    console.log(`  Trial division: No factors ≤ ${Math.min(100000, Math.floor(Math.sqrt(N)))} (${trialTime}ms)`);
  }

  // Fermat's method (fast for close factors)
  const fermatStart = Date.now();
  const fermatFactors = fermatFactorization(N, 10000);
  const fermatTime = Date.now() - fermatStart;

  if (fermatFactors) {
    console.log(`✓ Fermat's method: ${N} = ${fermatFactors[0]} × ${fermatFactors[1]} (${fermatTime}ms)`);
    console.log('='.repeat(50));
    console.log(`Result: ${N} = ${fermatFactors[0]} × ${fermatFactors[1]} (classical)\n`);
    return;
  } else {
    console.log(`  Fermat's method: No close factors (${fermatTime}ms)`);
  }

  console.log('\n[Quantum Simulation Required]')

  const simulator = new QuantumSimulator();
  const maxRetries = 10;
  let factors = null;
  let attempt = 0;

  while (!factors && attempt < maxRetries) {
    attempt++;
    if (attempt > 1) {
      console.log(`\nRetry attempt ${attempt}/${maxRetries}...`);
    }
    factors = await simulator.multiBaseFactoring(N, 5);

    if (factors) {
      const product = factors[0] * factors[1];
      const isCorrect = product === N && factors[0] > 1 && factors[1] > 1;
      if (!isCorrect) {
        console.log(`  ✗ Incorrect factors: ${factors[0]} × ${factors[1]} = ${product}, retrying...`);
        factors = null;
      }
    }
  }

  console.log('='.repeat(50));
  if (factors) {
    const product = factors[0] * factors[1];
    console.log(`Result: ${N} = ${factors[0]} × ${factors[1]} (found in ${attempt} ${attempt === 1 ? 'attempt' : 'attempts'})`);
    console.log(`Verification: ${factors[0]} × ${factors[1]} = ${product} ✓\n`);
  } else {
    console.log(`Result: Factorization failed after ${maxRetries} attempts`);
    console.log(`Note: Period detection threshold not met\n`);
    process.exit(1);
  }
}

main();
