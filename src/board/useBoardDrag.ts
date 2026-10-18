import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { Chess, type Square } from 'chess.js';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import { dragTarget } from './dropTarget';

export type DragPreview={square:string|null;point:Vector3;active:boolean};
type Input={game:Chess;disabled:boolean;selected:string|null;onSquare:(s:Square)=>void;onDrag:(from:Square,to:Square)=>void;onCancel?:()=>void};
export function useBoardDrag(input:Input){
 const latest=useRef(input);latest.current=input;
 const {camera,gl,scene,invalidate}=useThree();const ray=useRef(new Raycaster()),plane=useRef(new Plane(new Vector3(0,1,0),0));
 const preview=useRef<DragPreview>({square:null,point:new Vector3(),active:false});
 const down=useRef<{square:Square;x:number;y:number;own:boolean;offset:Vector3;legal:Set<Square>}|null>(null),suppressClick=useRef(false);
 const [dragging,setDragging]=useState(false);
 const [dropTarget,setDropTarget]=useState<{square:Square;valid:boolean}|null>(null);
 function planePoint(x:number,y:number){const bounds=gl.domElement.getBoundingClientRect();ray.current.setFromCamera(new Vector2((x-bounds.left)/bounds.width*2-1,-(y-bounds.top)/bounds.height*2+1),camera);return ray.current.ray.intersectPlane(plane.current,new Vector3());}
 function targetAt(x:number,y:number){const press=down.current,point=planePoint(x,y);if(!press||!point)return null;const bounds=gl.domElement.getBoundingClientRect();if(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)return null;let pointer:Square|undefined;for(const hit of ray.current.intersectObjects(scene.children,true)){let object=hit.object;while(object.parent&&!object.userData.boardSquare)object=object.parent;const square=object.userData.boardSquare;if(square&&!(object.userData.kind==='piece'&&square===press.square)){pointer=square as Square;break;}}return dragTarget(pointer,point.add(press.offset),press.legal);}
 function reset(){down.current=null;preview.current.active=false;preview.current.square=null;setDragging(false);setDropTarget(null);invalidate();}
 useEffect(()=>{
  const move=(ev:PointerEvent)=>{const press=down.current;if(!press?.own||latest.current.disabled)return;if(Math.hypot(ev.clientX-press.x,ev.clientY-press.y)<6&&!preview.current.active)return;const point=planePoint(ev.clientX,ev.clientY);if(!point)return;preview.current.active=true;preview.current.point.copy(point).add(press.offset);preview.current.point.y=.3;const target=targetAt(ev.clientX,ev.clientY);setDropTarget(old=>old?.square===target?.square&&old?.valid===target?.valid?old:target);invalidate();};
  const up=(ev:PointerEvent)=>{const press=down.current;if(!press)return;const wasDragging=press.own&&preview.current.active,target=wasDragging?targetAt(ev.clientX,ev.clientY):null;reset();if(wasDragging){suppressClick.current=true;if(target&&!latest.current.disabled)latest.current.onDrag(press.square,target.square);else latest.current.onCancel?.();}setTimeout(()=>{suppressClick.current=false;},0);};
  const cancel=()=>{reset();latest.current.onCancel?.();};
  window.addEventListener('pointermove',move,true);window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cancel,true);
  return()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);};
 },[camera,gl,scene,invalidate]);
 useEffect(()=>{if(input.disabled||input.selected===null&&down.current?.own)reset();},[input.disabled,input.selected,input.game.fen()]);
 useEffect(()=>{gl.domElement.style.cursor=dragging?'grabbing':'grab';return()=>{gl.domElement.style.cursor='';};},[dragging,gl]);
 const events=(square:Square)=>({
  onPointerDown:(ev:ThreeEvent<PointerEvent>)=>{ev.stopPropagation();if(latest.current.disabled)return;const own=latest.current.game.get(square)?.color===latest.current.game.turn();const point=planePoint(ev.clientX,ev.clientY)??new Vector3();const center=new Vector3(square.charCodeAt(0)-100.5,0,4.5-Number(square[1]));down.current={square,x:ev.clientX,y:ev.clientY,own,offset:center.clone().sub(point),legal:new Set(latest.current.game.moves({square,verbose:true}).map(move=>move.to))};suppressClick.current=false;if(own){preview.current={square,point:center.clone(),active:false};setDragging(true);if(latest.current.selected!==square){suppressClick.current=true;latest.current.onSquare(square);}}},
  onClick:(ev:ThreeEvent<PointerEvent>)=>{ev.stopPropagation();if(ev.delta>6||suppressClick.current){suppressClick.current=false;return;}if(!latest.current.disabled)latest.current.onSquare(square);}
 });
 return {preview:preview as MutableRefObject<DragPreview>,dragging,dropTarget,events};
}
