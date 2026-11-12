// LAKE VILLAGE — material and lighting pass.
// Entirely self-contained: CC0-style procedural texture maps are bundled locally.
// The scene remains a design interpretation, not a surveyed landscape.
export function installSurfaceMaterials(THREE, solid, renderer) {
  // Self-contained procedural PBR maps: no missing image downloads and GitHub Pages safe.
  const textureCache = new Map();
  function makeMap(name) {
    if(textureCache.has(name)) return textureCache.get(name);
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=256;
    const ctx=canvas.getContext('2d'), out=ctx.createImageData(256,256);
    let seed=37;for(let i=0;i<name.length;i++)seed=(seed*33+name.charCodeAt(i))>>>0;
    const noise=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296);
    const shades={
      'forest-floor':[76,83,55], 'forest-floor-normal':[128,128,255],
      'gravel':[154,143,125], 'aged-timber':[127,91,63],
      'slate-roof':[53,62,58], 'sand':[198,178,137]
    };
    const base=shades[name]||[115,119,103], grain=new Float32Array(256*256);
    for(let i=0;i<grain.length;i++)grain[i]=noise();
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const i=y*256+x,at=i*4, f=grain[i], wide=Math.sin(x*.12+y*.018+Math.sin(x*.025)*2)*.5+.5;
      const medium=Math.sin(x*.037+y*.061)*.5+.5;
      const strength=name==='aged-timber'?20:name==='gravel'?31:21;
      let d=(f-.5)*strength+(wide-.5)*strength*.8+(medium-.5)*8;
      if(name==='slate-roof')d+=(x%48<2?-24:0);
      if(name==='aged-timber')d+=(Math.sin(x*.31+Math.sin(y*.025)*.8))*10;
      if(name==='forest-floor-normal'){
        out.data[at]=128+(f-.5)*25;out.data[at+1]=128+(wide-.5)*25;out.data[at+2]=252;
      } else {
        out.data[at]=Math.max(0,Math.min(255,base[0]+d));
        out.data[at+1]=Math.max(0,Math.min(255,base[1]+d*.9));
        out.data[at+2]=Math.max(0,Math.min(255,base[2]+d*.8));
      }
      out.data[at+3]=255;
    }
    ctx.putImageData(out,0,0);
    const texture=new THREE.CanvasTexture(canvas);
    textureCache.set(name,texture);
    return texture;
  }
  const t = (name, repeatX, repeatY, srgb = true) => {
    const texture = makeMap(name);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const bind = (material, texture, scaleColor = 0xffffff) => {
    material.map = texture;
    material.color.setHex(scaleColor);
    material.needsUpdate = true;
  };
  bind(solid.ground, t('forest-floor', 40, 35), 0xffffff);
  solid.ground.normalMap = t('forest-floor-normal', 40, 35, false);
  solid.ground.normalScale.set(.36, .36);
  solid.ground.needsUpdate = true;
  bind(solid.meadow, t('forest-floor', 8, 8), 0xd5e8d1);
  bind(solid.path, t('gravel', 1, 1), 0xd6cbb0);
  bind(solid.sand, t('sand', .09, .09), 0xffffff);
  bind(solid.timber, t('aged-timber', 2.4, 1.6), 0xe6c7a1);
  bind(solid.timberLight, t('aged-timber', 2.1, 2.2), 0xf1d5a6);
  bind(solid.darkwood, t('aged-timber', 1.7, 2.0), 0xa89377);
  bind(solid.roof, t('slate-roof', 3.4, 1.9), 0xb2c2ba);
  solid.roof.metalness = .28;
  solid.roof.roughness = .45;
  const glass = [solid.windows, solid.litGlass];
  glass.forEach(m => {
    m.roughness = .085;
    m.metalness = .22;
    m.envMapIntensity = 1.4;
    m.opacity = .9;
    m.depthWrite = false;
    m.needsUpdate = true;
  });
  return t;
}

