import type { Square } from 'chess.js';
export function squareAt(point:{x:number;z:number}):Square|null {const file=Math.floor(point.x+4),rank=Math.floor(4-point.z)+1;return file>=0&&file<8&&rank>=1&&rank<=8?('abcdefgh'[file]+rank) as Square:null;}
// Preserve direct cursor drops and captures. If perspective puts the cursor
// behind the piece, accept its base only when clearly centered on a legal cell.
export function dragTarget(pointer:Square|undefined,base:{x:number;z:number},legal:ReadonlySet<Square>){if(pointer&&legal.has(pointer))return {square:pointer,valid:true};const square=squareAt(base);if(square&&legal.has(square)){const x=square.charCodeAt(0)-100.5,z=4.5-Number(square[1]);if(Math.hypot(base.x-x,base.z-z)<=.38)return {square,valid:true};}return pointer?{square:pointer,valid:false}:null;}
