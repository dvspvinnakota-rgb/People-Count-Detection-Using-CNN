"use strict";

const imageInput = document.getElementById("imageInput");
const chooseButton = document.getElementById("chooseButton");
const dropzone = document.getElementById("dropzone");
const dropzoneContent = document.getElementById("dropzoneContent");
const previewWrap = document.getElementById("previewWrap");
const resultCanvas = document.getElementById("resultCanvas");
const canvasContext = resultCanvas.getContext("2d");
const modelStatus = document.getElementById("modelStatus");
const modelStatusText = document.getElementById("modelStatusText");
const message = document.getElementById("message");
const count = document.getElementById("count");
const resultCaption = document.getElementById("resultCaption");
const processingTime = document.getElementById("processingTime");
const resetButton = document.getElementById("resetButton");

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DETECTION_THRESHOLD = 0.4;
let model = null;
let currentImageUrl = null;
let pendingFile = null;
let detectionRun = 0;

function setModelStatus(state, text) {
  modelStatus.classList.remove("ready", "error");
  if (state) {
    modelStatus.classList.add(state);
  }
  modelStatusText.textContent = text;
}

async function loadModel() {
  try {
    if (!window.cocoSsd || !window.tf) {
      throw new Error("The detection libraries could not be loaded.");
    }

    await tf.ready();
    model = await cocoSsd.load();
    setModelStatus("ready", "Model ready");
    if (pendingFile) {
      const file = pendingFile;
      pendingFile = null;
      analyzeImage(file);
    } else {
      message.textContent = "Choose an image to detect and count people.";
    }
  } catch (error) {
    setModelStatus("error", "Model unavailable");
    message.textContent = "Could not load the detection model. Check your internet connection and refresh.";
    pendingFile = null;
    console.error("Could not load the COCO-SSD model.", error);
  }
}

function drawDetections(image, detections) {
  const scale = window.devicePixelRatio || 1;
  const lineWidth = Math.max(2, image.naturalWidth * 0.003);
  const fontSize = Math.max(14, image.naturalWidth * 0.018);

  resultCanvas.width = image.naturalWidth * scale;
  resultCanvas.height = image.naturalHeight * scale;
  canvasContext.setTransform(scale, 0, 0, scale, 0, 0);
  canvasContext.drawImage(image, 0, 0);
  canvasContext.lineWidth = lineWidth;
  canvasContext.font = `600 ${fontSize}px system-ui, sans-serif`;
  canvasContext.textBaseline = "top";

  for (const detection of detections) {
    if (detection.class !== "person" || detection.score < DETECTION_THRESHOLD) {
      continue;
    }

    const [x, y, width, height] = detection.bbox;
    const label = `${Math.round(detection.score * 100)}%`;
    const labelWidth = canvasContext.measureText(label).width + 12;
    const labelHeight = fontSize + 8;
    const labelY = Math.max(0, y - labelHeight);

    canvasContext.strokeStyle = "#60e1bf";
    canvasContext.fillStyle = "#60e1bf";
    canvasContext.strokeRect(x, y, width, height);
    canvasContext.fillRect(x, labelY, labelWidth, labelHeight);
    canvasContext.fillStyle = "#10221f";
    canvasContext.fillText(label, x + 6, labelY + 4);
  }
}

async function analyzeImage(file) {
  pendingFile = null;
  if (!file) {
    return;
  }

  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    message.textContent = "Choose an image file (JPG, PNG, or WebP).";
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    message.textContent = "This image is larger than 20 MB. Choose a smaller image.";
    return;
  }

  pendingFile = file;
  if (!model) {
    message.textContent = "Your image will be analyzed when the detection model is ready.";
    return;
  }
  pendingFile = null;

  const run = ++detectionRun;
  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
  }
  currentImageUrl = URL.createObjectURL(file);
  const image = new Image();
  message.textContent = "Analyzing image…";
  count.textContent = "…";
  processingTime.textContent = "—";
  resetButton.hidden = true;

  image.onerror = () => {
    if (run === detectionRun) {
      URL.revokeObjectURL(currentImageUrl);
      currentImageUrl = null;
      message.textContent = "This image could not be opened. Try another file.";
      count.textContent = "—";
      resultCaption.textContent = "Add an image to start counting.";
      previewWrap.hidden = true;
      dropzoneContent.hidden = false;
      resetButton.hidden = true;
    }
  };

  image.onload = async () => {
    if (run !== detectionRun) {
      return;
    }

    try {
      const start = performance.now();
      const predictions = await model.detect(image);
      if (run !== detectionRun) {
        return;
      }

      const people = predictions.filter(
        (prediction) => prediction.class === "person" && prediction.score >= DETECTION_THRESHOLD
      );
      drawDetections(image, people);
      count.textContent = String(people.length);
      resultCaption.textContent = people.length === 1
        ? "1 person detected in this image."
        : `${people.length} people detected in this image.`;
      processingTime.textContent = `${Math.round(performance.now() - start)} ms`;
      message.textContent = "Analysis complete. Outlined boxes show detected people.";
      dropzoneContent.hidden = true;
      previewWrap.hidden = false;
      resetButton.hidden = false;
    } catch (error) {
      if (run === detectionRun) {
        message.textContent = "Image analysis failed. Try another image or refresh the page.";
        count.textContent = "—";
        console.error("Could not analyze the selected image.", error);
      }
    }
  };

  image.src = currentImageUrl;
}

function clearImage() {
  detectionRun += 1;
  pendingFile = null;
  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
    currentImageUrl = null;
  }
  imageInput.value = "";
  canvasContext.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  resultCanvas.width = 0;
  resultCanvas.height = 0;
  dropzoneContent.hidden = false;
  previewWrap.hidden = true;
  resetButton.hidden = true;
  count.textContent = "—";
  resultCaption.textContent = "Add an image to start counting.";
  processingTime.textContent = "—";
  message.textContent = model ? "Choose an image to detect and count people." : "Preparing the person detection model…";
}

chooseButton.addEventListener("click", () => imageInput.click());
imageInput.addEventListener("change", (event) => analyzeImage(event.target.files[0]));
resetButton.addEventListener("click", clearImage);

dropzone.addEventListener("click", (event) => {
  if (event.target !== chooseButton && !previewWrap.contains(event.target)) {
    imageInput.click();
  }
});

dropzone.addEventListener("keydown", (event) => {
  if (event.target === dropzone && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    imageInput.click();
  }
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("drag-over");
});

dropzone.addEventListener("dragleave", () => dropzone.classList.remove("drag-over"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("drag-over");
  analyzeImage(event.dataTransfer.files[0]);
});

loadModel();
