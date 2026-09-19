'use client';

import type { Point, GazeStatus } from '../../lib/gaze';

type CalibrationOverlayProps = {
  status: GazeStatus;
  step: number;
  targets: readonly Point[];
  calibrated: boolean;
  cameraEnabled: boolean;
  error: number | null;
  onStart: () => void;
};

export function CalibrationOverlay({ status, step, targets, calibrated, cameraEnabled, error, onStart }: CalibrationOverlayProps) {
  const isOpen = step >= 0 || status === 'calibrating';
  if (!isOpen) return null;
  const target = targets[step] ?? targets[0];
  const isRunning = status === 'calibrating' && step >= 0;

  return (
    <div role="dialog" aria-modal="true" aria-label="Gaze calibration" style={{ position: 'fixed', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(4, 10, 18, 0.82)', backdropFilter: 'blur(8px)' }}>
      <div style={{ position: 'relative', width: 'min(760px, 92vw)', height: 'min(520px, 72vh)', border: '1px solid #426356', borderRadius: 16, background: '#10221f', color: '#eff8f7', padding: 28 }}>
        <div style={{ maxWidth: 430 }}>
          <small style={{ color: '#9df4c0', letterSpacing: '0.12em' }}>GAZE CALIBRATION</small>
          <h2 style={{ margin: '8px 0' }}>{isRunning ? 'Follow the target' : 'Ready to calibrate?'}</h2>
          <p style={{ color: '#a9bbb2', lineHeight: 1.5 }}>Keep your head still and look at each target until it moves. Your camera feed stays local to this device.</p>
          <p aria-live="polite" style={{ color: '#d7f46b' }}>{isRunning ? `Target ${step + 1} of ${targets.length}` : 'Start when your face is centered in the camera.'}</p>
          {!isRunning && <button type="button" onClick={onStart} disabled={!cameraEnabled} style={{ padding: '10px 14px' }}>{cameraEnabled ? 'Start calibration' : 'Enable camera first'}</button>}
          {calibrated && error !== null && <p>Last fit error: {Math.round(error * 100)}%</p>}
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', left: `${target.x * 100}%`, top: `${target.y * 100}%`, width: 24, height: 24, transform: 'translate(-50%, -50%)', border: '2px solid #d7f46b', borderRadius: '50%', boxShadow: '0 0 0 7px rgba(215, 244, 107, 0.18)' }} />
      </div>
    </div>
  );
}
