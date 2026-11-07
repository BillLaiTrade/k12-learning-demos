from pathlib import Path
from PIL import Image,ImageChops
import json,sys
folder=Path(__file__).resolve().parent
prefix=sys.argv[1] if len(sys.argv)>1 else 'local'
asset=Path(sys.argv[2]) if len(sys.argv)>2 else folder.parents[2]/'units/5/parts/5.2/assets/bath-bowl.webp'
alpha=Image.open(asset).convert('RGBA').getchannel('A');iw,ih=alpha.size
edges=[]
for y in range(ih):
 xs=[x for x in range(iw) if alpha.getpixel((x,y))>100]
 edges.append((170+min(xs)/iw*760,170+max(xs)/iw*760) if xs else None)
results=[]
for wet in sorted(folder.glob(prefix+'-*-water.png')):
 dry=wet.with_name(wet.name.removesuffix('-water.png')+'-dry.png')
 if not dry.exists():continue
 im=Image.open(wet).convert('RGB');diff=ImageChops.difference(im,Image.open(dry).convert('RGB'));w,h=im.size;count=0;examples=[]
 for py in range(h):
  sy=(py+.5)/h*650
  if not 350<sy<620:continue
  iy=int((sy-230)/400*ih)
  edge=edges[iy] if 0<=iy<ih else None
  for px in range(w):
   sx=(px+.5)/w*1100
   if edge and edge[0]-3<=sx<=edge[1]+3:continue
   if max(diff.getpixel((px,py)))>3:
    count+=1
    if len(examples)<4:examples.append([round(sx,1),round(sy,1)])
 results.append({'state':wet.stem,'outside_changed_pixels':count,'examples':examples})
assert results,'No captures found'
(folder/(prefix+'-pixels.json')).write_text(json.dumps(results,indent=2)+'\n')
total=sum(r['outside_changed_pixels'] for r in results);print(prefix,'outside water pixels',total,'across',len(results),'states')
assert total>0 if '--expect-leak' in sys.argv else total==0,results
