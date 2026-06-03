/* ════════════════════════════════════════════
   ARNAV AI — MAIN SCRIPT
════════════════════════════════════════════ */
const $=id=>document.getElementById(id);

// ══════════════════════════════════════
// SPLASH SCREEN — hides after auth resolves
// ══════════════════════════════════════
function hideSplash(){
  const s=$('splash');
  if(!s)return;
  s.style.opacity='0';
  setTimeout(()=>s.remove(),320);
}

// ══════════════════════════════════════
// TAB TITLE INDICATOR
// ══════════════════════════════════════
const _origTitle=document.title;
let _tabFocused=true,_unread=0;
window.addEventListener('focus',()=>{_tabFocused=true;_unread=0;document.title=_origTitle;});
window.addEventListener('blur',()=>{_tabFocused=false;});
function _setGenerating(on){document.title=on?'⋯ Arnav AI':_origTitle;}
function _notifyResponse(){
  if(_tabFocused)return;
  _unread++;
  document.title=`(${_unread}) Arnav AI`;
}

// ══════════════════════════════════════
// FOOTER YEAR
// ══════════════════════════════════════
const fy=$('footer-year');
if(fy)fy.textContent=new Date().getFullYear();

// ══════════════════════════════════════
// THEME MANAGEMENT
// ══════════════════════════════════════
const THEMES={
  dark:{},
  dim:{'--bg':'#0d0f1a','--bg1':'#141723','--bg2':'#1a1e30','--bg3':'#20253e'},
  oled:{'--bg':'#000000','--bg1':'#040406','--bg2':'#07070f','--bg3':'#0b0b16'},
  light:{
    '--bg':'#f6f6fb','--bg1':'#eeeef7','--bg2':'#e5e5f0','--bg3':'#d8d8ea',
    '--text':'#0c0c1c','--text2':'#48487a','--text3':'#9898b8',
    '--border':'rgba(0,0,0,0.07)','--border2':'rgba(0,0,0,0.11)','--border3':'rgba(0,0,0,0.17)',
    '--glass':'rgba(236,236,246,0.82)','--glass2':'rgba(246,246,251,0.94)',
    '--glow':'rgba(107,94,248,0.12)','--glow2':'rgba(107,94,248,0.05)',
  }
};
const _THEME_VARS=['--bg','--bg1','--bg2','--bg3','--text','--text2','--text3',
  '--border','--border2','--border3','--glass','--glass2','--glow','--glow2'];

function applyTheme(name){
  localStorage.setItem('arnav-theme',name);
  const r=document.documentElement;
  r.dataset.theme=name;
  _THEME_VARS.forEach(p=>r.style.removeProperty(p));
  Object.entries(THEMES[name]||{}).forEach(([k,v])=>r.style.setProperty(k,v));
  document.querySelectorAll('.theme-opt').forEach(el=>el.classList.toggle('active',el.dataset.theme===name));
}
applyTheme(localStorage.getItem('arnav-theme')||'dark');

// ── settings state ──
const settings={tts:false,sound:false,compact:false,scroll:true,lines:false};
function loadSettings(){
  try{const s=JSON.parse(localStorage.getItem('arnav-settings')||'{}');Object.assign(settings,s);}catch(e){}
  Object.keys(settings).forEach(k=>{if(settings[k])$('tog-'+k)?.classList.add('on');});
  if(settings.compact)document.body.classList.add('compact-mode');
  // Load system prompt
  const sp=$('system-prompt-input');
  if(sp)sp.value=localStorage.getItem('arnav-system')||'';
}
function saveSettings(){localStorage.setItem('arnav-settings',JSON.stringify(settings));}
function resetSettings(){
  const hadLines=settings.lines;
  const defaults={tts:false,sound:false,compact:false,scroll:true,lines:false};
  Object.assign(settings,defaults);
  Object.keys(defaults).forEach(k=>{$('tog-'+k)?.classList.toggle('on',defaults[k]);});
  document.body.classList.remove('compact-mode');
  if(hadLines)applyLineNumbers();
  fontSize=15;applyFontSize();
  applyTheme('dark');
  saveSettings();
  toast('Settings reset to defaults','info');
}
function toggleSetting(k){
  settings[k]=!settings[k];
  $('tog-'+k).classList.toggle('on',settings[k]);
  if(k==='compact')document.body.classList.toggle('compact-mode',settings[k]);
  if(k==='lines')applyLineNumbers();
  saveSettings();
  toast(settings[k]?'Setting enabled':'Setting disabled','info');
}
loadSettings();

// ── system prompt ──
let systemPrompt=localStorage.getItem('arnav-system')||'';
function saveSystemPrompt(){
  systemPrompt=($('system-prompt-input').value||'').trim();
  localStorage.setItem('arnav-system',systemPrompt);
  toast(systemPrompt?'Instructions saved':'Instructions cleared','ok',2000);
}
function updateSysCount(){
  const ta=$('system-prompt-input');
  const c=$('sys-count');
  if(ta&&c)c.textContent=ta.value.length+' / 500';
}

// ── toast ──
function toast(msg,type='',dur=2800){
  const c=$('toasts'),d=document.createElement('div');
  const icons={
    ok:'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
    err:'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
    info:'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
  };
  d.className='toast'+(type?' '+type:'');
  d.innerHTML=(icons[type]||icons.info)+`<span>${msg}</span>`;
  c.prepend(d); // newest at top
  setTimeout(()=>{d.style.opacity='0';d.style.transform='translateY(-4px) scale(.95)';d.style.transition='.2s';setTimeout(()=>d.remove(),200);},dur);
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
  const inp=$(id);const isText=inp.type==='text';
  inp.type=isText?'password':'text';
  btn.querySelector('svg').style.opacity=isText?'1':'.4';
}

