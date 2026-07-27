pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null;
let currentPage = 1;
let scale = 1.5;
let currentTool = 'text';
let annotations = [];

const input = document.getElementById('pdfFile');
const fileNameDisplay = document.getElementById('fileName');
const toolbar = document.getElementById('toolbar');
const container = document.getElementById('canvasContainer');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  fileNameDisplay.textContent = file.name;
  toolbar.style.display = 'flex';
  container.style.display = 'flex';
  const reader = new FileReader();
  reader.onload = (evt) => {
    const typedArray = new Uint8Array(evt.target.result);
    pdfjsLib.getDocument(typedArray).promise.then((pdf) => {
      pdfDoc = pdf;
      currentPage = 1;
      annotations = [];
      renderPage();
    }).catch(err => alert('Error al cargar PDF: ' + err.message));
  };
  reader.readAsArrayBuffer(file);
});

function renderPage() {
  pdfDoc.getPage(currentPage).then(page => {
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const renderCtx = {
      canvasContext: ctx,
      viewport: viewport
    };
    page.render(renderCtx).promise.then(() => {
      drawAnnotations();
    });
  });
}

function drawAnnotations() {
  annotations.forEach(a => {
    if (a.type === 'text') {
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#000';
      ctx.fillText(a.text, a.x, a.y);
    } else if (a.type === 'draw') {
      ctx.beginPath();
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 3;
      a.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    } else if (a.type === 'highlight') {
      ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
      ctx.fillRect(a.x, a.y, a.w || 120, a.h || 20);
    }
  });
}

function setTool(tool) {
  currentTool = tool;
  if (tool === 'text') {
    canvas.style.cursor = 'text';
  } else if (tool === 'draw') {
    canvas.style.cursor = 'crosshair';
  } else if (tool === 'highlight') {
    canvas.style.cursor = 'cell';
  }
}

let drawingPoints = [];
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentTool === 'text') {
    const text = prompt('Ingresa el texto a añadir:');
    if (text) {
      annotations.push({ type: 'text', text: text, x: x, y: y + 14 });
      renderPage();
    }
  } else if (currentTool === 'draw') {
    drawingPoints = [{ x, y }];
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
  } else if (currentTool === 'highlight') {
    annotations.push({ type: 'highlight', x: x - 60, y: y - 10, w: 120, h: 24 });
    renderPage();
  }
});

function onMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  drawingPoints.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  renderPage();
  ctx.beginPath();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  drawingPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
}

function onMouseUp() {
  annotations.push({ type: 'draw', points: drawingPoints.slice() });
  drawingPoints = [];
  canvas.removeEventListener('mousemove', onMouseMove);
  canvas.removeEventListener('mouseup', onMouseUp);
  renderPage();
}

function downloadPDF() {
  alert('Función de descarga simulada: en una implementación completa se exportaría el PDF editado con las anotaciones aplicadas.');
}
