/**
 * NAIVE BASELINE: Simple Frequency Counting
 *
 * No Bayesian inference, no structured priors, no progressive batching.
 * Just pick the most frequent measurement value.
 *
 * This represents what you'd get with zero intelligence applied to the data.
 */

import { QuantumMeasurement } from '../quantum-inference-framework.js';

export interface NaiveResult<T> {
  best: T | null;
  confidence: number;
  measurementsUsed: number;
}

/**
 * Naive inference: Pick most frequent measurement
 */
export function naiveInference<T>(
  measurements: QuantumMeasurement[],
  extractValue: (m: QuantumMeasurement) => T
): NaiveResult<T> {
  if (measurements.length === 0) {
    return { best: null, confidence: 0, measurementsUsed: 0 };
  }

  const totalMeasurements = measurements.reduce((sum, m) => sum + m.count, 0);

  let maxCount = 0;
  let bestValue: T | null = null;

  for (const m of measurements) {
    if (m.count > maxCount) {
      maxCount = m.count;
      bestValue = extractValue(m);
    }
  }

  const confidence = maxCount / totalMeasurements;

  return {
    best: bestValue,
    confidence,
    measurementsUsed: totalMeasurements
  };
}

/**
 * Naive Grover's search: Most frequent value is the answer
 */
export function naiveGroverSearch(
  measurements: QuantumMeasurement[]
): NaiveResult<number> {
  return naiveInference(measurements, m => m.value);
}

/**
 * Naive QPE: Most frequent phase measurement
 */
export function naiveQPE(
  measurements: QuantumMeasurement[],
  precisionBits: number
): NaiveResult<number> {
  const result = naiveInference(measurements, m => m.value);

  return {
    ...result,
    best: result.best !== null ? result.best / Math.pow(2, precisionBits) : null
  };
}

/**
 * Naive period-finding: Most frequent phase, convert to period via continued fractions
 */
export function naivePeriodFinding(
  measurements: QuantumMeasurement[],
  N: number,
  a: number,
  phaseBits: number
): NaiveResult<number> {
  const result = naiveInference(measurements, m => m.value);

  if (result.best === null) {
    return { best: null, confidence: 0, measurementsUsed: result.measurementsUsed };
  }

  const [, r] = continuedFraction(result.best, Math.pow(2, phaseBits), N);

  if (r > 1 && r < N && modularExponentiation(a, r, N) === 1) {
    return { best: r, confidence: result.confidence, measurementsUsed: result.measurementsUsed };
  }

  return { best: null, confidence: 0, measurementsUsed: result.measurementsUsed };
}

function continuedFraction(numerator: number, denominator: number, maxDenom: number): [number, number] {
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

function modularExponentiation(base: number, exp: number, mod: number): number {
  let result = 1;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2 === 1) {
      result = (result * base) % mod;
    }
    exp = Math.floor(exp / 2);
    base = (base * base) % mod;
  }
  return result;
}
