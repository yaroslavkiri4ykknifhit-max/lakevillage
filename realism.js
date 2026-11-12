import { Reflector } from 'three/addons/objects/Reflector.js';

export function installSurfaceMaterials(THREE, solid, renderer) {
  const loader = new THREE.TextureLoader();
  const cache = new Map();
  const texture = (file,x,y,srgb) => {
    const key = `${file}:${x}:${y}`;
    if (!cache.has(key)) {
      const map = loader.load(new URL(`./assets/textures/${file}.webp`,import.meta.url).href);
      map.wrapS=map.wrapT=THREE.RepeatWrapping;
      map.repeat.set(x,y);
      map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
      map.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;
      cache.set(key,map);
    }
    return cache.get(key);
  };
  const apply = (material,name,x=1,y=1,tint=0xffffff) => {
    material.map=texture(`${name}-color`,x,y,true);
    material.normalMap=texture(`${name}-normal`,x,y,false);
    material.roughnessMap=texture(`${name}-roughness`,x,y,false);
    material.normalScale.set(.50,.50);
    material.color.setHex(tint);
    material.needsUpdate=true;
  };
  apply(solid.ground,'forest',168,168);
  apply(solid.path,'gravel',1,1,0xd8c7ac);
  solid.sand.map=texture('sand-color',1,1,true);
  apply(solid.timber,'siding',2.4,1.6,0xe6c7a1);
  apply(solid.timberLight,'deck',2.1,2.2,0xf1d5a6);
  apply(solid.darkwood,'siding',1.7,2,0x9b8b78);
  for (const material of [solid.windows,solid.litGlass]) {
    material.roughness=.12;
    material.depthWrite=false;
    material.opacity=material===solid.litGlass?.39:.26;
  }
}

