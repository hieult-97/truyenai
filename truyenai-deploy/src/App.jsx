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
// FIREBASE HELPERS — đồng bộ data giữa các thiết bị
// ═══════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB0dA0gclSOIPOdQTv2hjvdd1cdkl-UK5M",
  authDomain: "truyenai-65899.firebaseapp.com",
  databaseURL: "https://truyenai-65899-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "truyenai-65899",
};

let _fb = null;
function initFirebase() {
  if (_fb) return _fb;
  try {
    if (!window.firebase) return null;
    if (!window.firebase.apps?.length) {
      window.firebase.initializeApp(FIREBASE_CONFIG);
    }
    _fb = window.firebase.database();
    return _fb;
  } catch(e) { console.error("Firebase init error:", e); return null; }
}

// Auto-init Firebase khi load trang
try { setTimeout(()=>initFirebase(), 500); } catch(e) {}

async function fbGet(path) {
  let db = initFirebase();
  if (!db) { await new Promise(r=>setTimeout(r,1000)); db = initFirebase(); }
  if (!db) return null;
  try {
    const snap = await db.ref(path).once("value");
    return snap.val();
  } catch(e) { console.error("FB get:", e); return null; }
}

async function fbSet(path, data) {
  let db = initFirebase();
  if (!db) { await new Promise(r=>setTimeout(r,1000)); db = initFirebase(); }
  if (!db) { console.warn("FB not ready, skip set:", path); return false; }
  try {
    await db.ref(path).set(data);
    return true;
  } catch(e) { console.error("FB set:", e); return false; }
}

async function fbUpdate(path, data) {
  const db = initFirebase();
  if (!db) return false;
  try {
    await db.ref(path).update(data);
    return true;
  } catch(e) { console.error("FB update:", e); return false; }
}

// Đọc config chung (bank, apikey) — ưu tiên Firebase, fallback localStorage
async function getSharedConfig(key, fallback) {
  const fbVal = await fbGet("config/" + key);
  if (fbVal !== null) { LSSet("tai-" + key, fbVal); return fbVal; }
  return LS("tai-" + key, fallback);
}

