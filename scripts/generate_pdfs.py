from pathlib import Path
import shutil
import sys
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
tokens = (BASE / 'brand-tokens.css').read_text(encoding='utf-8')
css = tokens + '\n' + (BASE / 'styles.css').read_text(encoding='utf-8')
js = (BASE / 'app.js').read_text(encoding='utf-8')
outputs = {
    'resume.html': 'Russell-Dudek-COO-AI-Adoption-Resume.pdf',
    'cover-letter.html': 'Russell-Dudek-COO-AI-Adoption-Cover-Letter.pdf',
    'interview-brief.html': 'Russell-Dudek-COO-AI-Adoption-Interview-Thesis.pdf',
    '120-day-plan.html': 'Russell-Dudek-COO-AI-Adoption-120-Day-Plan.pdf',
    'role-alignment.html': 'Russell-Dudek-COO-AI-Adoption-Role-Alignment.pdf',
}
selected = set(sys.argv[1:])
if selected:
    unknown = selected.difference(outputs)
    if unknown:
        raise SystemExit(f'Unknown routes: {sorted(unknown)}')
    outputs = {route: filename for route, filename in outputs.items() if route in selected}

def bundled(route: str) -> str:
    soup = BeautifulSoup((BASE / route).read_text(encoding='utf-8'), 'html.parser')
    for tag in soup.select('link[href="brand-tokens.css"], link[href="styles.css"], script[src="app.js"]'):
        tag.decompose()
    style = soup.new_tag('style')
    style.string = css
    soup.head.append(style)
    script = soup.new_tag('script')
    script.string = js
    soup.body.append(script)
    return str(soup)

(BASE / 'docs').mkdir(exist_ok=True)
with sync_playwright() as p:
    opts = {'args': ['--no-sandbox', '--disable-dev-shm-usage']}
    system_chromium = shutil.which('chromium') or shutil.which('chromium-browser')
    if system_chromium:
        opts['executable_path'] = system_chromium
    browser = p.chromium.launch(**opts)
    page = browser.new_page()
    page.emulate_media(media='print', reduced_motion='reduce')
    for route, filename in outputs.items():
        page.set_content(bundled(route), wait_until='load')
        page.pdf(
            path=str(BASE / 'docs' / filename),
            format='Letter',
            print_background=True,
            prefer_css_page_size=True,
            margin={'top': '0', 'right': '0', 'bottom': '0', 'left': '0'},
            display_header_footer=False,
        )
        print(f'{route} -> docs/{filename}')
    browser.close()
