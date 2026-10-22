import {migrate,songs,fieldsDefault} from "/editor-core.mjs";
import {renderStage} from "/editor-render.mjs";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let doc=null,cardId=params.get("card");
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
  resize();window.addEventListener("resize",resize);
 }catch(e){$("loading").textContent="Không thể mở thiệp: "+e.message;}
}
function resize(){
 const size=Math.min(.83,(window.innerWidth-28)/720,540/1080);
 $("poster-wrap").style.width=(720*size)+"px";
 $("poster-wrap").style.height=(1080*size)+"px";
 $("poster").style.transform="scale("+size+")";
 if(doc)renderStage($("poster"),doc);
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