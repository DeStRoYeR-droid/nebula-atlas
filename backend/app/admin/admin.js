// Nebula Atlas admin: a tiny, dependency-free client for the local FastAPI app.
// All DOM is built with textContent / properties (never innerHTML with data).

const $ = (selector, root = document) => root.querySelector(selector);

const state = { nebulae: [], editing: null };

const rows = $('#rows');
const statusEl = $('#status');
const dialog = $('#editor');
const form = $('#form');
const formErrors = $('#form-errors');
const imageTools = $('#image-tools');
const preview = $('#image-preview');

const FIELDS = [
  'id', 'name', 'catalog', 'nickname', 'type', 'constellation', 'distance', 'size',
  'description', 'facts', 'image_alt', 'credits', 'source_url', 'source_page',
];

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------
async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, options);
  if (response.status === 204) return null;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(describeError(body.detail) || `Request failed (${response.status})`);
    error.detail = body.detail;
    throw error;
  }
  return body;
}

function describeError(detail) {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => `${(d.loc || []).slice(1).join('.') || 'request'}: ${d.msg}`).join('\n');
  }
  return JSON.stringify(detail);
}

function announce(message, tone = 'info') {
  statusEl.textContent = message;
  statusEl.className = `mb-4 min-h-6 text-sm ${tone === 'error' ? 'text-red-300' : 'text-emerald-300'}`;
}

// ---------------------------------------------------------------------------
// Table
// ---------------------------------------------------------------------------
function thumbnail(nebula) {
  if (!nebula.image) {
    const span = document.createElement('span');
    span.className = 'inline-flex h-12 w-16 items-center justify-center rounded-md bg-white/5 text-xs text-slate-500';
    span.textContent = 'No image';
    return span;
  }
  const img = document.createElement('img');
  img.src = `/site/${nebula.image_path}/${nebula.image.widths[0]}.webp?v=${Date.now()}`;
  img.alt = '';
  img.width = 64;
  img.height = 48;
  img.loading = 'lazy';
  img.className = 'h-12 w-16 rounded-md object-cover';
  img.style.backgroundColor = nebula.image.color;
  return img;
}

function cell(content, className = 'px-4 py-3') {
  const td = document.createElement('td');
  td.className = className;
  if (content instanceof Node) td.append(content);
  else td.textContent = content;
  return td;
}

function button(label, className, onClick, ariaLabel) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = className;
  el.textContent = label;
  if (ariaLabel) el.setAttribute('aria-label', ariaLabel);
  el.addEventListener('click', onClick);
  return el;
}

function renderRows() {
  rows.replaceChildren();
  if (state.nebulae.length === 0) {
    const tr = document.createElement('tr');
    tr.append(cell('No nebulae yet. Use “New nebula” to add the first one.', 'px-4 py-8 text-center text-slate-400'));
    tr.firstChild.colSpan = 5;
    rows.append(tr);
    return;
  }
  for (const nebula of state.nebulae) {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-white/5';

    const name = document.createElement('div');
    const strong = document.createElement('strong');
    strong.className = 'font-medium';
    strong.textContent = nebula.name;
    const id = document.createElement('div');
    id.className = 'text-xs text-slate-400';
    id.textContent = [nebula.id, nebula.catalog].filter(Boolean).join(' · ');
    name.append(strong, id);

    const actions = document.createElement('div');
    actions.className = 'flex justify-end gap-2';
    actions.append(
      button('Edit', 'btn-secondary', () => openEditor(nebula), `Edit ${nebula.name}`),
      button('Delete', 'btn-danger', () => remove(nebula), `Delete ${nebula.name}`),
    );

    tr.append(cell(thumbnail(nebula)), cell(name), cell(nebula.type), cell(nebula.constellation), cell(actions));
    rows.append(tr);
  }
}

