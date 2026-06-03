/* ════════════════════════════════════════════
   ARNAV AI — MAIN SCRIPT
════════════════════════════════════════════ */
const $=id=>document.getElementById(id);

// ── settings state ──
const settings={tts:false,sound:false,compact:false,scroll:true,lines:false};
function loadSettings(){
  try{const s=JSON.parse(localStorage.getItem('arnav-settings')||'{}');Object.assign(settings,s);}catch(e){}
  Object.keys(settings).forEach(k=>{if(settings[k])$('tog-'+k)?.classList.add('on');});
  if(settings.compact)document.body.classList.add('compact-mode');
}
function saveSettings(){localStorage.setItem('arnav-settings',JSON.stringify(settings));}
function toggleSetting(k){
  settings[k]=!settings[k];
  $('tog-'+k).classList.toggle('on',settings[k]);
  if(k==='compact')document.body.classList.toggle('compact-mode',settings[k]);
  saveSettings();
  toast(settings[k]?'Setting enabled':'Setting disabled','info');
}
loadSettings();

// ── toast ──
function toast(msg,type='',dur=2800){
  const c=$('toasts'),d=document.createElement('div');
  const icons={ok:'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',err:'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',info:'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'};
  d.className='toast'+(type?' '+type:'');
  d.innerHTML=(icons[type]||icons.info)+`<span>${msg}</span>`;
  c.appendChild(d);
  setTimeout(()=>{d.style.opacity='0';d.style.transform='translateY(4px) scale(.95)';d.style.transition='.2s';setTimeout(()=>d.remove(),200);},dur);
}

// ── auth errors ──
function showErr(m){const e=$('aerr');e.textContent=m;e.classList.add('on');$('aok').classList.remove('on');}
function showOk(m){const e=$('aok');e.textContent=m;e.classList.add('on');$('aerr').classList.remove('on');}
function clearMsgs(){$('aerr').classList.remove('on');$('aok').classList.remove('on');}

// ── password strength ──
$('su-pass')?.addEventListener('input',function(){
  const v=this.value;
  if(!v){$('pw-strength').style.display='none';return;}
  $('pw-strength').style.display='block';
  let score=0;
  if(v.length>=8)score++;if(v.length>=12)score++;
  if(/[A-Z]/.test(v))score++;if(/[0-9]/.test(v))score++;if(/[^A-Za-z0-9]/.test(v))score++;
  const colors=['#e06b6b','#e0a832','#e0a832','#4ecb8a','#4ecb8a'];
  const labels=['Very weak','Weak','Fair','Strong','Very strong'];
  $('pw-bar').style.width=(score/5*100)+'%';
  $('pw-bar').style.background=colors[score-1]||colors[0];
  $('pw-label').textContent=labels[score-1]||'Very weak';
  $('pw-label').style.color=colors[score-1]||colors[0];
});

function togglePw(id,btn){
  const inp=$(id);
  const isText=inp.type==='text';
  inp.type=isText?'password':'text';
  btn.querySelector('svg').style.opacity=isText?'1':'.4';
}

// ── page switch ──
function onLogout(){$('auth-page').classList.remove('hidden');$('chat-page').classList.add('hidden');}
function onLogin(u){
  $('auth-page').classList.add('hidden');$('chat-page').classList.remove('hidden');
  const n=u.displayName||u.email.split('@')[0];
  $('u-avatar').textContent=n.slice(0,2).toUpperCase();
  $('u-name').textContent=n;$('u-email').textContent=u.email;
  if(window.innerWidth<=720)closeSb();else openSb();
  currentUserId=u.uid;
  sessionStart=Date.now();
  loadFirestoreHistory(u.uid);
  loadBookmarks(u.uid);
  setTimeout(showWelcome,700);
}

// ── tab switch ──
function switchTab(t){
  clearMsgs();
  $('tab-in').classList.toggle('on',t==='in');$('tab-up').classList.toggle('on',t==='up');
  $('form-in').classList.toggle('off',t!=='in');$('form-up').classList.toggle('off',t!=='up');
  $('auth-title').textContent=t==='in'?'Welcome back':'Create account';
  $('auth-sub').textContent=t==='in'?'Sign in to your account to continue.':'Join Arnav AI — it\'s free.';
}

