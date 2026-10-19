#!/bin/sh
# Usage: ci/smoke-site-image.sh IMAGE [VERSION]
set -eu

image="${1:?usage: smoke-site-image.sh IMAGE [VERSION]}"
expected_version="${2:-}"

fail() {
	printf 'smoke-site-image: %s\n' "$1" >&2
	exit 1
}

status_of() {
	curl -sS -o /dev/null -w '%{http_code}' "$1" || true
}

header_of() {
	curl -sS -o /dev/null -D - "$1" | tr -d '\r' | grep -i "^$2:" | head -n 1 | cut -d ' ' -f 2-
}

expect_status() {
	actual="$(status_of "$1")"
	[ "$actual" = "$2" ] || fail "$1 answered $actual, expected $2"
}

expect_header() {
	actual="$(header_of "$1" "$2")"
	case "$actual" in
		*"$3"*) return 0 ;;
	esac

	fail "$1 answered '$2: $actual', expected it to contain '$3'"
}

container="$(docker run -d --rm -p 127.0.0.1::80 "$image")"
sandbox="$(mktemp -d)"
trap 'docker rm -f "$container" >/dev/null 2>&1 || true; rm -rf "$sandbox"' EXIT INT TERM

port="$(docker port "$container" 80/tcp | cut -d ':' -f 2)"
base="http://127.0.0.1:${port}"

attempt=0
while [ "$attempt" -lt 60 ]; do
	[ "$(status_of "$base/")" = "200" ] && break
	attempt=$((attempt + 1))
	sleep 0.5
done

expect_status "$base/" "200"
expect_header "$base/" "Content-Type" "text/html"
# Only four paths answer: the home page, the installer and the two release files.
expect_status "$base/vi/home" "404"
expect_status "$base/install.sh" "200"
expect_header "$base/install.sh" "Content-Type" "text/plain"
expect_header "$base/install.sh" "Cache-Control" "no-cache"
expect_status "$base/releases/latest/cli.mjs" "200"
expect_header "$base/releases/latest/cli.mjs" "Cache-Control" "no-cache"
expect_status "$base/releases/latest/checksums.txt" "200"
expect_header "$base/releases/latest/checksums.txt" "Cache-Control" "no-cache"
expect_status "$base/nope" "404"
expect_status "$base/releases/latest/" "404"

curl -fsSL "$base/install.sh" -o "$sandbox/install.sh"
HOME="$sandbox" \
	JSS_DEVTOOLS_BASE_URL="$base/releases/latest" \
	JSS_DEVTOOLS_BIN_DIR="$sandbox/bin" \
	sh "$sandbox/install.sh" >/dev/null

installed="$("$sandbox/bin/jss-devtools" --version)"
[ -n "$expected_version" ] || expected_version="$installed"
[ "$installed" = "$expected_version" ] || fail "the installed CLI reports ${installed}, expected ${expected_version}"

printf 'smoke-site-image: every route answers as specified, and the installer works\n'