// ── page switch ──
function onLogout(){
  $('auth-page').classList.remove('hidden');
  $('chat-page').classList.add('hidden');
  hideSplash();
}
function onLogin(u){
  $('auth-page').classList.add('hidden');
  $('chat-page').classList.remove('hidden');
  hideSplash();
  const n=u.displayName||u.email.split('@')[0];
  $('u-avatar').textContent=n.slice(0,2).toUpperCase();
  $('u-name').textContent=n;$('u-email').textContent=u.email;
  if(window.innerWidth<=720)closeSb();else openSb();
  currentUserId=u.uid;sessionStart=Date.now();
  // Clear any stale chat UI from a previous session
  msgs=[];chatTitle='';currentChatId=genId();busy=false;
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
  loadFirestoreHistory(u.uid);
  loadBookmarks(u.uid);
  loadSubscription();
  _handleStripeRedirect();
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
    _currentPlan='free';_applyPlanUI('free');
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
['si-email','si-pass'].forEach(id=>$(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')doSignIn();}));
['su-name','su-email','su-pass'].forEach(id=>$(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')doSignUp();}));

// ── sidebar ──
let sbState=false;
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
window.addEventListener('resize',()=>{
  if(window.innerWidth>720){
    if(sbState){$('sidebar').classList.remove('closed');$('sidebar').classList.add('open');}
    $('sb-overlay').classList.remove('on');
  }
});

// ── Mobile swipe gesture ──
(function initSwipe(){
  let sx=0,sy=0;
  document.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
  document.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-sx;
    const dy=Math.abs(e.changedTouches[0].clientY-sy);
    if(dy>60)return;
    if(dx>55&&sx<35&&!sbState)openSb();
    else if(dx<-55&&sbState&&window.innerWidth<=720)closeSb();
  },{passive:true});
})();

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
function openSettings(){
  closeUserMenu();
  const sp=$('system-prompt-input');
  if(sp)sp.value=systemPrompt;
  updateSysCount();
  $('settings-modal').classList.add('on');
}
function openShortcuts(){closeUserMenu();$('shortcuts-modal').classList.add('on');}
function closeUserMenu(){uMenuOpen=false;$('u-menu').classList.remove('on');$('u-chevron')?.classList.remove('up');}
function closeModal(id,e){if(e.target.id===id)closeModalId(id);}
function closeModalId(id){$(id).classList.remove('on');}

// ── chat history ──
let allHistory=[],currentUserId=null,sessionStart=null;

async function loadFirestoreHistory(uid){
  try{
    if(!window._db)throw new Error('db not ready');
    const coll=window._fsColl(window._db,'users',uid,'conversations');
    const q=window._fsQuery(coll,window._fsOrderBy('updatedAt','desc'),window._fsLimit(50));
    const snap=await window._fsGetAll(q);
    allHistory=[];sessions={};
    snap.forEach(docSnap=>{
      const data=docSnap.data();
      allHistory.push({id:data.id,title:data.title,ts:data.updatedAt?.seconds*1000||Date.now(),pinned:data.pinned||false});
      sessions[data.id]={msgs:data.msgs||[],title:data.title};
    });
  }catch(e){
    try{allHistory=JSON.parse(localStorage.getItem('arnav-history')||'[]');}catch(e2){allHistory=[];}
  }
  renderHistory(allHistory);
  restoreLastChat();
}

function restoreLastChat(){
  const lastId=localStorage.getItem('arnav-last-chat');
  if(lastId&&sessions[lastId])loadChat(lastId);
}

async function saveConversation(id,isNew){
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
    allHistory.unshift({id,title,ts:Date.now(),pinned:false});
    if(allHistory.length>50)allHistory=allHistory.slice(0,50);
  }else{existing.title=title;}
  renderHistory(allHistory);
  saveConversation(id,isNew);
}

function _getDateGroup(ts){
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
  if(ts>=today)return'Today';
  if(ts>=today-86400000)return'Yesterday';
  if(ts>=today-6*86400000)return'This Week';
  return'Older';
}

function _makeHistItem(item){
  const d=document.createElement('div');
  d.className='hist-item'+(item.id===currentChatId?' on':'')+(item.pinned?' pinned':'');
  d.dataset.id=item.id;
  const pinIco=item.pinned?'<svg class="pin-icon" fill="currentColor" viewBox="0 0 24 24" width="10" height="10"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>':'';
  d.innerHTML=`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
    <span class="hist-item-text" ondblclick="startRename(event,'${item.id}')">${esc(item.title)}</span>
    ${pinIco}
    <div class="hist-actions">
      <button class="hist-pin" onclick="togglePin(event,'${item.id}')" title="${item.pinned?'Unpin':'Pin'}"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg></button>
      <button class="hist-del" onclick="delConversation(event,'${item.id}')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
    </div>`;
  d.addEventListener('click',e=>{if(!e.target.closest('.hist-actions')&&e.target.contentEditable!=='true')loadChat(item.id);});
  return d;
}

function renderHistory(list){
  const c=$('sb-hist');
  c.innerHTML='';
  if(!list.length){
    c.innerHTML='<div style="padding:8px 10px;font-size:12px;color:var(--text3);">No conversations yet</div>';
    return;
  }
  const pinned=[...list].filter(h=>h.pinned).sort((a,b)=>b.ts-a.ts);
  const unpinned=[...list].filter(h=>!h.pinned).sort((a,b)=>b.ts-a.ts);
  const groups=[
    {label:'Pinned',items:pinned},
    {label:'Today',items:unpinned.filter(h=>_getDateGroup(h.ts)==='Today')},
    {label:'Yesterday',items:unpinned.filter(h=>_getDateGroup(h.ts)==='Yesterday')},
    {label:'This Week',items:unpinned.filter(h=>_getDateGroup(h.ts)==='This Week')},
    {label:'Older',items:unpinned.filter(h=>_getDateGroup(h.ts)==='Older')},
  ];
  groups.forEach(g=>{
    if(!g.items.length)return;
    const sec=document.createElement('div');sec.className='hist-section';
    sec.innerHTML=`<div class="hist-label">${g.label}</div>`;
    g.items.forEach(item=>sec.appendChild(_makeHistItem(item)));
    c.appendChild(sec);
  });
}

function startRename(e,id){
  e.stopPropagation();
  const textEl=e.target;
  if(textEl.contentEditable==='true')return;
  const orig=allHistory.find(h=>h.id===id)?.title||'';
  textEl.contentEditable='true';textEl.classList.add('renaming');textEl.focus();
  const sel=window.getSelection(),range=document.createRange();
  range.selectNodeContents(textEl);sel.removeAllRanges();sel.addRange(range);
  const finish=async()=>{
    textEl.contentEditable='false';textEl.classList.remove('renaming');
    const newTitle=textEl.textContent.trim()||orig;
    textEl.textContent=newTitle;
    if(newTitle!==orig){
      const h=allHistory.find(h=>h.id===id);if(h)h.title=newTitle;
      if(sessions[id])sessions[id].title=newTitle;
      if(id===currentChatId){chatTitle=newTitle;$('tb-title').textContent=newTitle;}
      await saveConversation(id,false);toast('Renamed','info',1500);
    }
  };
  textEl.addEventListener('blur',finish,{once:true});
  textEl.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'){ev.preventDefault();textEl.blur();}
    if(ev.key==='Escape'){textEl.textContent=orig;textEl.blur();}
  });
}

async function togglePin(e,id){
  e.stopPropagation();
  const h=allHistory.find(h=>h.id===id);if(!h)return;
  h.pinned=!h.pinned;
  renderHistory(allHistory);
  if(currentUserId&&window._db){
    try{await window._fsSet(window._fsDoc(window._db,'users',currentUserId,'conversations',id),{pinned:h.pinned},{merge:true});}catch(err){}
  }
  toast(h.pinned?'Pinned':'Unpinned','info',1500);
}

async function delConversation(e,id){
  e.stopPropagation();
  allHistory=allHistory.filter(h=>h.id!==id);
  delete sessions[id];
  renderHistory(allHistory);
  try{localStorage.setItem('arnav-history',JSON.stringify(allHistory));}catch(e2){}
  if(currentUserId&&window._db){try{await window._fsDel(window._fsDoc(window._db,'users',currentUserId,'conversations',id));}catch(err){}}
  const removed=bookmarks.filter(b=>b.conversationId===id);
  removed.forEach(b=>bookmarksSet.delete(b.conversationId+'-'+b.messageIndex));
  bookmarks=bookmarks.filter(b=>b.conversationId!==id);
  if(id===currentChatId)newChat();
  toast('Conversation deleted','info');
}

let _clearConfirmTimer=null;
function clearAllConversations(){
  closeUserMenu();
  if(_clearConfirmTimer){clearTimeout(_clearConfirmTimer);_clearConfirmTimer=null;_doClearAll();return;}
  toast('Tap "Clear all" again to confirm — this cannot be undone','err',3000);
  _clearConfirmTimer=setTimeout(()=>{_clearConfirmTimer=null;},3000);
}
async function _doClearAll(){
  if(currentUserId&&window._db){
    try{await Promise.all(allHistory.map(h=>window._fsDel(window._fsDoc(window._db,'users',currentUserId,'conversations',h.id))));}catch(e){}
  }
  allHistory=[];sessions={};msgs=[];currentChatId=null;chatTitle='';
  bookmarks=[];bookmarksSet=new Set();
  try{localStorage.removeItem('arnav-history');localStorage.removeItem('arnav-last-chat');}catch(e){}
  renderHistory([]);newChat();toast('All conversations cleared','info');
}

function filterHistory(q){
  const filtered=q?allHistory.filter(h=>h.title.toLowerCase().includes(q.toLowerCase())):allHistory;
  renderHistory(filtered);
}

// ══════════════════════════════════════
// DRAFT MESSAGE AUTO-SAVE
// ══════════════════════════════════════
let _draftTimer=null;
function saveDraft(){
  if(!currentChatId)return;
  clearTimeout(_draftTimer);
  _draftTimer=setTimeout(()=>{
    const val=$('cinput').value;
    if(val)localStorage.setItem('arnav-draft-'+currentChatId,val);
    else localStorage.removeItem('arnav-draft-'+currentChatId);
  },400);
}
function loadDraft(chatId){
  const draft=localStorage.getItem('arnav-draft-'+chatId)||'';
  if(draft){
    const inp=$('cinput');
    inp.value=draft;
    onInput(inp);
  }
}
function clearDraft(){
  if(!currentChatId)return;
  clearTimeout(_draftTimer);
  localStorage.removeItem('arnav-draft-'+currentChatId);
}

