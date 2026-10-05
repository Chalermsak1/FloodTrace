# เอกสารแจกแจงแหล่งข้อมูลภายนอกและการเชื่อมต่อระดับใช้งานจริง (DATA SOURCES)

> **P0-1 current source matrix:** This note supersedes contradictory availability, verification, count, license, and refresh claims below; historical audits remain unchanged. ThaiWater water-level and rainfall are `ACTIVE API`. DIW is `LOCAL / UNVERIFIED` while its local snapshot lacks required provenance proof. DWR waterways and DOPA/MOPH artifacts are `UNAVAILABLE / UNVERIFIED`; access-gated integrations remain `BLOCKED`; citizen reports are `INTERNAL`. Missing counts and timestamps are null with reason codes. Registry rows and configured URLs do not prove integration.
**โครงการ:** FloodTrace — ระบบภูมิสารสนเทศติดตามน้ำท่วมและการเชื่อมต่อทางอุทกวิทยา  
**พื้นที่เป้าหมาย:** ลุ่มน้ำปราจีนบุรีและบางปะกง จังหวัดปราจีนบุรี ประเทศไทย  
**สถานะการตรวจสอบ:** ผ่านการตรวจสอบความสัจจริงระดับ Production (Final Production Truth Audit Passed)  
**วันที่ตรวจสอบล่าสุด:** 2026-10-02  

---

> [!IMPORTANT]
> ### นโยบายความสัจจริงของข้อมูล (Final Production Truth Mandate)
> ระบบ FloodTrace แยกแยะความแตกต่างอย่างเด็ดขาดระหว่าง:
> 1. **ข้อมูลจาก External API ภายนอกจริง (Real external API data)**
> 2. **ข้อมูลจริงที่โหลดจากไฟล์ในเครื่อง (Real data loaded from a local file)**
> 3. **ข้อมูลจริงที่จัดเก็บลงฐานข้อมูล (Real data stored in the database)**
> 4. **ข้อมูลจริงที่ระบบดึงอัปเดตอัตโนมัติตามรอบ (Real data automatically refreshed by the system)**
> 5. **ข้อมูลจริงที่เปิดเผยผ่าน Public API (Real data exposed through the public API)**
> 6. **ข้อมูลจริงที่แสดงผลถูกต้องบน Frontend (Real data displayed correctly in the frontend)**
>
> **กฎเหล็กที่ไม่อาจต่อรองได้ (Non-Negotiable Rule):**
> - **ห้ามแปลง `LOCAL_LOADED` เป็น `LIVE`**
> - **ห้ามแปลง `FILE_SYSTEM / LOCAL_LOADED` เป็น `AUTOMATED_EXTERNAL_INGESTION`**
> - แหล่งข้อมูลจะถือว่าเป็น **`PRODUCTION_ACTIVE`** ได้ก็ต่อเมื่อ ระบบสามารถดึงข้อมูลจากแหล่งภายนอกจริงโดยอัตโนมัติตามรอบเวลาที่กำหนด และผ่านเกณฑ์ครบทั้ง 13 มิติ

---

## 1. แบบจำลองสถานะแหล่งข้อมูล 13 มิติ (Final Source Status Model)

