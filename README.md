# ห้องติวสอบกลางภาค — เวอร์ชัน GitHub + Vercel เท่านั้น (ไม่มี Supabase)

เวอร์ชันนี้ไม่ใช้บริการฐานข้อมูลภายนอกเลย — ใช้ **GitHub repo เองเป็นฐานข้อมูล**
(ไฟล์ `data/leaderboard.json`) ผ่าน Vercel Serverless Function ตัวเดียว (`api/leaderboard.js`)

- ข้อมูลส่วนตัว (ชื่อ, ตัวละคร, XP) → เก็บใน `localStorage` ของเบราว์เซอร์แต่ละเครื่อง
- กระดานเพื่อน (เห็นคะแนนของทุกคนในกลุ่ม) → เก็บใน GitHub ผ่าน API

## ขั้นตอนที่ 1: สร้าง GitHub repo

```bash
cd exam-prep-app
git init
git add .
git commit -m "Initial commit"
gh repo create exam-prep-app --private --source=. --push
```

## ขั้นตอนที่ 2: สร้าง GitHub Token (แทนที่บัญชี Supabase)

1. ไปที่ https://github.com/settings/tokens?type=beta → **Generate new token**
2. ตั้งชื่อ เช่น "exam-prep-leaderboard"
3. **Repository access** → เลือกเฉพาะ repo `exam-prep-app` ที่เพิ่งสร้าง (อย่าให้สิทธิ์ทุก repo)
4. **Permissions → Contents** → เลือก **Read and write**
5. กด Generate → **คัดลอกโทเคนเก็บไว้ทันที** (ดูได้ครั้งเดียว)

## ขั้นตอนที่ 3: Deploy ขึ้น Vercel

1. ไปที่ https://vercel.com → Import repo `exam-prep-app` จาก GitHub
2. ก่อนกด Deploy ให้ใส่ **Environment Variables** (Settings → Environment Variables):

   | ชื่อตัวแปร | ค่า |
   |---|---|
   | `VITE_GROUP_CODE` | รหัสกลุ่มที่ตั้งเอง เช่น `หนูดีทีมเก่ง2569` |
   | `GITHUB_TOKEN` | โทเคนจากขั้นตอนที่ 2 |
   | `GITHUB_REPO` | `your-username/exam-prep-app` |
   | `GITHUB_BRANCH` | `main` |
   | `GITHUB_FILE_PATH` | `data/leaderboard.json` |

3. กด Deploy

## ขั้นตอนที่ 4: ทดสอบ

1. เปิดลิงก์ Vercel ที่ได้ → กรอกรหัสกลุ่ม + ตั้งชื่อ + เลือกตัวละคร
2. กดปุ่ม "+20 XP" ตัวอย่าง → เช็คว่าขึ้นกระดานเพื่อนไหม
3. เช็คใน GitHub repo → ไฟล์ `data/leaderboard.json` ควรมี commit ใหม่ทุกครั้งที่มีคนได้ XP
4. ส่งลิงก์ + รหัสกลุ่ม ให้เพื่อนอีก 2 คนทางแชทส่วนตัว

## ทดสอบบนเครื่องตัวเองก่อน deploy (ทางเลือก)

`npm run dev` ธรรมดาจะรันได้แค่ฝั่งหน้าเว็บ (ปุ่ม API จะเรียกไม่ได้) ถ้าอยากทดสอบ API ด้วยให้ใช้ Vercel CLI แทน:

```bash
npm install -g vercel
vercel dev
```

แล้วใส่ค่าตัวแปรในไฟล์ `.env` (คัดลอกจาก `.env.example`) ก่อนรัน

## ข้อจำกัดที่ควรรู้

- **ไม่มีการยืนยันตัวตนจริง** — รหัสกลุ่มเป็นแค่ตัวกันคนแปลกหน้าเข้ามาเล่น ไม่ใช่รหัสผ่านที่ปลอดภัยระดับสูง
- **ข้อมูลส่วนตัวผูกกับเบราว์เซอร์** — ถ้าเปลี่ยนเครื่องหรือล้างข้อมูลเบราว์เซอร์ ชื่อ/XP ในเครื่องนั้นจะหาย
  (แต่คะแนนที่เคยขึ้นกระดานเพื่อนจะยังอยู่ใน GitHub เพราะเป็นคนละที่เก็บกัน)
- **GitHub API มี rate limit** 5,000 ครั้ง/ชั่วโมง — เกินพอสำหรับเพื่อน 2-3 คน
- ทุกครั้งที่มีคนได้ XP จะสร้าง 1 commit ใน repo — ถ้าเล่นกันบ่อยมาก ๆ ประวัติ commit จะเยอะขึ้นเรื่อย ๆ
  (ไม่กระทบการใช้งาน แค่ repo history จะยาว)

## ขั้นตอนถัดไป (ยังไม่ได้ทำ)

ฟีเจอร์ต่อไปนี้ยังอยู่ใน exam-prep.jsx (เวอร์ชัน Claude artifact เดิม) รอย้ายเข้ามา:

- [ ] ข้อสอบทุกวิชา (ภาษาไทย/คณิต/วิทย์/สังคม/ประวัติศาสตร์ + English Program)
- [ ] แฟลชการ์ดทุกวิชา
- [ ] ระบบจับเวลาทำข้อสอบ
- [ ] ระบบ XP + ตัวละคร 5 เลเวล (ต้องย้ายรูปตัวละครไปไว้ใน `public/characters/` แทนการฝัง base64)
- [ ] โหมดอ่านนิทานทบทวน

แนะนำให้ทำทีละส่วน แล้ว deploy ทดสอบเรื่อย ๆ แทนที่จะย้ายทั้งหมดทีเดียว — ปุ่ม "+20 XP" ตัวอย่างใน
`Dashboard.jsx` คือจุดที่จะเอาโค้ดจบข้อสอบจริงมาแทนที่
