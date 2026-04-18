/**
 * Zerok Vault - Fort Knox Storage Architecture
 * Zero-knowledge, zero-trust, minimal footprint
 * 
 * Phase 1: Fort Knox Storage + Vault Auth
 * Phase 2: File Manager Views
 * Phase 3: Analytics
 */

(function() {
  'use strict';

  const CONFIG = {
    PBKDF2_ITERATIONS: 600000,
    SALT_BYTES: 32,
    NONCE_BYTES: 12,
    KEY_BITS: 256,
    DB_NAME: 'zerok-vault',
    OPFS_NAME: 'zerok-opfs'
  };

  class FortKnoxStorage {
    constructor() {
      this.opfsRoot = null;
      this.idb = null;
      this.initialized = false;
    }

    async init() {
      if (this.initialized) return;
      
      try {
        if ('storage' in navigator && 'getDirectory' in navigator.storage) {
          this.opfsRoot = await navigator.storage.getDirectory();
          await this.requestPersistence();
        }
      } catch (e) {
        console.warn('OPFS not available, using IndexedDB');
      }
      
      await this.initIndexedDB();
      this.initialized = true;
    }

    async requestPersistence() {
      if (navigator.storage && navigator.storage.persist) {
        const persistent = await navigator.storage.persist();
        if (!persistent) {
          console.warn('Storage not persistent, may be auto-deleted');
        }
      }
    }

    async initIndexedDB() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.DB_NAME, 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          this.idb = request.result;
          resolve();
        };
        
        request.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('vaults')) {
            db.createObjectStore('vaults', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('files')) {
            db.createObjectStore('files', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains('meta')) {
            db.createObjectStore('meta', { keyPath: 'key' });
          }
        };
      });
    }

    async saveVault(vault) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('vaults', 'readwrite');
        const store = tx.objectStore('vaults');
        const request = store.put(vault);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async getVault(id) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('vaults', 'readonly');
        const store = tx.objectStore('vaults');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async listVaults() {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('vaults', 'readonly');
        const store = tx.objectStore('vaults');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    }

    async deleteVault(id) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('vaults', 'readwrite');
        const store = tx.objectStore('vaults');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async saveFile(file) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const request = store.put(file);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async listFiles(vaultId) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const request = store.getAll();
        request.onsuccess = () => {
          const files = (request.result || []).filter(f => f.vaultId === vaultId);
          resolve(files);
        };
        request.onerror = () => reject(request.error);
      });
    }

    async deleteFile(id) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('files', 'readwrite');
        const store = tx.objectStore('files');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async saveMeta(key, value) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('meta', 'readwrite');
        const store = tx.objectStore('meta');
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async getMeta(key) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('meta', 'readonly');
        const store = tx.objectStore('meta');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
      });
    }
  }

  class CryptoEngine {
    constructor() {
      this.key = null;
      this.salt = null;
    }

    async deriveKey(password, salt) {
      const encoder = new TextEncoder();
      const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
      );
      
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: CONFIG.PBKDF2_ITERATIONS,
          hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: CONFIG.KEY_BITS },
        false,
        ['encrypt', 'decrypt']
      );
    }

    generateSalt() {
      return crypto.getRandomValues(new Uint8Array(CONFIG.SALT_BYTES));
    }

    generateNonce() {
      return crypto.getRandomValues(new Uint8Array(CONFIG.NONCE_BYTES));
    }

    async encrypt(plaintext) {
      if (!this.key) throw new Error('No key');
      
      const encoder = new TextEncoder();
      const nonce = this.generateNonce();
      const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        this.key,
        encoder.encode(plaintext)
      );
      
      return this.bufferToBase64(nonce) + ':' + this.bufferToBase64(ciphertext);
    }

    async decrypt(encrypted) {
      if (!this.key) throw new Error('No key');
      
      const [nonceB64, dataB64] = encrypted.split(':');
      const nonce = this.base64ToBuffer(nonceB64);
      const data = this.base64ToBuffer(dataB64);
      
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: nonce },
        this.key,
        data
      );
      
      return new TextDecoder().decode(plaintext);
    }

    bufferToBase64(buffer) {
      const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }

    base64ToBuffer(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    }

    vaultDNA(vault, password) {
      const data = vault.id + vault.username + password + (vault.salt || '');
      return this.sha256(data);
    }

    async sha256(data) {
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
      return this.bufferToBase64(hashBuffer);
    }
  }

  class VaultApp {
    constructor() {
      this.storage = new FortKnoxStorage();
      this.crypto = new CryptoEngine();
      this.currentVault = null;
      this.viewMode = 'grid';
      this.files = [];
    }

    async init() {
      await this.storage.init();
      await this.render();
      this.bindEvents();
    }

    async render() {
      const app = document.getElementById('app');
      if (!app) return;

      const vaults = await this.storage.listVaults();
      
      if (!vaults.length) {
        app.innerHTML = this.renderWelcome();
      } else {
        app.innerHTML = this.renderLogin();
        await this.populateVaultSelect(vaults);
      }
    }

    async populateVaultSelect(vaults) {
      const select = document.getElementById('vault-select');
      if (!select) return;
      
      select.innerHTML = '<option value="">Choose vault...</option>';
      vaults.forEach(vault => {
        const option = document.createElement('option');
        option.value = vault.id;
        option.textContent = vault.username;
        select.appendChild(option);
      });
    }

    renderWelcome() {
      return `
        <section id="welcome" class="card">
          <h2>Welcome to Zerok</h2>
          <p class="tagline">Zero-knowledge encrypted vault</p>
          
          <div class="form-group">
            <label for="username">Username</label>
            <input type="text" id="username" placeholder="Your vault name" autocomplete="off">
          </div>
          
          <div class="form-group">
            <label for="password">Master Password</label>
            <input type="password" id="password" placeholder="Min 12 characters" minlength="12">
          </div>
          
          <div class="form-group">
            <label for="confirm">Confirm Password</label>
            <input type="password" id="confirm" placeholder="Confirm password" minlength="12">
          </div>
          
          <button id="create-vault" class="btn-primary">Create Vault</button>
          <p class="error" id="error"></p>
        </section>
      `;
    }

    renderLogin() {
      return `
        <section id="login" class="card">
          <h2>Unlock Vault</h2>
          
          <div class="form-group">
            <label for="vault-select">Select Vault</label>
            <select id="vault-select">
              <option value="">Choose vault...</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="vault-username">Or enter username</label>
            <input type="text" id="vault-username" placeholder="Vault username" autocomplete="off">
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" placeholder="Enter password" minlength="12">
          </div>
          
          <button id="unlock-vault" class="btn-primary">Unlock</button>
          <button id="delete-vault" class="btn-danger">Delete Vault</button>
          <button id="new-vault" class="btn-secondary">Create New Vault</button>
          <p class="error" id="error"></p>
        </section>
      `;
    }

    renderVault() {
      return `
        <header class="vault-header">
          <h1>Zerok Vault</h1>
          <div class="vault-info">
            <span class="vault-name">${this.currentVault.username}</span>
            <button id="lock-vault" class="btn-small">Lock</button>
          </div>
        </header>
        
        <nav class="vault-nav">
          <button class="view-btn active" data-view="grid">Grid</button>
          <button class="view-btn" data-view="list">List</button>
          <button class="view-btn" data-view="details">Details</button>
          <button class="view-btn" data-view="analytics">Analytics</button>
        </nav>
        
        <section id="file-manager" class="file-manager">
          <div class="toolbar">
            <div class="dropzone" id="dropzone">
              <span>+ Add Files</span>
              <input type="file" id="file-input" multiple hidden>
            </div>
            <input type="search" id="search" placeholder="Search files...">
          </div>
          
          <div id="file-list" class="file-list view-${this.viewMode}">
            ${this.renderFiles()}
          </div>
        </section>
        
        <footer class="vault-footer">
          <span id="storage-usage">0 KB used</span>
          <span id="file-count">0 files</span>
        </footer>
      `;
    }

    renderFiles() {
      if (!this.files.length) {
        return '<div class="empty-state"><p>No files yet</p><p>Drop files to encrypt</p></div>';
      }
      
      if (this.viewMode === 'grid') {
        return this.files.map(f => `
          <div class="file-card" data-id="${f.id}">
            <div class="file-icon">${this.getFileIcon(f.type)}</div>
            <div class="file-name">${f.name}</div>
            <div class="file-size">${this.formatSize(f.size)}</div>
          </div>
        `).join('');
      }
      
      return this.files.map(f => `
        <div class="file-row" data-id="${f.id}">
          <span class="file-icon">${this.getFileIcon(f.type)}</span>
          <span class="file-name">${f.name}</span>
          <span class="file-size">${this.formatSize(f.size)}</span>
          <span class="file-date">${new Date(f.created).toLocaleDateString()}</span>
        </div>
      `).join('');
    }

    renderAnalytics() {
      const total = this.files.reduce((sum, f) => sum + f.size, 0);
      const byType = this.files.reduce((acc, f) => {
        const type = f.type.split('/')[0] || 'other';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      return `
        <section id="analytics" class="card analytics">
          <h2>Vault Analytics</h2>
          
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-value">${this.files.length}</div>
              <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.formatSize(total)}</div>
              <div class="stat-label">Storage Used</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${this.currentVault.username}</div>
              <div class="stat-label">Vault Name</div>
            </div>
          </div>
          
          <h3>By Type</h3>
          <div class="type-distribution">
            ${Object.entries(byType).map(([type, count]) => `
              <div class="type-row">
                <span class="type-name">${type}</span>
                <div class="type-bar" style="width: ${(count / this.files.length) * 100}%"></div>
                <span class="type-count">${count}</span>
              </div>
            `).join('')}
          </div>
        </section>
      `;
    }

    getFileIcon(mimeType) {
      if (!mimeType) return '📄';
      if (mimeType.startsWith('image/')) return '🖼️';
      if (mimeType.startsWith('video/')) return '🎬';
      if (mimeType.startsWith('audio/')) return '🎵';
      if (mimeType.includes('pdf')) return '📕';
      if (mimeType.includes('zip') || mimeType.includes('tar')) return '📦';
      if (mimeType.includes('text')) return '📝';
      return '📄';
    }

    formatSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
      return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    }

    bindEvents() {
      document.addEventListener('click', async (e) => {
        if (e.target.id === 'create-vault') {
          await this.createVault();
        }
        if (e.target.id === 'unlock-vault') {
          await this.unlockVault();
        }
        if (e.target.id === 'lock-vault') {
          await this.lockVault();
        }
        if (e.target.id === 'delete-vault') {
          await this.deleteVault();
        }
        if (e.target.id === 'new-vault') {
          const app = document.getElementById('app');
          app.innerHTML = this.renderWelcome();
          this.bindEvents();
        }
        if (e.target.classList.contains('view-btn')) {
          this.viewMode = e.target.dataset.view;
          this.updateView();
        }
        if (e.target.closest('.dropzone')) {
          document.getElementById('file-input').click();
        }
        if (e.target.classList.contains('file-card') || e.target.classList.contains('file-row')) {
          const id = e.target.closest('[data-id]')?.dataset.id;
          if (id) this.downloadFile(id);
        }
      });

      document.addEventListener('change', async (e) => {
        if (e.target.id === 'file-input' && e.target.files) {
          for (const file of e.target.files) {
            await this.encryptFile(file);
          }
        }
        if (e.target.id === 'vault-select') {
          await this.loadVaultFiles();
        }
      });

      const dropzone = document.getElementById('dropzone');
      if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
          e.preventDefault();
          dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => {
          dropzone.classList.remove('dragover');
        });
        dropzone.addEventListener('drop', async (e) => {
          e.preventDefault();
          dropzone.classList.remove('dragover');
          for (const file of e.dataTransfer.files) {
            await this.encryptFile(file);
          }
        });
      }
    }

    async createVault() {
      const username = document.getElementById('username')?.value;
      const password = document.getElementById('password')?.value;
      const confirm = document.getElementById('confirm')?.value;
      const error = document.getElementById('error');

      if (!username || username.length < 3) {
        error.textContent = 'Username must be at least 3 characters';
        return;
      }
      if (!password || password.length < 12) {
        error.textContent = 'Password must be at least 12 characters';
        return;
      }
      if (password !== confirm) {
        error.textContent = 'Passwords do not match';
        return;
      }

      const salt = this.crypto.generateSalt();
      this.crypto.key = await this.crypto.deriveKey(password, salt);
      
      const vault = {
        id: crypto.randomUUID(),
        username,
        salt: this.crypto.bufferToBase64(salt),
        verifier: await this.crypto.encrypt('ZEROK_CANARY'),
        created: Date.now()
      };

      await this.storage.saveVault(vault);
      await this.storage.saveMeta('current-vault', vault.id);
      
      this.currentVault = vault;
      this.showVault();
    }

    async unlockVault() {
      let vaultId = document.getElementById('vault-select')?.value;
      const usernameInput = document.getElementById('vault-username')?.value;
      const password = document.getElementById('password')?.value;
      const error = document.getElementById('error');

      if (!password) {
        error.textContent = 'Enter password';
        return;
      }

      if (!vaultId && usernameInput) {
        const vaults = await this.storage.listVaults();
        const vaultByName = vaults.find(v => v.username.toLowerCase() === usernameInput.toLowerCase());
        if (vaultByName) {
          vaultId = vaultByName.id;
        }
      }

      if (!vaultId) {
        error.textContent = 'Select vault or enter username';
        return;
      }

      const vault = await this.storage.getVault(vaultId);
      if (!vault) {
        error.textContent = 'Vault not found';
        return;
      }

      const salt = this.crypto.base64ToBuffer(vault.salt);
      this.crypto.key = await this.crypto.deriveKey(password, salt);

      try {
        await this.crypto.decrypt(vault.verifier);
      } catch (e) {
        error.textContent = 'Invalid password';
        this.crypto.key = null;
        return;
      }

      this.currentVault = vault;
      await this.storage.saveMeta('current-vault', vault.id);
      await this.loadVaultFiles();
      this.showVault();
    }

    async lockVault() {
      this.crypto.key = null;
      this.currentVault = null;
      this.files = [];
      await this.render();
    }

    async deleteVault() {
      let vaultId = document.getElementById('vault-select')?.value;
      const usernameInput = document.getElementById('vault-username')?.value;

      if (!vaultId && usernameInput) {
        const vaults = await this.storage.listVaults();
        const vaultByName = vaults.find(v => v.username.toLowerCase() === usernameInput.toLowerCase());
        if (vaultByName) {
          vaultId = vaultByName.id;
        }
      }

      if (!vaultId || !confirm('Delete this vault? All files will be lost forever.')) return;

      await this.storage.deleteVault(vaultId);
      await this.render();
    }

    async loadVaultFiles() {
      if (!this.currentVault) return;
      this.files = await this.storage.listFiles(this.currentVault.id);
      this.updateFooter();
    }

    async encryptFile(file) {
      if (!this.currentVault || !this.crypto.key) return;

      const arrayBuffer = await file.arrayBuffer();
      const encrypted = await this.crypto.encrypt(
        this.crypto.bufferToBase64(new Uint8Array(arrayBuffer))
      );

      const fileRecord = {
        id: crypto.randomUUID(),
        vaultId: this.currentVault.id,
        name: file.name,
        type: file.type,
        size: file.size,
        encrypted,
        created: Date.now()
      };

      await this.storage.saveFile(fileRecord);
      await this.loadVaultFiles();
      this.updateView();
    }

    async downloadFile(id) {
      const file = this.files.find(f => f.id === id);
      if (!file) return;

      const decrypted = await this.crypto.decrypt(file.encrypted);
      const data = this.crypto.base64ToBuffer(decrypted);
      
      const blob = new Blob([data], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      
      URL.revokeObjectURL(url);
    }

    showVault() {
      const app = document.getElementById('app');
      if (app) {
        app.innerHTML = this.renderVault();
        this.bindEvents();
      }
    }

    updateView() {
      const fileList = document.getElementById('file-list');
      if (fileList) {
        if (this.viewMode === 'analytics') {
          fileList.innerHTML = this.renderAnalytics();
        } else {
          fileList.className = `file-list view-${this.viewMode}`;
          fileList.innerHTML = this.renderFiles();
        }
      }
      
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === this.viewMode);
      });
    }

    updateFooter() {
      const total = this.files.reduce((sum, f) => sum + f.size, 0);
      const usage = document.getElementById('storage-usage');
      const count = document.getElementById('file-count');
      if (usage) usage.textContent = this.formatSize(total) + ' used';
      if (count) count.textContent = this.files.length + ' files';
    }
  }

  const app = new VaultApp();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }

  window.zerok = app;
})();