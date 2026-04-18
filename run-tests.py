#!/usr/bin/env python3
"""
Zerok Vault - Test Runner
Runs all nuclear-grade tests
"""

import subprocess
import sys
import os

def run_test(file_path, description):
    print(f"\n{'='* 60}")
    print(f"Running: {description}")
    print(f"File: {file_path}")
    print('='* 60)
    
    try:
        result = subprocess.run(
            ['python', file_path],
            capture_output=True,
            text=True,
            timeout=30
        )
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        return result.returncode == 0
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def main():
    print("="*60)
    print("ZEROK VAULT - NUCLEAR GRADE TEST SUITE")
    print("="*60)
    
    os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    tests = [
        ("tests/test_zerok.py", "Zerok Core Crypto"),
        ("tests/test_invariant.py", "Crypto Invariants"),
        ("tests/test_blob_integrity.py", "Blob Integrity"),
        ("tests/test_client.py", "Client Tests"),
    ]
    
    passed = 0
    failed = 0
    
    for test_file, description in tests:
        if os.path.exists(test_file):
            if run_test(test_file, description):
                passed += 1
                print(f"✓ {description}: PASSED")
            else:
                failed += 1
                print(f"✗ {description}: FAILED")
    
    print("\n" + "="*60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("="*60)
    
    # Check PWA files exist
    print("\nVerifying PWA files...")
    required = [
        "pwa/index.html",
        "pwa/zerok-vault.js",
        "pwa/zerok.css",
        "pwa/manifest.json",
        "pwa/sw.js"
    ]
    
    for f in required:
        if os.path.exists(f):
            print(f"  ✓ {f}")
        else:
            print(f"  ✗ {f} MISSING")
            failed += 1
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    sys.exit(main())