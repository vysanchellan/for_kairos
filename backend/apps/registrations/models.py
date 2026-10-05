import secrets

from django.db import models

from apps.core import clock

# Crockford base32: no I, L, O or U, so references are easy to read aloud.
_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def new_registration_reference() -> str:
    """``REG-`` + 10 random characters (50 bits).

    Random rather than sequential, so a reference reveals nothing about how many
    people have registered.
    """
    return "REG-" + "".join(secrets.choice(_ALPHABET) for _ in range(10))


class Registration(models.Model):
    """An anonymous expression of interest in an event.

    PRIVACY RULE (from the brief): this table holds *only* a generated id, the
    event and a timestamp. There are no names, contact details, IP addresses,
    user agents, cookies or free text. A test asserts the exact field set, so
    adding a column fails the build.
    """

    reference = models.CharField(
        primary_key=True, max_length=16, default=new_registration_reference, editable=False
    )
    event = models.ForeignKey(
        "events.Event", on_delete=models.PROTECT, related_name="registrations"
    )
    created_at = models.DateTimeField(default=clock.now, editable=False)

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return self.reference
