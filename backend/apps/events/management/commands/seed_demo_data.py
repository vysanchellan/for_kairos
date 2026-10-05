"""Seed fictional demo data: ``python manage.py seed_demo_data [--reset]``.

Data goes through the real services (create -> publish/reject -> register), so
the seeded state obeys every business rule and the activity feed is real. Dates
are relative to today, so the demo never goes stale.

Idempotent: if events already exist, nothing happens unless ``--reset`` is passed.
"""

import logging
from dataclasses import dataclass
from datetime import timedelta

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.core import clock
from apps.core.auth import Principal, Role
from apps.events import services as event_services
from apps.events.models import Event, EventCategory
from apps.registrations.services import register_interest

ADMIN = Principal(role=Role.ADMIN)
VISITOR = Principal(role=Role.VISITOR)


@dataclass(frozen=True)
class SeedEvent:
    organiser: str
    title: str
    description: str
    category: str
    location: str
    days_ahead: int
    time: tuple[int, int]
    capacity: int
    outcome: str  # "publish" | "pending" | "reject"
    registrations: int = 0
    review_note: str = ""


SEED_EVENTS: list[SeedEvent] = [
    SeedEvent(
        "organiser-1", "Riverside Litter Pick & Picnic",
        "Gloves, grabbers and bags provided. We'll tidy the riverbank path for an hour, then share "
        "a picnic on the green. Bring something to share if you like. Little ones are welcome.",
        EventCategory.OUTDOORS, "Millbrook Green, by the footbridge", 3, (9, 0), 40, "publish", 12,
    ),
    SeedEvent(
        "organiser-1", "Community Repair Café",
        "Bring a wobbly chair, a torn jacket or a toaster that's given up. Volunteer fixers will "
        "help you mend it, and teach you how along the way. Tea and cake are on us.",
        EventCategory.COMMUNITY, "Riverside Community Hall", 6, (10, 0), 20, "publish", 18,
    ),
    SeedEvent(
        "organiser-1", "Beginners' Sourdough Workshop",
        "From starter to loaf in one evening. Everyone takes home a jar of starter and a dough "
        "ready to bake in the morning. All ingredients are provided.",
        EventCategory.FOOD, "Riverside Community Hall, kitchen", 9, (18, 30), 8, "publish", 8,
    ),
    SeedEvent(
        "organiser-1", "Sunrise Yoga in Millbrook Park",
        "A gentle 45-minute flow for all levels as the sun comes up. Bring a mat or a towel. "
        "If it rains, we'll move under the bandstand.",
        EventCategory.WELLBEING, "Millbrook Park bandstand", 4, (6, 30), 25, "publish", 7,
    ),
    SeedEvent(
        "organiser-1", "Neighbourhood Seed Swap",
        "Swap surplus seeds, seedlings and cuttings with fellow growers. Labels and envelopes "
        "provided. No seeds to bring? Come anyway, there's always plenty.",
        EventCategory.OUTDOORS, "Allotment gates, Orchard Road", 15, (11, 0), 60, "pending",
    ),
    SeedEvent(
        "organiser-1", "Intro to Home Energy Saving",
        "Practical tips for a warmer home and lower bills.",
        EventCategory.LEARNING, "", 20, (19, 0), 30, "reject",
        review_note="Please add a venue and say who the session is aimed at.",
    ),
    SeedEvent(
        "organiser-2", "Open Mic at the Lantern",
        "Poetry, songs, comedy, or something we haven't thought of yet. Five-minute slots, "
        "sign up on the night. Listeners are just as welcome as performers.",
        EventCategory.ARTS, "The Lantern Rooms, Lantern Lane", 2, (19, 30), 50, "publish", 31,
    ),
    SeedEvent(
        "organiser-2", "Watercolour Sketching Walk",
        "A slow wander through the old town, stopping to sketch rooftops and doorways. Paper and "
        "travel paint sets can be borrowed. No experience needed.",
        EventCategory.ARTS, "Meet at the clock tower", 7, (14, 0), 15, "publish", 3,
    ),
    SeedEvent(
        "organiser-2", "Code Club for Curious Adults",
        "Never written a line of code? Perfect. We'll build a tiny web page together, step by "
        "step. Laptops are available to borrow.",
        EventCategory.TECH, "Lantern Lane Library, upstairs room", 5, (18, 0), 16, "publish", 10,
    ),
    SeedEvent(
        "organiser-2", "Board Game Night",
        "Over forty games, from five-minute fillers to epic strategy. Hosts will teach the rules. "
        "Come solo or bring a crew.",
        EventCategory.COMMUNITY, "The Lantern Rooms, Lantern Lane", 11, (19, 0), 24, "publish",
    ),
    SeedEvent(
        "organiser-2", "Zine-Making Afternoon",
        "Cut, paste, fold and staple your own mini magazine. Old magazines, stamps and a "
        "photocopier are on hand.",
        EventCategory.ARTS, "Lantern Lane Library, craft corner", 12, (13, 0), 20, "pending",
    ),
    SeedEvent(
        "organiser-2", "Night Sky Photography Basics",
        "Learn to photograph stars with whatever camera you have, including your phone. We'll "
        "head to the hill if the sky is clear.",
        EventCategory.LEARNING, "Beacon Hill car park", 18, (21, 0), 12, "pending",
    ),
]


