"""Engineering invariants for experimental dcGC-shaped DSP and WDRC."""
import pathlib
import sys
import numpy as np
import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "backend"))
from core.auditory_advanced import (process_dynamic_gammachirp,
                                    process_hearing_aid_wdrc, passive_gc,
                                    asymmetric_hp)
F = [250, 500, 1000, 2000, 4000, 8000]
LOSS = [15, 15, 20, 45, 80, 90]
NORMAL = [10, 10, 10, 15, 15, 15]
SR = 16000


def tone(hz, level, n=4096):
    return level * np.sin(2*np.pi*hz*np.arange(n)/SR)


def amp(x, hz):
    t = np.arange(len(x))/SR
    return abs(2*np.mean(x * np.exp(-2j*np.pi*hz*t)))


def test_passive_asymmetric_magnitude_is_finite_and_nonnegative():
    f = np.linspace(0, 8000, 500)
    for center in [250, 1000, 4000]:
        g = passive_gc(f, center)
        h = asymmetric_hp(f, center, .6)
        assert np.all(np.isfinite(g)) and np.all(g >= 0)
        assert np.all(np.isfinite(h)) and np.all((h >= 0) & (h <= 1))
        assert h[0] < h[-1]


@pytest.mark.parametrize("proc", [process_dynamic_gammachirp, process_hearing_aid_wdrc])
def test_identity_validation_repeatability(proc):
    x = tone(1000, .2).astype(np.float32)
    np.testing.assert_array_equal(proc(x, SR, F, NORMAL), x)
    a, b = proc(x, SR, F, LOSS), proc(x, SR, F, LOSS)
    assert a.dtype == np.float32 and a.shape == x.shape
    np.testing.assert_array_equal(a, b)
    assert np.all(np.isfinite(a)) and np.max(np.abs(a)) <= .800001
    with pytest.raises(ValueError):
        proc(np.array([.1, np.nan]), SR, F, LOSS)
    with pytest.raises(ValueError):
        proc(x, 2200, F, LOSS)
    with pytest.raises(ValueError):
        proc(x, SR, F[::-1], LOSS)


def test_dynamic_gc_levels_change_transfer():
    x = tone(4000, .03)
    louder = tone(4000, .3)
    low = amp(process_dynamic_gammachirp(x, SR, F, LOSS), 4000) / amp(x, 4000)
    high = amp(process_dynamic_gammachirp(louder, SR, F, LOSS), 4000) / amp(louder, 4000)
    assert 0 < low < high < 1, (low, high)


def test_wdrc_boost_quiet_signal_but_limit_loud_transient():
    quiet = tone(4000, .008)
    loud = tone(4000, .4)
    gquiet = amp(process_hearing_aid_wdrc(quiet, SR, F, LOSS), 4000) / amp(quiet, 4000)
    gloud = amp(process_hearing_aid_wdrc(loud, SR, F, LOSS), 4000) / amp(loud, 4000)
    assert gquiet > gloud, (gquiet, gloud)
    spike = np.zeros(4096); spike[2048] = 1.4
    assert np.max(np.abs(process_hearing_aid_wdrc(spike, SR, F, LOSS))) <= .800001


@pytest.mark.parametrize("proc", [process_dynamic_gammachirp, process_hearing_aid_wdrc])
def test_stereo_channels_and_shared_peak_limiter(proc):
    x = np.stack([tone(1000, .1), tone(4000, .3)], axis=1)
    output = proc(x, SR, F, LOSS)
    assert output.shape == x.shape
    assert np.max(np.abs(output)) <= .800001
    np.testing.assert_array_equal(output, proc(x, SR, F, LOSS))
