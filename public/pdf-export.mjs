import {allPages,pageSurface} from "./card-extras.mjs";
import {drawPoster} from "./editor-render.mjs";

// Independent PDF writer for raster invitation spreads.
// 120 × 180 mm; rendering at 2× of a 720×1080 canvas = 305 dpi.
const PT_W=340.15748,PT_H=510.23622;
const encoder=new TextEncoder();
const ascii=text=>encoder.encode(text);
function build(images){
 const chunks=[];let offset=0;const positions=[0];
 const add=data=>{chunks.push(data);offset+=data.byteLength;};
 const write=text=>add(ascii(text));
 const object=(id,writeBody)=>{positions[id]=offset;write(id+" 0 obj\n");writeBody();write("\nendobj\n");};
 write("%PDF-1.4\n%\xC2\xA5\xC2\xAF\xC2\xAB\xC2\xBB\n");
 const count=images.length;
 object(1,()=>write("<< /Type /Catalog /Pages 2 0 R >>"));
 object(2,()=>{
  const ids=images.map((_,i)=>3+i*3);
  write("<< /Type /Pages /Kids ["+ids.map(id=>id+" 0 R").join(" ")+"] /Count "+count+" >>");
 });
 for(let i=0;i<count;i++){
  const page=3+i*3,contents=page+1,image=page+2,jpeg=images[i];
  object(page,()=>write("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+PT_W+" "+PT_H+"] /Resources << /XObject << /Im0 "+image+" 0 R >> >> /Contents "+contents+" 0 R >>"));
  const draw="q "+PT_W+" 0 0 "+PT_H+" 0 0 cm /Im0 Do Q\n";
  object(contents,()=>{write("<< /Length "+ascii(draw).length+" >>\nstream\n");write(draw);write("endstream");});
  object(image,()=>{
   write("<< /Type /XObject /Subtype /Image /Width 1440 /Height 2160 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+jpeg.length+" >>\nstream\n");
   add(jpeg);write("\nendstream");
  });
 }
 const xref=offset;const total=2+images.length*3;
 write("xref\n0 "+(total+1)+"\n0000000000 65535 f \n");
 for(let i=1;i<=total;i++)write(String(positions[i]).padStart(10,"0")+" 00000 n \n");
 write("trailer\n<< /Size "+(total+1)+" /Root 1 0 R >>\nstartxref\n"+xref+"\n%%EOF\n");
 return new Blob(chunks,{type:"application/pdf"});
}
export async function pdfBlob(doc,{all=true,pageId="cover"}={}){
 const pages=all?allPages(doc):allPages(doc).filter(x=>x.id===pageId);
 if(!pages.length)throw Error("Không có trang để xuất PDF.");
 const images=[];
 for(const p of pages){
  const canvas=await drawPoster(pageSurface(doc,p.id),2);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.94));
  if(!blob)throw Error("Không thể tạo ảnh PDF từ trang "+p.title);
  images.push(new Uint8Array(await blob.arrayBuffer()));
 }
 return build(images);
}
export async function downloadPDF(doc,options={}){
 const blob=await pdfBlob(doc,options);
 const url=URL.createObjectURL(blob),link=document.createElement("a");
 link.href=url;link.download="hy-studio-"+doc.theme+(options.all===false?"-"+options.pageId:"-toan-bo")+".pdf";
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
