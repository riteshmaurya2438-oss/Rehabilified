"""
Test suite for Coupon Management feature
- Admin CRUD operations for coupons
- Coupon validation endpoint
- Edge cases: expired, invalid, wrong kind, duplicate codes
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_PASSWORD = "TestAdmin@1234"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="class")
def created_coupon_ids():
    """Track test-created coupons for cleanup"""
    return []


@pytest.fixture(scope="class", autouse=True)
def cleanup_test_coupons(created_coupon_ids, admin_headers):
    """Delete only the coupons this test class created"""
    yield
    if not created_coupon_ids:
        return
    for coupon_id in created_coupon_ids:
        try:
            requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
        except Exception:
            pass


class TestAdminCouponCRUD:
    """Admin coupon CRUD operations"""

    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"Admin login successful, token received")

    def test_list_coupons(self, admin_headers):
        """GET /api/admin/coupons - List all coupons"""
        response = requests.get(f"{BASE_URL}/api/admin/coupons", headers=admin_headers)
        assert response.status_code == 200, f"List coupons failed: {response.text}"
        data = response.json()
        assert "coupons" in data, "Response should have 'coupons' key"
        assert isinstance(data["coupons"], list), "Coupons should be a list"
        print(f"Listed {len(data['coupons'])} coupons")

    def test_create_coupon_percent(self, admin_headers, created_coupon_ids):
        """POST /api/admin/coupons - Create percentage discount coupon"""
        payload = {
            "code": "TEST_PERCENT20",
            "name": "Test 20% Off",
            "discount_type": "percent",
            "discount_value": 20,
            "applies_to": ["course", "lecture"],
            "max_uses": 100,
            "expires_at": (datetime.now() + timedelta(days=30)).isoformat()
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Create coupon failed: {response.text}"
        data = response.json()
        assert data.get("ok") is True, "Response should have ok=True"
        assert "coupon" in data, "Response should have coupon object"
        coupon = data["coupon"]
        created_coupon_ids.append(coupon["coupon_id"])
        
        # Verify coupon fields
        assert coupon["code"] == "TEST_PERCENT20"
        assert coupon["discount_type"] == "percent"
        assert coupon["discount_value"] == 20
        assert coupon["active"] is True
        assert coupon["usage_count"] == 0
        print(f"Created percent coupon: {coupon['coupon_id']}")

    def test_create_coupon_fixed(self, admin_headers, created_coupon_ids):
        """POST /api/admin/coupons - Create fixed amount discount coupon"""
        payload = {
            "code": "TEST_FIXED100",
            "name": "Test Rs.100 Off",
            "discount_type": "fixed",
            "discount_value": 100,
            "applies_to": ["all"],
            "max_uses": None
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Create fixed coupon failed: {response.text}"
        data = response.json()
        coupon = data["coupon"]
        created_coupon_ids.append(coupon["coupon_id"])
        
        assert coupon["code"] == "TEST_FIXED100"
        assert coupon["discount_type"] == "fixed"
        assert coupon["discount_value"] == 100
        assert "all" in coupon["applies_to"]
        print(f"Created fixed coupon: {coupon['coupon_id']}")

    def test_duplicate_coupon_code_returns_409(self, admin_headers, created_coupon_ids):
        """POST /api/admin/coupons - Duplicate code returns 409"""
        # First create a coupon
        payload = {
            "code": "TEST_DUPLICATE",
            "name": "First coupon",
            "discount_type": "percent",
            "discount_value": 10,
            "applies_to": ["course"]
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert response.status_code == 200
        created_coupon_ids.append(response.json()["coupon"]["coupon_id"])
        
        # Try to create another with same code
        payload2 = {
            "code": "TEST_DUPLICATE",
            "name": "Second coupon",
            "discount_type": "fixed",
            "discount_value": 50,
            "applies_to": ["lecture"]
        }
        response2 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload2, headers=admin_headers)
        assert response2.status_code == 409, f"Expected 409 for duplicate code, got {response2.status_code}"
        print("Duplicate coupon code correctly returns 409")

    def test_toggle_coupon_active(self, admin_headers, created_coupon_ids):
        """PATCH /api/admin/coupons/{id}/toggle - Toggle active state"""
        # Create a coupon first
        payload = {
            "code": "TEST_TOGGLE",
            "name": "Toggle Test",
            "discount_type": "percent",
            "discount_value": 15,
            "applies_to": ["course"]
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert response.status_code == 200
        coupon_id = response.json()["coupon"]["coupon_id"]
        created_coupon_ids.append(coupon_id)
        
        # Toggle to inactive
        toggle_response = requests.patch(f"{BASE_URL}/api/admin/coupons/{coupon_id}/toggle", headers=admin_headers)
        assert toggle_response.status_code == 200, f"Toggle failed: {toggle_response.text}"
        data = toggle_response.json()
        assert data.get("ok") is True
        assert data.get("active") is False, "Coupon should be inactive after toggle"
        
        # Toggle back to active
        toggle_response2 = requests.patch(f"{BASE_URL}/api/admin/coupons/{coupon_id}/toggle", headers=admin_headers)
        assert toggle_response2.status_code == 200
        assert toggle_response2.json().get("active") is True
        print(f"Toggle coupon active state works correctly")

    def test_delete_coupon(self, admin_headers):
        """DELETE /api/admin/coupons/{id} - Delete a coupon"""
        # Create a coupon to delete
        payload = {
            "code": "TEST_DELETE",
            "name": "To Be Deleted",
            "discount_type": "percent",
            "discount_value": 5,
            "applies_to": ["lecture"]
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert response.status_code == 200
        coupon_id = response.json()["coupon"]["coupon_id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        assert delete_response.json().get("ok") is True
        
        # Verify it's gone - list should not contain it
        list_response = requests.get(f"{BASE_URL}/api/admin/coupons", headers=admin_headers)
        coupons = list_response.json().get("coupons", [])
        coupon_ids = [c["coupon_id"] for c in coupons]
        assert coupon_id not in coupon_ids, "Deleted coupon should not appear in list"
        print(f"Coupon {coupon_id} deleted successfully")

    def test_delete_nonexistent_coupon_returns_404(self, admin_headers):
        """DELETE /api/admin/coupons/{id} - Non-existent coupon returns 404"""
        response = requests.delete(f"{BASE_URL}/api/admin/coupons/nonexistent_id_12345", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Delete non-existent coupon correctly returns 404")


class TestCouponValidation:
    """Coupon validation endpoint tests"""

    def test_validate_existing_coupon_flat50(self):
        """POST /api/coupons/validate - Validate pre-existing FLAT50 coupon"""
        payload = {
            "code": "FLAT50",
            "kind": "course",
            "amount": 1000
        }
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json=payload)
        assert response.status_code == 200, f"Validate FLAT50 failed: {response.text}"
        data = response.json()
        assert data.get("valid") is True
        assert data.get("code") == "FLAT50"
        assert data.get("discount_type") == "percent"
        assert data.get("discount_value") == 50
        # 50% of 1000 = 500 discount
        assert data.get("discount_amount") == 500
        assert data.get("final_amount") == 500
        print(f"FLAT50 validation: {data}")

    def test_validate_coupon_for_lecture(self):
        """POST /api/coupons/validate - FLAT50 works for lectures"""
        payload = {
            "code": "FLAT50",
            "kind": "lecture",
            "amount": 500
        }
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json=payload)
        assert response.status_code == 200, f"Validate for lecture failed: {response.text}"
        data = response.json()
        assert data.get("valid") is True
        assert data.get("discount_amount") == 250  # 50% of 500
        assert data.get("final_amount") == 250
        print(f"FLAT50 for lecture: discount={data['discount_amount']}, final={data['final_amount']}")

    def test_validate_coupon_for_consultation(self):
        """POST /api/coupons/validate - FLAT50 works for consultations"""
        payload = {
            "code": "FLAT50",
            "kind": "consultation",
            "amount": 799
        }
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json=payload)
        assert response.status_code == 200, f"Validate for consultation failed: {response.text}"
        data = response.json()
        assert data.get("valid") is True
        # 50% of 799 = 399.5
        assert data.get("discount_amount") == 399.5
        assert data.get("final_amount") == 399.5
        print(f"FLAT50 for consultation: discount={data['discount_amount']}, final={data['final_amount']}")

    def test_validate_invalid_coupon_code(self):
        """POST /api/coupons/validate - Invalid code returns 404"""
        payload = {
            "code": "INVALIDCODE123",
            "kind": "course",
            "amount": 1000
        }
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json=payload)
        assert response.status_code == 404, f"Expected 404 for invalid code, got {response.status_code}"
        print("Invalid coupon code correctly returns 404")

    def test_validate_empty_coupon_code(self):
        """POST /api/coupons/validate - Empty code returns 400"""
        payload = {
            "code": "",
            "kind": "course",
            "amount": 1000
        }
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json=payload)
        assert response.status_code == 400, f"Expected 400 for empty code, got {response.status_code}"
        print("Empty coupon code correctly returns 400")

    def test_validate_expired_coupon(self, admin_headers, created_coupon_ids):
        """POST /api/coupons/validate - Expired coupon returns 400"""
        # Create an expired coupon
        payload = {
            "code": "TEST_EXPIRED",
            "name": "Expired Coupon",
            "discount_type": "percent",
            "discount_value": 10,
            "applies_to": ["all"],
            "expires_at": (datetime.now() - timedelta(days=1)).isoformat()  # Yesterday
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        if response.status_code == 200:
            created_coupon_ids.append(response.json()["coupon"]["coupon_id"])
        
        # Try to validate it
        validate_payload = {
            "code": "TEST_EXPIRED",
            "kind": "course",
            "amount": 1000
        }
        validate_response = requests.post(f"{BASE_URL}/api/coupons/validate", json=validate_payload)
        assert validate_response.status_code == 400, f"Expected 400 for expired coupon, got {validate_response.status_code}"
        assert "expired" in validate_response.json().get("detail", "").lower()
        print("Expired coupon correctly returns 400")

    def test_validate_coupon_wrong_kind(self, admin_headers, created_coupon_ids):
        """POST /api/coupons/validate - Coupon not valid for kind returns 400"""
        # Create a coupon only for courses
        payload = {
            "code": "TEST_COURSEONLY",
            "name": "Course Only",
            "discount_type": "percent",
            "discount_value": 25,
            "applies_to": ["course"]  # Only courses
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        if response.status_code == 200:
            created_coupon_ids.append(response.json()["coupon"]["coupon_id"])
        
        # Try to use it for a lecture
        validate_payload = {
            "code": "TEST_COURSEONLY",
            "kind": "lecture",
            "amount": 500
        }
        validate_response = requests.post(f"{BASE_URL}/api/coupons/validate", json=validate_payload)
        assert validate_response.status_code == 400, f"Expected 400 for wrong kind, got {validate_response.status_code}"
        assert "not valid for" in validate_response.json().get("detail", "").lower()
        print("Coupon for wrong kind correctly returns 400")

    def test_validate_inactive_coupon(self, admin_headers, created_coupon_ids):
        """POST /api/coupons/validate - Inactive coupon returns 404"""
        # Create and deactivate a coupon
        payload = {
            "code": "TEST_INACTIVE",
            "name": "Inactive Coupon",
            "discount_type": "percent",
            "discount_value": 30,
            "applies_to": ["all"]
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert response.status_code == 200
        coupon_id = response.json()["coupon"]["coupon_id"]
        created_coupon_ids.append(coupon_id)
        
        # Deactivate it
        toggle_response = requests.patch(f"{BASE_URL}/api/admin/coupons/{coupon_id}/toggle", headers=admin_headers)
        assert toggle_response.status_code == 200
        assert toggle_response.json().get("active") is False
        
        # Try to validate it
        validate_payload = {
            "code": "TEST_INACTIVE",
            "kind": "course",
            "amount": 1000
        }
        validate_response = requests.post(f"{BASE_URL}/api/coupons/validate", json=validate_payload)
        assert validate_response.status_code == 404, f"Expected 404 for inactive coupon, got {validate_response.status_code}"
        print("Inactive coupon correctly returns 404")


class TestCouponEdgeCases:
    """Edge cases and validation rules"""

    def test_coupon_code_uppercase_conversion(self, admin_headers, created_coupon_ids):
        """Coupon codes are converted to uppercase"""
        payload = {
            "code": "test_lowercase",
            "name": "Lowercase Test",
            "discount_type": "percent",
            "discount_value": 5,
            "applies_to": ["all"]
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert response.status_code == 200
        coupon = response.json()["coupon"]
        created_coupon_ids.append(coupon["coupon_id"])
        assert coupon["code"] == "TEST_LOWERCASE", "Code should be uppercase"
        print("Coupon code correctly converted to uppercase")

    def test_validate_coupon_case_insensitive(self, admin_headers, created_coupon_ids):
        """Validation is case-insensitive"""
        # Create a coupon
        payload = {
            "code": "TEST_CASETEST",
            "name": "Case Test",
            "discount_type": "percent",
            "discount_value": 10,
            "applies_to": ["all"]
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        if response.status_code == 200:
            created_coupon_ids.append(response.json()["coupon"]["coupon_id"])
        
        # Validate with lowercase
        validate_payload = {
            "code": "test_casetest",
            "kind": "course",
            "amount": 100
        }
        validate_response = requests.post(f"{BASE_URL}/api/coupons/validate", json=validate_payload)
        assert validate_response.status_code == 200, f"Case-insensitive validation failed: {validate_response.text}"
        print("Coupon validation is case-insensitive")

    def test_fixed_discount_cannot_exceed_amount(self, admin_headers, created_coupon_ids):
        """Fixed discount is capped at the item amount"""
        # Create a large fixed discount coupon
        payload = {
            "code": "TEST_BIGFIXED",
            "name": "Big Fixed Discount",
            "discount_type": "fixed",
            "discount_value": 5000,  # Rs.5000 off
            "applies_to": ["all"]
        }
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        if response.status_code == 200:
            created_coupon_ids.append(response.json()["coupon"]["coupon_id"])
        
        # Validate with smaller amount
        validate_payload = {
            "code": "TEST_BIGFIXED",
            "kind": "course",
            "amount": 500  # Only Rs.500
        }
        validate_response = requests.post(f"{BASE_URL}/api/coupons/validate", json=validate_payload)
        assert validate_response.status_code == 200
        data = validate_response.json()
        # Discount should be capped at 500 (the item amount)
        assert data.get("discount_amount") == 500, f"Discount should be capped at item amount, got {data.get('discount_amount')}"
        assert data.get("final_amount") == 0, f"Final amount should be 0, got {data.get('final_amount')}"
        print("Fixed discount correctly capped at item amount")


class TestAdminAuthRequired:
    """Verify admin endpoints require authentication"""

    def test_list_coupons_requires_auth(self):
        """GET /api/admin/coupons requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/coupons")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("List coupons correctly requires auth")

    def test_create_coupon_requires_auth(self):
        """POST /api/admin/coupons requires auth"""
        payload = {"code": "NOAUTH", "discount_type": "percent", "discount_value": 10, "applies_to": ["all"]}
        response = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload)
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Create coupon correctly requires auth")

    def test_delete_coupon_requires_auth(self):
        """DELETE /api/admin/coupons/{id} requires auth"""
        response = requests.delete(f"{BASE_URL}/api/admin/coupons/some_id")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Delete coupon correctly requires auth")

    def test_toggle_coupon_requires_auth(self):
        """PATCH /api/admin/coupons/{id}/toggle requires auth"""
        response = requests.patch(f"{BASE_URL}/api/admin/coupons/some_id/toggle")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("Toggle coupon correctly requires auth")
