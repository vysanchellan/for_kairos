"""Logging configuration.

Every line carries the request id of the HTTP request that produced it, via
``RequestIdFilter``. ``SafeFormatter`` escapes CR/LF in messages so a value
can never forge an extra log line (log injection).
"""


def build_logging_config(level: str = "INFO") -> dict:
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "request_id": {"()": "apps.core.logging.RequestIdFilter"},
        },
        "formatters": {
            "app": {
                "()": "apps.core.logging.SafeFormatter",
                "format": "%(asctime)s %(levelname)-7s [%(request_id)s] %(name)s: %(message)s",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "filters": ["request_id"],
                "formatter": "app",
            },
        },
        "root": {"handlers": ["console"], "level": level},
        "loggers": {
            # Our RequestLogMiddleware already logs every request with its
            # outcome, so Django's runserver access log would only repeat it.
            "django.server": {"level": "WARNING"},
            # django.request logs every 4xx as a WARNING too; keep only real errors.
            "django.request": {"level": "ERROR"},
            "django.db.backends": {"level": "WARNING"},
        },
    }