async function setSharedConfig(key, value) {
  LSSet("tai-" + key, value);
  await fbSet("config/" + key, value);
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
  "HỆ THỐNG":"#6b5b3d","TRỌNG SINH":"#4a6741","XUYÊN KHÔNG":"#6b4c6e",
  "NGÔN TÌNH":"#8b5e5e","KIẾM HIỆP":"#7a6b58","VÕ HIỆP":"#6b5b3d",
  "GAME":"#4a6d8c","SIÊU NĂNG":"#5c3d6b",
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
  // ═══ 50 TRUYỆN MỚI ═══
  { id:"s19", title:"Phàm Nhân Tu Tiên — Hàn Lập Truyền Kỳ", tags:["TIÊN HIỆP"], desc:"Không linh căn thiên tài, không gia thế hiển hách. Chỉ là phàm nhân bình thường bước vào tu tiên giới. Nhưng cẩn thận, kiên nhẫn và một chút may mắn có thể thay đổi vận mệnh.", plays:245, likes:78, icon:"🧘" },
  { id:"s20", title:"Già Xà Thành Tiên", tags:["TIÊN HIỆP","FANTASY"], desc:"Bạn là một con rắn già trong rừng sâu, vô tình nuốt phải nhân đan. Khai linh trí, bắt đầu tu luyện — xà hóa rồng, cần trải cửu biến, mỗi biến một sinh tử.", plays:198, likes:62, icon:"🐍" },
  { id:"s21", title:"Gia Tộc Tu Tiên Vạn Năm", tags:["TIÊN HIỆP","XÂY DỰNG"], desc:"Mang theo hệ thống dưỡng thành gia tộc, bạn xuyên qua tu hành thế giới. Không phải một mình chiến đấu — mà xây dựng thế gia vạn năm bất hủ.", plays:176, likes:55, icon:"🏯" },
  { id:"s22", title:"Tiên Nghịch — Vương Lâm Truyện", tags:["TIÊN HIỆP"], desc:"Con nhà thợ mộc tình cờ nhặt được hạt châu nghịch thiên. Từ Luyện Khí đến Hóa Thần, mỗi bước là máu và nước mắt — thuận ta thì sống, nghịch ta thì chết.", plays:231, likes:74, icon:"💎" },
  { id:"s23", title:"Ngã Dục Phong Thiên — Ta Muốn Phong Thiên", tags:["HUYỀN HUYỄN","TIÊN HIỆP"], desc:"Mười vạn năm trước, Bát Đại Tiên Vương phong ấn Thiên Môn. Nay phong ấn lung lay, yêu ma trỗi dậy. Bạn là đệ tử nhỏ nhất Thiên Kiếm Tông, nhưng trong người ẩn chứa huyết mạch Tiên Vương.", plays:203, likes:65, icon:"⛰" },
  { id:"s24", title:"Đồ Đệ Của Ta Đều Là Trùm Phản Diện", tags:["HUYỀN HUYỄN","HỆ THỐNG"], desc:"Bạn là lão sư vô danh thu nhận đệ tử. Hệ thống thông báo: mỗi đệ tử bạn dạy đều sẽ trở thành phản diện cuối cùng. Bạn chọn cách nào — dạy họ thành thiện hay cùng họ xưng bá?", plays:188, likes:61, icon:"📜" },
  { id:"s25", title:"Đỉnh Cấp Khí Vận Tu Luyện Ngàn Năm", tags:["TIÊN HIỆP","HỆ THỐNG"], desc:"Có khí vận đỉnh cấp nhưng bạn chọn lặng lẽ tu luyện, không tranh đấu. Ngàn năm sau, khi thế giới cần bạn — bạn đã là tồn tại không ai dám chạm đến.", plays:215, likes:68, icon:"🌙" },
  { id:"s26", title:"Thần Đạo Đan Tôn", tags:["HUYỀN HUYỄN","TIÊN HIỆP"], desc:"Đan đế vang danh thiên hạ trùng sinh vào thiếu niên yếu đuối. Kiếp trước bạn luyện đan cho cả thế giới — kiếp này bạn luyện đan cho chính mình.", plays:192, likes:60, icon:"🧪" },
  { id:"s27", title:"Vô Địch Từ Thêm Điểm Bắt Đầu", tags:["HUYỀN HUYỄN","HỆ THỐNG","ISEKAI"], desc:"Xuyên qua dị giới, mỗi lần giết quái rơi EXP và item ngẫu nhiên. Đánh con lợn rừng cũng có thể rơi Thiên Phú Thần Thông — hệ thống thêm điểm bá đạo!", plays:178, likes:57, icon:"✨" },
  { id:"s28", title:"Solo Leveling — Thợ Săn Yếu Nhất", tags:["FANTASY","MANHWA"], desc:"Rank E — thợ săn yếu nhất nhân loại. Nhưng sau khi suýt chết trong Cổng Kép, bạn nhận được quyền năng mà không ai khác có: Hệ Thống Level Up một mình.", plays:267, likes:89, icon:"🗡" },
  { id:"s29", title:"Vũ Thần — Thương Thiên Bạch Hạc", tags:["HUYỀN HUYỄN"], desc:"Lục thiếu gia bị chê cười vì không thể tu luyện. Nhưng trong cơ thể ẩn chứa huyết mạch Vũ Thần — chỉ cần giác tỉnh, thiên hạ đệ nhất không phải giấc mơ.", plays:184, likes:58, icon:"⚡" },
  { id:"s30", title:"Niềm Tin Vĩnh Hằng", tags:["HUYỀN HUYỄN"], desc:"Mồ côi từ nhỏ, bị cả làng xua đuổi. Nhưng Bạch Tiểu Thuần không gục ngã — anh bước vào Linh Khê Tông và bắt đầu con đường trở thành cường giả bằng ý chí sắt đá.", plays:196, likes:63, icon:"🌟" },
  { id:"s31", title:"Mang Vương Giả Vinh Quang Xưng Bá Dị Giới", tags:["ISEKAI","GAME","HỆ THỐNG"], desc:"Xuyên qua mang theo hệ thống Vương Giả Vinh Quang. Đát Kỷ cho Hoàn Hồn, Gia Cát Lượng dạy bày trận — triệu hồi tướng game để chinh phục dị giới!", plays:163, likes:51, icon:"🎮" },
  { id:"s32", title:"Thiên Tôn Trọng Sinh", tags:["TIÊN HIỆP","TRỌNG SINH"], desc:"Thiên Tôn cường nhất bị phản bội, chết dưới tay đồng đạo. Trọng sinh về 500 năm trước khi mới Luyện Khí tầng 3. Lần này — bạn biết ai là bạn, ai là thù.", plays:221, likes:71, icon:"🔄" },
  { id:"s33", title:"Ta Ở Tiên Giới Luyện Kim Đan", tags:["TIÊN HIỆP"], desc:"Lão tán tu 60 tuổi, Luyện Khí đỉnh phong. Không thiên tài, không cơ duyên — chỉ có kiên nhẫn và trí tuệ. Liệu phàm nhân có thể Kết Đan thành công?", plays:158, likes:49, icon:"⚗" },
  { id:"s34", title:"Thục Sơn Kiếm Hiệp Truyện", tags:["TIÊN HIỆP","KIẾM HIỆP"], desc:"Thục Sơn — thánh địa kiếm tu. Ma tộc xâm lăng, kiếm phái suy yếu. Bạn nhặt được thanh Phá Thiên Kiếm từ phế tích — và nghe thấy tiếng gọi của nó.", plays:186, likes:59, icon:"⚔" },
  { id:"s35", title:"Hắc Thiết Chi Quan — Nhà Tù Không Lối Thoát", tags:["DARK FANTASY","SINH TỒN"], desc:"Tỉnh dậy trong nhà tù dưới lòng đất. 100 tầng, mỗi tầng một thử thách chết người. Lên đến đỉnh = tự do. Rơi xuống đáy = trở thành quái vật.", plays:172, likes:54, icon:"🏰" },
  { id:"s36", title:"Lão Tổ Cũng Tu Tiên", tags:["TIÊN HIỆP","SLICE OF LIFE"], desc:"Bạn là lão tổ ẩn tu của gia tộc nhỏ. Thế nhân tưởng bạn đã chết 3000 năm trước — nhưng thực ra bạn đang lặng lẽ tu luyện Hợp Thể tại hậu sơn.", plays:189, likes:61, icon:"👴" },
  { id:"s37", title:"Thần Y Hoàng Hậu", tags:["XUYÊN KHÔNG","LỊCH SỬ","NGÔN TÌNH"], desc:"Bác sĩ hiện đại xuyên không thành hoàng hậu bị phế. Không tu vi, không gia thế — chỉ có kiến thức y học hiện đại. Nhưng trong hậu cung, thuốc độc còn nguy hiểm hơn kiếm.", plays:204, likes:66, icon:"👸" },
  { id:"s38", title:"Tà Vương Truy Thê", tags:["XUYÊN KHÔNG","NGÔN TÌNH","HUYỀN HUYỄN"], desc:"Xuyên không thành nữ phụ bị ghét nhất tiểu thuyết. Theo kịch bản gốc, bạn sẽ chết ở chương 30. Nhưng tà vương — kẻ lẽ ra phải giết bạn — lại bắt đầu đeo bám.", plays:197, likes:64, icon:"🌹" },
  { id:"s39", title:"Thiếu Niên Ca Hành — Tuyết Trung Hãn Đao", tags:["KIẾM HIỆP","VÕ HIỆP","LỊCH SỬ"], desc:"Bắc Lương — vùng đất đông lạnh nơi kỵ binh và kiếm khách cùng tồn tại. Bạn là thiếu gia Bắc Lương, giả ngu giả dại suốt 10 năm. Đến lúc rút đao.", plays:213, likes:69, icon:"❄" },
  { id:"s40", title:"Hoàn Hảo Thế Giới", tags:["HUYỀN HUYỄN","TIÊN HIỆP"], desc:"Trong Hoàn Hảo Thế Giới, kẻ mạnh bay trời độn địa, nhất niệm hủy diệt sơn hà. Bạn là đứa trẻ trong thôn nhỏ, nhưng máu trong người là di sản của Chí Tôn.", plays:224, likes:72, icon:"🌍" },
  { id:"s41", title:"Già Thiên — Đế Lộ", tags:["HUYỀN HUYỄN"], desc:"Từ đứa bé được nhặt về, đến Hoang Cổ Đại Đế. Con đường dài vạn vạn dặm, mỗi bước là vạn cốt thành sơn. Già Thiên — không phải già trời, mà là che trời!", plays:208, likes:67, icon:"🌌" },
  { id:"s42", title:"Linh Vực — Huyết Sắc Chi Chiến", tags:["FANTASY","HUYỀN HUYỄN"], desc:"Linh Vực — nơi linh lực quyết định tất cả. Bạn là phế linh căn bị trục xuất khỏi gia tộc. Nhưng trong mơ, có giọng nói bảo: 'Ta sẽ cho ngươi sức mạnh — đổi lại...'", plays:175, likes:55, icon:"🩸" },
  { id:"s43", title:"Ta Có Một Ngôi Mộ Cổ", tags:["HUYỀN HUYỄN","HỆ THỐNG"], desc:"Xuyên qua mang theo ngôi mộ cổ bí ẩn. Mỗi lần mở một tầng, nhận được di sản của cường giả thượng cổ. Tầng 1: kiếm pháp. Tầng 2: đan phương. Tầng 3: ???", plays:182, likes:58, icon:"🪦" },
  { id:"s44", title:"Toàn Cầu Giác Tỉnh — Siêu Năng Thời Đại", tags:["ĐÔ THỊ","SIÊU NĂNG"], desc:"Toàn cầu đồng thời giác tỉnh siêu năng lực. Người thì bay, người thì phóng lửa. Bạn giác tỉnh năng lực kỳ lạ: Sao Chép — chạm vào ai, copy năng lực của họ.", plays:199, likes:64, icon:"⚡" },
  { id:"s45", title:"Đô Thị Cực Phẩm Y Thần", tags:["ĐÔ THỊ","SIÊU NĂNG"], desc:"Thừa kế y thuật cổ truyền thất truyền, bạn xuống núi vào thành phố. Chữa bệnh nan y, đánh kẻ cường quyền — thanh niên quê mùa trở thành truyền thuyết đô thị.", plays:187, likes:60, icon:"🏥" },
  { id:"s46", title:"Bọc Trong Ánh Sáng Của Bóng Tối", tags:["DARK FANTASY","TRINH THÁM"], desc:"Bạn có thể nhìn thấy 'bóng tối' bám trên người — ai có bóng tối sẽ chết trong 7 ngày. Một ngày, bạn nhìn vào gương và thấy chính mình đen kịt.", plays:168, likes:53, icon:"🌑" },
  { id:"s47", title:"Trùng Sinh Chi Đế Vương Nghiệp", tags:["TRỌNG SINH","LỊCH SỬ"], desc:"Đại tướng bại trận, bị xử tử. Trùng sinh về 20 năm trước khi mới là cậu bé 15 tuổi. Biết ai sẽ phản, biết khi nào loạn — lần này, ngai vàng sẽ thuộc về bạn.", plays:216, likes:70, icon:"🏛" },
  { id:"s48", title:"Hồng Hoang — Khai Thiên Chi Tổ", tags:["HUYỀN HUYỄN","TIÊN HIỆP"], desc:"Hồng Hoang sơ khai, thiên địa mới tạo. Bạn là một trong Tam Thiên Đại Đạo hóa hình. Bàn Cổ khai thiên, Nữ Oa tạo người — và bạn, chọn con đường nào?", plays:195, likes:63, icon:"☯" },
  { id:"s49", title:"Sa Mạc Lầm Than — Survival", tags:["MẠT THẾ","SINH TỒN"], desc:"Thức dậy giữa sa mạc không tên. Không nước, không thức ăn, không ký ức. Chỉ có một chiếc đồng hồ đếm ngược 72:00:00 và dòng chữ: 'Đến được ốc đảo, hoặc chết.'", plays:147, likes:46, icon:"🏜" },
  { id:"s50", title:"Thiên Đạo Thư Viện", tags:["HUYỀN HUYỄN","HỆ THỐNG"], desc:"Mang theo Thiên Đạo Thư Viện, bạn có thể nhìn thấy khuyết điểm của mọi thứ — con người, công pháp, pháp bảo. Sửa khuyết điểm cho người khác, bạn nhận thưởng từ thiên đạo.", plays:201, likes:65, icon:"📚" },
  { id:"s51", title:"Nuốt Phệ Tinh Không", tags:["HUYỀN HUYỄN"], desc:"Trái Đất bị quái thú xâm lăng, nhân loại giác tỉnh. Bạn thừa kế ý chí của Hư Không Nuốt Phệ Thú — kẻ đứng trên đỉnh chuỗi thức ăn vũ trụ.", plays:188, likes:60, icon:"🌀" },
  { id:"s52", title:"Cổ Chân Nhân — Tu Tiên Giả Chân Chính", tags:["TIÊN HIỆP"], desc:"Trong thế giới tu tiên đầy mưu mô, bạn là lão thật thà duy nhất. Không âm mưu, không thủ đoạn — chỉ cần thành tâm tu đạo. Nhưng thiên đạo có thưởng cho người thật thà?", plays:174, likes:56, icon:"🧓" },
  { id:"s53", title:"Tower of God — Tháp Thần", tags:["FANTASY","MANHWA","SINH TỒN"], desc:"Tháp — nơi mọi ước nguyện thành hiện thực nếu leo đến đỉnh. 134 tầng, mỗi tầng một thử thách. Bạn vào Tháp vì một người — nhưng Tháp muốn bạn ở lại.", plays:217, likes:71, icon:"🗼" },
  { id:"s54", title:"Mạt Thế Siêu Cấp Hệ Thống", tags:["MẠT THẾ","HỆ THỐNG","SINH TỒN"], desc:"Zombie tràn ngập, văn minh sụp đổ. Nhưng bạn có Hệ Thống: giết zombie nhận điểm, đổi điểm lấy vũ khí, kỹ năng, thuốc. Vấn đề — bạn không phải người duy nhất có hệ thống.", plays:183, likes:58, icon:"🧟" },
  { id:"s55", title:"Kiếm Lai — Kiếm Đạo Chí Tôn", tags:["KIẾM HIỆP","VÕ HIỆP"], desc:"Thế giới kiếm đạo, mỗi người mang một thanh kiếm, mỗi thanh kiếm một câu chuyện. Bạn là tiểu thư phúc tiểu tử nhặt được thanh kiếm cũ không ai muốn — nhưng nó từng chém Tiên.", plays:206, likes:66, icon:"🗡" },
  { id:"s56", title:"Linh Khí Phục Hồi — Địa Cầu Biến Thiên", tags:["ĐÔ THỊ","FANTASY","HỆ THỐNG"], desc:"Linh khí phục hồi, Trái Đất tiến hóa. Cây cối khổng lồ, động vật biến dị. Bạn thức dậy thấy con mèo nhà đã to bằng con hổ — và nó đang nhìn bạn như nhìn con mồi.", plays:193, likes:62, icon:"🌿" },
  { id:"s57", title:"Tam Sinh Tam Thế — Thập Lý Đào Hoa", tags:["XUYÊN KHÔNG","NGÔN TÌNH","TIÊN HIỆP"], desc:"Ba kiếp luân hồi, ba mối tình khác nhau. Kiếp này bạn là thượng tiên Cửu Trùng Thiên. Nhưng lời nguyền xưa vẫn theo — yêu ai, người đó sẽ chết.", plays:209, likes:67, icon:"🌸" },
  { id:"s58", title:"Luyện Đan Sư Tối Cường", tags:["TIÊN HIỆP","HUYỀN HUYỄN"], desc:"Không thể tu luyện, nhưng bạn có thiên phú luyện đan vô song. Trong tu tiên giới, đan dược đắt hơn sinh mạng. Bạn không cần chiến đấu — vì cả thế giới cần bạn.", plays:179, likes:57, icon:"🔮" },
  { id:"s59", title:"Đấu La — Lam Ngân Thảo", tags:["HUYỀN HUYỄN","ANIME"], desc:"Thế giới Đấu La, nhưng lần này bạn không phải Đường Tam. Bạn là thợ rèn Hồn Đạo Cụ — tạo ra vũ khí từ Hồn Thú. Trong tay bạn, sắt vụn cũng thành thần binh.", plays:185, likes:59, icon:"🔨" },
  { id:"s60", title:"Tuyết Ưng Lãnh Chúa", tags:["FANTASY","LỊCH SỬ","XÂY DỰNG"], desc:"Thừa kế lãnh địa băng giá xa xôi — đất nghèo, dân ít, quái thú vây quanh. Nhưng bạn mang kiến thức hiện đại: tưới tiêu, luyện thép, chiến thuật. Xây dựng đế chế từ con số không.", plays:211, likes:68, icon:"🦅" },
  { id:"s61", title:"Hải Tặc Vương — Grand Line", tags:["FANTASY","ANIME"], desc:"Đại Hải Tặc thời đại. Bạn có con thuyền nhỏ, một giấc mơ lớn, và trái ác quỷ bí ẩn vừa ăn phải. Hải quân truy đuổi, Tứ Hoàng chắn đường — Grand Line chờ đón.", plays:234, likes:76, icon:"🏴‍☠️" },
  { id:"s62", title:"Cẩu Hệ Tu Tiên — Lặng Lẽ Phát Triển", tags:["TIÊN HIỆP","SLICE OF LIFE"], desc:"Không tranh, không đấu, không xuất đầu lộ diện. Bạn là tu sĩ 'cẩu hệ' — ẩn tu lặng lẽ ngàn năm, âm thầm tích lũy. Khi thế giới biến động — bạn đã ở đỉnh.", plays:190, likes:61, icon:"🐕" },
  { id:"s63", title:"Trọng Sinh Đô Thị Tu Tiên", tags:["TRỌNG SINH","ĐÔ THỊ","TIÊN HIỆP"], desc:"Đại năng tu tiên trọng sinh về Trái Đất hiện đại, thành sinh viên 18 tuổi. Linh khí loãng, không ai tu tiên — nhưng bạn biết cách. Kiếm tiền, tu luyện, bảo vệ người thân.", plays:202, likes:65, icon:"🏙" },
  { id:"s64", title:"Thú Ngữ Giả — Người Nói Chuyện Với Thú", tags:["FANTASY","SLICE OF LIFE"], desc:"Bạn hiểu ngôn ngữ của mọi loài thú. Con cáo nói nó từng là hoàng tử. Đàn quạ kể về kho báu cổ đại. Và con rồng trên núi muốn bạn giúp nó một việc...", plays:165, likes:52, icon:"🦊" },
  { id:"s65", title:"Nhất Niệm Vĩnh Hằng", tags:["HUYỀN HUYỄN","TIÊN HIỆP"], desc:"Một niệm thành vĩnh hằng. Bạch Tiểu Thuần trưởng thành từ thiếu niên ngốc nghếch thành cường giả chấn động trời đất. Đường tu: thành thật, kiên nhẫn, và yêu thương.", plays:218, likes:70, icon:"♾" },
  { id:"s66", title:"Dị Thường Sinh Vật Kiến Văn Lục", tags:["DARK FANTASY","TRINH THÁM","ĐÔ THỊ"], desc:"Bạn là nhân viên Cục Quản Lý Dị Thường — chuyên xử lý sinh vật siêu nhiên ẩn nấp trong đô thị. Hôm nay có báo cáo: 'Thang máy tầng 13 đưa người đến nơi không tồn tại.'", plays:177, likes:56, icon:"👁" },
  { id:"s67", title:"Mạt Thế Chi Vương — Đế Quốc Từ Đống Đổ Nát", tags:["MẠT THẾ","XÂY DỰNG","SINH TỒN"], desc:"Mạt thế năm thứ 3. Thành phố tan hoang, nhưng bạn không chỉ sống sót — bạn xây dựng. Từ căn cứ nhỏ đến pháo đài, từ đội quân vài người đến quốc gia mới.", plays:194, likes:62, icon:"🏗" },
  { id:"s68", title:"Vạn Cổ Đệ Nhất Thần", tags:["HUYỀN HUYỄN"], desc:"Vạn cổ đệ nhất — không phải tự xưng, mà là thiên đạo công nhận. Nhưng trước đó, bạn chỉ là đứa trẻ trong thôn nhỏ, mơ ước lớn nhất là ăn no mỗi ngày.", plays:207, likes:66, icon:"🌠" },
];


