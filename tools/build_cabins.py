"""Build the two original Lake Village concept meshes in Blender (metres, Z up).

Run from the checkout: blender -b -t 4 --python tools/build_cabins.py
The exported GLBs include the PBR maps used by the building meshes.
"""
from collections import defaultdict
from math import cos, pi, sin
from pathlib import Path

import bpy
from mathutils import Vector

OUTPUT = Path(__file__).resolve().parents[1] / "assets" / "models"
FLOOR = .38
# Linear RGB, roughness, metallic.
SURFACES = {
    "Oak": ((.49, .31, .16), .65, 0),
    "Cladding": ((.29, .19, .12), .71, 0),
    "BlackCladding": ((.082, .065, .05), .74, 0),
    "Deck": ((.49, .34, .22), .75, 0),
    "Roof": ((.036, .043, .046), .44, .64),
    "Seam": ((.061, .069, .069), .43, .62),
    "Frame": ((.033, .035, .031), .47, .47),
    "Concrete": ((.31, .30, .25), .89, 0),
    "Plaster": ((.67, .60, .48), .88, 0),
    "Linen": ((.50, .43, .34), .95, 0),
    "Sage": ((.17, .23, .16), .91, 0),
    "Rust": ((.37, .15, .075), .87, 0),
    "Ceramic": ((.60, .55, .43), .24, 0),
    "Glass": ((.73, .83, .80), .075, 0),
    "Lamp": ((1, .64, .32), .46, 0),
    "Stones": ((.13, .12, .115), .96, 0),
    "Water": ((.039, .16, .15), .2, .15),
}


WOOD = {
    "Oak": ("oak", (.56, .43, .31)),
    "Cladding": ("siding", (.87, .65, .43)),
    "BlackCladding": ("siding", (.21, .22, .19)),
    "Deck": ("deck", (.65, .55, .43)),
}


def apply_wood(material, shader, key, tint):
    nodes = material.node_tree.nodes
    connect = material.node_tree.links.new

    def image(channel):
        node = nodes.new("ShaderNodeTexImage")
        path = OUTPUT.parent / "textures" / f"{key}-{channel}.webp"
        node.image = bpy.data.images.load(str(path), check_existing=True)
        if channel != "color":
            node.image.colorspace_settings.name = "Non-Color"
        return node.outputs["Color"]

    color = nodes.new("ShaderNodeMixRGB")
    color.blend_type = "MULTIPLY"
    color.inputs[0].default_value = 1
    color.inputs[2].default_value = (*tint, 1)
    connect(image("color"), color.inputs[1])
    connect(color.outputs["Color"], shader.inputs["Base Color"])
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = .50
    connect(image("normal"), normal.inputs["Color"])
    connect(normal.outputs["Normal"], shader.inputs["Normal"])
    connect(image("roughness"), shader.inputs["Roughness"])