// ── auth ──
async function doSignIn(){
  clearMsgs();
  const e=$('si-email').value.trim(),p=$('si-pass').value;
  if(!e||!p){showErr('Please fill in all fields.');return;}
  const b=$('si-btn');b.disabled=true;b.textContent='Signing in…';
  try{await window._signIn(window._auth,e,p);}
  catch(err){showErr(fmtErr(err.code));b.disabled=false;b.textContent='Sign In';}
}
async function doSignUp(){
  clearMsgs();
  const n=$('su-name').value.trim(),e=$('su-email').value.trim(),p=$('su-pass').value;
  if(!n||!e||!p){showErr('Please fill in all fields.');return;}
  if(p.length<8){showErr('Password must be at least 8 characters.');return;}
  const b=$('su-btn');b.disabled=true;b.textContent='Creating account…';
  try{
    const c=await window._signUp(window._auth,e,p);
    await window._upPro(c.user,{displayName:n});
  }catch(err){showErr(fmtErr(err.code));b.disabled=false;b.textContent='Create Account';}
}
async function doGoogle(){
  clearMsgs();
  try{await window._gPop(window._auth,window._gp);}
  catch(e){if(e.code!=='auth/popup-closed-by-user')showErr(fmtErr(e.code));}
}
async function doSignOut(){
  try{
    await window._fbOut(window._auth);
    currentUserId=null;sessionStart=null;
    allHistory=[];sessions={};msgs=[];currentChatId=null;chatTitle='';
    bookmarks=[];bookmarksSet=new Set();
    renderHistory([]);
  }catch(e){}
}
function fmtErr(c){
  return({'auth/invalid-email':'Invalid email address.','auth/user-not-found':'No account found with this email.',
  'auth/wrong-password':'Incorrect password.','auth/email-already-in-use':'This email is already in use.',
  'auth/weak-password':'Password is too weak.','auth/network-request-failed':'Network error. Check your connection.',
  'auth/too-many-requests':'Too many attempts. Please try again later.',
  'auth/invalid-credential':'Incorrect email or password.'}[c]||'Something went wrong. Please try again.');
}

