import './style.css';
import './theme.css';
import './mobile.css';
import './roll-shop.css';
import { mountBoard } from './board.ts';
import { TILES } from '../engine/types.ts';
import { getRobotStats } from '../engine/game.ts';
import type { GameAction, PublicState } from '../engine/types.ts';

type Lang='en'|'id'|'ja';
const translations={
  en:{tagline:'An online treasure-hunting board adventure',name:'Your nickname',room:'Room code',create:'Create room',join:'Join room',invite:'Share invite',start:'Start game',waiting:'Waiting for players',bots:'Computer players',turn:'Turn',current:'Playing',roll:'Roll dice',end:'End turn',send:'Send robot',claim:'Claim gallery',inventory:'Treasures',gallery:'Galleries',players:'Explorers',feed:'Activity log',leave:'Leave room',rules:'Alpha rules are provisional. Original-game formulas require verification.',lost:'Connection interrupted; trying to reconnect.',online:'Live',offline:'Reconnecting',solo:'Play against bots or invite friends',copy:'Copy invite',energy:'Energy',worth:'Assets',winner:'Winner',you:'you',robot:'Robot expedition',display:'Display',gold:'Gold',cards:'Gate cards',help:'First buy a Gate Card when passing a shop. Next turn select a treasure in the central map, launch, roll and watch the journey.',locale:'Language',workshop:'Robot workshop',head:'Sensor head',body:'Battery body',arm:'Power arm',leg:'Speed legs',shopHint:'Upgrades available when passing a robot shop',mapTitle:'TREASURE ISLAND',survey:'Tap any island tile to explore',mapSub:'Select treasure or an unmarked location',boardView:'BOARD VIEW',worldMap:'WORLD MAP',openMap:'Send robot / World map',backToBoard:'← Back to board',targetHint:'Choose a destination on the island map',holdRoll:'Hold to roll · release to throw',rolling:'Rolling…',shop:'Robot Shop',shopHint2:'Only during a shop encounter',closeShop:'Leave shop',gatePurchase:'Gate Card · 300 G',shopParts:'Robot parts · 450 G each',settings:'Settings',details:'Game details',close:'Close',menu:'Menu'},
  id:{tagline:'Petualangan board game pencari harta online',name:'Nama pemain',room:'Kode room',create:'Buat room',join:'Gabung room',invite:'Bagikan undangan',start:'Mulai permainan',waiting:'Menunggu pemain',bots:'Jumlah pemain AI',turn:'Giliran',current:'Sedang bermain',roll:'Lempar dadu',end:'Akhiri giliran',send:'Kirim robot',claim:'Klaim galeri',inventory:'Harta',gallery:'Galeri',players:'Pemain',feed:'Aktivitas',leave:'Keluar room',rules:'Aturan alpha masih sementara. Rumus original perlu diverifikasi.',lost:'Koneksi terputus; menyambung kembali.',online:'Terhubung',offline:'Menyambung ulang',solo:'Main melawan AI atau undang teman',copy:'Salin undangan',energy:'Energi',worth:'Aset',winner:'Pemenang',you:'kamu',robot:'Ekspedisi robot',display:'Pajang',gold:'Emas',cards:'Gate Card',help:'Beli Gate Card saat melewati toko. Di giliran berikutnya, tap harta di peta tengah, kirim robot, lalu lempar dadu.',locale:'Bahasa',workshop:'Bengkel robot',head:'Kepala sensor',body:'Bodi baterai',arm:'Lengan tempur',leg:'Kaki cepat',shopHint:'Upgrade tersedia ketika melewati toko robot',mapTitle:'PULAU HARTA',survey:'Sentuh petak pulau untuk eksplorasi',mapSub:'Pilih harta atau lokasi belum ditandai',boardView:'PAPAN PERMAINAN',worldMap:'PETA DUNIA',openMap:'Kirim robot / Peta dunia',backToBoard:'← Kembali ke papan',targetHint:'Pilih tujuan robot pada peta pulau',holdRoll:'Tahan dadu · lepas untuk lempar',rolling:'Dadu dilempar…',shop:'Toko Robot',shopHint2:'Hanya saat melewati atau berhenti di toko',closeShop:'Keluar toko',gatePurchase:'Gate Card · 300 G',shopParts:'Komponen robot · 450 G per item',settings:'Pengaturan',details:'Info permainan',close:'Tutup',menu:'Menu'},
  ja:{tagline:'オンライン宝探しボードゲーム',name:'プレイヤー名',room:'ルームコード',create:'ルーム作成',join:'参加',invite:'招待を共有',start:'ゲーム開始',waiting:'プレイヤー待機中',bots:'CPU人数',turn:'ターン',current:'プレイ中',roll:'サイコロ',end:'ターン終了',send:'ロボット派遣',claim:'ギャラリーを獲得',inventory:'宝物',gallery:'ギャラリー',players:'プレイヤー',feed:'イベント履歴',leave:'退出',rules:'アルファ版のルールは仮設定です。原作の計算式は要確認。',lost:'接続が切れました。再接続中…',online:'接続中',offline:'再接続中',solo:'CPUと対戦、または友達を招待',copy:'招待リンクをコピー',energy:'エネルギー',worth:'資産',winner:'勝者',you:'あなた',robot:'ロボット探検',display:'展示',gold:'ゴールド',cards:'ゲートカード',help:'店を通過してゲートカードを購入。次のターンに中央の宝をタップしてロボットを発進。',locale:'言語',workshop:'ロボ工房',head:'センサーヘッド',body:'バッテリーボディ',arm:'パワーアーム',leg:'スピードレッグ',shopHint:'ショップを通過するとパーツ購入可能',mapTitle:'宝島',survey:'島のマスをタップして探索',mapSub:'宝物や未探索地点を選択',boardView:'ボード画面',worldMap:'ワールドマップ',openMap:'ロボット派遣・マップ',backToBoard:'← ボードに戻る',targetHint:'島の目的地を選んでください',holdRoll:'押し続けて離すとサイコロ',rolling:'サイコロを投げています…',shop:'ロボットショップ',shopHint2:'ショップ通過時または停止時のみ',closeShop:'ショップを出る',gatePurchase:'ゲートカード · 300 G',shopParts:'ロボットパーツ · 各450 G',settings:'設定',details:'ゲーム情報',close:'閉じる',menu:'メニュー'}
} as const;
let lang:Lang=(localStorage.getItem('treasure-bots-lang') as Lang)||((navigator.language||'').toLowerCase().startsWith('id')?'id':'en');
if(!translations[lang])lang='en';
const t=(key:keyof typeof translations.en)=>translations[lang][key];
const escapeHtml=(s:string):string=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
let state:PublicState|null=null;let token='';let board:ReturnType<typeof mountBoard>|null=null;
let socket:WebSocket|null=null;let poll:ReturnType<typeof setInterval>|null=null;
let busy=false;
let selectedSiteId='';
let viewMode:'board'|'world'='board';
let settingsOpen=false;
let infoOpen=false;
let lastSettingsTrigger:HTMLElement|null=null;
let diceHeld=false;
let dicePreview:ReturnType<typeof setInterval>|null=null;
let diceHideTimer:ReturnType<typeof setTimeout>|null=null;
let shopOfferTimer:ReturnType<typeof setTimeout>|null=null;
let lastDiceEvent='';
let lastShopOffer='';
let shopOpen=false;
let lastRollRelease=0;
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`
  <header class="topbar"><div class="brand"><span class="logo">✦</span><div><strong>TREASURE BOTS</strong><small>DICE & SHOP · v0.7</small></div></div><div class="header-actions"><span id="status" class="status"></span><button id="settingsTrigger" class="gear-button" type="button" aria-label="Settings" aria-haspopup="dialog" aria-controls="settingsOverlay">⚙</button></div></header>
  <main>
    <section id="home" class="home-panel"><div class="hero"><div class="hero-gem">✦</div><div class="eyebrow">BOARD × ROBOTS × TREASURE</div><h1>Your robot.<br>Your island.<br><em>Your treasure.</em></h1><p data-i18n="tagline"></p></div><div class="card form-card"><label for="playerName" data-i18n="name"></label><input id="playerName" autocomplete="nickname" maxlength="22" placeholder="Explorer" value="Explorer"/><button id="create" class="primary" data-i18n="create"></button><div class="or">— OR —</div><label for="roomInput" data-i18n="room"></label><div class="inline"><input id="roomInput" maxlength="6" placeholder="ABCD23" autocapitalize="characters"/><button id="join" class="secondary" data-i18n="join"></button></div><p class="muted" data-i18n="solo"></p></div></section>
    <section id="lobby" hidden><div class="card lobby-card"><span class="eyebrow">PRIVATE LOBBY</span><h2 id="roomTitle">ROOM</h2><p data-i18n="waiting"></p><div id="lobbyPlayers" class="roster"></div><button id="share" class="secondary" data-i18n="invite"></button><div id="hostControls" class="host-controls"><label data-i18n="bots"></label><select id="botCount"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3" selected>3</option></select><button id="start" class="primary" data-i18n="start"></button></div></div></section>
    <section id="match" hidden><div class="match-head"><div><span class="eyebrow" id="matchCode"></span><h2 id="turnTitle"></h2></div><div class="turn-badge" id="turnBadge"></div><button id="openInfo" class="hud-tool" type="button" aria-label="Game details" aria-expanded="false">☷</button><button id="gameSettingsTrigger" class="hud-tool" type="button" aria-label="Settings" aria-haspopup="dialog" aria-controls="settingsOverlay">⚙</button></div><div class="match-grid"><div class="board-shell"><div class="map-caption"><div><small id="viewKicker">BOARD · 01</small><h3 id="viewHeading"></h3></div><span id="viewDescription"></span></div><div id="board"></div><div id="diceOverlay" class="dice-overlay" role="status" aria-live="polite" hidden><div id="diceFaces" class="dice-faces"><span id="dieOne" class="die-face">?</span><span id="dieTwo" class="die-face">?</span></div><span id="diceTotal" class="dice-total"></span></div><div class="legend"><span><i class="leg gallery"></i> Gallery</span><span><i class="leg shop"></i> Shop</span><span><i class="leg event"></i> Event</span><span><i class="leg support"></i> Support</span></div></div><aside id="gameInfo" class="sidebar"><div class="drawer-head"><strong data-i18n="details"></strong><button id="closeInfo" class="drawer-close" type="button" aria-label="Close">×</button></div><div class="card"><div class="panel-heading"><h3 data-i18n="players"></h3><span id="dice" class="dice"></span></div><div id="players" class="roster"></div></div><div class="card robot-card"><div class="panel-heading"><h3 data-i18n="workshop"></h3><span>⚙</span></div><div id="robotWorkshop" class="robot-workshop"></div></div><div class="card"><h3 data-i18n="inventory"></h3><div id="inventory" class="inventory"></div></div><div class="card"><h3 data-i18n="feed"></h3><div id="feed" class="feed"></div></div></aside></div><div class="controls"><div class="action-row" id="boardCommands"><button id="openWorld" class="primary" data-i18n="openMap"></button><button id="returnRobot" class="secondary">Return robot</button><button id="openShop" class="secondary" data-i18n="shop"></button></div><div class="action-row" id="worldCommands" hidden><button id="backBoard" class="secondary" data-i18n="backToBoard"></button><span id="selectedSite" class="target-label"></span><button id="sendRobot" class="primary" data-i18n="send"></button></div><div class="action-row" id="turnCommands"><button id="roll" class="primary roll-press" type="button" data-i18n="holdRoll" aria-describedby="rollHelp"></button><button id="end" class="primary gold" data-i18n="end"></button></div><p class="hint" id="actionHint" data-i18n="help"></p><span id="rollHelp" class="sr-only" data-i18n="holdRoll"></span></div></section>
    <div id="infoBackdrop" class="info-backdrop" hidden></div>
    <div id="settingsOverlay" class="settings-backdrop" hidden>
      <section class="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <div class="settings-sheet-head"><h2 id="settingsTitle" data-i18n="settings"></h2><button id="closeSettings" class="drawer-close" type="button" aria-label="Close">×</button></div>
        <label for="langSelect" data-i18n="locale"></label>
        <select id="langSelect"><option value="en">English</option><option value="id">Bahasa Indonesia</option><option value="ja">日本語</option></select>
        <button id="leave" class="secondary" type="button" data-i18n="leave"></button>
      </section>
    </div>
    <div id="shopOverlay" class="shop-overlay" hidden>
      <section class="shop-dialog" role="dialog" aria-modal="true" aria-labelledby="shopTitle">
        <header class="shop-dialog-head"><h2 id="shopTitle" data-i18n="shop"></h2><button id="shopClose" class="drawer-close" type="button" aria-label="Close">×</button></header>
        <p class="shop-location" id="shopLocation" data-i18n="shopHint2"></p>
        <p class="shop-wallet" id="shopWallet"></p>
        <button id="shopBuyGate" class="secondary shop-product" type="button" data-i18n="gatePurchase"></button>
        <h3 data-i18n="shopParts"></h3>
        <div id="shopPartList" class="shop-part-grid"></div>
        <button id="shopLeave" class="primary gold" type="button" data-i18n="closeShop"></button>
      </section>
    </div>
    <div id="message" class="toast" role="status" aria-live="polite" hidden></div>
  </main><footer><span data-i18n="rules"></span></footer>`;
