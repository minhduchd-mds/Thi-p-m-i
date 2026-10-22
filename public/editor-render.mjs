import {vietQRUrl,giftReady,googleMapsUrl} from "./card-extras.mjs";
import {W,H,themes,insidePalette,assetUrl,blockText} from "/editor-core.mjs";
export const palette=doc=>doc.face==="inside"?insidePalette[doc.theme]:themes[doc.theme];
export const paintBackground=(el,doc)=>{
 const colors=palette(doc);
 el.style.background="linear-gradient(155deg,"+colors.bg1+","+colors.bg2+")";
 el.style.setProperty("--paper-ink",colors.ink);
 el.style.setProperty("--paper-gold",colors.gold);
 el.style.setProperty("--paper-sub",colors.sub||colors.ink);
};
export function renderStage(el,doc,selected=""){
 paintBackground(el,doc);
 el.replaceChildren();
 const blocks=[...doc.blocks].sort((a,b)=>a.z-b.z);
 for(const block of blocks){
  if(block.hidden)continue;
  const item=document.createElement("div");
  item.className="stage-block t-"+block.type+(selected===block.id?" is-selected":"");
  item.dataset.blockId=block.id;
  Object.assign(item.style,{left:block.x+"px",top:block.y+"px",width:block.w+"px",height:block.h+"px",
   transform:"rotate("+block.rotation+"deg)",opacity:String(block.opacity),zIndex:String(block.z)});
  if(block.type==="text"){
   item.textContent=blockText(block,doc);
   item.style.fontSize=(block.fontSize||24)+"px";
   item.style.color=block.color||palette(doc).ink;
   item.style.fontFamily=block.fontFamily||"'Noto Serif',serif";
   item.style.textAlign=block.align||"center";
   item.style.fontWeight=String(block.weight||500);
   item.style.letterSpacing=(block.letterSpacing||0)+"px";
   item.style.justifyContent={left:"flex-start",center:"center",right:"flex-end"}[block.align||"center"];
  }else if(block.type==="ornament"||block.type==="image"){
   const img=document.createElement("img");
   img.src=block.type==="ornament"?assetUrl(block.asset):block.src;
   img.alt="";
   img.draggable=false;
   img.style.objectFit=block.type==="ornament"?"contain":(block.fit||"cover");
   item.appendChild(img);
  }else if(block.type==="map"){
   item.classList.add("map-block");
   const pin=document.createElement("span");pin.className="map-pin";pin.textContent="⌖";
   const place=document.createElement("span");place.className="map-place";place.textContent=doc.fields.venue||"Địa điểm tổ chức";
   const address=document.createElement("span");address.className="map-address";address.textContent=doc.fields.address||"Nhập địa chỉ để mở bản đồ";
   const action=document.createElement("span");action.className="map-link-label";action.textContent=googleMapsUrl(doc.fields)?"↗ Xem trên Google Maps":"Nhập địa điểm trong tab Nội dung";
   item.append(pin,place,address,action);
  }else if(block.type==="qr"){
   item.classList.add("gift-qr-block");
   const url=vietQRUrl(doc.gift);
   if(url){
    const qr=document.createElement("img");qr.alt="QR mừng cưới — kiểm tra người nhận trước khi chuyển";qr.src=url;qr.loading="lazy";qr.referrerPolicy="no-referrer";qr.style.objectFit="contain";
    const account=document.createElement("span");account.className="gift-qr-caption";account.textContent=doc.gift.holder+" · "+doc.gift.account;
    item.append(qr,account);
   }else{
    const empty=document.createElement("span");empty.className="gift-qr-placeholder";empty.textContent="▦\nThiết lập ngân hàng, số tài khoản và người nhận trong tab Nội dung";item.append(empty);
   }
  }else if(block.type==="frame"){
   item.style.border="5px double "+palette(doc).gold;
   item.style.boxShadow="inset 0 0 0 8px "+palette(doc).bg1;
  }else{
   item.style.background=block.fill||palette(doc).gold;
  }
  if(selected===block.id){
   const handle=document.createElement("span");handle.className="block-resize";handle.dataset.handle="resize";
   item.appendChild(handle);
  }
  el.appendChild(item);
 }
}
const imageCache=new Map();
async function getImg(url){
 if(!url)return null;
 if(imageCache.has(url))return imageCache.get(url);
 const p=new Promise(resolve=>{const img=new Image();img.crossOrigin="anonymous";img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=url;});
 imageCache.set(url,p);return p;
}
function getLines(ctx,text,maxWidth){
 const paragraphs=String(text||"").split("\n");
 const lines=[];
 for(const para of paragraphs){
  const words=para.split(/\s+/);let current="";
  for(const word of words){
   const next=current?current+" "+word:word;
   if(ctx.measureText(next).width>maxWidth&&current){lines.push(current);current=word;}else current=next;
  }
  lines.push(current);
 }
 return lines;
}
export async function drawPoster(doc,scale=2){
 await (document.fonts?.ready||Promise.resolve());
 const canvas=document.createElement("canvas");
 canvas.width=W*scale;canvas.height=H*scale;
 const ctx=canvas.getContext("2d",{alpha:false});
 ctx.scale(scale,scale);
 const theme=palette(doc);
 const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,theme.bg1);grad.addColorStop(1,theme.bg2);
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 for(const block of [...doc.blocks].sort((a,b)=>a.z-b.z)){
  if(block.hidden)continue;
  ctx.save();ctx.globalAlpha=block.opacity??1;
  ctx.translate(block.x+block.w/2,block.y+block.h/2);
  ctx.rotate((block.rotation||0)*Math.PI/180);
  const x=-block.w/2,y=-block.h/2,w=block.w,h=block.h;
  if(block.type==="ornament"||block.type==="image"){
   const img=await getImg(block.type==="ornament"?assetUrl(block.asset):block.src);
   if(img){
    const ratio=block.type==="ornament"||block.fit==="contain"?Math.min(w/img.width,h/img.height):Math.max(w/img.width,h/img.height);
    let iw=img.width*ratio,ih=img.height*ratio;
    if(block.type==="image"&&block.fit!=="contain"){ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();}
    ctx.drawImage(img,x+(w-iw)/2,y+(h-ih)/2,iw,ih);
   }
  }else if(block.type==="map"){
   ctx.fillStyle="#e8ded2";ctx.fillRect(x,y,w,h);
   ctx.strokeStyle=theme.gold;ctx.lineWidth=4;ctx.strokeRect(x+3,y+3,w-6,h-6);
   ctx.textAlign="center";ctx.fillStyle="#8d3b42";ctx.font="500 64px serif";ctx.fillText("⌖",0,y+95);
   ctx.fillStyle="#57453d";ctx.font="600 25px serif";ctx.fillText((doc.fields.venue||"Địa điểm tổ chức").slice(0,30),0,y+154,w-32);
   ctx.font="19px sans-serif";ctx.fillText((doc.fields.address||"Địa chỉ sẽ xuất hiện tại đây").slice(0,55),0,y+201,w-30);
   ctx.fillStyle="#974f4b";ctx.font="600 18px sans-serif";ctx.fillText("↗ Google Maps",0,y+h-32);
  }else if(block.type==="qr"){
   ctx.fillStyle="#fff";ctx.fillRect(x,y,w,h);
   const url=vietQRUrl(doc.gift);
   if(url){
    const qr=await getImg(url);
    if(qr){const side=Math.min(w,h-32);ctx.drawImage(qr,x+(w-side)/2,y,side,side);}
    else {ctx.textAlign="center";ctx.fillStyle="#6b5042";ctx.font="19px sans-serif";ctx.fillText("Mở thiệp web để quét VietQR",0,0,w-12);}
    ctx.fillStyle="#564334";ctx.font="18px sans-serif";ctx.textAlign="center";ctx.fillText((doc.gift.holder+" · "+doc.gift.account).slice(0,38),0,y+h-15,w-12);
   }else{
    ctx.textAlign="center";ctx.fillStyle="#a06a6a";ctx.font="22px sans-serif";ctx.fillText("Chưa thiết lập tài khoản",0,0,w-20);
   }
  }else if(block.type==="frame"){
   ctx.strokeStyle=theme.gold;ctx.lineWidth=5;ctx.strokeRect(x+3,y+3,w-6,h-6);
   ctx.lineWidth=1;ctx.strokeRect(x+15,y+15,w-30,h-30);
  }else if(block.type==="shape"){
   ctx.fillStyle=block.fill||theme.gold;ctx.fillRect(x,y,w,h);
  }else if(block.type==="text"){
   const sz=block.fontSize||24;
   ctx.font=String(block.weight||500)+" "+sz+"px "+(block.fontFamily||"'Noto Serif',serif");
   ctx.fillStyle=block.color||theme.ink;
   ctx.textAlign=block.align||"center";ctx.textBaseline="middle";
   const lines=getLines(ctx,blockText(block,doc),Math.max(30,w-8));
   const lineHeight=sz*1.28,total=lines.length*lineHeight;
   let y0=y+(h-total)/2+lineHeight/2;
   for(let i=0;i<lines.length;i++){
    ctx.fillText(lines[i],block.align==="left"?x+4:(block.align==="right"?x+w-4:0),y0+i*lineHeight,w-8);
   }
  }
  ctx.restore();
 }
 return canvas;
}
export async function downloadPoster(doc,type="image/webp"){
 const canvas=await drawPoster(doc,2);
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,type,type==="image/webp"?.94:undefined));
 if(!blob)throw Error("Không thể tạo ảnh. Kiểm tra asset và trình duyệt.");
 const link=document.createElement("a");
 const url=URL.createObjectURL(blob);
 link.href=url;link.download="hy-studio-"+doc.theme+"-"+(doc.face==="inside"?"mat-trong":"bia-ngoai")+"."+(type==="image/png"?"png":"webp");
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
