"""Teaches drf-spectacular about the demo-role headers so Swagger UI can send them."""

from drf_spectacular.extensions import OpenApiAuthenticationExtension


class DemoRoleAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "apps.core.auth.DemoRoleAuthentication"
    name = ["DemoRole", "DemoOrganiserId"]

    def get_security_definition(self, auto_schema):
        return [
            {
                "type": "apiKey",
                "in": "header",
                "name": "X-Demo-Role",
                "description": "visitor | organiser | admin (demo only; defaults to visitor)",
            },
            {
                "type": "apiKey",
                "in": "header",
                "name": "X-Demo-Organiser-Id",
                "description": "Required when the role is organiser, e.g. organiser-1",
            },
        ]
