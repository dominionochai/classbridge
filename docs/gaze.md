# NEURO VIEW gaze pipeline

NEURO VIEW is an opt-in, local gaze-first AAC surface. The camera starts off. When enabled, MediaPipe Face Landmarker runs in the browser, reads iris landmarks, and never calls the ClassBridge backend.

## Flow

1. `gazeEstimator.ts` loads the WASM runtime and face-landmarker task from the documented CDN URLs, then maps each iris center into its eye box.
2. `emaSmooth.ts` applies an exponential moving average (`alpha = 0.30`) to reduce jitter.
3. `calibration.ts` fits independent normalized x/y least-squares regressions from five targets: top-left, top-right, center, bottom-left, bottom-right. The model and samples stay in React memory.
4. `blinkDetector.ts` reports eye-aspect-ratio status. It is deliberately not an activation gesture.
5. `useGaze.ts` owns permission, the video stream, the animation loop, calibration, and cleanup. `GazeButton` supports mouse, touch, keyboard, and an 850ms gaze dwell.

## Using calibration

Enable the camera, choose **Start calibration**, and follow each dot for about 1.2 seconds. After the fifth dot the cursor is mapped to the viewport. Re-run calibration if lighting, camera position, or seating changes. Camera access requires `localhost` or HTTPS. The keyboard remains usable with the camera off.

## Privacy

Video, landmarks, gaze coordinates, and calibration are browser-memory values. Camera tracks are stopped and the MediaPipe task is closed when the toggle is off or the page unmounts. The model and WASM assets are fetched from public CDNs; production/offline deployments should self-host those two assets and update the constants in `gazeEstimator.ts`.
