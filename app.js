// Import the service
import { IsbnScannerService } from './isbn_service.js';

// 1. Instantiate the service (pass the ID of the div where video should render)
const scannerService = new IsbnScannerService("reader");

// 2. define UI elements
const startBtn = document.getElementById('start-btn');
const resultDiv = document.getElementById('result-area');

// 3. Define the success callback
const handleSuccessfulScan = async (isbn) => {
    console.log("Scanned ISBN:", isbn);
    
    // Stop the camera immediately after scan
    await scannerService.stop();
    
    // Update UI to show "Loading..."
    resultDiv.innerHTML = `Found ${isbn}. Fetching details...`;

    // Use the service to get data
    try {
        const book = await scannerService.fetchBookDetails(isbn);
        if (book) {
            resultDiv.innerHTML = `
                <h3>${book.title}</h3>
                <img src="${book.cover?.medium || ''}" />
            `;
        } else {
            resultDiv.innerHTML = "Book not found in database.";
        }
    } catch (e) {
        resultDiv.innerHTML = "Error fetching book data.";
    }
};

// 4. Hook up the button
startBtn.addEventListener('click', async () => {
    try {
        await scannerService.start(handleSuccessfulScan);
        console.log("Scanner is running...");
    } catch (err) {
        alert("Could not start camera. Check permissions.");
    }
});