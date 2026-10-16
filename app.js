/* =============================================
   DocConvert — app.js v2.0
   ============================================= */

'use strict';

// ─── Theme Switcher (Dark / Light) ──────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('docconvert_theme') || 'dark';
  setTheme(saved);
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('docconvert_theme', theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'light' ? '🌙' : '☀️';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
  toast(next === 'light' ? '☀️ Kunduzgi rejim yoqildi' : '🌙 Tungi rejim yoqildi', 'info', 2000);
}

initTheme();

// ─── PDF.js Worker ───────────────────────────────────────────────────────────
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  imgFiles     : [],   // Rasm → PDF uchun fayllar ro'yxati
  mergeFiles   : [],   // PDF birlashtirish uchun { file, pageCount, id }
  wordHtml     : '',   // Word → PDF uchun HTML
  p2wBlob      : null, // PDF → Word natija blob
  extractedText: '',   // PDF yoki Word matni nusxa olish uchun

  // AI Hujjat Yordamchisi
  aiDocText    : '',
  aiDocName    : '',
  aiLastOutput : '',

  // Split PDF
  splitFile      : null,
  splitTotalPages: 0,
};

// ─── Nusxalash funksiyasi (Copy to Clipboard) ──────────────────────────────
async function copyExtractedText(tool) {
  let text = '';
  if (tool === 'pdf2word') {
    text = state.extractedText;
  } else if (tool === 'word2pdf') {
    const el = document.getElementById('wp-word2pdf');
    text = el ? (el.innerText || el.textContent) : '';
  }
  if (!text || !text.trim()) {
    toast('Nusxalash uchun matn topilmadi', 'error');
    return;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    toast('Matn nusxalandi! 📋', 'success');
  } catch (err) {
    console.error('Clipboard copy error:', err);
    toast('Nusxalashda xatolik yuz berdi', 'error');
  }
}

// ─── Particle Canvas (Optimizatsiya qilingan: batareya va quvvat tejamkor) ────
(function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles;
  let isRunning = true;
  let animId = null;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function getParticleCount() {
    return window.innerWidth < 768 ? 30 : 60;
  }

  function createParticles(n) {
    return Array.from({ length: n }, () => ({
      x : Math.random() * W,
      y : Math.random() * H,
      r : Math.random() * 1.3 + 0.3,
      dx: (Math.random() - .5) * 0.28,
      dy: (Math.random() - .5) * 0.28,
      o : Math.random() * 0.4 + 0.15,
    }));
  }

  function draw() {
    if (!isRunning) return;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(130,165,255,${p.o})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
    }
    animId = requestAnimationFrame(draw);
  }

  resize();
  particles = createParticles(getParticleCount());
  draw();

  // Tab fon holatiga o'tganda CPU sarfini 0 ga tushirish
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      isRunning = false;
      if (animId) cancelAnimationFrame(animId);
    } else {
      if (!isRunning) {
        isRunning = true;
        draw();
      }
    }
  });

  window.addEventListener('resize', () => {
    resize();
    particles = createParticles(getParticleCount());
  });
})();

// ─── Toast sistemi ───────────────────────────────────────────────────────────
function toast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
    <span>${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .3s ease forwards';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

// ─── Tab tizimi ──────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.panel;
    document.querySelectorAll('.tab').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const panel = document.getElementById(target);
    if (panel) panel.classList.add('active');
  });
});

// ─── Universal Drag & Drop ───────────────────────────────────────────────────
function setupDrop(dzId) {
  const zone  = document.getElementById(dzId);
  if (!zone) return;
  const input = document.getElementById(zone.dataset.input);

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  zone.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;

    if (dzId === 'dz-img2pdf') {
      const imgFiles = files.filter(f => f.type.startsWith('image/'));
      if (imgFiles.length) {
        state.imgFiles = [...state.imgFiles, ...imgFiles];
        hide('dz-img2pdf');
        renderImgGrid();
        show('mp-img2pdf');
      }
    } else if (dzId === 'dz-merge') {
      const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
      if (pdfs.length) addMergeFiles(pdfs);
    } else {
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(f));
      input.files = dt.files;
      input.dispatchEvent(new Event('change'));
    }
  });
}

['dz-ai', 'dz-pdf2word', 'dz-word2pdf', 'dz-img2pdf', 'dz-merge', 'dz-split'].forEach(setupDrop);

// ─── Clipboard Paste (Ctrl + V) qo'llab-quvvatlash ────────────────────────────
window.addEventListener('paste', e => {
  const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
  if (!items) return;
  const files = [];
  for (const item of items) {
    if (item.kind === 'file') {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  if (!files.length) return;

  const activePanel = document.querySelector('.panel.active');
  if (!activePanel) return;
  const panelId = activePanel.id;

  if (panelId === 'p-ai') {
    const doc = files.find(f => f.name.match(/\.(pdf|docx|doc|txt)$/i) || f.type.includes('pdf') || f.type.includes('document') || f.type.includes('text'));
    if (doc) {
      const dt = new DataTransfer();
      dt.items.add(doc);
      const inp = document.getElementById('in-ai');
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change'));
      toast(`"${doc.name}" yuklandi!`, 'info');
    }
  } else if (panelId === 'p-img2pdf') {
    const imgFiles = files.filter(f => f.type.startsWith('image/'));
    if (imgFiles.length) {
      state.imgFiles.push(...imgFiles);
      hide('dz-img2pdf');
      show('mp-img2pdf');
      renderImgGrid();
      toast(`${imgFiles.length} ta rasm buferdan qo'shildi! 📋`, 'success');
    }
  } else if (panelId === 'p-pdf2word') {
    const pdf = files.find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (pdf) {
      const dt = new DataTransfer();
      dt.items.add(pdf);
      const inp = document.getElementById('in-pdf2word');
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change'));
      toast(`"${pdf.name}" tanlandi!`, 'info');
    }
  } else if (panelId === 'p-word2pdf') {
    const docx = files.find(f => f.name.toLowerCase().endsWith('.docx') || f.name.toLowerCase().endsWith('.doc'));
    if (docx) {
      const dt = new DataTransfer();
      dt.items.add(docx);
      const inp = document.getElementById('in-word2pdf');
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change'));
      toast(`"${docx.name}" tanlandi!`, 'info');
    }
  } else if (panelId === 'p-merge') {
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (pdfs.length) addMergeFiles(pdfs);
  } else if (panelId === 'p-split') {
    const pdf = files.find(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (pdf) {
      const dt = new DataTransfer();
      dt.items.add(pdf);
      const inp = document.getElementById('in-split');
      inp.files = dt.files;
      inp.dispatchEvent(new Event('change'));
      toast(`"${pdf.name}" tanlandi!`, 'info');
    }
  }
});

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────────
function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function setProgress(tool, pct, label, extra) {
  const fill  = document.getElementById(`prf-${tool}`);
  const lbl   = document.getElementById(`prl-${tool}`);
  const pctEl = document.getElementById(`prp-${tool}`);
  if (fill)  fill.style.width = pct + '%';
  if (lbl && label) lbl.textContent = label;
  if (pctEl)  pctEl.textContent = Math.round(pct) + '%';
  const pages = document.getElementById(`prpages-${tool}`);
  if (pages && extra !== undefined) pages.textContent = extra;
}

function show(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id)  { document.getElementById(id)?.classList.add('hidden'); }
function toggle(id, visible) { visible ? show(id) : hide(id); }

function showError(tool, msg) {
  hide(`pr-${tool}`);
  const errEl = document.getElementById(`ert-${tool}`);
  if (errEl) errEl.textContent = msg;
  show(`er-${tool}`);
  toast(msg, 'error', 5000);
}

function resetTool(tool) {
  const ids = [`fs-${tool}`, `pr-${tool}`, `rc-${tool}`, `er-${tool}`,
               `mp-${tool}`, `dz-${tool}`];
  ['fs','pr','rc','er','mp'].forEach(p => hide(`${p}-${tool}`));
  show(`dz-${tool}`);

  // Input reset
  const inputMap = {
    'ai'      : 'in-ai',
    'pdf2word': 'in-pdf2word',
    'word2pdf': 'in-word2pdf',
    'img2pdf' : 'in-img2pdf',
    'merge'   : 'in-merge',
    'split'   : 'in-split',
  };
  const inp = document.getElementById(inputMap[tool]);
  if (inp) inp.value = '';

  if (tool === 'ai') {
    state.aiDocText = '';
    state.aiDocName = '';
    state.aiLastOutput = '';
    hide('ai-stats-card');
    stopAiTts();
    const rawTa = document.getElementById('ai-raw-text');
    if (rawTa) rawTa.value = '';
    const qIn = document.getElementById('ai-user-query');
    if (qIn) qIn.value = '';
  }
  if (tool === 'split') {
    state.splitFile = null;
    state.splitTotalPages = 0;
    const sIn = document.getElementById('split-range-input');
    if (sIn) sIn.value = '';
    const grid = document.getElementById('split-thumbnails-grid');
    if (grid) grid.innerHTML = '';
    const sc = document.getElementById('sth-selected-count');
    if (sc) sc.textContent = '0 ta sahifa tanlandi';
  }
  if (tool === 'img2pdf') {
    state.imgFiles = [];
    renderImgGrid();
  }
  if (tool === 'merge') {
    state.mergeFiles = [];
    renderMergeList();
  }
  if (tool === 'word2pdf') state.wordHtml = '';
  if (tool === 'pdf2word') state.p2wBlob = null;
}

function fileToDataURL(file, filter = 'original') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Aqlli o'lcham chegarasi (2200px - A4 chop etish uchun a'lo darajadagi sifat, lekin brauzerni qotishdan asraydi)
        const MAX_DIM = 2200;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Oq fon qo'yish (shaffof PNG/WebP rasmlar qora fon bo'lib qolmasligi uchun)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Hujjat skaner filtrlari
        if (filter && filter !== 'original') {
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          if (filter === 'grayscale') {
            for (let i = 0; i < d.length; i += 4) {
              const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              d[i] = d[i + 1] = d[i + 2] = gray;
            }
          } else if (filter === 'bw') {
            for (let i = 0; i < d.length; i += 4) {
              const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              const val = gray > 140 ? 255 : 0;
              d[i] = d[i + 1] = d[i + 2] = val;
            }
          } else if (filter === 'contrast') {
            const contrast = 65;
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            for (let i = 0; i < d.length; i += 4) {
              d[i]     = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128));
              d[i + 1] = Math.min(255, Math.max(0, factor * (d[i + 1] - 128) + 128));
              d[i + 2] = Math.min(255, Math.max(0, factor * (d[i + 2] - 128) + 128));
            }
          }
          ctx.putImageData(imgData, 0, 0);
        }

        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        resolve({
          dataUrl,
          w: canvas.width,
          h: canvas.height
        });
      } catch (err) {
        const r = new FileReader();
        r.onload = e => resolve({ dataUrl: e.target.result, w: img.naturalWidth, h: img.naturalHeight });
        r.onerror = reject;
        r.readAsDataURL(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" rasmini yuklab bo'lmadi`));
    };
    img.src = url;
  });
}

