#!/usr/bin/env python3
"""
Backend API Testing for Rehabilified App
Tests Google Auth and Razorpay payment endpoints
"""

import requests
from datetime import datetime, timezone, timedelta
from pymongo import MongoClient
import sys

# Configuration
BASE_URL = "https://site-builder-4997.preview.emergentagent.com/api"
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

# Test data
TEST_USER_ID = "test-user-auth1"
TEST_EMAIL = "authtest@example.com"
TEST_NAME = "Auth Test"
TEST_SESSION_TOKEN = "testtok_AUTH_123"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_test(test_num, description):
    print(f"\n{'='*80}")
    print(f"Test {test_num}: {description}")
    print('='*80)

def print_pass(message):
    print(f"{GREEN}✓ PASS{RESET}: {message}")

def print_fail(message):
    print(f"{RED}✗ FAIL{RESET}: {message}")

def print_info(message):
    print(f"{YELLOW}ℹ INFO{RESET}: {message}")


class BackendTester:
    def __init__(self):
        self.mongo_client = MongoClient(MONGO_URL)
        self.db = self.mongo_client[DB_NAME]
        self.test_results = []
        
    def cleanup_test_data(self):
        """Clean up any existing test data"""
        print_info("Cleaning up existing test data...")
        self.db.users.delete_many({"user_id": TEST_USER_ID})
        self.db.user_sessions.delete_many({"session_token": {"$regex": "^testtok_"}})
        print_info("Cleanup complete")
    
    def seed_test_user_and_session(self):
        """Seed test user and session in MongoDB"""
        print_info("Seeding test user and session...")
        
        # Insert test user
        user_doc = {
            "user_id": TEST_USER_ID,
            "email": TEST_EMAIL,
            "name": TEST_NAME,
            "picture": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.db.users.insert_one(user_doc)
        print_info(f"Inserted test user: {TEST_USER_ID}")
        
        # Insert test session (expires in 7 days)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        session_doc = {
            "user_id": TEST_USER_ID,
            "session_token": TEST_SESSION_TOKEN,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.db.user_sessions.insert_one(session_doc)
        print_info(f"Inserted test session: {TEST_SESSION_TOKEN}")
        print_info("Seeding complete")
    
    def test_a1_auth_me_no_token(self):
        """A1: GET /api/auth/me WITHOUT any token -> expect HTTP 401"""
        print_test("A1", "GET /api/auth/me WITHOUT any token (expect 401)")
        
        try:
            response = requests.get(f"{BASE_URL}/auth/me", timeout=10)
            
            if response.status_code == 401:
                print_pass(f"Received expected 401 status code")
                print_info(f"Response: {response.json()}")
                self.test_results.append(("A1", True, "Correctly rejected unauthenticated request"))
                return True
            else:
                print_fail(f"Expected 401, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("A1", False, f"Expected 401, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("A1", False, f"Exception: {e}"))
            return False
    
    def test_a2_auth_me_bearer_token(self):
        """A2: GET /api/auth/me with Bearer token -> expect HTTP 200"""
        print_test("A2", "GET /api/auth/me with Authorization: Bearer token (expect 200)")
        
        try:
            headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print_pass(f"Received expected 200 status code")
                print_info(f"Response: {data}")
                
                # Verify response contains expected fields
                checks = []
                if data.get("user_id") == TEST_USER_ID:
                    print_pass(f"user_id matches: {TEST_USER_ID}")
                    checks.append(True)
                else:
                    print_fail(f"user_id mismatch. Expected: {TEST_USER_ID}, Got: {data.get('user_id')}")
                    checks.append(False)
                
                if data.get("email") == TEST_EMAIL:
                    print_pass(f"email matches: {TEST_EMAIL}")
                    checks.append(True)
                else:
                    print_fail(f"email mismatch. Expected: {TEST_EMAIL}, Got: {data.get('email')}")
                    checks.append(False)
                
                if data.get("name") == TEST_NAME:
                    print_pass(f"name matches: {TEST_NAME}")
                    checks.append(True)
                else:
                    print_fail(f"name mismatch. Expected: {TEST_NAME}, Got: {data.get('name')}")
                    checks.append(False)
                
                if "_id" not in data:
                    print_pass("No '_id' field in response (correct)")
                    checks.append(True)
                else:
                    print_fail("Response contains '_id' field (should be excluded)")
                    checks.append(False)
                
                if all(checks):
                    self.test_results.append(("A2", True, "Bearer token auth working correctly"))
                    return True
                else:
                    self.test_results.append(("A2", False, "Response data validation failed"))
                    return False
            else:
                print_fail(f"Expected 200, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("A2", False, f"Expected 200, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("A2", False, f"Exception: {e}"))
            return False
    
    def test_a3_auth_me_cookie(self):
        """A3: GET /api/auth/me with cookie -> expect HTTP 200"""
        print_test("A3", "GET /api/auth/me with cookie session_token (expect 200)")
        
        try:
            cookies = {"session_token": TEST_SESSION_TOKEN}
            response = requests.get(f"{BASE_URL}/auth/me", cookies=cookies, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print_pass(f"Received expected 200 status code")
                print_info(f"Response: {data}")
                
                # Verify response contains expected user
                if data.get("user_id") == TEST_USER_ID and data.get("email") == TEST_EMAIL:
                    print_pass(f"Cookie auth working - user_id and email match")
                    self.test_results.append(("A3", True, "Cookie auth working correctly"))
                    return True
                else:
                    print_fail(f"User data mismatch")
                    self.test_results.append(("A3", False, "User data mismatch"))
                    return False
            else:
                print_fail(f"Expected 200, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("A3", False, f"Expected 200, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("A3", False, f"Exception: {e}"))
            return False
    
    def test_a4_auth_logout(self):
        """A4: POST /api/auth/logout -> expect 200"""
        print_test("A4", "POST /api/auth/logout with cookie (expect 200)")
        
        try:
            cookies = {"session_token": TEST_SESSION_TOKEN}
            response = requests.post(f"{BASE_URL}/auth/logout", cookies=cookies, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print_pass(f"Received expected 200 status code")
                print_info(f"Response: {data}")
                
                if data.get("ok") == True:
                    print_pass("Logout response contains 'ok': true")
                    self.test_results.append(("A4", True, "Logout successful"))
                    return True
                else:
                    print_fail("Logout response missing 'ok': true")
                    self.test_results.append(("A4", False, "Logout response invalid"))
                    return False
            else:
                print_fail(f"Expected 200, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("A4", False, f"Expected 200, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("A4", False, f"Exception: {e}"))
            return False
    
    def test_a5_auth_me_after_logout(self):
        """A5: GET /api/auth/me after logout -> expect 401"""
        print_test("A5", "GET /api/auth/me with same Bearer token after logout (expect 401)")
        
        try:
            headers = {"Authorization": f"Bearer {TEST_SESSION_TOKEN}"}
            response = requests.get(f"{BASE_URL}/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 401:
                print_pass(f"Received expected 401 status code (session deleted)")
                print_info(f"Response: {response.json()}")
                self.test_results.append(("A5", True, "Session correctly deleted after logout"))
                return True
            else:
                print_fail(f"Expected 401, got {response.status_code} (session should be deleted)")
                print_info(f"Response: {response.text}")
                self.test_results.append(("A5", False, f"Expected 401, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("A5", False, f"Exception: {e}"))
            return False
    
    def test_a6_auth_session_invalid(self):
        """A6: POST /api/auth/session with invalid session_id -> expect non-200"""
        print_test("A6", "POST /api/auth/session with invalid session_id (expect 401 or 502)")
        
        try:
            payload = {"session_id": "obviously-invalid-session-xyz"}
            response = requests.post(f"{BASE_URL}/auth/session", json=payload, timeout=15)
            
            if response.status_code in [401, 502]:
                print_pass(f"Received expected non-200 status code: {response.status_code}")
                print_info(f"Response: {response.json()}")
                self.test_results.append(("A6", True, f"Invalid session correctly rejected with {response.status_code}"))
                return True
            else:
                print_fail(f"Expected 401 or 502, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("A6", False, f"Expected 401/502, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("A6", False, f"Exception: {e}"))
            return False
    
    def test_b7_root_endpoint(self):
        """B7: GET /api/ -> expect Hello World"""
        print_test("B7", "GET /api/ (expect Hello World)")
        
        try:
            response = requests.get(f"{BASE_URL}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print_pass(f"Received expected 200 status code")
                print_info(f"Response: {data}")
                
                if data.get("message") == "Hello World":
                    print_pass("Response contains correct message: 'Hello World'")
                    self.test_results.append(("B7", True, "Root endpoint working"))
                    return True
                else:
                    print_fail(f"Expected message 'Hello World', got: {data.get('message')}")
                    self.test_results.append(("B7", False, "Message mismatch"))
                    return False
            else:
                print_fail(f"Expected 200, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("B7", False, f"Expected 200, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("B7", False, f"Exception: {e}"))
            return False
    
    def test_b8_create_order(self):
        """B8: POST /api/create-order with valid data"""
        print_test("B8", "POST /api/create-order with valid consultation data")
        
        try:
            payload = {
                "amount": 799,
                "currency": "INR",
                "kind": "consultation",
                "refId": "cc-30",
                "label": "30-Minute Career Clarity Consultation",
                "email": "t@e.com",
                "name": "T",
                "phone": "9000000000"
            }
            response = requests.post(f"{BASE_URL}/create-order", json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print_pass(f"Received expected 200 status code")
                print_info(f"Response: {data}")
                
                checks = []
                
                # Check orderId starts with "order_"
                if data.get("orderId", "").startswith("order_"):
                    print_pass(f"orderId starts with 'order_': {data.get('orderId')}")
                    checks.append(True)
                else:
                    print_fail(f"orderId doesn't start with 'order_': {data.get('orderId')}")
                    checks.append(False)
                
                # Check amount in paise (799 * 100 = 79900)
                if data.get("amount") == 79900:
                    print_pass(f"amount correct (79900 paise): {data.get('amount')}")
                    checks.append(True)
                else:
                    print_fail(f"amount incorrect. Expected 79900, got: {data.get('amount')}")
                    checks.append(False)
                
                # Check currency
                if data.get("currency") == "INR":
                    print_pass(f"currency correct: {data.get('currency')}")
                    checks.append(True)
                else:
                    print_fail(f"currency incorrect. Expected INR, got: {data.get('currency')}")
                    checks.append(False)
                
                # Check keyId starts with "rzp_live_"
                if data.get("keyId", "").startswith("rzp_live_"):
                    print_pass(f"keyId starts with 'rzp_live_': {data.get('keyId')}")
                    checks.append(True)
                else:
                    print_fail(f"keyId doesn't start with 'rzp_live_': {data.get('keyId')}")
                    checks.append(False)
                
                if all(checks):
                    self.test_results.append(("B8", True, "Create order working correctly"))
                    return True
                else:
                    self.test_results.append(("B8", False, "Response validation failed"))
                    return False
            else:
                print_fail(f"Expected 200, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("B8", False, f"Expected 200, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("B8", False, f"Exception: {e}"))
            return False
    
    def test_b9_verify_payment_bad_signature(self):
        """B9: POST /api/verify-payment with bad signature -> expect 400"""
        print_test("B9", "POST /api/verify-payment with invalid signature (expect 400)")
        
        try:
            payload = {
                "razorpay_order_id": "order_x",
                "razorpay_payment_id": "pay_x",
                "razorpay_signature": "bad",
                "kind": "consultation",
                "refId": "cc-30",
                "email": "t@e.com"
            }
            response = requests.post(f"{BASE_URL}/verify-payment", json=payload, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                print_pass(f"Received expected 400 status code")
                print_info(f"Response: {data}")
                
                if "signature verification failed" in data.get("detail", "").lower():
                    print_pass("Error message indicates signature verification failed")
                    self.test_results.append(("B9", True, "Signature verification correctly rejected"))
                    return True
                else:
                    print_fail(f"Unexpected error message: {data.get('detail')}")
                    self.test_results.append(("B9", False, "Unexpected error message"))
                    return False
            else:
                print_fail(f"Expected 400, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("B9", False, f"Expected 400, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("B9", False, f"Exception: {e}"))
            return False
    
    def test_c1_put_content_initial(self):
        """C1: PUT /api/content with initial data"""
        print_test("C1", "PUT /api/content with initial data (CROSS_DEVICE_MARKER_9988)")
        
        try:
            payload = {
                "lectures": [],
                "courses": [],
                "testimonials": [{
                    "id": "t-sync",
                    "name": "Sync Tester",
                    "role": "QA",
                    "text": "CROSS_DEVICE_MARKER_9988",
                    "rating": 5,
                    "published": True
                }],
                "faqs": [],
                "stats": [{
                    "id": "s1",
                    "label": "Sync Stat Label",
                    "value": 42,
                    "suffix": "+"
                }],
                "settings": {
                    "consultationPrice": 999,
                    "whatsapp": "917303995608",
                    "instagram": "rehabilified"
                },
                "slots": []
            }
            response = requests.put(f"{BASE_URL}/content", json=payload, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print_pass(f"Received expected 200 status code")
                print_info(f"Response: {data}")
                
                if data.get("ok") == True:
                    print_pass("Response contains 'ok': true")
                    self.test_results.append(("C1", True, "PUT /api/content successful"))
                    return True
                else:
                    print_fail("Response missing 'ok': true")
                    self.test_results.append(("C1", False, "Response invalid"))
                    return False
            else:
                print_fail(f"Expected 200, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("C1", False, f"Expected 200, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("C1", False, f"Exception: {e}"))
            return False
    
    def test_c2_get_content_verify_marker(self):
        """C2: GET /api/content and verify marker and no _id field"""
        print_test("C2", "GET /api/content (verify CROSS_DEVICE_MARKER_9988 and no _id)")
        
        try:
            response = requests.get(f"{BASE_URL}/content", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print_pass(f"Received expected 200 status code")
                print_info(f"Response keys: {list(data.keys())}")
                
                checks = []
                
                # Check testimonials[0].text == "CROSS_DEVICE_MARKER_9988"
                testimonials = data.get("testimonials", [])
                if testimonials and len(testimonials) > 0:
                    marker = testimonials[0].get("text")
                    if marker == "CROSS_DEVICE_MARKER_9988":
                        print_pass(f"testimonials[0].text matches: CROSS_DEVICE_MARKER_9988")
                        checks.append(True)
                    else:
                        print_fail(f"testimonials[0].text mismatch. Expected: CROSS_DEVICE_MARKER_9988, Got: {marker}")
                        checks.append(False)
                else:
                    print_fail("No testimonials found in response")
                    checks.append(False)
                
                # Check stats[0].label == "Sync Stat Label"
                stats = data.get("stats", [])
                if stats and len(stats) > 0:
                    label = stats[0].get("label")
                    if label == "Sync Stat Label":
                        print_pass(f"stats[0].label matches: Sync Stat Label")
                        checks.append(True)
                    else:
                        print_fail(f"stats[0].label mismatch. Expected: Sync Stat Label, Got: {label}")
                        checks.append(False)
                else:
                    print_fail("No stats found in response")
                    checks.append(False)
                
                # Check no _id field
                if "_id" not in data:
                    print_pass("No '_id' field in response (correct)")
                    checks.append(True)
                else:
                    print_fail("Response contains '_id' field (should be excluded)")
                    checks.append(False)
                
                if all(checks):
                    self.test_results.append(("C2", True, "GET /api/content working correctly"))
                    return True
                else:
                    self.test_results.append(("C2", False, "Response validation failed"))
                    return False
            else:
                print_fail(f"Expected 200, got {response.status_code}")
                print_info(f"Response: {response.text}")
                self.test_results.append(("C2", False, f"Expected 200, got {response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("C2", False, f"Exception: {e}"))
            return False
    
    def test_c3_put_content_overwrite(self):
        """C3: PUT /api/content with different marker, then GET to confirm overwrite"""
        print_test("C3", "PUT /api/content with CROSS_DEVICE_MARKER_0001, then GET to verify overwrite")
        
        try:
            # PUT with new marker
            payload = {
                "lectures": [],
                "courses": [],
                "testimonials": [{
                    "id": "t-sync",
                    "name": "Sync Tester Updated",
                    "role": "QA Lead",
                    "text": "CROSS_DEVICE_MARKER_0001",
                    "rating": 5,
                    "published": True
                }],
                "faqs": [],
                "stats": [{
                    "id": "s1",
                    "label": "Updated Stat Label",
                    "value": 99,
                    "suffix": "+"
                }],
                "settings": {
                    "consultationPrice": 1299,
                    "whatsapp": "917303995608",
                    "instagram": "rehabilified"
                },
                "slots": []
            }
            put_response = requests.put(f"{BASE_URL}/content", json=payload, timeout=10)
            
            if put_response.status_code != 200:
                print_fail(f"PUT failed with status {put_response.status_code}")
                self.test_results.append(("C3", False, f"PUT failed: {put_response.status_code}"))
                return False
            
            print_pass("PUT request successful")
            
            # GET to verify overwrite
            get_response = requests.get(f"{BASE_URL}/content", timeout=10)
            
            if get_response.status_code == 200:
                data = get_response.json()
                print_pass(f"GET request successful")
                
                checks = []
                
                # Check testimonials[0].text == "CROSS_DEVICE_MARKER_0001"
                testimonials = data.get("testimonials", [])
                if testimonials and len(testimonials) > 0:
                    marker = testimonials[0].get("text")
                    if marker == "CROSS_DEVICE_MARKER_0001":
                        print_pass(f"testimonials[0].text updated to: CROSS_DEVICE_MARKER_0001")
                        checks.append(True)
                    else:
                        print_fail(f"testimonials[0].text not updated. Expected: CROSS_DEVICE_MARKER_0001, Got: {marker}")
                        checks.append(False)
                else:
                    print_fail("No testimonials found in response")
                    checks.append(False)
                
                if all(checks):
                    self.test_results.append(("C3", True, "Content overwrite working correctly"))
                    return True
                else:
                    self.test_results.append(("C3", False, "Content not overwritten"))
                    return False
            else:
                print_fail(f"GET failed with status {get_response.status_code}")
                self.test_results.append(("C3", False, f"GET failed: {get_response.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("C3", False, f"Exception: {e}"))
            return False
    
    def test_c4_mongodb_singleton_check(self):
        """C4: Check MongoDB for singleton document"""
        print_test("C4", "Verify MongoDB site_content collection has exactly ONE document with _id='singleton'")
        
        try:
            # Count documents in site_content collection
            count = self.db.site_content.count_documents({})
            print_info(f"Total documents in site_content collection: {count}")
            
            if count == 1:
                print_pass("Exactly ONE document in site_content collection")
            else:
                print_fail(f"Expected 1 document, found {count}")
                self.test_results.append(("C4", False, f"Found {count} documents instead of 1"))
                return False
            
            # Check if the document has _id="singleton"
            doc = self.db.site_content.find_one({"_id": "singleton"})
            if doc:
                print_pass("Document with _id='singleton' found")
                print_info(f"Document keys: {list(doc.keys())}")
                
                # Verify it has the latest marker
                testimonials = doc.get("testimonials", [])
                if testimonials and len(testimonials) > 0:
                    marker = testimonials[0].get("text")
                    if marker == "CROSS_DEVICE_MARKER_0001":
                        print_pass(f"Document contains latest marker: CROSS_DEVICE_MARKER_0001")
                        self.test_results.append(("C4", True, "MongoDB singleton document verified"))
                        return True
                    else:
                        print_fail(f"Document has wrong marker: {marker}")
                        self.test_results.append(("C4", False, f"Wrong marker: {marker}"))
                        return False
                else:
                    print_fail("No testimonials in document")
                    self.test_results.append(("C4", False, "No testimonials"))
                    return False
            else:
                print_fail("Document with _id='singleton' not found")
                self.test_results.append(("C4", False, "Singleton document not found"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("C4", False, f"Exception: {e}"))
            return False
    
    def test_c5_regression_tests(self):
        """C5: Regression tests for GET /api/ and POST /api/create-order"""
        print_test("C5", "Regression: GET /api/ and POST /api/create-order")
        
        try:
            # Test GET /api/
            response1 = requests.get(f"{BASE_URL}/", timeout=10)
            if response1.status_code == 200:
                data1 = response1.json()
                if data1.get("message") == "Hello World":
                    print_pass("GET /api/ returns 'Hello World'")
                else:
                    print_fail(f"GET /api/ wrong message: {data1.get('message')}")
                    self.test_results.append(("C5", False, "GET /api/ regression failed"))
                    return False
            else:
                print_fail(f"GET /api/ failed with status {response1.status_code}")
                self.test_results.append(("C5", False, f"GET /api/ failed: {response1.status_code}"))
                return False
            
            # Test POST /api/create-order
            payload = {
                "amount": 999,
                "currency": "INR",
                "kind": "consultation",
                "refId": "cc-60",
                "email": "t@e.com"
            }
            response2 = requests.post(f"{BASE_URL}/create-order", json=payload, timeout=10)
            
            if response2.status_code == 200:
                data2 = response2.json()
                checks = []
                
                if data2.get("orderId", "").startswith("order_"):
                    print_pass(f"orderId starts with 'order_': {data2.get('orderId')}")
                    checks.append(True)
                else:
                    print_fail(f"orderId doesn't start with 'order_': {data2.get('orderId')}")
                    checks.append(False)
                
                if data2.get("keyId", "").startswith("rzp_live_"):
                    print_pass(f"keyId starts with 'rzp_live_': {data2.get('keyId')}")
                    checks.append(True)
                else:
                    print_fail(f"keyId doesn't start with 'rzp_live_': {data2.get('keyId')}")
                    checks.append(False)
                
                if all(checks):
                    self.test_results.append(("C5", True, "Regression tests passed"))
                    return True
                else:
                    self.test_results.append(("C5", False, "create-order validation failed"))
                    return False
            else:
                print_fail(f"POST /api/create-order failed with status {response2.status_code}")
                self.test_results.append(("C5", False, f"create-order failed: {response2.status_code}"))
                return False
        except Exception as e:
            print_fail(f"Exception occurred: {e}")
            self.test_results.append(("C5", False, f"Exception: {e}"))
            return False
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)
        
        passed = sum(1 for _, result, _ in self.test_results if result)
        total = len(self.test_results)
        
        for test_id, result, message in self.test_results:
            status = f"{GREEN}✓ PASS{RESET}" if result else f"{RED}✗ FAIL{RESET}"
            print(f"{status} - Test {test_id}: {message}")
        
        print("\n" + "="*80)
        print(f"TOTAL: {passed}/{total} tests passed")
        print("="*80)
        
        return passed == total
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("\n" + "="*80)
        print("REHABILIFIED BACKEND API TESTING")
        print("="*80)
        print(f"Base URL: {BASE_URL}")
        print(f"MongoDB: {MONGO_URL}/{DB_NAME}")
        print("="*80)
        
        # Setup
        self.cleanup_test_data()
        self.seed_test_user_and_session()
        
        # Run Shared Site Content tests (C1-C5)
        print("\n" + "="*80)
        print("SECTION C: SHARED SITE CONTENT ENDPOINTS")
        print("="*80)
        self.test_c1_put_content_initial()
        self.test_c2_get_content_verify_marker()
        self.test_c3_put_content_overwrite()
        self.test_c4_mongodb_singleton_check()
        self.test_c5_regression_tests()
        
        # Cleanup
        print("\n" + "="*80)
        print("CLEANUP")
        print("="*80)
        self.cleanup_test_data()
        
        # Summary
        all_passed = self.print_summary()
        
        # Close MongoDB connection
        self.mongo_client.close()
        
        return 0 if all_passed else 1


if __name__ == "__main__":
    tester = BackendTester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)