// enter key on auth inputs
['si-email','si-pass'].forEach(id=>$(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')doSignIn();}));
['su-name','su-email','su-pass'].forEach(id=>$(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')doSignUp();}));

// ── sidebar ──
let sbState=true;
function openSb(){
  sbState=true;
  $('sidebar').classList.add('open');$('sidebar').classList.remove('closed');
  if(window.innerWidth<=720)$('sb-overlay').classList.add('on');
}
function closeSb(){
  sbState=false;
  $('sidebar').classList.remove('open');$('sidebar').classList.add('closed');
  $('sb-overlay').classList.remove('on');
}
function toggleSb(){sbState?closeSb():openSb();}
window.addEventListener('resize',()=>{if(window.innerWidth>720&&sbState){$('sidebar').classList.remove('closed');}});

// user menu
let uMenuOpen=false;
function toggleUserMenu(){
  uMenuOpen=!uMenuOpen;
  $('u-menu').classList.toggle('on',uMenuOpen);
  $('u-chevron').classList.toggle('up',uMenuOpen);
}
document.addEventListener('click',e=>{
  if($('user-card')&&!$('user-card').contains(e.target)){
    uMenuOpen=false;$('u-menu').classList.remove('on');$('u-chevron')?.classList.remove('up');
  }
});

// ── modals ──
function openSettings(){closeUserMenu();$('settings-modal').classList.add('on');}
function openShortcuts(){closeUserMenu();$('shortcuts-modal').classList.add('on');}
function closeUserMenu(){uMenuOpen=false;$('u-menu').classList.remove('on');$('u-chevron')?.classList.remove('up');}
function closeModal(id,e){if(e.target.id===id)closeModalId(id);}
function closeModalId(id){$(id).classList.remove('on');}

// ── chat history (Firestore + localStorage fallback) ──
let allHistory=[];
let currentUserId=null;
let sessionStart=null;

async function loadFirestoreHistory(uid){
  try{
    if(!window._db)throw new Error('db not ready');
    const coll=window._fsColl(window._db,'users',uid,'conversations');
    const q=window._fsQuery(coll,window._fsOrderBy('updatedAt','desc'),window._fsLimit(50));
    const snap=await window._fsGetAll(q);
    allHistory=[];sessions={};
    snap.forEach(docSnap=>{
      const data=docSnap.data();
      allHistory.push({id:data.id,title:data.title,ts:data.updatedAt?.seconds*1000||Date.now()});
      sessions[data.id]={msgs:data.msgs||[],title:data.title};
    });
    renderHistory(allHistory);
  }catch(e){
    // fallback to localStorage
    try{allHistory=JSON.parse(localStorage.getItem('arnav-history')||'[]');}catch(e2){allHistory=[];}
    renderHistory(allHistory);
  }
}

async function saveConversation(id,isNew){
  // Always keep localStorage as backup
  try{localStorage.setItem('arnav-history',JSON.stringify(allHistory));}catch(e){}
  if(!currentUserId||!sessions[id]||!window._db)return;
  const s=sessions[id];
  try{
    const ref=window._fsDoc(window._db,'users',currentUserId,'conversations',id);
    const data={id,title:s.title,msgs:s.msgs,msgCount:s.msgs.length,updatedAt:window._fsTimestamp()};
    if(isNew)data.createdAt=window._fsTimestamp();
    await window._fsSet(ref,data,{merge:true});
  }catch(e){}
}

function addToHistory(id,title,isNew){
  const existing=allHistory.find(h=>h.id===id);
  if(!existing){
    allHistory.unshift({id,title,ts:Date.now()});
    if(allHistory.length>50)allHistory=allHistory.slice(0,50);
  }else{
    existing.title=title;
  }
  renderHistory(allHistory);
  saveConversation(id,isNew);
}

function renderHistory(list){
  const c=$('hist-today');c.innerHTML='<div class="hist-label">Recent</div>';
  if(!list.length){c.innerHTML+='<div style="padding:8px 10px;font-size:12px;color:var(--text3);">No conversations yet</div>';return;}
  list.forEach(item=>{
    const d=document.createElement('div');
    d.className='hist-item'+(item.id===currentChatId?' on':'');
    d.dataset.id=item.id;
    d.innerHTML=`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
      <span class="hist-item-text">${esc(item.title)}</span>
      <button class="hist-del" onclick="delConversation(event,'${item.id}')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>`;
    d.addEventListener('click',e=>{if(!e.target.closest('.hist-del'))loadChat(item.id);});
    c.appendChild(d);
  });
}

async function delConversation(e,id){
  e.stopPropagation();
  allHistory=allHistory.filter(h=>h.id!==id);
  delete sessions[id];
  renderHistory(allHistory);
  try{localStorage.setItem('arnav-history',JSON.stringify(allHistory));}catch(e2){}
  if(currentUserId&&window._db){
    try{await window._fsDel(window._fsDoc(window._db,'users',currentUserId,'conversations',id));}catch(err){}
  }
  // Remove any bookmarks tied to this conversation
  const removed=bookmarks.filter(b=>b.conversationId===id);
  removed.forEach(b=>bookmarksSet.delete(b.conversationId+'-'+b.messageIndex));
  bookmarks=bookmarks.filter(b=>b.conversationId!==id);
  toast('Conversation deleted','info');
}

function filterHistory(q){
  const filtered=q?allHistory.filter(h=>h.title.toLowerCase().includes(q.toLowerCase())):allHistory;
  renderHistory(filtered);
}

// ── chat sessions ──
let sessions={};
let currentChatId=null;
let msgs=[];
let busy=false;
let chatTitle='';
let codeMode=false;
let stopRequested=false;

function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

function newChat(){
  if(busy){toast('Please wait for the response to finish','info');return;}
  currentChatId=genId();
  msgs=[];chatTitle='';
  $('tb-title').textContent='New conversation';
  $('msgs-inner').innerHTML=`<div class="empty-state" id="empty-state">
    <div class="empty-glyph"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg></div>
    <div class="empty-title">Hi, I'm Arnav AI</div>
    <div class="empty-sub">Your personal assistant powered by your own model.</div>
    <div class="chips-grid">
      <div class="chip" onclick="useChip(this)"><span class="chip-icon">✍️</span><div class="chip-text"><span class="chip-label">Write & Edit</span><span class="chip-hint">Emails, essays, code</span></div></div>
      <div class="chip" onclick="useChip(this)"><span class="chip-icon">🧠</span><div class="chip-text"><span class="chip-label">Explain & Learn</span><span class="chip-hint">Break down any topic</span></div></div>
      <div class="chip" onclick="useChip(this)"><span class="chip-icon">💡</span><div class="chip-text"><span class="chip-label">Brainstorm</span><span class="chip-hint">Ideas and strategies</span></div></div>
      <div class="chip" onclick="useChip(this)"><span class="chip-icon">🔍</span><div class="chip-text"><span class="chip-label">Summarize</span><span class="chip-hint">Get the key points</span></div></div>
    </div></div>`;
  renderHistory(allHistory);
  if(window.innerWidth<=720)closeSb();
  $('cinput').focus();
}

function loadChat(id){
  const s=sessions[id];if(!s)return;
  currentChatId=id;msgs=[...s.msgs];chatTitle=s.title;
  $('tb-title').textContent=chatTitle;
  $('msgs-inner').innerHTML='';
  msgs.forEach((m,i)=>{if(m.role==='user')appendUserBubble(m.content,i);else appendAIBubble(m.content,false,i);});
  renderHistory(allHistory);
  if(window.innerWidth<=720)closeSb();
  scrollDown();
}

// ── input mode toggles ──
function toggleWebMode(){
  $('btn-web').classList.toggle('on');
  const on=$('btn-web').classList.contains('on');
  toast(on?'Search context enabled':'Search context disabled','info');
}
function toggleCodeMode(){
  codeMode=!codeMode;
  $('btn-code').classList.toggle('on',codeMode);
  $('cinput').placeholder=codeMode?'Describe the code you need…':'Message Arnav AI…';
  toast(codeMode?'Code mode — ask me to write or debug code':'Code mode off','info');
}

// ── input ──
function onInput(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,160)+'px';
  $('send-btn').disabled=!el.value.trim()&&!busy;
  const len=el.value.length;
  const cc=$('char-count');
  cc.textContent=len+' / 2000';
  cc.className='char-count'+(len>1800?' warn':'')+(len>1950?' danger':'');
}
function onKey(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();}}

// ── global keyboard shortcuts ──
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'){
    if(e.key==='Escape'){e.target.blur();return;}
    return;
  }
  if(e.key==='/'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();$('cinput').focus();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();newChat();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='b'){e.preventDefault();toggleSb();return;}
  if((e.ctrlKey||e.metaKey)&&e.key===','){e.preventDefault();openSettings();return;}
});

