// isbn-service.js

export class IsbnScannerService {
    constructor(elementId) {
        // Safety check: ensure the library is loaded
        if (typeof Html5Qrcode === 'undefined') {
            throw new Error("html5-qrcode library not loaded. Check internet connection.");
        }

        const element = document.getElementById(elementId);
        if (!element) {
            throw new Error(`Element with id ${elementId} not found`);
        }

        // Initialize the library instance
        this.html5QrCode = new Html5Qrcode(elementId);
        this.isScanning = false;
    }

    /**
     * Starts the camera and scanner.
     * @param {Function} onScanSuccess - Callback when an ISBN is found (returns text).
     * @param {Function} onScanError - (Optional) Callback for frame errors.
     */
    async start(onScanSuccess, onScanError = null) {
        if (this.isScanning) return;

        // 1. Configuration for ISBN (EAN-13)
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13]
        };

        // 2. Camera Constraints 
        // We use 'ideal' instead of 'min' to prevent crashes on older phones
        const videoConstraints = {
            facingMode: "environment",
            focusMode: "continuous",
            advanced: [{ focusMode: "continuous" }],
            width: { ideal: 1280 }, 
            height: { ideal: 720 } 
        };

        try {
            await this.html5QrCode.start(
                videoConstraints, 
                config, 
                (decodedText, decodedResult) => {
                    if (onScanSuccess) onScanSuccess(decodedText, decodedResult);
                },
                (errorMessage) => {
                    // Suppress common frame errors to avoid console spam
                    // Only report if critical
                }
            );
            this.isScanning = true;
        } catch (err) {
            console.error("Failed to start scanner service:", err);
            throw err; 
        }
    }

    async stop() {
        if (!this.isScanning) return;
        
        try {
            await this.html5QrCode.stop();
            this.isScanning = false;
        } catch (err) {
            console.error("Failed to stop scanner:", err);
        }
    }

    async fetchBookDetails(isbn) {
        const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;
        try {
            const response = await fetch(url);
            const data = await response.json();
            const key = `ISBN:${isbn}`;
            return data[key] || null;
        } catch (error) {
            console.error("Service API Error:", error);
            throw error;
        }
    }
}