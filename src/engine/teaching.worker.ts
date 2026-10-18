import type { Session } from '../sessions/model';
import { teachingMove } from './teaching';

self.onmessage=(event:MessageEvent<{id:number;session:Session}>)=>{
 const {id,session}=event.data;
 try{const start=performance.now(),answer=teachingMove(session);self.postMessage({id,...answer,milliseconds:performance.now()-start});}
 catch(error){self.postMessage({id,error:error instanceof Error?error.message:String(error)});}
};
