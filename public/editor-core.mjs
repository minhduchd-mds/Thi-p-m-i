// Hỷ Studio visual editor document and render/export primitives, ES module, no framework.
export const W=720,H=1080;
export const themes={
 red:{name:"Hồng Hỷ",description:"Đỏ son · Vàng kim",ink:"#fff4de",sub:"#f9dfcd",gold:"#f4c783",bg1:"#a82e3c",bg2:"#5b0c22",font:"'Noto Serif',serif"},
 jade:{name:"Ngọc Uyển",description:"Ngọc xanh · Champagne",ink:"#315249",sub:"#62756b",gold:"#bb9360",bg1:"#eef4e9",bg2:"#afcfc2",font:"'Playfair Display','Noto Serif',serif"},
 pink:{name:"Hoa Vân",description:"Hồng lụa · Hoa đào",ink:"#824b5b",sub:"#9d7681",gold:"#be8869",bg1:"#fff4e9",bg2:"#e4b6c4",font:"'Dancing Script','Noto Serif',serif"}
};
export const assets=[
 {id:"song-hy",name:"Song Hỷ",url:"/assets/ornaments/song-hy.svg"},
 {id:"carved-door",name:"Hoa văn gỗ",url:"/assets/ornaments/carved-door.svg"},
 {id:"gold-corner",name:"Khung góc",url:"/assets/ornaments/gold-corner.svg"},
 {id:"plum-branch",name:"Hoa đào",url:"/assets/ornaments/plum-branch.svg"},
 {id:"wood",name:"Gỗ WebP",url:"/assets/textures/wood-mahogany.webp"}
];
export const songs={
 "loi-hen-tram-nam":"Lời Hẹn Trăm Năm",
 "duyen-ngoc-phuong-dong":"Duyên Ngọc Phương Đông",
 "ngay-vui-chung-doi":"Ngày Vui Chung Đôi",
 "binh-minh-hanh-phuc":"Bình Minh Hạnh Phúc",
 "none":"Không nhạc"
};
export const fieldsDefault={bride:"Minh Anh",groom:"Hoàng Nam",date:"2027-06-20",time:"17:30",venue:"The Garden Wedding Hall",address:"Hà Nội, Việt Nam",guest:"Bạn thân mến",message:"Trân trọng kính mời bạn đến chung vui trong ngày hạnh phúc của chúng mình."};
const block=(id,type,x,y,w,h,extra={})=>Object.assign({id,type,x,y,w,h,rotation:0,z:10,opacity:1,locked:false,hidden:false,userAdded:false},extra);
const txt=(id,binding,x,y,w,h,size,extra={})=>block(id,"text",x,y,w,h,Object.assign({binding,text:"",fontSize:size,align:"center",weight:600,color:""},extra));
// A card consists of two separately editable surfaces. The inside receives its
// own default layout when migrating old one-sided cards; the cover is untouched.
export const faces={cover:"Bìa ngoài",inside:"Bên trong"};
export const insidePalette={
 red:{bg1:"#fff6e7",bg2:"#edd9bc",ink:"#743043",gold:"#ba8b52"},
 jade:{bg1:"#f6faf1",bg2:"#dcebe0",ink:"#315449",gold:"#a18457"},
 pink:{bg1:"#fff9f4",bg2:"#f5dfe0",ink:"#8a5263",gold:"#c39880"}
};
export function insidePreset(theme="red"){
 const color=insidePalette[theme]||insidePalette.red;
 const serif=(themes[theme]||themes.red).font;
 const base=[
  block("inside-frame","frame",38,35,644,1010,{z:1,opacity:.8}),
  txt("inside-title","",78,164,564,67,32,{text:"TRÂN TRỌNG KÍNH MỜI",letterSpacing:3,weight:600,color:color.ink,z:4}),
  txt("inside-guest","guest",88,268,544,85,43,{fontFamily:serif,color:color.ink,z:5}),
  txt("inside-message","message",100,387,520,142,23,{weight:400,color:color.ink,z:5}),
  txt("inside-date","date",110,586,500,57,29,{fontFamily:serif,color:color.ink,z:5}),
  txt("inside-time","time",125,662,470,53,24,{color:color.ink,z:5}),
  txt("inside-venue","venue",90,754,540,75,28,{color:color.ink,z:5}),
  txt("inside-address","address",100,842,520,72,19,{color:color.ink,weight:400,z:5}),
  txt("inside-footer","",90,958,540,40,18,{text:"Rất hân hạnh được đón tiếp",weight:400,color:color.ink,z:5})
 ];
 if(theme==="red"){
  base.splice(1,0,block("inside-seal","ornament",292,62,136,136,{asset:"song-hy",z:3}));
  base.push(block("inside-flower","ornament",-17,829,165,165,{asset:"gold-corner",rotation:-90,z:2}));
 }else if(theme==="jade"){
  base[1].x=98;base[1].y=191;base[1].align="left";
  base[2].align="left";base[2].x=98;
  base.push(block("inside-flower","ornament",502,58,207,207,{asset:"plum-branch",opacity:.7,z:2}));
 }else{
  base[1].fontFamily="'Dancing Script',cursive";
  base[1].fontSize=48;base[1].letterSpacing=0;
  base.push(block("inside-flower","ornament",473,744,236,236,{asset:"plum-branch",rotation:190,opacity:.65,z:2}));
  base.push(block("inside-corner","ornament",-32,35,202,202,{asset:"gold-corner",opacity:.53,z:2}));
 }
 return base;
}
export function surfaceDoc(doc,face="cover"){
 return {...doc,face,blocks:face==="inside"?doc.insideBlocks:doc.blocks};
}