| ตัวแปรสถานะ (Status Field) | คำจำกัดความ (Definition) |
|---|---|
| `SOURCE_EXISTS` | มีชุดข้อมูลหรือหน่วยงานทางการอยู่จริง |
| `ENDPOINT_VERIFIED` | ได้รับการตรวจสอบ URL / Service Endpoint ที่ถูกต้องตามเอกสารทางการ |
| `ACCESS_VERIFIED` | FloodTrace มีกลไกการเข้าถึงที่ถูกต้องและได้รับอนุญาต |
| `LICENSE_VERIFIED` | สัญญาอนุญาตการใช้งานได้รับการตรวจสอบและอนุญาตให้เผยแพร่ |
| `REAL_DATA_RECEIVED` | ได้รับข้อมูลจริงจากผู้ให้บริการหรือชุดข้อมูลทางการ |
| `REAL_EXTERNAL_REQUEST` | มีการส่ง Request จริงไปยังแม่ข่ายภายนอกระหว่างการทำงาน |
| `LOCAL_DATA_LOADED` | ข้อมูลโหลดจากไฟล์ในเครื่อง (ไม่ถือเป็นการดึงข้อมูลสดภายนอก) |
| `DATABASE_INGESTED` | ข้อมูลถูกนำเข้าและจัดเก็บใน PostgreSQL / PostGIS หรือ SQLite |
| `AUTOMATED_REFRESH` | มี Background Scheduler ดึงข้อมูลอัปเดตอัตโนมัติตามรอบเวลา |
| `FRESHNESS_VERIFIED` | มีการตรวจสอบ Timestamp และอายุความสดใหม่ของข้อมูลจริง |
| `PUBLIC_API_AVAILABLE` | ข้อมูลที่ผ่านการตรวจสอบสามารถเรียกผ่าน FloodTrace Public API ได้ |
| `FRONTEND_DISPLAY_VERIFIED` | หน้าเว็บ Frontend แสดงผลข้อมูลตรงตามฐานข้อมูลจริงโดยไม่มีการจำลอง |
| `PRODUCTION_ENABLED` | ผ่านเกณฑ์การเปิดใช้งานระดับ Production ครบถ้วนทุกข้อ |

> [!NOTE]
> **เกณฑ์การเปิดใช้งานระดับ Production (`PRODUCTION_ENABLED = TRUE`):**  
> อนุญาตเฉพาะเมื่อ `SOURCE_EXISTS`, `ENDPOINT_VERIFIED`, `ACCESS_VERIFIED`, `LICENSE_VERIFIED`, `REAL_DATA_RECEIVED`, `DATABASE_INGESTED`, `AUTOMATED_REFRESH`, `FRESHNESS_VERIFIED`, และ `PUBLICATION_PERMISSION` เป็นจริงทั้งหมด หากขาดข้อใดข้อหนึ่ง จะต้องคงค่าเป็น `FALSE`

---

## 2. ตารางสรุปสถานะแหล่งข้อมูล 14 แหล่ง (Section 32 Final Source Matrix)

| Source | Endpoint | Real Req | Real Data | Local Load | DB Ingest | Auto Refresh | Freshness | License | Production Status | คำอธิบายภาษาไทย (User-Facing Label) |
|---|---|---|---|---|---|---|---|---|---|---|
| `thaiwater_rid_runoff` | YES | YES | YES | NO | YES | YES | YES | YES | **PRODUCTION_ACTIVE** | ข้อมูลล่าสุดที่ตรวจวัดได้ (ThaiWater / RID) |
| `thaiwater_rainfall` | YES | YES | YES | NO | YES | YES | YES | YES | **PRODUCTION_ACTIVE** | ข้อมูลล่าสุดที่ตรวจวัดได้ (ThaiWater / TMD) |
| `dwr_waterways` | YES | NO | YES | YES | YES | NO | YES | YES | **PRODUCTION_REFERENCE** | ข้อมูลอ้างอิงที่จัดเก็บในระบบ (กรมทรัพยากรน้ำ) |
| `diw_industrial_waste` | YES | NO | YES | YES | YES | NO | YES | YES | **PRODUCTION_REFERENCE** | ข้อมูลประวัติทางการ พฤษภาคม 2563 (กรมโรงงานฯ) |
| `dopa_villages` | YES | NO | YES | YES | YES | NO | YES | YES | **PRODUCTION_REFERENCE** | ข้อมูลอ้างอิงที่จัดเก็บในระบบ (กรมการปกครอง) |
| `moph_hospitals` | YES | NO | YES | YES | YES | NO | YES | YES | **PRODUCTION_REFERENCE** | ข้อมูลอ้างอิงที่จัดเก็บในระบบ (กระทรวงสาธารณสุข) |
| `gistda_disaster` | YES | NO | NO | NO | NO | NO | NO | NO | **PRODUCTION_BLOCKED** | ข้อมูลส่วนนี้ยังรอการอนุญาตให้เข้าถึง (GISTDA) |
| `tmd_forecast` | YES | NO | NO | NO | NO | NO | NO | NO | **PRODUCTION_BLOCKED** | ข้อมูลส่วนนี้ยังรอการอนุญาตให้เข้าถึง (กรมอุตุฯ) |
| `official_dem` | YES | NO | NO | NO | NO | NO | NO | NO | **PRODUCTION_BLOCKED** | ข้อมูลส่วนนี้ยังรอการอนุญาตให้เข้าถึง (RTSD / DWR) |
| `diw_all_factories` | YES | NO | NO | NO | NO | NO | NO | NO | **PRODUCTION_BLOCKED** | ข้อมูลส่วนนี้ยังรอการอนุญาตให้เข้าถึง (กรมโรงงานฯ) |
| `pcd_reo7_inspection` | YES | NO | NO | NO | NO | NO | NO | NO | **PRODUCTION_BLOCKED** | ข้อมูลส่วนนี้ยังรอการอนุญาตให้เข้าถึง (คพ. / สคพ.7) |
| `pcd_water_quality` | YES | NO | NO | NO | NO | NO | NO | NO | **PRODUCTION_BLOCKED** | ข้อมูลส่วนนี้ยังรอการอนุญาตให้เข้าถึง (คพ. IWIS) |
| `dgr_groundwater` | YES | NO | NO | NO | NO | NO | NO | NO | **PRODUCTION_BLOCKED** | ข้อมูลส่วนนี้ยังรอการอนุญาตให้เข้าถึง (กรมทรัพยากรน้ำบาดาล) |
| `ldd_landuse` | YES | NO | NO | NO | NO | NO | NO | NO | **PRODUCTION_BLOCKED** | ข้อมูลส่วนนี้ยังรอการอนุญาตให้เข้าถึง (กรมพัฒนาที่ดิน) |

