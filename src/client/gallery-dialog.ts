import type {GameAction,PublicState,Treasure} from '../engine/types.ts';
import {GALLERY_COUNT,GALLERY_CAPACITY,GALLERY_COLORS,
  galleryNumberAt,playerDisplay} from '../engine/gallery.ts';

type Lang='en'|'id'|'ja';
const WORDS={
  en:{title:'Numbered Galleries',intro:'Each player has an independent 10-item display in every Gallery.',new:'Newly recovered',
    choose:'Choose treasure',none:'No treasure waiting. Explore with your robot.',display:'Display in this Gallery',
    replace:'Replace & immediately sell',sell:'Sell new treasure',capacity:'Slots',value:'Value',
    contents:'Your display',other:'Other players',close:'Close',select:'Select an item',
    reorder:'Reorder only while standing on a tile numbered',empty:'Empty display',
    next:'Move right',prev:'Move left',incoming:'Placement does not require standing here.',
    provisional:'Gallery number-to-tile mapping and resale ratio are provisional.'},
  id:{title:'Galeri Bernomor',intro:'Setiap pemain memiliki 10 slot sendiri di setiap Galeri.',new:'Harta baru kembali',
    choose:'Pilih harta',none:'Belum ada harta untuk dipajang. Kirim robot menjelajah.',display:'Pajang di Galeri ini',
    replace:'Ganti & langsung jual',sell:'Jual harta baru',capacity:'Slot',value:'Nilai',
    contents:'Koleksi Anda',other:'Koleksi pemain lain',close:'Tutup',select:'Pilih satu harta',
    reorder:'Susun ulang hanya saat berada di petak nomor',empty:'Belum ada harta',
    next:'Geser kanan',prev:'Geser kiri',incoming:'Menaruh harta tidak harus berdiri di petak ini.',
    provisional:'Posisi nomor Galeri dan rumus harga jual masih sementara.'},
  ja:{title:'番号付きギャラリー',intro:'各ギャラリーで各プレイヤーは独立した10枠を使えます。',new:'ロボットの新しい宝物',
    choose:'宝物を選ぶ',none:'展示できる宝物はありません。',display:'このギャラリーに展示',
    replace:'入れ替えて旧品を売却',sell:'新しい宝物を売却',capacity:'展示枠',value:'価値',
    contents:'あなたのコレクション',other:'ほかのプレイヤー',close:'閉じる',select:'アイテムを選択',
    reorder:'並べ替えは同じ番号のマスに立っている時のみ',empty:'展示なし',
    next:'右へ',prev:'左へ',incoming:'展示場所に立つ必要はありません。',
    provisional:'ギャラリー番号の配置と売却率は暫定です。'}
} as const;
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>(
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]??c));

export interface GalleryDialog {
  open(state:PublicState,treasureId?:string):void;
  update(state:PublicState):void;
  close():void;
  isOpen():boolean;
}

