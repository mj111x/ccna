const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const ASSET='public/assets/';
let bank={choice:[],lab:[],dnd:[]},session=[],cursor=0,answers=[],mode='mixed',selectedCards=new Set(),dragCard=null;
const state={start:$('#startScreen'),exam:$('#examScreen'),result:$('#resultScreen'),area:$('#questionArea'),status:$('#examStatus'),exit:$('#exitButton'),submit:$('#submitButton'),hint:$('#answerHint')};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const sample=(a,n)=>shuffle(a).slice(0,Math.min(n,a.length));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=(folder,name,alt='문제 이미지')=>`<img src="${ASSET}${folder}/${name}" alt="${alt}" loading="eager">`;
function toast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),900)}

Promise.all(['choices','labs','dnd'].map(name=>fetch(`data/${name}.json`).then(r=>{if(!r.ok)throw Error(name);return r.json()}))).then(([choice,lab,dnd])=>{
  bank={choice,lab,dnd};$('#loadState').textContent=`객관식 ${choice.length} · LAB ${lab.length} · D&D ${dnd.length} 준비 완료`;
  $$('.mode-card').forEach(b=>b.disabled=false);
}).catch(()=>{$('#loadState').textContent='자료를 불러오지 못했습니다. START-WEB.cmd로 실행해 주세요.'});

