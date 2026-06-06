/* ════════════════════════════════════════════
   ARNAV AI — MAIN SCRIPT
════════════════════════════════════════════ */
const $=id=>document.getElementById(id);

// Current Firebase user — stored on login for reliable access
let _fbUser=null;

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
const settings={tts:false,sound:false,compact:false,scroll:true,lines:false,alwaysNewChat:false,responseLength:'normal'};
const _LEN_INSTR={
  brief:'Be very concise. Use 1-3 sentences or a short paragraph at most.',
  detailed:'Be thorough and well-structured. Use examples, sub-sections, and clear explanations.',
  long:'Provide a comprehensive, in-depth response. Cover all aspects exhaustively with examples and context.'
};
const _LEN_LABELS={brief:'Brief',normal:'Normal',detailed:'Detailed',long:'Long'};
function loadSettings(){
  try{const s=JSON.parse(localStorage.getItem('arnav-settings')||'{}');Object.assign(settings,s);}catch(e){}
  Object.keys(settings).forEach(k=>{if(settings[k]&&k!=='responseLength')$('tog-'+k)?.classList.add('on');});
  if(settings.compact)document.body.classList.add('compact-mode');
  // Load system prompt
  const sp=$('system-prompt-input');
  if(sp)sp.value=localStorage.getItem('arnav-system')||'';
  _applyLenSetting();
}
function saveSettings(){localStorage.setItem('arnav-settings',JSON.stringify(settings));}
function resetSettings(){
  const hadLines=settings.lines;
  const defaults={tts:false,sound:false,compact:false,scroll:true,lines:false,alwaysNewChat:false,responseLength:'normal'};
  Object.assign(settings,defaults);
  Object.keys(defaults).forEach(k=>{$('tog-'+k)?.classList.toggle('on',defaults[k]);});
  document.body.classList.remove('compact-mode');
  if(hadLines)applyLineNumbers();
  fontSize=15;applyFontSize();
  applyTheme('dark');
  _applyLenSetting();
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
  _fbUser=u;
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
      <div class="chip" onclick="openFileAttach()"><span class="chip-icon">🖼️</span><div class="chip-text"><span class="chip-label">Analyze Image</span><span class="chip-hint">Upload &amp; ask about it</span></div></div>
      <div class="chip" onclick="openFileAttach()"><span class="chip-icon">📄</span><div class="chip-text"><span class="chip-label">Review Code/File</span><span class="chip-hint">Upload any code file</span></div></div>
    </div></div>`;
  // Apply gradient avatar immediately
  const _n=u.displayName||u.email.split('@')[0];
  $('u-avatar').style.background=_avatarGradient(_n);
  loadFirestoreHistory(u.uid);
  loadBookmarks(u.uid);
  loadSubscription().then(()=>_checkPendingSession());
  loadProfile(u.uid);
  _loadApiKeys();
  _updateModelSelector();
  _renderApiModelsCards();
  initPersona();
  renderDailyBar();
  _initFocusMode();
  _initDragDrop();
  _handleStripeRedirect();
  _saveUserMeta(u);
  setTimeout(showWelcome,700);
  setTimeout(()=>{if(window.location.hash==='#admin')_tryOpenAdmin();},800);
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
    _fbUser=null;
    currentUserId=null;sessionStart=null;
    allHistory=[];sessions={};msgs=[];currentChatId=null;chatTitle='';
    bookmarks=[];bookmarksSet=new Set();
    _currentPlan='free';_applyPlanUI('free');
    _userProfile={};
    _activePersona='assistant';_personaBasePrompt='';
    initPersona();
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
  _renderApiModelsCards();
  _refreshSysPromptTemplates();
  $('settings-modal').classList.add('on');
}

// ── System prompt templates (localStorage) ──
function _getSysPromptTemplates(){try{return JSON.parse(localStorage.getItem('arnav-sys-tpls')||'[]');}catch(e){return[];}}
function _setSysPromptTemplates(arr){localStorage.setItem('arnav-sys-tpls',JSON.stringify(arr));}
function _refreshSysPromptTemplates(){
  const sel=$('prompt-tpl-select');if(!sel)return;
  const tpls=_getSysPromptTemplates();
  sel.innerHTML='<option value="">Load saved template…</option>'+tpls.map(t=>`<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('');
  $('del-tpl-btn')&&($('del-tpl-btn').style.display='none');
}
function saveSysPromptTemplate(){
  const ta=$('system-prompt-input');if(!ta||!ta.value.trim()){toast('Enter a prompt first','info');return;}
  const name=prompt('Template name:','');if(!name||!name.trim())return;
  const tpls=_getSysPromptTemplates().filter(t=>t.name!==name.trim());
  tpls.unshift({name:name.trim(),prompt:ta.value.trim()});
  _setSysPromptTemplates(tpls.slice(0,20));
  _refreshSysPromptTemplates();
  toast('Template saved','ok',1800);
}
function loadSysPromptTemplate(name){
  if(!name)return;
  const tpls=_getSysPromptTemplates();
  const t=tpls.find(t=>t.name===name);if(!t)return;
  const ta=$('system-prompt-input');if(ta){ta.value=t.prompt;updateSysCount();}
  const delBtn=$('del-tpl-btn');if(delBtn)delBtn.style.display='';
}
function deleteSysPromptTemplate(){
  const sel=$('prompt-tpl-select');if(!sel||!sel.value)return;
  const name=sel.value;
  if(!confirm('Delete template "'+name+'"?'))return;
  _setSysPromptTemplates(_getSysPromptTemplates().filter(t=>t.name!==name));
  _refreshSysPromptTemplates();
  const ta=$('system-prompt-input');if(ta){ta.value='';updateSysCount();}
  toast('Template deleted','info');
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
      allHistory.push({id:data.id,title:data.title,ts:data.updatedAt?.seconds*1000||Date.now(),pinned:data.pinned||false,color:data.color||null});
      sessions[data.id]={msgs:data.msgs||[],title:data.title};
    });
  }catch(e){
    try{allHistory=JSON.parse(localStorage.getItem('arnav-history')||'[]');}catch(e2){allHistory=[];}
  }
  renderHistory(allHistory);
  if(!settings.alwaysNewChat)restoreLastChat();
}

function restoreLastChat(){
  const lastId=localStorage.getItem('arnav-last-chat');
  if(lastId&&sessions[lastId])loadChat(lastId);
}

function _stripImagesFromMsgs(msgs){
  // Strip binary image data before persisting to avoid bloating Firestore / localStorage.
  // The text content (embedded file blocks) is preserved; only dataUrl/base64 are removed.
  return msgs.map(m=>{
    if(!m.images||!m.images.length)return m;
    const {images,...rest}=m; // eslint-disable-line no-unused-vars
    return rest; // drop images entirely from stored msgs
  });
}

async function saveConversation(id,isNew){
  try{localStorage.setItem('arnav-history',JSON.stringify(allHistory));}catch(e){}
  if(!currentUserId||!sessions[id]||!window._db)return;
  const s=sessions[id];
  try{
    const ref=window._fsDoc(window._db,'users',currentUserId,'conversations',id);
    const safeMsgs=_stripImagesFromMsgs(s.msgs);
    const data={id,title:s.title,msgs:safeMsgs,msgCount:safeMsgs.length,updatedAt:window._fsTimestamp()};
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
  d.className='hist-item'+(item.id===currentChatId?' on':'')+(item.pinned?' pinned':'')+(item.color?' has-label':'')+(_bulkMode?' bulk-mode':'')+(_bulkSelected.has(item.id)?' bulk-sel':'');
  if(item.color)d.style.setProperty('--label-color',item.color);
  d.dataset.id=item.id;
  if(_bulkMode){
    d.onclick=()=>toggleBulkSelect(item.id);
    d.innerHTML=`<input type="checkbox" class="bulk-cb" ${_bulkSelected.has(item.id)?'checked':''} onclick="event.stopPropagation();toggleBulkSelect('${item.id}')">
      <span class="hist-item-text">${esc(item.title)}</span>`;
    return d;
  }
  const pinIco=item.pinned?'<svg class="pin-icon" fill="currentColor" viewBox="0 0 24 24" width="10" height="10"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg>':'';
  d.innerHTML=`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
    <span class="hist-item-text" ondblclick="startRename(event,'${item.id}')">${esc(item.title)}</span>
    ${pinIco}
    <div class="hist-actions">
      <button class="hist-color" onclick="openConvColorPicker(event,'${item.id}')" title="Add label"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg></button>
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

// ══════════════════════════════════════
// CONVERSATION COLOR LABELS
// ══════════════════════════════════════
let _colorPickerOpenId=null;
function openConvColorPicker(e,id){
  e.stopPropagation();
  const old=document.getElementById('_ccp_dd');
  if(old){old.remove();if(_colorPickerOpenId===id){_colorPickerOpenId=null;return;}}
  _colorPickerOpenId=id;
  const COLORS=[{hex:'',label:'Clear'},{hex:'#e06b6b',label:'Red'},{hex:'#e09a45',label:'Orange'},{hex:'#e0cc45',label:'Yellow'},{hex:'#4ecb8a',label:'Green'},{hex:'#4facfe',label:'Blue'},{hex:'#9d94ff',label:'Purple'}];
  const dd=document.createElement('div');
  dd.id='_ccp_dd';dd.className='conv-color-picker';
  dd.innerHTML=COLORS.map(c=>c.hex
    ?`<button class="ccp-swatch" style="background:${c.hex}" title="${c.label}" onclick="setConvColor('${id}','${c.hex}')"></button>`
    :`<button class="ccp-swatch ccp-clear" title="${c.label}" onclick="setConvColor('${id}','')">✕</button>`
  ).join('');
  document.body.appendChild(dd);
  const rect=e.currentTarget.getBoundingClientRect();
  dd.style.top=(rect.bottom+4)+'px';
  dd.style.left=Math.min(rect.left,window.innerWidth-180)+'px';
  setTimeout(()=>document.addEventListener('click',_ccpOutside,{once:true}),10);
}
function _ccpOutside(){const dd=document.getElementById('_ccp_dd');if(dd)dd.remove();_colorPickerOpenId=null;}
function setConvColor(id,color){
  const dd=document.getElementById('_ccp_dd');if(dd)dd.remove();_colorPickerOpenId=null;
  const h=allHistory.find(h=>h.id===id);if(!h)return;
  h.color=color||null;renderHistory(allHistory);
  if(currentUserId&&window._db){
    try{window._fsSet(window._fsDoc(window._db,'users',currentUserId,'conversations',id),{color:color||null},{merge:true}).catch(()=>{});}catch(err){}
  }
  toast(color?'Label applied':'Label removed','info',1500);
}

async function delConversationById(id){
  allHistory=allHistory.filter(h=>h.id!==id);
  delete sessions[id];
  try{localStorage.setItem('arnav-history',JSON.stringify(allHistory));}catch(e2){}
  if(currentUserId&&window._db){try{await window._fsDel(window._fsDoc(window._db,'users',currentUserId,'conversations',id));}catch(err){}}
  const removed=bookmarks.filter(b=>b.conversationId===id);
  removed.forEach(b=>bookmarksSet.delete(b.conversationId+'-'+b.messageIndex));
  bookmarks=bookmarks.filter(b=>b.conversationId!==id);
  if(id===currentChatId)newChat();
}
async function delConversation(e,id){
  e.stopPropagation();
  await delConversationById(id);
  renderHistory(allHistory);
  toast('Conversation deleted','info');
}

// ── Bulk conversation operations ──
let _bulkMode=false,_bulkSelected=new Set();
function toggleBulkMode(){
  _bulkMode=!_bulkMode;
  _bulkSelected.clear();
  $('bulk-action-bar').style.display=_bulkMode?'flex':'none';
  $('sb-bulk-btn')?.classList.toggle('on',_bulkMode);
  $('bulk-count-label').textContent='0 selected';
  renderHistory(allHistory);
}
function toggleBulkSelect(id){
  if(_bulkSelected.has(id))_bulkSelected.delete(id);
  else _bulkSelected.add(id);
  $('bulk-count-label').textContent=_bulkSelected.size+' selected';
  document.querySelectorAll('.hist-item[data-id="'+id+'"] .bulk-cb').forEach(cb=>cb.checked=_bulkSelected.has(id));
  document.querySelectorAll('.hist-item[data-id="'+id+'"]').forEach(el=>el.classList.toggle('bulk-sel',_bulkSelected.has(id)));
}
function bulkSelectAll(){
  allHistory.forEach(h=>_bulkSelected.add(h.id));
  $('bulk-count-label').textContent=_bulkSelected.size+' selected';
  document.querySelectorAll('.hist-item').forEach(el=>{
    el.classList.add('bulk-sel');
    const cb=el.querySelector('.bulk-cb');if(cb)cb.checked=true;
  });
}
async function bulkDelete(){
  const count=_bulkSelected.size;
  if(!count){toast('Nothing selected','info');return;}
  if(!confirm('Delete '+count+' conversation'+(count!==1?'s':'')+'?'))return;
  const ids=[..._bulkSelected];
  await Promise.all(ids.map(id=>delConversationById(id)));
  _bulkSelected.clear();
  toggleBulkMode();
  renderHistory(allHistory);
  toast('Deleted '+count+' conversation'+(count!==1?'s':''),'ok');
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
let webSearchMode=false; // tracks web search toggle

// ── file/image attachments ──
let _pendingAttachments=[];
const _imgStore={}; // stores dataUrls keyed by "msgIdx_imgIdx" for safe inline access
function genId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

function newChat(){
  // Allow new chat even while generating — ongoing generation saves silently
  closeConvSearch();
  currentChatId=genId();msgs=[];chatTitle='';
  // Clear any leftover input (don't persist draft from prior chat)
  const _inp=$('cinput');if(_inp){_inp.value='';_inp.style.height='auto';$('char-count').textContent='0 / 2000';}
  _pendingAttachments=[];_renderAttachPreviews();_updateSendBtn();
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
      <div class="chip" onclick="openFileAttach()"><span class="chip-icon">🖼️</span><div class="chip-text"><span class="chip-label">Analyze Image</span><span class="chip-hint">Upload &amp; ask about it</span></div></div>
      <div class="chip" onclick="openFileAttach()"><span class="chip-icon">📄</span><div class="chip-text"><span class="chip-label">Review Code/File</span><span class="chip-hint">Upload any code file</span></div></div>
    </div></div>`;
  renderHistory(allHistory);
  if(window.innerWidth<=720)closeSb();
  $('cinput').focus();
}

function loadChat(id){
  const s=sessions[id];if(!s)return;
  closeConvSearch();
  // Clear any pending attachments/input from the previous chat
  _pendingAttachments=[];_renderAttachPreviews();
  const _inp=$('cinput');
  if(_inp){_inp.value='';_inp.style.height='auto';}
  const _cc=$('char-count');if(_cc)_cc.textContent='0 / 2000';
  _updateSendBtn();
  currentChatId=id;msgs=[...s.msgs];chatTitle=s.title;
  $('tb-title').textContent=chatTitle;
  $('msgs-inner').innerHTML='';
  msgs.forEach((m,i)=>{if(m.role==='user')appendUserBubble(m.content,i,m.images,m.ts);else appendAIBubble(m.content,false,i,null,m.ts);});
  renderHistory(allHistory);
  if(window.innerWidth<=720)closeSb();
  scrollDown();
  localStorage.setItem('arnav-last-chat',id);
  loadDraft(id);
}

// ── input mode toggles ──
function _updateWebBtn(){
  const btn=$('btn-web');if(!btn)return;
  const lbl=btn.querySelector('.btn-label');if(!lbl)return;
  if(webSearchMode&&_currentPlan==='free'){
    const used=_getDailyWebCount();
    const rem=Math.max(0,FREE_WEB_LIMIT-used);
    lbl.textContent='Web · '+rem;
    btn.title='Web search ('+used+'/'+FREE_WEB_LIMIT+' searches used today)';
  }else{
    lbl.textContent='Search';
    btn.title='Web search mode (Ctrl+Shift+W)';
  }
}

function toggleWebMode(){
  if(!webSearchMode&&_currentPlan==='free'&&_getDailyWebCount()>=FREE_WEB_LIMIT){
    toast('Daily web search limit reached ('+FREE_WEB_LIMIT+'/day). Upgrade for unlimited! 🌐','err',5000);
    setTimeout(openPlans,800);
    return;
  }
  webSearchMode=!webSearchMode;
  $('btn-web').classList.toggle('on',webSearchMode);
  _updateWebBtn();
  if(webSearchMode){
    const info=_currentPlan==='free'?' · '+Math.max(0,FREE_WEB_LIMIT-_getDailyWebCount())+'/'+FREE_WEB_LIMIT+' remaining':'';
    toast('🌐 Web search on'+info,'info');
  }else{
    toast('Web search off','info');
  }
}
const _CODE_MODE_PROMPT='You are in code mode. Prioritize writing clean, working code. Always use markdown code blocks with the correct language identifier. Include a brief explanation after each code block. Prefer practical examples over theory. Show the complete code, not snippets.';

function toggleCodeMode(){
  codeMode=!codeMode;
  $('btn-code').classList.toggle('on',codeMode);
  $('cinput').placeholder=codeMode?'Describe the code you need…':'Message Arnav AI…';
  // Update combined mode label when both web+code active
  if(webSearchMode){
    const info=_currentPlan==='free'?' · '+Math.max(0,FREE_WEB_LIMIT-_getDailyWebCount())+'/'+FREE_WEB_LIMIT+' web searches left':'';
    $('btn-web').querySelector('.btn-label').textContent=codeMode?'Web+Code':(_currentPlan==='free'?'Web · '+Math.max(0,FREE_WEB_LIMIT-_getDailyWebCount()):'Search');
  }
  toast(codeMode?'💻 Code mode on':'Code mode off','info');
}

function _buildSystemPrompt(){
  const parts=[];
  const len=settings.responseLength||'normal';
  if(_LEN_INSTR[len])parts.push(_LEN_INSTR[len]);
  if(_personaBasePrompt)parts.push(_personaBasePrompt);
  if(codeMode)parts.push(_CODE_MODE_PROMPT);
  if(systemPrompt)parts.push(systemPrompt);
  return parts.join('\n\n');
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
function _updateSendBtn(){
  const hasText=($('cinput')?.value||'').trim().length>0;
  const hasAttach=_pendingAttachments.length>0;
  if($('send-btn'))$('send-btn').disabled=!hasText&&!hasAttach;
}

function onInput(el){
  el.style.height='auto';
  el.style.height=Math.min(el.scrollHeight,160)+'px';
  _updateSendBtn();
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
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='f'||e.key==='F')){e.preventDefault();toggleFocusMode();return;}
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(e.key==='w'||e.key==='W')){e.preventDefault();toggleWebMode();return;}
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
// MARKDOWN FORMATTER  (fixed 2-stage pipeline)
// ══════════════════════════════════════
function _renderMath(expr,displayMode){
  if(window.katex){
    try{
      return window.katex.renderToString(expr,{displayMode,throwOnError:false,errorColor:'var(--danger)',trust:false});
    }catch(e){}
  }
  // Fallback when KaTeX not loaded yet
  return displayMode
    ?`<code class="math-fallback math-display-fb">${esc(expr)}</code>`
    :`<code class="math-fallback">${esc(expr)}</code>`;
}

