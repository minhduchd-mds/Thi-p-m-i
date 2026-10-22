import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,PUT,DELETE,OPTIONS","Access-Control-Allow-Headers":"authorization,content-type,apikey,x-client-info","Access-Control-Max-Age":"86400"};
const out=(status:number,value:unknown)=>new Response(JSON.stringify(value),{status,headers:{...CORS,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
const error=(status:number,message:string)=>Object.assign(new Error(message),{status});
const MAX_BODY=1750000;
const TTL=30*86400000;
const validUUID=(x:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const validCode=(x:string)=>/^HY-[A-HJ-NP-Z2-9]{12}$/.test(x);
const clean=(x:unknown,max=300)=>typeof x==="string"?x.replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max):"";
const n=(x:unknown,min:number,max:number,def:number)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):def;
const hex=(bytes:Uint8Array)=>Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
const short=()=>{
 const ABC="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",bytes=crypto.getRandomValues(new Uint8Array(12));
 return "HY-"+Array.from(bytes,b=>ABC[b&31]).join("");
};
const makeToken=()=>hex(crypto.getRandomValues(new Uint8Array(24)));
const digest=async(str:string)=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(str))));
const safeEquals=(a:string,b:string)=>{if(!a||a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;};
const authorized=async(req:Request,record:{edit_token_hash:string})=>{
 const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 return token.length===48&&safeEquals(await digest(token),record.edit_token_hash);
};
const jsonBody=async(req:Request)=>{
 if(Number(req.headers.get("content-length")||0)>MAX_BODY)throw error(413,"Tệp thiệp vượt quá giới hạn dữ liệu");
 const body=await req.text();if(body.length>MAX_BODY)throw error(413,"Dữ liệu quá lớn");
 try{return JSON.parse(body||"{}");}catch{throw error(400,"JSON không hợp lệ");}
};
const mapLink=(url:unknown)=>{
 const text=clean(url,2048);
 if(!text)return "";
 try{const u=new URL(text);return u.protocol==="https:"&&["google.com","www.google.com","maps.google.com","maps.app.goo.gl"].includes(u.hostname)?u.href:"";}
 catch{return "";}
};
const safeImg=(value:unknown)=>{
 const v=typeof value==="string"?value:"";
 return /^\/assets\/(?:ornaments\/[a-z-]+\.svg|textures\/wood-mahogany\.webp)$/.test(v)||
  /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/=]{50,1100000}$/.test(v)?v:"";
};
const validateBlocks=(input:unknown)=>{
 if(!Array.isArray(input)||input.length>80)throw error(400,"Số khối thiệp không hợp lệ");
 const result:Record<string,unknown>[]=[],ids=new Set<string>();
 for(const x of input){
  if(!x||!["text","image","ornament","frame","shape","map","qr"].includes(x.type))throw error(400,"Loại thành phần không hợp lệ");
  const id=clean(x.id,70);
  if(!/^[A-Za-z0-9_-]{1,70}$/.test(id)||ids.has(id))throw error(400,"Trùng hoặc sai mã thành phần");
  ids.add(id);
  const b:Record<string,unknown>={id,type:x.type,x:n(x.x,-500,1150,0),y:n(x.y,-500,1600,0),w:n(x.w,20,900,100),h:n(x.h,20,1200,100),
   z:n(x.z,0,900,5),rotation:n(x.rotation,-360,360,0),opacity:n(x.opacity,0,1,1),locked:!!x.locked,hidden:!!x.hidden,userAdded:!!x.userAdded};
  if(x.type==="text"){
   b.binding=["bride","groom","date","time","venue","address","guest","message"].includes(x.binding)?x.binding:"";
   b.text=clean(x.text,400);b.fontSize=n(x.fontSize,10,150,24);
   b.fontFamily=["'Noto Serif',serif","'Dancing Script',cursive","'Playfair Display',serif","'Be Vietnam Pro',sans-serif"].includes(x.fontFamily)?x.fontFamily:"";
   b.weight=n(x.weight,300,900,500);b.align=["left","center","right"].includes(x.align)?x.align:"center";
   b.letterSpacing=n(x.letterSpacing,0,15,0);b.color=/^#[a-f0-9]{6}$/i.test(x.color||"")?x.color:"";
  }
  if(x.type==="image"){b.src=safeImg(x.src);b.fit=x.fit==="contain"?"contain":"cover";}
  if(x.type==="ornament")b.asset=["song-hy","plum-branch","gold-corner","carved-door","wood"].includes(x.asset)?x.asset:"song-hy";
  if(x.type==="shape")b.fill=/^#[a-f0-9]{6}$/i.test(x.fill||"")?x.fill:"#ba8b52";
  result.push(b);
 }
 return result;
};
const validateData=(value:unknown)=>{
 if(!value||typeof value!=="object"||!value.document||value.document.schemaVersion!==2)throw error(400,"Cần thiệp v2 có đủ cấu trúc nhiều trang");
 const doc=value.document;
 if(!["red","jade","pink"].includes(doc.theme))throw error(400,"Phong cách không hợp lệ");
 const keys={bride:60,groom:60,date:20,time:10,venue:150,address:250,mapUrl:2048,guest:80,message:500};
 const fields:Record<string,string>={};
 for(const [key,max] of Object.entries(keys))fields[key]=key==="mapUrl"?mapLink(doc.fields?.mapUrl):clean(doc.fields?.[key],max);
 const extras:Record<string,unknown>[]=[];
 if(doc.extraPages!==undefined&&!Array.isArray(doc.extraPages))throw error(400,"Danh sách trang không hợp lệ");
 if((doc.extraPages||[]).length>20)throw error(400,"Tối đa 20 trang bổ sung");
 const pages=new Set(["cover","inside"]);
 for(const p of doc.extraPages||[]){
  const id=clean(p.id,70);
  if(!/^[A-Za-z0-9_-]{1,70}$/.test(id)||pages.has(id)||!["map","gift","custom"].includes(p.kind))throw error(400,"Mã trang không hợp lệ");
  pages.add(id);extras.push({id,kind:p.kind,title:clean(p.title,65),blocks:validateBlocks(p.blocks)});
 }
 const gift=doc.gift||{};
 const bank=["VCB","TCB","MB","ACB","BIDV","CTG","VPB","TPB","STB","VIB","HDB","OCB","MSB","SHB"].includes(gift.bank)?gift.bank:"VCB";
 const account=/^[0-9]{6,19}$/.test(String(gift.account||""))?String(gift.account):"";
 const fieldsData={...fields,theme:doc.theme,music:clean(doc.music,45)};
 const document={
  schemaVersion:2,theme:doc.theme,layoutId:clean(doc.layoutId,65),
  width:720,height:1080,fields,
  music:clean(doc.music,45),blocks:validateBlocks(doc.blocks),
  insideBlocks:doc.insideBlocks===undefined?[]:validateBlocks(doc.insideBlocks),
  extraPages:extras,gift:{bank,account,holder:clean(gift.holder,70),amount:/^[0-9]{1,10}$/.test(String(gift.amount||""))?String(gift.amount):"",note:clean(gift.note,90)}
 };
 return {...fieldsData,font:"script",volume:35,musicStart:0,photo:"",document};
};
async function limitWrites(req:Request){
 const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||(req.headers.get("x-forwarded-for")||"").split(",")[0]||"unknown";
 const hash=(await digest(ip)).slice(0,36);const since=new Date(Date.now()-3600000).toISOString();
 const {count,error:e}=await db.from("request_log").select("id",{count:"exact",head:true}).eq("ip",hash).gte("at",since);
 if(e)throw e;if((count||0)>=60)return false;
 const {error:write}=await db.from("request_log").insert({ip:hash});
 if(write)throw write;return true;
}
async function findCard(idOrCode:string){
 const column=validUUID(idOrCode)?"id":validCode(idOrCode)?"short_code":null;
 if(!column)return null;
 const {data,error:e}=await db.from("cards").select("id,short_code,edit_token_hash,data,created_at,updated_at,expires_at,is_revoked,has_music").eq(column,idOrCode).maybeSingle();
 if(e)throw e;return data;
}
const pub=(row:any)=>({id:row.id,code:row.short_code,data:row.data,createdAt:row.created_at,expiresAt:row.expires_at});
const ensureLive=(row:any)=>{
 if(!row)throw error(404,"Không tìm thấy mã thiệp");
 if(new Date(row.expires_at).getTime()<=Date.now())throw error(410,"Thiệp đã hết thời hạn");
 if(row.is_revoked)throw error(410,"Liên kết thiệp đã bị chủ thiệp thu hồi");
};
async function handle(req:Request){
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:CORS});
 const u=new URL(req.url);
 const apiIndex=u.pathname.indexOf("/api/");
 const path=apiIndex>=0?u.pathname.slice(apiIndex):(u.pathname.endsWith("/api")?"/api":"");
 const seg=path.split("/").filter(Boolean);
 if(path==="/api/health"&&req.method==="GET")return out(200,{ok:true,storage:"supabase-postgres",retentionDays:30,publicCodes:true});
 if(path==="/api/cards"&&req.method==="POST"){
  if(!(await limitWrites(req)))throw error(429,"Quá nhiều yêu cầu, thử lại sau");
  const body=await jsonBody(req),data=validateData(body.data),id=crypto.randomUUID(),token=makeToken();
  const createdAt=new Date().toISOString(),expiresAt=new Date(Date.now()+TTL).toISOString();
  for(let i=0;i<6;i++){
   const code=short();const {error:e}=await db.from("cards").insert({id,short_code:code,edit_token_hash:await digest(token),data,created_at:createdAt,updated_at:createdAt,expires_at:expiresAt,is_revoked:false});
   if(!e)return out(201,{id,code,createdAt,expiresAt,editToken:token});
   if(e.code!=="23505")throw e;
  }
  throw error(503,"Không thể tạo mã, vui lòng thử lại");
 }
 if(seg[0]!=="api"||seg[1]!=="cards"||seg.length<3||seg.length>4)throw error(404,"Đường dẫn không tồn tại");
 const row=await findCard(seg[2]);
 if(!row)throw error(404,"Không tìm thấy thiệp");
 if(seg.length===3&&req.method==="GET"){ensureLive(row);return out(200,pub(row));}
 const isOwner=await authorized(req,row);
 if(seg.length===3&&req.method==="PUT"){
  if(!isOwner)throw error(403,"Không có quyền chỉnh sửa");
  if(!(await limitWrites(req)))throw error(429,"Quá nhiều yêu cầu");
  if(new Date(row.expires_at).getTime()<=Date.now())throw error(410,"Thiệp đã hết hạn");
  const body=await jsonBody(req),data=validateData(body.data),updatedAt=new Date().toISOString();
  const {error:e}=await db.from("cards").update({data,updated_at:updatedAt}).eq("id",row.id);
  if(e)throw e;
  return out(200,{id:row.id,code:row.short_code,expiresAt:row.expires_at,updatedAt});
 }
 if(seg[3]==="rsvp"&&req.method==="POST"){
  ensureLive(row);if(!(await limitWrites(req)))throw error(429,"Quá nhiều yêu cầu");
  const body=await jsonBody(req),attendance=body.attendance,name=clean(body.name,60),wish=clean(body.wish,500);
  if(!["yes","no","wish"].includes(attendance)||(!name&&!wish))throw error(400,"Thông tin phản hồi chưa hợp lệ");
  const {count,error:e}=await db.from("rsvps").select("id",{count:"exact",head:true}).eq("card_id",row.id);if(e)throw e;
  if((count||0)>=500)throw error(429,"Thiệp đã nhận tối đa phản hồi");
  const reply={id:crypto.randomUUID(),card_id:row.id,name:name||"Khách mời",attendance,guests:attendance==="yes"?Math.floor(n(body.guests,1,5,1)):0,wish};
  const {error:write}=await db.from("rsvps").insert(reply);if(write)throw write;
  return out(201,{ok:true,id:reply.id});
 }
 if(!isOwner)throw error(403,"Không có quyền quản lý thiệp");
 if(seg[3]==="rsvps"&&req.method==="GET"){
  const {data,error:e}=await db.from("rsvps").select("id,name,attendance,guests,wish,created_at").eq("card_id",row.id).order("created_at",{ascending:false}).limit(500);
  if(e)throw e;
  return out(200,{rsvps:(data||[]).map(x=>({id:x.id,name:x.name,attendance:x.attendance,guests:x.guests,wish:x.wish,createdAt:x.created_at})),count:data?.length||0,expiresAt:row.expires_at});
 }
 if(seg[3]==="manage"&&req.method==="GET"){
  const {count,error:e}=await db.from("rsvps").select("id",{count:"exact",head:true}).eq("card_id",row.id);if(e)throw e;
  return out(200,{id:row.id,code:row.short_code,revoked:row.is_revoked,createdAt:row.created_at,updatedAt:row.updated_at,expiresAt:row.expires_at,rsvpCount:count||0,title:clean(row.data?.bride,60)+" & "+clean(row.data?.groom,60)});
 }
 if(["revoke","restore","extend"].includes(seg[3])&&req.method==="POST"){
  if(!(await limitWrites(req)))throw error(429,"Quá nhiều yêu cầu");
  if(new Date(row.expires_at).getTime()<=Date.now())throw error(410,"Thiệp đã hết hạn");
  const patch:any={updated_at:new Date().toISOString()};
  if(seg[3]==="revoke")patch.is_revoked=true;
  else if(seg[3]==="restore")patch.is_revoked=false;
  else{
   const ceiling=Date.parse(row.created_at)+365*86400000;
   const next=Math.min(ceiling,Date.parse(row.expires_at)+TTL);
   if(next<=Date.parse(row.expires_at))throw error(409,"Đã đạt thời gian lưu tối đa");
   patch.expires_at=new Date(next).toISOString();
  }
  const {error:e}=await db.from("cards").update(patch).eq("id",row.id);if(e)throw e;
  return out(200,{ok:true,code:row.short_code,revoked:patch.is_revoked??row.is_revoked,expiresAt:patch.expires_at??row.expires_at});
 }
 throw error(405,"Phương thức không được hỗ trợ");
}
Deno.serve(async req=>{
 try{return await handle(req);}
 catch(e){console.error("studio-api error",e?.message||e);return out(e?.status||500,{error:e?.status?e.message:"Máy chủ đang gặp sự cố"});}
});
