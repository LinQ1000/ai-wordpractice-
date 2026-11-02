/** Real-browser integration checks; uses Chrome CDP without a test framework dependency. */
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const port=4192,debugPort=9238;
const root=path.resolve(import.meta.dirname,'..');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:root,stdio:'ignore'});
const profile=await mkdtemp(path.join(tmpdir(),'ielts-reading-test-'));
const browserPath=process.env.CHROME_BIN||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':'google-chrome');
const browser=spawn(browserPath,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${debugPort}`,`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore'});
let launchError;browser.on('error',error=>{launchError=error;});let socket;
try{
 let target;for(let n=0;n<100;n++){if(launchError)throw launchError;try{await fetch(`http://127.0.0.1:${port}/`);target=await(await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`,{method:'PUT'})).json();break;}catch{await pause(150);}}
 assert.ok(target,'Chrome and development server started');socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
 let seq=0;const callbacks=new Map();socket.addEventListener('message',event=>{const message=JSON.parse(event.data);const callback=callbacks.get(message.id);if(callback){callbacks.delete(message.id);message.error?callback.reject(message.error):callback.resolve(message.result);}});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;callbacks.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
 const run=async expression=>{const value=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(value.exceptionDetails)throw new Error(value.exceptionDetails.exception?.description||value.exceptionDetails.text);return value.result.value;};
 async function until(expression){for(let n=0;n<100;n++){if(await run(expression))return;await pause(100);}throw new Error(`Timed out: ${expression}`);}
 const screenshot=async name=>{await writeFile(path.join(tmpdir(),`ielts-reading-${name}.png`),Buffer.from((await send('Page.captureScreenshot',{format:'png'})).data,'base64'));};
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:`http://127.0.0.1:${port}/`});await until(`document.querySelectorAll('.rp-exam-card').length===12`);
 await screenshot('library');
 const audit=await run(`(async()=>{const {loadCatalog,loadExam}=await import('/src/reading/repository.ts');const {gradeExam}=await import('/src/reading/grading.ts');const {validateExam}=await import('/src/reading/adapter.ts');const catalog=await loadCatalog();const problems=[];let total=0;for(const entry of catalog){try{const exam=await loadExam(entry.id);validateExam(exam);const answers={};for(const q of exam.groups.flatMap(g=>g.questions))answers[q.id]=q.kind==='multi'?q.correctSet:q.accepted[0];const score=gradeExam(exam,answers);if(score.earned!==score.total)problems.push({id:entry.id,reason:'reference answers do not receive full credit',items:score.items.filter(i=>i.earned!==i.possible)});if(exam.questionCount!==entry.questionCount)problems.push({id:entry.id,reason:'catalog point count mismatch',catalog:entry.questionCount,actual:exam.questionCount});if(!exam.passageHtml.trim())problems.push({id:entry.id,reason:'empty passage'});total+=exam.questionCount;}catch(error){problems.push({id:entry.id,reason:error.message});}}return {count:catalog.length,total,problems};})()`);
 console.log('Catalog audit:',JSON.stringify(audit));assert.equal(audit.count,238);assert.equal(audit.problems.length,0,'Every source exam adapts and grades consistently');
 const sanitizer=await run(`(async()=>{const {safeHtml}=await import('/src/reading/html.ts');const html=safeHtml('<p onclick="alert(1)">Safe<script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)"><iframe src="https://evil.test"></iframe></p>');return html;})()`);assert.ok(!/onclick|script|iframe|onerror/.test(sanitizer));
 const builtins=await run(`performance.getEntriesByType('resource').map(e=>e.name).filter(name=>name.includes('/ielts/js/'))`);assert.deepEqual(builtins,[],'New page does not load legacy business scripts');
 await run(`location.hash='practice/p1-high-01'`);await until(`!!document.querySelector('.rp-reading-pane .rp-prose p')`);
 await run(`const input=document.querySelector('.rp-answer select');input.value='viii';input.dispatchEvent(new Event('change',{bubbles:true}));`);
 await pause(300);await send('Page.reload');await until(`document.querySelector('.rp-answer select')?.value==='viii'`);
 console.log('PASS answer draft restored after refresh');
 await run(`const el=document.querySelector('.rp-reading-pane .rp-prose p strong');const text=el?.nextSibling;const paragraph=[...document.querySelectorAll('.rp-reading-pane .rp-prose p')].find(p=>p.textContent.includes('Emperor'));const walker=document.createTreeWalker(paragraph,NodeFilter.SHOW_TEXT);let node;while(walker.nextNode()){if(walker.currentNode.textContent.includes('Emperor')){node=walker.currentNode;break;}}const at=node.textContent.indexOf('Emperor');const range=document.createRange();range.setStart(node,at);range.setEnd(node,at+7);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'));`);
 await until(`!!document.querySelector('.rp-selection-action')`);await run(`document.querySelector('.rp-selection-action').click()`);await until(`!!document.querySelector('.rp-dialog input')?.value`);
 assert.ok(await run(`document.querySelector('.rp-dialog input').value.includes('皇帝')`));
 await run(`document.querySelector('.rp-dialog form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);await until(`!document.querySelector('.rp-dialog')`);
 assert.ok(await run(`!!document.querySelector('.rp-saved-word')`));assert.equal(await run(`JSON.parse(localStorage.getItem('ielts-practice-reading-words-v1')).length`),1);
 console.log('PASS selected reading word receives a definition, is saved and marked');
 // Fill with reference answers to verify the UI -> grading -> history pipeline.
 await run(`(async()=>{const {loadExam}=await import('/src/reading/repository.ts');const exam=await loadExam('p1-high-01');for(const q of exam.groups.flatMap(g=>g.questions)){const input=document.querySelector('#answer-'+q.id+' select');if(input){input.value=q.accepted[0];input.dispatchEvent(new Event('change',{bubbles:true}));}}})()`);
 await screenshot('practice');await run(`document.querySelector('.rp-practice-tools button').click()`);await until(`!!document.querySelector('#submit-title')`);await run(`document.querySelector('.rp-dialog .rp-actions .rp-button:last-child').click()`);await until(`!!document.querySelector('#rp-result')`);
 assert.ok(await run(`document.querySelector('#rp-result').textContent.includes('100%')`));
 await run(`location.hash='records'`);await until(`document.querySelectorAll('.rp-record-card').length===1`);await run(`document.querySelector('.rp-record-card .rp-button').click()`);await until(`!!document.querySelector('#rp-result')`);assert.ok(await run(`document.querySelector('.rp-answer').disabled`));
 await run(`location.hash='wordbank'`);await until(`document.querySelectorAll('.rp-word-card').length===1`);await run(`document.querySelector('.rp-panel>.rp-row .rp-button:last-child').click()`);await until(`document.querySelector('#wordlist')?.value==='reading'`);assert.ok(await run(`document.querySelector('.meaning')?.textContent.includes('皇帝')`));
 console.log('PASS completed reading saved/reviewable and collected words available for vocabulary practice');
 // Create a schema example through the actual editor, then check safe import validation.
 await run(`location.hash='library'`);await until(`document.querySelectorAll('.rp-exam-card').length===12`);await run(`document.querySelector('.rp-panel>.rp-row .rp-button:last-child').click()`);await until(`!!document.querySelector('.rp-dialog textarea')`);await run(`document.querySelector('.rp-dialog .rp-actions .rp-button:last-child').click()`);await until(`!document.querySelector('.rp-dialog')`);assert.equal(await run(`JSON.parse(localStorage.getItem('ielts-practice-reading-bank-v1')).length`),1);
 const invalid=await run(`(async()=>{const {validateExam}=await import('/src/reading/adapter.ts');const value=JSON.parse(localStorage.getItem('ielts-practice-reading-bank-v1'))[0];value.groups[0].questions[1].id='q1';try{validateExam(value);return false;}catch{return true;}})()`);assert.equal(invalid,true);
 console.log('PASS question-bank creation and duplicate-question rejection');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(300);assert.equal(await run(`document.documentElement.scrollWidth>innerWidth`),false);await screenshot('mobile-library');
 await run(`location.hash='practice/p1-high-01'`);await until(`!!document.querySelector('.rp-reading-pane')`);assert.equal(await run(`document.documentElement.scrollWidth>innerWidth`),false);await screenshot('mobile-practice');
 console.log('PASS desktop and mobile reading layouts do not overflow');
}finally{socket?.close();browser.kill();server.kill();}
