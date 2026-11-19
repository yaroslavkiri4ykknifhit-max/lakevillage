"""Focused Lake Village A-frame revision, metres/Z-up, Blender 4.3.

The manufacturer's page documents 8 x 8.25 x 5.86 m but contains conflicting
footprint figures elsewhere. Envelope only is adopted; all construction,
openings, structure, interior and deck detailing remain a design study.
CC0 maps and plants: see the repository's docs/asset-licenses.md.
"""
from collections import defaultdict
from math import sin, cos, pi, sqrt
from pathlib import Path
import json
import random
import bpy
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'modeling-output/aframe-detail'
OUT.mkdir(parents=True,exist_ok=True)
ASSET=ROOT/'assets'
R=random.Random(56621)
bpy.ops.wm.read_factory_settings(use_empty=True)
S=bpy.context.scene
S.unit_settings.system='METRIC'
S.unit_settings.scale_length=1
ARCH=bpy.data.collections.new('AFrame — revised architecture')
S.collection.children.link(ARCH)
ENV=bpy.data.collections.new('Demonstration planting — CC0')
S.collection.children.link(ENV)
M={}

def mat(name,color,rough=.5,metal=0,transmission=0,emission=0,texture=None,normal=.35):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*color,1)
    n=m.node_tree.nodes;p=n.get('Principled BSDF');link=m.node_tree.links.new
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
    p.inputs['Transmission Weight'].default_value=transmission
    p.inputs['IOR'].default_value=1.5
    if emission:
        p.inputs['Emission Color'].default_value=(*color,1)
        p.inputs['Emission Strength'].default_value=emission
    if texture:
        for channel in ['color','roughness','normal']:
            path=ASSET/'textures'/f'{texture}-{channel}.webp'
            if not path.exists():continue
            t=n.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(path),check_existing=True)
            if channel=='color':
                # Colour is in the actual texture; avoid nonexportable tint graphs.
                link(t.outputs['Color'],p.inputs['Base Color'])
            elif channel=='roughness':
                t.image.colorspace_settings.name='Non-Color';link(t.outputs['Color'],p.inputs['Roughness'])
            else:
                t.image.colorspace_settings.name='Non-Color'
                nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=normal
                link(t.outputs['Color'],nm.inputs['Color']);link(nm.outputs['Normal'],p.inputs['Normal'])
    M[name]=m
    return m

mat('Natural larch — grain and pores',(.38,.22,.12),texture='siding')
mat('Weathered deck — PBR',(.41,.27,.16),texture='deck')
mat('Interior oak — PBR',(.48,.32,.19),texture='oak')
mat('Graphite folded steel',(.035,.043,.047),.34,.68)
mat('Dark bronze glazing profile',(.055,.046,.035),.28,.65)
mat('Clear insulated glazing',(.94,.98,.97),.035,0,1)
mat('Glass perimeter spacer',(.04,.045,.045),.30,.35)
mat('Shadow gaps',(.018,.022,.017),.85)
mat('Concrete piles',(.28,.29,.27),.83)
mat('Warm mineral plaster',(.59,.56,.48),.82)
mat('Natural linen',(.64,.59,.48),.91)
mat('Sage cushion',(.20,.26,.20),.93)
mat('Warm light 2700K',(1,.58,.25),.5,emission=4)
mat('Brushed brass',(.38,.25,.10),.3,.82)
mat('Stoneware',(.46,.39,.28),.31)
mat('Forest floor — PBR',(.13,.16,.08),texture='forest',normal=.65)
mat('Gravel — PBR',(.32,.32,.27),texture='gravel')
for i,c in enumerate([(.08,.13,.025),(.14,.20,.04),(.19,.23,.065)]):mat(f'Grass {i}',c,.89)
for i,c in enumerate([(.24,.24,.20),(.40,.39,.32),(.16,.18,.15)]):mat(f'Pebble {i}',c,.9)

