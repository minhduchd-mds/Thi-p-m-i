'use strict';
// Run `node server.js` in another terminal, then `node test-api.js`.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const BASE=process.env.TEST_BASE_URL||'http://localhost:4177';
const DATA_DIR=path.resolve(process.env.DATA_DIR||path.join(__dirname,'data'));
const data={bride:'Mỹ Duyên',groom:'Tuấn Kiệt',date:'2027-06-20',time:'17:30',venue:'Trung tâm tiệc cưới',address:'Hà Nội',guest:'Bạn',message:'Chung vui cùng chúng mình',theme:'red',font:'script',music:'loi-hen-tram-nam',volume:35,musicStart:15};
async function send(path,method='GET',payload,token){const res=await fetch(BASE+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(payload?{body:JSON.stringify(payload)}:{})});return {status:res.status,body:await res.json()}}
async function test(){
  const health=await send('/api/health');assert.equal(health.status,200);assert.equal(health.body.retentionDays,30);
  const created=await send('/api/cards','POST',{data});assert.equal(created.status,201);const {id,editToken,expiresAt,createdAt}=created.body;
  assert.ok(id);assert.equal(new Date(expiresAt)-new Date(createdAt),30*86400*1000);
  try{
    const publicCard=await send(`/api/cards/${id}`);assert.equal(publicCard.status,200);assert.equal(publicCard.body.data.bride,'Mỹ Duyên');assert.equal(publicCard.body.data.musicStart,15);assert.equal(publicCard.body.editToken,undefined);
    const forbidden=await send(`/api/cards/${id}`,'PUT',{data:{...data,bride:'Sai'}});assert.equal(forbidden.status,403);
    const updated=await send(`/api/cards/${id}`,'PUT',{data:{...data,bride:'Thảo Vy',theme:'jade'}},editToken);assert.equal(updated.status,200);assert.equal(updated.body.expiresAt,expiresAt);
    const mp3=await fs.readFile(path.join(__dirname,'public','assets','music','loi-hen-tram-nam.mp3'));
    const badMedia=await fetch(`${BASE}/api/cards/${id}/music`,{method:'PUT',headers:{'Content-Type':'audio/mpeg'},body:mp3});assert.equal(badMedia.status,403);
    const wrongType=await fetch(`${BASE}/api/cards/${id}/music`,{method:'PUT',headers:{'Content-Type':'audio/mpeg','Authorization':`Bearer ${editToken}`},body:Buffer.alloc(4100)});assert.equal(wrongType.status,415);
    const upload=await fetch(`${BASE}/api/cards/${id}/music`,{method:'PUT',headers:{'Content-Type':'audio/mpeg','Authorization':`Bearer ${editToken}`},body:mp3});assert.equal(upload.status,200);
    const newCard=await send(`/api/cards/${id}`);assert.equal(newCard.body.data.music,'custom');assert.equal(newCard.body.expiresAt,expiresAt);
    const partial=await fetch(`${BASE}/api/cards/${id}/music`,{headers:{Range:'bytes=0-1023'}});assert.equal(partial.status,206);assert.equal((await partial.arrayBuffer()).byteLength,1024);assert.equal(partial.headers.get('content-type'),'audio/mpeg');
    const rsvp=await send(`/api/cards/${id}/rsvp`,'POST',{name:'Khách thử nghiệm',attendance:'yes',guests:2,wish:'Trăm năm hạnh phúc!'});assert.equal(rsvp.status,201);
    assert.equal((await send(`/api/cards/${id}/rsvps`)).status,403);
    const list=await send(`/api/cards/${id}/rsvps`,'GET',null,editToken);assert.equal(list.status,200);assert.equal(list.body.count,1);assert.equal(list.body.rsvps[0].guests,2);
    // Editor v2 round-trip and content safety, with legacy fields still intact.
    const visual={schemaVersion:2,theme:'jade',layoutId:'jade-poster',width:720,height:1080,
      fields:{...data,bride:'Mỹ Duyên'},music:'loi-hen-tram-nam',
      blocks:[{id:'test-title',type:'text',x:45,y:90,w:550,h:120,rotation:0,z:3,
        binding:'bride',fontSize:55,align:'center',weight:600,text:'',color:'#ffffff'}],
      insideBlocks:[{id:'inside-message',type:'text',x:65,y:240,w:580,h:130,rotation:0,z:4,
        binding:'message',fontSize:29,align:'center',weight:500,text:'Lời mời bên trong',color:'#6b4436'}],
      extraPages:[{id:'pmap',kind:'map',title:'Địa điểm cưới',blocks:[{id:'map-card',type:'map',x:80,y:300,w:550,h:370,z:4}]},
        {id:'pgift',kind:'gift',title:'Mừng cưới',blocks:[{id:'qr-card',type:'qr',x:170,y:430,w:360,h:360,z:4}]}],
      gift:{bank:'VCB',account:'0123456789',holder:'Test Receiver',note:'Mung cuoi',amount:''}};
    const v2=await send('/api/cards','POST',{data:{...data,theme:'jade',document:visual}});
    assert.equal(v2.status,201);
    const round=await send('/api/cards/'+v2.body.id);
    assert.equal(round.status,200);
    assert.equal(round.body.data.document.schemaVersion,2);
    assert.equal(round.body.data.document.blocks[0].binding,'bride');
    assert.equal(round.body.data.document.insideBlocks[0].binding,'message','Server must preserve inside card blocks');
    assert.equal(round.body.data.document.extraPages.length,2,'Server persists custom pages');
    assert.equal(round.body.data.document.extraPages[0].blocks[0].type,'map');
    assert.equal(round.body.data.document.extraPages[1].blocks[0].type,'qr');
    assert.equal(round.body.data.document.gift.account,'0123456789');
    assert.equal(round.body.data.bride,'Mỹ Duyên');
    const v2update=await send('/api/cards/'+v2.body.id,'PUT',{data:{...data,theme:'jade',document:{...visual,blocks:[...visual.blocks,{id:'added-frame',type:'frame',x:18,y:28,w:650,h:900,z:1}]}}},v2.body.editToken);
    assert.equal(v2update.status,200);
    const after=await send('/api/cards/'+v2.body.id);assert.equal(after.body.data.document.blocks.length,2);
    assert.equal(after.body.data.document.insideBlocks.length,1);
    assert.equal(after.body.data.document.extraPages.length,2);
    assert.equal(after.body.data.document.gift.holder,'Test Receiver');
    const exploit=await send('/api/cards','POST',{data:{...data,document:{...visual,blocks:[{id:'unsafe',type:'image',x:10,y:10,w:100,h:100,src:'javascript:alert(1)'}]}}});
    assert.equal(exploit.status,201);
    const exploited=await send('/api/cards/'+exploit.body.id);assert.equal(exploited.body.data.document.blocks[0].src,'');
    await fs.unlink(path.join(DATA_DIR,v2.body.id+'.json'));
    await fs.unlink(path.join(DATA_DIR,exploit.body.id+'.json'));
    const assetResponse=await fetch(BASE+'/assets/textures/wood-mahogany.webp');
    assert.equal(assetResponse.status,200);
    assert.equal(assetResponse.headers.get('content-type'),'image/webp');
    const jsResponse=await fetch(BASE+'/studio.mjs');assert.equal(jsResponse.status,200);
    assert.match(jsResponse.headers.get('content-type'),/javascript/);
    const bad=await send('/api/cards','POST',{data:{...data,music:'non-existent'}});assert.equal(bad.status,201);await fs.unlink(path.join(DATA_DIR,`${bad.body.id}.json`));
    const expiredId=crypto.randomUUID();await fs.writeFile(path.join(DATA_DIR,`${expiredId}.json`),JSON.stringify({id:expiredId,createdAt:'2020-01-01T00:00:00Z',expiresAt:'2020-01-31T00:00:00Z',editToken:'x',data,rsvps:[]}));
    await fs.mkdir(path.join(DATA_DIR,'music'),{recursive:true});await fs.writeFile(path.join(DATA_DIR,'music',`${expiredId}.mp3`),mp3);
    const expired=await send(`/api/cards/${expiredId}`);assert.equal(expired.status,410);
    await assert.rejects(fs.stat(path.join(DATA_DIR,`${expiredId}.json`)),{code:'ENOENT'});await assert.rejects(fs.stat(path.join(DATA_DIR,'music',`${expiredId}.mp3`)),{code:'ENOENT'});
    console.log('PASS: health, create, read, 30-day TTL, permission, music upload, MP3 byte-range, RSVP, expiry cleanup.');
  } finally {await fs.unlink(path.join(DATA_DIR,`${id}.json`)).catch(()=>{});await fs.unlink(path.join(DATA_DIR,'music',`${id}.mp3`)).catch(()=>{});}
}
test().catch(err=>{console.error(err);process.exitCode=1});