function fmt(raw){
  const blocks=[];
  const mathExprs=[];

  let t=raw;

  // ── PRE-STAGE: extract math expressions BEFORE HTML-encoding ──

  // Display math: $$...$$ (block level)
  t=t.replace(/\$\$([\s\S]+?)\$\$/g,(m,expr)=>{
    const html=`<div class="math-display">${_renderMath(expr.trim(),true)}</div>`;
    mathExprs.push({display:true,html});
    return'\x00MB'+(mathExprs.length-1)+'\x00';
  });

  // Inline math: $...$ — only treat as math if it contains LaTeX special chars
  // (backslash, superscript, subscript, or grouping braces).
  // This prevents false positives like "$5 and $10" or "$Hello$".
  t=t.replace(/\$([^\$\n]{1,250}?)\$/g,(m,expr)=>{
    if(!/[\\^_{}]/.test(expr))return m;
    const html=_renderMath(expr.trim(),false);
    mathExprs.push({display:false,html});
    return'\x00MI'+(mathExprs.length-1)+'\x00';
  });

  // ── STAGE 1: extract fenced code blocks BEFORE HTML-encoding
  // so hljs receives the raw source text (not &lt; etc.)
  t=t.replace(/```(\w*)\n?([\s\S]*?)```/g,(m,lang,code)=>{
    const l=(lang||'code').toLowerCase();
    const trimmed=code.trim();
    const lineCount=trimmed.split('\n').length;
    let highlighted;
    try{
      const h=window.hljs;
      if(h){
        highlighted=l&&l!=='code'&&h.getLanguage(l)
          ?h.highlight(trimmed,{language:l,ignoreIllegals:true}).value
          :h.highlightAuto(trimmed).value;
      }else highlighted=esc(trimmed);
    }catch(e){highlighted=esc(trimmed);}
    const wrapBtn=`<button class="code-expand-btn code-wrap-btn" onclick="toggleWrap(this)" title="Toggle word wrap"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h12a4 4 0 010 8h-4"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 15l-2 2 2 2"/></svg></button>`;
    const dlBtn=`<button class="code-expand-btn" onclick="downloadCode(this)" title="Download"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></button>`;
    const expandBtn=`<button class="code-expand-btn" onclick="openFullscreen(this)" title="Fullscreen"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg></button>`;
    const isPreviewable=['html','svg','css','js','javascript'].includes(l);
    const previewBtn=isPreviewable?`<button class="code-expand-btn code-preview-btn" onclick="previewCode(this)" title="Preview"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>Preview</button>`:'';
    const copyBtn=`<button class="code-copy" onclick="copyCode(this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</button>`;
    const html=`<div class="code-block cb-${esc(l)}"><div class="code-header"><span class="code-lang-wrap"><span class="lang-dot"></span><span class="code-lang">${esc(l)}</span><span class="code-line-count">${lineCount} line${lineCount!==1?'s':''}</span></span><div class="code-header-actions">${wrapBtn}${dlBtn}${expandBtn}${previewBtn}${copyBtn}</div></div><pre data-linecount="${lineCount}"><code class="hljs">${highlighted}</code></pre></div>`;
    blocks.push(html);
    return'\x00CB'+(blocks.length-1)+'\x00';
  });

  // ── STAGE 2: HTML-encode the remaining text (safe now — code is gone)
  t=t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // Replace tokens with a block-level div so the paragraph processor
  // treats each code block as a block element (not inline text)
  t=t.replace(/\x00CB(\d+)\x00/g,'<div data-cb="$1"></div>');
  // Display math → block-level div; inline math → span placeholder
  t=t.replace(/\x00MB(\d+)\x00/g,'<div data-mb="$1"></div>');

  // ── STAGE 3: markdown transforms on the remaining text

  // Inline code (must come before bold/italic so `*text*` inside backticks isn't parsed)
  t=t.replace(/`([^`\n]+)`/g,'<code>$1</code>');

  // Headings
  t=t.replace(/^### (.+)$/gm,'<h3>$1</h3>');
  t=t.replace(/^## (.+)$/gm,'<h2>$1</h2>');
  t=t.replace(/^# (.+)$/gm,'<h1>$1</h1>');

  // Text emphasis
  t=t.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>');
  t=t.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
  t=t.replace(/\*(.+?)\*/g,'<em>$1</em>');
  t=t.replace(/~~(.+?)~~/g,'<del>$1</del>');

  // Blockquote — &gt; after encoding
  t=t.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');

  // Horizontal rule
  t=t.replace(/^---+$/gm,'<hr/>');

  // Markdown tables  |col|col| ... |---|---| ...
  t=t.replace(/(?:^\|.+\|\s*\n?)+/gm,tbl=>{
    const rows=tbl.trim().split('\n');
    if(rows.length<2)return tbl;
    const sepIdx=rows.findIndex(r=>/^\|[\s:|-]+\|/.test(r));
    let html='<div class="table-wrap"><table>';
    rows.forEach((row,i)=>{
      if(i===sepIdx)return;
      const cells=row.replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
      const tag=(sepIdx>0&&i<sepIdx)?'th':'td';
      html+='<tr>'+cells.map(c=>`<${tag}>${c}</${tag}>`).join('')+'</tr>';
    });
    html+='</table></div>';
    return html;
  });

  // Markdown links [text](url)
  t=t.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bare URL auto-link (not already inside an href or code)
  t=t.replace(/(?<!["\(='>])(https?:\/\/[^\s<>"')]+)/g,'<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  // Unordered lists
  t=t.replace(/(?:^[*\-] .+\n?)+/gm,m=>'<ul>'+m.replace(/^[*\-] (.+)$/gm,'<li>$1</li>')+'</ul>');

  // Ordered lists
  t=t.replace(/(?:^\d+\. .+\n?)+/gm,m=>'<ol>'+m.replace(/^\d+\. (.+)$/gm,'<li>$1</li>')+'</ol>');

  // ── STAGE 4: paragraph assembly
  const lines=t.split('\n');
  let out='',inP=false;
  for(const line of lines){
    const tr=line.trim();
    if(!tr){if(inP){out+='</p>';inP=false;}continue;}
    if(/^<(h[1-3]|ul|ol|blockquote|hr|div|table)/.test(tr)){
      if(inP){out+='</p>';inP=false;}
      out+=tr;
    }else{
      if(!inP){out+='<p>';inP=true;}else out+=' ';
      out+=tr;
    }
  }
  if(inP)out+='</p>';

  // ── STAGE 5: restore code blocks and math expressions
  out=out.replace(/<div data-cb="(\d+)"><\/div>/g,(m,i)=>blocks[+i]||m);
  out=out.replace(/<div data-mb="(\d+)"><\/div>/g,(m,i)=>mathExprs[+i]?.html||m);
  // Restore inline math tokens (they survived inside <p> tags)
  out=out.replace(/\x00MI(\d+)\x00/g,(m,i)=>mathExprs[+i]?.html||m);

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

function renderUserBubbleHtml(text,idx,images){
  let imgHtml='';
  if(images&&images.length){
    const imgEls=images.map((img,ii)=>`<img src="${img.dataUrl}" class="user-attached-img" data-imgidx="${idx}_${ii}" alt="Attached image" onclick="_openImgByKey('${idx}_${ii}')">`).join('');
    imgHtml=`<div class="user-bubble-imgs">${imgEls}</div>`;
    // Store references in a map for safe retrieval
    images.forEach((img,ii)=>{_imgStore[idx+'_'+ii]=img.dataUrl;});
  }
  const tsLabel=msgs[idx]?.ts?new Date(msgs[idx].ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'';
  return `${imgHtml}${text?`<span class="user-bubble-text">${esc(text)}</span>`:''}
    ${tsLabel?`<span class="msg-time">${tsLabel}</span>`:''}
    <button class="user-copy-btn" onclick="copyUserMsg(this)" title="Copy"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg></button>
    <button class="user-edit-btn" onclick="startEditMsg(${idx})" title="Edit message"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button>`;
}
function copyUserMsg(btn){
  const text=btn.closest('.user-bubble').querySelector('.user-bubble-text').textContent;
  navigator.clipboard.writeText(text).then(()=>{
    const orig=btn.innerHTML;
    btn.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
    setTimeout(()=>{btn.innerHTML=orig;},2000);
  });
}

function appendUserBubble(text,msgIndex,images,ts){
  const e=$('empty-state');if(e)e.remove();
  if(ts&&msgIndex!==undefined&&msgs[msgIndex]&&!msgs[msgIndex].ts)msgs[msgIndex].ts=ts;
  const d=document.createElement('div');d.className='msg msg-user';
  const bubble=document.createElement('div');bubble.className='user-bubble';
  if(msgIndex!==undefined)bubble.dataset.bubbleIdx=msgIndex;
  bubble.innerHTML=renderUserBubbleHtml(text,msgIndex,images);
  d.appendChild(bubble);$('msgs-inner').appendChild(d);scrollDown();
}

function bmBtnHtml(active){
  return `<svg fill="${active?'currentColor':'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>${active?'Saved':'Save'}`;
}

function appendAIBubble(text,webUsed,msgIndex,elapsed,ts){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');d.className='msg msg-ai';
  const wb=webUsed?'<span class="web-badge">🌐 web</span>':'';
  const mid='msg'+Date.now()+Math.random().toString(36).slice(2,5);
  const bmKey=(currentChatId&&msgIndex!==undefined)?currentChatId+'-'+msgIndex:'';
  const isBm=bmKey?bookmarksSet.has(bmKey):false;
  const timeBadge=elapsed?`<span class="resp-time">${elapsed}s</span>`:'';
  const wc=wordCount(text);
  const wcBadge=`<span class="word-badge">${wc}w</span>`;
  const _tsMs=ts||msgs[msgIndex]?.ts;
  const _tDisplay=_tsMs?new Date(_tsMs).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):tStr();
  const _ft=_tsMs?new Date(_tsMs).toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const _aiLabel=_currentModelLabel();
  d.innerHTML=`<div class="ai-ava"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.2 7.5H18L13.5 10.8L15.3 16.5L10 13.2L4.7 16.5L6.5 10.8L2 7.5H7.8L10 2Z" fill="white"/></svg></div>
  <div class="ai-body-wrap">
    <div class="ai-meta">
      <span class="ai-name">${esc(_aiLabel)}</span>
      <span class="ai-time" data-fulltime="${_ft}">${_tDisplay}</span>${wb}${timeBadge}${wcBadge}
    </div>
    <div class="ai-body" id="${mid}">${fmt(text)}</div>
    <div class="ai-actions">
      <button class="act-btn" onclick="copyText(this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</button>
      <button class="act-btn" id="spk${mid}" onclick="speakMsg('${mid}',this)"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072"/></svg>Read aloud</button>
      <button class="act-btn" onclick="regenLast()"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Regenerate</button>
      <button class="act-btn" onclick="forkChat(document.getElementById('${mid}').innerText)" title="Continue in new chat"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Fork</button>
      <button class="act-btn${isBm?' bookmarked':''}" data-bm-key="${bmKey}" onclick="toggleBookmark('${currentChatId}',${msgIndex},document.getElementById('${mid}').innerText,this)">${bmBtnHtml(isBm)}</button>
      <div class="rate-group">
        <button class="act-btn rate-btn" onclick="rateMsg(1,this)" title="Helpful"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg></button>
        <button class="act-btn rate-btn" onclick="rateMsg(-1,this)" title="Not helpful"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg></button>
      </div>
    </div>
  </div>`;
  $('msgs-inner').appendChild(d);
  applyLineNumbersTo(d);
  _appendFollowUps(d.querySelector('.ai-body-wrap'),text);
  scrollDown();
  return d;
}

function showTyping(webSearch,codeActive){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');d.className='typing-msg';d.id='typing';
  let label;
  if(webSearch&&codeActive)label='<span class="thinking-web">🔍💻 Searching web for code…</span>';
  else if(webSearch)label='<span class="thinking-web">🔍 Searching web…</span>';
  else if(codeActive)label='<span class="thinking-code">💻 Writing code…</span>';
  else label='Thinking…';
  d.innerHTML=`<div class="ai-ava"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.2 7.5H18L13.5 10.8L15.3 16.5L10 13.2L4.7 16.5L6.5 10.8L2 7.5H7.8L10 2Z" fill="white"/></svg></div>
  <div><div class="typing-dots"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div><div class="thinking-label">${label}</div></div>`;
  $('msgs-inner').appendChild(d);scrollDown();
}
function hideTyping(){const t=$('typing');if(t)t.remove();}
function stopGen(){
  stopRequested=true;
  // Abort the in-flight network request immediately
  if(_abortController){_abortController.abort();_abortController=null;}
  // If typewriter is running, reveal full text now instead of stopping mid-word
  if(_twInterval){
    clearInterval(_twInterval);_twInterval=null;
    const el=document.querySelector('.ai-body.streaming');
    if(el&&_twFullText){
      const bubbleDiv=el.closest('.msg');
      _finishTypewriter(_twFullText,el,bubbleDiv,_twMsgIdx);
    }
  }
  toast('Stopped','info',1200);
}

function useChip(el){
  const label=el.querySelector('.chip-label')?.textContent||el.textContent;
  const prompts={'Write & Edit':'Help me write a professional email','Explain & Learn':'Explain how machine learning works in simple terms','Brainstorm':'Give me 5 creative ideas for a personal project','Summarize':'Summarize the key points of a topic I describe'};
  $('cinput').value=prompts[label]||label;onInput($('cinput'));$('cinput').focus();
}

function forkChat(text){
  newChat();
  const snippet=text.length>400?text.slice(0,398)+'…':text;
  const inp=$('cinput');
  inp.value='Continue from this:\n\n'+snippet;
  onInput(inp);inp.focus();
  toast('Context pasted — edit and press Enter to send','ok',4000);
}

// ══════════════════════════════════════
// FILE / IMAGE ATTACHMENTS
// ══════════════════════════════════════
function openFileAttach(){$('file-input')?.click();}

async function onFileSelected(input){
  const files=Array.from(input.files||[]);
  for(const f of files)await _processFile(f);
  input.value='';
  _renderAttachPreviews();
  _updateSendBtn();
}

async function _processFile(file){
  const MAX=20*1024*1024; // 20 MB
  if(file.size>MAX){toast(`${file.name} is too large (max 20 MB)`,'err',3500);return;}
  const _imgExts=/\.(jpg|jpeg|png|gif|webp|bmp|heic|heif|avif|tif|tiff|svg)$/i;
  const isImg=file.type.startsWith('image/')||_imgExts.test(file.name);
  const textTypes=/^(text\/|application\/(json|javascript|xml|x-yaml))/;
  const textExts=/\.(txt|md|csv|py|js|ts|jsx|tsx|html|htm|css|json|yaml|yml|sh|bash|sql|xml|go|rs|java|c|cpp|h|rb|php|swift|kt|r|lua|pl|scala|dart|vue|svelte)$/i;
  const isText=textTypes.test(file.type)||textExts.test(file.name);

  if(isImg){
    const dataUrl=await _fileToBase64(file);
    _pendingAttachments.push({name:file.name,type:'image',mimeType:file.type||'image/jpeg',base64:dataUrl.split(',')[1],dataUrl,size:file.size});
    $('attach-btn')?.classList.add('has-files');
  }else if(isText){
    const textContent=await _fileToText(file);
    _pendingAttachments.push({name:file.name,type:'text',mimeType:file.type||'text/plain',textContent,size:file.size});
    $('attach-btn')?.classList.add('has-files');
  }else{
    toast(`${file.name}: unsupported type. Use images or text/code files.`,'info',3500);
  }
}

function _fileToBase64(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(f);});}
function _fileToText(f){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsText(f);});}

function _renderAttachPreviews(){
  const row=$('attach-previews');if(!row)return;
  if(!_pendingAttachments.length){
    row.style.display='none';
    $('attach-btn')?.classList.remove('has-files');
    return;
  }
  row.style.display='flex';
  row.innerHTML='';
  _pendingAttachments.forEach((a,i)=>{
    const chip=document.createElement('div');chip.className='attach-chip';
    const nameShort=a.name.length>22?a.name.slice(0,20)+'…':a.name;
    if(a.type==='image'){
      chip.innerHTML=`<img src="${a.dataUrl}" class="attach-thumb" alt="${esc(a.name)}"><span class="attach-name">${esc(nameShort)}</span><button class="attach-remove" onclick="removeAttach(${i})" title="Remove">×</button>`;
    }else{
      const ext=(a.name.split('.').pop()||'txt').toLowerCase();
      chip.innerHTML=`<span class="attach-file-icon">${_fileTypeIcon(ext)}</span><div class="attach-file-info"><span class="attach-name">${esc(nameShort)}</span><span class="attach-size">${_fmtFileSize(a.size)}</span></div><button class="attach-remove" onclick="removeAttach(${i})" title="Remove">×</button>`;
    }
    row.appendChild(chip);
  });
}

function _fileTypeIcon(ext){
  const m={py:'🐍',js:'⚡',ts:'🔷',jsx:'⚛',tsx:'⚛',html:'🌐',htm:'🌐',css:'🎨',json:'{}',md:'📝',txt:'📄',csv:'📊',sql:'🗄',sh:'💻',bash:'💻',yml:'⚙',yaml:'⚙',xml:'📋',go:'🐹',rs:'🦀',java:'☕',c:'💾',cpp:'💾',rb:'💎',swift:'🍎',kt:'🔵',r:'📈',lua:'🌙',vue:'🟢',svelte:'🔥'};
  return m[ext]||'📎';
}

function _fmtFileSize(bytes){
  if(bytes<1024)return bytes+' B';
  if(bytes<1048576)return(bytes/1024).toFixed(1)+' KB';
  return(bytes/1048576).toFixed(1)+' MB';
}

function removeAttach(idx){
  _pendingAttachments.splice(idx,1);
  if(!_pendingAttachments.length)$('attach-btn')?.classList.remove('has-files');
  _renderAttachPreviews();
  _updateSendBtn();
}

// ── image lightbox viewer ──
function _openImgByKey(key){const url=_imgStore[key];if(url)openImgViewer(url);}
function openImgViewer(dataUrl){
  const modal=document.createElement('div');
  modal.className='img-viewer-modal';
  const inner=document.createElement('div');inner.className='img-viewer-inner';
  const img=document.createElement('img');img.src=dataUrl;img.alt='Full size image';
  const closeBtn=document.createElement('button');closeBtn.className='img-viewer-close';closeBtn.title='Close';closeBtn.textContent='×';
  closeBtn.onclick=()=>modal.remove();
  const dlBtn=document.createElement('button');dlBtn.className='img-viewer-dl';dlBtn.textContent='Download';
  dlBtn.onclick=()=>{const a=document.createElement('a');a.href=dataUrl;a.download='image.png';a.click();};
  inner.appendChild(img);inner.appendChild(closeBtn);inner.appendChild(dlBtn);
  modal.appendChild(inner);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
}

// ── drag & drop onto messages area ──
function _initDragDrop(){
  const area=$('msgs-area'),overlay=$('drag-overlay');
  if(!area||!overlay)return;
  let cnt=0;
  area.addEventListener('dragover',e=>{
    if(!e.dataTransfer?.types.includes('Files'))return;
    e.preventDefault();e.dataTransfer.dropEffect='copy';
  });
  area.addEventListener('dragenter',e=>{
    if(!e.dataTransfer?.types.includes('Files'))return;
    e.preventDefault();cnt++;overlay.classList.add('on');
  });
  area.addEventListener('dragleave',()=>{if(--cnt<=0){cnt=0;overlay.classList.remove('on');}});
  area.addEventListener('drop',async e=>{
    e.preventDefault();cnt=0;overlay.classList.remove('on');
    const files=Array.from(e.dataTransfer?.files||[]);
    for(const f of files)await _processFile(f);
    _renderAttachPreviews();_updateSendBtn();
    $('cinput')?.focus();
  });
}

