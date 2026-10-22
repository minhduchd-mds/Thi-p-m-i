'use strict';
// Hỷ Studio: zero-dependency wedding-invitation prototype server.
const http = require('node:http');
const {randomUUID,randomBytes,timingSafeEqual} = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const {URL} = require('node:url');

const PORT = Number(process.env.PORT || 4177);
const PUBLIC_DIR = path.join(__dirname,'public');
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname,'data'));
const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LIMIT_BYTES = 1_700_000;
const MUSIC_LIMIT_BYTES = 8 * 1024 * 1024;
const MUSIC_DIR = path.join(DATA_DIR,'music');
const recentRequests = new Map();

const response = (res,code,value)=>{
  res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
  res.end(JSON.stringify(value));
};
function requestLimit(req){
  const key = (req.socket.remoteAddress || 'unknown');
  const now=Date.now(),arr=(recentRequests.get(key)||[]).filter(t=>now-t<3600000);
  if(arr.length>=60) return false;
  arr.push(now);recentRequests.set(key,arr);return true;
}
function readJSON(req){
  return new Promise((resolve,reject)=>{
    let b='',total=0,failed=false;
    req.on('data',c=>{if(failed)return;total+=c.length;if(total>LIMIT_BYTES){failed=true;reject(Object.assign(new Error('Dữ liệu quá lớn'),{status:413}));return}b+=c});
    req.on('end',()=>{if(failed)return;try{resolve(JSON.parse(b||'{}'))}catch(e){reject(Object.assign(new Error('JSON không hợp lệ'),{status:400}))}});
    req.on('error',reject);
  });
}
function cleanString(s,max){return typeof s==='string'?s.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):''}
function sanitizeData(raw){
  if(!raw || typeof raw!=='object'||Array.isArray(raw))throw Object.assign(new Error('Dữ liệu thiệp không hợp lệ'),{status:400});
  const data={};
  const fields={bride:30,groom:30,date:10,time:5,venue:100,address:180,guest:50,message:300};
  for(const [key,max] of Object.entries(fields)) data[key]=cleanString(raw[key],max);
  data.theme=['red','jade','pink'].includes(raw.theme)?raw.theme:'red';
  data.font=['script','serif','modern'].includes(raw.font)?raw.font:'script';
  data.music=['loi-hen-tram-nam','duyen-ngoc-phuong-dong','ngay-vui-chung-doi','binh-minh-hanh-phuc','canon-d','gymnopedie-1','lua-hong','song-hy','trang-vien','custom','none'].includes(raw.music)?raw.music:'loi-hen-tram-nam';
  data.volume=Math.max(0,Math.min(100,Number(raw.volume)||0));
  data.musicStart=Math.max(0,Math.min(90,Math.floor(Number(raw.musicStart)||0)));
  const d=raw.date||'';
  if(d && (!/^\d{4}-\d{2}-\d{2}$/.test(d)||!Number.isFinite(new Date(`${d}T00:00:00`).getTime())))throw Object.assign(new Error('Ngày cưới không hợp lệ'),{status:400});
  if(data.time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(data.time))throw Object.assign(new Error('Giờ cưới không hợp lệ'),{status:400});
  if(typeof raw.photo==='string'&&raw.photo.length<=1_200_000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(raw.photo))data.photo=raw.photo;
  else data.photo='';
  // v2 visual editor document is stored alongside legacy v1 fields.
  if(raw.document!==undefined){
    const d=raw.document;
    if(!d||d.schemaVersion!==2||!['red','jade','pink'].includes(d.theme)||!Array.isArray(d.blocks)||d.blocks.length>80||(d.insideBlocks!==undefined&&(!Array.isArray(d.insideBlocks)||d.insideBlocks.length>80))||(d.extraPages!==undefined&&(!Array.isArray(d.extraPages)||d.extraPages.length>20))){
      throw Object.assign(new Error('Tài liệu thiết kế không hợp lệ'),{status:400});
    }
    const f={};
    const names={bride:30,groom:30,date:10,time:5,venue:100,address:180,mapUrl:2048,guest:50,message:300};
    for(const [key,max] of Object.entries(names))f[key]=cleanString(d.fields?.[key],max);
    if(f.mapUrl){
      try{const u=new URL(f.mapUrl);
        if(u.protocol!=='https:'||!['google.com','www.google.com','maps.google.com','maps.app.goo.gl'].includes(u.hostname))f.mapUrl='';
      }catch(e){f.mapUrl='';}
    }
    const officialAssets=new Set(['/assets/ornaments/song-hy.svg','/assets/ornaments/carved-door.svg','/assets/ornaments/gold-corner.svg','/assets/ornaments/plum-branch.svg','/assets/textures/wood-mahogany.webp']);
    const finite=(v,min,max,def)=>Number.isFinite(Number(v))?Math.min(max,Math.max(min,Number(v))):def;
    const normalizeBlocks = source => {
    const blocks=[],ids=new Set();
    for(const input of source){
      if(!input||!['text','image','ornament','frame','shape','map','qr'].includes(input.type))continue;
      const id=cleanString(input.id,70);
      if(!/^[a-zA-Z0-9_-]+$/.test(id)||ids.has(id))throw Object.assign(new Error('Mã khối thiết kế không hợp lệ'),{status:400});
      ids.add(id);
      const b={id,type:input.type,x:finite(input.x,-500,1150,0),y:finite(input.y,-500,1600,0),
        w:finite(input.w,20,900,100),h:finite(input.h,20,1200,100),rotation:finite(input.rotation,-360,360,0),
        z:finite(input.z,0,900,10),opacity:finite(input.opacity,0,1,1),
        locked:!!input.locked,hidden:!!input.hidden,userAdded:!!input.userAdded};
      if(b.type==='text'){
        b.binding=Object.hasOwn(names,input.binding)?input.binding:'';
        b.text=cleanString(input.text,400);b.fontSize=finite(input.fontSize,10,150,24);
        b.align=['left','center','right'].includes(input.align)?input.align:'center';
        b.fontFamily=cleanString(input.fontFamily,100);b.weight=finite(input.weight,300,900,500);
        b.color=/^#[0-9a-fA-F]{6}$/.test(input.color||'')?input.color:'';
        b.letterSpacing=finite(input.letterSpacing,0,15,0);
      }
      if(b.type==='ornament')b.asset=['song-hy','carved-door','gold-corner','plum-branch','wood'].includes(input.asset)?input.asset:'song-hy';
      if(b.type==='image'){
        const src=typeof input.src==='string'?input.src:'';
        b.src=officialAssets.has(src)||/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]{20,1100000}$/.test(src)?src:'';
        b.fit=input.fit==='contain'?'contain':'cover';
      }
      if(b.type==='shape')b.fill=/^#[0-9a-fA-F]{6}$/.test(input.fill||'')?input.fill:'#b7855b';
      blocks.push(b);
    }
    return blocks;
    };
    const blocks=normalizeBlocks(d.blocks);
    const insideBlocks=d.insideBlocks===undefined?[]:normalizeBlocks(d.insideBlocks);
    const extraPages=[],pageIds=new Set(['cover','inside']);
    for(const page of d.extraPages||[]){
      if(!page||!['map','gift','custom'].includes(page.kind)||!Array.isArray(page.blocks)||page.blocks.length>80){
        throw Object.assign(new Error('Trang thiệp không hợp lệ'),{status:400});
      }
      const id=cleanString(page.id,70);
      if(!/^[a-zA-Z0-9_-]+$/.test(id)||pageIds.has(id))throw Object.assign(new Error('Mã trang thiệp không hợp lệ'),{status:400});
      pageIds.add(id);
      extraPages.push({id,kind:page.kind,title:cleanString(page.title,65)||'Trang mới',blocks:normalizeBlocks(page.blocks)});
    }
    const allowedBanks=new Set(['VCB','TCB','MB','ACB','BIDV','CTG','VPB','TPB','STB','VIB','HDB','OCB','MSB','SHB']);
    const inputGift=d.gift||{};
    const gift={
      bank:allowedBanks.has(inputGift.bank)?inputGift.bank:'VCB',
      account:/^[0-9]{6,19}$/.test(String(inputGift.account||''))?String(inputGift.account):'',
      holder:cleanString(inputGift.holder,70),
      amount:/^[0-9]{1,10}$/.test(String(inputGift.amount||''))?String(inputGift.amount):'',
      note:cleanString(inputGift.note,90)
    };
    const document={schemaVersion:2,theme:d.theme,layoutId:cleanString(d.layoutId,60),width:720,height:1080,
      fields:f,music:data.music,blocks,insideBlocks,extraPages,gift};
    if(JSON.stringify(document).length>1_300_000)throw Object.assign(new Error('Thiệp có quá nhiều dữ liệu ảnh'),{status:413});
    data.document=document;
  }
  return data;
}
function sanitizeRSVP(raw){
  const name=cleanString(raw?.name,60),attendance=raw?.attendance,guests=Number(raw?.guests),wish=cleanString(raw?.wish,500);
  if(!['yes','no','wish'].includes(attendance))throw Object.assign(new Error('Lựa chọn không hợp lệ'),{status:400});
  if(attendance!=='wish'&&!name)throw Object.assign(new Error('Vui lòng nhập tên của bạn'),{status:400});
  if(!name&&!wish)throw Object.assign(new Error('Lời chúc không được để trống'),{status:400});
  return {id:randomUUID(),name:name||'Khách mời',attendance,guests:attendance==='yes'?Math.min(5,Math.max(1,Math.floor(guests||1))):0,wish,createdAt:new Date().toISOString()};
}
const filepath=id=>path.join(DATA_DIR,`${id}.json`);
function idValid(id){return /^[0-9a-f]{8}-[0-9a-f-]{27,36}$/.test(id)}
async function load(id){
  if(!idValid(id))return null;
  try{const record=JSON.parse(await fs.readFile(filepath(id),'utf8'));if(new Date(record.expiresAt).getTime()<=Date.now()){await fs.unlink(filepath(id)).catch(()=>{});await fs.unlink(path.join(MUSIC_DIR,`${id}.mp3`)).catch(()=>{});return 'expired'}return record;}catch(e){if(e.code==='ENOENT')return null;throw e}
}
async function store(record){const f=filepath(record.id),temp=`${f}.${randomUUID()}.tmp`;await fs.writeFile(temp,JSON.stringify(record),'utf8');await fs.rename(temp,f)}
function authorize(req,record){const supplied=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!supplied||supplied.length!==record.editToken.length)return false;return timingSafeEqual(Buffer.from(supplied),Buffer.from(record.editToken));}
function readMusic(req){
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0;let rejected=false;
    req.on('data',chunk=>{
      if(rejected)return;
      size+=chunk.length;
      if(size>MUSIC_LIMIT_BYTES){rejected=true;reject(Object.assign(new Error('Nhạc MP3 tối đa 8 MB.'),{status:413}));req.resume();return}
      chunks.push(chunk);
    });
    req.on('end',()=>{
      if(rejected)return;
      const b=Buffer.concat(chunks);
      if(b.length<4096 || !(b.subarray(0,3).toString('ascii')==='ID3' || (b[0]===0xff && (b[1]&0xe0)===0xe0))){
        reject(Object.assign(new Error('Tệp không phải MP3 hợp lệ.'),{status:415}));return;
      }
      resolve(b);
    });
    req.on('error',reject);
  });
}
async function streamCustomMusic(req,res,id){
  let bytes;
  try{bytes=await fs.readFile(path.join(MUSIC_DIR,`${id}.mp3`));}catch(e){return response(res,404,{error:'Thiệp chưa có bài hát riêng'});}
  const length=bytes.length;
  const range=req.headers.range;
  let start=0,end=length-1,code=200;
  if(range){
    const m=/^bytes=(\d+)-(\d*)$/.exec(range);
    if(!m)return res.writeHead(416,{'Content-Range':`bytes */${length}`}).end();
    start=Number(m[1]);end=m[2]?Number(m[2]):length-1;
    if(start>=length||end<start)return res.writeHead(416,{'Content-Range':`bytes */${length}`}).end();
    end=Math.min(end,length-1);code=206;
  }
  const headers={'Content-Type':'audio/mpeg','Content-Length':end-start+1,'Accept-Ranges':'bytes','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
  if(code===206)headers['Content-Range']=`bytes ${start}-${end}/${length}`;
  res.writeHead(code,headers);res.end(bytes.subarray(start,end+1));
}
async function handleAPI(req,res,p){
  const seg=p.split('/').filter(Boolean);
  if(req.method==='GET'&&p==='/api/health')return response(res,200,{ok:true,storage:'persistent-files',retentionDays:30});
  if(req.method==='POST'&&p==='/api/cards'){
    if(!requestLimit(req))return response(res,429,{error:'Vui lòng thử lại sau.'});
    const body=await readJSON(req);const data=sanitizeData(body.data);
    const id=randomUUID(),createdAt=new Date().toISOString(),expiresAt=new Date(Date.now()+TTL_MS).toISOString(),editToken=randomBytes(24).toString('hex');
    const record={id,createdAt,expiresAt,editToken,data,rsvps:[]};await store(record);
    return response(res,201,{id,createdAt,expiresAt,editToken});
  }
  if(seg[0]!=='api'||seg[1]!=='cards'||seg.length<3||seg.length>4)return response(res,404,{error:'Đường dẫn không tồn tại'});
  const id=seg[2],record=await load(id);
  if(record==='expired')return response(res,410,{error:'Thiệp đã hết thời hạn 30 ngày và được xóa.'});
  if(!record)return response(res,404,{error:'Không tìm thấy thiệp'});
  if(seg.length===4&&seg[3]==='music'){
    if(req.method==='GET')return streamCustomMusic(req,res,id);
    if(req.method==='PUT'){
      if(!authorize(req,record))return response(res,403,{error:'Không có quyền cập nhật nhạc'});
      if(!requestLimit(req))return response(res,429,{error:'Vui lòng thử lại sau.'});
      if((req.headers['content-type']||'').split(';')[0]!=='audio/mpeg')return response(res,415,{error:'Chỉ chấp nhận MP3'});
      const music=await readMusic(req);
      await fs.mkdir(MUSIC_DIR,{recursive:true});
      const temp=path.join(MUSIC_DIR,`${id}.${randomUUID()}.tmp`);
      await fs.writeFile(temp,music);await fs.rename(temp,path.join(MUSIC_DIR,`${id}.mp3`));
      record.data.music='custom';await store(record);
      return response(res,200,{ok:true,bytes:music.length,expiresAt:record.expiresAt});
    }
  }
  if(seg.length===3&&req.method==='GET')return response(res,200,{id:record.id,data:record.data,createdAt:record.createdAt,expiresAt:record.expiresAt});
  if(seg.length===3&&req.method==='PUT'){
    if(!authorize(req,record))return response(res,403,{error:'Không có quyền sửa thiệp'});
    const body=await readJSON(req);record.data=sanitizeData(body.data);await store(record);
    return response(res,200,{id:record.id,createdAt:record.createdAt,expiresAt:record.expiresAt});
  }
  if(seg[3]==='rsvp'&&req.method==='POST'){
    if(!requestLimit(req))return response(res,429,{error:'Vui lòng thử lại sau.'});
    const body=await readJSON(req);const reply=sanitizeRSVP(body);
    if(record.rsvps.length>=500)return response(res,429,{error:'Đã đạt giới hạn phản hồi của thiệp'});
    record.rsvps.push(reply);await store(record);return response(res,201,{ok:true,id:reply.id});
  }
  if(seg[3]==='rsvps'&&req.method==='GET'){
    if(!authorize(req,record))return response(res,403,{error:'Không có quyền xem phản hồi'});
    return response(res,200,{rsvps:record.rsvps,count:record.rsvps.length,expiresAt:record.expiresAt});
  }
  return response(res,405,{error:'Phương thức không được hỗ trợ'});
}
async function serveStatic(req,res,p){
  const rel=(p==='/'?'/index.html':p).replace(/^\/+/,''),file=path.resolve(PUBLIC_DIR,rel);
  if(!file.startsWith(PUBLIC_DIR+path.sep))return response(res,403,{error:'Đường dẫn không hợp lệ'});
  const type=path.extname(file).toLowerCase();
  const allowed={'.html':'text/html; charset=utf-8','.wav':'audio/wav','.mp3':'audio/mpeg','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mjs':'text/javascript; charset=utf-8'};
  if(!allowed[type])return response(res,404,{error:'Tài nguyên không tồn tại'});
  try{const b=await fs.readFile(file);res.writeHead(200,{'Content-Type':allowed[type],'Content-Length':b.length,'Cache-Control':type==='.html'?'no-cache':'public,max-age=604800','X-Content-Type-Options':'nosniff'});res.end(b)}catch(e){response(res,404,{error:'Tài nguyên không tồn tại'})}
}
async function purge(){
  let removed=0;
  for(const f of await fs.readdir(DATA_DIR)){if(!/^[0-9a-f-]+\.json$/.test(f))continue;try{const body=JSON.parse(await fs.readFile(path.join(DATA_DIR,f),'utf8'));if(Date.parse(body.expiresAt)<=Date.now()){await fs.unlink(path.join(DATA_DIR,f));await fs.unlink(path.join(MUSIC_DIR,`${f.slice(0,-5)}.mp3`)).catch(()=>{});removed++}}catch(e){}}
  if(removed)console.log(`Đã xóa ${removed} thiệp hết hạn`);
}
(async()=>{await fs.mkdir(DATA_DIR,{recursive:true});await purge();const server=http.createServer(async(req,res)=>{
  try{const u=new URL(req.url,'http://localhost'),p=decodeURIComponent(u.pathname);if(p.startsWith('/api/'))await handleAPI(req,res,p);else if(req.method==='GET')await serveStatic(req,res,p);else response(res,405,{error:'Phương thức không được hỗ trợ'});
  }catch(e){console.error('Request error',e.message);response(res,e.status||500,{error:e.status?e.message:'Máy chủ đang gặp lỗi'})}
});server.listen(PORT,'0.0.0.0',()=>console.log(`Hỷ Studio: http://localhost:${PORT}`));setInterval(()=>purge().catch(console.error),3600000).unref();})();
