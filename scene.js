import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { installSurfaceMaterials, makeAtmosphere, makeLakeWater, makeSpruceGeometry, scatterUnderstory, scatterReeds } from './realism.js';

// LAKE VILLAGE — conceptual, procedural 3D masterplan.
// All coordinates are illustrative, derived from the spatial relationships
// in the investor presentation (especially page 6), NOT engineering data.

const el = id => document.getElementById(id);
const stage = el('tour-shell'), canvas = el('lake-canvas');
const poster = el('tour-poster');
const RAD = Math.PI / 180;
const palette = {
  forest: 0x183e2e, forest2: 0x2f5940, forest3: 0x244936,
  ground: 0x355c40, meadow: 0x52744a, timber: 0x856a43,
  timberLight: 0xb79664, roof: 0x232c2a, glass: 0x9cbdaf,
  amber: 0xffc179, dock: 0x9f8359, path: 0xb6a98a,
  sand: 0xd8c59e, water: 0x174f54
};
let rngSeed = 48231;
function rnd(){rngSeed = (rngSeed*1664525 + 1013904223) >>> 0;return rngSeed/4294967296}
const V = (x,y,z) => new THREE.Vector3(x,y,z);
const M = (color,opts={}) => new THREE.MeshStandardMaterial({color,roughness:.83,metalness:0,...opts});
const solid = {
  ground:M(palette.ground), meadow:M(palette.meadow),
  timber:M(palette.timber), timberLight:M(palette.timberLight),
  roof:M(palette.roof,{roughness:.68,side:THREE.DoubleSide}), trim:M(0x1b2925),
  windows:M(palette.glass,{roughness:.17,metalness:.32,transparent:true,opacity:.77,side:THREE.DoubleSide}),
  litGlass:M(0xc7a979,{roughness:.19,metalness:.2,emissive:0xc27c39,emissiveIntensity:.38,transparent:true,opacity:.78,side:THREE.DoubleSide}),
  stone:M(0xc0b49a), sand:M(palette.sand), path:M(palette.path),
  darkwood:M(0x544a3a), gold:M(0xccad6f,{metalness:.47,roughness:.41}),
  treeBark:M(0x4a4031), darkTree:M(palette.forest),
  litTrim:M(0xffd193,{emissive:0xffbd72,emissiveIntensity:.45}),
};
const litSurfaces = [];
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x96aba4);
scene.fog = new THREE.FogExp2(0x96aba4,.0027);
const camera = new THREE.PerspectiveCamera(48, 1, .5, 700);
camera.position.set(146,139,151);
const originalCamera = V(146,139,151), originalTarget=V(0,2,0);
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 820 ? 1.2 : 1.55));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.25;
installSurfaceMaterials(THREE, solid, renderer);
renderer.shadowMap.enabled=window.innerWidth>820;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const controls = new OrbitControls(camera,canvas);
controls.enableDamping = true;
controls.dampingFactor=.065;
controls.minDistance=21;
controls.maxDistance=280;
controls.maxPolarAngle=Math.PI/2.04;
controls.minPolarAngle=.17;
controls.enablePan=true;
controls.panSpeed=.65;
controls.target.copy(originalTarget);
controls.update();
const ambient = new THREE.HemisphereLight(0xe5e6dc,0x2b4631,1.8);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffe1a8,2.65);
sun.position.set(-120,185,100);
sun.castShadow=true;
sun.shadow.mapSize.set(window.innerWidth>820?2048:1024,window.innerWidth>820?2048:1024);
sun.shadow.camera.left=-160;sun.shadow.camera.right=160;
sun.shadow.camera.top=155;sun.shadow.camera.bottom=-155;
sun.shadow.camera.near=.5;sun.shadow.camera.far=500;
sun.shadow.bias=-.00025;
sun.shadow.normalBias=.028;
scene.add(sun);
const atmosphere = makeAtmosphere(THREE, scene, renderer);

