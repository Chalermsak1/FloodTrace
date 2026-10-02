# FloodTrace (ปราจีนบุรี, ประเทศไทย)
### แพลตฟอร์มสารสนเทศภูมิศาสตร์ วิเคราะห์เส้นทางน้ำ เฝ้าระวังสิ่งแวดล้อม และแจ้งเตือนภัยภาคประชาชน

FloodTrace คือระบบสารสนเทศภูมิศาสตร์ (GIS) และการเฝ้าระวังสิ่งแวดล้อมเชิงประจักษ์ ออกแบบสำหรับพื้นที่ **จังหวัดปราจีนบุรี** โดยมุ่งเน้นการเชื่อมโยงข้อมูลน้ำท่วม ทิศทางการไหลของน้ำ การเชื่อมต่อทางอุทกวิทยา และการมีส่วนร่วมของภาคประชาชน เพื่อช่วยสนับสนุนการเฝ้าระวังและการตัดสินใจอย่างโปร่งใส ซื่อตรงต่อข้อเท็จจริง และปกป้องความเป็นส่วนตัว

---

## 1. FloodTrace คืออะไร (What is FloodTrace)
FloodTrace เป็นระบบประมวลผลและแสดงผลข้อมูลเชิงพื้นที่ ที่ช่วยให้ประชาชน ผู้นำชุมชน และเจ้าหน้าที่หน่วยงานที่เกี่ยวข้อง สามารถตรวจสอบสถานการณ์น้ำท่วม เส้นทางการเคลื่อนตัวของมวลน้ำ และระบุพื้นที่ปลายน้ำที่ควรได้รับการเฝ้าระวังหรือเก็บตัวอย่างตรวจวัดคุณภาพน้ำเพิ่มเติม 

**หลักการสำคัญ:** ระบบยึดหลัก **"ความโปร่งใสตามข้อเท็จจริง (Factual Transparency)"** ข้อมูลทุกชิ้นต้องระบุที่มา (Provenance) ความสดใหม่ และระดับความเชื่อมั่นอย่างชัดเจน ระบบจะไม่สร้างข้อมูลจำลองขึ้นมาแทนที่ข้อมูลจริง และจะไม่สรุปผลเกินกว่าหลักฐานทางวิทยาศาสตร์ที่มีอยู่

---

## 2. ระบบช่วยอะไร (Core Capabilities)
1. **แสดงสถานการณ์น้ำและพื้นที่ท่วมขัง:** ติดตามระดับน้ำจากสถานีตรวจวัดทางอุทกวิทยา และขอบเขตน้ำท่วมจากดาวเทียม
2. **วิเคราะห์การเชื่อมต่อทางน้ำ (Hydrological Connectivity):** จำลองทิศทางการไหลของน้ำในลุ่มน้ำปราจีนบุรี (แม่น้ำหนุมาน แม่น้ำพระปรง แม่น้ำปราจีนบุรี และคลองสาขา) เพื่อดูว่าพื้นที่ต้นน้ำและปลายน้ำเชื่อมโยงกันอย่างไร
3. **จัดลำดับความสำคัญในการเฝ้าระวัง (Monitoring Priority):** คัดกรองพื้นที่ที่มีความเปราะบางทางกายภาพ เช่น พื้นที่น้ำท่วมที่เชื่อมโยงกับแหล่งชุมชน เกษตรกรรม หรือแหล่งน้ำดิบ เพื่อให้หน่วยงานส่งทีมลงพื้นที่ตรวจสอบก่อน
4. **รับรายงานข้อสังเกตจากประชาชน (Citizen Observations):** เปิดให้ประชาชนส่งรายงานสิ่งที่พบในพื้นที่ (เช่น น้ำเปลี่ยนสี มีกลิ่น คราบน้ำ หรือสัตว์น้ำตาย) โดยระบบจะลบข้อมูลระบุตัวตนและพิกัดละเอียด (EXIF/GPS) เพื่อความปลอดภัย
5. **ระบุข้อมูลที่ยังไม่ทราบอย่างตรงไปตรงมา (What Is Unknown):** หากไม่มีผลตรวจจากห้องปฏิบัติการ ระบบจะระบุว่า "ข้อมูลไม่เพียงพอ (INSUFFICIENT DATA)" โดยไม่ด่วนสรุปว่าเกิดมลพิษ

---

## 3. สถาปัตยกรรมระบบ (System Architecture)

ระบบออกแบบตามมาตรฐานความปลอดภัยและความทนทานต่อความเสียหาย (High Availability & Resilience):

