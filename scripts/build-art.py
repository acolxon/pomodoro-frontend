"""Original Tomato pixel assets. Python standard library only, deterministic seed.
Run from frontend/: python3 scripts/build-art.py
"""
import math, random, struct, zlib
from pathlib import Path
rng = random.Random(5821)
OUT = Path(__file__).resolve().parents[1] / 'public' / 'art'
OUT.mkdir(parents=True, exist_ok=True)

class Canvas:
    def __init__(self,w,h,color=(0,0,0,0)):
        self.w,self.h=w,h
        self.p=[list(color) for _ in range(w*h)]
    def color(self,c):
        if isinstance(c,str):
            c=c.lstrip('#');return tuple(int(c[i:i+2],16) for i in (0,2,4))+(255,)
        return c
    def dot(self,x,y,c):
        x,y=int(x),int(y)
        if 0<=x<self.w and 0<=y<self.h:self.p[y*self.w+x]=list(self.color(c))
    def rect(self,x,y,w,h,c):
        c=list(self.color(c))
        for yy in range(max(0,int(y)),min(self.h,int(y+h))):
            for xx in range(max(0,int(x)),min(self.w,int(x+w))):self.p[yy*self.w+xx]=c
    def ellipse(self,x,y,w,h,c):
        for yy in range(max(0,int(y)),min(self.h,int(y+h+1))):
            for xx in range(max(0,int(x)),min(self.w,int(x+w+1))):
                if ((xx-x-w/2)/max(.5,w/2))**2+((yy-y-h/2)/max(.5,h/2))**2<=1:self.dot(xx,yy,c)
    def poly(self,points,c):
        for y in range(max(0,int(min(p[1] for p in points))), min(self.h,int(max(p[1] for p in points))+1)):
            nodes=[]
            for a,b in zip(points,points[1:]+points[:1]):
                if (a[1]<=y<b[1]) or (b[1]<=y<a[1]):nodes.append(a[0]+(y-a[1])/(b[1]-a[1])*(b[0]-a[0]))
            nodes.sort()
            for a,b in zip(nodes[::2],nodes[1::2]):self.rect(math.ceil(a),y,max(1,math.ceil(b)-math.ceil(a)),1,c)
    def line(self,a,b,c,width=1):
        n=max(abs(int(b[0]-a[0])),abs(int(b[1]-a[1])),1)
        for t in range(n+1):self.rect(round(a[0]+(b[0]-a[0])*t/n),round(a[1]+(b[1]-a[1])*t/n),width,width,c)
    def save(self,name):
        raw=b''.join(b'\x00'+bytes(sum(self.p[y*self.w:(y+1)*self.w],[])) for y in range(self.h))
        def chunk(t,data):return struct.pack('!I',len(data))+t+data+struct.pack('!I',zlib.crc32(t+data)&0xffffffff)
        blob=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',self.w,self.h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b'')
        (OUT/name).write_bytes(blob)
        print(name,len(blob),'bytes')

c=Canvas(768,448)
# Painted atmosphere, distant terraced mountains, sun and cotton clouds.
for y in range(448):
    c.rect(0,y,768,1, '#a7d7d9' if y<76 else '#a7be85' if y<112 else '#9fba6a')
c.ellipse(638,12,34,34,'#fff0af');c.ellipse(642,15,26,26,'#fff6cc')
for x,y,s in [(28,20,1),(184,14,1),(381,34,.8),(522,13,1),(695,41,.8)]:
    for dx,dy,w,h in [(0,9,58,10),(9,2,33,16),(23,-4,18,19),(45,9,26,9)]:c.rect(x+int(dx*s),y+int(dy*s),int(w*s),int(h*s),'#edf2d4')
    c.rect(x+8,y+18,int(56*s),3,'#d1e5d1')
