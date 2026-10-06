#!/usr/bin/env python3
"""
Backend test suite for Razorpay payment endpoints.
Tests order creation and signature verification with LIVE keys.
DOES NOT attempt real payments or captures.
"""

import requests
import json
import sys

# Backend base URL from frontend/.env
BASE_URL = "https://site-builder-4997.preview.emergentagent.com/api"

def test_sanity_check():
    """Test 1: GET /api/ should return Hello World"""
    print("\n" + "="*80)
    print("TEST 1: Sanity Check - GET /api/")
    print("="*80)
    
    try:
        response = requests.get(f"{BASE_URL}/", timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("✅ PASS: Backend is up and responding correctly")
                return True
            else:
                print(f"❌ FAIL: Expected message 'Hello World', got {data}")
                return False
        else:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        return False


def test_create_order_valid():
    """Test 2: POST /api/create-order with valid data"""
    print("\n" + "="*80)
    print("TEST 2: Create Order - Valid Request")
    print("="*80)
    
    payload = {
        "amount": 499,
        "currency": "INR",
        "kind": "lecture",
        "refId": "lec-clinical-reasoning",
        "label": "Clinical Reasoning",
        "email": "test@example.com",
        "name": "Test User",
        "phone": "9000000000"
    }
    
    print(f"Request Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/create-order",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=15
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Validate response structure
            checks = []
            
            # Check orderId
            if "orderId" in data and isinstance(data["orderId"], str) and data["orderId"].startswith("order_"):
                print(f"✅ orderId is valid: {data['orderId']}")
                checks.append(True)
            else:
                print(f"❌ orderId is invalid: {data.get('orderId')}")
                checks.append(False)
            
            # Check amount (should be 49900 paise)
            if data.get("amount") == 49900:
                print(f"✅ amount is correct: {data['amount']} paise")
                checks.append(True)
            else:
                print(f"❌ amount is incorrect: expected 49900, got {data.get('amount')}")
                checks.append(False)
            
            # Check currency
            if data.get("currency") == "INR":
                print(f"✅ currency is correct: {data['currency']}")
                checks.append(True)
            else:
                print(f"❌ currency is incorrect: expected INR, got {data.get('currency')}")
                checks.append(False)
            
            # Check keyId
            if "keyId" in data and isinstance(data["keyId"], str) and data["keyId"].startswith("rzp_live_"):
                print(f"✅ keyId is valid: {data['keyId']}")
                checks.append(True)
            else:
                print(f"❌ keyId is invalid: {data.get('keyId')}")
                checks.append(False)
            
            if all(checks):
                print("✅ PASS: Order created successfully with valid Razorpay live keys")
                return True
            else:
                print("❌ FAIL: Some validation checks failed")
                return False
        else:
            print(f"❌ FAIL: Expected status 200, got {response.status_code}")
            print(f"Response body: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_create_order_invalid_amount():
    """Test 3: POST /api/create-order with amount = 0"""
    print("\n" + "="*80)
    print("TEST 3: Create Order - Invalid Amount (0)")
    print("="*80)
    
    payload = {"amount": 0}
    print(f"Request Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/create-order",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            print("✅ PASS: Server correctly rejected amount = 0 with HTTP 400")
            return True
        else:
            print(f"❌ FAIL: Expected status 400, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        return False


def test_verify_payment_invalid_signature():
    """Test 4: POST /api/verify-payment with invalid signature"""
    print("\n" + "="*80)
    print("TEST 4: Verify Payment - Invalid Signature")
    print("="*80)
    
    payload = {
        "razorpay_order_id": "order_test123",
        "razorpay_payment_id": "pay_test123",
        "razorpay_signature": "invalidsignature",
        "kind": "lecture",
        "refId": "x",
        "email": "test@example.com"
    }
    
    print(f"Request Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/verify-payment",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            data = response.json()
            detail = data.get("detail", "")
            if "signature" in detail.lower() or "verification" in detail.lower() or "failed" in detail.lower():
                print("✅ PASS: Server correctly rejected invalid signature with HTTP 400")
                print(f"   Detail message: {detail}")
                return True
            else:
                print(f"⚠️  PARTIAL: Got 400 but detail message unclear: {detail}")
                return True  # Still pass since we got 400
        else:
            print(f"❌ FAIL: Expected status 400, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {e}")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("RAZORPAY PAYMENT BACKEND TEST SUITE")
    print("="*80)
    print(f"Backend URL: {BASE_URL}")
    print("NOTE: Using LIVE Razorpay keys - only testing order creation (no charges)")
    print("="*80)
    
    results = []
    
    # Run all tests
    results.append(("Sanity Check", test_sanity_check()))
    results.append(("Create Order - Valid", test_create_order_valid()))
    results.append(("Create Order - Invalid Amount", test_create_order_invalid_amount()))
    results.append(("Verify Payment - Invalid Signature", test_verify_payment_invalid_signature()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("="*80)
    print(f"Total: {passed}/{total} tests passed")
    print("="*80)
    
    if passed == total:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