// ── chat sessions ──
let sessions={},currentChatId=null,msgs=[],busy=false,chatTitle='',codeMode=false,stopRequested=false;
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

function newChat(){
  if(busy){toast('Please wait for the response to finish','info');return;}
  closeConvSearch();
  currentChatId=genId();msgs=[];chatTitle='';
  // Clear any leftover input (don't persist draft from prior chat)
  const _inp=$('cinput');if(_inp){_inp.value='';_inp.style.height='auto';$('send-btn').disabled=true;$('char-count').textContent='0 / 2000';}
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
  closeConvSearch();
  currentChatId=id;msgs=[...s.msgs];chatTitle=s.title;
  $('tb-title').textContent=chatTitle;
  $('msgs-inner').innerHTML='';
  msgs.forEach((m,i)=>{if(m.role==='user')appendUserBubble(m.content,i);else appendAIBubble(m.content,false,i);});
  renderHistory(allHistory);
  if(window.innerWidth<=720)closeSb();
  scrollDown();
  localStorage.setItem('arnav-last-chat',id);
  loadDraft(id);
}

// ── input mode toggles ──
function toggleWebMode(){
  $('btn-web').classList.toggle('on');
  const on=$('btn-web').classList.contains('on');
  toast(on?'Web search enabled':'Web search off','info');
}
function toggleCodeMode(){
  codeMode=!codeMode;
  $('btn-code').classList.toggle('on',codeMode);
  $('cinput').placeholder=codeMode?'Describe the code you need…':'Message Arnav AI…';
  toast(codeMode?'Code mode on':'Code mode off','info');
}

// ── input history (↑/↓ arrows) ──
const _inputHistory=[];let _histIdx=-1;
function _saveInputHistory(text){
  if(text&&(_inputHistory.length===0||_inputHistory[0]!==text)){
    _inputHistory.unshift(text);
    if(_inputHistory.length>30)_inputHistory.pop();
  }
  _histIdx=-1;
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
  saveDraft();
}
function onKey(e){
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMsg();return;}
  const inp=$('cinput');
  if(e.key==='ArrowUp'&&inp.value===''&&_inputHistory.length){
    e.preventDefault();
    _histIdx=Math.min(_histIdx+1,_inputHistory.length-1);
    inp.value=_inputHistory[_histIdx];onInput(inp);
    inp.setSelectionRange(inp.value.length,inp.value.length);
  }
  if(e.key==='ArrowDown'&&_histIdx>-1){
    e.preventDefault();
    _histIdx=Math.max(_histIdx-1,-1);
    inp.value=_histIdx>=0?_inputHistory[_histIdx]:'';onInput(inp);
  }
}

// ── global keyboard shortcuts ──
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'){
    if(e.key==='Escape'){e.target.blur();closeConvSearch();return;}
    return;
  }
  if(e.key==='/'&&!e.ctrlKey&&!e.metaKey){e.preventDefault();$('cinput').focus();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();newChat();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='b'){e.preventDefault();toggleSb();return;}
  if((e.ctrlKey||e.metaKey)&&e.key===','){e.preventDefault();openSettings();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='/'){e.preventDefault();openShortcuts();return;}
  if((e.ctrlKey||e.metaKey)&&e.key==='f'){e.preventDefault();openConvSearch();return;}
});