```
อินเทอร์เน็ตสาธารณะ (Public Internet / Clients)
               │
               ▼
[ CDN / ระบบป้องกัน DDoS ]         <-- ป้องกันการโจมตีจากภายนอก
               │
               ▼
[ WAF & Reverse Proxy ]            <-- การจำกัดอัตราเรียกใช้ (Rate Limit) & จัดการ Header ความปลอดภัย
               │
       ┌───────┴───────────────────────────────┐
       ▼                                       ▼
[ ฝั่งหน้าบ้าน (Frontend Web SPA) ]    [ ฝั่งหลังบ้าน (Backend API Layer) ]
(Vite + React / สถาปัตยกรรม Desktop GIS) (FastAPI + Uvicorn / Async I/O)
                                               │
                                               ▼
                                  [ เครือข่ายส่วนตัวภายใน (Private Network) ]
                                               │
                                               ▼
                                  [ ฐานข้อมูล PostgreSQL + PostGIS ]
                                  (จำกัดการเข้าถึงเฉพาะเครือข่ายภายใน ห้ามต่อออกเน็ตโดยตรง)
```

---

## 4. การติดตั้งระบบ (Installation)

### ข้อกำหนดเบื้องต้น (Prerequisites)
- **ระบบปฏิบัติการ:** Linux, macOS หรือ Windows (WSL2)
- **Python:** เวอร์ชัน 3.11 ขึ้นไป
- **Node.js:** เวอร์ชัน 18.x ขึ้นไป และ npm
- **PostgreSQL / PostGIS:** PostgreSQL 15+ พร้อม Extension `postgis`

### ขั้นตอนการติดตั้ง
1. **โคลนคลังโค้ดและเตรียมสภาพแวดล้อมเสมือน:**
   ```bash
   git clone https://github.com/your-org/floodtrace.git
   cd floodtrace
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

2. **ติดตั้งไลบรารีฝั่งหน้าบ้าน:**
   ```bash
   cd apps/web
   npm install
   cd ../..
   ```

3. **เตรียมฐานข้อมูล:**
   สร้างฐานข้อมูล PostgreSQL และเปิดใช้งาน PostGIS:
   ```sql
   CREATE DATABASE floodtrace_db;
   \c floodtrace_db
   CREATE EXTENSION postgis;
   ```

---

## 5. การรันระบบ (Running the Platform)

### รันฝั่งหลังบ้าน (Backend API)
```bash
source .venv/bin/activate
python3 -m uvicorn apps.api.app.main:app --host 0.0.0.0 --port 8001 --reload
```
API จะพร้อมให้บริการที่ `http://localhost:8001` และเอกสาร OpenAPI ที่ `http://localhost:8001/docs`

### รันฝั่งหน้าบ้าน (Frontend Web)
```bash
cd apps/web
npm run dev -- --port 5173
```
เข้าใช้งานผ่านเบราว์เซอร์ที่ `http://localhost:5173`

---

## 6. โครงสร้างโปรเจกต์ (Project Directory Structure)

```
FloodTrace/
├── apps/
│   ├── api/                      # ระบบ Backend พัฒนาด้วย FastAPI
│   │   ├── app/
│   │   │   ├── adapters/         # ตัวเชื่อมโยงแหล่งข้อมูลภายนอก (Open-Meteo, ThaiWater, GISTDA)
│   │   │   ├── api/v1/           # จุดให้บริการ API (telemetry, reports, risk, audit, governance)
│   │   │   ├── core/             # แกนกลางระบบ (config, database, security, circuit_breaker, provenance)
│   │   │   ├── models/           # โครงสร้างตารางฐานข้อมูล SQLAlchemy / GeoAlchemy2
│   │   │   └── services/         # กลไกการคำนวณ (risk_engine, reach_engine, cluster_engine)
│   │   └── tests/                # ชุดทดสอบอัตโนมัติ (ความปลอดภัย, ความคงทน, สิทธิการเข้าถึง)
│   └── web/                      # ระบบ Frontend พัฒนาด้วย React + Vite + Tailwind CSS
│       ├── src/
│       │   ├── components/       # คอมโพเนนต์หน้าจอและกล่องเครื่องมือ
│       │   │   └── sections/     # หน้าจอหลักทั้ง 7 ส่วนตามสถาปัตยกรรม Desktop GIS
│       │   ├── services/         # ตัวเรียกใช้งาน API ฝั่งหน้าบ้าน
│       │   └── types/            # นิยามโครงสร้างข้อมูล TypeScript
├── docs/                         # เอกสารมาตรฐานของระบบภาษาไทย
│   ├── DATA_SOURCES.md           # ตารางแจกแจงแหล่งข้อมูลภายนอกทั้ง 15 แหล่งและสถานะสิทธิ์
│   ├── DATA_PROVENANCE.md        # แหล่งกำเนิดข้อมูล ลำดับชั้น และพจนานุกรมข้อมูล
│   ├── METHODOLOGY.md            # ระเบียบวิธีวิจัย การวิเคราะห์การเชื่อมต่อทางน้ำ และข้อจำกัด
│   ├── SECURITY.md               # สถาปัตยกรรมความปลอดภัย การกู้คืนระบบ และคู่มือแก้ไขเหตุการณ์
│   ├── PRIVACY_AND_LEGAL.md      # นโยบายคุ้มครองข้อมูลส่วนบุคคลและกระบวนการรับแจ้งลบ
│   └── AUDIT/
│       └── PRODUCTION_READINESS.md # ตารางประเมินความพร้อมขึ้นระบบจริงและข้อจำกัดปัจจุบัน
├── scripts/                      # สคริปต์ทดสอบและบริหารจัดการระบบ (backup, load test, restore drill)
└── README.md                     # เอกสารแนะนำระบบภาพรวม
```