class Model:
    def __init__(self):
        self.faces = defaultdict(list)

    def face(self, material, coords, uv=None, smooth=False):
        points = [Vector(c) for c in coords]
        if uv is None:
            n = (points[1] - points[0]).cross(points[2] - points[0])
            axis = max(range(3), key=lambda i: abs(n[i]))
            u, v = ((1, 2), (0, 2), (0, 1))[axis]
            uv = [(p[u] / 1.7, p[v] / 1.7) for p in points]
        self.faces[material].append((points, uv, smooth))

    def prism(self, material, profile, front, back):
        # Profile is counterclockwise in the XZ plane.
        a = [(x, front, z) for x, z in profile]
        b = [(x, back, z) for x, z in profile]
        self.face(material, a)
        self.face(material, b[::-1])
        for i in range(len(a)):
            j = (i + 1) % len(a)
            self.face(material, [a[j], a[i], b[i], b[j]])

    def box(self, material, x, y, z, w, d, h):
        self.prism(material, [(x-w/2, z-h/2), (x+w/2, z-h/2),
                              (x+w/2, z+h/2), (x-w/2, z+h/2)], y-d/2, y+d/2)

    def beam(self, material, a, b, width, depth=None):
        # Beam in an XZ frame; extrusion gives the correct sloped section.
        x, y, z = a
        end_x, _, end_z = b
        delta = Vector((end_x-x, end_z-z)).normalized()
        u, v = delta.y * width / 2, -delta.x * width / 2
        depth = width if depth is None else depth
        self.prism(material, [(x-u, z-v), (x+u, z+v),
                              (end_x+u, end_z+v), (end_x-u, end_z-v)], y-depth/2, y+depth/2)

    def lathe(self, material, x, y, rings, sides=24, cap_top=True, cap_bottom=True):
        rows = [[(x + r*cos(i*2*pi/sides), y+r*sin(i*2*pi/sides), z)
                 for i in range(sides)] for r, z in rings]
        for k in range(len(rows)-1):
            for i in range(sides):
                j = (i+1) % sides
                self.face(material, [rows[k][i], rows[k][j], rows[k+1][j], rows[k+1][i]],
                          [(i/sides,k),((i+1)/sides,k),((i+1)/sides,k+1),(i/sides,k+1)], True)
        if cap_bottom:
            self.face(material, rows[0][::-1])
        if cap_top:
            self.face(material, rows[-1])

    def cushion(self, material, x, y, z, w, d, h, radius=.12):
        # Rounded upholstered corners and gently tapered seam edges.
        loops = []
        for height, inset in [(-h/2,.035),(-h*.33,0),(h*.33,0),(h/2,.035)]:
            ring = []
            for quadrant, (cx, cy) in enumerate([(1,1),(-1,1),(-1,-1),(1,-1)]):
                for j in range(5):
                    angle = (quadrant*90+j*22.5)*pi/180
                    ring.append((x+cx*(w/2-radius)+(radius-inset)*cos(angle),
                                 y+cy*(d/2-radius)+(radius-inset)*sin(angle), z+height))
            loops.append(ring)
        self.face(material, loops[0][::-1])
        self.face(material, loops[-1])
        for a,b in zip(loops, loops[1:]):
            for i in range(len(a)):
                j=(i+1)%len(a)
                self.face(material, [a[i],a[j],b[j],b[i]], smooth=True)

    def export(self, name):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.context.scene.unit_settings.system = 'METRIC'
        for label, polygons in self.faces.items():
            vertices, faces = [], []
            for coords, _, _ in polygons:
                faces.append(tuple(range(len(vertices),len(vertices)+len(coords))))
                vertices.extend(coords)
            mesh = bpy.data.meshes.new(label)
            mesh.from_pydata(vertices, [], faces)
            layer = mesh.uv_layers.new(name="UVMap")
            for poly, (_, uv, smooth) in zip(mesh.polygons,polygons):
                poly.use_smooth = smooth
                for index, value in zip(poly.loop_indices, uv):
                    layer.data[index].uv = value
            material = bpy.data.materials.new(label)
            material.use_nodes = True
            color, rough, metal = SURFACES[label]
            material.diffuse_color = (*color, 1)
            shader = material.node_tree.nodes.get("Principled BSDF")
            shader.inputs["Base Color"].default_value = (*color, 1)
            shader.inputs["Roughness"].default_value = rough
            shader.inputs["Metallic"].default_value = metal
            if label in WOOD:
                apply_wood(material, shader, *WOOD[label])
            if label == "Glass":
                shader.inputs["Transmission Weight"].default_value = 1
                shader.inputs["IOR"].default_value = 1.48
            if label == "Lamp":
                shader.inputs["Emission Color"].default_value = (1,.51,.22,1)
                shader.inputs["Emission Strength"].default_value = .45
            mesh.materials.append(material)
            obj = bpy.data.objects.new(label,mesh)
            bpy.context.collection.objects.link(obj)
            # Tangents from the authored UVs stay consistent across glTF viewers.
            obj.modifiers.new("Triangulate for glTF", 'TRIANGULATE')
        bpy.ops.export_scene.gltf(filepath=str(OUTPUT / (name + ".glb")), export_format='GLB',
                                  export_texcoords=True, export_normals=True,
                                  export_materials='EXPORT', export_yup=True, export_tangents=True, export_apply=True,
                                  export_image_format='WEBP', export_image_add_webp=False)


