"""Convert downloaded Poly Haven 1K glTF sources to browser-ready models.

Pass a directory containing one extracted directory per asset after --.
Run: blender -b -t 4 --python tools/build_landscape.py -- /path/to/sources
"""
import sys
from pathlib import Path
import bpy
from mathutils import Matrix

OUTPUT = Path(__file__).resolve().parents[1] / 'assets' / 'models'
SOURCE = Path(sys.argv[sys.argv.index('--')+1])

# Input object suffixes and decimation target triangle counts.
MODELS = {
    'fir-sapling': ('fir_sapling', ('fir_sapling_a',), 5400),
    'pine-sapling': ('pine_sapling_small', ('_a',), 6200),
    'fern': ('fern_02', ('fern_02_a',), 950),
    'moss-rocks': ('rock_moss_set_01', ('rock01','rock02','rock03'), 1350),
}


def export(name, source, names, triangles):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / source / (source+'.gltf')))
    objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    keep = [o for o in objects if any(o.name.endswith(s) for s in names)]
    if len(keep) != len(names):
        raise RuntimeError(f'Unexpected objects for {source}: {[o.name for o in objects]}')
    for obj in objects:
        if obj not in keep:
            bpy.data.objects.remove(obj,do_unlink=True)
    for obj in keep:
        # Preserve rotation/scale from the published model, discard display-grid offsets.
        transform = obj.matrix_world.copy()
        transform.translation = (0,0,0)
        obj.data.transform(transform)
        obj.parent = None
        obj.matrix_world = Matrix.Identity(4)
        bpy.context.view_layer.objects.active = obj
        count = sum(len(p.vertices)-2 for p in obj.data.polygons)
        mod = obj.modifiers.new('Runtime triangle budget','DECIMATE')
        mod.ratio = min(1, triangles/count)
        mod.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for material in bpy.data.materials:
        if material.node_tree:
            shader = next((n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED'),None)
            if shader:
                # Small vegetation uses colour and alpha. Normal/packed channels are kept on rocks.
                if name != 'moss-rocks':
                    for channel in ('Normal','Metallic','Roughness'):
                        for link in list(shader.inputs[channel].links):
                            material.node_tree.links.remove(link)
                    shader.inputs['Roughness'].default_value = .87
    for im in bpy.data.images:
        if im.size[0] > 512 or im.size[1] > 512:
            im.scale(512,512)
            im.pack()
    bpy.ops.export_scene.gltf(filepath=str(OUTPUT/(name+'.glb')), export_format='GLB',
                              export_image_format='WEBP', export_image_add_webp=False,
                              export_tangents=name=='moss-rocks')


for name,args in MODELS.items():
    export(name,*args)