// ── utils ──
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function tStr(){return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function scrollDown(){if(settings.scroll){const a=$('msgs-area');a.scrollTop=a.scrollHeight;}}
function scrollToBottom(){$('msgs-area').scrollTo({top:$('msgs-area').scrollHeight,behavior:'smooth'});}
function wordCount(t){return t.trim().split(/\s+/).filter(Boolean).length;}

// ── scroll-to-bottom button ──
(function initScrollBtn(){
  const btn=$('scroll-btn'),area=$('msgs-area');
  if(!btn||!area)return;
  area.addEventListener('scroll',()=>{
    btn.classList.toggle('visible',area.scrollHeight-area.scrollTop-area.clientHeight>200);
  });
})();

// ══════════════════════════════════════
// IN-CONVERSATION SEARCH
// ══════════════════════════════════════
let _searchMatches=[],_searchIdx=0;

function openConvSearch(){
  const bar=$('conv-search-bar');if(!bar)return;
  bar.classList.add('on');
  $('conv-search-input').focus();
}
function closeConvSearch(){
  const bar=$('conv-search-bar');if(!bar)return;
  bar.classList.remove('on');
  if($('conv-search-input'))$('conv-search-input').value='';
  clearSearchHighlights();
}
function doConvSearch(){
  clearSearchHighlights();
  const q=($('conv-search-input').value||'').trim().toLowerCase();
  const info=$('search-info');
  if(!q){if(info)info.textContent='';return;}
  _searchMatches=[];
  document.querySelectorAll('#msgs-inner .msg').forEach(msg=>{
    const el=msg.querySelector('.ai-body,.user-bubble-text');
    if(el&&el.textContent.toLowerCase().includes(q)){
      msg.classList.add('search-match');_searchMatches.push(msg);
    }
  });
  _searchIdx=0;
  if(info)info.textContent=_searchMatches.length?`1 / ${_searchMatches.length}`:'No results';
  if(_searchMatches.length){_searchMatches[0].classList.add('search-current');_searchMatches[0].scrollIntoView({behavior:'smooth',block:'center'});}
}
function clearSearchHighlights(){
  document.querySelectorAll('.search-match,.search-current').forEach(el=>el.classList.remove('search-match','search-current'));
  _searchMatches=[];
}
function searchNav(dir){
  if(!_searchMatches.length)return;
  _searchMatches[_searchIdx].classList.remove('search-current');
  _searchIdx=(_searchIdx+dir+_searchMatches.length)%_searchMatches.length;
  _searchMatches[_searchIdx].classList.add('search-current');
  _searchMatches[_searchIdx].scrollIntoView({behavior:'smooth',block:'center'});
  const info=$('search-info');
  if(info)info.textContent=`${_searchIdx+1} / ${_searchMatches.length}`;
}
function convSearchKey(e){
  if(e.key==='Enter'){e.preventDefault();searchNav(e.shiftKey?-1:1);}
  if(e.key==='Escape'){e.preventDefault();closeConvSearch();}
}

// ══════════════════════════════════════
// LINE NUMBERS
// ══════════════════════════════════════
function _addGutterTo(pre){
  if(pre.querySelector('.ln-gutter'))return;
  const code=pre.querySelector('code');if(!code)return;
  const lineCount=parseInt(pre.dataset.linecount)||code.innerText.trimEnd().split('\n').length;
  const g=document.createElement('div');
  g.className='ln-gutter';g.setAttribute('aria-hidden','true');
  g.textContent=Array.from({length:lineCount},(_,i)=>i+1).join('\n');
  pre.insertBefore(g,code);pre.classList.add('with-lines');
}
function applyLineNumbersTo(el){
  if(!settings.lines)return;
  (el||document).querySelectorAll('.code-block pre').forEach(_addGutterTo);
}
function applyLineNumbers(){
  document.querySelectorAll('.code-block pre').forEach(pre=>{
    const gutter=pre.querySelector('.ln-gutter');
    if(settings.lines&&!gutter)_addGutterTo(pre);
    else if(!settings.lines&&gutter){gutter.remove();pre.classList.remove('with-lines');}
  });
}

// ══════════════════════════════════════
// MARKDOWN FORMATTER
// ══════════════════════════════════════
function fmt(raw){
  let t=raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  t=t.replace(/```(\w*)\n?([\s\S]*?)```/g,(m,lang,code)=>{
    const l=(lang||'code').toLowerCase();
    const trimmed=code.trim();
    const lineCount=trimmed.split('\n').length;
    let highlighted;
    try{
      const hljs=window.hljs;
      if(hljs){
        highlighted=l&&l!=='code'&&hljs.getLanguage(l)
          ?hljs.highlight(trimmed,{language:l,ignoreIllegals:true}).value
          :hljs.highlightAuto(trimmed).value;
      }else highlighted=esc(trimmed);
    }catch(e){highlighted=esc(trimmed);}
    const wrapBtn=`<button class="code-expand-btn code-wrap-btn" onclick="toggleWrap(this)" title="Toggle word wrap"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h12a4 4 0 010 8h-4"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 15l-2 2 2 2"/></svg></button>`;
    const dlBtn=`<button class="code-expand-btn" onclick="downloadCode(this)" title="Download file"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button>`;
    const expandBtn=`<button class="code-expand-btn" onclick="openFullscreen(this)" title="Fullscreen"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg></button>`;
    const copyBtn=`<button class="code-copy" onclick="copyCode(this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</button>`;
    return `<div class="code-block cb-${esc(l)}"><div class="code-header"><span class="code-lang-wrap"><span class="lang-dot"></span><span class="code-lang">${esc(l)}</span><span class="code-line-count">${lineCount} line${lineCount!==1?'s':''}</span></span><div class="code-header-actions">${wrapBtn}${dlBtn}${expandBtn}${copyBtn}</div></div><pre data-linecount="${lineCount}"><code class="hljs">${highlighted}</code></pre></div>`;
  });
  t=t.replace(/`([^`\n]+)`/g,'<code>$1</code>');
  t=t.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  t=t.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  t=t.replace(/^# (.+)$/gm,'<h1>$1</h1>');
  t=t.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>');
  t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  t=t.replace(/\*(.+?)\*/g,'<em>$1</em>');
  t=t.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');
  t=t.replace(/^---+$/gm,'<hr/>');
  t=t.replace(/(?:^[*\-] .+\n?)+/gm,m=>'<ul>'+m.replace(/^[*\-] (.+)$/gm,'<li>$1</li>')+'</ul>');
  t=t.replace(/(?:^\d+\. .+\n?)+/gm,m=>'<ol>'+m.replace(/^\d+\. (.+)$/gm,'<li>$1</li>')+'</ol>');
  const lines=t.split('\n');let out='',inP=false;
  for(const line of lines){
    const trimmed=line.trim();
    if(!trimmed){if(inP){out+='</p>';inP=false;}continue;}
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

// ── Fullscreen code view ──
function openFullscreen(btn){
  const block=btn.closest('.code-block');
  const code=block.querySelector('code');
  const lang=block.querySelector('.code-lang').textContent;
  const langDot=block.querySelector('.lang-dot');
  const fsDot=$('fs-lang-dot');if(fsDot&&langDot)fsDot.className=langDot.className;
  const fsLang=$('fs-lang');if(fsLang)fsLang.textContent=lang;
  const fsCode=$('fs-code');
  if(fsCode){fsCode.innerHTML=code.innerHTML;fsCode.className=code.className;}
  $('fullscreen-modal').classList.add('on');
  if(settings.lines&&fsCode){
    const pre=fsCode.parentElement;
    if(pre&&!pre.querySelector('.ln-gutter'))_addGutterTo(pre);
  }
}
function closeFullscreenModal(e){if(e.target.id==='fullscreen-modal')closeModalId('fullscreen-modal');}
function copyFullscreen(){
  navigator.clipboard.writeText($('fs-code').innerText).then(()=>toast('Copied!','ok',2000));
}

// ── Code block: word-wrap toggle ──
function toggleWrap(btn){
  const pre=btn.closest('.code-block').querySelector('pre');
  const code=pre.querySelector('code');
  const wrapped=code.style.whiteSpace==='pre-wrap';
  code.style.whiteSpace=wrapped?'pre':'pre-wrap';
  pre.style.overflowX=wrapped?'auto':'hidden';
  btn.classList.toggle('on',!wrapped);
  btn.title=wrapped?'Toggle word wrap':'Unwrap';
}

// ── Code block: download as file ──
function downloadCode(btn){
  const block=btn.closest('.code-block');
  const lang=(block.querySelector('.code-lang').textContent||'').toLowerCase().trim();
  const code=block.querySelector('code');
  const extMap={js:'js',javascript:'js',ts:'ts',typescript:'ts',python:'py',py:'py',
    css:'css',scss:'scss',html:'html',xml:'xml',json:'json',
    bash:'sh',sh:'sh',shell:'sh',zsh:'sh',
    go:'go',rust:'rs',java:'java',cpp:'cpp',c:'c',
    php:'php',swift:'swift',kotlin:'kt',kt:'kt',rb:'rb',ruby:'rb',
    sql:'sql',yaml:'yml',yml:'yml',md:'md',markdown:'md'};
  const ext=extMap[lang]||'txt';
  const blob=new Blob([code.innerText],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='code.'+ext;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Downloaded as code.'+ext,'ok',2000);
}

// ── Message reactions ──
function rateMsg(val,btn){
  const wrap=btn.closest('.ai-actions');
  const wasOn=btn.classList.contains('rated');
  wrap.querySelectorAll('.rate-btn').forEach(b=>b.classList.remove('rated','rate-up','rate-down'));
  if(!wasOn){
    btn.classList.add('rated',val===1?'rate-up':'rate-down');
    toast(val===1?'Marked as helpful':'Feedback noted','info',2000);
    if(navigator.vibrate)navigator.vibrate(10);
  }
}

function renderUserBubbleHtml(text,idx){
  return `<span class="user-bubble-text">${esc(text)}</span><button class="user-edit-btn" onclick="startEditMsg(${idx})" title="Edit message"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>`;
}

function appendUserBubble(text,msgIndex){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');d.className='msg msg-user';
  const bubble=document.createElement('div');bubble.className='user-bubble';
  if(msgIndex!==undefined)bubble.dataset.bubbleIdx=msgIndex;
  bubble.innerHTML=renderUserBubbleHtml(text,msgIndex);
  d.appendChild(bubble);$('msgs-inner').appendChild(d);scrollDown();
}

function bmBtnHtml(active){
  return `<svg fill="${active?'currentColor':'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>${active?'Saved':'Save'}`;
}

function appendAIBubble(text,webUsed,msgIndex,elapsed){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');d.className='msg msg-ai';
  const wb=webUsed?'<span class="web-badge">🌐 web</span>':'';
  const mid='msg'+Date.now()+Math.random().toString(36).slice(2,5);
  const bmKey=(currentChatId&&msgIndex!==undefined)?currentChatId+'-'+msgIndex:'';
  const isBm=bmKey?bookmarksSet.has(bmKey):false;
  const timeBadge=elapsed?`<span class="resp-time">${elapsed}s</span>`:'';
  const wc=wordCount(text);
  const wcBadge=`<span class="word-badge">${wc}w</span>`;
  const _ft=new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  d.innerHTML=`<div class="ai-ava"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.2 7.5H18L13.5 10.8L15.3 16.5L10 13.2L4.7 16.5L6.5 10.8L2 7.5H7.8L10 2Z" fill="white"/></svg></div>
  <div class="ai-body-wrap">
    <div class="ai-meta">
      <span class="ai-name">${window.MODEL||'AI'}</span>
      <span class="ai-time" data-fulltime="${_ft}">${tStr()}</span>${wb}${timeBadge}${wcBadge}
    </div>
    <div class="ai-body" id="${mid}">${fmt(text)}</div>
    <div class="ai-actions">
      <button class="act-btn" onclick="copyText(this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</button>
      <button class="act-btn" id="spk${mid}" onclick="speakMsg('${mid}',this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072"/></svg>Read aloud</button>
      <button class="act-btn" onclick="regenLast()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Regenerate</button>
      <button class="act-btn${isBm?' bookmarked':''}" data-bm-key="${bmKey}" onclick="toggleBookmark('${currentChatId}',${msgIndex},document.getElementById('${mid}').innerText,this)">${bmBtnHtml(isBm)}</button>
      <div class="rate-group">
        <button class="act-btn rate-btn" onclick="rateMsg(1,this)" title="Helpful"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg></button>
        <button class="act-btn rate-btn" onclick="rateMsg(-1,this)" title="Not helpful"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg></button>
      </div>
    </div>
  </div>`;
  $('msgs-inner').appendChild(d);
  applyLineNumbersTo(d);
  scrollDown();
  return d;
}