const SYSTEM_PROMPT = `Bạn là nhà văn tiểu thuyết tương tác Việt Nam. Viết tiếng Việt có dấu, dùng "bạn" cho nhân vật chính. Mỗi đoạn 200-300 từ, kết thúc cliffhanger. LUÔN kết thúc bằng 3 lựa chọn cụ thể chi tiết (15+ từ mỗi lựa chọn):
---CHOICES---
[A] Hành động cụ thể gắn bối cảnh...
[B] Hành động khác biệt hoàn toàn...
[C] Hành động bất ngờ sáng tạo...
---END---
KHÔNG viết lựa chọn chung chung. Mỗi lựa chọn dẫn đến diễn biến khác nhau.`;

// Groq API — Llama 3.3 70B, cực nhanh, miễn phí
async function callAI(messages) {
  const clean = messages.filter(m => m.content && !String(m.content).startsWith("⚠") && !String(m.content).startsWith("Lỗi"));
  const fixed = [];
  for (const m of clean) {
    if (fixed.length === 0 && m.role !== "user") continue;
    if (fixed.length > 0 && fixed[fixed.length-1].role === m.role) continue;
    fixed.push({ role: m.role, content: String(m.content).slice(0, 2000) });
  }
  if (fixed.length === 0 || fixed[fixed.length-1].role !== "user") {
    fixed.push({ role:"user", content: messages[0]?.content || "Viết chương tiếp theo." });
  }
  const trimmed = fixed.length > 12 ? [fixed[0], ...fixed.slice(-11)] : fixed;

  let apiKey = LS("tai-apikey", "");
  if (!apiKey) {
    try { const fbKey = await fbGet("config/apikey"); if (fbKey) { apiKey = fbKey; LSSet("tai-apikey", fbKey); } } catch(e) {}
  }
  if (!apiKey) return "⚠ Chưa có API Key. Admin vào Admin Panel → nhập Groq API Key.";

  // Format OpenAI-compatible cho Groq
  const groqMsgs = [{ role:"system", content: SYSTEM_PROMPT }, ...trimmed];

  const doCall = async (msgs, retries = 3) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type":"application/json", "Authorization":"Bearer " + apiKey },
        body: JSON.stringify({ model:"llama-3.3-70b-versatile", messages: msgs, max_tokens:1024, temperature:0.9 }),
      });
      if (r.ok) {
        const d = await r.json();
        return d.choices?.[0]?.message?.content || null;
      }
      if (r.status === 429 && attempt < retries) {
        const wait = (attempt + 1) * 5;
        console.log(`Rate limited, retry ${attempt+1}/${retries} in ${wait}s...`);
        await new Promise(res => setTimeout(res, wait * 1000));
        continue;
      }
      let errMsg = "";
      try { const eb = await r.json(); errMsg = eb.error?.message || ""; } catch(e) {}
      console.error("Groq", r.status, errMsg);
      if (r.status === 401) return "⚠ API Key không hợp lệ.";
      if (r.status === 429) return "⚠ Đang chờ API... thử lại sau 30 giây.";
      if (r.status === 413) return null;
      return null;
    }
    return null;
  };

  // Lần 1: gọi với lịch sử
  try {
    const r1 = await doCall(groqMsgs);
    if (r1) return r1;
  } catch(e) { console.error("Groq 1:", e); }

  // Lần 2: chỉ message cuối (nếu lịch sử quá dài)
  try {
    const last = trimmed.filter(m => m.role === "user").pop();
    const r2 = await doCall([{ role:"system", content:SYSTEM_PROMPT }, { role:"user", content: last?.content || "Viết tiếp." }]);
    if (r2) return r2;
  } catch(e) { console.error("Groq 2:", e); }

  return "⚠ Groq API lỗi. Kiểm tra Console (F12).";
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
function StoryCard({ story, onStart, onReset, saved, onLike, onFav, isLiked, isFav }) {
  return (
    <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",transition:"all .25s",position:"relative" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent+"40";e.currentTarget.style.boxShadow="0 4px 20px rgba(90,70,50,0.08)";}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.boxShadow="";}}>
      <div style={{ height:2,background:`linear-gradient(90deg,transparent,${C.accent}40,transparent)` }} />
      <div style={{ padding:"16px 18px 0",display:"flex",flexWrap:"wrap",alignItems:"flex-start",gap:4 }}>
        <div style={{ flex:1,display:"flex",flexWrap:"wrap",gap:3 }}>{story.tags.map(t=><Tag key={t} name={t}/>)}</div>
      </div>
      <div style={{ padding:"12px 18px" }}>
        <h3 style={{ fontFamily:"'Noto Serif',serif",fontSize:17,fontWeight:700,color:C.ink,marginBottom:10,lineHeight:1.4 }}>{story.title}</h3>
        <p style={{ fontSize:13,color:C.textDim,lineHeight:1.65,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden",minHeight:52 }}>{story.desc}</p>
      </div>
      <div style={{ padding:"0 18px 10px",display:"flex",gap:10,fontSize:11,color:C.textMuted,alignItems:"center" }}>
        <span>▸ {story.plays} lượt</span>
        <button onClick={()=>onLike(story.id)} style={{ background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:isLiked?C.red:C.textMuted,padding:0 }}>{isLiked?"♥":"♡"} {story.likes + (isLiked?1:0)}</button>
        <button onClick={()=>onFav(story.id)} style={{ background:"transparent",border:"none",cursor:"pointer",fontSize:12,color:isFav?"#8b6914":C.textMuted,padding:0,marginLeft:"auto" }}>{isFav?"★ Đã lưu":"☆ Lưu"}</button>
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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) { setErr("Vui lòng nhập email và mật khẩu"); return; }
    try {
      initFirebase();
      const auth = window.firebase.auth();
      const result = await auth.signInWithEmailAndPassword(email.trim(), password);
      const fbUser = result.user;
      if (!fbUser.emailVerified) {
        await auth.signOut();
        setErr("Email chưa xác thực. Kiểm tra hộp thư (và spam) để bấm link xác nhận.");
        return;
      }
      const emailKey = email.trim().toLowerCase().replace(/[.#$\[\]]/g,"_");
      let userData = await fbGet("users/" + emailKey);
      if (!userData) {
        userData = { name: fbUser.displayName || email.split("@")[0], email: fbUser.email, xu: DEFAULT_XU, createdAt: Date.now(), method: "email" };
      }
      userData.lastLogin = Date.now();
      await fbSet("users/" + emailKey, userData);
      LSSet("tai-users", [userData]);
      onLogin({ name: userData.name, email: userData.email, isAdmin: false, xu: userData.xu ?? DEFAULT_XU });
    } catch(e) {
      console.error("Login:", e);
      if (e.code === "auth/user-not-found") setErr("Email chưa được đăng ký");
      else if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") setErr("Sai mật khẩu");
      else if (e.code === "auth/too-many-requests") setErr("Quá nhiều lần thử. Đợi vài phút.");
      else setErr("Lỗi: " + (e.message || e.code));
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) { setErr("Vui lòng nhập đầy đủ thông tin"); return; }
    if (password.length < 6) { setErr("Mật khẩu ít nhất 6 ký tự"); return; }
    try {
      initFirebase();
      const auth = window.firebase.auth();
      const result = await auth.createUserWithEmailAndPassword(email.trim(), password);
      // Gửi email xác thực
      await result.user.sendEmailVerification();
      await result.user.updateProfile({ displayName: name.trim() });
      // Lưu user vào database (chưa verified)
      const emailKey = email.trim().toLowerCase().replace(/[.#$\[\]]/g,"_");
      const newUser = { name: name.trim(), email: email.trim().toLowerCase(), xu: DEFAULT_XU, createdAt: Date.now(), lastLogin: Date.now(), method: "email", verified: false };
      await fbSet("users/" + emailKey, newUser);
      await auth.signOut();
      setView("verify");
    } catch(e) {
      console.error("Register:", e);
      if (e.code === "auth/email-already-in-use") setErr("Email đã tồn tại");
      else if (e.code === "auth/invalid-email") setErr("Email không hợp lệ");
      else if (e.code === "auth/weak-password") setErr("Mật khẩu quá yếu (cần ít nhất 6 ký tự)");
      else setErr("Lỗi: " + (e.message || e.code));
    }
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

        {/* ─── VERIFY EMAIL VIEW ─── */}
        {view === "verify" && (
          <div style={{ background:C.bg2, border:`1px solid ${C.green}30`, borderRadius:18, padding:"32px 28px", textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📧</div>
            <h2 style={{ fontFamily:"'Noto Serif',serif", fontSize:22, fontWeight:700, color:C.text, marginBottom:12 }}>Kiểm tra email!</h2>
            <p style={{ color:C.textDim, fontSize:14, lineHeight:1.7, marginBottom:8 }}>
              Chúng tôi đã gửi link xác thực đến<br/>
              <strong style={{color:C.text}}>{email}</strong>
            </p>
            <p style={{ color:C.textMuted, fontSize:12, marginBottom:24, lineHeight:1.6 }}>
              Bấm link trong email để kích hoạt tài khoản.<br/>
              Nhớ kiểm tra cả thư mục <strong>Spam</strong> nhé!
            </p>
            <button onClick={()=>{setView("login");setErr("");}} style={{ width:"100%", background:`linear-gradient(135deg,${C.gold},${C.goldDark})`, border:"none", color:"#f5efe3", padding:"14px", borderRadius:12, fontSize:16, fontWeight:700, cursor:"pointer" }}>
              Đã xác thực → Đăng nhập
            </button>
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
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [xuEdit, setXuEdit] = useState({});
  const [loading, setLoading] = useState(true);

  // Load users from Firebase + localStorage
  useEffect(() => {
    (async () => {
      const localUsers = LS("tai-users", []);
      let allUsers = [...localUsers];
      try {
        const fbUsers = await fbGet("users");
        if (fbUsers) {
          const fbList = Object.values(fbUsers);
          // Merge: Firebase users override local
          for (const fbu of fbList) {
            const idx = allUsers.findIndex(u => u.email === fbu.email);
            if (idx >= 0) allUsers[idx] = { ...allUsers[idx], ...fbu };
            else allUsers.push(fbu);
          }
        }
      } catch(e) {}
      setUsers(allUsers);
      setLoading(false);
    })();
  }, []);

  const filtered = search ? users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())) : users;
  const saveUser = (email, data) => {
    const emailKey = email.replace(/[.#$\[\]]/g,"_");
    fbSet("users/" + emailKey, data);
    const up = users.map(u => u.email === email ? data : u);
    setUsers(up); LSSet("tai-users", up);
  };
  const updateXu = (email, amt) => {
    const u = users.find(u => u.email === email);
    if (!u) return;
    const updated = { ...u, xu: Math.max(0, (u.xu||0) + amt) };
    saveUser(email, updated);
  };
  const setXuDirect = (email, val) => {
    const u = users.find(u => u.email === email);
    if (!u) return;
    saveUser(email, { ...u, xu: Math.max(0, val) });
  };
  const toggleBan = (email) => {
    const u = users.find(u => u.email === email);
    if (!u) return;
    saveUser(email, { ...u, banned: !u.banned });
  };
  const deleteUser = (email) => {
    if (!confirm("Xóa user " + email + "?")) return;
    const emailKey = email.replace(/[.#$\[\]]/g,"_");
    fbSet("users/" + emailKey, null);
    const up = users.filter(u => u.email !== email);
    setUsers(up); LSSet("tai-users", up);
  };
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
  const save = async () => { LSSet("tai-bank",bank); await fbSet("config/bank",bank); alert("✅ Đã lưu thông tin ngân hàng!"); };
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
  const [fbConfig, setFbConfig] = useState(LS("tai-firebase-config",{apiKey:"",authDomain:"",databaseURL:"",projectId:""}));
  const [fbStatus, setFbStatus] = useState("");

  // Load API key from Firebase on mount
  useEffect(() => {
    (async () => {
      const fbKey = await fbGet("config/apikey");
      if (fbKey && !apiKey) { setApiKey(fbKey); LSSet("tai-apikey", fbKey); }
    })();
  }, []);

  const saveApiKey = async () => {
    LSSet("tai-apikey", apiKey);
    await fbSet("config/apikey", apiKey);
    alert("✅ API Key đã lưu!");
  };

  const saveFirebaseConfig = () => {
    if (!fbConfig.databaseURL) { alert("Cần nhập Database URL!"); return; }
    // Auto-generate authDomain from projectId
    const fullConfig = {
      ...fbConfig,
      authDomain: fbConfig.projectId ? fbConfig.projectId + ".firebaseapp.com" : "",
    };
    LSSet("tai-firebase-config", fullConfig);
    _fb = null; // Reset connection
    try {
      // Re-init firebase with new config
      if (window.firebase?.apps?.length) {
        window.firebase.app().delete().then(() => {
          window.firebase.initializeApp(fullConfig);
          _fb = window.firebase.database();
          setFbStatus("✅ Kết nối Firebase thành công!");
          alert("✅ Firebase đã kết nối!");
        });
      } else {
        window.firebase.initializeApp(fullConfig);
        _fb = window.firebase.database();
        setFbStatus("✅ Kết nối Firebase thành công!");
        alert("✅ Firebase đã kết nối!");
      }
    } catch(e) {
      console.error("Firebase init:", e);
      // Nếu app đã tồn tại, thử dùng app hiện tại
      try {
        _fb = window.firebase.database();
        setFbStatus("✅ Kết nối Firebase thành công!");
        alert("✅ Firebase đã kết nối!");
      } catch(e2) {
        setFbStatus("❌ Lỗi: " + e.message);
      }
    }
  };

  const generateTokens = async () => {
    const arr = [];
    for (let i=0; i<newCount; i++) {
      const t = { code:"TAI-"+Math.random().toString(36).substring(2,8).toUpperCase()+"-"+Date.now().toString(36).slice(-4).toUpperCase(), xu:newXu, used:false, createdAt:Date.now() };
      arr.push(t);
      await fbSet("tokens/" + t.code, t);
    }
    const all = [...tokens,...arr]; setTokens(all); LSSet("tai-tokens",all);
  };

  const deleteToken = async (code) => {
    const f = tokens.filter(t=>t.code!==code); setTokens(f); LSSet("tai-tokens",f);
    await fbSet("tokens/" + code, null);
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
        <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:4 }}>⚙️ Cấu hình API Key (Groq — Miễn phí, cực nhanh)</h3>
        <p style={{ color:C.textMuted,fontSize:11,marginBottom:12 }}>Bắt buộc để AI viết truyện. Groq miễn phí 30 request/phút, trả kết quả dưới 1 giây.</p>
        
        <div style={{ background:C.bg3,borderRadius:10,padding:"14px 16px",marginBottom:14,fontSize:12,color:C.textDim,lineHeight:1.8 }}>
          <div style={{fontWeight:700,color:C.gold,marginBottom:4,fontSize:13}}>📋 Cách lấy API Key (MIỄN PHÍ, 1 phút):</div>
          <div>1️⃣ Truy cập <span style={{color:C.gold,fontWeight:600}}>console.groq.com/keys</span></div>
          <div>2️⃣ Đăng nhập bằng Google hoặc GitHub</div>
          <div>3️⃣ Bấm <span style={{color:C.gold,fontWeight:600}}>Create API Key</span> → đặt tên bất kỳ</div>
          <div>4️⃣ Copy key (bắt đầu bằng <code style={{background:C.accent+"10",padding:"1px 6px",borderRadius:4,color:C.gold}}>gsk_...</code>)</div>
          <div>5️⃣ Dán vào ô bên dưới → bấm 💾 Lưu</div>
        </div>

        <div style={{ display:"flex",gap:8 }}>
          <input type={showKey?"text":"password"} value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="gsk_..." style={{...inputS,flex:1,fontFamily:"monospace",fontSize:12}} />
          <button onClick={()=>setShowKey(!showKey)} style={{...inputS,cursor:"pointer",color:C.textDim,border:`1px solid ${C.border}` }}>{showKey?"🙈":"👁"}</button>
          <button onClick={saveApiKey} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"8px 18px",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13 }}>💾 Lưu</button>
        </div>
        {apiKey && <p style={{ color:C.green,fontSize:11,marginTop:8 }}>✅ Groq API Key đã cấu hình — Miễn phí, cực nhanh!</p>}
      </div>

      {/* Bank Config for QR Payment */}
      <BankConfig inputS={inputS} />

      {/* Firebase Config — đồng bộ dữ liệu */}
      <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20,marginBottom:20 }}>
        <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:4 }}>🔥 Firebase (Đồng bộ dữ liệu)</h3>
        <p style={{ color:C.textMuted,fontSize:11,marginBottom:12 }}>Kết nối Firebase để Admin quản lý user, bank config, API key hoạt động trên mọi thiết bị.</p>
        <div style={{ background:C.bg3,borderRadius:10,padding:"14px 16px",marginBottom:14,fontSize:12,color:C.textDim,lineHeight:1.8 }}>
          <div style={{fontWeight:700,color:C.gold,marginBottom:4}}>Cách tạo Firebase (miễn phí):</div>
          <div>1. Vào <span style={{color:C.gold,fontWeight:600}}>console.firebase.google.com</span></div>
          <div>2. Bấm "Add project" → đặt tên (VD: truyenai) → tạo</div>
          <div>3. Vào Realtime Database → Create Database → chọn region → Start in <strong>test mode</strong></div>
          <div>4. Copy Database URL (dạng: https://truyenai-xxxxx-default-rtdb.firebaseio.com)</div>
          <div>5. Vào Project Settings (bánh răng) → copy: apiKey, authDomain, projectId</div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:12 }}>
          <input value={fbConfig.databaseURL||""} onChange={e=>setFbConfig({...fbConfig,databaseURL:e.target.value})} placeholder="Database URL: https://xxx-default-rtdb.firebaseio.com" style={{...inputS,fontSize:12,fontFamily:"monospace"}} />
          <div style={{ display:"flex",gap:8 }}>
            <input value={fbConfig.apiKey||""} onChange={e=>setFbConfig({...fbConfig,apiKey:e.target.value})} placeholder="API Key (từ Project Settings)" style={{...inputS,flex:1,fontSize:11}} />
            <input value={fbConfig.projectId||""} onChange={e=>setFbConfig({...fbConfig,projectId:e.target.value})} placeholder="Project ID" style={{...inputS,flex:1,fontSize:11}} />
          </div>
        </div>
        <button onClick={saveFirebaseConfig} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"8px 18px",borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13 }}>🔗 Kết nối Firebase</button>
        {fbStatus && <p style={{ fontSize:11,marginTop:8,color:fbStatus.includes("✅")?C.green:C.red }}>{fbStatus}</p>}
      </div>

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
  const [tab, setTab] = useState("token");
  const [payingPkg, setPayingPkg] = useState(null);
  const [bank, setBank] = useState(LS("tai-bank", { bankId:"", accountNo:"", accountName:"" }));
  const [tokenCode, setTokenCode] = useState("");
  const [tokenMsg, setTokenMsg] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [xuHistory, setXuHistory] = useState(LS("tai-xu-history",[]));

  useEffect(() => {
    (async () => {
      const fbBank = await fbGet("config/bank");
      if (fbBank && fbBank.accountNo) { setBank(fbBank); LSSet("tai-bank", fbBank); }
    })();
  }, []);

  const tabItems = [
    { id:"token", label:"🎫 Nhập Token" },
    { id:"topup", label:"💰 Nạp xu" },
    { id:"history", label:"🕐 Lịch sử" },
  ];

  // Nhập token để nhận xu
  const redeemToken = async () => {
    if (!tokenCode.trim()) { setTokenMsg("❌ Nhập mã token!"); return; }
    setTokenLoading(true); setTokenMsg("");
    const code = tokenCode.trim().toUpperCase();
    // Kiểm tra token ở Firebase
    const fbToken = await fbGet("tokens/" + code);
    if (!fbToken) {
      // Fallback: kiểm tra localStorage (cùng máy admin)
      const localTokens = LS("tai-tokens", []);
      const local = localTokens.find(t => t.code === code && !t.used);
      if (!local) { setTokenMsg("❌ Token không tồn tại hoặc đã sử dụng."); setTokenLoading(false); return; }
      local.used = true; local.usedBy = user?.email; local.usedAt = Date.now();
      LSSet("tai-tokens", localTokens);
      await fbSet("tokens/" + code, local);
      onAddXu(local.xu);
      addXuHistory("token", local.xu, "Nhập token " + code);
      setTokenMsg(`✅ Nhận ${local.xu} xu từ token ${code}!`);
      setTokenCode("");
      setTokenLoading(false);
      return;
    }
    if (fbToken.used) { setTokenMsg("❌ Token đã được sử dụng bởi " + (fbToken.usedBy||"ai đó") + "."); setTokenLoading(false); return; }
    // Sử dụng token
    fbToken.used = true; fbToken.usedBy = user?.email; fbToken.usedAt = Date.now();
    await fbSet("tokens/" + code, fbToken);
    onAddXu(fbToken.xu);
    addXuHistory("token", fbToken.xu, "Nhập token " + code);
    setTokenMsg(`✅ Nhận ${fbToken.xu} xu từ token ${code}!`);
    setTokenCode("");
    setTokenLoading(false);
  };

  const addXuHistory = (type, amount, desc) => {
    const entry = { type, amount, desc, time: Date.now() };
    const h = [entry, ...xuHistory].slice(0, 50);
    setXuHistory(h); LSSet("tai-xu-history", h);
    // Cập nhật tổng xu đã dùng lên Firebase cho xếp hạng
    const emailKey = user?.email?.replace(/[.#$\[\]]/g,"_");
    if (emailKey) fbUpdate("users/" + emailKey, { xu: xu + amount, totalXuEarned: (LS("tai-total-earned",0)) + (amount > 0 ? amount : 0) });
    if (amount > 0) { const t = LS("tai-total-earned",0) + amount; LSSet("tai-total-earned", t); }
  };

  const handlePay = (pkg) => {
    if (!bank.accountNo) {
      alert("Chức năng nạp xu chưa sẵn sàng. Vui lòng liên hệ Admin!");
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

      {/* Tab: Nhập Token */}
      {tab==="token" && (
        <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:24 }}>
          <h3 style={{ fontFamily:"'Noto Serif',serif",fontSize:18,fontWeight:700,color:C.text,marginBottom:4 }}>🎫 Nhập mã Token</h3>
          <p style={{ color:C.textDim,fontSize:13,marginBottom:16 }}>Nhập mã token từ Admin để nhận xu miễn phí</p>
          <div style={{ display:"flex",gap:8,marginBottom:12 }}>
            <input value={tokenCode} onChange={e=>setTokenCode(e.target.value.toUpperCase())} placeholder="VD: TAI-ABC123-XY7Z" onKeyDown={e=>e.key==="Enter"&&redeemToken()} style={{ flex:1,background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 14px",color:C.text,fontSize:15,fontFamily:"monospace",outline:"none",letterSpacing:1 }} />
            <button onClick={redeemToken} disabled={tokenLoading} style={{ background:`linear-gradient(135deg,${C.gold},${C.goldDark})`,border:"none",color:"#f5efe3",padding:"12px 24px",borderRadius:8,fontSize:14,fontWeight:700,cursor:tokenLoading?"wait":"pointer",opacity:tokenLoading?0.6:1 }}>{tokenLoading?"⏳":"✨ Đổi xu"}</button>
          </div>
          {tokenMsg && <div style={{ padding:"10px 14px",borderRadius:8,background:tokenMsg.includes("✅")?`${C.green}10`:`${C.red}10`,border:`1px solid ${tokenMsg.includes("✅")?C.green+"30":C.red+"30"}`,color:tokenMsg.includes("✅")?C.green:C.red,fontSize:13,fontWeight:600 }}>{tokenMsg}</div>}

          <div style={{ marginTop:24,padding:"16px",background:C.bg3,borderRadius:10 }}>
            <div style={{ fontSize:13,fontWeight:700,color:C.text,marginBottom:8 }}>💡 Cách nhận Token</div>
            <div style={{ fontSize:12,color:C.textDim,lineHeight:1.8 }}>
              <div>• Liên hệ Admin để mua hoặc nhận token miễn phí</div>
              <div>• Token có dạng: <code style={{color:C.gold}}>TAI-XXXXXX-YYYY</code></div>
              <div>• Mỗi token chỉ dùng được 1 lần</div>
              <div>• Xu được cộng ngay lập tức sau khi nhập</div>
            </div>
          </div>

          {/* Xu hiện có */}
          <div style={{ marginTop:20,background:`${C.gold}08`,border:`1px solid ${C.gold}20`,borderRadius:12,padding:"16px 20px",textAlign:"center" }}>
            <div style={{ fontSize:12,color:C.textDim }}>Xu hiện có</div>
            <div style={{ fontSize:32,fontWeight:800,color:C.gold }}>{fmtNum(xu)}</div>
          </div>
        </div>
      )}

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

      {/* Tab: Lịch sử xu */}
      {tab==="history" && (
        <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:24 }}>
          <h3 style={{ color:C.text,fontSize:16,fontWeight:700,marginBottom:16 }}>Lịch sử giao dịch xu</h3>
          {xuHistory.length === 0 ? (
            <div style={{ textAlign:"center",padding:40,color:C.textMuted,fontSize:14 }}>
              <div style={{ fontSize:40,marginBottom:8 }}>📋</div>Chưa có giao dịch nào
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {xuHistory.map((h,i) => (
                <div key={i} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.bg3,borderRadius:8 }}>
                  <span style={{ fontSize:18 }}>{h.amount>0?"💰":"💸"}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13,fontWeight:600,color:C.text }}>{h.desc}</div>
                    <div style={{ fontSize:11,color:C.textMuted }}>{new Date(h.time).toLocaleString("vi-VN")}</div>
                  </div>
                  <span style={{ fontSize:14,fontWeight:700,color:h.amount>0?C.green:C.red }}>{h.amount>0?"+":""}{h.amount} xu</span>
                </div>
              ))}
            </div>
          )}
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
const UNDO_COST = XU_PER_CHAPTER * 2; // Quay lại mất gấp đôi

// Hệ thống cảnh giới theo thể loại
const POWER_SYSTEMS = {
  "TIÊN HIỆP": { name:"Tu Tiên", ranks:["Luyện Khí","Trúc Cơ","Kim Đan","Nguyên Anh","Hóa Thần","Luyện Hư","Hợp Thể","Đại Thừa","Độ Kiếp"], stats:["Linh Lực","Thần Thức","Thể Chất","Linh Căn","Đan Điền"], currency:"Linh Thạch", items:"pháp khí, linh đan, hộ thân phù" },
  "HUYỀN HUYỄN": { name:"Đấu Khí", ranks:["Đấu Giả","Đấu Sư","Đại Đấu Sư","Đấu Linh","Đấu Vương","Đấu Hoàng","Đấu Tông","Đấu Tôn","Đấu Thánh","Đấu Đế"], stats:["Đấu Khí","Hồn Lực","Tốc Độ","Sức Mạnh","Thể Chất"], currency:"Kim Hồn Tệ", items:"võ hồn, hồn cốt, hồn hoàn" },
  "FANTASY": { name:"Thợ Săn", ranks:["Rank E","Rank D","Rank C","Rank B","Rank A","Rank S","Rank SS","Rank SSS"], stats:["Sức Mạnh","Tốc Độ","Trí Tuệ","Mana","Thể Lực"], currency:"Gold", items:"vũ khí, giáp, thú triệu hồi" },
  "ISEKAI": { name:"Giác Tỉnh", ranks:["Lv.1 Tân Binh","Lv.10 Mạo Hiểm","Lv.25 Chiến Binh","Lv.50 Anh Hùng","Lv.75 Truyền Thuyết","Lv.99 Thần Thoại"], stats:["HP","MP","ATK","DEF","SPD","LUK"], currency:"Gold", items:"trang bị, skill book, potion" },
  "DARK FANTASY": { name:"Ma Đạo", ranks:["Giác Tỉnh Giả","Hắc Thiết","Bạch Ngân","Hoàng Kim","Bạch Kim","Kim Cương","Truyền Thuyết"], stats:["Hắc Ám Lực","Sinh Mệnh","Ý Chí","Tốc Độ","Ma Kháng"], currency:"Hồn Phách", items:"ma khí, tà khí, nguyền chú" },
  "ĐÔ THỊ": { name:"Cấp Bậc", ranks:["Bình Thường","Giác Tỉnh","Tinh Anh","Cao Thủ","Tông Sư","Vương Giả","Thánh"], stats:["Thể Lực","Trí Tuệ","Quan Hệ","Tài Sản","Uy Tín"], currency:"VND", items:"vũ khí, xe, nhà, quan hệ" },
  "MẠT THẾ": { name:"Sinh Tồn", ranks:["Dân Thường","Sống Sót","Chiến Binh","Thủ Lĩnh","Chúa Tể Vùng","Bá Chủ"], stats:["Sinh Tồn","Chiến Đấu","Chế Tạo","Lãnh Đạo","Tinh Thần"], currency:"Vật Tư", items:"vũ khí, thực phẩm, thuốc, đạn" },
  "TRINH THÁM": { name:"Thám Tử", ranks:["Thực Tập","Điều Tra Viên","Thám Tử","Thanh Tra","Cảnh Sát Trưởng","Huyền Thoại"], stats:["Quan Sát","Suy Luận","Chiến Đấu","Xã Hội","Bản Lĩnh"], currency:"Tiền Thưởng", items:"dụng cụ điều tra, vũ khí, manh mối" },
  "KHOA HỌC": { name:"Phi Hành", ranks:["Tân Binh","Kỹ Sư","Chỉ Huy Phó","Chỉ Huy","Đô Đốc","Huyền Thoại"], stats:["Kỹ Thuật","Thể Lực","Trí Tuệ","Lãnh Đạo","Thích Nghi"], currency:"Credit", items:"công nghệ, vũ khí laser, giáp năng lượng" },
  "LỊCH SỬ": { name:"Quan Vị", ranks:["Bình Dân","Binh Sĩ","Tướng Quân","Đại Tướng","Vương","Hoàng Đế","Thiên Tử"], stats:["Võ Lực","Trí Mưu","Chính Trị","Lãnh Đạo","Uy Tín"], currency:"Lượng Vàng", items:"binh khí, ngựa chiến, quân đội" },
  "SLICE OF LIFE": { name:"Cuộc Sống", ranks:["Tân Thủ","Quen Việc","Chuyên Gia","Bậc Thầy","Huyền Thoại"], stats:["Kỹ Năng","Sức Khỏe","Quan Hệ","Tài Chính","Hạnh Phúc"], currency:"Tiền", items:"dụng cụ, nguyên liệu, sách" },
  "HỆ THỐNG": { name:"Hệ Thống", ranks:["Lv.1","Lv.10","Lv.25","Lv.50","Lv.75","Lv.99","Lv.MAX"], stats:["STR","AGI","INT","VIT","LUK","Điểm Hệ Thống"], currency:"Điểm Kinh Nghiệm", items:"skill book, buff item, random box" },
  "TRỌNG SINH": { name:"Trọng Sinh", ranks:["Vừa Trọng Sinh","Tích Lũy","Bùng Nổ","Xưng Bá","Đỉnh Phong"], stats:["Ký Ức Tiền Kiếp","Tu Vi","Quan Hệ","Tài Sản","Thiên Mệnh"], currency:"Linh Thạch", items:"bí kíp tiền kiếp, nhân mạch, cơ duyên" },
  "XUYÊN KHÔNG": { name:"Xuyên Không", ranks:["Vừa Xuyên","Thích Nghi","Nổi Danh","Quyền Quý","Chí Tôn"], stats:["Thích Nghi","Kiến Thức Hiện Đại","Võ Lực","Mưu Trí","Hậu Cung"], currency:"Bạc", items:"kiến thức hiện đại, thuốc, vũ khí" },
  "KIẾM HIỆP": { name:"Kiếm Đạo", ranks:["Kiếm Đồng","Kiếm Giả","Kiếm Sư","Đại Kiếm Sư","Kiếm Thánh","Kiếm Thần"], stats:["Kiếm Ý","Nội Lực","Khinh Công","Thể Chất","Ngộ Tính"], currency:"Lượng Bạc", items:"kiếm, bí kíp, nội công tâm pháp" },
  "VÕ HIỆP": { name:"Võ Công", ranks:["Sơ Nhập Giang Hồ","Tam Lưu","Nhị Lưu","Nhất Lưu","Tuyệt Đỉnh","Phá Hư Cảnh"], stats:["Nội Lực","Ngoại Công","Khinh Công","Ám Khí","Kinh Nghiệm Giang Hồ"], currency:"Lượng Bạc", items:"binh khí, bí kíp, ngựa" },
  "GAME": { name:"Game System", ranks:["Bronze","Silver","Gold","Platinum","Diamond","Master","Challenger"], stats:["ATK","DEF","HP","MP","CRIT","SPD"], currency:"Gold", items:"trang bị, item, pet" },
  "SIÊU NĂNG": { name:"Siêu Năng", ranks:["Giác Tỉnh","E","D","C","B","A","S","Quốc Bảo"], stats:["Năng Lực Chính","Kiểm Soát","Thể Chất","Tinh Thần","Phạm Vi"], currency:"Tín Dụng", items:"thiết bị hỗ trợ, thuốc tăng cường" },
  "NGÔN TÌNH": { name:"Tình Duyên", ranks:["Xa Lạ","Quen Biết","Bạn Bè","Tình Cảm","Yêu Đương","Kết Duyên"], stats:["Nhan Sắc","Trí Tuệ","EQ","Gia Thế","Duyên Phận"], currency:"Bạc", items:"trang sức, thư tín, quà tặng" },
};

function getGenreSystem(tags) {
  for (const tag of tags) {
    if (POWER_SYSTEMS[tag]) return POWER_SYSTEMS[tag];
  }
  return POWER_SYSTEMS["FANTASY"];
}

const CHAR_PROMPT_BASE = `Bạn tạo nhân vật cho tiểu thuyết tương tác. Trả về JSON thuần (KHÔNG markdown, KHÔNG backtick):
{"rank":"Cấp bậc khởi đầu thấp","rankDesc":"Mô tả 1 câu","mainStats":[{"name":"Tên chỉ số","value":"Giá trị số hoặc text"}],"skills":[{"name":"Tên","desc":"Mô tả ngắn"}],"items":[{"name":"Tên","desc":"Mô tả","qty":1}],"backstory":"Tiểu sử 2-3 câu tiếng Việt"}
Quan trọng: nhân vật phải BẮT ĐẦU Ở CẤP THẤP NHẤT, yếu ớt, nhiều tiềm năng.`;

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
    const sys = getGenreSystem(story.tags);
    const prompt = `Truyện: "${story.title}" — ${story.desc}\nThể loại: ${story.tags.join(", ")}\nHệ thống: ${sys.name}\nCác cấp bậc: ${sys.ranks.join(" → ")}\nChỉ số quan trọng: ${sys.stats.join(", ")}\nĐơn vị tiền: ${sys.currency}\nVật phẩm phổ biến: ${sys.items}\nNhân vật: ${charName.trim()}, giới tính: ${gender}\n\n${CHAR_PROMPT_BASE}`;
    const resp = await callAI([{ role: "user", content: prompt }]);
    try {
      const clean = resp.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      setCharData({ ...data, name: charName.trim(), gender, system: sys });
      setStep("sheet");
    } catch {
      // Fallback — tạo nhân vật random theo hệ thống
      const rank = sys.ranks[0];
      const mainStats = sys.stats.map(s => ({ name:s, value: 5 + Math.floor(Math.random()*15) }));
      setCharData({
        rank, rankDesc: `${rank} — khởi đầu từ con số không`,
        mainStats,
        skills: [{ name:"Bản Năng Sinh Tồn", desc:"Phản xạ tự nhiên trong nguy hiểm" }],
        items: [{ name:"Túi hành lý cũ", desc:"Đựng vài vật dụng cơ bản", qty:1 }],
        backstory: resp.slice(0, 200) || "Một kẻ vô danh bước vào thế giới mới...",
        name: charName.trim(), gender, system: sys,
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
            <div style={{ fontSize:11, fontWeight:700, color:C.textMuted, letterSpacing:1, textTransform:"uppercase", marginBottom:12 }}>Chỉ số ban đầu {charData.system?.name && `— ${charData.system.name}`}</div>
            <div style={{ display:"flex", flexWrap:"wrap" }}>
              {(charData.mainStats || []).map((s,i) => <StatPill key={i} label={s.name} value={s.value} />)}
              {/* Fallback nếu dùng stats cũ */}
              {!charData.mainStats && charData.stats && Object.entries(charData.stats).map(([k,v]) => <StatPill key={k} label={k} value={v} />)}
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
  const [showCharPanel, setShowCharPanel] = useState(false);
  const [storyEquip, setStoryEquip] = useState(savedData?.equipment || { equipped:[], notes:"" });
  const scrollRef = useRef(null);

  const doSave = useCallback((s,h,c,eq) => {
    const eqData = eq || storyEquip;
    onSave(story.id,{segments:s,history:h,chapter:c,title:story.title,lastPlayed:Date.now(),charData,equipment:eqData});
  },[story,onSave,charData,storyEquip]);

  const toggleEquipItem = (itemName) => {
    const eq = { ...storyEquip };
    if (!eq.equipped) eq.equipped = [];
    if (eq.equipped.includes(itemName)) {
      eq.equipped = eq.equipped.filter(x => x !== itemName);
    } else {
      eq.equipped = [...eq.equipped, itemName];
    }
    setStoryEquip(eq);
    doSave(segments, history, chapter, eq);
  };

  const startStory = useCallback(async()=>{
    if(savedData?.segments?.length) return;
    setLoading(true);
    let charContext = "";
    if (charData) {
      const eqItems = storyEquip.equipped?.length ? storyEquip.equipped.join(", ") : "Chưa có";
      const skills = (charData.skills||[]).map(s=>s.name).join(", ") || "Chưa có";
      charContext = `\nNhân vật: ${charData.name} (${charData.gender}), ${charData.rank}. Trang bị: ${eqItems}. Kỹ năng: ${skills}.`;
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
    if (resp.startsWith("⚠") || resp.startsWith("Lỗi")) {
      const lastSeg = segments.filter(s=>s.narrative).pop();
      const shortMsgs = [{role:"user",content:`Truyện "${story.title}". Đoạn gần nhất: "${(lastSeg?.narrative||"").slice(0,300)}..." Người chơi chọn: "${choice.text}". Viết tiếp.`}];
      resp = await callAI(shortMsgs);
    }
    const parsed = parseResponse(resp);
    const h = [...newMsgs,{role:"assistant",content:resp}];
    const s = [...segments,{chosenText:choice.text,chosenId:choice.id},parsed];
    setHistory(h); setSegments(s); doSave(s,h,nc);
    setLoading(false);
  };

  // Quay lại lựa chọn trước — mất gấp đôi xu
  const handleUndo = () => {
    if (segments.length < 3) { alert("Không thể quay lại — đang ở chương đầu!"); return; }
    if (xu < UNDO_COST) { alert(`Cần ${UNDO_COST} xu để quay lại!`); return; }
    if (!confirm(`Quay lại lựa chọn trước? Tốn ${UNDO_COST} xu (gấp đôi bình thường).`)) return;
    onSpendXu(UNDO_COST);
    // Xóa 2 segments cuối (narrative + choice trước đó)
    const newSegs = segments.slice(0, -2);
    // Xóa 2 messages cuối trong history (user choice + assistant response)
    const newHist = history.slice(0, -2);
    const nc = Math.max(1, chapter - 1);
    setSegments(newSegs); setHistory(newHist); setChapter(nc);
    doSave(newSegs, newHist, nc);
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
        {charData && <button onClick={()=>setShowCharPanel(!showCharPanel)} style={{ background:showCharPanel?C.accent:C.bg2,border:`1px solid ${showCharPanel?C.accent:C.border}`,color:showCharPanel?"#f5efe3":C.text,width:34,height:34,borderRadius:9,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }} title="Trang bị nhân vật">🛡</button>}
      </div>

      {/* Character Equipment Panel */}
      {showCharPanel && charData && (
        <div style={{ position:"absolute",top:60,right:0,bottom:0,width:"min(340px,85vw)",background:C.bg,borderLeft:`1px solid ${C.border}`,zIndex:50,overflowY:"auto",padding:"20px 16px",boxShadow:"-4px 0 20px rgba(0,0,0,0.08)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <h3 style={{ fontFamily:"'Noto Serif',serif",fontSize:16,fontWeight:700,color:C.text }}>🛡 {charData.name}</h3>
            <button onClick={()=>setShowCharPanel(false)} style={{ background:"transparent",border:"none",color:C.textDim,fontSize:18,cursor:"pointer" }}>✕</button>
          </div>

          {/* Rank */}
          <div style={{ background:`${C.accent}08`,border:`1px solid ${C.accent}20`,borderRadius:10,padding:"12px 14px",marginBottom:14,textAlign:"center" }}>
            <div style={{ fontSize:18,fontWeight:700,color:C.accent,fontFamily:"'Noto Serif',serif" }}>{charData.rank}</div>
            <div style={{ fontSize:11,color:C.textDim,marginTop:2 }}>{charData.rankDesc || charData.system?.name || ""}</div>
          </div>

          {/* Stats */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:8 }}>Chỉ số</div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
              {(charData.mainStats || []).map((s,i) => (
                <span key={i} style={{ display:"inline-flex",padding:"4px 10px",borderRadius:6,background:C.bg2,border:`1px solid ${C.border}`,fontSize:11,color:C.textDim,gap:4 }}>
                  <strong style={{color:C.text}}>{s.name}:</strong> {s.value}
                </span>
              ))}
              {!charData.mainStats && charData.stats && Object.entries(charData.stats).slice(0,8).map(([k,v]) => (
                <span key={k} style={{ display:"inline-flex",padding:"4px 10px",borderRadius:6,background:C.bg2,border:`1px solid ${C.border}`,fontSize:11,color:C.textDim,gap:4 }}>
                  <strong style={{color:C.text}}>{k}:</strong> {String(v).slice(0,20)}
                </span>
              ))}
            </div>
          </div>

          {/* Skills */}
          {charData.skills?.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:8 }}>Kỹ năng</div>
              {charData.skills.map((sk,i) => (
                <div key={i} style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",marginBottom:6 }}>
                  <div style={{ fontSize:12,fontWeight:700,color:C.accent }}>{sk.name}</div>
                  <div style={{ fontSize:11,color:C.textDim }}>{sk.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Items — với toggle trang bị */}
          {charData.items?.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:8 }}>Vật phẩm {storyEquip.equipped?.length > 0 && <span style={{color:C.green}}>({storyEquip.equipped.length} đang dùng)</span>}</div>
              {charData.items.map((it,i) => {
                const isEq = storyEquip.equipped?.includes(it.name);
                return (
                  <div key={i} onClick={()=>toggleEquipItem(it.name)} style={{ background:isEq?`${C.green}08`:C.bg2,border:`1px solid ${isEq?C.green+"40":C.border}`,borderRadius:8,padding:"8px 12px",marginBottom:6,cursor:"pointer",transition:"all .2s" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                      <span style={{ fontSize:11,fontWeight:700,color:isEq?C.green:C.accent }}>{isEq?"⚔":"○"} {it.name}</span>
                      {it.qty > 1 && <span style={{ fontSize:10,color:C.textMuted }}>x{it.qty}</span>}
                      <span style={{ marginLeft:"auto",fontSize:9,color:isEq?C.green:C.textMuted }}>{isEq?"Đang dùng":"Bấm để trang bị"}</span>
                    </div>
                    <div style={{ fontSize:11,color:C.textDim,marginTop:2 }}>{it.desc}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Backstory */}
          {charData.backstory && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11,fontWeight:700,color:C.textMuted,textTransform:"uppercase",letterSpacing:1,marginBottom:8 }}>Tiểu sử</div>
              <p style={{ fontSize:12,color:C.textDim,lineHeight:1.7,background:C.bg2,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.border}` }}>{charData.backstory}</p>
            </div>
          )}
        </div>
      )}
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
                  {/* Undo button */}
                  {segments.length >= 3 && (
                    <button onClick={handleUndo} style={{ width:"100%",background:C.bg3,border:`1px dashed ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.textDim,fontSize:12,cursor:"pointer",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                      ↩ Quay lại lựa chọn trước <span style={{color:C.red,fontWeight:700}}>({UNDO_COST} xu)</span>
                    </button>
                  )}
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
                      <button onClick={()=>{if(customInput.trim())handleChoice({id:"D",text:customInput.trim()});}} disabled={!customInput.trim()} style={{ background:customInput.trim()?`linear-gradient(135deg,${C.gold},${C.goldDark})`:"rgba(255,255,255,0.06)",border:"none",color:customInput.trim()?"#f5efe3":"rgba(255,255,255,0.25)",padding:"10px 16px",borderRadius:8,fontSize:13,fontWeight:700,cursor:customInput.trim()?"pointer":"not-allowed",whiteSpace:"nowrap" }}>Gửi</button>
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
function ProfilePage({ user, xu, onUpdateUser }) {
  const progress = LS("tai-progress",{});
  const streak = LS("tai-streak",0);
  const favs = LS("tai-favs",[]);
  const likes = LS("tai-likes",[]);
  const storiesCount = Object.keys(progress).length;
  const totalChapters = Object.values(progress).reduce((sum,p)=>sum+(p.chapter||0),0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || "");

  const saveProfile = () => {
    if (!editName.trim()) return;
    onUpdateUser({ ...user, name: editName.trim() });
    setEditing(false);
  };

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
          {editing ? (
            <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:4 }}>
              <input value={editName} onChange={e=>setEditName(e.target.value)} style={{ background:C.bg3,border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 10px",color:C.text,fontSize:16,fontWeight:700,outline:"none",flex:1 }} onKeyDown={e=>e.key==="Enter"&&saveProfile()} />
              <button onClick={saveProfile} style={{ background:C.accent,border:"none",color:"#f5efe3",padding:"6px 12px",borderRadius:6,fontSize:12,fontWeight:700,cursor:"pointer" }}>Lưu</button>
              <button onClick={()=>{setEditing(false);setEditName(user?.name||"");}} style={{ background:"transparent",border:`1px solid ${C.border}`,color:C.textDim,padding:"6px 10px",borderRadius:6,fontSize:12,cursor:"pointer" }}>Hủy</button>
            </div>
          ) : (
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:2 }}>
              <span style={{ fontSize:20,fontWeight:700,color:C.text }}>{user?.name}</span><TitleBadge />
              <button onClick={()=>setEditing(true)} style={{ background:"transparent",border:"none",color:C.textMuted,cursor:"pointer",fontSize:12,padding:2 }}>✎</button>
            </div>
          )}
          <div style={{ fontSize:13,color:C.textDim }}>{user?.email||"player@truyenai.vn"}</div>
          <div style={{ fontSize:12,color:C.gold,marginTop:4 }}>{user?.isAdmin?"Admin":"Người chơi"} • {new Date(user?.createdAt||Date.now()).toLocaleDateString("vi-VN")}</div>
          {(()=>{
            const eq=getEquipped();const parts=[];
            if(eq.frame){const f=eq.frame.replace("frame_","");parts.push("Khung: "+f);}
            if(eq.title&&TITLE_DATA[eq.title])parts.push("Danh hiệu: "+TITLE_DATA[eq.title].text);
            if(eq.fx&&FX_DATA[eq.fx])parts.push("Hiệu ứng: "+FX_DATA[eq.fx].name);
            return parts.length>0?<div style={{fontSize:11,color:C.textDim,marginTop:4}}>Trang bị: {parts.join(" | ")}</div>:null;
          })()}
        </div>
      </div>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:12,marginBottom:20 }}>
        {stat("💰","Xu hiện có",xu)}
        {stat("📖","Đang đọc",storiesCount,C.text)}
        {stat("📑","Tổng chương",totalChapters,C.text)}
        {stat("♥","Yêu thích",likes.length,C.red)}
        {stat("★","Đã lưu",favs.length,"#8b6914")}
        {stat("🔥","Streak",streak+" ngày","#8b2d2d")}
      </div>
      <div style={{ background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:20 }}>
        <h3 style={{ fontSize:15,fontWeight:700,color:C.text,marginBottom:12 }}>Truyện gần đây</h3>
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
                    {ch.stats.capDo && <span style={{padding:"3px 10px",borderRadius:6,background:C.bg3,border:`1px solid ${C.border}`,fontSize:10,color:C.textDim}}>Cấp: {ch.stats.capDo}</span>}
                    {ch.stats.voHon && <span style={{padding:"3px 10px",borderRadius:6,background:C.bg3,border:`1px solid ${C.border}`,fontSize:10,color:C.textDim}}>Võ Hồn: {ch.stats.voHon}</span>}
                    {ch.stats.thanPhan && <span style={{padding:"3px 10px",borderRadius:6,background:C.bg3,border:`1px solid ${C.border}`,fontSize:10,color:C.textDim}}>{ch.stats.thanPhan}</span>}
                  </div>
                )}
                {ch.mainStats && (
                  <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                    {ch.mainStats.slice(0,4).map((s,j) => <span key={j} style={{padding:"3px 10px",borderRadius:6,background:C.bg3,border:`1px solid ${C.border}`,fontSize:10,color:C.textDim}}>{s.name}: {s.value}</span>)}
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
  const [tab, setTab] = useState("users");
  const [fbUsers, setFbUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fbGet("users");
        if (data) {
          const list = Object.values(data).filter(u => u.email && !u.banned);
          list.sort((a,b) => (b.totalXuEarned||0) - (a.totalXuEarned||0));
          setFbUsers(list);
        }
      } catch(e) {}
      setLoadingUsers(false);
    })();
  }, []);

  // Hạng theo xu đã kiếm
  const getUserRankTitle = (earned) => {
    if (earned >= 10000) return { title:"Đại Đế", color:"#8b2d2d", icon:"👑" };
    if (earned >= 5000) return { title:"Thánh Giả", color:"#8b4513", icon:"⚡" };
    if (earned >= 2000) return { title:"Vương Giả", color:"#a0522d", icon:"🔥" };
    if (earned >= 1000) return { title:"Cao Thủ", color:"#4a6741", icon:"⚔" };
    if (earned >= 500) return { title:"Chiến Binh", color:"#4a5568", icon:"🗡" };
    if (earned >= 200) return { title:"Mạo Hiểm", color:"#6b4c6e", icon:"🏹" };
    return { title:"Tân Thủ", color:C.textDim, icon:"🌱" };
  };

  const sorted = [...STORIES].sort((a,b)=>b.plays-a.plays);

  return (
    <div style={{ padding:"28px 20px",maxWidth:700,margin:"0 auto" }}>
      <h2 style={{ fontFamily:"'Noto Serif',serif",fontSize:26,fontWeight:700,color:C.text,marginBottom:20 }}>Bảng xếp hạng</h2>
      <div style={{ display:"flex",gap:6,marginBottom:20 }}>
        <button onClick={()=>setTab("users")} style={{ padding:"8px 20px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",background:tab==="users"?C.accent+"15":"transparent",border:tab==="users"?`1px solid ${C.accent}40`:`1px solid ${C.border}`,color:tab==="users"?C.accent:C.textDim }}>👥 Người chơi</button>
        <button onClick={()=>setTab("stories")} style={{ padding:"8px 20px",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",background:tab==="stories"?C.accent+"15":"transparent",border:tab==="stories"?`1px solid ${C.accent}40`:`1px solid ${C.border}`,color:tab==="stories"?C.accent:C.textDim }}>📖 Truyện</button>
      </div>

      {/* User Rankings */}
      {tab==="users" && (
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {loadingUsers && <p style={{textAlign:"center",color:C.textMuted,padding:20}}>Đang tải...</p>}
          {!loadingUsers && fbUsers.length === 0 && <p style={{textAlign:"center",color:C.textMuted,padding:40}}>Chưa có dữ liệu xếp hạng</p>}
          {fbUsers.slice(0,50).map((u,i) => {
            const medal = i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`;
            const rank = getUserRankTitle(u.totalXuEarned||0);
            const earned = u.totalXuEarned || 0;
            return (
              <div key={u.email} style={{ background:C.bg2,border:`1px solid ${i<3?C.gold+"30":C.border}`,borderRadius:12,padding:"14px 18px",display:"flex",alignItems:"center",gap:12 }}>
                <div style={{ width:36,textAlign:"center",fontSize:i<3?22:14,fontWeight:700,color:i<3?C.gold:C.textDim }}>{medal}</div>
                <div style={{ width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${rank.color}30,${rank.color}10)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{rank.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{ fontSize:14,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{u.name || "Ẩn danh"}</div>
                  <div style={{ fontSize:11,color:rank.color,fontWeight:600 }}>{rank.title}</div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  <div style={{ fontSize:14,fontWeight:700,color:C.gold }}>{earned.toLocaleString("vi-VN")} xu</div>
                  <div style={{ fontSize:10,color:C.textDim }}>Xu: {(u.xu||0).toLocaleString("vi-VN")}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Story Rankings */}
      {tab==="stories" && (
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
      )}
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
  const [tab, setTab] = useState("all");
  const [likes, setLikes] = useState(LS("tai-likes",[]));
  const [favs, setFavs] = useState(LS("tai-favs",[]));
  const toggleLike = (id) => { const n = likes.includes(id)?likes.filter(x=>x!==id):[...likes,id]; setLikes(n); LSSet("tai-likes",n); };
  const toggleFav = (id) => { const n = favs.includes(id)?favs.filter(x=>x!==id):[...favs,id]; setFavs(n); LSSet("tai-favs",n); };
  let list = STORIES;
  if (tab==="fav") list = STORIES.filter(s=>favs.includes(s.id));
  if (tab==="reading") list = STORIES.filter(s=>savedProgress[s.id]);
  const filtered = search ? list.filter(s=>s.title.toLowerCase().includes(search.toLowerCase())||s.tags.some(t=>t.toLowerCase().includes(search.toLowerCase()))) : list;
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
      <div style={{ maxWidth:700,margin:"0 auto 20px",padding:"0 20px",display:"flex",gap:6 }}>
        {[["all","Tất cả ("+STORIES.length+")"],["fav","★ Yêu thích ("+favs.length+")"],["reading","▶ Đang đọc ("+Object.keys(savedProgress).length+")"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{ padding:"7px 16px",borderRadius:6,fontSize:12,fontWeight:600,cursor:"pointer",background:tab===id?C.accent+"15":"transparent",border:tab===id?`1px solid ${C.accent}40`:`1px solid ${C.border}`,color:tab===id?C.accent:C.textDim }}>{label}</button>
        ))}
      </div>
      <div style={{ maxWidth:1100,margin:"0 auto",padding:"0 20px 60px" }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:18 }}>
          {filtered.map(s=><StoryCard key={s.id} story={s} onStart={onStart} onReset={onReset} saved={!!savedProgress[s.id]} onLike={toggleLike} onFav={toggleFav} isLiked={likes.includes(s.id)} isFav={favs.includes(s.id)} />)}
        </div>
        {filtered.length===0&&<p style={{textAlign:"center",color:C.textMuted,padding:40,fontFamily:"'Noto Serif',serif"}}>{tab==="fav"?"Chưa yêu thích truyện nào":tab==="reading"?"Chưa đọc truyện nào":"Không tìm thấy truyện"}</p>}
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
  const spendXu = (n) => {
    const v=Math.max(0,xu-n); setXu(v); LSSet("tai-xu",v);
    // Log history
    const h = [{ type:"spend", amount:-n, desc:`Tiêu ${n} xu`, time:Date.now() }, ...LS("tai-xu-history",[])].slice(0,50);
    LSSet("tai-xu-history", h);
    // Sync Firebase
    const ek = user?.email?.replace(/[.#$\[\]]/g,"_");
    if (ek) fbUpdate("users/" + ek, { xu: v });
  };
  const addXu = (n) => {
    const v=xu+n; setXu(v); LSSet("tai-xu",v);
    const totalEarned = LS("tai-total-earned",0) + n; LSSet("tai-total-earned", totalEarned);
    // Log history
    const h = [{ type:"earn", amount:n, desc:`Nạp ${n} xu`, time:Date.now() }, ...LS("tai-xu-history",[])].slice(0,50);
    LSSet("tai-xu-history", h);
    // Sync Firebase
    const ek = user?.email?.replace(/[.#$\[\]]/g,"_");
    if (ek) fbUpdate("users/" + ek, { xu: v, totalXuEarned: totalEarned });
    alert(`✅ Nạp ${n} xu thành công!`);
  };
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
        {page==="profile"&&<ProfilePage user={user} xu={xu} onUpdateUser={(u)=>{setUser(u);LSSet("tai-user",u);const ek=u.email?.replace(/[.#$\[\]]/g,"_");if(ek)fbUpdate("users/"+ek,{name:u.name});}} />}
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
