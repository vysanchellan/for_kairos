"""A single seam for "now", so business rules about time are easy to test.

Services call ``clock.now()`` instead of ``timezone.now()`` directly. Tests can
then monkeypatch ``apps.core.clock.now`` to pin the current time.
"""

from datetime import datetime

from django.utils import timezone


def now() -> datetime:
    return timezone.now()