// ── utils ──
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function tStr(){return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function scrollDown(){if(settings.scroll){const a=$('msgs-area');a.scrollTop=a.scrollHeight;}}

// ── markdown formatter ──
function fmt(raw){
  let t=raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  // fenced code blocks
  t=t.replace(/```(\w*)\n?([\s\S]*?)```/g,(m,lang,code)=>{
    const l=(lang||'code').toLowerCase();
    const trimmed=code.trim();
    let highlighted;
    try{
      const hljs=window.hljs;
      if(hljs){
        highlighted=l&&l!=='code'&&hljs.getLanguage(l)
          ?hljs.highlight(trimmed,{language:l,ignoreIllegals:true}).value
          :hljs.highlightAuto(trimmed).value;
      }else{
        highlighted=esc(trimmed);
      }
    }catch(e){highlighted=esc(trimmed);}
    return `<div class="code-block cb-${esc(l)}"><div class="code-header"><span class="code-lang-wrap"><span class="lang-dot"></span><span class="code-lang">${esc(l)}</span></span><button class="code-copy" onclick="copyCode(this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</button></div><pre><code class="hljs">${highlighted}</code></pre></div>`;
  });
  // inline code
  t=t.replace(/`([^`\n]+)`/g,'<code>$1</code>');
  // headings
  t=t.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  t=t.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  t=t.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  // bold & italic
  t=t.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>');
  t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  t=t.replace(/\*(.+?)\*/g,'<em>$1</em>');
  // blockquote
  t=t.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');
  // hr
  t=t.replace(/^---+$/gm,'<hr/>');
  // unordered lists
  t=t.replace(/(?:^[*\-] .+\n?)+/gm,m=>'<ul>'+m.replace(/^[*\-] (.+)$/gm,'<li>$1</li>')+'</ul>');
  // ordered lists
  t=t.replace(/(?:^\d+\. .+\n?)+/gm,m=>'<ol>'+m.replace(/^\d+\. (.+)$/gm,'<li>$1</li>')+'</ol>');
  // paragraphs
  const lines=t.split('\n');
  let out='',inP=false;
  for(const line of lines){
    const trimmed=line.trim();
    if(!trimmed){if(inP){out+='</p>';inP=false;} continue;}
    if(/^<(h[1-3]|ul|ol|blockquote|hr|div)/.test(trimmed)){if(inP){out+='</p>';inP=false;}out+=trimmed;}
    else{if(!inP){out+='<p>';inP=true;}else out+=' ';out+=trimmed;}
  }
  if(inP)out+='</p>';
  return out;
}

function copyCode(btn){
  const code=btn.closest('.code-block').querySelector('code');
  navigator.clipboard.writeText(code.innerText).then(()=>{
    btn.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Copied!';
    setTimeout(()=>{btn.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy';},2000);
  });
}

function copyText(btn){
  const body=btn.closest('.ai-body-wrap').querySelector('.ai-body');
  navigator.clipboard.writeText(body.innerText).then(()=>{
    const orig=btn.innerHTML;
    btn.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>Copied';
    setTimeout(()=>{btn.innerHTML=orig;},2000);
  });
}

function renderUserBubbleHtml(text,idx){
  return `<span class="user-bubble-text">${esc(text)}</span><button class="user-edit-btn" onclick="startEditMsg(${idx})" title="Edit message"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>`;
}

function appendUserBubble(text,msgIndex){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');
  d.className='msg msg-user';
  const bubble=document.createElement('div');
  bubble.className='user-bubble';
  if(msgIndex!==undefined)bubble.dataset.bubbleIdx=msgIndex;
  bubble.innerHTML=renderUserBubbleHtml(text,msgIndex);
  d.appendChild(bubble);
  $('msgs-inner').appendChild(d);
  scrollDown();
}

function bmBtnHtml(active){
  return `<svg fill="${active?'currentColor':'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>${active?'Bookmarked':'Bookmark'}`;
}

function appendAIBubble(text,webUsed,msgIndex){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');d.className='msg msg-ai';
  const wb=webUsed?'<span class="web-badge">🌐 web</span>':'';
  const mid='tts'+Date.now()+Math.random().toString(36).slice(2,5);
  const bmKey=(currentChatId&&msgIndex!==undefined)?currentChatId+'-'+msgIndex:'';
  const isBm=bmKey?bookmarksSet.has(bmKey):false;
  d.innerHTML=`<div class="ai-ava"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.2 7.5H18L13.5 10.8L15.3 16.5L10 13.2L4.7 16.5L6.5 10.8L2 7.5H7.8L10 2Z" fill="white"/></svg></div>
  <div class="ai-body-wrap">
    <div class="ai-meta">
      <span class="ai-name">${window.MODEL||'AI'}</span>
      <span class="ai-time">${tStr()}</span>${wb}
    </div>
    <div class="ai-body" id="${mid}">${fmt(text)}</div>
    <div class="ai-actions">
      <button class="act-btn" onclick="copyText(this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</button>
      <button class="act-btn" id="spk${mid}" onclick="speakMsg('${mid}',this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072"/></svg>Read aloud</button>
      <button class="act-btn" onclick="regenLast()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Regenerate</button>
      <button class="act-btn${isBm?' bookmarked':''}" data-bm-key="${bmKey}" onclick="toggleBookmark('${currentChatId}',${msgIndex},document.getElementById('${mid}').innerText,this)">${bmBtnHtml(isBm)}</button>
    </div>
  </div>`;
  $('msgs-inner').appendChild(d);scrollDown();
  return d;
}

function showTyping(){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');d.className='typing-msg';d.id='typing';
  d.innerHTML=`<div class="ai-ava"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.2 7.5H18L13.5 10.8L15.3 16.5L10 13.2L4.7 16.5L6.5 10.8L2 7.5H7.8L10 2Z" fill="white"/></svg></div>
  <div class="typing-dots"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>`;
  $('msgs-inner').appendChild(d);scrollDown();
}
function hideTyping(){const t=$('typing');if(t)t.remove();}

