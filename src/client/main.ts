import './style.css';
import { mountBoard } from './board.ts';
import { TILES } from '../engine/types.ts';
import type { GameAction, GameState, PublicState, Terrain } from '../engine/types.ts';

type Lang='en'|'id'|'ja';
const translations={
  en:{tagline:'An online treasure-hunting board adventure',name:'Your nickname',room:'Room code',create:'Create room',join:'Join room',invite:'Share invite',start:'Start game',waiting:'Waiting for players',bots:'Computer players',turn:'Turn',current:'Playing',roll:'Roll dice',end:'End turn',send:'Send robot',claim:'Claim gallery',inventory:'Treasures',gallery:'Galleries',players:'Explorers',feed:'Activity log',leave:'Leave room',rules:'Alpha rules are provisional. Original-game formulas require verification.',lost:'Connection interrupted; trying to reconnect.',online:'Live',offline:'Reconnecting',solo:'Play against bots or invite friends',copy:'Copy invite',energy:'Energy',worth:'Assets',winner:'Winner',you:'you',robot:'Robot expedition',display:'Display',gold:'Gold',cards:'Gate cards',help:'Send your robot before rolling. After rolling, manage galleries, then end your turn.',locale:'Language'},
  id:{tagline:'Petualangan board game pencari harta online',name:'Nama pemain',room:'Kode room',create:'Buat room',join:'Gabung room',invite:'Bagikan undangan',start:'Mulai permainan',waiting:'Menunggu pemain',bots:'Jumlah pemain AI',turn:'Giliran',current:'Sedang bermain',roll:'Lempar dadu',end:'Akhiri giliran',send:'Kirim robot',claim:'Klaim galeri',inventory:'Harta',gallery:'Galeri',players:'Pemain',feed:'Aktivitas',leave:'Keluar room',rules:'Aturan alpha masih sementara. Rumus original perlu diverifikasi.',lost:'Koneksi terputus; menyambung kembali.',online:'Terhubung',offline:'Menyambung ulang',solo:'Main melawan AI atau undang teman',copy:'Salin undangan',energy:'Energi',worth:'Aset',winner:'Pemenang',you:'kamu',robot:'Ekspedisi robot',display:'Pajang',gold:'Emas',cards:'Gate Card',help:'Kirim robot sebelum lempar dadu. Setelah dadu, atur galeri lalu akhiri giliran.',locale:'Bahasa'},
  ja:{tagline:'オンライン宝探しボードゲーム',name:'プレイヤー名',room:'ルームコード',create:'ルーム作成',join:'参加',invite:'招待を共有',start:'ゲーム開始',waiting:'プレイヤー待機中',bots:'CPU人数',turn:'ターン',current:'プレイ中',roll:'サイコロ',end:'ターン終了',send:'ロボット派遣',claim:'ギャラリーを獲得',inventory:'宝物',gallery:'ギャラリー',players:'プレイヤー',feed:'イベント履歴',leave:'退出',rules:'アルファ版のルールは仮設定です。原作の計算式は要確認。',lost:'接続が切れました。再接続中…',online:'接続中',offline:'再接続中',solo:'CPUと対戦、または友達を招待',copy:'招待リンクをコピー',energy:'エネルギー',worth:'資産',winner:'勝者',you:'あなた',robot:'ロボット探検',display:'展示',gold:'ゴールド',cards:'ゲートカード',help:'サイコロ前にロボットを派遣できます。移動後ギャラリーを管理し、ターンを終了します。',locale:'言語'}
} as const;
let lang:Lang=(localStorage.getItem('treasure-bots-lang') as Lang)||((navigator.language||'').toLowerCase().startsWith('id')?'id':'en');
if(!translations[lang])lang='en';
const t=(key:keyof typeof translations.en)=>translations[lang][key];
const escapeHtml=(s:string):string=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
let state:PublicState|null=null;let token='';let board:ReturnType<typeof mountBoard>|null=null;
let socket:WebSocket|null=null;let poll:ReturnType<typeof setInterval>|null=null;
let busy=false;
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`
  <header class="topbar"><div class="brand"><span class="logo">✦</span><div><strong>TREASURE BOTS</strong><small>FAITHFUL-INSPIRED ALPHA</small></div></div><div class="header-actions"><span id="status" class="status"></span><select id="langSelect" aria-label="Language"><option value="en">EN</option><option value="id">ID</option><option value="ja">日本語</option></select></div></header>
  <main>
    <section id="home" class="home-panel"><div class="hero"><div class="hero-gem">◇</div><div class="eyebrow">BOARD × ROBOTS × TREASURE</div><h1>Discover. Collect.<br><em>Outsmart.</em></h1><p data-i18n="tagline"></p></div><div class="card form-card"><label for="playerName" data-i18n="name"></label><input id="playerName" autocomplete="nickname" maxlength="22" placeholder="Explorer" value="Explorer"/><button id="create" class="primary" data-i18n="create"></button><div class="or">— OR —</div><label for="roomInput" data-i18n="room"></label><div class="inline"><input id="roomInput" maxlength="6" placeholder="ABCD23" autocapitalize="characters"/><button id="join" class="secondary" data-i18n="join"></button></div><p class="muted" data-i18n="solo"></p></div></section>
    <section id="lobby" hidden><div class="card lobby-card"><span class="eyebrow">PRIVATE LOBBY</span><h2 id="roomTitle">ROOM</h2><p data-i18n="waiting"></p><div id="lobbyPlayers" class="roster"></div><button id="share" class="secondary" data-i18n="invite"></button><div id="hostControls" class="host-controls"><label data-i18n="bots"></label><select id="botCount"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3" selected>3</option></select><button id="start" class="primary" data-i18n="start"></button></div></div></section>
    <section id="match" hidden><div class="match-head"><div><span class="eyebrow" id="matchCode"></span><h2 id="turnTitle"></h2></div><div class="turn-badge" id="turnBadge"></div></div><div class="match-grid"><div class="board-shell"><div id="board"></div><div class="legend"><span><i class="leg gallery"></i> Gallery</span><span><i class="leg shop"></i> Shop</span><span><i class="leg event"></i> Event</span><span><i class="leg support"></i> Support</span></div></div><aside class="sidebar"><div class="card"><div class="panel-heading"><h3 data-i18n="players"></h3><span id="dice" class="dice"></span></div><div id="players" class="roster"></div></div><div class="card"><h3 data-i18n="inventory"></h3><div id="inventory" class="inventory"></div></div><div class="card"><h3 data-i18n="feed"></h3><div id="feed" class="feed"></div></div></aside></div><div class="controls"><div class="action-row"><select id="terrain"><option value="RUINS">🏛 Ruins</option><option value="FOREST">🌳 Forest</option><option value="COAST">🌊 Coast</option></select><button id="sendRobot" class="secondary" data-i18n="send"></button><button id="claimGallery" class="secondary" data-i18n="claim"></button></div><div class="action-row"><button id="roll" class="primary" data-i18n="roll"></button><button id="end" class="primary gold" data-i18n="end"></button></div><p class="hint" data-i18n="help"></p></div></section>
    <div id="message" class="toast" role="status" aria-live="polite" hidden></div>
  </main><footer><span data-i18n="rules"></span><button id="leave" class="link" data-i18n="leave"></button></footer>`;
