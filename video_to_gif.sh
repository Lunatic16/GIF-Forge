#!/usr/bin/env bash
# =============================================================================
# video_to_gif.sh — Convert a video file into an animated GIF using FFmpeg
# =============================================================================
# Usage:
#   ./video_to_gif.sh [OPTIONS] input.mp4
#
# Options:
#   -o, --output FILE     Output GIF filename (default: input filename + .gif)
#   -s, --start TIME      Start time (e.g. 00:00:05 or 5) (default: 0)
#   -d, --duration TIME   Duration in seconds (default: full video)
#   -r, --fps FPS         Frames per second (default: 15)
#   -w, --width PX        Output width in pixels (default: 480, -1 = auto)
#   -l, --loop N          Loop count: 0=infinite, 1=once, etc. (default: 0)
#   -q, --quality LEVEL   Quality: low | medium | high (default: medium)
#   -h, --help            Show this help message
#
# Requirements:
#   FFmpeg must be installed. Install with:
#     macOS:   brew install ffmpeg
#     Ubuntu:  sudo apt install ffmpeg
#     Windows: https://ffmpeg.org/download.html
# =============================================================================

set -euo pipefail

# ── Defaults ─────────────────────────────────────────────────────────────────
FPS=15
WIDTH=480
LOOP=0
QUALITY="medium"
START=""
DURATION=""
OUTPUT=""
INPUT=""

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helper functions ──────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}[INFO]${NC}  $*"; }
success() { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

usage() {
  grep '^#' "$0" | grep -v '^#!/' | sed 's/^# \?//'
  exit 0
}

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o|--output)   OUTPUT="$2";   shift 2 ;;
    -s|--start)    START="$2";    shift 2 ;;
    -d|--duration) DURATION="$2"; shift 2 ;;
    -r|--fps)      FPS="$2";      shift 2 ;;
    -w|--width)    WIDTH="$2";    shift 2 ;;
    -l|--loop)     LOOP="$2";     shift 2 ;;
    -q|--quality)  QUALITY="$2";  shift 2 ;;
    -h|--help)     usage ;;
    -*)            error "Unknown option: $1" ;;
    *)             INPUT="$1"; shift ;;
  esac
done

# ── Validate input ────────────────────────────────────────────────────────────
[[ -z "$INPUT" ]] && error "No input file specified. Run with --help for usage."
[[ -f "$INPUT" ]] || error "Input file not found: $INPUT"

# Check FFmpeg
if ! command -v ffmpeg &>/dev/null; then
  error "FFmpeg is not installed or not in PATH.\n  macOS: brew install ffmpeg\n  Ubuntu: sudo apt install ffmpeg"
fi

# ── Derive output name ────────────────────────────────────────────────────────
if [[ -z "$OUTPUT" ]]; then
  BASENAME="${INPUT%.*}"
  OUTPUT="${BASENAME}.gif"
fi

# ── Quality → palette settings ────────────────────────────────────────────────
case "$QUALITY" in
  low)    MAX_COLORS=64;  DITHER="bayer:bayer_scale=5" ;;
  medium) MAX_COLORS=128; DITHER="bayer:bayer_scale=3" ;;
  high)   MAX_COLORS=256; DITHER="floyd_steinberg"      ;;
  *)      error "Invalid quality level '$QUALITY'. Use: low, medium, high" ;;
esac

# ── Build optional FFmpeg time flags ─────────────────────────────────────────
TIME_FLAGS=""
[[ -n "$START"    ]] && TIME_FLAGS+="-ss $START "
[[ -n "$DURATION" ]] && TIME_FLAGS+="-t $DURATION "

# ── Temp palette file ─────────────────────────────────────────────────────────
PALETTE=$(mktemp /tmp/palette_XXXXXX.png)
trap 'rm -f "$PALETTE"' EXIT

# ── Scale filter ──────────────────────────────────────────────────────────────
SCALE="scale=${WIDTH}:-1:flags=lanczos"

# ── Step 1: Generate palette ──────────────────────────────────────────────────
echo ""
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Video → GIF Converter${NC}"
echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
info "Input:    $INPUT"
info "Output:   $OUTPUT"
info "FPS:      $FPS"
info "Width:    ${WIDTH}px"
info "Quality:  $QUALITY (${MAX_COLORS} colors)"
[[ -n "$START"    ]] && info "Start:    $START"
[[ -n "$DURATION" ]] && info "Duration: ${DURATION}s"
echo ""

info "Step 1/2 — Generating optimized color palette..."
# shellcheck disable=SC2086
ffmpeg -v warning $TIME_FLAGS -i "$INPUT" \
  -vf "${SCALE},palettegen=max_colors=${MAX_COLORS}:stats_mode=diff" \
  -y "$PALETTE"

success "Palette created."

# ── Step 2: Render GIF ────────────────────────────────────────────────────────
info "Step 2/2 — Rendering GIF..."
# shellcheck disable=SC2086
ffmpeg -v warning $TIME_FLAGS -i "$INPUT" -i "$PALETTE" \
  -lavfi "${SCALE} [x]; [x][1:v] paletteuse=dither=${DITHER}" \
  -r "$FPS" \
  -loop "$LOOP" \
  -y "$OUTPUT"

# ── Report results ────────────────────────────────────────────────────────────
if [[ -f "$OUTPUT" ]]; then
  SIZE=$(du -sh "$OUTPUT" | cut -f1)
  echo ""
  success "GIF created successfully!"
  echo -e "  ${BOLD}File:${NC} $OUTPUT"
  echo -e "  ${BOLD}Size:${NC} $SIZE"
  echo ""
else
  error "Conversion failed — output file was not created."
fi
