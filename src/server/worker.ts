import { DurableObject } from 'cloudflare:workers';
import { applyAction, addGuest, createPlayer, GameError, newGame } from '../engine/game.ts';
import type { GameAction, GameState, PublicState } from '../engine/types.ts';

interface Env { GAME_ROOMS: DurableObjectNamespace<GameRoom>; ASSETS: Fetcher }
type Sessions = Record<string, string>; // bearer token => player id; never sent in snapshots
class StaleVersionError extends Error {}
const cryptoRandom=():number=>{const data=new Uint32Array(1);crypto.getRandomValues(data);return data[0]/4294967296;};
function json(value: unknown, status=200):Response {
  return Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
function errorResponse(message:string,status=400):Response {return json({error:message},status);}
function asString(value:unknown):string {return typeof value==='string'?value:'';}
function validateName(value:unknown):string {
  const name=asString(value).trim().replace(/[\x00-\x1f<>]/g,'').slice(0,22);
  if(name.length<2)throw new GameError('Name must contain at least two characters.');
  return name;
}
function ensureCurrentRoom(state:GameState):void {
  // v0.1 rooms predate spatial robot state. Reject them rather than corrupt stored games.
  if (!Array.isArray(state.islandSpots) || typeof state.shopAccess !== 'boolean' ||
      !Array.isArray(state.players) || state.players.some(p => !p.robot || !Array.isArray(p.robot.cargo))) {
    throw new GameError('This room uses the old v0.1 game format. Please create a new room to play v0.2.');
  }
}
function snapshot(state:GameState, yourId:string):PublicState {return {...state,yourId};}
function randomCode():string {
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);
  return Array.from(bytes,b=>alphabet[b%alphabet.length]).join('');
}
async function readJson(req:Request):Promise<Record<string,unknown>> {
  if(Number(req.headers.get('content-length') || 0)>8_192) throw new GameError('Request too large.');
  const raw=await req.text();
  if(raw.length>8192)throw new GameError('Request too large.');
  let data:unknown;
  try{data=JSON.parse(raw);}catch{throw new GameError('Invalid JSON request body.');}
  if(!data || typeof data!=='object' || Array.isArray(data)) throw new GameError('Invalid request body.');
  return data as Record<string,unknown>;
}
const bearer=(req:Request):string => (req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');

export class GameRoom extends DurableObject<Env> {
  private async authenticated(token:string):Promise<{state:GameState, actorId:string}> {
    const auth=await this.ctx.storage.get<Sessions>('auth')||{};
    const actorId=Object.hasOwn(auth,token)?auth[token]:undefined;
    const state=await this.ctx.storage.get<GameState>('game');
    if(!state||!actorId)throw new GameError('Invalid room access token.');
    ensureCurrentRoom(state);
    return {state,actorId};
  }
  private broadcast(state:GameState):void {
    for(const ws of this.ctx.getWebSockets()) {
      try {
        const attachment=ws.deserializeAttachment() as {actorId?:string}|null;
        if(typeof attachment?.actorId==='string')ws.send(JSON.stringify({type:'snapshot',state:snapshot(state,attachment.actorId)}));
      }catch{try{ws.close(1011,'Room sync failed');}catch{}}
    }
  }
  async fetch(req:Request):Promise<Response> {
    try {
      const path=new URL(req.url).pathname;
      if(path.endsWith('/init')&&req.method==='POST') {
        const body=await readJson(req);
        const name=validateName(body.name);
        const code=asString(body.code);
        const token=crypto.randomUUID();const playerId=crypto.randomUUID();
        if(await this.ctx.storage.get('game'))return errorResponse('Room code occupied.',409);
        const state=newGame(code,createPlayer(playerId,name));
        await this.ctx.storage.transaction(async txn=>{
          if(await txn.get('game'))throw new GameError('Room code occupied.');
          await txn.put('auth',{[token]:playerId});await txn.put('game',state);
        });
        return json({code,token,state:snapshot(state,playerId)},201);
      }
      if(path.endsWith('/join')&&req.method==='POST') {
        const body=await readJson(req);const name=validateName(body.name);
        const token=crypto.randomUUID();const playerId=crypto.randomUUID();
        let stateOut!:GameState;
        await this.ctx.storage.transaction(async txn=>{
          const state=await txn.get<GameState>('game');
          if(!state)throw new GameError('Room not found.');
          ensureCurrentRoom(state);
          const auth=await txn.get<Sessions>('auth')||{};
          addGuest(state,createPlayer(playerId,name));
          auth[token]=playerId;
          await txn.put('auth',auth);await txn.put('game',state);
          stateOut=state;
        });
        this.broadcast(stateOut);
        return json({token,state:snapshot(stateOut,playerId)});
      }
      if(path.endsWith('/state') && req.method==='GET') {
        const {state,actorId}=await this.authenticated(bearer(req));
        return json({state:snapshot(state,actorId)});
      }
      if(path.endsWith('/action') && req.method==='POST') {
        const body=await readJson(req);
        const action=body.action as GameAction;
        if(!action||typeof action!=='object'||typeof action.type!=='string')throw new GameError('Invalid game action.');
        const token=bearer(req);
        let updated!: {state:GameState;actorId:string};
        await this.ctx.storage.transaction(async txn=>{
          const auth=await txn.get<Sessions>('auth')||{};
          const actorId=Object.hasOwn(auth,token)?auth[token]:undefined;
          const state=await txn.get<GameState>('game');
          if(!state||!actorId)throw new GameError('Invalid room access token.');
    ensureCurrentRoom(state);
          if(!Number.isInteger(body.expectedVersion)||body.expectedVersion!==state.version)throw new StaleVersionError('State changed; refresh and try again.');
          applyAction(state,actorId,action,cryptoRandom);
          await txn.put('game',state);
          updated={state,actorId};
        });
        this.broadcast(updated.state);
        return json({state:snapshot(updated.state,updated.actorId)});
      }
      if(path.endsWith('/socket') && req.headers.get('upgrade')?.toLowerCase()==='websocket') {
        const pair=new WebSocketPair();const [client,server]=Object.values(pair);
        this.ctx.acceptWebSocket(server);
        server.serializeAttachment({actorId:null});
        return new Response(null,{status:101,webSocket:client});
      }
      return errorResponse('Not found.',404);
    }catch(e){return errorResponse(e instanceof Error?e.message:'Request failed.',e instanceof StaleVersionError?409:e instanceof GameError?400:500);}
  }
  async webSocketMessage(ws:WebSocket,raw:string|ArrayBuffer):Promise<void> {
    try {
      if(typeof raw!=='string'||raw.length>2048)return;
      const msg:unknown=JSON.parse(raw);
      if(!msg||typeof msg!=='object')return;
      const message=msg as {type?:string,token?:string};
      if(message.type==='auth'&&typeof message.token==='string'){
        const {state,actorId}=await this.authenticated(message.token);
        ws.serializeAttachment({actorId});
        ws.send(JSON.stringify({type:'snapshot',state:snapshot(state,actorId)}));
      }
    }catch{try{ws.send(JSON.stringify({type:'error',error:'Authentication failed.'}));ws.close(1008,'Access denied');}catch{}}
  }
}

export default {
  async fetch(req:Request,env:Env):Promise<Response> {
    const url=new URL(req.url);
    if(url.pathname==='/api/rooms'&&req.method==='POST') {
      try {
        const body=await readJson(req);
        const name=validateName(body.name);
        for(let i=0;i<7;i++){
          const code=randomCode();const stub=env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(code));
          const response=await stub.fetch(new Request(`https://room.internal/api/rooms/${code}/init`,{
            method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,name})
          }));
          if(response.status!==409)return response;
        }
        return errorResponse('Could not allocate room. Please retry.',503);
      }catch(e){return errorResponse(e instanceof Error?e.message:'Invalid request.');}
    }
    const match=url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{6})\/(join|state|action|socket)$/);
    if(match){
      const stub=env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(match[1]));
      return stub.fetch(req);
    }
    if(url.pathname.startsWith('/api/'))return errorResponse('Unknown API endpoint.',404);
    return env.ASSETS.fetch(req);
  }
} satisfies ExportedHandler<Env>;
