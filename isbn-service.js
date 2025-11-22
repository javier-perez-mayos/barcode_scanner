// isbn-service.js

export class IsbnScannerService {
    constructor(elementId) {
        if (!document.getElementById(elementId)) {
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

        // 2. Advanced Camera Constraints (Autofocus & Resolution)
        const videoConstraints = {
            facingMode: "environment",
            focusMode: "continuous",
            advanced: [{ focusMode: "continuous" }],
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 }
        };

        try {
            await this.html5QrCode.start(
                videoConstraints, 
                config, 
                (decodedText, decodedResult) => {
                    // We wrap the callback to handle state internally if needed
                    if (onScanSuccess) onScanSuccess(decodedText, decodedResult);
                },
                (errorMessage) => {
                    if (onScanError) onScanError(errorMessage);
                }
            );
            this.isScanning = true;
        } catch (err) {
            console.error("Failed to start scanner service:", err);
            throw err; // Re-throw so the UI knows it failed
        }
    }

    /**
     * Stops the camera stream.
     */
    async stop() {
        if (!this.isScanning) return;
        
        try {
            await this.html5QrCode.stop();
            this.isScanning = false;
        } catch (err) {
            console.error("Failed to stop scanner:", err);
        }
    }

    /**
     * Fetches metadata for an ISBN from OpenLibrary.
     * @param {string} isbn 
     * @returns {Promise<Object|null>} Book object or null
     */
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