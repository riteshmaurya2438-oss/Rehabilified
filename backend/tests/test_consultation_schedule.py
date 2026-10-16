"""
Test suite for dynamic consultation schedule settings feature.
Tests the admin-configurable consultation slot days and time windows.
"""
import pytest
import requests
import os
from datetime import date, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_PASSWORD = "TestAdmin@1234"

class TestConsultationConfig:
    """Tests for GET /api/consultation-config endpoint"""
    
    def test_consultation_config_returns_200(self):
        """GET /api/consultation-config should return 200"""
        response = requests.get(f"{BASE_URL}/api/consultation-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ GET /api/consultation-config returns 200")
    
    def test_consultation_config_structure(self):
        """GET /api/consultation-config should return proper structure"""
        response = requests.get(f"{BASE_URL}/api/consultation-config")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "days" in data, "Response missing 'days' field"
        assert "dayNames" in data, "Response missing 'dayNames' field"
        assert "startHour" in data, "Response missing 'startHour' field"
        assert "endHour" in data, "Response missing 'endHour' field"
        assert "slotMinutes" in data, "Response missing 'slotMinutes' field"
        assert "displayText" in data, "Response missing 'displayText' field"
        
        # Validate types
        assert isinstance(data["days"], list), "days should be a list"
        assert isinstance(data["dayNames"], list), "dayNames should be a list"
        assert isinstance(data["startHour"], int), "startHour should be an int"
        assert isinstance(data["endHour"], int), "endHour should be an int"
        assert isinstance(data["slotMinutes"], int), "slotMinutes should be an int"
        assert isinstance(data["displayText"], str), "displayText should be a string"
        
        print(f"✓ Config structure valid: days={data['days']}, startHour={data['startHour']}, endHour={data['endHour']}")
        print(f"✓ Display text: {data['displayText']}")
    
    def test_consultation_config_display_text_format(self):
        """Display text should mention days and time window"""
        response = requests.get(f"{BASE_URL}/api/consultation-config")
        assert response.status_code == 200
        data = response.json()
        
        display_text = data["displayText"]
        # Should contain "Slots are available" and time info
        assert "Slots are available" in display_text, f"Display text format unexpected: {display_text}"
        assert "from" in display_text.lower(), f"Display text should mention time range: {display_text}"
        print(f"✓ Display text format correct: {display_text}")


class TestConsultationSlots:
    """Tests for GET /api/consultation-slots endpoint"""
    
    @pytest.fixture
    def valid_weekday_date(self):
        """Get a valid Mon-Thu date within next 7 days"""
        today = date.today()
        for i in range(1, 8):
            d = today + timedelta(days=i)
            if d.weekday() <= 3:  # Mon=0, Thu=3
                return d.isoformat()
        return None
    
    @pytest.fixture
    def weekend_date(self):
        """Get a weekend date within next 7 days"""
        today = date.today()
        for i in range(1, 8):
            d = today + timedelta(days=i)
            if d.weekday() >= 5:  # Sat=5, Sun=6
                return d.isoformat()
        return None
    
    def test_consultation_slots_valid_date_30min(self, valid_weekday_date):
        """GET /api/consultation-slots with valid date returns slots for 30-min"""
        if not valid_weekday_date:
            pytest.skip("No valid weekday in next 7 days")
        
        response = requests.get(f"{BASE_URL}/api/consultation-slots?date={valid_weekday_date}&duration=30")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "date" in data, "Response missing 'date' field"
        assert "duration" in data, "Response missing 'duration' field"
        assert "slots" in data, "Response missing 'slots' field"
        assert "config" in data, "Response missing 'config' field"
        
        assert data["date"] == valid_weekday_date
        assert data["duration"] == 30
        assert isinstance(data["slots"], list)
        
        # Check slot structure
        if len(data["slots"]) > 0:
            slot = data["slots"][0]
            assert "time" in slot, "Slot missing 'time' field"
            assert "available" in slot, "Slot missing 'available' field"
        
        print(f"✓ GET /api/consultation-slots (30-min) returns {len(data['slots'])} slots for {valid_weekday_date}")
    
    def test_consultation_slots_valid_date_60min(self, valid_weekday_date):
        """GET /api/consultation-slots with valid date returns slots for 60-min"""
        if not valid_weekday_date:
            pytest.skip("No valid weekday in next 7 days")
        
        response = requests.get(f"{BASE_URL}/api/consultation-slots?date={valid_weekday_date}&duration=60")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["duration"] == 60
        assert isinstance(data["slots"], list)
        
        # 60-min slots should have 'end' field
        if len(data["slots"]) > 0:
            slot = data["slots"][0]
            assert "time" in slot
            assert "end" in slot, "60-min slot missing 'end' field"
            assert "available" in slot
        
        print(f"✓ GET /api/consultation-slots (60-min) returns {len(data['slots'])} slots for {valid_weekday_date}")
    
    def test_consultation_slots_weekend_rejected(self, weekend_date):
        """GET /api/consultation-slots with weekend date should return 400 (if weekends not allowed)"""
        if not weekend_date:
            pytest.skip("No weekend date in next 7 days")
        
        # First check if weekends are in allowed days
        config_response = requests.get(f"{BASE_URL}/api/consultation-config")
        config = config_response.json()
        allowed_days = config.get("days", [0, 1, 2, 3])
        
        # If weekends (5=Sat, 6=Sun) are not in allowed days, expect 400
        if 5 not in allowed_days and 6 not in allowed_days:
            response = requests.get(f"{BASE_URL}/api/consultation-slots?date={weekend_date}&duration=30")
            assert response.status_code == 400, f"Expected 400 for weekend, got {response.status_code}"
            print(f"✓ Weekend date {weekend_date} correctly rejected with 400")
        else:
            pytest.skip("Weekends are allowed in current config")
    
    def test_consultation_slots_invalid_date_format(self):
        """GET /api/consultation-slots with invalid date format returns 400"""
        response = requests.get(f"{BASE_URL}/api/consultation-slots?date=invalid-date&duration=30")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Invalid date format correctly rejected with 400")
    
    def test_consultation_slots_past_date_rejected(self):
        """GET /api/consultation-slots with past date returns 400"""
        yesterday = (date.today() - timedelta(days=1)).isoformat()
        response = requests.get(f"{BASE_URL}/api/consultation-slots?date={yesterday}&duration=30")
        assert response.status_code == 400, f"Expected 400 for past date, got {response.status_code}"
        print(f"✓ Past date {yesterday} correctly rejected with 400")
    
    def test_consultation_slots_config_in_response(self, valid_weekday_date):
        """GET /api/consultation-slots should include config in response"""
        if not valid_weekday_date:
            pytest.skip("No valid weekday in next 7 days")
        
        response = requests.get(f"{BASE_URL}/api/consultation-slots?date={valid_weekday_date}&duration=30")
        assert response.status_code == 200
        
        data = response.json()
        config = data.get("config", {})
        
        assert "days" in config, "Config missing 'days'"
        assert "startHour" in config, "Config missing 'startHour'"
        assert "endHour" in config, "Config missing 'endHour'"
        
        print(f"✓ Slots response includes config: days={config['days']}, hours={config['startHour']}-{config['endHour']}")


