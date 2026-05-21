from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import subprocess
import csv
import os
import json
from datetime import datetime

app = Flask(__name__)

# Enables frontend hosted on GitHub to talk to this backend
CORS(app)

CSV_FILE = 'records.csv'
MEDIA_DIR = 'media'

os.makedirs(MEDIA_DIR, exist_ok=True)

if not os.path.exists(CSV_FILE):
    with open(CSV_FILE, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['datetime', 'rate', 'comment', 'media_file'])

def compress_media(file_path):
    ext = file_path.lower().split('.')[-1]
    
    if ext in ['jpg', 'jpeg', 'png']:
        try:
            img = Image.open(file_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            img.thumbnail((1920, 1080))
            
            quality = 85
            img.save(file_path, "JPEG", optimize=True, quality=quality)
            
            while os.path.getsize(file_path) > 1 * 1024 * 1024 and quality > 10:
                quality -= 5
                img.save(file_path, "JPEG", optimize=True, quality=quality)
        except Exception as e:
            print(f"Image compression skipped/failed: {e}")

    elif ext in ['mp4', 'mov']:
        try:
            temp_path = file_path + "_temp.mp4"
            cmd = [
                'ffmpeg', '-y', '-i', file_path,
                '-vcodec', 'libx265', '-crf', '30', 
                '-preset', 'fast', 
                '-vf', 'scale=-2:720',
                temp_path
            ]
            subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            os.replace(temp_path, file_path)
        except Exception as e:
            print(f"Video compression failed: {e}")
            if os.path.exists(temp_path):
                os.remove(temp_path)

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"status": "online"})

@app.route('/check_date', methods=['GET'])
def check_date():
    target_date = request.args.get('date')
    if not target_date or not os.path.exists(CSV_FILE):
        return jsonify({"exists": False})
    
    with open(CSV_FILE, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if row and len(row) > 0 and row[0].startswith(target_date):
                return jsonify({"exists": True})
                
    return jsonify({"exists": False})

@app.route('/push', methods=['POST'])
def push_data():
    records_json = request.form.get('records', '[]')
    try:
        records = json.loads(records_json)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid data format"}), 400

    if not records:
        return jsonify({"status": "no_data"})

    with open(CSV_FILE, 'a', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        for index, entry in enumerate(records):
            file = request.files.get(f'media_{index}')
            saved_filename = ""

            if file and file.filename != '':
                ext = os.path.splitext(file.filename)[1].lower()
                if ext == '.mov': ext = '.mp4' 
                
                unique_id = entry.get('id', datetime.now().strftime("%Y%m%d_%H%M%S"))
                saved_filename = f"{unique_id}{ext}"
                
                file_path = os.path.join(MEDIA_DIR, saved_filename)
                file.save(file_path)
                compress_media(file_path)

            writer.writerow([
                entry.get('datetime'), 
                entry.get('rate'), 
                entry.get('comment'),
                saved_filename
            ])
    
    return jsonify({"status": "success", "records_saved": len(records)})

if __name__ == '__main__':
    # Generates a temporary secure HTTPS certificate on the fly
    app.run(host='0.0.0.0', port=5000, ssl_context='adhoc')