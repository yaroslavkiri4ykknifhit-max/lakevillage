import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const gltf = new GLTFLoader();
const model = name => gltf.loadAsync(new URL(`./assets/models/${name}.glb`, import.meta.url).href);
const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.smoothstep;

export const lakeLevel = .085;
export function shoreRadius(angle) {
  return 1 + .027*Math.sin(3*angle+.4)+.024*Math.cos(5*angle-1)
    + .011*Math.sin(11*angle)+.006*Math.cos(19*angle+.2);
}
export function shorelineDistance(x, z) {
  const nx = x/59, nz = z/50;
  return (Math.hypot(nx,nz)-shoreRadius(Math.atan2(nx,nz)))*54;
}
export function groundHeight(x,z) {
  const shore = shorelineDistance(x,z);
  if (shore < 0) return lakeLevel - 3.8*smooth(-shore,0,24);
  const wave = Math.sin(x*.092+z*.038)*Math.cos(z*.111-x*.028)
    + .29*Math.sin(x*.24-z*.31);
  const boundary = smooth(Math.max(Math.abs(x),Math.abs(z)),117,181);
  return -.09 + .171*(1-smooth(shore,0,3.6)) + wave*(.07+boundary*2.0)*smooth(shore,1,11);
}

export function makeTerrain(material, sand) {
  const geo = new THREE.PlaneGeometry(540,540,300,300).rotateX(-Math.PI/2);
  const positions = geo.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let i=0; i<positions.count; i++) {
    const x=positions.getX(i), z=positions.getZ(i);
    positions.setY(i,groundHeight(x,z));
    const variation = .78+.16*Math.sin(x*.084+z*.11)*Math.cos(x*.14-z*.09);
    color.setRGB(variation*.84,variation*.91,variation*.78);
    colors.push(color.r,color.g,color.b);
  }
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geo.computeVertexNormals();
  material.vertexColors = true;
  material.onBeforeCompile = shader => {
    shader.uniforms.shoreSand = {value:sand.map};
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 vGround;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvGround = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>','#include <common>\nvarying vec3 vGround; uniform sampler2D shoreSand;')
      .replace('#include <map_fragment>',`#include <map_fragment>
        vec2 lakeUV = vGround.xz/vec2(59.,50.);
        float a = atan(lakeUV.x,lakeUV.y);
        float r = 1.+.027*sin(3.*a+.4)+.024*cos(5.*a-1.)+.011*sin(11.*a)+.006*cos(19.*a+.2);
        float d = (length(lakeUV)-r)*54.;
        float beach = smoothstep(26.,49.,vGround.z)*(1.-smoothstep(12.,29.,abs(vGround.x)));
        float limit = mix(2.4,12.0,beach)+1.1*sin(vGround.x*1.35+vGround.z*.8);
        float shoreMix = smoothstep(-7.,-1.,d)*(1.-smoothstep(limit*.34,limit,d));
        vec3 sandColor = texture2D(shoreSand,vGround.xz*.35).rgb;
        diffuseColor.rgb = mix(diffuseColor.rgb,sandColor,shoreMix*.86);
      `);
  };
  const terrain = new THREE.Mesh(geo,material);
  terrain.receiveShadow=true;
  return terrain;
}

export function setupSky(scene, renderer, sun) {
  const loader = new RGBELoader();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const cache = new Map();
  let request = 0;
  function read(name) {
    if (!cache.has(name)) {
      const path = new URL(`./assets/lighting/${name}.hdr`,import.meta.url).href;
      cache.set(name,loader.loadAsync(path).then(sky => {
        sky.mapping=THREE.EquirectangularReflectionMapping;
        const data=sky.image.data;
        const {width,height}=sky.image;
        let peak=-1, index=0;
        const {fromHalfFloat}=THREE.DataUtils;
        for (let i=0; i<width*height; i++) {
          const light=.2126*fromHalfFloat(data[i*4])+.7152*fromHalfFloat(data[i*4+1])
            +.0722*fromHalfFloat(data[i*4+2]);
          if (light>peak) {peak=light;index=i;}
        }
        const u=((index%width)+.5)/width;
        const v=1-(Math.floor(index/width)+.5)/height;
        const azimuth=(u-.5)*Math.PI*2, elevation=(v-.5)*Math.PI;
        const direction=new THREE.Vector3(Math.cos(azimuth)*Math.cos(elevation),
          Math.max(.095,Math.sin(elevation)),Math.sin(azimuth)*Math.cos(elevation)).normalize();
        const environment=pmrem.fromEquirectangular(sky);
        return {sky,environment,direction};
      }).catch(error => {cache.delete(name);throw error;}));
    }
    return cache.get(name);
  }
  return async night => {
    const id=++request;
    try {
      const {sky,environment,direction}=await read(night?'evening':'day');
      if (id!==request) return;
      scene.background=sky;
      scene.backgroundIntensity=night?.78:.98;
      scene.environment=environment.texture;
      sun.position.copy(direction).multiplyScalar(185).add(sun.target.position);
      return true;
    } catch(error) {
      console.warn('Lake Village HDRI unavailable',error);
      return false;
    }
  };
}

