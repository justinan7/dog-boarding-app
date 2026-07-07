# PostgreSQL 17 — the single system of record (ADR-002/009).
# App tables + DocuSeal's schema live in one cluster = one backup domain.
{ pkgs, ... }:
{
  services.postgresql = {
    enable = true;
    package = pkgs.postgresql_17; # pin explicitly; majors upgrade manually (pg_upgrade)
    enableTCPIP = false;          # listens on 127.0.0.1/::1 only — all consumers are local

    ensureDatabases = [ "zoomez" "docuseal" ];
    ensureUsers = [
      { name = "zoomez"; ensureDBOwnership = true; }
      { name = "docuseal"; ensureDBOwnership = true; }
    ];

    # Our lines are inserted BEFORE the module's defaults (first-match-wins):
    # app users get scram over loopback TCP; everything else falls through to
    # local peer auth (postgres superuser, backup jobs).
    authentication = ''
      host  zoomez    zoomez    127.0.0.1/32  scram-sha-256
      host  zoomez    zoomez    ::1/128       scram-sha-256
      host  docuseal  docuseal  127.0.0.1/32  scram-sha-256
      host  docuseal  docuseal  ::1/128       scram-sha-256
    '';

    settings = {
      password_encryption = "scram-sha-256";
      # WAL archiving for PITR is configured in task A10 (services.pgbackrest —
      # see modules/backups.nix). When enabling any archive_command that shells
      # out (pgbackrest/wal-g), ALSO uncomment the syscall-filter fix below or
      # the archiver dies with "Bad system call" under the module's sandbox.
      # wal_level = "replica";
      # archive_mode = true;
      # archive_timeout = 300;
    };
  };

  # Required once WAL archiving shells out to pgbackrest/wal-g: the module's
  # default SystemCallFilter denies @resources (incl. setrlimit). This option
  # (26.05) re-allows it deterministically — do NOT hand-edit serviceConfig.
  # services.postgresql.systemCallFilter."setrlimit" = true;

  # Runbook (task A4) — ensureUsers grants ownership but sets no passwords:
  #   sudo -u postgres psql -c "ALTER ROLE zoomez   WITH PASSWORD '<from 1Password>';"
  #   sudo -u postgres psql -c "ALTER ROLE docuseal WITH PASSWORD '<from 1Password>';"
  # pg_trgm needs NO nix config (contrib ships in the package); the app's first
  # migration runs: CREATE EXTENSION IF NOT EXISTS pg_trgm;  (task B2)
}
