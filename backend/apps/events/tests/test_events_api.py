"""HTTP contract for event endpoints: status codes, validation errors and role access."""

from datetime import timedelta

import pytest

from apps.events.models import Event, EventStatus

pytestmark = pytest.mark.django_db


def valid_payload(now, **overrides):
    payload = {
        "title": "Neighbourhood Seed Swap",
        "description": "Bring seeds, take seeds.",
        "category": "outdoors",
        "location": "Orchard Road allotments",
        "starts_at": (now + timedelta(days=5)).isoformat(),
        "capacity": 30,
    }
    payload.update(overrides)
    return payload


class TestCreateEventEndpoint:
    def test_organiser_creates_event_201_pending_review(self, as_role, now):
        response = as_role("organiser", "organiser-1").post("/api/v1/events/", valid_payload(now))
        assert response.status_code == 201
        body = response.json()
        assert body["status"] == "PENDING_REVIEW"
        assert body["id"].startswith("EVT-")
        assert body["organiser"]["id"] == "organiser-1"
        assert body["registered_count"] == 0
        assert response["Location"] == f"/api/v1/events/{body['id']}/"

    def test_new_event_is_invisible_to_visitors(self, as_role, api, now):
        created = as_role("organiser", "organiser-1").post("/api/v1/events/", valid_payload(now)).json()
        api.credentials()  # back to visitor
        listed = [e["id"] for e in api.get("/api/v1/events/").json()["results"]]
        assert created["id"] not in listed
        assert api.get(f"/api/v1/events/{created['id']}/").status_code == 404

    @pytest.mark.parametrize("role", ["visitor", "admin"])
    def test_only_organisers_can_create(self, as_role, now, role):
        response = as_role(role).post("/api/v1/events/", valid_payload(now))
        assert response.status_code == 403
        assert response.json()["code"] == "ORGANISER_ONLY"
        assert not Event.objects.exists()

    @pytest.mark.parametrize(
        "capacity",
        [0, -1, "5", 5.5, True, None, "", "ten", 10_001],
        ids=["zero", "negative", "string", "fraction", "bool", "null", "empty", "word", "too-big"],
    )
    def test_capacity_must_be_a_whole_number_greater_than_zero(self, as_role, now, capacity):
        response = as_role("organiser", "organiser-1").post(
            "/api/v1/events/", valid_payload(now, capacity=capacity)
        )
        assert response.status_code == 400
        assert response.json()["code"] == "VALIDATION_ERROR"
        assert "capacity" in response.json()["fields"]

    @pytest.mark.parametrize("capacity", [1, 10_000])
    def test_capacity_boundaries_are_accepted(self, as_role, now, capacity):
        response = as_role("organiser", "organiser-1").post(
            "/api/v1/events/", valid_payload(now, capacity=capacity)
        )
        assert response.status_code == 201

    @pytest.mark.parametrize("title", ["", "   ", None, "x" * 121], ids=["empty", "blank", "null", "too-long"])
    def test_title_is_required_and_bounded(self, as_role, now, title):
        response = as_role("organiser", "organiser-1").post("/api/v1/events/", valid_payload(now, title=title))
        assert response.status_code == 400
        assert "title" in response.json()["fields"]

    def test_title_of_exactly_120_characters_is_fine(self, as_role, now):
        response = as_role("organiser", "organiser-1").post(
            "/api/v1/events/", valid_payload(now, title="x" * 120)
        )
        assert response.status_code == 201

    def test_missing_fields_are_all_reported_at_once(self, as_role):
        response = as_role("organiser", "organiser-1").post("/api/v1/events/", {})
        assert response.status_code == 400
        assert set(response.json()["fields"]) == {"title", "starts_at", "capacity"}

    @pytest.mark.parametrize(
        "starts_at", ["not-a-date", "2030-13-45T25:00", "", None], ids=["word", "impossible", "empty", "null"]
    )
    def test_start_time_must_be_a_valid_datetime(self, as_role, now, starts_at):
        response = as_role("organiser", "organiser-1").post(
            "/api/v1/events/", valid_payload(now, starts_at=starts_at)
        )
        assert response.status_code == 400
        assert "starts_at" in response.json()["fields"]

    def test_start_time_must_not_be_in_the_past(self, as_role, now):
        response = as_role("organiser", "organiser-1").post(
            "/api/v1/events/", valid_payload(now, starts_at=(now - timedelta(minutes=1)).isoformat())
        )
        assert response.status_code == 400
        assert response.json()["fields"]["starts_at"] == "Pick a date and time in the future."

    def test_organisers_cannot_self_publish_via_the_payload(self, as_role, now):
        response = as_role("organiser", "organiser-1").post(
            "/api/v1/events/", valid_payload(now, status="PUBLISHED")
        )
        assert response.status_code == 400
        assert response.json()["fields"]["status"] == "This field can't be set."
        assert not Event.objects.filter(status=EventStatus.PUBLISHED).exists()

    def test_event_text_is_stored_and_returned_verbatim_not_interpreted(self, as_role, now):
        """Event text is plain text: HTML is neither stripped nor rendered, just stored as given."""
        title = "<script>alert('hi')</script> Night"
        response = as_role("organiser", "organiser-1").post("/api/v1/events/", valid_payload(now, title=title))
        assert response.json()["title"] == title
        assert response["Content-Type"] == "application/json"

    def test_malformed_json_is_a_400(self, as_role):
        response = as_role("organiser", "organiser-1").post(
            "/api/v1/events/", data="{not json", content_type="application/json"
        )
        assert response.status_code == 400
        assert response.json()["code"] == "MALFORMED_REQUEST"


