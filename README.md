# Local Offline PWA Diary Tracker v1

A minimalist Progressive Web App (PWA) designed for offline daily journaling and mood tracking. 

---

## ⚡ Core Features

*   **Strict Daily Lock:** Capped at 1 log per day. Automatically locks the input form upon submission.
*   **Midnight Reset:** Automatically unlocks at `00:00:00` with a live, real-time countdown timer.
*   **33-Word Limit:** A word counter with strict input truncation at exactly 33 words. (The reason is because I loved the game Clair Obscur: Expedition 33 and feels like 33 words are enough to descibe a day)
*   **Media & Preview:** Attaches 1 photo/video per day with in-app visual playback.
*   **Keystroke Auto-Save:** Saves text drafts and ratings to `localStorage` on every single keypress and when switching apps.
*   **Offline Status & Counter:** Displays a clear sync queue counter when disconnected from the server (`📥 X record(s) queued for sync`).

---

## 🗜️ Server-Side Compression Engine

When data is pushed back to the local PC via Wi-Fi, the Python backend automatically crunches the incoming files to optimize drive space:

*   **Images (Pillow):** Capped at 1080p resolution, converted to standard RGB JPEG space, and optimized **strictly under 1MB**.
*   **Videos (FFmpeg):** Downscaled to 720p and re-encoded using the highly efficient **H.265 (libx265)** codec to compress files **strictly under 10MB**.

---

## 🚀 Quick Start

### 1. Structure Checklist
Ensure your local folder matches this structure:
```text
tracker_app/
├── media/          # Destination folder for saved media files
├── server.py       # Flask backend, normal you will only to download/pull this file
├── static/
├── index.html
├── records.csv     # Place where you will store the records locally
├── app.js
├── manifest.json
└── sw.js
```
### 2. The Set Up (Make your you have python installed first lol :D)

# Activate your venv and install dependencies
pip install flask Pillow flask_cors

# Run the local server (with in the folder directory)
python server.py

You should see the output something like:
```text
(.venv) PS Z:\tools\diary> py server.py                                                                                            
 * Serving Flask app 'server'
 * Debug mode: off
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on all addresses (0.0.0.0)
 * Running on https://127.0.0.1:5000
 * Running on https://192.168.xx.xx:5000  <------------ (copy this address)
 ```
 
#To make it offline pwa
You will need to make your phone to trust your local server connection first, steps as below:

1. Make sure you phone is connected to wifi or network which is same as your server/PC (to save the logs)
2. Open up safari, paste in the above in the address bar (https://192.168.xx.xx:5000)
you will then see a unsecure website, proceed and continue to visit

<img src="screenshots\image0.png" width="200" height="400" alt="First"> <img src="screenshots\image1.png" width="200" height="400" alt="First"> <img src="screenshots\image2.png" width="200" height="400" alt="Second"> 

If you see a page says status online, congrats, your phone trust your pc/server now! if say page not find, its fine too, you are also connected 

 <img src="screenshots\image5.png" width="200" height="400" alt="Fifth"> <img src="screenshots\image3.png" width="200" height="400" alt="Third">

3. Now go to git page ----> https://labrat404.github.io/Daily-Writer/

4. Select "Add to Home Screen" and make sure the "Open as Web App toggle is off" (if its on, it will ignore the previously trust and will not work). (On iphone, not sure abt others)
5. Tap the gear button and put in the address you copied eariler https://192.168.xx.xx:5000 (as follow)

<img src="screenshots\image6.png" width="200" height="450" alt="sixth"> <img src="screenshots\image4.png" width="200" height="450" alt="Forth">

After connecting, you will be able to save all the logs with a green push button, which saves the logs to pc.

Try saving logs every week or two. iOS resets connection trust daily so setting it up every day will be a huge hassle. (Unles you got your own db/server in somewhere with a valid cert)

Records.csv and the media folder atatched as an example how it will be once pushed to the local pc/server

## 🔮 Future
Will add a simple summarise UI to view these daily log, maybe also a graph to visual my average mood? :D 