function showTyping(){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');d.className='typing-msg';d.id='typing';
  d.innerHTML=`<div class="ai-ava"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.2 7.5H18L13.5 10.8L15.3 16.5L10 13.2L4.7 16.5L6.5 10.8L2 7.5H7.8L10 2Z" fill="white"/></svg></div>
  <div><div class="typing-dots"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div><div class="thinking-label">Thinking…</div></div>`;
  $('msgs-inner').appendChild(d);scrollDown();
}
function hideTyping(){const t=$('typing');if(t)t.remove();}
function stopGen(){stopRequested=true;toast('Stopping…','info',1500);}

function useChip(el){
  const label=el.querySelector('.chip-label')?.textContent||el.textContent;
  const prompts={'Write & Edit':'Help me write a professional email','Explain & Learn':'Explain how machine learning works in simple terms','Brainstorm':'Give me 5 creative ideas for a personal project','Summarize':'Summarize the key points of a topic I describe'};
  $('cinput').value=prompts[label]||label;onInput($('cinput'));$('cinput').focus();
}

async function regenLast(){
  if(busy)return;
  const lastUser=msgs.filter(m=>m.role==='user').slice(-1)[0];if(!lastUser)return;
  if(msgs[msgs.length-1]?.role==='assistant')msgs.pop();
  const lastAiEl=$('msgs-inner').querySelector('.msg-ai:last-child');
  if(lastAiEl)lastAiEl.remove();
  await callAPI(lastUser.content,false);
}

// ── send ──
async function sendMsg(){
  if(busy)return;
  const inp=$('cinput'),text=inp.value.trim();if(!text)return;
  if(navigator.vibrate)navigator.vibrate(5);
  _saveInputHistory(text);
  inp.value='';inp.style.height='auto';clearDraft();$('send-btn').disabled=true;$('char-count').textContent='0 / 2000';
  const isNew=!chatTitle;
  if(isNew){
    chatTitle=generateTitle(text);
    $('tb-title').textContent=chatTitle;
    if(!currentChatId)currentChatId=genId();
    addToHistory(currentChatId,chatTitle,true);
    localStorage.setItem('arnav-last-chat',currentChatId);
  }
  msgs.push({role:'user',content:text});
  appendUserBubble(text,msgs.length-1);
  updateStats(isNew);
  await callAPI(text,true);
}

// ══════════════════════════════════════
// STREAMING TYPEWRITER
// ══════════════════════════════════════
let _twInterval=null,_twOnDone=null,_twFullText='';

function _createStreamBubble(webUsed,msgIndex,elapsed){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');d.className='msg msg-ai';
  const wb=webUsed?'<span class="web-badge">🌐 web</span>':'';
  const mid='msg'+Date.now()+Math.random().toString(36).slice(2,5);
  const timeBadge=elapsed?`<span class="resp-time">${elapsed}s</span>`:'';
  const ft=new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  d.innerHTML=`<div class="ai-ava"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.2 7.5H18L13.5 10.8L15.3 16.5L10 13.2L4.7 16.5L6.5 10.8L2 7.5H7.8L10 2Z" fill="white"/></svg></div>
  <div class="ai-body-wrap">
    <div class="ai-meta">
      <span class="ai-name">${window.MODEL||'AI'}</span>
      <span class="ai-time" data-fulltime="${ft}">${tStr()}</span>${wb}${timeBadge}
    </div>
    <div class="ai-body streaming" id="${mid}"></div>
  </div>`;
  return{div:d,bodyEl:d.querySelector('.ai-body'),mid};
}

function _startTypewriter(fullText,bodyEl,bubbleDiv,msgIndex,onDone){
  _twFullText=fullText;_twOnDone=onDone;
  const tokens=fullText.split(/(\s+)/);
  let idx=0;
  const BATCH=5,MS=18;
  _twInterval=setInterval(()=>{
    let n=0;
    while(idx<tokens.length&&n<BATCH){bodyEl.textContent+=tokens[idx++];n++;}
    if(settings.scroll){const a=$('msgs-area');a.scrollTop=a.scrollHeight;}
    if(idx>=tokens.length)_finishTypewriter(fullText,bodyEl,bubbleDiv,msgIndex);
  },MS);
}

function _finishTypewriter(fullText,bodyEl,bubbleDiv,msgIndex){
  clearInterval(_twInterval);_twInterval=null;
  if(!bodyEl.classList.contains('streaming'))return; // guard against double-call
  bodyEl.classList.remove('streaming');
  const mid=bodyEl.id;
  const bmKey=(currentChatId&&msgIndex!==undefined)?currentChatId+'-'+msgIndex:'';
  const isBm=bmKey?bookmarksSet.has(bmKey):false;
  const wc=wordCount(fullText);
  // Replace plain text with formatted markdown
  bodyEl.innerHTML=fmt(fullText);
  // Add word count to meta
  const metaEl=bubbleDiv.querySelector('.ai-meta');
  if(metaEl&&!metaEl.querySelector('.word-badge')){
    metaEl.insertAdjacentHTML('beforeend',`<span class="word-badge">${wc}w</span>`);
  }
  // Add action buttons
  const wrap=bubbleDiv.querySelector('.ai-body-wrap');
  if(wrap&&!wrap.querySelector('.ai-actions')){
    const actDiv=document.createElement('div');
    actDiv.className='ai-actions';
    actDiv.innerHTML=`<button class="act-btn" onclick="copyText(this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</button>
      <button class="act-btn" id="spk${mid}" onclick="speakMsg('${mid}',this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072"/></svg>Read aloud</button>
      <button class="act-btn" onclick="regenLast()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Regenerate</button>
      <button class="act-btn${isBm?' bookmarked':''}" data-bm-key="${bmKey}" onclick="toggleBookmark('${currentChatId}',${msgIndex},document.getElementById('${mid}').innerText,this)">${bmBtnHtml(isBm)}</button>
      <div class="rate-group">
        <button class="act-btn rate-btn" onclick="rateMsg(1,this)" title="Helpful"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg></button>
        <button class="act-btn rate-btn" onclick="rateMsg(-1,this)" title="Not helpful"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg></button>
      </div>`;
    wrap.appendChild(actDiv);
  }
  applyLineNumbersTo(bubbleDiv);
  scrollDown();
  const cb=_twOnDone;_twOnDone=null;
  if(cb)cb();
}

function _skipTypewriter(){
  // Stop button pressed during streaming — show full text immediately
  clearInterval(_twInterval);_twInterval=null;
  const el=document.querySelector('.ai-body.streaming');
  if(el){
    const bubbleDiv=el.closest('.msg');
    _finishTypewriter(_twFullText,el,bubbleDiv,msgs.length-1);
  }
  $('stop-btn').onclick=stopGen;
}