export function makeLakeWater(THREE,geometry,level) {
  const shader = {
    name:'LakeVillageWater',
    uniforms:{
      color:{value:null}, tDiffuse:{value:null}, textureMatrix:{value:null},
      time:{value:0}, night:{value:0}, reflectScene:{value:0}, sunDirection:{value:new THREE.Vector3(-.5,.6,.5)},
    },
    vertexShader:`
      uniform mat4 textureMatrix;
      varying vec4 reflectionUV;
      varying vec3 world;
      void main(){
        reflectionUV=textureMatrix*vec4(position,1.);
        world=(modelMatrix*vec4(position,1.)).xyz;
        gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);
      }`,
    fragmentShader:`
      uniform sampler2D tDiffuse;
      uniform float time,night,reflectScene;
      uniform vec3 sunDirection;
      varying vec4 reflectionUV;
      varying vec3 world;
      void main(){
        vec2 p=world.xz;
        vec2 a=vec2(.62,.27),b=vec2(.51,-1.22),c=vec2(3.68,2.51),d=vec2(5.82,-3.9);
        vec2 slope=.028*a*cos(dot(p,a)+time*.55)+.023*b*cos(dot(p,b)-time*.71)
          +.005*c*cos(dot(p,c)+time*1.19)+.0028*d*cos(dot(p,d)-time*.93);
        vec3 n=normalize(vec3(-slope.x,1.,-slope.y));
        vec3 eye=normalize(cameraPosition-world);
        float incidence=max(dot(n,eye),0.);
        float fresnel=.0204+.9796*pow(1.-incidence,5.);
        vec2 lake=p/vec2(59.,50.);
        float angle=atan(lake.x,lake.y);
        float shore=1.+.027*sin(3.*angle+.4)+.024*cos(5.*angle-1.)+.011*sin(11.*angle)+.006*cos(19.*angle+.2);
        float depth=(shore-length(lake))*54.;
        vec3 shallow=vec3(.19,.23,.123);
        shallow+=.014*sin(p.x*4.1)*sin(p.y*4.7);
        vec3 deep=vec3(.011,.066,.073);
        vec3 volume=mix(shallow,deep,1.-exp(-max(depth,0.)*.29));
        vec3 sky=mix(vec3(.34,.46,.50),vec3(.12,.18,.27),night);
        vec2 uv=clamp(reflectionUV.xy/reflectionUV.w+slope*.096,vec2(.003),vec2(.997));
        vec3 reflection=mix(sky,texture2D(tDiffuse,uv).rgb,reflectScene);
        float glint=pow(max(dot(reflect(-sunDirection,n),eye),0.),320.);
        volume*=mix(1.,.27,night);
        vec3 light=mix(vec3(1.,.85,.62),vec3(1.,.42,.19),night);
        gl_FragColor=vec4(mix(volume,reflection,fresnel)+light*glint*mix(.42,.16,night),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };
  const water = new Reflector(geometry,{shader,textureWidth:512,textureHeight:320,
    clipBias:.002,multisample:0});
  water.rotation.x=-Math.PI/2;
  water.position.y=level;
  const uniforms=water.material.uniforms;
  const reflect=water.onBeforeRender;
  water.onBeforeRender=function(...args) {
    if (uniforms.reflectScene.value && args[0].getRenderTarget()===null) reflect.apply(this,args);
  };
  return {water,uniforms};
}

// Instanced organic evergreen: irregular needle sprays instead of two plastic cones.
export function makeSpruceGeometry(THREE) {
  const vertices=[], colors=[];
  let seed=7388;
  const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
  const v=(x,y,z)=>[x,y,z];
  const shades=[[.12,.31,.18],[.17,.38,.22],[.11,.27,.17],[.22,.42,.24],[.16,.35,.20]];
  function tri(a,b,c,tone){
    for(const p of [a,b,c]){vertices.push(...p);colors.push(...tone);}
  }
  for(let tier=0;tier<13;tier++){
    const t=tier/12;
    const y=1.8+t*9.2;
    const radius=3.6*Math.pow(1.-t,.94)+.08;
    const count=8+(tier%3);
    for(let i=0;i<count;i++){
      const a=i/count*Math.PI*2+(tier%2)*.25+(rand()-.5)*.17;
      const cs=Math.cos(a),sn=Math.sin(a),tanx=-sn,tanz=cs;
      const scale=.83+rand()*.36;
      const r=radius*scale;
      const root=v(cs*.19,y+.08,sn*.19);
      const mid=v(cs*r*.50,y-.11-r*.035,sn*r*.50);
      const tip=v(cs*r,y-.33-r*.09,sn*r);
      const spread=r*(.20+.07*rand());
      const left=v(mid[0]+tanx*spread,mid[1]+.11,mid[2]+tanz*spread);
      const right=v(mid[0]-tanx*spread,mid[1]-.08,mid[2]-tanz*spread);
      const up=v(cs*r*.42,y+.29,sn*r*.42);
      const dark=shades[Math.floor(rand()*shades.length)];
      tri(root,left,up,dark);tri(up,left,tip,dark);
      tri(root,up,right,dark.map(c=>c*.77));tri(up,tip,right,dark.map(c=>c*.82));
      // Ragged tapering side sprays break the strict radial outline.
      const fleck=r*(.13+.05*rand());
      tri(left,tip,v(tip[0]+tanx*fleck,tip[1]-.13,tip[2]+tanz*fleck),dark.map(c=>c*.91));
      tri(right,tip,v(tip[0]-tanx*fleck,tip[1]+.04,tip[2]-tanz*fleck),dark);
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  g.computeVertexNormals();
  return g;
}

export function scatterUnderstory(THREE, scene, rng, avoidBuilding, groundHeight) {
  const n=window.innerWidth<760?1500:4300;
  const vertices=[-.16,0,0, .15,0,0, 0,.7,0,
                  0,0,-.16,0,0,.15,0,.64,0,
                  -.11,0,-.13,.14,0,.13,0,.56,-.01];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const mat=new THREE.MeshStandardMaterial({color:0x6e8a49,side:THREE.DoubleSide,roughness:1});
  const grass=new THREE.InstancedMesh(geo,mat,n);
  grass.frustumCulled=false;
  const o=new THREE.Object3D();let count=0,tries=0;
  while(count<n&&tries<18000){tries++;
    const x=(rng()-.5)*345,z=(rng()-.5)*295;
    if((x/63)**2+(z/54)**2<1.2||avoidBuilding(x,z,7))continue;
    if(Math.abs(x)>143&&rng()>.58)continue;
    o.position.set(x,groundHeight(x,z),z);o.scale.setScalar(.42+rng()*.9);o.rotation.set(0,rng()*6.28,0);
    o.updateMatrix();grass.setMatrixAt(count,o.matrix);
    grass.setColorAt(count,new THREE.Color().setHSL(.22+rng()*.09,.19+rng()*.16,.26+rng()*.18));
    count++;
  }
  grass.count=count;grass.instanceMatrix.needsUpdate=true;
  scene.add(grass);
  return grass;
}

export function scatterReeds(THREE,scene,rng,shoreRadius,groundHeight){
  const count=window.innerWidth<760?220:550;
  const g=new THREE.CylinderGeometry(.017,.055,1.45,3);
  const m=new THREE.MeshStandardMaterial({color:0x728456,roughness:1,side:THREE.DoubleSide});
  const reeds=new THREE.InstancedMesh(g,m,count);const o=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const a=rng()*6.283,r=shoreRadius(a);
    const cluster=Math.pow(Math.sin(a*8.+.6),2);
    const x=Math.sin(a)*59*r*(.987+(rng()-.5)*.08);
    const z=Math.cos(a)*50*r*(.987+(rng()-.5)*.08);
    o.position.set(x,Math.max(.045,groundHeight(x,z))+.35,z);
    o.rotation.set((rng()-.5)*.22,rng()*6.28,(rng()-.5)*.18);
    o.scale.setScalar(cluster<.17 ? .08 : .54+rng()*.83);o.updateMatrix();reeds.setMatrixAt(i,o.matrix);
  }
  reeds.instanceMatrix.needsUpdate=true;reeds.frustumCulled=false;
  scene.add(reeds);return reeds;
}