function applyImageFilterPreview() {
  const filter = document.getElementById('opt-img-filter')?.value || 'original';
  let css = 'none';
  if (filter === 'bw') css = 'grayscale(1) contrast(2.4)';
  else if (filter === 'grayscale') css = 'grayscale(1)';
  else if (filter === 'contrast') css = 'contrast(1.5) brightness(1.05)';

  document.querySelectorAll('#ig-img2pdf .img-thumb-card img').forEach(img => {
    img.style.filter = css;
    img.style.transition = 'filter 0.25s ease';
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//   0.  SUN'IY INTELLEKT (AI) HUJJAT YORDAMCHISI
// ═══════════════════════════════════════════════════════════════════════════

function setAiSource(type) {
  const btnFile = document.getElementById('btn-src-file');
  const btnText = document.getElementById('btn-src-text');
  const blkFile = document.getElementById('ai-file-block');
  const blkText = document.getElementById('ai-text-block');

  if (type === 'file') {
    btnFile.classList.add('active');
    btnText.classList.remove('active');
    blkFile.classList.remove('hidden');
    blkText.classList.add('hidden');
  } else {
    btnText.classList.add('active');
    btnFile.classList.remove('active');
    blkText.classList.remove('hidden');
    blkFile.classList.add('hidden');
  }
}

// AI hujjat tanlanganda
document.getElementById('in-ai').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;

  hide('dz-ai');
  document.getElementById('fsn-ai').textContent = file.name;
  document.getElementById('fsm-ai').textContent = `${fmtSize(file.size)} · ${file.name.split('.').pop().toUpperCase()}`;
  show('fs-ai');
  ['pr-ai', 'rc-ai', 'er-ai'].forEach(hide);

  show('pr-ai');
  setProgress('ai', 15, 'Hujjat matni o\'qilmoqda...');

  try {
    const ext = file.name.split('.').pop().toLowerCase();
    let text = '';

    if (ext === 'pdf') {
      const arrBuf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;
      const count = pdf.numPages;
      const pagesText = [];
      for (let i = 1; i <= count; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent({ normalizeWhitespace: true });
        const pText = content.items.map(it => it.str).join(' ');
        pagesText.push(pText);
        setProgress('ai', 15 + Math.round((i / count) * 75), `Sahifa ${i}/${count} o'qilmoqda...`);

        // Har 2 sahifada UI ga nafas berish
        if (i % 2 === 0) {
          await new Promise(r => setTimeout(r, 6));
        }
      }
      text = pagesText.join('\n\n');
    } else if (ext === 'docx' || ext === 'doc') {
      const arrBuf = await file.arrayBuffer();
      const res = await mammoth.extractRawText({ arrayBuffer: arrBuf });
      text = res.value || '';
    } else {
      text = await file.text();
    }

    state.aiDocText = text.trim();
    state.aiDocName = file.name;
    updateAiStats(state.aiDocText);

    setProgress('ai', 100, '✓ Matn yuklandi');
    setTimeout(() => {
      hide('pr-ai');
      toast(`"${file.name}" yuklandi!`, 'success');
      runAiTask('summary');
    }, 400);

  } catch (err) {
    console.error('[AI File Load]', err);
    showError('ai', 'Hujjatni o\'qishda xatolik: ' + (err.message || 'Format qo\'llab-quvvatlanmadi'));
  }
});

// Matn kiritilganda statistikani yangilash
document.getElementById('ai-raw-text')?.addEventListener('input', function () {
  updateAiStats(this.value);
});

function getActiveAiText() {
  const isTextMode = document.getElementById('btn-src-text')?.classList.contains('active');
  if (isTextMode) {
    return document.getElementById('ai-raw-text')?.value.trim() || '';
  }
  return state.aiDocText.trim();
}

async function runAiTask(taskType) {
  const text = getActiveAiText();
  if (!text) {
    toast('Iltimos, avval PDF/Word fayl yuklang yoki matn kiriting!', 'error');
    return;
  }

  // Active button highlight
  document.querySelectorAll('.ai-act-btn').forEach(b => b.classList.remove('active'));
  const activeBtn = event?.currentTarget || document.querySelector(`.ai-act-btn[onclick*="${taskType}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  hide('er-ai');
  hide('rc-ai');
  show('pr-ai');

  let prompt = '';
  let title = 'Tahlil natijasi';

  if (taskType === 'summary') {
    title = 'Qisqacha mazmun (Xulosa)';
    prompt = 'Quyidagi hujjat matnini diqqat bilan tahlil qiling va uning eng asosiy mohiyatini, maqsadini va xulosalarini tushunarli, chiroyli va qisqa (3-5 ta asosiy bandda) qilib O\'zbek tilida bayon eting:';
  } else if (taskType === 'points') {
    title = 'Asosiy tezislar va faktlar';
    prompt = 'Quyidagi matndan eng muhim faktlar, raqamlar, talablar va asosiy tezislarni ajratib, ro\'yxat (bullet points) shaklida O\'zbek tilida taqdim eting:';
  } else if (taskType === 'polish') {
    title = 'Uslubiy va grammatik tahrir';
    prompt = 'Quyidagi matnni imloviy va grammatik xatolardan tozalang, akademik hamda rasmiy uslubga moslab, ravon va professional shaklga keltiring:';
  } else if (taskType === 'translate_uz') {
    title = 'O\'zbek tiliga tarjima';
    prompt = 'Quyidagi matnni ma\'nosini aniq saqlagan holda, adabiy va ravon O\'zbek tiliga professional tarjima qiling:';
  } else if (taskType === 'translate_ru') {
    title = 'Ruschaga tarjima (Перевод на русский)';
    prompt = 'Профессионально и грамотно переведите следующий текст на русский язык, сохраняя структуру и смысл:';
  } else if (taskType === 'translate_en') {
    title = 'Inglizchaga tarjima (English Translation)';
    prompt = 'Professionally and accurately translate the following document text into fluent English:';
  }

  setProgress('ai', 45, 'Sun\'iy intellekt o\'ylamoqda...');

  try {
    const result = await queryAiOrLocal(prompt, text);
    state.aiLastOutput = result;

    document.getElementById('ai-res-title').textContent = title;
    document.getElementById('rcm-ai').textContent = `${text.split(/\s+/).length} ta so'z tahlil qilindi`;
    const outEl = document.getElementById('ai-output-content');

    setProgress('ai', 100, '✓ Tayyor!');
    setTimeout(() => {
      hide('pr-ai');
      show('rc-ai');
      typewriterEffect(outEl, result);
    }, 400);

  } catch (err) {
    console.error('[AI Task Error]', err);
    showError('ai', 'AI javobida xatolik: ' + err.message);
  }
}

async function runAiCustomQuery() {
  const queryInput = document.getElementById('ai-user-query');
  const query = queryInput ? queryInput.value.trim() : '';
  const text = getActiveAiText();

  if (!text) {
    toast('Iltimos, avval hujjat yuklang yoki matn kiriting!', 'error');
    return;
  }
  if (!query) {
    toast('Iltimos, hujjat bo\'yicha savolingizni yozing!', 'error');
    queryInput.focus();
    return;
  }

  hide('er-ai');
  hide('rc-ai');
  show('pr-ai');
  setProgress('ai', 40, 'Savolingiz tahlil qilinmoqda...');

  const prompt = `Foydalanuvchi quyidagi hujjat bo'yicha maxsus savol berdi.
Hujjat matniga tayangan holda savolga to'liq, asosli va aniq javob bering.
Savol: "${query}"`;

  try {
    const result = await queryAiOrLocal(prompt, text);
    state.aiLastOutput = result;

    document.getElementById('ai-res-title').textContent = `Savol: "${query}"`;
    document.getElementById('rcm-ai').textContent = 'Savol-javob';
    const outEl = document.getElementById('ai-output-content');

    setProgress('ai', 100, '✓ Javob tayyor!');
    setTimeout(() => {
      hide('pr-ai');
      show('rc-ai');
      typewriterEffect(outEl, result);
    }, 400);
  } catch (err) {
    showError('ai', 'Xato: ' + err.message);
  }
}

async function queryAiOrLocal(systemPrompt, docText) {
  const apiKey = localStorage.getItem('docconvert_gemini_key') || '';
  const clippedDoc = docText.length > 35000 ? docText.slice(0, 35000) + '\n\n[...Hujjatning qolgan qismi qisqartirildi]' : docText;

  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{
          parts: [
            { text: `${systemPrompt}\n\n=== HUJJAT MATNI ===\n${clippedDoc}` }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        }
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Gemini API xatosi (${resp.status})`);
      }

      const data = await resp.json();
      const textOut = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textOut) return textOut;
      throw new Error('Gemini javob bermadi');
    } catch (e) {
      console.warn('Gemini API failed, using smart local fallback:', e);
      toast('Gemini API xatosi: ' + e.message + '. Aqlli lokal tahlil ko\'rsatilmoqda.', 'error', 4500);
    }
  }

  return generateSmartLocalSummary(systemPrompt, clippedDoc);
}

function generateSmartLocalSummary(prompt, docText) {
  const lines = docText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const words = docText.split(/\s+/).filter(Boolean);
  const sentences = docText.match(/[^.!?]+[.!?]+/g) || [docText];

  const wordFreq = {};
  const stopWords = new Set(['va','ham','bilan','uchun','bu','shu','u','o\'sha','bir','har','to','esa','deb','kerak','bo\'lib','bo\'lgan','edi','emas','haqida','ko\'ra','bunday','faqat']);
  words.forEach(w => {
    const clean = w.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.length > 2 && !stopWords.has(clean)) {
      wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    }
  });

  const scoredSentences = sentences.map(s => {
    const sWords = s.toLowerCase().split(/\s+/);
    const score = sWords.reduce((acc, w) => acc + (wordFreq[w.replace(/[^a-z0-9]/g, '')] || 0), 0) / (sWords.length || 1);
    return { text: s.trim(), score };
  });

  scoredSentences.sort((a, b) => b.score - a.score);
  const topSentences = scoredSentences.slice(0, 5).map(s => s.text);

  return `📊 Aqlli Tahlil (Offline Ekstraktor):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 Hujjat statistikasi:
• Jami so'zlar: ${words.length.toLocaleString()} ta
• Jami satrlar: ${lines.length.toLocaleString()} ta
• Mutolaa vaqti: taxminan ${Math.ceil(words.length / 180)} daqiqa

🎯 Hujjatdan ajratilgan eng muhim asosiy bandlar:
${topSentences.map((s, i) => `${i + 1}. ${s}`).join('\n\n')}

💡 Eslatma: To'liq Gemini 1.5 Flash Sun'iy Intellekt tahlili uchun yuqoridagi «AI Kaliti» tugmasi orqali bepul Google Gemini API kalitingizni kiriting!`;
}

// ─── AI Statistics Updater ──────────────────────────────────────────────────
function updateAiStats(text) {
  const card = document.getElementById('ai-stats-card');
  if (!card) return;
  if (!text || !text.trim()) {
    card.classList.add('hidden');
    return;
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const charCount = text.length;
  const readTime = Math.max(1, Math.ceil(wordCount / 180));
  const paras = text.split(/\n+/).map(p => p.trim()).filter(Boolean).length;

  const wEl = document.getElementById('stat-words');
  const cEl = document.getElementById('stat-chars');
  const tEl = document.getElementById('stat-time');
  const pEl = document.getElementById('stat-paras');

  if (wEl) wEl.textContent = wordCount.toLocaleString();
  if (cEl) cEl.textContent = charCount.toLocaleString();
  if (tEl) tEl.textContent = `~${readTime} daq`;
  if (pEl) pEl.textContent = paras.toLocaleString();
  card.classList.remove('hidden');
}

// ─── Typewriter Effect ──────────────────────────────────────────────────────
let typewriterTimer = null;
function typewriterEffect(targetEl, fullText, callback) {
  if (typewriterTimer) {
    clearInterval(typewriterTimer);
    typewriterTimer = null;
  }
  if (!targetEl) return;

  targetEl.innerHTML = '';
  const cursor = document.createElement('span');
  cursor.className = 'typewriter-cursor';
  targetEl.appendChild(cursor);

  let index = 0;
  const total = fullText.length;
  const step = Math.max(2, Math.floor(total / 120));

  typewriterTimer = setInterval(() => {
    index += step;
    if (index >= total) {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
      targetEl.textContent = fullText;
      if (cursor.parentNode) cursor.remove();
      if (callback) callback();
      return;
    }
    targetEl.textContent = fullText.slice(0, index);
    targetEl.appendChild(cursor);
  }, 16);

  targetEl.onclick = () => {
    if (typewriterTimer) {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
      targetEl.textContent = fullText;
      if (cursor.parentNode) cursor.remove();
      if (callback) callback();
    }
  };
}

// ─── Text-to-Speech (TTS) ───────────────────────────────────────────────────
let isAiSpeaking = false;
function stopAiTts() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  isAiSpeaking = false;
  const btn = document.getElementById('btn-ai-tts');
  const icon = document.getElementById('tts-icon');
  const label = document.getElementById('tts-label');
  if (btn) btn.classList.remove('speaking');
  if (icon) icon.textContent = '🔊';
  if (label) label.textContent = 'Ovozli eshitish';
}

function toggleAiTts() {
  if (!('speechSynthesis' in window)) {
    toast('Brauzeringiz ovozli o\'qishni qo\'llab-quvvatlamaydi', 'error');
    return;
  }
  if (isAiSpeaking) {
    stopAiTts();
    return;
  }
  if (!state.aiLastOutput) {
    toast('O\'qish uchun matn mavjud emas', 'error');
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(state.aiLastOutput);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const uzVoice = voices.find(v => v.lang.startsWith('uz')) ||
                  voices.find(v => v.lang.startsWith('ru')) ||
                  voices.find(v => v.lang.startsWith('en')) || voices[0];
  if (uzVoice) utterance.voice = uzVoice;

  utterance.onstart = () => {
    isAiSpeaking = true;
    const btn = document.getElementById('btn-ai-tts');
    const icon = document.getElementById('tts-icon');
    const label = document.getElementById('tts-label');
    if (btn) btn.classList.add('speaking');
    if (icon) icon.textContent = '⏹';
    if (label) label.textContent = 'To\'xtatish';
  };

  utterance.onend = () => stopAiTts();
  utterance.onerror = () => stopAiTts();

  window.speechSynthesis.speak(utterance);
}

// ─── Export Output Actions ──────────────────────────────────────────────────
function copyAiOutput() {
  if (!state.aiLastOutput) return;
  navigator.clipboard.writeText(state.aiLastOutput)
    .then(() => toast('AI tahlili nusxalandi! 📋', 'success'))
    .catch(() => toast('Nusxalashda xatolik', 'error'));
}

function downloadAiOutputTxt() {
  if (!state.aiLastOutput) return;
  const blob = new Blob([state.aiLastOutput], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, 'ai_hujjat_tahlili.txt');
  toast('Tahlil matni yuklab olindi!', 'success');
}

async function downloadAiOutputDocx() {
  if (!state.aiLastOutput) {
    toast('Eksport uchun matn mavjud emas', 'error');
    return;
  }
  try {
    const { Document, Paragraph, TextRun, AlignmentType, BorderStyle } = docx;
    const titleText = document.getElementById('ai-res-title')?.textContent || 'AI Hujjat Tahlili';
    const lines = state.aiLastOutput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    const children = [
      new Paragraph({
        children: [new TextRun({ text: titleText, bold: true, size: 36, color: '1E3A8A', font: 'Calibri' })],
        spacing: { before: 200, after: 120 }
      }),
      new Paragraph({
        children: [new TextRun({
          text: `Sana: ${new Date().toLocaleDateString('uz-UZ')}  |  Manba: ${state.aiDocName || 'Kiritilgan matn'}  |  DocConvert AI`,
          italics: true, size: 18, color: '64748B', font: 'Calibri'
        })],
        spacing: { after: 300 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' } }
      })
    ];

    lines.forEach(line => {
      const isHeader = line.endsWith(':') && line.length < 60;
      children.push(new Paragraph({
        children: [new TextRun({
          text: line,
          bold: isHeader,
          size: isHeader ? 24 : 22,
          color: isHeader ? '0F172A' : '334155',
          font: 'Calibri'
        })],
        spacing: { before: isHeader ? 160 : 60, after: 60 },
        alignment: AlignmentType.LEFT
      }));
    });

    const doc = new Document({
      title: titleText,
      creator: 'DocConvert AI',
      sections: [{
        properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children
      }]
    });

    const blob = await docx.Packer.toBlob(doc);
    saveAs(blob, `${titleText.replace(/[^a-zA-Z0-9_\u0400-\u04FF]/g, '_')}.docx`);
    toast('Word (.docx) hisoboti yuklab olindi!', 'success');
  } catch (err) {
    console.error('[Docx Export Error]', err);
    toast('Word fayl yaratishda xatolik: ' + err.message, 'error');
  }
}

function downloadAiOutputPdf() {
  if (!state.aiLastOutput) {
    toast('Eksport uchun matn mavjud emas', 'error');
    return;
  }
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const titleText = document.getElementById('ai-res-title')?.textContent || 'AI Hujjat Tahlili';

    doc.setFillColor(79, 138, 255);
    doc.rect(0, 0, 210, 8, 'F');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(titleText, 15, 20);

    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Sana: ${new Date().toLocaleDateString()} | Manba: ${state.aiDocName || 'Kiritilgan matn'} | DocConvert AI`, 15, 26);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 29, 195, 29);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);

    const splitText = doc.splitTextToSize(state.aiLastOutput, 180);
    let y = 36;
    for (let i = 0; i < splitText.length; i++) {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(splitText[i], 15, y);
      y += 6;
    }

    doc.save(`${titleText.replace(/[^a-zA-Z0-9_\u0400-\u04FF]/g, '_')}.pdf`);
    toast('PDF hisoboti yuklab olindi!', 'success');
  } catch (err) {
    console.error('[PDF Export Error]', err);
    toast('PDF yaratishda xatolik: ' + err.message, 'error');
  }
}