class Batch:
    def __init__(self):self.data=defaultdict(list)
    def face(self,group,material,points,uv=None):
        pts=[Vector(p) for p in points]
        if uv is None:
            n=(pts[1]-pts[0]).cross(pts[2]-pts[0]);axis=max(range(3),key=lambda j:abs(n[j]))
            a,b=((1,2),(0,2),(0,1))[axis]
            uv=[(p[a],p[b]) for p in pts]
        self.data[(group,material)].append((pts,uv))
    def prism(self,g,m,profile,a,b):
        p=[(x,a,z) for x,z in profile];q=[(x,b,z) for x,z in profile]
        self.face(g,m,p);self.face(g,m,q[::-1])
        for i in range(len(p)):
            j=(i+1)%len(p);self.face(g,m,[p[j],p[i],q[i],q[j]])
    def box(self,g,m,x,y,z,w,d,h):
        self.prism(g,m,[(x-w/2,z-h/2),(x+w/2,z-h/2),(x+w/2,z+h/2),(x-w/2,z+h/2)],y-d/2,y+d/2)
    def beam(self,g,m,a,b,w,d=None):
        a=Vector(a);b=Vector(b);v=(b-a).normalized()
        u=v.cross(Vector((0,0,1)))
        if u.length<.01:u=v.cross(Vector((0,1,0)))
        u.normalize();u*=w/2;t=v.cross(u).normalized()*(d or w)/2
        p=[a-u-t,a+u-t,a+u+t,a-u+t];q=[v+(b-a) for v in p]
        self.face(g,m,p[::-1]);self.face(g,m,q)
        for i in range(4):self.face(g,m,[p[i],p[(i+1)%4],q[(i+1)%4],q[i]])
    def lathe(self,g,m,x,y,profile,n=24,cap=True):
        loops=[[(x+r*cos(2*pi*i/n),y+r*sin(2*pi*i/n),z) for i in range(n)] for r,z in profile]
        for k in range(len(loops)-1):
            for i in range(n):
                j=(i+1)%n;self.face(g,m,[loops[k][i],loops[k][j],loops[k+1][j],loops[k+1][i]],[(i/n,k*.1),(j/n,k*.1),(j/n,(k+1)*.1),(i/n,(k+1)*.1)])
        if cap:self.face(g,m,loops[0][::-1]);self.face(g,m,loops[-1])
    def roofbeam(self,g,m,a,b,width,depth):
        x,y,z=a;xx,_,zz=b
        v=Vector((xx-x,zz-z)).normalized();dx=v.y*width/2;dz=-v.x*width/2
        self.prism(g,m,[(x-dx,z-dz),(x+dx,z+dz),(xx+dx,zz+dz),(xx-dx,zz-dz)],y-depth/2,y+depth/2)
    def flush(self,collection,bevel=0):
        result=[]
        for (group,material),faces in self.data.items():
            vs=[];fs=[]
            for pts,_ in faces:fs.append(tuple(range(len(vs),len(vs)+len(pts))));vs.extend(pts)
            me=bpy.data.meshes.new(group);me.from_pydata(vs,[],fs);me.materials.append(M[material])
            uv=me.uv_layers.new()
            for poly,(_,coords) in zip(me.polygons,faces):
                for loop,v in zip(poly.loop_indices,coords):uv.data[loop].uv=v
            ob=bpy.data.objects.new(group,me);collection.objects.link(ob)
            ob['blendstra_id']='detail_'+str(len(bpy.data.objects)).zfill(5)
            if bevel:
                # Weld face vertices before beveling so edges actually round.
                import bmesh
                bm=bmesh.new();bm.from_mesh(me);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.00005);bm.to_mesh(me);bm.free()
                mod=ob.modifiers.new('Small manufactured edge radius','BEVEL');mod.width=bevel;mod.segments=2
                mod=ob.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
            result.append(ob)
        return result

