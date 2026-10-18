import type { Session } from '../sessions/model';
type Answer={move:string;seed:number;milliseconds:number};
type Pending={id:number;resolve:(answer:Answer)=>void;reject:(error:Error)=>void;cleanup:()=>void};
export class TeachingClient {
 private worker:Worker|null=null;
 private pending:Pending|null=null;
 private nextId=0;
 search(session:Session,signal?:AbortSignal):Promise<Answer>{
  if(signal?.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
  if(this.pending)return Promise.reject(Error('A teaching search is already active'));
  if(!this.worker){
   try{const worker=new Worker(new URL('./teaching.worker.ts',import.meta.url),{type:'module'});this.worker=worker;
    worker.onmessage=event=>{
     if(this.worker!==worker||!this.pending||this.pending.id!==event.data.id)return;
     const pending=this.pending;this.pending=null;pending.cleanup();
     if(event.data.error)pending.reject(Error('Teaching engine failed: '+event.data.error));else pending.resolve({move:event.data.move,seed:event.data.seed,milliseconds:event.data.milliseconds});
    };
    worker.onerror=()=>{if(this.worker===worker)this.destroy(Error('Teaching engine failed to load. Retry engine.'));};
   }catch(error){return Promise.reject(error);}
  }
  return new Promise<Answer>((resolve,reject)=>{
   const id=++this.nextId,abort=()=>this.destroy(new DOMException('Cancelled','AbortError'));
   const timer=setTimeout(()=>this.destroy(Error('Teaching engine timeout. Retry engine.')),5000);
   this.pending={id,resolve,reject,cleanup:()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);}};
   signal?.addEventListener('abort',abort,{once:true});
   try{this.worker!.postMessage({id,session});}catch(error){this.destroy(error instanceof Error?error:Error(String(error)));}
  });
 }
 destroy(error:Error=new DOMException('Cancelled','AbortError')){
  const pending=this.pending;this.pending=null;this.worker?.terminate();this.worker=null;
  if(pending){pending.cleanup();pending.reject(error);}
 }
}
