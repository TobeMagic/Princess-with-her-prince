#!/usr/bin/env python3
"""Install this scaffold into a local luckee-ads-eval Git source tree."""
from __future__ import annotations
import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--eval-root', required=True, help='Absolute path to luckee-ads-eval')
    parser.add_argument('--scaffold-root', default=str(Path(__file__).resolve().parent))
    args = parser.parse_args()
    scaffold = Path(args.scaffold_root).resolve()
    root = Path(args.eval_root).resolve()
    if not (root / 'promptfoo' / 'scripts' / 'resolve_recipe.py').is_file():
        raise SystemExit('not a luckee-ads-eval root: ' + str(root))
    shutil.copytree(scaffold / 'cases', root / 'cases', dirs_exist_ok=True)
    (root / 'promptfoo' / 'recipes').mkdir(parents=True, exist_ok=True)
    for src in sorted((scaffold / 'recipes').glob('*.yaml')):
        shutil.copy2(src, root / 'promptfoo' / 'recipes' / src.name)
    (root / 'eval_sets').mkdir(parents=True, exist_ok=True)
    for src in sorted((scaffold / 'eval_sets').glob('*.yaml')):
        shutil.copy2(src, root / 'eval_sets' / src.name)
    registry_path = root / 'registry.json'
    registry = json.loads(registry_path.read_text(encoding='utf-8'))
    fragment = json.loads((scaffold / 'registry.fragment.json').read_text(encoding='utf-8'))
    existing = {entry.get('case_id') for entry in registry.get('cases', [])}
    added = [entry for entry in fragment['cases'] if entry['case_id'] not in existing]
    registry['cases'].extend(added)
    registry['updated_at'] = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('installed_case_dirs=' + str(len(list((scaffold / 'cases').iterdir()))))
    print('registry_added=' + str(len(added)))
    print('eval_root=' + str(root))

if __name__ == '__main__':
    main()
