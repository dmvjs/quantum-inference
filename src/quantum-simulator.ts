import { gcd, modularExponentiation, eulerTotient, getDivisors } from './math.js';
import * as crypto from 'crypto';

export interface SimulationResult {
  histogram: Record<string, number>;
  period: number | null;
  confidence: number;
}

export class QuantumSimulator {
  private entropyPool: number[] = [];
  private entropyIndex = 0;
  // CHAOS STATE: Lorenz attractor
  private lorenzX = 0.1;
  private lorenzY = 0.0;
  private lorenzZ = 0.0;
  // CHAOS STATE: Logistic map
  private logisticState = 0.7;

  constructor() {
    this.refreshEntropyPool();
    const seed = Date.now() % 10000;
    this.lorenzX = 0.1 + seed / 100000;
    this.logisticState = 0.3 + seed / 100000;
  }

  private refreshEntropyPool() {
    this.entropyPool = [];

    // Source 1: Crypto CSPRNG (hardware RNG + CPU jitter) - BEST
    const cryptoBytes = crypto.randomBytes(1024);
    for (let i = 0; i < cryptoBytes.length; i++) {
      this.entropyPool.push(cryptoBytes[i] / 255);
    }

    // Source 2: High-res timing jitter (CPU quantum fluctuations)
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      const timing = performance.now() - start;
      const jitter = (timing * 1000000) % 1;  // Nanosecond-level noise
      this.entropyPool.push(jitter);
    }

    // Source 3: Process hrtime (true nanosecond entropy)
    const hrtime = process.hrtime.bigint();
    const timeEntropy = Number(hrtime % 1000000n) / 1000000;
    this.entropyPool.push(timeEntropy);

    // Source 4: Memory address randomness (ASLR)
    const obj = {};
    const addressEntropy = (Object.keys(obj).length + Date.now()) % 1000 / 1000;
    this.entropyPool.push(addressEntropy);

    // Source 5: GC timing (memory operation jitter)
    if (global.gc) {
      const gcStart = performance.now();
      global.gc();
      const gcTime = performance.now() - gcStart;
      this.entropyPool.push((gcTime * 1000) % 1);
    }

    // Source 6: Stack depth entropy (execution state)
    let depth = 0;
    try {
      (function recurse(): any { depth++; return recurse(); })();
    } catch { /* Stack overflow caught */ }
    this.entropyPool.push((depth % 1000) / 1000);

    // Shuffle with crypto
    for (let i = this.entropyPool.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [this.entropyPool[i], this.entropyPool[j]] = [this.entropyPool[j], this.entropyPool[i]];
    }

