import cv2
import numpy as np
from datetime import datetime

class TrafficSignalDetector:
    def __init__(self):
        # Open default webcam
        self.camera = cv2.VideoCapture(0)
        self.current_signal = "OFFLINE"
        
        # Keep track of history
        self.history = []
        
        # Define HSV limits for colors
        # Red spectrum usually splits across 0 and 180
        self.lower_red1 = np.array([0, 120, 70])
        self.upper_red1 = np.array([10, 255, 255])
        self.lower_red2 = np.array([170, 120, 70])
        self.upper_red2 = np.array([180, 255, 255])
        
        # Yellow
        self.lower_yellow = np.array([15, 100, 100])
        self.upper_yellow = np.array([35, 255, 255])
        
        # Green
        self.lower_green = np.array([40, 50, 50])
        self.upper_green = np.array([90, 255, 255])

    def get_action_for_color(self, color):
        if color == "RED":
            return "STOP VEHICLES"
        elif color == "YELLOW":
            return "READY TO MOVE"
        elif color == "GREEN":
            return "GO"
        return "WAITING"

    def detect_color(self, frame):
        """Processes the frame, filters HSV colors, and detects the majority traffic color"""
        hsv_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
        mask_red1 = cv2.inRange(hsv_frame, self.lower_red1, self.upper_red1)
        mask_red2 = cv2.inRange(hsv_frame, self.lower_red2, self.upper_red2)
        mask_red = cv2.bitwise_or(mask_red1, mask_red2)
        
        mask_yellow = cv2.inRange(hsv_frame, self.lower_yellow, self.upper_yellow)
        mask_green = cv2.inRange(hsv_frame, self.lower_green, self.upper_green)
        
        # Count non-zero matching pixels for each color
        red_pixels = cv2.countNonZero(mask_red)
        yellow_pixels = cv2.countNonZero(mask_yellow)
        green_pixels = cv2.countNonZero(mask_green)
        
        # Minimum threshold of pixels required to consider it a detected signal
        threshold = 1000 
        
        colors = {"RED": red_pixels, "YELLOW": yellow_pixels, "GREEN": green_pixels}
        max_color = max(colors, key=colors.get)
        
        new_signal = max_color if colors[max_color] > threshold else "NO SIGNAL"
        
        if new_signal != self.current_signal:
            self.current_signal = new_signal
            
            # Log to history
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            action = self.get_action_for_color(new_signal)
            
            log_entry = {
                "color": new_signal,
                "timestamp": timestamp,
                "action": action
            }
            
            if new_signal != "NO SIGNAL" and new_signal != "OFFLINE":
                self.history.insert(0, log_entry)
                # Keep only history of last 10
                if len(self.history) > 10:
                    self.history.pop()

    def get_frame(self):
        """Captures a frame, runs detection, and encodes to JPEG"""
        success, frame = self.camera.read()
        if not success:
            return None
        
        # Process frame to detect traffic light
        self.detect_color(frame)
        
        # Enhance UI of the video feed for dashboard feel
        height, width, _ = frame.shape
        
        # Add control room style overlay to camera feed
        cv2.rectangle(frame, (10, height - 70), (width - 10, height - 10), (0, 0, 0), -1)
        
        action = self.get_action_for_color(self.current_signal)
        status_text = f"AI DETECTION: {self.current_signal} | ACTION: {action}"
        
        text_color = (255, 255, 255) # default white
        if self.current_signal == "RED":
            text_color = (0, 0, 255)
        elif self.current_signal == "YELLOW":
            text_color = (0, 255, 255)
        elif self.current_signal == "GREEN":
            text_color = (0, 255, 0)
            
        cv2.putText(frame, status_text, (20, height - 30), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, text_color, 2, cv2.LINE_AA)
        
        # Draw target reticle crosshairs
        center_x, center_y = width // 2, height // 2
        cv2.line(frame, (center_x - 20, center_y), (center_x + 20, center_y), (255, 255, 255), 1)
        cv2.line(frame, (center_x, center_y - 20), (center_x, center_y + 20), (255, 255, 255), 1)
                    
        # Encode to JPG string for web streaming
        ret, buffer = cv2.imencode('.jpg', frame)
        return buffer.tobytes()

    def get_current_status(self):
        action = self.get_action_for_color(self.current_signal)
        return {
            "color": self.current_signal,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "action": action
        }
        
    def get_history(self):
        return self.history

    def release(self):
        if self.camera.isOpened():
            self.camera.release()