// ── paste images from clipboard ──
document.addEventListener('paste',async e=>{
  const active=document.activeElement;
  const inApp=active===$('cinput')||$('msgs-area')?.contains(active)||active===document.body;
  if(!inApp)return;
  const items=Array.from(e.clipboardData?.items||[]).filter(it=>it.kind==='file'&&it.type.startsWith('image/'));
  if(!items.length)return;
  e.preventDefault();
  for(const item of items){const f=item.getAsFile();if(f)await _processFile(f);}
  _renderAttachPreviews();_updateSendBtn();
});

// ══════════════════════════════════════
// CAMERA CAPTURE
// ══════════════════════════════════════
let _cameraStream=null;
let _cameraFacingMode='environment';
let _cameraSnapDataUrl=null;

// Dedicated handler for mobile camera-input — bypasses MIME type detection
// because many Android browsers return file.type='' for captured photos
async function onCameraSelected(input){
  const files=Array.from(input.files||[]);
  if(!files.length)return;
  const CAMERA_MAX=20*1024*1024; // 20 MB — phone cameras produce large files
  let added=0;
  for(const f of files){
    if(f.size>CAMERA_MAX){
      toast('Photo too large (max 20 MB). Try reducing camera resolution in settings.','err',4000);
      continue;
    }
    // Force image treatment — camera always produces images regardless of MIME
    const mimeType=(f.type&&f.type.startsWith('image/'))?f.type:'image/jpeg';
    try{
      const dataUrl=await _fileToBase64(f);
      _pendingAttachments.push({
        name:f.name||'photo.jpg',
        type:'image',
        mimeType,
        base64:dataUrl.split(',')[1],
        dataUrl,
        size:f.size
      });
      $('attach-btn')?.classList.add('has-files');
      added++;
    }catch(e){toast('Could not read photo. Please try again.','err',3000);}
  }
  input.value=''; // reset so same photo can be retaken
  _renderAttachPreviews();
  _updateSendBtn();
  if(added)toast('Photo attached — type a question or just send','info',2500);
}

function openCamera(){
  // On mobile devices use native capture; on desktop use getUserMedia modal
  const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if(isMobile||!navigator.mediaDevices?.getUserMedia){
    $('camera-input')?.click();
    return;
  }
  _openCameraModal();
}

async function _openCameraModal(){
  const modal=$('camera-modal');if(!modal)return;
  modal.style.display='flex';
  _cameraSnapDataUrl=null;
  const preview=$('camera-snap-preview');
  if(preview)preview.style.display='none';
  const video=$('camera-video');
  if(video)video.style.display='block';
  const shutter=$('camera-shutter-btn');
  if(shutter)shutter.disabled=false;
  await _startCameraStream();
}

async function _startCameraStream(){
  if(_cameraStream){_cameraStream.getTracks().forEach(t=>t.stop());_cameraStream=null;}
  const video=$('camera-video');if(!video)return;
  try{
    _cameraStream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:_cameraFacingMode,width:{ideal:1280},height:{ideal:720}},
      audio:false
    });
    video.srcObject=_cameraStream;
  }catch(e){
    toast('Camera access denied or not available','err',3000);
    closeCamera();
  }
}

async function flipCamera(){
  _cameraFacingMode=_cameraFacingMode==='environment'?'user':'environment';
  await _startCameraStream();
}

function cameraSnap(){
  const video=$('camera-video');
  const canvas=$('camera-canvas');
  if(!video||!canvas)return;
  canvas.width=video.videoWidth||640;
  canvas.height=video.videoHeight||480;
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  _cameraSnapDataUrl=canvas.toDataURL('image/jpeg',0.92);
  // Show preview
  const img=$('camera-snap-img');
  if(img)img.src=_cameraSnapDataUrl;
  const preview=$('camera-snap-preview');
  if(preview)preview.style.display='flex';
  video.style.display='none';
}

function cameraRetake(){
  _cameraSnapDataUrl=null;
  const preview=$('camera-snap-preview');
  if(preview)preview.style.display='none';
  const video=$('camera-video');
  if(video)video.style.display='block';
}

async function cameraUsePhoto(){
  if(!_cameraSnapDataUrl){closeCamera();return;}
  // Convert data URL to File and process as attachment
  const res=await fetch(_cameraSnapDataUrl);
  const blob=await res.blob();
  const file=new File([blob],'camera-capture.jpg',{type:'image/jpeg'});
  await _processFile(file);
  _renderAttachPreviews();
  _updateSendBtn();
  closeCamera();
  toast('Photo added','ok',1800);
}

function closeCamera(){
  if(_cameraStream){_cameraStream.getTracks().forEach(t=>t.stop());_cameraStream=null;}
  const modal=$('camera-modal');if(modal)modal.style.display='none';
  _cameraSnapDataUrl=null;
}

// Close camera on Escape
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('camera-modal')?.style.display==='flex')closeCamera();
});

// ══════════════════════════════════════
// SPECIAL CHARACTERS PANEL
// ══════════════════════════════════════
const _SPEC_TABS={
  Math:[
    ['±','∓','×','÷','∙','∗','⁻','⁺','²','³'],
    ['=','≠','≈','≡','≤','≥','≪','≫','∝','∞'],
    ['∑','∏','∫','∬','∮','∂','∇','√','∛','∜'],
    ['½','⅓','¼','¾','⅔','⅛','⅜','⅝','⅞','%'],
    ['⁰','¹','²','³','⁴','⁵','⁶','⁷','⁸','⁹'],
    ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'],
  ],
  Greek:[
    ['α','β','γ','δ','ε','ζ','η','θ','ι','κ'],
    ['λ','μ','ν','ξ','ο','π','ρ','σ','τ','υ'],
    ['φ','χ','ψ','ω','ς','ϕ','ϑ','ϵ','ϰ','ϖ'],
    ['Α','Β','Γ','Δ','Ε','Ζ','Η','Θ','Ι','Κ'],
    ['Λ','Μ','Ν','Ξ','Ο','Π','Ρ','Σ','Τ','Υ'],
    ['Φ','Χ','Ψ','Ω'],
  ],
  Arrows:[
    ['→','←','↑','↓','↔','↕','↗','↘','↙','↖'],
    ['⇒','⇐','⇑','⇓','⇔','⇕','⇨','⇦','⇧','⇩'],
    ['➜','➝','➞','➟','➠','➡','⟶','⟵','⟷','↪'],
    ['↩','↫','↬','↭','↮','↯','↰','↱','↲','↳'],
  ],
  Symbols:[
    ['©','®','™','℃','℉','°','µ','§','¶','†'],
    ['★','☆','♠','♣','♥','♦','♪','♫','♬','♭'],
    ['✓','✗','✦','✧','❖','◆','◇','▲','▼','●'],
    ['…','—','–','«','»','‹','›','"','"','\''],
    ['€','£','¥','¢','₹','₽','₩','₪','฿','₿'],
    ['∀','∃','∄','∈','∉','⊂','⊃','⊆','⊇','∪','∩'],
  ],
};
let _specOpen=false;
let _specActiveTab='Math';

function toggleSpecChars(){
  _specOpen=!_specOpen;
  if(_specOpen){
    _buildSpecPanel();
    setTimeout(()=>document.addEventListener('click',_closeSpecOutside),10);
  }else{
    document.removeEventListener('click',_closeSpecOutside);
  }
  $('spec-dropdown')?.classList.toggle('on',_specOpen);
  $('spec-btn')?.classList.toggle('on',_specOpen);
}

function _closeSpecOutside(e){
  if($('spec-wrap')?.contains(e.target))return;
  _specOpen=false;
  $('spec-dropdown')?.classList.remove('on');
  $('spec-btn')?.classList.remove('on');
  document.removeEventListener('click',_closeSpecOutside);
}

function _buildSpecPanel(){
  const dd=$('spec-dropdown');if(!dd)return;
  const tabKeys=Object.keys(_SPEC_TABS);
  const tabs=tabKeys.map(k=>`<button class="spec-tab${k===_specActiveTab?' active':''}" onclick="specSetTab('${k}');event.stopPropagation()">${k}</button>`).join('');
  const chars=_SPEC_TABS[_specActiveTab]||[];
  // Use encodeURIComponent to safely pass any Unicode character through onclick
  const grid=chars.map(row=>
    row.map(c=>{
      const safe=encodeURIComponent(c);
      const safeTitle=c.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      return`<button class="spec-char" onclick="insertSpecChar(decodeURIComponent('${safe}'));event.stopPropagation()" title="${safeTitle}">${c}</button>`;
    }).join('')
  ).join('');
  dd.innerHTML=`<div class="spec-tabs">${tabs}</div><div class="spec-grid">${grid}</div>`;
}

function specSetTab(tab){
  _specActiveTab=tab;
  _buildSpecPanel();
}

function insertSpecChar(char){
  const ta=$('cinput');if(!ta)return;
  const start=ta.selectionStart;
  const end=ta.selectionEnd;
  const val=ta.value;
  ta.value=val.slice(0,start)+char+val.slice(end);
  ta.selectionStart=ta.selectionEnd=start+char.length;
  ta.focus();
  onInput(ta);
}

// ══════════════════════════════════════
// FOLLOW-UP SUGGESTION CHIPS
// ══════════════════════════════════════
function _generateFollowUps(text){
  const t=text.toLowerCase();
  const hasCode=/```|function |class |import |const |let |var /.test(t);
  const hasError=/error|exception|fail|bug|crash|undefined|null/.test(t);
  const hasList=(t.match(/^\d+\./m)||[]).length>1||(t.match(/^[-*] /m)||[]).length>2;
  const hasLink=/https?:\/\/|source:|url:/.test(t);
  if(hasCode&&hasError)return['How do I fix this?','Show the corrected code','What caused this error?'];
  if(hasCode)return['Explain the code','Show a real-world example','How can I improve this?'];
  if(hasError)return['How do I solve this?','What are the alternatives?','Explain the root cause'];
  if(hasList)return['Tell me more about #1','How do I get started?','Compare these options'];
  if(hasLink)return['Summarize the key points','What should I do with this?','Tell me more'];
  return['Tell me more','Give me an example','What should I do next?'];
}

function _appendFollowUps(wrap,text){
  if(!text||text.length<80)return;
  const suggestions=_generateFollowUps(text);
  const div=document.createElement('div');
  div.className='followup-chips';
  suggestions.forEach(s=>{
    const btn=document.createElement('button');
    btn.className='followup-chip';
    btn.textContent=s;
    btn.addEventListener('click',()=>{
      $('cinput').value=s;onInput($('cinput'));$('cinput').focus();
      div.remove();
    });
    div.appendChild(btn);
  });
  const close=document.createElement('button');
  close.className='followup-close';close.title='Dismiss';
  close.innerHTML='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="10" height="10"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
  close.addEventListener('click',()=>div.remove());
  div.appendChild(close);
  wrap.appendChild(div);
}

// ══════════════════════════════════════
// HTML / ARTIFACTS PREVIEW
// ══════════════════════════════════════
let _previewContent='';

function previewCode(btn){
  const block=btn.closest('.code-block');
  const lang=(block.querySelector('.code-lang').textContent||'').toLowerCase().trim();
  const code=block.querySelector('code').innerText;
  const previewable=['html','svg','css','javascript','js'];
  if(!previewable.includes(lang)){toast('Preview available for HTML, SVG and CSS','info',2500);return;}
  let content=code;
  if(lang==='css')content=`<style>${code}</style><div style="font-family:sans-serif;padding:16px;color:#333"><p>CSS preview — add HTML elements to see them styled.</p></div>`;
  else if(lang==='js'||lang==='javascript')content=`<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="font-family:sans-serif;padding:16px"><pre id="out" style="background:#f5f5f5;padding:12px;border-radius:6px;font-size:13px"></pre><script>const _log=console.log;console.log=(...a)=>{document.getElementById('out').textContent+=a.join(' ')+'\\n';_log(...a);};\n${code}\n<\/script></body></html>`;
  _previewContent=content;
  const iframe=$('preview-iframe');
  if(iframe){iframe.srcdoc=content;}
  $('preview-modal').classList.add('on');
}

function openPreviewNewTab(){
  const w=window.open('','_blank');
  if(w){w.document.write(_previewContent);w.document.close();}
}

function printConversation(){
  if(!msgs||!msgs.length){toast('No messages to print','info');return;}
  const w=window.open('','_blank');
  if(w){w.document.write(_htmlText());w.document.close();w.print();}
  closeModalId('share-modal');
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
  const inp=$('cinput'),text=inp.value.trim();
  const hasAttach=_pendingAttachments.length>0;
  if(!text&&!hasAttach)return;
  if(!_checkDailyLimit())return;
  // Web search limit check
  if(webSearchMode){
    if(_currentPlan==='free'&&_getDailyWebCount()>=FREE_WEB_LIMIT){
      webSearchMode=false;
      $('btn-web').classList.remove('on');
      _updateWebBtn();
      toast('Web search limit reached ('+FREE_WEB_LIMIT+'/day). Sending without web search. Upgrade for unlimited! 🌐','err',6000);
    }else{
      _incDailyWebCount();
      _updateWebBtn();
    }
  }
  if(navigator.vibrate)navigator.vibrate(5);
  if(text)_saveInputHistory(text);
  inp.value='';inp.style.height='auto';clearDraft();$('char-count').textContent='0 / 2000';

  // Capture and clear attachments before any await
  const attachSnap=[..._pendingAttachments];
  _pendingAttachments=[];
  _renderAttachPreviews();
  _updateSendBtn();
  $('attach-btn')?.classList.remove('has-files');

  // Separate images and text files
  const imageAttach=attachSnap.filter(a=>a.type==='image');
  const textFileAttach=attachSnap.filter(a=>a.type==='text');

  // Build message content: embed text file contents inline
  let msgContent=text;
  if(textFileAttach.length){
    const blocks=textFileAttach.map(f=>{
      const ext=(f.name.split('.').pop()||'txt').toLowerCase();
      const MAX_CHARS=6000;
      const body=f.textContent.length>MAX_CHARS?f.textContent.slice(0,MAX_CHARS)+'\n\n… (truncated)':f.textContent;
      return `📄 **${f.name}**\n\`\`\`${ext}\n${body}\n\`\`\``;
    }).join('\n\n');
    msgContent=(text?text+'\n\n':'')+blocks;
  }
  // If only images with no text, add minimal placeholder for history
  if(!msgContent&&imageAttach.length){
    msgContent=imageAttach.map(i=>`[📷 ${i.name}]`).join(' ');
  }

  const isNew=!chatTitle;
  if(isNew){
    const titleText=text||(attachSnap[0]?.name?'File: '+attachSnap[0].name:'Chat');
    chatTitle=generateTitle(titleText);
    $('tb-title').textContent=chatTitle;
    if(!currentChatId)currentChatId=genId();
    addToHistory(currentChatId,chatTitle,true);
    localStorage.setItem('arnav-last-chat',currentChatId);
  }
  const _userTs=Date.now();
  msgs.push({role:'user',content:msgContent,ts:_userTs,images:imageAttach.map(i=>({base64:i.base64,mimeType:i.mimeType,name:i.name,dataUrl:i.dataUrl}))});
  appendUserBubble(msgContent,msgs.length-1,imageAttach,_userTs);
  // Save to sessions IMMEDIATELY so the chat is navigable while generating
  sessions[currentChatId]={msgs:[...msgs],title:chatTitle};
  updateStats(isNew,{webSearch:webSearchMode,modelId:_activeModelId});
  _incDailyCount();renderDailyBar();
  await callAPI(msgContent,isNew,imageAttach);
}

// ══════════════════════════════════════
// STREAMING TYPEWRITER
// ══════════════════════════════════════
let _twInterval=null,_twOnDone=null,_twFullText='';
let _twMsgIdx=-1,_twChatId=null; // captured per-stream to survive chat switches
let _abortController=null; // AbortController for in-flight fetch

