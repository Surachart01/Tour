# 🏗️ Tour Management System - Server Installation Guide

คู่มือการติดตั้งระบบจัดการทัวร์ (Tour Management System) ลงบนเซิร์ฟเวอร์ ทั้งแบบการใช้งานผ่าน Docker Compose (แนะนำ) และแบบติดตั้งแบบ Manual

---

## 📋 สิ่งที่ต้องเตรียมก่อนติดตั้ง (Prerequisites)

### 🐳 สำหรับวิธี Docker Compose (แนะนำที่สุด)
*   **Docker** (เวอร์ชันล่าสุด)
*   **Docker Compose** (เวอร์ชันล่าสุด)

### ⚙️ สำหรับวิธี Manual
*   **Node.js** (เวอร์ชัน 18 ขึ้นไป)
*   **npm** (เวอร์ชันล่าสุด)
*   **PostgreSQL** (เวอร์ชัน 15)

---

## 🚀 วิธีที่ 1: ติดตั้งผ่าน Docker Compose (แนะนำ)

วิธีนี้รวดเร็วและปลอดภัยที่สุด ระบบจะจำลองและรัน Container ให้โดยอัตโนมัติ ทั้ง Database, Backend และ Frontend

### ขั้นตอนที่ 1: โคลนโค้ดลงบนเซิร์ฟเวอร์
```bash
git clone https://github.com/Surachart01/Tour.git
cd Tour
```

### ขั้นตอนที่ 2: ตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables)
แก้ไขไฟล์ `docker-compose.yml` เพื่อตั้งค่าความปลอดภัยของตัวแปรต่างๆ ตามจริง:
```yaml
# ตัวอย่างการตั้งค่าความปลอดภัยหลักใน docker-compose.yml
backend:
  environment:
    - DATABASE_URL=postgresql://agent:admin%40123@db:5432/agent_operator?schema=public
    - JWT_SECRET=เปลี่ยน_คีย์ลับ_jwt_ตรงนี้
    - BANK_ENCRYPTION_KEY=เปลี่ยน_คีย์การเข้ารหัสธนาคาร_32หลัก_ตรงนี้
    
frontend:
  environment:
    - VITE_API_URL=http://<SERVER_IP_OR_DOMAIN>:8081/api/v1
```
> ⚠️ **ข้อควรระวัง:** เปลี่ยน `VITE_API_URL` ให้ชี้ไปที่ IP หรือโดเมนเนมจริงของเซิร์ฟเวอร์คุณ (พอร์ต `8081`)

### ขั้นตอนที่ 3: Build และ Run Container
รันคำสั่งนี้ที่โฟลเดอร์หลักของโปรเจกต์:
```bash
docker compose up --build -d
```
*ระบบจะเริ่มดาวน์โหลดอิมเมจ ทำการ Build และสตาร์ทบริการทั้งหมดขึ้นมาในโหมด Background*

### ขั้นตอนที่ 4: ตั้งค่าฐานข้อมูลและรัน Seed ข้อมูลจริง
รันคำสั่งเหล่านี้เพื่อสร้างโครงสร้างฐานข้อมูลและเพิ่มข้อมูลระบบเริ่มต้น (Currencies, Markups, Users, Hotels, Tours, etc.) เข้าฐานข้อมูล Docker:

```bash
# 1. รันโครงสร้าง Database Schema
docker exec -it agent_operator_backend npx prisma db push

# 2. รันการ Seed ข้อมูลที่จำเป็นสำหรับการใช้งานจริง
docker exec -it agent_operator_backend npm run db:seed
```

ตอนนี้ระบบพร้อมใช้งานแล้วที่ URL: `http://<SERVER_IP_OR_DOMAIN>:5173`

---

## 🛠️ วิธีที่ 2: ติดตั้งแบบ Manual (ไม่ผ่าน Docker)

หากต้องการรันโปรเจกต์แบบ Native บนเซิร์ฟเวอร์โดยตรง ให้ทำตามขั้นตอนดังนี้

### ขั้นตอนที่ 1: ตั้งค่าฐานข้อมูล PostgreSQL
1.  ติดตั้งและเปิดใช้งานบริการ PostgreSQL 15
2.  เข้าใช้คำสั่ง PostgreSQL psql หรือโปรแกรมจัดการฐานข้อมูล (เช่น pgAdmin, DBeaver) เพื่อสร้างผู้ใช้และฐานข้อมูล:
```sql
CREATE DATABASE agent_operator;
CREATE USER agent WITH PASSWORD 'admin@123';
GRANT ALL PRIVILEGES ON DATABASE agent_operator TO agent;
```