const el=<T = HTMLElement>(id:string):T=>document.getElementById(id) as unknown as T;
function translate():void{
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node=>{ const key=node.dataset.i18n as keyof typeof translations.en;if(translations[lang][key])node.textContent=t(key);});
  el<HTMLSelectElement>('langSelect').value=lang;
  document.documentElement.lang=lang;
  el('settingsTrigger').setAttribute('aria-label',t('settings'));
  el('gameSettingsTrigger').setAttribute('aria-label',t('settings'));
  el('openInfo').setAttribute('aria-label',t('details'));
  el('closeSettings').setAttribute('aria-label',t('close'));
  el('closeInfo').setAttribute('aria-label',t('close'));
  if(state)render();
}
function setSettingsOpen(open:boolean,trigger?:HTMLElement):void {
  settingsOpen=open;
  if(open&&trigger)lastSettingsTrigger=trigger;
  el('settingsOverlay').hidden=!open;
  if(open){
    setInfoOpen(false);
    el<HTMLButtonElement>('closeSettings').focus();
  }else{
    lastSettingsTrigger?.focus();
    lastSettingsTrigger=null;
  }
}
function setInfoOpen(open:boolean):void {
  infoOpen=open;
  el('gameInfo').classList.toggle('is-open',open);
  el('infoBackdrop').hidden=!open;
  el('openInfo').setAttribute('aria-expanded',String(open));
  if(open)el<HTMLButtonElement>('closeInfo').focus();
  else if(state&&state.phase!=='lobby')el<HTMLButtonElement>('openInfo').focus();
}

