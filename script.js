// Referensi Elemen DOM
const canvas = document.getElementById('artCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });

const imageInput = document.getElementById('imageInput');
const nailsCount = document.getElementById('nailsCount');
const linesCount = document.getElementById('linesCount');
const lineOpacity = document.getElementById('lineOpacity');

const btnGenerate = document.getElementById('btnGenerate');
const btnPng = document.getElementById('btnPng');
const btnPdf = document.getElementById('btnPdf');
const btnCsv = document.getElementById('btnCsv');
const statusText = document.getElementById('statusText');

// Update Text Slider
const updateSliderVal = (el, valEl) => document.getElementById(valEl).innerText = el.value;
nailsCount.addEventListener('input', () => updateSliderVal(nailsCount, 'nailsVal'));
linesCount.addEventListener('input', () => updateSliderVal(linesCount, 'linesVal'));
lineOpacity.addEventListener('input', () => updateSliderVal(lineOpacity, 'opacityVal'));

// Variabel Global Algoritma
let originalImage = null;
const SIZE = 1000;
const RADIUS = SIZE / 2 - 10; // Padding 10px
let nails = [];
let pinSequence = [];
let isGenerating = false;
let animationFrameId;

// 1. Upload dan Pemrosesan Gambar Awal
imageInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            originalImage = img;
            prepareImageCanvas(img);
            btnGenerate.disabled = false;
            statusText.innerText = "Gambar siap. Tekan 'Mulai Proses'.";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// 2. Potong Menjadi Lingkaran & Grayscale (Offscreen Processing)
let processedPixels = new Float32Array(SIZE * SIZE);

function prepareImageCanvas(img) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);

    const scale = Math.max(SIZE / img.width, SIZE / img.height);
    const x = (SIZE / 2) - (img.width / 2) * scale;
    const y = (SIZE / 2) - (img.height / 2) * scale;

    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

    const imgData = ctx.getImageData(0, 0, SIZE, SIZE);
    const data = imgData.data;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE); 

    for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
            const i = (y * SIZE + x) * 4;
            const dx = x - SIZE / 2;
            const dy = y - SIZE / 2;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > RADIUS) {
                processedPixels[y * SIZE + x] = 0;
            } else {
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                const gray = 255 - (0.299 * r + 0.587 * g + 0.114 * b);
                processedPixels[y * SIZE + x] = gray;
            }
        }
    }
    
    ctx.putImageData(imgData, 0, 0);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(0, 0, SIZE, SIZE);
}

// 3. Algoritma Bresenham
function getLinePixels(x0, y0, x1, y1) {
    const pixels = [];
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    while(true) {
        if (x0 >= 0 && x0 < SIZE && y0 >= 0 && y0 < SIZE) {
            pixels.push(y0 * SIZE + x0);
        }
        if (x0 === x1 && y0 === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    return pixels;
}

// 4. Algoritma Utama (Greedy Algorithm) & Visualisasi
btnGenerate.addEventListener('click', () => {
    if (!originalImage || isGenerating) return;
    
    isGenerating = true;
    btnGenerate.disabled = true;
    btnPng.disabled = true;
    btnPdf.disabled = true;
    btnCsv.disabled = true;
    
    prepareImageCanvas(originalImage);
    pinSequence = [];
    const numNails = parseInt(nailsCount.value);
    const maxLines = parseInt(linesCount.value);
    const opacity = parseFloat(lineOpacity.value);
    const lineWeight = 20; 

    nails = [];
    for (let i = 0; i < numNails; i++) {
        const angle = (i * 2 * Math.PI) / numNails;
        nails.push({
            x: Math.round(SIZE / 2 + RADIUS * Math.cos(angle)),
            y: Math.round(SIZE / 2 + RADIUS * Math.sin(angle))
        });
    }

    let currentPin = 0;
    pinSequence.push(currentPin);
    let linesDrawn = 0;

    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.lineWidth = 1;

    function drawStep() {
        const linesPerFrame = 15; 
        for (let step = 0; step < linesPerFrame; step++) {
            if (linesDrawn >= maxLines) break;

            let bestPin = -1;
            let maxDarkness = -1;
            let bestPixels = [];

            for (let i = 0; i < numNails; i++) {
                if (Math.abs(i - currentPin) < 5 || Math.abs(i - currentPin) > numNails - 5) continue;

                const p1 = nails[currentPin];
                const p2 = nails[i];
                const linePixels = getLinePixels(p1.x, p1.y, p2.x, p2.y);
                
                let darknessSum = 0;
                for (let p = 0; p < linePixels.length; p++) {
                    darknessSum += processedPixels[linePixels[p]];
                }
                
                const darknessScore = darknessSum / linePixels.length;

                if (darknessScore > maxDarkness) {
                    maxDarkness = darknessScore;
                    bestPin = i;
                    bestPixels = linePixels;
                }
            }

            if (bestPin === -1) break;

            for (let p = 0; p < bestPixels.length; p++) {
                processedPixels[bestPixels[p]] = Math.max(0, processedPixels[bestPixels[p]] - lineWeight);
            }

            ctx.beginPath();
            ctx.moveTo(nails[currentPin].x, nails[currentPin].y);
            ctx.lineTo(nails[bestPin].x, nails[bestPin].y);
            ctx.stroke();

            currentPin = bestPin;
            pinSequence.push(currentPin);
            linesDrawn++;
        }

        statusText.innerText = `Menggambar: ${linesDrawn} / ${maxLines} garis`;

        if (linesDrawn < maxLines) {
            animationFrameId = requestAnimationFrame(drawStep);
        } else {
            finishGeneration();
        }
    }
    
    drawStep();
});

function finishGeneration() {
    isGenerating = false;
    btnGenerate.disabled = false;
    btnPng.disabled = false;
    btnPdf.disabled = false;
    btnCsv.disabled = false;
    statusText.innerText = "Selesai! Anda dapat mengekspor hasilnya.";
}

// 5. Fitur Ekspor
btnPng.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'string-art.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
});

btnCsv.addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Sequence Number,Pin Index\n";
    pinSequence.forEach((pin, index) => {
        csvContent += `${index + 1},${pin}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "string-art-sequence.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
});

btnPdf.addEventListener('click', () => {
    statusText.innerText = "Sedang menyusun PDF Vector... Harap tunggu.";
    setTimeout(() => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4'); 
        
        const pdfSize = 190;
        const margin = (210 - pdfSize) / 2;
        const scale = pdfSize / SIZE;
        
        doc.setDrawColor(0, 0, 0); 
        doc.setLineWidth(0.1);

        for (let i = 0; i < pinSequence.length - 1; i++) {
            const p1 = nails[pinSequence[i]];
            const p2 = nails[pinSequence[i+1]];
            
            const x1 = margin + (p1.x * scale);
            const y1 = margin + (p1.y * scale);
            const x2 = margin + (p2.x * scale);
            const y2 = margin + (p2.y * scale);
            
            doc.line(x1, y1, x2, y2);
        }
        
        doc.save('string-art.pdf');
        statusText.innerText = "PDF berhasil diekspor!";
    }, 100);
});
