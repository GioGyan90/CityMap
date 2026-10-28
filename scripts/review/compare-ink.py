"""Compare two actual-geometry EGL reviews and prune byte-identical original frames."""
import json,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
old=Path(sys.argv[1]);new=Path(sys.argv[2]);metrics=[]
board=Image.new('RGB',(1440,1350));draw=ImageDraw.Draw(board)
for row,name in enumerate(['panorama','cargo','housing']):
 for col,(folder,label) in enumerate([(old,'thin v1'),(new,'bold v2')]):
  im=Image.open(folder/(name+'-manga.jpg'));board.paste(im.resize((720,450)),(col*720,row*450));draw.text((col*720+12,row*450+12),name+' | '+label+' | approximate EGL',fill='white')
 a=np.asarray(Image.open(old/(name+'-manga.jpg')),dtype=float);b=np.asarray(Image.open(new/(name+'-manga.jpg')),dtype=float);delta=(a-b).mean(axis=2)
 identical=(old/(name+'-original.jpg')).read_bytes()==(new/(name+'-original.jpg')).read_bytes();assert identical,'Original rendering changed: '+name
 metrics.append({'view':name,'darkenedOver8LevelsPercent':float((delta>8).mean()*100),'meanDarkening':float(delta.mean()),'originalRenderIdentical':identical})
board.save(new/'before-after.jpg',quality=92);(new/'ink-change.json').write_text(json.dumps(metrics,indent=2))
for name in ['panorama','cargo','housing','sunset','night']:
 src=old/(name+'-original.jpg');dst=new/(name+'-original.jpg')
 if src.read_bytes()==dst.read_bytes():dst.unlink()
print('Old/new ink comparison passed; unchanged original images reuse the first review')
