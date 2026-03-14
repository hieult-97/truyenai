import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════
// CONFIG & CONSTANTS
// ═══════════════════════════════════════════════════════
const ADMIN_PASSWORD = "ADMIN2024"; // Đổi mật khẩu này!
const XU_PER_CHAPTER = 2;
const DEFAULT_XU = 100;
const DAILY_BONUS = 100;

// ═══════════════════════════════════════════════════════
// LOCAL STORAGE HELPERS
// ═══════════════════════════════════════════════════════
function LS(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function LSSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { console.error(e); }
}

// ═══════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════
const TAGS_COLORS = {
  "HUYỀN HUYỄN":"#8b4513","TIÊN HIỆP":"#a0522d","ISEKAI":"#4a6741",
  "FANTASY":"#6b4c6e","DARK FANTASY":"#5c2a2a","SLICE OF LIFE":"#5f7a5f",
  "NÔNG TRẠI":"#6b7a3d","XÂY DỰNG":"#8b7355","MANHWA":"#8b6914",
  "MANGA":"#a0522d","ANIME":"#4a6d8c","DỊ GIỚI":"#6b4c6e",
  "SINH TỒN":"#7a3b3b","ĐÔ THỊ":"#4a5568","TRINH THÁM":"#8b7355",
  "KHOA HỌC":"#4a6d6d","LỊCH SỬ":"#8b6914","MẠT THẾ":"#6b3a3a",
};

const STORIES = [
  { id:"s1", title:"Đấu La Đại Lục — Hồn Sư Tranh Phong", tags:["HUYỀN HUYỄN"], desc:"Nơi Võ Hồn quyết định địa vị, Hồn Hoàn quyết định tương lai. Bạn bắt đầu từ kẻ vô danh, tự chọn con đường: quái vật học viện, chấp sự tông môn, hay đối thủ của Vũ Hồn Điện.", plays:120, likes:31, icon:"⚔" },
  { id:"s2", title:"Chuyển sinh làm nông dân tại dị giới", tags:["ISEKAI","SLICE OF LIFE","NÔNG TRẠI"], desc:"Giữa Rừng Chết đầy mana và các vương quốc chiến tranh, bạn không đi theo con đường anh hùng — bạn cầm cuốc, trồng cây, và xây đế chế nông nghiệp.", plays:87, likes:22, icon:"🌾" },
  { id:"s3", title:"Thợ Săn Kỷ Nguyên", tags:["FANTASY","ISEKAI"], desc:"Mười năm sau ngày Cổng xuất hiện, thế giới vận hành bằng mana, máu và hợp đồng săn quái. Bạn không phải bản sao của ai.", plays:152, likes:44, icon:"🏹" },
  { id:"s4", title:"Pick Me Up! — Gacha Vô Hạn", tags:["DARK FANTASY","ISEKAI","SINH TỒN"], desc:"Bạn bị ném vào tựa game gacha — nhưng lần này ở bên trong. Mỗi lần chết là reset, nhưng ký ức thì không mất.", plays:95, likes:28, icon:"🎰" },
  { id:"s5", title:"Chuyển Sinh Slime Dị Giới", tags:["ISEKAI","FANTASY","ANIME"], desc:"Tỉnh dậy trong hình dạng slime yếu nhất. Nhưng kỹ năng Đại Hiền Giả đang chờ kích hoạt — và cả thế giới sẽ phải khiếp sợ.", plays:189, likes:54, icon:"🟢" },
  { id:"s6", title:"Đấu Phá Thương Khung — Phá Thiên Xung Đế", tags:["HUYỀN HUYỄN","TIÊN HIỆP"], desc:"Thiên tài sa cơ, bị gia tộc chế giễu. Trong chiếc nhẫn cổ ẩn chứa linh hồn Đấu Đế — và lời hứa phục thù.", plays:167, likes:48, icon:"🔥" },
  { id:"s7", title:"Toàn Chức Pháp Sư — Ma Pháp Giác Tỉnh", tags:["FANTASY","HUYỀN HUYỄN"], desc:"Ai cũng giác tỉnh một hệ ma pháp. Bạn giác tỉnh hệ Hỏa — nhưng còn hệ thứ hai bị phong ấn, chờ ngày bùng nổ.", plays:134, likes:35, icon:"🧙" },
  { id:"s8", title:"Kẻ Truy Đuổi Bóng Đêm", tags:["TRINH THÁM","ĐÔ THỊ"], desc:"Hà Nội về đêm không chỉ có ánh đèn. Vụ mất tích liên tiếp, và bạn là thám tử duy nhất nhìn thấy bóng ma hiện trường.", plays:78, likes:23, icon:"🔍" },
  { id:"s9", title:"Nghịch Thiên Tà Thần", tags:["TIÊN HIỆP","HUYỀN HUYỄN"], desc:"Bị sư huynh phản bội, đẩy xuống vực. Nhưng dưới vực là bí kíp thượng cổ phong ấn ngàn năm — con đường nghịch thiên bắt đầu.", plays:173, likes:51, icon:"💀" },
  { id:"s10", title:"Nữ Tổng Tài Bí Ẩn", tags:["ĐÔ THỊ","SLICE OF LIFE"], desc:"Đêm mưa Sài Gòn, bạn cứu mạng nữ tổng tài lạnh lùng nhất thành phố. Cô ấy trả ơn bằng hợp đồng kỳ lạ: 100 ngày giả vờ yêu.", plays:191, likes:56, icon:"🌃" },
  { id:"s11", title:"Vương Triều Bóng Tối", tags:["DARK FANTASY","LỊCH SỬ"], desc:"Xuyên không làm hoàng tử thứ bảy không ai nhớ mặt. Chỉ bạn biết đại nạn đến trong 30 ngày — và 6 anh em đều muốn bạn chết.", plays:144, likes:37, icon:"👑" },
  { id:"s12", title:"Mạt Thế: 72 Giờ Cuối", tags:["MẠT THẾ","SINH TỒN"], desc:"Virus biến đổi lan tràn. 72 giờ trước khi phong tỏa hoàn toàn. Thức ăn, vũ khí, đồng minh — mỗi giờ là một lựa chọn sống còn.", plays:156, likes:39, icon:"☠" },
  { id:"s13", title:"Học Viện Triệu Hồi Sư", tags:["FANTASY","ANIME"], desc:"Thư mời vào Học Viện Vạn Linh — nơi đào tạo triệu hồi sư. Con thú triệu hồi đầu tiên của bạn là... một con mèo. Nhưng nó giấu bí mật kinh hoàng.", plays:162, likes:40, icon:"🐱" },
  { id:"s14", title:"Trạm Không Gian Omega", tags:["KHOA HỌC"], desc:"Năm 2150. Phi hành gia cuối cùng trên trạm Omega. Trái Đất mất liên lạc. Oxy còn 14 ngày. Và có thứ gì đó đang gõ cửa bên ngoài.", plays:98, likes:26, icon:"🚀" },
  { id:"s15", title:"Kiếm Khách Giang Hồ Lục", tags:["LỊCH SỬ","TIÊN HIỆP"], desc:"Trung Nguyên loạn lạc, sáu đại kiếm phái tranh hùng. Bạn là đệ tử quét sân — cho đến khi luyện được Vô Danh Kiếm Pháp từ tấm bia đá nứt.", plays:107, likes:29, icon:"🗡" },
  { id:"s16", title:"Tái Sinh Tại Seoul 1988", tags:["ISEKAI","SLICE OF LIFE","ĐÔ THỊ"], desc:"Tỉnh dậy trong cơ thể thiếu niên Hàn Quốc năm 1988. Biết trước 36 năm tương lai — bất động sản, Bitcoin, hay thay đổi lịch sử?", plays:181, likes:53, icon:"🇰🇷" },
  { id:"s17", title:"Quỷ Vương Chuyển Sinh", tags:["DARK FANTASY","HUYỀN HUYỄN"], desc:"Từng là Quỷ Vương hủy diệt thế giới. Chết rồi chuyển sinh thành đứa trẻ mồ côi trong chính thế giới bạn tàn phá. Người dân vẫn thờ di ảnh Quỷ Vương.", plays:155, likes:49, icon:"👿" },
  { id:"s18", title:"Đầu Bếp Bí Ẩn Dị Giới", tags:["ISEKAI","SLICE OF LIFE","FANTASY"], desc:"Kỹ năng duy nhất khi chuyển sinh: Nấu Ăn Cấp SSS. Trong thế giới nơi thịt quái vật ngon hơn gà rán, bạn mở nhà hàng giữa rừng quái.", plays:170, likes:52, icon:"🍳" },
];

const SYSTEM_PROMPT = `Bạn là nhà văn tiểu thuyết tương tác Việt Nam. Viết tiếng Việt có dấu, dùng "bạn" cho nhân vật chính. Mỗi đoạn 200-300 từ, kết thúc cliffhanger. LUÔN kết thúc bằng 3 lựa chọn cụ thể chi tiết (15+ từ mỗi lựa chọn):
---CHOICES---
[A] Hành động cụ thể gắn bối cảnh...
[B] Hành động khác biệt hoàn toàn...
[C] Hành động bất ngờ sáng tạo...
---END---
KHÔNG viết lựa chọn chung chung. Mỗi lựa chọn dẫn đến diễn biến khác nhau.`;

const AI_MODEL = "claude-sonnet-4-20250514";

async function callAI(messages) {
  // Lọc messages lỗi + đảm bảo format đúng
  const clean = messages.filter(m => m.content && !String(m.content).startsWith("⚠") && !String(m.content).startsWith("Lỗi"));
  const fixed = [];
  for (const m of clean) {
    if (fixed.length === 0 && m.role !== "user") continue;
    if (fixed.length > 0 && fixed[fixed.length-1].role === m.role) continue;
    fixed.push({role:m.role, content:String(m.content).slice(0, 2000)});
  }
  if (fixed.length === 0 || fixed[fixed.length-1].role !== "user") {
    fixed.push({role:"user", content: messages[0]?.content || "Viết chương tiếp theo."});
  }
  const trimmed = fixed.length > 12 ? [fixed[0], ...fixed.slice(-11)] : fixed;

  const apiKey = LS("tai-apikey", "");
  
  const doCall = async (msgs, key) => {
    const headers = { "Content-Type":"application/json" };
    if (key) { headers["x-api-key"] = key; headers["anthropic-version"] = "2023-06-01"; headers["anthropic-dangerous-direct-browser-access"] = "true"; }
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST", headers,
      body: JSON.stringify({ model: AI_MODEL, max_tokens: 1024, system: SYSTEM_PROMPT, messages: msgs }),
    });
    if (r.ok) {
      const d = await r.json();
      return d.content?.map(c => c.text || "").join("\n") || null;
    }
    let errMsg = "";
    try { const eb = await r.json(); errMsg = eb.error?.message || ""; } catch(e) {}
    console.error("API", r.status, errMsg);
    if (r.status === 401) return "⚠ API Key không hợp lệ.";
    if (r.status === 429) return "⚠ Hết lượt gọi. Đợi vài phút.";
    return null;
  };

  if (apiKey) {
    try {
      const r1 = await doCall(trimmed, apiKey);
      if (r1) return r1;
    } catch(e) { console.error("Call 1:", e); }
    try {
      const r2 = await doCall([{role:"user",content:trimmed.filter(m=>m.role==="user").pop()?.content||"Viết tiếp."}], apiKey);
      if (r2) return r2;
    } catch(e) { console.error("Call 2:", e); }
    return "⚠ API lỗi. Kiểm tra Console (F12) để xem chi tiết. Thử bấm ↻ bắt đầu lại.";
  }

  try {
    const r = await doCall(trimmed, null);
    if (r) return r;
  } catch(e) {}
  return "⚠ Chưa kết nối AI. Admin cần nhập API Key trong Admin Panel.";
}

function parseResponse(text) {
  const cm = text.match(/---CHOICES---([\s\S]*?)---END---/);
  let narrative = text, choices = [];
  if (cm) {
    narrative = text.replace(/---CHOICES---[\s\S]*?---END---/, "").trim();
    const rx = /\[([ABC])\]\s*(.+)/g; let m;
    while ((m = rx.exec(cm[1])) !== null) choices.push({ id:m[1], text:m[2].trim() });
  }
  if (!choices.length) {
    const rx2 = /\[([ABC1-3])\]\s*([^\[\n]+)/g; let m;
    while ((m = rx2.exec(text)) !== null) choices.push({ id:m[1], text:m[2].trim() });
    if (choices.length) narrative = text.replace(/\[[ABC1-3]\]\s*[^\[\n]+/g,"").replace(/---CHOICES---|---END---/g,"").trim();
  }
  if (!choices.length) choices = [{id:"A",text:"Tiến về phía trước, chuẩn bị tinh thần đối mặt với thử thách tiếp theo"},{id:"B",text:"Quay lại điều tra thêm manh mối bạn có thể đã bỏ lỡ ở khu vực trước"},{id:"C",text:"Rẽ sang con đường tắt bí ẩn bên phải mà không ai dám bước vào"}];
  return { narrative, choices };
}

// ═══════════════════════════════════════════════════════
// THEME
// ═══════════════════════════════════════════════════════
const C = {
  bg:"#f5efe3", bg2:"#ebe3d3", bg3:"#ddd4c2",
  gold:"#8b2d2d", goldDark:"#6b1f1f", goldLight:"#a84444",
  text:"#2a1f14", textDim:"#7a6b58", textMuted:"#a39882",
  border:"rgba(90,70,50,0.15)", borderHover:"rgba(90,70,50,0.35)",
  red:"#8b2d2d", green:"#4a6741",
  ink:"#3d2b1f", parchment:"#f5efe3", accent:"#8b4513",
};

// ═══════════════════════════════════════════════════════
// EQUIPPED ITEMS — visual data
// ═══════════════════════════════════════════════════════
const FRAME_STYLES = {
  frame_gold: { border:"2px solid #8b4513", boxShadow:"0 0 8px rgba(139,69,19,0.3)" },
  frame_dragon: { border:"2px solid #4a6741", boxShadow:"0 0 8px rgba(74,103,65,0.3)" },
  frame_fire: { border:"2px solid #8b2d2d", boxShadow:"0 0 8px rgba(139,45,45,0.3)" },
};
const TITLE_DATA = {
  title_hero: { text:"Anh Hùng", color:"#4a6d8c" },
  title_king: { text:"Bá Vương", color:"#6b4c6e" },
  title_immortal: { text:"Tiên Nhân", color:"#8b4513" },
};
const FX_DATA = {
  fx_sparkle: { name:"sparkle", color:"rgba(255,215,0,0.6)", symbol:"*" },
  fx_thunder: { name:"thunder", color:"rgba(100,149,237,0.7)", symbol:"/" },
  fx_sakura: { name:"sakura", color:"rgba(255,182,193,0.6)", symbol:"." },
};
function getEquipped() { return LS("tai-equipped",{frame:null,title:null,fx:null}); }

function AvatarWithFrame({ size, fontSize }) {
  const eq = getEquipped();
  const frameStyle = eq.frame ? FRAME_STYLES[eq.frame] || {} : {};
  return (
    <span style={{ width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${C.accent},#6b3410)`,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:fontSize||10,color:"#f5efe3",flexShrink:0,...frameStyle }}>
      {String.fromCodePoint(0x1F464)}
    </span>
  );
}

function TitleBadge() {
  const eq = getEquipped();
  if (!eq.title) return null;
  const t = TITLE_DATA[eq.title];
  if (!t) return null;
  return <span style={{ fontSize:10,fontWeight:700,color:t.color,background:t.color+"18",padding:"1px 8px",borderRadius:6,marginLeft:4 }}>{t.text}</span>;
}

// ═══════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════
function Tag({ name }) {
  const c = TAGS_COLORS[name]||"#7a6b58";
  return <span style={{ display:"inline-block",padding:"2px 10px",borderRadius:3,background:c+"15",color:c,fontSize:10,fontWeight:600,letterSpacing:.3,marginRight:4,marginBottom:4,border:`1px solid ${c}30` }}>{name}</span>;
}

// Xu coin icon — thay thế 🪙 bị lỗi trên một số thiết bị
function Coin({size}) {
  const s = size||14;
  return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:s,height:s,borderRadius:"50%",background:"linear-gradient(135deg,#8b4513,#a0522d)",color:"#f5efe3",fontSize:s*0.6,fontWeight:800,lineHeight:1,flexShrink:0,border:"1px solid #6b3410"}}>$</span>;
}

function Navbar({ user, page, setPage, onLogout, xu }) {
  const [dd, setDd] = useState(false);
  const nav = [{id:"home",l:"Trang chủ"},{id:"library",l:"Thư viện"},{id:"ranking",l:"Xếp hạng"},{id:"events",l:"Sự kiện"},{id:"support",l:"Hỗ trợ"}];
  return (
    <header style={{ position:"sticky",top:0,zIndex:200,background:"linear-gradient(180deg,#ebe3d3,#f5efe3)",borderBottom:`2px solid ${C.accent}22`,height:52,display:"flex",alignItems:"center",padding:"0 20px",gap:8,boxShadow:"0 2px 12px rgba(90,70,50,0.06)" }}>
      <div onClick={()=>setPage("home")} style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginRight:16 }}>
        <span style={{ fontFamily:"'Noto Serif',serif",fontSize:22,fontWeight:800,color:C.ink,letterSpacing:-0.5 }}>墨</span>
        <span style={{ fontFamily:"'Noto Serif',serif",fontSize:17,fontWeight:700,color:C.ink }}>TruyệnAI</span>
      </div>
      <nav style={{ display:"flex",gap:0,flex:1,overflowX:"auto" }}>
        {nav.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{ background:"transparent",border:"none",color:page===n.id?C.ink:C.textDim,fontSize:13,fontWeight:page===n.id?700:400,padding:"8px 14px",cursor:"pointer",borderRadius:0,whiteSpace:"nowrap",borderBottom:page===n.id?`2px solid ${C.accent}`:"2px solid transparent",fontFamily:"'Noto Serif',serif",letterSpacing:0.3 }}>{n.l}</button>
        ))}
      </nav>
      <div style={{ display:"flex",alignItems:"center",gap:12 }}>
        <span style={{ fontSize:12,color:C.accent,fontWeight:700,display:"flex",alignItems:"center",gap:4,fontFamily:"'Noto Serif',serif" }}><Coin size={14}/> {xu} xu</span>
        <div style={{ position:"relative" }}>
          <button onClick={()=>setDd(!dd)} style={{ background:C.bg2,border:`1px solid ${C.border}`,color:C.text,fontSize:12,fontWeight:500,padding:"5px 12px",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
            <AvatarWithFrame size={22} fontSize={10} />
            {user?.name}<TitleBadge /> <span style={{ fontSize:10 }}>▼</span>
          </button>
          {dd && <Dropdown user={user} xu={xu} setPage={p=>{setPage(p);setDd(false)}} onLogout={()=>{onLogout();setDd(false)}} />}
        </div>
      </div>
    </header>
  );
}

