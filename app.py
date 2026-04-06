from flask import Flask, render_template, Response, jsonify
from detector import TrafficSignalDetector
import sys

app = Flask(__name__)
detector = None

def gen_frames():
    """Generator function that continuously yields camera frames."""
    global detector
    if detector is None:
        detector = TrafficSignalDetector()
        
    while True:
        try:
            frame = detector.get_frame()
            if frame is not None:
                # Yield the frame in multipart MJPEG format
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
            else:
                break
        except Exception as e:
            print(f"Error accessing camera frames: {e}")
            break

@app.route('/')
def index():
    """Serve the main frontend UI."""
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    """Stream MJPEG video directly to the browser."""
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/signal_status')
def signal_status():
    """Return the current traffic signal detection status as JSON."""
    global detector
    if detector is not None:
        return jsonify(detector.get_current_status())
    else:
        return jsonify({
            "color": "OFFLINE", 
            "timestamp": "", 
            "action": "WAITING"
        })

@app.route('/history')
def get_history():
    """Return the detection history (last 10 detections)"""
    global detector
    if detector is not None:
        return jsonify(detector.get_history())
    return jsonify([])

if __name__ == '__main__':
    # Try to initialize the camera singleton globally
    try:
        detector = TrafficSignalDetector()
        print("Camera initialized properly.")
    except Exception as e:
        print(f"Failed to load OpenCV Camera: {e}")
        
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
