// Minimal PWA - Zero-knowledge encryption using Web Crypto API

class ZerokVault {
  constructor() {
    this.key = null;
    this.salt = null;
    this.files = [];
  }

  // Derive key from password using PBKDF2
  async deriveKey(password, salt = null) {
    const enc = new TextEncoder();
    const pw = enc.encode(password);
    const km = await crypto.subtle.importKey('raw', pw, 'PBKDF2', false, ['deriveKey']);
    if (!salt) {
      salt = crypto.getRandomValues(new Uint8Array(16));
    }
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
    return { key, salt };
  }

  // Encrypt data using AES-GCM
  async encrypt(data) {
    if (!this.key) throw new Error('Locked');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv }, this.key, data
    );
    const r = new Uint8Array(iv.length + enc.byteLength);
    r.set(iv, 0);
    r.set(new Uint8Array(enc), iv.length);
    return r;
  }

  // Decrypt data using AES-GCM
  async decrypt(data) {
    if (!this.key) throw new Error('Locked');
    const iv = data.slice(0, 12);
    const ct = data.slice(12);
    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv }, this.key, ct
    );
  }

  // Get deterministic hash for blob ID
  async hash(data) {
    const hb = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hb)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Add and encrypt file
  async addFile(file) {
    const data = await file.arrayBuffer();
    const encrypted = await this.encrypt(data);
    const id = await this.hash(encrypted);
    this.files.push({ name: file.name, size: file.size, id, date: new Date().toISOString() });
    return id;
  }

  // Setup new vault
  async setup(password) {
    if (password.length < 8) throw new Error('Password min 8 chars');
    const { key, salt } = await this.deriveKey(password);
    this.key = key;
    this.salt = salt;
    localStorage.setItem('zerok_salt', Array.from(salt).join(','));
    return true;
  }

  // Unlock existing vault
  async unlock(password) {
    const saltStr = localStorage.getItem('zerok_salt');
    if (!saltStr) throw new Error('No vault - initialize first');
    const salt = new Uint8Array(saltStr.split(',').map(Number));
    const { key } = await this.deriveKey(password, salt);
    this.key = key;
    return true;
  }
}

const vault = new ZerokVault();
let unlocked = false;

// UI Elements
const auth = document.getElementById('auth');
const vaultSec = document.getElementById('vault');
const pass = document.getElementById('password');
const unlockBtn = document.getElementById('unlock');
const err = document.getElementById('error');
const drop = document.getElementById('dropzone');
const fileIn = document.getElementById('fileinput');
const list = document.getElementById('filelist');

// Unlock
unlockBtn.addEventListener('click', async () => {
  try {
    if (!localStorage.getItem('zerok_salt')) {
      await vault.setup(pass.value);
    } else {
      await vault.unlock(pass.value);
    }
    unlocked = true;
    auth.classList.add('hidden');
    vaultSec.classList.remove('hidden');
    pass.value = '';
    err.textContent = '';
  } catch (e) {
    err.textContent = e.message;
  }
});

pass.addEventListener('keypress', e => { if (e.key === 'Enter') unlockBtn.click(); });

// File handling
drop.addEventListener('click', () => fileIn.click());
drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
drop.addEventListener('drop', async e => {
  e.preventDefault();
  drop.classList.remove('dragover');
  if (!unlocked) return;
  for (const f of e.dataTransfer.files) await process(f);
});
fileIn.addEventListener('change', async () => {
  if (!unlocked) return;
  for (const f of fileIn.files) await process(f);
  fileIn.value = '';
});

async function process(file) {
  const id = await vault.addFile(file);
  const li = document.createElement('li');
  li.innerHTML = `<span>${file.name}</span><small>${format(file.size)} • ${id.slice(0, 8)}...</small>`;
  list.appendChild(li);
}

function format(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// Check if vault exists
if (localStorage.getItem('zerok_salt')) {
  pass.placeholder = 'Enter password to unlock';
}