G=Batch();W=Batch();F=Batch()
WOOD='Natural larch — grain and pores';DECK='Weathered deck — PBR';OAK='Interior oak — PBR'
METAL='Graphite folded steel';FRAME='Dark bronze glazing profile';GLASS='Clear insulated glazing'
BASE=.52;HALF=4.125;RIDGE=5.86;FRONT=-4;BACK=4;GLAZE=-3.03

def roofheight(x):return RIDGE-abs(x)/HALF*(RIDGE-BASE)

# Piles and floor framing, including the visible open shadow under the terrace.
for x in [-3.4,0,3.4]:
    for y in [-6.2,-3.2,.2,3.2]:G.lathe('Concrete pier foundations','Concrete piles',x,y,[(.11,-.12),(.11,.31),(.14,.32)],16)
for y in [-6.25,-3.35,.1,3.3]:W.box('Timber bearers',WOOD,0,y,.29,7.5,.17,.24)
for x in [-3.5+i*.58 for i in range(13)]:W.box('Terrace joists',WOOD,x,-4.7,.39,.08,3.2,.18)
G.box('Insulated floor edge','Shadow gaps',0,0,.39,7.90,7.86,.24)

# Separate floorboards with end joints; actual exterior boards, not a flat slab.
for i in range(42):
    x=-3.72+i*.18
    for j in range(4):
        start=-3.03+j*1.73
        W.box('Interior floor boards',OAK,x,start+.859,.514,.174,1.712,.026)
for i in range(43):
    x=-3.72+i*.176
    W.box('Terrace deck boards',DECK,x,-4.71,.477,.169,3.28,.072)
for y in [-6.36,-3.08]:W.box('Deck fascia and end grain',DECK,0,y,.385,7.60,.045,.23)
for x in [-3.80,3.80]:W.box('Deck side fascia',DECK,x,-4.70,.38,.045,3.35,.24)
for step in range(3):
    y=-6.50-step*.33;z=.36-step*.13
    for j in range(2):W.box('Open stair treads',DECK,.65,y-j*.15,z,2.25,.142,.052)
for x in [-.25,1.55]:W.beam('Stair stringers',WOOD,(x,-6.29,.40),(x,-7.28,-.02),.09,.17)

# Real sheet thickness, folded seams, ridge cap, layered gable edges and inset soffits.
for side in [-1,1]:
    G.roofbeam('Continuous roof sheets',METAL,(side*HALF,0,BASE),(0,0,RIDGE-.025),.065,8.0)
    G.roofbeam('Roof interior lining',OAK,(side*(HALF-.14),.40,BASE),(0,.40,RIDGE-.19),.055,7.07)
    W.roofbeam('Gable oak fascia outer',WOOD,(side*(HALF-.02),-4.015,BASE),(0,-4.015,RIDGE-.02),.20,.10)
    G.roofbeam('Gable metal drip edge',METAL,(side*(HALF+.025),-4.069,BASE),(0,-4.069,RIDGE+.032),.055,.038)
    W.roofbeam('Recessed glazing surround',WOOD,(side*3.80,GLAZE-.04,BASE),(0,GLAZE-.04,RIDGE-.29),.15,.17)
    # Batten-size joints in the projecting roof soffit.
    for j in range(9):
        y=-3.95+j*.104
        W.roofbeam('Recessed porch soffit boards',WOOD,(side*(HALF-.11),y,BASE+.04),(0,y,RIDGE-.15),.024,.098)
    direction=Vector((-side*HALF,0,RIDGE-BASE)).normalized()
    normal=Vector((side*direction.z,0,abs(direction.x)))
    for j in range(18):
        yy=-3.94+j*.46
        a=Vector((side*HALF,yy,BASE))+normal*.049
        b=Vector((0,yy,RIDGE-.025))+normal*.049
        offsets=[(-.009,0),(-.009,.021),(.006,.026),(.009,.021),(.009,0)]
        for (off,h),(off2,h2) in zip(offsets,offsets[1:]):
            pa=a+Vector((0,off,0))+normal*h;pb=b+Vector((0,off,0))+normal*h
            qa=a+Vector((0,off2,0))+normal*h2;qb=b+Vector((0,off2,0))+normal*h2
            G.face('Folded standing seams — 26mm',METAL,[pa,qa,qb,pb])
