import { QuantumSimulator } from './quantum-simulator.js';

// Our validated test cases
const testCases = [
  { N: 323, p: 17, q: 19, phi: 288 },
  { N: 667, p: 23, q: 29, phi: 616 },
  { N: 1003, p: 17, q: 59, phi: 928 },
  { N: 1517, p: 37, q: 41, phi: 1480 },
  { N: 2501, p: 41, q: 61, phi: 2400 },
  { N: 3007, p: 31, q: 97, phi: 2880 },
  { N: 3131, p: 31, q: 101, phi: 3000 },
  { N: 3379, p: 31, q: 109, phi: 3240 },
];

interface TimingResult {
  N: number;
  phi: number;
  timeMs: number;
  success: boolean;
  basesAttempted: number;
}

async function timeFactorization(N: number, phi: number): Promise<TimingResult> {
  console.log(`\nTiming N=${N} (φ=${phi})...`);
  const startTime = Date.now();

  const simulator = new QuantumSimulator();
  let basesAttempted = 0;

  try {
    const result = await simulator.multiBaseFactoring(N, 10); // Max 10 bases for speed
    const timeMs = Date.now() - startTime;
    const success = result !== null && result[0] * result[1] === N;
    basesAttempted = success ? Math.ceil(timeMs / 60000) : 10; // Rough estimate

    console.log(`  ${success ? '✓' : '✗'} ${(timeMs/1000).toFixed(1)}s`);

    return { N, phi, timeMs, success, basesAttempted };
  } catch (error) {
    const timeMs = Date.now() - startTime;
    console.log(`  ✗ ${(timeMs/1000).toFixed(1)}s (error)`);
    return { N, phi, timeMs, success: false, basesAttempted: 10 };
  }
}

function fitScaling(results: TimingResult[]): { a: number, b: number } {
  // Fit time = a * phi^b using log-log linear regression
  const successful = results.filter(r => r.success);
  if (successful.length < 3) {
    return { a: 0, b: 0 }; // Not enough data
  }

  const n = successful.length;
  const sumLogPhi = successful.reduce((sum, r) => sum + Math.log(r.phi), 0);
  const sumLogTime = successful.reduce((sum, r) => sum + Math.log(r.timeMs), 0);
  const sumLogPhiLogTime = successful.reduce((sum, r) => sum + Math.log(r.phi) * Math.log(r.timeMs), 0);
  const sumLogPhiSq = successful.reduce((sum, r) => sum + Math.log(r.phi) ** 2, 0);

  const b = (n * sumLogPhiLogTime - sumLogPhi * sumLogTime) / (n * sumLogPhiSq - sumLogPhi ** 2);
  const logA = (sumLogTime - b * sumLogPhi) / n;
  const a = Math.exp(logA);

  return { a, b };
}

function extrapolate(phi: number, a: number, b: number): number {
  return a * Math.pow(phi, b);
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Scaling Analysis: Time vs φ(N)                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results: TimingResult[] = [];

  // Time each test case
  for (const testCase of testCases) {
    const result = await timeFactorization(testCase.N, testCase.phi);
    results.push(result);
  }

  // Fit scaling model
  const { a, b } = fitScaling(results);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Measured execution times:\n');
  for (const r of results.filter(r => r.success)) {
    console.log(`  φ=${r.phi.toString().padStart(4)} | ${(r.timeMs/1000).toFixed(1).padStart(6)}s`);
  }

  if (a > 0 && b > 0) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('SCALING MODEL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`Fit: time ≈ ${a.toExponential(2)} × φ^${b.toFixed(2)}\n`);

    if (b < 1.5) {
      console.log('⚠ Scaling: Sub-quadratic (suspiciously good - check data)');
    } else if (b < 2.5) {
      console.log('✓ Scaling: Approximately quadratic O(φ²)');
    } else if (b < 3.5) {
      console.log('⚠ Scaling: Cubic O(φ³) - performance concern');
    } else {
      console.log('✗ Scaling: Worse than cubic - major bottleneck');
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('EXTRAPOLATION');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const targets = [5000, 10000, 20000, 50000, 100000];
    console.log('Predicted time for larger φ(N):\n');

    for (const targetPhi of targets) {
      const predictedMs = extrapolate(targetPhi, a, b);
      const seconds = predictedMs / 1000;
      const minutes = seconds / 60;
      const hours = minutes / 60;

      let timeStr;
      if (hours > 24) {
        timeStr = `${(hours/24).toFixed(1)} days`;
      } else if (hours > 1) {
        timeStr = `${hours.toFixed(1)} hours`;
      } else if (minutes > 1) {
        timeStr = `${minutes.toFixed(1)} minutes`;
      } else {
        timeStr = `${seconds.toFixed(1)} seconds`;
      }

      console.log(`  φ=${targetPhi.toString().padStart(6)} → ${timeStr.padStart(15)}`);
    }

    // Find practical limit (10 minute threshold)
    const tenMinutesMs = 10 * 60 * 1000;
    const practicalPhiLimit = Math.pow(tenMinutesMs / a, 1 / b);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('PRACTICAL LIMITS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log(`At 10-minute execution budget:`);
    console.log(`  Maximum φ(N) ≈ ${Math.floor(practicalPhiLimit)}`);
    console.log(`  (Current validated: φ(N) ≤ 3240)\n`);

    if (practicalPhiLimit > 3240) {
      const ratio = practicalPhiLimit / 3240;
      console.log(`Implication: Could potentially factor φ(N) ${ratio.toFixed(1)}× larger`);
      console.log(`             within reasonable time budget.\n`);
    } else {
      console.log(`Warning: Current validated maximum (φ=3240) near practical limit.\n`);
    }
  } else {
    console.log('\n⚠ Insufficient data for scaling analysis');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error);
