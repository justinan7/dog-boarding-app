# The flake moved to the repository root

`infra/flake.nix` became `/flake.nix` when the app packages landed: a flake
rooted at `infra/` cannot reference `../server` or `../web` (paths outside the
flake source tree are forbidden). Everything else in `infra/` is unchanged —
the host config, modules, secrets, and README all still live here.

Deploy from the repo root:

    nixos-rebuild switch --flake .#zoomez --target-host root@zoomez
