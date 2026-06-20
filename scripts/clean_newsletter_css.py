#!/usr/bin/env python3
"""Limpia el CSS/JS residual de MailerLite en la página /newsletter, conservando
el centrado del formulario. Idempotente."""
import re
import shutil
import sys
import time

TPL = "/opt/mailerup/app/templates/pages/newsletter.html"

with open(TPL, encoding="utf-8") as f:
    html = f.read()

if "mlb2-27286647" not in html and "assets.mlcdn.com" not in html:
    print("ALREADY_CLEAN")
    sys.exit(0)

bak = TPL + ".cssbak-" + time.strftime("%Y%m%d_%H%M%S")
shutil.copy2(TPL, bak)

new_extra_css = """{% block extra_css %}
<link rel="stylesheet" href="/static/css/newsletter.css?v=2">
<style>
.mailerlite-form-section { display: flex; justify-content: center; margin: 2rem 0; }
</style>
{% endblock %}"""

html, n = re.subn(
    r"\{% block extra_css %\}.*?\{% endblock %\}",
    new_extra_css,
    html,
    count=1,
    flags=re.DOTALL,
)

with open(TPL, "w", encoding="utf-8") as f:
    f.write(html)

leftover = html.count("mlb2-27286647") + html.count("assets.mlcdn.com") + html.count("assets.mailerlite.com")
print(f"CLEANED extra_css_replaced={n} mailerlite_leftover_refs={leftover} backup={bak}")