for points,col in [([(0,98),(0,74),(67,30),(130,82),(206,45),(278,106)],'#95b7a4'), ([(134,104),(257,42),(312,81),(385,30),(468,100)],'#85aaa0'), ([(414,112),(501,59),(566,84),(647,34),(768,94),(768,118)],'#96b59b')]:c.poly(points,col)
for points in [[(48,43),(67,30),(90,51),(72,46),(66,39),(59,47)],[(364,49),(385,30),(403,50),(389,45),(383,39),(379,47)],[(630,47),(647,34),(668,48),(650,42)]]:c.poly(points,'#dce7cc')
c.poly([(0,110),(0,93),(95,86),(170,104),(290,76),(377,104),(490,80),(571,106),(695,80),(768,99),(768,135)],'#8ba76a')
# Meadow texture, small two-pixel grass tufts and clover patches.
for _ in range(6500):
    x=rng.randrange(768);y=rng.randrange(105,448)
    col=rng.choice(['#a7bf72','#97b260','#a9c778','#94ad61','#b3c97b'])
    c.rect(x,y,rng.choice([1,2,3]),rng.choice([1,1,2]),col)
for _ in range(180):
    x,y=rng.randrange(768),rng.randrange(115,448);c.rect(x,y,1,3,'#7e9e53');c.dot(x-1,y+1,'#7e9e53');c.dot(x+1,y,'#7e9e53')
# A winding stream, with sand banks and slate-blue current.
river=[(248,122),(277,137),(271,163),(252,191),(241,213),(251,244),(237,269),(201,301),(172,335),(148,382),(143,448),(77,448),(94,380),(122,329),(157,286),(192,253),(196,223),(202,186),(226,151)]
c.poly([(x+4,y+3) for x,y in river],'#7f985b');c.poly(river,'#dcc68f')
c.poly([(x+(4 if x<180 else 0),y) for x,y in [(244,126),(269,140),(265,160),(246,188),(234,214),(242,244),(230,264),(193,295),(164,333),(139,383),(133,448),(87,448),(104,382),(132,332),(166,290),(201,256),(205,220),(211,188),(233,152)]],'#6bafbd')
for _ in range(270):
    x,y=rng.randrange(80,270),rng.randrange(139,448)
    if c.p[y*768+x][:3]==[107,175,189]:c.rect(x,y,rng.randrange(2,9),1,rng.choice(['#a2d4cf','#8bc6c8','#5d9da9']))
# Paths form an intentional network around the central meeting area.
paths=[([(0,257),(127,252),(216,275),(329,254),(389,257),(459,268),(560,245),(668,263),(768,257)],29), ([(387,150),(382,225),(397,275),(442,335),(467,448)],30), ([(397,277),(333,321),(274,367),(243,448)],22), ([(567,255),(606,305),(653,362),(768,390)],19)]
for points,width in paths:
    for a,b in zip(points,points[1:]):c.line(a,b,'#b3a06b',width+5)
    for a,b in zip(points,points[1:]):c.line(a,b,'#dfc38c',width)
c.ellipse(345,237,117,76,'#d8b985');c.ellipse(351,240,104,65,'#e4cb97')
for _ in range(1800):
    x,y=rng.randrange(768),rng.randrange(155,448)
    if c.p[y*768+x][:3] in ([223,195,140],[228,203,151],[216,185,133]):c.rect(x,y,rng.choice([1,2,3]),1,rng.choice(['#efd9a6','#cfaf79','#d4b581']))
# Bridge and little rails.
c.rect(177,276,80,37,'#65543d')
for y in range(278,310,5):c.rect(179,y,76,4,'#c19b62');c.line((181,y),(252,y),'#dbb879')
for y in (274,308):
    c.rect(173,y,87,4,'#7c6140');c.rect(174,y-9,4,15,'#554c36');c.rect(255,y-9,4,15,'#554c36');c.rect(177,y-8,80,3,'#bb9660')

def bush(x,y,s=1):
    c.ellipse(x,y+5*s,25*s,11*s,'#718b48')
    for dx,dy,w,h in [(0,3,12,12),(7,-2,15,17),(17,3,12,12)]:c.ellipse(x+dx*s,y+dy*s,w*s,h*s,'#4f7b44')
    for dx,dy,w,h in [(2,2,9,7),(9,-2,11,9),(20,4,7,5)]:c.ellipse(x+dx*s,y+dy*s,w*s,h*s,'#7f9f49')
    for _ in range(5):c.rect(x+rng.randrange(3,23)*s,y+rng.randrange(2,10)*s,2*s,s,'#a9b85b')

