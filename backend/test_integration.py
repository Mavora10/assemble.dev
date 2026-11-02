"""
Integration test suite for Event Horizon FastAPI endpoints & security policies.
"""
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from fastapi import HTTPException
from app.main import app
from app.routers.auth import create_jwt_token, decode_token
from app.routers.events import verify_event_owner, notify_attendees_on_event_changes

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    print("✓ Health check endpoint OK")

def test_jwt_generation_and_decoding():
    token = create_jwt_token("user-123", "organizer@example.com", "organizer")
    payload = decode_token(f"Bearer {token}")
    assert payload["sub"] == "user-123"
    assert payload["email"] == "organizer@example.com"
    assert payload["role"] == "organizer"
    print("✓ JWT generation and decoding OK")

def test_verify_event_owner_permissions():
    event = {
        "id": "evt-1",
        "organizer_id": "user-123",
        "organizer_email": "sarah@cyberdyne.com"
    }

    # Case 1: Owner matches by ID
    assert verify_event_owner(event, {"sub": "user-123", "email": "other@email.com", "role": "organizer"}) is True

    # Case 2: Owner matches by email
    assert verify_event_owner(event, {"sub": "different-id", "email": "sarah@cyberdyne.com", "role": "organizer"}) is True

    # Case 3: Admin role bypass
    assert verify_event_owner(event, {"sub": "admin-id", "email": "admin@assemble.dev", "role": "admin"}) is True

    # Case 4: Non-owner attendee / other organizer -> MUST raise 403 Forbidden
    raised = False
    try:
        verify_event_owner(event, {"sub": "intruder-id", "email": "intruder@example.com", "role": "attendee"})
    except HTTPException as e:
        raised = True
        assert e.status_code == 403
        assert "Forbidden" in e.detail
    assert raised, "Expected HTTPException 403"

    print("✓ Ownership permission enforcement (403 Forbidden) OK")

def test_unauthenticated_endpoints_return_401():
    endpoints = [
        ("PUT", "/api/v1/events/test-id", {}),
        ("PUT", "/api/v1/events/test-id/schedule", {"schedule": []}),
        ("GET", "/api/v1/events/test-id/attendees", None),
        ("GET", "/api/v1/notifications", None),
        ("POST", "/api/v1/notifications/read-all", None),
    ]

    for method, path, body in endpoints:
        if method == "PUT":
            res = client.put(path, json=body)
        elif method == "GET":
            res = client.get(path)
        elif method == "POST":
            res = client.post(path, json=body or {})
        assert res.status_code == 401, f"{method} {path} expected 401, got {res.status_code}"

    print("✓ Authentication enforcement (401 Unauthorized) OK")

def test_unauthorized_organizer_edit_blocked():
    owner_token = create_jwt_token("owner-uuid", "owner@example.com", "organizer")
    attacker_token = create_jwt_token("attacker-uuid", "attacker@example.com", "organizer")

    mock_event = {
        "id": "evt-test-1",
        "title": "Owner's Summit",
        "organizer_id": "owner-uuid",
        "organizer_email": "owner@example.com",
        "status": "published"
    }

    with patch("app.routers.events.supabase") as mock_supabase:
        # Mock select return
        select_mock = MagicMock()
        select_mock.execute.return_value = MagicMock(data=[mock_event])
        mock_supabase.table().select().eq().execute = select_mock.execute

        # Attacker tries to update event
        headers = {"Authorization": f"Bearer {attacker_token}"}
        res = client.put("/api/v1/events/evt-test-1", json={"title": "Hacked Title"}, headers=headers)
        assert res.status_code == 403
        assert "Only the organizer who owns this event" in res.json()["detail"]

        # Attacker tries to update schedule
        res = client.put("/api/v1/events/evt-test-1/schedule", json={"schedule": [{"title": "Defaced"}]}, headers=headers)
        assert res.status_code == 403

        # Attacker tries to view attendee list
        res = client.get("/api/v1/events/evt-test-1/attendees", headers=headers)
        assert res.status_code == 403

    print("✓ Cross-organizer tampering prevention (403 Forbidden) OK")

