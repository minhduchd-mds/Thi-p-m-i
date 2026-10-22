import {allPages,pageSurface,googleMapsUrl,vietQRUrl,giftReady,BANKS} from "./card-extras.mjs";
import {migrate,songs,fieldsDefault,surfaceDoc} from "/editor-core.mjs";
import {renderStage} from "/editor-render.mjs";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let doc=null,cardId=params.get("card")||params.get("code")||(location.pathname.match(/^\/i\/(HY-[A-HJ-NP-Z2-9]{12})\/?$/)?.[1]||""),isOpen=false,pageIndex=1;
function setPage(index,animate=true){
 if(!doc)return;
 const pages=allPages(doc),next=Math.max(1,Math.min(index,pages.length-1));
 pageIndex=next;
 const p=pages[pageIndex];
 const inside=$("inside-poster");
 if(animate){inside.classList.remove("turning");void inside.offsetWidth;inside.classList.add("turning");}
 renderStage(inside,pageSurface(doc,p.id));
 $("page-name").textContent=p.title;
 $("page-number").textContent=(pageIndex+1)+" / "+pages.length;
 $("page-prev").disabled=pageIndex===1;
 $("page-next").disabled=pageIndex===pages.length-1;
 $("viewer-pager").hidden=!isOpen;
 const extras=$("page-interactions"),map=$("map-directions"),gift=$("gift-details");
 map.hidden=true;gift.hidden=true;extras.hidden=true;
 if(isOpen&&p.kind==="map"){
  const url=googleMapsUrl(doc.fields);
  if(url){map.href=url;map.hidden=false;extras.hidden=false;}
 }
 if(isOpen&&p.kind==="gift"&&giftReady(doc.gift)){
  const bank=BANKS.find(b=>b.code===doc.gift.bank);
  $("gift-beneficiary").textContent=doc.gift.holder;
  $("gift-bank-details").textContent=(bank?.name||doc.gift.bank)+" · "+doc.gift.account;
  gift.hidden=false;extras.hidden=false;
 }
}
function setOpen(open,fromUser=false){
 isOpen=!!open;
 if(!isOpen)pageIndex=1;
 $("book").classList.toggle("is-open",isOpen);
 $("viewer").classList.toggle("opened",isOpen);
 $("inside-poster").setAttribute("aria-hidden",String(!isOpen));
 $("book-left-inside").setAttribute("aria-hidden",String(!isOpen));
 $("poster").setAttribute("aria-hidden",String(isOpen));
 $("toggle-open").setAttribute("aria-expanded",String(isOpen));
 $("toggle-open").textContent=isOpen?"↶ Đóng thiệp xem bìa":"✉ Mở thiệp để xem bên trong";
 $("book-status").textContent=isOpen?"Mặt trong · Lời mời & thông tin lễ cưới":"Mặt ngoài · Chạm để mở thiệp";
 resize();
 if(doc)setPage(pageIndex,false);
 if(isOpen&&fromUser&&$("audio").src&&$("audio").paused){$("audio").play().then(()=>$("music").textContent="♫ Tắt nhạc").catch(()=>{});}
}
function toggleOpen(open,fromUser=false){setOpen(open,fromUser);}
$("toggle-open").addEventListener("click",()=>toggleOpen(!isOpen,true));
$("page-prev").addEventListener("click",()=>setPage(pageIndex-1));
$("page-next").addEventListener("click",()=>setPage(pageIndex+1));
$("copy-bank-account").addEventListener("click",async()=>{
 try{await navigator.clipboard.writeText(doc.gift.account);$("result").textContent="Đã sao chép số tài khoản — vui lòng kiểm tra tên người nhận trước khi chuyển.";}
 catch(e){$("result").textContent="Số tài khoản: "+doc.gift.account;}
});
document.addEventListener("keydown",e=>{
 if(!isOpen||!doc||["INPUT","SELECT","TEXTAREA"].includes(document.activeElement?.tagName))return;
 if(e.key==="ArrowRight"&&pageIndex<allPages(doc).length-1)setPage(pageIndex+1);
 if(e.key==="ArrowLeft"&&pageIndex>1)setPage(pageIndex-1);
});
$("poster").addEventListener("click",()=>{if(!isOpen)toggleOpen(true,true)});
$("poster").addEventListener("keydown",e=>{if(!isOpen&&(e.key==="Enter"||e.key===" ")){e.preventDefault();toggleOpen(true,true)}});
async function boot(){
 try{
  if(params.has("preview")){
   const d=JSON.parse(localStorage.getItem("hy-studio-editor-v2")||"null");
   if(!d?.doc)throw Error("Chưa có bản nháp trong trình duyệt này.");
   doc=migrate(d.doc);
   $("rsvp").querySelector('button[type="submit"]').disabled=true;
   $("result").textContent="Bản xem trước: phản hồi RSVP chỉ hoạt động với thiệp đã xuất bản.";
  }else if(cardId){
   const response=await fetch("/api/cards/"+encodeURIComponent(cardId));
   if(!response.ok)throw Error("Không thể tải thiệp từ máy chủ ("+response.status+").");
   const result=await response.json();
   doc=migrate(result.data?.document||result.data);
  }else throw Error("Thiếu liên kết thiệp.");
  document.title="Thiệp cưới "+doc.fields.bride+" & "+doc.fields.groom+" – Hỷ Studio";
  $("invitation-title").textContent=doc.fields.bride+" & "+doc.fields.groom;
  $("back-couple").textContent=doc.fields.bride+" & "+doc.fields.groom;
  $("back-date").textContent=doc.fields.date?doc.fields.date.split("-").reverse().join(" · "):"Ngày hạnh phúc";
  $("left-couple").textContent=doc.fields.bride+" & "+doc.fields.groom;
  $("left-date").textContent=doc.fields.date?doc.fields.date.split("-").reverse().join(" · "):"Ngày hạnh phúc";
  $("invitation-intro").textContent="Trân trọng kính mời "+(doc.fields.guest||"bạn")+" đến chung vui vào "+doc.fields.date+" lúc "+doc.fields.time+" tại "+doc.fields.venue+" — "+doc.fields.address+".";
  $("attendance").addEventListener("change",()=>{$("guests").disabled=$("attendance").value!=="yes";});
  const musicPaths={
   "loi-hen-tram-nam":"/assets/music/loi-hen-tram-nam.mp3",
   "duyen-ngoc-phuong-dong":"/assets/music/duyen-ngoc-phuong-dong.mp3",
   "ngay-vui-chung-doi":"/assets/music/ngay-vui-chung-doi.mp3",
   "binh-minh-hanh-phuc":"/assets/music/binh-minh-hanh-phuc.mp3"
  };
  const audio=$("audio");
  if(musicPaths[doc.music])audio.src=musicPaths[doc.music];else $("music").hidden=true;
  $("music").addEventListener("click",async()=>{
   if(audio.paused){try{await audio.play();$("music").textContent="♫ Tắt nhạc";}catch(e){$("result").textContent="Trình duyệt chưa phát được nhạc.";}}
   else {audio.pause();$("music").textContent="♫ Bật nhạc nền";}
  });
  $("share").addEventListener("click",async()=>{
   try{await navigator.share({title:document.title,url:location.href});}
   catch(e){try{await navigator.clipboard.writeText(location.href);$("result").textContent="Đã sao chép liên kết thiệp.";}catch(x){$("result").textContent=location.href;}}
  });
  $("loading").hidden=true;$("viewer").hidden=false;
  resize();if(doc)setPage(1,false);window.addEventListener("resize",resize);
  if(params.has("animate"))window.setTimeout(()=>{if(!isOpen)toggleOpen(true,false)},850);
 }catch(e){$("loading").textContent="Không thể mở thiệp: "+e.message;}
}
function resize(){
 const mobile=window.innerWidth<=720;
 const spread=isOpen&&!mobile;
 const maxWidth=Math.min(900,window.innerWidth-28);
 const size=Math.min(.6,maxWidth/(spread?1440:720),(window.innerHeight<760?500:650)/1080);
 $("poster-wrap").style.width=((spread?1440:720)*size)+"px";
 $("poster-wrap").style.height=(1080*size)+"px";
 $("book-transform").style.transform="scale("+size+")";
 $("book").style.left=spread?"720px":"0px";
 if(doc){
  renderStage($("poster"),surfaceDoc(doc,"cover"));
  renderStage($("inside-poster"),pageSurface(doc,allPages(doc)[pageIndex]?.id||"inside"));
 }
}
$("rsvp").addEventListener("submit",async event=>{
 event.preventDefault();
 if(!cardId)return;
 const button=$("rsvp").querySelector('button[type="submit"]');
 button.disabled=true;
 try{
  const data={name:$("guest-name").value.trim(),attendance:$("attendance").value,guests:Number($("guests").value),wish:$("wish").value.trim()};
  const r=await fetch("/api/cards/"+encodeURIComponent(cardId)+"/rsvp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(result.error||"Lỗi gửi phản hồi");
  $("result").textContent="Cảm ơn bạn! Phản hồi đã được ghi nhận ♡";
  $("rsvp").reset();
 }catch(e){$("result").textContent="Không thể gửi: "+e.message;button.disabled=false;}
});
boot();