# GIF Forge

GIF Forge is a minimal, dark-themed Electron desktop application designed to convert various video formats (mp4, mov, avi, mkv, webm, flv, wmv, m4v) into high-quality animated GIFs using [FFmpeg](https://ffmpeg.org).

![App Screenshot](screenshot.png)

## Key Features

- **Video Processing:** Converts popular video formats to high-quality animated GIFs.
- **Customizable:** Control FPS (5–30), resolution (120–1280px), quality presets, and loop behavior.
- **Advanced Encoding:** Uses two-pass FFmpeg palette generation for superior color rendering.
- **User Experience:** Minimalist, dark-themed interface with drag-and-drop support, progress tracking, and quick access to output files.

## Tech Stack

- **Framework**: Electron
- **Language**: JavaScript (Node.js)
- **Engine**: FFmpeg (system dependency)
- **UI**: Vanilla HTML/CSS/JS

## Prerequisites

- [Node.js](https://nodejs.org) (v16+)
- [FFmpeg](https://ffmpeg.org) installed and available in your system `PATH`.

### Installing FFmpeg
- **macOS**: `brew install ffmpeg`
- **Ubuntu/Debian**: `sudo apt install ffmpeg`
- **Fedora**: `sudo dnf install ffmpeg`
- **Windows**: Download from the official website and add the `bin` directory to your System PATH.

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/gif-converter.git
cd gif-converter
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Application

```bash
npm start
```

## Architecture

### Directory Structure

```
├── src/
│   ├── index.html    # Frontend structure and UI logic
│   ├── main.js       # Main process, Electron lifecycle, and FFmpeg execution
│   └── preload.js    # Context bridge for secure inter-process communication
├── package.json      # Dependencies and scripts
└── video_to_gif.sh   # Bash conversion script
```

### Execution Flow

1. **Initialization:** `main.js` bootstraps the Electron app.
2. **UI Rendering:** `index.html` serves the interface and gathers conversion parameters from the user.
3. **IPC:** Parameters are passed via the context bridge in `preload.js`.
4. **Processing:** `main.js` spawns an FFmpeg subprocess using the provided parameters.
5. **Completion:** The application saves the file, notifies the user, and offers to open the containing folder.

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm install` | Install project dependencies |
| `npm start` | Launch the application |

## Troubleshooting

### FFmpeg Not Found
If the conversion fails immediately, ensure FFmpeg is in your system PATH.
- **Test in terminal**: Run `ffmpeg -version`. If it returns a command not found error, FFmpeg is not installed or not in your PATH.

### Conversion Fails
- Ensure the input video is not corrupted.
- Check that the output path has write permissions.
- Lower the resolution or FPS if you are running into system memory limits.

## License

MIT
