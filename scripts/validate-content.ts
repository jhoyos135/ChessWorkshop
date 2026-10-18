import { lessons } from '../content/curriculum';
import { validateExercise } from '../src/lessons/runner';
let failures=0;for(const l of lessons){for(const e of [l.demo,...l.exercises]){try{validateExercise(e);}catch(err){console.error(String(err));failures++;}}}
console.log(`${lessons.length} lessons; ${lessons.reduce((n,l)=>n+l.exercises.length,0)} exercises; ${failures} invalid records`);if(failures)process.exitCode=1;
