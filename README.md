# Web IDE

Trình soạn thảo code trên web, giao diện giống VS Code. Clone repo từ GitHub về server, sửa file trực tiếp trên trình duyệt, rồi commit/push ngược lại GitHub.

## Tính năng

- Đăng nhập bằng mật khẩu server (env `IDE_PASSWORD`)
- Clone repo GitHub (HTTPS, hỗ trợ Personal Access Token cho repo private)
- Cây thư mục, tạo/xóa/đổi tên file & folder (right-click)
- Editor Monaco (cùng engine VS Code), nhiều tab, Ctrl+S lưu
- Auto Save (bật/tắt ở status bar)
- Git: xem thay đổi, commit, push, pull, chuyển branch
- Ảnh xem trước được, file binary/thông báo dung lượng quá lớn

## Kiến trúc

```
client (React + Vite + Monaco)  ──REST──►  server (Node.js + Express + simple-git)
                                            └─ repos/ : repo đã clone nằm trên disk server
                                                 ▼
                                              GitHub (kho chính thức)
```

File được lưu trên **disk của server**. Server restart/mất disk → repo tự mất nhưng an toàn vì đã push lên GitHub; chỉ cần clone lại. **Hãy push trước khi rời khỏi web.**

## Chạy local

Yêu cầu: Node.js ≥ 18, git đã cài.

```bash
# 1. Cài dependencies (cần internet, chạy 1 lần)
npm install

# 2. Đặt biến môi trường (PowerShell)
$env:IDE_PASSWORD = "mat-khau-cua-ban"

# 3. Chạy dev (server :3001 + client :5173)
npm run dev
```

Mở http://localhost:5173 — client đã proxy `/api` về server `:3001`.

### Chạy bản production local

```bash
npm run build          # build client → client/dist
$env:IDE_PASSWORD = "mat-khau-cua-ban"
npm start              # server phục vụ cả API + client tại http://localhost:3001
```

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `IDE_PASSWORD` | Nên đặt | Mật khẩu đăng nhập. **Bỏ trống = ai cũng vào được (không khuyến nghị khi public)** |
| `SESSION_SECRET` | Nên đặt | Chuỗi bất kỳ để ký session cookie |
| `PORT` | Không | Mặc định 3001 |
| `REPOS_DIR` | Không | Thư mục chứa repo clone (mặc định `server/repos`) |
| `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` | Không | Tác giả commit mặc định |

## Deploy lên Render (free)

1. Push code lên GitHub
2. Đăng nhập https://render.com bằng GitHub
3. New → **Web Service** → chọn repo
4. Cấu hình:
   - Runtime: **Node**
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Environment variables:
     - `IDE_PASSWORD` = mật khẩu đăng nhập
     - `SESSION_SECRET` = chuỗi bất kỳ
     - `NODE_VERSION` = `22`
5. Bấm **Create Web Service** → chờ build → dùng tại `https://<tên-app>.onrender.com`

File `render.yaml` đã có sẵn nếu dùng Infrastructure as Code.

### Lưu ý gói free Render

- Service **ngủ sau 15 phút** không dùng → lần mở sau chờ ~30-50 giây khởi động
- **Disk ephemeral**: mỗi lần redeploy/restart, các repo trên server bị xóa → clone lại là xong. Mọi thứ đã push lên GitHub đều an toàn

## Bảo mật

- Mật khẩu server chỉ dùng để đăng nhập web — không liên quan GitHub
- GitHub PAT chỉ giữ trong **RAM trình duyệt** (không lưu localStorage, không lưu server). Pull/push cần token; clone repo public thì không cần
- Nên tạo **fine-grained PAT** giới hạn đúng repo cần làm việc, scope `Contents: Read & write`

## Cấu trúc thư mục

```
web-ide/
├─ package.json          # npm workspaces
├─ render.yaml           # cấu hình deploy Render
├─ scripts/dev.mjs       # chạy đồng thời server + client
├─ server/
│  └─ src/
│     ├─ index.js        # Express, serve API + static client
│     ├─ auth.js         # login + rate limit
│     ├─ config.js       # path an toàn, build tree
│     └─ routes/         # repos.js, files.js, git.js
└─ client/
   └─ src/
      ├─ setupMonaco.ts  # Monaco bundle local (không dùng CDN)
      ├─ store.ts        # Zustand state
      ├─ api.ts          # REST client
      └─ components/     # Login, Explorer, Tabs, Editor, GitPanel…
```
