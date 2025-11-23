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
        // 1. Primer intent: OpenLibrary
        const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`;
        try {
            const response = await fetch(olUrl);
            const data = await response.json();
            const key = `ISBN:${isbn}`;
            if (data && data[key]) {
                const book = data[key];
                book.source = 'openlibrary';
                return book;
            }
        } catch (error) {
            console.warn("OpenLibrary error, intentaré Google Books:", error);
        }

        // 2. Fallback: Google Books
        const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
        try {
            const response = await fetch(gbUrl);
            const data = await response.json();
            if (data && Array.isArray(data.items) && data.items.length > 0) {
                const volume = data.items[0].volumeInfo || {};
                const mapped = {
                    title: volume.title || 'Unknown Title',
                    authors: volume.authors ? volume.authors.map(a => ({ name: a })) : undefined,
                    cover: volume.imageLinks ? { medium: (volume.imageLinks.thumbnail || volume.imageLinks.smallThumbnail || '').replace('http://','https://') } : undefined,
                    source: 'google'
                };
                return mapped;
            }
        } catch (error) {
            console.warn("Google Books error:", error);
        }

        // 3. Cap resultat
        return null;
    }

    /**
     * Attempts to retrieve a cover image URL for a given ISBN.
     * Priority:
     * 1. OpenLibrary direct cover endpoint
     * 2. Google Books thumbnail
     * Returns null if none found.
     * @param {string} isbn
     * @returns {Promise<string|null>} cover URL or null
     */
    async getCoverUrl(isbn) {
        // 1. OpenLibrary Cover (does not require API call for metadata)
        const olCover = `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
        try {
            // HEAD request to verify existence (OpenLibrary returns 404 if not found)
            const headResp = await fetch(olCover, { method: 'HEAD' });
            if (headResp.ok) {
                return olCover;
            }
        } catch (e) {
            console.warn('OpenLibrary cover HEAD failed', e);
        }

        // 2. Google Books fallback
        const gbUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`;
        try {
            const resp = await fetch(gbUrl);
            const data = await resp.json();
            if (data && Array.isArray(data.items) && data.items.length > 0) {
                const imgLinks = data.items[0].volumeInfo?.imageLinks;
                if (imgLinks) {
                    const candidate = imgLinks.thumbnail || imgLinks.smallThumbnail;
                    if (candidate) return candidate.replace('http://','https://');
                }
            }
        } catch (e) {
            console.warn('Google Books cover fetch failed', e);
        }

        return null;
    }
}