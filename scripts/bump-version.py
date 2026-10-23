#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de gestion du Versioning Sémantique (SemVer) de Luumo
============================================================
Usage :
    python3 scripts/bump-version.py 2.1.0

Met à jour de façon atomique :
1. Le fichier racine `VERSION` (`2.1.0`)
2. `custom_addons/luumo_base/__manifest__.py` (`18.0.2.1.0`)
3. `custom_addons/luumo_api/__manifest__.py` (`18.0.2.1.0`)
4. `custom_addons/luumo_api/controllers/health_controller.py` (`18.0.2.1.0`)
5. `luumo_web/package.json` (`2.1.0`)
"""
import json
import pathlib
import re
import sys

SEMVER_RE = re.compile(r'^\d+\.\d+\.\d+$')
ROOT = pathlib.Path(__file__).resolve().parent.parent


def main():
    if len(sys.argv) != 2 or not SEMVER_RE.match(sys.argv[1].strip()):
        print("Usage: python3 scripts/bump-version.py <MAJOR.MINOR.PATCH> (ex: 2.1.0)", file=sys.stderr)
        sys.exit(1)

    semver = sys.argv[1].strip()
    odoo_ver = f"18.0.{semver}"

    # 1. VERSION
    (ROOT / 'VERSION').write_text(f"{semver}\n", encoding='utf-8')

    # 2. Manifests Odoo & Health Controller
    targets = [
        ROOT / 'custom_addons/luumo_base/__manifest__.py',
        ROOT / 'custom_addons/luumo_api/__manifest__.py',
        ROOT / 'custom_addons/luumo_api/controllers/health_controller.py',
    ]
    for path in targets:
        content = path.read_text(encoding='utf-8')
        updated = re.sub(r"'version':\s*'18\.0\.\d+\.\d+\.\d+'", f"'version': '{odoo_ver}'", content)
        path.write_text(updated, encoding='utf-8')

    # 3. luumo_web/package.json
    pkg_path = ROOT / 'luumo_web/package.json'
    if pkg_path.exists():
        pkg = json.loads(pkg_path.read_text(encoding='utf-8'))
        pkg['version'] = semver
        pkg_path.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')

    print(f"✓ Version mise à jour vers v{semver} (Modules Backend : {odoo_ver})")
    print(f"  Pour publier la release sur GitHub Container Registry :")
    print(f"  git add -A && git commit -m 'chore(release): v{semver}' && git tag v{semver} && git push origin main --tags")


if __name__ == '__main__':
    main()
