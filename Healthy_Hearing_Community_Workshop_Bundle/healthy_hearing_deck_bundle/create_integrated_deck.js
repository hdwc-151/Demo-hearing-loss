const pptxgen = require('pptxgenjs');
const path = require('path');
const fs = require('fs');
const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Healthy Hearing Project';
pptx.company = 'Healthy Hearing';
pptx.subject = 'Community presentation and workshop: hearing-loss simulation and empathy education';
pptx.title = 'Healthy Hearing — Product, Evidence, Roadmap & Workshop';
pptx.lang = 'vi-VN';
pptx.theme = { headFontFace: 'Arial', bodyFontFace: 'Arial', lang: 'vi-VN' };
pptx.defineSlideMaster({ title: 'LIGHT', background: { color: 'F7F8F5' }, objects: [] });
pptx.defineSlideMaster({ title: 'DARK', background: { color: '102A43' }, objects: [] });
const W=13.333, H=7.5;
const C={navy:'102A43',navy2:'173B57',ink:'1F3446',muted:'607387',teal:'149B98',teal2:'0B7779',mint:'DDF3EF',mint2:'BFE9E2',cream:'F7F8F5',white:'FFFFFF',gold:'F2C15D',goldp:'FFF0D1',coral:'D87361',coralp:'FBE7E3',bluep:'E5EFF7',line:'DCE5E8',slate:'40566B',grey:'A6B1BA',pale:'EFF4F4',green:'27866E',brown:'77574B',purple:'7A6BA8',purplep:'ECE9F6'};
const A='/mnt/data/healthy_hearing_assets';
const assets={owl:path.join(A,'owl_mascot.png'),speech:path.join(A,'speech_banana_schematic.png'),audiogram:path.join(A,'audiogram_schematic.png'),qr:path.join(A,'github_qr.png')};
function bg(s,color=C.cream){s.background={color};}
function rect(s,x,y,w,h,fill=C.white,lineColor='none',radius=true,opts={}){
 s.addShape(radius?pptx.ShapeType.roundRect:pptx.ShapeType.rect,{x,y,w,h,rectRadius:0.08,fill:{color:fill},line:lineColor==='none'?{color:fill,transparency:100}:{color:lineColor,width:0.8},...opts});
}
function line(s,x1,y1,x2,y2,color=C.line,width=1,dash='solid',opts={}){s.addShape(pptx.ShapeType.line,{x:x1,y:y1,w:x2-x1,h:y2-y1,line:{color,width,dashType:dash,...opts}});}
function circle(s,x,y,d,fill,lineColor=fill,width=1,opts={}){s.addShape(pptx.ShapeType.ellipse,{x,y,w:d,h:d,fill:{color:fill},line:{color:lineColor,width},...opts});}
function txt(s,text,x,y,w,h,opts={}){s.addText(text,{x,y,w,h,fontFace:'Arial',fontSize:12,color:C.ink,margin:0,breakLine:false,valign:'mid',fit:'shrink',paraSpaceAfterPt:0,...opts});}
function pill(s,label,x,y,w,fill=C.mint,color=C.teal2,opts={}){rect(s,x,y,w,0.27,fill,'none',true);txt(s,label,x+0.07,y+0.015,w-0.14,0.22,{fontSize:8.0,bold:true,color,align:'center',charSpacing:0.4,...opts});}
function card(s,x,y,w,h,fill=C.white,border=C.line){rect(s,x,y,w,h,fill,border,true);}
function bullet(s,text,x,y,w,{dot=C.teal,size=12.2,color=C.ink,h=0.44,bold=false}={}){circle(s,x,y+0.10,0.075,dot,dot,0.4);txt(s,text,x+0.19,y,w-0.19,h,{fontSize:size,color,bold,valign:'top'});}
function wave(s,x,y,w,color=C.teal,alpha=0){const hs=[.22,.36,.56,.30,.48,.72,.40,.62,.27,.46,.68,.32,.52,.22,.40,.60,.29,.48,.20];const gap=w/hs.length;hs.forEach((h,i)=>rect(s,x+i*gap,y+(0.75-h)/2,gap*0.40,h,color,'none',true,{fill:{color,transparency:alpha}}));}
function header(s,section,title,subtitle='',opts={}){
 pill(s,section.toUpperCase(),0.55,0.28,Math.max(1.1,section.length*0.073+0.35),C.mint,C.teal2);
 txt(s,title,0.58,0.67,12.05,0.48,{fontSize:25.2,bold:true,color:C.navy,valign:'mid'});
 if(subtitle)txt(s,subtitle,0.60,1.20,12.0,0.30,{fontSize:10.9,color:C.muted,valign:'mid'});
}
function footer(s,n,phase='DISCOVER',source=''){
 line(s,0.55,7.08,12.78,7.08,C.line,0.7);
 txt(s,'HEALTHY HEARING  /  EDUCATION, NOT DIAGNOSIS',0.58,7.15,4.15,0.17,{fontSize:7.0,color:'778796',bold:true,charSpacing:0.25});
 txt(s,`NORTH STAR · ${phase}`,4.75,7.15,3.05,0.17,{fontSize:7.0,color:C.teal2,bold:true,align:'center'});
 if(source)txt(s,source,7.72,7.15,4.5,0.17,{fontSize:6.4,color:'718096',align:'right'});
 txt(s,String(n).padStart(2,'0'),12.48,7.14,0.22,0.18,{fontSize:8,color:C.teal2,bold:true,align:'right'});
}
function notes(s,content){s.addNotes(content);}
function boxTitle(s,label,title,x,y,w,accent=C.teal){pill(s,label.toUpperCase(),x,y,w,accent===C.gold?C.goldp:(accent===C.coral?C.coralp:C.mint),accent===C.gold?'8B5D14':(accent===C.coral?'A84D3F':C.teal2));txt(s,title,x,y+0.34,w,0.46,{fontSize:16.5,bold:true,color:C.navy});}
function drawArrow(s,x1,y1,x2,y2,color=C.teal,width=1.6){s.addShape(pptx.ShapeType.line,{x:x1,y:y1,w:x2-x1,h:y2-y1,line:{color,width,beginArrowType:'none',endArrowType:'triangle'}});}
function addImageFit(s,p,x,y,w,h){if(fs.existsSync(p))s.addImage({path:p,x,y,w,h,transparency:0});}
function noteSources(s,urls,extra=''){notes(s,`${extra}\n\nNguồn tham khảo:\n${urls.join('\n')}\n\nKiểm tra lại nguồn/phiên bản và xác minh claim trước khi nộp.`);}