const el=<T = HTMLElement>(id:string):T=>document.getElementById(id) as unknown as T;
function translate():void{
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node=>{ const key=node.dataset.i18n as keyof typeof translations.en;if(translations[lang][key])node.textContent=t(key);});
  el<HTMLSelectElement>('langSelect').value=lang;
  if(state)render();
}
function toast(msg:string):void { const node=el('message');node.textContent=msg;node.hidden=false;setTimeout(()=>node.hidden=true,3600); }
function gameUrl(code:string):string {return `${location.origin}/?room=${encodeURIComponent(code)}`;}
async function api(path:string,method='GET',body?:unknown,accessToken=token):Promise<any> {
  const response=await fetch(path,{method,headers:{'Content-Type':'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||'Request failed.');return data;
}
async function startSession(response:{state:PublicState,token:string}):Promise<void> {
  state=response.state;token=response.token;
  localStorage.setItem(`treasure-bots-${state.code}`,token);
  history.replaceState(null,'',`/?room=${state.code}`);
  connect();render();
}
async function createRoom():Promise<void>{
  await withBusy(async()=>startSession(await api('/api/rooms','POST',{name:el<HTMLInputElement>('playerName').value},'')));
}
async function joinRoom():Promise<void>{
  const code=el<HTMLInputElement>('roomInput').value.trim().toUpperCase();
  if(!/^[A-Z0-9]{6}$/.test(code)){toast('Please enter a six-character room code.');return;}
  await withBusy(async()=>startSession(await api(`/api/rooms/${code}/join`,'POST',{name:el<HTMLInputElement>('playerName').value},'')));
}
async function withBusy(work:()=>Promise<void>):Promise<void>{
  if(busy)return;busy=true;
  try{await work();}catch(e){toast(e instanceof Error?e.message:'Unexpected error.');}finally{busy=false;}
}
async function sendAction(action:GameAction):Promise<void>{
  if(!state)return;
  await withBusy(async()=>{
    const data=await api(`/api/rooms/${state!.code}/action`,'POST',{expectedVersion:state!.version,action});
    state=data.state;render();
  });
}
function connect():void{
  if(!state)return;
  socket?.close();if(poll)clearInterval(poll);
  const code=state.code;
  const url=`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/rooms/${code}/socket`;
  socket=new WebSocket(url);
  socket.addEventListener('open',()=>{socket?.send(JSON.stringify({type:'auth',token}));status(true);});
  socket.addEventListener('message',event=>{try{const message=JSON.parse(event.data);if(message.type==='snapshot'){state=message.state;render();}else if(message.type==='error')toast(message.error);}catch{}});
  socket.addEventListener('close',()=>status(false));
  socket.addEventListener('error',()=>status(false));
  poll=setInterval(async()=>{if(!state)return;try{const data=await api(`/api/rooms/${code}/state`);if(data.state.version!==state.version){state=data.state;render();}if(!socket||socket.readyState===WebSocket.CLOSED)reconnect();}catch{}},6000);
}
function reconnect():void{
  if(!state||!token)return;
  const code=state.code;
  const url=`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/rooms/${code}/socket`;
  socket=new WebSocket(url);
  socket.onopen=()=>{socket?.send(JSON.stringify({type:'auth',token}));status(true);};
  socket.onmessage=e=>{try{const msg=JSON.parse(e.data);if(msg.type==='snapshot'){state=msg.state;render();}}catch{}};
  socket.onclose=()=>status(false);
}
function status(connected:boolean):void{
  const node=el('status');node.className=`status ${connected?'connected':'disconnected'}`;node.textContent=state?(connected?t('online'):t('offline')):'';
}
function render():void {
  const active=!!state;const playing=active&&state!.phase!=='lobby';
  el('home').hidden=active;el('lobby').hidden=!active||playing;el('match').hidden=!playing;
  el('leave').hidden=!active;
  if(!active)return;
  const s=state!;
  if(!playing){
    el('roomTitle').textContent=s.code;
    el('lobbyPlayers').innerHTML=s.players.map(p=>`<div class="person"><span class="dot" style="background:${p.color}"></span><strong>${escapeHtml(p.name)}</strong>${p.id===s.hostId?'<span class="muted">HOST</span>':''}</div>`).join('');
    const host=s.yourId===s.hostId;
    el('hostControls').hidden=!host;
    const botSelect=el<HTMLSelectElement>('botCount');
    for(const opt of [...botSelect.options])opt.disabled=Number(opt.value)>4-s.players.length;
    if(Number(botSelect.value)>4-s.players.length)botSelect.value=String(4-s.players.length);
    return;
  }
  el('matchCode').textContent=`ROOM ${s.code} · ${t('turn')} ${s.turn}`;
  const activePlayer=s.players[s.currentPlayerIndex];const mine=activePlayer.id===s.yourId;
  el('turnTitle').textContent=s.phase==='finished'?`${t('winner')}: ${s.players.find(p=>p.id===s.winnerId)?.name||''}`:`${activePlayer.name}${mine?` (${t('you')})`:''}`;
  el('turnBadge').textContent=s.phase==='finished'?'🏆':mine?'YOUR TURN':'WAITING';
  el('dice').textContent=s.dice?`🎲 ${s.dice.join(' + ')}`:'🎲 —';
  el('players').innerHTML=s.players.map((p,i)=>{
    const galleries=s.galleries.filter(g=>g.ownerId===p.id).length;
    return `<div class="person ${i===s.currentPlayerIndex?'current':''}"><span class="dot" style="background:${p.color}"></span><div class="person-info"><strong>${escapeHtml(p.name)} ${p.isBot?'🤖':''}</strong><small>${t('gold')}: ${p.gold.toLocaleString()} G · ${t('gallery')}: ${galleries}</small><small>${t('energy')}: ${p.robot.energy} · ${t('cards')}: ${p.gateCards}</small></div></div>`;
  }).join('');
  const self=s.players.find(p=>p.id===s.yourId);
  el('inventory').innerHTML=self?.inventory.length?self.inventory.map(item=>`<div class="item"><div><strong>${escapeHtml(item.name)}</strong><small>${item.value} G · ${escapeHtml(item.category)}</small></div><button class="tiny secondary" data-treasure="${escapeHtml(item.id)}">${t('display')}</button></div>`).join(''):'<p class="muted">No treasures yet. Send your robot to explore!</p>';
  document.querySelectorAll<HTMLButtonElement>('[data-treasure]').forEach(btn=>btn.onclick=()=>void sendAction({type:'DISPLAY_TREASURE',treasureId:btn.dataset.treasure!}));
  el('feed').innerHTML=[...s.logs].reverse().slice(0,16).map(item=>`<p><span class="log-turn">#${item.turn}</span> ${escapeHtml(item.message)}</p>`).join('');
  const canAct=mine&&s.phase==='playing';
  el<HTMLButtonElement>('roll').disabled=!canAct||s.rolled;
  el<HTMLButtonElement>('end').disabled=!canAct||!s.rolled;
  el<HTMLButtonElement>('sendRobot').disabled=!canAct||s.rolled||!!self?.robot.mission||!self?.gateCards;
  const gallery=s.galleries.find(g=>g.tile===self?.position);
  el<HTMLButtonElement>('claimGallery').disabled=!canAct||!s.rolled||!gallery||!!gallery.ownerId||self!.gold<800;
  for(const btn of document.querySelectorAll<HTMLButtonElement>('[data-treasure]'))btn.disabled=!canAct;
  if(!board){board=mountBoard(el('board'));requestAnimationFrame(()=>{if(state)board?.update(state);});}
  else board.update(s);
}
function init():void {
  el<HTMLButtonElement>('create').onclick=()=>void createRoom();
  el<HTMLButtonElement>('join').onclick=()=>void joinRoom();
  el<HTMLButtonElement>('start').onclick=()=>void sendAction({type:'START',bots:Number(el<HTMLSelectElement>('botCount').value)});
  el<HTMLButtonElement>('roll').onclick=()=>void sendAction({type:'ROLL'});
  el<HTMLButtonElement>('end').onclick=()=>void sendAction({type:'END_TURN'});
  el<HTMLButtonElement>('sendRobot').onclick=()=>void sendAction({type:'SEND_ROBOT',terrain:el<HTMLSelectElement>('terrain').value as Terrain});
  el<HTMLButtonElement>('claimGallery').onclick=()=>void sendAction({type:'CLAIM_GALLERY'});
  el<HTMLButtonElement>('share').onclick=async()=>{if(!state)return;const invite=gameUrl(state.code);try{await navigator.clipboard.writeText(invite);toast('Invite link copied.');}catch{toast(invite);}};
  el<HTMLButtonElement>('leave').onclick=()=>{if(state)localStorage.removeItem(`treasure-bots-${state.code}`);socket?.close();if(poll)clearInterval(poll);board?.destroy();state=null;token='';board=null;history.replaceState(null,'','/');status(false);render();};
  el<HTMLSelectElement>('langSelect').onchange=e=>{lang=(e.target as HTMLSelectElement).value as Lang;localStorage.setItem('treasure-bots-lang',lang);translate();};
  const code=new URLSearchParams(location.search).get('room')?.toUpperCase()||'';
  if(/^[A-Z0-9]{6}$/.test(code)){
    el<HTMLInputElement>('roomInput').value=code;
    const saved=localStorage.getItem(`treasure-bots-${code}`);
    if(saved){token=saved;void withBusy(async()=>{const data=await api(`/api/rooms/${code}/state`);state=data.state;connect();render();});}
  }
  translate();render();
}
init();
