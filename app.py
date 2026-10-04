import os
import re
import glob
import json
import shutil
import threading
import subprocess
import urllib.request
from datetime import datetime
import yt_dlp
from flask import Flask, request, jsonify, send_from_directory, render_template, make_response

app = Flask(__name__)

# Determine default directory based on environment (Termux vs standard OS)
if os.path.exists('/data/data/com.termux'):
    DEFAULT_DIR = os.path.expanduser('~/storage/shared/Music/Youtube')
else:
    DEFAULT_DIR = os.path.join(os.getcwd(), 'music')

BASE_DIR = os.getenv('MUSIC_BASE_DIR', DEFAULT_DIR)
os.makedirs(BASE_DIR, exist_ok=True)

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')
BOOKMARKS_FILE = os.path.join(BASE_DIR, 'bookmarks.json')

# Locks for thread safety
state_lock = threading.Lock()
bookmarks_lock = threading.Lock()

# Global download state
download_state = {
    'active': False,
    'progress': 0,
    'status': 'idle',  # 'idle', 'downloading', 'converting', 'done', 'error'
    'error': None
}

# ================= PWA ROUTES =================

@app.route('/manifest.json')
def serve_manifest():
    return send_from_directory(STATIC_DIR, 'manifest.json', mimetype='application/manifest+json')

@app.route('/sw.js')
def serve_sw():
    response = make_response(send_from_directory(STATIC_DIR, 'sw.js', mimetype='application/javascript'))
    response.headers['Service-Worker-Allowed'] = '/'
    return response

# ================= UTILITIES =================

def is_safe_path(target_path, base_dir=BASE_DIR):
    """Prevents Path Traversal attacks."""
    abs_base = os.path.abspath(base_dir)
    abs_target = os.path.abspath(target_path)
    return os.path.commonpath([abs_target, abs_base]) == abs_base

def sanitize_filename(name):
    """Sanitizes filename strings across different OS filesystems."""
    name = re.sub(r'[\\/*?:"<>|]', '', name).strip()
    return name or 'audio'

def get_unique_filepath(target_dir, base_name, ext='.mp3'):
    """Generates a non-conflicting unique filename if a duplicate exists."""
    clean_name = sanitize_filename(base_name)
    candidate = f"{clean_name}{ext}"
    counter = 1
    while os.path.exists(os.path.join(target_dir, candidate)):
        candidate = f"{clean_name} ({counter}){ext}"
        counter += 1
    return os.path.join(target_dir, candidate)

def cleanup_temp_files():
    """Removes dangling temporary files left from incomplete downloads."""
    patterns = ['*.part', '*.temp', '*.ytdl', '*.tmp']
    for root, _, _ in os.walk(BASE_DIR):
        for pattern in patterns:
            for file_path in glob.glob(os.path.join(root, pattern)):
                try:
                    os.remove(file_path)
                except Exception:
                    pass

cleanup_temp_files()

def load_all_bookmarks():
    """Loads bookmarks dictionary from JSON file safely."""
    with bookmarks_lock:
        if os.path.exists(BOOKMARKS_FILE):
            try:
                with open(BOOKMARKS_FILE, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error reading bookmarks.json: {e}")
                return {}
        return {}

def save_all_bookmarks(data):
    """Saves bookmarks dictionary to JSON file safely."""
    with bookmarks_lock:
        try:
            with open(BOOKMARKS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Error writing bookmarks.json: {e}")

def ytdl_progress_hook(d):
    """Progress hook callback for yt-dlp."""
    with state_lock:
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)
            if total > 0:
                percent = int((downloaded / total) * 90)
                download_state['progress'] = percent
                download_state['status'] = 'downloading'
        elif d['status'] == 'finished':
            download_state['progress'] = 92
            download_state['status'] = 'converting'

def download_youtube_task(url, subfolder="", custom_name=""):
    target_dir = os.path.join(BASE_DIR, subfolder) if subfolder else BASE_DIR
    if not is_safe_path(target_dir):
        with state_lock:
            download_state['active'] = False
            download_state['status'] = 'error'
            download_state['error'] = 'Invalid target directory'
        return

    os.makedirs(target_dir, exist_ok=True)

    if custom_name.strip():
        outtmpl = os.path.join(target_dir, f"{sanitize_filename(custom_name)}.%(ext)s")
    else:
        outtmpl = os.path.join(target_dir, '%(title)s [%(id)s].%(ext)s')

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': outtmpl,
        'extractor_args': {
            'youtube': {
                'player_client': ['mweb', 'android', 'tv_embedded']
            }
        },
        'retries': 25,
        'fragment_retries': 25,
        'buffersize': 1024 * 1024,
        'http_chunk_size': 5242880,
        'socket_timeout': 30,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'noplaylist': True,
        'quiet': True,
        'progress_hooks': [ytdl_progress_hook]
    }

    try:
        with state_lock:
            download_state['active'] = True
            download_state['progress'] = 0
            download_state['status'] = 'downloading'
            download_state['error'] = None

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        with state_lock:
            download_state['progress'] = 100
            download_state['status'] = 'done'
    except Exception as e:
        with state_lock:
            download_state['status'] = 'error'
            download_state['error'] = str(e)
        print(f"YouTube download error: {e}")
    finally:
        with state_lock:
            download_state['active'] = False

