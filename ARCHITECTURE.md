# System Architecture & Development Plan

## 🏗 Tech Stack
**Frontend:**
- Next.js 14
- TypeScript
- Tailwind CSS
- shadcn/ui

**Backend / Database / Auth:**
- Supabase (PostgreSQL, Auth, Row Level Security)

**Hosting:**
- Vercel

## 🧱 PHASE 1 — ออกแบบฐานข้อมูล (Database Schema)

### 1️⃣ users (ใช้ Supabase Auth)
- Role: `admin`, `staff`

### 2️⃣ categories
- `id` (uuid)
- `name` (text)
- `created_at` (timestamp)

### 3️⃣ products
- `id` (uuid)
- `name` (text)
- `sku` (text)
- `category_id` (uuid)
- `sell_price` (numeric)
- `low_stock_alert` (int)
- `created_at` (timestamp)
*(ไม่มี cost_price ตรงนี้ đểป้องกันพนักงานเห็นต้นทุน)*

### 4️⃣ purchase_lots (เก็บต้นทุนแบบล็อต - FIFO)
- `id` (uuid)
- `product_id` (uuid)
- `cost_price` (numeric)
- `quantity_remaining` (int)
- `created_at` (timestamp)

### 5️⃣ sales
- `id` (uuid)
- `total_amount` (numeric)
- `total_profit` (numeric)
- `created_at` (timestamp)
- `created_by` (uuid)

### 6️⃣ sale_items
- `id` (uuid)
- `sale_id` (uuid)
- `product_id` (uuid)
- `quantity` (int)
- `sell_price` (numeric)
- `cost_price` (numeric)
- `profit` (numeric)

---

## 🔐 PHASE 2 — Row Level Security (RLS)
หัวใจของระบบความปลอดภัย:
- **Staff**: สามารถอ่าน `products` และ `sell_price` ได้ แต่ **อ่าน `purchase_lots` และ `cost_price` ไม่ได้เด็ดขาด**
- **Admin**: มีสิทธิ์เข้าถึงทุกตารางได้ทั้งหมด
- *(ใช้ RLS ของ Supabase ในการบล็อกข้อมูลที่ระดับฐานข้อมูล ไม่ใช่แค่ซ่อนหน้าเว็บ)*

---

## 💻 PHASE 3 — โครงสร้างหน้าเว็บ (Frontend Pages)

### 🛒 1. /pos (Point of Sale)
สำหรับหน้าร้าน ทำการค้นหาสินค้า, เพิ่มลงตะกร้า, แก้ไขจำนวน, แสดงยอดรวม และปุ่มชำระเงิน
- **Checkout Process:** สร้าง `sale`, สร้าง `sale_items`, ตัดสต็อกแบบ FIFO ใน `purchase_lots` และคำนวณกำไร

### 🔐 2. /admin (Dashboard)
แสดงภาพรวมยอดขาย กำไร สินค้าขายดี สินค้าใกล้หมด และสินค้านอนสต็อก (60 วัน)

### 📦 3. /products
จัดการสินค้า เพิ่ม/แก้ไขสินค้า เพิ่มล็อตสินค้าจากซัพพลายเออร์ และดูสต็อกคงเหลือ

### 📊 4. /reports
ดูรายงานยอดขายและกำไร รายวัน รายเดือน แยกตามหมวดหมู่ รวมถึง Export เป็นไฟล์ CSV

---

## 🧮 PHASE 4 — Logic การตัดสต็อก FIFO
ระบบจะตัดสต็อกที่มีจากล็อตที่เข้ามาเก่าสุดก่อน
**ตัวอย่าง:**
- ล็อต A: ราคาต้นทุน 80 บาท (เหลือ 2 ชิ้น)
- ล็อต B: ราคาต้นทุน 90 บาท (เหลือ 10 ชิ้น)
เมื่อขายได้ 3 ชิ้น ระบบจะหยิบ ล็อต A ออกไป 2 ชิ้น และ ล็อต B อีก 1 ชิ้น และคำนวณกำไรได้ทันที

---

## 📱 PHASE 5 — PWA (Progressive Web App)
- ตั้งค่าให้รองรับการทำงานเหมือน Native App เพิ่มลง Home Screen ได้ (Add to Home Screen)
- เหมาะสำหรับให้ Admin ล็อกอินเข้ามาดู Dashboard ผ่านมือถือ

---

## 🔄 PHASE 6 — Backup & ความปลอดภัย
- เปิด Supabase Backup
- เปิด 2FA สำหรับบัญชี Admin
- Auto logout หากไม่มีความเคลื่อนไหว (เช่น 5 นาที)
- แยกระบบ Path ชัดเจน (`/pos` สำหรับหน้าร้าน ทั่วไป และ `/admin` สำหรับเจ้าหน้าที่)

---

## 🗓 Timeline
- **สัปดาห์ 1**: ตั้งค่า Supabase, Database Schema, Auth, RLS
- **สัปดาห์ 2**: สร้างหน้าระบบ `/products`, `/pos`
- **สัปดาห์ 3**: เขียนระบบประมวลผล FIFO, ทำ `/admin` Dashboard
- **สัปดาห์ 4**: พัฒนาระบบรายงาน Export CSV, ตั้งค่า PWA
