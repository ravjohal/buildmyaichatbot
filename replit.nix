{ pkgs }: {
  deps = [
    pkgs.playwright-driver
    pkgs.playwright
    pkgs.chromium
    pkgs.glib
    pkgs.nspr
    pkgs.nss
    pkgs.dbus
    pkgs.atk
    pkgs.at-spi2-core
    pkgs.gtk3
    pkgs.mesa
    pkgs.libxkbcommon
    pkgs.alsa-lib
    pkgs.xorg.libX11
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrandr
    pkgs.xorg.libxcb
  ];
}