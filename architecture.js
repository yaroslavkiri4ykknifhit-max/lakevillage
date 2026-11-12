// Lake Village / Architectural detailing pass.
// All geometry is authored for this project. It references product *typology*,
// not the manufacturers' CAD files. The site is a conceptual visualization.

const PI = Math.PI;
export function createArchitecturalKit(THREE, scene, solid, random) {
  const v=(x,y,z)=>new THREE.Vector3(x,y,z);
  const material=(hex,opts={})=>new THREE.MeshStandardMaterial({color:hex,roughness:.76,...opts});
  const cedar=material(0x896949,{roughness:.85});
  const darkCedar=material(0x302f2b,{roughness:.79});
  const toastedWood=material(0x725139,{roughness:.86});
  const paleWood=material(0xc9ab7e,{roughness:.83});
  const blackMetal=material(0x222a2a,{roughness:.37,metalness:.75});
  const copper=material(0x997448,{roughness:.36,metalness:.65});
  const brass=material(0xbc9b6b,{roughness:.32,metalness:.68});
  const ivory=material(0xd8d4c3,{roughness:.92});
  const linen=material(0xbcb8a5,{roughness:.98});
  const forestOlive=material(0x415846,{roughness:.97});
  const veryDark=material(0x192324,{roughness:.7});
  const tile=material(0x847d6d,{roughness:.94});
  const foliage=material(0x42603a,{roughness:1,side:THREE.DoubleSide});
  const brassGlow=new THREE.MeshStandardMaterial({color:0xffd5a3,emissive:0xffb66c,emissiveIntensity:1.3,roughness:.24});
  const warmWindow=new THREE.MeshPhysicalMaterial({color:0xd9e5dc,roughness:.08,metalness:.08,transparent:true,opacity:.35,side:THREE.DoubleSide,depthWrite:false,envMapIntensity:1.7,clearcoat:1,clearcoatRoughness:.07});
  const shadowMeshes=[];
  const BOX=new THREE.BoxGeometry(1,1,1);
  const CYL=new THREE.CylinderGeometry(1,1,1,10);
  const SPHERE=new THREE.IcosahedronGeometry(1,1);
  const TORUS=new THREE.TorusGeometry(1,.08,6,24);
  function add(parent,geometry,mat,x=0,y=0,z=0){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=false;o.receiveShadow=true;parent.add(o);return o}
  function block(parent,w,h,d,x,y,z,mat){const o=add(parent,BOX,mat,x,y,z);o.scale.set(w,h,d);return o}
  function cyl(parent,r,h,x,y,z,mat,segments=10){const o=add(parent,CYL,mat,x,y,z);o.scale.set(r,h,r);return o}
  function line(parent,a,b,r,mat){const p=v(...a),q=v(...b),delta=q.clone().sub(p);const o=add(parent,CYL,mat,...p.clone().add(q).multiplyScalar(.5).toArray());o.scale.set(r,delta.length(),r);o.quaternion.setFromUnitVectors(v(0,1,0),delta.normalize());return o}
  function multi(parent,geometry,mat,transforms){const im=new THREE.InstancedMesh(geometry,mat,transforms.length);im.instanceMatrix.setUsage(THREE.StaticDrawUsage);const dummy=new THREE.Object3D();for(let i=0;i<transforms.length;i++){const e=transforms[i];dummy.position.set(...e.p);dummy.rotation.set(...(e.r||[0,0,0]));dummy.scale.set(...(e.s||[1,1,1]));dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix)}im.instanceMatrix.needsUpdate=true;im.castShadow=false;im.receiveShadow=true;parent.add(im);return im}
  function planks(parent,width,length,y,z,spacing=.22,mat=toastedWood){const arr=[];for(let x=-width/2+.12;x<=width/2;x+=spacing){arr.push({p:[x,y,z],s:[.012,.025,length]})}return multi(parent,BOX,mat,arr)}
  function sphere(parent,r,x,y,z,mat){const o=add(parent,SPHERE,mat,x,y,z);o.scale.setScalar(r);return o}
  function vase(parent,x,y,z,scale=.9){
    const base=cyl(parent,.27*scale,.65*scale,x,y+.33*scale,z,ivory);
    base.scale.x=.34*scale;base.scale.z=.34*scale;
    for(let i=0;i<5;i++){
      const a=i*PI*2/5, rr=.25+random()*.12;
      line(parent,[x,y+.58*scale,z],[x+Math.cos(a)*rr*scale,y+(1.03+random()*.38)*scale,z+Math.sin(a)*rr*scale],.025*scale,forestOlive);
      sphere(parent,(.17+random()*.12)*scale,x+Math.cos(a)*rr*scale,y+(.95+random()*.3)*scale,z+Math.sin(a)*rr*scale,foliage);
    }
  }
  function lantern(parent,x,y,z,s=.35){block(parent,.04*s,1.8*s,.04*s,x,y+.9*s,z,blackMetal);block(parent,.31*s,.42*s,.31*s,x,y+1.75*s,z,brassGlow);block(parent,.41*s,.09*s,.41*s,x,y+1.99*s,z,blackMetal)}
  function indoorLamp(parent,x,y,z,r=.16){
    const shade=add(parent,new THREE.CylinderGeometry(r*.55,r, r*.55,14),blackMetal,x,y,z);shade.rotation.z=.08;
    sphere(parent,r*.46,x,y-r*.21,z,brassGlow);
    line(parent,[x,y+.3,z],[x,y+2.0,z],.015,blackMetal);
  }
  function armchair(parent,x,y,z,angle=0){
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;parent.add(g);
    block(g,.82,.24,.75,0,.44,0,linen);block(g,.82,.74,.16,0,.81,-.32,linen);
    block(g,.14,.42,.75,-.42,.64,0,linen);block(g,.14,.42,.75,.42,.64,0,linen);
    for(const a of [-.31,.31])for(const b of [-.27,.27])block(g,.05,.35,.05,a,.19,b,blackMetal);
  }
  function diningTable(parent,x,y,z){
    const group=new THREE.Group();parent.add(group);group.position.set(x,y,z);
    const top=cyl(group,.84,.12,0,.78,0,paleWood);top.scale.x=1.25;top.scale.z=.85;
    cyl(group,.09,.73,0,.41,0,blackMetal);
    const chairs=[];for(const a of [-1,1])for(const b of [-1,1])chairs.push({x:a*1.08,z:b*.54});
    chairs.forEach(({x,z})=>{block(group,.48,.12,.44,x,.45,z,linen);block(group,.48,.53,.1,x,.75,z*1.1,linen);block(group,.05,.43,.05,x,.2,z,blackMetal)});
    return group;
  }
  function tub(parent,x,z,scale=1){
    const g=new THREE.Group();g.position.set(x,.13,z);g.scale.setScalar(scale);parent.add(g);
    // Round wooden bathing tub, rolled steel rim and visible water surface.
    const outer=add(g,new THREE.CylinderGeometry(2.1,2.04,1.28,32,1,true),toastedWood,0,.75,0);
    outer.castShadow=false;
    const surface=add(g,new THREE.CircleGeometry(1.98,32),new THREE.MeshStandardMaterial({color:0x496f73,metalness:.45,roughness:.12}),0,1.24,0);
    surface.rotation.x=-PI/2;
    const ring=add(g,new THREE.TorusGeometry(2.1,.075,6,48),blackMetal,0,1.39,0);ring.rotation.x=PI/2;
    const straps=[.48,1.16];for(const yy of straps){const t=add(g,new THREE.TorusGeometry(2.11,.035,5,48),blackMetal,0,yy,0);t.rotation.x=PI/2;}
    for(let i=0;i<28;i++){const a=i/28*PI*2;block(g,.09,1.29,.08,Math.cos(a)*2.08,.75,Math.sin(a)*2.08,paleWood).rotation.y=-a;}
    // Spa ladder, thin stainless handrails.
    for(const s of [-1,1])line(g,[s*.46,.20,2.52],[s*.46,1.52,2.25],.045,blackMetal);
    for(const y of [.54,.85,1.16])block(g,1.1,.08,.36,0,y,2.42,paleWood);
    return g;
  }
  function barrelSauna(parent,x,z){
    const g=new THREE.Group();g.position.set(x,1.18,z);parent.add(g);
    const barrel=add(g,new THREE.CylinderGeometry(1.8,1.8,4.0,28),toastedWood);
    barrel.rotation.x=PI/2;
    for(const zz of [-1.48,1.48]){const t=add(g,new THREE.TorusGeometry(1.82,.052,7,32),blackMetal,0,0,zz);}
    const front=add(g,new THREE.CircleGeometry(1.76,28),darkCedar,0,0,2.02);
    block(g,.90,2.30,.07,0,-.43,2.07,warmWindow);
    block(g,.07,2.36,.09,-.47,-.42,2.14,blackMetal);block(g,.07,2.36,.09,.47,-.42,2.14,blackMetal);
    for(let xx=-1.7;xx<1.8;xx+=.16){const a=Math.asin(Math.max(-1,Math.min(1,xx/1.8)));for(const side of [-1,1]){
      const yy=side*Math.sqrt(Math.max(0,1.8*1.8-xx*xx));
      if(Math.abs(yy)<.15)continue;
      block(g,.028,.023,4.04,xx,yy,0,paleWood);
    }}
    block(g,4,.18,2.4,0,-1.84,0,paleWood);
    return g;
  }
  function flowerBed(parent,x,z,scale=1){
    const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);
    const grass=material(0x52643c,{side:THREE.DoubleSide});
    for(let i=0;i<10;i++){
      const a=random()*PI*2,r=.18+random()*1.2;
      const px=Math.cos(a)*r,pz=Math.sin(a)*r;
      line(g,[px,0,pz],[px+(random()-.5)*.14,.35+random()*.7,pz],.014,grass);
      const c=random();sphere(g,.07+random()*.05,px,.5+random()*.45,pz,c<.3?ivory:c<.6?new THREE.MeshStandardMaterial({color:0xa7946d}):foliage);
    }
  }
  function cabinLandscaping(g,w,d){
    // The houses in the brief have sauna, wood-fired hot tub and a BBQ terrace.
    tub(g,-w*.86,d*.68,.75);
    barrelSauna(g,w*.83,-d*.56);
    for(let i=0;i<2;i++){flowerBed(g,(i?1:-1)*(w*.56+.8),d*.55,1.2)}
    for(let i=0;i<3;i++){
      const xx=w*.66,zz=-d*.1+i*2.2;
      const rock=sphere(g,.37+random()*.25,xx,.3,zz,tile);rock.scale.y=.46;
    }
    // A low grill and outdoor side table.
    cyl(g,.5,.19,w*.62,.9,d*.71,blackMetal);
    cyl(g,.065,.80,w*.62,.5,d*.71,blackMetal);
    block(g,.76,.08,.54,w*.59,.42,d*.87,paleWood);
    lantern(g,-w*.56,.4,d*.96,.58);
  }
  function detailAframe(g,w=10.6,d=12.3,h=11.8){
    const front=d/2;
    // Interior objects behind clear glazing; loft, kitchen, lighting and fireplace.
    block(g,w*.82,.12,d*.4,0,4.75,-d*.22,paleWood);
    for(const x of [-w*.35,w*.35]){
      line(g,[x,4.75,-d*.45],[x,4.75,-d*.05],.045,blackMetal);
      for(let i=0;i<5;i++){block(g,.04,.78,.04,x,5.14,-d*.45+i*.85,blackMetal)}
    }
    block(g,2.9,2.2,.45,-w*.2,1.5,-d*.42,veryDark);
    block(g,2.3,.74,.74,-w*.2,1.12,-d*.05,linen);
    block(g,1.9,.34,.84,w*.18,.45,-d*.38,paleWood);
    for(let yy=.35;yy<4.65;yy+=.43){block(g,2.5,.13,.74,w*.35,yy,-d*.40-yy*.09,paleWood)}
    armchair(g,-2.2,0,1.1,-.4);armchair(g,-.8,0,1.9,.36);
    diningTable(g,2.0,0,-.35);
    for(const x of [-2.6,2.5])indoorLamp(g,x,7.25,2.0,.24);
    // Heavy roof-edge fascia makes the roof read as standing seam metal, not paper.
    for(const side of [-1,1]){
      line(g,[side*w*.505,.25,front+.48],[0,h+.11,front+.48],.24,blackMetal);
      line(g,[side*w*.505,.25,-front-.28],[0,h+.11,-front-.28],.20,blackMetal);
      line(g,[side*(w*.5+.14),.36,-front-.4],[side*(w*.5+.14),.36,front+.45],.10,blackMetal);
    }
    // Panoramic facade divided in two floors with glazing gaskets.
    for(const yy of [2.76,4.99,7.16])block(g,w*.67,.07,.12,0,yy,front+.43,blackMetal);
    for(const xx of [-w*.25,0,w*.25])block(g,.07,4.4,.15,xx,2.6,front+.43,blackMetal);
    for(const xx of [-3.1,3.1])block(g,.10,1.9,.14,xx,6.18,front+.43,blackMetal);
    block(g,.04,1.05,.11,.98,2.15,front+.56,copper);
    // Side privacy deck screens; threshold and drainage gutters.
    const slats=[];for(let zz=-d/2+.4;zz<d/2-.5;zz+=.42)slats.push({p:[-w/2-.28,1.3,zz],s:[.058,2.4,.09]});
    multi(g,BOX,cedar,slats);
    block(g,1.6,.08,.42,0,.08,front+.45,blackMetal);
    cabinLandscaping(g,w,d);
  }
  function detailBarn(g,w=11.1,d=12){
    const front=d/2;
    // Vertical cedar cladding, regularly spaced with realistic dark shadow gaps.
    const battens=[];
    for(let zz=-d/2+.18;zz<d/2-.18;zz+=.28){for(const side of [-1,1])battens.push({p:[side*(w/2+.02),2.65,zz],s:[.055,5.20,.05]});}
    for(let xx=-w/2+.2;xx<w/2-.18;xx+=.27)battens.push({p:[xx,2.65,-front-.07],s:[.055,5.20,.05]});
    multi(g,BOX,darkCedar,battens);
    block(g,w,.13,.12,0,5.17,-front-.09,blackMetal);
    for(const side of [-1,1]){
      block(g,.18,.17,d+.48,side*w*.5,5.5,0,blackMetal);
      line(g,[side*w*.52,5.5,front+.48],[0,8.69,front+.48],.12,blackMetal);
      const z=-d*.19;
      block(g,.07,2.0,2.4,side*(w/2+.12),3.1,z,blackMetal);
      block(g,.08,1.83,2.1,side*(w/2+.145),3.05,z,warmWindow);
      // Timber privacy lattice near the hot tub.
      for(let zz=front-.4;zz<front+3.7;zz+=.21)block(g,.09,1.95,.065,side*(w*.56),1.6,zz,cedar);
    }
    // Interior: dining table, a lounge chair, wall panels and suspended lights.
    diningTable(g,-1.5,0,1.3);armchair(g,2.4,0,1.65,PI/4);
    block(g,2.65,1.65,.28,1.7,2.1,-d*.43,veryDark);
    block(g,2.7,.12,.65,1.7,.79,-d*.23,paleWood);
    for(let i=0;i<3;i++)indoorLamp(g,-2.7+i*2.7,5.8,1,.22);
    for(let xx=-w*.4;xx<=w*.4;xx+=.9)block(g,.042,2.9,.05,xx,3.1,-front+.10,paleWood);
    // Door handle and realistic shallow sliding rails.
    block(g,.03,1.05,.12,-1.05,2.6,front+.42,copper);
    block(g,w*.72,.085,.13,0,4.87,front+.38,blackMetal);
    for(let xx=-w*.45;xx<w*.48;xx+=2.1)block(g,.07,4.9,.12,xx,2.7,front+.42,blackMetal);
    cabinLandscaping(g,w,d);
  }
  function banquetChairs(parent,locations,y=.5){
    const seats=[],backs=[],legs=[];
    locations.forEach(([x,z,a])=>{seats.push({p:[x,y,z],r:[0,a,0],s:[.53,.13,.5]});backs.push({p:[x,y+.36,z-.24],r:[0,a,0],s:[.49,.64,.08]});for(const sx of [-.18,.18])for(const sz of [-.15,.15])legs.push({p:[x+sx,y-.26,z+sz],s:[.04,.47,.04]});});
    multi(parent,BOX,linen,seats);multi(parent,BOX,linen,backs);multi(parent,BOX,blackMetal,legs);
  }
  function detailGreenhouse(g,w=29,d=19,h=10.8){
    // Exposed triangulated steel trusses, transparent glass and a planted banquet hall.
    const front=d/2;
    const cross=[];
    for(let x=-w/2+.2;x<=w/2;x+=3.6){
      cross.push({p:[x,6.05,0],s:[.12,.13,d+.18]});
      cross.push({p:[x,1.18,front+.07],s:[.12,2.0,.18]});
    }
    multi(g,BOX,blackMetal,cross);
    for(let zz=-d/2;zz<=d/2;zz+=3.8){
      line(g,[-w/2,6.1,zz],[0,h+.1,zz],.14,blackMetal);
      line(g,[0,h+.1,zz],[w/2,6.1,zz],.14,blackMetal);
    }
    // String lights aligned with glazed ceiling and luxurious suspended chandeliers.
    for(let zz=-d*.42;zz<d*.5;zz+=d*.37){
      for(let xx=-w*.42;xx<=w*.42;xx+=1.55)sphere(g,.085,xx,6.5+(.4*Math.cos(xx*.22)),zz,brassGlow);
    }
    for(let xx=-w*.28;xx<=w*.28;xx+=w*.28){
      for(let k=0;k<3;k++){
        const r=.8+k*.32;
        const ring=add(g,new THREE.TorusGeometry(r,.045,6,30),brass,xx,5.65-k*.30,0);
        ring.rotation.x=PI/2;
        for(let j=0;j<12;j++){let a=j/12*PI*2;sphere(g,.088,xx+Math.cos(a)*r,5.52-k*.3,Math.sin(a)*r,brassGlow)}
      }
    }
    const chairs=[];
    for(const xx of [-10,-5,0,5,10]){
      const z=1.8;
      cyl(g,1.55,.15,xx,.86,z,ivory);
      cyl(g,.12,.65,xx,.46,z,brass);
      vase(g,xx,.92,z,.55);
      for(let j=0;j<7;j++){const a=j/7*2*PI;chairs.push([xx+2.06*Math.cos(a),z+2.06*Math.sin(a),a])}
    }
    banquetChairs(g,chairs);
    // Long banquet table and side flowerbeds.
    block(g,15,.19,1.5,0,.86,-5.4,ivory);
    for(let xx=-6.9;xx<7;xx+=2.2){vase(g,xx,1.05,-5.4,.38);indoorLamp(g,xx,6.15,-5.4,.10)}
    for(let i=0;i<7;i++){
      const xx=-w*.45+i*4.2;
      vase(g,xx,.5,-d*.42,1.22);
      vase(g,xx,.5,d*.44,1.02);
    }
    // Black framed glass doors at entrance.
    for(const side of [-1,1]){block(g,.07,3.85,.13,side*1.75,2.30,front+.19,blackMetal);block(g,.09,1.01,.15,side*1.51,2.2,front+.28,brass)}
    block(g,3.75,.11,.15,0,4.32,front+.2,blackMetal);
  }
  function detailRestaurant(g,w=36,d=23){
    // Double height restaurant with warm timber soffits and fully glazed lake facade.
    const front=d/2;
    for(let yy of [0.38,5.57,10.6])block(g,w+1,.28,d+1,0,yy,0,paleWood);
    const col=[];for(const xx of [-w/2+1.2,-w/2+6,0,w/2-6,w/2-1.2])for(const yy of [2.55,7.88])col.push({p:[xx,yy,front+.28],s:[.30,5.1,.24]});
    multi(g,BOX,blackMetal,col);
    for(const xx of [-12,-8,-4,0,4,8,12])for(const zz of [-4.2,3.4]){cyl(g,.88,.14,xx,.93,zz,ivory);cyl(g,.12,.76,xx,.54,zz,blackMetal)}
    for(let i=0;i<9;i++)for(const yy of [3.4,8.2])indoorLamp(g,-w*.41+i*3.5,yy+1.8,2.6,.21);
    for(const yy of [5.8,11.3]){
      block(g,w,.10,.15,0,yy,front+.55,blackMetal);
      for(let xx=-w/2;xx<w/2;xx+=2.8)block(g,.06,.85,.08,xx,yy-.44,front+.52,blackMetal);
    }
    // Entry steps, canopy, stone planters and feature signage panel.
    for(let i=0;i<4;i++)block(g,w*.48,.12,2+i*.55,0,.28-i*.06,front+6.5+i*.35,tile);
    block(g,12,.13,.5,0,4.66,front+2.3,blackMetal);
    for(let x=-w*.41;x<w*.45;x+=5.5){
      const planter=block(g,2.7,.73,1.5,x,.39,front+6.2,veryDark);
      vase(g,x,.72,front+6.2,1.7);
    }
  }
  function addLandscape({shoreRadius,isNearBuilding,positions,quality=1}){
    // Ground-level realism; instanced fern fronds, woodland stones and silver birch clusters.
    const n=quality>0.5?840:350;
    const fernGeometry=new THREE.PlaneGeometry(1,.9,1,1);
    fernGeometry.translate(0,.45,0);
    const fernMaterial=new THREE.MeshStandardMaterial({color:0x40633b,roughness:1,side:THREE.DoubleSide,transparent:true,opacity:.91,depthWrite:false});
    const placements=[], birches=[];let tries=0;
    while(placements.length<n&&tries<n*18){tries++;
      const x=(random()-.5)*333,z=(random()-.5)*280;
      if((x/70)**2+(z/60)**2<1.17||isNearBuilding(x,z,9)|| (x>33&&x<95&&z>85&&z<134))continue;
      placements.push({p:[x,.02,z],r:[0,random()*PI*2,0],s:[.7+random()*1.3,.8+random()*1.1,.8+random()*1.3]});
      if(birches.length<90&&random()<.16){birches.push([x,z,.8+random()*.65])}
    }
    const ferns=multi(scene,fernGeometry,fernMaterial,placements);
    // Birch trunks and compact foliage masses, concentrated at forest margin.
    const trunks=[], leaves=[], twigs=[];
    birches.forEach(([x,z,s],i)=>{
      let h=7.5*s+(random()-.5)*1.7;
      trunks.push({p:[x,h*.5,z],r:[(random()-.5)*.06,0,(random()-.5)*.09],s:[.16*s,h,.16*s]});
      for(let j=0;j<6;j++){const a=(j/6)*PI*2, y=h*(.64+j*.035);
        leaves.push({p:[x+Math.cos(a)*1.45*s,y,z+Math.sin(a)*1.35*s],s:[1.4*s,1.1*s,1.5*s]});
      }
      leaves.push({p:[x,h+.3,z],s:[1.4*s,1.2*s,1.4*s]});
    });
    if(trunks.length){
      const birchBark=material(0xbebdaf,{roughness:.99});
      multi(scene,CYL,birchBark,trunks);
      const canopyGeo=new THREE.IcosahedronGeometry(1,1);
      const birchMat=material(0x5b6f3f,{roughness:1});
      const canopy=multi(scene,canopyGeo,birchMat,leaves);
      leaves.forEach((e,i)=>canopy.setColorAt(i,new THREE.Color().setHSL(.22+random()*.07,.28+random()*.13,.24+random()*.17)));
      canopy.instanceColor.needsUpdate=true;
    }
    // Coarse rocks and pebbles near the fluctuating shoreline, avoiding beach seating.
    const rockGeometry=new THREE.IcosahedronGeometry(1,1);
    const pebbles=[];
    for(let i=0;i<780;i++){
      const a=random()*PI*2,rr=shoreRadius(a)*(1.07+random()*.11);
      const x=Math.sin(a)*59*rr,z=Math.cos(a)*50*rr;
      if(z>50&&x>-36&&x<34)continue;
      const r=.10+random()*.64;
      pebbles.push({p:[x,.08,z],r:[random()*PI,random()*PI,random()*PI],s:[r,r*.3,r*.67]});
    }
    multi(scene,rockGeometry,tile,pebbles);
    // Discreet warm bollards along the promenades, not hundreds of dynamic lights.
    const posts=[];for(let i=0;i<55;i++){
      const a=i/55*2*PI,r=shoreRadius(a),x=Math.sin(a)*73*r,z=Math.cos(a)*64*r;
      posts.push({p:[x,.47,z],r:[0,a,0],s:[.20,.93,.20]});
      if(i%3===0)lantern(scene,x,.33,z,.4);
    }
    multi(scene,BOX,veryDark,posts);
  }
  return {detailAframe,detailBarn,detailGreenhouse,detailRestaurant,addLandscape,
    materials:{cedar,darkCedar,warmWindow,brassGlow,paleWood},lantern};
}