// ─── Modal AI Settings ──────────────────────────────────────────────────────
function openAiSettings() {
  const modal = document.getElementById('ai-modal');
  const input = document.getElementById('input-gemini-key');
  if (input) input.value = localStorage.getItem('docconvert_gemini_key') || '';
  if (modal) modal.classList.remove('hidden');
}

function closeAiSettings() {
  const modal = document.getElementById('ai-modal');
  if (modal) modal.classList.add('hidden');
}

function saveAiKey() {
  const input = document.getElementById('input-gemini-key');
  const key = input ? input.value.trim() : '';
  if (key) {
    localStorage.setItem('docconvert_gemini_key', key);
    toast('Gemini API kaliti saqlandi! ✨', 'success');
    updateAiKeyBadge(true);
  } else {
    localStorage.removeItem('docconvert_gemini_key');
    toast('API kalit o\'chirildi', 'info');
    updateAiKeyBadge(false);
  }
  closeAiSettings();
}

function clearAiKey() {
  localStorage.removeItem('docconvert_gemini_key');
  const input = document.getElementById('input-gemini-key');
  if (input) input.value = '';
  toast('API kalit o\'chirildi', 'info');
  updateAiKeyBadge(false);
  closeAiSettings();
}

function updateAiKeyBadge(hasKey) {
  const text = document.getElementById('ai-key-status-text');
  if (!text) return;
  if (hasKey || localStorage.getItem('docconvert_gemini_key')) {
    text.textContent = 'AI Faol ✓';
    text.style.color = '#34d399';
  } else {
    text.textContent = 'AI Kaliti';
    text.style.color = '';
  }
}

