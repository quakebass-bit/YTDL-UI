# 🎵 YTDL-UI (Termux Media Grabber & Player)

A lightweight web-based audio player, YouTube audio downloader, and stream recorder designed to run locally in **Termux on Android** (or on any Linux/macOS/Windows desktop).

---

## ✨ Features

* **YouTube Audio Extraction:** Downloads and extracts audio from YouTube directly to 192 kbps MP3 using `yt-dlp` and `ffmpeg`.
* **Direct Stream Capture:** Captures and converts live HTTP/googlevideo audio streams on the fly.
* **Precise A-B Looping:** Practice or loop specific segments of tracks.
* **Track Bookmarks:** Add timestamps with notes and jump to them instantly.
* **Touch-Friendly Modular Deck:** Draggable modules, custom playback speeds (0.5x–2.5x), and lock screen protection against accidental taps in pocket.
* **File Management:** Organize audio into subfolders, move tracks, and delete files directly from the UI.

---

## 🛠️ Prerequisites

* **Android** with [Termux](https://github.com/termux/termux-app) installed (or any desktop operating system)
* **Python 3.9+**
* **FFmpeg**

---

## 🚀 Quick Start (Termux)

### 1. Set up Termux environment

```bash
pkg update && pkg upgrade -y
termux-setup-storage
pkg install python ffmpeg git -y
