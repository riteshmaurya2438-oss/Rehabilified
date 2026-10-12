"""
Test suite for Consultation Slots API
Tests the /api/consultation-slots endpoint for:
- 30-min duration slots (6 slots: 14:00 to 16:30)
- 60-min duration slots (5 slots: 14:00 to 16:00)
- Weekend date rejection (Fri/Sat/Sun)
- Date range validation (within 7 days)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

def get_next_weekday(target_weekday):
    """Get the next date for a specific weekday (0=Mon, 1=Tue, ..., 6=Sun)"""
    today = datetime.now()
    days_ahead = target_weekday - today.weekday()
    if days_ahead <= 0:  # Target day already happened this week
        days_ahead += 7
    return (today + timedelta(days=days_ahead)).strftime('%Y-%m-%d')

def get_date_days_ahead(days):
    """Get date N days from today"""
    return (datetime.now() + timedelta(days=days)).strftime('%Y-%m-%d')


class TestConsultationSlots30Min:
    """Tests for 30-minute consultation slots"""
    
    def test_get_slots_30min_returns_6_slots(self):
        """GET /api/consultation-slots?date=YYYY-MM-DD&duration=30 returns 6 slots"""
        # Get next Monday (weekday 0)
        monday = get_next_weekday(0)
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": monday, "duration": 30}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "slots" in data, "Response should contain 'slots' key"
        assert "date" in data, "Response should contain 'date' key"
        assert "duration" in data, "Response should contain 'duration' key"
        
        slots = data["slots"]
        assert len(slots) == 6, f"Expected 6 slots for 30-min duration, got {len(slots)}"
        
        # Verify slot times are 14:00 to 16:30
        expected_times = ["14:00", "14:30", "15:00", "15:30", "16:00", "16:30"]
        actual_times = [s["time"] for s in slots]
        assert actual_times == expected_times, f"Expected times {expected_times}, got {actual_times}"
        
        # Verify each slot has 'available' field
        for slot in slots:
            assert "time" in slot, "Each slot should have 'time' field"
            assert "available" in slot, "Each slot should have 'available' field"
            assert isinstance(slot["available"], bool), "'available' should be boolean"
        
        print(f"✓ 30-min slots test passed: {len(slots)} slots returned for {monday}")

    def test_get_slots_30min_tuesday(self):
        """Test 30-min slots on Tuesday"""
        tuesday = get_next_weekday(1)
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": tuesday, "duration": 30}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["slots"]) == 6
        print(f"✓ 30-min slots on Tuesday ({tuesday}) passed")


class TestConsultationSlots60Min:
    """Tests for 60-minute consultation slots"""
    
    def test_get_slots_60min_returns_5_slots(self):
        """GET /api/consultation-slots?date=YYYY-MM-DD&duration=60 returns 5 slots"""
        # Get next Wednesday (weekday 2)
        wednesday = get_next_weekday(2)
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": wednesday, "duration": 60}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "slots" in data
        
        slots = data["slots"]
        # For 60-min, we need consecutive pairs, so 5 start times: 14:00, 14:30, 15:00, 15:30, 16:00
        assert len(slots) == 5, f"Expected 5 slots for 60-min duration, got {len(slots)}"
        
        # Verify slot times are 14:00 to 16:00 (can't start at 16:30 for 60-min)
        expected_times = ["14:00", "14:30", "15:00", "15:30", "16:00"]
        actual_times = [s["time"] for s in slots]
        assert actual_times == expected_times, f"Expected times {expected_times}, got {actual_times}"
        
        # Verify each slot has end time for 60-min
        for slot in slots:
            assert "time" in slot
            assert "available" in slot
            assert "end" in slot, "60-min slots should have 'end' field"
        
        print(f"✓ 60-min slots test passed: {len(slots)} slots returned for {wednesday}")

    def test_get_slots_60min_thursday(self):
        """Test 60-min slots on Thursday"""
        thursday = get_next_weekday(3)
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": thursday, "duration": 60}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data["slots"]) == 5
        print(f"✓ 60-min slots on Thursday ({thursday}) passed")


class TestWeekendRejection:
    """Tests for weekend date rejection"""
    
    def test_rejects_friday(self):
        """GET /api/consultation-slots rejects Friday with 400 error"""
        friday = get_next_weekday(4)  # Friday is weekday 4
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": friday, "duration": 30}
        )
        
        assert response.status_code == 400, f"Expected 400 for Friday, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "Monday" in data["detail"] or "Thursday" in data["detail"], \
            f"Error message should mention Mon-Thu: {data['detail']}"
        print(f"✓ Friday ({friday}) correctly rejected with 400")

    def test_rejects_saturday(self):
        """GET /api/consultation-slots rejects Saturday with 400 error"""
        saturday = get_next_weekday(5)  # Saturday is weekday 5
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": saturday, "duration": 30}
        )
        
        assert response.status_code == 400, f"Expected 400 for Saturday, got {response.status_code}"
        print(f"✓ Saturday ({saturday}) correctly rejected with 400")

    def test_rejects_sunday(self):
        """GET /api/consultation-slots rejects Sunday with 400 error"""
        sunday = get_next_weekday(6)  # Sunday is weekday 6
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": sunday, "duration": 30}
        )
        
        assert response.status_code == 400, f"Expected 400 for Sunday, got {response.status_code}"
        print(f"✓ Sunday ({sunday}) correctly rejected with 400")


class TestDateRangeValidation:
    """Tests for date range validation (within 7 days)"""
    
    def test_rejects_date_more_than_7_days_ahead(self):
        """GET /api/consultation-slots rejects dates more than 7 days ahead"""
        # Get a Monday that's 10 days ahead
        far_date = get_date_days_ahead(10)
        # Make sure it's a weekday (Mon-Thu)
        far_dt = datetime.strptime(far_date, '%Y-%m-%d')
        while far_dt.weekday() > 3:  # If it's Fri/Sat/Sun, move to next Monday
            far_dt += timedelta(days=1)
        far_date = far_dt.strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": far_date, "duration": 30}
        )
        
        assert response.status_code == 400, f"Expected 400 for date >7 days ahead, got {response.status_code}"
        data = response.json()
        assert "detail" in data
        assert "7 days" in data["detail"], f"Error should mention 7 days: {data['detail']}"
        print(f"✓ Date >7 days ahead ({far_date}) correctly rejected with 400")

    def test_rejects_today(self):
        """GET /api/consultation-slots rejects today's date"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": today, "duration": 30}
        )
        
        # Today should be rejected (must be future date)
        assert response.status_code == 400, f"Expected 400 for today, got {response.status_code}"
        print(f"✓ Today's date ({today}) correctly rejected")

    def test_rejects_past_date(self):
        """GET /api/consultation-slots rejects past dates"""
        past_date = (datetime.now() - timedelta(days=5)).strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": past_date, "duration": 30}
        )
        
        assert response.status_code == 400, f"Expected 400 for past date, got {response.status_code}"
        print(f"✓ Past date ({past_date}) correctly rejected")


class TestInvalidInputs:
    """Tests for invalid input handling"""
    
    def test_rejects_invalid_date_format(self):
        """GET /api/consultation-slots rejects invalid date format"""
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": "13-01-2026", "duration": 30}  # Wrong format
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid date format, got {response.status_code}"
        print("✓ Invalid date format correctly rejected")

    def test_missing_date_parameter(self):
        """GET /api/consultation-slots requires date parameter"""
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"duration": 30}
        )
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422 for missing date, got {response.status_code}"
        print("✓ Missing date parameter correctly rejected")


class TestSlotAvailability:
    """Tests for slot availability status"""
    
    def test_slots_have_availability_status(self):
        """Each slot should have available: true/false"""
        monday = get_next_weekday(0)
        
        response = requests.get(
            f"{BASE_URL}/api/consultation-slots",
            params={"date": monday, "duration": 30}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for slot in data["slots"]:
            assert "available" in slot, f"Slot {slot.get('time')} missing 'available' field"
            assert isinstance(slot["available"], bool), f"'available' should be boolean, got {type(slot['available'])}"
        
        print("✓ All slots have availability status")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
