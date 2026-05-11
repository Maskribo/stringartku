/**
 * =====================================================
 * STRING ART GENERATOR - CORE APPLICATION
 * Pure Vanilla JavaScript (No Dependencies)
 * =====================================================
 * 
 * FITUR UTAMA:
 * 1. Upload dan Preview Gambar (JPG/PNG)
 * 2. Pemrosesan Gambar (Grayscale + Circular Crop)
 * 3. Parameter Kontrol (Nails, Lines, Opacity, Width)
 * 4. Algoritma Greedy untuk String Art Generation
 * 5. Visualisasi Real-time dengan Canvas
 * 6. Export PNG HD, PDF, dan CSV
 */

// =====================================================
// 1. GLOBAL STATE & INITIALIZATION
// =====================================================

const AppState = {
    originalImage: null,
    processedImage: null,
    canvas: null,
    canvasContext: null,
    isGenerating: false,
    generatedLines: [],
    nailPositions: [],
    imageData: null,
    startTime: 0
};

// =====================================================
// 2. UTILITY FUNCTIONS
// =====================================================

/**
 * Perbarui nilai display pada slider
 * @param {string} sliderId - ID dari slider element
 * @param {string} displayId - ID dari display value element
 */
function updateSliderDisplay(sliderId, displayId) {
    const slider = document.getElementById(sliderId);
    const display = document.getElementById(displayId);
    
    slider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        display.textContent = sliderId.includes('Opacity') || sliderId.includes('Width') 
            ? value.toFixed(1) 
            : Math.round(value);
    });
}

/**
 * Ubah gambar ke format grayscale
 * @param {HTMLImageElement} img - Image element
 * @returns {ImageData} Grayscale image data
 */
function convertToGrayscale(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Loop setiap pixel dan konversi ke grayscale menggunakan luminance formula
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Formula luminance: Y = 0.299*R + 0.587*G + 0.114*B
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
    
    return imageData;
}

/**
 * Crop gambar menjadi lingkaran sempurna
 * @param {ImageData} imageData - Source image data
 * @param {number} size - Ukuran circular output (width & height)
 * @returns {ImageData} Circular cropped image data
 */
function cropToCircle(imageData, size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Draw original image ke canvas temporary
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    tempCanvas.getContext('2d').putImageData(imageData, 0, 0);
    
    // Scale dan center gambar
    const scale = Math.min(size / imageData.width, size / imageData.height);
    const x = (size - imageData.width * scale) / 2;
    const y = (size - imageData.height * scale) / 2;
    
    ctx.drawImage(tempCanvas, x, y, imageData.width * scale, imageData.height * scale);
    
    // Create circular mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
    
    return ctx.getImageData(0, 0, size, size);
}

/**
 * Update status text untuk user feedback
 * @param {string} message - Status message
 * @param {boolean} showStats - Tampilkan statistics container
 */
function updateStatus(message, showStats = false) {
    const statusText = document.getElementById('statusText');
    const statsContainer = document.getElementById('statsContainer');
    
    statusText.textContent = message;
    if (showStats) {
        statsContainer.style.display = 'block';
    } else {
        statsContainer.style.display = 'none';
    }
}

// =====================================================
// 3. IMAGE PROCESSING
// =====================================================

/**
 * Handle file input dari user
 */
document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validasi file type
    if (!file.type.match('image/(jpeg|png)')) {
        alert('Hanya file JPG dan PNG yang didukung!');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            AppState.originalImage = img;
            
            // Display preview
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = '';
            preview.appendChild(img.cloneNode());
            
            updateStatus('✅ Gambar berhasil di-upload. Siap untuk generate!');
            
            // Enable generate button
            document.getElementById('generateBtn').disabled = false;
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// =====================================================
// 4. NAIL POSITIONING
// =====================================================

/**
 * Hitung posisi paku di sekeliling lingkaran
 * @param {number} count - Jumlah paku
 * @param {number} radius - Radius lingkaran
 * @param {number} centerX - Pusat X
 * @param {number} centerY - Pusat Y
 * @returns {Array<Object>} Array of nail positions {x, y, index}
 */
function calculateNailPositions(count, radius, centerX, centerY) {
    const positions = [];
    
    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        positions.push({ x, y, index: i });
    }
    
    return positions;
}

// =====================================================
// 5. CORE ALGORITHM - GREEDY STRING ART GENERATOR
// =====================================================

/**
 * Hitung "darkness" dari garis antara dua paku
 * Menggunakan Bresenham line algorithm untuk pixel-perfect detection
 * 
 * @param {number} x1, y1, x2, y2 - Koordinat start dan end
 * @param {Uint8ClampedArray} imageData - Pixel data
 * @param {number} width - Canvas width
 * @returns {number} Darkness value (0-255 * pixel count)
 */