async function callAPI(text,isNew){
  busy=true;stopRequested=false;
  $('send-btn').disabled=true;$('stop-btn').classList.add('on');
  _setGenerating(true);showTyping();
  const _t0=Date.now();
  let _streamStarted=false;
  try{
    const tok=await window._auth.currentUser.getIdToken();
    const msgsToSend=systemPrompt?[{role:'system',content:systemPrompt},...msgs]:msgs;
    const res=await fetch(window.API_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
      body:JSON.stringify({messages:msgsToSend})
    });
    hideTyping();
    if(stopRequested){busy=false;$('stop-btn').classList.remove('on');$('send-btn').disabled=false;_setGenerating(false);return;}
    if(!res.ok)throw new Error('API error '+res.status);
    const data=await res.json();
    const reply=data.response||data.generated_text||data.choices?.[0]?.message?.content||data.text||'(no response)';
    const elapsed=((Date.now()-_t0)/1000).toFixed(1);
    msgs.push({role:'assistant',content:reply});
    sessions[currentChatId]={msgs:[...msgs],title:chatTitle};
    saveConversation(currentChatId,false);
    // Start streaming typewriter — busy stays true until onDone fires
    _streamStarted=true;
    const sb=_createStreamBubble(data.web_search_used||false,msgs.length-1,elapsed);
    $('msgs-inner').appendChild(sb.div);
    scrollDown();
    $('stop-btn').onclick=_skipTypewriter; // override stop during streaming
    _startTypewriter(reply,sb.bodyEl,sb.div,msgs.length-1,()=>{
      $('stop-btn').onclick=stopGen; // restore
      if(settings.sound)playChime();
      if(settings.tts)autoSpeak(reply);
      _notifyResponse();
      busy=false;
      $('stop-btn').classList.remove('on');
      $('send-btn').disabled=!$('cinput').value.trim();
      _setGenerating(false);
    });
  }catch(err){
    hideTyping();
    appendAIBubble('⚠️ Could not reach the model.\n\n`'+err.message+'`\n\nCheck your HuggingFace Space is running.');
    toast('Connection error — check your Space','err');
  }
  // Only clean up if streaming didn't start (error path or pre-stream stopRequested)
  if(!_streamStarted){
    busy=false;$('stop-btn').classList.remove('on');$('send-btn').disabled=!$('cinput').value.trim();
    _setGenerating(false);
  }
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
// FONT SIZE
// ══════════════════════════════════════
let fontSize=parseInt(localStorage.getItem('arnav-fontsize')||'15');
function applyFontSize(){
  document.documentElement.style.setProperty('--chat-font',fontSize+'px');
  document.querySelectorAll('.ai-body,.user-bubble').forEach(el=>el.style.fontSize=fontSize+'px');
  const el=$('font-size-val');if(el)el.textContent=fontSize;
  localStorage.setItem('arnav-fontsize',fontSize);
}
function changeFontSize(delta){fontSize=Math.max(12,Math.min(20,fontSize+delta));applyFontSize();}
applyFontSize();

// ══════════════════════════════════════
// VOICE INPUT
// ══════════════════════════════════════
let _recog=null,_voiceOn=false;
function toggleVoice(){
  if(!('SpeechRecognition' in window||'webkitSpeechRecognition' in window)){toast('Voice input requires Chrome or Edge','err');return;}
  if(_voiceOn){_killVoice();return;}
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  _recog=new SR();_recog.lang='en-US';_recog.continuous=false;_recog.interimResults=true;_recog.maxAlternatives=1;
  _recog.onstart=()=>{_voiceOn=true;$('mic-btn').classList.add('on');$('input-box').classList.add('listening');$('cinput').placeholder='Listening… 🎤';toast('🎤 Listening','info',8000);if(navigator.vibrate)navigator.vibrate([50,30,50]);};
  _recog.onresult=ev=>{let txt='';for(let i=ev.resultIndex;i<ev.results.length;i++)txt+=ev.results[i][0].transcript;$('cinput').value=txt.trim();onInput($('cinput'));};
  _recog.onend=()=>{_voiceOn=false;_recog=null;$('mic-btn').classList.remove('on');$('input-box').classList.remove('listening');$('cinput').placeholder='Message Arnav AI…';if($('cinput').value.trim())toast('Voice captured — press Enter to send','ok');};
  _recog.onerror=ev=>{_voiceOn=false;_recog=null;$('mic-btn').classList.remove('on');$('input-box').classList.remove('listening');$('cinput').placeholder='Message Arnav AI…';if(ev.error!=='no-speech'&&ev.error!=='aborted')toast('Mic error: '+ev.error,'err');};
  try{_recog.start();}catch(e){toast('Could not start mic','err');}
}
function _killVoice(){try{if(_recog){_recog.abort();_recog=null;}}catch(e){}}