function stopGen(){stopRequested=true;toast('Generation stopped','info');}

function useChip(el){
  const label=el.querySelector('.chip-label')?.textContent||el.textContent;
  const prompts={'Write & Edit':'Help me write a professional email','Explain & Learn':'Explain how machine learning works in simple terms','Brainstorm':'Give me 5 creative ideas for a personal project','Summarize':'Summarize the key points of a topic I describe'};
  const text=prompts[label]||label;
  $('cinput').value=text;onInput($('cinput'));$('cinput').focus();
}

async function regenLast(){
  if(busy)return;
  const lastUser=msgs.filter(m=>m.role==='user').slice(-1)[0];
  if(!lastUser)return;
  // remove last AI message from msgs array and DOM
  if(msgs[msgs.length-1]?.role==='assistant')msgs.pop();
  const lastAiEl=$('msgs-inner').querySelector('.msg-ai:last-child');
  if(lastAiEl)lastAiEl.remove();
  await callAPI(lastUser.content,false);
}

// ── send ──
async function sendMsg(){
  if(busy)return;
  const inp=$('cinput'),text=inp.value.trim();
  if(!text)return;
  inp.value='';inp.style.height='auto';$('send-btn').disabled=true;$('char-count').textContent='0 / 2000';

  const isNew=!chatTitle;
  if(isNew){
    chatTitle=generateTitle(text);
    $('tb-title').textContent=chatTitle;
    if(!currentChatId)currentChatId=genId();
    addToHistory(currentChatId,chatTitle,true);
  }

  msgs.push({role:'user',content:text});
  appendUserBubble(text,msgs.length-1);
  updateStats(isNew);
  await callAPI(text,true);
}

async function callAPI(text,isNew){
  busy=true;stopRequested=false;
  $('send-btn').disabled=true;
  $('stop-btn').classList.add('on');
  showTyping();

  try{
    const tok=await window._auth.currentUser.getIdToken();
    const res=await fetch(window.API_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
      body:JSON.stringify({messages:msgs})
    });
    hideTyping();
    if(stopRequested){busy=false;$('stop-btn').classList.remove('on');$('send-btn').disabled=false;return;}
    if(!res.ok)throw new Error('API error '+res.status);
    const data=await res.json();
    const reply=data.response||data.generated_text||data.choices?.[0]?.message?.content||data.text||'(no response)';
    msgs.push({role:'assistant',content:reply});
    sessions[currentChatId]={msgs:[...msgs],title:chatTitle};
    saveConversation(currentChatId,false);
    const webUsed=data.web_search_used||false;
    appendAIBubble(reply,webUsed,msgs.length-1);
    if(settings.sound)playChime();
    if(settings.tts)autoSpeak(reply);
  }catch(err){
    hideTyping();
    appendAIBubble('⚠️ Could not reach the model.\n\n`'+err.message+'`\n\nCheck your HuggingFace Space is running.');
    toast('Connection error — check your Space','err');
  }
  busy=false;
  $('stop-btn').classList.remove('on');
  $('send-btn').disabled=!$('cinput').value.trim();
}

function playChime(){
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    o.frequency.value=880;o.type='sine';
    g.gain.setValueAtTime(0,ctx.currentTime);
    g.gain.linearRampToValueAtTime(.08,ctx.currentTime+.01);
    g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.4);
    o.start(ctx.currentTime);o.stop(ctx.currentTime+.4);
  }catch(e){}
}


// ══════════════════════════════════════
// FONT SIZE CONTROL
// ══════════════════════════════════════
let fontSize=parseInt(localStorage.getItem('arnav-fontsize')||'15');
function applyFontSize(){
  document.documentElement.style.setProperty('--chat-font',fontSize+'px');
  document.querySelectorAll('.ai-body,.user-bubble').forEach(el=>el.style.fontSize=fontSize+'px');
  const el=$('font-size-val');if(el)el.textContent=fontSize;
  localStorage.setItem('arnav-fontsize',fontSize);
}
function changeFontSize(delta){
  fontSize=Math.max(12,Math.min(20,fontSize+delta));
  applyFontSize();
}
// Apply on load
applyFontSize();

// ══════════════════════════════════════
// VOICE INPUT — American English STT
// ══════════════════════════════════════
let _recog=null,_voiceOn=false;

