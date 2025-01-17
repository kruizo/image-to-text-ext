const dropField = document.getElementById("dropField");
const copyBtn = document.getElementById("copyBtn");
const outputWrapper = document.getElementById("outputWrapper");
const textOutput = document.getElementById("textOutput");
const fileInput = document.createElement("input");
const previewImg = document.getElementById("previewImg");
const dropText = document.getElementById("dropText");
const preview = document.getElementById("preview");
const progressBar = document.getElementById("progress-bar");
const extractBtn = document.getElementById("extractBtn");

fileInput.type = "file";
fileInput.accept = "image/*";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

document.addEventListener("paste", async (event) => {
  const items = (event.clipboardData || event.originalEvent.clipboardData)
    .items;
  for (const item of items) {
    if (item.type.indexOf("image") === 0) {
      const file = item.getAsFile();
      await startOCR(file);
    }
  }
});

dropField.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropField.classList.add("dragover");
});

dropField.addEventListener("dragleave", () => {
  dropField.classList.remove("dragover");
});

dropField.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropField.classList.remove("dragover");
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    await startOCR(files[0]);
  }
});

dropField.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async (event) => {
  event.preventDefault();
  const file = fileInput.files[0];

  await startOCR(file);
});

copyBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const text = textOutput.textContent;
  const copyText = document.getElementById("copyText");
  if (text.trim()) {
    navigator.clipboard.writeText(text).then(() => {
      copyText.textContent = "COPIED!";
    });
  } else {
    alert("No text to copy!");
  }
});

function updatePreviewImage(src) {
  previewImg.src = src;
  toggleElementVisibility(previewImg, true);
  toggleElementVisibility(dropText, false);
}

function updateProgressBar(percentage, show = true) {
  if (show) {
    progressBar.style.display = "block";
    progressBar.style.width = `${percentage}%`;
  } else {
    progressBar.style.display = "none";
    progressBar.style.width = "0";
  }
}

function toggleElementVisibility(element, show = true) {
  element.style.display = show ? "block" : "none";
}

function toggleButtonState(button, disabled = true) {
  button.innerHTML = disabled ? "Extracting" : "Extract";

  button.classList.toggle("processing");
  button.disabled = disabled;
}

async function startOCR(file) {
  if (!file) {
    return new Error("No image file found");
  }
  if (!file.type.startsWith("image/")) {
    return new Error("Invalid file type. Please upload an image file.");
  }

  toggleElementVisibility(outputWrapper, false);
  updateProgressBar(0, true);
  updatePreviewImage(URL.createObjectURL(file));
  toggleButtonState(extractBtn);
  textOutput.innerHTML = ""; // Clear previous text

  try {
    const result = await extractText(file);

    toggleElementVisibility(outputWrapper, true);
    textOutput.innerHTML = `<pre>${result}</pre>`;
    updateProgressBar(100, false);
    toggleButtonState(extractBtn, false);
  } catch (error) {
    console.error("Error during OCR:", error);
    textOutput.innerHTML = `<pre>Failed to process the image. Please try again.</pre>`;
    toggleElementVisibility(outputWrapper, true);
    updateProgressBar(0, false);
    toggleButtonState(extractBtn, false);
  }
}

async function extractText(file) {
  try {
    const imageData = await readFileAsDataURL(file);
    const worker = createWorker();

    await worker.load();
    updateProgressBar(25);
    await worker.loadLanguage("eng");
    updateProgressBar(50);
    await worker.initialize("eng");
    updateProgressBar(75);
    const {
      data: { text },
    } = await worker.recognize(imageData);

    await worker.terminate();
    updateProgressBar(100);

    return text;
  } catch (error) {
    console.error("Error during OCR:", error);
    throw new Error("Failed to extract text. Please try again.");
  }
}

function createWorker() {
  try {
    const worker = Tesseract.createWorker({
      workerPath: chrome.runtime.getURL("lib/tesseract/worker.min.js"),
      langPath: chrome.runtime.getURL("lib/lang_data"),
      corePath: chrome.runtime.getURL("lib/tesseract/tesseract-core.wasm.js"),
      workerBlobURL: false,
    });

    return worker;
  } catch (error) {
    throw error;
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject("Failed to read the file.");
    reader.readAsDataURL(file);
  });
}
