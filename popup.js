const dropField = document.getElementById("dropField");
const extractBtn = document.getElementById("extractBtn");
const copyBtn = document.getElementById("copyBtn");
const textOutput = document.getElementById("textOutput");
const fileInput = document.createElement("input");
const previewImg = document.getElementById("previewImg");
const dropText = document.getElementById("dropText");
const preview = document.getElementById("preview");

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

document.addEventListener("DOMContentLoaded", init);

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

extractBtn.addEventListener("click", async (e) => {
  e.preventDefault();
  if (fileInput.files.length > 0) {
    await startOCR(fileInput.files[0]);
  } else {
    alert("Please upload or drop an image first!");
  }
});

copyBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const text = textOutput.textContent;
  if (text.trim()) {
    navigator.clipboard.writeText(text).then(() => {
      alert("Text copied to clipboard");
    });
  } else {
    alert("No text to copy!");
  }
});
async function init() {
  const { extractedText } = await chrome.storage.local.get("extractedText");
  if (extractedText) textOutput.textContent = extractedText;
  const { uploadedImage } = await chrome.storage.local.get("uploadedImage");
  if (uploadedImage) {
    previewImg.style.display = "block";
    previewImg.src = uploadedImage;
    dropText.style.display = "none";
  }
}

async function startOCR(file) {
  if (!file) {
    return new Error("No image file found");
  }
  if (!file.type.startsWith("image/")) {
    return new Error("Invalid file type. Please upload an image file.");
  }

  textOutput.textContent = "Processing...";
  document.getElementById("dropText").style.display = "none";
  previewImg.style.display = "block";
  previewImg.src = URL.createObjectURL(file);

  const result = await extractText(file);

  textOutput.innerHTML = `<pre>${result}</pre>`;

  const reader = new FileReader();
  reader.onload = async () => {
    const imageData = reader.result;
    await chrome.storage.local.set({
      uploadedImage: imageData,
      extractedText: result,
    });
  };
  reader.readAsDataURL(file);
}

async function extractText(file) {
  try {
    const imageData = await readFileAsDataURL(file);
    const worker = createWorker();

    await worker.load();

    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    const {
      data: { text },
    } = await worker.recognize(imageData);

    await worker.terminate();

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
