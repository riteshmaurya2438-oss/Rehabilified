"""
Backend API tests for Rehabilified - Physiotherapy Education Platform
Tests: Health check, Content API, Auth endpoints, Consultation slots, Admin auth
"""
import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Calculate a valid Mon-Thu date within next 7 days for consultation slot testing
def get_valid_consultation_date():
    today = date.today()
    for i in range(1, 8):
        d = today + timedelta(days=i)
        if d.weekday() <= 3:  # Mon=0, Thu=3
            return d.isoformat()
    return None

VALID_DATE = get_valid_consultation_date()

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthAndBasicEndpoints:
    """Basic health check and root endpoint tests"""
    
    def test_root_endpoint(self, api_client):
        """Test root API endpoint returns 200"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "Hello World"
        print(f"✓ Root endpoint working: {data}")
    
    def test_content_endpoint(self, api_client):
        """Test GET /api/content returns site content"""
        response = api_client.get(f"{BASE_URL}/api/content")
        assert response.status_code == 200
        data = response.json()
        # Content can be empty dict if not configured
        assert isinstance(data, dict)
        print(f"✓ Content endpoint working, keys: {list(data.keys())[:5]}")


class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_auth_me_unauthenticated(self, api_client):
        """Test GET /api/auth/me returns 401 when not authenticated"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"✓ Auth/me correctly returns 401 for unauthenticated: {data['detail']}")
    
    def test_auth_logout(self, api_client):
        """Test POST /api/auth/logout works"""
        response = api_client.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data.get("ok") == True
        print(f"✓ Logout endpoint working: {data}")
    
    def test_google_login_redirect(self, api_client):
        """Test GET /api/auth/google/login returns 307 redirect to Google"""
        response = api_client.get(f"{BASE_URL}/api/auth/google/login", allow_redirects=False)
        assert response.status_code == 307
        location = response.headers.get("Location", "")
        assert "accounts.google.com" in location
        assert "client_id=351024347825" in location  # Verify correct client_id
        print(f"✓ Google login redirects to: {location[:80]}...")


class TestConsultationSlots:
    """Consultation slot API tests"""
    
    def test_consultation_slots_valid_date_30min(self, api_client):
        """Test GET /api/consultation-slots with valid Mon-Thu date for 30-min slots"""
        if not VALID_DATE:
            pytest.skip("No valid Mon-Thu date found in next 7 days")
        
        response = api_client.get(f"{BASE_URL}/api/consultation-slots?date={VALID_DATE}&duration=30")
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == VALID_DATE
        assert data["duration"] == 30
        assert "slots" in data
        assert isinstance(data["slots"], list)
        # Should have 6 base slots (14:00, 14:30, 15:00, 15:30, 16:00, 16:30)
        assert len(data["slots"]) == 6
        print(f"✓ 30-min slots for {VALID_DATE}: {len(data['slots'])} slots returned")
        for slot in data["slots"]:
            assert "time" in slot
            assert "available" in slot
    
    def test_consultation_slots_valid_date_60min(self, api_client):
        """Test GET /api/consultation-slots with valid Mon-Thu date for 60-min slots"""
        if not VALID_DATE:
            pytest.skip("No valid Mon-Thu date found in next 7 days")
        
        response = api_client.get(f"{BASE_URL}/api/consultation-slots?date={VALID_DATE}&duration=60")
        assert response.status_code == 200
        data = response.json()
        assert data["date"] == VALID_DATE
        assert data["duration"] == 60
        assert "slots" in data
        assert isinstance(data["slots"], list)
        # 60-min slots should have 5 options (consecutive pairs)
        assert len(data["slots"]) == 5
        print(f"✓ 60-min slots for {VALID_DATE}: {len(data['slots'])} slots returned")
    
    def test_consultation_slots_weekend_date_rejected(self, api_client):
        """Test GET /api/consultation-slots with weekend date returns 400"""
        # Find a weekend date
        today = date.today()
        for i in range(1, 8):
            d = today + timedelta(days=i)
            if d.weekday() >= 5:  # Sat=5, Sun=6
                weekend_date = d.isoformat()
                break
        else:
            pytest.skip("No weekend date found in next 7 days")
        
        response = api_client.get(f"{BASE_URL}/api/consultation-slots?date={weekend_date}&duration=30")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "Monday to Thursday" in data["detail"]
        print(f"✓ Weekend date {weekend_date} correctly rejected: {data['detail']}")
    
    def test_consultation_slots_invalid_date_format(self, api_client):
        """Test GET /api/consultation-slots with invalid date format returns 400"""
        response = api_client.get(f"{BASE_URL}/api/consultation-slots?date=invalid-date&duration=30")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid date format correctly rejected: {data['detail']}")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_status(self, api_client):
        """Test GET /api/admin/status returns admin configuration status"""
        response = api_client.get(f"{BASE_URL}/api/admin/status")
        assert response.status_code == 200
        data = response.json()
        assert "configured" in data
        assert "setupAvailable" in data
        assert "lockedSeconds" in data
        print(f"✓ Admin status: configured={data['configured']}, setupAvailable={data['setupAvailable']}")
    
    def test_admin_login_wrong_password(self, api_client):
        """Test POST /api/admin/login with wrong password"""
        response = api_client.post(f"{BASE_URL}/api/admin/login", json={"password": "wrongpassword"})
        # Should be 401 (wrong password) or 409 (not configured)
        assert response.status_code in [401, 409, 429]
        print(f"✓ Admin login with wrong password: status {response.status_code}")
    
    def test_admin_session_unauthenticated(self, api_client):
        """Test GET /api/admin/session without auth returns 401"""
        response = api_client.get(f"{BASE_URL}/api/admin/session")
        assert response.status_code == 401
        print(f"✓ Admin session check correctly returns 401 for unauthenticated")


class TestPurchasesEndpoints:
    """Purchase-related endpoint tests"""
    
    def test_purchases_unauthenticated(self, api_client):
        """Test GET /api/purchases returns 401 when not authenticated"""
        response = api_client.get(f"{BASE_URL}/api/purchases")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print(f"✓ Purchases endpoint correctly returns 401 for unauthenticated")
    
    def test_admin_purchases_unauthenticated(self, api_client):
        """Test GET /api/admin/purchases returns 401 when not admin"""
        response = api_client.get(f"{BASE_URL}/api/admin/purchases")
        assert response.status_code == 401
        print(f"✓ Admin purchases endpoint correctly returns 401 for non-admin")


class TestPaymentEndpoints:
    """Payment-related endpoint tests"""
    
    def test_create_order_invalid_amount(self, api_client):
        """Test POST /api/create-order with invalid amount"""
        response = api_client.post(f"{BASE_URL}/api/create-order", json={
            "amount": 0,
            "currency": "INR"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"✓ Create order with zero amount correctly rejected: {data['detail']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
