import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { inflateRawSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';

export function sanitizeText(text) {
 return text
  .replace(/[A-Za-z]:[\\/]+Users[\\/]+[^"'<>\r\n]*?ChessWorkshop/gi,'workspace')
  .replace(/[A-Za-z]:[\\/]+Users[\\/]+[^\\/"'<>\r\n\t]+/gi,'user-home')
  .replace(/\/(?:Users|home)\/[^/"'<>\s]+/g,'user-home');
}
export function sanitizeDiagnostic(value) {
 if(typeof value==='string')return sanitizeText(value);
 if(Array.isArray(value))return value.map(sanitizeDiagnostic);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,sanitizeDiagnostic(item)]));
 return value;
}
export async function writeDiagnostic(file,value) {
 await writeFile(file,JSON.stringify(sanitizeDiagnostic(value),null,2));
}
const secrets=[
 ['private key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
 ['GitHub token',/\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})\b/],
 ['AWS access key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
 ['Slack token',/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
 ['credential in URL',/https?:\/\/[^\s/@:]+:[^\s/@]+@/],
 ['assigned credential',/(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["'][A-Za-z0-9_+/=-]{16,}["']/i],
];
export function findings(text) {
 const result=[];
 if(sanitizeText(text)!==text)result.push('personal filesystem path');
 for(const [kind,pattern] of secrets)if(pattern.test(text))result.push(kind);
 return result;
}
// Preserve unchanged, licensed upstream binaries and provenance. Their build
// paths and copyright contacts are not the application's user's information.
const upstream=file=>/^(?:sources\/|public\/engine\/|public\/licenses\/|LICENSE$)/.test(file);
function zipTexts(bytes) {
 const entries=[];
 let end=bytes.length-22;
 while(end>=Math.max(0,bytes.length-65557)&&bytes.readUInt32LE(end)!==0x06054b50)end--;
 if(end<0||bytes.readUInt32LE(end)!==0x06054b50)throw Error('Invalid ZIP directory');
 const count=bytes.readUInt16LE(end+10);let at=bytes.readUInt32LE(end+16);
 for(let entry=0;entry<count;entry++){
  if(at+46>bytes.length||bytes.readUInt32LE(at)!==0x02014b50)throw Error('Invalid ZIP directory entry');
  const method=bytes.readUInt16LE(at+10),size=bytes.readUInt32LE(at+20),nameSize=bytes.readUInt16LE(at+28),extra=bytes.readUInt16LE(at+30),comment=bytes.readUInt16LE(at+32),offset=bytes.readUInt32LE(at+42);
  const name=bytes.subarray(at+46,at+46+nameSize).toString('utf8');
  if(offset+30>bytes.length||bytes.readUInt32LE(offset)!==0x04034b50)throw Error('Invalid ZIP entry');
  const start=offset+30+bytes.readUInt16LE(offset+26)+bytes.readUInt16LE(offset+28),data=bytes.subarray(start,start+size);
  if(method!==0&&method!==8)throw Error('Unsupported ZIP compression');
  const decoded=method===8?inflateRawSync(data,{maxOutputLength:64*1024*1024}):data;
  entries.push([name,decoded]);at+=46+nameSize+extra+comment;
 }
 return entries;
}
export async function auditTracked() {
 const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean),issues=[];
 for(const file of files){
  const bytes=await readFile(file);
  const entries=file.endsWith('.zip')?zipTexts(bytes):[[file,bytes]];
  for(const [name,data] of entries){
   if(data.includes(0))continue;
   for(const kind of findings(data.toString('utf8'))){
    if(kind==='personal filesystem path'&&upstream(file))continue;
    issues.push({file:file.endsWith('.zip')?`${file}!${name}`:file,kind});
   }
  }
 }
 return {filesChecked:files.length,issues};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await auditTracked();
 console.log(JSON.stringify(result,null,2));if(result.issues.length)process.exitCode=1;
}