function Dropdown({ user, xu, setPage, onLogout }) {
  const Item = ({icon,label,badge,onClick}) => (
    <button onClick={onClick} style={{ width:"100%",background:"transparent",border:"none",color:C.text,padding:"9px 16px",textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:10,fontSize:13 }}
      onMouseEnter={e=>e.currentTarget.style.background=C.accent+"08"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <span style={{fontSize:14,width:18}}>{icon}</span>{label}
      {badge && <span style={{ marginLeft:"auto",background:C.red,color:"#f5efe3",fontSize:9,fontWeight:700,borderRadius:10,padding:"1px 6px" }}>{badge}</span>}
    </button>
  );
  const Sec = ({title,children}) => (
    <div style={{marginBottom:4}}>
      <div style={{padding:"8px 16px 4px",fontSize:10,fontWeight:700,color:C.textMuted,letterSpacing:1,textTransform:"uppercase"}}>{title}</div>
      {children}
    </div>
  );
  return (
    <div style={{ position:"absolute",right:0,top:42,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,width:260,zIndex:300,overflow:"hidden",boxShadow:"0 12px 40px rgba(0,0,0,0.6)" }}>
      <div style={{ padding:"16px 16px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,alignItems:"center" }}>
        <AvatarWithFrame size={40} fontSize={18} />
        <div>
          <div style={{ fontSize:14,fontWeight:700,color:C.text,display:"flex",alignItems:"center" }}>{user?.name}<TitleBadge /></div>
          <div style={{ display:"flex",alignItems:"center",gap:4,marginTop:3 }}>
            <Coin size={14}/>
            <span style={{ fontSize:13,fontWeight:700,color:C.gold }}>{xu} xu</span>
            <button onClick={()=>setPage("topup")} style={{ background:C.gold,border:"none",color:"#f5efe3",fontSize:10,fontWeight:700,borderRadius:4,padding:"1px 6px",cursor:"pointer",marginLeft:4 }}>+</button>
          </div>
        </div>
      </div>
      <Sec title="Tài khoản">
        <Item icon="👤" label="Hồ sơ & Thống kê" onClick={()=>setPage("profile")} />
        <Item icon="💰" label="Nạp xu" onClick={()=>setPage("topup")} />
        <Item icon="👥" label="Giới thiệu nhận xu" onClick={()=>setPage("referral")} />
        <Item icon="🎯" label="Nhiệm vụ nhận xu" badge={LS("tai-mclaim-"+getTodayStr(),[]).length<5?"!":null} onClick={()=>setPage("missions")} />
        <Item icon="🔔" label="Thông báo" badge={(()=>{const r=LS("tai-notifRead",[]);const c=5-r.length;return c>0?String(c):null;})()} onClick={()=>setPage("notif")} />
      </Sec>
      <Sec title="Kho đồ & Cửa hàng">
        <Item icon="🏪" label="Cửa hàng" onClick={()=>setPage("shop")} />
        <Item icon="👜" label="Túi đồ" onClick={()=>setPage("inventory")} />
        <Item icon="🏅" label="Bộ sưu tập" onClick={()=>setPage("collection")} />
      </Sec>
      <Sec title="Tiện ích">
        {user?.isAdmin && <Item icon="🔑" label="Admin Panel" onClick={()=>setPage("admin")} />}
        <Item icon="⚙️" label="Cài đặt" onClick={()=>setPage("settings")} />
        <Item icon="🚪" label="Đăng xuất" onClick={onLogout} />
      </Sec>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STORY CARD (giống gốc)
// ═══════════════════════════════════════════════════════
function StoryCard({ story, onStart, onReset, saved }) {
  return (
    <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",transition:"all .25s",position:"relative" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent+"40";e.currentTarget.style.boxShadow="0 4px 20px rgba(90,70,50,0.08)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="";}}>
      {/* Top accent line */}
      <div style={{ height:2,background:`linear-gradient(90deg,transparent,${C.accent}40,transparent)` }} />
      <div style={{ padding:"16px 18px 0",display:"flex",flexWrap:"wrap",alignItems:"flex-start",gap:4 }}>
        <div style={{ flex:1,display:"flex",flexWrap:"wrap",gap:3 }}>{story.tags.map(t=><Tag key={t} name={t}/>)}</div>
      </div>
      <div style={{ padding:"12px 18px" }}>
        <h3 style={{ fontFamily:"'Noto Serif',serif",fontSize:17,fontWeight:700,color:C.ink,marginBottom:10,lineHeight:1.4 }}>{story.title}</h3>
        <p style={{ fontSize:13,color:C.textDim,lineHeight:1.65,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden",minHeight:52 }}>{story.desc}</p>
      </div>
      <div style={{ padding:"0 18px 10px",display:"flex",gap:14,fontSize:11,color:C.textMuted }}>
        <span>▸ {story.plays} lượt</span><span>♡ {story.likes}</span>
      </div>
      <div style={{ padding:"0 18px 16px",display:"flex",gap:8 }}>
        <button onClick={()=>onStart(story)} style={{ flex:1,background:saved?`linear-gradient(135deg,${C.accent},${C.ink})`:"transparent",border:saved?"none":`1.5px solid ${C.accent}40`,color:saved?"#f5efe3":C.accent,padding:"11px 16px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Noto Serif',serif" }}>{saved?"▶ Đọc tiếp":"⚔ Bắt đầu"}</button>
        {saved && <button onClick={()=>onReset(story)} style={{ background:"transparent",border:`1.5px solid ${C.border}`,color:C.textDim,padding:"11px 12px",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600 }}>↻</button>}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [view, setView] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [adminName, setAdminName] = useState("");
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = () => {
    const n = logoClicks + 1; setLogoClicks(n);
    if (n >= 5) { setView("admin"); setLogoClicks(0); setErr(""); }
  };

  const handleLogin = () => {
    if (!email.trim() || !password.trim()) { setErr("Vui lòng nhập email và mật khẩu"); return; }
    const users = LS("tai-users", []);
    const found = users.find(u => u.email === email.trim().toLowerCase());
    if (!found) { setErr("Email chưa được đăng ký"); return; }
    if (found.password !== password) { setErr("Sai mật khẩu"); return; }
    found.lastLogin = Date.now(); LSSet("tai-users", users);
    onLogin({ name: found.name, email: found.email, isAdmin: false, xu: found.xu ?? DEFAULT_XU });
  };

  const handleRegister = () => {
    if (!name.trim() || !email.trim() || !password.trim()) { setErr("Vui lòng nhập đầy đủ thông tin"); return; }
    if (password.length < 4) { setErr("Mật khẩu ít nhất 4 ký tự"); return; }
    const users = LS("tai-users", []);
    if (users.find(u => u.email === email.trim().toLowerCase())) { setErr("Email đã tồn tại"); return; }
    const newUser = { name: name.trim(), email: email.trim().toLowerCase(), password, xu: DEFAULT_XU, createdAt: Date.now(), lastLogin: Date.now(), method: "email" };
    users.push(newUser); LSSet("tai-users", users);
    onLogin({ name: newUser.name, email: newUser.email, isAdmin: false, xu: DEFAULT_XU });
  };

  // Real Google Sign-In
  const handleGoogleLogin = () => {
    const clientId = LS("tai-google-client-id", "");
    if (!clientId) { setErr("Admin chưa cấu hình Google Sign-In. Vui lòng đăng ký bằng email."); return; }
    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          try {
            // Decode JWT token
            const payload = JSON.parse(atob(response.credential.split('.')[1]));
            const gEmail = payload.email;
            const gName = payload.name || payload.email.split('@')[0];
            const users = LS("tai-users", []);
            let found = users.find(u => u.email === gEmail);
            if (!found) {
              found = { name: gName, email: gEmail, password: "__google__", xu: DEFAULT_XU, createdAt: Date.now(), lastLogin: Date.now(), method: "google", avatar: payload.picture || "" };
              users.push(found);
            } else {
              found.lastLogin = Date.now();
              if (payload.picture) found.avatar = payload.picture;
            }
            LSSet("tai-users", users);
            onLogin({ name: found.name, email: found.email, isAdmin: false, xu: found.xu ?? DEFAULT_XU, avatar: found.avatar });
          } catch(e) { setErr("Lỗi xử lý đăng nhập Google"); }
        },
      });
      window.google.accounts.id.prompt();
    } catch(e) { setErr("Google Sign-In chưa sẵn sàng. Thử lại hoặc đăng ký bằng email."); }
  };

  const handleAdmin = () => {
    if (adminKey !== ADMIN_PASSWORD) { setErr("Sai mật khẩu Admin"); return; }
    if (!adminName.trim()) { setErr("Nhập tên Admin"); return; }
    onLogin({ name: adminName.trim(), isAdmin: true, xu: 9999 });
  };

  const inputStyle = { width:"100%", background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 14px", color:C.text, fontSize:14, boxSizing:"border-box", outline:"none", transition:"border-color .2s" };
  const labelStyle = { display:"block", color:C.textDim, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 };
  const googleBtnStyle = { width:"100%", background:C.bg3, border:`1px solid ${C.border}`, color:C.text, padding:"12px 16px", borderRadius:12, fontSize:14, fontWeight:500, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10 };
  const GoogleIcon = () => <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"'Inter',sans-serif" }}>
      <div style={{ maxWidth:420, width:"100%", textAlign:"center" }}>
        <div onClick={handleLogoClick} style={{ cursor:"default", marginBottom:8, userSelect:"none" }}>
          <span style={{ fontFamily:"'Noto Serif',serif", fontSize:34, fontWeight:800, color:C.gold }}>墨 TruyệnAI</span>
        </div>
        <p style={{ color:C.textDim, fontSize:14, marginBottom:32 }}>Bắt đầu hành trình của bạn</p>

        {view === "login" && (
          <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:18, padding:"32px 28px", textAlign:"left" }}>
            <h2 style={{ fontFamily:"'Noto Serif',serif", fontSize:24, fontWeight:700, color:C.text, marginBottom:24 }}>Đăng nhập</h2>
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" style={{ ...inputStyle, marginBottom:18 }} />
            <label style={labelStyle}>Mật khẩu</label>
            <div style={{ position:"relative", marginBottom:24 }}>
              <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" type={showPw?"text":"password"} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{ ...inputStyle, paddingRight:42 }} />
              <button onClick={()=>setShowPw(!showPw)} style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"transparent", border:"none", color:C.textDim, fontSize:16, cursor:"pointer", padding:4 }}>{showPw?"🙈":"👁"}</button>
            </div>
            <button onClick={handleLogin} style={{ width:"100%", background:`linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, border:"none", color:"#f5efe3", padding:"14px", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer", marginBottom:20 }}>Đăng nhập</button>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ flex:1, height:1, background:C.border }} /><span style={{ color:C.textMuted, fontSize:12 }}>hoặc</span><div style={{ flex:1, height:1, background:C.border }} />
            </div>
            <button onClick={handleGoogleLogin} style={googleBtnStyle}><GoogleIcon />Đăng nhập bằng Google</button>
            <p style={{ textAlign:"center", fontSize:14, color:C.textDim, marginTop:20 }}>
              Chưa có tài khoản? <button onClick={()=>{setView("register");setErr("");}} style={{ background:"transparent", border:"none", color:C.gold, fontSize:14, fontWeight:600, cursor:"pointer", textDecoration:"underline", padding:0 }}>Đăng ký ngay</button>
            </p>
            {err && <p style={{ color:C.red, fontSize:12, marginTop:12, textAlign:"center" }}>⚠ {err}</p>}
          </div>
        )}

        {view === "register" && (
          <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:18, padding:"32px 28px", textAlign:"left" }}>
            <h2 style={{ fontFamily:"'Noto Serif',serif", fontSize:24, fontWeight:700, color:C.text, marginBottom:24 }}>Đăng ký</h2>
            <label style={labelStyle}>Tên hiển thị</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tên của bạn" style={{ ...inputStyle, marginBottom:18 }} />
            <label style={labelStyle}>Email</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" style={{ ...inputStyle, marginBottom:18 }} />
            <label style={labelStyle}>Mật khẩu</label>
            <div style={{ position:"relative", marginBottom:24 }}>
              <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Tối thiểu 4 ký tự" type={showPw?"text":"password"} onKeyDown={e=>e.key==="Enter"&&handleRegister()} style={{ ...inputStyle, paddingRight:42 }} />
              <button onClick={()=>setShowPw(!showPw)} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:C.textDim,fontSize:16,cursor:"pointer",padding:4 }}>{showPw?"🙈":"👁"}</button>
            </div>
            <button onClick={handleRegister} style={{ width:"100%", background:`linear-gradient(135deg, ${C.gold}, ${C.goldDark})`, border:"none", color:"#f5efe3", padding:"14px", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer", marginBottom:20 }}>Đăng ký</button>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ flex:1,height:1,background:C.border }}/><span style={{ color:C.textMuted,fontSize:12 }}>hoặc</span><div style={{ flex:1,height:1,background:C.border }}/>
            </div>
            <button onClick={handleGoogleLogin} style={googleBtnStyle}><GoogleIcon />Đăng nhập bằng Google</button>
            <p style={{ textAlign:"center",fontSize:14,color:C.textDim,marginTop:20 }}>
              Đã có tài khoản? <button onClick={()=>{setView("login");setErr("");}} style={{ background:"transparent",border:"none",color:C.gold,fontSize:14,fontWeight:600,cursor:"pointer",textDecoration:"underline",padding:0 }}>Đăng nhập</button>
            </p>
            {err && <p style={{ color:C.red,fontSize:12,marginTop:12,textAlign:"center" }}>⚠ {err}</p>}
          </div>
        )}

        {view === "admin" && (
          <div style={{ background:C.bg2, border:`1px solid rgba(139,45,45,0.25)`, borderRadius:18, padding:"32px 28px", textAlign:"left" }}>
            <h2 style={{ fontFamily:"'Noto Serif',serif", fontSize:24, fontWeight:700, color:C.red, marginBottom:24 }}>Admin Login</h2>
            <label style={labelStyle}>Tên Admin</label>
            <input value={adminName} onChange={e=>setAdminName(e.target.value)} placeholder="Admin name" style={{ ...inputStyle, marginBottom:18 }} />
            <label style={labelStyle}>Mật khẩu Admin</label>
            <input type="password" value={adminKey} onChange={e=>setAdminKey(e.target.value)} placeholder="••••••" onKeyDown={e=>e.key==="Enter"&&handleAdmin()} style={{ ...inputStyle, marginBottom:24 }} />
            <button onClick={handleAdmin} style={{ width:"100%",background:`linear-gradient(135deg,${C.red},#5c2a2a)`,border:"none",color:"#f5efe3",padding:"14px",borderRadius:12,fontSize:16,fontWeight:700,cursor:"pointer",marginBottom:16 }}>Đăng nhập Admin</button>
            <p style={{ textAlign:"center",fontSize:13,color:C.textDim }}>
              <button onClick={()=>{setView("login");setErr("");}} style={{ background:"transparent",border:"none",color:C.textDim,fontSize:13,cursor:"pointer",padding:0 }}>← Quay lại</button>
            </p>
            {err && <p style={{ color:C.red,fontSize:12,marginTop:12,textAlign:"center" }}>⚠ {err}</p>}
          </div>
        )}

        <div style={{ marginTop:28, textAlign:"center" }}>
          <p style={{ color:C.textDim, fontSize:13, marginBottom:12 }}>Cần hỗ trợ hoặc thảo luận?</p>
          <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
            <a href="#" onClick={e=>e.preventDefault()} style={{ display:"inline-flex",alignItems:"center",gap:6,background:"#4a6d8c",color:"#f5efe3",padding:"10px 22px",borderRadius:24,fontSize:13,fontWeight:600,textDecoration:"none",cursor:"pointer" }}>Facebook</a>
            <a href="#" onClick={e=>e.preventDefault()} style={{ display:"inline-flex",alignItems:"center",gap:6,background:"#6b4c6e",color:"#f5efe3",padding:"10px 22px",borderRadius:24,fontSize:13,fontWeight:600,textDecoration:"none",cursor:"pointer" }}>Discord</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// USER MANAGEMENT (Admin only)
// ═══════════════════════════════════════════════════════
function UserManagement() {
  const [users, setUsers] = useState(LS("tai-users",[]));
  const [search, setSearch] = useState("");
  const [xuEdit, setXuEdit] = useState({});
  const filtered = search ? users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) : users;
  const updateXu = (email, amt) => { const up = users.map(u => u.email===email ? {...u, xu:Math.max(0,(u.xu||0)+amt)} : u); setUsers(up); LSSet("tai-users",up); };
  const setXuDirect = (email, val) => { const up = users.map(u => u.email===email ? {...u, xu:Math.max(0,val)} : u); setUsers(up); LSSet("tai-users",up); };
  const toggleBan = (email) => { const up = users.map(u => u.email===email ? {...u,banned:!u.banned} : u); setUsers(up); LSSet("tai-users",up); };
  const deleteUser = (email) => { if(!confirm("Xóa user "+email+"?")) return; const up = users.filter(u=>u.email!==email); setUsers(up); LSSet("tai-users",up); };
  const is = { background:C.bg3, border:`1px solid ${C.border}`, borderRadius:6, padding:"5px 8px", color:C.text, fontSize:12, outline:"none", width:55 };
  return (
    <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14 }}>
        <div>
          <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:2 }}>Quản lý người dùng ({users.length})</h3>
          <p style={{ color:C.textMuted,fontSize:11 }}>Xem, chỉnh xu, cấm, xóa tài khoản</p>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm user..." style={{...is,width:150,borderRadius:8,padding:"7px 12px"}} />
      </div>
      {filtered.length===0 ? <p style={{color:C.textMuted,fontSize:13,padding:20,textAlign:"center"}}>Chưa có user</p> : (
        <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:400,overflowY:"auto" }}>
          {filtered.map((u,i)=>(
            <div key={i} style={{ display:"flex",alignItems:"center",gap:10,background:C.bg3,borderRadius:10,padding:"10px 14px",opacity:u.banned?.5:1 }}>
              <div style={{ width:34,height:34,borderRadius:"50%",background:u.method==="google"?"#4285F4":`linear-gradient(135deg,${C.gold},${C.goldDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#f5efe3",flexShrink:0 }}>{u.method==="google"?"G":(u.name?.[0]||"?").toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{ fontSize:13,fontWeight:700,color:C.text }}>{u.name} {u.banned&&<span style={{fontSize:10,color:C.red}}>CẤM</span>} <span style={{fontSize:10,color:u.method==="google"?"#4285F4":C.textMuted}}>({u.method||"email"})</span></div>
                <div style={{ fontSize:11,color:C.textDim,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.email}</div>
                <div style={{ fontSize:10,color:C.textMuted }}>Xu: <strong style={{color:C.gold}}>{u.xu||0}</strong> | Tham gia: {u.createdAt?new Date(u.createdAt).toLocaleDateString("vi-VN"):"N/A"}</div>
              </div>
              <div style={{ display:"flex",gap:4,flexShrink:0,alignItems:"center" }}>
                <button onClick={()=>updateXu(u.email,100)} style={{ background:`${C.green}20`,border:`1px solid ${C.green}40`,color:C.green,padding:"3px 8px",borderRadius:6,fontSize:10,cursor:"pointer",fontWeight:700 }}>+100</button>
                <input type="number" value={xuEdit[u.email]??""} onChange={e=>setXuEdit({...xuEdit,[u.email]:e.target.value})} placeholder={String(u.xu||0)} style={is} onKeyDown={e=>{if(e.key==="Enter"){setXuDirect(u.email,+(xuEdit[u.email]||0));setXuEdit({...xuEdit,[u.email]:""});}}} />
                <button onClick={()=>toggleBan(u.email)} style={{ background:u.banned?`${C.green}20`:"rgba(139,45,45,0.12)",border:`1px solid ${u.banned?C.green+"40":"rgba(139,45,45,0.3)"}`,color:u.banned?C.green:C.red,padding:"3px 8px",borderRadius:6,fontSize:10,cursor:"pointer" }}>{u.banned?"Mở":"Cấm"}</button>
                <button onClick={()=>deleteUser(u.email)} style={{ background:"rgba(139,45,45,0.12)",border:"1px solid rgba(139,45,45,0.3)",color:C.red,padding:"3px 6px",borderRadius:6,fontSize:10,cursor:"pointer" }}>X</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// GOOGLE CLIENT ID CONFIG (Admin only)
// ═══════════════════════════════════════════════════════
function GoogleConfig({ inputS }) {
  const [clientId, setClientId] = useState(LS("tai-google-client-id",""));
  const save = () => { LSSet("tai-google-client-id",clientId); alert("Đã lưu Google Client ID!"); };
  return (
    <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20 }}>
      <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:4 }}>Google Sign-In (tuỳ chọn)</h3>
      <p style={{ color:C.textMuted,fontSize:11,marginBottom:10 }}>Cho phép user đăng nhập bằng tài khoản Google thật</p>
      <div style={{ background:C.bg3,borderRadius:10,padding:"12px 14px",marginBottom:12,fontSize:12,color:C.textDim,lineHeight:1.7 }}>
        <div style={{fontWeight:700,color:C.gold,marginBottom:4}}>Cách lấy Google Client ID:</div>
        <div>1. Vào <span style={{color:C.gold,fontWeight:600}}>console.cloud.google.com</span></div>
        <div>2. Tạo project mới hoặc chọn project có sẵn</div>
        <div>3. Vào APIs & Services → Credentials → Create Credentials → OAuth Client ID</div>
        <div>4. Application type: Web application</div>
        <div>5. Authorized JavaScript origins: thêm <span style={{color:C.gold,fontWeight:600}}>{window.location.origin}</span></div>
        <div>6. Copy Client ID (dạng: xxxxx.apps.googleusercontent.com)</div>
      </div>
      <div style={{ display:"flex",gap:8 }}>
        <input value={clientId} onChange={e=>setClientId(e.target.value)} placeholder="xxxxx.apps.googleusercontent.com" style={{...inputS,flex:1,fontSize:11}} />
        <button onClick={save} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"8px 18px",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13 }}>Lưu</button>
      </div>
      {clientId && <p style={{ color:C.green,fontSize:11,marginTop:8 }}>Nút "Đăng nhập bằng Google" đã hoạt động</p>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// BANK CONFIG (Admin only — for QR payment)
// ═══════════════════════════════════════════════════════
const BANK_LIST = [
  {id:"970418",name:"BIDV"},{id:"970436",name:"Vietcombank"},{id:"970407",name:"Techcombank"},
  {id:"970422",name:"MBBank"},{id:"970416",name:"ACB"},{id:"970432",name:"VPBank"},
  {id:"970423",name:"TPBank"},{id:"970403",name:"Sacombank"},{id:"970437",name:"HDBank"},
  {id:"970441",name:"VIB"},{id:"970443",name:"SHB"},{id:"970431",name:"Eximbank"},
  {id:"970426",name:"MSB"},{id:"970448",name:"OCB"},{id:"970449",name:"LienVietPostBank"},
  {id:"970415",name:"VietinBank"},{id:"970454",name:"VietCapitalBank"},{id:"970429",name:"SCB"},
];

function BankConfig({ inputS }) {
  const [bank, setBank] = useState(LS("tai-bank",{bankId:"970418",accountNo:"",accountName:"",bankName:"BIDV"}));
  const save = () => { LSSet("tai-bank",bank); alert("✅ Đã lưu thông tin ngân hàng!"); };
  const upd = (k,v) => setBank(prev=>({...prev,[k]:v}));
  return (
    <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20 }}>
      <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:4 }}>🏦 Cấu hình Ngân hàng (QR Thanh toán)</h3>
      <p style={{ color:C.textMuted,fontSize:11,marginBottom:14 }}>Dùng VietQR — User quét QR để chuyển khoản nạp xu</p>
      <div style={{ display:"flex",gap:12,flexWrap:"wrap",marginBottom:12 }}>
        <div style={{ flex:"1 1 200px" }}>
          <label style={{ display:"block",fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600 }}>Ngân hàng</label>
          <select value={bank.bankId} onChange={e=>{const b=BANK_LIST.find(x=>x.id===e.target.value); upd("bankId",e.target.value); if(b) upd("bankName",b.name);}} style={{...inputS,width:"100%",boxSizing:"border-box"}}>
            {BANK_LIST.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div style={{ flex:"1 1 200px" }}>
          <label style={{ display:"block",fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600 }}>Số tài khoản</label>
          <input value={bank.accountNo} onChange={e=>upd("accountNo",e.target.value)} placeholder="VD: 96247STORYAI" style={{...inputS,width:"100%",boxSizing:"border-box"}} />
        </div>
        <div style={{ flex:"1 1 200px" }}>
          <label style={{ display:"block",fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600 }}>Tên tài khoản</label>
          <input value={bank.accountName} onChange={e=>upd("accountName",e.target.value)} placeholder="VD: NGUYEN VAN A" style={{...inputS,width:"100%",boxSizing:"border-box"}} />
        </div>
      </div>
      <div style={{ display:"flex",gap:8,alignItems:"center" }}>
        <button onClick={save} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"8px 18px",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13 }}>💾 Lưu</button>
        {bank.accountNo && (
          <span style={{ fontSize:11,color:C.green }}>✅ QR sẽ tự tạo khi user nạp xu</span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════════
function AdminPanel() {
  const [tokens, setTokens] = useState(LS("tai-tokens",[]));
  const [apiKey, setApiKey] = useState(LS("tai-apikey",""));
  const [newXu, setNewXu] = useState(DEFAULT_XU);
  const [newCount, setNewCount] = useState(1);
  const [showKey, setShowKey] = useState(false);

  const saveApiKey = () => { LSSet("tai-apikey", apiKey); alert("✅ API Key đã lưu!"); };

  const generateTokens = () => {
    const arr = [];
    for (let i=0; i<newCount; i++) {
      arr.push({ code:"TAI-"+Math.random().toString(36).substring(2,8).toUpperCase()+"-"+Date.now().toString(36).slice(-4).toUpperCase(), xu:newXu, used:false, createdAt:Date.now() });
    }
    const all = [...tokens,...arr]; setTokens(all); LSSet("tai-tokens",all);
  };

  const deleteToken = (code) => {
    const f = tokens.filter(t=>t.code!==code); setTokens(f); LSSet("tai-tokens",f);
  };

  const copyToken = (code) => {
    navigator.clipboard?.writeText(code).then(()=>alert("Đã copy: "+code));
  };

  const unused = tokens.filter(t=>!t.used), used = tokens.filter(t=>t.used);
  const inputS = { background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:14,outline:"none" };

  return (
    <div style={{ padding:"28px 20px",maxWidth:900,margin:"0 auto" }}>
      <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.gold,marginBottom:24 }}>🔑 Admin Panel</h2>

      {/* API Key Config */}
      <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20 }}>
        <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:4 }}>⚙️ Cấu hình API Key (Anthropic Claude)</h3>
        <p style={{ color:C.textMuted,fontSize:11,marginBottom:12 }}>Bắt buộc khi deploy web riêng. Nếu đang dùng trong Claude.ai thì KHÔNG cần.</p>
        
        {/* Step by step guide */}
        <div style={{ background:C.bg3,borderRadius:10,padding:"14px 16px",marginBottom:14,fontSize:12,color:C.textDim,lineHeight:1.8 }}>
          <div style={{fontWeight:700,color:C.gold,marginBottom:4,fontSize:13}}>📋 Cách lấy API Key (miễn phí thử):</div>
          <div>1️⃣ Truy cập <span style={{color:C.gold,fontWeight:600}}>console.anthropic.com</span></div>
          <div>2️⃣ Đăng ký / Đăng nhập tài khoản Anthropic</div>
          <div>3️⃣ Vào mục <span style={{color:C.gold,fontWeight:600}}>API Keys</span> → bấm <span style={{color:C.gold,fontWeight:600}}>Create Key</span></div>
          <div>4️⃣ Copy key (bắt đầu bằng <code style={{background:"rgba(200,168,78,0.1)",padding:"1px 6px",borderRadius:4,color:C.gold}}>sk-ant-api03-...</code>)</div>
          <div>5️⃣ Dán vào ô bên dưới → bấm 💾 Lưu</div>
        </div>

        <div style={{ display:"flex",gap:8 }}>
          <input type={showKey?"text":"password"} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="sk-ant-api03-xxxxxxxxxxxx..." style={{...inputS,flex:1,fontFamily:"monospace",fontSize:12}} />
          <button onClick={()=>setShowKey(!showKey)} style={{...inputS,cursor:"pointer",color:C.textDim,border:`1px solid ${C.border}` }}>{showKey?"🙈":"👁"}</button>
          <button onClick={saveApiKey} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"8px 18px",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13 }}>💾 Lưu</button>
        </div>
        {apiKey && <p style={{ color:C.green,fontSize:11,marginTop:8 }}>✅ API Key đã được cấu hình</p>}
      </div>

      {/* Bank Config for QR Payment */}
      <BankConfig inputS={inputS} />

      {/* Google Sign-In Config */}
      <GoogleConfig inputS={inputS} />

      {/* User Management */}
      <UserManagement />

      {/* Generate Tokens */}
      <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20 }}>
        <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:14 }}>🎫 Tạo Token Mới</h3>
        <div style={{ display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap" }}>
          <div>
            <label style={{ display:"block",fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600 }}>Xu kèm theo</label>
            <input type="number" value={newXu} onChange={e=>setNewXu(+e.target.value)} style={{...inputS,width:100}} />
          </div>
          <div>
            <label style={{ display:"block",fontSize:11,color:C.textDim,marginBottom:4,fontWeight:600 }}>Số lượng</label>
            <input type="number" value={newCount} onChange={e=>setNewCount(Math.max(1,+e.target.value))} style={{...inputS,width:80}} />
          </div>
          <button onClick={generateTokens} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"10px 20px",borderRadius:10,fontSize:13,fontWeight:700,cursor:"pointer" }}>✨ Tạo Token</button>
        </div>
      </div>

      {/* Unused */}
      <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20 }}>
        <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:12 }}>📋 Token Chưa Dùng ({unused.length})</h3>
        {unused.length===0?<p style={{color:C.textMuted,fontSize:13}}>Chưa có — tạo mới ở trên</p>:(
          <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:300,overflowY:"auto" }}>
            {unused.map(t=>(
              <div key={t.code} style={{ display:"flex",alignItems:"center",gap:10,background:C.bg3,borderRadius:8,padding:"10px 12px" }}>
                <code style={{ flex:1,fontSize:14,fontWeight:700,color:C.gold,letterSpacing:1 }}>{t.code}</code>
                <span style={{ fontSize:11,color:C.textDim }}>🪙 {t.xu}</span>
                <button onClick={()=>copyToken(t.code)} style={{ background:`${C.gold}20`,border:`1px solid ${C.gold}40`,color:C.gold,padding:"4px 10px",borderRadius:6,fontSize:11,cursor:"pointer",fontWeight:600 }}>📋 Copy</button>
                <button onClick={()=>deleteToken(t.code)} style={{ background:"rgba(139,45,45,0.12)",border:"1px solid rgba(139,45,45,0.3)",color:C.red,padding:"4px 8px",borderRadius:6,fontSize:11,cursor:"pointer" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Used */}
      <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20 }}>
        <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:12 }}>✅ Đã Sử Dụng ({used.length})</h3>
        {used.length===0?<p style={{color:C.textMuted,fontSize:13}}>Chưa có</p>:(
          <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:250,overflowY:"auto" }}>
            {used.map(t=>(
              <div key={t.code} style={{ display:"flex",alignItems:"center",gap:10,background:C.bg3,borderRadius:8,padding:"10px 12px",opacity:.7 }}>
                <code style={{fontSize:12,color:C.textDim}}>{t.code}</code>
                <span style={{fontSize:11,color:C.green,fontWeight:600}}>→ {t.usedBy}</span>
                <span style={{fontSize:10,color:C.textMuted,marginLeft:"auto"}}>{new Date(t.usedAt).toLocaleDateString("vi-VN")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TOP UP / NẠP XU PAGE (matching original design)
// ═══════════════════════════════════════════════════════
const XU_PACKAGES = [
  { vnd:10000, xu:90, label:"10.000 VND", save:null, icon:"🪙", tier:"" },
  { vnd:20000, xu:190, label:"20.000 VND", save:"Tiết kiệm 10 xu", icon:"🪙", tier:"" },
  { vnd:50000, xu:520, label:"50.000 VND", save:"Tiết kiệm 70 xu", icon:"🪙", tier:"" },
  { vnd:100000, xu:1100, label:"100.000 VND", save:"Tiết kiệm 200 xu", icon:"⭐", tier:"⭐" },
  { vnd:200000, xu:2300, label:"200.000 VND", save:"Tiết kiệm 500 xu", icon:"🔥", tier:"🔥" },
  { vnd:500000, xu:5800, label:"500.000 VND", save:"Tiết kiệm 1300 xu", icon:"💎", tier:"💎" },
  { vnd:1000000, xu:12500, label:"1.000.000 VND", save:"Tiết kiệm 3500 xu", icon:"👑", tier:"👑 VIP" },
];

function TopUpPage({ xu, onAddXu, user }) {
  const [tab, setTab] = useState("topup");
  const [payingPkg, setPayingPkg] = useState(null);
  const bank = LS("tai-bank", { bankId:"bidv", accountNo:"", accountName:"" });

  const tabItems = [
    { id:"profile2", label:"👤 Hồ sơ" },
    { id:"history", label:"🕐 Lịch sử xu" },
    { id:"topup", label:"💰 Nạp xu" },
    { id:"referral2", label:"🎁 Giới thiệu nhận xu" },
  ];

  const handlePay = (pkg) => {
    if (!bank.accountNo) {
      alert("Chức năng nạp xu chưa sẵn sàng. Vui lòng liên hệ Admin để được hỗ trợ!");
      return;
    }
    setPayingPkg(pkg);
  };

  const fmtNum = (n) => n.toLocaleString("vi-VN");

  return (
    <div style={{ padding:"28px 20px",maxWidth:700,margin:"0 auto" }}>
      <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:28,fontWeight:700,color:C.text,marginBottom:20 }}>Tài khoản</h2>

      {/* Tabs */}
      <div style={{ display:"flex",gap:4,borderBottom:`1px solid ${C.border}`,marginBottom:24,overflowX:"auto" }}>
        {tabItems.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:"transparent",border:"none",borderBottom:tab===t.id?`2px solid ${C.gold}`:"2px solid transparent",color:tab===t.id?C.gold:C.textDim,padding:"10px 16px",fontSize:13,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap" }}>{t.label}</button>
        ))}
      </div>

      {/* Tab: Nạp xu */}
      {tab==="topup" && (
        <>
          {/* QR Payment Modal */}
          {payingPkg && (
            <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={()=>setPayingPkg(null)}>
              <div onClick={e=>e.stopPropagation()} style={{ background:"#fff",borderRadius:16,maxWidth:700,width:"100%",overflow:"hidden",color:"#333" }}>
                <div style={{ textAlign:"center",padding:"20px 20px 10px",color:"#555",fontSize:14 }}>{user?.name || "User"}</div>
                <div style={{ display:"flex",gap:0,flexWrap:"wrap" }}>
                  {/* Left: Order info */}
                  <div style={{ flex:"1 1 220px",padding:"20px 24px",borderRight:"1px solid #eee" }}>
                    <h3 style={{ fontSize:16,fontWeight:700,color:"#222",marginBottom:16 }}>Thông tin đơn hàng</h3>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12,color:"#888",marginBottom:2 }}>Mã đơn hàng</div>
                      <div style={{ fontSize:13,fontWeight:600,color:"#4a6cf7",wordBreak:"break-all" }}>STORYAI-{Math.random().toString(16).slice(2,10)}-{Date.now()}</div>
                    </div>
                    <div style={{ marginBottom:12 }}>
                      <div style={{ fontSize:12,color:"#888",marginBottom:2 }}>Mô tả đơn hàng</div>
                      <div style={{ fontSize:13,color:"#333" }}>Nap {fmtNum(payingPkg.xu)} xu StoryAI</div>
                    </div>
                    <div>
                      <div style={{ fontSize:12,color:"#888",marginBottom:2 }}>Số tiền</div>
                      <div style={{ fontSize:22,fontWeight:700,color:"#4a6cf7" }}>{fmtNum(payingPkg.vnd)} VND</div>
                    </div>
                  </div>
                  {/* Right: QR Code */}
                  <div style={{ flex:"1 1 320px",padding:"20px 24px",textAlign:"center" }}>
                    <h3 style={{ fontSize:16,fontWeight:600,color:"#222",marginBottom:4 }}>Quét QR để thanh toán</h3>
                    <p style={{ fontSize:11,color:"#888",marginBottom:16 }}>Sử dụng ứng dụng ngân hàng/ví điện tử hỗ trợ VietQR</p>
                    {(()=>{
                      const txCode = "PAY"+Math.random().toString(36).substring(2,10).toUpperCase();
                      const qrUrl = `https://img.vietqr.io/image/${bank.bankId}-${bank.accountNo}-compact2.png?amount=${payingPkg.vnd}&addInfo=${encodeURIComponent("NAP "+payingPkg.xu+" XU "+txCode)}&accountName=${encodeURIComponent(bank.accountName)}`;
                      return (
                        <>
                          <div style={{ display:"inline-block",border:"3px dashed #4a6cf7",borderRadius:12,padding:8,marginBottom:8 }}>
                            <img src={qrUrl} alt="QR" style={{ width:200,height:200,display:"block",borderRadius:6 }}
                              onError={e=>{e.target.style.display="none"; e.target.nextSibling.style.display="flex";}} />
                            <div style={{ display:"none",width:200,height:200,alignItems:"center",justifyContent:"center",background:"#f8f8f8",borderRadius:6,flexDirection:"column",gap:8,padding:16 }}>
                              <span style={{fontSize:32}}>📱</span>
                              <span style={{fontSize:11,color:"#888",textAlign:"center"}}>QR bị chặn trong môi trường này</span>
                            </div>
                          </div>
                          <div style={{ marginBottom:16 }}>
                            <a href={qrUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:12,color:"#4a6cf7",textDecoration:"underline",cursor:"pointer" }}>
                              🔗 Mở QR trong tab mới
                            </a>
                          </div>
                        </>
                      );
                    })()}
                    <div style={{ textAlign:"left",borderTop:"1px solid #eee",paddingTop:12 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
                        <span style={{ fontSize:18 }}>🏦</span>
                        <span style={{ fontSize:13,fontWeight:600,color:"#333" }}>{bank.bankName || "Ngân hàng"}</span>
                      </div>
                      <div style={{ marginBottom:8 }}>
                        <div style={{ fontSize:11,color:"#888" }}>Số tài khoản</div>
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                          <span style={{ fontSize:14,fontWeight:700,color:"#222" }}>{bank.accountNo || "---"}</span>
                          <button onClick={()=>navigator.clipboard?.writeText(bank.accountNo)} style={{ background:"none",border:"1px solid #ddd",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontSize:12,color:"#666" }}>📋</button>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize:11,color:"#888" }}>Nội dung chuyển khoản</div>
                        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                          <span style={{ fontSize:13,fontWeight:700,color:"#222",fontFamily:"monospace" }}>NAP{payingPkg.xu}XU</span>
                          <button onClick={()=>navigator.clipboard?.writeText("NAP"+payingPkg.xu+"XU")} style={{ background:"none",border:"1px solid #ddd",borderRadius:4,padding:"2px 6px",cursor:"pointer",fontSize:12,color:"#666" }}>📋</button>
                        </div>
                      </div>
                    </div>
                    <button onClick={()=>setPayingPkg(null)} style={{ marginTop:16,background:"none",border:"none",color:"#888",fontSize:13,cursor:"pointer" }}>✕ Hủy giao dịch</button>
                  </div>
                </div>
                <div style={{ textAlign:"center",padding:"12px",borderTop:"1px solid #eee",background:"#fafafa",fontSize:11,color:"#aaa" }}>
                  Cung cấp bởi VietQR • Đối tác thanh toán
                </div>
              </div>
            </div>
          )}

          <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"24px 20px" }}>
            <h3 style={{ fontFamily:"'Noto Serif',serif",fontSize:18,fontWeight:700,color:C.gold,marginBottom:4 }}>Donate nhận xu</h3>
            <p style={{ color:C.textDim,fontSize:13,marginBottom:20 }}>Mỗi lượt chơi tốn <strong style={{color:C.text}}>{XU_PER_CHAPTER} xu</strong>. Chọn gói Donate và bấm nút thanh toán.</p>

            <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
              {XU_PACKAGES.map((pkg,i)=>{
                const isVip = pkg.vnd >= 1000000;
                const isHigh = pkg.vnd >= 200000;
                return (
                  <div key={i} onClick={()=>handlePay(pkg)}
                    style={{
                      display:"flex",alignItems:"center",padding:"16px 16px",
                      borderTop:i===0?`1px solid ${C.border}`:"none",
                      borderBottom:`1px solid ${C.border}`,
                      borderLeft:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`,
                      borderRadius:i===0?"10px 10px 0 0":i===XU_PACKAGES.length-1?"0 0 10px 10px":"0",
                      background: isVip ? "linear-gradient(135deg, rgba(200,168,78,0.08), rgba(200,168,78,0.02))" : "transparent",
                      cursor:"pointer",transition:"all .15s",
                    }}
                    onMouseEnter={e=>e.currentTarget.style.background=`${C.gold}0a`}
                    onMouseLeave={e=>e.currentTarget.style.background=isVip?"linear-gradient(135deg, rgba(200,168,78,0.08), rgba(200,168,78,0.02))":"transparent"}>
                    {/* Left: coin icon */}
                    <div style={{ width:32,height:32,borderRadius:"50%",background:C.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginRight:14,flexShrink:0 }}>₫</div>
                    {/* Middle: price + savings */}
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                        <span style={{ fontSize:15,fontWeight:700,color:C.text }}>{pkg.label}</span>
                        {pkg.tier && <span style={{ fontSize:14 }}>{pkg.tier}</span>}
                      </div>
                      {pkg.save && <div style={{ fontSize:12,color:C.green,marginTop:2 }}>{pkg.save}</div>}
                    </div>
                    {/* Right: xu amount */}
                    <div style={{ fontSize:16,fontWeight:700,color:isHigh?C.gold:C.textDim,textAlign:"right",minWidth:80 }}>
                      {fmtNum(pkg.xu)} xu
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment button */}
            <button onClick={()=>{}} style={{ width:"100%",marginTop:20,background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"14px",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer" }}>
              💳 Thanh toán
            </button>
            <p style={{ textAlign:"center",color:C.textMuted,fontSize:11,marginTop:8 }}>Bấm vào gói xu → Quét QR để thanh toán</p>
          </div>
        </>
      )}

      {/* Tab: Hồ sơ */}
      {tab==="profile2" && (
        <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:24 }}>
          <div style={{ display:"flex",alignItems:"center",gap:16,marginBottom:20 }}>
            <div style={{ width:60,height:60,borderRadius:"50%",background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"#f5efe3" }}>👤</div>
            <div>
              <div style={{ fontSize:20,fontWeight:700,color:C.text }}>{user?.name}</div>
              <div style={{ fontSize:13,color:C.textDim }}>Vai trò: {user?.isAdmin?"Admin":"Người chơi"}</div>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            <div style={{ background:C.bg3,borderRadius:10,padding:16,textAlign:"center" }}>
              <div style={{ fontSize:24,fontWeight:800,color:C.gold }}>{xu}</div>
              <div style={{ fontSize:12,color:C.textDim }}>Xu hiện có</div>
            </div>
            <div style={{ background:C.bg3,borderRadius:10,padding:16,textAlign:"center" }}>
              <div style={{ fontSize:24,fontWeight:800,color:C.text }}>{Object.keys(LS("tai-progress",{})).length}</div>
              <div style={{ fontSize:12,color:C.textDim }}>Truyện đang đọc</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Lịch sử xu */}
      {tab==="history" && (
        <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:24 }}>
          <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:16 }}>Lịch sử giao dịch xu</h3>
          <div style={{ textAlign:"center",padding:40,color:C.textMuted,fontSize:14 }}>
            <div style={{ fontSize:40,marginBottom:8 }}>📋</div>
            Lịch sử giao dịch sẽ hiển thị tại đây
          </div>
        </div>
      )}

      {/* Tab: Giới thiệu */}
      {tab==="referral2" && (
        <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:24 }}>
          <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:8 }}>🎁 Giới thiệu nhận xu</h3>
          <p style={{ color:C.textDim,fontSize:13,lineHeight:1.6 }}>Chia sẻ link website cho bạn bè. Mỗi người đăng ký qua link của bạn, bạn nhận <strong style={{color:C.gold}}>5 xu</strong> miễn phí!</p>
          <div style={{ marginTop:16,background:C.bg3,borderRadius:10,padding:"12px 16px",display:"flex",alignItems:"center",gap:8 }}>
            <code style={{ flex:1,fontSize:12,color:C.gold,wordBreak:"break-all" }}>{window.location.origin}?ref={user?.name?.toLowerCase().replace(/\s/g,"")}</code>
            <button onClick={()=>navigator.clipboard?.writeText(window.location.origin)} style={{ background:`${C.gold}20`,border:`1px solid ${C.gold}40`,color:C.gold,padding:"6px 12px",borderRadius:6,fontSize:11,cursor:"pointer",fontWeight:600,flexShrink:0 }}>📋 Copy</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CUSTOM STORY CREATOR — Tự viết câu chuyện của bạn
// ═══════════════════════════════════════════════════════
function CustomStoryPage({ xu, onSpendXu, onStartReading, onBack }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [setting, setSetting] = useState("");
  const [charName, setCharName] = useState("");
  const [charDesc, setCharDesc] = useState("");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const genres = ["Tiên Hiệp","Huyền Huyễn","Đô Thị","Mạt Thế","Fantasy","Trinh Thám","Lịch Sử","Sci-Fi","Slice of Life","Dark Fantasy","Isekai","Tự do"];
  const COST = 4;

  const generatePreview = async () => {
    if (!title.trim() || !setting.trim()) { alert("Vui lòng nhập tiêu đề và bối cảnh!"); return; }
    if (xu < COST) { alert("Cần " + COST + " xu!"); return; }
    onSpendXu(COST);
    setLoading(true);
    const prompt = `Tôi muốn tạo câu chuyện tương tác:
- Tiêu đề: "${title}"
- Thể loại: ${genre || "Tự do"}
- Bối cảnh: ${setting}
${charName ? `- Nhân vật chính: ${charName}` : ""}
${charDesc ? `- Mô tả nhân vật: ${charDesc}` : ""}
${extra ? `- Gợi ý thêm: ${extra}` : ""}

Viết chương mở đầu thật hấp dẫn cho câu chuyện này. Nhớ kết thúc bằng 3 lựa chọn cụ thể.`;
    const resp = await callAI([{ role:"user", content:prompt }]);
    const parsed = parseResponse(resp);
    setPreview({ narrative:parsed.narrative, choices:parsed.choices, prompt });
    setLoading(false);
  };

  const startStory = () => {
    const customStory = {
      id: "custom_" + Date.now(),
      title: title.trim(),
      tags: [genre || "TỰ DO"],
      desc: setting.slice(0, 150),
      plays: 0, likes: 0, icon: "✍",
      isCustom: true,
      initPrompt: preview.prompt,
      initResponse: preview.narrative,
      initChoices: preview.choices,
    };
    onStartReading(customStory, preview);
  };

  const inputS = { width:"100%", background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontSize:14, boxSizing:"border-box", outline:"none" };
  const labelS = { display:"block", color:C.textDim, fontSize:12, fontWeight:700, marginBottom:6 };

  return (
    <div style={{ padding:"28px 20px", maxWidth:700, margin:"0 auto" }}>
      <button onClick={onBack} style={{ background:C.bg2, border:`1px solid ${C.border}`, color:C.text, padding:"8px 16px", borderRadius:10, cursor:"pointer", fontSize:13, marginBottom:20 }}>← Quay lại</button>

      <h2 style={{ fontFamily:"'Noto Serif',serif", fontSize:26, fontWeight:700, color:C.gold, marginBottom:4 }}>Tạo câu chuyện của bạn</h2>
      <p style={{ color:C.textDim, fontSize:13, marginBottom:24 }}>Mô tả ý tưởng — AI sẽ viết thành tiểu thuyết tương tác</p>

      {!preview ? (
        <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, padding:"24px 20px" }}>
          <label style={labelS}>Tiêu đề câu chuyện *</label>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="VD: Kiếm Sĩ Cuối Cùng, Bí Mật Hà Nội..." style={{...inputS, marginBottom:16}} />

          <label style={labelS}>Thể loại</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
            {genres.map(g => (
              <button key={g} onClick={()=>setGenre(g)} style={{
                padding:"7px 14px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
                background: genre===g ? `${C.gold}20` : C.bg3,
                border: genre===g ? `1px solid ${C.gold}` : `1px solid ${C.border}`,
                color: genre===g ? C.gold : C.textDim,
              }}>{g}</button>
            ))}
          </div>

          <label style={labelS}>Bối cảnh thế giới *</label>
          <textarea value={setting} onChange={e=>setSetting(e.target.value)} rows={3} placeholder="Mô tả thế giới câu chuyện diễn ra. VD: Thế giới tu tiên nơi mọi người luyện kiếm, có 5 đại tông phái tranh hùng. Thời đại loạn lạc, yêu ma hoành hành..." style={{...inputS, resize:"vertical", marginBottom:16}} />

          <label style={labelS}>Tên nhân vật chính</label>
          <input value={charName} onChange={e=>setCharName(e.target.value)} placeholder="VD: Lâm Phong, Tiểu Vũ..." style={{...inputS, marginBottom:16}} />

          <label style={labelS}>Mô tả nhân vật (tuỳ chọn)</label>
          <textarea value={charDesc} onChange={e=>setCharDesc(e.target.value)} rows={2} placeholder="VD: Thiếu niên 17 tuổi, mồ côi, có sức mạnh bí ẩn bị phong ấn..." style={{...inputS, resize:"vertical", marginBottom:16}} />

          <label style={labelS}>Gợi ý / Yêu cầu thêm (tuỳ chọn)</label>
          <textarea value={extra} onChange={e=>setExtra(e.target.value)} rows={2} placeholder="VD: Tôi muốn có twist bất ngờ, nhân vật phản diện mạnh, có yếu tố tình cảm..." style={{...inputS, resize:"vertical", marginBottom:20}} />

          <div style={{ background:`${C.gold}08`, border:`1px solid ${C.gold}25`, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, color:C.textDim }}>
            <Coin size={14}/> Tạo câu chuyện tốn <strong style={{color:C.gold}}>{COST} xu</strong> · Bạn có <strong style={{color:C.gold}}>{xu} xu</strong>
          </div>

          <button onClick={generatePreview} disabled={loading || !title.trim() || !setting.trim()} style={{
            width:"100%", padding:"15px", borderRadius:12, fontSize:16, fontWeight:700, cursor: loading?"wait":"pointer",
            background: (title.trim() && setting.trim()) ? `linear-gradient(135deg,${C.gold},${C.goldDark})` : "rgba(255,255,255,0.06)",
            border:"none", color: (title.trim() && setting.trim()) ? "#111" : "rgba(255,255,255,0.25)",
          }}>
            {loading ? "AI đang viết chương mở đầu..." : `✍ Tạo câu chuyện (${COST} xu)`}
          </button>
        </div>
      ) : (
        <div>
          {/* Preview */}
          <div style={{ background:C.bg2, border:`1px solid ${C.gold}30`, borderRadius:16, padding:"24px 20px", marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <span style={{ fontSize:28 }}>✍</span>
              <div>
                <h3 style={{ fontFamily:"'Noto Serif',serif", fontSize:20, fontWeight:700, color:C.text }}>{title}</h3>
                <span style={{ fontSize:11, color:C.gold, fontWeight:600 }}>{genre || "Tự do"}</span>
              </div>
            </div>
            <div style={{ fontSize:15, lineHeight:1.9, color:C.ink, whiteSpace:"pre-wrap", marginBottom:16 }}>{preview.narrative}</div>
            <div style={{ fontSize:12, color:C.textMuted, fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:8, textAlign:"center" }}>Lựa chọn mở đầu</div>
            {preview.choices.map((c,i) => (
              <div key={i} style={{ background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", marginBottom:6, fontSize:13, color:C.text }}>
                <strong style={{color:C.gold}}>[{c.id}]</strong> {c.text}
              </div>
            ))}
          </div>

          <div style={{ display:"flex", gap:12 }}>
            <button onClick={()=>setPreview(null)} style={{ flex:"0 0 auto", background:C.bg2, border:`1px solid ${C.border}`, color:C.textDim, padding:"14px 20px", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer" }}>← Chỉnh sửa</button>
            <button onClick={startStory} style={{ flex:1, background:`linear-gradient(135deg,${C.gold},${C.goldDark})`, border:"none", color:"#f5efe3", padding:"14px", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer" }}>Bắt đầu phiêu lưu</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// CHARACTER CREATION — Roll thân phận
// ═══════════════════════════════════════════════════════
const ROLL_COST = 2;
const START_COST = 4;

const CHAR_PROMPT = `Bạn tạo nhân vật cho tiểu thuyết tương tác. Trả về JSON (KHÔNG markdown, KHÔNG backtick):
{"rank":"Tên cấp bậc/thân phận","rankDesc":"Mô tả ngắn 1 câu","stats":{"capDo":"VD: Hồn Sư - Kết Nghĩa Đồng Đội","tocDo":15,"sucManh":15,"honLuc":15,"triLuc":15,"sinhMenh":150,"theChatString":"15","voHon":"Tên Võ Hồn","honCot":"Không có hoặc tên","honHoan":"Mô tả ngắn","quanHe":"Không có hoặc tên","thanPhan":"VD: Đệ tử ngoại môn tông nhỏ","kimHonTe":9800,"huongPhatTrien":"Chưa xác định"},"skills":[{"name":"Tên kỹ năng","desc":"Mô tả ngắn"}],"items":[{"name":"Tên vật phẩm","desc":"Mô tả","qty":1}],"backstory":"Tiểu sử 2-3 câu bằng tiếng Việt"}`;

function CharacterCreation({ story, xu, onSpendXu, onStartWithChar, onBack }) {
  const [charName, setCharName] = useState("");
  const [gender, setGender] = useState("Nam");
  const [charData, setCharData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form"); // form | sheet

  const handleRoll = async () => {
    if (!charName.trim()) { alert("Nhập tên nhân vật!"); return; }
    if (xu < ROLL_COST) { alert(`Cần ${ROLL_COST} xu để roll!`); return; }
    onSpendXu(ROLL_COST);
    setLoading(true);
    const prompt = `Truyện: "${story.title}" — ${story.desc}\nTags: ${story.tags.join(", ")}\nNhân vật: ${charName.trim()}, giới tính: ${gender}\n\n${CHAR_PROMPT}`;
    const resp = await callAI([{ role: "user", content: prompt }]);
    try {
      const clean = resp.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      setCharData({ ...data, name: charName.trim(), gender });
      setStep("sheet");
    } catch {
      setCharData({
        rank: "Tân Thủ", rankDesc: "Khởi đầu từ con số không",
        stats: { capDo:"Sơ Cấp", tocDo:10+Math.floor(Math.random()*10), sucManh:10+Math.floor(Math.random()*10), honLuc:10+Math.floor(Math.random()*10), triLuc:10+Math.floor(Math.random()*10), sinhMenh:100+Math.floor(Math.random()*100), theChatString:""+(10+Math.floor(Math.random()*10)), voHon:"Chưa giác tỉnh", honCot:"Không có", honHoan:"Chưa có", quanHe:"Không có", thanPhan:"Lữ khách vô danh", kimHonTe:5000+Math.floor(Math.random()*10000), huongPhatTrien:"Chưa xác định" },
        skills: [{ name:"Bản Năng Sinh Tồn", desc:"Phản xạ tự nhiên trong nguy hiểm" }],
        items: [{ name:"Túi hành lý cũ", desc:"Đựng vài vật dụng cơ bản", qty:1 }],
        backstory: resp.slice(0, 200) || "Một kẻ vô danh bước vào thế giới mới...",
        name: charName.trim(), gender,
      });
      setStep("sheet");
    }
    setLoading(false);
  };

  const handleStart = () => {
    if (xu < START_COST) { alert(`Cần ${START_COST} xu để bắt đầu!`); return; }
    onSpendXu(START_COST);
    onStartWithChar(charData);
  };

  const g = TAGS_COLORS;
  const StatPill = ({ label, value }) => (
    <span style={{ display:"inline-flex", padding:"5px 12px", borderRadius:8, background:C.bg3, border:`1px solid ${C.border}`, fontSize:12, color:C.textDim, gap:4, marginRight:6, marginBottom:6 }}>
      <strong style={{ color:C.text }}>{label}:</strong> {value}
    </span>
  );

  return (
    <div style={{ maxWidth:700, margin:"0 auto", padding:"20px 20px 60px" }}>
      {/* Back button */}
      <button onClick={onBack} style={{ background:C.bg2,border:`1px solid ${C.border}`,color:C.text,padding:"8px 16px",borderRadius:10,cursor:"pointer",fontSize:13,marginBottom:20,display:"flex",alignItems:"center",gap:6 }}>← Quay lại</button>

      {/* Story Info */}
      <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, padding:"24px 20px", marginBottom:20 }}>
        <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:12 }}>
          {story.tags.map(t => <Tag key={t} name={t} />)}
        </div>
        <h2 style={{ fontFamily:"'Noto Serif',serif", fontSize:24, fontWeight:700, color:C.text, marginBottom:12, lineHeight:1.3 }}>{story.title}</h2>
        <p style={{ fontSize:14, color:C.textDim, lineHeight:1.7 }}>{story.desc}</p>
      </div>

      {/* Step: Form */}
      {step === "form" && (
        <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:16, padding:"24px 20px" }}>
          <h3 style={{ fontFamily:"'Noto Serif',serif", fontSize:20, fontWeight:700, color:C.text, marginBottom:20, display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:22 }}>🎲</span> Roll thân phận
          </h3>

          <label style={{ display:"block", color:C.textDim, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Tên nhân vật</label>
          <input value={charName} onChange={e => setCharName(e.target.value)} placeholder="Nhập tên nhân vật..." style={{ width:"100%", background:C.bg3, border:`1px solid ${C.border}`, borderRadius:10, padding:"13px 14px", color:C.text, fontSize:14, boxSizing:"border-box", outline:"none", marginBottom:18 }} />

          <label style={{ display:"block", color:C.textDim, fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Giới tính</label>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            {["Nam","Nữ","Khác"].map(g => (
              <button key={g} onClick={() => setGender(g)} style={{
                padding:"9px 24px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", transition:"all .2s",
                background: gender===g ? `linear-gradient(135deg,${C.gold},${C.goldDark})` : C.bg3,
                border: gender===g ? "none" : `1px solid ${C.border}`,
                color: gender===g ? "#111" : C.textDim,
              }}>{g}</button>
            ))}
          </div>

          <div style={{ background:`${C.gold}08`, border:`1px solid ${C.gold}25`, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, color:C.textDim }}>
            🔗 Roll tốn <strong style={{color:C.gold}}>{ROLL_COST} xu</strong>/lần · Không giới hạn · Bạn có <strong style={{color:C.gold}}>{xu} xu</strong>
          </div>

          <button onClick={handleRoll} disabled={loading || !charName.trim()} style={{
            width:"100%", padding:"15px", borderRadius:12, fontSize:16, fontWeight:700, cursor:loading?"wait":"pointer",
            background: charName.trim() ? `linear-gradient(135deg,${C.gold},${C.goldDark})` : "rgba(255,255,255,0.06)",
            border:"none", color: charName.trim() ? "#111" : "rgba(255,255,255,0.25)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:8,
          }}>
            {loading ? (
              <><span style={{ display:"inline-block", width:16, height:16, border:"2px solid #111", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .8s linear infinite" }} /> Đang roll...</>
            ) : (
              <>🎲 Roll thân phận ({ROLL_COST} xu)</>
            )}
          </button>
        </div>
      )}

      {/* Step: Character Sheet */}
      {step === "sheet" && charData && (
        <>
          {/* Rank Banner */}
          <div style={{ background:"linear-gradient(135deg, rgba(74,103,65,0.15), rgba(74,103,65,0.08))", border:`1px solid rgba(74,103,65,0.25)`, borderRadius:16, padding:"28px 20px", textAlign:"center", marginBottom:16 }}>
            <div style={{ fontSize:36, marginBottom:6 }}>🛡</div>
            <h3 style={{ fontFamily:"'Noto Serif',serif", fontSize:22, fontWeight:700, color:"#4a6741", marginBottom:6 }}>{charData.rank}</h3>
            <p style={{ fontSize:13, color:C.textDim }}>{charData.rankDesc}</p>
          </div>

          {/* Name & Gender */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"0 4px" }}>
            <span style={{ fontSize:18 }}>👤</span>
            <span style={{ fontSize:18, fontWeight:700, color:C.text }}>{charData.name}</span>
            <span style={{ padding:"2px 10px", borderRadius:6, background:C.bg3, border:`1px solid ${C.border}`, fontSize:11, color:C.textDim }}>{charData.gender}</span>
          </div>

          {/* Stats */}
          <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 16px 10px", marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>Chỉ số ban đầu</div>
            <div style={{ display:"flex", flexWrap:"wrap" }}>
              <StatPill label="Cấp Độ" value={charData.stats.capDo} />
              <StatPill label="Tốc Độ" value={charData.stats.tocDo} />
              <StatPill label="Võ Hồn" value={charData.stats.voHon} />
              <StatPill label="Hồn Cốt" value={charData.stats.honCot} />
              <StatPill label="Hồn Lực" value={charData.stats.honLuc} />
              <StatPill label="Quan Hệ" value={charData.stats.quanHe} />
              <StatPill label="Trí Lực" value={charData.stats.triLuc} />
              <StatPill label="Hồn Hoàn" value={charData.stats.honHoan} />
              <StatPill label="Sức Mạnh" value={charData.stats.sucManh} />
              <StatPill label="Thể Chất" value={charData.stats.theChatString} />
              <StatPill label="Sinh Mệnh" value={charData.stats.sinhMenh} />
              <StatPill label="Thân Phận" value={charData.stats.thanPhan} />
              <StatPill label="Kim Hồn Tệ" value={(charData.stats.kimHonTe||0).toLocaleString("vi-VN")} />
              <StatPill label="Hướng Phát Triển" value={charData.stats.huongPhatTrien} />
            </div>
          </div>

          {/* Skills */}
          <div style={{ marginBottom:16, padding:"0 4px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
              <span>⚔</span> Kỹ Năng <span style={{ background:C.bg3, borderRadius:6, padding:"1px 8px", fontSize:11, color:C.textDim }}>{charData.skills?.length||0}</span>
            </div>
            {(charData.skills||[]).map((sk,i) => (
              <div key={i} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:12, borderLeft:`3px solid ${C.gold}` }}>
                <span style={{ fontSize:14, fontWeight:700, color:C.gold }}>{sk.name}</span>
                <span style={{ fontSize:12, color:C.textDim }}>{sk.desc}</span>
              </div>
            ))}
          </div>

          {/* Items */}
          <div style={{ marginBottom:16, padding:"0 4px" }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.text, marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
              <span>🎒</span> Hành Trang <span style={{ background:C.bg3, borderRadius:6, padding:"1px 8px", fontSize:11, color:C.textDim }}>{charData.items?.length||0}</span>
            </div>
            {(charData.items||[]).map((it,i) => (
              <div key={i} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", marginBottom:6, display:"flex", alignItems:"center", gap:12, borderLeft:"3px solid #6b4c6e" }}>
                <span style={{ fontSize:14, fontWeight:700, color:"#6b4c6e" }}>{it.name}</span>
                <span style={{ fontSize:12, color:C.textDim, flex:1 }}>{it.desc}</span>
                {it.qty > 1 && <span style={{ background:C.bg3, borderRadius:6, padding:"2px 8px", fontSize:11, color:C.gold }}>x{it.qty}</span>}
              </div>
            ))}
          </div>

          {/* Backstory */}
          <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 18px", marginBottom:24 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Tiểu sử</div>
            <p style={{ fontSize:14, color:C.textDim, lineHeight:1.7 }}>{charData.backstory}</p>
          </div>

          {/* Action Buttons */}
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={() => { setStep("form"); setCharData(null); }} style={{
              flex:"0 0 auto", background:C.bg2, border:`1px solid ${C.border}`, color:C.textDim,
              padding:"14px 20px", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer",
              display:"flex", alignItems:"center", gap:6,
            }}>🔄 Roll lại ({ROLL_COST} xu)</button>
            <button onClick={handleStart} style={{
              flex:1, background:`linear-gradient(135deg,${C.gold},${C.goldDark})`, border:"none", color:"#f5efe3",
              padding:"14px", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
            }}>⚔ Khởi tạo chương đầu ({START_COST} xu)</button>
          </div>
        </>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// STORY READER
// ═══════════════════════════════════════════════════════
function StoryReader({ story, onBack, onReset, xu, onSpendXu, savedData, onSave, charData }) {
  const [segments, setSegments] = useState(savedData?.segments||[]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState(savedData?.history||[]);
  const [chapter, setChapter] = useState(savedData?.chapter||1);
  const [customInput, setCustomInput] = useState("");
  const scrollRef = useRef(null);

  const doSave = useCallback((s,h,c) => {
    onSave(story.id,{segments:s,history:h,chapter:c,title:story.title,lastPlayed:Date.now(),charData});
  },[story,onSave,charData]);

  const startStory = useCallback(async()=>{
    if(savedData?.segments?.length) return;
    setLoading(true);
    let charContext = "";
    if (charData) {
      charContext = `\nNhân vật: ${charData.name} (${charData.gender}), ${charData.rank}. Võ Hồn: ${charData.stats?.voHon||"Chưa rõ"}. Kỹ năng: ${(charData.skills||[]).map(s=>s.name).join(", ")||"Chưa có"}.`;
    }
    const p = `Bắt đầu câu chuyện "${story.title}": ${story.desc.slice(0,200)}. Tags: ${story.tags.join(",")}.${charContext}\n\nViết chương mở đầu.`;
    const msgs = [{role:"user",content:p}];
    
    // Thử gọi API, nếu lỗi thì retry 1 lần với prompt ngắn hơn
    let resp = await callAI(msgs);
    if (resp.startsWith("⚠") || resp.startsWith("Lỗi")) {
      const shortMsgs = [{role:"user",content:`Viết chương mở đầu cho truyện "${story.title}". Tags: ${story.tags.join(",")}. Bối cảnh: ${story.desc.slice(0,100)}.`}];
      resp = await callAI(shortMsgs);
    }
    
    const parsed = parseResponse(resp);
    const h = [...msgs,{role:"assistant",content:resp}];
    setHistory(h); setSegments([parsed]); doSave([parsed],h,1);
    setLoading(false);
  },[story,savedData,doSave,charData]);

  useEffect(()=>{startStory();},[startStory]);
  useEffect(()=>{scrollRef.current?.scrollTo({top:scrollRef.current.scrollHeight,behavior:"smooth"});},[segments,loading]);

  const handleChoice = async(choice) => {
    if(xu<XU_PER_CHAPTER){alert(`Cần ${XU_PER_CHAPTER} xu để tiếp tục!`);return;}
    onSpendXu(XU_PER_CHAPTER);
    setCustomInput("");
    setLoading(true);
    const nc=chapter+1; setChapter(nc);
    const newMsgs = [...history,{role:"user",content:`Tôi chọn: "${choice.text}". Tiếp tục câu chuyện.`}];
    let resp = await callAI(newMsgs);
    // Nếu lỗi, retry với lịch sử ngắn hơn
    if (resp.startsWith("⚠") || resp.startsWith("Lỗi")) {
      const lastSeg = segments.filter(s=>s.narrative).pop();
      const shortMsgs = [
        {role:"user",content:`Truyện "${story.title}". Đoạn gần nhất: "${(lastSeg?.narrative||"").slice(0,300)}..." Người chơi chọn: "${choice.text}". Viết tiếp.`}
      ];
      resp = await callAI(shortMsgs);
    }
    const parsed = parseResponse(resp);
    const h = [...newMsgs,{role:"assistant",content:resp}];
    const s = [...segments,{chosenText:choice.text,chosenId:choice.id},parsed];
    setHistory(h); setSegments(s); doSave(s,h,nc);
    setLoading(false);
  };

  const choiceStyles = [
    {bg:`${C.accent}06`,border:`${C.accent}25`,hover:`${C.accent}12`,badge:`linear-gradient(135deg,${C.accent},${C.ink})`,badgeC:"#f5efe3"},
    {bg:"rgba(139,45,45,0.06)",border:"rgba(139,45,45,0.2)",hover:"rgba(139,45,45,0.1)",badge:"linear-gradient(135deg,#8b2d2d,#5c2a2a)",badgeC:"#f5efe3"},
    {bg:"rgba(74,103,65,0.06)",border:"rgba(74,103,65,0.2)",hover:"rgba(74,103,65,0.1)",badge:"linear-gradient(135deg,#4a6741,#3d5636)",badgeC:"#f5efe3"},
  ];

  return (
    <div style={{ maxWidth:720,margin:"0 auto",display:"flex",flexDirection:"column",height:"calc(100vh - 48px)",position:"relative",overflow:"hidden" }}>
      <div style={{ padding:"12px 20px",display:"flex",alignItems:"center",gap:12,borderBottom:`1px solid ${C.border}`,flexShrink:0 }}>
        <button onClick={onBack} style={{ background:C.bg2,border:`1px solid ${C.border}`,color:C.text,width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center" }}>←</button>
        <button onClick={()=>{if(confirm("Bắt đầu lại truyện này?"))onReset(story);}} title="Bắt đầu lại" style={{ background:C.bg2,border:`1px solid ${C.border}`,color:C.textDim,width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center" }}>↻</button>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontFamily:"'Noto Serif',serif",fontSize:16,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{story.title}</div>
          <div style={{ display:"flex",gap:4,marginTop:2,flexWrap:"wrap",alignItems:"center" }}>
            {story.tags.slice(0,3).map(t=><Tag key={t} name={t}/>)}
            <span style={{ fontSize:10,color:C.textMuted }}>Chương {chapter}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}><div style={{fontSize:12,color:C.gold,fontWeight:700}}>Xu: {xu}</div><div style={{fontSize:9,color:C.textMuted}}>-{XU_PER_CHAPTER}/chuong</div></div>
      </div>
      <div ref={scrollRef} style={{ flex:1,overflowY:"auto",padding:"20px 20px 32px" }}>
        {segments.map((seg,i) => {
          if(seg.chosenText) return (
            <div key={i} style={{ display:"flex",justifyContent:"flex-end",marginBottom:14 }}>
              <div style={{ background:`${C.gold}12`,border:`1px solid ${C.gold}30`,borderRadius:"14px 14px 4px 14px",padding:"10px 16px",maxWidth:"80%",fontSize:13,color:C.gold,fontWeight:600 }}>➤ {seg.chosenText}</div>
            </div>
          );
          return (
            <div key={i} style={{ marginBottom:20 }}>
              <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px",marginBottom:14 }}>
                <div style={{ fontSize:15,lineHeight:1.9,color:C.ink,whiteSpace:"pre-wrap" }}>{seg.narrative}</div>
              </div>
              {i===segments.length-1 && !loading && seg.choices && (
                <div>
                  <div style={{ textAlign:"center",fontSize:11,color:C.textMuted,fontWeight:700,textTransform:"uppercase",letterSpacing:2,marginBottom:10 }}>⚡ Lựa chọn của bạn</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                    {seg.choices.map((c,ci) => {
                      const s = choiceStyles[ci]||choiceStyles[0];
                      return (
                        <button key={ci} onClick={()=>handleChoice(c)} style={{ background:s.bg,border:`1.5px solid ${s.border}`,borderRadius:12,padding:"14px 16px",color:C.text,fontSize:14,textAlign:"left",cursor:"pointer",display:"flex",alignItems:"center",gap:12,fontWeight:500,lineHeight:1.5,transition:"all .2s" }}
                          onMouseEnter={e=>{e.currentTarget.style.background=s.hover;e.currentTarget.style.transform="translateX(4px)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background=s.bg;e.currentTarget.style.transform="";}}>
                          <span style={{ width:30,height:30,borderRadius:8,background:s.badge,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:s.badgeC,flexShrink:0 }}>{c.id}</span>
                          <span style={{flex:1}}>{c.text}</span>
                          <span style={{fontSize:10,color:C.textMuted,flexShrink:0}}>⚡ {XU_PER_CHAPTER}</span>
                        </button>
                      );
                    })}
                  </div>
                  {xu<XU_PER_CHAPTER&&(<div style={{ marginTop:10,textAlign:"center",padding:12,background:"rgba(139,45,45,0.1)",border:"1px solid rgba(139,45,45,0.25)",borderRadius:10 }}><span style={{color:C.red,fontSize:13,fontWeight:600}}>⚠ Hết xu! Vui lòng nạp thêm</span></div>)}
                  {/* Custom action input */}
                  <div style={{ marginTop:14,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px" }}>
                    <div style={{ fontSize:11,color:C.textMuted,marginBottom:6,fontWeight:600 }}>✍ Hoặc tự viết hành động / gợi ý cho AI:</div>
                    <div style={{ display:"flex",gap:8 }}>
                      <input value={customInput} onChange={e=>setCustomInput(e.target.value)} placeholder="VD: Tôi muốn nói chuyện với lão nhân bí ẩn bên cạnh..." onKeyDown={e=>{if(e.key==="Enter"&&customInput.trim())handleChoice({id:"D",text:customInput.trim()});}} style={{ flex:1,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,outline:"none",boxSizing:"border-box" }} />
                      <button onClick={()=>{if(customInput.trim())handleChoice({id:"D",text:customInput.trim()});}} disabled={!customInput.trim()} style={{ background:customInput.trim()?`linear-gradient(135deg,${C.gold},${C.goldDark})`:"rgba(255,255,255,0.06)",border:"none",color:customInput.trim()?"#111":"rgba(255,255,255,0.25)",padding:"10px 16px",borderRadius:8,fontSize:13,fontWeight:700,cursor:customInput.trim()?"pointer":"not-allowed",whiteSpace:"nowrap" }}>Gửi</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {loading&&(<div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 0"}}><span style={{fontSize:12,color:C.textDim}}>AI đang viết</span>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.gold,animation:`dotBounce 1.2s ${i*.15}s infinite`}}/>)}</div>)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PLACEHOLDER
// ═══════════════════════════════════════════════════════
function Placeholder({icon,title,desc}) {
  return <div style={{padding:"60px 20px",textAlign:"center",maxWidth:500,margin:"0 auto"}}><div style={{fontSize:56,marginBottom:12}}>{icon}</div><h2 style={{fontFamily:"'Noto Serif',serif",fontSize:24,fontWeight:700,color:C.text,marginBottom:8}}>{title}</h2><p style={{color:C.textDim,fontSize:14,lineHeight:1.6}}>{desc}</p></div>;
}

// ═══════════════════════════════════════════════════════
// PROFILE PAGE
// ═══════════════════════════════════════════════════════
function ProfilePage({ user, xu }) {
  const progress = LS("tai-progress",{});
  const streak = LS("tai-streak",0);
  const storiesCount = Object.keys(progress).length;
  const totalChapters = Object.values(progress).reduce((sum,p)=>sum+(p.chapter||0),0);
  const stat = (icon,label,value,color) => (
    <div style={{ background:C.bg3,borderRadius:12,padding:"18px 14px",textAlign:"center" }}>
      <div style={{ fontSize:24,marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:22,fontWeight:800,color:color||C.gold }}>{value}</div>
      <div style={{ fontSize:11,color:C.textDim,marginTop:2 }}>{label}</div>
    </div>
  );
  return (
    <div style={{ padding:"28px 20px",maxWidth:700,margin:"0 auto" }}>
      <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:24 }}>Hồ sơ & Thống kê</h2>
      <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:16,padding:"24px 20px",marginBottom:20,display:"flex",alignItems:"center",gap:16 }}>
        <AvatarWithFrame size={64} fontSize={28} />
        <div style={{flex:1}}>
          <div style={{ fontSize:20,fontWeight:700,color:C.text,display:"flex",alignItems:"center" }}>{user?.name}<TitleBadge /></div>
          <div style={{ fontSize:13,color:C.textDim }}>{user?.email||"player@truyenai.vn"}</div>
          <div style={{ fontSize:12,color:C.gold,marginTop:4 }}>{user?.isAdmin?"Admin":"Người chơi"} {new Date(user?.createdAt||Date.now()).toLocaleDateString("vi-VN")}</div>
          {(()=>{
            const eq=getEquipped();const parts=[];
            if(eq.frame){const f=eq.frame.replace("frame_","");parts.push("Khung: "+f);}
            if(eq.title&&TITLE_DATA[eq.title])parts.push("Danh hiệu: "+TITLE_DATA[eq.title].text);
            if(eq.fx&&FX_DATA[eq.fx])parts.push("Hiệu ứng: "+FX_DATA[eq.fx].name);
            return parts.length>0?<div style={{fontSize:11,color:C.textDim,marginTop:4}}>Trang bị: {parts.join(" | ")}</div>:null;
          })()}
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:12,marginBottom:20 }}>
        {stat("🪙","Xu hiện có",xu)}
        {stat("📖","Truyện đang đọc",storiesCount,C.text)}
        {stat("📑","Tổng chương đã đọc",totalChapters,C.text)}
        {stat("🔥","Chuỗi đăng nhập",streak+" ngày","#e74c3c")}
      </div>
      <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20 }}>
        <h3 style={{ fontSize:15,fontWeight:700,color:C.text,marginBottom:12 }}>📖 Truyện gần đây</h3>
        {storiesCount===0?<p style={{color:C.textMuted,fontSize:13}}>Chưa đọc truyện nào</p>:(
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {Object.entries(progress).slice(0,5).map(([id,d])=>{
              const s = STORIES.find(x=>x.id===id);
              return s && (
                <div key={id} style={{ display:"flex",alignItems:"center",gap:10,background:C.bg3,borderRadius:10,padding:"10px 14px" }}>
                  <span style={{fontSize:22}}>{s.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{ fontSize:13,fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.title}</div>
                    <div style={{ fontSize:11,color:C.textDim }}>Chương {d.chapter} • {new Date(d.lastPlayed).toLocaleDateString("vi-VN")}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MISSIONS PAGE
// ═══════════════════════════════════════════════════════
function MissionsPage({ xu, onAddXu }) {
  const streak = LS("tai-streak",0);
  const today = getTodayStr();
  const dailyClaimed = LS("tai-lastDaily","") === today;
  const [claimed, setClaimed] = useState(LS("tai-mclaim-"+today,[]));
  const progress = LS("tai-progress",{});
  const totalCh = Object.values(progress).reduce((s,p)=>s+(p.chapter||0),0);

  const missions = [
    { id:"daily", icon:"📅", title:"Đăng nhập hang ngay", desc:"Tự động nhận khi đăng nhập", reward:DAILY_BONUS, done:dailyClaimed, auto:true },
    { id:"read3", icon:"📖", title:"Đọc 3 chương", desc:`Đã đọc ${totalCh} chuong`, reward:20, done:totalCh>=3, auto:false },
    { id:"newstory", icon:"🌍", title:"Bắt đầu truyện mới", desc:`Đã thử ${Object.keys(progress).length} thế giới`, reward:15, done:Object.keys(progress).length>=1, auto:false },
    { id:"streak3", icon:"🔥", title:`Chuỗi 3 ngay (${Math.min(streak,3)}/3)`, desc:"Đăng nhập 3 ngày liên tiếp", reward:50, done:streak>=3, auto:false },
    { id:"streak7", icon:"💎", title:`Chuỗi 7 ngay (${Math.min(streak,7)}/7)`, desc:"Đăng nhập 7 ngày liên tiếp", reward:200, done:streak>=7, auto:false },
  ];

  const claimMission = (m) => {
    if (claimed.includes(m.id)) return;
    const next = [...claimed, m.id];
    setClaimed(next);
    LSSet("tai-mclaim-"+today, next);
    onAddXu(m.reward);
  };

  return (
    <div style={{ padding:"28px 20px",maxWidth:700,margin:"0 auto" }}>
      <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:4 }}>Nhiệm vụ nhận xu</h2>
      <p style={{ color:C.textDim,fontSize:13,marginBottom:24 }}>Hoan thanh nhiem vu de nhan xu mien phi</p>
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {missions.map(m=>{
          const isClaimed = m.auto ? m.done : claimed.includes(m.id);
          const canClaim = m.done && !m.auto && !claimed.includes(m.id);
          return (
            <div key={m.id} style={{ background:C.bg2,border:`1px solid ${canClaim?C.gold+"50":isClaimed?C.green+"40":C.border}`,borderRadius:14,padding:"16px 18px",display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ width:44,height:44,borderRadius:12,background:C.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{m.icon}</div>
              <div style={{flex:1}}>
                <div style={{ fontSize:14,fontWeight:700,color:C.text }}>{m.title}</div>
                <div style={{ fontSize:12,color:C.textDim,marginTop:2 }}>{m.desc}</div>
              </div>
              <div style={{ textAlign:"right",flexShrink:0 }}>
                {isClaimed ? (
                  <span style={{ background:`${C.green}20`,color:C.green,padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:700 }}>Đã nhận</span>
                ) : canClaim ? (
                  <button onClick={()=>claimMission(m)} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4 }}>
                    <Coin size={14}/> Nhan +{m.reward}
                  </button>
                ) : (
                  <div style={{ color:C.gold,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:4 }}>
                    <Coin size={12}/> +{m.reward}
                    {!m.done && <div style={{ fontSize:9,color:C.textMuted,marginTop:2 }}>...</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// NOTIFICATIONS PAGE — with read tracking
// ═══════════════════════════════════════════════════════
function NotifPage() {
  const [readIds, setReadIds] = useState(LS("tai-notifRead",[]));
  const allNotifs = [
    { id:1, icon:"🎉", title:"Chào mừng đến TruyệnAI!", desc:"Bạn nhận được 100 xu khởi đầu. Bắt đầu phiêu lưu ngay!", time:"Hôm nay" },
    { id:2, icon:"🆕", title:"Truyện mới: Kẻ Truy Đuổi Bóng Đêm", desc:"Thể loại Trinh Thám x Đô Thị đã ra mắt.", time:"Hôm nay" },
    { id:3, icon:"🔥", title:"Sự kiện: Tuần lễ đọc truyện", desc:"Đọc 5 chương bất kỳ trong tuần để nhận 200 xu bonus!", time:"Hôm qua" },
    { id:4, icon:"💡", title:"Meo: Đăng nhập moi ngay", desc:`Đăng nhập hang ngay để nhận xu miễn phí`, time:"2 ngày trước" },
    { id:5, icon:"⚙️", title:"Cập nhật hệ thống", desc:"Cải thiện tốc độ AI, thêm thể loại Trinh Thám và Lịch Sử", time:"3 ngày trước" },
  ];

  const markRead = (id) => {
    if (readIds.includes(id)) return;
    const next = [...readIds, id];
    setReadIds(next);
    LSSet("tai-notifRead", next);
  };

  const markAllRead = () => {
    const all = allNotifs.map(n=>n.id);
    setReadIds(all);
    LSSet("tai-notifRead", all);
  };

  const unreadCount = allNotifs.filter(n=>!readIds.includes(n.id)).length;

  return (
    <div style={{ padding:"28px 20px",maxWidth:700,margin:"0 auto" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.text }}>Thông báo</h2>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ background:`${C.gold}15`,border:`1px solid ${C.gold}30`,color:C.gold,padding:"6px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer" }}>Doc tat ca ({unreadCount})</button>
        )}
      </div>
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {allNotifs.map(n=>{
          const unread = !readIds.includes(n.id);
          return (
            <div key={n.id} onClick={()=>markRead(n.id)} style={{ background:C.bg2,border:`1px solid ${unread?C.gold+"30":C.border}`,borderRadius:14,padding:"14px 18px",display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",transition:"all .2s" }}>
              <div style={{ width:40,height:40,borderRadius:10,background:unread?`${C.gold}12`:C.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>{n.icon}</div>
              <div style={{flex:1}}>
                <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                  <span style={{ fontSize:14,fontWeight:unread?700:500,color:unread?C.text:C.textDim }}>{n.title}</span>
                  {unread && <span style={{ width:7,height:7,borderRadius:"50%",background:C.gold,flexShrink:0 }}/>}
                </div>
                <div style={{ fontSize:12,color:C.textDim,marginTop:3,lineHeight:1.5 }}>{n.desc}</div>
                <div style={{ fontSize:10,color:C.textMuted,marginTop:4 }}>{n.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SHOP PAGE
// ═══════════════════════════════════════════════════════
function ShopPage({ xu, onSpendXu }) {
  const [tab, setTab] = useState("all");
  const items = [
    // Khung avatar
    { id:"frame_gold", icon:"gold-frame", name:"Khung Hoàng Kim", desc:"Khung avatar viền vàng rực rỡ", price:300, cat:"Khung Avatar", rarity:"rare" },
    { id:"frame_dragon", icon:"dragon-frame", name:"Khung Long Vương", desc:"Rồng cuộn quanh avatar", price:800, cat:"Khung Avatar", rarity:"epic" },
    { id:"frame_fire", icon:"fire-frame", name:"Khung Hỏa Diễm", desc:"Ngọn lửa bùng cháy bao quanh", price:600, cat:"Khung Avatar", rarity:"rare" },
    // Danh hiệu
    { id:"title_hero", icon:"title", name:"Anh Hùng", desc:"Danh hiệu hiện bên cạnh tên", price:200, cat:"Danh Hiệu", rarity:"common" },
    { id:"title_king", icon:"title", name:"Bá Vương", desc:"Danh hiệu dành cho kẻ mạnh", price:500, cat:"Danh Hiệu", rarity:"rare" },
    { id:"title_immortal", icon:"title", name:"Tiên Nhân", desc:"Danh hiệu tu tiên tối thượng", price:1200, cat:"Danh Hiệu", rarity:"legendary" },
    // Hiệu ứng đọc
    { id:"fx_sparkle", icon:"fx", name:"Lấp Lánh", desc:"Hiệu ứng ánh sao khi lật trang", price:250, cat:"Hiệu Ứng", rarity:"common" },
    { id:"fx_thunder", icon:"fx", name:"Sấm Sét", desc:"Tia chớp khi chọn lựa mạo hiểm", price:400, cat:"Hiệu Ứng", rarity:"rare" },
    { id:"fx_sakura", icon:"fx", name:"Hoa Đào", desc:"Cánh hoa rơi khi đọc ngôn tình", price:350, cat:"Hiệu Ứng", rarity:"rare" },
    // Xu boost
    { id:"boost_daily2x", icon:"boost", name:"x2 Xu Hàng Ngày", desc:"Nhận gấp đôi xu đăng nhập trong 7 ngày", price:400, cat:"Buff", rarity:"rare" },
    { id:"boost_save50", icon:"boost", name:"Tiết Kiệm 50%", desc:"Giảm 50% xu mỗi chương trong 24h", price:600, cat:"Buff", rarity:"epic" },
    // Vé đặc biệt
    { id:"ticket_reroll", icon:"ticket", name:"Vé Roll Miễn Phí", desc:"Roll thân phận 1 lần không tốn xu", price:150, cat:"Vé", rarity:"common" },
    { id:"ticket_bonus_ch", icon:"ticket", name:"Vé Chương Bonus", desc:"Mở 1 chương miễn phí", price:180, cat:"Vé", rarity:"common" },
  ];
  const cats = ["all","Khung Avatar","Danh Hiệu","Hiệu Ứng","Buff","Vé"];
  const rarityColor = { common:C.textDim, rare:"#3b82f6", epic:"#a855f7", legendary:C.gold };
  const rarityLabel = { common:"Thường", rare:"Hiếm", epic:"Sử thi", legendary:"Huyền thoại" };
  const iconMap = { "gold-frame":"🖼", "dragon-frame":"🐲", "fire-frame":"🔥", "title":"🏷", "fx":"💫", "boost":"🚀", "ticket":"🎟" };
  const [owned, setOwned] = useState(LS("tai-owned",[]));
  const filtered = tab==="all" ? items : items.filter(i=>i.cat===tab);
  const buy = (item) => {
    if(xu<item.price){alert("Không đủ xu!");return;}
    if(owned.includes(item.id)){alert("Đã sở hữu!");return;}
    onSpendXu(item.price);
    const n=[...owned,item.id]; setOwned(n); LSSet("tai-owned",n);
  };
  return (
    <div style={{ padding:"28px 20px",maxWidth:800,margin:"0 auto" }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:4 }}>Cửa hàng</h2>
          <p style={{ color:C.textDim,fontSize:13 }}>Khung avatar, danh hiệu, hiệu ứng và buff</p>
        </div>
        <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 16px",fontSize:14,fontWeight:700,color:C.gold }}>Xu: {xu}</div>
      </div>
      {/* Category tabs */}
      <div style={{ display:"flex",gap:4,overflowX:"auto",marginBottom:20,paddingBottom:4 }}>
        {cats.map(c=>(
          <button key={c} onClick={()=>setTab(c)} style={{ padding:"7px 14px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",
            background:tab===c?`${C.gold}18`:"transparent", border:tab===c?`1px solid ${C.gold}40`:`1px solid ${C.border}`, color:tab===c?C.gold:C.textDim }}>{c==="all"?"Tất cả":c}</button>
        ))}
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14 }}>
        {filtered.map(it=>{
          const isOwned = owned.includes(it.id);
          const rc = rarityColor[it.rarity]; const rl = rarityLabel[it.rarity];
          return (
            <div key={it.id} style={{ background:C.bg2,border:`1px solid ${isOwned?C.green+"40":C.border}`,borderRadius:14,padding:"16px 14px",textAlign:"center",position:"relative",transition:"all .2s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=rc+"60"} onMouseLeave={e=>e.currentTarget.style.borderColor=isOwned?C.green+"40":C.border}>
              <div style={{ position:"absolute",top:8,right:8,fontSize:9,fontWeight:700,color:rc,background:rc+"15",padding:"2px 8px",borderRadius:6,textTransform:"uppercase" }}>{rl}</div>
              <div style={{ fontSize:32,marginBottom:6 }}>{iconMap[it.icon]||it.icon}</div>
              <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:2 }}>{it.name}</div>
              <div style={{ fontSize:10,color:rc,marginBottom:4 }}>{it.cat}</div>
              <div style={{ fontSize:11,color:C.textDim,marginBottom:12,minHeight:28 }}>{it.desc}</div>
              {isOwned?(
                <div style={{ background:`${C.green}15`,color:C.green,padding:"7px",borderRadius:8,fontSize:12,fontWeight:700 }}>Đã sở hữu</div>
              ):(
                <button onClick={()=>buy(it)} style={{ width:"100%",background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"8px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer" }}>{it.price} xu</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// INVENTORY PAGE — expanded
// ═══════════════════════════════════════════════════════
function InventoryPage() {
  const [owned, setOwned] = useState(LS("tai-owned",[]));
  const [equipped, setEquipped] = useState(LS("tai-equipped",{ frame:null, title:null, fx:null }));
  const allItems = {
    frame_gold:{icon:"🖼",name:"Khung Hoang Kim",cat:"Khung Avatar",desc:"Viền vàng rực rỡ"},
    frame_dragon:{icon:"🐲",name:"Khung Long Vuong",cat:"Khung Avatar",desc:"Rồng cuộn quanh avatar"},
    frame_fire:{icon:"🔥",name:"Khung Hoa Diem",cat:"Khung Avatar",desc:"Lửa bao quanh"},
    title_hero:{icon:"🏷",name:"Anh Hùng",cat:"Danh Hiệu",desc:"Danh hiệu cơ bản"},
    title_king:{icon:"🏷",name:"Bá Vương",cat:"Danh Hiệu",desc:"Dành cho kẻ mạnh"},
    title_immortal:{icon:"🏷",name:"Tiên Nhân",cat:"Danh Hiệu",desc:"Tu tiên tối thượng"},
    fx_sparkle:{icon:"💫",name:"Lap Lanh",cat:"Hiệu Ứng",desc:"Ánh sao khi lật trang"},
    fx_thunder:{icon:"💫",name:"Sam Set",cat:"Hiệu Ứng",desc:"Tia chớp khi chọn lựa mạo hiểm"},
    fx_sakura:{icon:"💫",name:"Hoa Dao",cat:"Hiệu Ứng",desc:"Cánh hoa rơi"},
    boost_daily2x:{icon:"🚀",name:"x2 Xu Hang Ngay",cat:"Buff",desc:"Gấp đôi xu 7 ngày"},
    boost_save50:{icon:"🚀",name:"Tiet Kiem 50%",cat:"Buff",desc:"Giảm xu mỗi chương 24h"},
    ticket_reroll:{icon:"🎟",name:"Ve Roll Mien Phi",cat:"Ve",desc:"Roll 1 lần miễn phí"},
    ticket_bonus_ch:{icon:"🎟",name:"Ve Chương Bonus",cat:"Ve",desc:"1 chương miễn phí"},
  };
  const equip = (id, type) => {
    const next = { ...equipped, [type]: equipped[type]===id ? null : id };
    setEquipped(next); LSSet("tai-equipped", next);
  };
  const getType = (id) => { if(id.startsWith("frame")) return "frame"; if(id.startsWith("title")) return "title"; if(id.startsWith("fx")) return "fx"; return null; };
  const ownedItems = owned.map(id => ({ id, ...allItems[id] })).filter(x => x.name);
  const equippedList = Object.entries(equipped).filter(([,v])=>v).map(([type,id])=>({type,id,...allItems[id]}));

  return (
    <div style={{ padding:"28px 20px",maxWidth:700,margin:"0 auto" }}>
      <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:4 }}>Túi đồ</h2>
      <p style={{ color:C.textDim,fontSize:13,marginBottom:20 }}>Sở hữu: {owned.length} vật phẩm | Đang trang bị: {equippedList.length}</p>

      {/* Equipped section */}
      {equippedList.length > 0 && (
        <div style={{ background:C.bg2,border:`1px solid ${C.gold}30`,borderRadius:14,padding:"16px 18px",marginBottom:20 }}>
          <div style={{ fontSize:13,fontWeight:700,color:C.gold,marginBottom:10 }}>Đang trang bị</div>
          <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
            {equippedList.map(eq => eq.name && (
              <div key={eq.id} style={{ display:"flex",alignItems:"center",gap:8,background:C.bg3,borderRadius:10,padding:"8px 14px",border:`1px solid ${C.gold}25` }}>
                <span style={{fontSize:18}}>{eq.icon}</span>
                <div>
                  <div style={{ fontSize:12,fontWeight:700,color:C.text }}>{eq.name}</div>
                  <div style={{ fontSize:10,color:C.textDim }}>{eq.cat}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {owned.length===0?(
        <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"48px 20px",textAlign:"center" }}>
          <div style={{ fontSize:48,marginBottom:8 }}>🎒</div>
          <p style={{ color:C.textDim,fontSize:14 }}>Túi đồ trống. Ghé Cửa hàng để mua vật phẩm!</p>
        </div>
      ):(
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {ownedItems.map(it => {
            const type = getType(it.id);
            const isEquipped = type && equipped[type] === it.id;
            return (
              <div key={it.id} style={{ background:C.bg2,border:`1px solid ${isEquipped?C.gold+"40":C.border}`,borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:14 }}>
                <div style={{ width:44,height:44,borderRadius:10,background:C.bg3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{it.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14,fontWeight:700,color:C.text }}>{it.name}</div>
                  <div style={{ fontSize:11,color:C.textDim }}>{it.cat} {it.desc && `- ${it.desc}`}</div>
                </div>
                {type ? (
                  <button onClick={()=>equip(it.id,type)} style={{
                    background:isEquipped?`${C.gold}15`:"transparent",
                    border:`1px solid ${isEquipped?C.gold+"50":C.border}`,
                    color:isEquipped?C.gold:C.textDim,
                    padding:"7px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"
                  }}>{isEquipped?"Đang dùng":"Trang bị"}</button>
                ) : (
                  <span style={{ fontSize:11,color:C.textMuted }}>Vật phẩm tiêu hao</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// COLLECTION PAGE — expanded with characters + achievements
// ═══════════════════════════════════════════════════════
function CollectionPage() {
  const [tab, setTab] = useState("achievements");
  const progress = LS("tai-progress",{});
  const totalCh = Object.values(progress).reduce((s,p)=>s+(p.chapter||0),0);
  const streak = LS("tai-streak",0);
  const owned = LS("tai-owned",[]);

  const achievements = [
    { icon:"📖",title:"Người đọc đầu tiên",desc:"Doc chuong dau tien",done:totalCh>=1,reward:10 },
    { icon:"📚",title:"Sách giun",desc:"Doc 10 chương",done:totalCh>=10,reward:30 },
    { icon:"🗡",title:"Chiến binh",desc:"Doc 30 chương",done:totalCh>=30,reward:50 },
    { icon:"🏆",title:"Dũng sĩ",desc:"Doc 50 chương",done:totalCh>=50,reward:100 },
    { icon:"👑",title:"Huyền thoại",desc:"Doc 100 chương",done:totalCh>=100,reward:200 },
    { icon:"🌍",title:"Nhà thám hiểm",desc:"Thu 3 thế giới khac nhau",done:Object.keys(progress).length>=3,reward:40 },
    { icon:"🌏",title:"Lập bản đồ",desc:"Thu 5 thế giới khac nhau",done:Object.keys(progress).length>=5,reward:80 },
    { icon:"🔥",title:"Chạy chuỗi",desc:"Đăng nhập 3 ngày liên tiếp",done:streak>=3,reward:30 },
    { icon:"💎",title:"Nghiện truyện",desc:"Đăng nhập 7 ngày liên tiếp",done:streak>=7,reward:100 },
    { icon:"🛒",title:"Nhà giàu",desc:"Mua 3 vật phẩm từ Cửa hàng",done:owned.length>=3,reward:25 },
    { icon:"🎲",title:"Con bạc",desc:"Roll thân phận 5 lần",done:false,reward:20 },
    { icon:"💰",title:"Tiết kiệm",desc:"Tích lũy 500 xu",done:LS("tai-xu",0)>=500,reward:50 },
  ];

  // Characters saved from story progress
  const characters = Object.entries(progress).filter(([,d])=>d.charData).map(([id,d])=>({
    storyId:id, ...d.charData, storyTitle:d.title||STORIES.find(s=>s.id===id)?.title||"Unknown"
  }));

  const doneCount = achievements.filter(a=>a.done).length;

  return (
    <div style={{ padding:"28px 20px",maxWidth:800,margin:"0 auto" }}>
      <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:4 }}>Bộ sưu tập</h2>
      <p style={{ color:C.textDim,fontSize:13,marginBottom:20 }}>Thành tựu: {doneCount}/{achievements.length} | Nhân vật: {characters.length}</p>

      {/* Tabs */}
      <div style={{ display:"flex",gap:4,marginBottom:20 }}>
        {[["achievements","Thành tựu"],["characters","Nhân vật"],["worlds","Thế giới"]].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"8px 18px",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",
            background:tab===id?`${C.gold}18`:"transparent", border:tab===id?`1px solid ${C.gold}40`:`1px solid ${C.border}`, color:tab===id?C.gold:C.textDim }}>{l}</button>
        ))}
      </div>

      {/* Achievements */}
      {tab==="achievements" && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:12 }}>
          {achievements.map((a,i)=>(
            <div key={i} style={{ background:C.bg2,border:`1px solid ${a.done?C.gold+"40":C.border}`,borderRadius:14,padding:"18px 14px",textAlign:"center",opacity:a.done?1:.45,transition:"opacity .2s" }}>
              <div style={{ fontSize:32,marginBottom:6,filter:a.done?"none":"grayscale(1)" }}>{a.icon}</div>
              <div style={{ fontSize:13,fontWeight:700,color:a.done?C.gold:C.textDim }}>{a.title}</div>
              <div style={{ fontSize:11,color:C.textMuted,marginTop:2,marginBottom:6 }}>{a.desc}</div>
              {a.done ? (
                <div style={{ fontSize:10,color:C.green,fontWeight:700 }}>Da dat duoc</div>
              ) : (
                <div style={{ fontSize:10,color:C.textDim }}>Thuong: +{a.reward} xu</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Characters */}
      {tab==="characters" && (
        characters.length===0 ? (
          <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"48px 20px",textAlign:"center" }}>
            <div style={{fontSize:48,marginBottom:8}}>🎭</div>
            <p style={{color:C.textDim,fontSize:14}}>Bắt đầu một câu chuyện để tạo nhân vật đầu tiên!</p>
          </div>
        ) : (
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {characters.map((ch,i)=>(
              <div key={i} style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"18px 20px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
                  <div style={{ width:48,height:48,borderRadius:12,background:"linear-gradient(135deg,rgba(74,103,65,0.12),rgba(74,103,65,0.06))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>🛡</div>
                  <div style={{flex:1}}>
                    <div style={{ fontSize:16,fontWeight:700,color:C.text }}>{ch.name} <span style={{fontSize:12,color:C.textDim,fontWeight:400}}>({ch.gender})</span></div>
                    <div style={{ fontSize:12,color:"#4a6741",fontWeight:600 }}>{ch.rank}</div>
                    <div style={{ fontSize:11,color:C.textDim }}>Truyện: {ch.storyTitle}</div>
                  </div>
                </div>
                {ch.stats && (
                  <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                    {ch.stats.capDo && <span style={{padding:"3px 10px",borderRadius:6,background:C.bg3,border:`1px solid ${C.border}`,fontSize:10,color:C.textDim}}>Cap: {ch.stats.capDo}</span>}
                    {ch.stats.voHon && <span style={{padding:"3px 10px",borderRadius:6,background:C.bg3,border:`1px solid ${C.border}`,fontSize:10,color:C.textDim}}>Vo Hon: {ch.stats.voHon}</span>}
                    {ch.stats.thanPhan && <span style={{padding:"3px 10px",borderRadius:6,background:C.bg3,border:`1px solid ${C.border}`,fontSize:10,color:C.textDim}}>{ch.stats.thanPhan}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Worlds explored */}
      {tab==="worlds" && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12 }}>
          {STORIES.map(s => {
            const explored = !!progress[s.id];
            const ch = progress[s.id]?.chapter || 0;
            return (
              <div key={s.id} style={{ background:C.bg2,border:`1px solid ${explored?C.gold+"30":C.border}`,borderRadius:14,padding:"16px 14px",opacity:explored?1:.4 }}>
                <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
                  <span style={{ fontSize:28 }}>{s.icon}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{ fontSize:13,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.title}</div>
                    <div style={{ display:"flex",gap:3,marginTop:2,flexWrap:"wrap" }}>{s.tags.slice(0,2).map(t=><Tag key={t} name={t}/>)}</div>
                  </div>
                </div>
                {explored ? (
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                    <span style={{ fontSize:11,color:C.green,fontWeight:600 }}>Da kham pha</span>
                    <span style={{ fontSize:11,color:C.textDim }}>Chương {ch}</span>
                  </div>
                ) : (
                  <div style={{ fontSize:11,color:C.textMuted }}>Chua kham pha</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// RANKING PAGE
// ═══════════════════════════════════════════════════════
function RankingPage() {
  const sorted = [...STORIES].sort((a,b)=>b.plays-a.plays);
  return (
    <div style={{ padding:"28px 20px",maxWidth:700,margin:"0 auto" }}>
      <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:24 }}>Bảng xếp hạng</h2>
      <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
        {sorted.map((s,i)=>{
          const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
          return (
            <div key={s.id} style={{ background:C.bg2,border:`1px solid ${i<3?C.gold+"30":C.border}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:14 }}>
              <div style={{ width:36,textAlign:"center",fontSize:i<3?22:14,fontWeight:700,color:i<3?C.gold:C.textDim }}>{medal}</div>
              <span style={{ fontSize:24 }}>{s.icon}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{ fontSize:14,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.title}</div>
                <div style={{ display:"flex",gap:4,marginTop:3,flexWrap:"wrap" }}>{s.tags.slice(0,2).map(t=><Tag key={t} name={t}/>)}</div>
              </div>
              <div style={{ textAlign:"right",flexShrink:0 }}>
                <div style={{ fontSize:14,fontWeight:700,color:C.gold }}>👥 {s.plays}</div>
                <div style={{ fontSize:11,color:C.textDim }}>♡ {s.likes}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════
function SettingsPage() {
  const [fontSize, setFontSize] = useState(LS("tai-fontsize",15));
  const [autoSave, setAutoSave] = useState(LS("tai-autosave",true));
  const saveSetting = (k,v) => { LSSet(k,v); };
  const Toggle = ({checked,onChange}) => (
    <div onClick={()=>onChange(!checked)} style={{ width:40,height:22,borderRadius:11,background:checked?C.gold:"rgba(255,255,255,0.1)",cursor:"pointer",position:"relative",transition:"background .2s" }}>
      <div style={{ width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:2,left:checked?20:2,transition:"left .2s" }}/>
    </div>
  );
  const Row = ({icon,label,desc,children}) => (
    <div style={{ display:"flex",alignItems:"center",gap:14,padding:"14px 0",borderBottom:`1px solid ${C.border}` }}>
      <span style={{fontSize:20}}>{icon}</span>
      <div style={{flex:1}}>
        <div style={{fontSize:14,fontWeight:600,color:C.text}}>{label}</div>
        {desc&&<div style={{fontSize:11,color:C.textDim,marginTop:1}}>{desc}</div>}
      </div>
      {children}
    </div>
  );
  return (
    <div style={{ padding:"28px 20px",maxWidth:600,margin:"0 auto" }}>
      <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:24 }}>Cài đặt</h2>
      <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:"4px 20px" }}>
        <Row icon="📝" label="Cỡ chữ đọc truyện" desc={`${fontSize}px`}>
          <input type="range" min="12" max="20" value={fontSize} onChange={e=>{setFontSize(+e.target.value);saveSetting("tai-fontsize",+e.target.value);}} style={{width:100}} />
        </Row>
        <Row icon="💾" label="Tự động lưu" desc="Lưu tiến trình sau mỗi lựa chọn">
          <Toggle checked={autoSave} onChange={v=>{setAutoSave(v);saveSetting("tai-autosave",v);}} />
        </Row>
        <Row icon="🔔" label="Thông báo" desc="Nhận thông báo truyện mới, sự kiện">
          <Toggle checked={true} onChange={()=>{}} />
        </Row>
        <Row icon="🌙" label="Chế độ tối" desc="Luôn bật">
          <span style={{fontSize:12,color:C.green,fontWeight:600}}>✓ Đang dùng</span>
        </Row>
        <Row icon="🗑" label="Xóa toàn bộ dữ liệu" desc="Xóa tất cả tiến trình, xu, cài đặt">
          <button onClick={()=>{if(confirm("Xác nhận xóa toàn bộ?")){localStorage.clear();location.reload();}}} style={{ background:"rgba(139,45,45,0.12)",border:"1px solid rgba(139,45,45,0.3)",color:C.red,padding:"6px 14px",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600 }}>Xóa</button>
        </Row>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// HOME PAGE
// ═══════════════════════════════════════════════════════
function HomePage({ onStart, onReset, savedProgress, setPage }) {
  const [search, setSearch] = useState("");
  const filtered = search ? STORIES.filter(s=>s.title.toLowerCase().includes(search.toLowerCase())||s.tags.some(t=>t.toLowerCase().includes(search.toLowerCase()))) : STORIES;
  return (
    <>
      <section style={{ textAlign:"center",padding:"52px 20px 28px",position:"relative",background:"linear-gradient(180deg,#ebe3d3 0%,#f5efe3 100%)" }}>
        <div style={{ position:"absolute",inset:0,backgroundImage:"radial-gradient(circle at 20% 50%,rgba(139,69,19,0.03) 0%,transparent 50%),radial-gradient(circle at 80% 30%,rgba(139,45,45,0.03) 0%,transparent 50%)",pointerEvents:"none" }} />
        {/* Decorative line */}
        <div style={{ width:60,height:2,background:`linear-gradient(90deg,transparent,${C.accent}60,transparent)`,margin:"0 auto 16px" }} />
        <div style={{ display:"inline-block",padding:"4px 18px",borderRadius:3,border:`1px solid ${C.accent}30`,color:C.accent,fontSize:11,fontWeight:600,marginBottom:20,background:`${C.accent}06`,fontFamily:"'Noto Serif',serif",letterSpacing:2 }}>書 TIỂU THUYẾT TƯƠNG TÁC</div>
        <h1 style={{ fontFamily:"'Noto Serif',serif",fontSize:"clamp(28px,5vw,42px)",fontWeight:700,color:C.ink,marginBottom:12,lineHeight:1.2,letterSpacing:-0.5 }}>Mỗi trang sách<br/>một thế giới mới</h1>
        <p style={{ color:C.textDim,fontSize:14,maxWidth:420,margin:"0 auto 28px",lineHeight:1.7,fontFamily:"'Noto Serif',serif" }}>Bạn là nhân vật chính — mỗi lựa chọn<br/>dẫn đến vận mệnh khác nhau</p>
        <button onClick={()=>setPage("customstory")} style={{ background:`linear-gradient(135deg,${C.accent},${C.ink})`, border:"none", color:"#f5efe3", padding:"13px 32px", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", marginBottom:10, fontFamily:"'Noto Serif',serif", letterSpacing:0.5 }}>✍ Tạo câu chuyện của bạn</button>
        <p style={{ color:C.textMuted, fontSize:11 }}>Hoặc chọn từ thư viện bên dưới</p>
        <div style={{ width:60,height:2,background:`linear-gradient(90deg,transparent,${C.accent}40,transparent)`,margin:"20px auto 0" }} />
      </section>
      <div style={{ maxWidth:640,margin:"0 auto 28px",padding:"0 20px" }}>
        <div style={{ display:"flex",gap:8 }}>
          <div style={{ flex:1,position:"relative" }}>
            <span style={{ position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:13,color:C.textMuted }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm theo tên truyện hoặc thể loại..." style={{ width:"100%",background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px 12px 38px",color:C.text,fontSize:13,boxSizing:"border-box",outline:"none",fontFamily:"'Inter',sans-serif" }} />
          </div>
        </div>
      </div>
      <div style={{ maxWidth:1100,margin:"0 auto",padding:"0 20px 60px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18 }}>
          {filtered.map(s=><StoryCard key={s.id} story={s} onStart={onStart} onReset={onReset} saved={!!savedProgress[s.id]} />)}
        </div>
        {filtered.length===0&&<p style={{textAlign:"center",color:C.textMuted,padding:40,fontFamily:"'Noto Serif',serif"}}>Không tìm thấy truyện</p>}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
// DAILY BONUS HELPER
// ═══════════════════════════════════════════════════════
function getTodayStr() { return new Date().toISOString().split("T")[0]; }

function checkDailyBonus() {
  const lastClaim = LS("tai-lastDaily", "");
  const today = getTodayStr();
  return lastClaim !== today;
}

function claimDailyBonus() {
  LSSet("tai-lastDaily", getTodayStr());
  // Update streak
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
  const yStr = yesterday.toISOString().split("T")[0];
  const lastClaim = LS("tai-lastDaily-prev", "");
  let streak = LS("tai-streak", 0);
  if (lastClaim === yStr) { streak += 1; } else { streak = 1; }
  LSSet("tai-streak", streak);
  LSSet("tai-lastDaily-prev", getTodayStr());
  return { bonus: DAILY_BONUS, streak };
}

// ═══════════════════════════════════════════════════════
// DAILY BONUS MODAL
// ═══════════════════════════════════════════════════════
function DailyBonusModal({ bonus, streak, onClose }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(42,31,20,0.6)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.bg2,border:`1px solid ${C.gold}40`,borderRadius:20,maxWidth:380,width:"100%",padding:"36px 28px",textAlign:"center",position:"relative",overflow:"hidden" }}>
        {/* Glow effect */}
        <div style={{ position:"absolute",inset:0,background:`radial-gradient(circle at 50% 30%,${C.gold}15 0%,transparent 60%)`,pointerEvents:"none" }} />
        
        <div style={{ position:"relative",zIndex:1 }}>
          <div style={{ fontSize:56,marginBottom:8 }}>🎁</div>
          <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:22,fontWeight:700,color:C.gold,marginBottom:6 }}>Thưởng đăng nhập!</h2>
          <p style={{ color:C.textDim,fontSize:13,marginBottom:20 }}>Chào mừng bạn quay lại hôm nay</p>
          
          {/* Bonus amount */}
          <div style={{ background:C.bg3,border:`1px solid ${C.gold}30`,borderRadius:14,padding:"18px 16px",marginBottom:16 }}>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:6 }}>
              <span style={{ fontSize:24 }}>₫</span>
              <span style={{ fontSize:32,fontWeight:800,color:C.gold }}>+{bonus}</span>
              <span style={{ fontSize:16,color:C.goldLight,fontWeight:600 }}>xu</span>
            </div>
            <div style={{ fontSize:12,color:C.textDim }}>đã được cộng vào tài khoản</div>
          </div>

          {/* Streak */}
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:20 }}>
            <span style={{ fontSize:16 }}>🔥</span>
            <span style={{ fontSize:14,color:C.text,fontWeight:600 }}>Chuỗi đăng nhập: {streak} ngày</span>
          </div>

          {/* Streak calendar row */}
          <div style={{ display:"flex",justifyContent:"center",gap:6,marginBottom:24 }}>
            {[1,2,3,4,5,6,7].map(d => {
              const done = d <= streak;
              const isToday = d === streak;
              return (
                <div key={d} style={{
                  width:36,height:36,borderRadius:10,
                  background:done ? `${C.gold}20` : C.bg3,
                  border:isToday ? `2px solid ${C.gold}` : `1px solid ${done ? `${C.gold}30` : C.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:done?14:12, color:done?C.gold:C.textMuted, fontWeight:done?700:400,
                }}>
                  {done ? "✓" : `D${d}`}
                </div>
              );
            })}
          </div>

          <p style={{ fontSize:11,color:C.textMuted,marginBottom:16 }}>Đăng nhập mỗi ngày để nhận {DAILY_BONUS} xu miễn phí!</p>

          <button onClick={onClose} style={{
            width:"100%",background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,
            border:"none",color:"#f5efe3",padding:"14px",borderRadius:12,
            fontSize:16,fontWeight:700,cursor:"pointer",
          }}>🎉 Nhận xu & Tiếp tục</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(LS("tai-user",null));
  const [xu, setXu] = useState(LS("tai-xu",DEFAULT_XU));
  const [page, setPage] = useState("home");
  const [savedProgress, setSavedProgress] = useState(LS("tai-progress",{}));
  const [readingStory, setReadingStory] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [charData, setCharData] = useState(null);
  const [dailyBonusInfo, setDailyBonusInfo] = useState(null); // { bonus, streak }

  // Check daily bonus on mount and when user logs in
  useEffect(() => {
    if (user && !user.isAdmin && checkDailyBonus()) {
      const info = claimDailyBonus();
      const newXu = xu + info.bonus;
      setXu(newXu); LSSet("tai-xu", newXu);
      setDailyBonusInfo(info);
    }
  }, [user]); // eslint-disable-line

  const handleLogin = (u) => {
    setUser(u); LSSet("tai-user",u);
    const savedXu = LS("tai-xu", null);
    // First time user gets DEFAULT_XU, returning user keeps their xu
    if (savedXu === null || savedXu === DEFAULT_XU) {
      setXu(u.xu||DEFAULT_XU); LSSet("tai-xu",u.xu||DEFAULT_XU);
    } else {
      setXu(savedXu);
    }
  };
  const handleLogout = () => { setUser(null); LSSet("tai-user",null); setPage("home"); };
  const spendXu = (n) => { const v=Math.max(0,xu-n); setXu(v); LSSet("tai-xu",v); };
  const addXu = (n) => { const v=xu+n; setXu(v); LSSet("tai-xu",v); alert(`✅ Nạp ${n} xu thành công!`); };
  const saveProgress = useCallback((id,data)=>{
    setSavedProgress(p=>{const n={...p,[id]:data}; LSSet("tai-progress",n); return n;});
  },[]);
  const startStory = (story) => {
    const existing = savedProgress[story.id];
    if (existing?.segments?.length) {
      // Has saved progress → resume reading
      setResumeData(existing);
      setCharData(existing.charData || null);
      setReadingStory(story); setPage("reading");
    } else {
      // New story → character creation first
      setResumeData(null); setCharData(null);
      setReadingStory(story); setPage("storydetail");
    }
  };
  const resetStory = (story) => {
    if (!confirm("Bắt đầu lại \"" + story.title + "\"? Tiến trình cũ sẽ bị xóa.")) return;
    setSavedProgress(p => { const n={...p}; delete n[story.id]; LSSet("tai-progress",n); return n; });
    setResumeData(null); setCharData(null);
    setReadingStory(story); setPage("storydetail");
  };
  const startWithChar = (cd) => {
    setCharData(cd); setResumeData(null); setPage("reading");
  };
  const startCustomStory = (customStory, preview) => {
    setReadingStory(customStory);
    setResumeData({ segments:[{narrative:preview.narrative, choices:preview.choices}], history:[{role:"user",content:customStory.initPrompt},{role:"assistant",content:preview.narrative}], chapter:1 });
    setCharData(null);
    setPage("reading");
  };

  if(!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter',sans-serif" }}>
      <style>{`@keyframes dotBounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-4px);opacity:1}} button:hover{filter:brightness(0.96)}`}</style>
      
      {/* Daily Bonus Modal */}
      {dailyBonusInfo && <DailyBonusModal bonus={dailyBonusInfo.bonus} streak={dailyBonusInfo.streak} onClose={()=>setDailyBonusInfo(null)} />}
      
      <Navbar user={user} page={page} setPage={setPage} onLogout={handleLogout} xu={xu} />
      <main>
        {page==="home"&&<HomePage onStart={startStory} onReset={resetStory} savedProgress={savedProgress} setPage={setPage} />}
        {page==="library"&&<HomePage onStart={startStory} onReset={resetStory} savedProgress={savedProgress} setPage={setPage} />}
        {page==="storydetail"&&readingStory&&<CharacterCreation story={readingStory} xu={xu} onSpendXu={spendXu} onStartWithChar={startWithChar} onBack={()=>setPage("home")} />}
        {page==="customstory"&&<CustomStoryPage xu={xu} onSpendXu={spendXu} onStartReading={startCustomStory} onBack={()=>setPage("home")} />}
        {page==="reading"&&readingStory&&<StoryReader story={readingStory} onBack={()=>setPage("home")} onReset={resetStory} xu={xu} onSpendXu={spendXu} savedData={resumeData} onSave={saveProgress} charData={charData} />}
        {page==="admin"&&user?.isAdmin&&<AdminPanel />}
        {page==="topup"&&<TopUpPage xu={xu} onAddXu={addXu} user={user} />}
        {page==="ranking"&&<RankingPage />}
        {page==="events"&&<Placeholder icon="🎉" title="Sự Kiện" desc="Minigame và phần thưởng — Sắp ra mắt" />}
        {page==="support"&&<Placeholder icon="💬" title="Hỗ Trợ & Liên Hệ" desc="Liên hệ Admin qua Facebook hoặc Discord để được hỗ trợ" />}
        {page==="profile"&&<ProfilePage user={user} xu={xu} />}
        {page==="referral"&&<Placeholder icon="🎁" title="Giới Thiệu Nhận Xu" desc="Chia sẻ link cho bạn bè — Nhận 5 xu mỗi người đăng ký" />}
        {page==="missions"&&<MissionsPage xu={xu} onAddXu={(n)=>{const v=xu+n;setXu(v);LSSet("tai-xu",v);}} />}
        {page==="shop"&&<ShopPage xu={xu} onSpendXu={spendXu} />}
        {page==="inventory"&&<InventoryPage />}
        {page==="collection"&&<CollectionPage />}
        {page==="settings"&&<SettingsPage />}
        {page==="notif"&&<NotifPage />}
        {page==="saved"&&<Placeholder icon="💾" title="Đã Lưu" desc="Truyện bạn đang đọc dở — Vào Trang chủ bấm Đọc tiếp" />}
      </main>
    </div>
  );
}