// Initialize key status on page load
setTimeout(() => updateAiKeyBadge(), 200);

// ═══════════════════════════════════════════════════════════════════════════
//   1.  PDF → WORD
// ═══════════════════════════════════════════════════════════════════════════
//   1.  PDF → WORD
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('in-pdf2word').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;
  hide('dz-pdf2word');
  document.getElementById('fsn-pdf2word').textContent = file.name;
  document.getElementById('fsm-pdf2word').textContent =
    fmtSize(file.size) + ' · PDF';
  show('fs-pdf2word');
  ['pr-pdf2word','rc-pdf2word','er-pdf2word'].forEach(hide);
});

async function convertPdfToWord() {
  const input = document.getElementById('in-pdf2word');
  const file  = input.files[0];
  if (!file) return;

  hide('er-pdf2word');
  hide('rc-pdf2word');
  show('pr-pdf2word');
  setProgress('pdf2word', 3, 'PDF fayl yuklanmoqda...');

  try {
    const arrBuf = await file.arrayBuffer();
    setProgress('pdf2word', 12, 'PDF tuzilmasi tahlil qilinmoqda...');

    const pdf        = await pdfjsLib.getDocument({ data: arrBuf }).promise;
    const totalPages = pdf.numPages;
    const allBlocks  = [];

    for (let i = 1; i <= totalPages; i++) {
      const page    = await pdf.getPage(i);
      const content = await page.getTextContent({ normalizeWhitespace: true });
      const vp      = page.getViewport({ scale: 1 });

      // Satrlarga guruhlash (Y koordinatasi asosida)
      const lineMap = new Map();
      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue;
        const y = Math.round(vp.height - item.transform[5]);
        const key = Math.round(y / 3) * 3; // 3px tolerans
        if (!lineMap.has(key)) lineMap.set(key, []);
        lineMap.get(key).push({
          text: item.str,
          x   : item.transform[4],
          size: Math.round(Math.abs(item.transform[3])),
        });
      }

      const sortedLines = [...lineMap.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([, items]) => ({
          text: items.sort((a, b) => a.x - b.x).map(it => it.text).join(' ').trim(),
          size: items[0]?.size || 12,
        }))
        .filter(l => l.text);

      allBlocks.push({ page: i, lines: sortedLines });

      const pct = 12 + ((i / totalPages) * 55);
      setProgress('pdf2word', pct,
        `Sahifa ${i}/${totalPages} qayta ishlanmoqda...`,
        `Jami ${totalPages} sahifa · Hozir: ${i}-sahifa`);

      // Har 2 sahifada UI ga nafas berish (brauzer qotib qolmasligi va progress bar silliq ko'rinishi uchun)
      if (i % 2 === 0) {
        await new Promise(r => setTimeout(r, 6));
      }
    }

    setProgress('pdf2word', 72, 'Word hujjat shakllantirilmoqda...');

    // ── docx.js orqali Word yaratish ──────────────────────────────────────
    const { Document, Packer, Paragraph, TextRun, HeadingLevel,
            AlignmentType, PageBreak, BorderStyle } = docx;

    const children = [];

    // Sarlavha
    children.push(new Paragraph({
      children: [new TextRun({
        text: file.name.replace(/\.pdf$/i, ''),
        bold: true, size: 40, color: '1E3A8A',
        font: 'Calibri',
      })],
      spacing : { after: 200 },
    }));

    children.push(new Paragraph({
      children: [new TextRun({
        text: `Manba: ${file.name}  |  Sahifalar: ${allBlocks.length}  |  DocConvert orqali`,
        size: 18, color: '94A3B8', italics: true, font: 'Calibri',
      })],
      spacing: { after: 400 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' } },
    }));

    for (const block of allBlocks) {
      // Sahifa ajratuvchisi
      children.push(new Paragraph({
        children: [new TextRun({
          text: `── Sahifa ${block.page} ──`,
          bold: true, size: 20, color: '3B82F6', font: 'Calibri',
        })],
        spacing: { before: 320, after: 120 },
      }));

      // Matn satrlarini yaxlit xatboshilarga birlashtirish
      const mergedParagraphs = [];
      let currentPara = null;

      for (const line of block.lines) {
        const isHeading = line.size >= 16;
        const isBullet = /^[•\-–—*]\s+|\d+\.\s+/.test(line.text);

        if (isHeading || isBullet) {
          if (currentPara) {
            mergedParagraphs.push(currentPara);
            currentPara = null;
          }
          mergedParagraphs.push({
            text: line.text,
            isHeading,
            isBullet,
            size: line.size
          });
        } else {
          if (!currentPara) {
            currentPara = { text: line.text, isHeading: false, isBullet: false, size: line.size };
          } else {
            if (currentPara.text.endsWith('-')) {
              currentPara.text = currentPara.text.slice(0, -1) + line.text;
            } else {
              currentPara.text += ' ' + line.text;
            }
          }
          if (/[.!?:]$/.test(line.text.trim())) {
            mergedParagraphs.push(currentPara);
            currentPara = null;
          }
        }
      }
      if (currentPara) mergedParagraphs.push(currentPara);

      for (const p of mergedParagraphs) {
        children.push(new Paragraph({
          children: [new TextRun({
            text: p.text,
            bold: p.isHeading,
            size: p.isHeading ? 28 : 22,
            font: 'Calibri',
            color: p.isHeading ? '1E293B' : '334155',
          })],
          heading:   p.isHeading ? HeadingLevel.HEADING_2 : undefined,
          alignment: p.isHeading ? AlignmentType.LEFT : AlignmentType.JUSTIFIED,
          spacing:   { before: p.isHeading ? 200 : (p.isBullet ? 60 : 0), after: p.isHeading ? 100 : 120 },
        }));
      }
    }

    const doc = new Document({
      creator:     'DocConvert',
      title:       file.name.replace(/\.pdf$/i, ''),
      description: 'DocConvert orqali PDF dan aylantirилgan',
      sections: [{
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children,
      }],
    });

    setProgress('pdf2word', 90, 'Fayl yozilmoqda...');
    state.p2wBlob = await Packer.toBlob(doc);
    setProgress('pdf2word', 100, '✓ Tayyor!');

    // Natija
    const totalLines = allBlocks.reduce((s, b) => s + b.lines.length, 0);
    state.extractedText = allBlocks
      .flatMap(b => b.lines.map(l => l.text))
      .join('\n');
    const totalWords = state.extractedText.trim()
      ? state.extractedText.trim().split(/\s+/).length
      : 0;
    const previewText = state.extractedText.split('\n').slice(0, 60).join('\n');

    document.getElementById('rcm-pdf2word').textContent =
      `${totalPages} sahifa · ${totalWords} ta so'z · ${fmtSize(state.p2wBlob.size)}`;
    document.getElementById('rct-pdf2word').textContent =
      previewText || '(Matn topilmadi — bu PDF rasm-asosida bo\'lishi mumkin)';

    document.getElementById('dl-pdf2word').onclick = () => {
      saveAs(state.p2wBlob, file.name.replace(/\.pdf$/i, '') + '_converted.docx');
      toast('Word fayl yuklandi!', 'success');
    };

    setTimeout(() => {
      hide('pr-pdf2word');
      show('rc-pdf2word');
      toast('PDF muvaffaqiyatli Word ga aylantirildi!', 'success');
    }, 600);

  } catch (err) {
    console.error('[PDF→Word]', err);
    showError('pdf2word', 'Xato: ' + (err.message || 'Noma\'lum xato'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//   2.  WORD → PDF
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('in-word2pdf').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;

  hide('dz-word2pdf');
  document.getElementById('fsn-word2pdf').textContent = file.name;
  document.getElementById('fsm-word2pdf').textContent = fmtSize(file.size) + ' · DOCX';
  show('fs-word2pdf');
  ['er-word2pdf','rc-word2pdf'].forEach(hide);
  show('pr-word2pdf');
  setProgress('word2pdf', 10, 'Fayl o\'qilmoqda...');

  try {
    const arrBuf = await file.arrayBuffer();
    setProgress('word2pdf', 45, 'HTML ga aylantirilmoqda...');

    const result = await mammoth.convertToHtml(
      { arrayBuffer: arrBuf },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "b => strong",
          "i => em",
          "u => u",
        ],
        includeDefaultStyleMap: true,
      }
    );

    state.wordHtml = result.value || '<p><em>Hujjat bo\'sh yoki format qo\'llab-quvvatlanmaydi.</em></p>';
    setProgress('word2pdf', 90, 'Ko\'rsatilmoqda...');

    document.getElementById('wp-word2pdf').innerHTML = state.wordHtml;

    setTimeout(() => {
      hide('pr-word2pdf');
      show('rc-word2pdf');
      toast('Word fayl tayyor! PDF sifatida chop eting.', 'info');
    }, 400);

  } catch (err) {
    console.error('[Word→PDF]', err);
    showError('word2pdf', 'Xato: ' + (err.message || 'DOCX o\'qilmadi'));
  }
});