### ขั้นตอนที่ 2: ติดตั้งและเปิดใช้งาน Backend (Express)
1.  เข้าไปที่โฟลเดอร์ `backend-express`
    ```bash
    cd backend-express
    ```
2.  ติดตั้ง Dependencies ทั้งหมด
    ```bash
    npm install
    ```
3.  สร้างไฟล์ `.env` สำหรับตั้งค่า Backend จากเทมเพลต:
    ```bash
    cp .env.example .env  # หรือสร้างไฟล์ใหม่
    ```
    ระบุตัวแปรสภาพแวดล้อมให้ตรงกับการใช้งานจริง:
    ```env
    DATABASE_URL="postgresql://agent:admin%40123@localhost:5432/agent_operator?schema=public"
    PORT=8081
    JWT_SECRET="WheelsApartSecretTokenKeyVerySecure32!"
    BANK_ENCRYPTION_KEY="WheelsApartBankDataEncryptKey32!"
    ```
4.  ตั้งค่าฐานข้อมูลและ Seed ข้อมูล
    ```bash
    # สร้างตารางในฐานข้อมูล
    npx prisma db push

    # รัน Seed ข้อมูลจริงเริ่มต้น
    npm run db:seed
    ```
5.  รัน Backend ใน Production (แนะนำใช้ PM2 เพื่อให้ระบบทำงานตลอดเวลา)
    ```bash
    npm install -g pm2
    pm2 start src/main.js --name "tour-backend"
    ```

### ขั้นตอนที่ 3: ติดตั้งและ Deploy Frontend (Vite)
1.  เข้าไปที่โฟลเดอร์ `frontend-vite`
    ```bash
    cd ../frontend-vite
    ```
2.  ติดตั้ง Dependencies ทั้งหมด
    ```bash
    npm install
    ```
3.  สร้างไฟล์ `.env` เพื่อกำหนด URL ของ API Backend
    ```env
    VITE_API_URL="http://<SERVER_IP_OR_DOMAIN>:8081/api/v1"
    ```
4.  Build โค้ดสำหรับ Production
    ```bash
    npm run build
    ```
    *หลังจาก Build เสร็จสิ้น จะได้ไฟล์แบบ Static อยู่ในโฟลเดอร์ `dist/`*
5.  นำโฟลเดอร์ `dist/` ไปตั้งค่าเปิดให้เข้าถึงผ่าน Web Server เช่น **Nginx** หรือ **Apache**

#### ตัวอย่างการตั้งค่า Nginx (/etc/nginx/sites-available/default)
```nginx
server {
    listen 80;
    server_name <YOUR_DOMAIN_OR_IP>;

    # เสิร์ฟไฟล์ Frontend Static จาก dist
    location / {
        root /path/to/Tour/frontend-vite/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # ส่งต่อ API ไปยัง Node.js Backend
    location /api/v1/ {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔑 บัญชีเข้าใช้งานระบบเริ่มต้น (Default User Logins)

หลังจากที่สั่งรันคำสั่ง **Seeding** เรียบร้อยแล้ว ระบบจะมีบัญชีผู้ใช้เริ่มต้นสำหรับทดลองใช้งานจริงดังนี้:

| บทบาท (Role) | ชื่อบัญชี (Username) | รหัสผ่าน (Password) | สิทธิ์การทำงาน |
| :--- | :--- | :--- | :--- |
| 👑 **Super Admin** | `superadmin` | `admin123` | ดูแลภาพรวมแพลตฟอร์มทั้งหมด |
| 🏢 **Agent Admin** | `agentadmin` | `agent123` | เจ้าหน้าที่แอดมินบริษัท/ตัวแทนทัวร์ |
| 👤 **Free Agent** | `freeagent` | `agent123` | ตัวแทนอิสระ |

---

## 📁 การตรวจสอบระบบ
*   **Backend Health:** `GET http://<SERVER_IP_OR_DOMAIN>:8081/api/v1/hotels` (ต้องการ JWT Token) หรือลองเรียก Route หน้าเว็บหลัก
*   **Prisma Studio (สำหรับดูฐานข้อมูลแบบ UI):** `npx prisma studio` (รันในเครื่องเซิร์ฟเวอร์ภายในโฟลเดอร์ `backend-express`)