export function makeAtmosphere(THREE, scene, renderer) {
  const uniforms = { uNight: {value: 0}, uHaze: {value: 1} };
  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    vertexShader: `varying vec3 vDir;
      void main(){vDir=position;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}`,
    fragmentShader: `varying vec3 vDir;uniform float uNight;
      void main(){
        vec3 d=normalize(vDir);
        float alt=clamp(d.y*0.5+0.5,0.,1.);
        vec3 horizon=vec3(.78,.77,.68);
        vec3 top=vec3(.23,.40,.54);
        float blend=smoothstep(.43,.93,alt);
        vec3 day=mix(horizon,top,blend);
        day=mix(vec3(.39,.48,.46),day,smoothstep(.31,.50,alt));
        vec3 sunDir=normalize(vec3(-.53,.63,.57));
        float sun=pow(max(dot(d,sunDir),0.),850.);
        float halo=pow(max(dot(d,sunDir),0.),16.);
        day+=vec3(1.,.73,.40)*halo*.28 + vec3(1.,.93,.72)*sun*1.7;
        float cloud=sin(d.x*40.+d.z*26.)*sin(d.x*61.-d.z*43.);
        cloud*=smoothstep(.53,.77,alt)*smoothstep(.93,.72,alt);
        day+=cloud*.012;
        vec3 night=mix(vec3(.045,.09,.17),vec3(.004,.017,.043),smoothstep(.33,.9,alt));
        night+=vec3(.24,.18,.2)*pow(max(dot(d,normalize(vec3(.5,.12,.6))),0.),65.)*.16;
        gl_FragColor=vec4(mix(day,night,uNight),1.);
      }`
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(540,32,20),mat);
  mesh.renderOrder = -1000;
  mesh.frustumCulled = false;
  scene.add(mesh);
  // Reflection map built once: distant trees, sky and warm horizon.
  const c=document.createElement('canvas');c.width=1024;c.height=512;
  const ctx=c.getContext('2d');
  const grad=ctx.createLinearGradient(0,0,0,512);
  grad.addColorStop(0,'#416f95');grad.addColorStop(.27,'#7596a0');
  grad.addColorStop(.5,'#e4cfa9');grad.addColorStop(.61,'#4e6250');
  grad.addColorStop(.78,'#182f29');grad.addColorStop(1,'#10241d');
  ctx.fillStyle=grad;ctx.fillRect(0,0,1024,512);
  const tex=new THREE.CanvasTexture(c);tex.mapping=THREE.EquirectangularReflectionMapping;
  tex.colorSpace=THREE.SRGBColorSpace;
  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();tex.dispose();
  return {mesh,uniforms};
}

