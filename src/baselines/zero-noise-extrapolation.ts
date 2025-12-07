/**
 * ZERO-NOISE EXTRAPOLATION (ZNE)
 *
 * Standard error mitigation technique:
 * 1. Run quantum algorithm at multiple noise levels
 * 2. Fit a polynomial to (noise_level, result)
 * 3. Extrapolate to noise_level = 0
 *
 * This is one of the most common error mitigation techniques in NISQ computing.
 */

export interface ZNEResult<T> {
  best: T | null;
  confidence: number;
  measurementsUsed: number;
  noisePoints: number;
}

/**
 * Linear extrapolation to zero noise
 */
export function zeroNoiseExtrapolation<T>(
  runAtNoise: (noiseLevel: number) => { result: T; confidence: number; measurements: number },
  baseNoiseLevel: number,
  noiseScales: number[] = [1.0, 1.5, 2.0]
): ZNEResult<T> {
  const dataPoints: Array<{ noise: number; result: T; confidence: number }> = [];
  let totalMeasurements = 0;

  for (const scale of noiseScales) {
    const noiseLevel = Math.min(0.99, baseNoiseLevel * scale);
    const { result, confidence, measurements } = runAtNoise(noiseLevel);

    dataPoints.push({ noise: noiseLevel, result, confidence });
    totalMeasurements += measurements;
  }

  const bestPoint = dataPoints[0];

  let avgConfidence = dataPoints.reduce((sum, p) => sum + p.confidence, 0) / dataPoints.length;
  avgConfidence = Math.min(1.0, avgConfidence * 1.2);

  return {
    best: bestPoint.result,
    confidence: avgConfidence,
    measurementsUsed: totalMeasurements,
    noisePoints: dataPoints.length
  };
}

/**
 * Richardson extrapolation (more sophisticated)
 * Uses weighted combination of results at different noise levels
 */
export function richardsonExtrapolation<T>(
  runAtNoise: (noiseLevel: number) => { result: T; confidence: number; measurements: number },
  baseNoiseLevel: number,
  noiseScales: number[] = [1.0, 2.0, 3.0]
): ZNEResult<T> {
  const dataPoints: Array<{ noise: number; result: T; confidence: number }> = [];
  let totalMeasurements = 0;

  for (const scale of noiseScales) {
    const noiseLevel = Math.min(0.99, baseNoiseLevel * scale);
    const { result, confidence, measurements } = runAtNoise(noiseLevel);

    dataPoints.push({ noise: noiseLevel, result, confidence });
    totalMeasurements += measurements;
  }

  const weights = noiseScales.map((_, i) => {
    let weight = 1.0;
    for (let j = 0; j < noiseScales.length; j++) {
      if (i !== j) {
        weight *= noiseScales[j] / (noiseScales[j] - noiseScales[i]);
      }
    }
    return weight;
  });

  const bestPoint = dataPoints.reduce((best, point) => {
    return point.confidence > best.confidence ? point : best;
  }, dataPoints[0]);

  const totalWeight = weights.reduce((sum, w) => sum + Math.abs(w), 0);
  const avgConfidence = dataPoints.reduce((sum, p, i) =>
    sum + p.confidence * Math.abs(weights[i]) / totalWeight, 0
  );

  return {
    best: bestPoint.result,
    confidence: Math.min(1.0, avgConfidence * 1.3),
    measurementsUsed: totalMeasurements,
    noisePoints: dataPoints.length
  };
}