// ══════════════════════════════════════
// VOICE OUTPUT
// ══════════════════════════════════════
let _ttsBtn=null;
function _getUSVoice(){
  const vs=window.speechSynthesis.getVoices();
  const prio=[v=>v.name==='Google US English',v=>v.name==='Microsoft Zira - English (United States)',v=>v.name==='Microsoft Mark - English (United States)',v=>v.voiceURI&&v.voiceURI.includes('en_US'),v=>v.lang==='en-US',v=>v.lang.startsWith('en')];
  for(const p of prio){const v=vs.find(p);if(v)return v;}
  return vs[0]||null;
}
function _clearTtsBtn(){
  if(_ttsBtn){_ttsBtn.classList.remove('speaking');_ttsBtn.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072"/></svg>Read aloud';_ttsBtn=null;}
}
function speakMsg(mid,btn){
  if(_ttsBtn===btn){window.speechSynthesis.cancel();_clearTtsBtn();return;}
  window.speechSynthesis.cancel();_clearTtsBtn();
  const el=document.getElementById(mid);if(!el)return;
  _startTts(el.innerText,btn);
}
function autoSpeak(text){window.speechSynthesis.cancel();_clearTtsBtn();_startTts(text,null);}
function _startTts(rawText,btn){
  if(!window.speechSynthesis)return;
  const clean=rawText.replace(/```[\s\S]*?```/g,' ').replace(/`[^`]+`/g,' ').replace(/#{1,6}\s/g,'').replace(/\*{1,3}([^*]+)\*{1,3}/g,'$1').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[🌐⚠️✅❌💡🔍✍️🧠🎤]/g,'').replace(/\s+/g,' ').trim().slice(0,3000);
  if(!clean)return;
  const utt=new SpeechSynthesisUtterance(clean);utt.lang='en-US';utt.rate=0.92;utt.pitch=1.0;utt.volume=1.0;
  const _go=()=>{const v=_getUSVoice();if(v)utt.voice=v;if(btn){_ttsBtn=btn;btn.classList.add('speaking');btn.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Stop reading';}utt.onend=()=>{_clearTtsBtn();};utt.onerror=()=>{_clearTtsBtn();};window.speechSynthesis.speak(utt);};
  if(window.speechSynthesis.getVoices().length>0)_go();
  else window.speechSynthesis.onvoiceschanged=()=>{window.speechSynthesis.onvoiceschanged=null;_go();};
}

// ══════════════════════════════════════
// SHARE + MARKDOWN EXPORT
// ══════════════════════════════════════
function openShare(){
  if(!msgs||!msgs.length){toast('No messages yet','info');return;}
  const c=$('share-msgs-preview');
  if(c){c.innerHTML=msgs.slice(0,6).map(m=>{const who=m.role==='user'?'<b>You</b>':'<b>Arnav AI</b>';return `<div class="share-msg-row">${who}: ${esc(m.content.slice(0,100))}${m.content.length>100?'…':''}</div>`;}).join('');}
  $('share-modal').classList.add('on');
}
function _shareText(){
  const dt=new Date().toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
  let t=`${chatTitle||'Arnav AI Conversation'}\nExported · ${dt}\n${'─'.repeat(50)}\n\n`;
  (msgs||[]).forEach(m=>{t+=`${m.role==='user'?'You':'Arnav AI'}: ${m.content}\n\n`;});
  return t;
}
function _markdownText(){
  const dt=new Date().toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
  let t=`# ${chatTitle||'Arnav AI Conversation'}\n\n*Exported on ${dt}*\n\n---\n\n`;
  (msgs||[]).forEach(m=>{t+=m.role==='user'?`**You:**\n\n${m.content}\n\n`:`**Arnav AI:**\n\n${m.content}\n\n`;t+='---\n\n';});
  return t;
}
function doShare(type){
  if(type==='copy'){
    navigator.clipboard.writeText(_shareText()).then(()=>{toast('Copied to clipboard!','ok');closeModalId('share-modal');}).catch(()=>toast('Copy failed','err'));
  }else if(type==='download'){
    const b=new Blob([_shareText()],{type:'text/plain;charset=utf-8'});
    const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;
    a.download=((chatTitle||'chat').replace(/[^a-z0-9]/gi,'-').toLowerCase().slice(0,40)||'arnav-ai')+'.txt';
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    toast('Downloaded!','ok');closeModalId('share-modal');
  }else if(type==='markdown'){
    const b=new Blob([_markdownText()],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;
    a.download=((chatTitle||'chat').replace(/[^a-z0-9]/gi,'-').toLowerCase().slice(0,40)||'arnav-ai')+'.md';
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    toast('Markdown downloaded!','ok');closeModalId('share-modal');
  }else if(type==='native'){
    if(navigator.share)navigator.share({title:chatTitle||'Arnav AI Chat',text:_shareText()}).catch(()=>{});
    else navigator.clipboard.writeText(_shareText()).then(()=>toast('Copied','info'));
    closeModalId('share-modal');
  }
}
document.addEventListener('keydown',function(ev){
  if(ev.target.tagName==='INPUT'||ev.target.tagName==='TEXTAREA')return;
  if((ev.ctrlKey||ev.metaKey)&&ev.shiftKey&&(ev.key==='s'||ev.key==='S')){ev.preventDefault();openShare();}
});

// ══════════════════════════════════════
// WELCOME
// ══════════════════════════════════════
function showWelcome(){
  if(window._auth&&window._auth.currentUser){
    const n=window._auth.currentUser.displayName||window._auth.currentUser.email.split('@')[0];
    toast('Welcome back, '+n+' 👋','ok',3000);
  }
}

if(window.speechSynthesis){window.speechSynthesis.getVoices();window.speechSynthesis.onvoiceschanged=()=>{window.speechSynthesis.getVoices();window.speechSynthesis.onvoiceschanged=null;};}

// ══════════════════════════════════════
// AUTO-GENERATED TITLES
// ══════════════════════════════════════
function generateTitle(text){
  const clean=text.trim().replace(/\s+/g,' ');
  if(clean.length<=40)return clean.charAt(0).toUpperCase()+clean.slice(1);
  const cut=clean.slice(0,38);const lastSpace=cut.lastIndexOf(' ');
  const trimmed=lastSpace>15?cut.slice(0,lastSpace):cut;
  return trimmed.charAt(0).toUpperCase()+trimmed.slice(1)+'…';
}

// ══════════════════════════════════════
// MESSAGE EDITING
// ══════════════════════════════════════
function startEditMsg(idx){
  if(busy)return;
  const bubble=document.querySelector(`[data-bubble-idx="${idx}"]`);if(!bubble)return;
  const origText=msgs[idx]?.content||'';
  bubble.classList.add('editing');
  bubble.innerHTML=`<textarea class="user-edit-textarea" rows="3">${origText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea><div class="user-edit-actions"><button class="edit-cancel-btn">Cancel</button><button class="edit-save-btn">Save &amp; Resend</button></div>`;
  const ta=bubble.querySelector('textarea');
  ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
  ta.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=Math.min(ta.scrollHeight,200)+'px';});
  ta.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();saveEditMsg(idx);}if(ev.key==='Escape')cancelEditMsg(idx);});
  bubble.querySelector('.edit-cancel-btn').onclick=()=>cancelEditMsg(idx);
  bubble.querySelector('.edit-save-btn').onclick=()=>saveEditMsg(idx);
}
function cancelEditMsg(idx){
  const bubble=document.querySelector(`[data-bubble-idx="${idx}"]`);if(!bubble)return;
  bubble.classList.remove('editing');bubble.innerHTML=renderUserBubbleHtml(msgs[idx]?.content||'',idx);
}
async function saveEditMsg(idx){
  if(busy)return;
  const bubble=document.querySelector(`[data-bubble-idx="${idx}"]`);if(!bubble)return;
  const ta=bubble.querySelector('.user-edit-textarea');if(!ta)return;
  const newText=ta.value.trim();if(!newText){toast('Message cannot be empty','err');return;}
  msgs[idx]={role:'user',content:newText};msgs=msgs.slice(0,idx+1);
  const parentMsg=bubble.closest('.msg');
  if(parentMsg){let next=parentMsg.nextElementSibling;while(next){const rem=next;next=next.nextElementSibling;rem.remove();}}
  bubble.classList.remove('editing');bubble.innerHTML=renderUserBubbleHtml(newText,idx);
  sessions[currentChatId]={msgs:[...msgs],title:chatTitle};
  await callAPI(newText,false);
}

// ══════════════════════════════════════
// USAGE STATS — Firestore synced
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
async function openStats(){
  closeUserMenu();
  const localMsgs=allHistory.reduce((sum,h)=>sum+(sessions[h.id]?.msgs?.filter(m=>m.role==='user').length||0),0);
  $('stat-msgs').textContent=localMsgs||'—';$('stat-convs').textContent=allHistory.length||'—';
  $('stat-bms').textContent=bookmarks.length;
  const elapsed=sessionStart?Math.floor((Date.now()-sessionStart)/60000):0;
  $('stat-session').textContent=elapsed<1?'< 1 min':elapsed<60?elapsed+' min':Math.floor(elapsed/60)+'h '+(elapsed%60)+'m';
  $('stats-modal').classList.add('on');
  if(currentUserId&&window._db){
    try{
      const snap=await window._fsGetDoc(window._fsDoc(window._db,'users',currentUserId,'stats'));
      if(snap.exists()){const data=snap.data();if(data.totalMessages!=null)$('stat-msgs').textContent=data.totalMessages;if(data.totalConversations!=null)$('stat-convs').textContent=data.totalConversations;}
    }catch(e){}
  }
}