def tree(x,y,s=1,kind=0):
    # x,y is the ground point; staggered leaf clusters rather than geometric cones.
    c.ellipse(x-21*s,y-3*s,48*s,12*s,'#829d59')
    c.rect(x-5*s,y-35*s,12*s,37*s,'#685239');c.rect(x-3*s,y-33*s,4*s,33*s,'#a27b44');c.line((x,y-8*s),(x+16*s,y-29*s),'#6c543a',3*s)
    leaf=['#416f42','#5a8140','#739448','#90a94e','#adbc60'] if kind==0 else ['#4b7b4b','#638d49','#7aa24f','#a2b55e','#b7c773']
    for dx,dy,w,h in [(-27,-53,32,34),(-8,-68,37,39),(-31,-73,39,30),(-13,-88,36,41),(11,-59,28,35),(-5,-48,36,25)]:
        c.ellipse(x+dx*s,y+dy*s,w*s,h*s,leaf[0]);c.ellipse(x+(dx+1)*s,y+(dy-2)*s,(w-3)*s,(h-5)*s,leaf[1])
    for dx,dy,w,h in [(-27,-72,22,14),(-13,-86,22,18),(5,-65,20,19),(-20,-52,18,10),(-3,-46,25,11)]:c.ellipse(x+dx*s,y+dy*s,w*s,h*s,leaf[2])
    for _ in range(int(32*s)):
        xx=x+rng.randrange(-24,27)*s;yy=y+rng.randrange(-80,-37)*s
        if 0<=int(xx)<768 and 0<=int(yy)<448 and c.p[int(yy)*768+int(xx)][:3] in [list(c.color(col)[:3]) for col in leaf[:3]]:c.rect(xx,yy,rng.choice([2,3,4])*s,2*s,rng.choice(leaf[2:]))

def fence(x,y,n):
    for i in range(n):
        xx=x+i*14;c.rect(xx,y+2,4,20,'#6d5839');c.rect(xx+1,y,3,20,'#c3a065');c.dot(xx+1,y-1,'#e1c38c')
        if i<n-1:
            c.rect(xx+3,y+6,13,3,'#795e3b');c.rect(xx+3,y+5,13,2,'#d2ae74');c.rect(xx+3,y+15,13,3,'#795e3b');c.rect(xx+3,y+14,13,2,'#bf995f')

