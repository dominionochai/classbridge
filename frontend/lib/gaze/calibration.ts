import type { Point } from './emaSmooth';

export type CalibrationSample = { target: Point; gaze: Point };
export type CalibrationModel = {
  x: [number, number, number];
  y: [number, number, number];
  sampleCount: number;
  error: number;
};

export const CALIBRATION_POINTS: Point[] = [
  { x: 0.12, y: 0.14 },
  { x: 0.88, y: 0.14 },
  { x: 0.5, y: 0.5 },
  { x: 0.12, y: 0.86 },
  { x: 0.88, y: 0.86 },
];

type Matrix3 = [[number, number, number], [number, number, number], [number, number, number]];
type Vector3 = [number, number, number];

export class CalibrationError extends Error {
  constructor(message = 'Calibration points do not provide a stable solution.') {
    super(message);
    this.name = 'CalibrationError';
  }
}

/** Solve a 3x3 system using partial-pivot Gaussian elimination. */
function solve(matrix: Matrix3, values: Vector3): Vector3 | null {
  // Gaussian step 1: copy the coefficient matrix and right-hand side.
  const augmented: number[][] = matrix.map((row, index) => [...row, values[index]]);

  for (let column = 0; column < 3; column += 1) {
    // Gaussian step 2: choose the largest remaining pivot for numerical stability.
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    // Gaussian step 3: reject singular or nearly singular calibration geometry.
    if (Math.abs(augmented[pivot][column]) < 1e-8) return null;
    // Gaussian step 4: swap the best pivot row into the current column.
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    // Gaussian step 5: normalize the pivot row so its pivot equals one.
    const pivotValue = augmented[column][column];
    for (let index = column; index <= 3; index += 1) augmented[column][index] /= pivotValue;
    // Gaussian step 6: eliminate this column from every other row.
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let index = column; index <= 3; index += 1) {
        augmented[row][index] -= factor * augmented[column][index];
      }
    }
  }

  return [augmented[0][3], augmented[1][3], augmented[2][3]];
}

function fitAxis(samples: readonly CalibrationSample[], axis: 'x' | 'y'): Vector3 {
  const normalMatrix: Matrix3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const normalValues: Vector3 = [0, 0, 0];

  for (const sample of samples) {
    // Normal-equation step 1: build [1, gaze.x, gaze.y] for this observation.
    const features: Vector3 = [1, sample.gaze.x, sample.gaze.y];
    const target = sample.target[axis];
    // Normal-equation step 2: accumulate XᵀX from feature products.
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        normalMatrix[row][column] += features[row] * features[column];
      }
    }
    // Normal-equation step 3: accumulate Xᵀy from feature-target products.
    for (let row = 0; row < 3; row += 1) normalValues[row] += features[row] * target;
  }

  const solution = solve(normalMatrix, normalValues);
  if (!solution) throw new CalibrationError(`Unable to fit ${axis} gaze mapping: calibration is singular.`);
  return solution;
}

function predict(coefficients: Vector3, point: Point): number {
  return coefficients[0] + coefficients[1] * point.x + coefficients[2] * point.y;
}

export function fitCalibration(samples: readonly CalibrationSample[]): CalibrationModel {
  if (samples.length < 5) throw new CalibrationError('At least five calibration samples are required.');
  const x = fitAxis(samples, 'x');
  const y = fitAxis(samples, 'y');
  const error = samples.reduce((total, sample) => {
    const xError = predict(x, sample.gaze) - sample.target.x;
    const yError = predict(y, sample.gaze) - sample.target.y;
    return total + Math.hypot(xError, yError);
  }, 0) / samples.length;
  return { x, y, sampleCount: samples.length, error };
}

export function applyCalibration(model: CalibrationModel, point: Point): Point {
  return {
    x: Math.max(0, Math.min(1, predict(model.x, point))),
    y: Math.max(0, Math.min(1, predict(model.y, point))),
  };
}
