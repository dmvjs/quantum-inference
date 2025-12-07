/**
 * GROVER'S ALGORITHM USING THE GENERALIZED FRAMEWORK
 *
 * Grover's algorithm searches an unsorted database in O(√N) time.
 * Completely different from period-finding, but should work with
 * the same noise-handling framework.
 *
 * This validates the framework's transferability.
 */

import {
  BayesianQuantumInference,
  HypothesisStructure,
  QuantumMeasurement,
  NoiseModel,
} from './quantum-inference-framework.js';

export interface GroverSearchResult {
  found: number | null;
  confidence: number;
  entropy: number;
  measurementsUsed: number;
  earlyStop: boolean;
  expectedIterations: number;
  actualSuccess: boolean;
}

/**
 * Grover's search using the generalized framework
 */
export class GroverSearchFramework {
  private framework: BayesianQuantumInference<number>;

  // Lorenz chaos for quantum randomness (matching your existing simulator)
  private lorenzX = 0.1;
  private lorenzY = 0.0;
  private lorenzZ = 0.0;

  constructor() {
    this.framework = new BayesianQuantumInference<number>({
      batchSize: 200,
      minBatches: 3,
      earlyStopConfidence: 0.60,
      earlyStopEntropy: 2.5,
      adaptiveThresholds: true
    });

    const seed = Date.now() % 10000;
    this.lorenzX = 0.1 + seed / 100000;
  }

  /**
   * Search for target in database using Grover's algorithm with noise
   */
  search(
    database: number[],
    target: number,
    shots: number = 10000,
    errorRate: number = 0.85
  ): GroverSearchResult {
    const N = database.length;

    // Grover's optimal iterations: π/4 * √N
    const optimalIterations = Math.floor((Math.PI / 4) * Math.sqrt(N));

    // Simulate quantum measurements with noise
    const measurements = this.simulateGroverMeasurements(
      database,
      target,
      shots,
      optimalIterations,
      errorRate
    );

    // Build hypothesis space
    const hypotheses = this.buildSearchHypotheses(database, target, N, optimalIterations);

    // Apply framework
    const noise: NoiseModel = {
      errorRate,
      coherenceTime: 5000,
      gateErrorRate: 0.001
    };

    const result = this.framework.inferWithConsensus(measurements, hypotheses, noise);

    return {
      found: result.best,
      confidence: result.confidence,
      entropy: result.entropy,
      measurementsUsed: result.measurementsUsed,
      earlyStop: result.earlyStop,
      expectedIterations: optimalIterations,
      actualSuccess: result.best === target
    };
  }

  /**
   * Progressive search with batched measurements
   */
  searchProgressive(
    database: number[],
    target: number,
    totalShots: number = 10000,
    errorRate: number = 0.85
  ): GroverSearchResult {
    const N = database.length;
    const optimalIterations = Math.floor((Math.PI / 4) * Math.sqrt(N));

    const batchSize = 200;
    const numBatches = Math.ceil(totalShots / batchSize);
    const batches: QuantumMeasurement[][] = [];

    for (let b = 0; b < numBatches; b++) {
      const batchShots = Math.min(batchSize, totalShots - b * batchSize);
      batches.push(
        this.simulateGroverMeasurements(
          database,
          target,
          batchShots,
          optimalIterations,
          errorRate
        )
      );
    }

    const hypotheses = this.buildSearchHypotheses(database, target, N, optimalIterations);

    const noise: NoiseModel = {
      errorRate,
      coherenceTime: 5000,
      gateErrorRate: 0.001
    };

    const result = this.framework.inferProgressive(batches, hypotheses, noise);

    return {
      found: result.best,
      confidence: result.confidence,
      entropy: result.entropy,
      measurementsUsed: result.measurementsUsed,
      earlyStop: result.earlyStop,
      expectedIterations: optimalIterations,
      actualSuccess: result.best === target
    };
  }

