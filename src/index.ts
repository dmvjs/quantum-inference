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

async function main() {
  const N = process.argv[2] ? parseInt(process.argv[2]) : 21;

  console.log(`\nQuantum Integer Factorization: N = ${N}`);
  console.log('='.repeat(50));

  if (N % 2 === 0) {
    console.log(`Trivial case (even): ${N} = 2 × ${N/2}\n`);
    return;
  }

  if (isPrime(N)) {
    console.log(`Prime detected: ${N} cannot be factored\n`);
    return;
  }

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
