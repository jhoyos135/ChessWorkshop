import type { TeachingNote } from '../../content/teaching-notes';
const glyph={rook:'♖',bishop:'♗',queen:'♕',knight:'♘',king:'♔',pawn:'♙'};
export function MovementPattern({piece}:{piece:NonNullable<TeachingNote['pattern']>}){
 const canMove=(x:number,y:number)=>{const dx=Math.abs(x-2),dy=Math.abs(y-2);if(!dx&&!dy)return false;if(piece==='rook')return !dx||!dy;if(piece==='bishop')return dx===dy;if(piece==='queen')return !dx||!dy||dx===dy;if(piece==='knight')return dx*dy===2;if(piece==='king')return Math.max(dx,dy)===1;return x===2&&y===1;};
 return <figure className="movement-pattern"><div className="pattern-board" role="img" aria-label={`${piece} movement pattern. Highlighted squares show the movement shape on an otherwise empty board.`}>{Array.from({length:25},(_,i)=>{const x=i%5,y=Math.floor(i/5);return <span key={i} className={`${(x+y)%2?'pattern-dark':'pattern-light'} ${canMove(x,y)?'pattern-destination':''}`}>{x===2&&y===2?<b>{glyph[piece]}</b>:canMove(x,y)?<i/>:null}</span>;})}</div><figcaption>{piece==='pawn'?'Forward move shown. A pawn captures diagonally.':'Dots show the movement shape on an empty board.'}</figcaption></figure>;
}
