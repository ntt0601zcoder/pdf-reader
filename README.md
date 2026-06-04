# Drive PDF Reader

Một trình đọc PDF chạy hoàn toàn ở trình duyệt (React + Vite, không cần backend).
Mở PDF **từ Google Drive** (hoặc tệp trên máy), đọc với **nhiều theme** (Sáng /
Sepia / Tối), **tô màu nhiều màu**, **ghi chú**, **tìm kiếm toàn văn** và **mục
lục**. Highlight/note được **đồng bộ ngược về Google Drive** dưới dạng tệp
sidecar JSON — đăng nhập Google ở máy/trình duyệt nào cũng thấy lại đầy đủ.

> A frontend-only PDF reader. Opens PDFs from Google Drive (or local), with
> light/sepia/dark themes, multi-color highlights, notes, full-text search and
> an outline. Annotations are saved back to Drive as sidecar JSON files.

---

## Tính năng

- 📂 Mở PDF từ **Google Drive** (Google Picker) hoặc tệp local / kéo–thả.
- 🌙 **3 theme đọc**: Sáng, Sepia, Tối (lọc màu cho canvas, giữ giao diện đồng bộ).
- 🖍️ **Highlight nhiều màu** (vàng / xanh lá / xanh dương / hồng / cam).
- 📝 **Ghi chú** gắn vào từng highlight; xuất ra **Markdown**.
- 🔖 **Bookmark** trang: nút ⭐ đánh dấu trang hiện tại, panel danh sách (đặt tên,
  nhảy tới), dải ruy-băng góc trang đã đánh dấu.
- 📖 **Nhớ trang đọc gần nhất**: mở lại tài liệu tự động nhảy về đúng trang.
- 🔎 **Tìm kiếm toàn văn**, nhảy tới & tô sáng kết quả.
- 🗂️ **Mục lục / Outline** của PDF, bấm để nhảy trang.
- ☁️ **Đồng bộ về Drive**: annotations lưu thành `<tên>.pdfnotes.json` cạnh dữ liệu
  của bạn; mirror sang IndexedDB để dùng offline.
- 🌐 Giao diện **song ngữ** Việt / English.

---

## Yêu cầu

- **Node 22** (project được kiểm thử với Node 22; tối thiểu Node 18+).
- Một **Google Cloud project** (miễn phí) để lấy OAuth Client ID + API key.

---

## Cài đặt & chạy

```bash
npm install
cp .env.example .env      # rồi điền VITE_GOOGLE_CLIENT_ID và VITE_GOOGLE_API_KEY
npm run dev               # mở http://localhost:5173
```

> Phần "Mở tệp trên máy" hoạt động **ngay cả khi chưa cấu hình Google** — chỉ
> tính năng Google Drive mới cần các biến môi trường ở dưới.

Build production:

```bash
npm run build && npm run preview
```

---

## Thiết lập Google Cloud (cho tính năng Drive)

Bạn chỉ cần **một scope không nhạy cảm** là `drive.file` — không phải qua quy
trình xác minh nặng của Google. Scope này cho phép app đọc đúng tệp bạn chọn qua
Picker, và tạo/sửa tệp sidecar do chính app tạo ra.

1. **Tạo project**: [console.cloud.google.com](https://console.cloud.google.com)
   → menu project → **New Project**. Ghi lại **Project number** (trong Dashboard)
   — đây là **App ID** của Picker (`VITE_GOOGLE_APP_ID`).
2. **Bật API**: *APIs & Services → Library* → bật **Google Drive API** và
   **Google Picker API**.
3. **OAuth consent screen**: *APIs & Services → OAuth consent screen*
   - User type: **External**.
   - Điền tên app, email hỗ trợ, email nhà phát triển.
   - Thêm scope `https://www.googleapis.com/auth/drive.file` (mục *non-sensitive*).
   - Khi còn ở chế độ **Testing**: thêm tài khoản Google của bạn vào **Test users**
     (chỉ test user mới đăng nhập được; quyền test hết hạn sau 7 ngày không dùng).
     Chuyển sang **In production** để bỏ giới hạn này — `drive.file` **không cần**
     Google xác minh.
4. **OAuth Client ID**: *Credentials → Create credentials → OAuth client ID →
   Web application*
   - **Authorized JavaScript origins** (đúng scheme + host + port, **không** có
     path/dấu `/` cuối): `http://localhost:5173` (và origin production nếu có).
   - **Không** cần điền Authorized redirect URIs (luồng token của GIS).
   - Giá trị này → `VITE_GOOGLE_CLIENT_ID`.
5. **API key** (developerKey của Picker): *Credentials → Create credentials →
   API key*
   - Nên giới hạn: *Application restrictions → HTTP referrers* (`http://localhost:5173/*`),
     *API restrictions → Google Picker API*.
   - Giá trị này → `VITE_GOOGLE_API_KEY`.
6. **App ID = Project number** ở bước 1 → `VITE_GOOGLE_APP_ID` (cùng project với
   client id & API key).

`.env`:

```dotenv
VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
VITE_GOOGLE_API_KEY=AIza...
VITE_GOOGLE_APP_ID=123456789012
```

---

## Lưu trữ & đồng bộ

| Nguồn tệp | Nguồn dữ liệu chính (highlight/note) | Mirror |
|-----------|--------------------------------------|--------|
| Google Drive | Tệp sidecar `…​.pdfnotes.json` trên Drive (đồng bộ mọi máy) | IndexedDB (offline) |
| Local | IndexedDB của trình duyệt | — |

Sidecar được liên kết với PDF gốc qua `appProperties.pdfReaderSource = <fileId>`,
nên mở lại PDF (kể cả trên trình duyệt khác) app sẽ tự tìm và nạp đúng ghi chú.
Bạn cũng có thể **xuất Markdown** từ panel *Ghi chú & Highlight*.

---

## Kiến trúc (tóm tắt)

```
src/
  lib/
    google/   auth (GIS token) · picker · drive REST (download + sidecar CRUD)
    pdf/      worker config · full-text search · outline
    storage.ts   load + debounced autosave (Drive sidecar / IndexedDB)
    docOpener.ts open from Drive / local / recent
    highlights.ts selection → 0..1 fractional rects
    idb.ts    IndexedDB (recent files, local annotations, cached blobs)
  store/      Zustand store (single source of truth)
  components/ Toolbar · Welcome · Viewer (Document/Page + overlays) · Sidebar panels
  i18n/       VI/EN messages
  styles/     theme.css (theme tokens + canvas filters) · app.css (layout)
```

Render PDF bằng [`react-pdf`](https://github.com/wojtekmaj/react-pdf) (pdf.js).
Highlight được lưu dưới dạng **tỉ lệ 0..1** của khung trang nên không lệch khi zoom.

---

## Ghi chú kỹ thuật / sự cố thường gặp

- **Worker version mismatch**: `pdfjs-dist` phải khớp **chính xác** phiên bản mà
  `react-pdf` ghim (hiện tại `5.4.296`). Đừng nâng lẻ một trong hai.
- **Đừng** đặt COOP `same-origin` hay bật COEP — sẽ chặn popup đăng nhập Google.
  Vite dev đã set `Cross-Origin-Opener-Policy: same-origin-allow-popups`.
- **Origin phải khớp tuyệt đối**: `http://localhost:5173` ≠ `http://127.0.0.1:5173`.
- Dark mode dùng CSS filter trên `<canvas>` nên ảnh bitmap trong PDF sẽ bị âm bản
  — chấp nhận được với sách nhiều chữ; tài liệu nhiều ảnh nên đọc ở theme Sáng/Sepia.
