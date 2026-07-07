# DocuSeal — e-signature (waivers). NATIVE NixOS module (since 25.11) — no
# container. nixpkgs ships 2.5.3 vs upstream ~3.x: accepted lag (ADR-010); the
# hosted-signing-page + template + webhook flow we use exists in 2.5.x.
{ config, ... }:
{
  services.docuseal = {
    enable = true;
    port = 3002; # app owns :3000, Kuma :3001

    # NOTE (verified): the module does NOT create this file despite its docs —
    # runbook A9 creates it once:
    #   install -d -m 750 -o docuseal /var/lib/docuseal/secrets   # after first activation
    #   openssl rand -hex 64 > /var/lib/docuseal/secrets/secret-key-base
    # (defaults to /var/lib/docuseal/secrets/secret-key-base; keep the default)

    # DATABASE_URL (with the docuseal role password) — loaded by systemd as
    # root before privilege drop, so the root-owned 0400 sops file works.
    extraEnvFiles = [ "/run/secrets/docuseal-db-env" ];

    extraConfig = {
      # Truthy flag (not a hostname): enables Rails force_ssl/assume_ssl behind Caddy.
      FORCE_SSL = "true";
      # Public URL for links/emails/webhooks from first boot (else it's set via the setup UI).
      APP_URL = "https://sign.${config.zoomez.domain}";
      # The module's `host` option does NOT bind (verified — Rails 8 ignores ENV[HOST]
      # for binding and listens on 0.0.0.0). BINDING is the real knob. The firewall
      # already keeps :3002 private; this is defense-in-depth. If the signing page
      # stops responding through Caddy after an upstream bump, remove this line first.
      BINDING = "127.0.0.1";
    };

    # redis.createLocally = true (default) — DocuSeal's background jobs get a
    # dedicated local Redis (services.redis.servers.docuseal). The ONLY Redis
    # in the stack, isolated to this service. Accepted.
  };

  # The module doesn't order itself after Postgres.
  systemd.services.docuseal = {
    requires = [ "postgresql.service" ];
    after = [ "postgresql.service" ];
  };

  # DB + role come from modules/postgres.nix (ensureDatabases/ensureUsers);
  # password set once via the A4 runbook. Uploaded/signed PDFs live in
  # /var/lib/docuseal — captured by restic (modules/backups.nix).
}