class TestUpdateEventEndpoint:
    def test_owner_updates_event_200(self, as_role, make_event):
        event = make_event(organiser_id="organiser-1")
        response = as_role("organiser", "organiser-1").patch(
            f"/api/v1/events/{event.reference}/", {"capacity": 25}
        )
        assert response.status_code == 200
        assert response.json()["capacity"] == 25

    def test_another_organiser_gets_403_on_a_published_event(self, as_role, make_event):
        event = make_event(organiser_id="organiser-1", status=EventStatus.PUBLISHED)
        response = as_role("organiser", "organiser-2").patch(
            f"/api/v1/events/{event.reference}/", {"title": "Hijacked"}
        )
        assert response.status_code == 403
        assert response.json()["code"] == "NOT_EVENT_OWNER"
        event.refresh_from_db()
        assert event.title != "Hijacked"

    def test_another_organiser_gets_404_on_a_pending_event(self, as_role, make_event):
        event = make_event(organiser_id="organiser-1", status=EventStatus.PENDING_REVIEW)
        response = as_role("organiser", "organiser-2").patch(
            f"/api/v1/events/{event.reference}/", {"title": "Hijacked"}
        )
        assert response.status_code == 404

    def test_capacity_below_registrations_is_rejected_on_the_field(self, as_role, make_event, fill):
        event = make_event(capacity=10)
        fill(event, 7)
        response = as_role("organiser", "organiser-1").patch(
            f"/api/v1/events/{event.reference}/", {"capacity": 5}
        )
        assert response.status_code == 400
        assert "capacity" in response.json()["fields"]

    def test_status_cannot_be_patched(self, as_role, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        response = as_role("organiser", "organiser-1").patch(
            f"/api/v1/events/{event.reference}/", {"status": "PUBLISHED"}
        )
        assert response.status_code == 400
        event.refresh_from_db()
        assert event.status == EventStatus.PENDING_REVIEW

    def test_put_is_not_allowed(self, as_role, make_event):
        event = make_event()
        response = as_role("organiser", "organiser-1").put(f"/api/v1/events/{event.reference}/", {})
        assert response.status_code == 405
        assert response.json()["code"] == "METHOD_NOT_ALLOWED"


class TestBrowseEndpoints:
    def test_visitor_list_is_published_only_and_paginated(self, api, make_event):
        for _ in range(3):
            make_event(status=EventStatus.PUBLISHED)
        make_event(status=EventStatus.PENDING_REVIEW)
        body = api.get("/api/v1/events/?page_size=2").json()
        assert body["count"] == 3
        assert body["total_pages"] == 2
        assert len(body["results"]) == 2
        assert all(e["status"] == "PUBLISHED" for e in body["results"])

    def test_unknown_event_is_a_404_with_the_standard_shape(self, api, db):
        response = api.get("/api/v1/events/EVT-99999/")
        assert response.status_code == 404
        assert set(response.json()) == {"code", "message", "request_id"}

    def test_invalid_filter_is_a_400(self, api, db):
        response = api.get("/api/v1/events/?category=astrology")
        assert response.status_code == 400
        assert "category" in response.json()["fields"]

    def test_spots_remaining_and_is_full_are_derived(self, api, make_event, fill):
        event = make_event(capacity=3)
        fill(event, 3)
        body = api.get(f"/api/v1/events/{event.reference}/").json()
        assert (body["registered_count"], body["spots_remaining"], body["is_full"]) == (3, 0, True)


class TestOrganiserEndpoints:
    def test_my_events_lists_only_my_events_in_every_status(self, as_role, make_event):
        mine = {make_event(status=s).reference for s in EventStatus.values}
        make_event(organiser_id="organiser-2")
        body = as_role("organiser", "organiser-1").get("/api/v1/organiser/events/").json()
        assert {e["id"] for e in body["results"]} == mine

    def test_visitors_cannot_see_the_organiser_dashboard(self, api, db):
        assert api.get("/api/v1/organiser/events/").status_code == 403

    def test_organiser_role_requires_a_known_organiser_id(self, as_role, db):
        response = as_role("organiser", "organiser-99").get("/api/v1/organiser/events/")
        assert response.status_code == 401
        assert response.json()["code"] == "UNKNOWN_ORGANISER"


class TestAdminEndpoints:
    def test_admin_lists_all_events_pending_first(self, as_role, make_event, now):
        make_event(status=EventStatus.PUBLISHED, starts_at=now + timedelta(days=1))
        pending = make_event(status=EventStatus.PENDING_REVIEW, starts_at=now + timedelta(days=9))
        body = as_role("admin").get("/api/v1/admin/events/").json()
        assert body["count"] == 2
        assert body["results"][0]["id"] == pending.reference

    def test_admin_status_filter(self, as_role, make_event):
        make_event(status=EventStatus.PUBLISHED)
        pending = make_event(status=EventStatus.PENDING_REVIEW)
        body = as_role("admin").get("/api/v1/admin/events/?status=PENDING_REVIEW").json()
        assert [e["id"] for e in body["results"]] == [pending.reference]

    @pytest.mark.parametrize("role, organiser_id", [("visitor", None), ("organiser", "organiser-1")])
    def test_publish_is_admin_only(self, as_role, make_event, role, organiser_id):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        response = as_role(role, organiser_id).post(f"/api/v1/admin/events/{event.reference}/publish/")
        assert response.status_code == 403
        assert response.json()["code"] == "ADMIN_ONLY"
        event.refresh_from_db()
        assert event.status == EventStatus.PENDING_REVIEW

    def test_publish_then_visible_then_second_publish_conflicts(self, as_role, api, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        admin = as_role("admin")
        first = admin.post(f"/api/v1/admin/events/{event.reference}/publish/")
        assert first.status_code == 200
        assert first.json()["status"] == "PUBLISHED"

        second = admin.post(f"/api/v1/admin/events/{event.reference}/publish/")
        assert second.status_code == 409
        assert second.json()["code"] == "INVALID_STATUS_TRANSITION"

        api.credentials()
        assert api.get(f"/api/v1/events/{event.reference}/").status_code == 200

    def test_publish_unknown_event_is_404(self, as_role, db):
        assert as_role("admin").post("/api/v1/admin/events/EVT-4242/publish/").status_code == 404

    def test_reject_with_note(self, as_role, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        response = as_role("admin").post(
            f"/api/v1/admin/events/{event.reference}/reject/", {"note": "Please add a venue."}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "REJECTED"
        assert response.json()["review_note"] == "Please add a venue."

    def test_activity_feed_is_admin_only_and_newest_first(self, as_role, make_event):
        event = make_event(status=EventStatus.PENDING_REVIEW)
        admin = as_role("admin")
        admin.post(f"/api/v1/admin/events/{event.reference}/publish/")
        admin.post(f"/api/v1/events/{event.reference}/registrations/")
        feed = admin.get("/api/v1/admin/activity/").json()["results"]
        assert [a["kind"] for a in feed] == ["REGISTRATION_CREATED", "EVENT_PUBLISHED"]
        assert feed[1]["message"] == f"Event {event.reference} was published."

        assert as_role("organiser", "organiser-1").get("/api/v1/admin/activity/").status_code == 403


class TestCoverImages:
    def test_cover_image_is_stored_and_returned(self, as_role, now):
        response = as_role("organiser", "organiser-1").post(
            "/api/v1/events/", valid_payload(now, cover_image="seedlings")
        )
        assert response.status_code == 201
        assert response.json()["cover_image"] == "seedlings"

    def test_cover_image_defaults_to_blank(self, as_role, now):
        response = as_role("organiser", "organiser-1").post("/api/v1/events/", valid_payload(now))
        assert response.json()["cover_image"] == ""

    @pytest.mark.parametrize("cover", ["https://evil.example/x.png", "../etc/passwd", "unknown"])
    def test_only_bundled_cover_keys_are_accepted(self, as_role, now, cover):
        """Covers are keys into a fixed set, never URLs, so nothing external can be injected."""
        response = as_role("organiser", "organiser-1").post(
            "/api/v1/events/", valid_payload(now, cover_image=cover)
        )
        assert response.status_code == 400
        assert "cover_image" in response.json()["fields"]

    def test_owner_can_change_the_cover(self, as_role, make_event):
        event = make_event()
        response = as_role("organiser", "organiser-1").patch(
            f"/api/v1/events/{event.reference}/", {"cover_image": "night-sky"}
        )
        assert response.json()["cover_image"] == "night-sky"


class TestPublicStats:
    def test_counts_only_published_upcoming_events(self, api, make_event, fill, now):
        live = make_event(status=EventStatus.PUBLISHED)
        make_event(status=EventStatus.PUBLISHED, organiser_id="organiser-2")
        make_event(status=EventStatus.PENDING_REVIEW)
        make_event(status=EventStatus.PUBLISHED, starts_at=now - timedelta(days=1))
        fill(live, 4)
        assert api.get("/api/v1/stats/").json() == {
            "upcoming_events": 2,
            "registrations": 4,
            "organisers": 2,
        }
