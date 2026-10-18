import { it,expect } from 'vitest';
import { Chess,DEFAULT_POSITION } from 'chess.js';
import { explainCandidate } from '../../src/coaching/reasons';
import { playUci } from '../../src/chess/rules';
import type { Candidate,Score } from '../../src/engine/uci';
const candidate=(fen:string,line:string[],score:Score={kind:'cp',value:30}):Candidate=>({move:line[0],san:playUci(new Chess(fen),line[0]).san,pv:line,notation:[],score,depth:12,rank:1});
it('opening explanations connect development, central control and opened lines to the actual board',()=>{
 const knight=explainCandidate(DEFAULT_POSITION,candidate(DEFAULT_POSITION,['g1f3','d7d5']));expect(knight.summary).toContain('develops your knight');expect(knight.summary).toContain('d4 and e5');expect(knight.reply).toContain('Black can answer d5');const pawn=explainCandidate(DEFAULT_POSITION,candidate(DEFAULT_POSITION,['e2e4','e7e5']));expect(pawn.summary).toContain('occupies e4');expect(pawn.summary).toContain('opens a line for your bishop on f1');
});
it('tactical reasons separate forcing check, pressure and a verified mate from an assumed win',()=>{
 const fen='8/4k3/5q2/8/8/2N5/8/4K3 w - - 0 1',fork=explainCandidate(fen,candidate(fen,['c3d5']));expect(fork.summary).toContain('gives check');expect(fork.summary).toContain('queen on f6');expect(fork.summary).not.toContain('wins the queen');const mate='7k/8/5KQ1/8/8/8/8/8 w - - 0 1',result=explainCandidate(mate,candidate(mate,['g6g7'],{kind:'mate',value:1}));expect(result.benefits[0]).toContain('ends the game');expect(result.lineOutcome).toContain('checkmate');expect(result.assessment).toContain('Mate 1');
});
it('a capture that is immediately recaptured is explained with its actual risk and material line',()=>{
 const fen='4k3/8/2p5/3q4/8/8/8/3RK3 w - - 0 1',result=explainCandidate(fen,candidate(fen,['d1d5','c6d5']));expect(result.benefits[0]).toContain('captures a queen');expect(result.watch[0]).toContain('can immediately capture the moved rook with cxd5');expect(result.lineOutcome).toContain('gains 4 pawns of material');expect(result.reply).toContain('captures your rook');
});
it('both-color castling plans and promotion reasons stay factual',()=>{
 for(const side of ['w','b']){const rank=side==='w'?'1':'8',fen=`r3k2r/8/8/8/8/8/8/R3K2R ${side} KQkq - 0 1`,result=explainCandidate(fen,candidate(fen,[`e${rank}g${rank}`]));expect(result.summary).toContain(`king away from the central e-file to g${rank}`);expect(result.summary).toContain(`h${rank} to f${rank}`);expect(result.summary).not.toContain('guarantee');}
 const fen='7r/6P1/7k/8/8/8/8/K7 w - - 0 1';expect(explainCandidate(fen,candidate(fen,['g7h8n'])).summary).toContain('becomes a knight');
});
it('similar evaluations allow several plans and mate values never become pawn estimates',()=>{
 const first=candidate(DEFAULT_POSITION,['e2e4'],{kind:'cp',value:35}),second=candidate(DEFAULT_POSITION,['d2d4'],{kind:'cp',value:30});expect(explainCandidate(DEFAULT_POSITION,first,[first,second]).assessment).toContain('Several analyzed moves scored similarly');first.score={kind:'mate',value:3};expect(explainCandidate(DEFAULT_POSITION,first,[first,second]).assessment).not.toContain('scored similarly');
});
it('pins, passed pawns and direct opposition are checked against the resulting position',()=>{
 const pin='4k3/8/4n3/8/8/8/8/R5K1 w - - 0 1';expect(explainCandidate(pin,candidate(pin,['a1e1'])).summary).toContain('pins the knight on e6 to its king');
 const pawn='7k/8/8/3P4/8/8/8/K7 w - - 0 1';expect(explainCandidate(pawn,candidate(pawn,['d5d6'])).summary).toContain('passed pawn');
 const opposition='8/8/4k3/8/8/4K3/P7/8 w - - 0 1';expect(explainCandidate(opposition,candidate(opposition,['e3e4'])).summary).toContain('direct opposition');
});
it('a legal alternative is not praised as equivalent when its own estimate loses material or a mate',()=>{
 const best=candidate(DEFAULT_POSITION,['e2e4'],{kind:'cp',value:40}),worse=candidate(DEFAULT_POSITION,['f2f3'],{kind:'cp',value:-180});expect(explainCandidate(DEFAULT_POSITION,worse,[best,worse]).watch[0]).toContain('2.20 pawns below the leading candidate');best.score={kind:'mate',value:2};expect(explainCandidate(DEFAULT_POSITION,worse,[best,worse]).watch[0]).toContain('does not preserve');
});