---

## 3. สรุปจำนวนแหล่งข้อมูลทางการ (Section 34 Final Source Counts)

```
TOTAL_EXTERNAL_SOURCES = 14
REAL_EXTERNAL_API_SOURCES = 2
AUTOMATED_PRODUCTION_SOURCES = 2
PRODUCTION_REFERENCE_SOURCES = 4
LOCAL_ONLY_SOURCES = 4
BLOCKED_SOURCES = 8
TEST_ONLY_SOURCES = 0
```

---

## 4. หลักฐานการเชื่อมต่อข้อมูลจริง (Section 35 Real Data Proof)

### 4.1 `thaiwater_rid_runoff`
- **SOURCE:** thaiwater_rid_runoff (ThaiWater & RID Water Level / Runoff Telemetry)
- **REAL ENDPOINT:** `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load`
- **REQUEST:** `GET https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load`
- **HTTP STATUS:** 200 OK
- **RESPONSE RECORD COUNT:** 26 สถานี (ลุ่มน้ำปราจีนบุรี)
- **LATEST SOURCE TIMESTAMP:** 2026-10-02 19:30
- **DATABASE RECORD COUNT:** 26 สถานี
- **AUTOMATED REFRESH:** YES (รอบทุก 15 นาที ผ่าน `SourceScheduler`)
- **LAST AUTOMATED RUN:** 2026-10-02T12:41:33Z
- **FRONTEND VERIFIED:** YES (แสดงผลบนแผนที่และหน้ารวมสถานการณ์)

### 4.2 `thaiwater_rainfall`
- **SOURCE:** thaiwater_rainfall (ThaiWater Automatic Weather Stations)
- **REAL ENDPOINT:** `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h`
- **REQUEST:** `GET https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h`
- **HTTP STATUS:** 200 OK
- **RESPONSE RECORD COUNT:** 78 สถานี (จังหวัดปราจีนบุรี)
- **LATEST SOURCE TIMESTAMP:** 2026-10-02 19:00
- **DATABASE RECORD COUNT:** 78 สถานี
- **AUTOMATED REFRESH:** YES (รอบทุก 15 นาที ผ่าน `SourceScheduler`)
- **LAST AUTOMATED RUN:** 2026-10-02T12:41:34Z
- **FRONTEND VERIFIED:** YES (แสดงผลบนแผนที่และ API `/api/public/rainfall-stations`)

---

## 5. แหล่งข้อมูลอ้างอิงระดับ Production (Production Reference Datasets)

