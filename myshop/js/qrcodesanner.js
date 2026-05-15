let qrCodeReader;

let currentCameraIndex = 0;
let videoDevices = [];

async function openQRScanner() {
    document.getElementById("qrScannerModal").classList.remove("hidden");
    const video = document.getElementById("qrVideo");
    
    try {
        qrCodeReader = new ZXing.BrowserMultiFormatReader();
        
        // Get list of all cameras
        videoDevices = await qrCodeReader.listVideoInputDevices();
        
        if (videoDevices.length === 0) {
            throw new Error('No camera found');
        }

        // Auto-select the back camera first
        let backCameraIndex = videoDevices.findIndex(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('rear') ||
            device.label.toLowerCase().includes('environment')
        );

        // If no "back" label found, start with the last camera in the list 
        // (usually the back camera on Android)
        currentCameraIndex = backCameraIndex !== -1 ? backCameraIndex : videoDevices.length - 1;

        startScanning(videoDevices[currentCameraIndex].deviceId);

    } catch (err) {
        handleScannerError(err);
    }
}

async function startScanning(deviceId) {
    const video = document.getElementById("qrVideo");
    
    // Reset reader if already running
    if (qrCodeReader) await qrCodeReader.reset();

    await qrCodeReader.decodeFromVideoDevice(deviceId, video, (result, err) => {
        if (result) {
            handleScanSuccess(result.getText());
        }
    });
}

function switchCamera() {
    if (videoDevices.length > 1) {
        // Move to the next camera in the array
        currentCameraIndex = (currentCameraIndex + 1) % videoDevices.length;
        startScanning(videoDevices[currentCameraIndex].deviceId);
    } else {
        console.log("Only one camera detected.");
          document.getElementById('switchCameraButton').classList.add('hidden');
    }
}
switchCamera(); 
function closeQRScanner() {
    if (qrCodeReader) qrCodeReader.reset();
    document.getElementById("qrScannerModal").classList.add("hidden");
}
// Helper to keep code clean
function handleScanSuccess(text) {
    const audio = document.getElementById('barcodeScanSound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.warn("Sound play failed", e));
    }
    lookupProductByQRCode(text);
    closeQRScanner();
}

function handleScannerError(err) {
    playScanErrorSound();
    console.error("QR Scanner error:", err);
    showMessageModal(translate('qrScanner.cameraAccessDenied'));
    closeQRScanner();
}

// Helper function to find the back/rear camera
function findBackCamera(devices) {
    // Try different heuristics to identify the back camera
    for (const device of devices) {
        const label = device.label.toLowerCase();
        
        // Common patterns for back camera labels
        if (label.includes('back') || 
            label.includes('rear') || 
            label.includes('environment') ||
            label.includes('world') ||
            label.match(/camera\s*2/) ||
            label.match(/1$/) || // Sometimes back camera ends with 1
            label.includes('后') || // Chinese for "back"
            label.includes('背面') || // Chinese for "back side"
            label.includes('trasera') || // Spanish for "rear"
            label.includes('posterior') || // Portuguese/Spanish for "back"
            label.includes('arrière')) { // French for "back"
            return device;
        }
    }
    
    // If no back camera found by label, try device ID order
    // Usually the first camera is the front one on mobile devices
    if (devices.length > 1) {
        // In many mobile devices, the back camera is the second one
        return devices[1];
    }
    
    return null;
}

// Alternative: Use environment-facing mode API (more reliable but not supported everywhere)
async function findBestCamera() {
    try {
        // Try to use MediaDevices API with constraints for environment-facing camera
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const tracks = stream.getVideoTracks();
        
        if (tracks.length > 0) {
            // Get the device ID from the track
            const settings = tracks[0].getSettings();
            const deviceId = settings.deviceId;
            
            // Stop the stream since ZXing will create its own
            tracks.forEach(track => track.stop());
            
            return deviceId;
        }
    } catch (error) {
        console.warn("Could not use facingMode constraints:", error);
    }
    
    return null;
}

