import type { Exercise,Lesson } from '../../content/curriculum';
import { teachingNotes } from '../../content/teaching-notes';
import type { Teaching } from '../sessions/model';
import { MovementPattern } from './MovementPattern';
type Props={lesson?:Lesson;exercise:Exercise;teaching:Teaching;completed:number[];saved:boolean;animating:boolean;playing:boolean;onDemo:()=>void;onStep:()=>void;onToggleDemo:()=>void;onAttempt:()=>void;onRetry:()=>void;onHint:()=>void;onReveal:()=>void;onNext:()=>void;onNextLesson:()=>void;onBack:()=>void;onPractice:()=>void;onReviewGame?:()=>void};
export function LessonPanel(p:Props){
 const {lesson,exercise,teaching:t}=p,note=lesson?teachingNotes[lesson.title]:undefined;
 const demo=lesson?.demo.accepted[0]??[],stage=t.phase==='Introduction'?0:t.phase==='Demonstration'?1:2;
 return <section className="lesson-panel lesson-workshop">
  {lesson&&<><div className="lesson-steps" aria-label="Lesson stages">{['Learn the idea','Watch an example','Try it yourself'].map((label,i)=><span key={label} className={i===stage?'current-step':i<stage?'finished-step':''}>{i<stage?'✓':i+1} · {label}</span>)}</div><div className="lesson-progress"><strong>{p.completed.length} of {lesson.exercises.length} exercises finished</strong><div aria-label="Exercise progress">{lesson.exercises.map((_,i)=><span key={i} aria-label={`Exercise ${i+1}: ${p.completed.includes(i)?'finished':i===t.exercise?'current':'to do'}`} className={p.completed.includes(i)?'exercise-finished':i===t.exercise?'exercise-current':''}>{p.completed.includes(i)?'✓':i+1}</span>)}</div></div></>}
  {t.phase==='Introduction'?<>
   <span className="lesson-kicker">ONE IDEA TO LEARN</span><h3>{note?.idea??lesson?.title}</h3>
   {note?.pattern&&<MovementPattern piece={note.pattern}/>}
   <p className="lesson-key-idea">{note?.notice}</p><div className="lesson-remember">{note?.remember}</div>
   {note?.terms&&<dl className="lesson-terms">{note.terms.map(([word,meaning])=><div key={word}><dt>{word}</dt><dd>{meaning}</dd></div>)}</dl>}
   <button className="primary lesson-primary" onClick={p.onDemo}>Watch demonstration</button><p className="lesson-control-help">Watch one move at a time, then try {lesson?.exercises.length??1} exercises.</p>
   <details><summary>More about this idea</summary><p>{lesson?.intro}</p></details>
  </>:t.phase==='Demonstration'?<>
   <span className="lesson-kicker">WATCH THE HIGHLIGHTED PIECE</span><h3>{t.demoStep<demo.length?'Here is how it works.':'Example finished. Your turn next.'}</h3>
   <p className="lesson-key-idea">{lesson?.demo.objective}</p><p>{t.feedback||'The marked piece and destination show the next move. Watch the piece travel along the arrow.'}</p>
   <p className="lesson-example-progress">Example: {t.demoStep} of {demo.length} moves shown</p>
   {t.demoStep<demo.length?<div className="button-row"><button className="primary" disabled={p.animating} onClick={p.onStep}>Show next demonstration move</button><button aria-pressed={p.playing} onClick={p.onToggleDemo}>{p.playing?'Pause example':'Play example'}</button></div>:<button className="primary lesson-primary" disabled={p.animating} onClick={p.onAttempt}>Try it yourself</button>}
  </>:t.phase==='Complete'?<div className="lesson-finished" role="status">
   <span className="result-check" aria-hidden="true">✓</span><h3>Lesson complete!</h3><p>Correct — you finished the last exercise.</p>{t.completedGame&&<div className="guided-game-result"><h4>Complete game finished · White wins by checkmate</h4><p>You played from the initial position to a result. Keep checking king safety, checks, captures and threats in your next game.</p>{p.onReviewGame&&<button onClick={p.onReviewGame}>Review your complete guided game</button>}</div>}<p className="completion-count">{lesson?.exercises.length??1} of {lesson?.exercises.length??1} exercises finished</p><p>You practiced {lesson?.title.toLowerCase()??'this idea'}.</p><p>{p.saved?'Your progress is saved.':'Saving your progress…'}</p>
   {lesson&&<button className="primary lesson-primary" onClick={p.onNextLesson}>Continue learning →</button>}<button onClick={p.onBack}>Back to lessons</button><button onClick={p.onPractice}>Practice against the computer</button>
  </div>:<>
   <span className="lesson-kicker">{lesson?`YOUR TURN · EXERCISE ${t.exercise+1} OF ${lesson.exercises.length}`:'YOUR TURN'}</span>
   <h3 className="lesson-objective">{exercise.objective}</h3>
   {t.kind==='review'&&t.assisted&&t.hints===0&&<p className="lesson-remember">You recently revealed this answer. This attempt counts as assisted practice. A later review can count independently.</p>}{exercise.completeGame&&<div className="decision-routine" role="note"><strong>Before every move</strong><ol><li>Is my king in check? Make it safe first.</li><li>Compare checks, captures and threats.</li><li>What can the opponent do after my move?</li></ol><p>Complete game · decision {Math.floor(t.linePly/2)+1} of {exercise.decisions?.length??1}. The opponent follows a chosen teaching line; a normal game can take a different path.</p></div>}<p className="lesson-input-help">Click your piece, then click its destination. You can also drag the piece.</p>
   {t.phase==='Retry'?<div className="exercise-feedback feedback-retry" role="status"><h4>Not quite — try again.</h4><p>{t.feedback}</p><button className="primary" onClick={p.onRetry}>Retry this position</button><p>The position will reset so you can have another go.</p></div>:t.solved?<div className="exercise-feedback feedback-correct" role="status"><h4>✓ Correct!</h4>{exercise.completeGame&&<strong>Complete game finished · White wins by checkmate</strong>}<p>{t.feedback}</p><p className="learning-credit">{t.assisted||t.attempts>1?'Completed with practice':'Independent success'}</p><button className="primary lesson-primary" onClick={p.onNext}>{lesson?'Next exercise':'Choose another puzzle'}</button><button onClick={p.onRetry}>Practice again</button></div>:t.feedback?<div className="exercise-feedback feedback-progress" role="status"><h4>✓ Correct so far — keep going.</h4><p>{t.feedback}</p><p>You still have another move to make.</p></div>:null}
   {!t.solved&&t.phase!=='Retry'&&<div className="lesson-hints"><button onClick={p.onHint}>Hint {Math.min(3,t.hints+1)} / 3</button><button onClick={p.onReveal}>Show me the answer</button><p>A hint is help with this attempt. It is fine to use one while learning.</p></div>}
   {t.hints>0&&<div className="hint-box" role="status">{exercise.hints[t.hints-1]}</div>}{t.hints===3&&<p>{exercise.explanation}</p>}
  </>}
  <details className="lesson-provenance"><summary>Objective & provenance</summary><p>{exercise.objective}</p><p>{exercise.source}</p></details>
 </section>;
}