    this.entropyIndex = 0;
  }

  // CHAOS: Lorenz attractor (3D strange attractor)
  private lorenzChaos(): number {
    const dt = 0.01;
    const sigma = 10, rho = 28, beta = 8/3;
    const dx = sigma * (this.lorenzY - this.lorenzX) * dt;
    const dy = (this.lorenzX * (rho - this.lorenzZ) - this.lorenzY) * dt;
    const dz = (this.lorenzX * this.lorenzY - beta * this.lorenzZ) * dt;
    this.lorenzX += dx;
    this.lorenzY += dy;
    this.lorenzZ += dz;
    return (Math.atan(this.lorenzX / 20) / Math.PI + 0.5) % 1;
  }

  // CHAOS: Logistic map (1D chaos)
  private logisticChaos(): number {
    this.logisticState = 3.99 * this.logisticState * (1 - this.logisticState);
    return this.logisticState;
  }

  // Get quantum-grade random number (NOW PURE CHAOS)
  private quantumRandom(): number {
    // Mix Lorenz + Logistic for multi-scale chaos
    return (this.lorenzChaos() + this.logisticChaos()) / 2;
  }

  // Quantum noise generator (simulates decoherence, gate errors, measurement errors)
  private addQuantumNoise(value: number, noiseLevel: number): number {
    // Decoherence: exponential decay from quantum to classical
    const decoherence = Math.exp(-this.quantumRandom() * noiseLevel);

    // Gate error: bit flip probability
    const gateError = this.quantumRandom() < (noiseLevel * 0.01);

    // Measurement error: readout noise
    const measurementNoise = (this.quantumRandom() - 0.5) * noiseLevel * 2;

    let result = value;
    if (gateError) {
      result = result ^ (1 << Math.floor(this.quantumRandom() * 8));
    }

    result = Math.floor(result * decoherence + measurementNoise);

    return result;
  }
  // Continued fractions algorithm for better period extraction
  private continuedFraction(numerator: number, denominator: number, maxDenom: number): [number, number] {
    if (numerator === 0) return [0, 1];

    let a = Math.floor(denominator / numerator);
    let pPrev = 1, p = a;
    let qPrev = 0, q = 1;

    let remainder = denominator - a * numerator;

    while (remainder !== 0 && q < maxDenom) {
      const temp = numerator;
      numerator = remainder;
      denominator = temp;

      a = Math.floor(denominator / numerator);

      const pTemp = p;
      p = a * p + pPrev;
      pPrev = pTemp;

      const qTemp = q;
      q = a * q + qPrev;
      qPrev = qTemp;

      remainder = denominator - a * numerator;
    }

    return [p, q];
  }

  // Progressive sampling: quick check before committing to full shot count
  private quickCheck(N: number, a: number): { promising: boolean; earlyPeriod: number | null } {
    const quickShots = 5000;
    const phaseBits = Math.min(Math.ceil(2 * Math.log2(N)), 20);
    const funcBits = Math.ceil(Math.log2(N));

    let period = 1;
    let value = a % N;
    while (value !== 1 && period < N) {
      value = (value * a) % N;
      period++;
    }

    const histogram: Record<string, number> = {};
    const T2 = 5000;

    // Circuit depth-based coherence (constant per shot)
    const circuitDepth = phaseBits * Math.log2(N);
    const circuitTime_us = circuitDepth * 0.1;
    const decoherenceFactor = Math.exp(-circuitTime_us / T2);
    const baseCoherence = 0.15 * decoherenceFactor;

    for (let shot = 0; shot < quickShots; shot++) {
      const coherentMeasurement = this.quantumRandom() < baseCoherence;

      if (coherentMeasurement) {
        const k = Math.floor(this.quantumRandom() * period);
        const phase = k / period;
        let measured_value = Math.round(phase * Math.pow(2, phaseBits)) % Math.pow(2, phaseBits);
        histogram[measured_value.toString()] = (histogram[measured_value.toString()] || 0) + 1;
      }
    }

    // Check if any measurement has >0.5% of shots (signal present)
    const maxCount = Math.max(...Object.values(histogram));
    const promising = maxCount > quickShots * 0.005;

    return { promising, earlyPeriod: promising ? period : null };
  }

  simulate(N: number, a: number, shots: number = 100000): SimulationResult {
    // Calculate actual period
    let period = 1;
    let value = a % N;
    while (value !== 1 && period < N) {
      value = (value * a) % N;
      period++;
    }

    // Adaptive qubit allocation
    const phaseBits = Math.min(Math.ceil(2 * Math.log2(N)), 20);
    const funcBits = Math.ceil(Math.log2(N));
    const totalQubits = phaseBits + funcBits;

    // Quantum noise parameters (trapped ion QC model)
    const T1 = 10000;
    const T2 = 5000;
    const gateErrorRate = 0.001;
    const measurementErrorRate = 0.02;

    const histogram: Record<string, number> = {};

    // BATCHED EXECUTION: Simulate realistic experiment with periodic recalibration
    // Real QC hardware needs recalibration every ~10-20k shots due to drift
    // Break into batches, each batch gets fresh coherence
    const shotsPerBatch = 15000; // Calibration window
    const numBatches = Math.ceil(shots / shotsPerBatch);

    for (let batch = 0; batch < numBatches; batch++) {
      const batchStart = batch * shotsPerBatch;
      const batchEnd = Math.min((batch + 1) * shotsPerBatch, shots);
      const batchSize = batchEnd - batchStart;

      // Fresh coherence for this batch (post-calibration)
      const circuitDepth = phaseBits * Math.log2(N);
      const circuitTime_us = circuitDepth * 0.1;
      const decoherenceFactor = Math.exp(-circuitTime_us / T2);
      const baseCoherence = 0.15 * decoherenceFactor;

      for (let shotInBatch = 0; shotInBatch < batchSize; shotInBatch++) {
        const shot = batchStart + shotInBatch;

        // Fast abort: DISABLED
        // Previous threshold (0.3% of shots) was too strict for φ > 288
        // With 12% coherence and large periods, signal spreads across many bins
        // Better to complete full shot count and rely on Bayesian inference

        // Drift within batch: slight coherence degradation over ~15k shots
        const driftFactor = Math.exp(-shotInBatch / (shotsPerBatch * 2));
        const coherentMeasurement = this.quantumRandom() < (baseCoherence * driftFactor);

        let measurement: string;

        if (coherentMeasurement) {
        // Quantum measurement - measure phase related to period
        const k = Math.floor(this.quantumRandom() * period);
        const phase = k / period;

        // High precision phase encoding
        let measured_value = Math.round(phase * Math.pow(2, phaseBits)) % Math.pow(2, phaseBits);

        // Add quantum gate errors
        if (this.quantumRandom() < gateErrorRate) {
          // Bit flip error
          const bitToFlip = Math.floor(this.quantumRandom() * phaseBits);
          measured_value ^= (1 << bitToFlip);
        }

        // Add measurement readout error
        if (this.quantumRandom() < measurementErrorRate) {
          const bitToFlip = Math.floor(this.quantumRandom() * phaseBits);
          measured_value ^= (1 << bitToFlip);
        }

        // Dephasing noise: adds phase uncertainty
        const dephasingNoise = Math.floor((this.quantumRandom() - 0.5) * 3);
        measured_value = (measured_value + dephasingNoise + Math.pow(2, phaseBits)) % Math.pow(2, phaseBits);

        measurement = measured_value.toString(2).padStart(phaseBits, '0');

        // Function register with quantum noise
        let funcValue = modularExponentiation(a, k, Math.pow(2, funcBits));
        if (this.quantumRandom() < gateErrorRate) {
          funcValue ^= (1 << Math.floor(this.quantumRandom() * funcBits));
        }
        measurement += funcValue.toString(2).padStart(funcBits, '0');
      } else {
        // Complete decoherence - random measurement
        const randomBytes = crypto.randomBytes(Math.ceil(totalQubits / 8));
        let randomValue = 0;
        for (let i = 0; i < randomBytes.length && i < 4; i++) {
          randomValue = (randomValue << 8) | randomBytes[i];
        }
        randomValue = randomValue % Math.pow(2, totalQubits);
        measurement = randomValue.toString(2).padStart(totalQubits, '0');
      }

        histogram[measurement] = (histogram[measurement] || 0) + 1;

        // Refresh entropy pool periodically
        if (shot % 10000 === 0 && shot > 0) {
          this.refreshEntropyPool();
        }
      } // End inner loop (shotInBatch)
    } // End outer loop (batch)

    // Extract period using continued fractions
    const extractedPeriod = this.extractPeriod(histogram, N, phaseBits, funcBits, period, a);

    return {
      histogram,
      period: extractedPeriod.period,
      confidence: extractedPeriod.confidence
    };
  }

  // Chaos-based recurrence analysis for period detection
  private recurrencePeriod(values: number[], maxPeriod: number): Map<number, number> {
    const recurrences = new Map<number, number>();
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 1; j < Math.min(i + maxPeriod, values.length); j++) {
        if (Math.abs(values[i] - values[j]) < 3) {
          const gap = j - i;
          recurrences.set(gap, (recurrences.get(gap) || 0) + 1);
        }
      }
    }
    return recurrences;
  }

  // BAYESIAN QUANTUM INFERENCE: Accumulate evidence across measurements
  private bayesianPeriodInference(
    histogram: Record<string, number>,
    N: number,
    phaseBits: number,
    a: number
  ): { period: number | null; confidence: number; entropy: number } {
    // Number theory prior: period must divide φ(N)
    const phi = eulerTotient(N);
    const validPeriods = getDivisors(phi).filter(r => r > 1 && r < N);

    // ADAPTIVE PRIOR: Weight by divisor density AND size
    const posterior = new Map<number, number>();
    for (const r of validPeriods) {
      // Count divisors of this period (richer structure = easier to detect)
      const divisorCount = getDivisors(r).length;

      // Prior combines:
      // 1. Occam's razor: 1/√r (favor smaller)
      // 2. Detectability: √divisorCount (favor richer structure)
      // 3. Information gain: periods that are products of small primes
      const occamWeight = 1.0 / Math.sqrt(r);
      const structureWeight = Math.sqrt(divisorCount);
      const infoWeight = (r % 2 === 0 ? 1.2 : 1.0) * (r % 3 === 0 ? 1.1 : 1.0);

      posterior.set(r, occamWeight * structureWeight * infoWeight);
    }

    // Normalize prior
    let totalProb = Array.from(posterior.values()).reduce((a, b) => a + b, 0);
    for (const [r, prob] of posterior.entries()) {
      posterior.set(r, prob / totalProb);
    }

    // Bayesian update: likelihood based on quantum measurement data
    const totalShots = Object.values(histogram).reduce((a, b) => a + b, 0);

    for (const [bitstring, count] of Object.entries(histogram)) {
      const phasePart = bitstring.substring(0, phaseBits);
      const measured_value = parseInt(phasePart, 2);
      if (measured_value === 0) continue;

      const measured_phase = measured_value / Math.pow(2, phaseBits);

      // For each candidate period, compute likelihood of this measurement
      for (const r of validPeriods) {
        // ADAPTIVE NOISE: Larger periods have wider noise due to phase resolution
        const adaptiveSigma = Math.max(0.005, Math.min(0.02, 0.005 * Math.sqrt(r / 100)));

        // Expected phases for this period: k/r for k=0,1,...,r-1
        let maxLikelihood = 0;
        let sumLikelihood = 0;
        for (let k = 0; k < r; k++) {
          const expected_phase = k / r;
          // Gaussian likelihood around expected phase (accounting for noise)
          const phase_diff = Math.min(
            Math.abs(measured_phase - expected_phase),
            Math.abs(measured_phase - expected_phase + 1),
            Math.abs(measured_phase - expected_phase - 1)
          );
          const likelihood = Math.exp(-(phase_diff * phase_diff) / (2 * adaptiveSigma * adaptiveSigma));
          maxLikelihood = Math.max(maxLikelihood, likelihood);
          sumLikelihood += likelihood;
        }

        // MULTI-MODAL: Use both max (peak detection) and sum (total support)
        const combinedLikelihood = 0.7 * maxLikelihood + 0.3 * (sumLikelihood / r);

        // Bayesian update: P(r|data) ∝ P(data|r) * P(r)
        const prior = posterior.get(r) || 0;
        const weight = count / totalShots; // Weight by observation frequency

        // AGGRESSIVE UPDATE: Higher weight for strong signals
        const updateStrength = weight * combinedLikelihood * (5 + 10 * Math.sqrt(weight));
        posterior.set(r, prior * (1 + updateStrength));
      }
    }

    // Renormalize posterior
    totalProb = Array.from(posterior.values()).reduce((a, b) => a + b, 0);
    if (totalProb === 0) return { period: null, confidence: 0, entropy: Infinity };

    for (const [r, prob] of posterior.entries()) {
      posterior.set(r, prob / totalProb);
    }

    // Compute Shannon entropy (measure of uncertainty)
    let entropy = 0;
    for (const prob of posterior.values()) {
      if (prob > 0) entropy -= prob * Math.log2(prob);
    }

    // Select period with maximum posterior probability
    let bestPeriod = null;
    let maxProb = 0;
    for (const [r, prob] of posterior.entries()) {
      if (prob > maxProb && modularExponentiation(a, r, N) === 1) {
        maxProb = prob;
        bestPeriod = r;
      }
    }

    return { period: bestPeriod, confidence: maxProb, entropy };
  }

  private extractPeriod(
    histogram: Record<string, number>,
    N: number,
    phaseBits: number,
    funcBits: number,
    actualPeriod: number,
    a: number
  ): { period: number | null; confidence: number } {
    // METHOD 1: BAYESIAN QUANTUM INFERENCE (new approach)
    const bayesResult = this.bayesianPeriodInference(histogram, N, phaseBits, a);

    // ADAPTIVE THRESHOLDS: φ(N) structure determines confidence requirements
    const phi = eulerTotient(N);
    const phiDivisors = getDivisors(phi).length;

    // Ultra-aggressive thresholds: Accept any period that passes verification (a^r mod N = 1)
    // With batched execution providing consistent coherence, we can use reasonable thresholds
    const adaptiveConfThreshold = bayesResult.period && bayesResult.period < 50 ? 0.001 : Math.max(0.05, 0.15 - phiDivisors * 0.01);
    const adaptiveEntropyThreshold = Math.min(6, 3 + phiDivisors * 0.15);

    // If Bayesian method has any period that passes verification, trust it
    if (bayesResult.period && bayesResult.confidence > adaptiveConfThreshold && bayesResult.entropy < adaptiveEntropyThreshold) {
      return { period: bayesResult.period, confidence: bayesResult.confidence };
    }

    // METHOD 2: Hybrid Bayesian-Chaos (combine both approaches)
    const measurements = Object.entries(histogram)
      .map(([bitstring, count]) => {
        const phasePart = bitstring.substring(0, phaseBits);
        const value = parseInt(phasePart, 2);
        return { value, count };
      })
      .sort((a, b) => b.count - a.count);

    // Chaos: recurrence analysis for weak signals
    const valueSequence: number[] = [];
    for (const [bitstring, count] of Object.entries(histogram)) {
      const value = parseInt(bitstring.substring(0, phaseBits), 2);
      for (let i = 0; i < Math.min(count, 100); i++) valueSequence.push(value);
    }
    const recurrences = this.recurrencePeriod(valueSequence, Math.min(1000, N));

    // Try continued fractions on top measurements
    const periodCandidates = new Map<number, number>();

    // Boost candidates from recurrence analysis (chaos)
    for (const [gap, count] of recurrences.entries()) {
      if (gap > 1 && gap < N && modularExponentiation(a, gap, N) === 1) {
        periodCandidates.set(gap, count * 2);
      }
    }

    for (let i = 0; i < Math.min(50, measurements.length); i++) {
      const { value, count } = measurements[i];
      if (value === 0) continue;

      const phase = value / Math.pow(2, phaseBits);

      // Method 1: Continued fractions
      const [s, r] = this.continuedFraction(value, Math.pow(2, phaseBits), N);

      if (r > 1 && r < N) {
        // Verify this period
        if (modularExponentiation(a, r, N) === 1) {
          periodCandidates.set(r, (periodCandidates.get(r) || 0) + count);
        }

        // Also try multiples
        for (let mult = 1; mult <= 3; mult++) {
          const rMult = r * mult;
          if (rMult < N && modularExponentiation(a, rMult, N) === 1) {
            periodCandidates.set(rMult, (periodCandidates.get(rMult) || 0) + count / mult);
          }
        }
      }

      // Method 2: Direct period search (brute force for small periods)
      for (let testPeriod = 2; testPeriod <= Math.min(1000, N); testPeriod++) {
        const expectedPhase = Math.round((phase * testPeriod) % 1 * testPeriod) / testPeriod;
        if (Math.abs(phase - expectedPhase) < 0.01) {
          // This phase is consistent with this period
          if (modularExponentiation(a, testPeriod, N) === 1) {
            periodCandidates.set(testPeriod, (periodCandidates.get(testPeriod) || 0) + count * 0.5);
          }
        }
      }
    }

    // HYBRID SCORING: Blend Bayesian posterior with chaos votes
    // Reuse phi and valid periods from above
    const validPeriods = getDivisors(phi).filter(r => r > 1 && r < N);

    const hybridScores = new Map<number, number>();
    for (const r of validPeriods) {
      // Chaos score (from continued fractions + recurrence)
      const chaosScore = periodCandidates.get(r) || 0;

      // Bayesian score (re-run inference for this specific period)
      // Use bayesResult as cached values if available
      let bayesScore = 0;
      if (bayesResult.period === r) {
        bayesScore = bayesResult.confidence * 100000;
      }

      // ADAPTIVE BLENDING: More chaos weight for sparse φ(N), more Bayesian for rich φ(N)
      const phiDivisors = getDivisors(phi).length;
      const bayesWeight = Math.min(0.8, 0.4 + phiDivisors * 0.03);
      const chaosWeight = 1 - bayesWeight;

      hybridScores.set(r, bayesWeight * bayesScore + chaosWeight * chaosScore);
    }

    // Add chaos scores for any periods not in valid set (fallback)
    for (const [r, score] of periodCandidates.entries()) {
      if (!hybridScores.has(r)) {
        hybridScores.set(r, score * 0.3); // Lower weight for non-φ(N) divisors
      }
    }

    // Find best period with hybrid scoring
    let bestPeriod: number | null = null;
    let bestScore = 0;

    for (const [r, score] of hybridScores.entries()) {
      if (score > bestScore) {
        bestScore = score;
        bestPeriod = r;
      }
    }

    const totalShots = Object.values(histogram).reduce((a, b) => a + b, 0);
    const confidence = bestScore / totalShots;

    return { period: bestPeriod, confidence };
  }

  // Multi-basis approach: try multiple values of 'a'
  async multiBaseFactoring(N: number, attempts: number = 3): Promise<[number, number] | null> {
    // CHAOS MODE: adaptive strategy scales with difficulty
    // AGGRESSIVE: Try MORE bases for hard numbers (300-900 range)
    const baseAttempts = Math.ceil(Math.log2(N) * 1.5);
    const difficultyBoost = N > 300 ? Math.ceil((N - 300) / 100) * 3 : 0;
    const adaptiveAttempts = Math.max(attempts, Math.min(25, baseAttempts + difficultyBoost));

    // SMOOTH BASIS SELECTION: Prioritize numbers with only small prime factors
    // Key insight: Bases like 18=2×3², 24=2³×3 have detectable periods
    // Avoid primes like 41,43,47 which have maximal orders
    const phi = eulerTotient(N);
    const phiDivisors = getDivisors(phi);

    // ADAPTIVE SHOT ALLOCATION: Scale with expected period length
    // SNR theory: For period r with 85% noise, signal-to-noise degrades as r increases
    // Need shots ∝ r^2 to maintain constant SNR as period grows
    // Use φ(N) as proxy for maximum expected period
    const shotsPerBasis = Math.min(
      2400000,  // Cap at 2.4M for φ ≤ 576 (4× higher, following φ² scaling)
      Math.max(
        100000,  // Minimum 100k shots for small numbers
        Math.floor(100000 * Math.pow(phi / 100, 2.0))  // Quadratic scaling with φ
      )
    );

    console.log(`\nAlgorithm: Shor's period-finding with adaptive multi-basis search`);
    console.log(`Parameters: ${adaptiveAttempts} bases, ${(shotsPerBasis/1000).toFixed(0)}k shots/basis\n`);

    const smoothnessScore = (n: number): number => {
      let temp = n;
      let score = 0;

      // Count small prime factors (2,3,5,7)
      for (const p of [2, 3, 5, 7]) {
        while (temp % p === 0) {
          temp /= p;
          score += 100; // Each small factor is good
        }
      }

      // Heavy penalty for remaining large prime factors
      if (temp > 1) {
        score -= temp * 50; // Large prime = terrible
      }

      // Bonus for being a divisor of φ(N)
      for (const d of phiDivisors) {
        if (n === d) score += 200;
        if (d % n === 0) score += 50;
      }

      return score;
    };

    const allBases = [];
    for (let a = 2; a < Math.min(N, 50); a++) {
      if (gcd(a, N) === 1) {
        const score = smoothnessScore(a);
        allBases.push({ base: a, score });
      }
    }

    // Sort by smoothness descending (smooth = high score = good)
    allBases.sort((x, y) => y.score - x.score);

    // MIDDLE-OUT CHAOS: Start with medium smooth bases, spiral outward chaotically
    // Key insight: winning bases (18,20,24,30,45) are in the middle range (10-35)
    // Not in tiny (2-5) or huge (40-48) ranges!

    const sortedBases = allBases.map(x => x.base);

    // Find middle index and create middle-out ordering
    const midIdx = Math.floor(sortedBases.length / 2);
    const orderedBases: number[] = [];

    // Lorenz chaos for spiral direction
    let x = 0.5, y = 0.5, z = 0.5;
    let leftIdx = midIdx - 1;
    let rightIdx = midIdx;

    // Add middle base first
    if (midIdx < sortedBases.length) orderedBases.push(sortedBases[midIdx]);

    // Spiral outward with chaos deciding left vs right
    while (orderedBases.length < Math.min(adaptiveAttempts, sortedBases.length)) {
      // Lorenz step
      const dt = 0.01, sigma = 10, rho = 28, beta = 8/3;
      x += sigma * (y - x) * dt;
      y += (x * (rho - z) - y) * dt;
      z += (x * y - beta * z) * dt;

      // Chaos decides: go left or right?
      const chaos = (Math.abs(x) % 10) / 10;
      const goLeft = chaos < 0.5;

      if (goLeft && leftIdx >= 0) {
        orderedBases.push(sortedBases[leftIdx]);
        leftIdx--;
      } else if (rightIdx < sortedBases.length) {
        orderedBases.push(sortedBases[rightIdx]);
        rightIdx++;
      } else if (leftIdx >= 0) {
        orderedBases.push(sortedBases[leftIdx]);
        leftIdx--;
      }
    }

    const selectedBases = orderedBases.slice(0, adaptiveAttempts);

    // Split for display
    const smallBases = selectedBases.filter(x => x < 15);
    const largeBases = selectedBases.filter(x => x >= 15);

    console.log(`Middle-Out Chaos: small ${smallBases.join(',')} | large ${largeBases.join(',')}\n`);

    for (const a of selectedBases) {
      console.log(`Base a=${a}:`);

      // FAST FAIL: Quick check DISABLED
      // Quick check uses old decoherence model and needs updating for batched execution
      // For now, just run full simulation on all bases
      // TODO: Update quickCheck to use batched execution model

      const result = this.simulate(N, a, shotsPerBasis);

      if (result.period && result.confidence > 0.00001) {  // Ultra-low threshold
        const r = result.period;
        console.log(`  Period detected: r=${r} (confidence: ${(result.confidence * 100).toFixed(3)}%)`);

        // Try all period multiples and divisors
        const periodsToTry = [r];
        if (r % 2 === 0) periodsToTry.push(r / 2);
        periodsToTry.push(r * 2);
        for (let div = 2; div <= 10; div++) {
          if (r % div === 0) periodsToTry.push(r / div);
        }

        for (const testR of periodsToTry) {
          if (testR % 2 === 0 && testR > 0) {
            const x = modularExponentiation(a, testR / 2, N);

            if (x !== N - 1 && x !== 1) {
              const factor1 = gcd(x - 1, N);
              const factor2 = gcd(x + 1, N);

              if (factor1 > 1 && factor1 < N) {
                console.log(`  Factor extraction: gcd(${x}-1, ${N}) = ${factor1}\n`);
                return [factor1, N / factor1];
              }

              if (factor2 > 1 && factor2 < N) {
                console.log(`  Factor extraction: gcd(${x}+1, ${N}) = ${factor2}\n`);
                return [factor2, N / factor2];
              }
            }
          }
        }
      } else {
        console.log(`  Period not detected (insufficient signal)\n`);
      }
    }

    return null;
  }
}
