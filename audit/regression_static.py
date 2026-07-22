from pathlib import Path
import re
import sys

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]
failures = []

def require(value, message):
    if not value:
        failures.append(message)

text = '\n'.join(
    p.read_text(encoding='utf-8', errors='ignore')
    for p in root.rglob('*')
    if p.is_file()
    and p.suffix.lower() in {'.html', '.css', '.js', '.md', '.py', '.json', '.txt'}
    and p.name != 'regression_static.py'
)
retired_pattern = re.compile(r'founder(?:-| )operating(?:-| )contract', re.I)
slug = 'founder-' + 'operating-' + 'contract'
require(not (root / f'{slug}.html').exists(), 'retired route exists')
pdf_name = 'Russell-Dudek-' + 'Founder-' + 'Operating-' + 'Contract.pdf'
require(not (root / 'docs' / pdf_name).exists(), 'retired PDF exists')
require(retired_pattern.search(text) is None, 'retired artifact wording remains')
index = (root / 'index.html').read_text(encoding='utf-8')
require(index.count('class="question-card"') == 5, 'five question cards missing')
require(f'href="{slug}.html"' not in index, 'retired link remains')
require((root / 'campaign-polish.css').exists() and (root / 'document-screen.css').exists(), 'screen polish files missing')
app = (root / 'app.js').read_text(encoding='utf-8')
require('campaign-polish.css' in app and 'document-screen.css' in app, 'screen styles not loaded')
require('View cover letter' in app and 'View resume' in app, 'cross-document labels missing')
attractor = (root / 'operating-attractor.js').read_text(encoding='utf-8')
require('cycleTiming' in attractor and "phase: 'releasing'" in attractor, 'loop phases missing')
require("root.dataset.cycle = reducedMotion.matches ? 'holding'" in attractor, 'reduced-motion stable state missing')
if failures:
    print('FAIL')
    for failure in failures:
        print('-', failure)
    raise SystemExit(1)
print('PASS')
