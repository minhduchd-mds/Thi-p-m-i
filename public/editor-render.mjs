import {W,H,themes,assetUrl,blockText} from "/editor-core.mjs";
export const paintBackground=(el,doc)=>{
 el.style.background="linear-gradient(150deg,"+themes[doc.theme].bg1+","+themes[doc.theme].bg2+")";
 el.style.setProperty("--paper-ink",themes[doc.theme].ink);
 el.style.setProperty("--paper-gold",themes[doc.theme].gold);
 el.style.setProperty("--paper-sub",themes[doc.theme].sub);
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
   item.style.color=block.color||themes[doc.theme].ink;
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
  }else if(block.type==="frame"){
   item.style.border="5px double "+themes[doc.theme].gold;
   item.style.boxShadow="inset 0 0 0 8px "+themes[doc.theme].bg1;
  }else{
   item.style.background=block.fill||themes[doc.theme].gold;
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
 const theme=themes[doc.theme];
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
 link.href=url;link.download="hy-studio-"+doc.theme+"."+(type==="image/png"?"png":"webp");
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