---

## 7. API สำคัญ (Key API Endpoints)

| กลุ่มงาน | เมธอดและเส้นทาง (Method & Path) | คำอธิบายภาษาไทย |
|---|---|---|
| **Health** | `GET /health/live` | ตรวจสอบว่าแอปพลิเคชันยังทำงานอยู่หรือไม่ (Process Liveness) |
| **Health** | `GET /health/ready` | ตรวจสอบความพร้อมของฐานข้อมูลและพื้นที่จัดเก็บ (Readiness) |
| **Health** | `GET /health/sources` | ตรวจสอบสถานะและ Circuit Breaker ของแหล่งข้อมูลทั้ง 15 แหล่ง |
| **Health** | `GET /health/metrics` | ตรวจสอบตัวชี้วัด Observability, สถานะคิว และระดับการแจ้งเตือน (Alerts) |
| **Realtime** | `GET /api/v1/realtime/events` | สตรีมเหตุการณ์ตามเวลาจริง (Server-Sent Events) แจ้งอัปเดตหน้าบ้านอัตโนมัติ |
| **Telemetry** | `GET /api/v1/telemetry/stations` | ข้อมูลระดับน้ำจากสถานีตรวจวัดโทรมาตรลุ่มน้ำปราจีนบุรี |
| **Reports** | `GET /api/v1/reports/` | รายการรายงานเหตุการณ์จากภาคประชาชน (รองรับ Pagination) |
| **Reports** | `POST /api/v1/reports/` | ส่งรายงานเหตุการณ์ใหม่ (รองรับ X-Idempotency-Key ป้องกันส่งซ้ำ) |
| **Reports** | `POST /api/v1/reports/upload-photo` | อัปโหลดภาพถ่ายพร้อมลบข้อมูลพิกัดและกล้อง (EXIF Stripping) |
| **Risk** | `GET /api/v1/risk/area-card/{case_id}` | บัตรสรุปสถานการณ์พื้นที่ (Evidence Packet 5 ระดับ) |
| **Risk** | `GET /api/v1/risk/my-area` | ค้นหาสถานะพื้นที่รายอำเภอตามกรอบพิกัดปลอดภัย |
| **Governance**| `GET /api/v1/governance/sources` | ตรวจสอบความยินยอมและสถานะทางกฎหมายของแหล่งข้อมูล |

---

## 8. การตั้งค่าระบบ (Configuration & Environment Variables)

ระบบควบคุมการทำงานผ่าน Environment Variables:

| ตัวแปร (Variable) | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `ENVIRONMENT` | `development` | สภาพแวดล้อมการทำงาน (`development`, `staging`, `production`) |
| `DATA_ENV` | `DEVELOPMENT` | โหมดข้อมูล (`DEVELOPMENT`, `PRODUCTION`) |
| `REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION` | `true` | **กฎเหล็ก:** ปิดกั้นข้อมูลสาธารณะที่ไม่ได้รับอนุญาตเป็นลายลักษณ์อักษร |
| `DATABASE_URL` | `postgresql://...` | สตริงการเชื่อมต่อฐานข้อมูล PostgreSQL/PostGIS ภายใน |
| `DB_POOL_SIZE` | `10` | จำนวน Connection ขั้นต่ำใน Database Pool |
| `DB_MAX_OVERFLOW` | `20` | จำนวน Connection สูงสุดที่ยอมให้เกินได้ชั่วคราว |
| `DB_STATEMENT_TIMEOUT_MS` | `10000` | ตัดคำสั่ง SQL ที่ทำงานเกิน 10 วินาที เพื่อป้องกัน DB ค้าง |
| `ADMIN_API_KEY` | - | กุญแจลับสำหรับผู้ดูแลระบบ (ห้ามเปิดเผยเด็ดขาด) |
| `RATE_LIMIT_PER_MINUTE` | `60` | อัตราเรียกใช้ API สาธารณะต่อนาทีต่อหนึ่ง IP |
| `MAX_UPLOAD_SIZE_BYTES` | `5242880` | ขนาดภาพถ่ายสูงสุดที่ยอมรับ (5 MB) |