export function makeLakeWater(THREE) {
  const uniforms = {time:{value:0}, night:{value:0}};
  const material = new THREE.ShaderMaterial({
    uniforms, side:THREE.DoubleSide, transparent:false, depthWrite:true,
    vertexShader:`varying vec3 vWorld;varying vec2 vUV;
      void main(){vec4 pos=modelMatrix*vec4(position,1.);vWorld=pos.xyz;vUV=uv;
      gl_Position=projectionMatrix*viewMatrix*pos;}`,
    fragmentShader:`varying vec3 vWorld;varying vec2 vUV;
      uniform float time;uniform float night;
      float wave(vec2 p){
        return .24*sin(p.x*.49+p.y*.17+time*.63)
             + .13*sin(p.x*1.17-p.y*.56+time*.94)
             + .055*sin(p.x*2.94+p.y*1.69-time*1.23)
             + .07*sin(p.y*.41-time*.42);
      }
      void main(){
        vec2 p=vWorld.xz;
        float e=.12;
        float x=(wave(p+vec2(e,0.))-wave(p-vec2(e,0.)))/(2.*e);
        float z=(wave(p+vec2(0.,e))-wave(p-vec2(0.,e)))/(2.*e);
        vec3 normal=normalize(vec3(-x,1.0,-z));
        vec3 viewDir=normalize(cameraPosition-vWorld);
        float facing=clamp(dot(normal,viewDir),0.,1.);
        float fresnel=pow(1.-facing,4.);
        vec3 water=vec3(.065,.25,.27);
        vec3 deep=vec3(.035,.13,.16);
        water=mix(water,deep,clamp(.5+.48*wave(p+time*.01),0.,1.));
        vec3 sky=vec3(.57,.68,.65);
        water=mix(water,sky,clamp(fresnel*.63,.0,.75));
        vec3 sun=normalize(vec3(-.53,.63,.57));
        vec3 reflected=reflect(-sun,normal);
        float glint=pow(max(dot(reflected,viewDir),0.),210.);
        float scatter=pow(max(dot(reflected,viewDir),0.),18.);
        water+=vec3(1.,.77,.45)*(glint*.95+scatter*.09);
        float ripple=sin(p.x*4.9+p.y*2.9+time*.77)*sin(p.x*2.1-p.y*3.1-time);
        water+=vec3(.07,.13,.13)*max(ripple,0.)*.16;
        water=mix(water,water*.12+vec3(.009,.02,.034),night);
        gl_FragColor=vec4(water,1.);
      }`
  });
  return {material,uniforms};
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

export function scatterUnderstory(THREE, scene, rng, avoidBuilding) {
  const n=window.innerWidth<760?1500:4300;
  const vertices=[-.16,0,0, .15,0,0, 0,.7,0,
                  0,0,-.16,0,0,.15,0,.64,0,
                  -.11,0,-.13,.14,0,.13,0,.56,-.01];
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const mat=new THREE.MeshStandardMaterial({color:0x6e8a49,side:THREE.DoubleSide,transparent:true,opacity:.92,roughness:1,depthWrite:true});
  const grass=new THREE.InstancedMesh(geo,mat,n);
  grass.frustumCulled=false;
  const o=new THREE.Object3D();let count=0,tries=0;
  while(count<n&&tries<18000){tries++;
    const x=(rng()-.5)*345,z=(rng()-.5)*295;
    if((x/63)**2+(z/54)**2<1.2||avoidBuilding(x,z,7))continue;
    if(Math.abs(x)>143&&rng()>.58)continue;
    o.position.set(x,.03,z);o.scale.setScalar(.42+rng()*.9);o.rotation.set(0,rng()*6.28,0);
    o.updateMatrix();grass.setMatrixAt(count,o.matrix);
    grass.setColorAt(count,new THREE.Color().setHSL(.22+rng()*.09,.19+rng()*.16,.26+rng()*.18));
    count++;
  }
  grass.count=count;grass.instanceMatrix.needsUpdate=true;
  scene.add(grass);
  return grass;
}

export function scatterReeds(THREE,scene,rng,shoreRadius){
  const count=window.innerWidth<760?220:550;
  const g=new THREE.CylinderGeometry(.017,.055,1.45,3);
  const m=new THREE.MeshStandardMaterial({color:0x728456,roughness:1,side:THREE.DoubleSide});
  const reeds=new THREE.InstancedMesh(g,m,count);const o=new THREE.Object3D();
  for(let i=0;i<count;i++){
    const a=rng()*6.283,r=shoreRadius(a);
    const x=Math.sin(a)*59*r*(.987+(rng()-.5)*.08);
    const z=Math.cos(a)*50*r*(.987+(rng()-.5)*.08);
    o.position.set(x,.53,z);
    o.rotation.set((rng()-.5)*.22,rng()*6.28,(rng()-.5)*.18);
    o.scale.setScalar(.55+rng()*.83);o.updateMatrix();reeds.setMatrixAt(i,o.matrix);
  }
  reeds.instanceMatrix.needsUpdate=true;reeds.frustumCulled=false;
  scene.add(reeds);return reeds;
}