function toggleVoice(){
  if(!('SpeechRecognition' in window||'webkitSpeechRecognition' in window)){
    toast('Voice input requires Chrome or Edge','err'); return;
  }
  if(_voiceOn){ _killVoice(); return; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  _recog=new SR();
  _recog.lang='en-US';
  _recog.continuous=false;
  _recog.interimResults=true;
  _recog.maxAlternatives=1;
  _recog.onstart=()=>{
    _voiceOn=true;
    $('mic-btn').classList.add('on');
    $('input-box').classList.add('listening');
    $('cinput').placeholder='Listening… speak now 🎤';
    toast('🎤 Listening — speak clearly','info',8000);
  };
  _recog.onresult=ev=>{
    let txt='';
    for(let i=ev.resultIndex;i<ev.results.length;i++)
      txt+=ev.results[i][0].transcript;
    $('cinput').value=txt.trim();
    onInput($('cinput'));
  };
  _recog.onend=()=>{
    _voiceOn=false; _recog=null;
    $('mic-btn').classList.remove('on');
    $('input-box').classList.remove('listening');
    $('cinput').placeholder='Message Arnav AI…';
    if($('cinput').value.trim()) toast('Voice captured — press Enter to send','ok');
  };
  _recog.onerror=ev=>{
    _voiceOn=false; _recog=null;
    $('mic-btn').classList.remove('on');
    $('input-box').classList.remove('listening');
    $('cinput').placeholder='Message Arnav AI…';
    if(ev.error!=='no-speech'&&ev.error!=='aborted')
      toast('Mic error: '+ev.error,'err');
  };
  try{ _recog.start(); } catch(e){ toast('Could not start mic','err'); }
}
function _killVoice(){ try{ if(_recog){_recog.abort();_recog=null;} }catch(e){} }

// ══════════════════════════════════════
// VOICE OUTPUT — American English TTS
// (properly stops on second click)
// ══════════════════════════════════════
let _ttsBtn=null;  // the button currently speaking

function _getUSVoice(){
  const vs=window.speechSynthesis.getVoices();
  // Strict US English priority
  const prio=[
    v=>v.name==='Google US English',
    v=>v.name==='Microsoft Zira - English (United States)',
    v=>v.name==='Microsoft Mark - English (United States)',
    v=>v.name==='Microsoft David - English (United States)',
    v=>v.voiceURI&&v.voiceURI.includes('en_US'),
    v=>v.lang==='en-US'&&!v.localService,
    v=>v.lang==='en-US',
    v=>v.lang.startsWith('en-US'),
    v=>v.lang.startsWith('en'),
  ];
  for(const p of prio){ const v=vs.find(p); if(v)return v; }
  return vs[0]||null;
}

function _clearTtsBtn(){
  if(_ttsBtn){
    _ttsBtn.classList.remove('speaking');
    _ttsBtn.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072"/></svg>Read aloud';
    _ttsBtn=null;
  }
}

function speakMsg(mid, btn){
  // Clicking same button while speaking = STOP
  if(_ttsBtn===btn){
    window.speechSynthesis.cancel();
    _clearTtsBtn();
    return;
  }
  // Stop any existing speech
  window.speechSynthesis.cancel();
  _clearTtsBtn();
  const el=document.getElementById(mid);
  if(!el) return;
  _startTts(el.innerText, btn);
}

function autoSpeak(text){
  window.speechSynthesis.cancel();
  _clearTtsBtn();
  _startTts(text, null);
}

function _startTts(rawText, btn){
  if(!window.speechSynthesis) return;
  // Clean text: remove markdown, code blocks, emojis for cleaner audio
  const clean=rawText
    .replace(/```[\s\S]*?```/g,' ')
    .replace(/`[^`]+`/g,' ')
    .replace(/#{1,6}\s/g,'')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g,'$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
    .replace(/[🌐⚠️✅❌💡🔍✍️🧠🎤]/g,'')
    .replace(/\s+/g,' ')
    .trim()
    .slice(0,3000);

  if(!clean) return;
  const utt=new SpeechSynthesisUtterance(clean);
  utt.lang='en-US';
  utt.rate=0.92;
  utt.pitch=1.0;
  utt.volume=1.0;

  const _go=()=>{
    const v=_getUSVoice();
    if(v) utt.voice=v;
    if(btn){
      _ttsBtn=btn;
      btn.classList.add('speaking');
      btn.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Stop reading';
    }
    utt.onend=()=>{ _clearTtsBtn(); };
    utt.onerror=()=>{ _clearTtsBtn(); };
    window.speechSynthesis.speak(utt);
  };

  // Chrome loads voices async
  const voices=window.speechSynthesis.getVoices();
  if(voices.length>0){ _go(); }
  else{ window.speechSynthesis.onvoiceschanged=()=>{ window.speechSynthesis.onvoiceschanged=null; _go(); }; }
}

// ══════════════════════════════════════
// SHARE CONVERSATION
// ══════════════════════════════════════
function openShare(){
  if(!msgs||!msgs.length){ toast('No messages yet — start a conversation first','info'); return; }
  const c=$('share-msgs-preview');
  if(c){
    c.innerHTML=msgs.slice(0,8).map(m=>{
      const who=m.role==='user'?'<b>You</b>':'<b>Arnav AI</b>';
      return `<div class="share-msg-row">${who}: ${esc(m.content.slice(0,120))}${m.content.length>120?'…':''}</div>`;
    }).join('');
  }
  $('share-modal').classList.add('on');
}

function _shareText(){
  const dt=new Date().toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
  let t=`${chatTitle||'Arnav AI Conversation'}\nExported · ${dt}\n${'─'.repeat(50)}\n\n`;
  (msgs||[]).forEach(m=>{ t+=`${m.role==='user'?'You':'Arnav AI'}: ${m.content}\n\n`; });
  return t;
}

function doShare(type){
  const text=_shareText();
  if(type==='copy'){
    navigator.clipboard.writeText(text)
      .then(()=>{ toast('Copied to clipboard!','ok'); closeModalId('share-modal'); })
      .catch(()=>toast('Copy failed — try download instead','err'));
  } else if(type==='download'){
    const b=new Blob([text],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(b);
    const a=document.createElement('a');
    a.href=url;
    a.download=((chatTitle||'chat').replace(/[^a-z0-9]/gi,'-').toLowerCase().slice(0,40)||'arnav-ai-chat')+'.txt';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded!','ok'); closeModalId('share-modal');
  } else if(type==='native'){
    if(navigator.share){
      navigator.share({title:chatTitle||'Arnav AI Chat',text}).catch(()=>{});
    } else {
      navigator.clipboard.writeText(text).then(()=>toast('Copied (native share unavailable)','info'));
    }
    closeModalId('share-modal');
  }
}

// Ctrl+Shift+S → share
document.addEventListener('keydown',function(ev){
  if(ev.target.tagName==='INPUT'||ev.target.tagName==='TEXTAREA') return;
  if((ev.ctrlKey||ev.metaKey)&&ev.shiftKey&&(ev.key==='s'||ev.key==='S')){
    ev.preventDefault(); openShare();
  }
});

// ══════════════════════════════════════
// WELCOME TOAST (fix: only shows when logged in)
// ══════════════════════════════════════
function showWelcome(){
  if(window._auth&&window._auth.currentUser){
    const n=window._auth.currentUser.displayName||window._auth.currentUser.email.split('@')[0];
    toast('Welcome back, '+n+' 👋','ok',3000);
  }
}

// ══════════════════════════════════════
// PRELOAD TTS VOICES (Chrome needs this)
// ══════════════════════════════════════
if(window.speechSynthesis){
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged=()=>{
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged=null;
  };
}

// ══════════════════════════════════════
// AUTO-GENERATED TITLES
// ══════════════════════════════════════
function generateTitle(text){
  const clean=text.trim().replace(/\s+/g,' ');
  if(clean.length<=40)return clean.charAt(0).toUpperCase()+clean.slice(1);
  const cut=clean.slice(0,38);
  const lastSpace=cut.lastIndexOf(' ');
  const trimmed=lastSpace>15?cut.slice(0,lastSpace):cut;
  return trimmed.charAt(0).toUpperCase()+trimmed.slice(1)+'…';
}

// ══════════════════════════════════════
// MESSAGE EDITING
// ══════════════════════════════════════
function startEditMsg(idx){
  if(busy)return;
  const bubble=document.querySelector(`[data-bubble-idx="${idx}"]`);
  if(!bubble)return;
  const origText=msgs[idx]?.content||'';
  bubble.classList.add('editing');
  bubble.innerHTML=`<textarea class="user-edit-textarea" rows="3">${origText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea><div class="user-edit-actions"><button class="edit-cancel-btn">Cancel</button><button class="edit-save-btn">Save &amp; Resend</button></div>`;
  const ta=bubble.querySelector('textarea');
  ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
  ta.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,200)+'px';});
  ta.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();saveEditMsg(idx);}
    if(ev.key==='Escape')cancelEditMsg(idx);
  });
  bubble.querySelector('.edit-cancel-btn').onclick=()=>cancelEditMsg(idx);
  bubble.querySelector('.edit-save-btn').onclick=()=>saveEditMsg(idx);
}

function cancelEditMsg(idx){
  const bubble=document.querySelector(`[data-bubble-idx="${idx}"]`);
  if(!bubble)return;
  const origText=msgs[idx]?.content||'';
  bubble.classList.remove('editing');
  bubble.innerHTML=renderUserBubbleHtml(origText,idx);
}

async function saveEditMsg(idx){
  if(busy)return;
  const bubble=document.querySelector(`[data-bubble-idx="${idx}"]`);
  if(!bubble)return;
  const ta=bubble.querySelector('.user-edit-textarea');
  if(!ta)return;
  const newText=ta.value.trim();
  if(!newText){toast('Message cannot be empty','err');return;}

  // Update msgs array, drop everything after edited message
  msgs[idx]={role:'user',content:newText};
  msgs=msgs.slice(0,idx+1);

  // Remove all DOM messages after the edited bubble's parent
  const parentMsg=bubble.closest('.msg');
  if(parentMsg){
    let next=parentMsg.nextElementSibling;
    while(next){const rem=next;next=next.nextElementSibling;rem.remove();}
  }

  // Restore bubble
  bubble.classList.remove('editing');
  bubble.innerHTML=renderUserBubbleHtml(newText,idx);

  // Update session cache
  sessions[currentChatId]={msgs:[...msgs],title:chatTitle};

  // Re-call API
  await callAPI(newText,false);
}

// ══════════════════════════════════════
// USAGE STATS
// ══════════════════════════════════════
async function updateStats(isNewConv){
  if(!currentUserId||!window._db)return;
  try{
    const ref=window._fsDoc(window._db,'users',currentUserId,'stats');
    const data={totalMessages:window._fsIncrement(1),lastActiveAt:window._fsTimestamp()};
    if(isNewConv)data.totalConversations=window._fsIncrement(1);
    await window._fsSet(ref,data,{merge:true});
  }catch(e){}
}

function openStats(){
  closeUserMenu();
  const totalMsgs=allHistory.reduce((sum,h)=>sum+(sessions[h.id]?.msgs?.filter(m=>m.role==='user').length||0),0);
  const totalConvs=allHistory.length;
  const totalBms=bookmarks.length;
  const elapsed=sessionStart?Math.floor((Date.now()-sessionStart)/60000):0;
  const sessionStr=elapsed<1?'< 1 min':elapsed<60?elapsed+' min':Math.floor(elapsed/60)+'h '+(elapsed%60)+'m';
  $('stat-msgs').textContent=totalMsgs;
  $('stat-convs').textContent=totalConvs;
  $('stat-bms').textContent=totalBms;
  $('stat-session').textContent=sessionStr;
  $('stats-modal').classList.add('on');
}

// ══════════════════════════════════════
// BOOKMARKS
// ══════════════════════════════════════
let bookmarks=[];
let bookmarksSet=new Set();

async function loadBookmarks(uid){
  if(!uid||!window._db)return;
  try{
    const coll=window._fsColl(window._db,'users',uid,'bookmarks');
    const q=window._fsQuery(coll,window._fsOrderBy('createdAt','desc'));
    const snap=await window._fsGetAll(q);
    bookmarks=[];bookmarksSet=new Set();
    snap.forEach(docSnap=>{
      const data={id:docSnap.id,...docSnap.data()};
      bookmarks.push(data);
      bookmarksSet.add(data.conversationId+'-'+data.messageIndex);
    });
  }catch(e){}
}

async function toggleBookmark(convId,msgIdx,content,btn){
  if(!currentUserId){toast('Sign in to use bookmarks','err');return;}
  const key=convId+'-'+msgIdx;
  if(bookmarksSet.has(key)){
    const bm=bookmarks.find(b=>b.conversationId===convId&&b.messageIndex===msgIdx);
    bookmarks=bookmarks.filter(b=>!(b.conversationId===convId&&b.messageIndex===msgIdx));
    bookmarksSet.delete(key);
    btn.classList.remove('bookmarked');
    btn.innerHTML=bmBtnHtml(false);
    toast('Bookmark removed','info');
    if(bm&&window._db){
      try{await window._fsDel(window._fsDoc(window._db,'users',currentUserId,'bookmarks',bm.id));}catch(e){}
    }
  }else{
    const id=genId();
    const convTitle=sessions[convId]?.title||chatTitle||'Untitled';
    const data={id,conversationId:convId,conversationTitle:convTitle,messageIndex:msgIdx,content:content.trim().slice(0,500),createdAt:Date.now()};
    bookmarks.unshift(data);
    bookmarksSet.add(key);
    btn.classList.add('bookmarked');
    btn.innerHTML=bmBtnHtml(true);
    toast('Bookmarked ★','ok');
    if(window._db){
      try{
        const ref=window._fsDoc(window._db,'users',currentUserId,'bookmarks',id);
        await window._fsSet(ref,{...data,createdAt:window._fsTimestamp()});
      }catch(e){}
    }
  }
}

function openBookmarks(){
  closeUserMenu();
  const list=$('bm-list');
  list.innerHTML='';
  if(!bookmarks.length){
    list.innerHTML='<div class="bm-empty">No bookmarks yet.<br>Click the bookmark icon on any AI message to save it.</div>';
  }else{
    bookmarks.forEach(bm=>{
      const d=document.createElement('div');
      d.className='bm-item';
      const date=new Date(bm.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'});
      d.innerHTML=`<div class="bm-conv">${esc(bm.conversationTitle)}</div>
        <div class="bm-content">${esc(bm.content)}</div>
        <div class="bm-footer">
          <span class="bm-date">${date}</span>
          <button class="bm-del" onclick="removeBookmark(event,'${bm.id}','${bm.conversationId}',${bm.messageIndex})" title="Remove bookmark"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
        </div>`;
      d.querySelector('.bm-content').addEventListener('click',()=>{
        closeModalId('bookmarks-modal');
        if(bm.conversationId&&sessions[bm.conversationId])loadChat(bm.conversationId);
        else toast('Conversation no longer available','info');
      });
      list.appendChild(d);
    });
  }
  $('bookmarks-modal').classList.add('on');
}

async function removeBookmark(e,bmId,convId,msgIdx){
  e.stopPropagation();
  bookmarks=bookmarks.filter(b=>b.id!==bmId);
  bookmarksSet.delete(convId+'-'+msgIdx);
  // Update button in chat if visible
  const chatBtn=document.querySelector(`[data-bm-key="${convId}-${msgIdx}"]`);
  if(chatBtn){chatBtn.classList.remove('bookmarked');chatBtn.innerHTML=bmBtnHtml(false);}
  // Remove from DOM in modal
  const item=e.target.closest('.bm-item');
  if(item)item.remove();
  if(!$('bm-list').children.length){
    $('bm-list').innerHTML='<div class="bm-empty">No bookmarks yet.<br>Click the bookmark icon on any AI message to save it.</div>';
  }
  toast('Bookmark removed','info');
  if(currentUserId&&window._db){
    try{await window._fsDel(window._fsDoc(window._db,'users',currentUserId,'bookmarks',bmId));}catch(err){}
  }
}

// ── init ──
$('cinput').addEventListener('input',function(){$('send-btn').disabled=!this.value.trim();});