G.prism('Folded ridge cap',METAL,[(-.11,RIDGE-.085),(0,RIDGE+.045),(.11,RIDGE-.085),(.115,RIDGE-.11),(0,RIDGE+.025),(-.115,RIDGE-.11)],-4.055,4.055)

# Recessed facade: vertical boards are clipped against the actual roof profile.
windows=[(-2.45,-1.38),(-1.13,-.13),(.12,1.12),(1.37,2.44)]
for i in range(64):
    x=-3.75+i*.119
    if x>3.76:continue
    top=min(roofheight(x)-.24,2.82)
    if top<=BASE:continue
    in_window=any(a-.03<x<b+.03 for a,b in windows)
    if in_window:
        sill=BASE if -1.16<x<1.15 else BASE+.24
        if sill>BASE:W.box('Facade individual vertical boards',WOOD,x,GLAZE-.035,(BASE+sill)/2,.112,.045,sill-BASE)
        if top>2.66:W.box('Facade individual vertical boards',WOOD,x,GLAZE-.035,(top+2.66)/2,.112,.045,top-2.66)
    else:W.box('Facade individual vertical boards',WOOD,x,GLAZE-.035,(BASE+top)/2,.112,.045,top-BASE)
G.prism('Gable triangular insulated glazing',GLASS,[(-2.12,2.87),(2.12,2.87),(0,RIDGE-.30)],GLAZE,GLAZE+.016)
G.beam('Upper glazing mullions',FRAME,(0,GLAZE-.012,2.84),(0,GLAZE-.012,RIDGE-.30),.052,.073)
G.box('Upper glazing transom',FRAME,0,GLAZE-.016,2.835,4.40,.09,.07)
for i,(a,b) in enumerate(windows):
    z0=BASE if i in [1,2] else BASE+.24;z1=2.63
    G.box('Separate insulated glass panes',GLASS,(a+b)/2,GLAZE+.01,(z0+z1)/2,b-a-.07,.016,z1-z0-.07)
    for x in [a,b]:G.box('Window frame extrusions',FRAME,x,GLAZE-.014,(z0+z1)/2,.051,.085,z1-z0+.06)
    for z in [z0,z1]:G.box('Window frame extrusions',FRAME,(a+b)/2,GLAZE-.014,z,b-a+.045,.085,.051)
    for x in [a+.036,b-.036]:G.box('Double glazing black spacer', 'Glass perimeter spacer',x,GLAZE+.017,(z0+z1)/2,.006,.008,z1-z0-.045)
    if i in [1,2]:
        x=b-.11 if i==1 else a+.11
        G.beam('Door handle standoffs',FRAME,(x,GLAZE-.064,1.49),(x,GLAZE-.13,1.49),.016)
        G.beam('Door handles',FRAME,(x,GLAZE-.13,1.49),(x,GLAZE-.13,1.30),.022)
        for z in [.84,2.30]:G.box('Door hinges',FRAME,a-.015,GLAZE-.07,z,.024,.04,.12)
G.box('Drainage threshold',METAL,0,GLAZE-.08,BASE+.006,2.40,.19,.018)
for x in [-2.7,2.7]:
    G.box('Facade wall lamp',FRAME,x,GLAZE-.08,2.03,.08,.10,.32)
    G.box('Facade wall lamp lenses','Warm light 2700K',x,GLAZE-.081,1.865,.056,.074,.012)

