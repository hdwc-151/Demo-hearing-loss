# Dr. Bunny audio foundation — phase 1 (v0.4 development)

## Aim and provenance

This phase adds *real waveform filtering* in a separate offline Audio Lab, without replacing the legacy text simulator or chatbot. The DSP implementations are original, based on standard short-time Fourier transform (STFT) principles. No source code has been translated or copied from a third-party repository.

Research inspiration (not imported code):
- [Samuel Garcia, HearingLossSimulator](https://github.com/samuelgarcia/HearingLossSimulator): Compressive Gammachirp and cochlear compression, **not implemented** in this phase.
- [REA.lab audio_test_battery](https://github.com/rea-labs/audio_test_battery): SPL/HL calibration and hearing research safety, **not imported**.
- [Imperial–Oticon IR](https://github.com/ImperialCollegeLondon/sap-oticon-hearing-aid-impulse-responses): future spatial audio research, **no dataset bundled**.

## Signal processing and limits

Input: a six-frequency illustrative audiogram (250, 500, 1000, 2000, 4000, 8000 Hz) and PCM audio.

- Interpolate hearing thresholds in *log2 frequency*, clamp the endpoints.
- Compute illustrative attenuation in digital dB: A(f) = clamp(0.5 * (threshold(f) - 20), 0, 32).
- Apply gain G(f) = 10^(-A(f)/20) to complex STFT bins.
- Use periodic square-root Hann windows, 1024 FFT samples, 50% hop, inverse transform and squared-window overlap-add normalization.
- Return the original sample rate and channels. Processed samples are clamped at 0.98; A/B playback uses identical *digital* gain of 0.5, not a calibrated sound pressure limit.

**Important:** dB HL thresholds are NOT converted to dBFS or dB SPL. This gain curve is a pedagogical approximation, **not a clinically validated auditory model**. It does not simulate lost cochlear compression, broadened auditory filters, loudness recruitment, temporal masking or binaural spatial hearing. The built-in reference signal consists of three tones (500/1500/4000 Hz), not actual speech.

User-provided audio files are decoded locally, never uploaded. File size is limited to 12 MB and decoded duration to 8 seconds. Supported formats depend on the browser's decoder.

## Implementation and CI

- Python reference: backend/core/hearing_loss.py.
- Browser DSP: frontend/src/util/hearingLoss.js.
- UI: frontend/src/components/AudioLab.jsx.
- Tests: tests/test_audio_foundation.py; frontend/scripts/audio.test.mjs; tests/e2e_audio_lab.py.

Verify basic frequency selectivity, unity behaviour for unaffected profiles, invalid input rejection, waveform shape, finite bounded output, stereo preservation, offline playback and audiogram UI navigation. Existing CI must stay green.

## Next phases — NOT included here

1. Left/right audiogram profile schema, history and provenance.
2. Separately validated cochlear compression model with independent research reference data.
3. Separate hearing-aid *demonstration* DSP (multiband EQ/compression) and audio safety review.
4. Conversation script authoring, and then evidence-based chatbot/GraphRAG.

No uncalibrated hearing tests or medical diagnosis features should be published.

## Signal descriptors (phase 1 extension)

The Audio Lab displays **digital RMS**, **power-weighted spectral centroid** and **fraction of energy ≥4 kHz** for channel 1, before/after filtering. Each is derived by the same periodic square-root Hann STFT in Python and JavaScript. These values characterise the waveform, **not the listener**, and are not dB HL, dB SPL, SNR, speech intelligibility, or clinical thresholds. Both engines have independent unit tests; no medical accuracy is asserted.

Files: `backend/core/audio_features.py`, `frontend/src/util/audioFeatures.js`, `tests/test_audio_features.py`, `frontend/scripts/features.test.mjs`.

## ERB auditory bands (experimental, v0.4 phase 2)

An alternative to the original static STFT attenuation is available as an explicit opt-in in Audio Lab. Python `backend/core/auditory_erb.py` and JavaScript `frontend/src/util/auditoryErb.js` independently implement:

1. ERB(f) = 24.7(1 + 4.37 f/1000) Hz; ERB-rate E(f) = 21.4 log10(1+0.00437 f).
2. Twelve ERB-rate-spaced analysis centers from 250 Hz to min(8000 Hz, 0.43×sample_rate).
3. **Symmetric fourth-order spectral weighting** with normalization across bands; these are *ERB-shaped STFT bands*, not true causal gammatone impulse responses, and not asymmetric compressive Gammachirp filters.
4. Severity derived heuristically from the user-selected audiogram (static attenuation capped at 18 digital dB), followed by a bounded, envelope-dependent expander to illustrate loss of compression. Threshold dB HL is never converted into calibrated audio level.
5. Windowed overlap-add reconstruction, deterministic output and ±0.98 peak clamp. The original static STFT option remains available as baseline.

The expansion stage introduces a simple nonlinear dependence on digital RMS envelope. It is **not a predictive OHC/IHC model**; no asymmetric chirp, active cochlear tuning, middle-ear transfer or psychophysical loudness validation is included. Treat this as an algorithm exploration with unit tests, not a medically accurate simulator. Scientific validation of an actual Compressive Gammachirp model requires a separately sourced model specification, parameter fit, published reference vectors and sound-level calibration. Do not call this feature `Gammachirp` in the UI.

Validation suite: `tests/test_auditory_erb.py` and `frontend/scripts/erb.test.mjs`. Checks ERB formula, ascending centers, identity, selective attenuation, lower-input extra expansion, output bounds and deterministic processing. These are engineering checks, **not clinical validation**.