$$('.mode-card').forEach(button=>{button.disabled=true;button.addEventListener('click',()=>start(button.dataset.mode))});
$('#homeButton').onclick=home;$('#exitButton').onclick=finish;$('#resultHomeButton').onclick=home;$('#againButton').onclick=()=>start(mode);
function start(nextMode){mode=nextMode;cursor=0;answers=[];
  if(mode==='mixed')session=shuffle([...sample(bank.choice,92).map(q=>({type:'choice',q})),...sample(bank.lab,4).map(q=>({type:'lab',q})),...sample(bank.dnd,4).map(q=>({type:'dnd',q}))]);
  if(mode==='choice')session=sample(bank.choice,100).map(q=>({type:'choice',q}));
  if(mode==='lab')session=shuffle(bank.lab).map(q=>({type:'lab',q}));
  if(mode==='dnd')session=shuffle(bank.dnd).map(q=>({type:'dnd',q}));
  state.start.classList.add('hidden');state.result.classList.add('hidden');state.exam.classList.remove('hidden');state.status.classList.remove('hidden');state.exit.classList.remove('hidden');render();
}
if(document.modelContext?.registerTool){
  Promise.resolve(document.modelContext.registerTool({name:'start_practice',title:'연습 시작',description:'화면에서 선택한 유형의 CCNA 연습 세션을 시작합니다.',inputSchema:{type:'object',properties:{mode:{type:'string',enum:['mixed','choice','lab','dnd']}},required:['mode'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:({mode:requested})=>{if(!bank.choice.length)throw new Error('문제 자료를 불러오는 중입니다.');start(requested);return {started:true,mode:requested,total:session.length}}})).catch(()=>{});
}
function home(){state.exam.classList.add('hidden');state.result.classList.add('hidden');state.start.classList.remove('hidden');state.status.classList.add('hidden');state.exit.classList.add('hidden')}
function progress(){const p=Math.round(cursor/session.length*100);$('#progressBar').style.width=`${p}%`;$('#progressText').textContent=`${p}%`}
function shell(title,sub,body){return `<article class="question-shell"><header class="question-head"><strong>${esc(title)}</strong><span>${esc(sub)}</span></header>${body}</article>`}
function render(){if(cursor>=session.length)return finish();progress();window.scrollTo(0,0);selectedCards=new Set();state.submit.classList.add('hidden');state.submit.onclick=null;const item=session[cursor];
  $('#typeBadge').textContent={choice:'문제',lab:'실습',dnd:'D&D'}[item.type];
  if(item.type==='choice')renderChoice(item.q);if(item.type==='lab')renderLab(item.q);if(item.type==='dnd')renderDnd(item.q);
}
function pages(folder,names){return `<div class="page-stack">${names.map(n=>img(folder,n)).join('')}</div>`}
function record(correct,type){answers.push({type,correct});cursor++;setTimeout(render,correct?250:420)}
function renderChoice(q){
  const letters='ABCDEFG'.slice(0,q.options).split('');
  state.area.innerHTML=shell('객관식',q.required>1?`${q.required}개 선택`:'하나 선택',pages('choice',q.files)+`<div class="choice-pad">${letters.map(l=>`<button class="choice-button" data-letter="${l}" type="button">${l}</button>`).join('')}</div><p class="choice-note">${q.required>1?`${q.required}개를 고르면 자동으로 넘어갑니다.`:'답을 누르면 자동으로 넘어갑니다.'}</p>`);
  state.hint.textContent=q.required>1?`정답 ${q.required}개를 선택하세요.`:'답을 선택하세요.';
  $$('.choice-button').forEach(b=>b.onclick=()=>{const l=b.dataset.letter;if(selectedCards.has(l)){selectedCards.delete(l);b.classList.remove('selected');return}selectedCards.add(l);b.classList.add('selected');if(selectedCards.size===q.required){const chosen=[...selectedCards].sort().join('');const ok=chosen===q.answer;toast(ok?'정답':'오답');record(ok,'choice')}});
}
function normalize(s){return s.split(/\r?\n/).map(x=>x.trim().replace(/^[a-z0-9_-]+(?:\([^)]*\))?[#>]\s*/i,'').replace(/\s+/g,' ').toLowerCase().replace(/^(en|ena)$/,'enable').replace(/^(conf|config|configure) t$/,'configure terminal').replace(/^int( |$)/,'interface$1').replace(/^no shut$/,'no shutdown').replace(/\s*,\s*/g,',')).filter(x=>x&&x!=='!')}
function commandScore(expected,actual){const a=normalize(expected),b=normalize(actual);let i=0,j=0,hit=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){hit++;i++;j++}else if(a.slice(i+1).includes(b[j]))i++;else j++}return {hit,total:a.length}}
function renderLab(q){
  const editors=q.devices.map((d,i)=>`<div class="device"><label>장비</label><strong>${esc(d.name)}</strong><textarea data-device="${i}" spellcheck="false" placeholder="명령어를 한 줄씩 입력하세요"></textarea></div>`).join('');
  state.area.innerHTML=shell('실습',q.title,`<div class="lab-work">${pages('lab',q.pages)}<div class="terminal">${editors}</div></div>`);state.hint.textContent='모든 장비의 명령어를 입력한 뒤 채점하세요.';state.submit.classList.remove('hidden');state.submit.onclick=()=>{let hit=0,total=0;q.devices.forEach((d,i)=>{const s=commandScore(d.answer,$(`[data-device="${i}"]`).value);hit+=s.hit;total+=s.total});const ok=total>0&&hit===total;toast(ok?'정답':'답안 비교 완료');record(ok,'lab')};
}
function renderDnd(q){
  const cards=shuffle(q.cards).map(c=>`<button class="drag-card" draggable="true" data-card="${c.id}" type="button">${img('dnd',c.image,'보기 카드')}</button>`).join('');
  let slot=0;const targets=q.targets.map(t=>`<section class="target-group"><div class="target-label">${t.image?img('dnd',t.image,'답안 대상'):esc(t.label)}</div>${Array.from({length:t.capacity},()=>`<div class="drop-slot" data-slot="${slot++}" data-group="${t.id}">여기에 놓기</div>`).join('')}</section>`).join('');
  state.area.innerHTML=shell('Drag & Drop',`${q.kind} · 같은 분류 안에서는 순서 무관`,pages('dnd',q.pages)+`<div class="dnd-work"><div class="card-pool">${cards}</div><div class="target-list">${targets}</div></div>`);state.hint.textContent='카드를 끌어 놓거나, 카드와 칸을 차례로 누르세요.';state.submit.classList.remove('hidden');
  const cardById=id=>q.cards.find(c=>c.id===Number(id));
  $$('.drag-card').forEach(c=>{c.ondragstart=()=>dragCard=c.dataset.card;c.onclick=()=>{$$('.drag-card').forEach(x=>x.classList.remove('selected'));selectedCards=new Set([c.dataset.card]);c.classList.add('selected')}});
  $$('.drop-slot').forEach(s=>{s.ondragover=e=>e.preventDefault();s.ondrop=e=>{e.preventDefault();place(s,dragCard)};s.onclick=()=>{if(selectedCards.size)place(s,[...selectedCards][0])}});
  function place(slotEl,id){if(id==null)return;const card=$(`[data-card="${id}"]`);if(slotEl.dataset.card){const old=$(`[data-card="${slotEl.dataset.card}"]`);if(old)old.classList.remove('hidden')}$$('.drop-slot').filter(x=>x.dataset.card===String(id)).forEach(x=>{x.dataset.card='';x.innerHTML='여기에 놓기';x.classList.remove('filled');x.draggable=false});slotEl.dataset.card=id;slotEl.innerHTML=card.innerHTML;slotEl.classList.add('filled');slotEl.draggable=true;slotEl.ondragstart=()=>dragCard=id;slotEl.ondblclick=()=>{card.classList.remove('hidden');slotEl.dataset.card='';slotEl.innerHTML='여기에 놓기';slotEl.classList.remove('filled');slotEl.draggable=false};card.classList.add('hidden');selectedCards.clear();dragCard=null}
  state.submit.onclick=()=>{const slots=$$('.drop-slot');if(slots.some(s=>!s.dataset.card)){toast('빈 칸을 모두 채워 주세요');return}const ok=slots.every(s=>cardById(s.dataset.card).group===Number(s.dataset.group));toast(ok?'정답':'오답');record(ok,'dnd')};
}
function finish(){if(!session.length)return home();state.exam.classList.add('hidden');state.result.classList.remove('hidden');state.status.classList.add('hidden');state.exit.classList.add('hidden');const total=answers.length,correct=answers.filter(a=>a.correct).length;$('#scorePercent').textContent=`${total?Math.round(correct/total*100):0}%`;const labels={choice:'문제',lab:'실습',dnd:'D&D'};$('#scoreDetails').innerHTML=['choice','lab','dnd'].map(type=>{const a=answers.filter(x=>x.type===type);return `<div><span>${labels[type]}</span><strong>${a.filter(x=>x.correct).length} / ${a.length}</strong></div>`}).join('')}
