#!/bin/sh
# Installs the jss-devtools CLI for the current user, without sudo:
#   curl -fsSL https://jss-devtools.jjuidev.com/install.sh | sh
# Everything lives in functions and runs from the last line, so a truncated download runs nothing.
set -eu

# Keep in step with `engines.node` in package.json: a served script cannot read the manifest.
MIN_NODE_VERSION="24.11.0"

DEFAULT_BASE_URL="https://jss-devtools.jjuidev.com/releases/latest"

say() {
	printf 'jss-devtools-install: %s\n' "$1"
}

err() {
	printf 'jss-devtools-install: error: %s\n' "$1" >&2
	exit 1
}

usage() {
	cat <<EOF
Usage: install.sh [--help]

  (no argument)  install the CLI for the current user

Requires node >= ${MIN_NODE_VERSION}, curl or wget, and sha256sum or shasum.

Environment:
  JSS_DEVTOOLS_BASE_URL  where the bundle is downloaded from
                         (default ${DEFAULT_BASE_URL})
  JSS_DEVTOOLS_HOME      where the CLI is installed (default ${HOME}/.jss-devtools)
  JSS_DEVTOOLS_BIN_DIR   where the jss-devtools command is written (default ${HOME}/.local/bin)
EOF
}

need_cmd() {
	for cmd in "$@"; do
		command -v "$cmd" >/dev/null 2>&1 || err "need '$cmd' (command not found)"
	done
}

download() {
	if command -v curl >/dev/null 2>&1; then
		curl -fsSL "$1" -o "$2"
	elif command -v wget >/dev/null 2>&1; then
		wget -qO "$2" "$1"
	else
		err "need curl or wget to download the CLI"
	fi
}

sha256_of() {
	if command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | cut -d ' ' -f 1
	elif command -v shasum >/dev/null 2>&1; then
		shasum -a 256 "$1" | cut -d ' ' -f 1
	else
		err "need sha256sum or shasum to verify the download"
	fi
}

# Compares versions numerically, so "24.9.0" is below "24.11.0".
version_ge() {
	awk -v found="$1" -v wanted="$2" 'BEGIN {
		split(found, a, ".");
		split(wanted, b, ".");
		for (i = 1; i <= 3; i++) {
			if (a[i] + 0 > b[i] + 0) { exit 0; }
			if (a[i] + 0 < b[i] + 0) { exit 1; }
		}
		exit 0;
	}'
}

check_node() {
	found="$(node --version 2>/dev/null || echo unknown)"
	found="${found#v}"

	version_ge "$found" "$MIN_NODE_VERSION" ||
		err "node >= ${MIN_NODE_VERSION} is required (found ${found})"
}

# Digits and dots only, three parts: the value ends up in a path.
is_version() {
	case "$1" in
		'' | *[!0-9.]* | .* | *. | *..*) return 1 ;;
	esac

	[ "$(printf '%s' "$1" | tr -cd '.' | wc -c | tr -d '[:space:]')" = "2" ]
}

path_hint() {
	case ":${PATH:-}:" in
		*":${BIN_DIR}:"*) return 0 ;;
	esac

	say "${BIN_DIR} is not on your PATH. Add it:"

	case "${SHELL:-sh}" in
		*/zsh) say "  echo 'export PATH=\"${BIN_DIR}:\$PATH\"' >> ~/.zshrc" ;;
		*/bash) say "  echo 'export PATH=\"${BIN_DIR}:\$PATH\"' >> ~/.bashrc" ;;
		*/fish) say "  fish_add_path ${BIN_DIR}" ;;
		*) say "  export PATH=\"${BIN_DIR}:\$PATH\"" ;;
	esac
}

install_cli() {
	need_cmd node mktemp chmod mkdir mv rm cut grep tr wc awk
	check_node

	tmp="$(mktemp -d)"
	# shellcheck disable=SC2064 # expand now: $tmp must be the value at trap time
	trap "rm -rf '$tmp'" EXIT
	trap 'exit 1' INT TERM

	say "downloading from ${BASE_URL}"
	download "${BASE_URL}/cli.mjs" "${tmp}/cli.mjs" || err "download of cli.mjs failed"
	download "${BASE_URL}/checksums.txt" "${tmp}/checksums.txt" || err "download of checksums.txt failed"

	expected="$(grep ' cli\.mjs$' "${tmp}/checksums.txt" | cut -d ' ' -f 1)"
	actual="$(sha256_of "${tmp}/cli.mjs")"

	[ -n "$expected" ] || err "checksums.txt has no entry for cli.mjs"
	[ "$expected" = "$actual" ] || err "checksum mismatch for cli.mjs (expected ${expected}, got ${actual})"

	version="$(node "${tmp}/cli.mjs" --version)" || err "the downloaded bundle failed to run"
	is_version "$version" || err "the downloaded bundle reports an invalid version '${version}'"

	# Nothing is written before the download is verified, so a failure leaves no install behind.
	target="${INSTALL_HOME}/${version}"
	mkdir -p "$target" "$BIN_DIR"
	mv "${tmp}/cli.mjs" "${target}/.cli.mjs.tmp"
	mv "${target}/.cli.mjs.tmp" "${target}/cli.mjs"

	# The wrapper runs the file, not a symlink to it, so the CLI never has to resolve a link.
	printf '#!/bin/sh\nexec node "%s/cli.mjs" "$@"\n' "$target" >"${BIN_DIR}/.jss-devtools.tmp"
	chmod 755 "${BIN_DIR}/.jss-devtools.tmp"
	mv "${BIN_DIR}/.jss-devtools.tmp" "$SHIM"

	say "installed jss-devtools ${version} to ${target}"
	path_hint
}

main() {
	: "${HOME:?jss-devtools-install: HOME is not set}"

	BASE_URL="${JSS_DEVTOOLS_BASE_URL:-$DEFAULT_BASE_URL}"
	INSTALL_HOME="${JSS_DEVTOOLS_HOME:-${HOME}/.jss-devtools}"
	BIN_DIR="${JSS_DEVTOOLS_BIN_DIR:-${HOME}/.local/bin}"
	SHIM="${BIN_DIR}/jss-devtools"

	case "${1:-}" in
		-h | --help)
			usage
			;;
		'')
			install_cli
			;;
		*)
			err "unexpected argument '$1' (this installer takes no arguments)"
			;;
	esac
}

main "$@"