#: Which bundled cover photo each seeded event uses.
SEED_COVERS: dict[str, str] = {
    "Riverside Litter Pick & Picnic": "litter-pick",
    "Community Repair Café": "repair-cafe",
    "Beginners' Sourdough Workshop": "sourdough",
    "Sunrise Yoga in Millbrook Park": "yoga-park",
    "Neighbourhood Seed Swap": "seedlings",
    "Intro to Home Energy Saving": "lightbulb",
    "Open Mic at the Lantern": "open-mic",
    "Watercolour Sketching Walk": "watercolour",
    "Code Club for Curious Adults": "code-club",
    "Board Game Night": "board-games",
    "Zine-Making Afternoon": "craft-table",
    "Night Sky Photography Basics": "night-sky",
}


class Command(BaseCommand):
    help = "Seed fictional demo events, registrations and activity."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset", action="store_true", help="Delete ALL existing data first, then seed."
        )

    def handle(self, *args, reset: bool, **options):
        if reset:
            # flush also resets SQLite's id sequences, so references start at EVT-1001 again.
            call_command("flush", interactive=False, verbosity=0)
            self.stdout.write("Existing data cleared.")
        elif Event.objects.exists():
            self.stdout.write("Demo data already present; nothing to do. Use --reset to start over.")
            return

        # Seeding runs hundreds of service calls; keep their INFO logs out of the terminal.
        logging.disable(logging.INFO)
        try:
            with transaction.atomic():
                counts = self._seed()
        finally:
            logging.disable(logging.NOTSET)

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {counts['events']} events ({counts['published']} published, "
                f"{counts['pending']} pending review, {counts['rejected']} with changes requested) "
                f"and {counts['registrations']} registrations."
            )
        )

    def _seed(self) -> dict[str, int]:
        today = clock.now().replace(second=0, microsecond=0)
        counts = {"events": 0, "published": 0, "pending": 0, "rejected": 0, "registrations": 0}

        for spec in SEED_EVENTS:
            organiser = Principal(role=Role.ORGANISER, organiser_id=spec.organiser)
            starts_at = (today + timedelta(days=spec.days_ahead)).replace(
                hour=spec.time[0], minute=spec.time[1]
            )
            event = event_services.create_event(
                actor=organiser,
                title=spec.title,
                description=spec.description,
                category=spec.category,
                location=spec.location,
                cover_image=SEED_COVERS.get(spec.title, ""),
                starts_at=starts_at,
                capacity=spec.capacity,
            )
            counts["events"] += 1

            if spec.outcome == "publish":
                event_services.publish_event(event_id=event.pk, actor=ADMIN)
                for _ in range(spec.registrations):
                    register_interest(event_id=event.pk, actor=VISITOR)
                counts["published"] += 1
                counts["registrations"] += spec.registrations
            elif spec.outcome == "reject":
                event_services.reject_event(event_id=event.pk, actor=ADMIN, note=spec.review_note)
                counts["rejected"] += 1
            else:
                counts["pending"] += 1

        return counts