function diceIdle():void {
  if(dicePreview){clearInterval(dicePreview);dicePreview=null;}
  diceHeld=false;
  el<HTMLButtonElement>('roll').classList.remove('is-held');
}
function revealDice(first:number,second:number):void {
  diceIdle();
  if(diceHideTimer)clearTimeout(diceHideTimer);
  const box=el('diceOverlay');
  box.hidden=false;
  box.dataset.phase='result';
  el('dieOne').textContent=String(first);
  el('dieTwo').textContent=String(second);
  el('diceTotal').textContent='= '+String(first+second);
  diceHideTimer=setTimeout(()=>{if(box.dataset.phase==='result')box.hidden=true;},2100);
}
function beginDiceHold():void {
  const s=state;
  if(!s||s.phase!=='playing'||s.rolled||viewMode!=='board'||busy||settingsOpen||infoOpen||shopOpen||
    s.players[s.currentPlayerIndex]?.id!==s.yourId||diceHeld)return;
  diceHeld=true;
  const box=el('diceOverlay');
  box.hidden=false;
  box.dataset.phase='holding';
  el('diceTotal').textContent='🎲';
  el<HTMLButtonElement>('roll').classList.add('is-held');
  const preview=()=>{
    el('dieOne').textContent=String(1+Math.floor(Math.random()*6));
    el('dieTwo').textContent=String(1+Math.floor(Math.random()*6));
  };
  preview();
  dicePreview=setInterval(preview,80);
}
function cancelDiceHold():void {
  if(!diceHeld)return;
  diceIdle();
  el('diceOverlay').hidden=true;
}
function releaseDiceHold():void {
  if(!diceHeld)return;
  diceIdle();
  lastRollRelease=Date.now();
  const overlay=el('diceOverlay');
  overlay.hidden=false;
  overlay.dataset.phase='waiting';
  el('diceTotal').textContent=t('rolling');
  void sendAction({type:'ROLL'});
  setTimeout(()=>{if(overlay.dataset.phase==='waiting')overlay.hidden=true;},3500);
}
function setShopOpen(open:boolean):void {
  shopOpen=open;
  el('shopOverlay').hidden=!open;
  if(open) {
    setInfoOpen(false);
    syncShop();
    el<HTMLButtonElement>('shopClose').focus();
  } else {
    el<HTMLButtonElement>('openShop').focus();
  }
}
function syncShop():void {
  if(!shopOpen||!state)return;
  const s=state;
  const self=s.players.find(p=>p.id===s.yourId);
  if(!self||s.phase!=='playing'||s.players[s.currentPlayerIndex]?.id!==s.yourId||!s.shopAccess){
    shopOpen=false;
    el('shopOverlay').hidden=true;
    return;
  }
  el('shopWallet').textContent=self.gold.toLocaleString()+' G · '+self.gateCards+' Gate Cards';
  el<HTMLButtonElement>('shopBuyGate').disabled=busy||self.gold<300||self.gateCards>=5;
  const slots=['HEAD','BODY','ARM','LEG'] as const;
  el('shopPartList').innerHTML=slots.map(slot=>
    `<button type="button" class="secondary shop-product" data-shop-part="${slot}" ${busy||self.gold<450||self.robot.parts?.[slot]?'disabled':''}>${t(slot.toLowerCase() as 'head'|'body'|'arm'|'leg')} · ${self.robot.parts?.[slot]?'✓':'450 G'}</button>`
  ).join('');
  document.querySelectorAll<HTMLButtonElement>('[data-shop-part]').forEach(button=>{
    button.onclick=()=>void sendAction({type:'BUY_PART',slot:button.dataset.shopPart as 'HEAD'|'BODY'|'ARM'|'LEG'});
  });
}
function offerShopAfterMovement(s:PublicState):void {
  const local=s.players[s.currentPlayerIndex]?.id===s.yourId;
  if(!s.rolled||!s.shopAccess||!local||s.phase!=='playing'||!s.dice)return;
  const eventId=s.code+':'+s.turn+':'+s.currentPlayerIndex+':'+s.dice.join(',');
  if(lastShopOffer===eventId)return;
  lastShopOffer=eventId;
  if(shopOfferTimer)clearTimeout(shopOfferTimer);
  const steps=s.dice[0]+s.dice[1];
  shopOfferTimer=setTimeout(()=>{
    if(!state||state.code!==s.code||state.turn!==s.turn||
      state.currentPlayerIndex!==s.currentPlayerIndex||!state.shopAccess||settingsOpen)return;
    setShopOpen(true);
  },Math.max(2350,steps*220+550));
}
function toast(msg:string):void { const node=el('message');node.textContent=msg;node.hidden=false;setTimeout(()=>node.hidden=true,3600); }
function gameUrl(code:string):string {return `${location.origin}/?room=${encodeURIComponent(code)}`;}
async function api(path:string,method='GET',body?:unknown,accessToken=token):Promise<any> {
  const response=await fetch(path,{method,headers:{'Content-Type':'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||'Request failed.');return data;
}
async function startSession(response:{state:PublicState,token:string}):Promise<void> {
  state=response.state;token=response.token;viewMode='board';selectedSiteId='';lastDiceEvent='';lastShopOffer='';
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
  try{await work();}catch(e){toast(e instanceof Error?e.message:'Unexpected error.');}finally{busy=false;if(shopOpen)syncShop();}
}
async function sendAction(action:GameAction,onSuccess?:()=>void):Promise<void>{
  if(!state)return;
  await withBusy(async()=>{
    const data=await api(`/api/rooms/${state!.code}/action`,'POST',{expectedVersion:state!.version,action});
    state=data.state;onSuccess?.();render();
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
  document.body.classList.toggle('in-game',playing);
  if(!playing&&infoOpen)setInfoOpen(false);
  if(!playing&&shopOpen)setShopOpen(false);
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
  if(viewMode==='world'&&(!mine||s.rolled||s.phase!=='playing'))viewMode='board';
  const isWorld=viewMode==='world';
  el('match').dataset.view=viewMode;
  el('viewHeading').textContent=isWorld?t('worldMap'):t('boardView');
  el('viewKicker').textContent=isWorld?'EXPEDITION · 02':'GAME BOARD · 01';
  el('viewDescription').textContent=isWorld?t('survey'):t('robot');
  el('turnTitle').textContent=s.phase==='finished'?`${t('winner')}: ${s.players.find(p=>p.id===s.winnerId)?.name||''}`:`${activePlayer.name}${mine?` (${t('you')})`:''}`;
  el('turnBadge').textContent=s.phase==='finished'?'🏆':mine?'YOUR TURN':'WAITING';
  el('dice').textContent=s.dice?`🎲 ${s.dice.join(' + ')} = ${s.dice[0]+s.dice[1]}`:'🎲 —';
  if(s.rolled&&s.dice){
    const diceKey=s.code+':'+s.turn+':'+s.currentPlayerIndex+':'+s.dice.join(',');
    if(lastDiceEvent!==diceKey){lastDiceEvent=diceKey;revealDice(s.dice[0],s.dice[1]);}
    offerShopAfterMovement(s);
  }
  syncShop();
  el('players').innerHTML=s.players.map((p,i)=>{
    const galleries=s.galleries.filter(g=>g.ownerId===p.id).length;
    return `<div class="person ${i===s.currentPlayerIndex?'current':''}"><span class="dot" style="background:${p.color}"></span><div class="person-info"><strong>${escapeHtml(p.name)} ${p.isBot?'🤖':''}</strong><small>${t('gold')}: ${p.gold.toLocaleString()} G · ${t('gallery')}: ${galleries}</small><small>${t('energy')}: ${p.robot.energy} · ${t('cards')}: ${p.gateCards}</small></div></div>`;
  }).join('');
  const self=s.players.find(p=>p.id===s.yourId);
  if(self){
    const stats=getRobotStats(self.robot);
    const slots=['HEAD','BODY','ARM','LEG'] as const;
    const statValues=[stats.search,stats.energy,stats.battle,stats.walk];
    el('robotWorkshop').innerHTML=`<div class="robot-overview"><div class="robot-emoji">🤖</div><div><strong>${escapeHtml(self.robot.chassis)}</strong><small>⚡ ${self.robot.energy}/${stats.energy} E · ${self.robot.mission?.phase ?? 'READY'}</small></div></div><div class="robot-stats">${['S','E','B','W'].map((label,i)=>`<span>${label}<b>${statValues[i]}</b></span>`).join('')}</div><div class="part-grid">${slots.map(slot=>`<button class="part-button" data-slot="${slot}" disabled>${t(slot.toLowerCase() as 'head'|'body'|'arm'|'leg')}<span>${self.robot.parts?.[slot]?'✓':'450 G'}</span></button>`).join('')}</div><small class="shop-hint">${t('shopHint')}</small>`;
    // Robot overview is read-only. Equipment purchases happen exclusively inside a shop encounter.
  }
  el('inventory').innerHTML=self?.inventory.length?self.inventory.map(item=>`<div class="item"><div><strong>${escapeHtml(item.name)}</strong><small>${item.value} G · ${escapeHtml(item.category)}</small></div><button class="tiny secondary" data-treasure="${escapeHtml(item.id)}">${t('display')}</button></div>`).join(''):'<p class="muted">No treasures yet. Send your robot to explore!</p>';
  document.querySelectorAll<HTMLButtonElement>('[data-treasure]').forEach(btn=>btn.onclick=()=>void sendAction({type:'DISPLAY_TREASURE',treasureId:btn.dataset.treasure!}));
  el('feed').innerHTML=[...s.logs].reverse().slice(0,16).map(item=>`<p><span class="log-turn">#${item.turn}</span> ${escapeHtml(item.message)}</p>`).join('');
  const canAct=mine&&s.phase==='playing';
  el('boardCommands').hidden=isWorld;
  el('worldCommands').hidden=!isWorld;
  el('turnCommands').hidden=isWorld;
  el('actionHint').textContent=isWorld?t('targetHint'):t('help');
  el<HTMLButtonElement>('openWorld').disabled=!canAct||s.rolled||!!self?.robot.mission;
  el<HTMLButtonElement>('roll').disabled=!canAct||s.rolled;
  el<HTMLButtonElement>('roll').textContent=s.rolled&&s.dice?`🎲 ${s.dice[0]} + ${s.dice[1]} = ${s.dice[0]+s.dice[1]}`:t('holdRoll');
  el<HTMLButtonElement>('end').disabled=!canAct||!s.rolled;
  const site=s.islandSpots.find(spot=>spot.id===selectedSiteId);
  el('selectedSite').textContent=site?`${site.kind==='KEEPER'?'⚔':'◆'} ${site.label} · ${site.ground}${site.depleted?' (found)':''}`:t('mapSub');
  el<HTMLButtonElement>('sendRobot').disabled=!canAct||s.rolled||!!self?.robot.mission||!self?.gateCards||!site||site.depleted;
  el<HTMLButtonElement>('returnRobot').disabled=!canAct||s.rolled||!self?.robot.mission||self?.robot.mission.phase==='INBOUND';
  // Preserve all three button slots to avoid changing canvas height after dice resolution.
  el<HTMLButtonElement>('openShop').disabled=!canAct||!s.rolled||!s.shopAccess;
  el<HTMLButtonElement>('openShop').classList.toggle('shop-available',Boolean(canAct&&s.shopAccess));
  syncShop();
  for(const btn of document.querySelectorAll<HTMLButtonElement>('[data-treasure]'))btn.disabled=!canAct;
  if(!board){
    board=mountBoard(el('board'),id=>{selectedSiteId=id;if(state)render();});
    requestAnimationFrame(()=>{if(state){board?.setView(viewMode);board?.update(state);}});
  }else{
    board.setView(viewMode);
    board.update(s);
  }
}
function init():void {
  el<HTMLButtonElement>('create').onclick=()=>void createRoom();
  el<HTMLButtonElement>('join').onclick=()=>void joinRoom();
  el<HTMLButtonElement>('start').onclick=()=>void sendAction({type:'START',bots:Number(el<HTMLSelectElement>('botCount').value)});
  const rollButton=el<HTMLButtonElement>('roll');
  rollButton.addEventListener('pointerdown',event=>{
    if(event.button!==0||rollButton.disabled)return;
    event.preventDefault();
    rollButton.setPointerCapture(event.pointerId);
    beginDiceHold();
  });
  rollButton.addEventListener('pointerup',event=>{
    if(!diceHeld)return;
    event.preventDefault();
    releaseDiceHold();
  });
  rollButton.addEventListener('pointercancel',cancelDiceHold);
  rollButton.addEventListener('lostpointercapture',()=>{if(diceHeld)cancelDiceHold();});
  rollButton.addEventListener('keydown',event=>{
    if((event.code==='Space'||event.code==='Enter')&&!event.repeat){
      event.preventDefault();beginDiceHold();
    }
  });
  rollButton.addEventListener('keyup',event=>{
    if(event.code==='Space'||event.code==='Enter'){
      event.preventDefault();releaseDiceHold();
    }
  });
  rollButton.addEventListener('click',()=>{
    // Screen readers may synthesize click without pointer/keyboard events.
    if(Date.now()-lastRollRelease>600&&!busy&&!diceHeld){
      beginDiceHold();releaseDiceHold();
    }
  });
  window.addEventListener('blur',cancelDiceHold);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelDiceHold();});
  el<HTMLButtonElement>('end').onclick=()=>void sendAction({type:'END_TURN'});
  el<HTMLButtonElement>('openWorld').onclick=()=>{setInfoOpen(false);viewMode='world';render();};
  el<HTMLButtonElement>('backBoard').onclick=()=>{setInfoOpen(false);viewMode='board';render();};
  el<HTMLButtonElement>('sendRobot').onclick=()=>{
    if(selectedSiteId)void sendAction({type:'SEND_ROBOT',siteId:selectedSiteId},()=>{
      viewMode='board';
      selectedSiteId='';
    });
  };
  el<HTMLButtonElement>('returnRobot').onclick=()=>void sendAction({type:'RETURN_ROBOT'});
  el<HTMLButtonElement>('openShop').onclick=()=>{if(state?.shopAccess&&!shopOpen)setShopOpen(true);};
  const leaveShop=()=>{if(!shopOpen)return;void sendAction({type:'CLOSE_SHOP'},()=>setShopOpen(false));};
  el<HTMLButtonElement>('shopClose').onclick=leaveShop;
  el<HTMLButtonElement>('shopLeave').onclick=leaveShop;
  el<HTMLButtonElement>('shopBuyGate').onclick=()=>void sendAction({type:'BUY_GATE_CARD'});
  el('shopOverlay').addEventListener('click',event=>{
    if(event.target===el('shopOverlay'))leaveShop();
  });
  el<HTMLButtonElement>('settingsTrigger').onclick=()=>setSettingsOpen(true,el('settingsTrigger'));
  el<HTMLButtonElement>('gameSettingsTrigger').onclick=()=>setSettingsOpen(true,el('gameSettingsTrigger'));
  el<HTMLButtonElement>('closeSettings').onclick=()=>setSettingsOpen(false);
  el('settingsOverlay').addEventListener('click',event=>{
    if(event.target===el('settingsOverlay'))setSettingsOpen(false);
  });
  el<HTMLButtonElement>('openInfo').onclick=()=>setInfoOpen(true);
  el<HTMLButtonElement>('closeInfo').onclick=()=>setInfoOpen(false);
  el<HTMLDivElement>('infoBackdrop').onclick=()=>setInfoOpen(false);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(shopOpen)el<HTMLButtonElement>('shopLeave').click();
    else if(settingsOpen)setSettingsOpen(false);
    else if(infoOpen)setInfoOpen(false);
  });
  el<HTMLButtonElement>('share').onclick=async()=>{if(!state)return;const invite=gameUrl(state.code);try{await navigator.clipboard.writeText(invite);toast('Invite link copied.');}catch{toast(invite);}};
  el<HTMLButtonElement>('leave').onclick=()=>{diceIdle();if(shopOfferTimer)clearTimeout(shopOfferTimer);if(diceHideTimer)clearTimeout(diceHideTimer);shopOpen=false;el('shopOverlay').hidden=true;setSettingsOpen(false);setInfoOpen(false);if(state)localStorage.removeItem(`treasure-bots-${state.code}`);socket?.close();if(poll)clearInterval(poll);board?.destroy();state=null;token='';board=null;selectedSiteId='';viewMode='board';history.replaceState(null,'','/');status(false);render();};
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