async function refresh() {
  try {
    state.nebulae = await api('/nebulae');
    renderRows();
  } catch (error) {
    rows.replaceChildren(cell(`Could not load nebulae: ${error.message}`, 'px-4 py-8 text-center text-red-300'));
    rows.firstChild.colSpan = 5;
  }
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
function openEditor(nebula = null) {
  state.editing = nebula;
  form.reset();
  formErrors.classList.add('hidden');
  $('#editor-title').textContent = nebula ? `Edit ${nebula.name}` : 'New nebula';

  const idInput = form.elements.id;
  idInput.readOnly = Boolean(nebula);
  idInput.classList.toggle('opacity-60', Boolean(nebula));

  if (nebula) {
    for (const field of FIELDS) {
      const value = nebula[field];
      form.elements[field].value = field === 'facts' ? (value || []).join('\n') : value ?? '';
    }
  }
  imageTools.classList.toggle('hidden', !nebula);
  updatePreview(nebula);
  dialog.showModal();
  form.elements.name.focus();
}

function updatePreview(nebula) {
  const hasImage = Boolean(nebula?.image);
  preview.classList.toggle('hidden', !hasImage);
  if (hasImage) {
    preview.src = `/site/${nebula.image_path}/${nebula.image.widths[0]}.webp?v=${Date.now()}`;
    preview.alt = nebula.image_alt;
  }
}

function readForm() {
  const data = {};
  for (const field of FIELDS) {
    const raw = form.elements[field].value.trim();
    if (field === 'facts') data.facts = raw ? raw.split('\n').map((l) => l.trim()).filter(Boolean) : [];
    else if (field === 'distance') data.distance = raw === '' ? null : Number(raw);
    else data[field] = raw === '' ? null : raw;
  }
  return data;
}

function showFormErrors(error) {
  formErrors.textContent = error.message;
  formErrors.classList.remove('hidden');
  formErrors.scrollIntoView({ block: 'nearest' });
}

async function save(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const payload = readForm();
  try {
    const saved = state.editing
      ? await api(`/nebulae/${encodeURIComponent(state.editing.id)}`, jsonRequest('PUT', payload))
      : await api('/nebulae', jsonRequest('POST', payload));
    dialog.close();
    announce(`Saved ${saved.name}.`);
    await refresh();
  } catch (error) {
    showFormErrors(error);
  }
}

function jsonRequest(method, payload) {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
}

async function remove(nebula) {
  if (!window.confirm(`Delete ${nebula.name}? Its generated images are removed too.`)) return;
  try {
    await api(`/nebulae/${encodeURIComponent(nebula.id)}`, { method: 'DELETE' });
    announce(`Deleted ${nebula.name}.`);
    await refresh();
  } catch (error) {
    announce(error.message, 'error');
  }
}

async function runImageAction(buttonEl, request) {
  const nebula = state.editing;
  if (!nebula) return;
  const original = buttonEl.textContent;
  buttonEl.disabled = true;
  buttonEl.textContent = 'Working…';
  try {
    const updated = await request(nebula);
    state.editing = updated;
    updatePreview(updated);
    announce(`Images built for ${updated.name}.`);
    await refresh();
  } catch (error) {
    showFormErrors(error);
  } finally {
    buttonEl.disabled = false;
    buttonEl.textContent = original;
  }
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
async function init() {
  try {
    const meta = await api('/meta');
    $('#data-file').textContent = meta.data_file;
    const select = form.elements.type;
    for (const type of meta.types) select.append(new Option(type, type));
  } catch (error) {
    announce(`API unavailable: ${error.message}`, 'error');
  }

  $('#new-button').addEventListener('click', () => openEditor());
  form.addEventListener('submit', save);
  for (const el of document.querySelectorAll('[data-close]')) el.addEventListener('click', () => dialog.close());

  $('#upload-button').addEventListener('click', (event) => {
    const file = $('#image-file').files[0];
    if (!file) {
      showFormErrors(new Error('Choose an image file first.'));
      return;
    }
    runImageAction(event.currentTarget, (nebula) => {
      const body = new FormData();
      body.append('file', file);
      return api(`/nebulae/${encodeURIComponent(nebula.id)}/image`, { method: 'POST', body });
    });
  });

  $('#fetch-button').addEventListener('click', (event) => {
    runImageAction(event.currentTarget, (nebula) =>
      api(`/nebulae/${encodeURIComponent(nebula.id)}/image/fetch`, { method: 'POST' }),
    );
  });

  await refresh();
}

init();
