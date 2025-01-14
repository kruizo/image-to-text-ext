document.addEventListener("DOMContentLoaded", () => {
  const dropField = document.getElementById("dropField");
  const extractBtn = document.getElementById("extractBtn");
  const copyBtn = document.getElementById("copyBtn");
  const textOutput = document.getElementById("textOutput");
  const fileInput = document.createElement("input");

  fileInput.type = "file";
  fileInput.accept = "image/*";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  const Tesseract = window.Tesseract;
  Tesseract.setLogging(true);

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
      await processFile(files[0]);
    }
  });

  dropField.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", async (event) => {
    event.preventDefault();
    const file = fileInput.files[0];
    if (file) {
      await processFile(file);
    }
  });

  extractBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    if (fileInput.files.length > 0) {
      await processFile(fileInput.files[0]);
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

  async function processFile(file) {
    try {
      textOutput.textContent = "Processing...";
      console.log(
        "workerPath:",
        chrome.runtime.getURL("lib/tesseract/worker.min.js")
      );
      console.log(
        "langPath:",
        chrome.runtime.getURL("lib/lang_data/eng.traineddata")
      );
      console.log(
        "corePath:",
        chrome.runtime.getURL("lib/tesseract/tesseract-core.wasm.js")
      );

      const reader = new FileReader();
      reader.onload = async () => {
        const imageData = reader.result;

        try {
          const worker = await createWorker();
          console.log("Worker created");

          console.log("Loading worker...");
          await worker.load();
          console.log("Worker loaded");

          await worker.initialize("eng");
          console.log("Worker initialized");

          console.log("Starting OCR recognition...");
          const { data } = await worker.recognize(imageData);
          console.log("OCR completed");
          textOutput.textContent = data.text || "No text detected.";

          console.log("Terminating worker...");
          await worker.terminate();
          console.log("Worker terminated");
        } catch (ocrError) {
          console.error("Error during OCR:", ocrError);
          textOutput.textContent = ocrError;
        }
      };

      reader.onerror = () => {
        throw new Error("Failed to read the file. Please try again.");
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error:", error.message);
      textOutput.textContent = error.message;
    }
  }

  async function createWorker() {
    try {
      const worker = await Tesseract.createWorker({
        workerPath: chrome.runtime.getURL("lib/tesseract/worker.min.js"),
        corePath: chrome.runtime.getURL("lib/tesseract/tesseract-core.wasm.js"),
        langPath: chrome.runtime.getURL("lib/"),
        workerBlobURL: false,
      });
      console.log("Worker created successfully", worker);
      return worker;
    } catch (error) {
      console.error("Error creating worker:", error);
      throw error;
    }
  }
});