// ══════════════════════════════════════
// BOOKMARKS
// ══════════════════════════════════════
let bookmarks=[],bookmarksSet=new Set();
async function loadBookmarks(uid){
  if(!uid||!window._db)return;
  try{
    const q=window._fsQuery(window._fsColl(window._db,'users',uid,'bookmarks'),window._fsOrderBy('createdAt','desc'));
    const snap=await window._fsGetAll(q);
    bookmarks=[];bookmarksSet=new Set();
    snap.forEach(docSnap=>{const data={id:docSnap.id,...docSnap.data()};bookmarks.push(data);bookmarksSet.add(data.conversationId+'-'+data.messageIndex);});
  }catch(e){}
}
async function toggleBookmark(convId,msgIdx,content,btn){
  if(!currentUserId){toast('Sign in to use bookmarks','err');return;}
  const key=convId+'-'+msgIdx;
  if(bookmarksSet.has(key)){
    const bm=bookmarks.find(b=>b.conversationId===convId&&b.messageIndex===msgIdx);
    bookmarks=bookmarks.filter(b=>!(b.conversationId===convId&&b.messageIndex===msgIdx));
    bookmarksSet.delete(key);btn.classList.remove('bookmarked');btn.innerHTML=bmBtnHtml(false);toast('Bookmark removed','info');
    if(bm&&window._db){try{await window._fsDel(window._fsDoc(window._db,'users',currentUserId,'bookmarks',bm.id));}catch(e){}}
  }else{
    const id=genId();const convTitle=sessions[convId]?.title||chatTitle||'Untitled';
    const data={id,conversationId:convId,conversationTitle:convTitle,messageIndex:msgIdx,content:content.trim().slice(0,500),createdAt:Date.now()};
    bookmarks.unshift(data);bookmarksSet.add(key);btn.classList.add('bookmarked');btn.innerHTML=bmBtnHtml(true);toast('Bookmarked ★','ok');
    if(window._db){try{await window._fsSet(window._fsDoc(window._db,'users',currentUserId,'bookmarks',id),{...data,createdAt:window._fsTimestamp()});}catch(e){}}
  }
}
function openBookmarks(){
  closeUserMenu();const list=$('bm-list');list.innerHTML='';
  if(!bookmarks.length){list.innerHTML='<div class="bm-empty">No bookmarks yet.<br>Tap the bookmark icon on any AI message.</div>';
  }else{
    bookmarks.forEach(bm=>{
      const d=document.createElement('div');d.className='bm-item';
      const date=new Date(bm.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'});
      d.innerHTML=`<div class="bm-conv">${esc(bm.conversationTitle)}</div><div class="bm-content">${esc(bm.content)}</div><div class="bm-footer"><span class="bm-date">${date}</span><button class="bm-del" onclick="removeBookmark(event,'${bm.id}','${bm.conversationId}',${bm.messageIndex})"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div>`;
      d.querySelector('.bm-content').addEventListener('click',()=>{closeModalId('bookmarks-modal');if(bm.conversationId&&sessions[bm.conversationId])loadChat(bm.conversationId);else toast('Conversation no longer available','info');});
      list.appendChild(d);
    });
  }
  $('bookmarks-modal').classList.add('on');
}
async function removeBookmark(e,bmId,convId,msgIdx){
  e.stopPropagation();
  bookmarks=bookmarks.filter(b=>b.id!==bmId);bookmarksSet.delete(convId+'-'+msgIdx);
  const chatBtn=document.querySelector(`[data-bm-key="${convId}-${msgIdx}"]`);
  if(chatBtn){chatBtn.classList.remove('bookmarked');chatBtn.innerHTML=bmBtnHtml(false);}
  const item=e.target.closest('.bm-item');if(item)item.remove();
  if(!$('bm-list').children.length)$('bm-list').innerHTML='<div class="bm-empty">No bookmarks yet.</div>';
  toast('Bookmark removed','info');
  if(currentUserId&&window._db){try{await window._fsDel(window._fsDoc(window._db,'users',currentUserId,'bookmarks',bmId));}catch(err){}}
}

// ══════════════════════════════════════
// SUBSCRIPTION & PRICING
// ══════════════════════════════════════
let _currentPlan='free';

function _backendUrl(){
  return window.BACKEND_URL||(window.API_URL||'').replace(/\/chat\/?$/,'');
}

async function loadSubscription(){
  if(!currentUserId||!window._db)return;
  try{
    const snap=await window._fsGetDoc(window._fsDoc(window._db,'users',currentUserId,'subscription'));
    _currentPlan=snap.exists()?snap.data().plan||'free':'free';
  }catch(e){_currentPlan='free';}
  _applyPlanUI(_currentPlan);
}

function _applyPlanUI(plan){
  _currentPlan=plan;
  const badge=$('u-plan-badge');
  if(badge){
    if(plan==='plus'){badge.textContent='⚡ Plus';badge.className='u-plan-badge plus';badge.style.display='';}
    else if(plan==='pro'){badge.textContent='👑 Pro';badge.className='u-plan-badge pro';badge.style.display='';}
    else{badge.style.display='none';}
  }
  const upBtn=$('upgrade-topbar-btn');
  if(upBtn)upBtn.style.display=(plan==='free')?'':'none';
}

function _showCheckoutOverlay(){
  const o=$('checkout-overlay');if(o)o.style.display='flex';
}
function _hideCheckoutOverlay(){
  const o=$('checkout-overlay');if(o)o.style.display='none';
}

function openPlans(){
  closeUserMenu();
  _syncPlanCards();
  $('pricing-modal').classList.add('on');
}

function _syncPlanCards(){
  const plans=['free','plus','pro'];
  plans.forEach(p=>{
    const card=$('plan-card-'+p);
    const badge=$('badge-'+p);
    const cta=$('cta-'+p);
    if(!card)return;
    const isCurrent=p===_currentPlan;
    card.classList.toggle('plan-active',isCurrent);
    if(badge)badge.style.display=isCurrent?'':'none';
    if(!cta)return;
    if(isCurrent){
      cta.textContent='Current Plan';
      cta.disabled=true;
      cta.className='plan-cta plan-cta-'+p;
    }else if(p==='free'){
      cta.textContent='Cancel Subscription';
      cta.disabled=false;
      cta.className='plan-cta plan-cta-free';
    }else if(p==='plus'){
      const label=_currentPlan==='pro'?'Downgrade to Plus':'Upgrade to Plus';
      cta.textContent=label;
      cta.disabled=false;
      cta.className='plan-cta plan-cta-plus';
    }else if(p==='pro'){
      cta.textContent='Upgrade to Pro';
      cta.disabled=false;
      cta.className='plan-cta plan-cta-pro';
    }
  });
}

async function buyPlan(planId){
  if(planId===_currentPlan){toast('This is already your current plan','info');return;}
  if(planId==='free'){toast('To cancel, visit your Stripe customer portal or contact support.','info',5000);return;}

  const cta=$('cta-'+planId);
  const origText=cta?cta.textContent:'';
  if(cta){cta.disabled=true;cta.textContent='Redirecting…';}

  try{
    const user=window._auth?.currentUser;
    if(!user)throw new Error('Not signed in');
    const tok=await user.getIdToken();
    const base=_backendUrl();
    const origin=window.location.origin||window.location.href.replace(/[^/]*$/,'');
    const path=window.location.pathname||'/';
    const successUrl=origin+path+'?payment=success&plan='+planId;
    const cancelUrl =origin+path+'?payment=cancelled';

    let res;
    try{
      res=await fetch(base+'/create-checkout-session',{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
        body:JSON.stringify({
          plan:planId,
          success_url:successUrl,
          cancel_url:cancelUrl,
          user_email:user.email||'',
          uid:user.uid||'',
        })
      });
    }catch(fetchErr){
      throw new Error('Cannot reach payment server. Make sure server.js is running (npm install && node server.js).');
    }

    if(!res.ok){
      const errBody=await res.json().catch(()=>({}));
      throw new Error(errBody.detail||'Server error '+res.status);
    }
    const data=await res.json();
    if(data.url){
      _showCheckoutOverlay();
      window.location.href=data.url;
    }else throw new Error('No checkout URL returned');
  }catch(err){
    toast(err.message,'err',6000);
    if(cta){cta.disabled=false;cta.textContent=origText;}
    _hideCheckoutOverlay();
  }
}

async function _verifyAndSaveSession(sessionId,planHint){
  if(sessionId){
    try{
      const tok=await window._auth.currentUser.getIdToken();
      const res=await fetch(_backendUrl()+'/verify-session/'+sessionId,{
        headers:{'Authorization':'Bearer '+tok}
      });
      if(res.ok){
        const data=await res.json();
        await _persistSubscription(data.plan,data.customer_id,data.subscription_id);
        return data.plan;
      }
    }catch(e){}
  }
  // Fallback: trust URL plan param
  if(planHint==='plus'||planHint==='pro'){
    await _persistSubscription(planHint,'','');
    return planHint;
  }
  return null;
}

async function _persistSubscription(plan,customerId,subId){
  if(!currentUserId||!window._db)return;
  try{
    await window._fsSet(
      window._fsDoc(window._db,'users',currentUserId,'subscription'),
      {plan,status:'active',stripeCustomerId:customerId||'',
       stripeSubscriptionId:subId||'',updatedAt:window._fsTimestamp()},
      {merge:true}
    );
    _currentPlan=plan;
  }catch(e){}
}

async function _handleStripeRedirect(){
  const params=new URLSearchParams(window.location.search);
  const payment=params.get('payment');
  if(!payment)return;
  // Clean up URL immediately
  window.history.replaceState({},'',window.location.pathname);

  if(payment==='success'){
    const sessionId=params.get('session_id');
    const planHint =params.get('plan')||'';
    const activePlan=await _verifyAndSaveSession(sessionId||'',planHint);
    if(activePlan){
      _applyPlanUI(activePlan);
      _syncPlanCards();
      const label=activePlan==='plus'?'Plus ⚡':'Pro 👑';
      setTimeout(()=>toast('🎉 Welcome to Arnav AI '+label+'!','ok',5000),800);
    }else{
      toast('Payment received — subscription activating…','ok',4000);
    }
  }else if(payment==='cancelled'){
    setTimeout(()=>toast('Payment cancelled','info',3000),400);
  }
}

// ── init ──
$('cinput').addEventListener('input',function(){$('send-btn').disabled=!this.value.trim();});