def glazing(m, width, front, base, eave, ridge):
    # Individual panes and mullions describe the glazed front and terrace door.
    half = width/2
    if eave > base+.2:
        columns = [-half, -half*.56, -.51, .51, half*.56, half]
        for i, (a,b) in enumerate(zip(columns,columns[1:])):
            sill = base if i==2 else base+.10
            m.box("Glass", (a+b)/2, front, (sill+eave)/2, b-a-.048,.022,eave-sill-.055)
            m.box("Frame", a,front, (base+eave)/2,.062,.1,eave-base)
        m.box("Frame", half,front,(base+eave)/2,.065,.10,eave-base)
        m.box("Frame", 0,front,eave,width,.11,.10)
        m.box("Frame", 0,front,base+.025,width,.105,.06)
        m.box("Frame", -.40,front-.07,base+1.05,.023,.055,.25)
    else:
        columns = [-half, -half*.65, -.52, .52, half*.65, half]
        eave=base
    def top(x):
        return ridge-abs(x)/half*(ridge-eave)
    for a,b in zip(columns,columns[1:]):
        bounds = [a,0,b] if a<0<b else [a,b]
        profile=[(a,eave), (b,eave)] + [(x,top(x)) for x in bounds[::-1] if top(x)>eave+.002]
        if len(profile)>2:
            m.prism("Glass",profile,front-.011,front+.011)
    for x in columns[1:-1]:
        m.box("Frame",x,front,(eave+top(x))/2,.069,.10,top(x)-eave)
    if eave<.7:
        transom=2.43
        span=width*(ridge-transom)/(ridge-eave)
        m.box("Frame",0,front,transom,span,.095,.060)
        m.box("Frame",-.44,front-.045,1.46,.022,.061,.29)
        m.box("Frame",0,front,base+.004,width,.104,.065)
    m.box("Frame",0,front,(eave+ridge)/2,.071,.11,ridge-eave)
    for side in (-1,1):
        m.beam("Oak",(side*half,front,eave),(0,front,ridge),.13,.17)


def terrace(m, width, depth, front):
    edge = front-depth
    count=round(width/.145)
    w=width/count
    for i in range(count):
        x=-width/2+w*(i+.5)
        m.box("Deck",x,front-depth/2,FLOOR-.045,w-.007,depth,.078)
        for y in (edge+.13,front-.14):
            m.lathe("Frame",x,y,[(.008,FLOOR-.006),(.008,FLOOR-.003)],8)
    for x in (-width*.42,width*.42):
        for y in (edge+.27,front-.20):
            m.box("Frame",x,y,.14,.125,.125,.28)
    for step in range(2):
        m.box("Deck",0,edge-.19-.27*step,.22-.12*step,width*.72,.40,.12)
    for x in (-width*.32,width*.32):
        m.box("Cladding",x,front-1.1,.70,.77,.78,.10)
        m.cushion("Linen",x,front-1.1,.77,.72,.70,.15)
        m.cushion("Sage",x,front-.75,1.06,.72,.18,.48,.08)
        for dx in (-.29,.29):
            for dy in (-.29,.29):
                m.box("Frame",x+dx,front-1.1+dy,.54,.05,.05,.29)
    m.lathe("Cladding",0,front-1.28,[(.23,.39),(.12,.53),(.12,.83),(.36,.84),(.36,.89)],28)
    m.lathe("Ceramic",.09,front-1.23,[(.065,.89),(.087,.96),(.076,1.01)],18)
    for x in (-width*.45,width*.45):
        m.lathe("Frame",x,edge+.25,[(.084,FLOOR),(.088,.51),(.055,.56)],16)
        m.lathe("Lamp",x,edge+.25,[(.054,.53),(.053,.69)],16)
        m.lathe("Frame",x,edge+.25,[(.061,.69),(.061,.716)],16)


def living(m, front):
    y=front+2.35
    m.box("Sage",-1.06,y,FLOOR+.012,2.6,2.18,.025)
    m.cushion("Linen",-1.08,y+.63,FLOOR+.42,2.20,.93,.27)
    for x in (-1.72,-1.08,-.44):
        m.cushion("Linen",x,y+.55,FLOOR+.60,.62,.66,.16)
        m.cushion("Linen",x,y+.99,FLOOR+.83,.62,.25,.44)
    for x in (-2.11,-.05):
        m.cushion("Linen",x,y+.65,FLOOR+.65,.24,.87,.34)
    m.cushion("Rust",-1.57,y+.82,FLOOR+.85,.40,.16,.34,.07)
    m.cushion("Sage",-.61,y+.85,FLOOR+.85,.37,.16,.32,.07)
    m.lathe("Oak",-.99,y-.44,[(.27,FLOOR),(.22,FLOOR+.30),(.43,FLOOR+.33),(.43,FLOOR+.39)],32)
    m.lathe("Ceramic",-1.09,y-.43,[(.085,FLOOR+.39),(.10,FLOOR+.47),(.065,FLOOR+.57),(.049,FLOOR+.64)],22)
    m.box("Cladding",1.70,y+1.07,FLOOR+.48,1.26,.42,.91)
    m.box("Concrete",1.70,y+1.07,FLOOR+.96,1.28,.46,.068)
    for x in (1.30,1.70,2.10):
        m.box("Frame",x,y+.827,FLOOR+.75,.14,.035,.027)
    for x,dy in [(-.65,-.3),(1.47,.3)]:
        m.lathe("Frame",x,y+dy,[(.015,2.38),(.015,3.15)],12)
        m.lathe("Cladding",x,y+dy,[(.30,2.19),(.24,2.30),(.075,2.42)],32,cap_bottom=False)
        m.lathe("Lamp",x,y+dy,[(.21,2.21),(.21,2.23)],24)


