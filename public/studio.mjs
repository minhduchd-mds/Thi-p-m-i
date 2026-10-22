import {BANKS,blankGift,safeGift,giftReady,googleMapsUrl,newExtraPage,allPages,pageById,pageSurface} from "./card-extras.mjs";
import {W,H,themes,assets,songs,fieldsDefault,createDoc,migrate,sanitize,clone,blockText,blockName,addBlock,surfaceDoc,faces} from "/editor-core.mjs";
import {renderStage,downloadPoster} from "/editor-render.mjs";
const $=id=>document.getElementById(id);
const STORE="hy-studio-editor-v2";
const OWNER="hy-studio-owner-";
let doc=createDoc(new URLSearchParams(location.search).get("theme")||"red");
let selected="",activeFace="cover",zoom=.55,history=[],future=[],dirty=false,cardId=null,editToken=null;
let pointer=null,focusSnapshot=null,gridOn=false,draftTimer=0;
const stage=$("stage"),wrap=$("stage-wrap"),area=$("drop-area");
const activePage=()=>pageById(doc,activeFace)||pageById(doc,"cover");
const activeBlocks=()=>activePage().blocks;
const setActiveBlocks=blocks=>{if(activeFace==="inside")doc.insideBlocks=blocks;else if(activeFace==="cover")doc.blocks=blocks;else activePage().blocks=blocks;};
const activeSurface=()=>pageSurface(doc,activeFace);
function setFace(face){
 if(!pageById(doc,face)||activeFace===face)return;
 activeFace=face;selected="";renderAll();
 notify("Đang thiết kế "+activePage().title);
}
function renderPageTabs(){
 const root=$("extra-page-tabs");root.replaceChildren();
 for(const p of doc.extraPages||[]){
  const button=document.createElement("button");button.type="button";button.dataset.face=p.id;button.setAttribute("role","tab");
  button.className="extra-page-button";button.textContent=(allPages(doc).indexOf(p)+1||doc.extraPages.indexOf(p)+3)+" · "+p.title;
  button.title=p.title;button.addEventListener("click",()=>setFace(p.id));root.append(button);
 }
 document.querySelectorAll("[data-face]").forEach(b=>{
  const isCurrent=b.dataset.face===activeFace;
  b.classList.toggle("active",isCurrent);b.setAttribute("aria-selected",String(isCurrent));
 });
 const custom=activeFace!=="cover"&&activeFace!=="inside";
 $("active-page-tools").hidden=!custom;
 if(custom)$("current-page-title").value=activePage().title;
}
function addPage(kind){
 if((doc.extraPages||[]).length>=20){notify("Tối đa 20 trang bổ sung để đảm bảo thiệp tải nhanh.");return;}
 checkpoint();const page=newExtraPage(kind,doc.theme);doc.extraPages.push(page);
 activeFace=page.id;selected="";renderAll();scheduleSave();notify("Đã thêm trang "+page.title);
}
function pageCommand(command){
 const idx=(doc.extraPages||[]).findIndex(p=>p.id===activeFace);if(idx<0)return;
 checkpoint();
 if(command==="delete"){doc.extraPages.splice(idx,1);activeFace="inside";}
 else if(command==="duplicate"){
  if(doc.extraPages.length>=20){history.pop();notify("Đã đạt 20 trang");return;}
  const copy=clone(doc.extraPages[idx]);copy.id="p"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  copy.title=(copy.title+" (bản sao)").slice(0,65);doc.extraPages.splice(idx+1,0,copy);activeFace=copy.id;
 }else if(command==="up"&&idx>0){const page=doc.extraPages.splice(idx,1)[0];doc.extraPages.splice(idx-1,0,page);}
 else if(command==="down"&&idx<doc.extraPages.length-1){const page=doc.extraPages.splice(idx,1)[0];doc.extraPages.splice(idx+1,0,page);}
 selected="";renderAll();scheduleSave();
}
const titleMap={bride:"Tên cô dâu",groom:"Tên chú rể",date:"Ngày cưới",time:"Giờ tổ chức",venue:"Tên địa điểm",address:"Địa chỉ chi tiết",mapUrl:"Link Google Maps (không bắt buộc)",guest:"Tên khách mời",message:"Lời mời"};
function notify(msg){$("status").textContent=msg;}
function saveDraft(){
 try{localStorage.setItem(STORE,JSON.stringify({doc,updatedAt:Date.now()}));$("autosave-label").textContent="Đã lưu bản nháp · Thiết bị này";}
 catch(e){$("autosave-label").textContent="Không thể lưu: bộ nhớ đã đầy";notify("Hãy xuất ảnh hoặc giảm dung lượng ảnh đính kèm.");}
}
function scheduleSave(){dirty=true;$("autosave-label").textContent="Đang chỉnh sửa…";clearTimeout(draftTimer);draftTimer=setTimeout(saveDraft,250);}
function checkpoint(before){history.push(before||clone(doc));if(history.length>60)history.shift();future=[];updateHistoryUI();}
function updateHistoryUI(){$("undo").disabled=!history.length;$("redo").disabled=!future.length;}
function undo(){
 if(!history.length)return;future.push(clone(doc));doc=history.pop();if(!pageById(doc,activeFace))activeFace="cover";selected=activeBlocks().some(b=>b.id===selected)?selected:"";renderAll();scheduleSave();
}
function redo(){
 if(!future.length)return;history.push(clone(doc));doc=future.pop();selected=activeBlocks().some(b=>b.id===selected)?selected:"";renderAll();scheduleSave();
}
function fit(){
 const availableW=area.clientWidth-85,availableH=area.clientHeight-65;
 zoom=Math.max(.2,Math.min(.85,availableW/W,availableH/H));
 applyZoom();
}
function applyZoom(){
 wrap.style.width=(W*zoom)+"px";wrap.style.height=(H*zoom)+"px";
 stage.style.transform="scale("+zoom+")";
 $("zoom-label").textContent=Math.round(zoom*100)+"%";
}
function renderCanvas(){
 renderStage(stage,activeSurface(),selected);
 stage.classList.toggle("show-grid",gridOn);
 $("coordinates").textContent=selected?(function(){const b=findSelected();return b?("X: "+Math.round(b.x)+" · Y: "+Math.round(b.y)+" · "+Math.round(b.w)+" × "+Math.round(b.h)):"";})():"Chưa chọn thành phần";
}
function renderThemes(){
 document.querySelectorAll("[data-theme]").forEach(btn=>{
  btn.classList.toggle("active",btn.dataset.theme===doc.theme);
  btn.setAttribute("aria-pressed",String(btn.dataset.theme===doc.theme));
 });
}
function renderAssets(){
 const root=$("asset-grid");root.replaceChildren();
 for(const asset of assets){
  const btn=document.createElement("button");btn.className="asset-card";btn.dataset.add=asset.id;
  btn.draggable=true;btn.type="button";
  const img=document.createElement("img");img.src=asset.url;img.alt="";
  const label=document.createElement("span");label.textContent=asset.name;
  btn.append(img,label);root.append(btn);
 }
}
function renderFields(){
 const form=$("fields-form");form.replaceChildren();
 for(const [key,label] of Object.entries(titleMap)){
  const lbl=document.createElement("label");lbl.className="field-label";lbl.htmlFor="field-"+key;lbl.textContent=label;
  let el=key==="message"?document.createElement("textarea"):document.createElement("input");
  if(el instanceof HTMLInputElement)el.type=key==="date"?"date":(key==="time"?"time":(key==="mapUrl"?"url":"text"));
  el.name=key;el.id="field-"+key;el.value=doc.fields[key]||"";
  el.maxLength=key==="mapUrl"?2048:(key==="message"?300:200);
  el.addEventListener("focus",()=>{focusSnapshot=clone(doc);el.dataset.focusValue=el.value;});
  el.addEventListener("input",()=>{
   doc.fields[key]=el.value;renderCanvas();scheduleSave();
  });
  el.addEventListener("change",()=>{if(focusSnapshot&&el.dataset.focusValue!==el.value)checkpoint(focusSnapshot);focusSnapshot=null;});
  form.append(lbl,el);
 }
 $("music-choice").value=doc.music;
 const gift=safeGift(doc.gift);doc.gift=gift;
 const select=$("gift-bank");select.replaceChildren();
 for(const bank of BANKS){const option=document.createElement("option");option.value=bank.code;option.textContent=bank.name;select.append(option);}
 for(const el of document.querySelectorAll("[data-gift]"))el.value=gift[el.dataset.gift]||"";
 const map=googleMapsUrl(doc.fields);$("map-preview-link").href=map||"#";
 $("map-preview-link").classList.toggle("is-disabled",!map);
 $("gift-status").textContent=giftReady(gift)?"✓ VietQR sẵn sàng — xác nhận người nhận trước khi chuyển":"Nhập ngân hàng, số tài khoản và tên người nhận để tạo mã";
}
function renderLayers(){
 const list=$("layer-list");list.replaceChildren();
 for(const b of [...activeBlocks()].sort((a,b)=>b.z-a.z)){
  const line=document.createElement("div");line.className="layer-row"+(selected===b.id?" active":"");
  const button=document.createElement("button");button.className="layer-name";button.textContent=(b.hidden?"◌ ":"◉ ")+blockName(b);
  button.title=blockName(b);button.addEventListener("click",()=>selectBlock(b.id));
  const up=document.createElement("button");up.textContent="↑";up.title="Đưa lên";up.addEventListener("click",()=>moveLayer(b.id,1));
  const down=document.createElement("button");down.textContent="↓";down.title="Đưa xuống";down.addEventListener("click",()=>moveLayer(b.id,-1));
  line.append(button,up,down);list.append(line);
 }
}
function moveLayer(id,by){
 const b=activeBlocks().find(x=>x.id===id);if(!b)return;
 checkpoint();b.z=Math.max(0,Math.min(890,b.z+by));renderAll();scheduleSave();
}
const escape=x=>String(x??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function field(label,key,value,type="number",extra=""){
 return '<label class="field-label" for="prop-'+key+'">'+label+'</label><input id="prop-'+key+'" data-prop="'+key+'" type="'+type+'" value="'+escape(value)+'" '+extra+'>';
}
function renderInspector(){
 const root=$("inspector-content");
 const b=findSelected();
 $("inspector-title").textContent=b?blockName(b):"Bố cục "+activePage().title;
 if(!b){
  const t=themes[doc.theme];
  root.innerHTML='<section class="theme-preview"><div class="swatches"><i class="swatch" style="background:'+t.bg1+'"></i><i class="swatch" style="background:'+t.bg2+'"></i><i class="swatch" style="background:'+t.gold+'"></i></div><b>'+t.name+'</b><p>'+t.description+'</p></section><p class="inspect-intro">Chọn thành phần trên thiệp để chỉnh vị trí, kích thước, chữ, hoạ tiết và lớp. Có thể kéo hoạ tiết trực tiếp từ thư viện bên trái.</p><div class="inspect-section"><h3>Thông số tài liệu</h3><p class="inspect-intro">720 × 1080 px · Xuất 2×: 1440 × 2160 px · 3 layout riêng</p></div>';
  return;
 }
 let h='<div class="inspect-section"><h3>Vị trí & kích thước</h3><div class="inspect-grid">';
 for(const p of [["X","x"],["Y","y"],["Rộng","w"],["Cao","h"]])h+='<div>'+field(p[0],p[1],Math.round(b[p[1]]))+'</div>';
 h+='</div>'+field("Xoay (độ)","rotation",b.rotation)+field("Độ mờ 0–100","opacity",Math.round(b.opacity*100))+'</div>';
 if(b.type==="text"){
  const isBound=!!b.binding;
  h+='<div class="inspect-section"><h3>Nội dung & kiểu chữ</h3><label class="field-label" for="prop-text">'+(isBound?"Dữ liệu "+titleMap[b.binding]:"Văn bản")+'</label><textarea data-prop="text" id="prop-text">'+escape(blockText(b,doc))+'</textarea>';
  h+=field("Cỡ chữ (px)","fontSize",b.fontSize||24);
  h+='<label class="field-label" for="prop-fontFamily">Font nghệ thuật</label><select id="prop-fontFamily" data-prop="fontFamily">';
  const fonts=[["","Mặc định theo theme"],["'Noto Serif',serif","Noto Serif · Trang trọng"],["'Dancing Script',cursive","Dancing Script · Nghệ thuật"],["'Playfair Display',serif","Playfair Display · Thanh lịch"],["'Be Vietnam Pro',sans-serif","Be Vietnam Pro · Hiện đại"]];
  for(const f of fonts)h+='<option value="'+escape(f[0])+'"'+(b.fontFamily===f[0]?" selected":"")+'>'+f[1]+'</option>';
  h+='</select><label class="field-label" for="prop-align">Căn chữ</label><select id="prop-align" data-prop="align">';
  for(const a of ["left","center","right"])h+='<option value="'+a+'"'+(b.align===a?" selected":"")+'>'+({left:"Trái",center:"Giữa",right:"Phải"}[a])+'</option>';
  h+='</select>'+field("Màu chữ","color",b.color||themes[doc.theme].ink,"color")+'</div>';
 }else if(b.type==="ornament"){
  h+='<div class="inspect-section"><h3>Hoạ tiết</h3><label class="field-label">Đổi loại hoạ tiết</label><select data-prop="asset" id="prop-asset">';
  for(const a of assets)if(a.id!=="wood")h+='<option value="'+a.id+'"'+(b.asset===a.id?" selected":"")+'>'+a.name+'</option>';
  h+='</select></div>';
 }else if(b.type==="image"){
  h+='<div class="inspect-section"><h3>Ảnh WebP</h3><p class="inspect-intro">Hỗ trợ JPG, PNG và WebP. Ảnh tải lên được thu nhỏ và nén thành WebP.</p><div class="inspect-actions"><button id="change-image">Thay ảnh…</button></div><label class="field-label" for="prop-fit">Cách vừa khung</label><select id="prop-fit" data-prop="fit"><option value="cover">Fill / Crop</option><option value="contain"'+(b.fit==="contain"?" selected":"")+'>Fit / Contain</option></select></div>';
 }else if(b.type==="shape")h+='<div class="inspect-section">'+field("Màu nền","fill",b.fill||themes[doc.theme].gold,"color")+'</div>';
 else if(b.type==="map")h+='<div class="inspect-section"><h3>Liên kết chỉ đường</h3><p class="inspect-intro">Khối hiển thị địa điểm chung. Chỉnh Tên địa điểm, Địa chỉ, Google Maps ở tab Nội dung.</p><button type="button" id="goto-content" class="inspector-shortcut">Chỉnh địa điểm →</button></div>';
 else if(b.type==="qr")h+='<div class="inspect-section"><h3>VietQR mừng cưới</h3><p class="inspect-intro">QR được sinh khi chủ thiệp nhập tài khoản. Không tự xác nhận giao dịch.</p><button type="button" id="goto-content" class="inspector-shortcut">Chỉnh tài khoản →</button></div>';
 h+='<div class="inspect-section"><h3>Thao tác thành phần</h3><div class="inspect-actions"><button data-command="duplicate">Nhân bản</button><button data-command="up">Lên lớp</button><button data-command="down">Xuống lớp</button><button data-command="lock">'+(b.locked?"Mở khoá":"Khoá")+'</button><button data-command="hide">'+(b.hidden?"Hiện":"Ẩn")+'</button><button class="danger" data-command="delete">Xoá</button></div></div>';
 root.innerHTML=h;
}
function renderAll(){renderThemes();renderPageTabs();renderCanvas();renderFields();renderLayers();renderInspector();updateHistoryUI();}
function findSelected(){return activeBlocks().find(b=>b.id===selected);}
function selectBlock(id){selected=id||"";renderCanvas();renderInspector();renderLayers();}
function add(kind,x,y){
 checkpoint();const b=addBlock(kind,activeSurface(),x??260,y??370);activeBlocks().push(b);
 selectBlock(b.id);scheduleSave();notify("Đã thêm "+blockName(b));
}
function del(){
 const b=findSelected();if(!b||b.locked)return;checkpoint();setActiveBlocks(activeBlocks().filter(x=>x.id!==b.id));selected="";renderAll();scheduleSave();
}
function duplicate(){
 const b=findSelected();if(!b)return;checkpoint();const cp=clone(b);
 cp.id="b"+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 cp.x+=20;cp.y+=20;cp.locked=false;cp.userAdded=true;cp.z=Math.max(0,...activeBlocks().map(x=>x.z))+1;activeBlocks().push(cp);selected=cp.id;renderAll();scheduleSave();
}
function command(cmd){
 const b=findSelected();
 if(cmd==="delete"){del();return;}
 if(cmd==="duplicate"){duplicate();return;}
 if(!b)return;
 checkpoint();
 if(cmd==="up")b.z=Math.min(890,b.z+1);
 if(cmd==="down")b.z=Math.max(0,b.z-1);
 if(cmd==="lock")b.locked=!b.locked;
 if(cmd==="hide")b.hidden=!b.hidden;
 renderAll();scheduleSave();
}
function setTheme(theme){
 if(theme===doc.theme)return;
 if(dirty&&!confirm("Áp dụng bố cục "+themes[theme].name+"? Những thay đổi vị trí của khối mặc định sẽ được thay bằng layout mới; thành phần anh tự thêm vẫn được giữ."))return;
 checkpoint();doc=createDoc(theme,doc);selected="";dirty=false;renderAll();scheduleSave();notify("Đã chuyển sang bố cục "+themes[theme].name);
}
function propUpdate(el,commit=false){
 const b=findSelected();if(!b)return;
 const prop=el.dataset.prop;if(!prop)return;
 const value=el.value;
 if(prop==="text"){if(b.binding)doc.fields[b.binding]=value;else b.text=value;}
 else if(["x","y","w","h","rotation","fontSize"].includes(prop)){
  const n=Number(value);if(Number.isFinite(n))b[prop]=Math.max(prop==="w"||prop==="h"?20:-500,Math.min(1500,n));
 }else if(prop==="opacity")b.opacity=Math.max(0,Math.min(1,Number(value)/100));
 else b[prop]=value;
 renderCanvas();if(commit){if(focusSnapshot&&el.dataset.focusValue!==el.value)checkpoint(focusSnapshot);focusSnapshot=null;renderLayers();}
 scheduleSave();
}
function startPointer(e){
 const item=e.target.closest(".stage-block");if(!item){selectBlock("");return;}
 const b=activeBlocks().find(x=>x.id===item.dataset.blockId);if(!b)return;
 if(selected!==b.id)selectBlock(b.id);
 if(b.locked)return;
 e.preventDefault();
 pointer={id:b.id,kind:e.target.dataset.handle==="resize"?"resize":"move",x:e.clientX,y:e.clientY,fromX:b.x,fromY:b.y,fromW:b.w,fromH:b.h,before:clone(doc),changed:false};
}
function movePointer(e){
 if(!pointer)return;const b=activeBlocks().find(x=>x.id===pointer.id);if(!b)return;
 const dx=(e.clientX-pointer.x)/zoom,dy=(e.clientY-pointer.y)/zoom;
 if(pointer.kind==="resize"){b.w=Math.max(24,Math.round((pointer.fromW+dx)/5)*5);b.h=Math.max(24,Math.round((pointer.fromH+dy)/5)*5);}
 else {b.x=Math.round((pointer.fromX+dx)/5)*5;b.y=Math.round((pointer.fromY+dy)/5)*5;}
 pointer.changed=true;renderCanvas();
}
function endPointer(){if(!pointer)return;if(pointer.changed){checkpoint(pointer.before);scheduleSave();}pointer=null;renderLayers();renderInspector();}
function switchPanel(name){
 document.querySelectorAll(".palette-tab").forEach(x=>x.classList.toggle("active",x.dataset.panel===name));
 for(const p of ["blocks","fields","layers"])$(p+"-panel").hidden=p!==name;
}
async function uploadImage(file){
 if(!file||!/^image\/(?:png|webp|jpeg)$/.test(file.type)){notify("Hãy chọn JPG, PNG hoặc WebP");return;}
 if(file.size>12*1024*1024){notify("Ảnh quá lớn, giới hạn 12 MB trước nén");return;}
 const bmp=await createImageBitmap(file);
 const maxDim=1500,scale=Math.min(1,maxDim/Math.max(bmp.width,bmp.height));
 const canvas=document.createElement("canvas");
 canvas.width=Math.round(bmp.width*scale);canvas.height=Math.round(bmp.height*scale);
 canvas.getContext("2d").drawImage(bmp,0,0,canvas.width,canvas.height);bmp.close();
 let q=.87,url=canvas.toDataURL("image/webp",q);
 while(url.length>990000&&q>.45){q-=.12;url=canvas.toDataURL("image/webp",q);}
 if(url.length>1100000){notify("Ảnh vẫn quá lớn sau nén; vui lòng chọn ảnh khác");return;}
 let b=findSelected();if(!b||b.type!=="image"){add("image",190,320);b=findSelected();}
 checkpoint();b.src=url;renderCanvas();scheduleSave();notify("Đã nén và thêm ảnh WebP");
}
function preview(){
 saveDraft();window.open("/view.html?preview=1&animate=1","_blank","noopener");
}
async function publish(){
 $("publish-dialog").showModal();$("publish-info").textContent="Tạo link thiệp có hiệu lực 30 ngày. Bản xem trước tĩnh của Vercel không chạy API lưu thiệp; nếu chưa cấu hình backend, hãy dùng Lưu nháp / Xuất WebP.";
 $("publish-link-box").hidden=true;
}
async function sendPublish(){
 const btn=$("do-publish");btn.disabled=true;notify("Đang kết nối API…");
 try{
  const safe=sanitize(doc);
  const data=Object.assign({},safe.fields,{theme:safe.theme,font:"script",music:safe.music,volume:35,musicStart:0,photo:"",document:safe});
  const action=cardId&&editToken?"PUT":"POST";
  const url=action==="PUT"?"/api/cards/"+encodeURIComponent(cardId):"/api/cards";
  const r=await fetch(url,{method:action,headers:{"Content-Type":"application/json",...(editToken?{Authorization:"Bearer "+editToken}:{})},body:JSON.stringify({data})});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(result.error||"Lỗi HTTP "+r.status);
  if(action==="POST"){cardId=result.id;editToken=result.editToken;try{localStorage.setItem(OWNER+cardId,editToken);}catch(e){}}
  if(!cardId)throw Error("Máy chủ không trả ID thiệp");
  window.history.replaceState({}, "", "/studio.html?edit="+encodeURIComponent(cardId));
  const link=location.origin+"/view.html?card="+encodeURIComponent(cardId);
  $("published-url").value=link;$("publish-link-box").hidden=false;
  $("publish-info").textContent="Đã lưu thiệp. Link xem thiệp bên dưới dành cho khách, không chứa quyền chỉnh sửa.";
  notify("Đã xuất bản thiệp đến "+new Date(result.expiresAt).toLocaleDateString("vi-VN"));saveDraft();
 }catch(e){
  $("publish-info").textContent="Chưa thể xuất bản: "+e.message+". Bản nháp vẫn được lưu trên thiết bị; cần máy chủ Node và dữ liệu bền vững cho lưu công khai.";
  notify("Xuất bản chưa thành công — bản nháp vẫn an toàn");
 }finally{btn.disabled=false;}
}
async function boot(){
 try{const s=JSON.parse(localStorage.getItem(STORE)||"null");if(s?.doc)doc=migrate(s.doc);}catch(e){}
 const params=new URLSearchParams(location.search);
 if(params.has("theme"))doc=createDoc(params.get("theme"),doc);
 if(params.has("edit")){
  try{
   const id=params.get("edit");const r=await fetch("/api/cards/"+encodeURIComponent(id));
   if(!r.ok)throw Error("HTTP "+r.status);
   const result=await r.json();
   doc=migrate(result.data?.document||result.data);cardId=id;editToken=localStorage.getItem(OWNER+id);
   notify(editToken?"Đã tải thiệp từ máy chủ":"Chỉ xem được: chưa có quyền chỉnh sửa trên thiết bị này");
  }catch(e){notify("Không tải được thiệp từ máy chủ: "+e.message);}
 }
 renderAssets();renderAll();fit();saveDraft();
 if(params.get("panel")==="music"){switchPanel("fields");$("music-choice").focus();}
}
document.querySelectorAll("[data-face]").forEach(b=>b.addEventListener("click",()=>setFace(b.dataset.face)));
document.querySelectorAll("[data-new-page]").forEach(b=>b.addEventListener("click",()=>addPage(b.dataset.newPage)));
$("page-up").addEventListener("click",()=>pageCommand("up"));
$("page-down").addEventListener("click",()=>pageCommand("down"));
$("page-remove").addEventListener("click",()=>{if(confirm("Xoá trang đang chọn? Có thể hoàn tác bằng Undo."))pageCommand("delete")});
$("page-duplicate").addEventListener("click",()=>pageCommand("duplicate"));
$("current-page-title").addEventListener("focus",()=>{focusSnapshot=clone(doc);});
$("current-page-title").addEventListener("change",e=>{const p=activePage();if(activeFace!=="cover"&&activeFace!=="inside"){checkpoint(focusSnapshot);p.title=e.target.value.trim().slice(0,65)||"Trang mới";renderPageTabs();scheduleSave();}focusSnapshot=null;});
document.querySelectorAll("[data-gift]").forEach(el=>{
 el.addEventListener("focus",()=>{focusSnapshot=clone(doc);el.dataset.focusValue=el.value;});
 el.addEventListener("input",()=>{doc.gift={...doc.gift,[el.dataset.gift]:el.value};renderCanvas();scheduleSave();});
 el.addEventListener("change",()=>{if(focusSnapshot&&el.dataset.focusValue!==el.value)checkpoint(focusSnapshot);focusSnapshot=null;doc.gift=safeGift(doc.gift);renderCanvas();$("gift-status").textContent=giftReady(doc.gift)?"✓ QR chuyển khoản đã sẵn sàng":"Vui lòng kiểm tra ngân hàng, số tài khoản và tên người nhận";scheduleSave();});
});

$("stage").addEventListener("pointerdown",startPointer);
window.addEventListener("pointermove",movePointer);
window.addEventListener("pointerup",endPointer);
window.addEventListener("pointercancel",endPointer);
document.querySelectorAll("[data-theme]").forEach(el=>el.addEventListener("click",()=>setTheme(el.dataset.theme)));
document.querySelectorAll("[data-panel]").forEach(el=>el.addEventListener("click",()=>switchPanel(el.dataset.panel)));
$("block-tools").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(b)add(b.dataset.add);});
$("asset-grid").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(b)add(b.dataset.add);});
for(const selector of ["#block-tools","#asset-grid"]){
 document.querySelector(selector).addEventListener("dragstart",e=>{const b=e.target.closest("[data-add]");if(b){e.dataTransfer.setData("text/plain",b.dataset.add);e.dataTransfer.effectAllowed="copy";}});
}
area.addEventListener("dragover",e=>{e.preventDefault();area.classList.add("drag-over");e.dataTransfer.dropEffect="copy";});
area.addEventListener("dragleave",e=>{if(!area.contains(e.relatedTarget))area.classList.remove("drag-over");});
area.addEventListener("drop",e=>{
 e.preventDefault();area.classList.remove("drag-over");
 const kind=e.dataTransfer.getData("text/plain");
 if(!["text","frame","shape","image","map","qr",...assets.map(x=>x.id)].includes(kind))return;
 const r=stage.getBoundingClientRect();add(kind,Math.max(0,Math.round((e.clientX-r.left)/zoom-80)),Math.max(0,Math.round((e.clientY-r.top)/zoom-50)));
});
$("inspector-content").addEventListener("focusin",e=>{if(e.target.matches("[data-prop]")){focusSnapshot=clone(doc);e.target.dataset.focusValue=e.target.value;}});
$("inspector-content").addEventListener("input",e=>{if(e.target.matches("[data-prop]"))propUpdate(e.target,false);});
$("inspector-content").addEventListener("change",e=>{if(e.target.matches("[data-prop]"))propUpdate(e.target,true);});
$("inspector-content").addEventListener("click",e=>{
 if(e.target.id==="change-image"){$("upload-input").click();return;}if(e.target.id==="goto-content"){switchPanel("fields");return;}
 const b=e.target.closest("[data-command]");if(b)command(b.dataset.command);
});
$("upload-input").addEventListener("change",async e=>{try{await uploadImage(e.target.files[0]);}catch(err){notify("Không xử lý được ảnh: "+err.message)}e.target.value="";});
$("music-choice").addEventListener("change",e=>{checkpoint();doc.music=e.target.value;scheduleSave();});
$("undo").addEventListener("click",undo);$("redo").addEventListener("click",redo);
$("zoom-out").addEventListener("click",()=>{zoom=Math.max(.2,zoom-.1);applyZoom();});
$("zoom-in").addEventListener("click",()=>{zoom=Math.min(1.5,zoom+.1);applyZoom();});
$("fit").addEventListener("click",fit);window.addEventListener("resize",fit);
$("grid-toggle").addEventListener("click",()=>{gridOn=!gridOn;renderCanvas();});
$("save-local").addEventListener("click",()=>{saveDraft();notify("Đã lưu nháp trên thiết bị");});
$("preview").addEventListener("click",preview);
$("export-webp").addEventListener("click",async()=>{try{notify("Đang tạo WebP 1440 × 2160…");await downloadPoster(activeSurface(),"image/webp");notify("Đã tải WebP 2×");}catch(e){notify("Xuất WebP thất bại: "+e.message);}});
$("export-png").addEventListener("click",async()=>{try{notify("Đang tạo PNG…");await downloadPoster(activeSurface(),"image/png");notify("Đã tải PNG 2×");}catch(e){notify("Xuất PNG thất bại: "+e.message);}});
$("publish").addEventListener("click",publish);
$("do-publish").addEventListener("click",sendPublish);
$("copy-published").addEventListener("click",()=>navigator.clipboard.writeText($("published-url").value).then(()=>notify("Đã sao chép link thiệp")));
document.addEventListener("keydown",e=>{
 const focused=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||"");
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();if(e.shiftKey)redo();else undo();return;}
 if(focused)return;
 if((e.key==="Delete"||e.key==="Backspace")&&findSelected()){e.preventDefault();del();}
 if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)){
  const b=findSelected();if(!b||b.locked)return;
  e.preventDefault();checkpoint();
  const amount=e.shiftKey?10:1;
  if(e.key==="ArrowLeft")b.x-=amount;
  if(e.key==="ArrowRight")b.x+=amount;
  if(e.key==="ArrowUp")b.y-=amount;
  if(e.key==="ArrowDown")b.y+=amount;
  renderCanvas();scheduleSave();
 }
});
boot();
