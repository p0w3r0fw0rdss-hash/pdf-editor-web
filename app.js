pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* =========== ESTADO GLOBAL =========== */
let pdfDoc = null, currentPage = 1, scale = 1.5, totalPages = 1;
let currentTool = 'text', annotations = [];
let currentColor = '#e63946';
let drawingPoints = [];

/* =========== DOM ELEMENTS =========== */
const pdfFile = document.getElementById('pdfFile');
const fileNameDisplay = document.getElementById('fileName');
const toolbar = document.getElementById('toolbar');
const editorArea = document.getElementById('editorArea');
const canvas = document.getElementById('pdfCanvas');
const ctx = canvas.getContext('2d');

/* =========== NAVEGACIÓN =========== */
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
}

/* =========== EDITOR: CARGA =========== */
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
      drawAnnotations();
    });
  });
}

function drawAnnotations() {
  annotations.forEach(a => {
    ctx.save();
    ctx.globalAlpha = a.opacity || 1;
    ctx.strokeStyle = a.color || currentColor;
    ctx.fillStyle = a.color || currentColor;
    ctx.lineWidth = a.lineWidth || 2;
    ctx.font = (a.fontSize || 14) + 'px sans-serif';

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
      ctx.fillStyle = 'rgba(255, 235, 59, 0.4)';
      ctx.fillRect(a.x, a.y, a.w || 120, a.h || 20);
    } else if (a.type === 'pageNumber') {
      ctx.fillStyle = a.color || '#333';
      ctx.fillText('# ' + currentPage, a.x, a.y);
    }
    ctx.restore();
  });
}

/* =========== HERRAMIENTAS =========== */
function setTool(tool) { currentTool = tool; }
function updateColor(c) { currentColor = c; }
function updateOpacity(o) { currentColor = currentColor; } // opacidad se aplica por anotación

function clearAnnotations() { annotations = []; renderPage(); }

/* =========== INTERACCIÓN CANVAS =========== */
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const rawX = e.clientX - rect.left;
  const rawY = e.clientY - rect.top;
  const x = parseFloat(document.getElementById('propX').value) + rawX - 20;
  const y = parseFloat(document.getElementById('propY').value) + rawY - 20;
  const op = parseFloat(document.getElementById('propOpacity').value);

  if (currentTool === 'text') {
    const text = prompt('Texto con precisión:');
    if (text) {
      annotations.push({
        type: 'text', text, x: x, y: y,
        color: currentColor, opacity: op,
        fontSize: parseInt(document.getElementById('propFont').value)
      });
      renderPage();
    }
  } else if (currentTool === 'rectangle') {
    const w = 100, h = 60;
    annotations.push({ type: 'rectangle', x: x, y: y, w, h, color: currentColor, opacity: op });
    renderPage();
  } else if (currentTool === 'circle') {
    annotations.push({ type: 'circle', cx: x + 30, cy: y + 30, r: 30, color: currentColor, opacity: op });
    renderPage();
  } else if (currentTool === 'line') {
    annotations.push({ type: 'line', x1: x, y1: y, x2: x + 120, y2: y + 50, color: currentColor, opacity: op });
    renderPage();
  } else if (currentTool === 'signature') {
    drawingPoints = [{ x: x, y: y }];
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUpSignature);
  } else if (currentTool === 'highlight') {
    annotations.push({ type: 'highlight', x: x - 20, y: y - 10, w: 100, h: 24, color: currentColor, opacity: op });
    renderPage();
  } else if (currentTool === 'pageNumber') {
    annotations.push({ type: 'pageNumber', x, y, color: '#1a1a2e', opacity: 1 });
    renderPage();
  }
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

/* =========== DESCARGA SIMULADA AVANZADA =========== */
function downloadPDF() {
  const name = pdfFile.files[0] ? pdfFile.files[0].name.replace('.pdf', '') : 'documento';
  const link = document.createElement('a');
  const blob = new Blob([JSON.stringify({ proyecto: 'Isabel PDF Suite', archivo: name, ediciones: annotations.length, fecha: new Date().toISOString() })], { type: 'application/json' });
  link.href = URL.createObjectURL(blob);
  link.download = 'isabel_' + name + '_editado.pdf';
  link.click();
  alert('Archivo generado con ' + annotations.length + ' ediciones aplicadas. En una implementación completa se exportaría como PDF real con PDF-lib.');
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
  const msg = 'Simulación: Se fusionarían ' + files.length + ' archivos en orden. En producción se usaría pdf-lib o similar para combinar los buffers.';
  alert(msg);
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
  alert('Simulación: Se extraerían páginas ' + f + ' a ' + t + '.')
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
  alert('Simulación: PDF protegido con contraseña. En producción se usaría QPDF o pdf-lib para cifrado AES.');
}

/* =========== ROTAR =========== */
const rotateFile = document.getElementById('rotateFile');
const rotateForm = document.getElementById('rotateForm');
rotateFile.addEventListener('change', () => { rotateForm.style.display = 'block'; });
function simulateRotate() {
  const angle = document.getElementById('rotateAngle').value;
  const page = document.getElementById('rotatePage').value;
  alert('Simulación: Página ' + page + ' rotada ' + angle + '°. En producción se usaría pdf-lib para rotar la página real.');
}

/* =========== MARCA DE AGUA =========== */
const wmFile = document.getElementById('wmFile');
const wmForm = document.getElementById('wmForm');
wmFile.addEventListener('change', () => { wmForm.style.display = 'block'; });
function updateWmOpacity(val) { document.getElementById('wmText').style.opacity = val; }
function simulateWatermark() {
  const text = document.getElementById('wmText').value;
  const op = document.getElementById('wmOpacity').value;
  alert('Simulación: Marca "' + text + '" aplicada con opacidad ' + op + '. En producción se inyectaría en cada página con pdf-lib.');
}