# Rear wall and a partially glazed triangular gable. Hidden surfaces are a hypothesis.
for i in range(65):
    x=-3.76+i*.117;t=roofheight(x)-.22
    if t>BASE:W.box('Rear gable timber cladding',WOOD,x,3.925,(t+BASE)/2,.110,.065,t-BASE)
G.box('Rear kitchen service partition','Warm mineral plaster',.95,2.38,1.54,.10,2.83,2.05)
G.prism('Bathroom partition clipped under roof','Warm mineral plaster',[(.915,.515),(2.785,.515),(2.785,roofheight(2.785)-.24),(.915,2.545)],.96,1.06)

# Functional, supported loft and stair, visibly furnished through the front glazing.
W.box('Sleeping loft floor',OAK,0,2.22,2.88,4.18,3.05,.16)
for x in [-2.0,2.0]:G.box('Loft perimeter steel',METAL,x,2.22,2.78,.09,3.1,.13)
for i in range(13):
    y=-.98+i*.188;z=BASE+.18*(i+1)
    W.box('Interior stair oak treads',OAK,-1.55,y,z,.75,.235,.055)
for x in [-1.94,-1.17]:G.beam('Stair steel stringers',METAL,(x,-1.13,.56),(x,1.46,2.83),.045,.11)
for x in [-1.42,-.71,0,.71,1.42]:G.beam('Loft balustrade',FRAME,(x,.68,2.94),(x,.68,3.78),.026)
W.box('Loft handrail',OAK,0,.68,3.80,2.93,.055,.045)

def softbox(name,material,location,scale,radius=.08):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    ob=bpy.context.object;ob.name=name;ob.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for c in list(ob.users_collection):c.objects.unlink(ob)
    ARCH.objects.link(ob);ob.data.materials.append(M[material])
    b=ob.modifiers.new('Upholstered rounded construction','BEVEL');b.width=radius;b.segments=5
    ob.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    for p in ob.data.polygons:p.use_smooth=True
    return ob

softbox('Loft mattress','Natural linen',(0,2.40,3.10),(1.5,1.98,.26),.085)
for x in [-.38,.38]:softbox('Loft linen pillow','Natural linen',(x,3.0,3.27),(.61,.43,.16),.075)
softbox('Sofa upholstered base','Natural linen',(.68,-1.08,.84),(2.05,.9,.40),.11)
softbox('Sofa back','Natural linen',(.68,-.69,1.18),(1.98,.25,.57),.09)
for x in [-.36,1.72]:softbox('Sofa arm','Natural linen',(x,-1.08,1.06),(.21,.89,.38),.085)
for x in [.10,.72,1.34]:softbox('Separate sofa seat cushions','Natural linen',(x,-1.12,1.065),(.59,.68,.14),.045)
for x in [.06,1.28]:
    ob=softbox('Sage scatter pillow','Sage cushion',(x,-.84,1.33),(.43,.14,.43),.065);ob.rotation_euler.y=.12
for x in [-.20,1.54]:
    for y in [-1.42,-.78]:G.beam('Sofa feet',FRAME,(x,y,.53),(x,y,.70),.027)
G.lathe('Living room table',OAK,.68,-2.15,[(.25,.53),(.22,.85),(.44,.88),(.44,.94)],48)
G.lathe('Living vase','Stoneware',.62,-2.13,[(.08,.94),(.14,1.08),(.10,1.21),(.045,1.27),(.035,1.27),(.04,1.24)],32,False)
W.box('Kitchen oak cabinets',OAK,2.29,2.62,.98,1.68,.62,.90)
G.box('Kitchen stone countertop','Warm mineral plaster',2.29,2.62,1.46,1.74,.67,.052)
for x in [1.74,2.28,2.82]:G.box('Kitchen recessed handles',FRAME,x,2.296,1.31,.31,.025,.018)
G.lathe('Kitchen ceramic sink','Stoneware',2.03,2.61,[(.19,1.49),(.17,1.43),(.13,1.40),(.13,1.405),(.19,1.496)],32,False)
G.beam('Kitchen faucet',FRAME,(2.03,2.86,1.48),(2.03,2.86,1.78),.026)
G.beam('Kitchen faucet spout',FRAME,(2.03,2.86,1.78),(2.03,2.66,1.78),.026)

