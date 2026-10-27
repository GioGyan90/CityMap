"""Create a provisional colour study from identical pixels in the three EGL views."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,statistics
root=Path('docs/immersive-palette-review');names=['day','sunset','night'];images={n:Image.open(root/(n+'.jpg')).convert('RGB') for n in names}
points=[('Sea',120,600),('Sand',360,590),('Grass',555,605),('Hill',667,240),('Road',700,567),('Cream stone',675,466),('Blue roof',800,646),('Terracotta',779,617),('Tower glass',514,336),('Green roof',603,584)]
def sample(im,x,y):
 vals=[im.getpixel((a,b)) for a in range(x-1,x+2) for b in range(y-1,y+2)]
 return tuple(int(statistics.median(p[c] for p in vals)) for c in range(3))
def hx(v):return '#'+''.join(f'{c:02X}' for c in v)
result={name:{'point':[x,y],'colors':{n:hx(sample(images[n],x,y)) for n in names}} for name,x,y in points}
(root/'palette-samples.json').write_text(json.dumps({'method':'Median of 3x3 RGB pixels in approximate EGL views; not browser colours','date':'2026-09-22','times':['12:00','17:30','21:00'],'samples':result},ensure_ascii=False,indent=2))
W,H=1600,1580;out=Image.new('RGB',(W,H),'#f1efe8');d=ImageDraw.Draw(out)
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';F=lambda size:ImageFont.truetype(font,size);B=lambda size:ImageFont.truetype(bold,size)
d.text((60,45),'COASTAL CITY / COLOUR STUDY',font=B(38),fill='#172f43');d.text((60,100),'PROVISIONAL EGL RENDER  ·  NOT A BROWSER SCREENSHOT',font=B(17),fill='#a24b3d')
for i,(name,label) in enumerate(zip(names,['DAY  /  12:00','DUSK  /  17:30','NIGHT  /  21:00'])):
 x=60+i*500;out.paste(images[name].resize((480,300),Image.Resampling.LANCZOS),(x,150));d.text((x,466),label,font=B(20),fill='#243b4a')
d.text((60,520),'SAME CAMERA  /  SAME SURFACE PIXELS',font=B(19),fill='#243b4a')
d.text((60,550),'Median 3x3 pixel values; simplified lighting and water, no real sky or shadows.',font=F(17),fill='#57656a')
for i,(name,x,y) in enumerate(points):
 yy=610+i*83;d.text((60,yy+21),name.upper(),font=B(17),fill='#253d4c')
 for j,n in enumerate(names):
  xx=260+j*425;rgb=sample(images[n],x,y);d.rounded_rectangle((xx,yy,xx+405,yy+65),radius=6,fill=rgb)
  d.text((xx+16,yy+20),hx(rgb),font=B(20),fill='#1c303d' if sum(rgb)/3>145 else '#f8f7ef')
d.text((60,1475),'SOURCE: CITYMAP MESHES AND MATERIALS  ·  2026-09-22',font=F(15),fill='#53646d')
d.text((60,1502),'Use as a preliminary reference; verify against the live WebGL renderer.',font=F(15),fill='#a24b3d')
out.save(root/'city-palette-provisional.png',optimize=True)
print(json.dumps(result,ensure_ascii=False))
