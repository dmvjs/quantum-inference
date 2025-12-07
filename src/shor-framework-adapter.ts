/**
 * SHOR'S ALGORITHM USING THE GENERALIZED FRAMEWORK
 *
 * This adapts your existing period-finding implementation to use
 * the generalized quantum inference framework.
 *
 * Purpose: Validate that the framework handles Shor's algorithm
 * with the same (or better) performance as your custom implementation.
 */

import {
  BayesianQuantumInference,
  HypothesisStructure,
  QuantumMeasurement,
  NoiseModel,
  structuredPrior
} from './quantum-inference-framework.js';
import { eulerTotient, getDivisors, modularExponentiation } from './math.js';

export interface PeriodFindingResult {
  period: number | null;
  confidence: number;
  entropy: number;
  measurementsUsed: number;
  earlyStop: boolean;
}

/**
 * Period-finding using the generalized framework
 */
export class ShorsAlgorithmFramework {
  private framework: BayesianQuantumInference<number>;

  constructor() {
    this.framework = new BayesianQuantumInference<number>({
      batchSize: 400,
      minBatches: 3,
      earlyStopConfidence: 0.70,
      earlyStopEntropy: 2.8,
      adaptiveThresholds: true
    });
  }

  /**
   * Find period of a^x mod N using the generalized framework
   */
  findPeriod(
    N: number,
    a: number,
    measurements: QuantumMeasurement[],
    phaseBits: number,
    noise: NoiseModel
  ): PeriodFindingResult {
    // Build structured hypothesis space
    const hypotheses = this.buildPeriodHypotheses(N, a, phaseBits);

    // Use framework for inference
    const result = this.framework.inferWithConsensus(measurements, hypotheses, noise);

    return {
      period: result.best,
      confidence: result.confidence,
      entropy: result.entropy,
      measurementsUsed: result.measurementsUsed,
      earlyStop: result.earlyStop
    };
  }

  /**
   * Progressive period-finding with early stopping
   */
  findPeriodProgressive(
    N: number,
    a: number,
    measurementBatches: QuantumMeasurement[][],
    phaseBits: number,
    noise: NoiseModel
  ): PeriodFindingResult {
    const hypotheses = this.buildPeriodHypotheses(N, a, phaseBits);

    const result = this.framework.inferProgressive(
      measurementBatches,
      hypotheses,
      noise
    );

    return {
      period: result.best,
      confidence: result.confidence,
      entropy: result.entropy,
      measurementsUsed: result.measurementsUsed,
      earlyStop: result.earlyStop
    };
  }

  /**
   * Build structured hypothesis space for period-finding
   *
   * KEY INSIGHT: Not uniform! Use number theory to constrain search space.
   */
  private buildPeriodHypotheses(
    N: number,
    a: number,
    phaseBits: number
  ): HypothesisStructure<number>[] {
    const phi = eulerTotient(N);
    const validPeriods = getDivisors(phi).filter(r => r > 1 && r < N);

    const hypotheses: HypothesisStructure<number>[] = [];

    // Compute structured priors
    const priors = this.computePeriodPriors(validPeriods);

    for (const r of validPeriods) {
      hypotheses.push({
        candidate: r,
        prior: priors.get(r) || 0,

        // Likelihood: How well does this period explain the measurement?
        likelihood: (m: QuantumMeasurement) => {
          const phase = m.value / Math.pow(2, phaseBits);

          // Expected phases for period r: k/r for k=0,1,...,r-1
          let maxLikelihood = 0;

          for (let k = 0; k < r; k++) {
            const expectedPhase = k / r;

            // Distance accounting for wraparound
            const dist = Math.min(
              Math.abs(phase - expectedPhase),
              Math.abs(phase - expectedPhase + 1),
              Math.abs(phase - expectedPhase - 1)
            );

            // Gaussian likelihood with adaptive noise
            const sigma = Math.max(0.005, Math.min(0.02, 0.005 * Math.sqrt(r / 100)));
            const likelihood = Math.exp(-(dist * dist) / (2 * sigma * sigma));

            maxLikelihood = Math.max(maxLikelihood, likelihood);
          }

          return maxLikelihood;
        },

        // Validation: Must satisfy a^r mod N = 1
        validate: () => modularExponentiation(a, r, N) === 1,

        // Expected distribution for frequency analysis
        expectedDistribution: () => {
          const dist = new Map<number, number>();
          for (let k = 0; k < r; k++) {
            const phase = k / r;
            const value = Math.round(phase * Math.pow(2, phaseBits));
            dist.set(value, 1 / r);  // Uniform over r phases
          }
          return dist;
        },

        // Metadata for adaptive strategies
        metadata: {
          complexity: Math.log2(r),  // Larger periods are harder
          richness: getDivisors(r).length,  // More structure = easier
          smoothness: this.smoothnessScore(r)  // Smooth = easier
        }
      });
    }

    return hypotheses;
  }

  /**
   * STRUCTURED PRIORS: Based on number theory and detectability
   *
   * This is the key optimization - we don't treat all periods equally!
   */
  private computePeriodPriors(validPeriods: number[]): Map<number, number> {
    return structuredPrior(validPeriods, (r) => {
      // Occam's razor: Favor smaller periods
      const occamWeight = 1.0 / Math.sqrt(r);

      // Detectability: Favor periods with rich structure
      const divisorCount = getDivisors(r).length;
      const structureWeight = Math.sqrt(divisorCount);

      // Information gain: Favor smooth periods (small prime factors)
      const smoothWeight = this.smoothnessScore(r);

      return occamWeight * structureWeight * smoothWeight;
    });
  }

  /**
   * Smoothness score: Higher for numbers with only small prime factors
   */
  private smoothnessScore(n: number): number {
    let temp = n;
    let score = 1.0;

    // Bonus for small prime factors
    for (const p of [2, 3, 5, 7]) {
      while (temp % p === 0) {
        temp /= p;
        score *= 1.2;
      }
    }

    // Penalty for large prime factors
    if (temp > 1) {
      score /= Math.sqrt(temp);
    }

    return score;
  }
}