export const demoModels = {
  aframe: {name:'aframe-56', width:8.25, depth:8, terrace:[6,2.97], eye:[.72,2.06,-.35], front:[.18,1.72,4.4]},
  barn: {name:'barnhouse-56', width:8, depth:9.6, terrace:[5.6,3], eye:[.52,2.06,-.2], front:[.12,1.75,4.9]},
};

export async function loadDemoCabin(kind, anisotropy) {
  const definition=demoModels[kind];
  const {scene}=await model(definition.name);
  const glass=[], lamps=[];
  scene.traverse(node => {
    if (!node.isMesh) return;
    const {material}=node;
    node.castShadow=material.name!=='Glass' && material.name!=='Lamp';
    node.receiveShadow=material.name!=='Glass';
    for (const map of [material.map,material.normalMap,material.roughnessMap]) {
      if (map) map.anisotropy=anisotropy;
    }
    if (material.name==='Glass') {
      material.thickness=.018;
      material.attenuationColor.setHex(0xb0d4cd);
      material.attenuationDistance=1.2;
      material.envMapIntensity=.82;
      glass.push(material);
    }
    if (material.name==='Lamp') lamps.push(material);
  });
  const lights=[
    new THREE.PointLight(0xffc184,5,8,2),
    new THREE.PointLight(0xffd5a6,8,7,2),
    new THREE.PointLight(0xffac65,3,5,2),
  ];
  lights[0].position.set(-.7,2.12,definition.depth/2-2);
  lights[1].position.set(1.35,2.12,definition.depth/2-2.65);
  lights[2].position.set(definition.width/2+2.1,1.1,-.8);
  scene.add(...lights);
  return {
    scene,
    light(night) {
      lights.forEach((lamp,i)=>{lamp.intensity=(night?[28,30,18]:[4,6,3])[i];});
      lamps.forEach(lamp=>{lamp.emissiveIntensity=night?3.0:.45;});
    },
    quality(high) {
      glass.forEach(material=>{
        material.transmission=high?1:0;
        material.opacity=high?1:.17;
        material.transparent=!high;
        material.depthWrite=high;
        material.needsUpdate=true;
      });
    },
  };
}

function getParts(root) {
  root.updateMatrixWorld(true);
  const parts=[];
  root.traverse(node=>{if (node.isMesh) parts.push({node,matrix:node.matrixWorld.clone()});});
  return parts;
}

function instance(parts, placements, {castShadow=false, receiveShadow=true}={}) {
  const group=new THREE.Group();
  const transform=new THREE.Object3D(), matrix=new THREE.Matrix4();
  for (const {node,matrix:local} of parts) {
    const geometry=node.geometry;
    const batch=new THREE.InstancedMesh(geometry,node.material,placements.length);
    placements.forEach(([x,z,size,rotation,lift=0],i)=>{
      transform.position.set(x,groundHeight(x,z)+lift,z);
      transform.rotation.y=rotation;
      transform.scale.setScalar(size);
      transform.updateMatrix();
      batch.setMatrixAt(i,matrix.multiplyMatrices(transform.matrix,local));
    });
    batch.castShadow=castShadow;
    batch.receiveShadow=receiveShadow;
    batch.computeBoundingSphere();
    group.add(batch);
  }
  return group;
}

