# Centrifugo — stateless realtime sidecar (v6; memory engine, no Redis).
# Durable truth stays in Postgres; clients reconcile via REST on reconnect
# (api-contract §4). The module validates config with `centrifugo checkconfig`
# at start — a bad settings attrset fails at service start, not at eval.
{ config, ... }:
{
  services.centrifugo = {
    enable = true;

    # Centrifugo v6 config layout (the module asserts v6 — no top-level
    # `port`/`token_hmac_secret_key` v5 keys).
    settings = {
      http_server = {
        address = "127.0.0.1"; # only Caddy talks to it (apex /connection/*)
        port = 8000;
      };
      client.allowed_origins = [ "https://${config.zoomez.domain}" ];
      # Secrets are NOT set here (world-readable store) — they arrive as env:
      #   CENTRIFUGO_CLIENT_TOKEN_HMAC_SECRET_KEY  (JWTs minted by the app)
      #   CENTRIFUGO_HTTP_API_KEY                  (app → publish API)
    };

    environmentFiles = [ "/run/secrets/centrifugo-env" ];
  };
}
