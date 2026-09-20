// Run: node --experimental-strip-types lib/gaze/calibration.test.mjs  (Node 22+)
import assert from 'node:assert/strict';
import { fitCalibration, applyCalibration, CALIBRATION_POINTS, CalibrationError } from './calibration.ts';

const eye = (t) => ({ x: 0.35 + 0.3 * t.x, y: 0.42 + 0.16 * t.y });
const samples = CALIBRATION_POINTS.flatMap((t) => Array.from({ length: 14 }, () => ({ target: t, gaze: eye(t) })));

const m = fitCalibration(samples);
assert.ok(m.error < 1e-9, 'noiseless affine map must be recovered exactly');
const p = applyCalibration(m, eye({ x: 0.3, y: 0.7 }));
assert.ok(Math.abs(p.x - 0.3) < 1e-9 && Math.abs(p.y - 0.7) < 1e-9);

assert.throws(() => fitCalibration(samples.slice(0, 4)), CalibrationError, 'too few samples');
const frozen = CALIBRATION_POINTS.flatMap((t) => Array.from({ length: 14 }, () => ({ target: t, gaze: { x: 0.5, y: 0.5 } })));
assert.throws(() => fitCalibration(frozen), CalibrationError, 'eyes that never move must be rejected');
console.log('calibration: 5/5 assertions passed');
