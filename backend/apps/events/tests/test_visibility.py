"""Rule: unpublished events are invisible to visitors, in the list *and* in the detail view."""

from datetime import timedelta

import pytest

from apps.events import selectors
from apps.events.exceptions import EventNotFound
from apps.events.models import EventStatus

pytestmark = pytest.mark.django_db


@pytest.mark.parametrize("status", [EventStatus.PENDING_REVIEW, EventStatus.REJECTED])
def test_unpublished_events_are_not_listed_for_visitors(make_event, status):
    hidden = make_event(status=status)
    shown = make_event(status=EventStatus.PUBLISHED)
    listed = list(selectors.list_public_events())
    assert shown in listed
    assert hidden not in listed


@pytest.mark.parametrize("status", [EventStatus.PENDING_REVIEW, EventStatus.REJECTED])
def test_unpublished_event_detail_is_not_found_for_visitors(make_event, visitor, status):
    event = make_event(status=status)
    with pytest.raises(EventNotFound):
        selectors.get_event_for_actor(reference=event.reference, actor=visitor)


def test_organisers_see_their_own_unpublished_events_but_not_others(
    make_event, organiser, other_organiser
):
    event = make_event(status=EventStatus.PENDING_REVIEW, organiser_id="organiser-1")
    assert selectors.get_event_for_actor(reference=event.reference, actor=organiser) == event
    with pytest.raises(EventNotFound):
        selectors.get_event_for_actor(reference=event.reference, actor=other_organiser)


def test_administrators_see_everything(make_event, admin):
    events = [make_event(status=s) for s in EventStatus.values]
    assert set(selectors.list_admin_events()) == set(events)


def test_admin_list_puts_pending_review_first(make_event, now):
    published = make_event(status=EventStatus.PUBLISHED, starts_at=now + timedelta(days=1))
    pending = make_event(status=EventStatus.PENDING_REVIEW, starts_at=now + timedelta(days=9))
    assert list(selectors.list_admin_events()) == [pending, published]


def test_past_events_are_hidden_by_the_upcoming_filter(make_event, now):
    past = make_event(starts_at=now - timedelta(days=1))
    future = make_event(starts_at=now + timedelta(days=1))
    assert list(selectors.list_public_events(upcoming=True)) == [future]
    assert set(selectors.list_public_events(upcoming=False)) == {past, future}


def test_category_and_search_filters(make_event):
    yoga = make_event(title="Sunrise Yoga", category="wellbeing")
    make_event(title="Open Mic", category="arts")
    assert list(selectors.list_public_events(category="wellbeing")) == [yoga]
    assert list(selectors.list_public_events(search="yoga")) == [yoga]


@pytest.mark.parametrize("reference", ["", "EVT-", "EVT-abc", "1001", "EVT-0", "EVT-999", "evt-99999999999999"])
def test_malformed_or_unknown_references_are_not_found(reference, admin):
    with pytest.raises(EventNotFound):
        selectors.get_event_for_actor(reference=reference, actor=admin)


def test_registration_counts_are_derived_from_registrations(make_event, fill, visitor):
    event = make_event(capacity=10)
    fill(event, 4)
    fetched = selectors.get_event_for_actor(reference=event.reference, actor=visitor)
    assert fetched.registered_count == 4


def test_organiser_stats(make_event, fill):
    a = make_event(status=EventStatus.PUBLISHED)
    b = make_event(status=EventStatus.PUBLISHED)
    make_event(status=EventStatus.PENDING_REVIEW)
    make_event(status=EventStatus.PUBLISHED, organiser_id="organiser-2")
    fill(a, 3)
    fill(b, 2)
    assert selectors.organiser_stats(organiser_id="organiser-1") == {
        "total": 3,
        "pending": 1,
        "published": 2,
        "changes_requested": 0,
        "registrations": 5,
    }
