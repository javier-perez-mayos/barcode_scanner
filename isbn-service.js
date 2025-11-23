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
    async start(onScanSuccess, deviceId = null, onScanError = null) {
        if (this.isScanning) return;

        // Configuration for ISBN (EAN-13) including video constraints (moved here per html5-qrcode expectations)
        const config = {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
            formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
            videoConstraints: {
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 },
                focusMode: "continuous",
                advanced: [{ focusMode: "continuous" }]
            }
        };

        try {
            if (deviceId) {
                await this.html5QrCode.start(
                    deviceId,
                    config,
                    (decodedText) => { if (onScanSuccess) onScanSuccess(decodedText); },
                    () => {}
                );
            } else {
                await this.html5QrCode.start(
                    { facingMode: "environment" }, // single-key object required
                    config,
                    (decodedText) => { if (onScanSuccess) onScanSuccess(decodedText); },
                    () => {}
                );
            }
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