1. **`dwr_waterways` (กรมทรัพยากรน้ำ):**
   - รูปแบบ: `LOCAL_IMPORT`
   - จัดเก็บ: เวกเตอร์แนวเส้นกึ่งกลางทางน้ำธรรมชาติและคลองสายหลัก 4 สาย (แม่น้ำปราจีนบุรี, แม่น้ำบางปะกง, แควหนุมาน, คลองพระปรง)
   - สถานะ: `PRODUCTION_REFERENCE` (ข้อมูลอ้างอิงที่จัดเก็บในระบบ ไม่มีการดึงสดจากภายนอก)

2. **`diw_industrial_waste` (กรมโรงงานอุตสาหกรรม):**
   - รูปแบบ: `LOCAL_IMPORT`
   - จัดเก็บ: ทะเบียนโรงงานกลุ่มบำบัด กำจัด และรีไซเคิลกากของเสีย (ประเภท 101, 105, 106) จำนวน 112 แห่ง
   - วันที่ของชุดข้อมูล: 18 พฤษภาคม 2563 (May 18, 2020)
   - สถานะ: `HISTORICAL` (ข้อมูลประวัติทางการ ห้ามแสดงผลว่าเป็นข้อมูลโรงงานปัจจุบันเด็ดขาด)
   - ข้อกำหนด: 101/105/106 คือประเภทกิจกรรม ไม่ใช่คะแนนความเป็นพิษ

3. **`dopa_villages` (กรมการปกครอง):**
   - รูปแบบ: `LOCAL_IMPORT`
   - จัดเก็บ: พิกัดศูนย์กลางตำบล 65 ตำบลใน 7 อำเภอ
   - สถานะ: `STATIC_REFERENCE` (ข้อมูลอ้างอิงที่จัดเก็บในระบบ)

4. **`moph_hospitals` (กระทรวงสาธารณสุข):**
   - รูปแบบ: `LOCAL_IMPORT`
   - จัดเก็บ: ตำแหน่งโรงพยาบาลและ รพ.สต. 11 แห่ง สำหรับแผนที่จุดเปราะบางทางสิ่งแวดล้อม
   - สถานะ: `STATIC_REFERENCE` (ข้อมูลอ้างอิงที่จัดเก็บในระบบ)

---

## 6. แหล่งข้อมูลที่ถูกระงับ (Production Blocked Sources - 8 Sources)

1. **`gistda_disaster` (สทอภ. / GISTDA):** ขาด `GISTDA_API_KEY` ประจำโครงการ — ระงับการนำเข้าและไม่สร้างโพลิกอนน้ำท่วมเท็จ
2. **`tmd_forecast` (กรมอุตุนิยมวิทยา):** ขาด `TMD_API_KEY` — ระงับการนำเข้าและไม่นำข้อมูลพยากรณ์สังเคราะห์มาทดแทน
3. **`official_dem` (กรมแผนที่ทหาร RTSD):** ต้องใช้หนังสือราชการทหาร — ระงับการนำเข้าและห้ามสุ่มสร้างความสูงเท็จ
4. **`diw_all_factories` (กรมโรงงานฯ):** ต้องใช้ Enterprise API Token — ระงับการนำเข้า
5. **`pcd_reo7_inspection` (กรมควบคุมมลพิษ):** ต้องใช้บันทึกข้อตกลง MOU — ระงับการนำเข้า
6. **`pcd_water_quality` (กรมควบคุมมลพิษ IWIS):** แม่ข่ายปลายทางไม่ตอบสนอง (`SOURCE_UNAVAILABLE`) — ระงับการนำเข้า
7. **`dgr_groundwater` (กรมทรัพยากรน้ำบาดาล):** ต้องใช้ข้อตกลงการเข้าถึง ทบ. — ระงับการนำเข้า
8. **`ldd_landuse` (กรมพัฒนาที่ดิน):** ต้องใช้ Token สำหรับ Geoserver — ระงับการนำเข้า

---

## 7. คำสั่งตรวจสอบความสัจจริงอัตโนมัติ (Verification Command)

```bash
# ตรวจสอบความสัจจริงของแหล่งข้อมูลทั้งหมด 14 แหล่ง
python3 scripts/verify_all_sources.py

# รันชุดทดสอบความสัจจริงและระบบรีเฟรชอัตโนมัติ
pytest apps/api/tests/test_automated_refresh_and_truth.py -v
```