# Curved fabric sling deckchairs on crossed hardwood frames.
for x,y in [(-1.90,-4.72),(1.88,-4.47)]:
    for side in [-1,1]:
        xx=x+side*.31
        W.beam('Lounge chair crossed frame',WOOD,(xx,y-.36,.52),(xx,y+.49,1.18),.046,.033)
        W.beam('Lounge chair rear legs',WOOD,(xx,y+.49,.52),(xx,y-.30,.99),.046,.033)
        W.beam('Lounge chair backrest rail',WOOD,(xx,y-.18,.81),(xx,y+.38,1.50),.043,.032)
        G.lathe('Chair bronze pivots','Brushed brass',xx,y,[(.025,.83),(.025,.84)],12)
    for yy,zz in [(y-.34,.76),(y+.38,1.50)]:W.beam('Lounge chair crossbars',WOOD,(x-.34,yy,zz),(x+.34,yy,zz),.035)
    profile=[(-.35,.79),(-.20,.73),(-.02,.73),(.10,.88),(.21,1.13),(.37,1.47)]
    for k in range(len(profile)-1):
        ya,za=profile[k];yb,zb=profile[k+1]
        F.face('Lounge chair tensioned linen','Natural linen',[(x-.285,y+ya,za),(x+.285,y+ya,za),(x+.285,y+yb,zb),(x-.285,y+yb,zb)])
G.lathe('Terrace turned side table',WOOD,0,-4.92,[(.23,.52),(.17,.59),(.13,.91),(.35,.95),(.35,.99)],40)
for x in [-.12,.12]:
    G.lathe('Terrace stoneware cups','Stoneware',x,-4.92,[(.048,.995),(.059,1.09),(.055,1.105),(.047,1.105),(.045,1.02)],24,False)
for x,y in [(-3.17,-3.72),(3.20,-3.67)]:
    G.lathe('Terrace planters','Concrete piles',x,y,[(.20,.52),(.28,1.03),(.29,1.07),(.25,1.07),(.23,.99)],32,False)
for y in [-6.18,-3.34]:
    for x in [-3.47,3.47]:
        G.lathe('Deck recessed fixtures',FRAME,x,y,[(.038,.516),(.038,.523)],20)
        G.lathe('Deck recessed warm lens','Warm light 2700K',x,y,[(.027,.524),(.027,.528)],20)

G.flush(ARCH);W.flush(ARCH,.0035);F.flush(ARCH)

# Full real plant meshes from the project's already licensed CC0 collection.
def template(filename):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ASSET/'models'/filename))
    obs=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
    for ob in obs:
        for c in list(ob.users_collection):c.objects.unlink(ob)
        ENV.objects.link(ob)
    return obs

fir=template('fir-sapling.glb');pine=template('pine-sapling.glb');fern=template('fern.glb');rocks=template('moss-rocks.glb')
def plant(obs,name,placements):
    # Objects imported by these GLBs have applied coordinates already.
    for i,(x,y,z,s) in enumerate(placements):
        for proto in obs:
            ob=proto if i==0 else proto.copy()
            if i:ENV.objects.link(ob)
            ob.name=f'{name}.{i:02d}';ob.location=(x,y,z);ob.scale=(s,s,s);ob.rotation_euler.z=R.uniform(-pi,pi)