const stations=[
 {id:'entrance',name:'Въездная группа',short:'Въезд',tag:'01 / WELCOME',description:'Приватное пространство начинается с въезда: гостям открывается дорога через сосновый лес к берегу озера.',p:[39,2,132],cam:[60,13,156],target:[39,3,132]},
 {id:'parking',name:'Парковка',short:'Парковка',tag:'02 / ARRIVAL',description:'Удобная гостевая парковка рядом с въездной группой — события начинаются без лишней суеты.',p:[68,2,108],cam:[100,17,139],target:[69,1,109]},
 {id:'admin',name:'Административный корпус',short:'Ресепшн',tag:'03 / HOSPITALITY',description:'Ресепшн и административная зона — точка встречи гостей, откуда начинается знакомство с комплексом.',p:[-13,4,104],cam:[-25,12,126],target:[-13,4,104]},
 {id:'helipad',name:'Вертолётная площадка',short:'Вертолётная',tag:'04 / ARRIVAL',description:'Предусмотренная концепцией площадка для VIP-прибытия — реализация зависит от участка и согласований.',p:[-94,1,120],cam:[-119,22,140],target:[-94,1,120]},
 {id:'playground',name:'Детская площадка',short:'Детская зона',tag:'05 / FAMILY',description:'Игровое пространство в окружении сосен, чтобы маленьким гостям было интересно исследовать природу.',p:[-62,3,83],cam:[-89,15,99],target:[-62,3,83]},
 {id:'aframe',name:'Резиденции A-Frame',short:'A-Frame 56',tag:'06 / STAY',description:'Треугольные дома в лесу. Панорамное остекление, приватная терраса и тишина на левом берегу.',p:[-105,10,1],cam:[-66,16,22],target:[-105,6,1],house:true},
 {id:'barn',name:'Резиденции Barnhouse',short:'Barnhouse 56',tag:'07 / STAY',description:'Компактная современная архитектура: тёмные фасады, тёплое дерево и просторная терраса с видом на озеро.',p:[108,7,1],cam:[70,14,20],target:[108,5,1],house:true},
 {id:'pier',name:'Пирс и набережная',short:'Пирс',tag:'08 / LAKESIDE',description:'Прогулочный пирс, отражения в воде и главное место для встречи рассветов и закатов.',p:[0,3,-30],cam:[25,12,5],target:[0,2,-31]},
 {id:'greenhouse',name:'Банкетная оранжерея',short:'Оранжерея',tag:'09 / EVENTS',description:'Стеклянное пространство для церемоний, банкетов и красивых историй. Вдохновение — архитектура Forest Dew.',p:[-41,13,-103],cam:[-14,21,-65],target:[-41,7,-103]},
 {id:'restaurant',name:'Ресторанный комплекс',short:'Ресторан',tag:'10 / GASTRONOMY',description:'Панорамный ресторан и банкетный холл с видом на озеро — гастрономический центр Lake Village.',p:[47,15,-106],cam:[8,22,-66],target:[46,8,-106]},
 {id:'lake',name:'Озеро и пляж',short:'Озеро',tag:'11 / NATURE',description:'Вода — сердце всего проекта. Пляж, прогулочные дорожки и живописные берега объединяют всю территорию.',p:[0,2,58],cam:[32,17,83],target:[0,2,50]},
];
const houseRefs={};
const selectable=[];
function mesh(geometry,material,parent=scene,x=0,y=0,z=0){const obj=new THREE.Mesh(geometry,material);obj.position.set(x,y,z);parent.add(obj);return obj}
function box(parent,w,h,d,x,y,z,mat,shadow=true){const m=mesh(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);m.castShadow=shadow;m.receiveShadow=shadow;return m}
function cylinder(parent,r1,r2,h,x,y,z,mat,sides=9){const m=mesh(new THREE.CylinderGeometry(r1,r2,h,sides),mat,parent,x,y,z);m.castShadow=true;return m}
function flatShape(points,material,y=.01,parent=scene){const shape=new THREE.Shape();shape.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);shape.closePath();const obj=mesh(new THREE.ShapeGeometry(shape),material,parent,0,y,0);obj.rotation.x=-Math.PI/2;obj.receiveShadow=true;return obj}
function quad(parent,coords,mat){const g=new THREE.BufferGeometry();const vs=[...coords[0],...coords[1],...coords[2],...coords[0],...coords[2],...coords[3]];g.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,0,1,1,1,0,0,1,1,1,0],2));g.computeVertexNormals();const m=mesh(g,mat,parent);m.castShadow=true;m.receiveShadow=true;return m}
function makeRibbon(pts,width,mat,closed=false){const curve=new THREE.CatmullRomCurve3(pts.map(p=>V(p[0],p[1]??.04,p[2])),closed,'centripetal');const N=Math.max(36,pts.length*10),v=[],uv=[];for(let i=0;i<=N;i++){const t=i/N,p=curve.getPoint(t),d=curve.getTangent(t),nx=-d.z,nz=d.x;v.push(p.x+nx*width/2,p.y,p.z+nz*width/2,p.x-nx*width/2,p.y,p.z-nz*width/2);uv.push(0,i/N*pts.length*3,1,i/N*pts.length*3)}const tris=[];for(let i=0;i<N;i++){const k=i*2;tris.push(k,k+2,k+1,k+1,k+2,k+3)}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(tris);g.computeVertexNormals();const m=mesh(g,mat);m.receiveShadow=true;return m}
function path(pts,width=2.35){return makeRibbon(pts.map(p=>[p[0],.105,p[1]]),width,solid.path)}
function addBush(x,z,scale=1,mat=solid.forest2){const b=new THREE.Group();b.position.set(x,0,z);scene.add(b);for(let i=0;i<3;i++){const c=mesh(new THREE.DodecahedronGeometry((.8+rnd()*.7)*scale,0),mat,b,(rnd()-.5)*1.7*scale,1*scale+(rnd()-.5)*.2,(rnd()-.5)*1.6*scale);c.castShadow=false}}
// Flat site, softly delineated paths and a gently irregular lake.
const terrain=mesh(new THREE.PlaneGeometry(370,325),solid.ground,scene,0,-.17,0);terrain.rotation.x=-Math.PI/2;terrain.receiveShadow=true;
let waterObj;
function shoreRadius(t){return 1 + .027*Math.sin(3*t+.4)+.024*Math.cos(5*t-1)+.011*Math.sin(11*t)}
const shore=[];for(let i=0;i<=144;i++){const t=i/144*Math.PI*2,r=shoreRadius(t);shore.push([Math.sin(t)*59*r,Math.cos(t)*50*r])}
flatShape(shore,M(0x84906a,{roughness:.98}),.015); // natural bank under water
const {material:waterMat, uniforms:waterUniforms}=makeLakeWater(THREE);
waterObj=flatShape(shore,waterMat,.085);
const outer=[],inner=[];for(let i=0;i<144;i++){const a=i/144*Math.PI*2,r=shoreRadius(a);outer.push([Math.sin(a)*59*r*1.042,Math.cos(a)*50*r*1.042]);inner.push([Math.sin(a)*59*r*.984,Math.cos(a)*50*r*.984])}
const shoreVs=[],shoreIx=[];for(let i=0;i<144;i++){shoreVs.push(outer[i][0],.042,outer[i][1],inner[i][0],.043,inner[i][1]);const k=2*i,kn=2*((i+1)%144);shoreIx.push(k,k+1,kn,k+1,kn+1,kn)}
const shoreGeo=new THREE.BufferGeometry();shoreGeo.setAttribute('position',new THREE.Float32BufferAttribute(shoreVs,3));shoreGeo.setIndex(shoreIx);shoreGeo.computeVertexNormals();mesh(shoreGeo,M(0xc0b69b,{side:THREE.DoubleSide}));
// Path follows the shore approximately, with small branches to all venues.
const promenade=[];for(let i=0;i<60;i++){const a=i/60*2*Math.PI;const r=shoreRadius(a);promenade.push([Math.sin(a)*71*r,.112,Math.cos(a)*62*r]);}
makeRibbon(promenade,2.7,solid.path,true);
path([[36,135],[34,120],[11,101],[4,79],[7,64]],3.4);
path([[6,64],[-24,72],[-45,83],[-74,93],[-92,120]],2.7);
path([[6,64],[38,80],[68,106],[39,132]],3.0);
path([[-36,-69],[-39,-92],[-41,-107]],2.5);
path([[35,-70],[41,-88],[47,-109]],2.8);
path([[3,-64],[0,-52],[0,-27]],3.1);
path([[-73,48],[-88,44],[-102,20],[-106,0],[-104,-24],[-91,-64]],2.2);
path([[74,51],[91,64],[102,41],[108,0],[103,-31],[92,-62]],2.2);
// Some natural grass, flowerbeds and stones.
for(let i=0;i<130;i++){const a=rnd()*6.283,r=1.14+rnd()*.22;const x=Math.sin(a)*59*r,z=Math.cos(a)*50*r;
 const s=.35+rnd()*.7;if(rnd()>.25)addBush(x,z,s,M(rnd()>.4?0x375e36:0x4b713d));
 else {const st=mesh(new THREE.DodecahedronGeometry(.6+rnd()*.6,0),M(0x8f9989),scene,x,.15,z);st.scale.y=.55;}}
