import './style.css';
import './theme.css';
import './mobile.css';
import './roll-shop.css';
import './dispatch.css';
import './cpu-turns.css';
import './match-setup.css';
import './shop-encounter.css';
import './world-hud.css';
import './board-view-three.css';
import './gallery-dialog.css';
import './viewport-layout.css';
import {mountGalleryDialog} from './gallery-dialog.ts';
import {matchingRollPointer,accessibleRollClick} from './dice-intent.ts';
import {bindViewNavigation} from './view-navigation.ts';
import {resetMatchViewportScroll} from './match-viewport.ts';
import {gallerySlotTotal} from '../engine/gallery.ts';
import { mountBoard } from './board.ts';
import { TILES } from '../engine/types.ts';
import {boardPathFrame} from '../engine/map-shapes.ts';
import type {MapShapeId} from '../engine/map-shapes.ts';
import { getRobotStats } from '../engine/game.ts';
import { terrainGrade, terrainTroubleChance } from '../engine/island.ts';
import type { GameAction, PublicState } from '../engine/types.ts';

type Lang='en'|'id'|'ja';
const translations={
  en:{tagline:'An online treasure-hunting board adventure',name:'Your nickname',room:'Room code',create:'Create room',join:'Join room',invite:'Share invite',start:'Start game',waiting:'Waiting for players',bots:'Computer players',turn:'Turn',current:'Playing',roll:'Roll dice',end:'End turn',send:'Send robot',claim:'Claim gallery',inventory:'Treasures',gallery:'Galleries',players:'Explorers',feed:'Activity log',leave:'Leave room',rules:'Alpha rules are provisional. Original-game formulas require verification.',lost:'Connection interrupted; trying to reconnect.',online:'Live',offline:'Reconnecting',solo:'Play against bots or invite friends',copy:'Copy invite',energy:'Energy',worth:'Assets',winner:'Winner',you:'you',robot:'Robot expedition',display:'Display',gold:'Gold',cards:'Gate cards',help:'First buy a Gate Card when passing a shop. Next turn select a treasure in the central map, launch, roll and watch the journey.',locale:'Language',workshop:'Robot workshop',head:'Sensor head',body:'Battery body',arm:'Power arm',leg:'Speed legs',shopHint:'Upgrades available when passing a robot shop',mapTitle:'TREASURE ISLAND',survey:'Tap any island tile to explore',mapSub:'Select treasure or an unmarked location',boardView:'BOARD VIEW',worldMap:'WORLD MAP',worldTitle:'ISLAND MAP',worldEnergy:'ROBOT ENERGY',rotateLeft:'Rotate map left',rotateRight:'Rotate map right',openMap:'Send robot / World map',backToBoard:'← Back to board',targetHint:'Choose a destination on the island map',holdRoll:'Hold to roll · release to throw',rolling:'Rolling…',shop:'Robot Shop',shopHint2:'Only during a shop encounter',closeShop:'Leave shop',shopArrived:'A robot shop is on your path!',enterShop:'Enter shop',skipShop:'Keep walking',shopWelcome:'Welcome to the robot shop',shopSupplies:'Supplies',rollFirst:'Roll dice first',launching:'Launching robot…',energyCell:'Energy Cell · 200 G',repairKit:'Repair Kit · 280 G',repairUse:'Use Repair Kit',repairStock:'Repair kits',sellTreasures:'Sell treasures',noTreasuresToSell:'No recovered treasures to sell',gatePurchase:'Gate Card · 300 G',shopParts:'Robot parts · 450 G each',settings:'Settings',details:'Game details',close:'Close',menu:'Menu'},
  id:{tagline:'Petualangan board game pencari harta online',name:'Nama pemain',room:'Kode room',create:'Buat room',join:'Gabung room',invite:'Bagikan undangan',start:'Mulai permainan',waiting:'Menunggu pemain',bots:'Jumlah pemain AI',turn:'Giliran',current:'Sedang bermain',roll:'Lempar dadu',end:'Akhiri giliran',send:'Kirim robot',claim:'Klaim galeri',inventory:'Harta',gallery:'Galeri',players:'Pemain',feed:'Aktivitas',leave:'Keluar room',rules:'Aturan alpha masih sementara. Rumus original perlu diverifikasi.',lost:'Koneksi terputus; menyambung kembali.',online:'Terhubung',offline:'Menyambung ulang',solo:'Main melawan AI atau undang teman',copy:'Salin undangan',energy:'Energi',worth:'Aset',winner:'Pemenang',you:'kamu',robot:'Ekspedisi robot',display:'Pajang',gold:'Emas',cards:'Gate Card',help:'Beli Gate Card saat melewati toko. Di giliran berikutnya, tap harta di peta tengah, kirim robot, lalu lempar dadu.',locale:'Bahasa',workshop:'Bengkel robot',head:'Kepala sensor',body:'Bodi baterai',arm:'Lengan tempur',leg:'Kaki cepat',shopHint:'Upgrade tersedia ketika melewati toko robot',mapTitle:'PULAU HARTA',survey:'Sentuh petak pulau untuk eksplorasi',mapSub:'Pilih harta atau lokasi belum ditandai',boardView:'PAPAN PERMAINAN',worldMap:'PETA DUNIA',worldTitle:'PETA PULAU',worldEnergy:'ENERGI ROBOT',rotateLeft:'Putar peta ke kiri',rotateRight:'Putar peta ke kanan',openMap:'Kirim robot / Peta dunia',backToBoard:'← Kembali ke papan',targetHint:'Pilih tujuan robot pada peta pulau',holdRoll:'Tahan dadu · lepas untuk lempar',rolling:'Dadu dilempar…',shop:'Toko Robot',shopHint2:'Hanya saat melewati atau berhenti di toko',closeShop:'Keluar toko',shopArrived:'Ada toko robot di jalurmu!',enterShop:'Masuk toko',skipShop:'Lewati',shopWelcome:'Selamat datang di toko robot',shopSupplies:'Perbekalan',rollFirst:'Lempar dadu dahulu',launching:'Robot sedang dikirim…',energyCell:'Sel Energi · 200 G',repairKit:'Repair Kit · 280 G',repairUse:'Gunakan Repair Kit',repairStock:'Repair kit',sellTreasures:'Jual harta',noTreasuresToSell:'Belum ada harta untuk dijual',gatePurchase:'Gate Card · 300 G',shopParts:'Komponen robot · 450 G per item',settings:'Pengaturan',details:'Info permainan',close:'Tutup',menu:'Menu'},
  ja:{tagline:'オンライン宝探しボードゲーム',name:'プレイヤー名',room:'ルームコード',create:'ルーム作成',join:'参加',invite:'招待を共有',start:'ゲーム開始',waiting:'プレイヤー待機中',bots:'CPU人数',turn:'ターン',current:'プレイ中',roll:'サイコロ',end:'ターン終了',send:'ロボット派遣',claim:'ギャラリーを獲得',inventory:'宝物',gallery:'ギャラリー',players:'プレイヤー',feed:'イベント履歴',leave:'退出',rules:'アルファ版のルールは仮設定です。原作の計算式は要確認。',lost:'接続が切れました。再接続中…',online:'接続中',offline:'再接続中',solo:'CPUと対戦、または友達を招待',copy:'招待リンクをコピー',energy:'エネルギー',worth:'資産',winner:'勝者',you:'あなた',robot:'ロボット探検',display:'展示',gold:'ゴールド',cards:'ゲートカード',help:'店を通過してゲートカードを購入。次のターンに中央の宝をタップしてロボットを発進。',locale:'言語',workshop:'ロボ工房',head:'センサーヘッド',body:'バッテリーボディ',arm:'パワーアーム',leg:'スピードレッグ',shopHint:'ショップを通過するとパーツ購入可能',mapTitle:'宝島',survey:'島のマスをタップして探索',mapSub:'宝物や未探索地点を選択',boardView:'ボード画面',worldMap:'ワールドマップ',worldTitle:'島の地図',worldEnergy:'ロボットエネルギー',rotateLeft:'地図を左回転',rotateRight:'地図を右回転',openMap:'ロボット派遣・マップ',backToBoard:'← ボードに戻る',targetHint:'島の目的地を選んでください',holdRoll:'押し続けて離すとサイコロ',rolling:'サイコロを投げています…',shop:'ロボットショップ',shopHint2:'ショップ通過時または停止時のみ',closeShop:'ショップを出る',shopArrived:'進行方向にロボットショップがあります！',enterShop:'店に入る',skipShop:'通過する',shopWelcome:'ロボットショップへようこそ',shopSupplies:'消耗品',rollFirst:'先にサイコロを振る',launching:'ロボットを派遣中…',energyCell:'エネルギーセル · 200 G',repairKit:'修理キット · 280 G',repairUse:'修理キットを使う',repairStock:'修理キット',sellTreasures:'宝物を売る',noTreasuresToSell:'売却できる宝物はありません',gatePurchase:'ゲートカード · 300 G',shopParts:'ロボットパーツ · 各450 G',settings:'設定',details:'ゲーム情報',close:'閉じる',menu:'メニュー'}
} as const;
let lang:Lang=(localStorage.getItem('treasure-bots-lang') as Lang)||((navigator.language||'').toLowerCase().startsWith('id')?'id':'en');
if(!translations[lang])lang='en';
const t=(key:keyof typeof translations.en)=>translations[lang][key];
const escapeHtml=(s:string):string=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
// Preserve explicit 2D fallback through room navigation/reload. In normal
// mode World Map Three.js is already the default, so no flag is necessary.
const mapMode=new URLSearchParams(location.search).get('map3d');
const threePreviewParam=mapMode==='0'?'&map3d=0':mapMode==='1'?'&map3d=1':'';
const boardLegacyParam=new URLSearchParams(location.search).get('board2d')==='1'?'&board2d=1':'';
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
let lastShopSteps=0;
let shopDecisionOpen=false;
let shopEntranceTimer:ReturnType<typeof setTimeout>|null=null;
let shopOpen=false;
let lastRollRelease=0;
let lastCpuVisualStep=0;
let dispatchAnimating=false;
let dispatchTimer:ReturnType<typeof setTimeout>|null=null;
function resetDispatch():void {
  if(dispatchTimer){clearTimeout(dispatchTimer);dispatchTimer=null;}
  dispatchAnimating=false;
  const portal=el('robotDispatch');
  portal.hidden=true;
  portal.classList.remove('is-active');
}
function playDispatch():void {
  resetDispatch();
  dispatchAnimating=true;
  const portal=el('robotDispatch');
  portal.hidden=false;
  portal.classList.add('is-active');
  const room=state?.code;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  dispatchTimer=setTimeout(()=>{
    resetDispatch();
    if(state?.code!==room)return;
    render();
  },reduce?160:1350);
}
const root=document.querySelector<HTMLDivElement>('#app')!;
root.innerHTML=`
  <header class="topbar"><div class="brand"><span class="logo">✦</span><div><strong>TREASURE BOTS</strong><small>SHOP VISIT · v0.9</small></div></div><div class="header-actions"><span id="status" class="status"></span><button id="settingsTrigger" class="gear-button" type="button" aria-label="Settings" aria-haspopup="dialog" aria-controls="settingsOverlay">⚙</button></div></header>
  <main>
    <section id="home" class="home-panel"><div class="hero"><div class="hero-gem">✦</div><div class="eyebrow">BOARD × ROBOTS × TREASURE</div><h1>Your robot.<br>Your island.<br><em>Your treasure.</em></h1><p data-i18n="tagline"></p></div><div class="card form-card"><label for="playerName" data-i18n="name"></label><input id="playerName" autocomplete="nickname" maxlength="22" placeholder="Explorer" value="Explorer"/><button id="create" class="primary" data-i18n="create"></button><div class="or">— OR —</div><label for="roomInput" data-i18n="room"></label><div class="inline"><input id="roomInput" maxlength="6" placeholder="ABCD23" autocapitalize="characters"/><button id="join" class="secondary" data-i18n="join"></button></div><p class="muted" data-i18n="solo"></p></div></section>
    <section id="lobby" hidden><div class="card lobby-card"><span class="eyebrow">4-PLAYER MATCH SETUP</span><h2 id="roomTitle">ROOM</h2><p class="muted">Four slots required. Invite friends or fill empty slots with CPU players.</p>
      <div id="lobbyPlayers" class="roster"></div>
      <div class="lobby-profile">
        <h3>My Player</h3>
        <div class="lobby-field-row"><label for="profileSlot">Play order / slot</label><select id="profileSlot" aria-label="Player slot">
          <option value="1">1P</option><option value="2">2P</option><option value="3">3P</option><option value="4">4P</option>
        </select></div>
        <div class="lobby-field-row"><label for="profileAvatar">Avatar</label><select id="profileAvatar" aria-label="Avatar choice">
          <option value="H01">H01 · Explorer</option><option value="H02">H02 · Scout</option><option value="H03">H03 · Knight</option><option value="H04">H04 · Mage</option>
        </select></div>
        <div class="lobby-field-row"><label for="profileColor">Player color</label><select id="profileColor" aria-label="Player color">
          <option value="#2489ea">🔵 Blue</option><option value="#44c767">🟢 Green</option><option value="#e254c5">🟣 Magenta</option><option value="#f5cf32">🟡 Yellow</option>
        </select></div>
        <button id="saveProfile" class="secondary" type="button">Save my selection</button>
      </div>
      <button id="share" class="secondary" data-i18n="invite"></button>
      <div id="hostControls" class="host-controls">
        <h3>Match rules</h3><p id="cpuFill" class="muted">CPU players fill the remaining slots</p>
        <label for="galleryCount">Map size · Gallery count</label>
        <select id="galleryCount" aria-label="Map size"><option value="3" selected>Small · 3 Galleries</option><option value="4">Medium · 4 Galleries</option><option value="5">Large · 5 Galleries</option></select>
        <label for="mapShape">Board route shape</label>
        <select id="mapShape" aria-label="Board route shape">
          <option value="RING">Ring · Classic loop</option>
          <option value="LAGOON">Lagoon · Wide oval</option>
          <option value="CLOVER">Clover · Four-lobed route</option>
        </select>
        <div class="map-shape-preview" aria-label="Preview of the selected board route">
          <svg viewBox="-100 -100 200 200" role="img" aria-label="Board route silhouette">
            <circle r="59" fill="#235344" opacity=".47"></circle>
            <path id="mapShapePreviewPath" fill="none" stroke="#f3d28d" stroke-width="10"
              stroke-linejoin="round" stroke-linecap="round"></path>
            <circle id="mapShapeStart" r="7" fill="#f9f8d7" stroke="#314457" stroke-width="2"></circle>
          </svg>
          <span id="mapShapePreviewText" class="muted">Ring route · Gallery count is selected separately.</span>
        </div>
        <label for="winMode">Victory condition</label><select id="winMode" aria-label="Victory condition">
          <option value="WEALTH_TARGET">First to reach total wealth</option>
          <option value="TURN_LIMIT">Highest wealth after fixed rounds</option>
        </select>
        <label for="winAmount" id="winAmountLabel">Target wealth (G)</label>
        <input id="winAmount" type="number" min="1000" max="10000000" step="1000" value="20000" inputmode="numeric"/>
        <button id="start" class="primary" data-i18n="start"></button>
      </div>
    </div></section>
    <section id="match" hidden>
      <div class="world-hud" id="worldHud" hidden>
        <div class="world-energy-panel">
          <span class="world-bot-icon" aria-hidden="true">🤖</span>
          <div class="world-energy-main">
            <strong data-i18n="worldEnergy"></strong>
            <div class="world-energy-meter" role="progressbar" aria-label="Robot Energy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" id="worldEnergyMeter">
              <span id="worldEnergyFill"></span>
            </div>
          </div>
          <strong class="world-energy-count" id="worldEnergyText">—</strong>
          <button id="worldSettingsTrigger" class="world-gear" aria-label="Settings" aria-haspopup="dialog" aria-controls="settingsOverlay" type="button">⚙</button>
        </div>
        <div class="world-titlebar"><strong>🏝️ <span data-i18n="worldTitle"></span></strong><span id="worldTurn"></span></div>
      </div>
      <div class="match-head"><div><span class="eyebrow" id="matchCode"></span><h2 id="turnTitle"></h2></div><div class="turn-badge" id="turnBadge"></div><button id="openInfo" class="hud-tool" type="button" aria-label="Game details" aria-expanded="false">☷</button><button id="openGallery" class="hud-tool" type="button" aria-label="Numbered Galleries" title="Numbered Galleries">▤</button><button id="gameSettingsTrigger" class="hud-tool" type="button" aria-label="Settings" aria-haspopup="dialog" aria-controls="settingsOverlay">⚙</button></div><div class="match-grid"><div class="board-shell"><div class="map-caption"><div><small id="viewKicker">BOARD · 01</small><h3 id="viewHeading"></h3></div><span id="viewDescription"></span></div><div id="board"></div><div id="cpuStatus" class="cpu-status" role="status" aria-live="polite" hidden></div>
    <div id="robotDispatch" class="robot-dispatch" hidden aria-hidden="true">
      <div class="dispatch-stage">
        <div class="dispatch-portal">
          <div class="dispatch-door dispatch-door-left"></div>
          <div class="dispatch-door dispatch-door-right"></div>
          <div class="dispatch-glow"></div>
        </div>
        <div class="dispatch-bot">
          <span class="dispatch-antenna"></span>
          <span class="dispatch-head"><span class="dispatch-eyes"></span></span>
          <span class="dispatch-body"></span>
          <span class="dispatch-feet"></span>
        </div>
      </div>
      <div class="dispatch-label" data-i18n="launching"></div>
    </div>
    <div id="diceOverlay" class="dice-overlay" role="status" aria-live="polite" hidden><div id="diceFaces" class="dice-faces"><span id="dieOne" class="die-face">?</span><span id="dieTwo" class="die-face">?</span></div><span id="diceTotal" class="dice-total"></span></div><div id="shopCinematic" class="shop-cinematic" hidden aria-hidden="true">
          <svg class="shop-cinematic-building" viewBox="0 0 360 320" preserveAspectRatio="xMidYMid meet">
            <ellipse cx="181" cy="303" rx="160" ry="14" fill="#2d6e60" opacity=".3"/>
            <rect x="59" y="122" width="240" height="160" rx="8" fill="#f4e0b2" stroke="#7d684d" stroke-width="7"/>
            <path d="M40 128 L181 26 L321 128 Z" fill="#c9585d" stroke="#733e54" stroke-width="9" stroke-linejoin="round"/>
            <path d="M65 121 L181 44 L296 121" fill="none" stroke="#f7a67d" stroke-width="7"/>
            <rect x="110" y="108" width="142" height="44" rx="12" fill="#326d80" stroke="#fae2a6" stroke-width="7"/>
            <text x="181" y="137" text-anchor="middle" font-size="21" font-weight="900" fill="#fff9ca">ROBOT SHOP</text>
            <rect x="145" y="174" width="73" height="110" rx="8" fill="#604d5d" stroke="#edba86" stroke-width="7"/>
            <rect x="157" y="190" width="49" height="95" rx="6" fill="#252f43"/>
            <circle cx="198" cy="237" r="5" fill="#e5c374"/>
            <rect x="72" y="176" width="48" height="53" rx="7" fill="#95cbd5" stroke="#926b4c" stroke-width="7"/>
            <rect x="238" y="176" width="48" height="53" rx="7" fill="#95cbd5" stroke="#926b4c" stroke-width="7"/>
            <path d="M95 177 V228 M72 201 H119 M260 177 V228 M240 201 H284" stroke="#fff6ce" stroke-width="4"/>
            <rect x="56" y="275" width="246" height="13" rx="5" fill="#8eaa87"/>
          </svg>
          <div class="shop-cinematic-avatar"><span class="cin-hair"></span><span class="cin-head"></span><span class="cin-body"></span><span class="cin-feet"></span></div>
        </div>
        <div class="legend"><span><i class="leg gallery"></i> Gallery</span><span><i class="leg shop"></i> Shop</span><span><i class="leg event"></i> Event</span><span><i class="leg support"></i> Support</span></div></div><aside id="gameInfo" class="sidebar"><div class="drawer-head"><strong data-i18n="details"></strong><button id="closeInfo" class="drawer-close" type="button" aria-label="Close">×</button></div><div class="card"><div class="panel-heading"><h3 data-i18n="players"></h3><span id="dice" class="dice"></span></div><div id="players" class="roster"></div></div><div class="card robot-card"><div class="panel-heading"><h3 data-i18n="workshop"></h3><span>⚙</span></div><div id="robotWorkshop" class="robot-workshop"></div></div><div class="card"><h3 data-i18n="inventory"></h3><div id="inventory" class="inventory"></div></div><div class="card"><h3 data-i18n="feed"></h3><div id="feed" class="feed"></div></div></aside></div><div class="controls"><div class="action-row" id="boardCommands"><button id="openWorld" class="primary" data-i18n="openMap"></button><button id="returnRobot" class="secondary">Return robot</button><button id="openShop" class="secondary" data-i18n="shop"></button></div><div class="action-row" id="worldCommands" hidden><button id="backBoard" class="secondary" data-i18n="backToBoard"></button><span id="selectedSite" class="target-label" hidden></span><button id="sendRobot" class="primary" data-i18n="send"></button></div><div class="action-row" id="turnCommands"><button id="roll" class="primary roll-press" type="button" data-i18n="holdRoll" aria-describedby="rollHelp"></button><button id="end" class="primary gold" data-i18n="end"></button></div><p class="hint" id="actionHint" data-i18n="help"></p><span id="rollHelp" class="sr-only" data-i18n="holdRoll"></span></div></section>
    <div id="infoBackdrop" class="info-backdrop" hidden></div>
    <div id="settingsOverlay" class="settings-backdrop" hidden>
      <section class="settings-sheet" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
        <div class="settings-sheet-head"><h2 id="settingsTitle" data-i18n="settings"></h2><button id="closeSettings" class="drawer-close" type="button" aria-label="Close">×</button></div>
        <label for="langSelect" data-i18n="locale"></label>
        <select id="langSelect"><option value="en">English</option><option value="id">Bahasa Indonesia</option><option value="ja">日本語</option></select>
        <button id="leave" class="secondary" type="button" data-i18n="leave"></button>
      </section>
    </div>
    <div id="shopChoice" class="shop-choice-overlay" hidden>
      <section class="shop-choice-dialog" role="dialog" aria-modal="true" aria-labelledby="shopChoiceTitle">
        <span class="shop-choice-icon">🏪</span>
        <h2 id="shopChoiceTitle" data-i18n="shopArrived"></h2>
        <div class="shop-choice-actions">
          <button id="shopEnter" class="primary" type="button" data-i18n="enterShop"></button>
          <button id="shopSkip" class="secondary" type="button" data-i18n="skipShop"></button>
        </div>
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
        <h3 data-i18n="shopSupplies"></h3>
        <div class="shop-part-grid">
          <button id="shopBuyCell" class="secondary shop-product" type="button" data-i18n="energyCell"></button>
          <button id="shopBuyRepair" class="secondary shop-product" type="button" data-i18n="repairKit"></button>
        </div>
        <p class="shop-inventory" id="shopInventory"></p>
        <h3 data-i18n="sellTreasures"></h3>
        <div id="shopSellList" class="shop-sell-list"></div>
        <button id="shopLeave" class="primary gold" type="button" data-i18n="closeShop"></button>
      </section>
    </div>
    <div id="message" class="toast" role="status" aria-live="polite" hidden></div>
  </main><footer><span data-i18n="rules"></span></footer>`;