class TestAdminConsultationSettings:
    """Tests for admin saving consultation schedule settings"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={"password": ADMIN_PASSWORD})
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_admin_can_get_content(self, admin_token):
        """Admin can GET /api/content to see current settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/content", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        settings = data.get("settings", {})
        consultation_slots = settings.get("consultationSlots", {})
        
        print(f"✓ Current consultation settings: {consultation_slots}")
    
    def test_admin_can_update_consultation_schedule(self, admin_token):
        """Admin can PUT /api/content to update consultation schedule"""
        headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
        
        # First get current content
        get_response = requests.get(f"{BASE_URL}/api/content", headers=headers)
        current_content = get_response.json() if get_response.status_code == 200 else {}
        
        # Update with new consultation schedule
        new_settings = current_content.get("settings", {})
        new_settings["consultationSlots"] = {
            "days": [0, 1, 2, 3],  # Mon-Thu
            "startHour": 14,
            "endHour": 17,
            "slotMinutes": 30
        }
        current_content["settings"] = new_settings
        
        response = requests.put(f"{BASE_URL}/api/content", headers=headers, json=current_content)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change persisted
        verify_response = requests.get(f"{BASE_URL}/api/consultation-config")
        verify_data = verify_response.json()
        
        assert verify_data["days"] == [0, 1, 2, 3], f"Days not updated: {verify_data['days']}"
        assert verify_data["startHour"] == 14, f"Start hour not updated: {verify_data['startHour']}"
        assert verify_data["endHour"] == 17, f"End hour not updated: {verify_data['endHour']}"
        
        print("✓ Admin successfully updated consultation schedule settings")
        print(f"✓ Verified config: days={verify_data['days']}, hours={verify_data['startHour']}-{verify_data['endHour']}")


class TestManifestAndFavicon:
    """Tests for manifest.json and favicon cache-busting"""
    
    def test_manifest_json_loads(self):
        """GET /manifest.json should return valid manifest"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "name" in data, "Manifest missing 'name'"
        assert "Rehabilified" in data["name"], f"Manifest name unexpected: {data['name']}"
        
        print(f"✓ manifest.json loads correctly with name: {data['name']}")
    
    def test_manifest_has_icons(self):
        """manifest.json should have icons array"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        data = response.json()
        assert "icons" in data, "Manifest missing 'icons'"
        assert isinstance(data["icons"], list), "Icons should be a list"
        assert len(data["icons"]) > 0, "Icons array should not be empty"
        
        print(f"✓ manifest.json has {len(data['icons'])} icons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
