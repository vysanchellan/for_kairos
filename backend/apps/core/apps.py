from django.apps import AppConfig


class CoreConfig(AppConfig):
    name = "apps.core"
    label = "core"
    verbose_name = "Shared kernel"

    def ready(self) -> None:
        # Registers the OpenAPI extension for the demo-role headers.
        from apps.core import schema  # noqa: F401