function calculateLineDarkness(x1, y1, x2, y2, imageData, width, thickness = 1.5) {
    let darkness = 0;
    const pixels = new Set();
    
    // Bresenham line algorithm untuk mendapatkan pixel-pixel di garis
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1;
    let y = y1;
    
    while (true) {
        // Round values untuk pixel grid
        const px = Math.round(x);
        const py = Math.round(y);
        
        // Add thickness dengan area coverage
        for (let tx = -Math.ceil(thickness / 2); tx <= Math.ceil(thickness / 2); tx++) {
            for (let ty = -Math.ceil(thickness / 2); ty <= Math.ceil(thickness / 2); ty++) {
                const pixelX = px + tx;
                const pixelY = py + ty;
                const key = `${pixelX},${pixelY}`;
                
                if (!pixels.has(key) && pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < width) {
                    pixels.add(key);
                    const idx = (pixelY * width + pixelX) * 4;
                    // Get grayscale value (all RGB channels are same)
                    darkness += imageData[idx];
                }
            }
        }
        
        if (x === x2 && y === y2) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
    
    return darkness;
}

/**
 * Update image data setelah garis ditarik
 * Simulasi efek penggambaran dengan mengurangi brightness
 * 
 * @param {number} x1, y1, x2, y2 - Koordinat garis
 * @param {Uint8ClampedArray} imageData - Pixel data (modified in place)
 * @param {number} width - Canvas width
 * @param {number} lineWidth - Ketebalan garis untuk coverage
 */
function updateImageDataAfterLine(x1, y1, x2, y2, imageData, width, lineWidth = 1.5) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    
    let x = x1;
    let y = y1;
    const coverageSet = new Set();
    
    while (true) {
        const px = Math.round(x);
        const py = Math.round(y);
        
        // Reduced darkness for each pixel (simulate string coverage)
        for (let tx = -Math.ceil(lineWidth / 2); tx <= Math.ceil(lineWidth / 2); tx++) {
            for (let ty = -Math.ceil(lineWidth / 2); ty <= Math.ceil(lineWidth / 2); ty++) {
                const pixelX = px + tx;
                const pixelY = py + ty;
                const key = `${pixelX},${pixelY}`;
                
                if (!coverageSet.has(key) && pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < width) {
                    coverageSet.add(key);
                    const idx = (pixelY * width + pixelX) * 4;
                    
                    // Reduce darkness (increase brightness) setiap kali garis lewat
                    const reduction = 15; // Reduce by ~6% per line
                    imageData[idx] = Math.max(0, imageData[idx] - reduction);
                    imageData[idx + 1] = Math.max(0, imageData[idx + 1] - reduction);
                    imageData[idx + 2] = Math.max(0, imageData[idx + 2] - reduction);
                }
            }
        }
        
        if (x === x2 && y === y2) break;
        
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

/**
 * MAIN ALGORITHM: Generate String Art menggunakan Greedy approach
 * 
 * Pseudocode:
 * ```
 * 1. Mulai dari paku pertama (nail 0)
 * 2. Untuk setiap iterasi:
 *    - Cek semua paku potensial lainnya
 *    - Hitung "darkness reduction" jika garis ke paku tersebut ditarik
 *    - Pilih paku dengan darkness reduction terbesar
 *    - Draw garis dan update image brightness map
 * 3. Ulangi sampai jumlah garis mencapai target
 * ```
 * 
 * @param {number} numLines - Jumlah garis yang akan dibuat
 * @param {number} numNails - Jumlah paku
 * @param {number} opacity - Opacity garis (0-1)
 * @param {number} lineWidth - Ketebalan garis
 */
async function generateStringArt(numLines, numNails, opacity, lineWidth) {
    if (!AppState.imageData) {
        updateStatus('❌ Error: Gambar belum diproses!');
        return;
    }
    
    const canvas = AppState.canvas;
    const ctx = AppState.canvasContext;
    const imageSize = canvas.width;
    const centerX = imageSize / 2;
    const centerY = imageSize / 2;
    const radius = imageSize / 2 - 20;
    
    // Reset state
    AppState.generatedLines = [];
    AppState.nailPositions = calculateNailPositions(numNails, radius, centerX, centerY);
    AppState.startTime = Date.now();
    
    // Copy original image data untuk tracking darkness
    const currentImageData = new Uint8ClampedArray(AppState.imageData);
    
    // Draw nail positions sebagai small circles
    ctx.fillStyle = '#00d4ff';
    AppState.nailPositions.forEach(nail => {
        ctx.beginPath();
        ctx.arc(nail.x, nail.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    let currentNail = 0; // Start dari nail pertama
    
    // Main loop untuk generate lines
    for (let lineNum = 0; lineNum < numLines; lineNum++) {
        // Allow UI updates setiap 50 lines
        if (lineNum % 50 === 0) {
            updateStatus(`⏳ Generating... ${lineNum}/${numLines} lines`, true);
            document.getElementById('statsLines').textContent = lineNum;
            document.getElementById('statsProgress').textContent = Math.round((lineNum / numLines) * 100);
            
            const elapsed = ((Date.now() - AppState.startTime) / 1000).toFixed(1);
            document.getElementById('statsTime').textContent = elapsed;
            
            // Yield to browser untuk responsive UI
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        // GREEDY ALGORITHM: Find best next nail
        let bestNail = -1;
        let bestDarkness = -1;
        
        for (let i = 0; i < AppState.nailPositions.length; i++) {
            if (i === currentNail) continue; // Skip current nail
            
            const nail = AppState.nailPositions[i];
            const start = AppState.nailPositions[currentNail];
            
            // Hitung darkness reduction jika garis ditarik ke nail ini
            const darkness = calculateLineDarkness(
                start.x, start.y,
                nail.x, nail.y,
                currentImageData,
                imageSize,
                lineWidth
            );
            
            // Greedy: pilih nail dengan darkness tertinggi
            if (darkness > bestDarkness) {
                bestDarkness = darkness;
                bestNail = i;
            }
        }
        
        if (bestNail === -1) break; // No more nails to connect
        
        // Draw line ke best nail
        const startNail = AppState.nailPositions[currentNail];
        const endNail = AppState.nailPositions[bestNail];
        
        ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(startNail.x, startNail.y);
        ctx.lineTo(endNail.x, endNail.y);
        ctx.stroke();
        
        // Store line info untuk export CSV
        AppState.generatedLines.push({
            index: lineNum,
            from: currentNail,
            to: bestNail,
            fromCoord: { x: Math.round(startNail.x), y: Math.round(startNail.y) },
            toCoord: { x: Math.round(endNail.x), y: Math.round(endNail.y) }
        });
        
        // Update image data untuk next iteration
        updateImageDataAfterLine(
            startNail.x, startNail.y,
            endNail.x, endNail.y,
            currentImageData,
            imageSize,
            lineWidth
        );
        
        // Move to best nail untuk next iteration
        currentNail = bestNail;
    }
    
    // Final status
    const totalTime = ((Date.now() - AppState.startTime) / 1000).toFixed(1);
    updateStatus(`✅ Selesai! ${AppState.generatedLines.length} garis dibuat dalam ${totalTime}s`, true);
    
    // Enable export buttons
    document.getElementById('downloadPngBtn').disabled = false;
    document.getElementById('downloadPdfBtn').disabled = false;
    document.getElementById('downloadCsvBtn').disabled = false;
}

// =====================================================
// 6. GENERATE BUTTON & MAIN FLOW
// =====================================================

document.getElementById('generateBtn').addEventListener('click', async function() {
    if (!AppState.originalImage) {
        alert('Silakan upload gambar terlebih dahulu!');
        return;
    }
    
    this.disabled = true;
    
    try {
        updateStatus('⏳ Memproses gambar...', false);
        
        // Step 1: Convert to grayscale
        const grayscale = convertToGrayscale(AppState.originalImage);
        
        // Step 2: Crop to circle
        const circled = cropToCircle(grayscale, 512);
        AppState.imageData = circled.data;
        
        // Step 3: Prepare canvas
        const canvas = document.getElementById('mainCanvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        
        // Draw grayscale base image
        ctx.putImageData(circled, 0, 0);
        
        // Show canvas dan hide overlay
        canvas.classList.add('active');
        document.getElementById('canvasOverlay').classList.add('hidden');
        
        AppState.canvas = canvas;
        AppState.canvasContext = ctx;
        
        // Step 4: Get parameters dari sliders
        const numNails = parseInt(document.getElementById('nailsSlider').value);
        const numLines = parseInt(document.getElementById('linesSlider').value);
        const opacity = parseFloat(document.getElementById('opacitySlider').value);
        const lineWidth = parseFloat(document.getElementById('lineWidthSlider').value);
        
        // Step 5: Generate string art
        AppState.isGenerating = true;
        await generateStringArt(numLines, numNails, opacity, lineWidth);
        AppState.isGenerating = false;
        
    } catch (error) {
        console.error('Error:', error);
        updateStatus(`❌ Error: ${error.message}`, false);
    } finally {
        this.disabled = false;
    }
});

// =====================================================
// 7. EXPORT FUNCTIONALITY
// =====================================================

/**
 * Export canvas sebagai PNG HD (2x resolution)
 */
document.getElementById('downloadPngBtn').addEventListener('click', function() {
    const canvas = AppState.canvas;
    if (!canvas || !AppState.generatedLines.length) {
        alert('Generate string art terlebih dahulu!');
        return;
    }
    
    // Create high-res canvas
    const hdCanvas = document.createElement('canvas');
    hdCanvas.width = canvas.width * 2;
    hdCanvas.height = canvas.height * 2;
    const hdCtx = hdCanvas.getContext('2d');
    
    // Scale up
    hdCtx.scale(2, 2);
    hdCtx.drawImage(canvas, 0, 0);
    
    // Download
    hdCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'string-art.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});

/**
 * Export as PDF menggunakan html2pdf.js library
 */
document.getElementById('downloadPdfBtn').addEventListener('click', function() {
    const canvas = AppState.canvas;
    if (!canvas || !AppState.generatedLines.length) {
        alert('Generate string art terlebih dahulu!');
        return;
    }
    
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'string-art.png';
    
    // Untuk PDF, gunakan html2pdf jika available
    if (typeof html2pdf !== 'undefined') {
        const element = canvas;
        const opt = {
            margin: 10,
            filename: 'string-art.pdf',
            image: { type: 'png', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
        };
        html2pdf().set(opt).from(element).save();
    } else {
        // Fallback: Download as PNG jika PDF library tidak available
        link.click();
    }
});

/**
 * Export line sequence sebagai CSV
 */
document.getElementById('downloadCsvBtn').addEventListener('click', function() {
    if (!AppState.generatedLines.length) {
        alert('Generate string art terlebih dahulu!');
        return;
    }
    
    // Build CSV content
    let csv = 'Line_Number,From_Nail,To_Nail,From_X,From_Y,To_X,To_Y\n';
    
    AppState.generatedLines.forEach(line => {
        csv += `${line.index},${line.from},${line.to},${line.fromCoord.x},${line.fromCoord.y},${line.toCoord.x},${line.toCoord.y}\n`;
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'string-art-sequence.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// =====================================================
// 8. RESET BUTTON
// =====================================================

document.getElementById('resetBtn').addEventListener('click', function() {
    // Reset state
    AppState.originalImage = null;
    AppState.processedImage = null;
    AppState.generatedLines = [];
    AppState.nailPositions = [];
    AppState.imageData = null;
    
    // Clear canvas
    const canvas = document.getElementById('mainCanvas');
    canvas.classList.remove('active');
    document.getElementById('canvasOverlay').classList.remove('hidden');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    
    // Reset UI
    document.getElementById('imageInput').value = '';
    document.getElementById('imagePreview').innerHTML = '<p>Preview gambar akan tampil di sini</p>';
    document.getElementById('nailsSlider').value = '100';
    document.getElementById('linesSlider').value = '1500';
    document.getElementById('opacitySlider').value = '0.4';
    document.getElementById('lineWidthSlider').value = '1.5';
    
    // Update displays
    updateSliderDisplay('nailsSlider', 'nailsValue');
    updateSliderDisplay('linesSlider', 'linesValue');
    updateSliderDisplay('opacitySlider', 'opacityValue');
    updateSliderDisplay('lineWidthSlider', 'lineWidthValue');
    
    // Disable buttons
    document.getElementById('generateBtn').disabled = true;
    document.getElementById('downloadPngBtn').disabled = true;
    document.getElementById('downloadPdfBtn').disabled = true;
    document.getElementById('downloadCsvBtn').disabled = true;
    
    updateStatus('🔄 Direset. Siap untuk upload gambar baru!');
});

// =====================================================
// 9. INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize slider displays
    updateSliderDisplay('nailsSlider', 'nailsValue');
    updateSliderDisplay('linesSlider', 'linesValue');
    updateSliderDisplay('opacitySlider', 'opacityValue');
    updateSliderDisplay('lineWidthSlider', 'lineWidthValue');
    
    // Initial state
    updateStatus('👋 Silakan upload gambar untuk memulai!');
    
    // Disable export buttons initially
    document.getElementById('downloadPngBtn').disabled = true;
    document.getElementById('downloadPdfBtn').disabled = true;
    document.getElementById('downloadCsvBtn').disabled = true;
    document.getElementById('generateBtn').disabled = true;
    
    console.log('✅ String Art Generator initialized successfully!');
});

// =====================================================
// END OF FILE
// =====================================================
