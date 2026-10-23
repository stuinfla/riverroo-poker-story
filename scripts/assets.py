from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
p=Path('public'); p.mkdir(exist_ok=True)
bg='#101d1b'; gold='#d6b16a'; ivory='#f5eddc'
f=lambda n:ImageFont.truetype('/System/Library/Fonts/Supplemental/Georgia.ttf',n)
im=Image.new('RGB',(1200,630),bg); d=ImageDraw.Draw(im)
d.rectangle((30,30,1170,600),outline=gold,width=2)
d.text((65,58),'RIVERROO  /  THE POKER EXPERIMENT',font=f(22),fill=gold)
d.text((65,155),'Memory is\nnot mastery.',font=f(84),fill=ivory,spacing=0)
d.text((67,412),'A bot. A hypothesis. An honest result.',font=f(26),fill=ivory)
d.text((67,538),'BUILD → TRAIN → TEST → LEARN',font=f(18),fill=gold)
for x,y,r,s in [(850,170,'A','♠'),(955,220,'A','♥')]:
 d.rounded_rectangle((x,y,x+160,y+235),radius=12,fill=ivory)
 d.text((x+18,y+13),r,font=f(49),fill=bg if s=='♠' else '#ae493c')
 d.text((x+48,y+94),s,font=f(66),fill=bg if s=='♠' else '#ae493c')
im.save(p/'social-card.png')
for size in (192,512):
 icon=Image.new('RGB',(size,size),bg); q=ImageDraw.Draw(icon);q.ellipse((size*.08,size*.08,size*.92,size*.92),outline=gold,width=max(2,size//40));q.text((size*.24,size*.15),'R',font=f(int(size*.62)),fill=ivory);icon.save(p/f'icon-{size}.png')