export function mountGalleryDialog(
  root:HTMLElement,submit:(action:GameAction)=>Promise<void>,getLanguage:()=>Lang
):GalleryDialog{
  const host=document.createElement('div');
  host.id='galleryOverlay';
  host.className='gallery-overlay';
  host.hidden=true;
  host.innerHTML='<section class="gallery-sheet" role="dialog" aria-modal="true" aria-labelledby="galleryTitle"><div class="gallery-sheet-head"><h2 id="galleryTitle"></h2><button type="button" class="drawer-close" data-gallery-close="1" aria-label="Close">×</button></div><div id="galleryContent"></div></section>';
  root.insertAdjacentElement('beforeend',host);
  const content=host.querySelector<HTMLElement>('#galleryContent')!;
  let selectedNo=1,selectedTreasure:string|null=null,latest:PublicState|null=null;
  const myself=()=>latest?.players.find(p=>p.id===latest?.yourId);
  const format=(t:Treasure)=>`<strong>${esc(t.name)}</strong><small>${t.value.toLocaleString()} G · ${esc(t.category)}</small>`;
  function draw():void {
    const state=latest,me=myself();
    if(!state||!me)return;
    const word=WORDS[getLanguage()];
    host.querySelector('#galleryTitle')!.textContent=word.title;
    const gallery=state.galleries.find(g=>g.number===selectedNo);
    if(!gallery)return;
    const own=playerDisplay(gallery,me.id);
    const available=me.inventory;
    if(selectedTreasure&&!available.some(t=>t.id===selectedTreasure))
      selectedTreasure=me.pendingGalleryTreasureIds?.find(id=>available.some(t=>t.id===id))??null;
    const selected=available.find(t=>t.id===selectedTreasure);
    const full=own.length>=GALLERY_CAPACITY;
    const canReorder=galleryNumberAt(me.position)===selectedNo;
    const incoming=selected&&(me.pendingGalleryTreasureIds??[]).includes(selected.id);
    content.innerHTML=`
      <p class="gallery-intro">${word.intro}</p>
      <nav class="gallery-number-tabs" aria-label="${word.title}">
        ${Array.from({length:GALLERY_COUNT},(_,i)=>i+1).map(n=>`
          <button class="gallery-tab ${n===selectedNo?'active':''}" data-gallery-no="${n}"
            type="button" style="--gallery-color:${GALLERY_COLORS[n]}" aria-pressed="${n===selectedNo}">No.${n}</button>`).join('')}
      </nav>
      <p class="gallery-tally"><b>No.${selectedNo}</b> · ${word.capacity}: ${own.length}/${GALLERY_CAPACITY}
        · ${word.value}: ${own.reduce((v,t)=>v+t.value,0).toLocaleString()} G</p>
      <p class="gallery-subtle">${word.incoming}</p>
      <h3>${word.choose}</h3>
      <div class="gallery-inventory">
        ${available.length?available.map(t=>`
          <button class="gallery-item ${selected?.id===t.id?'selected':''}"
            data-gallery-item="${esc(t.id)}" type="button">
            ${format(t)} ${(me.pendingGalleryTreasureIds??[]).includes(t.id)?`<em>${word.new}</em>`:''}
          </button>`).join(''):`<p class="gallery-subtle">${word.none}</p>`}
      </div>
      ${selected?(!full?`
        <button class="gallery-primary" type="button" data-gallery-place="1">${word.display} · No.${selectedNo}</button>
      `:`<p class="gallery-warning">${word.capacity} ${GALLERY_CAPACITY}/${GALLERY_CAPACITY} — ${word.replace}</p>`):''}
      <h3>${word.contents} · ${own.length}/${GALLERY_CAPACITY}</h3>
      <div class="gallery-displays">
        ${own.length?own.map((t,i)=>`<div class="gallery-displayed">
          <div class="gallery-item-desc">${format(t)}</div>
          ${selected&&full?`<button type="button" data-gallery-replace="${esc(t.id)}"
            class="gallery-replace">${word.replace} · ${Math.floor(t.value*.6).toLocaleString()} G</button>`:''}
          ${canReorder&&own.length>1?`<div class="gallery-arrange">
            <button type="button" data-gallery-shift="${i}:-1" ${i===0?'disabled':''} aria-label="${word.prev}">‹</button>
            <button type="button" data-gallery-shift="${i}:1" ${i===own.length-1?'disabled':''} aria-label="${word.next}">›</button>
          </div>`:''}
        </div>`).join(''):`<p class="gallery-subtle">${word.empty}</p>`}
      </div>
      ${selected&&incoming?`<button class="gallery-sell" data-gallery-sell="1" type="button">
        ${word.sell} · ${Math.floor(selected.value*.6).toLocaleString()} G</button>`:''}
      <p class="gallery-subtle">${word.reorder} No.${selectedNo}.</p>
      <details class="gallery-others"><summary>${word.other}</summary>
        ${state.players.filter(p=>p.id!==me.id).map(p=>`<p>
          <span class="gallery-player-color" style="background:${/^#[0-9a-fA-F]{6}$/.test(p.color)?p.color:'#777'}"></span>
          ${esc(p.name)} · ${playerDisplay(gallery,p.id).length}/10
        </p>`).join('')}
      </details>
      <small class="gallery-disclaimer">${word.provisional}</small>`;
  }
  async function act(action:GameAction):Promise<void>{
    await submit(action);
    // Parent render() supplies latest snapshot after successful server action.
  }
  host.addEventListener('click',event=>{
    const target=event.target as HTMLElement;
    if(target===host||target.closest('[data-gallery-close]')){
      dialog.close();return;
    }
    const button=target.closest<HTMLButtonElement>('button');
    if(!button||button.disabled||!latest)return;
    if(button.dataset.galleryNo){selectedNo=Number(button.dataset.galleryNo);draw();return;}
    if(button.dataset.galleryItem){selectedTreasure=button.dataset.galleryItem;draw();return;}
    const treasureId=selectedTreasure;
    if(button.dataset.galleryPlace && treasureId){
      void act({type:'DISPLAY_TREASURE',treasureId,galleryNumber:selectedNo});return;
    }
    if(button.dataset.galleryReplace && treasureId){
      void act({type:'DISPLAY_TREASURE',treasureId,galleryNumber:selectedNo,
        replaceTreasureId:button.dataset.galleryReplace});return;
    }
    if(button.dataset.gallerySell && treasureId){
      void act({type:'SELL_INCOMING_TREASURE',treasureId});return;
    }
    if(button.dataset.galleryShift){
      const [a,b]=button.dataset.galleryShift.split(':').map(Number);
      void act({type:'REARRANGE_GALLERY',galleryNumber:selectedNo,fromIndex:a,toIndex:a+b});
    }
  });
  const dialog:GalleryDialog={
    open(state,treasureId){
      latest=state;
      if(treasureId)selectedTreasure=treasureId;
      selectedNo=Math.max(1,Math.min(GALLERY_COUNT,selectedNo));
      host.hidden=false;
      draw();
    },
    update(state){latest=state;if(!host.hidden)draw();},
    close(){host.hidden=true;},
    isOpen(){return !host.hidden;}
  };
  return dialog;
}
