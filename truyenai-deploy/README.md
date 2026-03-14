# 📖 TruyệnAI — Nền Tảng Tiểu Thuyết Tương Tác AI

## 🚀 Hướng Dẫn Deploy Lên Vercel (Miễn Phí)

### Bước 1: Chuẩn bị
1. Tạo tài khoản tại [github.com](https://github.com) (nếu chưa có)
2. Tạo tài khoản tại [vercel.com](https://vercel.com) (đăng nhập bằng GitHub)
3. Lấy API Key từ [console.anthropic.com](https://console.anthropic.com)

### Bước 2: Tạo Repository trên GitHub
1. Vào github.com → Click **"New repository"**
2. Đặt tên: `truyenai` (hoặc tên bạn muốn)
3. Chọn **Public** hoặc **Private**
4. Click **"Create repository"**

### Bước 3: Upload code lên GitHub
**Cách 1 — Dùng terminal (nếu có Git):**
```bash
cd truyenai-deploy
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/truyenai.git
git push -u origin main
```

**Cách 2 — Upload trực tiếp trên web:**
1. Vào repo vừa tạo trên GitHub
2. Click **"uploading an existing file"**
3. Kéo thả TOÀN BỘ file trong thư mục `truyenai-deploy` vào
4. Click **"Commit changes"**

### Bước 4: Deploy trên Vercel
1. Vào [vercel.com/new](https://vercel.com/new)
2. Click **"Import"** bên cạnh repo `truyenai` của bạn
3. Vercel tự nhận diện Vite → Click **"Deploy"**
4. Đợi 1-2 phút → Website sẽ live tại `https://truyenai.vercel.app`

### Bước 5: Cấu hình sau deploy
1. Vào website vừa deploy
2. Chọn tab **"🔑 Admin"** → Đăng nhập:
   - Tên: tên bạn muốn
   - Mật khẩu: `ADMIN2024`
3. Vào **Admin Panel** → Mục **"⚙️ Cấu hình API Key"**:
   - Dán API key từ Anthropic: `sk-ant-api03-xxxxx`
   - Bấm **"💾 Lưu"**
4. Tạo token cho người dùng:
   - Chọn số xu kèm theo (VD: 10)
   - Bấm **"✨ Tạo Token"**
   - Copy token (VD: `TAI-X8K2F-A3B1`) → Gửi cho người muốn truy cập

---

## 📋 Cấu Trúc Dự Án

```
truyenai-deploy/
├── index.html          ← Trang HTML chính
├── package.json        ← Dependencies (React + Vite)
├── vite.config.js      ← Config Vite
├── public/
│   └── favicon.svg     ← Icon tab trình duyệt
└── src/
    ├── main.jsx        ← Entry point React
    └── App.jsx         ← Toàn bộ ứng dụng
```

## 🔐 Hệ Thống Phân Quyền

| Tính năng | Admin | User |
|-----------|-------|------|
| Đăng nhập bằng mật khẩu | ✅ | ❌ |
| Đăng nhập bằng token | ❌ | ✅ |
| Cấu hình API Key | ✅ | ❌ |
| Tạo/xóa token | ✅ | ❌ |
| Xem danh sách users | ✅ | ❌ |
| Đọc truyện | ✅ | ✅ |
| Nạp xu | ✅ | ✅ |
| Xem hồ sơ | ✅ | ✅ |
| Lưu tiến trình | ✅ | ✅ |

## ⚙️ Tùy Chỉnh

### Đổi mật khẩu Admin
Mở `src/App.jsx`, tìm dòng:
```js
const ADMIN_PASSWORD = "ADMIN2024";
```
Đổi thành mật khẩu bạn muốn.

### Đổi giá xu
```js
const XU_PER_CHAPTER = 2;    // Xu tiêu mỗi chương
const DEFAULT_XU = 10;       // Xu mặc định khi đăng ký
```

### Thêm truyện mới
Tìm mảng `STORIES` trong `src/App.jsx` và thêm:
```js
{ id:"s9", title:"Tên Truyện", tags:["TAG1","TAG2"], 
  desc:"Mô tả ngắn...", plays:0, likes:0, icon:"🎮" },
```

### Đổi tên domain
1. Vào Vercel Dashboard → Project Settings → Domains
2. Thêm domain riêng (VD: truyenai.com)
3. Cấu hình DNS theo hướng dẫn Vercel

## 🔧 Phát Triển Local

```bash
# Cài dependencies
npm install

# Chạy dev server
npm run dev

# Build production
npm run build
```

## ⚠️ Lưu Ý Quan Trọng

1. **API Key**: API key Anthropic được lưu trong localStorage của trình duyệt Admin. 
   Trong production, nên dùng backend proxy để bảo mật key.

2. **Token**: Hệ thống token dùng localStorage, mỗi trình duyệt có data riêng.
   Trong production, nên dùng database (Firebase, Supabase...).

3. **CORS**: Header `anthropic-dangerous-direct-browser-access: true` cho phép gọi 
   API trực tiếp từ browser. Trong production, nên dùng Vercel Serverless Function 
   làm proxy.

## 📞 Hỗ Trợ
Nếu cần giúp đỡ thêm, hãy hỏi lại trong chat!
