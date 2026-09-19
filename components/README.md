# Components

The component directories are integration notes, not vendored third-party source trees. Install the pinned packages from `backend/requirements.txt`; no vendored code is needed. Review each upstream license before redistribution, and keep model downloads in the runtime cache rather than committing generated artifacts.

## Verified upstreams

| Component | Package/version | Upstream | License |
|---|---|---|---|
| faster-whisper | `faster-whisper==1.2.1` | [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | MIT |
| Sign Language Translator | `sign-language-translator==0.6.1` | [sign-language-translator](https://github.com/sign-language-translator/sign-language-translator) | MIT |
| MediaPipe | `mediapipe==1.0.0` | [google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe) | Apache-2.0 |
| LAVIS | `salesforce-lavis==1.0.2` | [salesforce/LAVIS](https://github.com/salesforce/LAVIS) | BSD-3-Clause |
| PaddleOCR | `paddleocr==3.7.0` | [PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | Apache-2.0 |
| PaddlePaddle | `paddlepaddle==3.3.1` | [PaddlePaddle/Paddle](https://github.com/PaddlePaddle/Paddle) | Apache-2.0 |
| sherpa-onnx | `sherpa-onnx==1.13.6` | [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | Apache-2.0 |
| Silero VAD | `silero-vad==6.2.1` | [snakers4/silero-vad](https://github.com/snakers4/silero-vad) | MIT |
| TensorFlow Hub | `tensorflow-hub==0.16.1` | [tensorflow/hub](https://github.com/tensorflow/hub) | Apache-2.0 |

`torch==2.13.0` and `torchvision==0.28.0` were reported but are intentionally not pinned because a compatible Windows/Python 3.10-3.12 combination was not verified. No unsupported platform claim is made.

## YAMNet

YAMNet raw source/model was not vendored: it was not available to fetch through the connected GitHub file-edit API. Load it at runtime with TensorFlow Hub from [https://tfhub.dev/google/yamnet/1](https://tfhub.dev/google/yamnet/1) using `tensorflow-hub`.
