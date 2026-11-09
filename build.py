"""Gera dist/index.html (arquivo único, para GitHub Pages ou qualquer servidor estático)
e dist/preview.html (mesmo conteúdo, sem o esqueleto do documento, para pré-visualização)."""
import base64, pathlib, re
raiz = pathlib.Path(__file__).parent
html = (raiz / "index.html").read_text(encoding="utf-8")
css = (raiz / "css/apoena.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="css/apoena.css">', f"<style>\n{css}</style>")
for png in ["logo-ufc.png", "logo-lumia.png"]:
    b64 = base64.b64encode((raiz / "assets" / png).read_bytes()).decode()
    html = html.replace(f'src="assets/{png}"', f'src="data:image/png;base64,{b64}"')
def inline(m):
    js = (raiz / m.group(1)).read_text(encoding="utf-8")
    return f"<script>\n/* {m.group(1)} */\n{js}</script>"
html = re.sub(r'<script src="(js/[^"]+)"></script>', inline, html)
(raiz / "dist").mkdir(exist_ok=True)
(raiz / "dist/index.html").write_text(html, encoding="utf-8")
# versão sem esqueleto (o publicador de pré-visualização adiciona doctype/head/body)
corpo = re.sub(r"(?s)^.*?<head>\s*", "", html)
corpo = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', "", corpo)
corpo = corpo.replace("</head>\n<body>", "").replace("</body>\n</html>", "")
(raiz / "dist/preview.html").write_text(corpo, encoding="utf-8")
print("ok", len(html))
