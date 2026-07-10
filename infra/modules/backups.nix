# Backups & DR (ADR-005/009/010) — three NATIVE modules, zero hand-rolled units:
#   1. services.postgresqlBackup — nightly pg_dumpall to /var/backup/postgresql
#      (the dumb, portable, restore-anywhere fallback)
#   2. services.restic.backups  — nightly encrypted offsite (B2) of all state dirs
#   3. services.pgbackrest      — Postgres PITR (task A10 completes this)
# Losing restic-password or the age keys = losing the backups. Both live in 1Password.
{ config, lib, ... }:
{
  # ---- 1. Nightly logical dump (before restic picks it up) -------------------
  services.postgresqlBackup = {
    enable = true;
    backupAll = true; # zoomez + docuseal in one dump-all
    startAt = "*-*-* 01:15:00";
    # location default: /var/backup/postgresql — listed in restic paths below
  };

  # ---- 2. Offsite files → Backblaze B2 (S3-compatible) -----------------------
  # DEFERRED (no-spend phase): offsite needs a B2/S3 account. Nightly local
  # dumps still run above; revisit when the business goes live with real data.
  services.restic.backups.offsite = lib.mkIf false {
    initialize = true;
    # TODO(J3/A10): real bucket + endpoint once the B2 account exists.
    repository = "s3:s3.us-west-002.backblazeb2.com/CHANGE-ME-zoomez-backups/restic";
    environmentFile = "/run/secrets/restic-env";   # AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
    passwordFile = "/run/secrets/restic-password";

    paths = [
      "/var/backup/postgresql"  # nightly dumps (above)
      "/var/lib/garage"         # photos + signed docs (the business's memories)
      "/var/lib/docuseal"       # DocuSeal uploads + secret-key-base
      "/var/lib/uptime-kuma"    # Kuma config incl. its ntfy provider setup
      "/var/lib/zoomez"         # app state dir (should stay tiny)
      "/etc/ssh"                # host keys — restoring these keeps sops decryptable
    ];
    exclude = [ "/var/lib/garage/data/tmp" ];

    timerConfig = {
      OnCalendar = "02:30";
      Persistent = true;
      RandomizedDelaySec = "15m";
    };
    pruneOpts = [ "--keep-daily 7" "--keep-weekly 4" "--keep-monthly 6" ];
    checkOpts = [ "--read-data-subset=5%" ]; # non-empty ⇒ runCheck; subset caps B2 egress
    # createWrapper defaults true ⇒ operator gets a preloaded `restic-offsite`
    # CLI on the host: restic-offsite snapshots / restore latest --target /tmp/x
  };

  # ---- 3. Postgres PITR — task A10 -------------------------------------------
  # services.pgbackrest is a first-class 26.05 module (stanzas, repos, scheduled
  # jobs). A10: configure a stanza for the cluster with an S3 repo (same B2
  # account, separate prefix), wire archiving on (see the commented block +
  # syscall-filter note in modules/postgres.nix), schedule full/diff jobs, and
  # REHEARSE a point-in-time restore before calling it done.
  # services.pgbackrest = {
  #   enable = true;
  #   repos.repo1 = { ... };        # s3 repo — consult the module options in A10
  #   stanzas.zoomez = { ... };     # cluster stanza + jobs.{full,diff}.schedule
  # };
  # (Documented alternative if pgbackrest disappoints: wal-g via
  # settings.archive_command + an EnvironmentFile on postgresql.service + a
  # base-backup timer — pattern preserved in infra/README.md.)

  # ---- Alerting: a silent backup failure must not stay silent ----------------
  # systemd.services."restic-backups-offsite".onFailure = [ "notify-failure@restic-backups-offsite.service" ]; # (with restic)
  # NOTE(A11): verify the postgresqlBackup unit name on the host
  # (`systemctl list-units 'postgresql*'`) and attach onFailure the same way.
}
