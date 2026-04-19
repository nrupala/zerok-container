/**
 * Zerok Vault - Fort Knox Storage Architecture
 * Zero-knowledge, zero-trust, minimal footprint
 * 
 * Features:
 * - Vault Auth: Create, Unlock, Delete, Lock
 * - File Operations: Upload, Download, Delete, Rename, Replace, Remove
 * - File Types: Filter by MIME type (image, video, audio, document, etc.)
 * - Gallery View: Masonry grid for images/videos
 * - Folders: Create, navigate, move files
 * - Albums: Create, manage photo/album collections
 * - Analytics: Vault performance metrics (separate panel)
 * - Auto-migration: Schema upgrades automatically
 */

(function() {
  'use strict';

  const CONFIG = {
    DEBUG: false,
    PBKDF2_ITERATIONS: 600000,
    SALT_BYTES: 32,
    NONCE_BYTES: 12,
    KEY_BITS: 256,
    DB_NAME: 'zerok-vault',
    OPFS_NAME: 'zerok-opfs',
    MAX_VAULT_SIZE: 50 * 1024 * 1024 * 1024, // 50GB default, can be changed in settings
    SCHEMA_VERSION: 3
  };

  function debugLog(...args) {
    if (CONFIG.DEBUG) console.log('[Zerok]', ...args);
  }

  const MIGRATIONS = {
    1: async (db) => {
      // Initial schema - all stores created in onupgradeneeded
    },
    2: async (db) => {
      // v2: Added folders and albums stores
    },
    3: async (db) => {
      // v3: Added trash store for deleted files
    }
  };

  const MIME_CATEGORIES = {
    image: { label: 'Images', icon: '🖼️', types: ['image/'] },
    video: { label: 'Videos', icon: '🎬', types: ['video/'] },
    audio: { label: 'Audio', icon: '🎵', types: ['audio/'] },
    document: { label: 'Documents', icon: '📄', types: ['application/pdf', 'application/msword', 'application/vnd.', 'text/'] },
    archive: { label: 'Archives', icon: '📦', types: ['application/zip', 'application/x-rar', 'application/x-tar', 'application/x-gzip'] }
  };

  class FortKnoxStorage {
    constructor() {
      this.opfsRoot = null;
      this.idb = null;
      this.initialized = false;
    }

    async init() {
      if (this.initialized) {
        debugLog('Storage: Already initialized');
        return;
      }
      
      debugLog('Storage: Starting init...');
      
      debugLog('Storage: Skipping OPFS, using IndexedDB only...');
      
      debugLog('Storage: Initializing IndexedDB...');
      await this.initIndexedDB();
      debugLog('Storage: IndexedDB ready');
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
      debugLog('IDB: Checking IndexedDB support...');
      
      if (!window.indexedDB) {
        throw new Error('IndexedDB not supported by this browser');
      }
      
      debugLog('IDB: Opening database...');
      
      const openRequest = indexedDB.open(CONFIG.DB_NAME, CONFIG.SCHEMA_VERSION);
      
      openRequest.onerror = () => {
        debugLog('IDB: Error opening database:', openRequest.error);
        throw new Error('Cannot open IndexedDB: ' + openRequest.error.message);
      };
      
      openRequest.onupgradeneeded = (e) => {
        debugLog('IDB: onupgradeneeded fired, version:', e.oldVersion, '->', e.newVersion);
        const db = e.target.result;
        debugLog('IDB: Creating schema v' + CONFIG.SCHEMA_VERSION);
        
        if (!db.objectStoreNames.contains('vaults')) {
          db.createObjectStore('vaults', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files')) {
          const fileStore = db.createObjectStore('files', { keyPath: 'id' });
          fileStore.createIndex('vaultId', 'vaultId', { unique: false });
          fileStore.createIndex('folderId', 'folderId', { unique: false });
          fileStore.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains('meta')) {
          db.createObjectStore('meta', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('albums')) {
          db.createObjectStore('albums', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('trash')) {
          db.createObjectStore('trash', { keyPath: 'id' });
        }
        debugLog('IDB: Schema created');
      };
      
      debugLog('IDB: Awaiting Promise...');
      
      try {
        const db = await Promise.race([
          new Promise((resolve, reject) => {
            openRequest.onsuccess = () => {
              debugLog('IDB: onsuccess fired');
              resolve(openRequest.result);
            };
            openRequest.onerror = () => reject(openRequest.error);
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('IDB timeout - database blocked')), 5000)
          )
        ]);
        
        debugLog('IDB: Got database reference');
        this.idb = db;
        
      } catch (e) {
        debugLog('IDB: Error:', e.message);
        
        const confirmed = confirm(
          '⚠️ VAULT RECOVERY REQUIRED\n\n' +
          'Your vault database appears to be corrupted or locked.\n\n' +
          'We will attempt to create a fresh database, but YOUR EXISTING FILES WILL BECOME INACCESSIBLE.\n\n' +
          'This means:\n' +
          '• All encrypted files in your vault will be lost\n' +
          '• Your folder and album structure will be reset\n' +
          '• You will need to create a new vault\n\n' +
          'Before proceeding, consider:\n' +
          '• Closing other tabs that use Zerok\n' +
          '• Clearing your browser cache\n' +
          '• Restarting your browser\n\n' +
          'Click OK to attempt recovery (data loss likely).\n' +
          'Click Cancel to stop and troubleshoot.'
        );
        
        if (!confirmed) {
          throw new Error('Database recovery cancelled by user. Try closing other tabs or restarting browser.');
        }
        
        debugLog('IDB: User confirmed recovery, trying fresh database...');
        
        const freshDBName = CONFIG.DB_NAME + '-fresh-' + Date.now();
        debugLog('IDB: New database name:', freshDBName);
        
        const freshRequest = indexedDB.open(freshDBName, CONFIG.SCHEMA_VERSION);
        
        await new Promise((resolve, reject) => {
          freshRequest.onupgradeneeded = (e) => {
            debugLog('IDB: Fresh database - creating schema');
            const db = e.target.result;
            
            if (!db.objectStoreNames.contains('vaults')) {
              db.createObjectStore('vaults', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('files')) {
              const fileStore = db.createObjectStore('files', { keyPath: 'id' });
              fileStore.createIndex('vaultId', 'vaultId', { unique: false });
              fileStore.createIndex('folderId', 'folderId', { unique: false });
              fileStore.createIndex('type', 'type', { unique: false });
            }
            if (!db.objectStoreNames.contains('meta')) {
              db.createObjectStore('meta', { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains('folders')) {
              db.createObjectStore('folders', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('albums')) {
              db.createObjectStore('albums', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('trash')) {
              db.createObjectStore('trash', { keyPath: 'id' });
            }
          };
          
          freshRequest.onsuccess = () => {
            debugLog('IDB: Fresh database opened successfully');
            this.idb = freshRequest.result;
            resolve();
          };
          freshRequest.onerror = () => reject(freshRequest.error);
        });
      }
      
      try {
        debugLog('IDB: Checking schema version...');
        const tx = this.idb.transaction('meta', 'readonly');
        const store = tx.objectStore('meta');
        
        const savedVersion = await new Promise((res) => {
          const req = store.get('schemaVersion');
          req.onsuccess = () => res(req.result?.value);
          req.onerror = () => res(null);
        });
        
        debugLog('IDB: Saved version:', savedVersion);
        
        const currentVersion = savedVersion ? parseInt(savedVersion) : 1;
        
        if (currentVersion < CONFIG.SCHEMA_VERSION) {
          debugLog('IDB: Migrating from v' + currentVersion + ' to v' + CONFIG.SCHEMA_VERSION);
          for (let v = currentVersion + 1; v <= CONFIG.SCHEMA_VERSION; v++) {
            if (MIGRATIONS[v]) {
              await MIGRATIONS[v](this.idb);
            }
          }
          
          const tx2 = this.idb.transaction('meta', 'readwrite');
          tx2.objectStore('meta').put({ key: 'schemaVersion', value: CONFIG.SCHEMA_VERSION.toString() });
          await new Promise(r => tx2.oncomplete = r);
          debugLog('IDB: Migration complete');
        }
      } catch (e) {
        debugLog('IDB: Migration check:', e.message);
      }
      
      debugLog('Database ready - v' + CONFIG.SCHEMA_VERSION);
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

    async getStorageUsage() {
      return new Promise((resolve) => {
        const tx = this.idb.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const request = store.getAll();
        request.onsuccess = () => {
          const files = request.result || [];
          const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
          resolve({ used: totalSize, fileCount: files.length });
        };
        request.onerror = () => resolve({ used: 0, fileCount: 0 });
      });
    }

    async saveFolder(folder) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('folders', 'readwrite');
        const store = tx.objectStore('folders');
        const request = store.put(folder);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async listFolders(vaultId) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('folders', 'readonly');
        const store = tx.objectStore('folders');
        const request = store.getAll();
        request.onsuccess = () => {
          const folders = (request.result || []).filter(f => f.vaultId === vaultId);
          resolve(folders);
        };
        request.onerror = () => reject(request.error);
      });
    }

    async deleteFolder(id) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('folders', 'readwrite');
        const store = tx.objectStore('folders');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async saveAlbum(album) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('albums', 'readwrite');
        const store = tx.objectStore('albums');
        const request = store.put(album);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async listAlbums(vaultId) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('albums', 'readonly');
        const store = tx.objectStore('albums');
        const request = store.getAll();
        request.onsuccess = () => {
          const albums = (request.result || []).filter(a => a.vaultId === vaultId);
          resolve(albums);
        };
        request.onerror = () => reject(request.error);
      });
    }

    async deleteAlbum(id) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('albums', 'readwrite');
        const store = tx.objectStore('albums');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async moveToTrash(file) {
      const trashItem = {
        ...file,
        deletedAt: Date.now()
      };
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('trash', 'readwrite');
        const store = tx.objectStore('trash');
        const request = store.put(trashItem);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    async listTrash(vaultId) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('trash', 'readonly');
        const store = tx.objectStore('trash');
        const request = store.getAll();
        request.onsuccess = () => {
          const items = (request.result || []).filter(f => f.vaultId === vaultId);
          resolve(items);
        };
        request.onerror = () => reject(request.error);
      });
    }

    async restoreFromTrash(id) {
      const tx = this.idb.transaction('trash', 'readwrite');
      const store = tx.objectStore('trash');
      const item = await new Promise(resolve => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result);
      });
      if (!item) return null;
      
      delete item.deletedAt;
      delete item.id;
      
      const fileTx = this.idb.transaction('files', 'readwrite');
      fileTx.objectStore('files').put(item);
      
      const deleteTx = this.idb.transaction('trash', 'readwrite');
      deleteTx.objectStore('trash').delete(id);
      
      return item;
    }

    async emptyTrash(vaultId) {
      const items = await this.listTrash(vaultId);
      const tx = this.idb.transaction('trash', 'readwrite');
      const store = tx.objectStore('trash');
      for (const item of items) {
        store.delete(item.id);
      }
    }

    async deleteFromTrash(id) {
      return new Promise((resolve, reject) => {
        const tx = this.idb.transaction('trash', 'readwrite');
        const store = tx.objectStore('trash');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
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
      debugLog('deriveKey called, crypto.subtle:', typeof crypto !== 'undefined' ? typeof crypto.subtle : 'no crypto');
      
      if (!crypto.subtle) {
        throw new Error('Web Crypto API not available. Use HTTPS or localhost.');
      }
      
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
      this.currentPage = 'vault';
      this.viewMode = 'grid';
      this.files = [];
      this.folders = [];
      this.albums = [];
      this.trashItems = [];
      this.currentFolder = null;
      this.typeFilter = 'all';
      this.searchQuery = '';
      this.sortBy = 'name-asc';
      this.selectedFile = null;
    }

    async init() {
      debugLog('=== INIT START ===');
      try {
        debugLog('Step 1: Initializing storage...');
        await this.storage.init();
        debugLog('Step 2: Storage ready');
        debugLog('Step 3: Calling render()...');
        await this.render();
        debugLog('Step 4: Render complete');
        debugLog('Step 5: Binding events...');
        this.bindEvents();
        debugLog('=== INIT COMPLETE ===');
      } catch (e) {
        debugLog('INIT ERROR:', e.message, e.stack);
        document.getElementById('app').innerHTML = '<div class="card"><p class="error">Error: ' + e.message + '</p></div>';
      }
    }

    async restoreSession() {
      const savedVaultId = await this.storage.getMeta('current-vault');
      if (savedVaultId) {
        const vault = await this.storage.getVault(savedVaultId);
        if (vault) {
          const password = sessionStorage.getItem('zerok-password');
          if (password) {
            try {
              const salt = this.crypto.base64ToBuffer(vault.salt);
              this.crypto.key = await this.crypto.deriveKey(password, salt);
              await this.crypto.decrypt(vault.verifier);
              this.currentVault = vault;
              await this.loadVaultData();
              debugLog('Session restored for', vault.username);
              return true;
            } catch (e) {
              debugLog('Session expired');
              sessionStorage.removeItem('zerok-password');
            }
          }
        }
      }
      return false;
    }

    async render() {
      debugLog('RENDER: Starting...');
      const app = document.getElementById('app');
      if (!app) {
        debugLog('RENDER: No #app found!');
        return;
      }

      debugLog('RENDER: Attempting session restore...');
      const restored = await this.restoreSession();
      debugLog('RENDER: Session restore result:', restored, this.currentVault ? this.currentVault.username : 'none');
      
      if (restored && this.currentVault) {
        debugLog('RENDER: Rendering vault view...');
        app.innerHTML = this.renderVault();
        debugLog('RENDER: Vault view rendered, binding events...');
        this.bindEvents();
        debugLog('RENDER: Done (session restored)');
        return;
      }

      debugLog('RENDER: No session, listing vaults...');
      const vaults = await this.storage.listVaults();
      debugLog('RENDER: Found vaults:', vaults.length);
      
      if (!vaults.length) {
        debugLog('RENDER: Showing welcome screen');
        app.innerHTML = this.renderWelcome();
      } else {
        debugLog('RENDER: Showing login screen');
        app.innerHTML = this.renderLogin();
        debugLog('RENDER: Populating vault select...');
        await this.populateVaultSelect(vaults);
        debugLog('RENDER: Vault select populated');
      }
      debugLog('RENDER: Done');
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
          <div class="backup-section">
            <button id="restore-backup-login" class="btn-secondary">📥 Restore from Backup</button>
          </div>
          <p class="error" id="error"></p>
        </section>
      `;
    }

    renderVault() {
      const filteredFiles = this.getFilteredFiles();
      const storageInfo = this.getStorageInfo();
      
      return `
        <div class="vault-container">
          <header class="vault-header">
            <div class="header-left">
              <h1>🛡️ Zerok Vault</h1>
              <nav class="page-nav">
                <button class="page-btn ${this.currentPage === 'vault' ? 'active' : ''}" data-page="vault">📁 Files</button>
                <button class="page-btn ${this.currentPage === 'analytics' ? 'active' : ''}" data-page="analytics">📊 Analytics</button>
                <button class="page-btn ${this.currentPage === 'help' ? 'active' : ''}" data-page="help">❓ Help</button>
              </nav>
            </div>
            <div class="header-right">
              <span class="vault-badge">🔐 ${this.currentVault.username}</span>
              <button id="lock-vault" class="btn-icon" title="Lock Vault">🔒</button>
            </div>
          </header>
          
          <div class="vault-main">
            <aside class="vault-sidebar">
              <div class="sidebar-section">
                <h3>📁 Folders</h3>
                <button class="sidebar-btn" id="new-folder">+ New Folder</button>
                <div class="folder-tree">
                  <div class="folder-item ${!this.currentFolder ? 'active' : ''}" data-folder="">
                    📂 All Files
                  </div>
                  ${this.folders.map(f => `
                    <div class="folder-item ${this.currentFolder === f.id ? 'active' : ''}" data-folder="${f.id}">
                      📁 ${this.escapeHtml(f.name)}
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <div class="sidebar-section">
                <h3>🖼️ Albums</h3>
                <button class="sidebar-btn" id="new-album">+ New Album</button>
                <div class="album-list">
                  ${this.albums.map(a => `
                    <div class="album-item" data-album="${a.id}">
                      🎨 ${this.escapeHtml(a.name)} <span class="album-count">${a.fileIds?.length || 0}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
              
              <div class="sidebar-section">
                <h3>🔍 Filter by Type</h3>
                <div class="type-filters">
                  <button class="type-btn ${this.typeFilter === 'all' ? 'active' : ''}" data-type="all">📄 All</button>
                  <button class="type-btn ${this.typeFilter === 'image' ? 'active' : ''}" data-type="image">🖼️ Images</button>
                  <button class="type-btn ${this.typeFilter === 'video' ? 'active' : ''}" data-type="video">🎬 Videos</button>
                  <button class="type-btn ${this.typeFilter === 'audio' ? 'active' : ''}" data-type="audio">🎵 Audio</button>
                  <button class="type-btn ${this.typeFilter === 'document' ? 'active' : ''}" data-type="document">📄 Docs</button>
                  <button class="type-btn ${this.typeFilter === 'archive' ? 'active' : ''}" data-type="archive">📦 Archives</button>
                </div>
              </div>
              
              <div class="sidebar-section">
                <h3>📊 Vault Stats</h3>
                <div class="vault-stats-mini">
                  <div class="stat-row">
                    <span>Files:</span>
                    <span>${this.files.length}</span>
                  </div>
                  <div class="stat-row">
                    <span>Used:</span>
                    <span>${storageInfo.used}</span>
                  </div>
                  <div class="stat-row">
                    <span>Max:</span>
                    <span>${storageInfo.max}</span>
                  </div>
                  <div class="storage-bar">
                    <div class="storage-fill" style="width: ${storageInfo.percent}%"></div>
                  </div>
                </div>
              </div>
              
              <div class="sidebar-section">
                <h3>💾 Backup</h3>
                <button class="sidebar-btn" id="backup-vault">📦 Backup Now</button>
                <button class="sidebar-btn" id="restore-backup">📥 Restore</button>
                <div class="backup-settings">
                  <label class="backup-toggle">
                    <input type="checkbox" id="auto-backup-add" ${this.currentVault.settings?.autoBackupOnAdd ? 'checked' : ''}>
                    <span>Auto-backup on file add</span>
                  </label>
                  <label class="backup-toggle">
                    <input type="checkbox" id="auto-backup-lock" ${this.currentVault.settings?.autoBackupOnLock !== false ? 'checked' : ''}>
                    <span>Auto-backup on lock</span>
                  </label>
                </div>
              </div>
              
              <div class="sidebar-section">
                <h3>🗑️ Trash</h3>
                <button class="sidebar-btn" id="view-trash">🗑️ Trash (${this.trashItems.length})</button>
                ${this.trashItems.length > 0 ? '<button class="sidebar-btn" id="empty-trash">Empty Trash</button>' : ''}
              </div>
            </aside>
            
            <main class="vault-content">
              <div class="content-toolbar">
                <div class="toolbar-left">
                  <div class="dropzone" id="dropzone">
                    <span>⬆️ Add Files</span>
                    <input type="file" id="file-input" multiple hidden>
                  </div>
                  <button class="toolbar-btn" id="create-folder-btn" title="New Folder">📁+</button>
                </div>
                <div class="toolbar-right">
                  <select id="sort-select" class="sort-select" title="Sort by">
                    <option value="name-asc">Name A-Z</option>
                    <option value="name-desc">Name Z-A</option>
                    <option value="date-newest">Newest First</option>
                    <option value="date-oldest">Oldest First</option>
                    <option value="size-largest">Largest First</option>
                    <option value="size-smallest">Smallest First</option>
                  </select>
                  <input type="search" id="search" class="search-input" placeholder="Search files..." value="${this.escapeHtml(this.searchQuery)}">
                  <div class="view-toggle">
                    <button class="view-btn ${this.viewMode === 'grid' ? 'active' : ''}" data-view="grid" title="Grid View">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    </button>
                    <button class="view-btn ${this.viewMode === 'list' ? 'active' : ''}" data-view="list" title="List View">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    </button>
                    <button class="view-btn ${this.viewMode === 'details' ? 'active' : ''}" data-view="details" title="Details View">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    </button>
                    <button class="view-btn ${this.viewMode === 'gallery' ? 'active' : ''}" data-view="gallery" title="Gallery View">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                    </button>
                    <button class="view-btn ${this.viewMode === 'analytics' ? 'active' : ''}" data-view="analytics" title="Analytics">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div id="file-list" class="file-list view-${this.viewMode}">
                ${this.renderPageContent()}
              </div>
            </main>
          </div>
          
          <footer class="vault-footer">
            <div class="footer-left">
              ${this.currentPage === 'vault' ? `<span id="file-count">${filteredFiles.length} files</span><span class="separator">|</span><span id="storage-usage">${storageInfo.used} used of ${storageInfo.max}</span>` : ''}
            </div>
            <div class="footer-right">
              <span class="vault-status">🟢 Vault unlocked</span>
            </div>
          </footer>
        </div>
      `;
    }

    getStorageInfo() {
      const total = this.files.reduce((sum, f) => sum + (f.size || 0), 0);
      const max = CONFIG.MAX_VAULT_SIZE;
      const percent = Math.min((total / max) * 100, 100);
      return {
        used: this.formatSize(total),
        max: this.formatSize(max),
        percent: percent.toFixed(1)
      };
    }

    renderPageContent() {
      switch (this.currentPage) {
        case 'vault':
          return this.renderFiles(this.getFilteredFiles());
        case 'analytics':
          return this.renderAnalytics();
        case 'help':
          return this.renderHelp();
        default:
          return this.renderFiles(this.getFilteredFiles());
      }
    }

    renderHelp() {
      return `
        <div class="help-panel">
          <div class="help-section">
            <h2>❓ Help & About</h2>
            <p class="help-subtitle">Zerok Vault - Zero-knowledge encrypted storage</p>
          </div>
          
          <div class="help-section">
            <h3>🔐 Security</h3>
            <ul>
              <li><strong>AES-256-GCM</strong> - Military-grade encryption for all your files</li>
              <li><strong>PBKDF2 (600K iterations)</strong> - Strong key derivation</li>
              <li><strong>Zero Knowledge</strong> - Your password never leaves your device</li>
              <li><strong>Local Storage</strong> - All data stored locally in your browser</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>📁 Managing Files</h3>
            <ul>
              <li><strong>Upload:</strong> Click "Add Files" or drag & drop files into the vault</li>
              <li><strong>Download:</strong> Click any file to decrypt and download</li>
              <li><strong>Organize:</strong> Create folders to organize your files</li>
              <li><strong>Albums:</strong> Create albums to group related photos</li>
              <li><strong>Delete:</strong> Files go to trash - can be restored or permanently deleted</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>🔍 Search & Filter</h3>
            <ul>
              <li><strong>Search:</strong> Type in search box to filter files by name</li>
              <li><strong>Sort:</strong> Use dropdown to sort by name, date, or size</li>
              <li><strong>Filter:</strong> Filter by file type (images, videos, audio, docs, archives)</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>👁️ View Modes</h3>
            <ul>
              <li><strong>Grid:</strong> Thumbnail view of all files</li>
              <li><strong>List:</strong> Compact list with details</li>
              <li><strong>Details:</strong> Expanded view with file info</li>
              <li><strong>Gallery:</strong> Media-only view for photos/videos</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>⚠️ Important Notes</h3>
            <ul>
              <li>Your password is the ONLY way to access your files - <strong>no recovery option</strong></li>
              <li>Files are encrypted locally - if you clear browser data, files may be lost</li>
              <li>Maximum vault size: 5GB</li>
              <li>Use a strong password (min 12 characters recommended)</li>
            </ul>
          </div>
          
          <div class="help-section">
            <h3>ℹ️ About</h3>
            <p>Zerok Vault v1.0.0</p>
            <p>Built with Web Crypto API for secure client-side encryption.</p>
            <p>All data stays on your device - zero cloud storage.</p>
          </div>
        </div>
      `;
    }

    escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    renderFiles(files = []) {
      if (!files || !files.length) {
        return '<div class="empty-state"><div class="empty-icon">📭</div><p>No files found</p><p class="empty-hint">Drop files or click "Add Files" to encrypt</p></div>';
      }
      
      if (this.viewMode === 'gallery') {
        return this.renderGallery(files);
      }
      
      if (this.viewMode === 'grid') {
        return files.map(f => `
          <div class="file-card" data-id="${f.id}">
            <div class="file-preview">${this.getFileIcon(f.type)}</div>
            <div class="file-info">
              <div class="file-name" title="${this.escapeHtml(f.name)}">${this.escapeHtml(f.name)}</div>
              <div class="file-meta">
                <span class="file-size">${this.formatSize(f.size)}</span>
                <span class="file-type">${this.getMimeCategory(f.type)}</span>
              </div>
            </div>
            <div class="file-actions">
              <button class="action-btn download" data-action="download" title="Download">⬇️</button>
              <button class="action-btn rename" data-action="rename" title="Rename">✏️</button>
              <button class="action-btn delete" data-action="delete" title="Delete">🗑️</button>
            </div>
          </div>
        `).join('');
      }
      
      if (this.viewMode === 'list') {
        return `
          <table class="file-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Type</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${files.map(f => `
                <tr data-id="${f.id}">
                  <td class="file-name-cell">
                    <span class="file-icon">${this.getFileIcon(f.type)}</span>
                    <span title="${this.escapeHtml(f.name)}">${this.escapeHtml(f.name)}</span>
                  </td>
                  <td>${this.formatSize(f.size)}</td>
                  <td><span class="type-badge">${this.getMimeCategory(f.type)}</span></td>
                  <td>${new Date(f.created).toLocaleDateString()}</td>
                  <td class="actions-cell">
                    <button class="action-btn" data-action="download">⬇️</button>
                    <button class="action-btn" data-action="rename">✏️</button>
                    <button class="action-btn" data-action="delete">🗑️</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
      
      if (this.viewMode === 'details') {
        return files.map(f => `
          <div class="file-details-card" data-id="${f.id}">
            <div class="details-icon">${this.getFileIcon(f.type)}</div>
            <div class="details-info">
              <h4>${this.escapeHtml(f.name)}</h4>
              <div class="details-grid">
                <div class="detail-item"><span class="detail-label">Size</span><span class="detail-value">${this.formatSize(f.size)}</span></div>
                <div class="detail-item"><span class="detail-label">Type</span><span class="detail-value">${f.type || 'unknown'}</span></div>
                <div class="detail-item"><span class="detail-label">Created</span><span class="detail-value">${new Date(f.created).toLocaleString()}</span></div>
                <div class="detail-item"><span class="detail-label">ID</span><span class="detail-value detail-id">${f.id.slice(0, 8)}...</span></div>
              </div>
            </div>
            <div class="details-actions">
              <button class="action-btn" data-action="download">⬇️ Download</button>
              <button class="action-btn" data-action="rename">✏️ Rename</button>
              <button class="action-btn" data-action="replace">🔄 Replace</button>
              <button class="action-btn" data-action="album">🎨 Add to Album</button>
              <button class="action-btn delete" data-action="delete">🗑️ Delete</button>
            </div>
          </div>
        `).join('');
      }
      
      return files.map(f => `
        <div class="file-row" data-id="${f.id}">
          <span class="file-icon">${this.getFileIcon(f.type)}</span>
          <span class="file-name">${this.escapeHtml(f.name)}</span>
          <span class="file-size">${this.formatSize(f.size)}</span>
          <span class="file-date">${new Date(f.created).toLocaleDateString()}</span>
          <span class="file-type">${this.getMimeCategory(f.type)}</span>
        </div>
      `).join('');
    }

    renderGallery(files) {
      const mediaFiles = files.filter(f => f.type?.startsWith('image/') || f.type?.startsWith('video/'));
      if (!mediaFiles.length) {
        return '<div class="empty-state"><div class="empty-icon">🖼️</div><p>No images or videos</p></div>';
      }
      return `
        <div class="gallery-grid">
          ${mediaFiles.map(f => `
            <div class="gallery-item" data-id="${f.id}">
              <div class="gallery-preview">${this.getFileIcon(f.type)}</div>
              <div class="gallery-info">
                <span class="gallery-name">${this.escapeHtml(f.name)}</span>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    renderAnalytics() {
      const total = this.files.reduce((sum, f) => sum + (f.size || 0), 0);
      const byType = this.files.reduce((acc, f) => {
        const type = this.getMimeCategory(f.type);
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});
      
      const byMonth = this.files.reduce((acc, f) => {
        const month = new Date(f.created).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        acc[month] = (acc[month] || 0) + 1;
        return acc;
      }, {});
      
      const avgFileSize = this.files.length ? Math.round(total / this.files.length) : 0;
      const largestFile = this.files.reduce((max, f) => f.size > max.size ? f : max, { size: 0 });
      const storageInfo = this.getStorageInfo();
      
      return `
        <div class="analytics-panel">
          <div class="analytics-header">
            <h2>📊 Vault Analytics</h2>
            <p class="analytics-subtitle">Performance metrics for ${this.currentVault.username}</p>
          </div>
          
          <div class="stats-overview">
            <div class="stat-card-large">
              <div class="stat-icon">📁</div>
              <div class="stat-content">
                <div class="stat-value">${this.files.length}</div>
                <div class="stat-label">Total Files</div>
              </div>
            </div>
            <div class="stat-card-large">
              <div class="stat-icon">💾</div>
              <div class="stat-content">
                <div class="stat-value">${storageInfo.used}</div>
                <div class="stat-label">Storage Used</div>
              </div>
            </div>
            <div class="stat-card-large">
              <div class="stat-icon">📈</div>
              <div class="stat-content">
                <div class="stat-value">${storageInfo.percent}%</div>
                <div class="stat-label">Capacity Used</div>
              </div>
            </div>
            <div class="stat-card-large">
              <div class="stat-icon">📏</div>
              <div class="stat-content">
                <div class="stat-value">${this.formatSize(avgFileSize)}</div>
                <div class="stat-label">Avg File Size</div>
              </div>
            </div>
          </div>
          
          <div class="analytics-grid">
            <div class="analytics-card">
              <h3>📂 Files by Type</h3>
              <div class="type-chart">
                ${Object.entries(byType).map(([type, count]) => `
                  <div class="type-item">
                    <div class="type-info">
                      <span class="type-icon">${MIME_CATEGORIES[type]?.icon || '📄'}</span>
                      <span class="type-name">${type}</span>
                    </div>
                    <div class="type-bar-container">
                      <div class="type-bar" style="width: ${(count / this.files.length) * 100}%"></div>
                    </div>
                    <span class="type-count">${count}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="analytics-card">
              <h3>📅 Files by Month</h3>
              <div class="month-chart">
                ${Object.entries(byMonth).sort((a,b) => new Date(b[0]) - new Date(a[0])).slice(0, 6).map(([month, count]) => `
                  <div class="month-item">
                    <span class="month-name">${month}</span>
                    <div class="month-bar-container">
                      <div class="month-bar" style="width: ${(count / Math.max(...Object.values(byMonth))) * 100}%"></div>
                    </div>
                    <span class="month-count">${count}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="analytics-card">
              <h3>🏆 Largest Files</h3>
              <div class="top-files">
                ${[...this.files].sort((a, b) => b.size - a.size).slice(0, 5).map(f => `
                  <div class="top-file-item">
                    <span class="top-file-icon">${this.getFileIcon(f.type)}</span>
                    <span class="top-file-name">${this.escapeHtml(f.name)}</span>
                    <span class="top-file-size">${this.formatSize(f.size)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="analytics-card">
              <h3>💿 Storage Breakdown</h3>
              <div class="storage-breakdown">
                <div class="storage-visual">
                  <svg viewBox="0 0 100 100" class="storage-ring">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" stroke-width="8"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--accent-primary)" stroke-width="8" 
                      stroke-dasharray="${storageInfo.percent * 2.51} 251" transform="rotate(-90 50 50)"/>
                  </svg>
                  <div class="storage-center">
                    <div class="storage-percent">${storageInfo.percent}%</div>
                    <div class="storage-text">Used</div>
                  </div>
                </div>
                <div class="storage-details">
                  <div class="storage-row">
                    <span>Used:</span>
                    <span>${storageInfo.used}</span>
                  </div>
                  <div class="storage-row">
                    <span>Available:</span>
                    <span>${this.formatSize(CONFIG.MAX_VAULT_SIZE - total)}</span>
                  </div>
                  <div class="storage-row">
                    <span>Max:</span>
                    <span>${storageInfo.max}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="vault-info-card">
            <h3>🔐 Vault Information</h3>
            <div class="vault-details">
              <div class="vault-detail">
                <span class="detail-label">Vault Name:</span>
                <span class="detail-value">${this.currentVault.username}</span>
              </div>
              <div class="vault-detail">
                <span class="detail-label">Created:</span>
                <span class="detail-value">${new Date(this.currentVault.created).toLocaleString()}</span>
              </div>
              <div class="vault-detail">
                <span class="detail-label">Encryption:</span>
                <span class="detail-value">AES-256-GCM</span>
              </div>
              <div class="vault-detail">
                <span class="detail-label">Key Derivation:</span>
                <span class="detail-value">PBKDF2 (600K iterations)</span>
              </div>
            </div>
          </div>
        </div>
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
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }

    getMimeCategory(mimeType) {
      if (!mimeType) return 'other';
      if (mimeType.startsWith('image/')) return 'image';
      if (mimeType.startsWith('video/')) return 'video';
      if (mimeType.startsWith('audio/')) return 'audio';
      if (mimeType.includes('pdf') || mimeType.includes('word') || mimeType.includes('document') || mimeType.startsWith('text/')) return 'document';
      if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('gzip')) return 'archive';
      return 'other';
    }

    filterFilesByType(files, type) {
      if (type === 'all' || !type) return files;
      const category = MIME_CATEGORIES[type];
      if (!category) return files;
      return files.filter(f => {
        const ft = f.type || '';
        return category.types.some(t => ft.startsWith(t) || ft.includes(t.replace('application/', '')));
      });
    }

    filterFilesBySearch(files, query) {
      if (!query) return files;
      const lower = query.toLowerCase();
      return files.filter(f => f.name?.toLowerCase().includes(lower));
    }

    sortFiles(files) {
      if (!this.sortBy) return files;
      const sorted = [...files];
      switch (this.sortBy) {
        case 'name-asc':
          return sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        case 'name-desc':
          return sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        case 'date-newest':
          return sorted.sort((a, b) => (b.created || 0) - (a.created || 0));
        case 'date-oldest':
          return sorted.sort((a, b) => (a.created || 0) - (b.created || 0));
        case 'size-largest':
          return sorted.sort((a, b) => (b.size || 0) - (a.size || 0));
        case 'size-smallest':
          return sorted.sort((a, b) => (a.size || 0) - (b.size || 0));
        default:
          return sorted;
      }
    }

    getFilteredFiles() {
      let filtered = this.files;
      if (this.currentFolder) {
        filtered = filtered.filter(f => f.folderId === this.currentFolder);
      } else {
        filtered = filtered.filter(f => !f.folderId);
      }
      filtered = this.filterFilesByType(filtered, this.typeFilter);
      filtered = this.filterFilesBySearch(filtered, this.searchQuery);
      return this.sortFiles(filtered);
    }

    async deleteFile(id) {
      const file = this.files.find(f => f.id === id);
      if (!file) return;
      
      await this.storage.moveToTrash(file);
      await this.storage.deleteFile(id);
      await this.loadVaultFiles();
      await this.loadTrash();
      this.showToast('File moved to trash', 'info');
      this.updateView();
    }

    async restoreFile(id) {
      await this.storage.restoreFromTrash(id);
      await this.loadVaultFiles();
      await this.loadTrash();
      this.showToast('File restored', 'success');
      this.updateView();
    }

    async permanentDelete(id) {
      if (!confirm('Permanently delete this file? This cannot be undone.')) return;
      await this.storage.deleteFromTrash(id);
      await this.loadTrash();
      this.showToast('File permanently deleted', 'info');
      this.updateView();
    }

    async emptyTrash() {
      if (!confirm('Empty trash? All items will be permanently deleted.')) return;
      await this.storage.emptyTrash(this.currentVault.id);
      await this.loadTrash();
      this.showToast('Trash emptied', 'info');
      this.updateView();
    }

    async loadTrash() {
      if (!this.currentVault) return;
      this.trashItems = await this.storage.listTrash(this.currentVault.id);
    }

    async renameFile(id) {
      const file = this.files.find(f => f.id === id);
      if (!file) return;
      const newName = prompt('Enter new name:', file.name);
      if (!newName || newName === file.name) return;
      file.name = newName;
      await this.storage.saveFile(file);
      this.updateView();
    }

    async replaceFile(id) {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = async (e) => {
        const newFile = e.target.files[0];
        if (!newFile) return;
        await this.deleteFile(id);
        await this.encryptFile(newFile);
      };
      input.click();
    }

    async removeFile(id) {
      if (!confirm('Remove from vault? File will be deleted permanently.')) return;
      await this.deleteFile(id);
    }

    async createFolder() {
      const name = prompt('Folder name:');
      if (!name) return;
      const folder = {
        id: crypto.randomUUID(),
        vaultId: this.currentVault.id,
        name,
        parentId: this.currentFolder,
        created: Date.now()
      };
      await this.storage.saveFolder(folder);
      await this.loadVaultFolders();
      this.updateView();
    }

    async deleteFolder(id) {
      if (!confirm('Delete this folder and all its contents?')) return;
      const filesInFolder = this.files.filter(f => f.folderId === id);
      for (const f of filesInFolder) {
        await this.storage.deleteFile(f.id);
      }
      await this.storage.deleteFolder(id);
      await this.loadVaultFolders();
      await this.loadVaultFiles();
      this.updateView();
    }

    async createAlbum() {
      const name = prompt('Album name:');
      if (!name) return;
      const album = {
        id: crypto.randomUUID(),
        vaultId: this.currentVault.id,
        name,
        fileIds: [],
        created: Date.now()
      };
      await this.storage.saveAlbum(album);
      await this.loadVaultAlbums();
      this.updateView();
    }

    async addToAlbum(fileId) {
      const albums = await this.storage.listAlbums(this.currentVault.id);
      if (!albums.length) {
        alert('Create an album first');
        return;
      }
      const albumId = prompt('Enter album ID to add this file to:\n\n' + albums.map(a => `${a.id.slice(0,8)}: ${a.name}`).join('\n'));
      if (!albumId) return;
      const album = albums.find(a => a.id === albumId || a.id.startsWith(albumId));
      if (!album) {
        alert('Album not found');
        return;
      }
      if (!album.fileIds.includes(fileId)) {
        album.fileIds.push(fileId);
        await this.storage.saveAlbum(album);
        alert('Added to album: ' + album.name);
      }
    }

    async deleteAlbum(id) {
      if (!confirm('Delete this album?')) return;
      await this.storage.deleteAlbum(id);
      await this.loadVaultAlbums();
      this.updateView();
    }

    bindEvents() {
      debugLog('Binding events...');
      
      document.addEventListener('click', async (e) => {
        const target = e.target;
        debugLog('Click:', target.id || target.className);
        
        if (target.id === 'create-vault') {
          debugLog('Create vault clicked');
          await this.createVault();
        }
        if (target.id === 'unlock-vault') {
          debugLog('Unlock vault clicked');
          await this.unlockVault();
        }
        if (target.id === 'lock-vault') {
          await this.lockVault();
        }
        if (target.id === 'delete-vault') {
          await this.deleteVault();
        }
        if (target.id === 'new-vault') {
          const app = document.getElementById('app');
          app.innerHTML = this.renderWelcome();
          this.bindEvents();
        }
        if (target.id === 'restore-backup-login') {
          await this.restoreBackup();
        }
        
        if (target.id === 'new-folder' || target.id === 'create-folder-btn') {
          await this.createFolder();
        }
        if (target.id === 'new-album') {
          await this.createAlbum();
        }
        if (target.id === 'view-trash') {
          this.showTrashView();
        }
        if (target.id === 'back-to-vault') {
          this.showVault();
        }
        if (target.id === 'empty-trash') {
          await this.emptyTrash();
        }
        if (target.id === 'backup-vault') {
          await this.backupVault();
        }
        if (target.id === 'restore-backup') {
          await this.restoreBackup();
        }
        
        if (target.classList.contains('trash-restore')) {
          const id = target.closest('[data-trash-id]')?.dataset.trashId;
          if (id) await this.restoreFile(id);
        }
        if (target.classList.contains('trash-delete')) {
          const id = target.closest('[data-trash-id]')?.dataset.trashId;
          if (id) await this.permanentDelete(id);
        }
        
        if (target.classList.contains('view-btn')) {
          this.viewMode = target.dataset.view;
          this.updateView();
        }
        
        if (target.classList.contains('page-btn')) {
          this.currentPage = target.dataset.page;
          this.showVault();
        }
        
        if (target.classList.contains('type-btn')) {
          this.typeFilter = target.dataset.type;
          this.updateView();
        }
        
        if (target.classList.contains('folder-item')) {
          const folderId = target.dataset.folder;
          this.currentFolder = folderId || null;
          this.updateView();
        }
        
        if (target.classList.contains('action-btn')) {
          const card = target.closest('[data-id]');
          const id = card?.dataset.id;
          const action = target.dataset.action;
          if (id && action) {
            if (action === 'download') await this.downloadFile(id);
            if (action === 'rename') await this.renameFile(id);
            if (action === 'delete') await this.deleteFile(id);
            if (action === 'replace') await this.replaceFile(id);
            if (action === 'album') await this.addToAlbum(id);
          }
        }
        
        if (target.closest('.dropzone')) {
          document.getElementById('file-input').click();
        }
        
        if (target.classList.contains('file-card') || target.classList.contains('file-row') || target.classList.contains('file-details-card') || target.classList.contains('gallery-item')) {
          const id = target.closest('[data-id]')?.dataset.id;
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
        if (e.target.id === 'auto-backup-add') {
          this.currentVault.settings = this.currentVault.settings || {};
          this.currentVault.settings.autoBackupOnAdd = e.target.checked;
          await this.storage.saveVault(this.currentVault);
          this.showToast(e.target.checked ? 'Auto-backup on file add enabled' : 'Auto-backup on file add disabled', 'info');
        }
        if (e.target.id === 'auto-backup-lock') {
          this.currentVault.settings = this.currentVault.settings || {};
          this.currentVault.settings.autoBackupOnLock = e.target.checked;
          await this.storage.saveVault(this.currentVault);
          this.showToast(e.target.checked ? 'Auto-backup on lock enabled' : 'Auto-backup on lock disabled', 'info');
        }
      });

      document.addEventListener('input', async (e) => {
        if (e.target.id === 'search') {
          clearTimeout(this.searchTimeout);
          this.searchTimeout = setTimeout(() => {
            this.searchQuery = e.target.value;
            this.updateView();
          }, 300);
        }
        if (e.target.id === 'sort-select') {
          this.sortBy = e.target.value;
          this.updateView();
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
        created: Date.now(),
        settings: {
          autoBackupOnAdd: false,
          autoBackupOnLock: true
        }
      };

      await this.storage.saveVault(vault);
      await this.storage.saveMeta('current-vault', vault.id);
      sessionStorage.setItem('zerok-password', password);
      
      this.currentVault = vault;
      await this.createDefaultFolders();
      this.showVault();
      await this.loadVaultData();
    }

    async createDefaultFolders() {
      const defaultFolders = [
        { name: '🖼️ Gallery', system: 'gallery' },
        { name: '📄 Documents', system: 'documents' },
        { name: '🖼️ Images', system: 'images' },
        { name: '🎬 Videos', system: 'videos' },
        { name: '🎵 Audio', system: 'audio' },
        { name: '📦 Archives', system: 'archives' }
      ];
      
      for (const f of defaultFolders) {
        const folder = {
          id: crypto.randomUUID(),
          vaultId: this.currentVault.id,
          name: f.name,
          system: f.system,
          parentId: null,
          created: Date.now()
        };
        await this.storage.saveFolder(folder);
      }
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
      sessionStorage.setItem('zerok-password', password);
      await this.loadVaultData();
      this.showVault();
    }

    async lockVault() {
      if (this.currentVault?.settings?.autoBackupOnLock) {
        this.showToast('Auto-backing up before lock...', 'info');
        await this.backupVault();
      }
      
      this.crypto.key = null;
      this.currentVault = null;
      this.files = [];
      this.folders = [];
      this.albums = [];
      this.currentFolder = null;
      this.viewMode = 'grid';
      this.typeFilter = 'all';
      this.searchQuery = '';
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

    async loadVaultFolders() {
      if (!this.currentVault) return;
      this.folders = await this.storage.listFolders(this.currentVault.id);
    }

    async loadVaultAlbums() {
      if (!this.currentVault) return;
      this.albums = await this.storage.listAlbums(this.currentVault.id);
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
      
      if (this.currentVault.settings?.autoBackupOnAdd) {
        this.showToast('Auto-backing up...', 'info');
        await this.backupVault();
      }
    }

    async backupVault() {
      if (!this.currentVault) return;
      
      this.showToast('Creating backup...', 'info');
      
      const files = await this.storage.listFiles(this.currentVault.id);
      const folders = await this.storage.listFolders(this.currentVault.id);
      const albums = await this.storage.listAlbums(this.currentVault.id);
      
      const backup = {
        version: 1,
        type: 'zerok-backup',
        timestamp: Date.now(),
        vault: {
          id: this.currentVault.id,
          username: this.currentVault.username,
          salt: this.currentVault.salt,
          verifier: this.currentVault.verifier,
          created: this.currentVault.created,
          settings: this.currentVault.settings
        },
        stats: {
          fileCount: files.length,
          folderCount: folders.length,
          albumCount: albums.length,
          totalSize: files.reduce((sum, f) => sum + (f.size || 0), 0)
        },
        data: {
          files: files,
          folders: folders,
          albums: albums
        }
      };
      
      const jsonStr = JSON.stringify(backup);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0, 10);
      a.download = `zerok-backup-${this.currentVault.username}-${date}.zerokbackup`;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showToast('Backup saved: ' + a.download, 'success');
    }

    async restoreBackup() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zerokbackup,.json';
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          const text = await file.text();
          const backup = JSON.parse(text);
          
          if (!backup.type || backup.type !== 'zerok-backup') {
            alert('Invalid backup file format');
            return;
          }
          
          if (!this.currentVault) {
            const createNew = confirm(
              '🆕 CREATE NEW VAULT FROM BACKUP\n\n' +
              'Backup contains: ' + backup.vault.username + '\n' +
              'Files: ' + backup.stats.fileCount + '\n' +
              'Folders: ' + backup.stats.folderCount + '\n' +
              'Albums: ' + backup.stats.albumCount + '\n\n' +
              'A new vault will be created with this data.\n\n' +
              'Note: You will need to create a new password since we cannot recover the original.\n\n' +
              'Click OK to continue, Cancel to abort.'
            );
            
            if (!createNew) return;
            
            const newUsername = prompt('Enter a username for the new vault:', backup.vault.username + '-restored');
            if (!newUsername) return;
            
            const newPassword = prompt('Set a new master password (min 12 chars):');
            if (!newPassword || newPassword.length < 12) {
              alert('Password must be at least 12 characters');
              return;
            }
            
            this.showToast('Creating vault from backup...', 'info');
            
            const salt = this.crypto.generateSalt();
            this.crypto.key = await this.crypto.deriveKey(newPassword, salt);
            
            const newVault = {
              id: crypto.randomUUID(),
              username: newUsername,
              salt: this.crypto.bufferToBase64(salt),
              verifier: await this.crypto.encrypt('ZEROK_CANARY'),
              created: Date.now(),
              settings: backup.vault.settings || { autoBackupOnAdd: false, autoBackupOnLock: true }
            };
            
            await this.storage.saveVault(newVault);
            await this.storage.saveMeta('current-vault', newVault.id);
            sessionStorage.setItem('zerok-password', newPassword);
            
            this.currentVault = newVault;
            
            for (const folder of backup.data.folders) {
              folder.vaultId = newVault.id;
              folder.id = crypto.randomUUID();
              await this.storage.saveFolder(folder);
            }
            
            for (const album of backup.data.albums) {
              album.vaultId = newVault.id;
              album.id = crypto.randomUUID();
              await this.storage.saveAlbum(album);
            }
            
            for (const f of backup.data.files) {
              f.vaultId = newVault.id;
              f.id = crypto.randomUUID();
              await this.storage.saveFile(f);
            }
            
            await this.loadVaultData();
            this.showVault();
            this.showToast('Restored ' + backup.stats.fileCount + ' files from backup', 'success');
            
          } else {
            const confirmMsg = 
              '⚠️ RESTORE BACKUP\n\n' +
              'This will import backup from: ' + backup.vault.username + '\n' +
              'Files: ' + backup.stats.fileCount + '\n' +
              'Folders: ' + backup.stats.folderCount + '\n' +
              'Albums: ' + backup.stats.albumCount + '\n\n' +
              'IMPORTANT: Your current vault data will be MERGED with backup data.\n' +
              '• New files from backup will be added\n' +
              '• Existing files will be kept\n' +
              '• Folders and albums will be merged\n\n' +
              'Do you want to continue?';
            
            if (!confirm(confirmMsg)) return;
            
            this.showToast('Restoring backup...', 'info');
            
            const vaultId = this.currentVault.id;
            
            for (const folder of backup.data.folders) {
              folder.vaultId = vaultId;
              await this.storage.saveFolder(folder);
            }
            
            for (const album of backup.data.albums) {
              album.vaultId = vaultId;
              await this.storage.saveAlbum(album);
            }
            
            for (const f of backup.data.files) {
              f.vaultId = vaultId;
              await this.storage.saveFile(f);
            }
            
            await this.loadVaultData();
            this.showVault();
            this.showToast('Backup restored: ' + backup.stats.fileCount + ' files imported', 'success');
          }
          
        } catch (err) {
          alert('Failed to restore backup: ' + err.message);
        }
      };
      
      input.click();
    }

    showToast(message, type = 'info') {
      const existing = document.querySelector('.toast');
      if (existing) existing.remove();
      
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      
      setTimeout(() => toast.classList.add('show'), 10);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    }

    async downloadFile(id) {
      const file = this.files.find(f => f.id === id);
      if (!file) return;

      this.showToast(`Decrypting ${file.name}...`, 'info');
      
      const decrypted = await this.crypto.decrypt(file.encrypted);
      const data = this.crypto.base64ToBuffer(decrypted);
      
      const blob = new Blob([data], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      
      URL.revokeObjectURL(url);
      this.showToast(`Downloaded: ${file.name}`, 'success');
    }

    showVault() {
      const app = document.getElementById('app');
      if (app) {
        app.innerHTML = this.renderVault();
        this.bindEvents();
      }
    }

    showTrashView() {
      const app = document.getElementById('app');
      if (!app) return;
      
      app.innerHTML = this.renderTrash();
      this.bindEvents();
    }

    renderTrash() {
      return `
        <div class="vault-container">
          <header class="vault-header">
            <div class="header-left">
              <button class="btn-secondary" id="back-to-vault">← Back to Vault</button>
              <h1>🗑️ Trash</h1>
            </div>
            <div class="header-right">
              <span class="vault-badge">🔐 ${this.currentVault.username}</span>
            </div>
          </header>
          <main class="vault-content">
            <div id="trash-list" class="trash-list">
              ${this.trashItems.length === 0 ? '<div class="empty-state"><p>Trash is empty</p></div>' : 
                this.trashItems.map(f => `
                  <div class="trash-item" data-trash-id="${f.id}">
                    <div class="trash-icon">${this.getFileIcon(f.type)}</div>
                    <div class="trash-info">
                      <div class="trash-name">${this.escapeHtml(f.name)}</div>
                      <div class="trash-meta">Deleted: ${new Date(f.deletedAt).toLocaleString()}</div>
                    </div>
                    <div class="trash-actions">
                      <button class="action-btn trash-restore" data-action="restore" title="Restore">↩️ Restore</button>
                      <button class="action-btn trash-delete" data-action="delete" title="Delete Permanently">🗑️ Delete</button>
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </main>
        </div>
      `;
    }

    async loadVaultData() {
      debugLog('LOAD: Starting loadVaultData...');
      debugLog('LOAD: currentVault:', this.currentVault?.id);
      await this.loadVaultFiles();
      debugLog('LOAD: Files loaded:', this.files.length);
      await this.loadVaultFolders();
      debugLog('LOAD: Folders loaded:', this.folders.length);
      await this.loadVaultAlbums();
      debugLog('LOAD: Albums loaded:', this.albums.length);
      await this.loadTrash();
      debugLog('LOAD: Trash loaded:', this.trashItems.length);
    }

    updateView() {
      const fileList = document.getElementById('file-list');
      if (fileList) {
        if (this.viewMode === 'analytics') {
          fileList.innerHTML = this.renderAnalytics();
        } else {
          fileList.className = `file-list view-${this.viewMode}`;
          fileList.innerHTML = this.renderFiles(this.getFilteredFiles());
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

  debugLog('App instance created');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      debugLog('DOM ready, calling init');
      app.init().then(function() {
        debugLog('Init complete');
      }).catch(function(e) {
        debugLog('Init error:', e);
      });
    });
  } else {
    debugLog('DOM already ready, calling init');
    app.init().then(function() {
      debugLog('Init complete');
    }).catch(function(e) {
      debugLog('Init error:', e);
    });
  }

  window.zerok = app;
})();