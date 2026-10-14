# PixelLab 원본(art-src/*.png)을 게임에서 쓰는 형태로 정리해 client/src/assets/pixel/ 에 쓴다.
# 실행: python art-src/build.py
from pathlib import Path
from PIL import Image

SRC = Path(__file__).parent
OUT = SRC.parent / 'client' / 'src' / 'assets' / 'pixel'
OUT.mkdir(parents=True, exist_ok=True)

def load(name):
    return Image.open(SRC / f'{name}.png').convert('RGBA')

def trim(im):
    return im.crop(im.getbbox())

def lum(c):
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]

# 아이콘: 어두운 픽셀만 남긴 단색 실루엣 (밝은 픽셀은 구멍). CSS mask 로 currentColor 를 입힌다.
for name in ['icon-nunchi', 'icon-minority', 'icon-liar', 'icon-bomb', 'crown']:
    im = load(name)
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            px[x, y] = (17, 17, 17, 255) if c[3] and lum(c) < 100 else (0, 0, 0, 0)
    trim(im).save(OUT / f'{name}.png')

trim(load('arrow')).save(OUT / 'arrow.png')
trim(load('burst')).save(OUT / 'burst.png')

# 폭탄: 심지 끝 불꽃(오른쪽 위 초록·흰 픽셀)을 따로 떼어 깜빡임 애니메이션을 준다.
bomb = load('bomb')
spark = Image.new('RGBA', bomb.size)
DARK = {(17, 17, 17), (43, 43, 43), (138, 138, 138), (217, 217, 217)}
for y in range(0, 26):
    for x in range(36, 64):
        c = bomb.getpixel((x, y))
        if c[3] and c[:3] not in DARK:
            spark.putpixel((x, y), c)
            bomb.putpixel((x, y), (0, 0, 0, 0))
bomb.save(OUT / 'bomb.png')
spark.save(OUT / 'bomb-spark.png')
for f in sorted(OUT.glob('*.png')):
    print(f.name, Image.open(f).size)

# 앱 아이콘(64x64): 아이보리 바탕 + 검은 픽셀 U + 라임 화살표 (로고와 같은 구성)
icon = Image.new('RGBA', (64, 64), (250, 249, 243, 255))
ip = icon.load()
BLACK = (17, 17, 17, 255)
for y in range(64):
    for x in range(64):
        # U: 두께 9px 기둥 두 개 + 아래쪽 반원 (중심 32,40 / 바깥 반지름 21, 안쪽 12)
        d2 = (x - 31.5) ** 2 + (y - 40) ** 2
        side = (11 <= x <= 19 or 44 <= x <= 52) and 22 <= y <= 40
        bowl = y > 40 and 12 ** 2 <= d2 <= 21 ** 2
        if side or bowl:
            ip[x, y] = BLACK
arrow = trim(load('arrow')).resize((19, 30), Image.NEAREST)
icon.alpha_composite(arrow, (22, 8))
icon.save(SRC.parent / 'client' / 'public' / 'icon.png')