export function createDoc(theme="red",existing={}){
 if(!themes[theme])theme="red";
 const f=Object.assign({},fieldsDefault,existing.fields||{});
 let blocks;
 if(theme==="red")blocks=[
  block("outer-frame","frame",33,31,654,1018,{z:1}),
  block("corner-one","ornament",-3,18,190,190,{asset:"gold-corner",z:2}),
  block("corner-two","ornament",527,16,190,190,{asset:"gold-corner",rotation:90,z:2}),
  block("seal","ornament",287,110,146,146,{asset:"song-hy",z:3}),
  txt("kicker","",80,303,560,46,21,{text:"THIỆP MỜI THÀNH HÔN",letterSpacing:4,z:4}),
  txt("bride","bride",84,371,552,97,55,{fontFamily:themes.red.font,z:5}),
  txt("and","",95,481,530,44,34,{text:"&",fontFamily:"'Dancing Script',cursive",z:5}),
  txt("groom","groom",84,536,552,96,55,{fontFamily:themes.red.font,z:5}),
  txt("date","date",90,673,540,66,27,{z:5}),
  txt("venue","venue",90,767,540,65,24,{z:5}),
  txt("message","message",96,865,528,124,18,{weight:400,z:5})
 ];else if(theme==="jade")blocks=[
  block("outer-frame","frame",42,35,638,1010,{z:1,opacity:.6}),
  block("corner-one","ornament",483,-10,244,244,{asset:"plum-branch",z:2}),
  txt("kicker","",77,127,520,58,18,{text:"A CELEBRATION OF LOVE",align:"left",letterSpacing:4,z:4}),
  txt("bride","bride",80,277,540,100,69,{align:"left",fontFamily:themes.jade.font,z:5}),
  txt("and","",80,385,540,60,35,{text:"and",align:"left",fontFamily:"'Dancing Script',cursive",z:5}),
  txt("groom","groom",80,465,540,108,69,{align:"left",fontFamily:themes.jade.font,z:5}),
  block("accent","shape",80,598,200,5,{fill:themes.jade.gold,z:5}),
  txt("date","date",80,671,550,60,26,{align:"left",z:5}),
  txt("venue","venue",80,760,550,70,24,{align:"left",z:5}),
  txt("message","message",80,862,515,130,18,{align:"left",weight:400,z:5})
 ];else blocks=[
  block("outer-frame","frame",49,55,622,968,{z:1,opacity:.62}),
  block("corner-one","ornament",-45,-15,330,330,{asset:"plum-branch",rotation:-12,z:2}),
  block("corner-two","ornament",447,736,320,320,{asset:"plum-branch",rotation:175,z:2}),
  txt("kicker","",134,244,500,56,29,{text:"We Are Getting Married",fontFamily:themes.pink.font,z:4}),
  txt("bride","bride",90,363,540,106,77,{fontFamily:themes.pink.font,z:5,weight:500}),
  txt("and","",90,475,540,60,43,{text:"&",fontFamily:themes.pink.font,z:5,weight:400}),
  txt("groom","groom",90,542,540,106,77,{fontFamily:themes.pink.font,z:5,weight:500}),
  txt("date","date",95,704,530,58,26,{z:5}),
  txt("venue","venue",100,782,520,60,24,{z:5}),
  txt("message","message",125,873,470,112,18,{weight:400,z:5})
 ];
 const preserved=(existing.blocks||[]).filter(x=>x.userAdded&&!blocks.some(b=>b.id===x.id));
 const freshInside=insidePreset(theme);
 const insideCustom=(existing.insideBlocks||[]).filter(x=>x.userAdded&&!freshInside.some(b=>b.id===x.id));
 return {schemaVersion:2,theme,layoutId:theme+"-poster",width:W,height:H,fields:f,music:existing.music||"loi-hen-tram-nam",blocks:blocks.concat(preserved),insideBlocks:freshInside.concat(insideCustom)};
}
export function migrate(raw){
 let d=raw&&raw.document?raw.document:raw;
 if(d&&d.schemaVersion===2&&Array.isArray(d.blocks))return sanitize(d);
 const legacy=d&&d.data?d.data:(d||{});
 return createDoc(legacy.theme||"red",{fields:Object.fromEntries(Object.keys(fieldsDefault).map(k=>[k,legacy[k]||fieldsDefault[k]])),music:legacy.music});
}
const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number.isFinite(+value)?+value:min));
export function safeSrc(src){
 const a=assets.find(a=>a.url===src);
 return a?src:(/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]{20,1100000}$/.test(src||"")?src:"");
}
export function sanitize(raw){
 if(!raw||!Array.isArray(raw.blocks)||raw.blocks.length>80||(raw.insideBlocks!==undefined&&(!Array.isArray(raw.insideBlocks)||raw.insideBlocks.length>80)))throw Error("Tài liệu thiệp không hợp lệ");
 const theme=themes[raw.theme]?raw.theme:"red";
 const fields={};
 for(const k of Object.keys(fieldsDefault))fields[k]=String(raw.fields?.[k]??fieldsDefault[k]).slice(0,300);
 const normalizeBlocks = values => {
 const ids=new Set(),blocks=[];
 for(const value of values){
  if(!value||!["text","image","ornament","frame","shape"].includes(value.type))continue;
  const id=String(value.id||"").slice(0,70);
  if(!/^[A-Za-z0-9_-]+$/.test(id)||ids.has(id))continue;
  ids.add(id);
  const b=block(id,value.type,clamp(value.x,-500,1150),clamp(value.y,-500,1600),clamp(value.w,20,900),clamp(value.h,20,1200),{
   rotation:clamp(value.rotation,-360,360),z:clamp(value.z,0,900),opacity:clamp(value.opacity,0,1),
   locked:!!value.locked,hidden:!!value.hidden,userAdded:!!value.userAdded
  });
  if(b.type==="text"){
   b.binding=Object.hasOwn(fieldsDefault,value.binding)?value.binding:"";
   b.text=String(value.text||"").slice(0,400);
   b.fontSize=clamp(value.fontSize,10,150);b.align=["left","center","right"].includes(value.align)?value.align:"center";
   b.weight=clamp(value.weight,300,900);b.letterSpacing=clamp(value.letterSpacing,0,15);
   b.fontFamily=String(value.fontFamily||"").slice(0,100);
   b.color=/^#[0-9a-fA-F]{6}$/.test(value.color||"")?value.color:"";
  }
  if(b.type==="ornament")b.asset=assets.some(a=>a.id===value.asset)?value.asset:"song-hy";
  if(b.type==="image"){b.src=safeSrc(value.src);b.fit=value.fit==="contain"?"contain":"cover";}
  if(b.type==="shape")b.fill=/^#[0-9a-fA-F]{6}$/.test(value.fill||"")?value.fill:themes[theme].gold;
  blocks.push(b);
 }
 return blocks;
 };
 const blocks=normalizeBlocks(raw.blocks);
 const insideBlocks=raw.insideBlocks===undefined?insidePreset(theme):normalizeBlocks(raw.insideBlocks);
 return {schemaVersion:2,theme,layoutId:theme+"-poster",width:W,height:H,fields,music:Object.hasOwn(songs,raw.music)?raw.music:"none",blocks,insideBlocks};
}
export const clone=x=>JSON.parse(JSON.stringify(x));
export const dateLabel=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||"")?d.slice(8)+"/"+d.slice(5,7)+"/"+d.slice(0,4):String(d||"");
export function blockText(b,doc){const v=b.binding?doc.fields[b.binding]:b.text;return b.binding==="date"?dateLabel(v):String(v||"");}
export function blockName(b){return b.type==="text"?(b.binding||b.text||"Văn bản").slice(0,30):b.type==="ornament"?(assets.find(a=>a.id===b.asset)?.name||"Hoạ tiết"):{"image":"Ảnh/WebP","frame":"Khung viền","shape":"Hình khối"}[b.type];}
export const assetUrl=id=>assets.find(a=>a.id===id)?.url||assets[0].url;
export function addBlock(kind,doc,x=250,y=410){
 const id="b"+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 const z=Math.min(890,Math.max(0,...doc.blocks.map(x=>x.z))+1);
 if(kind==="text")return block(id,"text",x,y,320,95,{text:"Lời chúc hạnh phúc",fontSize:34,weight:600,align:"center",z,userAdded:true});
 if(kind==="frame")return block(id,"frame",x,y,360,430,{z,userAdded:true});
 if(kind==="shape")return block(id,"shape",x,y,220,80,{z,fill:themes[doc.theme].gold,userAdded:true});
 if(kind==="image")return block(id,"image",x,y,325,250,{z,src:assetUrl("wood"),fit:"cover",userAdded:true});
 return block(id,"ornament",x,y,190,190,{z,asset:assets.some(a=>a.id===kind)?kind:"song-hy",userAdded:true});
}
