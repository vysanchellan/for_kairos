"""Django settings for the Community Events Platform.

All environment-specific values come from environment variables (optionally
loaded from ``backend/.env``). Defaults are safe: DEBUG is off, and a random
secret key is generated if none is configured.
"""

import logging
import os
from pathlib import Path

from django.core.management.utils import get_random_secret_key
from dotenv import load_dotenv

from config.logging import build_logging_config

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


# --- Core -------------------------------------------------------------------

DEBUG = env_bool("DJANGO_DEBUG", default=False)

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    # Nothing in this app relies on the key surviving a restart (no sessions,
    # no signed cookies), so a per-process random key is a safe default.
    SECRET_KEY = get_random_secret_key()
    logging.getLogger(__name__).warning(
        "DJANGO_SECRET_KEY is not set; using a random key for this process."
    )

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    # contenttypes + auth are only here because DRF and drf-spectacular import
    # from them; the app has no user accounts or Django admin.
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "drf_spectacular",
    "apps.core",
    "apps.events",
    "apps.registrations",
    "apps.activity",
]

MIDDLEWARE = [
    "apps.core.middleware.RequestIdMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "apps.core.middleware.SecurityHeadersMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
# No CSRF/session middleware: the API is stateless and uses no cookies.

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        # Only needed for the Swagger UI page served by drf-spectacular.
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    },
]

# --- Database ---------------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.environ.get("DATABASE_PATH", str(BASE_DIR / "db.sqlite3")),
        "OPTIONS": {
            # BEGIN IMMEDIATE takes SQLite's write lock at the start of every
            # transaction, so two registrations for the last spot are
            # serialised instead of both reading "1 spot left".
            "transaction_mode": "IMMEDIATE",
            "timeout": 20,
        },
        # A file (not in-memory) test database, so the concurrency test can
        # exercise real SQLite locking across several connections.
        "TEST": {"NAME": str(BASE_DIR / "test_db.sqlite3")},
    }
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- I18N / time ------------------------------------------------------------

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "UTC"
USE_I18N = False
USE_TZ = True

# --- Security headers -------------------------------------------------------

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# --- Django REST framework --------------------------------------------------

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.core.auth.DemoRoleAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 12,
    "EXCEPTION_HANDLER": "apps.core.handlers.api_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "TEST_REQUEST_DEFAULT_FORMAT": "json",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Community Events Platform API",
    "DESCRIPTION": (
        "Browse, create, review and register for community events. "
        "Demo roles are sent as `X-Demo-Role` (visitor | organiser | admin) and "
        "`X-Demo-Organiser-Id` headers. They are for demonstration only and can be spoofed."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# --- Logging ----------------------------------------------------------------

LOGGING = build_logging_config(os.environ.get("LOG_LEVEL", "INFO").upper())
