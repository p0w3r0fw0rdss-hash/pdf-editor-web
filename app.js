pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* =========== ESTADO =========== */
let pdfDoc = null, currentPage = 1, scale = 1.5, totalPages = 1;
let currentTool = 'text', annotations = [];
let currentColor = '#e63946';
let drawingPoints = [];
let lastClickPoint = { x: 0, y: 0 };
let gridEnabled = false;

/* =========== DOM =========== */
const pdfFile = document.getElementById('pdfFile');
const fileNameDisplay = document.getElementById('fileName');
const toolbar = document.getElementById('toolbar');
const editorArea = document.getElementById('editorArea');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

/* =========== NAV =========== */
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

/* =========== CARGA PDF =========== */
pdfFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  fileNameDisplay.textContent = file.name;
  toolbar.style.display = 'flex';
  editorArea.style.display = 'flex';
  const reader = new FileReader();
  reader.onload = (evt) => {
    const typedArray = new Uint8Array(evt.target.result);
    pdfjsLib.getDocument(typedArray).promise.then((pdf) => {
      pdfDoc = pdf; totalPages = pdf.numPages; currentPage = 1; annotations = [];
      renderPage();
    }).catch(err => alert('Error cargando PDF: ' + err.message));
  };
  reader.readAsArrayBuffer(file);
});

/* =========== RENDER =========== */
function renderPage() {
  pdfDoc.getPage(currentPage).then(page => {
    const viewport = page.getViewport({ scale });
    canvas.width = viewport.width; canvas.height = viewport.height;
    page.render({ canvasContext: ctx, viewport }).promise.then(() => {
      drawGrid();
      drawAnnotations();
      drawClickIndicator();
    });
  });
}

function drawGrid() {
  if (!gridEnabled) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.08)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < canvas.width; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }
  ctx.restore();
}

function drawAnnotations() {
  annotations.forEach(a => {
    ctx.save();
    ctx.globalAlpha = a.opacity ?? 1;
    ctx.strokeStyle = a.color || currentColor;
    ctx.fillStyle = a.color || currentColor;
    ctx.lineWidth = a.lineWidth || 2;
    ctx.font = ((a.fontSize || 14) + 'px sans-serif');

    if (a.type === 'text') {
      ctx.fillText(a.text, a.x, a.y);
    } else if (a.type === 'rectangle') {
      ctx.strokeRect(a.x, a.y, a.w, a.h);
      if (a.fill) ctx.fillRect(a.x, a.y, a.w, a.h);
    } else if (a.type === 'circle') {
      ctx.beginPath();
      ctx.arc(a.cx, a.cy, a.r, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (a.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(a.x1, a.y1);
      ctx.lineTo(a.x2, a.y2);
      ctx.stroke();
    } else if (a.type === 'signature') {
      ctx.beginPath();
      ctx.strokeStyle = a.color || '#1a1a2e';
      a.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    } else if (a.type === 'highlight') {
      ctx.fillStyle = 'rgba(255, 235, 59, 0.35)';
      ctx.fillRect(a.x, a.y, a.w || 120, a.h || 20);
    } else if (a.type === 'pageNumber') {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillText('# ' + (a.page || currentPage), a.x, a.y);
    }
    ctx.restore();
  });
}

function drawClickIndicator() {
  if (!lastClickPoint || !lastClickPoint.visible) return;
  ctx.save();
  const x = lastClickPoint.x;
  const y = lastClickPoint.y;
  // Cruz roja de precisión
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
  ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10);
  ctx.stroke();
  // Círculo alrededor
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, 2 * Math.PI);
  ctx.strokeStyle = '#ff3333';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Etiqueta con coordenadas exactas
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 12, y - 20, 120, 36);
  ctx.fillStyle = '#e63946';
  ctx.font = '11px monospace';
  ctx.fillText('X: ' + Math.round(x) + '  Y: ' + Math.round(y), x + 14, y - 4);
  ctx.fillText('Página: ' + currentPage, x + 14, y + 10);
  ctx.restore();
}

/* =========== HERRAMIENTAS =========== */
function setTool(tool) { currentTool = tool; }
function updateColor(c) { currentColor = c; }
function updateOpacity(o) { /* opacidad aplicada por anotación */ }
function clearAnnotations() { annotations = []; renderPage(); }

function toggleGrid() {
  gridEnabled = !gridEnabled;
  renderPage();
}

/* =========== CLIC EXACTO =========== */
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;
  lastClickPoint = { x: clickX, y: clickY, visible: true };

  // Actualizar los inputs con las coordenadas exactas del clic
  document.getElementById('propX').value = Math.round(clickX);
  document.getElementById('propY').value = Math.round(clickY);

  renderPage(); // Redibuja con el indicador

  if (currentTool === 'text') {
    const text = prompt('Texto exacto en esta posición:');
    if (text) {
      const op = parseFloat(document.getElementById('propOpacity').value);
      const fs = parseInt(document.getElementById('propFont').value);
      annotations.push({
        type: 'text', text: text, x: clickX, y: clickY,
        color: currentColor, opacity: op, fontSize: fs
      });
    }
  } else if (currentTool === 'rectangle') {
    const op = parseFloat(document.getElementById('propOpacity').value);
    annotations.push({ type: 'rectangle', x: clickX, y: clickY, w: 100, h: 60, color: currentColor, opacity: op });
  } else if (currentTool === 'circle') {
    const op = parseFloat(document.getElementById('propOpacity').value);
    annotations.push({ type: 'circle', cx: clickX + 30, cy: clickY + 30, r: 30, color: currentColor, opacity: op });
  } else if (currentTool === 'line') {
    const op = parseFloat(document.getElementById('propOpacity').value);
    annotations.push({ type: 'line', x1: clickX, y1: clickY, x2: clickX + 120, y2: clickY + 50, color: currentColor, opacity: op });
  } else if (currentTool === 'signature') {
    drawingPoints = [{ x: clickX, y: clickY }];
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUpSignature);
  } else if (currentTool === 'highlight') {
    const op = parseFloat(document.getElementById('propOpacity').value);
    annotations.push({ type: 'highlight', x: clickX - 20, y: clickY - 10, w: 100, h: 24, color: currentColor, opacity: op });
  } else if (currentTool === 'pageNumber') {
    annotations.push({ type: 'pageNumber', x: clickX, y: clickY, color: '#1a1a2e', opacity: 1, page: currentPage });
  }
  renderPage();
});

function onMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  drawingPoints.push({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  renderPage();
  ctx.beginPath();
  ctx.strokeStyle = '#e63946';
  ctx.lineWidth = 3;
  drawingPoints.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
  ctx.stroke();
}

function onMouseUpSignature() {
  annotations.push({ type: 'signature', points: drawingPoints.slice(), color: '#1a1a2e', opacity: 1 });
  drawingPoints = [];
  canvas.removeEventListener('mousemove', onMouseMove);
  canvas.removeEventListener('mouseup', onMouseUpSignature);
  renderPage();
}

/* =========== DESCARGA =========== */
function downloadPDF() {
  const name = pdfFile.files[0] ? pdfFile.files[0].name.replace('.pdf', '') : 'documento';
  const link = document.createElement('a');
  const data = JSON.stringify({
    proyecto: 'PDF REAL FREE EDITOR', archivo: name,
    ediciones: annotations, pagina: currentPage,
    fecha: new Date().toISOString()
  });
  const blob = new Blob([data], { type: 'application/json' });
  link.href = URL.createObjectURL(blob);
  link.download = 'pdf_real_free_' + name + '.json';
  link.click();
  alert('Archivo generado con ' + annotations.length + ' ediciones exactas. Datos: ' + data.substring(0, 200) + '...');
}

/* =========== FUSIONAR =========== */
const mergeFiles = document.getElementById('mergeFiles');
const mergeList = document.getElementById('mergeList');
mergeFiles.addEventListener('change', (e) => {
  mergeList.innerHTML = '';
  Array.from(e.target.files).forEach(f => {
    const div = document.createElement('div');
    div.className = 'file-list-item';
    div.innerHTML = `<span>📄 ${f.name}</span> <span style="color:#777;font-size:0.8rem;">${(f.size/1024/1024).toFixed(2)} MB</span>`;
    mergeList.appendChild(div);
  });
});
function simulateMerge() {
  const files = mergeFiles.files;
  if (!files.length) return alert('Selecciona al menos un archivo');
  alert('Simulación de fusión: ' + files.length + ' archivos combinados en orden exacto.');
}

/* =========== DIVIDIR =========== */
const splitFile = document.getElementById('splitFile');
const splitInfo = document.getElementById('splitInfo');
const totalPagesEl = document.getElementById('totalPages');
const splitFrom = document.getElementById('splitFrom');
const splitTo = document.getElementById('splitTo');
splitFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    pdfjsLib.getDocument(new Uint8Array(evt.target.result)).promise.then(pdf => {
      totalPagesEl.textContent = pdf.numPages;
      splitFrom.max = pdf.numPages; splitTo.max = pdf.numPages;
      splitFrom.value = 1; splitTo.value = Math.min(2, pdf.numPages);
      splitInfo.style.display = 'block';
    });
  };
  reader.readAsArrayBuffer(file);
});
function simulateSplit() {
  const f = parseInt(splitFrom.value), t = parseInt(splitTo.value);
  if (f > t) return alert('El rango es inválido');
  alert('Simulación: Páginas ' + f + ' a ' + t + ' extraídas con precisión exacta.');
}

/* =========== PROTEGER =========== */
const protectFile = document.getElementById('protectFile');
const protectForm = document.getElementById('protectForm');
protectFile.addEventListener('change', () => { protectForm.style.display = 'block'; });
function simulateProtect() {
  const p1 = document.getElementById('protectPass').value;
  const p2 = document.getElementById('protectPass2').value;
  if (p1 !== p2) return alert('Las contraseñas no coinciden');
  if (p1.length < 4) return alert('Contraseña muy corta');
  alert('Simulación: PDF protegido con contraseña exacta.');
}

/* =========== ROTAR =========== */
const rotateFile = document.getElementById('rotateFile');
const rotateForm = document.getElementById('rotateForm');
rotateFile.addEventListener('change', () => { rotateForm.style.display = 'block'; });
function simulateRotate() {
  const angle = document.getElementById('rotateAngle').value;
  const page = document.getElementById('rotatePage').value;
  alert('Simulación exacta: Página ' + page + ' rotada ' + angle + '°.');
}

/* =========== MARCA DE AGUA =========== */
const wmFile = document.getElementById('wmFile');
const wmForm = document.getElementById('wmForm');
wmFile.addEventListener('change', () => { wmForm.style.display = 'block'; });
function updateWmOpacity(val) { document.getElementById('wmText').style.opacity = val; }
function simulateWatermark() {
  const text = document.getElementById('wmText').value;
  const op = document.getElementById('wmOpacity').value;
  alert('Simulación exacta: Marca de agua "' + text + '" con opacidad ' + op + '.');
}