// Sand beach at southern bank, with a sweeping, inset arc.
const sandShape=new THREE.Shape();sandShape.absellipse(1,64,30,12,0,Math.PI*2,false,0);const sandPatch=mesh(new THREE.ShapeGeometry(sandShape),solid.sand,scene,1,.031,64);sandPatch.rotation.x=-Math.PI/2;
// Wooden dock at north shore. All details as actual 3D geometry.
const pier=new THREE.Group();scene.add(pier);
box(pier,4.3,.32,36,0,.7,-45,solid.timberLight);
box(pier,18,.34,7,0,.7,-29,solid.timberLight);
for(const z of [-61,-55,-49,-43,-37,-31])for(const x of [-1.8,1.8])cylinder(pier,.24,.26,1.65,x,-.04,z,solid.darkwood);
for(const x of [-8,-4,0,4,8])for(const z of [-32.3,-25.8]){cylinder(pier,.1,.13,1,x,1.2,z,solid.gold);}
for(const z of [-49,-43,-37])for(const x of [-2.4,2.4])cylinder(pier,.1,.13,.55,x,1.01,z,solid.litTrim);
// Warm lanterns on winding walkways.
for(let i=0;i<23;i++){const a=i/23*6.283,x=Math.sin(a)*71*shoreRadius(a),z=Math.cos(a)*62*shoreRadius(a);cylinder(scene,.10,.13,2.5,x,1.3,z,solid.darkwood,6);const lamp=box(scene,.48,.48,.48,x,2.65,z,solid.litTrim,false);litSurfaces.push(lamp.material);}
// Beach lounges and umbrellas.
for(let i=0;i<6;i++){const x=-20+i*8.1,z=69+Math.sin(i)*2.4;box(scene,2.7,.18,1.15,x,.3,z,solid.timberLight);box(scene,2.7,.65,.25,x,.65,z+1,solid.timberLight);cylinder(scene,.09,.12,3,x+1.8,1.8,z-1,solid.darkwood);const canopy=mesh(new THREE.ConeGeometry(1.95,.85,7),M(i%2?0xbfc7ad:0xe0d3b6),scene,x+1.8,3.6,z-1);canopy.castShadow=true;}

