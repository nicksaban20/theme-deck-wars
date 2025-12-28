#!/usr/bin/env python3
"""
Local Stable Diffusion GGUF API Server
OpenAI-compatible endpoint for the card game
"""

from stable_diffusion_cpp import StableDiffusion
from flask import Flask, request, jsonify
import base64
import io
import os
import threading

# Lock to prevent concurrent access to the model (SD C++ is not thread-safe)
generation_lock = threading.Lock()

app = Flask(__name__)

# Model path - SD 2.1 Turbo for fast 1-4 step generation
MODEL_PATH = os.environ.get(
    "SD_MODEL_PATH",
    "sd-turbo-Q4_0.gguf"
)

# Initialize model (load once on startup for speed)
print(f"[SD Server] Loading model from {MODEL_PATH}...")
sd = None

def get_model():
    global sd
    if sd is None:
        sd = StableDiffusion(
            model_path=MODEL_PATH,
            wtype="q4_0",  # Match GGUF quantization
        )
        print("[SD Server] Model loaded!")
    return sd

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route("/v1/images/generations", methods=["POST", "OPTIONS"])
def generate_image():
    """OpenAI-compatible image generation endpoint"""
    if request.method == "OPTIONS":
        return jsonify({})

    try:
        data = request.json or {}
        prompt = data.get("prompt", "fantasy art")
        
        # Force 512x512 for stability (SD Turbo is optimized for this)
        width, height = 512, 512
        
        print(f"[SD Server] Request: {prompt[:50]}... ({width}x{height})")
        
        # Acquire lock to ensure only one generation happens at a time
        with generation_lock:
            # print(f"[SD Server] Processing (Access Granted)...")
            model = get_model()
            
            # Generate image with speed-optimized settings
            images = model.generate_image(
                prompt=prompt,
                width=width,
                height=height,
                sample_steps=1,
                cfg_scale=1.0,
            )
        
        if not images:
            return jsonify({"error": "No images generated"}), 500
        
        # Convert PIL image to base64
        img = images[0]
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        b64_image = base64.b64encode(buffer.getvalue()).decode()
        
        print(f"[SD Server] Generated image successfully!")
        
        return jsonify({
            "data": [
                {"b64_json": b64_image}
            ]
        })
        
    except Exception as e:
        print(f"[SD Server] Error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model": MODEL_PATH})

if __name__ == "__main__":
    # Pre-load model
    get_model()
    
    port = int(os.environ.get("PORT", 8080))
    print(f"[SD Server] Starting on port {port}...")
    app.run(host="0.0.0.0", port=port)
