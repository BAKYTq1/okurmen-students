pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const API_BASE = 'https://mentor-0qlv.onrender.com/api';
const API_URL  = `${API_BASE}/students/`;
const TOKEN_KEY = 'mentor_api_token';

// ── Token helpers ────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function saveToken() {
  const val = document.getElementById('tokenInput').value.trim();
  if (!val) {
    showTokenStatus('Токен не может быть пустым', false);
    return;
  }
  localStorage.setItem(TOKEN_KEY, val);
  showTokenStatus('✓ Токен сохранён', true);
  loadGroups();
}

function showTokenStatus(msg, ok) {
  const el = document.getElementById('tokenStatus');
  el.textContent = msg;
  el.className = 'token-status ' + (ok ? 'saved' : 'empty');
}

function initToken() {
  const saved = getToken();
  if (saved) {
    document.getElementById('tokenInput').value = saved;
    showTokenStatus('✓ Токен загружен из localStorage', true);
    loadGroups();
  } else {
    showTokenStatus('Токен не сохранён — введи и нажми «Сохранить»', false);
  }
}

function authHeaders() {
  return {
    'accept': 'application/json, text/plain, */*',
    'authorization': `Token ${getToken()}`,
    'origin': 'https://mentor-sage.vercel.app',
    'referer': 'https://mentor-sage.vercel.app/'
  };
}

// ── Groups ───────────────────────────────────────────────────────────────────

let groupsCache = [];

async function loadGroups() {
  if (!getToken()) {
    document.getElementById('groupsGrid').innerHTML =
      '<span class="groups-msg err">Сначала введи и сохрани токен</span>';
    return;
  }

  const grid = document.getElementById('groupsGrid');
  grid.innerHTML = '<span class="groups-msg"><span class="spinner"></span>Загружаю группы...</span>';
  document.getElementById('reloadBtn').disabled = true;

  try {
    const res = await fetch(`${API_BASE}/groups/`, { headers: authHeaders() });
    if (!res.ok) {
      grid.innerHTML = `<span class="groups-msg err">Ошибка ${res.status}. Проверь токен.</span>`;
      return;
    }
    const data = await res.json();
    groupsCache = Array.isArray(data) ? data : (data.results || []);

    renderGroupsGrid(groupsCache);
    fillGroupSelect(groupsCache);
  } catch (e) {
    grid.innerHTML = `<span class="groups-msg err">Ошибка сети: ${e.message}</span>`;
  } finally {
    document.getElementById('reloadBtn').disabled = false;
  }
}

function renderGroupsGrid(list) {
  const grid = document.getElementById('groupsGrid');
  if (list.length === 0) {
    grid.innerHTML = '<span class="groups-msg">Групп не найдено</span>';
    return;
  }
  grid.innerHTML = '';
  list.forEach(g => {
    const name = g.name || g.title || `Группа #${g.id}`;
    const card = document.createElement('div');
    card.className = 'group-card';
    card.dataset.id = g.id;
    card.innerHTML = `
      <div class="gc-name">${escHtml(name)}</div>
      <div class="gc-id">ID: ${g.id}</div>
      <span class="gc-view" onclick="openGroupDetail(${g.id}, '${escHtml(name).replace(/'/g, "\\'")}', event)">👁 Посмотреть учеников</span>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('gc-view')) return;
      selectGroupCard(g.id);
    });
    grid.appendChild(card);
  });
}

function fillGroupSelect(list) {
  const sel = document.getElementById('groupSelect');
  sel.innerHTML = '<option value="">— выбери группу —</option>';
  list.forEach(g => {
    const name = g.name || g.title || `Группа #${g.id}`;
    const opt = document.createElement('option');
    opt.value = g.id;
    opt.textContent = `${name} (ID: ${g.id})`;
    sel.appendChild(opt);
  });
}

function selectGroupCard(id) {
  document.querySelectorAll('.group-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.id == id);
  });
  document.getElementById('groupSelect').value = id;
}

function getSelectedGroupId() {
  return document.getElementById('groupSelect').value;
}

// ── Group detail modal ────────────────────────────────────────────────────────