const el=<T = HTMLElement>(id:string):T=>document.getElementById(id) as unknown as T;
const galleryDialog=mountGalleryDialog(root,action=>sendAction(action),()=>lang);
function translate():void{
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(node=>{ const key=node.dataset.i18n as keyof typeof translations.en;if(translations[lang][key])node.textContent=t(key);});
  el<HTMLSelectElement>('langSelect').value=lang;
  document.documentElement.lang=lang;
  el('settingsTrigger').setAttribute('aria-label',t('settings'));
  el('gameSettingsTrigger').setAttribute('aria-label',t('settings'));
  el('worldSettingsTrigger').setAttribute('aria-label',t('settings'));
  el('worldEnergyMeter').setAttribute('aria-label',t('worldEnergy'));

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
    setInfoOpen(false,false);
    el<HTMLButtonElement>('closeSettings').focus({preventScroll:true});
  }else{
    lastSettingsTrigger?.focus();
    lastSettingsTrigger=null;
  }
}
function setInfoOpen(open:boolean,restoreFocus=true):void {
  const wasOpen=infoOpen;
  if(open===wasOpen)return; // An already-closed drawer must not steal focus.
  infoOpen=open;
  el('gameInfo').classList.toggle('is-open',open);
  el('infoBackdrop').hidden=!open;
  el('openInfo').setAttribute('aria-expanded',String(open));
  if(open)el<HTMLButtonElement>('closeInfo').focus({preventScroll:true});
  else if(wasOpen&&restoreFocus&&state&&state.phase!=='lobby'&&viewMode==='board')
    el<HTMLButtonElement>('openInfo').focus({preventScroll:true});
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
function setShopDecisionOpen(open:boolean):void {
  shopDecisionOpen=open;
  el('shopChoice').hidden=!open;
  if(open){
    setInfoOpen(false);
    el('diceOverlay').hidden=true;
    el<HTMLButtonElement>('shopEnter').focus();
  }
}
let cinematicPlaying=false;
function playShopEntrance():void {
  cinematicPlaying=true;
  if(shopEntranceTimer)clearTimeout(shopEntranceTimer);
  const scene=el('shopCinematic');
  scene.hidden=false;
  scene.classList.remove('is-playing');
  void scene.offsetWidth; // restart scene only for a new accepted shop visit
  scene.classList.add('is-playing');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  shopEntranceTimer=setTimeout(()=>{
    scene.hidden=true;
    scene.classList.remove('is-playing');
    cinematicPlaying=false;
    if(state?.shopAccess&&state.players[state.currentPlayerIndex]?.id===state.yourId)
      setShopOpen(true);
  },reduced?180:1700);
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
  el<HTMLButtonElement>('shopBuyCell').disabled=busy||self.gold<200||
    self.robot.energy>=getRobotStats(self.robot).energy;
  el<HTMLButtonElement>('shopBuyRepair').disabled=busy||self.gold<280||(self.repairKits??0)>=3;
  el('shopInventory').textContent=t('repairStock')+': '+(self.repairKits??0)+'/3';
  const effects:{[key:string]:string}={HEAD:'S +25',BODY:'E +25',ARM:'B +25',LEG:'W +25'};
  const slots=['HEAD','BODY','ARM','LEG'] as const;
  el('shopPartList').innerHTML=slots.map(slot=>
    `<button type="button" class="secondary shop-product" data-shop-part="${slot}" ${busy||self.gold<450||self.robot.parts?.[slot]?'disabled':''}>${t(slot.toLowerCase() as 'head'|'body'|'arm'|'leg')} · ${effects[slot]} · ${self.robot.parts?.[slot]?'✓':'450 G'}</button>`
  ).join('');
  el('shopSellList').innerHTML=self.inventory.length?self.inventory.map(item=>
    `<div class="shop-sell-item"><span><strong>${escapeHtml(item.name)}</strong><small>${item.value.toLocaleString()} G</small></span><button class="secondary tiny" type="button" data-sell-id="${escapeHtml(item.id)}" ${busy?'disabled':''}>+${Math.floor(item.value*.6).toLocaleString()} G</button></div>`
  ).join(''):`<p class="shop-empty">${t('noTreasuresToSell')}</p>`;
  document.querySelectorAll<HTMLButtonElement>('[data-sell-id]').forEach(button=>{
    button.onclick=()=>void sendAction({type:'SELL_TREASURE',treasureId:button.dataset.sellId!});
  });
  document.querySelectorAll<HTMLButtonElement>('[data-shop-part]').forEach(button=>{
    button.onclick=()=>void sendAction({type:'BUY_PART',slot:button.dataset.shopPart as 'HEAD'|'BODY'|'ARM'|'LEG'});
  });
}
function offerShopAfterMovement(s:PublicState):void {
  const local=s.players[s.currentPlayerIndex]?.id===s.yourId;
  if(!s.shopOffer||!local||s.phase!=='playing'||!s.dice)return;
  const key=[s.code,s.turn,s.currentPlayerIndex,s.shopTile,s.pendingSteps].join(':');
  if(lastShopOffer===key)return;
  const walked=s.dice[0]+s.dice[1]-(s.pendingSteps??0);
  const segment=Math.max(1,walked-lastShopSteps);
  lastShopSteps=walked;
  lastShopOffer=key;
  if(shopOfferTimer)clearTimeout(shopOfferTimer);
  const show=()=>{
    if(!state||state.code!==s.code||state.turn!==s.turn||
      state.currentPlayerIndex!==s.currentPlayerIndex||!state.shopOffer||shopOpen)return;
    if(settingsOpen||cinematicPlaying){shopOfferTimer=setTimeout(show,250);return;}
    setShopDecisionOpen(true);
  };
  shopOfferTimer=setTimeout(show,Math.max(450,segment*220+180));
}
function toast(msg:string):void { const node=el('message');node.textContent=msg;node.hidden=false;setTimeout(()=>node.hidden=true,3600); }
function gameUrl(code:string):string {return `${location.origin}/?room=${encodeURIComponent(code)}`;}
async function api(path:string,method='GET',body?:unknown,accessToken=token):Promise<any> {
  const response=await fetch(path,{method,headers:{'Content-Type':'application/json',...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json() as {error?:string};if(!response.ok)throw new Error(data.error||'Request failed.');return data;
}
async function startSession(response:{state:PublicState,token:string}):Promise<void> {
  resetDispatch();lastCpuVisualStep=0;state=response.state;token=response.token;viewMode='board';selectedSiteId='';lastDiceEvent='';lastShopOffer='';lastShopSteps=0;shopDecisionOpen=false;
  localStorage.setItem(`treasure-bots-${state.code}`,token);
  history.replaceState(null,'',`/?room=${state.code}${threePreviewParam}${boardLegacyParam}`);
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
function selfLaunchMission(s:PublicState):boolean {
  const own=s.players.find(p=>p.id===s.yourId);
  return Boolean(own?.robot.mission);
}
function cpuStatusText(s:PublicState):string {
  const cpu=s.players[s.currentPlayerIndex];
  const current=s.botEvent?.playerId===cpu.id?s.botEvent.kind:'PREPARE';
  const labels={
    id:{PREPARE:'Bersiap bermain',SEND:'Mengirim robot',ROLL:'Melempar dadu dan berjalan',ENTER_SHOP:'Masuk toko',BUY:'Membeli item',SKIP_SHOP:'Melewati toko',LEAVE_SHOP:'Keluar toko',END:'Mengakhiri giliran'},
    en:{PREPARE:'Preparing turn',SEND:'Sending robot',ROLL:'Rolling dice and walking',ENTER_SHOP:'Entering the shop',BUY:'Buying an item',SKIP_SHOP:'Passing the shop',LEAVE_SHOP:'Leaving the shop',END:'Ending turn'},
    ja:{PREPARE:'ターン準備中',SEND:'ロボットを派遣',ROLL:'サイコロで移動中',ENTER_SHOP:'ショップに入る',BUY:'アイテム購入',SKIP_SHOP:'ショップを通過',LEAVE_SHOP:'ショップを出る',END:'ターン終了'}
  } as const;
  return `🤖 ${cpu.name} · ${labels[lang][current]}`;
}
function render():void {
  const active=!!state;const playing=active&&state!.phase!=='lobby';
  // The Start button can be far down the scrollable lobby on Android.
  // Switching to a 100dvh, overflow-hidden match without clearing the
  // previous scroll offset clips the TOP of both Board and World views.
  const wasPlaying=document.body.classList.contains('in-game');
  const viewportModeChanged=wasPlaying!==playing;
  if(playing&&!wasPlaying){
    const focused=document.activeElement;
    if(focused instanceof HTMLElement&&
       (el('lobby').contains(focused)||el('home').contains(focused)))
      focused.blur();
  }
  el('home').hidden=active;el('lobby').hidden=!active||playing;el('match').hidden=!playing;
  el('leave').hidden=!active;
  document.body.classList.toggle('in-game',playing);
  document.documentElement.classList.toggle('treasure-game-active',playing);
  if(viewportModeChanged)resetMatchViewportScroll(
    document.documentElement,document.body,(x,y)=>window.scrollTo(x,y)
  );
  if(!playing&&infoOpen)setInfoOpen(false,false);
  if(!playing&&shopOpen)setShopOpen(false);
  if(!playing&&shopDecisionOpen)setShopDecisionOpen(false);
  if(!playing)galleryDialog.close();
  if(!active)return;
  const s=state!;
  if(!s.rolled){lastShopSteps=0;lastShopOffer='';}
  if(!playing){
    el('roomTitle').textContent=s.code;
    const roster=[...s.players].sort((a,b)=>(a.slot??1)-(b.slot??1));
    el('lobbyPlayers').innerHTML=roster.map(p=>`<div class="person"><span class="dot" style="background:${p.color}"></span><strong>${p.slot??1}P · ${escapeHtml(p.name)}</strong><small class="muted">${escapeHtml(p.avatarId??'H01')}</small>${p.id===s.hostId?'<span class="muted">HOST</span>':''}</div>`).join('');
    const self=s.players.find(p=>p.id===s.yourId);
    if(self){
      const slot=el<HTMLSelectElement>('profileSlot');
      const color=el<HTMLSelectElement>('profileColor');
      const avatar=el<HTMLSelectElement>('profileAvatar');
      slot.value=String(self.slot??1);
      color.value=self.color;
      avatar.value=self.avatarId??'H01';
      for(const option of [...slot.options])
        option.disabled=s.players.some(p=>p.id!==self.id&&String(p.slot)===option.value);
      for(const option of [...color.options])
        option.disabled=s.players.some(p=>p.id!==self.id&&p.color===option.value);
    }
    const host=s.yourId===s.hostId;
    el('hostControls').hidden=!host;
    el('cpuFill').textContent=`${s.players.length}/4 human seats · ${4-s.players.length} CPU slot(s) will be added`;
    return;
  }
  const winning=s.winningRule;
  el('matchCode').textContent=`ROOM ${s.code} · ${t('turn')} ${s.turn}`+
    (winning?(winning.kind==='TURN_LIMIT'?` / ${winning.rounds}`:` · ${winning.amount.toLocaleString()} G goal`):'');
  const activePlayer=s.players[s.currentPlayerIndex];const mine=activePlayer.id===s.yourId;
  if(viewMode==='world'&&s.phase!=='playing')viewMode='board';
  const isWorld=viewMode==='world';
  el('match').dataset.view=viewMode;
  el('worldHud').hidden=!isWorld;
  el('worldTurn').textContent=`${t('turn')} ${s.turn}`;
  el('viewHeading').textContent=isWorld?t('worldMap'):t('boardView');
  el('viewKicker').textContent=isWorld?'EXPEDITION · 02':'GAME BOARD · 01';
  const reverse=s.reverseEffect;
  const reverseOwner=reverse?s.players.find(p=>p.id===reverse.triggerPlayerId):null;
  el('viewDescription').textContent=reverse?
    `↩ REVERSE · ${reverseOwner?.slot??'?'}P · ${reverse.remainingCycles} cycles left`:
    isWorld?t('survey'):t('robot');
  el('turnTitle').textContent=s.phase==='finished'?
    (s.winnerId?`${t('winner')}: ${s.players.find(p=>p.id===s.winnerId)?.name||''}`:'DRAW · tied wealth'):
    `${activePlayer.slot??(s.currentPlayerIndex+1)}P · ${activePlayer.name}${mine?` (${t('you')})`:''}`;
  el('turnBadge').textContent=s.phase==='finished'?'🏆':activePlayer.isBot?'CPU TURN':!mine?'WAITING':dispatchAnimating?t('launching'):!s.rolled&&selfLaunchMission(s)?'ROLL DICE':'YOUR TURN';
  el('dice').textContent=s.dice?`🎲 ${s.dice.join(' + ')} = ${s.dice[0]+s.dice[1]}`:'🎲 —';
  const cpuActive=s.phase==='playing'&&activePlayer.isBot;
  el('cpuStatus').hidden=!cpuActive;
  if(cpuActive)el('cpuStatus').textContent=cpuStatusText(s);
  if(s.botEvent&&s.botEvent.step!==lastCpuVisualStep){
    lastCpuVisualStep=s.botEvent.step;
    if(s.botEvent.kind==='SEND' && activePlayer.id===s.botEvent.playerId && activePlayer.isBot && !dispatchAnimating){
      // Only animate confirmed server CPU actions. No automatic rolls on client.
      playDispatch();
    }
  }
  if(s.rolled&&s.dice){
    const diceKey=s.code+':'+s.turn+':'+s.currentPlayerIndex+':'+s.dice.join(',');
    if(lastDiceEvent!==diceKey){lastDiceEvent=diceKey;revealDice(s.dice[0],s.dice[1]);}
    offerShopAfterMovement(s);
  }
  if(!s.shopOffer&&shopDecisionOpen)setShopDecisionOpen(false);
  syncShop();
  el('players').innerHTML=s.players.map((p,i)=>{
    const galleryItems=gallerySlotTotal(s,p.id);
    return `<div class="person ${i===s.currentPlayerIndex?'current':''}"><span class="dot" style="background:${p.color}"></span><div class="person-info"><strong>${escapeHtml(p.name)} ${p.isBot?'🤖':''}</strong><small>${t('gold')}: ${p.gold.toLocaleString()} G · ${t('gallery')}: ${galleryItems}/${s.galleries.length*10}</small><small>${t('energy')}: ${p.robot.energy} · ${t('cards')}: ${p.gateCards}</small></div></div>`;
  }).join('');
  const self=s.players.find(p=>p.id===s.yourId);
  if(self){
    const stats=getRobotStats(self.robot);
    const ratio=Math.max(0,Math.min(100,Math.round(self.robot.energy/Math.max(1,stats.energy)*100)));
    el('worldEnergyText').textContent=`${Math.round(self.robot.energy)} / ${stats.energy}`;
    el('worldEnergyFill').style.width=ratio+'%';
    el('worldEnergyMeter').setAttribute('aria-valuenow',String(ratio));
    el('worldHud').classList.toggle('energy-low',ratio<=25);
    const slots=['HEAD','BODY','ARM','LEG'] as const;
    const statValues=[stats.search,stats.energy,stats.battle,stats.walk];
    el('robotWorkshop').innerHTML=`<div class="robot-overview"><div class="robot-emoji">🤖</div><div><strong>${escapeHtml(self.robot.chassis)}</strong><small>⚡ ${self.robot.energy}/${stats.energy} E · ${self.robot.mission?.phase ?? 'READY'}</small></div></div><div class="robot-stats">${['S','E','B','W'].map((label,i)=>`<span>${label}<b>${statValues[i]}</b></span>`).join('')}</div><div class="part-grid">${slots.map(slot=>`<button class="part-button" data-slot="${slot}" disabled>${t(slot.toLowerCase() as 'head'|'body'|'arm'|'leg')}<span>${self.robot.parts?.[slot]?'✓':'450 G'}</span></button>`).join('')}</div><small class="shop-hint">${t('shopHint')}</small>`;
    const repairAllowed=mine&&!s.rolled&&!self.robot.mission&&
      (self.repairKits??0)>0&&self.robot.energy<stats.energy;
    el('robotWorkshop').insertAdjacentHTML('beforeend',
      `<button id="useRepairKit" class="secondary tiny repair-use" ${repairAllowed?'':'disabled'}>${t('repairUse')} · ${self.repairKits??0}</button>`);
    el<HTMLButtonElement>('useRepairKit').onclick=()=>void sendAction({type:'USE_REPAIR_KIT'});
    // Robot overview is read-only. Equipment purchases happen exclusively inside a shop encounter.
  }
  el('inventory').innerHTML=self?.inventory.length?self.inventory.map(item=>`<div class="item"><div><strong>${escapeHtml(item.name)}</strong><small>${item.value} G · ${escapeHtml(item.category)}</small></div><button class="tiny secondary" data-treasure="${escapeHtml(item.id)}">${t('display')}</button></div>`).join(''):'<p class="muted">No treasures yet. Send your robot to explore!</p>';
  document.querySelectorAll<HTMLButtonElement>('[data-treasure]').forEach(btn=>
    btn.onclick=()=>galleryDialog.open(s,btn.dataset.treasure!));
  el('feed').innerHTML=[...s.logs].reverse().slice(0,16).map(item=>`<p><span class="log-turn">#${item.turn}</span> ${escapeHtml(item.message)}</p>`).join('');
  const canAct=mine&&s.phase==='playing';
  el('boardCommands').hidden=isWorld;
  el('worldCommands').hidden=!isWorld;
  el('turnCommands').hidden=isWorld;
  el('actionHint').textContent=isWorld?t('targetHint'):t('help');
  el<HTMLButtonElement>('openWorld').disabled=s.phase!=='playing'||shopOpen||shopDecisionOpen||cinematicPlaying||dispatchAnimating;
  el<HTMLButtonElement>('roll').disabled=!canAct||s.rolled;
  el<HTMLButtonElement>('roll').textContent=s.rolled&&s.dice?`🎲 ${s.dice[0]} + ${s.dice[1]} = ${s.dice[0]+s.dice[1]}`:t('holdRoll');
  el<HTMLButtonElement>('end').disabled=!canAct||!s.rolled||!!s.shopOffer||s.shopAccess||(s.pendingSteps??0)>0;
  el<HTMLButtonElement>('end').textContent=mine&&!s.rolled?t('rollFirst'):t('end');
  const site=s.islandSpots.find(spot=>spot.id===selectedSiteId);
  const terrainRank=site&&self?terrainGrade(self.robot.chassis,site.ground):null;
  const danger=terrainRank?Math.round(terrainTroubleChance(terrainRank)*100):0;
  el('selectedSite').hidden=!site||!isWorld;
  el('selectedSite').textContent=site?`${site.kind==='KEEPER'?'⚔':'◆'} ${site.label} · ${site.ground} ${terrainRank?'['+terrainRank+' · '+danger+'% risk]':''}${site.depleted?' (found)':''}`:t('mapSub');
  el<HTMLButtonElement>('sendRobot').disabled=!canAct||s.rolled||!!self?.robot.mission||!self?.gateCards||!site||site.depleted;
  el<HTMLButtonElement>('returnRobot').disabled=!canAct||s.rolled||!self?.robot.mission||self?.robot.mission.phase==='INBOUND';
  // Preserve all three button slots to avoid changing canvas height after dice resolution.
  el<HTMLButtonElement>('openShop').disabled=!canAct||!s.rolled||!s.shopAccess||cinematicPlaying;
  el<HTMLButtonElement>('openShop').classList.toggle('shop-available',Boolean(canAct&&s.shopAccess));
  syncShop();
  for(const btn of document.querySelectorAll<HTMLButtonElement>('[data-treasure]'))
    btn.disabled=s.phase!=='playing';
  el<HTMLButtonElement>('openGallery').disabled=s.phase!=='playing';
  galleryDialog.update(s);
  const ownPending=self?.pendingGalleryTreasureIds?.find(id=>self.inventory.some(t=>t.id===id));
  if(ownPending&&!galleryDialog.isOpen()&&!shopOpen&&!shopDecisionOpen&&!cinematicPlaying)
    galleryDialog.open(s,ownPending);
  if(!board){
    board=mountBoard(el('board'),id=>{selectedSiteId=id;if(state)render();},()=>{if(state)render();});
    requestAnimationFrame(()=>{if(state){board?.setView(viewMode);board?.update(state);}});
  }else{
    board.setView(viewMode);
    board.update(s);
  }
  if(dispatchAnimating||board?.isMoving()){
    el<HTMLButtonElement>('end').disabled=true;
    el<HTMLButtonElement>('roll').disabled=true;
  }
}
function updateMapShapePreview():void{
 const shape=el<HTMLSelectElement>('mapShape').value as MapShapeId;
 const count=96;
 const points=Array.from({length:count},(_,i)=>boardPathFrame(i/count,shape,73));
 const description:Record<MapShapeId,string>={
  RING:'Ring · Classic circular board.',
  LAGOON:'Lagoon · Wide oval route around the island.',
  CLOVER:'Clover · Four-lobed scenic route.'
 };
 const path=points.map((p,i)=>(i===0?'M':'L')+p.x.toFixed(2)+' '+p.z.toFixed(2)).join(' ')+' Z';
 el('mapShapePreviewPath').setAttribute('d',path);
 el('mapShapeStart').setAttribute('cx',String(points[0].x));
 el('mapShapeStart').setAttribute('cy',String(points[0].z));
 el('mapShapePreviewText').textContent=description[shape]+' Gallery count is independent.';
}
function init():void {
  el<HTMLButtonElement>('create').onclick=()=>void createRoom();
  el<HTMLButtonElement>('join').onclick=()=>void joinRoom();
  el<HTMLButtonElement>('saveProfile').onclick=()=>{
    if(!state)return;
    const slot=Number(el<HTMLSelectElement>('profileSlot').value) as 1|2|3|4;
    const avatarId=el<HTMLSelectElement>('profileAvatar').value as 'H01'|'H02'|'H03'|'H04';
    const color=el<HTMLSelectElement>('profileColor').value;
    void sendAction({type:'SET_PROFILE',slot,color,avatarId});
  };
  const syncWinMode=()=>{
    const byRound=el<HTMLSelectElement>('winMode').value==='TURN_LIMIT';
    const input=el<HTMLInputElement>('winAmount');
    el('winAmountLabel').textContent=byRound?'Number of full rounds':'Target total wealth (G)';
    input.min=byRound?'1':'1000';input.max=byRound?'500':'10000000';
    input.step=byRound?'1':'1000';input.value=byRound?'20':'20000';
  };
  el<HTMLSelectElement>('mapShape').onchange=updateMapShapePreview;
  updateMapShapePreview();
  el<HTMLSelectElement>('winMode').onchange=syncWinMode;
  el<HTMLButtonElement>('start').onclick=()=>{
    if(!state)return;
    const mode=el<HTMLSelectElement>('winMode').value;
    const number=Number(el<HTMLInputElement>('winAmount').value);
    if(!Number.isInteger(number)){toast('Enter a whole number for the winning goal.');return;}
    const winningRule=mode==='TURN_LIMIT'?{kind:'TURN_LIMIT' as const,rounds:number}:
      {kind:'WEALTH_TARGET' as const,amount:number};
    void sendAction({type:'START',bots:4-state.players.length,
      galleryCount:Number(el<HTMLSelectElement>('galleryCount').value) as 3|4|5,
      mapShapeId:el<HTMLSelectElement>('mapShape').value as 'RING'|'LAGOON'|'CLOVER',
      winningRule});
  };
  const rollButton=el<HTMLButtonElement>('roll');
  // Require the same pointer to start and finish on the dice control.
  // Android can dispatch an extra click after World Map reflows.
  let rollPointerId:number|null=null;
  const cancelRollPointer=()=>{
    rollPointerId=null;
    cancelDiceHold();
  };
  rollButton.addEventListener('pointerdown',event=>{
    if(event.button!==0||rollButton.disabled||viewMode!=='board'||busy)return;
    event.preventDefault();
    rollPointerId=event.pointerId;
    rollButton.setPointerCapture(event.pointerId);
    beginDiceHold();
  });
  rollButton.addEventListener('pointerup',event=>{
    if(!matchingRollPointer(rollPointerId,event.pointerId,viewMode==='board')){
      cancelRollPointer();return;
    }
    rollPointerId=null;
    if(!diceHeld)return;
    event.preventDefault();
    releaseDiceHold();
  });
  rollButton.addEventListener('pointercancel',cancelRollPointer);
  rollButton.addEventListener('lostpointercapture',()=>{
    if(rollPointerId!==null)cancelRollPointer();
  });
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
  rollButton.addEventListener('click',event=>{
    // Only focused accessibility/keyboard clicks may use fallback;
    // pointer-generated or ghost clicks must never submit a dice roll.
    if(!accessibleRollClick(event.detail,document.activeElement===rollButton,
       viewMode==='board')||Date.now()-lastRollRelease<600||busy||diceHeld)return;
    beginDiceHold();
    if(diceHeld)releaseDiceHold();
  });
  window.addEventListener('blur',cancelRollPointer);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)cancelRollPointer();
  });
  el<HTMLButtonElement>('end').onclick=()=>void sendAction({type:'END_TURN'});
  bindViewNavigation(el<HTMLButtonElement>('openWorld'),()=>{
    cancelRollPointer();setInfoOpen(false,false);
    if(viewMode!=='world'){viewMode='world';render();}
  });
  el<HTMLButtonElement>('openGallery').onclick=()=>{if(state)galleryDialog.open(state);};
  bindViewNavigation(el<HTMLButtonElement>('backBoard'),()=>{
    cancelRollPointer();setInfoOpen(false,false);
    if(viewMode!=='board'){viewMode='board';render();}
  });
  el<HTMLButtonElement>('sendRobot').onclick=()=>{
    // Never carry an armed dice gesture through Send Robot navigation.
    cancelRollPointer();
    if(selectedSiteId)void sendAction({type:'SEND_ROBOT',siteId:selectedSiteId},()=>{
      viewMode='board';
      selectedSiteId='';
      // CSS compositor handles the gateway. Phaser redraws only on server-state
      // changes; the animation never reconstructs an entire game scene.
      playDispatch();
    });
  };
  el<HTMLButtonElement>('returnRobot').onclick=()=>void sendAction({type:'RETURN_ROBOT'});
  el<HTMLButtonElement>('openShop').onclick=()=>{if(state?.shopAccess&&!shopOpen)setShopOpen(true);};
  const leaveShop=()=>{if(!shopOpen)return;void sendAction({type:'CLOSE_SHOP'},()=>setShopOpen(false));};
  el<HTMLButtonElement>('shopClose').onclick=leaveShop;
  el<HTMLButtonElement>('shopLeave').onclick=leaveShop;
  el<HTMLButtonElement>('shopBuyGate').onclick=()=>void sendAction({type:'BUY_GATE_CARD'});
  el<HTMLButtonElement>('shopBuyCell').onclick=()=>void sendAction({type:'BUY_SUPPLY',supply:'ENERGY_CELL'});
  el<HTMLButtonElement>('shopBuyRepair').onclick=()=>void sendAction({type:'BUY_SUPPLY',supply:'REPAIR_KIT'});
  el<HTMLButtonElement>('shopEnter').onclick=()=>void sendAction({type:'ENTER_SHOP'},()=>{
    setShopDecisionOpen(false);
    playShopEntrance();
  });
  el<HTMLButtonElement>('shopSkip').onclick=()=>void sendAction({type:'SKIP_SHOP'},()=>{
    setShopDecisionOpen(false);
  });
  el('shopOverlay').addEventListener('click',event=>{
    if(event.target===el('shopOverlay'))leaveShop();
  });
  el<HTMLButtonElement>('settingsTrigger').onclick=()=>setSettingsOpen(true,el('settingsTrigger'));
  el<HTMLButtonElement>('gameSettingsTrigger').onclick=()=>setSettingsOpen(true,el('gameSettingsTrigger'));
  el<HTMLButtonElement>('worldSettingsTrigger').onclick=()=>setSettingsOpen(true,el('worldSettingsTrigger'));

  el<HTMLButtonElement>('closeSettings').onclick=()=>setSettingsOpen(false);
  el('settingsOverlay').addEventListener('click',event=>{
    if(event.target===el('settingsOverlay'))setSettingsOpen(false);
  });
  el<HTMLButtonElement>('openInfo').onclick=()=>setInfoOpen(true);
  el<HTMLButtonElement>('closeInfo').onclick=()=>setInfoOpen(false);
  el<HTMLDivElement>('infoBackdrop').onclick=()=>setInfoOpen(false);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(shopDecisionOpen)el<HTMLButtonElement>('shopSkip').click();
    else if(shopOpen)el<HTMLButtonElement>('shopLeave').click();
    else if(galleryDialog.isOpen())galleryDialog.close();
    else if(settingsOpen)setSettingsOpen(false);
    else if(infoOpen)setInfoOpen(false);
  });
  el<HTMLButtonElement>('share').onclick=async()=>{if(!state)return;const invite=gameUrl(state.code);try{await navigator.clipboard.writeText(invite);toast('Invite link copied.');}catch{toast(invite);}};
  el<HTMLButtonElement>('leave').onclick=()=>{resetDispatch();diceIdle();if(shopOfferTimer)clearTimeout(shopOfferTimer);if(diceHideTimer)clearTimeout(diceHideTimer);shopOpen=false;el('shopOverlay').hidden=true;setShopDecisionOpen(false);cinematicPlaying=false;if(shopEntranceTimer)clearTimeout(shopEntranceTimer);el('shopCinematic').hidden=true;lastShopSteps=0;lastShopOffer='';lastCpuVisualStep=0;setSettingsOpen(false);setInfoOpen(false);galleryDialog.close();if(state)localStorage.removeItem(`treasure-bots-${state.code}`);socket?.close();if(poll)clearInterval(poll);board?.destroy();state=null;token='';board=null;selectedSiteId='';viewMode='board';history.replaceState(null,'',(threePreviewParam||boardLegacyParam)?'/?'+[threePreviewParam,boardLegacyParam].filter(Boolean).map(x=>x.slice(1)).join('&'):'/');status(false);render();};
  el<HTMLSelectElement>('langSelect').onchange=e=>{lang=(e.target as HTMLSelectElement).value as Lang;localStorage.setItem('treasure-bots-lang',lang);translate();if(state)galleryDialog.update(state);};
  const code=new URLSearchParams(location.search).get('room')?.toUpperCase()||'';
  if(/^[A-Z0-9]{6}$/.test(code)){
    el<HTMLInputElement>('roomInput').value=code;
    const saved=localStorage.getItem(`treasure-bots-${code}`);
    if(saved){token=saved;void withBusy(async()=>{const data=await api(`/api/rooms/${code}/state`);state=data.state;connect();render();});}
  }
  translate();render();
}
init();