def house(x,y,w=94,h=66,roof='#a8633e',style=0):
    c.ellipse(x-9,y+h-4,w+25,17,'#7f9856');c.rect(x+4,y,w,h,'#65503b');c.rect(x+7,y+2,w-6,h-5,'#ead6a1')
    for yy in range(y+9,y+h-5,9):c.line((x+8,yy),(x+w,yy),'#dcc38b')
    c.rect(x+w-11,y+4,10,h-5,'#ad986d');c.rect(x+7,y+4,5,h-5,'#8a6945')
    for xx in [x+w//2,x+w-15]:c.rect(xx,y+7,4,h-10,'#99734b')
    c.line((x+8,y+11),(x+w-10,y+45),'#b3935e',2)
    # Tall roof with individual shingles.
    top=y-44;c.poly([(x-10,y+5),(x+w//2,top),(x+w+13,y+5)],'#674c35')
    c.poly([(x-5,y),(x+w//2,top+3),(x+w+7,y)],roof)
    roofcols=['#b67948','#c68d54','#9d623d','#cd975a'] if style==0 else ['#8b6846','#a7804f','#b69a5d','#947747']
    for yy in range(top+8,y,6):
        half=int((yy-top)/(y-top)*(w//2+5));left=x+w//2-half
        c.rect(left,yy,half*2,2,roofcols[((yy-top)//6)%len(roofcols)])
        for xx in range(left+(yy%2)*4,left+half*2,10):c.rect(xx,yy-3,1,4,'#875738')
    c.line((x-8,y+3),(x+w//2,top),'#e0ba7c',3);c.line((x+w//2,top),(x+w+11,y+3),'#d6a26a',3)
    c.rect(x+w-20,top+4,12,21,'#987650');c.rect(x+w-21,top+3,15,4,'#d6ba86')
    # Door and glowing leaded windows.
    dx=x+w//2-4;c.rect(dx,y+28,20,h-28,'#6c543a');c.rect(dx+3,y+31,14,h-32,'#a67c48')
    for xx in range(dx+5,dx+17,4):c.rect(xx,y+32,1,h-34,'#8d673d')
    c.rect(dx+14,y+47,2,2,'#e3bb61');c.rect(dx-3,y+h-3,25,4,'#b39c71')
    for wx in [x+18,x+w-31]:
        c.rect(wx,y+17,16,20,'#66523c');c.rect(wx+2,y+19,12,15,'#ebc778');c.rect(wx+8,y+18,2,18,'#80613e');c.rect(wx+1,y+26,14,2,'#80613e');c.rect(wx-2,y+36,20,3,'#a67c49');c.rect(wx,y+38,15,3,'#658a4c')
        for k in range(4):c.rect(wx+k*4,y+36,2,3,['#cd8f70','#e6c176'][k%2])
    c.rect(x+8,y+h-2,w-8,3,'#c0aa7c')

# Horizon village, towers and windmill.
for x in range(0,768,29):
    if 300<x<500:continue
    tree(x,125+rng.randrange(-3,7),.45,1)
for x,y in [(315,76),(461,87)]:
    c.rect(x,y,14,43,'#c9bd94');c.rect(x+3,y+5,4,7,'#6e7966');c.poly([(x-4,y),(x+7,y-20),(x+19,y)],'#a87a4b');c.rect(x+9,y+19,3,6,'#7a8067')
house(64,170,99,66,'#b27748');house(566,201,111,70,'#ac6742');house(53,348,81,58,'#9a7948',1)
# The mill above the gardens.
c.poly([(606,154),(615,84),(638,84),(648,154)],'#b29c70');c.poly([(610,151),(619,87),(634,87),(641,151)],'#e3cc9a');c.poly([(608,86),(626,58),(644,86)],'#a96c43');c.rect(620,126,12,26,'#775c3c');c.rect(621,100,8,10,'#887859')
for a,b in [((625,98),(593,63)),((625,98),(659,61)),((625,98),(658,135)),((625,98),(592,132))]:
    c.line(a,b,'#6b5b3c',6);c.line((a[0]+1,a[1]),(b[0]+1,b[1]),'#dfc58d',3)
    for t in [.35,.55,.75,.95]:
        xx=a[0]+(b[0]-a[0])*t;yy=a[1]+(b[1]-a[1])*t;c.line((xx-4,yy+3),(xx+4,yy-3),'#c7b17a',2)
c.ellipse(620,93,11,11,'#76623c');c.ellipse(623,96,5,5,'#d9ba7a')
# Vegetable beds, fences and a well.
fence(549,309,12);fence(695,328,5)
for x,y in [(566,341),(605,341),(644,341),(566,372),(605,372),(644,372)]:
    c.rect(x-2,y-2,32,25,'#b8ad75');c.rect(x,y,28,21,'#886b43');c.rect(x+1,y+2,26,18,'#9b7746')
    for xx in range(x+5,x+27,9):
        for yy in range(y+4,y+20,8):
            c.rect(xx-1,yy+2,6,3,'#5c7f3e');c.rect(xx+1,yy,3,6,'#8da74a');c.dot(xx+2,yy+3,'#d8a35c')
fence(553,397,11)
for x,y in [(701,360),(725,366),(700,388)]:
    c.ellipse(x,y,12,11,'#9e713d');c.ellipse(x+1,y,10,9,'#da9144');c.line((x+5,y+1),(x+5,y+8),'#b87938');c.rect(x+5,y-3,2,4,'#5b7840')
# Well to the left of the plaza, barrels and wooden signposts.
c.ellipse(296,211,34,16,'#7d8466');c.rect(296,212,34,18,'#aaa88a');c.ellipse(297,208,32,12,'#d0c9a0');c.ellipse(302,211,22,7,'#526d67');c.rect(297,189,3,26,'#84633e');c.rect(326,189,3,26,'#84633e');c.poly([(289,192),(313,175),(337,192)],'#96704a');c.line((290,192),(313,175),'#c7a976',2)
for x,y in [(167,205),(679,247),(551,270)]:
    c.ellipse(x,y,15,6,'#b39560');c.rect(x,y+3,15,16,'#aa8350');c.ellipse(x,y+15,15,6,'#92703f');c.rect(x,y+6,15,2,'#66583c');c.rect(x,y+14,15,2,'#66583c');c.rect(x+4,y+4,1,13,'#c19c65')
for x,y in [(300,286),(500,301)]:
    c.rect(x,y-17,4,31,'#765a39');c.poly([(x-12,y-16),(x+17,y-16),(x+22,y-9),(x+17,y-3),(x-12,y-3)],'#c39d61');c.rect(x-10,y-15,25,2,'#e1bf83')
# Central campfire, log seats, cobblestones; flame is animated in the app.
for x,y in [(412,318),(432,329),(424,350),(400,352),(391,335)]:c.ellipse(x,y,10,6,'#8a8d6d');c.rect(x+2,y+1,5,2,'#c8bea0')
c.line((407,331),(429,346),'#705238',5);c.line((428,331),(405,345),'#90643b',5)
c.poly([(409,340),(411,330),(418,323),(417,334),(424,327),(426,339),(420,346)],'#d77b37');c.poly([(414,341),(418,331),(422,340),(419,345)],'#f7c76c')
c.rect(458,317,26,8,'#7c5e3a');c.rect(460,315,26,6,'#b48a51');c.rect(454,359,29,7,'#8e6b41');c.rect(455,357,29,5,'#c29a60')
# Orchard on the eastern side.
for x,y,s in [(722,183,.8),(729,270,.86),(687,123,.7),(531,142,.67),(25,207,.9),(9,285,.9),(760,370,1.0)]:tree(x,y,s,1)
for x,y in [(721,132),(737,142),(709,127),(736,213),(721,218)]:c.rect(x,y,3,3,'#c77d4b');c.dot(x,y-1,'#6a7e42')
# Near-edge trees frame the open play area rather than obstructing the paths.
for x,y,s in [(-2,134,1),(9,392,1.12),(174,167,.75),(20,458,1.1),(203,438,.76),(533,448,.8),(757,128,.95),(769,443,1.15)]:tree(x,y,s)
for x,y in [(37,273),(143,196),(277,405),(322,359),(518,330),(707,294),(682,416),(48,434),(518,196)]:bush(x,y)
fence(15,294,8);fence(335,130,8)
# Wildflowers, rocks, stepping stones, garden lanterns.
for _ in range(110):
    x,y=rng.randrange(768),rng.randrange(157,448)
    if c.p[y*768+x][:3] in ([159,186,106],[167,191,114],[151,178,96]):
        c.rect(x,y,1,4,'#678547');col=rng.choice(['#f4dda0','#f2edbd','#d59378']);c.rect(x-1,y-1,3,2,col);c.dot(x,y,'#d4aa60')
for x,y in [(284,336),(518,284),(323,224),(687,306),(37,235)]:c.ellipse(x,y,9,6,'#8e9a78');c.rect(x+2,y+1,4,2,'#bdc19a')
c.save('village-day.png')

# Native 16 x 24 sprites: four walking frames for each down/left/right/up direction.
for variant,(shirt,hair,hat) in enumerate([('#647f48','#674333','#a1a759'),('#bd7a52','#674b32','#d7b779'),('#758ea0','#463c35','#767b91'),('#a77a99','#77533c','#8d7150')]):
    s=Canvas(64,96)
    for direction in range(4):
        for frame in range(4):
            ox,oy=frame*16,direction*24
            bob=1 if frame in (1,3) else 0
            def r(x,y,w,h,col):s.rect(ox+x,oy+y+bob,w,h,col)
            r(3,21-bob,10,2,'#5e6c4b');r(5,13,7,6,'#463f33');r(5,12,6,6,shirt)
            r(4,6,9,8,'#4a3d32');r(5,7,7,6,'#e2b17b');r(4,4,9,4,hair);r(5,3,7,2,hair)
            r(3,5,11,2,hat);r(5,2,7,4,hat);r(6,2,5,1,'#ddc68b')
            if direction!=3:
                eyes=[(6,9),(10,9)] if direction==0 else [(5,9)] if direction==1 else [(11,9)]
                for ex,ey in eyes:r(ex,ey,1,2,'#3d3d32')
                r(8,12,2,1,'#ae7556')
            else:r(5,7,7,6,hair);r(6,8,5,3,'#816348')
            step=[0,1,0,-1][frame]
            r(3,13+step,2,5,'#c99a6b');r(12,13-step,2,5,'#c99a6b');r(5,18,3,4-step,'#67634a');r(9,18,3,4+step,'#67634a')
            r(4,21-step,4,2,'#594b38');r(9,21+step,4,2,'#594b38')
            r(5,16,7,2,'#a18b52');r(10,16,2,2,'#e4c985')
    s.save(f'villager-{variant}.png')
