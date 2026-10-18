import { useEffect, useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { woodTexture } from './Staunton';
const slab=new RoundedBoxGeometry(9.35,.68,9.35,3,.075),plinth=new RoundedBoxGeometry(9.52,.13,9.52,3,.04);
export function WoodenBoard(){const wood=useMemo(()=>woodTexture(true),[]);useEffect(()=>()=>wood.dispose(),[wood]);return <group>
 <mesh geometry={slab} position={[0,-.37,0]} castShadow receiveShadow><meshPhysicalMaterial map={wood} roughness={.32} clearcoat={.5} clearcoatRoughness={.35}/></mesh>
 <mesh geometry={plinth} position={[0,-.75,0]} castShadow receiveShadow><meshStandardMaterial color="#30261b" roughness={.4}/></mesh>
 {[-1,1].map(sign=><group key={sign}><mesh position={[sign*4.34,-.06,0]} castShadow receiveShadow><boxGeometry args={[.65,.21,8.65]}/><meshPhysicalMaterial map={wood} roughness={.3} clearcoat={.5}/></mesh><mesh position={[0,-.06,sign*4.34]} castShadow receiveShadow><boxGeometry args={[9.35,.21,.65]}/><meshPhysicalMaterial map={wood} roughness={.3} clearcoat={.5}/></mesh><mesh position={[sign*4.045,.043,0]}><boxGeometry args={[.025,.015,8.1]}/><meshStandardMaterial color="#bea46c" roughness={.3} metalness={.6}/></mesh><mesh position={[0,.043,sign*4.045]}><boxGeometry args={[8.1,.015,.025]}/><meshStandardMaterial color="#bea46c" roughness={.3} metalness={.6}/></mesh><mesh position={[0,-.39,sign*4.679]}><boxGeometry args={[9.2,.035,.012]}/><meshStandardMaterial color="#9a7a43" roughness={.4} metalness={.55}/></mesh><mesh position={[sign*4.679,-.39,0]}><boxGeometry args={[.012,.035,9.2]}/><meshStandardMaterial color="#9a7a43" roughness={.4} metalness={.55}/></mesh></group>)}
 </group>;}