plant(fir,'CC0 detailed fir',[(-7,6,0,6.0),(-3,9,0,7),(2,10,0,6.5),(7,8,0,7.2),(10,3,0,6.4),(-9,-1,0,6.1)])
plant(pine,'CC0 detailed pine',[(-8,10,0,7.4),(5,13,0,8.2),(12,6,0,7),(-10,4,0,7.8)])
plant(fern,'CC0 fern',[(-4.6,-4.4,0,2),(4.7,-4.0,0,2),(4.3,-6.2,0,1.7),(-5.4,-6.5,0,1.8),(-6,-1,0,1.8),(5,1,0,2),(-3.17,-3.72,1.02,1.3),(3.20,-3.67,1.02,1.3)])
for i,ob in enumerate(rocks):ob.location=[(-5.0,-2.2,.05),(5.6,-4.9,.05),(-5.3,-7.6,.01)][i];ob.scale=(.48,.48,.48)

# Textured soil, gravel apron, individual pebbles and curved grass leaves.
L=Batch();L.box('Ground patch','Forest floor — PBR',0,2,-.13,32,32,.20)
L.box('Draining gravel bed','Gravel — PBR',0,-.75,-.012,9.15,13.6,.04)
for i in range(850):
    x=R.uniform(-4.55,4.55);y=R.uniform(-7.52,5.8)
    if abs(x)<3.68 and -6.3<y<4:continue
    r=R.uniform(.018,.058);h=r*R.uniform(.7,1.5);n=6
    lo=[(x+r*cos(j*2*pi/n),y+r*sin(j*2*pi/n),.012) for j in range(n)]
    top=(x+.1*r,y,.014+h)
    for j in range(n):L.face('Individual drainage stones',f'Pebble {i%3}',[lo[j],lo[(j+1)%n],top])
for i in range(7000):
    x=R.uniform(-12,12);y=R.uniform(-10,14)
    if abs(x)<4.63 and -7.6<y<5.8:continue
    if y<-7.35 and abs(x-.6)<1.1:continue
    angle=R.random()*2*pi;h=R.uniform(.07,.32);w=R.uniform(.007,.018)
    u=Vector((cos(angle),sin(angle),0));p=Vector((x,y,-.012));b=u*h*.22
    p1=p+Vector((0,0,h*.52))+b*.25;p2=p+Vector((0,0,h))+b
    L.face('Curved grass blades',f'Grass {i%3}',[p-u*w,p+u*w,p1+u*w*.6,p1-u*w*.6])
    L.face('Curved grass blades',f'Grass {i%3}',[p1-u*w*.6,p1+u*w*.6,p2])
for i in range(7):
    y=-7.8-i*.61;x=.6+R.uniform(-.04,.04)
    L.box('Arrival stepping stones','Concrete piles',x,y,.025,1.05,.50,.07)
L.flush(ENV)

def area(name,loc,target,power,size,color):
    d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;d.color=color
    ob=bpy.data.objects.new(name,d);S.collection.objects.link(ob);ob.location=loc
    ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()
