import { useEffect, useRef, type MutableRefObject } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { CanvasTexture, CatmullRomCurve3, CylinderGeometry, ExtrudeGeometry, Group, LatheGeometry, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, Shape, SphereGeometry, SRGBColorSpace, Vector2, Vector3 } from 'three';
import type { PieceSymbol } from 'chess.js';
import type { Side } from '../sessions/model';
import type { DragPreview } from './useBoardDrag';

// Geometry and finishes are shared by every physical piece of the same design.
function turned(points:number[][]){const curve=new CatmullRomCurve3(points.map(([r,y])=>new Vector3(r,y,0)));return new LatheGeometry(curve.getPoints(72).map(p=>new Vector2(Math.max(.001,p.x),p.y)),48);}
const base:number[][]=[[.001,.035],[.29,.035],[.34,.065],[.345,.105],[.325,.145],[.28,.17],[.265,.195],[.28,.215],[.28,.24],[.23,.265],[.215,.285]];
const bodies={
 p:turned([...base,[.18,.33],[.13,.43],[.115,.58],[.14,.65],[.18,.675],[.19,.71],[.16,.745],[.12,.76],[.001,.76]]),
 r:turned([...base,[.2,.34],[.175,.47],[.17,.76],[.19,.89],[.23,.94],[.25,.97],[.25,1.04],[.001,1.04]]),
 n:turned([...base,[.22,.32],[.21,.39],[.24,.43],[.25,.47],[.23,.51],[.001,.51]]),
 b:turned([...base,[.21,.34],[.16,.48],[.12,.77],[.13,.98],[.2,1.035],[.235,1.06],[.235,1.105],[.17,1.13],[.12,1.16],[.001,1.16]]),
 q:turned([...base,[.215,.34],[.165,.51],[.12,.88],[.13,1.10],[.19,1.16],[.24,1.19],[.24,1.235],[.175,1.27],[.16,1.30],[.23,1.42],[.26,1.50],[.25,1.55],[.001,1.55]]),
 k:turned([...base,[.22,.34],[.165,.54],[.12,.94],[.135,1.2],[.20,1.245],[.245,1.27],[.245,1.32],[.18,1.35],[.17,1.40],[.20,1.47],[.18,1.52],[.001,1.54]])
};
const ivory=new MeshPhysicalMaterial({color:'#eddfbd',roughness:.26,metalness:.025,clearcoat:.48,clearcoatRoughness:.22});
const ebony=new MeshPhysicalMaterial({color:'#192029',roughness:.23,metalness:.12,clearcoat:.62,clearcoatRoughness:.18});
const ivoryEye=new MeshStandardMaterial({color:'#3c2e20',roughness:.4}),ebonyEye=new MeshStandardMaterial({color:'#c6ac70',roughness:.3,metalness:.55});
const collar=new CylinderGeometry(.282,.282,.018,48),felt=new CylinderGeometry(.29,.29,.015,32);
const pawnHead=new SphereGeometry(.205,32,24),finial=new SphereGeometry(.065,18,12),eye=new SphereGeometry(.019,12,10);
const horse=new Shape();horse.moveTo(-.23,.49);horse.bezierCurveTo(-.19,.68,-.31,.83,-.25,1.1);horse.bezierCurveTo(-.22,1.28,-.10,1.38,-.07,1.43);horse.lineTo(-.08,1.63);horse.lineTo(.025,1.49);horse.bezierCurveTo(.13,1.49,.20,1.43,.21,1.32);horse.lineTo(.41,1.16);horse.quadraticCurveTo(.46,1.08,.35,1.02);horse.lineTo(.14,1.065);horse.bezierCurveTo(.07,.93,.17,.78,.235,.65);horse.lineTo(.245,.5);horse.closePath();
const horseGeometry=new ExtrudeGeometry(horse,{depth:.235,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.045,bevelThickness:.045,curveSegments:18});horseGeometry.translate(0,0,-.1175);
const bishop=new Shape();bishop.moveTo(0,1.65);bishop.bezierCurveTo(-.25,1.46,-.29,1.30,-.16,1.20);bishop.quadraticCurveTo(0,1.11,.16,1.20);bishop.bezierCurveTo(.28,1.31,.2,1.48,.08,1.59);bishop.lineTo(-.015,1.37);bishop.lineTo(-.07,1.395);bishop.lineTo(.025,1.62);bishop.closePath();
const bishopGeometry=new ExtrudeGeometry(bishop,{depth:.19,bevelEnabled:true,bevelSegments:3,bevelSize:.025,bevelThickness:.035,curveSegments:20});bishopGeometry.translate(0,0,-.095);
const cross=new Shape();cross.moveTo(-.055,1.48);cross.lineTo(.055,1.48);cross.lineTo(.055,1.68);cross.lineTo(.19,1.68);cross.lineTo(.19,1.79);cross.lineTo(.055,1.79);cross.lineTo(.055,1.96);cross.lineTo(-.055,1.96);cross.lineTo(-.055,1.79);cross.lineTo(-.19,1.79);cross.lineTo(-.19,1.68);cross.lineTo(-.055,1.68);cross.closePath();
const crossGeometry=new ExtrudeGeometry(cross,{depth:.09,bevelEnabled:true,bevelSegments:3,bevelSize:.018,bevelThickness:.018});crossGeometry.translate(0,0,-.045);
const crenel=new CylinderGeometry(.09,.11,.2,4);crenel.rotateY(Math.PI/4);