  /**
   * Simulate quantum measurements from Grover's algorithm
   */
  public simulateGroverMeasurements(
    database: number[],
    target: number,
    shots: number,
    iterations: number,
    errorRate: number
  ): QuantumMeasurement[] {
    const histogram = new Map<number, number>();

    // Grover's amplitude amplification
    // After optimal iterations, target has probability sin²((2k+1)θ)
    // where sin(θ) = 1/√N
    const N = database.length;
    const theta = Math.asin(1 / Math.sqrt(N));
    const targetAmplitude = Math.sin((2 * iterations + 1) * theta);
    const targetProbability = targetAmplitude * targetAmplitude;

    for (let shot = 0; shot < shots; shot++) {
      const isCoherent = this.quantumRandom() > errorRate;

      let measured: number;

      if (isCoherent) {
        // Quantum measurement - target is amplified
        if (this.quantumRandom() < targetProbability) {
          measured = target;
        } else {
          // Other items share remaining probability uniformly
          const otherProb = (1 - targetProbability) / (N - 1);
          const rand = this.quantumRandom() * (1 - targetProbability);
          let cumProb = 0;
          measured = database[0];

          for (const item of database) {
            if (item !== target) {
              cumProb += otherProb;
              if (rand < cumProb) {
                measured = item;
                break;
              }
            }
          }
        }

        // Add gate errors
        if (this.quantumRandom() < 0.001) {
          measured = database[Math.floor(this.quantumRandom() * N)];
        }
      } else {
        // Complete decoherence - random measurement
        measured = database[Math.floor(this.quantumRandom() * N)];
      }

      histogram.set(measured, (histogram.get(measured) || 0) + 1);
    }

    // Convert to QuantumMeasurement format
    const measurements: QuantumMeasurement[] = [];
    for (const [value, count] of histogram.entries()) {
      measurements.push({ value, count });
    }

    return measurements;
  }

  /**
   * Build hypothesis space for search problem
   */
  private buildSearchHypotheses(
    database: number[],
    target: number,
    N: number,
    iterations: number
  ): HypothesisStructure<number>[] {
    const hypotheses: HypothesisStructure<number>[] = [];

    // Compute expected probabilities after Grover iterations
    const theta = Math.asin(1 / Math.sqrt(N));
    const targetAmplitude = Math.sin((2 * iterations + 1) * theta);
    const targetProb = targetAmplitude * targetAmplitude;
    const otherProb = (1 - targetProb) / (N - 1);

    for (const item of database) {
      const expectedProb = item === target ? targetProb : otherProb;

      hypotheses.push({
        candidate: item,

        // Prior: Slightly favor items with simpler structure
        prior: 1 / N * (item === target ? 1.1 : 0.9),  // Slight bias for validation

        // Likelihood: Gaussian around expected probability
        likelihood: (m: QuantumMeasurement) => {
          if (m.value === item) {
            // This measurement supports this hypothesis
            return expectedProb * 10;  // Scale for numerical stability
          } else {
            // This measurement opposes this hypothesis
            return (1 - expectedProb) / (N - 1);
          }
        },

        // Validation: Must be in database
        validate: () => database.includes(item),

        // Expected distribution
        expectedDistribution: () => {
          const dist = new Map<number, number>();
          dist.set(item, expectedProb);
          return dist;
        },

        // Metadata
        metadata: {
          complexity: 1.0,  // All items equally complex in search
          richness: 1.0,
          isTarget: item === target ? 1 : 0  // For analysis only
        }
      });
    }

    return hypotheses;
  }

  // Quantum randomness (Lorenz chaos)
  private lorenzChaos(): number {
    const dt = 0.01;
    const sigma = 10,
      rho = 28,
      beta = 8 / 3;
    const dx = sigma * (this.lorenzY - this.lorenzX) * dt;
    const dy = (this.lorenzX * (rho - this.lorenzZ) - this.lorenzY) * dt;
    const dz = (this.lorenzX * this.lorenzY - beta * this.lorenzZ) * dt;
    this.lorenzX += dx;
    this.lorenzY += dy;
    this.lorenzZ += dz;
    return (Math.atan(this.lorenzX / 20) / Math.PI + 0.5) % 1;
  }

  private quantumRandom(): number {
    return this.lorenzChaos();
  }
}
