// Hỷ Studio: optional multipage invitation extensions. No payment processing.
export const BANKS=[
 {code:"VCB",id:"VCB",name:"Vietcombank"},
 {code:"TCB",id:"TCB",name:"Techcombank"},
 {code:"MB",id:"MB",name:"MB Bank"},
 {code:"ACB",id:"ACB",name:"ACB"},
 {code:"BIDV",id:"BIDV",name:"BIDV"},
 {code:"CTG",id:"ICB",name:"VietinBank"},
 {code:"VPB",id:"VPB",name:"VPBank"},
 {code:"TPB",id:"TPB",name:"TPBank"},
 {code:"STB",id:"STB",name:"Sacombank"},
 {code:"VIB",id:"VIB",name:"VIB"},
 {code:"HDB",id:"HDB",name:"HDBank"},
 {code:"OCB",id:"OCB",name:"OCB"},
 {code:"MSB",id:"MSB",name:"MSB"},
 {code:"SHB",id:"SHB",name:"SHB"}
];
export const blankGift=()=>({bank:"VCB",account:"",holder:"",amount:"",note:"Mung cuoi"});
export const safeGift=raw=>{
 const gift=raw||{};
 return {
  bank:BANKS.some(b=>b.code===gift.bank)?gift.bank:"VCB",
  account:/^[0-9]{6,19}$/.test(String(gift.account||""))?String(gift.account):"",
  holder:String(gift.holder||"").replace(/[<>]/g,"").slice(0,70),
  amount:/^[0-9]{1,10}$/.test(String(gift.amount||""))?String(gift.amount):"",
  note:String(gift.note||"Mung cuoi").replace(/[\r\n<>]/g," ").slice(0,90)
 };
};
export const giftReady=gift=>!!(gift&&/^[0-9]{6,19}$/.test(String(gift.account||""))&&BANKS.some(x=>x.code===gift.bank)&&String(gift.holder||"").trim().length);
export function vietQRUrl(gift){
 const g=safeGift(gift);
 if(!giftReady(g))return "";
 const bank=BANKS.find(b=>b.code===g.bank);
 const p=new URLSearchParams({accountName:g.holder,addInfo:g.note||"Mung cuoi"});
 if(g.amount)p.set("amount",g.amount);
 return "https://img.vietqr.io/image/"+encodeURIComponent(bank.id)+"-"+g.account+"-compact2.png?"+p.toString();
}
export function googleMapsUrl(fields){
 const raw=String(fields?.mapUrl||"").trim();
 if(raw){try{
  const u=new URL(raw);
  if(u.protocol==="https:"&&(u.hostname==="google.com"||u.hostname==="www.google.com"||u.hostname==="maps.google.com"||u.hostname==="maps.app.goo.gl"))return u.href.slice(0,2048);
 }catch(e){}}
 const query=[fields?.venue,fields?.address].map(x=>String(x||"").trim()).filter(Boolean).join(", ").slice(0,850);
 return query?"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(query):"";
}
export function safeMapUrl(raw){
 if(!raw)return "";
 try{const u=new URL(String(raw));return u.protocol==="https:"&&["google.com","www.google.com","maps.google.com","maps.app.goo.gl"].includes(u.hostname)?u.href.slice(0,2048):"";}catch(e){return "";}
}
const b=(id,type,x,y,w,h,extra={})=>({id,type,x,y,w,h,rotation:0,z:5,opacity:1,hidden:false,locked:false,userAdded:false,...extra});
const text=(id,label,x,y,w,h,sz,extra={})=>b(id,"text",x,y,w,h,{text:label,fontSize:sz,align:"center",weight:500,...extra});
export const PAGE_KINDS={
 map:{name:"Địa điểm & Chỉ đường",icon:"⌖"},
 gift:{name:"Mừng cưới",icon:"♡"},
 custom:{name:"Trang tuỳ chỉnh",icon:"✦"}
};
export function newExtraPage(kind="custom",theme="red"){
 if(!Object.hasOwn(PAGE_KINDS,kind))kind="custom";
 const id="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 const color=theme==="jade"?"#436c60":theme==="pink"?"#aa6072":"#933744";
 let blocks=[b("frame","frame",34,38,652,1004,{z:1,opacity:.8})];
 if(kind==="map")blocks.push(
  text("eyebrow","HẠNH PHÚC BẮT ĐẦU TỪ ĐÂY",80,122,560,47,18,{color,letterSpacing:3}),
  text("title","Địa điểm tổ chức",70,218,580,86,45,{color,fontFamily:"'Noto Serif',serif"}),
  b("map-photo","map",80,355,560,385,{z:3}),
  text("hint","Chạm để mở chỉ đường trên Google Maps",95,804,530,78,21,{color}),
  b("flower","ornament",498,42,170,170,{z:2,asset:"plum-branch",opacity:.68})
 );
 else if(kind==="gift")blocks.push(
  b("symbol","ornament",287,112,146,146,{z:2,asset:"song-hy"}),
  text("title","Mừng cưới",72,273,576,77,51,{color,fontFamily:"'Noto Serif',serif"}),
  text("message","Sự hiện diện của bạn là món quà quý giá nhất",95,365,530,92,22,{color}),
  b("qr-code","qr",190,483,340,340,{z:4}),
  text("hint","Quét mã để gửi lời chúc mừng",110,862,500,70,21,{color}),
  b("flower","ornament",495,840,180,180,{z:2,asset:"plum-branch",opacity:.65})
 );
 else blocks.push(
  b("flower","ornament",5,8,215,215,{z:2,asset:"plum-branch",opacity:.76}),
  text("title","Một trang kỷ niệm",80,294,560,95,51,{color,fontFamily:"'Noto Serif',serif"}),
  text("message","Thêm lời nhắn, hình ảnh và kỷ niệm đáng nhớ của chúng mình",110,460,500,160,26,{color}),
  b("flower2","ornament",490,814,205,205,{z:2,asset:"gold-corner",rotation:180,opacity:.5})
 );
 return {id,kind,title:PAGE_KINDS[kind].name,blocks};
}
export function allPages(doc){
 return [{id:"cover",title:"Bìa ngoài",kind:"cover",blocks:doc.blocks},
  {id:"inside",title:"Mặt trong",kind:"inside",blocks:doc.insideBlocks},
  ...(doc.extraPages||[])];
}
export function pageById(doc,id){return allPages(doc).find(p=>p.id===id);}
export function pageSurface(doc,id){
 const p=pageById(doc,id)||allPages(doc)[0];
 return {...doc,face:p.id==="cover"?"cover":"inside",pageKind:p.kind,blocks:p.blocks};
}