// 1 — Cover
{
 const s=pptx.addSlide('DARK');
 for(let i=0;i<5;i++)s.addShape(pptx.ShapeType.arc,{x:8.85-i*.18,y:.72-i*.15,w:3.3+i*.36,h:3.3+i*.36,adjustPoint:.25,line:{color:C.teal,width:1,transparency:78+i*2},fill:{color:C.navy,transparency:100}});
 pill(s,'COMMUNITY TALK  /  HANDS-ON WORKSHOP',.72,.62,3.05,C.teal,C.white);
 txt(s,'Healthy\nHearing',.75,1.26,6.35,1.65,{fontSize:46,bold:true,color:C.white,breakLine:false});
 txt(s,'Từ mô phỏng thính giác\nđến giáo dục thấu cảm',.80,3.12,6.3,.82,{fontSize:20,color:'DCEAF0'});
 line(s,.81,4.20,2.05,4.20,C.gold,3);
 txt(s,'“Nghe thấy chưa chắc đã hiểu.”',.80,4.47,6.2,.47,{fontSize:22,bold:true,color:C.gold,italic:true});
 txt(s,'Một dự án giáo dục tương tác — không phải công cụ chẩn đoán y khoa.',.82,5.15,6.1,.58,{fontSize:12.2,color:'DCEAF0'});
 addImageFit(s,assets.owl,7.70,.95,4.30,4.30);
 rect(s,.80,6.45,11.75,.43,C.navy2,'31536B',true);
 txt(s,'EVIDENCE BEFORE CLAIMS  •  EDUCATION, NOT DIAGNOSIS',1.02,6.56,11.3,.19,{fontSize:9,bold:true,color:'D9ECEF',align:'center',charSpacing:.7});
 txt(s,'01',12.48,7.15,.25,.18,{fontSize:8,color:C.gold,bold:true,align:'right'});
 notes(s,'Mở đầu trong 20–30 giây. Dùng câu “Nghe thấy chưa chắc đã hiểu” làm câu hỏi dẫn dắt; tránh claim kiểu “mất 70% phụ âm” vì chưa có nguồn đủ rõ. Healthy Hearing được định vị là mô phỏng giáo dục, không phải công cụ chẩn đoán.');
}
// 2 — Hook
{
 const s=pptx.addSlide('LIGHT');header(s,'01 / HOOK','Nghe được âm thanh ≠ hiểu được lời nói','Dẫn dắt bằng một tình huống quen thuộc thay vì bắt đầu bằng thuật ngữ.');
 card(s,.62,1.72,7.18,4.88,C.navy,C.navy);
 txt(s,'“',.98,1.90,.55,.70,{fontSize:58,bold:true,color:C.gold});
 txt(s,'Khi ông bà hỏi lại\ncâu nói ở nơi đông người,\nđiều gì thực sự đang xảy ra?',1.25,2.35,5.95,1.65,{fontSize:27.5,bold:true,color:C.white});
 txt(s,'Tình huống gợi mở — không phải chẩn đoán',1.26,4.35,5.75,.27,{fontSize:11,color:'C5DCE4'});wave(s,1.25,5.15,5.75,C.teal,8);
 card(s,8.10,1.72,4.60,4.88,C.white,C.line);pill(s,'HOOK',8.45,2.08,.78,C.goldp,'8B5D14');
 txt(s,'Âm thanh vẫn có thể hiện diện, trong khi khả năng hiểu lời nói bị suy giảm.',8.45,2.57,3.75,1.20,{fontSize:18,bold:true,color:C.navy,valign:'top'});
 line(s,8.45,4.03,12.25,4.03,C.line,1);bullet(s,'Demo trả lời: khác biệt nằm ở đâu?',8.48,4.30,3.70,{size:11.5});bullet(s,'Kết nối trải nghiệm với cuộc trò chuyện gia đình.',8.48,4.98,3.70,{size:11.3,h:.56});
 txt(s,'Không dùng con số “70% phụ âm” khi chưa xác minh.',8.48,5.82,3.72,.43,{fontSize:9.3,bold:true,color:C.coral});footer(s,2,'DISCOVER','NIDCD');
 noteSources(s,['https://www.nidcd.nih.gov/health/age-related-hearing-loss','https://www.nidcd.nih.gov/health/how-does-noise-damage-your-hearing'],'Câu hook là tình huống gợi mở, không phải trích dẫn nghiên cứu hay mô tả lâm sàng cho mọi người.');
}
// 3 — North Star anchor: versions + decision tree + roadmap
{
 const s=pptx.addSlide('LIGHT');header(s,'NORTH STAR / ĐỊNH HƯỚNG','Một bản đồ thống nhất: câu chuyện → bằng chứng → quyết định','Ba tài liệu bổ sung nhau. Tất cả slide sau phải bám theo các cổng quyết định bên dưới.');
 const y=1.60, ch=0.94, gap=.15, cw=3.98;
 const versions=[
  {x:.60,c:C.bluep,label:'BẢN A · CÂU CHUYỆN',title:'Vision + empathy',body:'Hook gia đình · định vị · kênh tiếp cận'},
  {x:.60+cw+gap,c:C.mint,label:'BẢN B · SẢN PHẨM & DEMO',title:'Evidence + aha moment',body:'WHO/NIDCD · 3 module · demo 60 giây'},
  {x:.60+2*(cw+gap),c:C.goldp,label:'PLAYBOOK · VẬN HÀNH',title:'Gates + roadmap',body:'Research · audit · QA · cơ hội'}
 ];
 versions.forEach(v=>{card(s,v.x,y,cw,ch,C.white,C.line);rect(s,v.x,y,.075,ch,v.c,'none',false);pill(s,v.label,v.x+.18,y+.10,Math.min(1.78,v.label.length*.052),v.c===C.goldp?C.goldp:v.c,v.c===C.goldp?'8B5D14':C.teal2);txt(s,v.title,v.x+.18,y+.39,cw-.35,.23,{fontSize:13.2,bold:true,color:C.navy});txt(s,v.body,v.x+.18,y+.66,cw-.35,.20,{fontSize:8.8,color:C.muted});});
 txt(s,'DECISION TREE  /  Nếu “KHÔNG”, quay về bước sửa tương ứng — không nhảy sang scale.',.62,2.76,12,.26,{fontSize:10.3,bold:true,color:C.navy});
 const gy=3.18, gh=1.46, gw=2.83, gx=[.60,3.72,6.84,9.96];
 const gates=[
  {n:'GATE 01',q:'Pain point có bằng chứng?',yes:'YES → chốt vấn đề',no:'NO → research tiếp',c:C.bluep},
  {n:'GATE 02',q:'MVP tạo “aha moment”?',yes:'YES → kiểm tra kỹ thuật',no:'NO → sửa trải nghiệm',c:C.mint},
  {n:'GATE 03',q:'Core + claim an toàn?',yes:'YES → pilot có kiểm soát',no:'NO → fix / thu hẹp claim',c:C.goldp},
  {n:'GATE 04',q:'Pilot cho tín hiệu tốt?',yes:'YES → chia sẻ / mở rộng',no:'NO → iterate hoặc pivot',c:C.purplep}
 ];
 gates.forEach((g,i)=>{
  card(s,gx[i],gy,gw,gh,C.white,C.line);pill(s,g.n,gx[i]+.16,gy+.12,.86,g.c,g.c===C.goldp?'8B5D14':(g.c===C.purplep?C.purple:C.teal2));txt(s,g.q,gx[i]+.16,gy+.48,gw-.32,.43,{fontSize:12.3,bold:true,color:C.navy,align:'center'});
  rect(s,gx[i]+.12,gy+1.02,gw-.24,.25,'E9F6F2','none',true);txt(s,g.yes,gx[i]+.18,gy+1.055,gw-.36,.17,{fontSize:8.8,bold:true,color:C.teal2,align:'center'});
  txt(s,g.no,gx[i]+.12,gy+1.30,gw-.24,.14,{fontSize:8.3,color:C.coral,bold:true,align:'center'});
  if(i<3)drawArrow(s,gx[i]+gw+.025,gy+.74,gx[i+1]-.06,gy+.74,C.teal,1.5);
 });
 // roadmap strip
 txt(s,'ROADMAP CHUNG — Mốc kế hoạch, không phải kết quả đã đạt',.62,4.96,12,.25,{fontSize:10.2,bold:true,color:C.navy});
 const ry=5.29,rw=2.93,rg=.13;
 const rms=[
  {n:'NOW · 0–30 NGÀY',t:'Audit + UX validation',d:'Repo, claims, user problem, MVP',c:C.bluep},
  {n:'NEXT · 31–60 NGÀY',t:'Hardening + expert review',d:'DSP, phoneme, accuracy limits',c:C.mint},
  {n:'PILOT · 61–90 NGÀY',t:'Controlled real-world test',d:'Gia đình / giáo dục / điều dưỡng',c:C.goldp},
  {n:'AFTER EVIDENCE',t:'Share + partnership',d:'Chỉ scale khi có tín hiệu đủ tốt',c:C.purplep}
 ];
 rms.forEach((r,i)=>{const x=.60+i*(rw+rg);card(s,x,ry,rw,.96,C.white,C.line);rect(s,x,ry,.06,.96,r.c,'none',false);txt(s,r.n,x+.15,ry+.09,rw-.28,.17,{fontSize:7.8,bold:true,color:C.teal2});txt(s,r.t,x+.15,ry+.32,rw-.28,.23,{fontSize:11.0,bold:true,color:C.navy});txt(s,r.d,x+.15,ry+.61,rw-.28,.20,{fontSize:8.2,color:C.muted});});
 footer(s,3,'ALL PHASES','Synthesis: 13-slide story deck + 15-slide evidence deck + Master Blueprint');
 notes(s,'Đây là slide định hướng cho toàn bộ bài. Bản A đóng góp story, vision/mission và go-to-market. Bản B đóng góp nguồn bằng chứng, mô tả 3 module, demo 60 giây và nguyên tắc không overclaim. Master Blueprint đóng góp stage-gates, 12-trục lọc ý tưởng, release audit và danh mục artifact. Quy tắc quyết định: không có evidence thì nghiên cứu; không tạo được giá trị thì sửa; chưa an toàn/đúng thì giới hạn claim và sửa core; chỉ scale khi pilot có tín hiệu. Roadmap là đề xuất, chưa phải thành tích.');
}
// 4 pain point
{
 const s=pptx.addSlide('LIGHT');header(s,'01 / DISCOVER','Một vấn đề — hai góc nhìn — một cuộc trò chuyện bị gián đoạn','Đặt con người và hoàn cảnh trước công nghệ.');
 card(s,.62,1.78,5.92,4.78,C.white,C.line);card(s,6.80,1.78,5.92,4.78,C.mint,'B5DFD9');
 pill(s,'NGƯỜI NGHE',.96,2.08,1.24,C.bluep,C.navy2);txt(s,'“Tôi nghe có người nói,\nnhưng khó bắt trọn câu.”',.96,2.54,5.0,.80,{fontSize:20,bold:true,color:C.navy});
 wave(s,1.00,3.54,4.95,C.coral,18);bullet(s,'Khó theo dõi hội thoại khi có tiếng ồn nền.',1.00,4.37,5.0,{size:12});bullet(s,'Có thể mệt mỏi hoặc giảm tham gia trò chuyện.',1.00,5.00,5.0,{size:11.7,h:.52});
 pill(s,'GIA ĐÌNH',7.14,2.08,1.12,C.white,C.teal2);txt(s,'“Sao lúc nghe được,\nlúc lại không nghe?”',7.14,2.54,5.0,.80,{fontSize:20,bold:true,color:C.navy});rect(s,7.14,3.58,4.95,.50,C.white,'none',true);txt(s,'Nói rõ hơn ≠ hét lớn hơn',7.32,3.70,4.6,.23,{fontSize:13.5,bold:true,color:C.teal2,align:'center'});bullet(s,'Khó khăn nghe có thể bị hiểu nhầm là thiếu tập trung.',7.14,4.37,5.0,{size:11.8});bullet(s,'Đối diện, nói rõ và giảm ồn nền; không hét.',7.14,5.00,5.0,{size:11.7,h:.52});
 txt(s,'WORKSHOP PROMPT: “Lần gần nhất một cuộc trò chuyện bị gián đoạn vì tiếng ồn là khi nào?”',.84,6.17,11.8,.28,{fontSize:11,bold:true,color:C.navy,align:'center'});footer(s,4,'DISCOVER','NIDCD');
 noteSources(s,['https://www.nidcd.nih.gov/health/age-related-hearing-loss'],'Các ảnh hưởng cảm xúc nên diễn đạt là “có thể” xảy ra; tránh khẳng định mọi người có suy giảm thính lực đều có cùng trải nghiệm.');
}
// 5 global evidence
{
 const s=pptx.addSlide('LIGHT');header(s,'02 / EVIDENCE','Gánh nặng toàn cầu khiến giáo dục thính lực đáng được chú ý','Giữ đúng định nghĩa trong nguồn: hearing loss nói chung khác disabling hearing loss.');
 const items=[
  {n:'~2,5 tỷ',d:'người có thể sống chung với một mức độ suy giảm thính lực vào năm 2050',c:C.navy},
  {n:'>700 triệu',d:'người có thể cần phục hồi chức năng nghe vào năm 2050',c:C.teal2},
  {n:'~US$1 nghìn tỷ',d:'chi phí toàn cầu hàng năm do suy giảm thính lực không được xử lý',c:C.coral},
  {n:'>25% người >60',d:'bị disabling hearing loss theo WHO; không đồng nghĩa với mọi mức hearing loss',c:C.purple}
 ];
 items.forEach((a,i)=>{const x=.62+(i%2)*6.16,y=1.82+Math.floor(i/2)*1.92;card(s,x,y,5.88,1.60,C.white,C.line);rect(s,x,y,.08,1.60,a.c,'none',false);txt(s,a.n,x+.28,y+.25,5.2,.45,{fontSize:i===2?25:28,bold:true,color:a.c});txt(s,a.d,x+.28,y+.86,5.14,.48,{fontSize:11.2,color:C.ink,valign:'top'});});
 rect(s,.65,5.90,12.05,.55,C.goldp,'none',true);txt(s,'Các con số là bối cảnh toàn cầu — không chứng minh riêng hiệu quả của Healthy Hearing.',.88,6.06,11.58,.23,{fontSize:10.7,bold:true,color:'805914',align:'center'});footer(s,5,'EVIDENCE','WHO Fact Sheet · 03 Mar 2026');
 noteSources(s,['https://www.who.int/en/news-room/fact-sheets/detail/deafness-and-hearing-loss','https://www.who.int/health-topics/hearing-loss'],'WHO Fact Sheet ngày 03/03/2026: gần 2,5 tỷ có một mức độ hearing loss vào 2050; >700 triệu cần hearing rehabilitation; chi phí gần US$1 trillion mỗi năm. Fact Sheet mô tả >25% người trên 60 bị disabling hearing loss (định nghĩa trong trang là >35 dB ở tai nghe tốt hơn). Không trộn với khoảng 30% người >60 có hearing loss nói chung trên trang WHO topic.');
}
// 6 speech banana
{
 const s=pptx.addSlide('LIGHT');header(s,'02 / SCIENCE','Speech Banana giúp hình dung vùng tần số của lời nói','Sơ đồ giáo dục để giải thích — không phải kết quả đo hoặc dự đoán cá nhân.');
 card(s,.62,1.68,8.05,4.95,C.white,C.line);addImageFit(s,assets.speech,.92,1.95,7.45,4.30);
 card(s,8.95,1.68,3.75,4.95,C.navy,C.navy);txt(s,'CÁCH ĐỌC',9.28,2.03,3.1,.30,{fontSize:11,bold:true,color:C.gold,charSpacing:.7});
 const steps=[['01','TẦN SỐ','Thấp → cao theo trục ngang.'],['02','MỨC NGHE','Tham khảo cách đọc dB HL trên sơ đồ.'],['03','ÂM LỜI NÓI','Một số phụ âm có thành phần tần số cao hơn nguyên âm.']];
 steps.forEach((p,i)=>{const y=2.56+i*1.10;circle(s,9.30,y,.40,[C.teal,C.gold,C.coral][i],[C.teal,C.gold,C.coral][i],1);txt(s,p[0],9.30,y+.11,.4,.16,{fontSize:9,bold:true,color:C.white,align:'center'});txt(s,p[1],9.88,y+.01,2.35,.22,{fontSize:9,bold:true,color:C.white});txt(s,p[2],9.88,y+.28,2.32,.55,{fontSize:10.1,color:'DCEAF0',valign:'top'});});
 txt(s,'Không dùng claim “80% nghĩa của từ” khi chưa có nguồn phù hợp.',9.28,5.95,3.08,.40,{fontSize:8.7,bold:true,color:C.gold});footer(s,6,'EVIDENCE','NCBI Bookshelf · NIDCD');
 noteSources(s,['https://www.ncbi.nlm.nih.gov/books/NBK613286/','https://www.nidcd.nih.gov/health/how-does-noise-damage-your-hearing'],'NCBI Speech Audiometry mô tả nguyên âm thường ở tần số thấp hơn (khoảng 250–2,000 Hz), phụ âm có thành phần cao hơn (khoảng 2,000–8,000 Hz), nhưng đặc điểm phụ thuộc âm cụ thể và điều kiện nói. Hình minh họa do nhóm tạo lại; không dùng như audiogram lâm sàng.');
}
// 7 Vision mission positioning
{
 const s=pptx.addSlide('LIGHT');header(s,'01 / STRATEGY','Mục tiêu là thấu cảm, không phải chẩn đoán','Định vị rõ giúp mọi tính năng và mọi tuyên bố cùng đi một hướng.');
 const cells=[
  {x:.65,y:1.86,w:5.85,h:1.48,label:'VISION · TẦM NHÌN',title:'Giảm rào cản thấu cảm giữa các thế hệ',body:'Mong muốn tạo điều kiện để gia đình hiểu hơn về khác biệt trong trải nghiệm nghe.',c:C.bluep},
  {x:6.82,y:1.86,w:5.85,h:1.48,label:'MISSION · SỨ MỆNH',title:'Trực quan hóa trải nghiệm nghe',body:'Kết hợp âm thanh, văn bản và biểu đồ để người học khám phá vấn đề.',c:C.mint},
  {x:.65,y:3.62,w:5.85,h:1.48,label:'POSITIONING · ĐỊNH VỊ',title:'Công cụ mô phỏng giáo dục cộng đồng',body:'Dành cho học tập, workshop và trò chuyện về giao tiếp — không thay thế bác sĩ.',c:C.goldp},
  {x:6.82,y:3.62,w:5.85,h:1.48,label:'NON-CLAIMS · KHÔNG TUYÊN BỐ',title:'Không chẩn đoán hoặc đo thính lực lâm sàng',body:'Cần hiệu chuẩn và thẩm định chuyên môn trước mọi tuyên bố về độ trung thực y khoa.',c:C.coralp}
 ];
 cells.forEach(k=>{card(s,k.x,k.y,k.w,k.h,C.white,C.line);rect(s,k.x,k.y,.08,k.h,k.c,'none',false);pill(s,k.label,k.x+.23,k.y+.16,Math.min(2.0,k.label.length*.065),k.c,k.c===C.goldp?'8B5D14':(k.c===C.coralp?'A84D3F':C.teal2));txt(s,k.title,k.x+.23,k.y+.54,k.w-.46,.37,{fontSize:15.0,bold:true,color:C.navy});txt(s,k.body,k.x+.23,k.y+1.00,k.w-.46,.32,{fontSize:10.2,color:C.muted,valign:'top'});});
 rect(s,.67,5.48,12.0,.73,C.navy,'none',true);txt(s,'“Một trải nghiệm học tập có thể mở ra cuộc trò chuyện — nhưng phải trung thực về giới hạn.”',.95,5.69,11.45,.30,{fontSize:15,bold:true,color:C.white,align:'center'});footer(s,7,'POSITION');
 notes(s,'Vision/mission/positioning được hợp nhất từ deck Câu chuyện và Master Blueprint. Các câu này là định hướng chiến lược, chưa phải tuyên bố hiệu quả đã được xác thực.');
}
// 8 product logic / user journey
{
 const s=pptx.addSlide('LIGHT');header(s,'03 / DESIGN','Healthy Hearing nối dữ liệu với một trải nghiệm có thể khám phá','Giá trị trung tâm cần kiểm chứng: người học có hiểu vấn đề tốt hơn không?');
 const items=[
  {n:'01',t:'QUAN SÁT',d:'Xem các ngưỡng nghe trên audiogram.',c:C.bluep,ico:'chart'},
  {n:'02',t:'TRẢI NGHIỆM',d:'Nghe kịch bản âm thanh đã xử lý.',c:C.mint,ico:'sound'},
  {n:'03',t:'ĐỐI CHIẾU',d:'Quan sát chữ và biểu tượng thay đổi.',c:C.goldp,ico:'bulb'},
  {n:'04',t:'THẢO LUẬN',d:'Liên hệ với giao tiếp đời thường.',c:C.coralp,ico:'group'}
 ];
 items.forEach((a,i)=>{const x=.62+i*3.12;card(s,x,2.00,2.88,2.48,C.white,C.line);circle(s,x+.20,2.22,.56,a.c,a.c,1);txt(s,a.n,x+.20,2.40,.56,.16,{fontSize:10,bold:true,color:C.navy,align:'center'});txt(s,a.t,x+.20,3.02,2.45,.25,{fontSize:10,bold:true,color:C.teal2,charSpacing:.5});txt(s,a.d,x+.20,3.45,2.45,.65,{fontSize:11.0,color:C.ink,valign:'top'});if(i<3)drawArrow(s,x+2.88,3.12,x+3.08,3.12,C.teal,1.5);});
 card(s,.68,4.95,11.95,1.16,C.mint,'B5DFD9');pill(s,'UX HYPOTHESIS',.96,5.18,1.42,C.teal,C.white);txt(s,'Trải nghiệm nghe–nhìn đồng bộ có giúp người dùng hiểu và ghi nhớ hơn một biểu đồ tĩnh?',2.60,5.15,9.48,.32,{fontSize:14,bold:true,color:C.navy,align:'center'});txt(s,'Đo bằng câu hỏi trước/sau, khả năng nhớ lại và phản hồi định tính — chưa xem đây là kết quả đã có.',1.02,5.65,11.22,.22,{fontSize:9.5,color:C.muted,align:'center'});footer(s,8,'DESIGN');
 notes(s,'Logic này được tổng hợp từ cả hai deck. Giả thuyết UX cần kiểm chứng thực nghiệm. Có thể dùng pre/post understanding, recall và phản hồi định tính; không tuyên bố tác động nếu chưa thu thập dữ liệu.');
}
// 9 product pillars
{
 const s=pptx.addSlide('LIGHT');header(s,'03 / PRODUCT','Ba module — một hành trình khám phá','Hãy demo đúng khả năng của build hiện tại; không để tên công nghệ thay bằng chứng.');
 const mods=[
  {x:.62,label:'01 · HEAR',title:'Simulator',sub:'Mô phỏng đa giác quan',desc:'Chọn kịch bản; so sánh âm thanh và biến đổi văn bản.',c:C.mint,icon:'sound',status:'ĐỐI CHIẾU DEMO'},
  {x:4.75,label:'02 · SEE',title:'Interactive Audiogram',sub:'Đồ thị tương tác',desc:'Kéo ngưỡng nghe; quan sát đường cong và trạng thái sound item.',c:C.bluep,icon:'chart',status:'ĐỐI CHIẾU DEMO'},
  {x:8.88,label:'03 · ASK',title:'Dr. Bunny Q&A',sub:'Hỏi đáp / giải thích',desc:'Tìm hiểu thính lực và các cách giao tiếp thân thiện hơn.',c:C.goldp,icon:'chat',status:'XÁC MINH RETRIEVAL'}
 ];
 mods.forEach(m=>{card(s,m.x,1.92,3.82,3.95,C.white,C.line);circle(s,m.x+.28,2.20,.72,m.c,m.c,1);txt(s,m.label,m.x+1.20,2.24,2.25,.22,{fontSize:9,bold:true,color:C.teal2,charSpacing:.5});txt(s,m.title,m.x+.28,3.10,3.25,.38,{fontSize:18,bold:true,color:C.navy});txt(s,m.sub,m.x+.28,3.56,3.20,.28,{fontSize:10.3,bold:true,color:C.teal2});txt(s,m.desc,m.x+.28,4.05,3.22,.82,{fontSize:11.1,color:C.ink,valign:'top'});rect(s,m.x+.28,5.20,3.15,.35,m.c,'none',true);txt(s,m.status,m.x+.39,5.28,2.92,.18,{fontSize:8,bold:true,color:C.navy,align:'center'});});
 txt(s,'STATUS RULE: “đã có code” ≠ “đã chạy” ≠ “đã được thẩm định chuyên môn”.',.78,6.18,11.78,.24,{fontSize:11.1,bold:true,color:C.coral,align:'center'});footer(s,9,'BUILD');
 notes(s,'Three module structure is present in project materials. Before presentation, verify all three modules on the target commit. Q&A: distinguish hardcoded/fallback from genuine retrieval.');
}
// 10 simulator before/after
{
 const s=pptx.addSlide('LIGHT');header(s,'03 / SIMULATOR','Cùng một câu nói — nhiều cách trình bày để so sánh','Các đoạn chữ dưới đây là minh họa UI, không đại diện cho mọi kiểu suy giảm thính lực.');
 const ex=[
  {x:.62,bg:C.mint,lab:'NORMAL',title:'Văn bản nguyên vẹn',sample:'Bà ơi, cuối tuần mình ăn cơm cùng nhau nhé?',caption:'Âm thanh gốc / baseline'},
  {x:4.75,bg:C.goldp,lab:'MILD',title:'Một số âm bị giảm nổi bật',sample:'Bà ơi, cuố… tuầ… mình ăn cơm cùng nhau nhé?',caption:'Minh họa suy giảm nhẹ'},
  {x:8.88,bg:C.coralp,lab:'MODERATE',title:'Mức biến đổi hiển thị tăng',sample:'Bà ơi, … tuầ… … ăn … cùng … nhé?',caption:'Minh họa suy giảm mạnh hơn'}
 ];
 ex.forEach(a=>{card(s,a.x,1.92,3.82,3.85,C.white,C.line);pill(s,a.lab,a.x+.25,2.18,.88,a.bg,a.lab==='MODERATE'?'A84D3F':C.teal2);txt(s,a.title,a.x+.25,2.65,3.25,.50,{fontSize:14,bold:true,color:C.navy});rect(s,a.x+.25,3.42,3.25,1.05,a.bg,'none',true);txt(s,a.sample,a.x+.42,3.60,2.90,.68,{fontSize:13,bold:true,color:C.navy,valign:'mid'});txt(s,a.caption,a.x+.25,4.80,3.25,.25,{fontSize:9.3,color:C.muted});wave(s,a.x+.28,5.15,3.18,a.lab==='NORMAL'?C.teal:(a.lab==='MILD'?C.gold:C.coral),12);});
 rect(s,.68,6.03,12.0,.44,C.navy,'none',true);txt(s,'Độ trung thực của mô phỏng cần được đánh giá riêng — không suy ra từ hiệu ứng UI.',.93,6.15,11.50,.18,{fontSize:10,bold:true,color:C.white,align:'center'});footer(s,10,'BUILD');
 notes(s,'Mô phỏng rụng/mờ chữ là một biểu diễn nhận thức từ vựng, không phải mô hình sinh lý thính giác hoàn chỉnh. Chỉ diễn các thao tác và kết quả đúng với build đã kiểm tra. Cần listening test và ý kiến chuyên gia trước khi khẳng định độ trung thực.');
}
// 11 audiogram interaction
{
 const s=pptx.addSlide('LIGHT');header(s,'03 / AUDIOGRAM','Một thay đổi ngưỡng — kiểm tra phản hồi ở đâu?','Mockup giải thích cơ chế tương tác; không phải dữ liệu đo của người dùng.');
 card(s,.62,1.70,8.30,4.92,C.white,C.line);addImageFit(s,assets.audiogram,.93,1.95,7.70,4.35);
 card(s,9.18,1.70,3.52,4.92,C.navy,C.navy);pill(s,'AHA MOMENT',9.48,2.02,1.33,C.gold,C.navy);
 txt(s,'Kéo một điểm.\nQuan sát điều đổi khác.',9.48,2.55,2.84,.92,{fontSize:20,bold:true,color:C.white});
 const bs=[['1','Điều chỉnh ngưỡng tại một tần số.'],['2','Kiểm tra đường cong và icon.'],['3','Xác minh masking theo quy tắc.']];bs.forEach((b,i)=>{const y=3.82+i*.70;circle(s,9.48,y,.34,[C.teal,C.gold,C.coral][i],[C.teal,C.gold,C.coral][i],1);txt(s,b[0],9.48,y+.09,.34,.15,{fontSize:9,bold:true,color:C.white,align:'center'});txt(s,b[1],9.95,y-.01,2.30,.44,{fontSize:10,color:'DCEAF0',valign:'mid'});});
 txt(s,'Không thay thế đo thính lực lâm sàng.',9.48,6.02,2.72,.30,{fontSize:9.5,bold:true,color:C.gold});footer(s,11,'BUILD','Sơ đồ minh họa');
 notes(s,'Demo thật nên kéo điểm và xác nhận đồng thời đường cong, masking và phản hồi icon. Không gắn SII (%) trừ khi build thật sự tính chỉ số này bằng thuật toán rõ ràng.');
}
// 12 Q&A
{
 const s=pptx.addSlide('LIGHT');header(s,'03 / Q&A','Hỏi đáp nên dẫn đến hành động giao tiếp an toàn hơn','Đây là ví dụ lời khuyên dựa trên nguồn NIH/NIDCD, không phải output thực tế của app.');
 card(s,.62,1.80,7.28,4.62,C.white,C.line);pill(s,'MINH HỌA',.94,2.08,1.00,C.goldp,'8B5D14');txt(s,'Dr. Bunny · Hỏi đáp',.95,2.54,5.8,.30,{fontSize:14,bold:true,color:C.navy});rect(s,.95,3.00,6.42,.54,C.bluep,'none',true);txt(s,'Vì sao ông bà khó nghe khi ở nhà hàng đông người?',1.13,3.15,6.02,.24,{fontSize:11.3,bold:true,color:C.navy});rect(s,1.33,3.83,5.98,1.24,C.mint,'none',true);txt(s,'Tiếng ồn nền có thể khiến việc hiểu lời nói khó hơn. Hãy đối diện người nghe, nói rõ nhưng đừng hét, và giảm tiếng ồn xung quanh khi có thể.',1.55,4.02,5.56,.82,{fontSize:11.2,color:C.ink,valign:'top'});txt(s,'Ví dụ được biên soạn từ khuyến nghị công khai — không phải câu trả lời thực tế của ứng dụng.',.95,5.46,6.50,.42,{fontSize:9,color:C.muted,italic:true});
 card(s,8.18,1.80,4.52,4.62,C.mint,'B5DFD9');txt(s,'PHẢN HỒI TỐT CẦN 3 LỚP',8.52,2.14,3.82,.34,{fontSize:11,bold:true,color:C.teal2});bullet(s,'Trả lời đúng câu hỏi.',8.55,2.83,3.60,{size:11.1});bullet(s,'Nêu hành động cụ thể, dễ áp dụng.',8.55,3.52,3.60,{size:10.8,h:.52});bullet(s,'Nêu giới hạn và khi nào cần chuyên gia.',8.55,4.32,3.60,{size:10.8,h:.52});rect(s,8.52,5.28,3.82,.70,C.white,'none',true);txt(s,'Phân biệt hardcoded fallback với retrieval thật.',8.74,5.44,3.40,.35,{fontSize:9.6,bold:true,color:C.coral,align:'center'});footer(s,12,'BUILD','NIDCD');
 noteSources(s,['https://www.nidcd.nih.gov/health/age-related-hearing-loss','https://www.who.int/en/news-room/fact-sheets/detail/deafness-and-hearing-loss'],'Không trình bày bubble minh họa như phản hồi generated của app. Tránh chẩn đoán hay đưa phác đồ điều trị.');
}
// 13 architecture and statuses
{
 const s=pptx.addSlide('LIGHT');header(s,'04 / ENGINEERING','Kiến trúc rõ ràng giúp phân biệt hiện trạng với đề xuất','Trạng thái lịch sử trong build log cần được chạy lại trên commit dùng để phát hành.');
 const blocks=[
  {x:.55,w:2.25,t:'FRONTEND',d:'React · Vite\nZustand state',c:C.bluep},
  {x:3.00,w:2.20,t:'API LAYER',d:'FastAPI\nRequest / response',c:C.mint},
  {x:5.40,w:2.20,t:'CORE LOGIC',d:'Phoneme\nDSP / noise',c:C.goldp},
  {x:7.80,w:2.20,t:'RETRIEVAL',d:'Keyword/ranking\nLLM fallback',c:C.purplep},
  {x:10.20,w:2.52,t:'OUTPUT',d:'Text / audiogram\nAudio playback',c:C.coralp}
 ];
 blocks.forEach((b,i)=>{card(s,b.x,2.02,b.w,1.38,C.white,C.line);pill(s,b.t,b.x+.17,2.18,b.w-.34,b.c,b.c===C.goldp?'8B5D14':(b.c===C.purplep?C.purple:C.teal2));txt(s,b.d,b.x+.17,2.62,b.w-.34,.54,{fontSize:11.5,bold:true,color:C.navy,align:'center'});if(i<blocks.length-1)drawArrow(s,b.x+b.w+.02,2.70,blocks[i+1].x-.04,2.70,C.teal,1.3);});
 card(s,.65,3.86,5.84,1.70,C.mint,'B5DFD9');pill(s,'HISTORICAL / REPORTED',.95,4.12,1.86,C.teal,C.white);txt(s,'Frontend/backend scaffold · API cơ bản · Python/JS parity và test suite từng được báo cáo.',.95,4.57,5.15,.65,{fontSize:11,color:C.navy,valign:'top'});
 card(s,6.82,3.86,5.84,1.70,C.coralp,'EEC7C0');pill(s,'NEEDS RE-VERIFICATION',7.12,4.12,2.02,C.coral,C.white);txt(s,'GAN inference cần checkpoint/dependency; chất lượng audio cần listening test; retrieval cần holdout độc lập.',7.12,4.57,5.10,.65,{fontSize:11,color:C.navy,valign:'top'});
 txt(s,'Code có tồn tại ≠ đã chạy ≠ đạt độ chính xác chuyên môn.',.84,6.07,11.7,.24,{fontSize:12,bold:true,color:C.navy,align:'center'});footer(s,13,'VERIFY','BUILD_LOG / PROJECT_OVERVIEW');
 notes(s,'Các trạng thái về scaffold, parity, test suite và GAN lấy từ build log do người dùng cung cấp. Chúng là lịch sử, chưa tự động chứng minh trạng thái hiện tại. GAN không được tuyên bố chạy nếu thiếu checkpoint và inference thành công.');
}
// 14 validation plan
{
 const s=pptx.addSlide('LIGHT');header(s,'04 / VALIDATION','Trải nghiệm thấu cảm là giả thuyết cần đo','Research hiện có là lý do để thử nghiệm, không phải bằng chứng rằng Healthy Hearing đã hiệu quả.');
 card(s,.62,1.80,3.88,3.90,C.white,C.line);pill(s,'01 · UX',.90,2.12,1.0,C.bluep,C.navy2);txt(s,'Đo mức hiểu',.90,2.60,3.2,.36,{fontSize:17,bold:true,color:C.navy});bullet(s,'Câu hỏi trước/sau trải nghiệm.',.92,3.18,3.15,{size:11.1});bullet(s,'Nhớ lại điểm chính sau demo.',.92,3.82,3.15,{size:11.1});bullet(s,'Feedback định tính không dẫn dắt.',.92,4.46,3.15,{size:10.8,h:.52});
 card(s,4.73,1.80,3.88,3.90,C.white,C.line);pill(s,'02 · EXPERT',5.01,2.12,1.30,C.mint,C.teal2);txt(s,'Rà soát mô hình',5.01,2.60,3.2,.36,{fontSize:17,bold:true,color:C.navy});bullet(s,'Ngữ âm tiếng Việt và thanh điệu.',5.03,3.18,3.15,{size:10.9});bullet(s,'Đầu ra audio và các giới hạn DSP.',5.03,3.82,3.15,{size:10.9});bullet(s,'Ngôn ngữ an toàn y tế.',5.03,4.46,3.15,{size:10.9});
 card(s,8.84,1.80,3.88,3.90,C.white,C.line);pill(s,'03 · ENGINEERING',9.12,2.12,1.78,C.goldp,'8B5D14');txt(s,'Kiểm tra hệ thống',9.12,2.60,3.2,.36,{fontSize:17,bold:true,color:C.navy});bullet(s,'Unit/API/E2E và regression.',9.14,3.18,3.15,{size:10.9});bullet(s,'Audio contract, sample rate, clipping.',9.14,3.82,3.15,{size:10.9});bullet(s,'Link health và demo fallback.',9.14,4.46,3.15,{size:10.9});
 rect(s,.68,5.96,12.0,.50,C.navy,'none',true);txt(s,'Gate: nếu bằng chứng chưa đủ, ghi “chưa xác minh” — không nâng thành claim sản phẩm.',.92,6.10,11.5,.22,{fontSize:10.3,bold:true,color:C.white,align:'center'});footer(s,14,'VERIFY');
 noteSources(s,['https://pmc.ncbi.nlm.nih.gov/articles/PMC13214495/','https://pubmed.ncbi.nlm.nih.gov/41112881/'],'Các nghiên cứu gần đây về mô phỏng thính lực trong giáo dục/counseling đưa ra tín hiệu tiềm năng về thấu cảm và học tập, nhưng không xác thực Healthy Hearing. Một nghiên cứu VR/haptic pilot khác báo cáo cải thiện điểm empathy; công nghệ và mẫu nghiên cứu khác. Dùng như tiền lệ nghiên cứu, không như bằng chứng hiệu quả của dự án.');
}
// 15 live demo
{
 const s=pptx.addSlide('LIGHT');header(s,'05 / LIVE DEMO','Trong 60 giây, cho khán giả thấy điều thay đổi','Thử trên đúng thiết bị trình chiếu; video backup cần được quay từ build thực tế.');
 const slots=[
  {x:.62,t:'00–20s',name:'SIMULATOR',desc:'Shopping · Normal → Moderate\nCho thấy audio + text cùng thay đổi.',c:C.mint},
  {x:4.76,t:'20–40s',name:'AUDIOGRAM',desc:'Chuyển sang SOUNDS\nKéo một điểm và kiểm tra icon.',c:C.goldp},
  {x:8.90,t:'40–60s',name:'Q&A',desc:'Chọn câu hỏi nhanh\nNêu giới hạn câu trả lời.',c:C.coralp}
 ];
 slots.forEach(a=>{card(s,a.x,2.02,3.80,2.95,C.white,C.line);pill(s,a.t,a.x+.23,2.28,.90,a.c,a.t==='20–40s'?'8B5D14':C.teal2);txt(s,a.name,a.x+.23,2.91,3.2,.30,{fontSize:16,bold:true,color:C.navy});txt(s,a.desc,a.x+.23,3.52,3.2,.68,{fontSize:11.4,color:C.ink,valign:'top'});rect(s,a.x+.23,4.44,3.15,.30,a.c,'none',true);txt(s,'CHECKPOINT · đã test trước',a.x+.33,4.50,2.95,.16,{fontSize:8.2,bold:true,color:C.navy,align:'center'});});
 rect(s,.72,5.45,11.88,.80,C.navy,'none',true);txt(s,'FALLBACK',.98,5.69,1.10,.24,{fontSize:10,bold:true,color:C.gold});txt(s,'Video 60 giây + screenshot + GitHub; nói rõ nếu đang phát video thay vì demo live.',2.12,5.65,10.15,.30,{fontSize:11.1,color:C.white});footer(s,15,'DEMO');
 notes(s,'Trước pitch: xác minh scenario Shopping có trong build; kiểm tra audio output và text; test kéo điểm; gửi câu hỏi và đọc đúng nguồn trả lời. Nếu demo live lỗi, chuyển sang video/screenshot và nói rõ đó là bản ghi.');
}
// 16 workshop agenda
{
 const s=pptx.addSlide('DARK');pill(s,'WORKSHOP MODE',.70,.45,1.55,C.teal,C.white);txt(s,'Không chỉ nghe về sản phẩm — hãy thử tư duy như đội sản phẩm.',.70,.95,11.8,.65,{fontSize:25,bold:true,color:C.white});txt(s,'Mục tiêu workshop: biến một pain point thành giả thuyết, thử nghiệm và quyết định rõ ràng.',.73,1.68,11.65,.34,{fontSize:12.5,color:'CFE1E8'});
 const witems=[
  {n:'01',t:'MAP THE PAIN',d:'Ai gặp vấn đề? Bối cảnh nào? Hậu quả gì?',c:C.bluep},
  {n:'02',t:'FILTER THE IDEA',d:'Có bằng chứng và cách thử rẻ không?',c:C.mint},
  {n:'03',t:'DECIDE NEXT STEP',d:'Build, adapt, research tiếp hay dừng?',c:C.goldp}
 ];
 witems.forEach((a,i)=>{const x=.75+i*4.12;card(s,x,2.58,3.78,2.05,C.navy2,'31536B');circle(s,x+.24,2.84,.48,a.c,a.c,1);txt(s,a.n,x+.24,2.99,.48,.16,{fontSize:9,bold:true,color:C.navy,align:'center'});txt(s,a.t,x+.90,2.86,2.55,.25,{fontSize:11,bold:true,color:C.white});txt(s,a.d,x+.24,3.58,3.25,.60,{fontSize:11.2,color:'DCEAF0',valign:'top'});});
 rect(s,.75,5.20,11.98,.88,'173B57','31536B',true);txt(s,'Facilitator rule',1.00,5.42,1.70,.20,{fontSize:9.5,bold:true,color:C.gold});txt(s,'Đừng bắt đầu từ “AI nào hay?” — hãy bắt đầu từ “ai đang gặp vấn đề gì?”',2.75,5.39,9.45,.28,{fontSize:14,bold:true,color:C.white});txt(s,'WORKSHOP FLOW: pain → evidence → solution → test → decision',.82,6.65,11.7,.20,{fontSize:9,bold:true,color:'A9D8D4',align:'center'});txt(s,'16',12.48,7.15,.22,.18,{fontSize:8,color:C.gold,bold:true,align:'right'});
 notes(s,'Chuyển từ phần trình bày sang workshop. Có thể chia nhóm 3–5 người và yêu cầu mỗi nhóm ghi một pain point cụ thể, không bắt đầu với công nghệ.');
}
// 17 workshop pain-point worksheet
{
 const s=pptx.addSlide('LIGHT');header(s,'WORKSHOP 1 / RESEARCH','Viết vấn đề trước khi viết giải pháp','Mỗi nhóm chọn một đối tượng và một tình huống cụ thể.');
 const rows=[
  {n:'WHO?',q:'Ai là người gặp vấn đề?',hint:'Ví dụ: người thân lớn tuổi trong nhà hàng đông người.',c:C.bluep},
  {n:'WHEN / WHERE?',q:'Vấn đề xảy ra khi nào, ở đâu?',hint:'Mô tả bối cảnh quan sát được, tránh khái quát.',c:C.mint},
  {n:'SO WHAT?',q:'Hậu quả cụ thể là gì?',hint:'Giao tiếp gián đoạn, phải hỏi lại, bỏ lỡ thông tin…',c:C.goldp},
  {n:'EVIDENCE?',q:'Bằng chứng nào đang có?',hint:'Nguồn nghiên cứu, phỏng vấn hoặc quan sát — ghi rõ cái gì còn là giả thuyết.',c:C.coralp}
 ];
 rows.forEach((a,i)=>{const y=1.70+i*1.05;card(s,.68,y,11.98,.86,C.white,C.line);rect(s,.68,y,1.55,.86,a.c,'none',true);txt(s,a.n,.82,y+.29,1.26,.22,{fontSize:10,bold:true,color:C.navy,align:'center'});txt(s,a.q,2.52,y+.13,3.7,.26,{fontSize:13,bold:true,color:C.navy});txt(s,a.hint,2.52,y+.46,9.5,.22,{fontSize:10,color:C.muted});});
 rect(s,.70,6.10,11.94,.44,C.navy,'none',true);txt(s,'OUTPUT: một câu pain point có người dùng + bối cảnh + hậu quả + bằng chứng.',.95,6.22,11.45,.19,{fontSize:10.6,bold:true,color:C.white,align:'center'});footer(s,17,'RESEARCH');
 notes(s,'Hoạt động 8–10 phút. Yêu cầu từng nhóm điền bốn dòng. Câu hỏi gợi ý nhưng không áp đặt câu trả lời. Phân biệt bằng chứng trực tiếp với giả thuyết.');
}
// 18 workshop idea filter / decision tree detailed
{
 const s=pptx.addSlide('LIGHT');header(s,'WORKSHOP 2 / DECIDE','Đưa ý tưởng qua cổng — không để cảm hứng thay dữ liệu','Sử dụng cây quyết định chung ở slide 3 cho từng ý tưởng.');
 const criteria=[
  {n:'01',t:'Pain intensity',d:'Vấn đề có đủ quan trọng?',c:C.bluep},
  {n:'02',t:'Evidence strength',d:'Có bằng chứng trực tiếp?',c:C.mint},
  {n:'03',t:'Feasibility',d:'Có thể build trong phạm vi?',c:C.goldp},
  {n:'04',t:'Validation speed',d:'Thử nghiệm nhỏ trong 1–2 tuần?',c:C.coralp},
  {n:'05',t:'Sustainability',d:'Ai dùng, trả tiền, duy trì?',c:C.purplep},
  {n:'06',t:'Risk & ethics',d:'Có thể gây hiểu nhầm hoặc hại?',c:C.bluep}
 ];
 criteria.forEach((a,i)=>{const x=.68+(i%3)*4.12,y=1.78+Math.floor(i/3)*1.35;card(s,x,y,3.80,1.08,C.white,C.line);circle(s,x+.18,y+.20,.40,a.c,a.c,1);txt(s,a.n,x+.18,y+.32,.40,.15,{fontSize:8.5,bold:true,color:C.navy,align:'center'});txt(s,a.t,x+.72,y+.18,2.80,.22,{fontSize:11.1,bold:true,color:C.navy});txt(s,a.d,x+.72,y+.51,2.80,.38,{fontSize:9.5,color:C.muted,valign:'top'});});
 // bottom decision outcomes
 card(s,.68,4.76,3.80,1.14,C.mint,'B5DFD9');txt(s,'ADOPT / ADAPT',.93,4.98,3.28,.25,{fontSize:12,bold:true,color:C.teal2,align:'center'});txt(s,'Giữ phần đã chứng minh; chỉnh phần còn thiếu.',.96,5.32,3.20,.28,{fontSize:9.6,color:C.navy,align:'center'});
 card(s,4.77,4.76,3.80,1.14,C.goldp,'EBD7A5');txt(s,'BUILD A SMALL TEST',5.02,4.98,3.28,.25,{fontSize:12,bold:true,color:'8B5D14',align:'center'});txt(s,'Chọn MVP nhỏ nhất có thể kiểm chứng.',5.05,5.32,3.20,.28,{fontSize:9.6,color:C.navy,align:'center'});
 card(s,8.86,4.76,3.80,1.14,C.coralp,'EEC7C0');txt(s,'RESEARCH / PIVOT / STOP',9.11,4.98,3.28,.25,{fontSize:11.6,bold:true,color:'A84D3F',align:'center'});txt(s,'Thiếu evidence hoặc rủi ro chưa xử lý.',9.14,5.32,3.20,.28,{fontSize:9.6,color:C.navy,align:'center'});
 txt(s,'Tối đa 1–2 hướng chính. Ghi rõ tiêu chí “giữ / đổi hướng / dừng”.',.78,6.22,11.8,.23,{fontSize:10.4,bold:true,color:C.navy,align:'center'});footer(s,18,'DECIDE');
 notes(s,'Áp dụng 12 trục trong Master Blueprint; slide này trình bày sáu trục giản lược cho workshop. Điểm số phải có lý do. Không quyết định chỉ bằng tổng điểm; một rủi ro an toàn nghiêm trọng có thể là blocker dù điểm trung bình cao.');
}
// 19 Sustainability model
{
 const s=pptx.addSlide('LIGHT');header(s,'06 / SUSTAINABILITY','Tác động xã hội cần một mô hình vận hành thực tế','Miễn phí với người dùng không đồng nghĩa không có chi phí duy trì.');
 const roles=[
  {x:.65,y:1.86,c:C.bluep,lab:'USER',t:'Người sử dụng',d:'Con cháu, người học, giáo viên hoặc người muốn tìm hiểu về thính lực.'},
  {x:6.82,y:1.86,c:C.mint,lab:'BENEFICIARY',t:'Người hưởng lợi',d:'Gia đình có người lớn tuổi; cộng đồng giáo dục và accessibility.'},
  {x:.65,y:3.70,c:C.goldp,lab:'BUYER / PAYER',t:'Đơn vị chi trả',d:'Giả thuyết: grant, CSR, trường điều dưỡng/y khoa, tổ chức giáo dục hòa nhập.'},
  {x:6.82,y:3.70,c:C.coralp,lab:'OPERATOR',t:'Đơn vị vận hành',d:'Hosting, cập nhật nội dung, hỗ trợ, test, bảo mật và phát triển liên tục.'}
 ];
 roles.forEach(a=>{card(s,a.x,a.y,5.86,1.55,C.white,C.line);pill(s,a.lab,a.x+.24,a.y+.18,Math.min(1.45,a.lab.length*.07),a.c,a.c===C.goldp?'8B5D14':(a.c===C.coralp?'A84D3F':C.teal2));txt(s,a.t,a.x+.24,a.y+.58,5.1,.29,{fontSize:15,bold:true,color:C.navy});txt(s,a.d,a.x+.24,a.y+.98,5.12,.40,{fontSize:10.4,color:C.muted,valign:'top'});});
 rect(s,.70,5.72,11.95,.55,C.navy,'none',true);txt(s,'MODEL TO TEST: Free core experience + funded workshops/pilots + partner-backed validation.',.95,5.88,11.45,.22,{fontSize:11,bold:true,color:C.white,align:'center'});footer(s,19,'SUSTAIN');
 notes(s,'Mô hình grant/CSR/đào tạo là giả thuyết trong blueprint, chưa phải nguồn doanh thu đã xác nhận. Client-side DSP có thể giảm tải xử lý server, nhưng không làm tổng chi phí duy trì bằng 0.');
}
// 20 roadmap standalone clearer
{
 const s=pptx.addSlide('LIGHT');header(s,'07 / ROADMAP','30–60–90 ngày: kiểm chứng → chuẩn hóa → pilot','Lộ trình là đề xuất. Mỗi giai đoạn chỉ qua cổng khi có bằng chứng tương ứng.');
 const steps=[
  {x:.65,n:'30 NGÀY',stage:'AUDIT + UX VALIDATION',tasks:['Chốt pain point và scope MVP','Kiểm tra core demo + link health','Mục tiêu thử với 20 gia đình'],gate:'GATE 1: problem + UX evidence',c:C.bluep},
  {x:3.77,n:'60 NGÀY',stage:'TECHNICAL HARDENING',tasks:['Rà soát DSP/phoneme với chuyên gia','Đo chất lượng audio và regression','Chuẩn hóa tài liệu + disclaimer'],gate:'GATE 2: core + claims safe',c:C.mint},
  {x:6.89,n:'90 NGÀY',stage:'CONTROLLED PILOT',tasks:['Thử tại CLB người cao tuổi/lớp học','Theo dõi hiểu biết, usability, lỗi','Thu phản hồi và quyết định iterate'],gate:'GATE 3: pilot signal',c:C.goldp},
  {x:10.01,n:'AFTER GATES',stage:'SHARE / SCALE',tasks:['Công bố kết quả đúng giới hạn','Kết nối partner/grant/workshop','Mở rộng có điều kiện'],gate:'GATE 4: evidence → scale',c:C.purplep}
 ];
 steps.forEach((a,i)=>{card(s,a.x,1.92,2.70,3.80,C.white,C.line);circle(s,a.x+.20,2.15,.54,a.c,a.c,1);txt(s,String(i+1).padStart(2,'0'),a.x+.20,2.33,.54,.15,{fontSize:9,bold:true,color:C.navy,align:'center'});txt(s,a.n,a.x+.20,2.90,2.32,.27,{fontSize:11.5,bold:true,color:C.teal2});txt(s,a.stage,a.x+.20,3.28,2.32,.49,{fontSize:12.4,bold:true,color:C.navy});a.tasks.forEach((t,j)=>bullet(s,t,a.x+.22,3.94+j*.40,2.28,{size:8.6,h:.35,dot:C.teal}));rect(s,a.x+.18,5.19,2.34,.31,a.c,'none',true);txt(s,a.gate,a.x+.26,5.26,2.18,.15,{fontSize:7.5,bold:true,color:C.navy,align:'center'});if(i<3)drawArrow(s,a.x+2.72,3.43,steps[i+1].x-.04,3.43,C.teal,1.3);});
 rect(s,.68,6.02,11.97,.45,C.coralp,'none',true);txt(s,'Không qua gate → quay lại research / sửa / giảm phạm vi; không tự động scale theo lịch.',.90,6.14,11.52,.20,{fontSize:10.2,bold:true,color:'A84D3F',align:'center'});footer(s,20,'ROADMAP');
 notes(s,'Roadmap 30/60/90 xuất phát từ tài liệu người dùng. Mục tiêu 20 gia đình là target, chưa phải kết quả. Mốc 60 ngày đưa đánh giá chuyên môn vào trước pilot; mốc after-gates chỉ chạy nếu có evidence đủ.');
}
// 21 release/distribution
{
 const s=pptx.addSlide('LIGHT');header(s,'08 / DISTRIBUTION','GitHub + demo + video: ba cửa vào phải thống nhất','Một hội đồng hoặc cộng đồng cần mở link và hiểu sản phẩm mà không phải nhắn hỏi thêm.');
 const pathitems=[
  {x:.65,lab:'GITHUB',t:'Source of truth',d:'README khớp code; setup chạy từ đầu; .gitignore và secrets sạch.',c:C.bluep},
  {x:4.76,lab:'LIVE DEMO',t:'Proof of use',d:'URL mở được; API đúng; không dùng localhost; có local/video fallback.',c:C.mint},
  {x:8.87,lab:'YOUTUBE / PITCH',t:'Story + CTA',d:'Video đúng phiên bản; link trong mô tả sống; có lời mời feedback/pilot.',c:C.goldp}
 ];
 pathitems.forEach((p,i)=>{card(s,p.x,1.93,3.80,2.28,C.white,C.line);pill(s,p.lab,p.x+.23,2.18,1.14,p.c,p.c===C.goldp?'8B5D14':C.teal2);txt(s,p.t,p.x+.23,2.73,3.20,.30,{fontSize:15,bold:true,color:C.navy});txt(s,p.d,p.x+.23,3.21,3.20,.64,{fontSize:10.5,color:C.muted,valign:'top'});if(i<2)drawArrow(s,p.x+3.81,3.12,pathitems[i+1].x-.04,3.12,C.teal,1.4);});
 card(s,.70,4.65,7.15,1.48,C.navy,C.navy);txt(s,'LINK HEALTH — CHECK TRƯỚC KHI GỬI',1.02,4.91,6.45,.28,{fontSize:11,bold:true,color:C.gold});txt(s,'README · live demo · API/health · QR · video description · HTTPS · permissions',1.02,5.38,6.36,.37,{fontSize:11.0,color:C.white});
 card(s,8.10,4.65,4.52,1.48,C.coralp,'EEC7C0');txt(s,'TRẠNG THÁI DEMO',8.43,4.91,3.82,.25,{fontSize:10.7,bold:true,color:'A84D3F'});txt(s,'Chưa có URL demo trực tuyến được xác minh trong bộ tài liệu này. Không tạo QR demo giả.',8.43,5.30,3.80,.52,{fontSize:10.0,color:C.navy,valign:'top'});footer(s,21,'DISTRIBUTE');
 notes(s,'GitHub repository: https://github.com/hdwc-151/Demo-hearing-loss. Link demo web chưa được cung cấp/kiểm chứng trong tài liệu, nên slide ghi rõ chưa xác minh và không tạo QR demo. Trước khi nộp, mở URL từ mạng/tài khoản độc lập.');
}
// 22 pitch and preflight
{
 const s=pptx.addSlide('LIGHT');header(s,'08 / PRESENTATION','Pitch tốt là câu chuyện có bằng chứng và một lời mời cụ thể','Mỗi slide nên trả lời một câu hỏi trong logic North Star.');
 const arc=[
  ['01','HOOK','Vì sao người nghe hỏi lại?'],['02','PAIN','Ai gặp vấn đề và hậu quả gì?'],['03','EVIDENCE','Nguồn nào chứng minh bối cảnh?'],['04','SOLUTION','Sản phẩm thay đổi điều gì?'],['05','DEMO','Khán giả có thể thấy gì?'],['06','VALIDATION','Điều gì đã được test?'],['07','SUSTAIN','Ai dùng / trả tiền / duy trì?'],['08','ASK','Cần chuyên gia hay pilot?']
 ];
 arc.forEach((a,i)=>{const x=.66+(i%4)*3.12,y=1.78+Math.floor(i/4)*1.10;card(s,x,y,2.86,.86,C.white,C.line);circle(s,x+.13,y+.20,.38,[C.bluep,C.mint,C.goldp,C.coralp][i%4],[C.bluep,C.mint,C.goldp,C.coralp][i%4],1);txt(s,a[0],x+.13,y+.31,.38,.14,{fontSize:8.3,bold:true,color:C.navy,align:'center'});txt(s,a[1],x+.64,y+.13,1.98,.18,{fontSize:8.5,bold:true,color:C.teal2});txt(s,a[2],x+.64,y+.39,1.98,.29,{fontSize:9.1,color:C.navy,valign:'top'});});
 card(s,.68,4.28,5.85,1.58,C.mint,'B5DFD9');txt(s,'RUBRIC → EVIDENCE MAP',.98,4.55,5.14,.25,{fontSize:11,bold:true,color:C.teal2});txt(s,'Mỗi tiêu chí chấm điểm → slide/demo/source/test tương ứng.',.98,5.03,5.07,.45,{fontSize:12.2,bold:true,color:C.navy});
 card(s,6.80,4.28,5.85,1.58,C.goldp,'EBD7A5');txt(s,'PRE-FLIGHT',7.10,4.55,5.14,.25,{fontSize:11,bold:true,color:'8B5D14'});txt(s,'Đúng link · đúng claim · demo backup · bấm giờ · Q&A giới hạn y tế.',7.10,5.03,5.08,.45,{fontSize:11.7,bold:true,color:C.navy});
 txt(s,'Cộng đồng: mời trải nghiệm và phản hồi. Workshop: mời tham gia thử nghiệm. Đối tác: yêu cầu hỗ trợ rõ ràng.',.78,6.25,11.75,.28,{fontSize:10.4,bold:true,color:C.navy,align:'center'});footer(s,22,'PITCH');
 notes(s,'Nếu có rubric chính thức, thay rubric heuristic bằng wording/trọng số của cuộc thi. Luyện 30s, 60s, 3 phút và thời lượng chính thức; có video backup. Không biến giả thuyết thành kết quả.');
}
// 23 reference appendix
{
 const s=pptx.addSlide('LIGHT');header(s,'APPENDIX / SOURCES','Nguồn cốt lõi để kiểm tra claim và chuẩn bị Q&A','Ưu tiên nguồn chính thức; kiểm tra ngày, định nghĩa và phạm vi trước khi nộp.');
 const refs=[
  ['WHO · Fact Sheet (03 Mar 2026)','Deafness and hearing loss','https://www.who.int/en/news-room/fact-sheets/detail/deafness-and-hearing-loss'],
  ['WHO · World Report on Hearing','Report / executive summary','https://www.who.int/publications/i/item/9789240020481'],
  ['NIDCD / NIH','Age-Related Hearing Loss (Presbycusis)','https://www.nidcd.nih.gov/health/age-related-hearing-loss'],
  ['NCBI Bookshelf','Speech Audiometry / Speech Banana','https://www.ncbi.nlm.nih.gov/books/NBK613286/'],
  ['Hearing-simulation education research','Hearing Through the Patient’s Ears','https://pmc.ncbi.nlm.nih.gov/articles/PMC13214495/'],
  ['NIH / NIDCD','Improving communication / noise and speech','https://www.nidcd.nih.gov/health/how-does-noise-damage-your-hearing']
 ];
 refs.forEach((r,i)=>{const y=1.68+i*.75;circle(s,.78,y+.09,.31,[C.teal,C.bluep,C.gold,C.coral,C.purple,C.teal][i],[C.teal,C.bluep,C.gold,C.coral,C.purple,C.teal][i],1);txt(s,String(i+1).padStart(2,'0'),.78,y+.18,.31,.12,{fontSize:7.5,bold:true,color:i===1?C.navy:C.white,align:'center'});txt(s,r[0],1.25,y,2.55,.22,{fontSize:10.2,bold:true,color:C.navy});txt(s,r[1],3.85,y,3.40,.22,{fontSize:10.2,color:C.ink});txt(s,r[2],7.35,y,5.20,.22,{fontSize:8.5,color:C.teal2,underline:{color:C.teal2},hyperlink:{url:r[2]}});line(s,1.25,y+.43,12.52,y+.43,C.line,.65);});
 rect(s,.75,6.33,11.85,.36,C.coralp,'none',true);txt(s,'Không dùng “70%/80% phụ âm” hoặc SII nếu chưa có nguồn/thuật toán phù hợp.',.95,6.42,11.45,.17,{fontSize:9.3,bold:true,color:'A84D3F',align:'center'});footer(s,23,'SOURCES');
 noteSources(s,refs.map(r=>r[2]),'Bổ sung nguồn ngoài được truy cập ngày 22/10/2026. Nghiên cứu mô phỏng có liên quan là bối cảnh hỗ trợ lý do để nghiên cứu, không phải validation của Healthy Hearing.');
}
// 24 closing
{
 const s=pptx.addSlide('DARK');
 pill(s,'KẾT LUẬN',.78,.60,1.05,C.teal,C.white);
 txt(s,'Từ mô phỏng\nđến thấu cảm.',.78,1.23,6.50,1.35,{fontSize:36,bold:true,color:C.white});
 txt(s,'Healthy Hearing biến một khái niệm khó hình dung thành trải nghiệm để cùng quan sát, hiểu và trò chuyện.',.83,2.92,6.10,.85,{fontSize:17,color:'DCEAF0'});
 line(s,.83,4.02,2.06,4.02,C.gold,3);
 txt(s,'THE ASK',.83,4.36,1.5,.25,{fontSize:10,bold:true,color:C.gold,charSpacing:.7});
 txt(s,'Kết nối chuyên gia thính học/ngôn ngữ và đối tác pilot để kiểm chứng mô hình trong thực tế.',.83,4.83,6.30,.84,{fontSize:16.2,bold:true,color:C.white});
 addImageFit(s,assets.owl,7.80,1.07,4.12,4.12);
 rect(s,.80,6.40,11.82,.44,C.navy2,'31536B',true);txt(s,'EVIDENCE BEFORE CLAIMS  •  EDUCATION, NOT DIAGNOSIS',1.04,6.52,11.3,.18,{fontSize:9,bold:true,color:'CFE6E9',align:'center',charSpacing:.7});txt(s,'24',12.47,7.15,.22,.18,{fontSize:8,color:C.gold,bold:true,align:'right'});
 notes(s,'Kết thúc bằng lời mời rõ ràng: chuyên gia thính học/ngôn ngữ, gia đình thử nghiệm và đối tác giáo dục. Không tuyên bố đã được xác thực lâm sàng.');
}

const out='/mnt/data/Healthy_Hearing_Community_Workshop_Master_Deck.pptx';
pptx.writeFile({fileName:out});
