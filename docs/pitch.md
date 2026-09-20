# ClassBridge pitch and mocked-demo script

## The story

A classroom has one shared explanation, but students do not share one access path. ClassBridge is one copilot with three journeys: smart captions and sound alerts for a deaf learner; scene descriptions and board read aloud for a blind learner; and a lecture copilot for a learner who benefits from reduced cognitive load, a familiar voice, and gaze, blink, or EEG input.

The promise is precise: **we don't translate the classroom, we re-explain it**. A teacher keeps teaching. ClassBridge makes the same moment legible through a second channel, with visible fallback behavior when a model is not installed.

## Mocked-demo progression

1. Start on `/lecture`. Say: “The neuron has reached threshold.” The ten-beat lesson shows the caption, transcript, key moment, and term together.
2. Click **Play beat**. Captions appear in short, engaging beats; the “important moment” marker makes the threshold, refractory period, and myelin moments screenshot-ready.
3. Click a suggested question or use **Ask the lecture**. The copilot explains the current context in plain language.
4. Return to the neuro view and toggle the scene/board mode in the broader demo: one view describes what is on screen, another reads the board aloud.
5. Open `/voicebank`. Enroll a pasted base64 sample or a named mock sample.
6. Enter a sentence and press **Speak sentence**. Point out the explicit **honest fallback output** label: this build returns text and never pretends to have produced cloned audio.
7. Close on the architecture: FastAPI adapters, Next.js interface, and graceful degradation keep the demo usable without hosted models.