area('Warm interior living pendant',(.2,-.5,2.4),(.2,-.8,.5),85,1.1,(1,.66,.38))
area('Loft warm fill',(0,2.2,4.4),(0,2,2.9),45,.9,(1,.66,.38))
area('Soft sky front fill',(1,-9,6),(0,0,2),600,7,(.82,.88,1))
world=bpy.data.worlds.new('Poly Haven daylight');world.use_nodes=True;S.world=world
tex=world.node_tree.nodes.new('ShaderNodeTexEnvironment');tex.image=bpy.data.images.load(str(ASSET/'lighting/day.hdr'))
world.node_tree.links.new(tex.outputs['Color'],world.node_tree.nodes['Background'].inputs['Color'])
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.65
d=bpy.data.lights.new('Low afternoon sun','SUN');d.energy=2.2;d.angle=.09;d.color=(1,.87,.69)
sun=bpy.data.objects.new('Low afternoon sun',d);S.collection.objects.link(sun);sun.rotation_euler=(.57,-.61,-.48)
camd=bpy.data.cameras.new('A-frame detail camera');cam=bpy.data.objects.new('A-frame detail camera',camd);S.collection.objects.link(cam)
cam.location=(12,-18,7.8);target=Vector((0,-.6,2.3));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
camd.lens=48;S.camera=cam
S.render.engine='CYCLES';S.cycles.device='CPU';S.cycles.samples=160;S.cycles.use_denoising=False
S.cycles.max_bounces=8;S.cycles.transmission_bounces=6;S.cycles.transparent_max_bounces=10
S.render.resolution_x=1100;S.render.resolution_y=850;S.render.resolution_percentage=100
S.view_settings.view_transform='AgX';S.view_settings.look='AgX - Medium High Contrast';S.view_settings.exposure=.35;S.render.image_settings.file_format='PNG'
S.render.film_transparent=False
S.world.color=(.1,.1,.1)
for i,ob in enumerate(sorted(S.objects,key=lambda o:o.name)):ob['blendstra_id']=f'afdetail_{i:04d}'
note=bpy.data.texts.new('Readme — dimensions, changes and provenance')
note.write('''LAKE VILLAGE A-FRAME DETAIL STUDY — 2026-11-19
Envelope 8.00 m long x 8.25 m wide x 5.86 m roof ridge adopted from https://unit-home.ru/aframe56 .
The supplier page has contradictory footprint statements. This is not a measured or construction-ready replica.
Window layout, terrace, interior, foundation, joints and lighting are original conceptual design choices.
Changed from the existing repository mesh: rebuilt shell, recessed facade with separate planks, 26mm folded seams,
sheet edge/ridge cap, solid glazing and spacers, hardware, subfloor bearers and piers, open stairs,
curved linen deckchairs, loft and kitchen, real CC0 fir/pine/fern/rocks, individual grass and pebbles.
CC0 textures and plants: Poly Haven and ambientCG as recorded in docs/asset-licenses.md of the source repository.
Detailed source uses Cycles on CPU. Browser copy has independent viewer lighting.
''')
source=bpy.data.texts.new('detail_aframe.py');source.write(Path(__file__).read_text())
deps=bpy.context.evaluated_depsgraph_get();counts={}
for coll in [ARCH,ENV]:
    count=0
    for ob in coll.objects:
        if ob.type!='MESH':continue
        e=ob.evaluated_get(deps);mesh=e.to_mesh();count+=sum(len(p.vertices)-2 for p in mesh.polygons);e.to_mesh_clear()
    counts[coll.name]=count
print('DETAIL_COUNTS',json.dumps(counts),flush=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'Lake-Village-AFrame-Detail.blend'),compress=True)
S.render.filepath=str(OUT/'aframe-detail-v2.png');bpy.ops.render.render(write_still=True)
# Preserve botanical alpha using PNG while keeping opaque maps compact JPEG.
# The packed editable master above retains its original CC0 texture maps.
alpha_images=set()
for material in bpy.data.materials:
    if material.use_nodes:
        for link in material.node_tree.links:
            if link.from_node.type=='TEX_IMAGE' and link.from_socket.name=='Alpha':alpha_images.add(link.from_node.image)
preview_textures=OUT/'preview-textures';preview_textures.mkdir(exist_ok=True)
for i,image in enumerate(bpy.data.images):
    if image.source!='FILE' or not image.has_data or image.type!='IMAGE':continue
    keep_alpha=image in alpha_images
    image.file_format='PNG' if keep_alpha else 'JPEG'
    image.filepath_raw=str(preview_textures/f'image-{i:02d}.{ "png" if keep_alpha else "jpg" }')
    image.save();image.pack()
bpy.ops.export_scene.gltf(filepath=str(OUT/'Lake-Village-AFrame-Detail.glb'),export_format='GLB',export_image_format='AUTO',export_extras=True,export_cameras=False,export_lights=False,export_apply=True)
print('DETAIL_FINISHED',flush=True)