function orientToCenter(group,x,z){group.rotation.y=Math.atan2(-x,-z)}
function makeDeck(group,w,d,z){box(group,w,.27,d,0,.45,z,solid.timberLight);for(let x=-w/2+.6;x<w/2;x+=1.5)box(group,.07,.02,d,x,.59,z,solid.darkwood,false);for(let i=0;i<3;i++)box(group,w*.62,.12,.5,0,.32-i*.12,z+d/2+i*.36,solid.timberLight,false)}
function roofSeam(group,a,b,mat=solid.trim,thickness=.055){
 const start=V(...a),end=V(...b),mid=start.clone().add(end).multiplyScalar(.5);
 const bar=box(group,thickness,start.distanceTo(end),thickness,mid.x,mid.y,mid.z,mat,false);
 bar.quaternion.setFromUnitVectors(V(0,1,0),end.sub(start).normalize());
}
function finishTerrace(group,width,frontZ){
 // Slatted fascia, guard rail, terrace seating and subtle warm exterior lighting.
 for(const side of [-1,1]){
  for(const dz of [-1.45,1.2,3.85]){
   const x=side*(width*.48);
   box(group,.13,1.35,.13,x,1.16,frontZ+dz,solid.trim,false);
  }
  box(group,.09,.10,6.1,side*width*.48,1.82,frontZ+1.25,solid.trim,false);
 }
 for(const x of [-width*.37,width*.37]){
   const lantern=box(group,.38,.60,.30,x,1.00,frontZ+1.4,solid.litTrim,false);
   lantern.castShadow=false;
 }
 for(let i=0;i<10;i++){
   const x=-width*.45+i*width*.1;
   box(group,.05,.018,5.4,x,.61,frontZ+1.1,solid.darkwood,false);
 }
 for(const sx of [-1,1]){
   box(group,1.1,.12,1.0,sx*2.75,.67,frontZ+2.9,solid.timberLight,false);
   box(group,1.2,.66,.14,sx*2.75,1.00,frontZ+3.37,solid.timberLight,false);
 }
}
function makeFurniture(group){
 box(group,3.5,.25,2.3,-1.6,.44,-1.4,solid.darkwood);
 box(group,3.2,.52,2,-1.6,.78,-1.4,M(0xd3c2a2));
 box(group,2.0,.35,1.1,1.3,.55,1.2,M(0x536b58));
 box(group,2.6,.65,.32,1.3,1.0,.35,M(0xb5a991));
 cylinder(group,.55,.55,.18,1.2,.6,-2.3,solid.timberLight);
 box(group,1.8,1.2,.75,2.9,1.02,-4.2,solid.darkwood);
}
function makeAframe(x,z,key){
 const g=new THREE.Group();g.position.set(x,0,z);orientToCenter(g,x,z);scene.add(g);
 const w=10.6,d=12.3,h=11.8,zFront=d/2;
 makeDeck(g,12.4,5.0,zFront+2.7);
 finishTerrace(g,12.4,zFront+1.5);
 box(g,10.5,.6,12.3,0,.20,0,solid.darkwood);
 makeFurniture(g);
 const glassFace=quad(g,[[-w/2,.6,zFront],[w/2,.6,zFront],[0,h,zFront],[0,h,zFront]],solid.litGlass);glassFace.material.side=THREE.DoubleSide;
 // The triangle consists of two right triangles with glass and warm framing.
 quad(g,[[-w/2,.6,zFront],[0,h,zFront],[0,.6,zFront],[-w/2,.6,zFront]],solid.litGlass);
 quad(g,[[0,.6,zFront],[0,h,zFront],[w/2,.6,zFront],[w/2,.6,zFront]],solid.litGlass);
 box(g,w,.33,d,0,.16,0,solid.darkwood);
 // Two large roof slabs converge into a ridge, A-Frame silhouette.
 quad(g,[[-w/2,.28,-d/2],[-w/2,.28,d/2],[0,h,d/2],[0,h,-d/2]],solid.roof);
 quad(g,[[0,h,-d/2],[0,h,d/2],[w/2,.28,d/2],[w/2,.28,-d/2]],solid.roof);
 // Exposed timber beams along front edges.
 function beam(a,b,thick=.45,mat=solid.timberLight){const mid=V(...a).add(V(...b)).multiplyScalar(.5);const len=V(...a).distanceTo(V(...b));const m=box(g,thick,len,thick,mid.x,mid.y,mid.z,mat);m.quaternion.setFromUnitVectors(V(0,1,0),V(...b).sub(V(...a)).normalize());return m}
 beam([-w/2,.25,zFront+.08],[0,h,zFront+.08]);beam([w/2,.25,zFront+.08],[0,h,zFront+.08]);
 beam([-w/2,.25,-zFront],[0,h,-zFront]);beam([w/2,.25,-zFront],[0,h,-zFront]);
 for(let zz=-d/2+1.1;zz<d/2;zz+=1.85){
  roofSeam(g,[-w/2-.02,.39,zz],[0,h+.09,zz]);
  roofSeam(g,[w/2+.02,.39,zz],[0,h+.09,zz]);
 }
 for(const xx of [-2.3,0,2.3])box(g,.14,4.7,.16,xx,3.0,zFront+.18,solid.trim);
 box(g,w-.65,.18,.16,0,4.3,zFront+.2,solid.trim);
 box(g,1.5,.1,.16,0,8.3,zFront+.25,solid.trim);
 const door=box(g,1.85,3.7,.08,0,2.28,zFront+.30,solid.windows,false);
 box(g,.13,3.9,.14,-1.1,2.32,zFront+.34,solid.trim);
 box(g,.13,3.9,.14,1.1,2.32,zFront+.34,solid.trim);
 for(let xx of [-4.2,4.2]){box(g,.21,1.2,.2,xx,1.1,zFront+4.6,solid.timberLight);}
 if(key)houseRefs[key]={group:g,kind:'aframe',floor:V(0,2.6,1),forward:V(0,2.5,7)};
 selectable.push(g);return g;
}
function makeBarn(x,z,key){
 const g=new THREE.Group();g.position.set(x,0,z);orientToCenter(g,x,z);scene.add(g);
 const w=11.1,d=12,h=7.7;
 box(g,w,5.2,d,0,2.6,0,solid.timber);
 makeDeck(g,12.3,4.6,d/2+2.45);
 finishTerrace(g,12.3,d/2+1.2);
 box(g,w,.32,d,0,.15,0,solid.darkwood);
 makeFurniture(g);
 // glazed wall facade. dark standing seams and glass.
 box(g,w-.85,4.05,.13,0,2.9,d/2+.1,solid.litGlass,false);
 for(let xx of [-4.5,-2.3,0,2.3,4.5])box(g,.14,4.0,.23,xx,2.9,d/2+.24,solid.trim,false);
 box(g,w,.18,.25,0,4.65,d/2+.2,solid.trim);
 // pitched roof from eaves at 5.6 to ridge at 8.6
 quad(g,[[-w/2-.5,5.5,-d/2-.4],[-w/2-.5,5.5,d/2+.4],[0,8.65,d/2+.4],[0,8.65,-d/2-.4]],solid.roof);
 quad(g,[[0,8.65,-d/2-.4],[0,8.65,d/2+.4],[w/2+.5,5.5,d/2+.4],[w/2+.5,5.5,-d/2-.4]],solid.roof);
 quad(g,[[-w/2,5.1,d/2],[0,8.4,d/2],[w/2,5.1,d/2],[0,5.1,d/2]],solid.litGlass);
 for(let zz=-d/2+1.0;zz<d/2+.5;zz+=1.9){
  roofSeam(g,[-w/2-.5,5.6,zz],[0,8.75,zz]);
  roofSeam(g,[w/2+.5,5.6,zz],[0,8.75,zz]);
 }
 // Vertical cedar cladding and believable black window gaskets.
 for(let xx=-w/2+.25;xx<w/2-.2;xx+=.72){
  box(g,.055,4.75,.06,xx,2.63,-d/2-.055,solid.darkwood,false);
 }
 box(g,.18,5.0,.2,-1.45,2.7,d/2+.26,solid.trim);
 for(let i=0;i<6;i++){box(g,.12,5.15,.10,-w/2+.5+i*1.7,2.7,-d/2-.01,solid.darkwood,false)}
 if(key)houseRefs[key]={group:g,kind:'barn',floor:V(0,2.55,1),forward:V(0,2.5,7)};
 selectable.push(g);return g;
}
function makeGlassHall(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=-.05;scene.add(g);
 const w=29,d=19,h=10.8;
 box(g,w,.6,d,0,.3,0,solid.timberLight);
 box(g,w,6.0,d,0,3.3,0,solid.litGlass,false);
 for(let xx=-w/2;xx<=w/2;xx+=3.6){box(g,.20,6.1,.24,xx,3.4,d/2,solid.trim);box(g,.18,6.1,.24,xx,3.4,-d/2,solid.trim)}
 for(let zz=-d/2;zz<=d/2;zz+=3.8){box(g,.24,6.2,.19,-w/2,3.4,zz,solid.trim);box(g,.24,6.2,.19,w/2,3.4,zz,solid.trim)}
 quad(g,[[-w/2,6.1,-d/2],[-w/2,6.1,d/2],[0,h,d/2],[0,h,-d/2]],solid.windows);
 quad(g,[[0,h,-d/2],[0,h,d/2],[w/2,6.1,d/2],[w/2,6.1,-d/2]],solid.windows);
 for(let xx=-w/2+1;xx<=w/2;xx+=3.6){box(g,.18,.2,d+.25,xx,6.25,0,solid.trim,false)}
 const lineGeo=[[-w/2,6.1,d/2],[0,h,d/2],[w/2,6.1,d/2]];
 function beam(a,b,width=.26){const pa=V(...a),pb=V(...b),mid=pa.clone().add(pb).multiplyScalar(.5),len=pa.distanceTo(pb);const o=box(g,width,len,width,mid.x,mid.y,mid.z,solid.trim);o.quaternion.setFromUnitVectors(V(0,1,0),pb.sub(pa).normalize())}
 for(let zz=-d/2;zz<=d/2;zz+=3.8){beam([-w/2,6.1,zz],[0,h,zz]);beam([0,h,zz],[w/2,6.1,zz])}
 box(g,w+7,.35,5,0,.40,d/2+2.8,solid.timberLight);
 for(let xx=-10;xx<=10;xx+=5){const t=cylinder(g,1.35,1.35,.15,xx,.95,1.5,solid.timberLight,16);cylinder(g,.2,.2,.64,xx,.62,1.5,solid.darkwood);for(let j=0;j<5;j++){const a=j/5*Math.PI*2;cylinder(g,.36,.35,.6,xx+2.4*Math.sin(a),.68,1.5+2.4*Math.cos(a),M(0x4b5741),7)}}
 return g;
}
function makeRestaurant(x,z){
 const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=.05;scene.add(g);
 const w=36,d=23;
 box(g,w,11,d,0,5.5,0,solid.timber);
 box(g,w+4,.43,6.5,0,.38,d/2+3.5,solid.timberLight);
 for(const yy of [3.3,7.8]){box(g,w-.8,3.0,.2,0,yy,d/2+.12,solid.litGlass,false);box(g,.2,3,d-.8,-w/2-.13,yy,0,solid.litGlass,false);for(let xx=-w/2+2;xx<w/2;xx+=4.1)box(g,.22,3.25,.22,xx,yy,d/2+.3,solid.darkwood);box(g,w,.20,.3,0,yy-1.6,d/2+.23,solid.darkwood)}
 box(g,w+3,.7,d+2,0,11.1,0,solid.trim);
 quad(g,[[-w/2-1,11.2,-d/2-1],[-w/2-1,11.2,d/2+1],[0,16.2,d/2+1],[0,16.2,-d/2-1]],solid.roof);
 quad(g,[[0,16.2,-d/2-1],[0,16.2,d/2+1],[w/2+1,11.2,d/2+1],[w/2+1,11.2,-d/2-1]],solid.roof);
 for(let xx=-15;xx<=15;xx+=4){box(g,.25,4.0,.2,xx,6.5,d/2+.15,solid.trim,false)}
 for(let xx=-16;xx<=16;xx+=4)cylinder(g,.1,.12,2.1,xx,1.3,d/2+6.5,solid.darkwood);
 return g;
}
function makeAdmin(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(g,23,6.3,12,0,3.15,0,solid.timber);box(g,24,1.1,13,0,6.6,0,solid.roof);box(g,21,3.7,.16,0,3.0,6.05,solid.litGlass,false);for(let xx=-10;xx<=10;xx+=3.6)box(g,.16,4.2,.2,xx,3,6.1,solid.trim);box(g,25,.4,3.7,0,.4,8.0,solid.timberLight);return g}
function makeGate(x,z){const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);box(g,17,.9,7,0,7,0,solid.roof);for(const xx of [-8,8])for(const zz of [-3,3])box(g,.55,6.8,.5,xx,3.4,zz,solid.darkwood);box(g,6,4.1,5,-4,2,0,solid.timber);box(g,3,2.8,.17,-4,2,2.55,solid.litGlass);box(g,8,.1,1,4,3,0,solid.gold);return g}
function makeHelipad(x,z){const circle=mesh(new THREE.CylinderGeometry(16,16,.3,64),M(0x58605c,{roughness:.99}),scene,x,.01,z);circle.receiveShadow=true;const ring=mesh(new THREE.RingGeometry(14.5,15.4,64),solid.gold,scene,x,.2,z);ring.rotation.x=-Math.PI/2;box(scene,1.6,.06,11,x,.2,z,M(0xf3f0df),false);box(scene,7.1,.06,1.5,x,.2,z,M(0xf3f0df),false);return circle}
function makeCar(x,z,rot=0,color=0x5b6662){const g=new THREE.Group();g.position.set(x,.18,z);g.rotation.y=rot;scene.add(g);box(g,2.3,.8,4.7,0,.57,0,M(color));box(g,1.9,.73,2.7,0,1.23,-.3,M(0x2a3a40,{metalness:.5}));for(let xx of [-1,1])for(let zz of [-1.5,1.5]){const wheel=mesh(new THREE.CylinderGeometry(.51,.51,.25,12),solid.roof,g,xx,.44,zz);wheel.rotation.z=Math.PI/2;}return g}
function makeParking(){box(scene,54,.065,31,70,.01,108,M(0x515959,{roughness:.96}),false);for(let i=0;i<9;i++)for(const zz of [98,118])box(scene,.1,.07,8,45+i*5.65,.06,zz,M(0xe2e0cd),false);const colors=[0x2a3835,0x8b8d7f,0x9eaa9d,0x565c57,0xc5bba4,0x343b43];for(let i=0;i<8;i++){const x=47+i*5.6;makeCar(x,i%2?116:101,0,colors[i%colors.length]);}}
function makePlayground(){const x=-62,z=83;const sand=mesh(new THREE.CylinderGeometry(16,16,.06,40),M(0xbca77b),scene,x,.05,z);sand.scale.z=.8;for(let i=0;i<3;i++){const px=x-9+i*7;const g=new THREE.Group();g.position.set(px,0,z+2);scene.add(g);for(let k of [-1,1]){const side=box(g,.35,8,.35,k*1.7,3.8,0,solid.timberLight);side.rotation.z=k*.35}box(g,5,.38,.38,0,7.45,0,solid.timberLight);box(g,1.7,.24,1.5,0,3.1,0,solid.timberLight);for(let s of [-.7,.7])box(g,.1,4.1,.1,s,5.2,0,solid.darkwood);}}
makeHelipad(-94,120);makeParking();makePlayground();makeAdmin(-13,104);makeGate(39,134);
for(let i=0;i<7;i++){const z=-62+i*20.6;const x=-91-16*Math.sin((i+.4)/7*Math.PI);const gh=makeAframe(x,z,i===3?'aframe':undefined);if(i===3){stations.find(s=>s.id==='aframe').p=[x,13,z];stations.find(s=>s.id==='aframe').target=[x,7,z];}}
for(let i=0;i<7;i++){const z=-61+i*20.8;const x=91+17*Math.sin((i+.45)/7*Math.PI);makeBarn(x,z,i===3?'barn':undefined);if(i===3){stations.find(s=>s.id==='barn').p=[x,9,z];stations.find(s=>s.id==='barn').target=[x,5,z];}}
makeGlassHall(-41,-104);makeRestaurant(45,-105);
// Path connections, trees and coastal shrubbery.
function isNearBuilding(x,z,buffer=10){const spots=[[-41,-104,27],[45,-105,29],[-13,104,17],[39,134,15],[68,108,30],[-94,120,20],[-62,83,20]];for(let i=0;i<7;i++){const zz=-62+i*20.6;spots.push([-91-16*Math.sin((i+.4)/7*Math.PI),zz,buffer]);const z2=-61+i*20.8;spots.push([91+17*Math.sin((i+.45)/7*Math.PI),z2,buffer])}return spots.some(p=>(x-p[0])**2+(z-p[1])**2<p[2]*p[2]);}
const treePositions=[];
for(let attempts=0;attempts<3500&&treePositions.length<760;attempts++){
 const x=(rnd()-.5)*340,z=(rnd()-.5)*298;
 const ell=(x/68)**2+(z/57)**2;
 if(ell<1 ||isNearBuilding(x,z,13))continue;
 const outer=Math.abs(x)>91||Math.abs(z)>102;
 if(!outer&&rnd()>.18)continue;
 if(x>24&&x<87&&z>83&&z<145)continue;
 treePositions.push([x,z,.67+rnd()*.8]);
}
const trunkGeo=new THREE.CylinderGeometry(.2,.34,2.6,5);
const spruceGeo=makeSpruceGeometry(THREE);
const spruceMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.94,side:THREE.DoubleSide,flatShading:true});
const trunks=new THREE.InstancedMesh(trunkGeo,solid.treeBark,treePositions.length);
const spruces=new THREE.InstancedMesh(spruceGeo,spruceMat,treePositions.length);
const object=new THREE.Object3D();
treePositions.forEach(([x,z,scale],idx)=>{
 object.position.set(x,1.3*scale,z);object.scale.set(scale,scale,scale);object.rotation.set(0,rnd()*6.283,0);
 object.updateMatrix();trunks.setMatrixAt(idx,object.matrix);
 object.position.y=0;object.updateMatrix();spruces.setMatrixAt(idx,object.matrix);
 const tint=new THREE.Color().setRGB(.75+rnd()*.37,.82+rnd()*.29,.76+rnd()*.24);
 spruces.setColorAt(idx,tint);
});
trunks.instanceMatrix.needsUpdate=true;spruces.instanceMatrix.needsUpdate=true;
spruces.castShadow=window.innerWidth>820;spruces.receiveShadow=false;
scene.add(trunks,spruces);
scatterUnderstory(THREE,scene,rnd,isNearBuilding);
scatterReeds(THREE,scene,rnd,shoreRadius);
// Natural scatter of boulders, meadow flowers and low-growing shrubs.
for(let i=0;i<170;i++){const x=(rnd()-.5)*260,z=(rnd()-.5)*245;if((x/62)**2+(z/54)**2<1.08||isNearBuilding(x,z,7))continue;const size=.35+rnd()*.62;const stone=mesh(new THREE.IcosahedronGeometry(size,0),rnd()>.4?M(0x888d79):M(0x6d806b),scene,x,.17,z);stone.scale.y=.45;}
// Two gentle circular water rings as subtle wave hints.
const ripples=[];for(let i=0;i<3;i++){const r=10+i*11;const ring=mesh(new THREE.RingGeometry(r,r+.08,96),new THREE.MeshBasicMaterial({color:0xc4d4c1,transparent:true,opacity:.17,side:THREE.DoubleSide}),scene,8,.114,-5);ring.rotation.x=-Math.PI/2;ripples.push(ring)}