function doPrint() {
  if (!state.wordHtml) return;
  const printHtml = `<!DOCTYPE html><html><head>
    <meta charset="UTF-8"/>
    <title>DocConvert — PDF Chop etish</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Times New Roman',serif;font-size:12pt;
           line-height:1.7;color:#000;padding:2cm 2.5cm;background:#fff}
      h1,h2,h3,h4{font-weight:bold;margin:18pt 0 8pt;page-break-after:avoid}
      h1{font-size:20pt} h2{font-size:16pt} h3{font-size:14pt}
      p{margin-bottom:8pt;text-align:justify}
      table{width:100%;border-collapse:collapse;margin:12pt 0}
      td,th{border:1px solid #999;padding:6pt;font-size:11pt}
      img{max-width:100%;page-break-inside:avoid}
      ul,ol{padding-left:22pt;margin:6pt 0}
      li{margin-bottom:4pt}
      strong{font-weight:bold} em{font-style:italic} u{text-decoration:underline}
      @page{margin:2cm 2.5cm}
      @media print{body{padding:0}}
    </style></head><body>
    ${state.wordHtml}
    </body></html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(printHtml);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 600);
  } else {
    let iframe = document.getElementById('print-fallback-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-fallback-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(printHtml);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 600);
  }
}

async function downloadWordPdfDirect() {
  const previewEl = document.getElementById('wp-word2pdf');
  if (!previewEl || !state.wordHtml) {
    toast('Yuklash uchun hujjat topilmadi', 'error');
    return;
  }

  hide('er-word2pdf');
  show('pr-word2pdf');
  setProgress('word2pdf', 30, 'PDF fayl shakllantirilmoqda...');

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const fileName = (document.getElementById('fsn-word2pdf')?.textContent || 'hujjat').replace(/\.docx?$/i, '');

    await doc.html(previewEl, {
      callback: function (pdf) {
        setProgress('word2pdf', 100, '✓ Tayyor!');
        pdf.save(`${fileName}_hujjat.pdf`);
        setTimeout(() => {
          hide('pr-word2pdf');
          toast('PDF fayl yuklab olindi! 📄', 'success');
        }, 500);
      },
      x: 36,
      y: 36,
      width: 523,
      windowWidth: 800,
      autoPaging: 'text'
    });
  } catch (err) {
    console.warn('[Direct PDF fallback]', err);
    hide('pr-word2pdf');
    toast('Chop etish oynasi ochilmoqda...', 'info');
    doPrint();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//   3.  RASM → PDF
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('in-img2pdf').addEventListener('change', function () {
  const newFiles = Array.from(this.files);
  if (!newFiles.length) return;
  state.imgFiles = [...state.imgFiles, ...newFiles];
  hide('dz-img2pdf');
  renderImgGrid();
  show('mp-img2pdf');
  this.value = '';
});

function moveImg(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.imgFiles.length) return;
  const tmp = state.imgFiles[idx];
  state.imgFiles[idx] = state.imgFiles[newIdx];
  state.imgFiles[newIdx] = tmp;
  renderImgGrid();
}

function renderImgGrid() {
  const grid = document.getElementById('ig-img2pdf');
  const count = document.getElementById('mpc-img2pdf');
  if (!grid) return;

  // Xotirani tozalash: eski blob URL larni bekor qilish
  if (window._imgPreviewUrls && Array.isArray(window._imgPreviewUrls)) {
    window._imgPreviewUrls.forEach(url => URL.revokeObjectURL(url));
  }
  window._imgPreviewUrls = [];

  grid.innerHTML = '';
  count.textContent = `${state.imgFiles.length} ta rasm tanlandi`;

  state.imgFiles.forEach((file, idx) => {
    const url  = URL.createObjectURL(file);
    window._imgPreviewUrls.push(url);

    const card = document.createElement('div');
    card.className = 'img-thumb-card';
    card.dataset.idx = idx;
    card.draggable = true;
    card.innerHTML = `
      <img src="${url}" alt="${file.name}"/>
      <div class="img-thumb-num">${idx + 1}</div>
      <div class="img-thumb-actions">
        <button type="button" class="img-thumb-btn" onclick="moveImg(${idx}, -1)" ${idx === 0 ? 'disabled style="opacity:0.3;pointer-events:none;"' : ''} title="Oldinga surish">◀</button>
        <button type="button" class="img-thumb-btn" onclick="moveImg(${idx}, 1)" ${idx === state.imgFiles.length - 1 ? 'disabled style="opacity:0.3;pointer-events:none;"' : ''} title="Keyinga surish">▶</button>
        <button type="button" class="img-thumb-btn del" onclick="removeImg(${idx})" title="O'chirish">✕</button>
      </div>
      <div class="img-thumb-name" title="${file.name}">${file.name}</div>`;
    grid.appendChild(card);
  });

  applyImageFilterPreview();
  enableImgDragSort();
}

function removeImg(idx) {
  state.imgFiles.splice(idx, 1);
  renderImgGrid();
  if (state.imgFiles.length === 0) {
    hide('mp-img2pdf');
    show('dz-img2pdf');
  }
}

// Drag-sort rasmlar uchun (desktop)
function enableImgDragSort() {
  const grid = document.getElementById('ig-img2pdf');
  if (!grid) return;
  let dragSrc = null;

  grid.querySelectorAll('.img-thumb-card').forEach(card => {
    card.addEventListener('dragstart', e => {
      dragSrc = parseInt(card.dataset.idx);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('sortable-ghost');
    });
    card.addEventListener('dragend',  () => card.classList.remove('sortable-ghost'));
    card.addEventListener('dragover', e => e.preventDefault());
    card.addEventListener('drop', e => {
      e.preventDefault();
      const targetIdx = parseInt(card.dataset.idx);
      if (dragSrc === targetIdx) return;
      const tmp = state.imgFiles[dragSrc];
      state.imgFiles.splice(dragSrc, 1);
      state.imgFiles.splice(targetIdx, 0, tmp);
      renderImgGrid();
    });
  });
}

async function convertImgToPdf() {
  if (!state.imgFiles.length) return;
  hide('er-img2pdf');
  show('pr-img2pdf');
  setProgress('img2pdf', 5, 'PDF tayyorlanmoqda...');

  try {
    const { jsPDF } = window.jspdf;
    const orientSetting = document.getElementById('opt-img-orient')?.value || 'auto';
    const margin = parseInt(document.getElementById('opt-img-margin')?.value || '10', 10);
    const filter = document.getElementById('opt-img-filter')?.value || 'original';
    let doc = null;

    for (let i = 0; i < state.imgFiles.length; i++) {
      const file = state.imgFiles[i];
      const pct  = 8 + ((i / state.imgFiles.length) * 84);
      setProgress('img2pdf', pct, `Rasm ${i + 1}/${state.imgFiles.length}: ${file.name}`);

      // Asinxron tanaffus: UI qotib qolmasligi va progress bar silliq harakatlanishi uchun
      await new Promise(r => setTimeout(r, 12));

      const imgInfo = await fileToDataURL(file, filter);
      const imgRatio = imgInfo.w / imgInfo.h;

      // Yo'nalishni aniqlash
      let orient = 'portrait';
      if (orientSetting === 'auto') {
        orient = imgRatio >= 1 ? 'landscape' : 'portrait';
      } else {
        orient = orientSetting;
      }

      // Sahifa o'lchamlari (mm)
      const pw = orient === 'landscape' ? 297 : 210;
      const ph = orient === 'landscape' ? 210 : 297;

      if (!doc) {
        doc = new jsPDF({ orientation: orient, unit: 'mm', format: 'a4' });
      } else {
        doc.addPage('a4', orient);
      }

      // Hoshiyani hisobga olgan holda maksimal maydon
      const aw = Math.max(10, pw - margin * 2);
      const ah = Math.max(10, ph - margin * 2);
      const availRatio = aw / ah;

      let imgW, imgH;
      if (imgRatio > availRatio) {
        imgW = aw;
        imgH = aw / imgRatio;
      } else {
        imgH = ah;
        imgW = ah * imgRatio;
      }

      // Markazlashtirish
      const x = margin + (aw - imgW) / 2;
      const y = margin + (ah - imgH) / 2;

      doc.addImage(imgInfo.dataUrl, 'JPEG', x, y, imgW, imgH);
    }

    setProgress('img2pdf', 96, 'Fayl saqlanmoqda...');
    doc.save('rasmlar_pdf.pdf');

    setProgress('img2pdf', 100, '✓ Tayyor!');
    setTimeout(() => {
      hide('pr-img2pdf');
      toast(`${state.imgFiles.length} ta rasm PDF ga aylantirildi!`, 'success');
      resetTool('img2pdf');
    }, 700);

  } catch (err) {
    console.error('[Img→PDF]', err);
    showError('img2pdf', 'Xato: ' + (err.message || 'Noma\'lum xato'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//   4.  PDF BIRLASHTIRISH
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('in-merge').addEventListener('change', function () {
  const newFiles = Array.from(this.files);
  if (!newFiles.length) return;
  addMergeFiles(newFiles);
  this.value = '';
});

async function addMergeFiles(files) {
  for (const file of files) {
    const item = {
      file,
      pageCount: null,
      id: 'm_' + Math.random().toString(36).substr(2, 9),
    };
    state.mergeFiles.push(item);
  }
  hide('dz-merge');
  renderMergeList();
  show('mp-merge');

  // Sahifalar sonini asinxron aniqlash
  for (const item of state.mergeFiles) {
    if (item.pageCount === null) {
      try {
        const ab = await item.file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
        item.pageCount = pdfDoc.getPageCount();
      } catch (e) {
        item.pageCount = '?';
      }
      const badge = document.getElementById(`mlp-${item.id}`);
      if (badge) {
        badge.textContent = item.pageCount === '?' ? 'Noma\'lum' : `${item.pageCount} sahifa`;
      }
    }
  }
}

function moveMerge(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= state.mergeFiles.length) return;
  const tmp = state.mergeFiles[idx];
  state.mergeFiles[idx] = state.mergeFiles[newIdx];
  state.mergeFiles[newIdx] = tmp;
  renderMergeList();
}

function renderMergeList() {
  const list  = document.getElementById('ml-merge');
  const count = document.getElementById('mpc-merge');
  const btn   = document.getElementById('btn-merge');
  const label = document.getElementById('merge-btn-label');
  if (!list) return;

  list.innerHTML = '';
  count.textContent = `${state.mergeFiles.length} ta fayl tanlandi`;

  state.mergeFiles.forEach((item, idx) => {
    const file = item.file;
    const el = document.createElement('div');
    el.className = 'ml-item';
    el.dataset.idx = idx;
    el.draggable = true;
    el.innerHTML = `
      <div class="ml-num">${idx + 1}</div>
      <div class="ml-order-group">
        <button type="button" class="ml-order-btn" onclick="moveMerge(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Yuqoriga surish">▲</button>
        <button type="button" class="ml-order-btn" onclick="moveMerge(${idx}, 1)" ${idx === state.mergeFiles.length - 1 ? 'disabled' : ''} title="Pastga surish">▼</button>
      </div>
      <span class="ml-icon">📄</span>
      <span class="ml-name" title="${file.name}">${file.name}</span>
      <div class="ml-meta-group">
        <span class="ml-pages" id="mlp-${item.id}">${item.pageCount ? item.pageCount + ' sahifa' : '...'}</span>
        <span class="ml-size">${fmtSize(file.size)}</span>
      </div>
      <button type="button" class="ml-del" onclick="removeMerge(${idx})" title="O'chirish">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>`;
    list.appendChild(el);
  });

  const enough = state.mergeFiles.length >= 2;
  btn.disabled = !enough;
  label.textContent = enough
    ? `${state.mergeFiles.length} ta PDF ni birlashtirish`
    : 'Kamida 2 ta fayl kerak';

  enableMergeDragSort();
}

function removeMerge(idx) {
  state.mergeFiles.splice(idx, 1);
  renderMergeList();
  if (state.mergeFiles.length === 0) {
    hide('mp-merge');
    show('dz-merge');
  }
}

function enableMergeDragSort() {
  const list = document.getElementById('ml-merge');
  if (!list) return;
  let dragSrc = null;

  list.querySelectorAll('.ml-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      dragSrc = parseInt(item.dataset.idx);
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('sortable-ghost');
    });
    item.addEventListener('dragend',  () => item.classList.remove('sortable-ghost'));
    item.addEventListener('dragover', e => e.preventDefault());
    item.addEventListener('drop', e => {
      e.preventDefault();
      const targetIdx = parseInt(item.dataset.idx);
      if (dragSrc === targetIdx) return;
      const tmp = state.mergeFiles[dragSrc];
      state.mergeFiles.splice(dragSrc, 1);
      state.mergeFiles.splice(targetIdx, 0, tmp);
      renderMergeList();
    });
  });
}

async function mergePdfs() {
  if (state.mergeFiles.length < 2) return;
  hide('er-merge');
  show('pr-merge');
  setProgress('merge', 5, 'Birlashtirish boshlanmoqda...');

  try {
    const { PDFDocument } = PDFLib;
    const merged = await PDFDocument.create();

    merged.setTitle('DocConvert — Birlashtirilgan PDF');
    merged.setAuthor('DocConvert');
    merged.setCreationDate(new Date());

    let totalPages = 0;

    for (let i = 0; i < state.mergeFiles.length; i++) {
      const item   = state.mergeFiles[i];
      const file   = item.file;
      const pct    = 8 + ((i / state.mergeFiles.length) * 82);
      setProgress('merge', pct,
        `Fayl ${i + 1}/${state.mergeFiles.length}: ${file.name}`);

      const arrBuf = await file.arrayBuffer();
      let srcDoc;
      try {
        srcDoc = await PDFDocument.load(arrBuf, { ignoreEncryption: true });
      } catch (loadErr) {
        toast(`⚠️ "${file.name}" o'qilmadi — o'tkazib yuborildi`, 'error', 4000);
        continue;
      }

      const indices = srcDoc.getPageIndices();
      const pages   = await merged.copyPages(srcDoc, indices);
      pages.forEach(p => merged.addPage(p));
      totalPages += pages.length;

      // Silliq progress bar va UI javobgarligi uchun
      await new Promise(r => setTimeout(r, 10));
    }

    setProgress('merge', 94, 'Fayl saqlanmoqda...');
    const pdfBytes = await merged.save();
    const blob     = new Blob([pdfBytes], { type: 'application/pdf' });

    setProgress('merge', 100, '✓ Tayyor!');
    saveAs(blob, 'birlashtirilgan.pdf');

    setTimeout(() => {
      hide('pr-merge');
      toast(
        `${state.mergeFiles.length} ta PDF birlashtirildi — jami ${totalPages} sahifa!`,
        'success'
      );
      resetTool('merge');
    }, 700);

  } catch (err) {
    console.error('[Merge]', err);
    showError('merge', 'Xato: ' + (err.message || 'Noma\'lum xato'));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//   5.  PDF SAHIFALARINI AJRATISH (SPLIT PDF)
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('in-split').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;

  hide('dz-split');
  document.getElementById('fsn-split').textContent = file.name;
  show('fs-split');
  ['pr-split', 'er-split'].forEach(hide);

  state.splitFile = file;

  try {
    const ab = await file.arrayBuffer();
    const doc = await PDFLib.PDFDocument.load(ab, { ignoreEncryption: true });
    state.splitTotalPages = doc.getPageCount();
    document.getElementById('fsm-split').textContent =
      `${state.splitTotalPages} sahifa · ${fmtSize(file.size)} · PDF`;

    document.getElementById('split-range-input').value = `1-${Math.min(state.splitTotalPages, 3)}`;
    renderSplitThumbnails(file, state.splitTotalPages);
  } catch (err) {
    console.error('[Split Load]', err);
    showError('split', 'PDF yuklashda xatolik: ' + err.message);
  }
});

// Rang o'zgarganda vizual prevyuni moslashtirish
document.getElementById('split-range-input')?.addEventListener('input', () => {
  syncThumbnailsWithRangeInput();
});

function setSplitPreset(preset) {
  const total = state.splitTotalPages || 1;
  const input = document.getElementById('split-range-input');
  if (!input) return;

  if (preset === 'all') {
    input.value = `1-${total}`;
  } else if (preset === 'odd') {
    const odds = [];
    for (let i = 1; i <= total; i += 2) odds.push(i);
    input.value = odds.join(', ');
  } else if (preset === 'even') {
    const evens = [];
    for (let i = 2; i <= total; i += 2) evens.push(i);
    input.value = evens.join(', ');
  } else if (preset === 'first3') {
    input.value = `1-${Math.min(total, 3)}`;
  }
  syncThumbnailsWithRangeInput();
}

async function renderSplitThumbnails(file, totalPages) {
  const grid = document.getElementById('split-thumbnails-grid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column: 1/-1; padding: 18px; text-align: center; color: var(--text-2); font-size: 13px;">Sahifalar prevyusi yuklanmoqda... ⏳</div>';

  try {
    const arrBuf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrBuf }).promise;
    grid.innerHTML = '';

    const maxRender = Math.min(totalPages, 60);
    const selectedInitial = new Set([1, 2, 3].filter(p => p <= totalPages));

    const currentFileToken = file.name + '_' + file.size;
    window._lastSplitFileToken = currentFileToken;

    for (let pageNum = 1; pageNum <= maxRender; pageNum++) {
      // Agar foydalanuvchi boshqa fayl tanlagan bo'lsa, eskisini to'xtatish
      if (window._lastSplitFileToken !== currentFileToken) return;

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.24 });

      const card = document.createElement('div');
      card.className = `page-thumb-card ${selectedInitial.has(pageNum) ? 'selected' : ''}`;
      card.dataset.page = pageNum;

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      card.appendChild(canvas);

      const check = document.createElement('div');
      check.className = 'page-thumb-check';
      check.innerHTML = '✓';
      card.appendChild(check);

      const num = document.createElement('div');
      num.className = 'page-thumb-num';
      num.textContent = pageNum;
      card.appendChild(num);

      card.addEventListener('click', () => {
        card.classList.toggle('selected');
        updateRangeInputFromThumbnails();
      });

      grid.appendChild(card);

      // Har 2 ta sahifada brauzerga nafas berish (interfeys qotib qolmasligi uchun)
      if (pageNum % 2 === 0) {
        await new Promise(r => setTimeout(r, 6));
      }
    }

    if (totalPages > 60) {
      const note = document.createElement('div');
      note.style.cssText = 'grid-column: 1/-1; padding: 10px; font-size: 11px; color: var(--text-3); text-align: center;';
      note.textContent = `(Dastlabki 60 ta sahifa ko'rsatildi, qolganlarini yuqoridagi maydonda qo'lda kiritishingiz mumkin)`;
      grid.appendChild(note);
    }

    syncThumbnailsWithRangeInput();
  } catch (err) {
    console.error('[Thumbnails Render Error]', err);
    grid.innerHTML = '';
  }
}

function updateRangeInputFromThumbnails() {
  const selectedCards = document.querySelectorAll('#split-thumbnails-grid .page-thumb-card.selected');
  const pages = Array.from(selectedCards).map(c => parseInt(c.dataset.page, 10));
  const rangeInput = document.getElementById('split-range-input');
  if (rangeInput) {
    rangeInput.value = formatPagesToRange(pages);
  }
  const countEl = document.getElementById('sth-selected-count');
  if (countEl) {
    countEl.textContent = `${pages.length} ta sahifa tanlandi`;
  }
}

function syncThumbnailsWithRangeInput() {
  const rangeInput = document.getElementById('split-range-input');
  const val = rangeInput ? rangeInput.value : '';
  const selectedPages = new Set(parsePageRanges(val, state.splitTotalPages));

  document.querySelectorAll('#split-thumbnails-grid .page-thumb-card').forEach(card => {
    const page = parseInt(card.dataset.page, 10);
    if (selectedPages.has(page)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });

  const countEl = document.getElementById('sth-selected-count');
  if (countEl) {
    countEl.textContent = `${selectedPages.size} ta sahifa tanlandi`;
  }
}

function formatPagesToRange(pages) {
  if (!pages || !pages.length) return '';
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

function parsePageRanges(rangeStr, maxPages) {
  if (!rangeStr) return [];
  const pages = new Set();
  const normalized = rangeStr.replace(/;/g, ',').trim();
  const parts = normalized.split(',').map(s => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (!isNaN(start) && !isNaN(end)) {
        const from = Math.max(1, Math.min(start, end));
        const to = Math.min(maxPages, Math.max(start, end));
        for (let i = from; i <= to; i++) pages.add(i);
      }
    } else {
      const p = parseInt(part, 10);
      if (!isNaN(p) && p >= 1 && p <= maxPages) {
        pages.add(p);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

async function executeSplitPdf() {
  if (!state.splitFile || !state.splitTotalPages) {
    toast('Iltimos, avval PDF fayl yuklang!', 'error');
    return;
  }

  const rangeVal = document.getElementById('split-range-input').value;
  const selectedPages = parsePageRanges(rangeVal, state.splitTotalPages);

  if (!selectedPages.length) {
    toast('Iltimos, to\'g\'ri sahifalar oralig\'ini kiriting (masalan: 1-3, 5)!', 'error');
    return;
  }

  hide('er-split');
  show('pr-split');
  setProgress('split', 20, 'Sahifalar ko\'chirilmoqda...');

  try {
    const { PDFDocument } = PDFLib;
    const ab = await state.splitFile.arrayBuffer();
    const srcDoc = await PDFDocument.load(ab, { ignoreEncryption: true });
    const newDoc = await PDFDocument.create();

    newDoc.setTitle('DocConvert — Ajratilgan PDF');
    newDoc.setAuthor('DocConvert AI');

    const indicesToCopy = selectedPages.map(p => p - 1);
    const copiedPages = await newDoc.copyPages(srcDoc, indicesToCopy);
    copiedPages.forEach(p => newDoc.addPage(p));

    setProgress('split', 85, 'Fayl saqlanmoqda...');
    const pdfBytes = await newDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    setProgress('split', 100, '✓ Tayyor!');
    const outName = state.splitFile.name.replace(/\.pdf$/i, '') + `_sahifalar_${selectedPages[0]}-${selectedPages[selectedPages.length - 1]}.pdf`;
    saveAs(blob, outName);

    setTimeout(() => {
      hide('pr-split');
      toast(`${selectedPages.length} ta sahifa yangi PDF qilib yuklandi!`, 'success');
    }, 600);

  } catch (err) {
    console.error('[Split Error]', err);
    showError('split', 'Xato: ' + (err.message || 'Ajratishda muammo yuz berdi'));
  }
}

async function executeSplitAllPages() {
  if (!state.splitFile || !state.splitTotalPages) {
    toast('Iltimos, avval PDF fayl yuklang!', 'error');
    return;
  }

  const total = state.splitTotalPages;
  if (total > 25) {
    const ok = confirm(`Hujjatda ${total} ta sahifa bor. Har biri alohida fayl sifatida saqlanadi. Davom ettirasizmi?`);
    if (!ok) return;
  }

  hide('er-split');
  show('pr-split');
  setProgress('split', 5, 'Sahifalar alohida ajratilmoqda...');

  try {
    const { PDFDocument } = PDFLib;
    const ab = await state.splitFile.arrayBuffer();
    const srcDoc = await PDFDocument.load(ab, { ignoreEncryption: true });
    const baseName = state.splitFile.name.replace(/\.pdf$/i, '');

    for (let i = 0; i < total; i++) {
      const pageDoc = await PDFDocument.create();
      const [copied] = await pageDoc.copyPages(srcDoc, [i]);
      pageDoc.addPage(copied);

      const pdfBytes = await pageDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, `${baseName}_sahifa_${i + 1}.pdf`);

      const pct = Math.round(((i + 1) / total) * 92);
      setProgress('split', pct, `${i + 1}/${total}-sahifa yuklandi...`);

      // Brauzer bir vaqtning o'zida yuklashlarni bloklab qo'ymasligi va interfeys qotmasligi uchun kutiladi
      await new Promise(r => setTimeout(r, 260));
    }

    setProgress('split', 100, '✓ Barcha sahifalar ajratildi!');
    setTimeout(() => {
      hide('pr-split');
      toast(`Jami ${total} ta sahifa alohida PDF qilib yuklab olindi!`, 'success');
    }, 600);
  } catch (err) {
    console.error('[Split All Error]', err);
    showError('split', 'Xato: ' + (err.message || 'Ajratishda muammo yuz berdi'));
  }
}

// ─── PWA O'rnatish (Install App) ─────────────────────────────────────────────
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('btn-pwa-install');
  if (btn) btn.classList.remove('hidden');
});

async function installPwaApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast('DocConvert muvaffaqiyatli o\'rnatildi! 🎉', 'success');
    }
    deferredPrompt = null;
    const btn = document.getElementById('btn-pwa-install');
    if (btn) btn.classList.add('hidden');
  } else {
    toast('Brauzeringiz menyusidan (⋮ yoki Share) "Ilovani o\'rnatish" ni tanlang', 'info', 4500);
  }
}