function _createStreamBubble(webUsed,msgIndex,elapsed){
  const e=$('empty-state');if(e)e.remove();
  const d=document.createElement('div');d.className='msg msg-ai';
  const wb=webUsed?'<span class="web-badge">🌐 web</span>':'';
  const mid='msg'+Date.now()+Math.random().toString(36).slice(2,5);
  const timeBadge=elapsed?`<span class="resp-time">${elapsed}s</span>`:'';
  const ft=new Date().toLocaleString('en-US',{weekday:'short',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  const _slabel=_currentModelLabel();
  d.innerHTML=`<div class="ai-ava"><svg viewBox="0 0 20 20" fill="none"><path d="M10 2L12.2 7.5H18L13.5 10.8L15.3 16.5L10 13.2L4.7 16.5L6.5 10.8L2 7.5H7.8L10 2Z" fill="white"/></svg></div>
  <div class="ai-body-wrap">
    <div class="ai-meta">
      <span class="ai-name">${esc(_slabel)}</span>
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
  // Use _twChatId (captured when stream started) — currentChatId may have changed
  const _resolvedChatId=_twChatId||currentChatId;
  const bmKey=(_resolvedChatId&&msgIndex!==undefined)?_resolvedChatId+'-'+msgIndex:'';
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
      <button class="act-btn" onclick="forkChat(document.getElementById('${mid}').innerText)" title="Continue in new chat"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Fork</button>
      <button class="act-btn${isBm?' bookmarked':''}" data-bm-key="${bmKey}" onclick="toggleBookmark('${_resolvedChatId}',${msgIndex},document.getElementById('${mid}').innerText,this)">${bmBtnHtml(isBm)}</button>
      <div class="rate-group">
        <button class="act-btn rate-btn" onclick="rateMsg(1,this)" title="Helpful"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/></svg></button>
        <button class="act-btn rate-btn" onclick="rateMsg(-1,this)" title="Not helpful"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"/></svg></button>
      </div>`;
    wrap.appendChild(actDiv);
    _appendFollowUps(wrap,fullText);
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
    _finishTypewriter(_twFullText,el,bubbleDiv,_twMsgIdx);
  }
  $('stop-btn').onclick=stopGen;
}

async function callAPI(text,isNew,_images){
  _images=_images||[];
  busy=true;stopRequested=false;
  _abortController=new AbortController();
  $('send-btn').disabled=true;$('stop-btn').classList.add('on');
  // During the fetch phase the stop button aborts the request
  $('stop-btn').onclick=stopGen;
  _setGenerating(true);

  // ─── Capture chat context at call time.
  // User may switch chats during the async fetch — these closures keep
  // the response anchored to the correct chat without blocking navigation.
  const _cId   = currentChatId;  // chat this response belongs to
  const _cMsgs = msgs;            // reference — survives reassignment of global `msgs`
  const _cTitle = chatTitle;
  const _webSearch = webSearchMode; // capture before any await
  const _codeActive = codeMode;
  const _onThisChat=()=>currentChatId===_cId;

  if(_onThisChat())showTyping(_webSearch,_codeActive);

  const _t0=Date.now();
  let _streamStarted=false;

  try{
    const tok=await window._auth.currentUser.getIdToken();
    const _combinedSys=_buildSystemPrompt();
    const msgsToSend=_combinedSys?[{role:'system',content:_combinedSys},..._cMsgs]:_cMsgs;

    // Choose endpoint: proxy for custom API keys, default for Arnav AI
    let _fetchUrl=window.API_URL;
    let _fetchBody={messages:msgsToSend,web_search:_webSearch,code_mode:_codeActive};
    if(_images.length){
      _fetchBody.images=_images.map(i=>({base64:i.base64,mimeType:i.mimeType}));
    }
    if(_activeModelId!=='arnav'){
      const kc=_apiKeys[_activeModelId];
      if(kc&&kc.key){
        _fetchUrl=_backendUrl()+'/proxy-chat';
        _fetchBody={..._fetchBody,
          provider:_activeModelId,api_key:kc.key,model:kc.model||'',api_base_url:kc.baseUrl||'',
          temperature:kc.temperature??0.7,
          ...(kc.maxTokens?{max_tokens:kc.maxTokens}:{})
        };
      }else{
        toast('No API key set for this model. Add it in Settings → Custom Models.','err',4000);
      }
    }else if(_images.length){
      // Default Arnav AI model is text-only; let user know
      toast('💡 Image analysis requires a vision model (GPT-4o, Claude, Gemini). Set one up in Settings → Custom Models.','info',6000);
    }
    const res=await fetch(_fetchUrl,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
      body:JSON.stringify(_fetchBody),
      signal:_abortController.signal
    });

    // Hide typing only if we're still on this chat
    if(_onThisChat())hideTyping();

    if(stopRequested){
      busy=false;$('stop-btn').classList.remove('on');
      _updateSendBtn();
      _setGenerating(false);
      return;
    }
    if(!res.ok){
      // Extract the detail message from the backend error body
      let errMsg='API error '+res.status;
      try{const eb=await res.json();if(eb.detail)errMsg=eb.detail;}catch(e){}
      throw new Error(errMsg);
    }

    _abortController=null;
    const data=await res.json();
    const reply=data.response||data.generated_text||data.choices?.[0]?.message?.content||data.text||'(no response)';
    const elapsed=((Date.now()-_t0)/1000).toFixed(1);

    // Always persist the reply to the correct chat regardless of which chat is visible
    _cMsgs.push({role:'assistant',content:reply,ts:Date.now()});
    sessions[_cId]={msgs:[..._cMsgs],title:sessions[_cId]?.title||_cTitle};
    saveConversation(_cId,false);
    _trackResponseStats(reply);

    if(_onThisChat()){
      // User is still on this chat — stream the reply into the DOM
      _streamStarted=true;
      _twMsgIdx=_cMsgs.length-1;
      _twChatId=_cId;
      const sb=_createStreamBubble(data.web_search_used||false,_cMsgs.length-1,elapsed);
      $('msgs-inner').appendChild(sb.div);
      scrollDown();
      $('stop-btn').onclick=_skipTypewriter;
      _startTypewriter(reply,sb.bodyEl,sb.div,_cMsgs.length-1,()=>{
        $('stop-btn').onclick=stopGen;
        if(settings.sound)playChime();
        if(settings.tts)autoSpeak(reply);
        _notifyResponse();
        busy=false;
        $('stop-btn').classList.remove('on');
        _updateSendBtn();
        _setGenerating(false);
      });
    }else{
      // User switched to a different chat — response saved silently, notify them
      const _savedTitle=sessions[_cId]?.title||_cTitle||'Previous chat';
      toast(`💬 Response ready in "${_savedTitle}"  — click to view`,'ok',6000);
      busy=false;
      $('stop-btn').classList.remove('on');
      _updateSendBtn();
      _setGenerating(false);
    }
  }catch(err){
    _abortController=null;
    if(err.name==='AbortError'||stopRequested){
      if(_onThisChat())hideTyping();
      busy=false;$('stop-btn').classList.remove('on');
      $('stop-btn').onclick=stopGen;
      _updateSendBtn();
      _setGenerating(false);
      return;
    }
    if(_onThisChat()){
      hideTyping();
      const raw=err.message||'Unknown error';
      let userMsg;
      if(_activeModelId!=='arnav'){
        const prov=_API_PROVIDERS[_activeModelId];
        const provName=prov?.name||_activeModelId;
        const modelId=_apiKeys[_activeModelId]?.model||'';
        if(raw.includes('429')||raw.toLowerCase().includes('rate')){
          userMsg=`⚠️ **Rate limit reached** for ${provName}.\n\nWait a moment and try again. Free-tier keys have per-minute request limits.\n\n*Tip: check your API plan for higher limits.*`;
        }else if(raw.includes('401')||raw.toLowerCase().includes('invalid api key')||raw.toLowerCase().includes('unauthorized')){
          userMsg=`⚠️ **Invalid API key** for ${provName}.\n\nGo to **Settings → Custom Models** and check your key.`;
        }else if(raw.includes('403')){
          userMsg=`⚠️ **Access denied** for ${provName}.\n\nYour API key may not have access to model \`${modelId}\`.`;
        }else if(raw.includes('404')||raw.toLowerCase().includes('model not found')){
          userMsg=`⚠️ **Model not found**: \`${modelId}\`\n\nThis model may not exist or you may not have access to it yet. Try a different model in Settings.`;
        }else if(raw.includes('503')||raw.toLowerCase().includes('unavailable')){
          userMsg=`⚠️ **${provName} is temporarily unavailable.** Try again in a moment.`;
        }else{
          userMsg=`⚠️ **${provName} error:**\n\n\`${raw}\``;
        }
      }else{
        userMsg=`⚠️ Could not reach the model.\n\n\`${raw}\`\n\nCheck your HuggingFace Space is running.`;
      }
      appendAIBubble(userMsg);
    }
    const toastMsg=_activeModelId!=='arnav'
      ?(_API_PROVIDERS[_activeModelId]?.name||'Custom model')+' error — see chat'
      :'Connection error — check your Space';
    toast(toastMsg,'err');
    busy=false;$('stop-btn').classList.remove('on');
    $('stop-btn').onclick=stopGen;
    _updateSendBtn();
    _setGenerating(false);
  }

  if(!_streamStarted&&busy){
    busy=false;$('stop-btn').classList.remove('on');
    _updateSendBtn();
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
// VOICE OUTPUT  (language-aware, chunked, Chrome-bug-proof)
// ══════════════════════════════════════

// ── Language detection via Unicode block character counts
const _TTS_LANG_BLOCKS={
  'hi-IN':/[ऀ-ॿ]/g,  // Devanagari → Hindi / Marathi / Sanskrit
  'ar-SA':/[؀-ۿ]/g,  // Arabic
  'ja-JP':/[぀-ヿㇰ-ㇿ]/g,  // Hiragana + Katakana
  'zh-CN':/[一-鿿㐀-䶿]/g,  // CJK Unified Ideographs
  'ko-KR':/[가-힯]/g,  // Hangul
  'ta-IN':/[஀-௿]/g,  // Tamil
  'te-IN':/[ఀ-౿]/g,  // Telugu
  'bn-IN':/[ঀ-৿]/g,  // Bengali
  'gu-IN':/[઀-૿]/g,  // Gujarati
  'pa-IN':/[਀-੿]/g,  // Punjabi (Gurmukhi)
  'ml-IN':/[ഀ-ൿ]/g,  // Malayalam
  'kn-IN':/[ಀ-೿]/g,  // Kannada
  'ru-RU':/[Ѐ-ӿ]/g,  // Cyrillic
  'el-GR':/[Ͱ-Ͽ]/g,  // Greek
  'th-TH':/[฀-๿]/g,  // Thai
};

const _TTS_LANG_LABELS={
  'hi-IN':'हिन्दी','ar-SA':'عربي','ja-JP':'日本語','zh-CN':'中文',
  'ko-KR':'한국어','ta-IN':'தமிழ்','te-IN':'తెలుగు','bn-IN':'বাংলা',
  'gu-IN':'ગુજરાતી','pa-IN':'ਪੰਜਾਬੀ','ml-IN':'മലയാളം','kn-IN':'ಕನ್ನಡ',
  'ru-RU':'Русский','el-GR':'Ελληνικά','th-TH':'ภาษาไทย',
};

function _detectTtsLang(text){
  const sample=text.slice(0,800).replace(/\s/g,'');
  const total=sample.length||1;
  let best=null,bestPct=0;
  for(const[lang,re] of Object.entries(_TTS_LANG_BLOCKS)){
    const matches=(sample.match(re)||[]).length;
    const pct=matches/total;
    if(pct>0.07&&pct>bestPct){best=lang;bestPct=pct;} // >7% non-Latin chars → that language
  }
  return best||'en-US';
}

// ── Voice selection: score all voices and pick the best for the language
function _getBestTtsVoice(lang){
  const voices=window.speechSynthesis.getVoices();
  if(!voices.length)return null;
  const prefix=lang.split('-')[0].toLowerCase();
  const scored=voices.map(v=>{
    const vl=v.lang.toLowerCase();
    let s=0;
    if(vl===lang.toLowerCase())s+=20;       // exact lang+region match
    else if(vl.startsWith(prefix))s+=10;    // same language, different region
    else return{v,s:-1};
    const nm=v.name.toLowerCase();
    if(nm.includes('google'))s+=16;         // Google voices: best quality
    if(nm.includes('enhanced'))s+=13;
    if(nm.includes('premium'))s+=13;
    if(nm.includes('neural'))s+=13;
    if(nm.includes('natural'))s+=11;
    if(nm.includes('microsoft'))s+=9;
    if(nm.includes('apple'))s+=8;
    if(!v.localService)s+=2;               // online voices tend to be higher quality
    return{v,s};
  }).filter(x=>x.s>=0).sort((a,b)=>b.s-a.s);
  if(scored.length)return scored[0].v;
  // Fallback: any English voice
  return voices.find(v=>v.lang.startsWith('en'))||voices[0]||null;
}

// ── Text cleaning: strip markdown, code, URLs, symbols
function _cleanForTts(raw){
  return raw
    .replace(/```[\s\S]*?```/g,' ')                // fenced code blocks
    .replace(/`[^`\n]+`/g,' ')                      // inline code
    .replace(/^#{1,6}\s+(.+)$/gm,'$1')              // headings → plain text
    .replace(/\*{1,3}([^*\n]+)\*{1,3}/g,'$1')      // bold/italic → plain text
    .replace(/_{1,2}([^_\n]+)_{1,2}/g,'$1')
    .replace(/~~([^~\n]+)~~/g,'$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')         // [text](url) → text
    .replace(/https?:\/\/\S+/g,' ')                  // bare URLs
    .replace(/^\s*[-*+]\s+/gm,'')                    // unordered list bullets
    .replace(/^\s*\d+\.\s+/gm,'')                    // ordered list numbers
    .replace(/^[-_*]{3,}$/gm,' ')                    // horizontal rules
    .replace(/^>\s*/gm,'')                           // blockquotes
    .replace(/\|[^\n]+\|/g,' ')                      // tables
    .replace(/&amp;/g,' and ').replace(/&lt;/g,' ').replace(/&gt;/g,' ').replace(/&[a-z]+;/g,' ')
    .replace(/[\u{1F300}-\u{1FFFF}]/gu,'')           // emoji blocks (Unicode)
    .replace(/[★⚡👑🔥🌐⚠️✅❌💡🔍✍️🧠🎤📖🔒⚙±×÷]/g,'')
    // Pronounce common abbreviations naturally
    .replace(/\bAI\b/g,'A.I.').replace(/\bAPI\b/g,'A.P.I.').replace(/\bUI\b/g,'U.I.')
    .replace(/\bUX\b/g,'U.X.').replace(/\bHTML\b/g,'H.T.M.L.').replace(/\bCSS\b/g,'C.S.S.')
    .replace(/\bSQL\b/g,'S.Q.L.').replace(/\bURL\b/g,'U.R.L.').replace(/\bGPU\b/g,'G.P.U.')
    .replace(/\bi\.e\.\b/gi,'that is').replace(/\be\.g\.\b/gi,'for example')
    // Join multi-newlines into sentence pauses
    .replace(/\n{2,}/g,'. ')
    .replace(/\n/g,' ')
    .replace(/\s{2,}/g,' ')
    .trim();
}

// ── Chunk text at sentence/clause boundaries (Chrome stops TTS after ~15s on long utterances)
function _splitTtsChunks(text,maxLen=220){
  if(!text)return[];
  const parts=text
    .replace(/([.!?।])\s+/g,'$1\n')         // sentence-ending punctuation (incl. Hindi danda ।)
    .replace(/([;:])\s+(?=[A-Zऀ-ॿ؀-ۿ])/g,'$1\n') // semicolon/colon before new clause
    .split('\n').map(s=>s.trim()).filter(Boolean);
  const chunks=[];let cur='';
  for(const p of parts){
    const cand=cur?cur+' '+p:p;
    if(cand.length>maxLen&&cur){chunks.push(cur);cur=p;}
    else cur=cand;
  }
  if(cur)chunks.push(cur);
  // Hard-split any remaining overlength chunks at word boundaries
  return chunks.flatMap(c=>{
    if(c.length<=maxLen*1.8)return[c];
    const words=c.split(' ');const sub=[];let acc='';
    for(const w of words){const t=acc?acc+' '+w:w;if(t.length>maxLen&&acc){sub.push(acc);acc=w;}else acc=t;}
    if(acc)sub.push(acc);
    return sub;
  });
}

// ── TTS state
let _ttsBtn=null;
let _ttsChunks=[];
let _ttsIdx=0;
let _ttsRunning=false;
let _ttsLang='en-US';
let _ttsVoice=null;
let _ttsKeepAlive=null;  // Chrome: prevent pause-timeout bug

const _TTS_ICON_PLAY='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M12 6a7 7 0 010 12M8.464 8.464a5 5 0 000 7.072"/></svg>';
const _TTS_ICON_STOP='<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

function _clearTtsBtn(){
  if(_ttsBtn){
    _ttsBtn.classList.remove('speaking','tts-active');
    _ttsBtn.innerHTML=_TTS_ICON_PLAY+'Read aloud';
    _ttsBtn=null;
  }
}

function _stopTts(){
  _ttsRunning=false;_ttsChunks=[];_ttsIdx=0;
  if(_ttsKeepAlive){clearInterval(_ttsKeepAlive);_ttsKeepAlive=null;}
  try{window.speechSynthesis.cancel();}catch(e){}
  _clearTtsBtn();
}

function speakMsg(mid,btn){
  if(_ttsBtn===btn){_stopTts();return;}
  _stopTts();
  const el=document.getElementById(mid);if(!el)return;
  _startTts(el.innerText,btn);
}

function autoSpeak(text){_stopTts();_startTts(text,null);}

function _startTts(rawText,btn){
  if(!window.speechSynthesis){
    toast('Text-to-speech is not supported in this browser','err',3000);
    return;
  }
  const cleaned=_cleanForTts(rawText);
  if(!cleaned)return;

  const lang=_detectTtsLang(cleaned);
  const chunks=_splitTtsChunks(cleaned);
  if(!chunks.length)return;

  _ttsChunks=chunks;_ttsIdx=0;_ttsRunning=true;_ttsLang=lang;

  const _begin=()=>{
    _ttsVoice=_getBestTtsVoice(lang);
    if(btn){
      _ttsBtn=btn;
      btn.classList.add('speaking','tts-active');
      const langLabel=_TTS_LANG_LABELS[lang]||(lang!=='en-US'?lang:'');
      btn.innerHTML=_TTS_ICON_STOP+(langLabel?`Reading (${langLabel})`:'Stop reading');
    }
    // Chrome bug: speech synthesis silently stops after ~15s if the tab isn't focused.
    // Workaround: pause+resume every 10s to reset the Chrome internal timer.
    if(_ttsKeepAlive){clearInterval(_ttsKeepAlive);}
    _ttsKeepAlive=setInterval(()=>{
      if(!_ttsRunning){clearInterval(_ttsKeepAlive);_ttsKeepAlive=null;return;}
      if(window.speechSynthesis.speaking&&!window.speechSynthesis.paused){
        window.speechSynthesis.pause();
        setTimeout(()=>{if(_ttsRunning)window.speechSynthesis.resume();},50);
      }
    },10000);
    _speakNextChunk();
  };

  // Voices may not be loaded yet on first call
  const voices=window.speechSynthesis.getVoices();
  if(voices.length>0){_begin();}
  else{
    window.speechSynthesis.onvoiceschanged=()=>{
      window.speechSynthesis.onvoiceschanged=null;
      _begin();
    };
  }
}

function _speakNextChunk(){
  if(!_ttsRunning||_ttsIdx>=_ttsChunks.length){_stopTts();return;}
  const text=_ttsChunks[_ttsIdx++];
  if(!text.trim()){_speakNextChunk();return;} // skip empty

  const utt=new SpeechSynthesisUtterance(text);
  utt.lang=_ttsLang;

  // Natural rate/pitch per language family
  if(_ttsLang.endsWith('-IN')||_ttsLang.startsWith('hi')||_ttsLang.startsWith('ar')){
    utt.rate=0.90;utt.pitch=1.0; // Indian/Arabic: slightly slower feels more natural
  }else if(_ttsLang.startsWith('zh')||_ttsLang.startsWith('ja')){
    utt.rate=0.88;utt.pitch=1.05; // CJK: slower with slight pitch lift
  }else if(_ttsLang.startsWith('ko')){
    utt.rate=0.90;utt.pitch=1.0;
  }else{
    utt.rate=0.94;utt.pitch=1.0; // English / European: near-natural
  }
  utt.volume=1.0;

  if(_ttsVoice)utt.voice=_ttsVoice;

  utt.onend=()=>{
    if(_ttsRunning){
      // Small inter-chunk pause for natural breathing rhythm
      setTimeout(_speakNextChunk,_ttsLang.startsWith('zh')||_ttsLang.startsWith('ja')?120:70);
    }
  };

  utt.onerror=ev=>{
    // 'interrupted' / 'canceled' = user stopped → normal, no action
    if(ev.error==='interrupted'||ev.error==='canceled')return;
    // 'network' = voice not downloaded yet, skip chunk
    if(ev.error==='network'&&_ttsRunning){setTimeout(_speakNextChunk,200);return;}
    console.warn('[TTS]',ev.error,text.slice(0,40));
    if(_ttsRunning){setTimeout(_speakNextChunk,100);} // skip bad chunk, keep going
  };

  try{window.speechSynthesis.speak(utt);}
  catch(e){_stopTts();toast('TTS error: '+e.message,'err',3000);}
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
function _htmlText(){
  const dt=new Date().toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
  const title=chatTitle||'Arnav AI Conversation';
  let html=`<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8"/>\n<title>${esc(title)}</title>\n<style>\nbody{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:760px;margin:40px auto;padding:0 24px;background:#07070e;color:#f0f0fa;line-height:1.65;}\nh1{font-size:20px;color:#9d94ff;margin-bottom:4px;letter-spacing:-.3px;}\n.meta{color:#6b6b9a;font-size:13px;margin-bottom:32px;}\n.msg-user{text-align:right;margin:20px 0;}\n.user-bubble{display:inline-block;background:#1a1a2e;border:1px solid rgba(255,255,255,.08);color:#f0f0fa;padding:11px 16px;border-radius:18px 18px 4px 18px;max-width:75%;text-align:left;white-space:pre-wrap;word-break:break-word;font-size:14px;}\n.msg-ai{margin:20px 0;}\n.ai-name{font-size:11px;color:#9d94ff;margin-bottom:6px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;}\n.ai-body{background:#0d0d18;border:1px solid rgba(255,255,255,.06);padding:14px 16px;border-radius:4px 18px 18px 18px;white-space:pre-wrap;word-break:break-word;font-size:14px;}\npre{background:#0b0b16;padding:12px 14px;border-radius:8px;overflow-x:auto;font-size:13px;font-family:monospace;margin:8px 0;}\ncode{font-family:'Consolas',monospace;font-size:13px;}\nhr{border:none;border-top:1px solid rgba(255,255,255,.06);margin:8px 0;}\n</style>\n</head>\n<body>\n`;
  html+=`<h1>★ ${esc(title)}</h1>\n<div class="meta">Exported ${dt} · ${msgs.length} messages</div>\n`;
  (msgs||[]).forEach(m=>{
    if(m.role==='user'){html+=`<div class="msg-user"><div class="user-bubble">${esc(m.content)}</div></div>\n<hr/>\n`;}
    else{html+=`<div class="msg-ai"><div class="ai-name">Arnav AI</div><div class="ai-body">${esc(m.content)}</div></div>\n<hr/>\n`;}
  });
  html+=`</body>\n</html>`;
  return html;
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
  }else if(type==='html'){
    const b=new Blob([_htmlText()],{type:'text/html;charset=utf-8'});
    const url=URL.createObjectURL(b);const a=document.createElement('a');a.href=url;
    a.download=((chatTitle||'chat').replace(/[^a-z0-9]/gi,'-').toLowerCase().slice(0,40)||'arnav-ai')+'.html';
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    toast('HTML downloaded!','ok');closeModalId('share-modal');
  }else if(type==='print'){
    printConversation();
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
  bubble.classList.remove('editing');bubble.innerHTML=renderUserBubbleHtml(msgs[idx]?.content||'',idx,msgs[idx]?.images);
}
async function saveEditMsg(idx){
  if(busy)return;
  const bubble=document.querySelector(`[data-bubble-idx="${idx}"]`);if(!bubble)return;
  const ta=bubble.querySelector('.user-edit-textarea');if(!ta)return;
  const newText=ta.value.trim();if(!newText){toast('Message cannot be empty','err');return;}
  msgs[idx]={role:'user',content:newText,ts:msgs[idx]?.ts||Date.now()};msgs=msgs.slice(0,idx+1);
  const parentMsg=bubble.closest('.msg');
  if(parentMsg){let next=parentMsg.nextElementSibling;while(next){const rem=next;next=next.nextElementSibling;rem.remove();}}
  bubble.classList.remove('editing');bubble.innerHTML=renderUserBubbleHtml(newText,idx);
  sessions[currentChatId]={msgs:[...msgs],title:chatTitle};
  await callAPI(newText,false);
}

// ══════════════════════════════════════
// USAGE STATS — Firestore synced
// ══════════════════════════════════════
async function updateStats(isNewConv,opts={}){
  if(!currentUserId||!window._db)return;
  try{
    const today=new Date().toISOString().slice(0,10);
    const ref=window._fsDoc(window._db,'users',currentUserId,'stats','main');
    const data={
      totalMessages:window._fsIncrement(1),
      lastActiveAt:window._fsTimestamp(),
      [`dailyActivity.${today}`]:window._fsIncrement(1)
    };
    if(isNewConv)data.totalConversations=window._fsIncrement(1);
    if(opts.webSearch)data.totalWebSearches=window._fsIncrement(1);
    if(opts.modelId)data[`modelsUsed.${opts.modelId}`]=window._fsIncrement(1);
    await window._fsSet(ref,data,{merge:true});
  }catch(e){}
}
async function _trackResponseStats(text){
  if(!currentUserId||!window._db||!text)return;
  try{
    const words=text.trim().split(/\s+/).filter(w=>w).length;
    const tokens=Math.ceil(text.length/4);
    const ref=window._fsDoc(window._db,'users',currentUserId,'stats','main');
    await window._fsSet(ref,{wordsGenerated:window._fsIncrement(words),totalTokensEstimated:window._fsIncrement(tokens)},{merge:true});
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
      const snap=await window._fsGetDoc(window._fsDoc(window._db,'users',currentUserId,'stats','main'));
      if(snap.exists()){
        const d=snap.data();
        if(d.totalMessages!=null)$('stat-msgs').textContent=d.totalMessages.toLocaleString();
        if(d.totalConversations!=null)$('stat-convs').textContent=d.totalConversations;
        if(d.wordsGenerated!=null)$('stat-words').textContent=d.wordsGenerated.toLocaleString();
        if(d.totalWebSearches!=null)$('stat-searches').textContent=d.totalWebSearches.toLocaleString();
        if(d.totalTokensEstimated!=null)$('stat-tokens').textContent=(d.totalTokensEstimated>=1000?(d.totalTokensEstimated/1000).toFixed(1)+'K':d.totalTokensEstimated);
        if(d.modelsUsed){
          const top=Object.entries(d.modelsUsed).sort((a,b)=>b[1]-a[1])[0];
          if(top){const n=_API_PROVIDERS[top[0]]?.name||(top[0]==='arnav'?'Arnav AI':top[0]);$('stat-top-model').textContent=n;}
        }
        if(d.dailyActivity)_renderActivityChart(d.dailyActivity,$('stats-activity-chart'),30);
      }
    }catch(e){}
  }
}
function _renderActivityChart(activityMap,container,days){
  if(!activityMap||!container)return;
  const today=new Date();
  const bars=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date(today);d.setDate(d.getDate()-i);
    const key=d.toISOString().slice(0,10);
    bars.push({key,count:activityMap[key]||0});
  }
  const maxCount=Math.max(1,...bars.map(b=>b.count));
  container.innerHTML='';
  bars.forEach(b=>{
    const pct=Math.round((b.count/maxCount)*100);
    const bar=document.createElement('div');
    bar.className='stats-activity-bar';
    bar.style.height=Math.max(2,pct)+'%';
    bar.title=b.key+': '+b.count+' msg'+(b.count!==1?'s':'');
    if(b.count===0)bar.style.opacity='0.2';
    container.appendChild(bar);
  });
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
let _planCardsCache=null,_lastSyncedPlan=null;

function _backendUrl(){
  return window.BACKEND_URL||(window.API_URL||'').replace(/\/chat\/?$/,'');
}

async function loadSubscription(){
  if(!currentUserId||!window._db)return;
  try{
    const snap=await window._fsGetDoc(window._fsDoc(window._db,'users',currentUserId,'subscription','main'));
    _currentPlan=snap.exists()?snap.data().plan||'free':'free';
  }catch(e){_currentPlan='free';}
  _applyPlanUI(_currentPlan);
}

function _applyPlanUI(plan){
  _currentPlan=plan;_lastSyncedPlan=null;
  const badge=$('u-plan-badge');
  if(badge){
    if(plan==='plus'){badge.textContent='⚡ Plus';badge.className='u-plan-badge plus';badge.style.display='';}
    else if(plan==='pro'){badge.textContent='👑 Pro';badge.className='u-plan-badge pro';badge.style.display='';}
    else{badge.style.display='none';}
  }
  const upBtn=$('upgrade-topbar-btn');
  if(upBtn)upBtn.style.display=(plan==='free')?'':'none';
  renderDailyBar();
  _updateWebBtn();
  // Show/hide manage sub button in profile
  const profManageBtn=$('prof-manage-btn');
  if(profManageBtn)profManageBtn.style.display=(plan!=='free')?'':'none';
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
  if(_lastSyncedPlan===_currentPlan)return;
  _lastSyncedPlan=_currentPlan;
  if(!_planCardsCache){
    _planCardsCache={};
    ['free','plus','pro'].forEach(p=>{
      _planCardsCache[p]={card:$('plan-card-'+p),badge:$('badge-'+p),cta:$('cta-'+p)};
    });
  }
  const plans=['free','plus','pro'];
  plans.forEach(p=>{
    const {card,badge,cta}=_planCardsCache[p]||{};
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
  // Show/hide manage subscription row
  const manageRow=$('manage-sub-row');
  if(manageRow)manageRow.style.display=(_currentPlan!=='free')?'':'none';
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
  // Clean planHint — strip anything after ? or & (URL parsing artefact from old double-? bug)
  const cleanPlan=(planHint||'').split('?')[0].split('&')[0].trim().toLowerCase();

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
  // Fallback: trust cleaned plan hint
  if(cleanPlan==='plus'||cleanPlan==='pro'){
    await _persistSubscription(cleanPlan,'','');
    return cleanPlan;
  }
  return null;
}

async function _persistSubscription(plan,customerId,subId){
  if(!currentUserId||!window._db)return;
  try{
    await window._fsSet(
      window._fsDoc(window._db,'users',currentUserId,'subscription','main'),
      {plan,status:'active',stripeCustomerId:customerId||'',
       stripeSubscriptionId:subId||'',updatedAt:window._fsTimestamp()},
      {merge:true}
    );
    _currentPlan=plan;
  }catch(e){}
}

async function manageSubscription(){
  const u=_fbUser||window._auth?.currentUser;
  if(!u){toast('Please sign in first','err');return;}

  // Collect both possible manage buttons and put them in loading state
  const allBtns=[
    document.getElementById('manage-sub-btn'),
    document.getElementById('prof-manage-btn')
  ].filter(Boolean);
  const origTexts=allBtns.map(b=>b.textContent);
  allBtns.forEach(b=>{b.disabled=true;b.textContent='Opening portal…';});

  // Get stored customer ID from Firestore (may be empty — backend will search by email)
  let customerId='';
  try{
    const snap=await window._fsGetDoc(window._fsDoc(window._db,'users',u.uid,'subscription','main'));
    if(snap.exists())customerId=snap.data().stripeCustomerId||'';
  }catch(e){}

  try{
    const tok=await u.getIdToken();
    const origin=window.location.origin||window.location.href.replace(/[^/]*$/,'');
    const path=window.location.pathname||'/';
    // Always call backend — if customer_id is empty, the backend searches Stripe by email
    const res=await fetch(_backendUrl()+'/create-portal-session',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
      body:JSON.stringify({
        customer_id:customerId,
        return_url:origin+path,
        user_email:u.email||''
      })
    });
    if(!res.ok){
      const e=await res.json().catch(()=>({}));
      throw new Error(e.detail||'Portal error '+res.status);
    }
    const data=await res.json();
    if(data.url){
      window.location.href=data.url; // navigating away — no need to reset buttons
    }else throw new Error('No portal URL returned');
  }catch(err){
    allBtns.forEach((b,i)=>{b.disabled=false;b.textContent=origTexts[i]||'Manage Subscription';});
    const msg=err.message||'';
    if(msg.includes('No Stripe customer')||msg.includes('not found')||msg.includes('404')){
      toast('No billing account found for this email. Make sure payment completed, then try again.','err',8000);
    }else if(msg.includes('configuration')||msg.includes('portal')){
      toast('Billing portal not fully configured yet. Please contact support.','err',7000);
    }else{
      toast('Could not open billing portal: '+msg,'err',6000);
    }
  }
}

async function _handleStripeRedirect(){
  const params=new URLSearchParams(window.location.search);
  const payment=params.get('payment');
  if(!payment)return;
  // Strip query AFTER reading params
  window.history.replaceState({},'',window.location.pathname);

  if(payment==='success'){
    const sessionId=params.get('session_id');
    const planHint=params.get('plan')||'';
    // Store pending session so we can retry if the Space is temporarily down
    if(sessionId){
      try{localStorage.setItem('arnav-pending-session',JSON.stringify({sessionId,planHint,ts:Date.now()}));}catch(e){}
    }
    const activePlan=await _verifyAndSaveSession(sessionId||'',planHint);
    if(activePlan){
      try{localStorage.removeItem('arnav-pending-session');}catch(e){}
      _applyPlanUI(activePlan);
      _syncPlanCards();
      setTimeout(()=>showPaymentSuccess(activePlan),500);
    }else{
      toast('Payment received — subscription activating…','ok',4000);
    }
  }else if(payment==='cancelled'){
    setTimeout(()=>toast('Payment cancelled','info',3000),400);
  }
}

async function _checkPendingSession(){
  let pending=null;
  try{pending=JSON.parse(localStorage.getItem('arnav-pending-session')||'null');}catch(e){}
  if(!pending)return;
  // Session tokens expire after 24 hours
  if(Date.now()-pending.ts>86400000){
    try{localStorage.removeItem('arnav-pending-session');}catch(e){}
    return;
  }
  // Retry verifying the session silently in the background
  try{
    const plan=await _verifyAndSaveSession(pending.sessionId,pending.planHint);
    if(plan){
      try{localStorage.removeItem('arnav-pending-session');}catch(e){}
      _applyPlanUI(plan);
      _syncPlanCards();
      toast('Your '+plan+' subscription is now active ⚡','ok',4000);
    }
  }catch(e){}
}

// ══════════════════════════════════════
// PAYMENT SUCCESS OVERLAY
// ══════════════════════════════════════
const _PSO_MESSAGES={
  plus:{
    headline:"You're on Plus now! ⚡",
    message:"Unlimited messages, AI personas, and all the good stuff — unlocked.",
    perks:["Unlimited messages — no more daily limit","5 AI personas (Professor, Coder, Creative…)","Priority responses & extended answers","Full usage analytics & profile stats"],
    sub:"Welcome to the premium squad. We knew you had good taste. 😎"
  },
  pro:{
    headline:"Welcome to Pro! 👑",
    message:"You just went full power mode. Arnav AI is entirely yours.",
    perks:["Everything in Plus, dialled up to max","Dedicated processing queue — you're first","Extended response length & early model access","Priority email support from the team"],
    sub:"Royalty treatment, activated. We're honoured. 🎩"
  }
};

function showPaymentSuccess(plan){
  const cfg=_PSO_MESSAGES[plan]||_PSO_MESSAGES.plus;

  _set('pso-headline',cfg.headline);
  _set('pso-message',cfg.message);
  _set('pso-sub',cfg.sub);

  const perksEl=$('pso-perks');
  if(perksEl){
    perksEl.innerHTML=cfg.perks.map((p,i)=>`
      <div class="pso-perk" style="animation-delay:${0.7+i*0.1}s">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
        ${p}
      </div>`).join('');
  }

  const overlay=$('pso-overlay');
  if(overlay)overlay.style.display='flex';

  // Shoot confetti
  _launchConfetti();

  // Auto-close after 12 seconds
  setTimeout(closePso,12000);
}

function closePso(){
  const overlay=$('pso-overlay');
  if(!overlay||overlay.style.display==='none')return;
  overlay.style.opacity='0';
  overlay.style.transition='opacity .4s';
  setTimeout(()=>{overlay.style.display='none';overlay.style.opacity='';overlay.style.transition='';},420);
}

function _launchConfetti(){
  const wrap=$('pso-confetti-wrap');
  if(!wrap)return;
  wrap.innerHTML='';
  const colors=['#6b5ef8','#9d94ff','#4ecb8a','#fa709a','#e0a832','#4facfe','#f093fb','#43e97b','#fee140','#f5576c'];
  const count=70;
  for(let i=0;i<count;i++){
    const el=document.createElement('div');
    el.className='pso-confetti-piece';
    const size=Math.random()*8+5;
    el.style.cssText=`
      left:${Math.random()*100}%;
      width:${size}px;
      height:${size}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      border-radius:${Math.random()>.5?'50%':'2px'};
      animation-duration:${2.5+Math.random()*2.5}s;
      animation-delay:${Math.random()*1.2}s;
      transform:rotate(${Math.random()*360}deg);
    `;
    wrap.appendChild(el);
  }
  // Second wave
  setTimeout(()=>{
    for(let i=0;i<40;i++){
      const el=document.createElement('div');
      el.className='pso-confetti-piece';
      const size=Math.random()*7+4;
      el.style.cssText=`
        left:${Math.random()*100}%;
        width:${size}px;height:${size}px;
        background:${colors[Math.floor(Math.random()*colors.length)]};
        border-radius:${Math.random()>.5?'50%':'2px'};
        animation-duration:${2+Math.random()*2}s;
        animation-delay:${Math.random()*.8}s;
      `;
      wrap.appendChild(el);
    }
  },1200);
}

// ══════════════════════════════════════
// AVATAR GRADIENT HELPERS
// ══════════════════════════════════════
const _AV_GRADIENTS=[
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  'linear-gradient(135deg,#fccb90,#d57eeb)',
  'linear-gradient(135deg,#96fbc4,#f9f586)',
];
function _avatarGradient(name){
  const c=(name||'A').toUpperCase().charCodeAt(0)||65;
  return _AV_GRADIENTS[c%_AV_GRADIENTS.length];
}
function _initials(name){
  const p=(name||'?').trim().split(/\s+/);
  return p.length>=2?(p[0][0]+p[1][0]).toUpperCase():(name||'?').slice(0,2).toUpperCase();
}

// ══════════════════════════════════════
// PROFILE
// ══════════════════════════════════════
let _userProfile={};

async function loadProfile(uid){
  if(!uid||!window._db)return;
  try{
    const snap=await window._fsGetDoc(window._fsDoc(window._db,'users',uid,'profile','main'));
    _userProfile=snap.exists()?snap.data():{};
  }catch(e){_userProfile={};}
  _updateStreak();
}

function _updateStreak(){
  if(!currentUserId||!window._db)return;
  const today=new Date().toISOString().slice(0,10);
  if(_userProfile.lastActiveDate===today)return;
  const yesterday=new Date(Date.now()-864e5).toISOString().slice(0,10);
  let streak=_userProfile.streak||0;
  streak=(_userProfile.lastActiveDate===yesterday)?streak+1:1;
  _userProfile.lastActiveDate=today;
  _userProfile.streak=streak;
  window._fsSet(window._fsDoc(window._db,'users',currentUserId,'profile','main'),
    {lastActiveDate:today,streak},{merge:true}).catch(()=>{});
}

function openProfile(){
  // Close menu first (outside try so menu closes regardless)
  try{closeUserMenu();}catch(e){}

  const u=_fbUser||window._auth?.currentUser;
  if(!u){toast('Please sign in to view your profile','err');return;}

  // Local safe text-setter — avoids dependency on external _set
  const st=(id,val)=>{
    try{
      const el=document.getElementById(id);
      if(el)el.textContent=(val===null||val===undefined)?'':String(val);
    }catch(e){}
  };

  try{
    const name=u.displayName||u.email.split('@')[0];

    // Avatar
    const avEl=document.getElementById('prof-avatar-xl');
    if(avEl){
      avEl.textContent=_initials(name);
      avEl.style.background=_avatarGradient(name);
    }

    st('prof-disp-name',name);
    st('prof-email-disp',u.email);

    // Member since
    try{
      const ct=(u.metadata||{}).creationTime;
      if(ct){
        const d=new Date(ct);
        st('prof-member-badge','Member since '+d.toLocaleDateString('en-US',{month:'short',year:'numeric'}));
      }
    }catch(e){st('prof-member-badge','');}

    // Plan badge
    const pb=document.getElementById('prof-plan-badge');
    if(pb){
      if(_currentPlan==='plus'){pb.textContent='⚡ Plus';pb.className='u-plan-badge plus';pb.style.display='';}
      else if(_currentPlan==='pro'){pb.textContent='👑 Pro';pb.className='u-plan-badge pro';pb.style.display='';}
      else{pb.style.display='none';}
    }
    st('prof-plan-ro',{free:'Free',plus:'Plus ⚡',pro:'Pro 👑'}[_currentPlan]||'Free');

    // Upgrade button
    const ubEl=document.getElementById('prof-upgrade-btn');
    if(ubEl)ubEl.style.display=(_currentPlan==='free')?'':'none';

    // Form fields
    const niEl=document.getElementById('prof-name-inp');if(niEl)niEl.value=(_userProfile.displayName)||name;
    const biEl=document.getElementById('prof-bio-inp');if(biEl)biEl.value=(_userProfile.bio)||'';
    const liEl=document.getElementById('prof-loc-inp');if(liEl)liEl.value=(_userProfile.location)||'';

    // Account
    st('prof-email-ro',u.email);
    st('prof-uid-ro',u.uid);

    // Stats
    st('prof-streak-val',((_userProfile.streak)||0)+' 🔥');
    st('prof-bms-val',bookmarks.length);
    st('prof-convs-val',allHistory.length>0?allHistory.length:'—');
    st('prof-msgs-val','—');

    // Clear save status
    const ssEl=document.getElementById('prof-save-status');
    if(ssEl)ssEl.textContent='';

    // Open the modal
    const modal=document.getElementById('profile-modal');
    if(!modal){toast('Profile modal not found — reload the page','err');return;}
    modal.classList.add('on');

    // Fetch Firestore stats async (non-blocking — fills in after modal opens)
    if(currentUserId&&window._db){
      window._fsGetDoc(window._fsDoc(window._db,'users',currentUserId,'stats','main')).then(snap=>{
        if(snap&&snap.exists()){
          const d=snap.data();
          if(d.totalMessages!=null)st('prof-msgs-val',d.totalMessages.toLocaleString());
          if(d.totalConversations!=null)st('prof-convs-val',d.totalConversations);
          if(d.wordsGenerated!=null)st('prof-words-val',d.wordsGenerated>=1000?(d.wordsGenerated/1000).toFixed(1)+'K':d.wordsGenerated);
          if(d.totalWebSearches!=null)st('prof-searches-val',d.totalWebSearches);
          if(d.dailyActivity)_renderActivityChart(d.dailyActivity,document.getElementById('prof-activity-chart'),14);
        }
      }).catch(()=>{});
    }
  }catch(err){
    toast('Profile error: '+err.message,'err',5000);
    console.error('[openProfile]',err);
  }
}

// Small helper to set textContent safely
function _set(id,val){const el=$(id);if(el)el.textContent=val??'';}

async function saveProfile(){
  const u=_fbUser||window._auth?.currentUser;if(!u)return;
  const btn=$('prof-save-btn'),ss=$('prof-save-status');
  if(btn){btn.disabled=true;btn.textContent='Saving…';}

  const newName=($('prof-name-inp')?.value||'').trim()||u.displayName||u.email.split('@')[0];
  const bio=($('prof-bio-inp')?.value||'').trim().slice(0,200);
  const loc=($('prof-loc-inp')?.value||'').trim().slice(0,80);

  try{
    if(newName!==u.displayName)await window._upPro(u,{displayName:newName});

    if(window._db){
      await window._fsSet(
        window._fsDoc(window._db,'users',currentUserId,'profile','main'),
        {displayName:newName,bio,location:loc,updatedAt:window._fsTimestamp()},
        {merge:true}
      );
    }
    _userProfile={..._userProfile,displayName:newName,bio,location:loc};

    // Refresh sidebar avatar
    const grad=_avatarGradient(newName);
    const av=$('u-avatar');
    if(av){av.textContent=_initials(newName);av.style.background=grad;}
    _set('u-name',newName);
    _set('prof-disp-name',newName);
    const pavEl=$('prof-avatar-xl');
    if(pavEl){pavEl.textContent=_initials(newName);pavEl.style.background=grad;}

    if(ss){ss.textContent='✓ Saved';ss.style.color='var(--success)';}
    toast('Profile saved','ok',2000);
  }catch(err){
    if(ss){ss.textContent='Save failed';ss.style.color='var(--danger)';}
    toast('Could not save: '+err.message,'err');
  }finally{
    if(btn){btn.disabled=false;btn.textContent='Save Changes';}
    setTimeout(()=>{if(ss&&ss.textContent!=='')ss.textContent='';},4000);
  }
}

// ══════════════════════════════════════
// AI PERSONA SELECTOR
// ══════════════════════════════════════
const PERSONAS=[
  {id:'assistant',icon:'⚡',name:'Assistant',desc:'Helpful & balanced',   prompt:''},
  {id:'professor',icon:'🎓',name:'Professor',desc:'Academic & detailed',  prompt:'You are a knowledgeable professor. Give thorough, well-structured explanations with examples. Use clear academic language.'},
  {id:'creative', icon:'🎨',name:'Creative', desc:'Imaginative & expressive',prompt:'You are a creative thinker and writer. Use vivid language, interesting metaphors, and original ideas. Be imaginative and engaging.'},
  {id:'coder',    icon:'💻',name:'Coder',    desc:'Technical & precise',  prompt:'You are an expert software engineer. Prioritize code examples, technical accuracy, and best practices. Be direct and concise.'},
  {id:'concise',  icon:'🎯',name:'Concise',  desc:'Brief & direct',       prompt:'Be extremely concise. Use short sentences. Give direct answers with minimal explanation. Avoid preamble or filler.'},
];
let _activePersona='assistant';
let _personaBasePrompt='';
let _personaPickerOpen=false;

function initPersona(){
  _activePersona=localStorage.getItem('arnav-persona')||'assistant';
  const p=PERSONAS.find(x=>x.id===_activePersona)||PERSONAS[0];
  _personaBasePrompt=p.prompt;
  _set('persona-icon',p.icon);
  _set('persona-label',p.name);
}


function togglePersonaPicker(){
  _personaPickerOpen=!_personaPickerOpen;
  const dd=$('persona-dropdown');
  if(!dd)return;
  if(_personaPickerOpen){
    dd.innerHTML=PERSONAS.map(p=>`
      <div class="persona-opt${_activePersona===p.id?' active':''}" onclick="setPersona('${p.id}')">
        <span class="persona-opt-icon">${p.icon}</span>
        <div class="persona-opt-text">
          <div class="persona-opt-name">${p.name}</div>
          <div class="persona-opt-desc">${p.desc}</div>
        </div>
        ${_activePersona===p.id?'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>':''}
      </div>`).join('');
    dd.classList.add('on');
    $('persona-btn')?.classList.add('on');
  }else{
    _closePersonaPicker();
  }
}

function _closePersonaPicker(){
  _personaPickerOpen=false;
  $('persona-dropdown')?.classList.remove('on');
  $('persona-btn')?.classList.remove('on');
}

function setPersona(id){
  _activePersona=id;
  localStorage.setItem('arnav-persona',id);
  const p=PERSONAS.find(x=>x.id===id)||PERSONAS[0];
  _personaBasePrompt=p.prompt;
  _set('persona-icon',p.icon);
  _set('persona-label',p.name);
  _closePersonaPicker();
  toast(p.icon+' '+p.name+' mode','info',1800);
}

document.addEventListener('click',e=>{
  if(_personaPickerOpen&&!$('persona-wrap')?.contains(e.target))_closePersonaPicker();
  if(_lenPickerOpen&&!$('len-wrap')?.contains(e.target))_closeLenPicker();
});

// ── Response length picker ──
let _lenPickerOpen=false;
function toggleLenPicker(){
  _lenPickerOpen=!_lenPickerOpen;
  $('len-dropdown')?.classList.toggle('on',_lenPickerOpen);
  $('len-btn')?.classList.toggle('on',_lenPickerOpen);
}
function _closeLenPicker(){
  _lenPickerOpen=false;
  $('len-dropdown')?.classList.remove('on');
  $('len-btn')?.classList.remove('on');
}
function setResponseLength(len){
  settings.responseLength=len;
  saveSettings();
  _set('len-label',_LEN_LABELS[len]||'Normal');
  document.querySelectorAll('.len-opt').forEach(el=>el.classList.toggle('active',el.dataset.len===len));
  $('len-btn')?.classList.toggle('on',len!=='normal');
  _closeLenPicker();
  if(len!=='normal')toast('Length: '+(_LEN_LABELS[len]),'info',1500);
}
function _applyLenSetting(){
  const len=settings.responseLength||'normal';
  _set('len-label',_LEN_LABELS[len]||'Normal');
  document.querySelectorAll('.len-opt').forEach(el=>el.classList.toggle('active',el.dataset.len===len));
  if(len!=='normal')$('len-btn')?.classList.add('on');
}

// ══════════════════════════════════════
// DAILY MESSAGE LIMIT (free tier)
// ══════════════════════════════════════
const FREE_MSG_LIMIT=10;
const FREE_WEB_LIMIT=30;

function _dailyKey(){return'arnav-daily-'+new Date().toISOString().slice(0,10);}
function _dailyWebKey(){return'arnav-web-'+new Date().toISOString().slice(0,10);}

function _getDailyCount(){
  return parseInt(localStorage.getItem(_dailyKey())||'0',10);
}
function _getDailyWebCount(){
  return parseInt(localStorage.getItem(_dailyWebKey())||'0',10);
}

function _incDailyCount(){
  const k=_dailyKey(),n=_getDailyCount()+1;
  localStorage.setItem(k,n);
  try{Object.keys(localStorage).filter(x=>x.startsWith('arnav-daily-')&&x!==k).forEach(x=>localStorage.removeItem(x));}catch(e){}
  return n;
}
function _incDailyWebCount(){
  const k=_dailyWebKey(),n=_getDailyWebCount()+1;
  localStorage.setItem(k,n);
  try{Object.keys(localStorage).filter(x=>x.startsWith('arnav-web-')&&x!==k).forEach(x=>localStorage.removeItem(x));}catch(e){}
  return n;
}

function renderDailyBar(){
  const bar=$('daily-bar');
  if(!bar)return;
  if(_currentPlan!=='free'){bar.style.display='none';return;}
  const count=_getDailyCount();
  const pct=Math.min(100,count/FREE_MSG_LIMIT*100);
  bar.style.display='';
  const fill=$('daily-bar-fill');if(fill)fill.style.width=pct+'%';
  const lbl=$('daily-bar-label');if(lbl)lbl.textContent=count+' / '+FREE_MSG_LIMIT+' messages today';
  bar.classList.toggle('limit-hit',count>=FREE_MSG_LIMIT);
}

function _checkDailyLimit(){
  if(_currentPlan!=='free')return true;
  if(_getDailyCount()>=FREE_MSG_LIMIT){
    toast('Daily limit reached ('+FREE_MSG_LIMIT+' messages). Upgrade for unlimited! ⚡','err',5000);
    setTimeout(openPlans,800);
    return false;
  }
  return true;
}

// ══════════════════════════════════════
// FOCUS MODE
// ══════════════════════════════════════
let _focusMode=false;

function toggleFocusMode(){
  _focusMode=!_focusMode;
  document.body.classList.toggle('focus-mode',_focusMode);
  $('focus-btn')?.classList.toggle('on',_focusMode);
  if(_focusMode&&sbState)closeSb();
  toast(_focusMode?'Focus mode on — Ctrl+Shift+F to exit':'Focus mode off','info',1800);
  localStorage.setItem('arnav-focus',_focusMode?'1':'0');
}

function _initFocusMode(){
  if(localStorage.getItem('arnav-focus')==='1'){
    _focusMode=true;
    document.body.classList.add('focus-mode');
    $('focus-btn')?.classList.add('on');
  }
}

// ══════════════════════════════════════
// CUSTOM API KEYS  (own Claude / GPT / Gemini keys)
// ══════════════════════════════════════
const _API_PROVIDERS={
  openai:{
    name:'OpenAI',color:'#10a37f',abbr:'GPT',
    keyHint:'sk-…',
    models:[
      {id:'gpt-5.4-pro',    label:'GPT-5.4 Pro'},
      {id:'gpt-5.4-thinking',label:'GPT-5.4 Thinking'},
      {id:'gpt-5.4',        label:'GPT-5.4'},
      {id:'gpt-5.4-mini',   label:'GPT-5.4 Mini'},
      {id:'gpt-5.4-nano',   label:'GPT-5.4 Nano'},
      {id:'gpt-5.3-codex',  label:'GPT-5.3 Codex'},
      {id:'gpt-4.1',        label:'GPT-4.1  — Legacy / API workhorse'},
      {id:'gpt-4o',         label:'GPT-4o  — Legacy / Audio only'},
    ]
  },
  anthropic:{
    name:'Anthropic (Claude)',color:'#d4855a',abbr:'CL',
    keyHint:'sk-ant-…',
    models:[
      {id:'claude-opus-4-8',            label:'Claude Opus 4.8'},
      {id:'claude-opus-4-7',            label:'Claude Opus 4.7'},
      {id:'claude-sonnet-4-6',          label:'Claude Sonnet 4.6'},
      {id:'claude-opus-4-6',            label:'Claude Opus 4.6'},
      {id:'claude-opus-4-5',            label:'Claude Opus 4.5'},
      {id:'claude-haiku-4-5-20251001',  label:'Claude Haiku 4.5'},
      {id:'claude-sonnet-4-5',          label:'Claude Sonnet 4.5'},
      {id:'claude-mythos-20251001',      label:'Claude Mythos  — Limited preview'},
    ]
  },
  gemini:{
    name:'Google Gemini',color:'#4285f4',abbr:'GM',
    keyHint:'AIza…',
    models:[
      {id:'gemini-3.5-flash',         label:'Gemini 3.5 Flash'},
      {id:'gemini-3.1-pro',           label:'Gemini 3.1 Pro'},
      {id:'gemini-3-flash',           label:'Gemini 3 Flash'},
      {id:'gemini-3.1-flash-lite',    label:'Gemini 3.1 Flash-Lite'},
      {id:'gemini-3.1-flash-live',    label:'Gemini 3.1 Flash Live'},
      {id:'gemini-2.5-pro',           label:'Gemini 2.5 Pro  — Stable'},
      {id:'gemini-2.5-flash',         label:'Gemini 2.5 Flash  — Stable'},
      {id:'gemini-deep-research',     label:'Gemini Deep Research'},
    ]
  },
  openai_compat:{
    name:'Custom (OpenAI-compatible)',color:'var(--accent)',abbr:'⚙',
    keyHint:'API Key',
    models:[]
  }
};

let _apiKeys={};  // {provider: {key, model, baseUrl?}}
let _activeModelId='arnav';

function _loadApiKeys(){
  try{_apiKeys=JSON.parse(localStorage.getItem('arnav-api-keys')||'{}');}catch(e){_apiKeys={};}
  _activeModelId=localStorage.getItem('arnav-active-model')||'arnav';
}

function _saveApiKeysToStorage(){
  localStorage.setItem('arnav-api-keys',JSON.stringify(_apiKeys));
}

function _updateModelSelector(){
  const nameEl=$('model-name'),dotEl=$('model-dot'),subEl=$('model-sub');
  if(!nameEl)return;
  if(_activeModelId==='arnav'){
    nameEl.textContent=window.MODEL||'Arnav AI';
    if(subEl)subEl.textContent='Default';
    if(dotEl){dotEl.style.background='var(--success)';dotEl.style.boxShadow='0 0 6px rgba(74,203,138,.5)';}
    return;
  }
  const prov=_API_PROVIDERS[_activeModelId];
  const kc=_apiKeys[_activeModelId];
  const modelLabel=prov?.models.find(m=>m.id===kc?.model)?.label?.split('—')[0].trim()||kc?.model||prov?.name||_activeModelId;
  nameEl.textContent=modelLabel;
  const tempStr=kc?.temperature!=null?` · ${parseFloat(kc.temperature).toFixed(2)}°`:'';
  if(subEl)subEl.textContent=(prov?.name||_activeModelId)+tempStr;
  if(dotEl&&prov?.color){
    dotEl.style.background=prov.color;
    dotEl.style.boxShadow='0 0 5px '+prov.color+'99';
  }
}

let _modelDdOpen=false;
function toggleModelSelector(){
  const dd=$('model-dropdown');if(!dd)return;
  if(_modelDdOpen){dd.classList.remove('on');_modelDdOpen=false;return;}

  const items=[
    {id:'arnav',name:window.MODEL||'Arnav AI',sub:'Default model',active:_activeModelId==='arnav',color:'var(--success)'}
  ];
  Object.entries(_API_PROVIDERS).forEach(([pid,prov])=>{
    const kc=_apiKeys[pid];
    if(!kc||!kc.key)return;
    const modelLabel=prov.models.find(m=>m.id===kc.model)?.label?.split('—')[0].trim()||kc.model||prov.name;
    const tempStr=kc.temperature!=null?`${parseFloat(kc.temperature).toFixed(2)}°`:'';
    items.push({id:pid,name:modelLabel,sub:prov.name,active:_activeModelId===pid,color:prov.color,temp:tempStr});
  });

  let html=items.map(item=>`
    <div class="model-dd-item${item.active?' active':''}" onclick="setActiveModel('${item.id}')">
      <div class="model-dd-dot" style="background:${item.color};box-shadow:0 0 5px ${item.color}66"></div>
      <div class="model-dd-info">
        <div class="model-dd-name">${esc(item.name)}</div>
        <div class="model-dd-sub">${esc(item.sub)}${item.temp?` · <span style="font-family:var(--mono)">${esc(item.temp)}</span>`:''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
        ${item.id!=='arnav'?`<button class="model-dd-cfg-btn" onclick="event.stopPropagation();$('model-dropdown').classList.remove('on');_modelDdOpen=false;document.removeEventListener('click',_closeModelDdOutside);openProviderConfig('${item.id}')" title="Configure">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>`:''}
        ${item.active?'<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="13" height="13" style="color:var(--accent2)"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>':''}
      </div>
    </div>`).join('');

  const hasCustom=Object.values(_apiKeys).some(k=>k&&k.key);
  if(!hasCustom){
    html+=`<div class="model-dd-setup">
      <div class="model-dd-setup-label">Add your own AI key</div>
      <div class="model-dd-setup-btns">
        ${['openai','anthropic','gemini','openai_compat'].map(pid=>{
          const p=_API_PROVIDERS[pid];
          return`<button class="model-dd-setup-btn" style="border-color:${p.color}22" onclick="$('model-dropdown').classList.remove('on');_modelDdOpen=false;document.removeEventListener('click',_closeModelDdOutside);openProviderConfig('${pid}')">
            <span class="model-dd-setup-badge" style="background:${p.color}">${p.abbr}</span>${pid==='openai_compat'?'Custom':p.name.split(' ')[0]}
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }else{
    html+='<div class="model-dd-footer" onclick="openSettings()">⚙ Manage API keys</div>';
  }

  dd.innerHTML=html;
  dd.classList.add('on');
  _modelDdOpen=true;
  setTimeout(()=>document.addEventListener('click',_closeModelDdOutside),10);
}
function _closeModelDdOutside(e){
  if($('model-selector')?.contains(e.target))return;
  $('model-dropdown')?.classList.remove('on');
  _modelDdOpen=false;
  document.removeEventListener('click',_closeModelDdOutside);
}
function setActiveModel(id){
  _activeModelId=id;
  localStorage.setItem('arnav-active-model',id);
  _updateModelSelector();
  $('model-dropdown')?.classList.remove('on');_modelDdOpen=false;
  const prov=id==='arnav'?{name:window.MODEL||'Arnav AI'}:_API_PROVIDERS[id];
  toast('Model: '+(prov?.name||id),'info',2000);
}

function _currentModelLabel(){
  if(_activeModelId==='arnav')return window.MODEL||'Arnav AI';
  const prov=_API_PROVIDERS[_activeModelId];
  const kc=_apiKeys[_activeModelId];
  return prov?.models.find(m=>m.id===kc?.model)?.label?.split('—')[0].trim()||kc?.model||prov?.name||_activeModelId;
}

function _renderApiKeysForm(){
  ['openai','anthropic','gemini'].forEach(pid=>{
    const prov=_API_PROVIDERS[pid];
    const kc=_apiKeys[pid]||{};
    const keyEl=$('apikey-'+pid);
    const modelEl=$('apimodel-'+pid);
    // Populate key input
    if(keyEl){keyEl.value=kc.key||'';keyEl.placeholder=prov.keyHint||'API Key';}
    // Rebuild select options from provider config (single source of truth)
    if(modelEl&&prov.models.length){
      const cur=kc.model||prov.models[0].id;
      modelEl.innerHTML=prov.models.map(m=>
        `<option value="${m.id}"${m.id===cur?' selected':''}>${m.label}</option>`
      ).join('');
    }
    // Restore status badge
    const stEl=$('apikey-status-'+pid);
    if(stEl){
      if(kc.ok===true){stEl.textContent='✓';stEl.className='apikey-status apikey-ok';}
      else if(kc.ok===false){stEl.textContent='✗';stEl.className='apikey-status apikey-err';}
      else{stEl.textContent='';stEl.className='apikey-status';}
    }
  });
  const kc=_apiKeys.openai_compat||{};
  const urlEl=$('apikey-compat-url'),cKeyEl=$('apikey-compat-key'),modEl=$('apikey-compat-model');
  if(urlEl)urlEl.value=kc.baseUrl||'';
  if(cKeyEl)cKeyEl.value=kc.key||'';
  if(modEl)modEl.value=kc.model||'';
}

function saveApiKeys(){
  ['openai','anthropic','gemini'].forEach(pid=>{
    const key=($('apikey-'+pid)?.value||'').trim();
    const model=$('apimodel-'+pid)?.value||_API_PROVIDERS[pid]?.models[0]?.id||'';
    if(key){
      // Preserve ok status if key didn't change
      const prev=_apiKeys[pid]||{};
      const ok=(prev.key===key)?prev.ok:undefined;
      _apiKeys[pid]={key,model,...(ok!==undefined?{ok}:{})};
    }else{
      delete _apiKeys[pid];
      if(_activeModelId===pid)setActiveModel('arnav');
    }
  });
  const cUrl=($('apikey-compat-url')?.value||'').trim();
  const cKey=($('apikey-compat-key')?.value||'').trim();
  const cModel=($('apikey-compat-model')?.value||'').trim();
  if(cKey&&cUrl){
    _apiKeys.openai_compat={key:cKey,baseUrl:cUrl,model:cModel||'gpt-3.5-turbo'};
  }else{
    delete _apiKeys.openai_compat;
    if(_activeModelId==='openai_compat')setActiveModel('arnav');
  }
  _saveApiKeysToStorage();
  _updateModelSelector();
  toast('API keys saved','ok',2000);
}

function toggleApiKeyVis(pid){
  const inp=$('apikey-'+pid);if(!inp)return;
  const isHidden=inp.type==='password';
  inp.type=isHidden?'text':'password';
  const btn=$('apikey-vis-'+pid);
  if(btn)btn.style.opacity=isHidden?'.6':'1';
}

// Test an API key by sending a minimal request
async function testApiKey(pid){
  const keyEl=$('apikey-'+pid);
  const modelEl=$('apimodel-'+pid);
  const key=(keyEl?.value||'').trim();
  if(!key){toast('Enter an API key first','err');return;}
  const model=modelEl?.value||_API_PROVIDERS[pid]?.models[0]?.id||'';
  const stEl=$('apikey-status-'+pid);
  const testBtn=$('apikey-test-'+pid);
  if(stEl){stEl.textContent='⋯';stEl.className='apikey-status apikey-testing';}
  if(testBtn){testBtn.disabled=true;testBtn.textContent='Testing…';}
  try{
    const u=_fbUser||window._auth?.currentUser;
    if(!u)throw new Error('Not signed in');
    const tok=await u.getIdToken();
    const kc=_apiKeys.openai_compat||{};
    const res=await fetch(_backendUrl()+'/proxy-chat',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
      body:JSON.stringify({
        provider:pid,api_key:key,model,
        messages:[{role:'user',content:'Reply with one word: OK'}],
        api_base_url:pid==='openai_compat'?(kc.baseUrl||''):'',
        web_search:false,code_mode:false
      })
    });
    if(!res.ok){
      const e=await res.json().catch(()=>({}));
      const status=res.status;
      // 429 rate limit means the key IS valid, just hit the limit
      if(status===429){
        if(stEl){stEl.textContent='⚠ Rate limit';stEl.className='apikey-status apikey-warn';}
        toast(_API_PROVIDERS[pid].name+': Key is valid but rate-limited. Wait and try again.','info',5000);
        if(!_apiKeys[pid]||_apiKeys[pid].key!==key)_apiKeys[pid]={key,model};
        _apiKeys[pid].ok=true; // treat rate limit as valid key
        _saveApiKeysToStorage();
        return;
      }
      throw new Error(e.detail||'HTTP '+status);
    }
    if(stEl){stEl.textContent='✓ Connected';stEl.className='apikey-status apikey-ok';}
    toast(_API_PROVIDERS[pid].name+' — connected! ✓','ok',3000);
    if(!_apiKeys[pid])_apiKeys[pid]={};
    _apiKeys[pid].key=key;_apiKeys[pid].model=model;_apiKeys[pid].ok=true;
    _saveApiKeysToStorage();
    _updateModelSelector();
  }catch(err){
    const msg=err.message||'';
    let hint=msg;
    if(msg.includes('401')||msg.toLowerCase().includes('invalid')||msg.toLowerCase().includes('auth'))
      hint='Invalid API key — check your key';
    else if(msg.includes('403'))hint='Access denied — check permissions';
    else if(msg.includes('404'))hint='Model not found — try a different model';
    else if(msg.includes('503')||msg.includes('unavailable'))hint='Service unavailable — try again later';
    if(stEl){stEl.textContent='✗ '+hint;stEl.className='apikey-status apikey-err';}
    toast(_API_PROVIDERS[pid].name+' error: '+hint,'err',5000);
    if(_apiKeys[pid])_apiKeys[pid].ok=false;
    _saveApiKeysToStorage();
  }finally{
    if(testBtn){testBtn.disabled=false;testBtn.textContent='Test';}
  }
}

// ══════════════════════════════════════
// PROVIDER CONFIG MODAL
// ══════════════════════════════════════
const _PROVIDER_KEY_URLS={
  openai:'https://platform.openai.com/api-keys',
  anthropic:'https://console.anthropic.com/account/keys',
  gemini:'https://aistudio.google.com/app/apikey',
  openai_compat:''
};
let _editingPid=null;

function _renderApiModelsCards(){
  const c=$('api-models-container');if(!c)return;
  const order=['openai','anthropic','gemini','openai_compat'];
  c.innerHTML=order.map(pid=>{
    const prov=_API_PROVIDERS[pid];
    const kc=_apiKeys[pid];
    const hasKey=!!(kc&&kc.key);
    const isActive=_activeModelId===pid&&hasKey;
    const modelLabel=hasKey?(prov?.models?.find(m=>m.id===kc.model)?.label?.split('—')[0].trim()||kc.model||prov?.name||pid):'';
    const tempLabel=hasKey&&kc.temperature!=null?`Temp ${parseFloat(kc.temperature).toFixed(2)}`:'';
    const statusCls=!hasKey?'amc-unconfigured':kc.ok===true?'amc-connected':kc.ok===false?'amc-error':'amc-saved';
    const statusTxt=!hasKey?'Not configured':kc.ok===true?'Connected':kc.ok===false?'Error':'Saved';
    const detail=[modelLabel,tempLabel].filter(Boolean).join(' · ');
    return`<div class="api-model-card${isActive?' amc-active':''}">
      <div class="amc-badge" style="background:${prov?.color||'var(--accent)'}">${prov?.abbr||'?'}</div>
      <div class="amc-info">
        <div class="amc-name">${esc(prov?.name||pid)}</div>
        <div class="amc-detail">${detail?esc(detail):'<span class="amc-uncfg-text">Not configured</span>'}</div>
      </div>
      <div class="amc-right">
        <span class="amc-status ${statusCls}"><span class="amc-sdot"></span>${statusTxt}</span>
        <div class="amc-btns">
          ${isActive?'<span class="amc-active-tag">Active</span>':hasKey?`<button class="amc-use-btn" onclick="setActiveModel('${pid}');_renderApiModelsCards()">Use</button>`:''}
          <button class="amc-cfg-btn" onclick="openProviderConfig('${pid}')">${hasKey?'Edit':'Set up'}</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openProviderConfig(pid){
  _editingPid=pid;
  const prov=_API_PROVIDERS[pid];
  const kc=_apiKeys[pid]||{};
  // Header
  const iconEl=$('pcfg-head-icon');
  if(iconEl){iconEl.textContent=prov?.abbr||'⚙';iconEl.style.background=prov?.color||'var(--accent)';}
  if($('pcfg-title'))$('pcfg-title').textContent='Configure '+(prov?.name||pid);
  // URL field — compat only
  const urlField=$('pcfg-url-field');
  if(urlField)urlField.style.display=pid==='openai_compat'?'':'none';
  const urlInp=$('pcfg-url');
  if(urlInp)urlInp.value=kc.baseUrl||'';
  // Key
  const keyInp=$('pcfg-key');
  if(keyInp){keyInp.value=kc.key||'';keyInp.type='password';}
  // Status
  const stEl=$('pcfg-status');
  if(stEl){
    if(kc.ok===true){stEl.textContent='✓ Connected — key is valid';stEl.className='pcfg-status apikey-ok';}
    else if(kc.ok===false){stEl.textContent='✗ Connection failed — check your key';stEl.className='pcfg-status apikey-err';}
    else{stEl.textContent='';stEl.className='pcfg-status';}
  }
  // Get key link
  const getLink=$('pcfg-get-key-link');
  if(getLink){const url=_PROVIDER_KEY_URLS[pid]||'';getLink.href=url||'#';getLink.style.display=url?'':'none';}
  // Model: dropdown vs free-text
  const modelSel=$('pcfg-model-select');
  const modelInp=$('pcfg-model-input');
  const isCompat=pid==='openai_compat';
  if(isCompat){
    if(modelSel)modelSel.style.display='none';
    if(modelInp){modelInp.style.display='';modelInp.value=kc.model||'';}
  }else{
    if(modelInp)modelInp.style.display='none';
    if(modelSel&&prov?.models?.length){
      const cur=kc.model||prov.models[0].id;
      modelSel.style.display='';
      modelSel.innerHTML=prov.models.map(m=>`<option value="${m.id}"${m.id===cur?' selected':''}>${m.label}</option>`).join('');
    }
  }
  // Temperature
  const tempRange=$('pcfg-temp');
  const tempValEl=$('pcfg-temp-val');
  const t=kc.temperature!=null?kc.temperature:0.7;
  if(tempRange){tempRange.value=t;_pcfgUpdateSlider(tempRange);}
  if(tempValEl)tempValEl.textContent=parseFloat(t).toFixed(2);
  // Max tokens
  const mtInp=$('pcfg-max-tokens');
  if(mtInp)mtInp.value=kc.maxTokens||'';
  // Remove button visibility
  const clearBtn=$('pcfg-clear-btn');
  if(clearBtn)clearBtn.style.display=kc&&kc.key?'':'none';
  // Open
  $('provider-config-modal').classList.add('on');
  setTimeout(()=>keyInp?.focus(),80);
}

// Close on Escape key inside pcfg modal
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('provider-config-modal')?.classList.contains('on')){
    closeModalId('provider-config-modal');
  }
});

function _pcfgUpdateSlider(el){
  // Update the CSS fill gradient on the range input
  const pct=((parseFloat(el.value)-parseFloat(el.min))/(parseFloat(el.max)-parseFloat(el.min)))*100;
  el.style.setProperty('--fill',pct.toFixed(1)+'%');
}

function togglePcfgKeyVis(){
  const inp=$('pcfg-key');if(!inp)return;
  inp.type=inp.type==='password'?'text':'password';
}

function _apiKeyErrHint(msg){
  if(!msg)return'Unknown error';
  if(msg.includes('401')||/invalid.*key|key.*invalid|auth.*fail/i.test(msg))return'Invalid API key';
  if(msg.includes('429'))return'Rate limit — wait a moment and retry';
  if(msg.includes('403'))return'Access denied — check your account';
  if(msg.includes('404'))return'Model not found — try a different model';
  if(msg.includes('503')||msg.includes('unavailable'))return'Service unavailable';
  return msg.slice(0,80);
}

async function testProviderConfig(){
  const pid=_editingPid;if(!pid)return;
  const key=($('pcfg-key')?.value||'').trim();
  if(!key){toast('Enter an API key first','err');return;}
  const isCompat=pid==='openai_compat';
  const model=(isCompat?$('pcfg-model-input')?.value:$('pcfg-model-select')?.value)||_API_PROVIDERS[pid]?.models?.[0]?.id||'gpt-3.5-turbo';
  const baseUrl=isCompat?($('pcfg-url')?.value||'').trim():'';
  if(isCompat&&!baseUrl){toast('Enter the Base URL first','err');return;}
  const stEl=$('pcfg-status');
  const testBtn=$('pcfg-test-btn');
  if(stEl){stEl.textContent='⋯ Testing connection…';stEl.className='pcfg-status apikey-testing';}
  if(testBtn){testBtn.disabled=true;testBtn.textContent='Testing…';}
  try{
    const u=_fbUser||window._auth?.currentUser;
    if(!u)throw new Error('Not signed in');
    const tok=await u.getIdToken();
    const res=await fetch(_backendUrl()+'/proxy-chat',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+tok},
      body:JSON.stringify({
        provider:pid,api_key:key,model:(model||'').trim(),
        messages:[{role:'user',content:'Reply with one word: OK'}],
        api_base_url:baseUrl,web_search:false,code_mode:false,
        temperature:0.1,max_tokens:64
      })
    });
    if(!res.ok){
      const e=await res.json().catch(()=>({}));
      if(res.status===429){
        if(stEl){stEl.textContent='⚠ Rate limited — key is valid';stEl.className='pcfg-status apikey-warn';}
        toast((_API_PROVIDERS[pid]?.name||pid)+': Key valid but rate-limited','info',4000);
        if(!_apiKeys[pid])_apiKeys[pid]={};
        Object.assign(_apiKeys[pid],{key,model,ok:true});
        _saveApiKeysToStorage();
        const cb=$('pcfg-clear-btn');if(cb)cb.style.display='';
        return;
      }
      throw new Error(e.detail||'HTTP '+res.status);
    }
    if(stEl){stEl.textContent='✓ Connected — key is valid!';stEl.className='pcfg-status apikey-ok';}
    toast((_API_PROVIDERS[pid]?.name||pid)+' connected ✓','ok',3000);
    if(!_apiKeys[pid])_apiKeys[pid]={};
    Object.assign(_apiKeys[pid],{key,model,ok:true});
    _saveApiKeysToStorage();
    const cb=$('pcfg-clear-btn');if(cb)cb.style.display='';
  }catch(err){
    const hint=_apiKeyErrHint(err.message||'');
    if(stEl){stEl.textContent='✗ '+hint;stEl.className='pcfg-status apikey-err';}
    toast((_API_PROVIDERS[pid]?.name||pid)+' error: '+hint,'err',5000);
    if(_apiKeys[pid])_apiKeys[pid].ok=false;
    _saveApiKeysToStorage();
  }finally{
    if(testBtn){testBtn.disabled=false;testBtn.textContent='Test';}
  }
}

function saveProviderConfig(){
  const pid=_editingPid;if(!pid)return;
  const isCompat=pid==='openai_compat';
  const key=($('pcfg-key')?.value||'').trim();
  if(!key){toast('API key is required','err');return;}
  const baseUrl=isCompat?($('pcfg-url')?.value||'').trim():'';
  if(isCompat&&!baseUrl){toast('Base URL is required for custom endpoints','err');return;}
  const model=((isCompat?$('pcfg-model-input')?.value:$('pcfg-model-select')?.value)||'').trim()||_API_PROVIDERS[pid]?.models?.[0]?.id||'';
  const temperature=Math.max(0,Math.min(2,parseFloat($('pcfg-temp')?.value)||0.7));
  const mtRaw=parseInt($('pcfg-max-tokens')?.value)||0;
  const prev=_apiKeys[pid]||{};
  const ok=(prev.key===key)?prev.ok:undefined;
  _apiKeys[pid]={key,model,temperature,...(mtRaw>0?{maxTokens:mtRaw}:{}),...(baseUrl?{baseUrl}:{}),...(ok!==undefined?{ok}:{})};
  _saveApiKeysToStorage();
  _activeModelId=pid;
  localStorage.setItem('arnav-active-model',pid);
  _updateModelSelector();
  _renderApiModelsCards();
  closeModalId('provider-config-modal');
  toast((_API_PROVIDERS[pid]?.name||pid)+' saved & set as active model','ok',3000);
}

function clearProviderConfig(){
  const pid=_editingPid;if(!pid)return;
  const name=_API_PROVIDERS[pid]?.name||pid;
  if(!confirm(`Remove ${name} configuration? Your API key will be deleted from this browser.`))return;
  delete _apiKeys[pid];
  _saveApiKeysToStorage();
  if(_activeModelId===pid)setActiveModel('arnav');
  _updateModelSelector();
  _renderApiModelsCards();
  closeModalId('provider-config-modal');
  toast(name+' removed','info',2000);
}

// ══════════════════════════════════════
// SAVED PROMPTS LIBRARY
// ══════════════════════════════════════
let _savedPrompts=[];
(function _loadSavedPrompts(){try{_savedPrompts=JSON.parse(localStorage.getItem('arnav-prompts')||'[]');}catch(e){_savedPrompts=[];}})();

const _STARTER_PROMPTS=[
  {id:'__sp1',label:'Explain simply',text:'Explain this concept in simple terms that a complete beginner would understand:'},
  {id:'__sp2',label:'Professional email',text:'Write a professional, polite, and concise email about the following topic:'},
  {id:'__sp3',label:'Brainstorm ideas',text:'Give me 10 creative and actionable ideas for:'},
  {id:'__sp4',label:'Debug code',text:'Debug the following code, explain what is wrong, and provide the corrected version:'},
  {id:'__sp5',label:'Summarize',text:'Provide a concise bullet-point summary of the key points from:'},
  {id:'__sp6',label:'Improve writing',text:'Improve the following text to make it clearer, more engaging, and professional:'},
  {id:'__sp7',label:'Pros & cons',text:'List the main pros and cons of:'},
  {id:'__sp8',label:'Step-by-step guide',text:'Write a clear step-by-step guide on how to:'},
];

function openPrompts(){
  _renderPromptsList('');
  $('prompts-modal').classList.add('on');
  setTimeout(()=>$('prompts-search')?.focus(),60);
}

function _renderPromptsList(filter){
  const list=$('prompts-list');if(!list)return;
  const all=[..._savedPrompts,..._STARTER_PROMPTS.filter(sp=>!_savedPrompts.find(p=>p.id===sp.id))];
  const q=(filter||'').toLowerCase();
  const filtered=q?all.filter(p=>p.text.toLowerCase().includes(q)||p.label.toLowerCase().includes(q)):all;
  if(!filtered.length){list.innerHTML='<div class="prompts-empty">No matching templates.</div>';return;}
  list.innerHTML='';
  filtered.forEach(p=>{
    const d=document.createElement('div');d.className='prompt-item';
    const isDefault=p.id.startsWith('__sp');
    d.innerHTML=`<div class="prompt-item-inner"><div class="prompt-item-label">${esc(p.label)}</div><div class="prompt-item-text">${esc(p.text)}</div></div>${!isDefault?`<button class="prompt-del" title="Delete" onclick="deletePrompt(event,'${p.id}')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button>`:''}`;
    d.querySelector('.prompt-item-inner').addEventListener('click',()=>{
      $('cinput').value=p.text;onInput($('cinput'));$('cinput').focus();closeModalId('prompts-modal');
    });
    list.appendChild(d);
  });
}

function saveCurrentAsPrompt(){
  const text=($('cinput').value||'').trim();
  if(!text){toast('Type a message first to save as a template','err');return;}
  const label=text.length>32?text.slice(0,30)+'…':text;
  const p={id:genId(),label,text,createdAt:Date.now()};
  _savedPrompts.unshift(p);
  localStorage.setItem('arnav-prompts',JSON.stringify(_savedPrompts));
  toast('Template saved ★','ok',2000);
  _renderPromptsList($('prompts-search')?.value||'');
}

function deletePrompt(e,id){
  e.stopPropagation();
  _savedPrompts=_savedPrompts.filter(p=>p.id!==id);
  localStorage.setItem('arnav-prompts',JSON.stringify(_savedPrompts));
  _renderPromptsList($('prompts-search')?.value||'');
  toast('Template removed','info',1500);
}

// ── init ──
$('cinput').addEventListener('input',function(){_updateSendBtn();});

// ══════════════════════════════════════
// ADMIN PANEL
// ══════════════════════════════════════
const _ADMIN_EMAIL='arnavrival12@gmail.com';
let _adminUnlocked=false,_adminClickCount=0,_adminClickTimer=null;
let _adminUsersCache=null,_adminCurrentSection='overview';

async function _saveUserMeta(u){
  if(!u||!window._db)return;
  try{
    await window._fsSet(
      window._fsDoc(window._db,'users',u.uid),
      {uid:u.uid,email:u.email||'',displayName:u.displayName||'',lastLogin:window._fsTimestamp()},
      {merge:true}
    );
  }catch(e){}
}

function _adminBrandClick(){
  _adminClickCount++;
  clearTimeout(_adminClickTimer);
  _adminClickTimer=setTimeout(()=>{_adminClickCount=0;},3000);
  if(_adminClickCount>=5){_adminClickCount=0;_tryOpenAdmin();}
}

function _tryOpenAdmin(){
  const u=_fbUser||window._auth?.currentUser;
  if(!u){toast('Sign in first','err');return;}
  if(u.email!==_ADMIN_EMAIL){toast('Not authorized','err');return;}
  if(_adminUnlocked){_showAdminPanel();return;}
  const saved=localStorage.getItem('arnav-admin-key')||'8574';
  const code=prompt('Enter admin passcode:');
  if(code===null)return;
  if(code!==saved){toast('Wrong passcode','err');return;}
  _adminUnlocked=true;
  _showAdminPanel();
}

function _showAdminPanel(){
  const panel=$('admin-panel');if(!panel)return;
  panel.style.display='flex';
  const uinfo=$('admin-user-info');
  if(uinfo){const u=_fbUser||window._auth?.currentUser;uinfo.textContent=u?.email||'';}
  window.history.replaceState({},'',window.location.pathname+'#admin');
  adminNav('overview');
}

function closeAdmin(){
  const panel=$('admin-panel');if(panel)panel.style.display='none';
  window.history.replaceState({},'',window.location.pathname);
  _adminUsersCache=null;
}

function adminNav(section){
  _adminCurrentSection=section;
  document.querySelectorAll('.admin-nav-btn').forEach(b=>{
    b.classList.toggle('active',b.dataset.section===section);
  });
  const main=$('admin-main');if(!main)return;
  main.innerHTML='<div class="admin-loading"><div class="admin-spinner"></div>Loading…</div>';
  switch(section){
    case 'overview': _adminRenderOverview();break;
    case 'users':    _adminRenderUsers();break;
    case 'subs':     _adminRenderSubs();break;
    case 'activity': _adminRenderActivity();break;
    case 'health':   _adminRenderHealth();break;
    case 'settings': _adminRenderSettings();break;
  }
}

async function _adminFetchUsers(){
  if(_adminUsersCache)return _adminUsersCache;
  try{
    const tok=await (_fbUser||window._auth.currentUser).getIdToken();
    const res=await fetch(_backendUrl()+'/admin/users',{headers:{Authorization:'Bearer '+tok}});
    if(!res.ok){
      const err=await res.json().catch(()=>({}));
      if(res.status===403){
        return {error:'permission',msg:'Firestore rules need to allow admin reads. See Admin → Settings for instructions.'};
      }
      return {error:'fetch',msg:err.detail||'Load failed ('+res.status+')'};
    }
    const data=await res.json();
    _adminUsersCache=data.users||[];
    return _adminUsersCache;
  }catch(e){return {error:'network',msg:e.message};}
}

async function _adminRenderOverview(){
  const main=$('admin-main');if(!main)return;
  const users=await _adminFetchUsers();
  const hasErr=users&&users.error;
  const list=hasErr?[]:users;

  const total=list.length;
  const plus=list.filter(u=>u.plan==='plus').length;
  const pro=list.filter(u=>u.plan==='pro').length;
  const totalMsgs=list.reduce((s,u)=>s+(u.stat_totalMessages||0),0);
  const totalWords=list.reduce((s,u)=>s+(u.stat_wordsGenerated||0),0);

  let healthHtml='<span class="admin-badge-status loading">Checking…</span>';

  main.innerHTML=`
    <div class="admin-section-title">Overview</div>
    ${hasErr?`<div class="admin-warn">${users.msg}</div>`:''}
    <div class="admin-kpi-grid">
      <div class="admin-kpi"><div class="admin-kpi-val">${total}</div><div class="admin-kpi-lbl">Total users</div></div>
      <div class="admin-kpi"><div class="admin-kpi-val">${totalMsgs.toLocaleString()}</div><div class="admin-kpi-lbl">Messages sent</div></div>
      <div class="admin-kpi"><div class="admin-kpi-val">${(totalWords/1000).toFixed(1)}K</div><div class="admin-kpi-lbl">Words generated</div></div>
      <div class="admin-kpi"><div class="admin-kpi-val">${plus}</div><div class="admin-kpi-lbl">Plus subscribers</div></div>
      <div class="admin-kpi"><div class="admin-kpi-val">${pro}</div><div class="admin-kpi-lbl">Pro subscribers</div></div>
      <div class="admin-kpi"><div class="admin-kpi-val" id="admin-health-val">${healthHtml}</div><div class="admin-kpi-lbl">Backend health</div></div>
    </div>
    <div class="admin-section-title" style="margin-top:24px">Recent users</div>
    ${_adminUserTable(list.slice(0,8),'compact')}
  `;

  // Ping health in background
  fetch(_backendUrl()+'/health').then(r=>r.ok?r.json():null).then(d=>{
    const el=$('admin-health-val');
    if(el)el.innerHTML=d?'<span class="admin-badge-status ok">● Online</span>':'<span class="admin-badge-status err">● Offline</span>';
  }).catch(()=>{const el=$('admin-health-val');if(el)el.innerHTML='<span class="admin-badge-status err">● Offline</span>';});
}

async function _adminRenderUsers(){
  const main=$('admin-main');if(!main)return;
  const users=await _adminFetchUsers();
  if(users&&users.error){main.innerHTML=`<div class="admin-section-title">Users</div><div class="admin-warn">${users.msg}</div>`;return;}
  main.innerHTML=`
    <div class="admin-section-hdr">
      <div class="admin-section-title">All Users (${users.length})</div>
      <button class="admin-btn" onclick="_adminUsersCache=null;adminNav('users')">↻ Refresh</button>
    </div>
    <input class="admin-search" id="admin-user-search" placeholder="Search by email or name…" oninput="_adminFilterUsers(this.value)"/>
    <div id="admin-users-table-wrap">${_adminUserTable(users,'full')}</div>
  `;
}

function _adminFilterUsers(q){
  const wrap=$('admin-users-table-wrap');if(!wrap||!_adminUsersCache)return;
  const filtered=q?_adminUsersCache.filter(u=>(u.email||'').toLowerCase().includes(q.toLowerCase())||(u.displayName||'').toLowerCase().includes(q.toLowerCase())):_adminUsersCache;
  wrap.innerHTML=_adminUserTable(filtered,'full');
}

function _adminUserTable(users,mode){
  if(!users||!users.length)return '<div class="admin-empty">No users found.<br>Ensure Firestore rules allow admin reads. See Settings tab.</div>';
  const isCompact=mode==='compact';
  const rows=users.map(u=>{
    const lastLogin=u.lastLogin?new Date(u.lastLogin).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'—';
    const planBadge=u.plan==='pro'?'<span class="admin-plan pro">Pro</span>':u.plan==='plus'?'<span class="admin-plan plus">Plus</span>':'<span class="admin-plan free">Free</span>';
    const msgs=u.stat_totalMessages||0;
    const words=u.stat_wordsGenerated||0;
    const streak=u.prof_streak||0;
    if(isCompact){
      return `<tr><td class="admin-td-avatar"><div class="admin-user-av" style="background:${_avatarGradient(u.displayName||u.email||'?')}">${_initials(u.displayName||u.email||'?')}</div></td><td><div class="admin-td-name">${esc(u.displayName||'—')}</div><div class="admin-td-email">${esc(u.email||u.uid)}</div></td><td>${planBadge}</td><td>${msgs.toLocaleString()}</td><td>${lastLogin}</td></tr>`;
    }
    return `<tr><td class="admin-td-avatar"><div class="admin-user-av" style="background:${_avatarGradient(u.displayName||u.email||'?')}">${_initials(u.displayName||u.email||'?')}</div></td><td><div class="admin-td-name">${esc(u.displayName||'—')}</div><div class="admin-td-email">${esc(u.email||u.uid)}</div></td><td>${planBadge}</td><td>${msgs.toLocaleString()}</td><td>${words>=1000?(words/1000).toFixed(1)+'K':words}</td><td>${streak}🔥</td><td class="admin-td-uid">${u.uid}</td><td>${lastLogin}</td></tr>`;
  }).join('');

  if(isCompact){
    return `<table class="admin-table"><thead><tr><th colspan="2">User</th><th>Plan</th><th>Msgs</th><th>Last Login</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  return `<div class="admin-table-scroll"><table class="admin-table"><thead><tr><th colspan="2">User</th><th>Plan</th><th>Msgs</th><th>Words</th><th>Streak</th><th>UID</th><th>Last Login</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

async function _adminRenderSubs(){
  const main=$('admin-main');if(!main)return;
  const users=await _adminFetchUsers();
  if(users&&users.error){main.innerHTML=`<div class="admin-section-title">Subscriptions</div><div class="admin-warn">${users.msg}</div>`;return;}
  const plus=users.filter(u=>u.plan==='plus');
  const pro=users.filter(u=>u.plan==='pro');
  const free=users.filter(u=>!u.plan||u.plan==='free');
  main.innerHTML=`
    <div class="admin-section-title">Subscriptions</div>
    <div class="admin-kpi-grid">
      <div class="admin-kpi"><div class="admin-kpi-val admin-kv-free">${free.length}</div><div class="admin-kpi-lbl">Free</div></div>
      <div class="admin-kpi"><div class="admin-kpi-val admin-kv-plus">${plus.length}</div><div class="admin-kpi-lbl">Plus ($20/mo)</div></div>
      <div class="admin-kpi"><div class="admin-kpi-val admin-kv-pro">${pro.length}</div><div class="admin-kpi-lbl">Pro ($200/mo)</div></div>
      <div class="admin-kpi"><div class="admin-kpi-val">$${(plus.length*20+pro.length*200).toLocaleString()}</div><div class="admin-kpi-lbl">Est. MRR</div></div>
    </div>
    ${pro.length?`<div class="admin-section-title" style="margin-top:20px">Pro Subscribers</div>${_adminUserTable(pro,'compact')}`:''}
    ${plus.length?`<div class="admin-section-title" style="margin-top:20px">Plus Subscribers</div>${_adminUserTable(plus,'compact')}`:''}
  `;
}

async function _adminRenderActivity(){
  const main=$('admin-main');if(!main)return;
  const users=await _adminFetchUsers();
  if(users&&users.error){main.innerHTML=`<div class="admin-section-title">Activity</div><div class="admin-warn">${users.msg}</div>`;return;}

  // Aggregate daily activity across all users
  const combined={};
  users.forEach(u=>{
    if(!u.stat_dailyActivity)return;
    Object.entries(u.stat_dailyActivity).forEach(([date,count])=>{
      combined[date]=(combined[date]||0)+count;
    });
  });

  // Sort by most-active users
  const sorted=[...users].sort((a,b)=>(b.stat_totalMessages||0)-(a.stat_totalMessages||0));

  const chartContainer=document.createElement('div');
  chartContainer.className='stats-activity-chart admin-activity-chart';
  _renderActivityChart(combined,chartContainer,30);

  main.innerHTML=`
    <div class="admin-section-title">Activity</div>
    <div class="admin-section-desc">Combined message volume across all users (last 30 days)</div>
    <div class="admin-activity-wrap" id="admin-activity-wrap"></div>
    <div class="admin-section-title" style="margin-top:20px">Most Active Users</div>
    ${_adminUserTable(sorted.slice(0,15),'compact')}
  `;
  $('admin-activity-wrap').appendChild(chartContainer);
}

async function _adminRenderHealth(){
  const main=$('admin-main');if(!main)return;
  main.innerHTML=`
    <div class="admin-section-title">System Health</div>
    <div class="admin-health-grid">
      <div class="admin-health-row"><span>Backend URL</span><code>${_backendUrl()}</code></div>
      <div class="admin-health-row"><span>Backend status</span><span id="admin-hc-backend" class="admin-badge-status loading">Checking…</span></div>
      <div class="admin-health-row"><span>Model</span><span id="admin-hc-model">—</span></div>
      <div class="admin-health-row"><span>Tavily (web search)</span><span id="admin-hc-tavily">—</span></div>
      <div class="admin-health-row"><span>Stripe configured</span><span id="admin-hc-stripe">—</span></div>
      <div class="admin-health-row"><span>Firebase project</span><span id="admin-hc-firebase">—</span></div>
    </div>
  `;
  try{
    const tok=await (_fbUser||window._auth.currentUser).getIdToken();
    const res=await fetch(_backendUrl()+'/admin/health',{headers:{Authorization:'Bearer '+tok}});
    if(res.ok){
      const d=await res.json();
      const _si=(id,val,ok)=>{const el=$(id);if(el){el.textContent=val;if(ok!==undefined)el.className='admin-badge-status '+(ok?'ok':'warn');}};
      _si('admin-hc-backend','● Online',true);
      _si('admin-hc-model',d.model);
      _si('admin-hc-tavily',d.tavily_enabled?'Enabled':'Disabled',d.tavily_enabled);
      _si('admin-hc-stripe',d.stripe_configured?'Configured':'Missing',d.stripe_configured);
      _si('admin-hc-firebase',d.firebase_project);
    }else{
      $('admin-hc-backend').textContent='● Error '+res.status;$('admin-hc-backend').className='admin-badge-status err';
    }
  }catch(e){
    $('admin-hc-backend').textContent='● Offline';$('admin-hc-backend').className='admin-badge-status err';
  }
}

function _adminRenderSettings(){
  const main=$('admin-main');if(!main)return;
  const u=_fbUser||window._auth?.currentUser;
  const uid=u?.uid||'(not logged in)';
  main.innerHTML=`
    <div class="admin-section-title">Admin Settings</div>

    <div class="admin-settings-card">
      <div class="admin-settings-label">Change Admin Passcode</div>
      <div class="admin-settings-row">
        <input class="admin-input" type="password" id="admin-new-passcode" placeholder="New passcode (any length)" maxlength="32"/>
        <button class="admin-btn admin-btn-primary" onclick="_adminSavePasscode()">Save Passcode</button>
      </div>
      <div class="admin-settings-hint">Current passcode stored locally in your browser.</div>
    </div>

    <div class="admin-settings-card">
      <div class="admin-settings-label">Your Admin UID</div>
      <div class="admin-uid-box" onclick="navigator.clipboard.writeText('${uid}').then(()=>toast('UID copied','ok',1500))" title="Click to copy">${uid}</div>
      <div class="admin-settings-hint">Copy this UID to update your Firestore security rules for full admin access.</div>
    </div>

    <div class="admin-settings-card">
      <div class="admin-settings-label">Firestore Security Rules</div>
      <div class="admin-settings-hint" style="margin-bottom:8px">To enable the Users, Subscriptions, and Activity sections, update your Firestore rules in the <a href="https://console.firebase.google.com/project/arnavai-e9446/firestore/rules" target="_blank" class="admin-link">Firebase Console</a>:</div>
      <pre class="admin-code-block">rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid == '${uid}';
    }
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid == '${uid}';
    }
  }
}</pre>
      <button class="admin-btn" onclick="navigator.clipboard.writeText(document.querySelector('.admin-code-block').textContent).then(()=>toast('Rules copied','ok',1500))">Copy Rules</button>
    </div>

    <div class="admin-settings-card">
      <div class="admin-settings-label">Clear Cache</div>
      <button class="admin-btn" onclick="_adminUsersCache=null;toast('Cache cleared','ok',1500)">Clear user data cache</button>
      <div class="admin-settings-hint">Force-reload user data on next view.</div>
    </div>

    <div class="admin-settings-card">
      <div class="admin-settings-label">Lock Admin Panel</div>
      <button class="admin-btn admin-btn-danger" onclick="_adminUnlocked=false;closeAdmin();toast('Admin locked','info',2000)">Lock &amp; Close</button>
      <div class="admin-settings-hint">You will need to enter the passcode again to reopen.</div>
    </div>
  `;
}

function _adminSavePasscode(){
  const inp=$('admin-new-passcode');if(!inp||!inp.value.trim()){toast('Enter a passcode','err');return;}
  localStorage.setItem('arnav-admin-key',inp.value.trim());
  inp.value='';
  toast('Passcode saved','ok',2000);
}

window.addEventListener('hashchange',()=>{if(window.location.hash==='#admin')_tryOpenAdmin();});