export function woodTexture(dark=false){const canvas=document.createElement('canvas');canvas.width=256;canvas.height=512;const ctx=canvas.getContext('2d')!;const image=ctx.createImageData(256,512);for(let y=0;y<512;y++)for(let x=0;x<256;x++){const wave=Math.sin(x*.14+Math.sin(y*.018)*2.3+Math.sin(y*.006)*3)*.55+Math.sin(x*.54+Math.sin(y*.012)*4)*.16+Math.sin(x*1.91+y*.16)*.075;const grain=wave*(dark?14:8);const i=(y*256+x)*4;image.data[i]=(dark?86:218)+grain;image.data[i+1]=(dark?53:194)+grain*.77;image.data[i+2]=(dark?31:151)+grain*.48;image.data[i+3]=255;}ctx.putImageData(image,0,0);const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;texture.wrapS=texture.wrapT=RepeatWrapping;texture.anisotropy=4;return texture;}
let contact:CanvasTexture|undefined;
function contactTexture(){if(contact)return contact;const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d')!,gradient=ctx.createRadialGradient(32,32,7,32,32,32);gradient.addColorStop(0,'rgba(0,0,0,.42)');gradient.addColorStop(.55,'rgba(0,0,0,.20)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);return contact=new CanvasTexture(c);}

export function Staunton({type,color,square,from,reduce,events,drag}:{type:PieceSymbol;color:Side;square:string;from?:string;reduce:boolean;events:Record<string,(e:ThreeEvent<PointerEvent>)=>void>;drag:MutableRefObject<DragPreview>}){
 const coords=(s:string)=>new Vector3(s.charCodeAt(0)-100.5,0,4.5-Number(s[1]));
 const ref=useRef<Group>(null),target=coords(square),start=coords(from??square),initial=useRef(start),anim=useRef({started:performance.now(),from:start,dragging:false});const invalidate=useThree(s=>s.invalidate),material=color==='w'?ivory:ebony;
 useEffect(()=>{anim.current={started:performance.now(),from:ref.current?.position.clone()??start,dragging:false};invalidate();},[square,invalidate]);
 useFrame((_,dt)=>{const obj=ref.current!;if(drag.current.active&&drag.current.square===square){anim.current.dragging=true;if(reduce)obj.position.copy(drag.current.point);else obj.position.lerp(drag.current.point,1-Math.exp(-Math.min(dt,.04)*45));invalidate();return;}if(anim.current.dragging){anim.current={started:performance.now(),from:obj.position.clone(),dragging:false};}const t=reduce?1:Math.min(1,(performance.now()-anim.current.started)/300),ease=t*t*(3-2*t);obj.position.lerpVectors(anim.current.from,target,ease);if(t<1){obj.position.y+=Math.sin(t*Math.PI)*.13;invalidate();}});
 return <group ref={ref} position={initial.current} userData={{boardSquare:square,kind:'piece'}} {...events}>
  <mesh position={[0,.03,0]} rotation={[-Math.PI/2,0,0]} raycast={()=>{}}><planeGeometry args={[.9,.9]}/><meshBasicMaterial map={contactTexture()} transparent depthWrite={false}/></mesh>
  <mesh geometry={bodies[type]} material={material} castShadow receiveShadow/>
  <mesh geometry={felt} position={[0,.035,0]}><meshStandardMaterial color="#1d2b3a" roughness={1}/></mesh>
  <mesh geometry={collar} position={[0,.215,0]} material={material} castShadow/>
  {type==='p'&&<mesh geometry={pawnHead} position={[0,.91,0]} material={material} castShadow receiveShadow/>}
  {type==='n'&&<group rotation={[0,color==='w'?Math.PI/2:-Math.PI/2,0]}><mesh geometry={horseGeometry} material={material} castShadow receiveShadow/>{[-1,1].map(sign=><mesh key={sign} geometry={eye} position={[.13,1.365,sign*.159]} material={color==='w'?ivoryEye:ebonyEye}/>)}{Array.from({length:6},(_,i)=><mesh key={i} position={[-.24+i*.014,1.03+i*.055,0]} rotation={[0,0,-.23]} material={material} castShadow><boxGeometry args={[.085,.032,.28]}/></mesh>)}</group>}
  {type==='b'&&<group rotation={[0,-Math.PI/4,0]}><mesh geometry={bishopGeometry} material={material} castShadow receiveShadow/><mesh geometry={finial} position={[0,1.68,0]} material={material} castShadow/></group>}
  {type==='r'&&<>{Array.from({length:6},(_,i)=><mesh key={i} geometry={crenel} position={[Math.cos(i*Math.PI/3)*.2,1.15,Math.sin(i*Math.PI/3)*.2]} rotation={[0,-i*Math.PI/3,0]} material={material} castShadow receiveShadow/>)}<mesh position={[0,1.04,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.18,32]}/><meshStandardMaterial color={color==='w'?'#af9872':'#090c0f'} roughness={.6}/></mesh></>}
  {type==='q'&&<>{Array.from({length:8},(_,i)=><group key={i} position={[Math.cos(i*Math.PI/4)*.235,1.58,Math.sin(i*Math.PI/4)*.235]}><mesh material={material} castShadow><coneGeometry args={[.06,.2,16]}/></mesh><mesh geometry={finial} position={[0,.13,0]} scale={.65} material={material} castShadow/></group>)}<mesh geometry={finial} position={[0,1.77,0]} material={material} castShadow/><mesh material={material} position={[0,1.61,0]} castShadow><sphereGeometry args={[.105,24,16]}/></mesh></>}
  {type==='k'&&<mesh geometry={crossGeometry} material={material} rotation={[0,-Math.PI/4,0]} castShadow receiveShadow/>}
 </group>;
}
