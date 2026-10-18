import { it,expect } from 'vitest';
import { Chess } from 'chess.js';
import { lessons, type Exercise } from '../../content/curriculum';
import puzzles from '../../content/puzzles.json';
import { grade,validateExercise } from '../../src/lessons/runner';
import { uci } from '../../src/chess/rules';
import { playUci } from '../../src/chess/rules';
import { teachingNotes } from '../../content/teaching-notes';
it('every lesson has a concise original idea, observation and reminder',()=>{for(const lesson of lessons){const note=teachingNotes[lesson.title];expect(note,lesson.title).toBeDefined();for(const field of ['idea','notice','remember'] as const)expect(note[field].length).toBeGreaterThan(20);}});
it('feedback distinguishes partial success, no check, stalemate and actual mate',()=>{
 const skewer=lessons.find(l=>l.title==='Skewers')!.exercises[0],partial=grade(skewer,[],skewer.accepted[0][0]);expect(partial.complete).toBe(false);expect(partial.feedback).toContain('king from a6 to b6');expect(partial.feedback).not.toContain('Rxa8');
 const mate=lessons.find(l=>l.title==='Checkmate versus stalemate')!.exercises[0];expect(grade(mate,[],'g6f7').feedback).toMatch(/stalemate, a draw/);expect(grade(mate,[],'g6g5').feedback).toContain('not in check');expect(grade(mate,[],'g6g7').feedback).toContain('That is checkmate');
});
it('all 32 lessons, 97 exercises, demonstrations and 100 puzzles validate',()=>{expect(lessons).toHaveLength(32);expect(lessons.flatMap(l=>l.exercises)).toHaveLength(97);expect(puzzles).toHaveLength(100);const all=[...lessons.flatMap(l=>[l.demo,...l.exercises]),...puzzles] as Exercise[];expect(new Set(all.map(e=>e.id)).size).toBe(all.length);for(const e of all)expect(validateExercise(e)).toBe(true);});
it('rejected legal attempts explain their actual destination, piece choice and missed checking fork',()=>{
 const orientation=lessons[0].exercises[0];expect(grade(orientation,[],'a1a3').feedback).toContain('stays on the a-file and stops on rank 3');expect(grade(orientation,[],'e1d2').feedback).toContain('while you moved the king');
 const fork=lessons.find(lesson=>lesson.title==='Forks')!.exercises[0],result=grade(fork,[],'c3b5');expect(result.correct).toBe(false);expect(result.feedback).toContain('does not check the opposing king');expect(result.feedback).toContain('requested fork');
});
it('wrong-move capture cautions name an actually legal reply without inventing a forced loss',()=>{
 const base=lessons[0].exercises[0],exercise={...base,fen:'4k3/8/8/8/1p6/8/8/R3K3 w - - 0 1'};const result=grade(exercise,[],'a1a3');expect(result.correct).toBe(false);expect(result.feedback).toContain('bxa3');expect(result.feedback).toContain('not a claim that the capture is forced');
 const after=new Chess(exercise.fen);after.move('Ra3');expect(after.moves()).toContain('bxa3');
});
it('every authored learner branch grades through legal replies',()=>{for(const ex of [...lessons.flatMap(l=>l.exercises),...puzzles] as Exercise[])for(const line of ex.accepted){const prefix:string[]=[];for(let i=0;i<line.length;i+=2){const result=grade(ex,prefix,line[i]);expect(result.correct,ex.id).toBe(true);expect(result.complete,ex.id).toBe(i+2>=line.length);prefix.push(line[i]);if(result.reply)prefix.push(result.reply);}}});
it('mate exercises accept every legal mate and reject nonmates',()=>{for(const e of [...lessons.flatMap(l=>l.exercises),...puzzles].filter(x=>x.predicate==='mate') as Exercise[]){const g=new Chess(e.fen);for(const m of g.moves({verbose:true})){g.move(m);const mate=g.isCheckmate();g.undo();expect(grade(e,[],uci(m)).correct,e.id).toBe(mate);}}});
it('authored forks actually check and attack another valuable target',()=>{for(const ex of [...lessons.find(l=>l.title==='Forks')!.exercises,...puzzles.filter(p=>p.tags[0]==='knight fork')] as Exercise[]){for(const line of ex.accepted){const g=new Chess(ex.fen),m=playUci(g,line[0]);expect(g.isCheck(),ex.id).toBe(true);expect(g.board().flat().some(p=>p&&p.color!==m.color&&p.type!=='k'&&g.attackers(p.square,m.color).includes(m.to)),ex.id).toBe(true);}}});
it('removing a defender starts with a real defender of the later capture',()=>{for(const ex of lessons.find(l=>l.title==='Removing a defender')!.exercises){const g=new Chess(ex.fen),line=ex.accepted[0];const captureSquare=line[2].slice(2,4) as 'e6';const removed=line[0].slice(2,4);expect(g.attackers(captureSquare,'b'),ex.id).toContain(removed);for(const m of line)playUci(g,m);expect(g.get(captureSquare)?.color).toBe('w');}});