// Keep economical silhouettes in the full resort and use botanical assets in the two close-up areas.
export async function loadBotanicals(scene, treePositions, demoSites, rng, nearPath) {
  const close = (x,z,range) => demoSites.some(p=>Math.hypot(x-p.x,z-p.z)<range);
  const distance = (x,z) => Math.min(...demoSites.map(p=>Math.hypot(x-p.x,z-p.z)));
  const candidate=treePositions.map((p,index)=>[...p,index])
    .filter(([x,z])=>close(x,z,31) && !nearPath(x,z,2.8))
    .sort((a,b)=>distance(a[0],a[1])-distance(b[0],b[1])).slice(0,32);
  const near=new THREE.Group();
  const stream=()=>{
    let seed=Math.floor(rng()*4294967296);
    return ()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  };
  const treeRotation=[stream(),stream()];
  const fernRandom=stream(),rockRandom=stream();
  const replaced=[];
  await Promise.all([
    ...['pine-sapling','fir-sapling'].map(async (name,variant)=>{
      const {scene:asset}=await model(name);
      const size=new THREE.Box3().setFromObject(asset).getSize(new THREE.Vector3());
      const subset=candidate.filter((p,index)=>index%2===variant);
      const placements=subset.map(([x,z,s])=>[x,z,s*(variant?10.5:13)/size.y,treeRotation[variant]()*Math.PI*2]);
      near.add(instance(getParts(asset),placements,{castShadow:true}));
      replaced.push(...subset.map(p=>p[3]));
    }),
    (async()=>{
      const {scene:fern}=await model('fern');
      const points=[];
      for (const site of demoSites) {
        for (let i=0;i<160;i++) {
          const x=site.x+(fernRandom()-.5)*59,z=site.z+(fernRandom()-.5)*57;
          if (Math.hypot(x-site.x,z-site.z)<9 || nearPath(x,z,1.8) || shorelineDistance(x,z)<.6) continue;
          points.push([x,z,.65+fernRandom()*1.15,fernRandom()*Math.PI*2]);
        }
      }
      near.add(instance(getParts(fern),points));
    })(),
    (async()=>{
      const {scene:rocks}=await model('moss-rocks');
      const variants=getParts(rocks);
      const points=variants.map(()=>[]);
      for (let i=0;i<78;i++) {
        const side=i%2?1:-1, z=(rockRandom()-.5)*62;
        const angle=side*Math.acos(z/50), r=shoreRadius(angle)*(1.013+rockRandom()*.047);
        const x=Math.sin(angle)*59*r;
        points[i%variants.length].push([x,Math.cos(angle)*50*r,.14+rockRandom()*.34,rockRandom()*Math.PI*2,-.09]);
      }
      variants.forEach((part,i)=>near.add(instance([part],points[i])));
    })(),
  ]);
  scene.add(near);
  return {near,replaced};
}

export function positionWalk(candidate, sites, interior, onPier) {
  if (interior?.detailed) {
    const site=interior;
    const local=site.group.worldToLocal(candidate.clone());
    local.x=clamp(local.x,site.kind==='aframe'?-.30:-.12,site.kind==='aframe'?1.90:1.93);
    local.z=clamp(local.z,site.kind==='aframe'?-.29:-.40,site.kind==='aframe'?3.44:4.24);
    local.y=2.06;
    return site.group.localToWorld(local);
  }
  candidate.x=clamp(candidate.x,-173,173);
  candidate.z=clamp(candidate.z,-144,145);
  let floor = onPier?.87:groundHeight(candidate.x,candidate.z);
  if (!onPier && shorelineDistance(candidate.x,candidate.z)<.23) return null;
  for(const site of sites){
    if(!site.detailed)continue;
    const p=site.group.worldToLocal(candidate.clone()), d=demoModels[site.kind];
    const withinHouse=Math.abs(p.x)<d.width/2+.20 && Math.abs(p.z)<d.depth/2+.08;
    const withinSpa=Math.abs(p.x-(d.width/2+2.1))<1.50 && Math.abs(p.z+.8)<1.55;
    if(withinHouse || withinSpa)return null;
    const [width,depth]=d.terrace, edge=d.depth/2-.14+depth;
    if(Math.abs(p.x)<width/2+.04 && p.z>d.depth/2-.14 && p.z<edge)floor=.374;
    else if(Math.abs(p.x)<width*.37 && p.z>=edge && p.z<edge+.65)floor=p.z<edge+.36?.28:.16;
  }
  candidate.y=floor+1.68;
  return candidate;
}