// Location controls, 3D markers and travel animations.
const markers=[];let current='overview',mode='orbit',night=false,inside=false;
let travel=null, walkYaw=0,walkPitch=0,dragging=false,dragStart=null;
let tourActive=false,tourIndex=0,tourPauseUntil=0;
const autoRoute=['entrance','lake','aframe','barn','pier','greenhouse','restaurant'];
function stopAuto(){tourActive=false;el('auto-tour').innerHTML='▷ <span>Автотур</span>';}
const pressed=new Set();
const buttons=new Map();
const stationWrap=el('tour-places'),markerWrap=el('tour-markers');
stations.forEach((s,i)=>{
 const b=document.createElement('button');b.className='tour-place';b.innerHTML=`<span class="no">${String(i+1).padStart(2,'0')}</span><span class="name">${s.short}</span>`;b.type='button';b.setAttribute('aria-label',s.name);b.addEventListener('click',()=>focus(s.id));stationWrap.append(b);buttons.set(s.id,b);
 const pin=document.createElement('button');pin.type='button';pin.className='tour-pin';pin.textContent=String(i+1);pin.title=s.name;pin.setAttribute('aria-label',s.name);pin.addEventListener('click',()=>focus(s.id));markerWrap.append(pin);markers.push({s,el:pin});
});
function setLocation(s){
 el('location-index').textContent=s?s.tag:'ОБЗОР / 00';
 el('location-title').textContent=s?s.name:'Весь мир вокруг озера';
 el('location-description').textContent=s?s.description:'Вращайте камеру, приближайтесь к домам или выберите интересующее пространство из списка.';
 el('enter-house').hidden=!(s&&s.house);
 el('enter-house').textContent='Зайти внутрь ↗';
 buttons.forEach((b,id)=>b.classList.toggle('active',s?.id===id));
 markers.forEach(m=>m.el.classList.toggle('selected',m.s.id===s?.id));
}
function beginTravel(position,target,duration=1.45){
 travel={start:performance.now(),duration:duration*1000,fromPos:camera.position.clone(),fromTarget:controls.target.clone(),toPos:V(...position),toTarget:V(...target)};
 controls.enabled=false;
}
function focus(id,close=false,fromAuto=false){
 if(!fromAuto)stopAuto();
 const s=stations.find(x=>x.id===id);if(!s)return;
 if(mode==='plan')setMode('orbit');
 inside=false;current=id;setLocation(s);
 if(mode==='walk'){
   const point=V(...s.cam);
   camera.position.set(point.x,2.75,point.z);
   camera.lookAt(V(...s.target));syncWalkLook();
 }else{
   const to=close?V(...s.cam).lerp(V(...s.target),.48):V(...s.cam);
   beginTravel(to.toArray(),s.target,1.6);
 }
}
function resetView(){stopAuto();inside=false;current='overview';setLocation(null);if(mode==='plan')setMode('orbit');if(mode==='walk')setMode('orbit');beginTravel(originalCamera.toArray(),originalTarget.toArray(),1.55)}
function syncWalkLook(){const e=new THREE.Euler().setFromQuaternion(camera.quaternion,'YXZ');walkYaw=e.y;walkPitch=e.x;controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()));}
function setMode(m){if(m!=='orbit')stopAuto();if(m==='plan'){
  mode='plan';stage.classList.add('is-plan');controls.enabled=false;
 }else{
  stage.classList.remove('is-plan');mode=m;
  if(m==='walk'){
    travel=null;controls.enabled=false;inside=false;
    if(current==='overview')camera.position.set(31,2.8,124);
    else{const s=stations.find(x=>x.id===current);const v=V(...s.cam);camera.position.set(v.x,2.8,v.z)}
    camera.lookAt(current==='overview'?V(0,4,38):V(...stations.find(x=>x.id===current).target));syncWalkLook();
  }else{
    controls.enabled=true;inside=false;
    if(camera.position.y<5){camera.position.y=34;controls.target.set(0,0,0);}
    controls.update();
  }
 }
 for(const [key,buttonId] of [['orbit','orbit-mode'],['walk','walk-mode'],['plan','plan-mode']])el(buttonId).classList.toggle('active',key===m);
 el('tour-hint').textContent=m==='walk'?'W A S D: ИДТИ · МЫШЬ: СМОТРЕТЬ':m==='plan'?'ГЕНЕРАЛЬНЫЙ ПЛАН КОМПЛЕКСА':'МЫШЬ: ВРАЩАТЬ · КОЛЁСИКО: ПРИБЛИЗИТЬ';
 el('walk-nav').hidden=m!=='walk';
}
function enterHouse(){const s=stations.find(x=>x.id===current);if(!s?.house)return;const h=houseRefs[s.id];if(!h)return;
 if(inside){inside=false;focus(s.id);return;}
 setMode('walk');inside=true;
 const position=h.group.localToWorld(h.floor.clone());const look=h.group.localToWorld(h.forward.clone());
 camera.position.copy(position);camera.lookAt(look);syncWalkLook();
 el('enter-house').textContent='Выйти наружу ↗';
 el('location-description').textContent='Вы внутри демонстрационной 3D-модели дома. Осмотритесь мышью и используйте WASD для перемещения. Планировка условная.';
}
el('focus-view').addEventListener('click',()=>current==='overview'?focus('lake'):focus(current,true));
el('auto-tour').addEventListener('click',()=>{
 if(tourActive){stopAuto();return;}
 if(mode!=='orbit')setMode('orbit');
 tourActive=true;tourIndex=0;tourPauseUntil=0;el('auto-tour').innerHTML='Ⅱ <span>Остановить</span>';
 focus(autoRoute[tourIndex++],false,true);
});
el('enter-house').addEventListener('click',enterHouse);
el('reset-view').addEventListener('click',resetView);
el('orbit-mode').addEventListener('click',()=>setMode('orbit'));
el('walk-mode').addEventListener('click',()=>setMode('walk'));
el('plan-mode').addEventListener('click',()=>setMode('plan'));
let cinemaQuality=window.innerWidth>820;
const qualityButton=el('quality-toggle');
function applyQuality(){
 renderer.shadowMap.enabled=cinemaQuality && window.innerWidth>700;
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,cinemaQuality?1.65:1.0));
 qualityButton.innerHTML=cinemaQuality?'✦ <span>Кино</span>':'⚡ <span>Быстро</span>';
 qualityButton.setAttribute('aria-pressed',String(cinemaQuality));
 resize();
}
qualityButton.addEventListener('click',()=>{cinemaQuality=!cinemaQuality;applyQuality();});
applyQuality();
el('light-toggle').addEventListener('click',()=>{
 night=!night;
 sun.intensity=night?.25:2.65;ambient.intensity=night?.82:1.8;
 sun.color.setHex(night?0xb3c6d4:0xffe1a8);
 scene.background=new THREE.Color(night?0x0a1923:0x96aba4);
 scene.fog.color.setHex(night?0x0a1923:0x96aba4);
 renderer.toneMappingExposure=night?.98:1.25;
 atmosphere.uniforms.uNight.value=night?1:0;
 waterUniforms.night.value=night?1:0;
 solid.litGlass.emissiveIntensity=night?1.15:.38;
 solid.litTrim.emissiveIntensity=night?2.4:.45;
 el('light-toggle').innerHTML=night?'☀ <span>День</span>':'☾ <span>Вечер</span>';
});
const planLayer=document.createElement('div');planLayer.className='tour-plan-layer';planLayer.innerHTML='<img src="assets/slide-6.webp" alt="Генеральный план комплекса с нумерацией объектов" /><span>ГЕНЕРАЛЬНЫЙ ПЛАН · ПЕРЕКЛЮЧИТЕСЬ НА «ОБЛЁТ» ДЛЯ 3D</span>';stage.appendChild(planLayer);
const walkNav=document.createElement('div');walkNav.id='walk-nav';walkNav.className='walk-nav';walkNav.hidden=true;walkNav.innerHTML='<button data-move="KeyW" aria-label="Вперёд">↑</button><div><button data-move="KeyA" aria-label="Влево">←</button><button data-move="KeyS" aria-label="Назад">↓</button><button data-move="KeyD" aria-label="Вправо">→</button></div>';
stage.append(walkNav);
walkNav.querySelectorAll('button').forEach(b=>{
 b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pressed.add(b.dataset.move)});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>pressed.delete(b.dataset.move));
});
const style=document.createElement('style');style.textContent=`
.tour-shell.is-plan .tour-canvas-wrap,.tour-shell.is-plan .tour-sidebar,.tour-shell.is-plan .tour-location,.tour-shell.is-plan .tour-mobile-advice{display:none}
.tour-plan-layer{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;background:#061a12;z-index:2;gap:12px;padding:75px 25px 90px}
.tour-plan-layer img{max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 10px 40px #0009}.tour-plan-layer span{font-size:10px;letter-spacing:.1em;color:#cab98d}
.tour-shell.is-plan .tour-plan-layer{display:flex}.tour-shell.is-plan .tour-topbar,.tour-shell.is-plan .tour-bottom{z-index:6}
.walk-nav{position:absolute;z-index:8;left:50%;transform:translateX(-50%);bottom:155px;pointer-events:auto;display:none;flex-direction:column;align-items:center;gap:2px}
.walk-nav button{width:40px;height:39px;background:#09291dd9;border:1px solid #d0bc9299;color:#f9edd2;font-size:20px;touch-action:none}
.walk-nav>div{display:flex;gap:3px}.walk-nav[hidden]{display:none!important}
@media(max-width:800px){.walk-nav:not([hidden]){display:flex}.tour-shell.is-plan .tour-plan-layer{padding:72px 8px 85px}.tour-plan-layer img{width:100%}}
`;document.head.appendChild(style);
canvas.addEventListener('pointerdown',e=>{if(mode!=='walk')return;dragging=true;dragStart=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointerup',()=>{dragging=false});
canvas.addEventListener('pointercancel',()=>{dragging=false});
canvas.addEventListener('pointermove',e=>{if(mode!=='walk'||!dragging)return;const dx=e.clientX-dragStart[0],dy=e.clientY-dragStart[1];dragStart=[e.clientX,e.clientY];walkYaw-=dx*.0045;walkPitch=Math.max(-1.4,Math.min(1.4,walkPitch-dy*.0042));camera.quaternion.setFromEuler(new THREE.Euler(walkPitch,walkYaw,0,'YXZ'))});
window.addEventListener('keydown',e=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code) && mode==='walk'){pressed.add(e.code);e.preventDefault();}});
window.addEventListener('keyup',e=>pressed.delete(e.code));window.addEventListener('blur',()=>pressed.clear());
let isVisible=true;
const observer=new IntersectionObserver(entries=>{isVisible=entries[0]?.isIntersecting??true},{rootMargin:'300px'});observer.observe(stage);
const clock=new THREE.Clock();
function updatePins(){if(mode==='plan')return;const w=stage.clientWidth,h=stage.clientHeight;
 for(const p of markers){const point=V(...p.s.p);point.y+=2;point.project(camera);const visible=point.z>-1 && point.z<1 && Math.abs(point.x)<.92 && Math.abs(point.y)<.92;
 p.el.style.display=visible?'flex':'none';p.el.style.left=((point.x*.5+.5)*w)+'px';p.el.style.top=((-point.y*.5+.5)*h)+'px';}
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(.05,clock.getDelta());
 if(!isVisible||document.hidden)return;
 if(mode==='walk'){
  const f=(pressed.has('KeyW')||pressed.has('ArrowUp')?1:0)-(pressed.has('KeyS')||pressed.has('ArrowDown')?1:0);
  const side=(pressed.has('KeyD')||pressed.has('ArrowRight')?1:0)-(pressed.has('KeyA')||pressed.has('ArrowLeft')?1:0);
  if(f||side){const speed=inside?5.5:15.5;const dir=V(-Math.sin(walkYaw),0,-Math.cos(walkYaw)),right=V(Math.cos(walkYaw),0,-Math.sin(walkYaw));camera.position.addScaledVector(dir,f*dt*speed);camera.position.addScaledVector(right,side*dt*speed);camera.position.x=THREE.MathUtils.clamp(camera.position.x,-173,173);camera.position.z=THREE.MathUtils.clamp(camera.position.z,-144,145);camera.position.y=inside?2.55:2.8;}
 }else if(travel){const t=Math.min(1,(performance.now()-travel.start)/travel.duration),e=t*t*(3-2*t);camera.position.copy(travel.fromPos).lerp(travel.toPos,e);controls.target.copy(travel.fromTarget).lerp(travel.toTarget,e);camera.lookAt(controls.target);if(t>=1){travel=null;controls.enabled=true;if(tourActive)tourPauseUntil=performance.now()+1650;}}
 else if(mode==='orbit'){controls.update()}
 if(tourActive&&!travel&&performance.now()>tourPauseUntil){
   if(tourIndex<autoRoute.length)focus(autoRoute[tourIndex++],false,true);
   else resetView();
 }
 const t=performance.now()*.0004;
 waterUniforms.time.value=performance.now()*.001;
 for(let i=0;i<ripples.length;i++)ripples[i].material.opacity=.10+.09*Math.sin(t+i*2.2);
 renderer.render(scene,camera);
 updatePins();
}
function resize(){const width=stage.clientWidth,height=stage.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()}
new ResizeObserver(resize).observe(stage);resize();
setLocation(null);
poster.classList.add('is-ready');window.LakeVillageTour={focus,resetView,setMode};
window.lakeSceneReady=true;
animate();