def sauna(m, x, y):
    # A detached wellness pod is an independent resort concept.
    w, d, h = 2.45,2.65,2.27
    m.box("Deck",x,y,.18,w+.13,d+.16,.32)
    m.box("Cladding",x,y+d/2-.06,h/2,w,.12,h)
    for s in (-1,1):
        m.box("BlackCladding",x+s*w/2,y,h/2,.13,d,h)
        m.box("Frame",x+s*1.04,y-d/2,1.12,.105,.10,2.11)
    m.box("Roof",x,y,2.28,w+.24,d+.21,.14)
    m.box("Glass",x,y-d/2,1.18,2.12,.018,2.02)
    m.box("Frame",x+.19,y-d/2,1.17,.073,.096,2.02)
    m.box("Frame",x+.31,y-d/2-.025,1.08,.029,.057,.22)
    m.box("BlackCladding",x-1.16,y-d/2-.037,1.16,.068,.061,2.10)
    for yy in (y+.25,y+.88):
        for i in range(6):
            m.box("Oak",x,yy+(i-2.5)*.103,.76+(yy-y)*.43,2.06,.096,.053)
    m.lathe("Frame",x-.69,y-.43,[(.25,.34),(.26,1.0)],20)
    for i in range(10):
        angle=i*2.4
        m.lathe("Stones",x-.69+.15*cos(angle),y-.43+.15*sin(angle),
                [(.075,.99),(.082,1.05),(.047,1.10)],8)
    m.box("Lamp",x,y+.64,.90,1.8,.04,.04)
    # Slatted privacy screen behind the round soaking tub.
    tubx=x-1.0
    tuby=y-2.58
    m.lathe("Deck",tubx,tuby,[(.89,.05),(.96,.14),(.95,.86),(.88,.90),(.81,.86),(.81,.21)],32,
            cap_top=False)
    m.lathe("Water",tubx,tuby,[(.809,.73),(.809,.745)],40)
    for h in (.19,.73):
        m.lathe("Frame",tubx,tuby,[(.956,h),(.956,h+.036)],32,False,False)


