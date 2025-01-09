const dropField = document.getElementById("dropField");
const extractBtn = document.getElementById("extractBtn");
const copyBtn = document.getElementById("copyBtn");
const textOutput = document.getElementById("textOutput");
const fileInput = document.createElement("input");

fileInput.type = "file";
fileInput.accept = "image/*";
fileInput.style.display = "none";
document.body.appendChild(fileInput);

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
  event, preventDefault();
  const file = fileInput.files[0];
  if (file) {
    await processFile(file);
  }
});

extractBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (fileInput.files.length > 0) {
    processFile(fileInput.files[0]);
  } else {
    alert("Please upload or drop an image first!");
  }
});

// Copy Button Click Handler
copyBtn.addEventListener("click", (e) => {
  e.preventDefault(); // Prevent popup from closing
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
    const reader = new FileReader();
    reader.onload = async () => {
      if (window.Tesseract) {
        const result = await window.Tesseract.recognize(reader.result, "eng");
        textOutput.textContent =
          result.data.text || "No text found in the image.";
      } else {
        textOutput.textContent = "Tesseract.js is not loaded.";
      }
    };
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Error during OCR:", error);
    textOutput.textContent = "Error during OCR processing.";
  }
}