// Modified openQRScanner function with improved camera selection
async function openQRScanner() {
    document.getElementById("qrScannerModal").classList.remove("hidden");
    const video = document.getElementById("qrVideo");
    
    try {
        qrCodeReader = new ZXing.BrowserMultiFormatReader();
        const devices = await qrCodeReader.listVideoInputDevices();
        
        if (devices.length === 0) {
            throw new Error(translate('qrScanner.noCamera'));
        }
        
        // Try to get the best camera (back camera on mobile)
        let selectedDeviceId = await findBestCamera();
        
        // If facingMode API didn't work, fall back to device detection
        if (!selectedDeviceId) {
            if (devices.length === 1) {
                selectedDeviceId = devices[0].deviceId;
            } else {
                // Try to identify back camera
                const backCamera = findBackCamera(devices);
                selectedDeviceId = backCamera ? backCamera.deviceId : devices[0].deviceId;
                
                // On tablets/phones, prefer the camera with higher resolution (usually the back camera)
                if (!backCamera && devices.length > 1) {
                    // We could get camera capabilities, but a simpler heuristic:
                    // Back camera is usually not labeled as "front" or "user"
                    const nonFrontCamera = devices.find(device => {
                        const label = device.label.toLowerCase();
                        return !label.includes('front') && 
                               !label.includes('user') && 
                               !label.includes('selfie') &&
                               !label.includes('人脸') && // Chinese for "face"
                               !label.includes('facetime') &&
                               !label.includes('前置'); // Chinese for "front"
                    });
                    
                    selectedDeviceId = nonFrontCamera ? nonFrontCamera.deviceId : devices[0].deviceId;
                }
            }
        }
        
        await qrCodeReader.decodeFromVideoDevice(selectedDeviceId, video, (result, err) => {
            if (result) {
                const audio = document.getElementById('barcodeScanSound');
                if (audio) {
                    audio.currentTime = 0;
                    audio.play().catch(e => console.warn(translate('qrScanner.audioFailed'), e));
                }


                lookupProductByQRCode(result.getText());
                closeQRScanner();
            }
        });
        
        // Optional: Show which camera is being used (for debugging)
        const selectedDevice = devices.find(d => d.deviceId === selectedDeviceId);
        if (selectedDevice) {
            console.log(`Using camera: ${selectedDevice.label}`);
        }
        
    } catch (err) {
        playScanErrorSound();
        console.error("QR Scanner error:", err);
        showMessageModal(translate('qrScanner.cameraAccessDenied'));
        closeQRScanner();
    }
}

function closeQRScanner() {
    if (qrCodeReader) qrCodeReader.reset();
    document.getElementById("qrScannerModal").classList.add("hidden");
}

async function lookupProductByQRCode(text) {
    await loadStock();
    const scannedCode = text.trim();
    
    // Search by multiple fields
    const found = stock.find(item => {
        // Try exact matches first
        if (item.id && item.id.toString().toLowerCase() === scannedCode.toLowerCase()) {
            return true;
        }
        
        if (item.name && item.name.toLowerCase() === scannedCode.toLowerCase()) {
            return true;
        }
        
        // Try barcode field if it exists
        if (item.barcode && item.barcode.toString() === scannedCode) {
            return true;
        }
        
        // Try SKU field if it exists
        if (item.sku && item.sku.toString() === scannedCode) {
            return true;
        }
        
        // Try partial matches
        if (item.name && item.name.toLowerCase().includes(scannedCode.toLowerCase())) {
            return true;
        }
        
        // Try numeric ID partial match (if scanned code contains ID)
        if (item.id && scannedCode.includes(item.id.toString())) {
            return true;
        }
        
        return false;
    });
    
    if (found) {
        // Auto-fill sale form
        document.getElementById('saleProductName').value = found.name;
        document.getElementById('salePrice').value = found.price ? Math.round(found.price) : '';
        displaySelectedProductImage();
        updateSaleFormLabels(found.type);
        
        // Optional: Show which field was matched
        console.log(`${translate('qrScanner.matchedProduct')}: ${found.name} (ID: ${found.id})`);
    } else {
        // If not found, try searching in product code combinations
        const alternativeMatch = searchAlternativeProductCodes(scannedCode);
        if (alternativeMatch) {
            document.getElementById('saleProductName').value = alternativeMatch.name;
            document.getElementById('salePrice').value = alternativeMatch.price ? Math.round(alternativeMatch.price) : '';
            displaySelectedProductImage();
            updateSaleFormLabels(alternativeMatch.type);
        } else {
            playScanErrorSound();
            showMessageModal(translate('qrScanner.noProductFound') + scannedCode);
        }
    }
}

// Helper function for advanced product code matching
function searchAlternativeProductCodes(scannedCode) {
    // If stock data has multiple codes separated by commas or spaces
    for (const item of stock) {
        // Check if item has a codes field (comma-separated)
        if (item.codes) {
            const codes = item.codes.split(/[,;\s]+/).map(code => code.trim());
            if (codes.includes(scannedCode)) {
                return item;
            }
        }
        
        // Check if item has aliases
        if (item.aliases) {
            const aliases = Array.isArray(item.aliases) ? item.aliases : [item.aliases];
            if (aliases.some(alias => alias.toLowerCase() === scannedCode.toLowerCase())) {
                return item;
            }
        }
        
        // Try matching with cleaned text (remove special chars)
        const cleanScanned = scannedCode.replace(/[^\w\s]/gi, '').toLowerCase();
        const cleanName = item.name.replace(/[^\w\s]/gi, '').toLowerCase();
        
        if (cleanScanned && cleanName.includes(cleanScanned)) {
            return item;
        }
    }
    
    return null;
}

function playScanErrorSound() {
    const errorSound = document.getElementById('scanErrorSound');
    if (errorSound) {
        errorSound.currentTime = 0;
        errorSound.play().catch(e => console.warn(translate('qrScanner.errorSoundFailed'), e));
    } else {
        console.warn(translate('qrScanner.noErrorSound'));
    }
}