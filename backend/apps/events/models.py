from django.db import models
from django.db.models import Q

from apps.core import clock

REFERENCE_PREFIX = "EVT-"
REFERENCE_OFFSET = 1000
MAX_CAPACITY = 10_000


def format_reference(pk: int) -> str:
    return f"{REFERENCE_PREFIX}{REFERENCE_OFFSET + pk}"


class EventStatus(models.TextChoices):
    PENDING_REVIEW = "PENDING_REVIEW", "Pending review"
    PUBLISHED = "PUBLISHED", "Published"
    REJECTED = "REJECTED", "Changes requested"


class EventCategory(models.TextChoices):
    COMMUNITY = "community", "Community"
    ARTS = "arts", "Arts & culture"
    TECH = "tech", "Tech"
    OUTDOORS = "outdoors", "Outdoors"
    FOOD = "food", "Food & drink"
    WELLBEING = "wellbeing", "Wellbeing"
    LEARNING = "learning", "Learning"


class CoverImage(models.TextChoices):
    """A curated set of cover photos bundled with the frontend.

    Organisers pick one rather than uploading a file (uploads are out of scope),
    so the API only ever stores a short key, never an image or a URL.
    """

    REPAIR_CAFE = "repair-cafe", "Workshop tools"
    SOURDOUGH = "sourdough", "Fresh bread"
    YOGA_PARK = "yoga-park", "Yoga in the park"
    OPEN_MIC = "open-mic", "Stage microphone"
    LITTER_PICK = "litter-pick", "Riverside clean-up"
    SEEDLINGS = "seedlings", "Seedlings"
    WATERCOLOUR = "watercolour", "Watercolour painting"
    CODE_CLUB = "code-club", "Laptop glow"
    BOARD_GAMES = "board-games", "Board game night"
    NIGHT_SKY = "night-sky", "Starry sky"
    CRAFT_TABLE = "craft-table", "Craft table"
    GARDEN_BEDS = "garden-beds", "Garden beds"
    LIGHTBULB = "lightbulb", "Light bulb"
    MARKET_HALL = "market-hall", "Busy market"
    STRING_LIGHTS = "string-lights", "String lights"


class Event(models.Model):
    """A community event.

    Registration counts are deliberately *not* stored here. Selectors annotate
    them with ``Count("registrations")``, so they can never drift out of sync
    with the registrations table.
    """

    TITLE_MAX_LENGTH = 120
    DESCRIPTION_MAX_LENGTH = 2000
    LOCATION_MAX_LENGTH = 120

    title = models.CharField(max_length=TITLE_MAX_LENGTH)
    description = models.TextField(max_length=DESCRIPTION_MAX_LENGTH, blank=True)
    category = models.CharField(
        max_length=20, choices=EventCategory.choices, default=EventCategory.COMMUNITY
    )
    location = models.CharField(max_length=LOCATION_MAX_LENGTH, blank=True)
    cover_image = models.CharField(
        max_length=32,
        choices=CoverImage.choices,
        blank=True,
        help_text="Key of a bundled cover photo. Blank means the category's default.",
    )
    starts_at = models.DateTimeField()
    capacity = models.PositiveIntegerField()
    status = models.CharField(
        max_length=20, choices=EventStatus.choices, default=EventStatus.PENDING_REVIEW
    )
    organiser_id = models.CharField(max_length=40)
    review_note = models.CharField(
        max_length=280, blank=True, help_text="Administrator's note when changes are requested."
    )
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=clock.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(capacity__gt=0, capacity__lte=MAX_CAPACITY), name="event_capacity_in_range"
            ),
            models.CheckConstraint(
                condition=Q(status__in=EventStatus.values), name="event_status_valid"
            ),
            models.CheckConstraint(
                condition=Q(category__in=EventCategory.values), name="event_category_valid"
            ),
            models.CheckConstraint(condition=~Q(title=""), name="event_title_not_empty"),
            models.CheckConstraint(
                condition=Q(cover_image="") | Q(cover_image__in=CoverImage.values),
                name="event_cover_image_valid",
            ),
        ]
        indexes = [
            # The visitor list: WHERE status = 'PUBLISHED' ORDER BY starts_at
            models.Index(fields=["status", "starts_at"], name="event_status_starts_idx"),
            # The organiser dashboard: WHERE organiser_id = ?
            models.Index(fields=["organiser_id", "starts_at"], name="event_organiser_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.reference} {self.title}"

    @property
    def reference(self) -> str:
        """Human-friendly id (``EVT-1001``), derived from the primary key.

        It is computed rather than stored, so it can never disagree with the
        row it names. ``reference_to_pk`` is the inverse, used for URL lookups.
        """
        return format_reference(self.pk) if self.pk else ""

    @staticmethod
    def reference_to_pk(reference: str) -> int | None:
        if not reference.upper().startswith(REFERENCE_PREFIX):
            return None
        digits = reference[len(REFERENCE_PREFIX):]
        if not digits.isdigit() or len(digits) > 12:
            return None
        pk = int(digits) - REFERENCE_OFFSET
        return pk if pk > 0 else None