---

## 9. การทดสอบระบบ (Testing & Verification)

### รันชุดทดสอบอัตโนมัติทั้งหมด (Backend Test Suite)
```bash
PYTHONPATH=. .venv/bin/pytest apps/api/tests/ -v
```
*ผลการตรวจปัจจุบัน: ผ่าน 60 จาก 60 การทดสอบ (100%) ครอบคลุมความคงทน, สิทธิข้อมูล, ไปป์ไลน์อัตโนมัติ, และความปลอดภัย*

### รันการซ้อมกู้คืนฐานข้อมูลจากภัยพิบัติ (Disaster Recovery Drill)
```bash
.venv/bin/python3 scripts/backup_restore_drill.py
```
*ตรวจสอบความสมบูรณ์ของ Schema, ข้อมูลจำลอง, พิกัด PostGIS และวัดค่า RTO < 30 วินาที*

### รันการทดสอบโหลดและความเค้น (Load & Stress Testing)
```bash
.venv/bin/python3 scripts/load_stress_test.py
```
*วัด Throughput ได้ > 250 คำขอ/วินาที, Latency p95 ต่ำกว่า 60ms, อัตราข้อผิดพลาด 0.00%*

### ตรวจสอบการคอมไพล์ฝั่งหน้าบ้าน
```bash
npm --prefix apps/web run build
```
*ผลการคอมไพล์: สำเร็จโดยไม่มีข้อผิดพลาด (0 errors)*

---

## 10. สถานะระบบปัจจุบัน (Current System Status)

- **ระดับสถานะ:** `LOCAL_DEVELOPMENT` / `INTERNAL_TEST`
- **สถานะแหล่งข้อมูล:**
  - แหล่งข้อมูลภายใน (`floodtrace_citizen`): **พร้อมใช้งาน (AUTHORIZED)**
  - แหล่งข้อมูลภายนอกระดับ Production: **0 แหล่ง (ยังไม่มีบันทึกข้อตกลง MOU หรือ API Key ส่วนตัว)**
- **การบังคับใช้นโยบาย:** ระบบเปิดใช้งานโหมด Fail-Closed (`REQUIRE_PRIVATE_ACCESS_FOR_PRODUCTION = True`) ข้อมูลจากหน่วยงานภายนอกที่ยังไม่มีข้อตกลงจะแสดงสถานะเป็น `ACCESS_REQUIRED` หรือ `ข้อมูลยังไม่พร้อมใช้งาน` อย่างตรงไปตรงมา

---

## 11. ข้อจำกัดของระบบ (System Limitations)

1. **ไม่ใช่การยืนยันทางกฎหมาย:** ข้อมูลและการวิเคราะห์ในระบบเป็นเพียงเครื่องมือเฝ้าระวังทางวิทยาศาสตร์ ไม่สามารถนำไปใช้อ้างอิงเป็นข้อกล่าวหาทางอาญาหรือการระบุผู้กระทำผิดได้
2. **ต้องรอการตรวจวัดจากห้องปฏิบัติการ:** การปนเปื้อนของสารเคมีจำเป็นต้องได้รับการเก็บตัวอย่างน้ำและตรวจวัดในห้องปฏิบัติการที่ได้รับการรับรองเท่านั้น ระบบจะไม่คาดเดาความเป็นพิษจากระยะห่างเพียงอย่างเดียว
3. **การพึ่งพาข้อตกลงหน่วยงาน:** ข้อมูลโทรมาตรทางการและข้อมูลดาวเทียมในระดับ Production ต้องรอการลงนามข้อตกลงการแบ่งปันข้อมูลกับหน่วยงานเจ้าของข้อมูล

---

## 12. แนวทางการ Deploy สู่ Production (Deployment Strategy)

1. **โครงสร้างพื้นฐาน:** ใช้งานผ่าน Container (Docker) ในเครือข่ายปิด (VPC/Private Subnet)
2. **Reverse Proxy & WAF:** ตั้งค่า Nginx หรือ Cloudflare เพื่อจัดการ SSL/TLS, ป้องกัน DDoS, และแทรก Security Headers (HSTS, CSP, X-Frame-Options)
3. **การย้อนกลับ (Rollback):** ใช้สถาปัตยกรรม Blue/Green Deployment หรือ Rolling Release โดยเก็บอิมเมจเวอร์ชันก่อนหน้าไว้เสมอ เพื่อให้สามารถย้อนกลับได้ภายในเวลาไม่เกิน 5 นาทีหากพบปัญหา
4. **ความปลอดภัยของฐานข้อมูล:** แยกสิทธิ์ Database User, สำรองข้อมูลอัตโนมัติรายวัน และเข้ารหัสข้อมูลขณะจัดเก็บ (Encryption at Rest)
