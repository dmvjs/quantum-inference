import { QuantumSimulator } from './quantum-simulator.js';

async function main() {
  const N = 323;
  const trials = 20;
  let successes = 0;

  console.log(`Testing N=${N} with ${trials} trials...\n`);

  const simulator = new QuantumSimulator();

  for (let i = 1; i <= trials; i++) {
    const factors = await simulator.multiBaseFactoring(N, 5);

    if (factors && factors[0] * factors[1] === N) {
      successes++;
    }

    process.stdout.write(`\rTrial ${i}/${trials}: ${successes} successes (${(successes/i*100).toFixed(1)}%)`);
  }

  console.log(`\n\nFinal: ${successes}/${trials} = ${(successes/trials*100).toFixed(1)}%`);
  console.log(`Expected with 10 retries: ${(1 - Math.pow(1 - successes/trials, 10)) * 100}%`);
}

main();
