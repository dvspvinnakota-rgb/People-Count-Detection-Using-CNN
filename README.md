# Smart Crowd Count Detection

A browser-based crowd-counting prototype. Upload a still image to estimate how many people it contains; detected people are highlighted with bounding boxes.

## Run locally

From this folder, start Python's built-in static web server:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000> in a browser. Stop the server with `Ctrl+C`.

The TensorFlow.js runtime and COCO-SSD model are loaded from public CDNs, so the first load needs an internet connection. Images are processed in the browser; this app does not upload or persist them.

## Limitations

This prototype counts people detected in a single image. It does not process video or live camera streams, and generic COCO-SSD person detection can miss people in dense, distant, or obstructed crowds. Treat the count as an estimate, not a safety-critical measurement.