import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeText,sanitizeDiagnostic,findings } from './privacy.mjs';
test('portable paths cover native, JSON-escaped, Unix and nested diagnostics',()=>{
 const personal='C:'+String.raw`\Users\sample person\Desktop\ChessWorkshop\tests\example.ts`;
 assert.equal(sanitizeText(personal),String.raw`workspace\tests\example.ts`);
 const escaped=JSON.stringify({path:personal});assert.doesNotThrow(()=>JSON.parse(sanitizeText(escaped)));
 assert.equal(sanitizeDiagnostic({nested:[personal]}).nested[0],String.raw`workspace\tests\example.ts`);
 assert.equal(sanitizeText('/'+'home/sample/private.txt'),'user-home/private.txt');
 assert.equal(sanitizeText('https://github.com/example/project'),'https://github.com/example/project');
});
test('the audit detects credentials without echoing their values',()=>{
 const fake='gh'+'p_'+'x'.repeat(30);assert.deepEqual(findings(fake),['GitHub token']);
 assert.deepEqual(findings('https://example.com/project'),[]);
});
