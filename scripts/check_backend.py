import json
import sys
from urllib.parse import urlsplit
from urllib.request import urlopen


def check_backend(base_url):
    parsed = urlsplit(base_url)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise ValueError("Expected an absolute HTTP(S) backend URL")
    if parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1"}:
        raise ValueError("Remote production checks require HTTPS")
    if parsed.query or parsed.fragment or parsed.username or parsed.password:
        raise ValueError("Backend URL must not contain credentials, query or fragment")
    for path in ("health", "presets", "scenarios"):
        with urlopen(f"{base_url.rstrip('/')}/{path}", timeout=15) as response:
            payload = json.load(response)
        if path == "health" and payload.get("status") != "ok":
            raise ValueError("Backend health is not ok")
        if path == "presets" and not payload.get("freqs"):
            raise ValueError("Backend presets are missing")
        if path == "scenarios" and not payload:
            raise ValueError("Backend scenarios are missing")
        print(f"PASS /{path}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python scripts/check_backend.py https://your-api-host")
    check_backend(sys.argv[1])
