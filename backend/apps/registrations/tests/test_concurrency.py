"""Rule: concurrent requests can never overbook an event.

Several threads race for the last spot. Each thread gets its own database
connection, against a real file-based SQLite database, so the lock taken by
BEGIN IMMEDIATE is genuinely contended. Exactly one thread must win.
"""

import threading
from datetime import timedelta

import pytest
from django.db import connection

from apps.core import clock
from apps.core.auth import Principal, Role
from apps.events.models import Event, EventStatus
from apps.registrations.exceptions import EventFull
from apps.registrations.models import Registration
from apps.registrations.services import register_interest

THREADS = 8


@pytest.mark.concurrency
@pytest.mark.django_db(transaction=True)
def test_only_one_of_many_concurrent_requests_gets_the_last_spot():
    assert connection.vendor == "sqlite" and "memory" not in connection.settings_dict["NAME"]

    event = Event.objects.create(
        title="Tiny Workshop",
        starts_at=clock.now() + timedelta(days=1),
        capacity=3,
        status=EventStatus.PUBLISHED,
        organiser_id="organiser-1",
    )
    Registration.objects.bulk_create([Registration(event=event), Registration(event=event)])

    visitor = Principal(role=Role.VISITOR)
    start = threading.Barrier(THREADS)
    outcomes: list[str] = []
    lock = threading.Lock()

    def attempt():
        from django.db import connections

        try:
            start.wait()  # release every thread at the same moment
            register_interest(event_id=event.pk, actor=visitor)
            result = "ok"
        except EventFull:
            result = "full"
        except Exception as exc:  # pragma: no cover - surfaced by the assertion below
            result = f"error: {exc!r}"
        finally:
            connections.close_all()
        with lock:
            outcomes.append(result)

    threads = [threading.Thread(target=attempt) for _ in range(THREADS)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=60)

    assert sorted(outcomes) == ["full"] * (THREADS - 1) + ["ok"], outcomes
    assert Registration.objects.filter(event=event).count() == 3