def test_authorized_organizer_update_and_notifications():
    owner_token = create_jwt_token("owner-uuid", "owner@example.com", "organizer")
    headers = {"Authorization": f"Bearer {owner_token}"}

    existing_event = {
        "id": "evt-test-1",
        "title": "Owner's Summit",
        "organizer_id": "owner-uuid",
        "organizer_email": "owner@example.com",
        "location": "Venue to be announced",
        "speakers": [],
        "schedule": [],
        "status": "published"
    }

    updated_event = {
        **existing_event,
        "location": "Moscone Center West",
        "speakers": [{"name": "Dr. Sarah AI"}],
        "schedule": [{"title": "Opening Keynote", "startTime": "09:00 AM"}]
    }

    mock_tickets = [
        {"user_id": "attendee-1", "user_email": "alice@gmail.com"},
        {"user_id": "attendee-2", "user_email": "bob@gmail.com"},
        {"user_id": "owner-uuid", "user_email": "owner@example.com"}, # Organizer self ticket
    ]

    inserted_notifications = []

    with patch("app.routers.events.supabase") as mock_supabase:
        def table_side_effect(name):
            t_mock = MagicMock()
            if name == "events":
                t_mock.select().eq().execute.return_value = MagicMock(data=[existing_event])
                t_mock.update().eq().execute.return_value = MagicMock(data=[updated_event])
            elif name == "tickets":
                t_mock.select().eq().execute.return_value = MagicMock(data=mock_tickets)
            elif name == "notifications":
                def insert_side_effect(records):
                    inserted_notifications.extend(records)
                    return MagicMock(data=records)
                t_mock.insert.side_effect = insert_side_effect
            return t_mock

        mock_supabase.table.side_effect = table_side_effect

        # 1. Update event details
        res = client.put(
            "/api/v1/events/evt-test-1",
            json={
                "location": "Moscone Center West",
                "speakers": [{"name": "Dr. Sarah AI"}],
                "schedule": [{"title": "Opening Keynote", "startTime": "09:00 AM"}]
            },
            headers=headers
        )
        assert res.status_code == 200
        assert res.json()["location"] == "Moscone Center West"

        # Verify notifications were created for attendees (and organizer excluded)
        assert len(inserted_notifications) == 2
        notif_emails = [n["user_email"] for n in inserted_notifications]
        assert "alice@gmail.com" in notif_emails
        assert "bob@gmail.com" in notif_emails
        assert "owner@example.com" not in notif_emails
        assert "Venue confirmed: Moscone Center West" in inserted_notifications[0]["message"]

    print("✓ Authorized event update & attendee notification dispatch OK")

def test_check_in_flow():
    mock_ticket = {
        "id": "tck-uuid-1",
        "ticket_id": "TCK-88A2-2027",
        "event_id": "evt-123",
        "user_name": "Alice Smith",
        "status": "confirmed",
        "ticket_tier_name": "VIP Pass"
    }

    with patch("app.routers.tickets.supabase") as mock_supabase:
        t_mock = MagicMock()
        # 1. First check-in
        t_mock.select().ilike().execute.return_value = MagicMock(data=[mock_ticket])
        t_mock.update().eq().execute.return_value = MagicMock(data=[{**mock_ticket, "status": "checked-in"}])
        mock_supabase.table.return_value = t_mock

        res = client.post("/api/v1/tickets/check-in", json={"ticketCode": "TCK-88A2-2027"})
        assert res.status_code == 200
        assert res.json()["valid"] is True
        assert res.json()["alreadyCheckedIn"] is False
        assert "Check-in successful" in res.json()["message"]

        # 2. Second check-in attempt (duplicate prevention)
        already_checked_ticket = {**mock_ticket, "status": "checked-in", "checked_in_at": "2027-04-15T09:05:00Z"}
        t_mock.select().ilike().execute.return_value = MagicMock(data=[already_checked_ticket])

        res = client.post("/api/v1/tickets/check-in", json={"ticketCode": "TCK-88A2-2027"})
        assert res.status_code == 200
        assert res.json()["valid"] is False
        assert res.json()["alreadyCheckedIn"] is True
        assert "already checked in" in res.json()["message"]

    print("✓ Ticket check-in and duplicate prevention OK")

if __name__ == "__main__":
    test_health_check()
    test_jwt_generation_and_decoding()
    test_verify_event_owner_permissions()
    test_unauthenticated_endpoints_return_401()
    test_unauthorized_organizer_edit_blocked()
    test_authorized_organizer_update_and_notifications()
    test_check_in_flow()
    print("\n🎉 ALL BACKEND API INTEGRATION & SECURITY TESTS PASSED!")