def download_direct_stream_task(url, subfolder="", custom_name=""):
    target_dir = os.path.join(BASE_DIR, subfolder) if subfolder else BASE_DIR
    if not is_safe_path(target_dir):
        with state_lock:
            download_state['active'] = False
            download_state['status'] = 'error'
            download_state['error'] = 'Invalid target directory'
        return

    os.makedirs(target_dir, exist_ok=True)

    if custom_name.strip():
        final_base = sanitize_filename(custom_name)
    else:
        final_base = datetime.now().strftime('%Y-%m-%d_%H%M%S')

    final_mp3_path = get_unique_filepath(target_dir, final_base, '.mp3')
    temp_download_path = os.path.join(target_dir, f"temp_stream_{int(datetime.now().timestamp())}.tmp")

    try:
        with state_lock:
            download_state['active'] = True
            download_state['progress'] = 0
            download_state['status'] = 'downloading'
            download_state['error'] = None

        req = urllib.request.Request(
            url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=30) as response, open(temp_download_path, 'wb') as out_file:
            content_length = response.headers.get('Content-Length')
            total_size = int(content_length) if content_length else 0
            downloaded = 0
            chunk_size = 64 * 1024

            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                out_file.write(chunk)
                downloaded += len(chunk)
                with state_lock:
                    if total_size > 0:
                        percent = int((downloaded / total_size) * 85)
                        download_state['progress'] = min(85, percent)
                    else:
                        download_state['progress'] = min(75, download_state['progress'] + 1)

        with state_lock:
            download_state['progress'] = 90
            download_state['status'] = 'converting'

        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-i', temp_download_path,
            '-vn',
            '-ar', '44100',
            '-ac', '2',
            '-b:a', '192k',
            final_mp3_path
        ]

        result = subprocess.run(ffmpeg_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg error: {result.stderr.decode('utf-8', errors='ignore')}")

        with state_lock:
            download_state['progress'] = 100
            download_state['status'] = 'done'

    except Exception as e:
        with state_lock:
            download_state['status'] = 'error'
            download_state['error'] = str(e)
        print(f"Direct stream download error: {e}")
    finally:
        if os.path.exists(temp_download_path):
            try:
                os.remove(temp_download_path)
            except Exception:
                pass
        with state_lock:
            download_state['active'] = False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/folders', methods=['GET'])
def list_folders():
    folders = ['']
    try:
        for entry in os.scandir(BASE_DIR):
            if entry.is_dir():
                folders.append(entry.name)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    return jsonify(folders)

@app.route('/api/folders/create', methods=['POST'])
def create_folder():
    data = request.get_json() or {}
    folder_name = data.get('folder', '').strip().replace('/', '_').replace('\\', '_')
    if not folder_name:
        return jsonify({'error': 'Folder name cannot be empty'}), 400

    target_path = os.path.join(BASE_DIR, folder_name)
    if not is_safe_path(target_path):
        return jsonify({'error': 'Invalid folder path'}), 400

    os.makedirs(target_path, exist_ok=True)
    return jsonify({'status': 'Folder created', 'folder': folder_name})

@app.route('/api/move', methods=['POST'])
def move_file():
    data = request.get_json() or {}
    file_rel_path = data.get('file')
    target_folder = data.get('targetFolder', '').strip()

    if not file_rel_path:
        return jsonify({'error': 'File path is required'}), 400

    source_path = os.path.join(BASE_DIR, file_rel_path)
    file_name = os.path.basename(file_rel_path)
    dest_path = os.path.join(BASE_DIR, target_folder, file_name)

    if not is_safe_path(source_path) or not is_safe_path(dest_path):
        return jsonify({'error': 'Access denied: invalid path'}), 403

    if not os.path.exists(source_path):
        return jsonify({'error': 'File not found'}), 404

    try:
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        shutil.move(source_path, dest_path)

        bms = load_all_bookmarks()
        if file_rel_path in bms:
            new_rel_path = os.path.relpath(dest_path, BASE_DIR).replace('\\', '/')
            bms[new_rel_path] = bms.pop(file_rel_path)
            save_all_bookmarks(bms)

        return jsonify({'status': 'File moved successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download', methods=['POST'])
def download():
    data = request.get_json() or {}
    url = data.get('url', '').strip()
    folder = data.get('folder', '').strip()
    mode = data.get('mode', 'youtube')
    custom_name = data.get('customName', '').strip()

    if not url:
        return jsonify({'error': 'URL is required'}), 400

    with state_lock:
        if download_state['active']:
            return jsonify({'error': 'Another download is already in progress'}), 409

    if mode == 'stream':
        thread = threading.Thread(target=download_direct_stream_task, args=(url, folder, custom_name))
    else:
        thread = threading.Thread(target=download_youtube_task, args=(url, folder, custom_name))

    thread.daemon = True
    thread.start()
    return jsonify({'status': 'Download started'})

@app.route('/api/download/status', methods=['GET'])
def get_download_status():
    with state_lock:
        return jsonify(download_state)

@app.route('/api/files', methods=['GET'])
def list_files():
    folder = request.args.get('folder', default='', type=str).strip()
    search_path = os.path.join(BASE_DIR, folder)

    if not is_safe_path(search_path) or not os.path.exists(search_path):
        return jsonify([])

    files = []
    allowed_exts = ('.mp3', '.m4a', '.ogg', '.flac', '.wav')
    for f in os.listdir(search_path):
        if f.lower().endswith(allowed_exts):
            full_p = os.path.join(search_path, f)
            rel_p = os.path.relpath(full_p, BASE_DIR).replace('\\', '/')
            files.append({
                'name': f,
                'path': rel_p,
                'time': os.path.getmtime(full_p)
            })

    files.sort(key=lambda x: x['time'], reverse=True)
    return jsonify(files)

@app.route('/api/delete/<path:filename>', methods=['DELETE'])
def delete_file(filename):
    file_path = os.path.join(BASE_DIR, filename)
    if not is_safe_path(file_path):
        return jsonify({'error': 'Access denied: invalid path'}), 403

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            bms = load_all_bookmarks()
            if filename in bms:
                del bms[filename]
                save_all_bookmarks(bms)
            return jsonify({'status': 'File deleted successfully'})
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    return jsonify({'error': 'File not found'}), 404

# ================= BOOKMARKS ENDPOINTS =================

@app.route('/api/bookmarks', methods=['GET'])
def get_bookmarks():
    rel_path = request.args.get('file', '').strip()
    if not rel_path:
        return jsonify([])
    data = load_all_bookmarks()
    return jsonify(data.get(rel_path, []))

@app.route('/api/bookmarks', methods=['POST'])
def add_bookmark():
    req = request.get_json() or {}
    rel_path = req.get('file', '').strip()
    time_val = req.get('time')
    label = req.get('label', '').strip() or 'Bookmark'

    if not rel_path or time_val is None:
        return jsonify({'error': 'Missing required parameters'}), 400

    data = load_all_bookmarks()
    marks = data.get(rel_path, [])

    new_mark = {
        'id': int(datetime.now().timestamp() * 1000),
        'time': round(float(time_val), 1),
        'label': label
    }
    marks.append(new_mark)
    marks.sort(key=lambda x: x['time'])
    data[rel_path] = marks
    save_all_bookmarks(data)

    return jsonify({'status': 'ok', 'bookmark': new_mark, 'bookmarks': marks})

@app.route('/api/bookmarks', methods=['DELETE'])
def delete_bookmark():
    req = request.get_json() or {}
    rel_path = req.get('file', '').strip()
    mark_id = req.get('id')

    if not rel_path or mark_id is None:
        return jsonify({'error': 'Missing required parameters'}), 400

    data = load_all_bookmarks()
    if rel_path in data:
        data[rel_path] = [m for m in data[rel_path] if m['id'] != mark_id]
        save_all_bookmarks(data)
        return jsonify({'status': 'ok', 'bookmarks': data[rel_path]})

    return jsonify({'status': 'ok', 'bookmarks': []})

# ================= STREAMING =================

@app.route('/stream/<path:filename>')
def stream_audio(filename):
    target_path = os.path.join(BASE_DIR, filename)
    if not is_safe_path(target_path):
        return jsonify({'error': 'Access denied'}), 403

    response = send_from_directory(BASE_DIR, filename, conditional=True)
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port)