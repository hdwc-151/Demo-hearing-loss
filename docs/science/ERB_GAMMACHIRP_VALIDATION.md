# Auditory-model verification — ERB and Gammachirp research

**Status as of 2026-11-04:** experimental algorithm stage, NOT clinically validated.

## Definitions and scope

ERB(f) = 24.7(1 + 4.37 f / 1000) Hz and ERB-rate(f) = 21.4 log10(1 + 0.00437 f). Both are auditory filterband scale approximations, not measured individual audiograms.

| Component | Source | Actual implementation | Verified through tests | Not yet proven |
| --- | --- | --- | --- | --- |
| ERB scale and rate | backend/core/auditory_erb.py, frontend/src/util/auditoryErb.js | ERB centers; 12 symmetric fourth-order spectral bands | Known formula at 1 kHz; monotonic ERB centers | Individual cochlear filter shape |
| Loss-of-compression demonstration | same | Bounded digital attenuation plus level-dependent **expander** | Low-level tone suppressed more than high-level; bounded, deterministic | OHC/IHC physiology, loudness recruitment, hearing-aid fitting |
| Gammachirp **analytical kernel** | backend/core/gammachirp_research.py | Continuous-time formula discretized as a real-valued impulse response with chirp coefficient | c=0 symmetry; ±chirp shift frequency peak in opposite directions; normalization and invalid-input checks | **Compressive** Gammachirp (InvCGC), auditory psychophysical parameter fitting, reference sound tests |

**The Audio Lab ERB mode uses ERB spectral bands, NOT the experimental Gammachirp kernel.** The kernel is research-only and not included in browser playback until independent numerical and psychoacoustic reference comparisons are established.

## Analytic Gammachirp study

For t>0, one real-valued Gammachirp form is:

    g(t) = t^(n-1) exp(-2*pi*b*ERB(fc)*t)
           cos(2*pi*fc*t + c*ln(fc*t) + phi)

Its c=0 case is gammatone-like, while signed c generates asymmetric response. Unit-L2 normalization in code makes analytical tests reproducible but is NOT a physical amplitude calibration. The phase term does not on its own constitute the dynamic compressive Gammachirp architecture.

A complete, validated **compressive** Gammachirp model needs a level-dependent asymmetric transfer function/filter stage and independently justified parameters. A user's audiogram threshold cannot, by itself, determine those parameters. Compare exact numerical response curves against a published reference before connecting the kernel to end-user audio.

Research context: Irino & Patterson (2006) compressive gammachirp auditory-filter studies; [HearingLossSimulator](https://github.com/samuelgarcia/HearingLossSimulator), which provides MIT-licensed reference software. The code here is independently written from mathematical equations; no third-party source code has been copied.

## Verification hierarchy

1. **Analytical:** ERB formula and Gammachirp response peak / asymmetry. Tests: tests/test_auditory_erb.py, tests/test_gammachirp_research.py.
2. **Engineering:** STFT identity, frequency-selective attenuation, bounded output, deterministic repeatability, software hygiene. Browser tests on Chromium via CI.
3. **Numerical model comparison:** planned. Compare transfer functions against published reference vectors and report relative/max errors; unit tests alone do not suffice.
4. **Psychophysical validation:** not performed. Requires calibrated playback, participant study, scientific protocol and ethics review.

The v0.4 app remains an education-only simulation. Hearing-aid compensation is deferred until auditory model evaluation and safety work are complete.