def cabin(aframe):
    m=Model()
    half,d = (4.125,8.0) if aframe else (4,9.6)
    front,back=-d/2,d/2
    eave,ridge = ((FLOOR,5.86) if aframe else (2.86,5.42))
    half_glass=half-.23
    front_skin=front+.18
    m.box("Concrete",0,0,.18,half*2-.30,d-.24,.32)
    m.box("Oak",0,0,FLOOR-.043,half*2-.32,d-.28,.085)
    terrace(m,6.0 if aframe else 5.6,17.83/6 if aframe else 3.0,front+.14)
    # The standing seams run downslope, above the folded metal and interior lining.
    for side in (-1,1):
        m.beam("Roof",(side*(half-.035),0,eave+.06),(0,0,ridge-.065),.12,d)
        m.beam("Oak",(side*(half-.20),0,eave),(0,0,ridge-.21),.125,d-.35)
        for i in range(round(d/.48)):
            y=front+.21+i*.48
            if y < back-.12:
                m.beam("Seam",(side*(half-.020),y,eave+.130),(0,y,ridge+.006),.038,.034)
        m.beam("Frame",(side*(half-.050),front+.030,eave+.05),(0,front+.030,ridge-.04),.14,.074)
    m.box("Seam",0,0,ridge-.045,.20,d,.09)
    glazing(m,half_glass*2,front_skin,FLOOR+.035,2.66 if not aframe else FLOOR+.08,
            ridge-.31)
    if aframe:
        glazing(m,half_glass*2,back-.16,FLOOR+.035,FLOOR+.08,ridge-.32)
        # Side entry / separate kitchen, bathroom volume and sleeping loft.
        m.box("Plaster",.69,2.42,1.52,.10,2.60,2.27)
        m.box("Plaster",1.48,1.55,1.50,1.53,.12,2.22)
        m.box("Oak",0,1.97,2.71,3.78,3.62,.16)
        m.cushion("Linen",.22,2.11,2.99,1.42,1.93,.26)
        for x in (-.10,.57):
            m.cushion("Linen",x,2.76,3.14,.51,.37,.14,.08)
        for i in range(14):
            m.box("Oak",-1.32,.82+i*.167,FLOOR+.17*i,.67,.21,.08)
        for x in (-1.77,-.90,0,.90,1.77):
            m.box("Frame",x,.17,3.18,.035,.038,.87)
        m.box("Oak",0,.17,3.62,3.62,.07,.055)
        m.box("Cladding",1.03,3.2,.81,1.45,.61,.86)
        m.box("Concrete",1.03,3.2,1.26,1.49,.66,.06)
        m.lathe("Ceramic",.83,3.24,[(.15,1.28),(.17,1.31),(.14,1.34)],24)
        m.box("Frame",.83,3.42,1.43,.023,.026,.28)
        m.box("Frame",.83,3.35,1.56,.023,.17,.025)
        m.box("Cladding",-.26,2.17,.73,.62,.73,.65)
        m.box("Oak",-.26,2.17,1.10,.75,.78,.08)
        m.lathe("Ceramic",-.26,2.2,[(.11,1.14),(.13,1.19),(.11,1.24)],20)
    else:
        m.prism("Cladding",[(-half+.12,FLOOR),(half-.12,FLOOR),(half-.12,eave),
                            (0,ridge-.24),(-half+.12,eave)],back-.17,back-.05)
        for side in (-1,1):
            x=side*(half-.14)
            for i in range(round(d/.183)):
                y=front+.30+i*.183
                if y > back-.17:
                    break
                if -.52 < y < 1.36:
                    m.box("BlackCladding",x,y,.83,.15,.172,.91)
                    m.box("BlackCladding",x,y,2.66,.15,.172,.29)
                else:
                    m.box("BlackCladding",x,y,(FLOOR+eave)/2,.15,.172,eave-FLOOR)
            m.box("Glass",x,-.52+.94,1.86,.022,1.86,1.16)
            for y in (-.53,.42,1.37):
                m.box("Frame",x,y,1.86,.105,.055,1.26)
            for z in (1.25,2.47):
                m.box("Frame",x,.42,z,.105,1.94,.06)
        # A vaulted living bay and three proposed bedroom zones behind it.
        m.box("Plaster",-1.55,.67,1.50,4.72,.13,2.23)
        m.box("Plaster",3.27,.67,1.50,1.03,.13,2.23)
        for x in (-1.32,1.17):
            m.box("Plaster",x,2.95,1.52,.12,3.4,2.27)
        for x in (-2.61,-.16,2.42):
            m.box("Cladding",x,3.52,.55,1.42,1.91,.25)
            m.cushion("Linen",x,3.52,.78,1.38,1.87,.26)
            m.cushion("Sage",x,4.12,.96,1.05,.41,.12,.09)
        m.box("Cladding",2.83,-1.28,.84,.62,2.18,.92)
        m.box("Concrete",2.83,-1.28,1.34,.67,2.23,.08)
        m.box("Frame",2.83,-1.70,1.386,.46,.54,.018)
        for y in (-2.02,-1.42,-.82,-.22):
            m.box("Frame",2.51,y,1.19,.033,.14,.028)
        m.box("Oak",2.87,-.25,2.00,.43,1.17,.07)
        for y in (-.63,-.35,.01):
            m.lathe("Ceramic",2.80,y,[(.070,2.035),(.085,2.12),(.073,2.17)],16)
    living(m,front_skin)
    sauna(m,half+2.1,.8)
    return m


if __name__ == "__main__":
    OUTPUT.mkdir(parents=True,exist_ok=True)
    cabin(True).export("aframe-56")
    cabin(False).export("barnhouse-56")
