Ninjo's Foundry MCP, PC server
==============================

CODEX
  Install the server first; Claude Desktop is not required.
  Run the installed node (node.exe on Windows) with
  app/build/server/install/cli.js configure-codex to register via the Codex CLI.
  For manual TOML setup use print-config --client codex instead.
  Before uninstalling, use remove-codex, then the usual uninstaller.
  Den Server zuerst installieren; Claude Desktop ist nicht erforderlich.
  Die installierte node-Laufzeit mit app/build/server/install/cli.js und
  configure-codex aufrufen. TOML von Hand: print-config --client codex.
  Vor dem Deinstallieren remove-codex aufrufen.
  English: https://github.com/englishtom/ninjos-foundry-mcp/blob/main/docs/INSTALLATION.en.md#codex
  Deutsch: https://github.com/englishtom/ninjos-foundry-mcp/blob/main/docs/INSTALLATION.md#codex

DEUTSCH

Installieren und aktualisieren
  1. Zip entpacken (Rechtsklick, "Alle extrahieren").
  2. Windows: setup.cmd doppelklicken. Mac: setup.command doppelklicken.
  3. Claude Desktop neu starten.
  Eine vorhandene Installation wird dabei übernommen. Deine Einstellungen,
  freigegebenen Foundry-Seiten und anderen MCP-Server bleiben erhalten.

Entfernen
  Windows: Einstellungen, Apps, "Foundry MCP Server" deinstallieren.
  Mac: uninstall.command im Installationsordner doppelklicken.

Das Foundry-Modul installiert und aktualisiert Foundry selbst.
Anleitung und Fehlersuche: docs/INSTALLATION.md im Projekt.

ENGLISH

Install and update
  1. Unpack the zip (right click, "Extract All").
  2. Windows: double click setup.cmd. Mac: double click setup.command.
  3. Restart Claude Desktop.
  An existing installation is taken over. Your settings, allowed Foundry
  pages and other MCP servers are kept.

Remove
  Windows: Settings, Apps, uninstall "Foundry MCP Server".
  Mac: double click uninstall.command in the installation folder.

Foundry installs and updates the Foundry module itself.
Guide and troubleshooting: docs/INSTALLATION.en.md in the project.
