"""Rule: events move PENDING_REVIEW -> PUBLISHED (or -> REJECTED -> PENDING_REVIEW), and nowhere else."""

import pytest

from apps.events.domain import can_transition, ensure_transition
from apps.events.exceptions import InvalidStatusTransition
from apps.events.models import EventStatus as S


@pytest.mark.parametrize(
    "current, target",
    [
        (S.PENDING_REVIEW, S.PUBLISHED),
        (S.PENDING_REVIEW, S.REJECTED),
        (S.REJECTED, S.PENDING_REVIEW),
    ],
)
def test_allowed_transitions(current, target):
    assert can_transition(current, target)
    ensure_transition(current, target)  # does not raise


@pytest.mark.parametrize(
    "current, target",
    [
        (S.PUBLISHED, S.PUBLISHED),
        (S.PUBLISHED, S.PENDING_REVIEW),
        (S.PUBLISHED, S.REJECTED),
        (S.REJECTED, S.PUBLISHED),
        (S.PENDING_REVIEW, S.PENDING_REVIEW),
    ],
)
def test_forbidden_transitions_raise_conflict(current, target):
    assert not can_transition(current, target)
    with pytest.raises(InvalidStatusTransition) as exc:
        ensure_transition(current, target)
    assert exc.value.status_code == 409
