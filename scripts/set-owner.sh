#!/usr/bin/env bash
# Thay chỗ giữ chỗ OWNER bằng tài khoản/tổ chức GitHub của bạn:  scripts/set-owner.sh ten-tai-khoan
set -euo pipefail
[ $# -eq 1 ] || { echo "Dùng: $0 <tài-khoản-github>"; exit 1; }
cd "$(dirname "$0")/.."
grep -rIl "OWNER" README.md SECURITY.md CONTRIBUTING.md .github docs mobile 2>/dev/null | while read -r f; do
  perl -pi -e "s/OWNER/$1/g" "$f"; echo "đã cập nhật $f"
done
