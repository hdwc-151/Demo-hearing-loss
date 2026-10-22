import os
import sys
import threading
import numpy as np

AUDIO_LEN = 16384
LATENT_DIM = 64
NUM_SCENARIOS = 7
FC_BASE_LEN = 64

LAYERS = [
    (256, 128, 25, 4, 11, 1),
    (128, 64, 25, 4, 11, 1),
    (64, 1, 25, 16, 5, 1),
]


def conv_t_out_len(l_in, stride, padding, kernel, output_padding=0, dilation=1):
    return (l_in - 1) * stride - 2 * padding + dilation * (kernel - 1) + output_padding + 1


def expected_length() -> int:
    length = FC_BASE_LEN
    for _, _, k, s, p, op in LAYERS:
        length = conv_t_out_len(length, s, p, k, op)
    return length


try:
    import torch
    import torch.nn as nn
    _TORCH = True
except ImportError:
    _TORCH = False

if _TORCH:
    class AcousticNoiseGeneratorGAN(nn.Module):
        def __init__(self, latent_dim=LATENT_DIM, num_scenarios=NUM_SCENARIOS):
            super().__init__()
            self.embed = nn.Embedding(num_scenarios, 16)
            self.fc = nn.Linear(latent_dim + 16, 256 * FC_BASE_LEN)
            layers = []
            for cin, cout, k, s, p, op in LAYERS:
                layers.append(nn.ConvTranspose1d(cin, cout, k, stride=s, padding=p, output_padding=op))
                if cout == 1:
                    layers.append(nn.Tanh())
                else:
                    layers += [nn.BatchNorm1d(cout), nn.LeakyReLU(0.2)]
            self.net = nn.Sequential(*layers)

        def forward(self, z, scenario_idx):
            x = torch.cat([z, self.embed(scenario_idx)], dim=-1)
            return self.net(self.fc(x).view(-1, 256, FC_BASE_LEN))
else:
    AcousticNoiseGeneratorGAN = None

_lock = threading.Lock()
_state = {"tried": False, "model": None}


def _build():
    ckpt = os.getenv("GAN_CKPT")
    if not _TORCH or not ckpt or not os.path.isfile(ckpt):
        return None
    try:
        m = AcousticNoiseGeneratorGAN()
        m.load_state_dict(torch.load(ckpt, map_location="cpu", weights_only=True))
        m.eval()
        return m
    except Exception as e:
        print(f"[gan] không nạp được checkpoint: {e}", file=sys.stderr)
        return None


def load_generator():
    if not _state["tried"]:
        with _lock:
            if not _state["tried"]:
                _state["model"] = _build()
                _state["tried"] = True
    return _state["model"]


def sample(scenario_idx: int, seed=None):
    m = load_generator()
    if m is None:
        return None
    g = torch.Generator().manual_seed(int(seed) if seed is not None else 0)
    z = torch.randn(1, LATENT_DIM, generator=g)
    with torch.no_grad():
        wav = m(z, torch.tensor([int(scenario_idx)]))
    return wav.reshape(-1).cpu().numpy().astype(np.float32)
