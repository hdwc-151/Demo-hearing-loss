# Auditory model: numerical reference verification

This verification is restricted to **implementation correctness and engineering behaviour**, not a medical/psychoacoustic validation.

## Independent reference

SciPy's \`scipy.signal.gammatone(frequency, "fir", fs, numtaps)\` is used as a software-independent comparison for the **c = 0**, fourth-order, real-valued Gammachirp impulse kernel. It is an independent library implementation of a closely related gammatone filter, *not* an independent participant study nor a reference implementation of a **compressive** Gammachirp.

For center frequencies 250, 500, 1000, 2000 and 4000 Hz, using fs=16000, 80 ms finite impulse and FFT size 32768:
1. Normalize each magnitude response to unity at its peak.
2. Compare in a ±3 ERB interval around the center frequency.
3. Require mean absolute response error below 0.002 and maximum error below 0.02.
4. Check peak-frequency error below 3 Hz.

The band-shape comparison does NOT establish correct level-dependent cochlear compression, IHC loss, speech intelligibility or patient-specific response. The four-order symmetric ERB masks in Audio Lab are distinct from this analytic Gammachirp kernel.

## Compression loss — engineering test only

For an audiogram with severe high-frequency loss, use equal-frequency tones (4000 Hz) with increasing **digital** input amplitudes 0.01, 0.04 and 0.16. The ERB expander is expected to show a monotonically increasing output/input amplitude ratio: **quiet** tones receive proportionally more attenuation. It must never produce nonfinite output or exceed the ±0.98 digital output bound.

This demonstrates the code's chosen input-level dependency, NOT a clinically validated mapping from audiogram dB HL to calibrated dB SPL. Its mapping constants are heuristics and should not be used to fit real hearing aids.

## Running locally

\`\`\`bash
python -m pip install -r backend/requirements-research.txt
python -m pytest tests/research/test_gammachirp_reference.py -q
\`\`\`

CI job \`auditory-reference\` executes these checks separately so the application server does not need a mandatory SciPy dependency. Any regression blocks merging the research validation suite.

## Scientific gates before hearing-aid compensation

- **Gate A, software agreement:** SciPy gammatone numeric comparison and Python/JavaScript ERB invariants.
- **Gate B, model reference:** published, level-dependent compressive Gammachirp parameterization and reference transfer functions; not yet acquired/validated.
- **Gate C, human-facing level calibration:** calibrated source SPL, device output, psychoacoustic protocol, ethics review; not done.
- **Gate D, hearing-aid DSP:** separately implement safe bounded multiband EQ/WDRC demonstration only after model/safety review.

Status: Gate A numeric checks have been implemented; B–D are NOT completed. This research track does not imply clinically realistic hearing-loss simulation.
