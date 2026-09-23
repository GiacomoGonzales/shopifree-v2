"""
Paso 2 del banner: monta la captura real del editor sobre la escena de la
laptop (scene.png, pantalla en verde) con la perspectiva de la pantalla, y
saca el panel de paletas flotando hacia adelante. Los textos quedan nitidos
porque son los de la captura, no dibujados por la IA.

Uso (desde shopifree-v2): python3 scripts/banner/compose-banner.py
Salida: public/banners/editor-en-vivo.webp
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SCENE = 'scripts/banner/scene.png'
SHOT = 'scripts/banner/editor-screenshot.png'
OUT = 'public/banners/editor-en-vivo.webp'

scene = Image.open(SCENE).convert('RGB')
shot = Image.open(SHOT).convert('RGB')
W, H = scene.size
arr = np.asarray(scene).astype(int)
r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]

# 1) Pantalla verde: mascara y sus cuatro esquinas.
green = (g > 150) & (r < 140) & (b < 140) & (g - np.maximum(r, b) > 60)
ys, xs = np.nonzero(green)
s, d = xs + ys, xs - ys
tl = (xs[s.argmin()], ys[s.argmin()])
br = (xs[s.argmax()], ys[s.argmax()])
tr = (xs[d.argmax()], ys[d.argmax()])
bl = (xs[d.argmin()], ys[d.argmin()])
quad = [tl, tr, br, bl]
print('esquinas de la pantalla:', quad)


def perspective_coeffs(dst, src):
    """Coeficientes para Image.transform: mapea puntos de salida (dst) a entrada (src)."""
    m = []
    for (x, y), (u, v) in zip(dst, src):
        m.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        m.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    return np.linalg.solve(np.array(m, float), np.array(src, float).reshape(8)).tolist()


def warp_onto(base, img, dst_quad, expand=1.5):
    """Pega `img` deformada sobre `dst_quad` de `base` (con un poco de margen para tapar el borde verde)."""
    cx = sum(p[0] for p in dst_quad) / 4
    cy = sum(p[1] for p in dst_quad) / 4
    grown = [(x + (x - cx) / abs(x - cx + 1e-6) * expand, y + (y - cy) / abs(y - cy + 1e-6) * expand) for x, y in dst_quad]
    w, h = img.size
    coeffs = perspective_coeffs(grown, [(0, 0), (w, 0), (w, h), (0, h)])
    warped = img.transform(base.size, Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    mask = Image.new('L', base.size, 0)
    ImageDraw.Draw(mask).polygon(grown, fill=255)
    base.paste(warped, (0, 0), mask)
    return base


# 2) Quitar el reflejo verde del teclado y los bordes (fuera de la pantalla).
screen_mask = Image.new('L', (W, H), 0)
ImageDraw.Draw(screen_mask).polygon(quad, fill=255)
outside = np.asarray(screen_mask.filter(ImageFilter.MaxFilter(9))) == 0
spill = outside & (g > np.maximum(r, b) + 12)
fixed = arr.copy()
fixed[..., 1] = np.where(spill, np.maximum(r, b) + (g - np.maximum(r, b)) * 0.15, g)
base = Image.fromarray(fixed.clip(0, 255).astype('uint8'))

# 3) La captura del editor en la pantalla.
base = warp_onto(base, shot, quad)

# 4) Brillo sutil de vidrio sobre la pantalla.
gloss = Image.new('L', (W, H), 0)
gd = ImageDraw.Draw(gloss)
gd.polygon([tl, (tl[0] + (tr[0] - tl[0]) * 0.55, tl[1] + (tr[1] - tl[1]) * 0.55), (bl[0] + (br[0] - bl[0]) * 0.2, bl[1] + (br[1] - bl[1]) * 0.2), bl], fill=22)
gloss = Image.composite(gloss, Image.new('L', (W, H), 0), screen_mask).filter(ImageFilter.GaussianBlur(30))
base = Image.composite(Image.new('RGB', (W, H), (255, 255, 255)), base, gloss)

# 5) Panel de paletas saliendo de la pantalla: recorte real, mas grande, inclinado, con sombra.
sw, sh = shot.size
panel = shot.crop((int(sw * 0.745), int(sh * 0.085), int(sw * 0.99), int(sh * 0.575)))
scale = (br[1] - tr[1]) * 0.78 / panel.height
panel = panel.resize((int(panel.width * scale), int(panel.height * scale)), Image.LANCZOS)
radius = 22
rmask = Image.new('L', panel.size, 0)
ImageDraw.Draw(rmask).rounded_rectangle([0, 0, panel.width - 1, panel.height - 1], radius=radius, fill=255)
card = Image.new('RGBA', panel.size)
card.paste(panel, (0, 0), rmask)
ImageDraw.Draw(card).rounded_rectangle([0, 0, panel.width - 1, panel.height - 1], radius=radius, outline=(255, 255, 255, 170), width=3)

pw, ph = card.size
# Ubicacion: sobre el borde derecho de la pantalla, adelantado hacia el espectador.
ox = int(tr[0] - pw * 0.55)
oy = int(tr[1] + (br[1] - tr[1]) * 0.14)
# Leve perspectiva: el lado izquierdo un poco mas chico (girado hacia la laptop).
dst = [(ox + 10, oy + 26), (ox + pw, oy), (ox + pw, oy + ph), (ox + 10, oy + ph - 18)]
coeffs = perspective_coeffs(dst, [(0, 0), (pw, 0), (pw, ph), (0, ph)])
layer = card.transform((W, H), Image.PERSPECTIVE, coeffs, Image.BICUBIC)

shadow_alpha = layer.split()[3].filter(ImageFilter.GaussianBlur(28))
shadow = Image.new('RGBA', (W, H), (2, 8, 20, 0))
shadow.putalpha(shadow_alpha.point(lambda a: int(a * 0.75)))
base = base.convert('RGBA')
base.alpha_composite(shadow, (22, 34))
# Resplandor celeste detras del panel.
glow_alpha = layer.split()[3].filter(ImageFilter.GaussianBlur(40)).point(lambda a: int(a * 0.35))
glow = Image.new('RGBA', (W, H), (56, 189, 248, 0))
glow.putalpha(glow_alpha)
base.alpha_composite(glow, (-8, -8))
base.alpha_composite(layer)

# 6) Recorte alrededor de la laptop (sin el vacio de la izquierda ni el de abajo):
# en el banner la imagen ocupa todo el alto, asi que cuanto menos margen, mas grande se ve.
left = max(0, min(p[0] for p in quad) - int(W * 0.26))
top = max(0, min(p[1] for p in quad) - int(H * 0.09))
bottom = min(H, max(p[1] for p in quad) + int(H * 0.26))
base = base.crop((left, top, W, bottom))
base.convert('RGB').save(OUT, 'WEBP', quality=90, method=6)
print('recorte final:', base.size)
print('Listo:', OUT)