async function openGroupDetail(id, name, event) {
  if (event) event.stopPropagation();

  document.getElementById('modalTitle').textContent = `Ученики: ${name}`;
  document.getElementById('modalBody').innerHTML =
    '<span class="groups-msg"><span class="spinner"></span>Загружаю...</span>';
  document.getElementById('overlay').classList.add('open');

  try {
    const res = await fetch(`${API_BASE}/students/?group_id=${id}`, { headers: authHeaders() });
    if (!res.ok) {
      document.getElementById('modalBody').innerHTML =
        `<span class="groups-msg err">Ошибка ${res.status}</span>`;
      return;
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.results || []);

    if (list.length === 0) {
      document.getElementById('modalBody').innerHTML =
        '<span class="groups-msg">В группе пока нет учеников</span>';
      return;
    }

    document.getElementById('modalBody').innerHTML = list.map((s, i) => `
      <div class="student-row">
        <span class="student-idx">${i + 1}</span>
        <span style="flex:1">${escHtml(s.full_name || s.name || JSON.stringify(s))}</span>
        <span style="color:#9ca3af; font-size:0.8rem">id ${s.id}</span>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('modalBody').innerHTML =
      `<span class="groups-msg err">Ошибка сети: ${e.message}</span>`;
  }
}

function closeModal(e) {
  if (e.target === document.getElementById('overlay')) closeModalDirect();
}
function closeModalDirect() {
  document.getElementById('overlay').classList.remove('open');
}

// ── Logs & status ─────────────────────────────────────────────────────────────

function log(msg, type = 'info') {
  const el = document.getElementById('log');
  const line = document.createElement('div');
  line.className = type;
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
}

function clearLog() {
  document.getElementById('log').innerHTML = '';
  document.getElementById('status').textContent = '';
}

function setStatus(text) {
  document.getElementById('status').textContent = text;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── PDF handling ──────────────────────────────────────────────────────────────

const pdfInput    = document.getElementById('pdfInput');
const dropZone    = document.getElementById('dropZone');
const pdfFilename = document.getElementById('pdfFilename');

pdfInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handlePdfFile(e.target.files[0]);
});

['dragover', 'dragenter'].forEach(evt =>
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('drag'); })
);
['dragleave', 'drop'].forEach(evt =>
  dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('drag'); })
);
dropZone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files[0];
  if (file && file.type === 'application/pdf') handlePdfFile(file);
});

async function handlePdfFile(file) {
  pdfFilename.textContent = `Читаю: ${file.name}...`;
  clearLog();
  setStatus('Извлекаю текст из PDF...');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let lines = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const rows = {};
      content.items.forEach(item => {
        const y = Math.round(item.transform[5]);
        if (!rows[y]) rows[y] = [];
        rows[y].push(item.str);
      });
      const pageLines = Object.keys(rows)
        .sort((a, b) => b - a)
        .map(y => rows[y].join(' ').replace(/\s+/g, ' ').trim())
        .filter(l => l.length > 0);
      lines = lines.concat(pageLines);
    }

    const names = cleanNames(lines);
    pdfFilename.textContent = `${file.name} — найдено строк: ${names.length}`;
    document.getElementById('names').value = names.join('\n');
    setStatus(`Извлечено ${names.length} имён из PDF. Проверь список перед отправкой.`);
    if (names.length === 0)
      log('Не удалось распознать ни одного имени. PDF может быть скан-картинкой. Вставь список вручную.', 'err');
  } catch (err) {
    pdfFilename.textContent = 'Ошибка чтения PDF';
    setStatus('Не удалось прочитать PDF');
    log(`✗ Ошибка при чтении PDF: ${err.message}`, 'err');
  }
}

function cleanNames(lines) {
  const HEADERS = ['аты-жөнү', 'аты жөнү', 'фио', 'ф.и.о', 'имя', 'список'];
  return lines
    .map(l => l.trim())
    .map(l => l.replace(/^\d+[\.\)]\s*/, ''))
    .map(l => { const m = l.match(/[0-9+(✅]/); return m ? l.slice(0, m.index) : l; })
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l.length > 1)
    .filter(l => !/^\d+$/.test(l))
    .filter(l => /[a-zA-Zа-яА-ЯёЁ]/.test(l))
    .filter(l => !HEADERS.includes(l.toLowerCase()));
}

// ── Submit ────────────────────────────────────────────────────────────────────

async function addStudents() {
  if (!getToken()) {
    setStatus('Сначала введи и сохрани токен!');
    return;
  }
  const group_id = getSelectedGroupId();
  if (!group_id) {
    setStatus('Выбери группу перед добавлением!');
    return;
  }

  const raw = document.getElementById('names').value;
  const names = cleanNames(raw.split('\n').map(s => s.trim()).filter(s => s.length > 0));

  if (names.length === 0) { setStatus('Нет имён для добавления'); return; }

  const btn = document.getElementById('addBtn');
  btn.disabled = true;
  clearLog();
  setStatus(`Добавляю ${names.length} учеников в группу ${group_id}...`);

  let ok = 0, fail = 0;

  for (let i = 0; i < names.length; i++) {
    const full_name = names[i];
    setStatus(`Добавляю ${i + 1} / ${names.length}: ${full_name}`);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { ...authHeaders(), 'content-type': 'application/json' },
        body: JSON.stringify({ full_name, group_id })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201) { log(`✓ ${full_name} → id ${data.id}`, 'ok'); ok++; }
      else { log(`✗ ${full_name} → ${res.status} ${JSON.stringify(data)}`, 'err'); fail++; }
    } catch (e) {
      log(`✗ ${full_name} → ошибка сети: ${e.message}`, 'err'); fail++;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  setStatus(`Готово: успешно ${ok}, ошибок ${fail}`);
  btn.disabled = false;
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Sync card highlight when select changes
  document.getElementById('groupSelect').addEventListener('change', (e) => {
    const id = e.target.value;
    document.querySelectorAll('.group-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.id == id);
    });
  });

  initToken();
});
