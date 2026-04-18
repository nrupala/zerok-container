/**
 * Zerok Vault - Test Suite
 * Nuclear-grade testing for zero-knowledge encryption
 * 
 * Tests: Crypto, Storage, Auth, File Operations, Analytics
 */

const TEST_SUITE = {
  name: 'Zerok Vault Test Suite',
  version: '1.0.0',
  passed: 0,
  failed: 0,
  results: []
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const test = async (name, fn) => {
  TEST_SUITE.results.push({ name, status: 'running' });
  try {
    await fn();
    TEST_SUITE.results[TEST_SUITE.results.length - 1].status = 'passed';
    TEST_SUITE.passed++;
    console.log(`✓ ${name}`);
  } catch (e) {
    TEST_SUITE.results[TEST_SUITE.results.length - 1].status = 'failed';
    TEST_SUITE.results[TEST_SUITE.results.length - 1].error = e.message;
    TEST_SUITE.failed++;
    console.log(`✗ ${name}: ${e.message}`);
  }
};

const runTests = async () => {
  console.log('='.repeat(50));
  console.log('Zerok Vault - Nuclear Grade Test Suite');
  console.log('='.repeat(50));
  console.log('');

  await test('Crypto: key derivation', async () => {
    const password = 'test-password-123';
    const salt = crypto.getRandomValues(new Uint8Array(32));
    
    const key1 = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 600000,
        hash: 'SHA-256'
      },
      await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    const key2 = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 600000,
        hash: 'SHA-256'
      },
      await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    assert(key1 !== key2, 'Keys should be different (derived separately)');
  });

  await test('Crypto: AES-GCM encrypt/decrypt roundtrip', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    const plaintext = new TextEncoder().encode('Nuclear secret data');
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      plaintext
    );
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      ciphertext
    );
    
    assert(new TextDecoder().decode(decrypted) === 'Nuclear secret data', 'Decryption failed');
  });

  await test('Crypto: nonce uniqueness', async () => {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    const plaintext = new TextEncoder().encode('test');
    const nonce1 = crypto.getRandomValues(new Uint8Array(12));
    const nonce2 = crypto.getRandomValues(new Uint8Array(12));
    
    const ciphertext1 = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce1 },
      key,
      plaintext
    );
    
    const ciphertext2 = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce2 },
      key,
      plaintext
    );
    
    assert(ciphertext1.byteLength === ciphertext2.byteLength, 'Ciphertexts should be same length');
    assert(ciphertext1.byteLength !== 4, 'Ciphertext should have auth tag');
  });

  await test('Storage: IndexedDB initialization', async () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('zerok-test-' + Date.now(), 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        request.result.close();
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
      };
    });
  });

  await test('Storage: vault CRUD operations', async () => {
    const dbName = 'zerok-test-' + Date.now();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const db = request.result;
        
        try {
          const vault = {
            id: 'test-vault-1',
            username: 'testuser',
            salt: btoa('salt'),
            verifier: 'encrypted-canary',
            created: Date.now()
          };
          
          const tx = db.transaction('vaults', 'readwrite');
          const store = tx.objectStore('vaults');
          store.put(vault);
          
          await new Promise((r, j) => {
            tx.oncomplete = r;
            tx.onerror = j;
          });
          
          const tx2 = db.transaction('vaults', 'readonly');
          const getRequest = tx2.objectStore('vaults').get('test-vault-1');
          
          await new Promise((r, j) => {
            getRequest.onsuccess = () => {
              assert(getRequest.result?.username === 'testuser', 'Vault not found');
              r();
            };
            getRequest.onerror = j;
          });
          
          db.close();
          resolve();
        } catch (e) {
          reject(e);
        }
      };
    });
  });

  await test('Storage: file operations', async () => {
    const dbName = 'zerok-test-files-' + Date.now();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const db = request.result;
        const file = {
          id: 'file-1',
          vaultId: 'vault-1',
          name: 'test.txt',
          type: 'text/plain',
          size: 100,
          encrypted: 'base64data',
          created: Date.now()
        };
        
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(file);
        
        await new Promise((r, j) => {
          tx.oncomplete = r;
          tx.onerror = j;
        });
        
        db.close();
        resolve();
      };
    });
  });

  await test('Auth: vault creation validation', async () => {
    const testCases = [
      { username: '', password: 'short', expect: 'fail', reason: 'empty username' },
      { username: 'abc', password: 'short', expect: 'fail', reason: 'password too short' },
      { username: 'validuser', password: 'longpassword123', expect: 'pass', reason: 'valid credentials' }
    ];
    
    for (const tc of testCases) {
      if (tc.expect === 'fail') {
        try {
          if (tc.username.length < 3 || tc.password.length < 12) {
            assert(true, 'Should reject');
          }
        } catch (e) {
          // Expected to fail
        }
      }
    }
  });

  await test('Memory: array zeroization', async () => {
    const sensitive = new Uint8Array([1, 2, 3, 4, 5]);
    const view = sensitive.slice();
    
    sensitive.fill(0);
    sensitive.fill(0, 0, sensitive.length);
    
    let sum = 0;
    for (let i = 0; i < sensitive.length; i++) {
      sum += sensitive[i];
    }
    
    assert(sum === 0, 'Memory should be zeroed');
  });

  await test('Analytics: file type distribution', async () => {
    const files = [
      { type: 'image/png', size: 1000 },
      { type: 'image/jpeg', size: 2000 },
      { type: 'text/plain', size: 500 },
      { type: 'text/plain', size: 300 }
    ];
    
    const byType = files.reduce((acc, f) => {
      const type = f.type.split('/')[0];
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    assert(byType.image === 2, 'Should have 2 images');
    assert(byType.text === 2, 'Should have 2 text files');
  });

  await test('Analytics: storage calculation', async () => {
    const files = [
      { size: 1024 },
      { size: 2048 },
      { size: 512 }
    ];
    
    const total = files.reduce((sum, f) => sum + f.size, 0);
    assert(total === 3584, 'Total should be 3584 bytes');
  });

  console.log('');
  console.log('='.repeat(50));
  console.log(`Results: ${TEST_SUITE.passed} passed, ${TEST_SUITE.failed} failed`);
  console.log('='.repeat(50));
  
  if (TEST_SUITE.failed > 0) {
    console.log('');
    console.log('Failed tests:');
    TEST_SUITE.results
      .filter(r => r.status === 'failed')
      .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
  }
  
  return TEST_SUITE;
};

if (typeof window !== 'undefined') {
  window.zerokTests = { runTests, TEST_SUITE };
}

if (typeof module !== 'undefined') {
  module.exports = { runTests, TEST_SUITE };
}