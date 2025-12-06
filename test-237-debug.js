// Direct test of base a=10 on N=237 with massive shots

function modPow(base, exp, mod) {
  let result = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) result = (result * base) % mod;
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return result;
}

const N = 237;
const a = 10;
const realPeriod = 13;

console.log(`Testing N=${N}, a=${a}, real period=${realPeriod}`);
console.log(`Verification: 10^13 mod 237 = ${modPow(a, realPeriod, N)} (should be 1)\n`);

// Simulate with different shot counts
for (const shots of [100000, 250000, 500000]) {
  const phaseBits = 16;
  const histogram = {};
  const T2_us = 5000;
  const baseNoiseLevel = 0.85;

  for (let shot = 0; shot < shots; shot++) {
    // T₂ decoherence: exponential decay in MICROSECONDS
    // Each shot takes ~1μs
    const timeElapsed_us = shot;
    const decoherenceFactor = Math.exp(-timeElapsed_us / T2_us);
    const effectiveCoherence = (1 - baseNoiseLevel) * decoherenceFactor;

    const isCoherent = Math.random() < effectiveCoherence;

    if (isCoherent) {
      const k = Math.floor(Math.random() * realPeriod);
      const phase = k / realPeriod;
      const measured = Math.round(phase * (1 << phaseBits)) % (1 << phaseBits);
      histogram[measured] = (histogram[measured] || 0) + 1;
    }
  }

  // Find top bins
  const sortedBins = Object.entries(histogram)
    .map(([k, v]) => ({ phase: parseInt(k), count: v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  console.log(`${shots} shots:`);
  console.log(`  Total coherent: ${Object.values(histogram).reduce((a,b) => a+b, 0)}`);
  console.log(`  Top bins:`);
  for (const bin of sortedBins.slice(0, 5)) {
    const inferredPeriod = (1 << phaseBits) / bin.phase;
    console.log(`    phase=${bin.phase} (${bin.count} counts) → period ≈ ${inferredPeriod.toFixed(1)}`);
  }
  console.log();
}
