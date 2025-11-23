import { IsbnScannerService } from './isbn-service.js';

// Elements
const startBtn = document.getElementById('start-btn');
const resultDiv = document.getElementById('result-area');
const readerDiv = document.getElementById('reader');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const cameraSelectWrapper = document.getElementById('camera-select-wrapper');
const cameraSelect = document.getElementById('camera-select');

let scannerService = null;

// Initialize Service safely
try {
    scannerService = new IsbnScannerService("reader");
} catch (err) {
    resultDiv.innerHTML = `<span class="text-red-600 font-bold">Error: ${err.message}</span>`;
    startBtn.disabled = true;
    startBtn.innerText = "System Error";
}

// Enumerate cameras early
initCameraSelection();

async function initCameraSelection() {
    if (!scannerService) return;
    try {
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
            cameraSelectWrapper.classList.add('hidden');
            return;
        }
        cameraSelect.innerHTML = '';
        cameras.forEach((cam, idx) => {
            const opt = document.createElement('option');
            opt.value = cam.id;
            opt.textContent = cam.label || `Camera ${idx + 1}`;
            cameraSelect.appendChild(opt);
        });
        cameraSelectWrapper.classList.remove('hidden');
    } catch (e) {
        console.warn('Camera enumeration failed:', e);
        cameraSelectWrapper.classList.add('hidden');
    }
}

// Success Callback
const handleSuccessfulScan = async (isbn) => {
    console.log("Scanned ISBN:", isbn);
    
    // Stop camera
    await scannerService.stop();
    if (cameraPlaceholder) cameraPlaceholder.classList.remove('hidden');
    
    // Reset Button
    startBtn.innerHTML = `Activate Scanner`;
    startBtn.disabled = false;
    
    // Show Loading
    resultDiv.innerHTML = `
        <div class="animate-pulse">
            <p class="font-bold text-green-600">ISBN Found: ${isbn}</p>
            <p class="text-xs">Fetching book details...</p>
        </div>
    `;

    // Fetch Data
    try {
        const book = await scannerService.fetchBookDetails(isbn);
        let coverUrl = book?.cover?.medium;
        if (!coverUrl) {
            coverUrl = await scannerService.getCoverUrl(isbn);
        }
        if (book) {
            resultDiv.innerHTML = `
                <div class="flex flex-col items-center gap-2">
                    <img src="${coverUrl || 'https://via.placeholder.com/100x150?text=No+Cover'}" onerror="this.src='https://via.placeholder.com/100x150?text=No+Cover'" class="w-24 h-36 object-cover shadow-md rounded" />
                    <h3 class="font-bold text-gray-800">${book.title}</h3>
                    <p class="text-xs text-gray-500">${book.authors ? book.authors.map(a => a.name).join(", ") : "Unknown Author"}</p>
                    <div class="bg-gray-200 px-2 py-1 rounded text-xs font-mono">${isbn}</div>
                    <span class="text-[10px] text-gray-400">Source: ${book.source || 'unknown'}</span>
                </div>
            `;
        } else {
            // Attempt cover retrieval even if metadata missing
            const fallbackCover = coverUrl || 'https://via.placeholder.com/100x150?text=No+Cover';
            resultDiv.innerHTML = `
                <div class="flex flex-col items-center gap-2">
                    <img src="${fallbackCover}" onerror="this.src='https://via.placeholder.com/100x150?text=No+Cover'" class="w-24 h-36 object-cover shadow-md rounded" />
                    <p class="text-yellow-700 text-sm">No metadata found.</p>
                    <div class="bg-gray-200 px-2 py-1 rounded text-xs font-mono">${isbn}</div>
                </div>
            `;
        }
    } catch (e) {
        resultDiv.innerHTML = `<span class="text-red-600">Network Error: Could not fetch book details.</span>`;
    }
};

// Button Listener
if (startBtn && scannerService) {
    startBtn.addEventListener('click', async () => {
        try {
            // Visual Feedback
            startBtn.disabled = true;
            startBtn.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting Camera...
            `;
            resultDiv.innerText = "Requesting camera permission...";

            // Start Scanner
            const selectedDeviceId = cameraSelect && cameraSelect.value ? cameraSelect.value : null;
            await scannerService.start(handleSuccessfulScan, selectedDeviceId);
            if (cameraPlaceholder) cameraPlaceholder.classList.add('hidden');
            
            // If successful start
            resultDiv.innerText = "Scanning... Point at an ISBN barcode.";
            
        } catch (err) {
            console.error(err);
            startBtn.disabled = false;
            startBtn.innerText = "Activate Scanner";
            
            // Detailed Error for User
            let msg = "Camera failed to start.";
            if (err.name === 'NotAllowedError') msg = "Permission denied. Please allow camera access.";
            if (err.name === 'NotFoundError') msg = "No camera found on this device.";
            if (err.name === 'NotReadableError') msg = "Camera is in use by another app.";
            
            resultDiv.innerHTML = `<span class="text-red-600 font-bold">${msg}</span><br><span class="text-xs text-red-400">${err.message}</span>`;
        }
    });
}