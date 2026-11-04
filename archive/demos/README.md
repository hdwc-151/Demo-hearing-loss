# Archived Dr. Bunny demos — immutable historical releases

This archive stores *actual HTML demo bytes*, not just screenshots or labels.

| Archived file | Original path / provenance | Git blob SHA | Size |
| --- | --- | --- | --- |
| [Classic offline demo](2026-11-04-classic-offline-demo.html) | `archive/previous-root/Dr. Bunny - Demo chạy trong trình duyệt.html` from pre-reorganization sources | `21f3259ea49f9df7e5dc2f79a4e0d4ade1b2030b` | 215,592 bytes |
| [v0.3-era single-file demo](2026-11-04-v0.3-single-file-demo.html) | `demo/index.html`, promoted from `dr-bunny/demo/index.html` at `6535781` | `7746a18f1ccab343c4a002cf8a2b45b7010e555c` | 217,524 bytes |

These are two **distinct historical HTML artifacts**, both available to inspect offline. The HTML blobs above did **not** change across PRs #20 and #21, even though the React/Vite source and the deployed web build changed; do not label these two files as actual compiled v0.4 outputs.

For the exact released web source:
- [Before audio foundation](https://github.com/hdwc-151/Demo-hearing-loss/tree/332bb813f405351cc634b1337f5d745703a66a24)
- [Audio foundation after PR #20](https://github.com/hdwc-151/Demo-hearing-loss/tree/a98c1ef20d4470a05cfad267e596396d1485ff74)
- [Audio metrics after PR #21](https://github.com/hdwc-151/Demo-hearing-loss/tree/2bc1c7e96e070f6df4b6a0b60133bffa462ba655)

**Policy:** Before overwriting `demo/index.html` using `npm run build:demo`, its existing bytes are saved as `archive/demos/demo-<SHA256-prefix>.html` (unless identical or already archived). Commit both the generated demo and the archive snapshot. Never delete a historical demo. Avoid committing `dist/` or misleading a source-commit reference as an actual built HTML binary. Existing `archive/previous-root/` and `archive/versioned-implementations/` remain intact.
