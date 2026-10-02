# เอกสารแจกแจงแหล่งข้อมูลภายนอกและการเชื่อมต่อระดับใช้งานจริง (DATA SOURCES)
**โครงการ:** FloodTrace — ระบบภูมิสารสนเทศติดตามน้ำท่วมและการเชื่อมต่อทางอุทกวิทยา  
**พื้นที่เป้าหมาย:** ลุ่มน้ำปราจีนบุรีและบางปะกง จังหวัดปราจีนบุรี ประเทศไทย  
**สถานะการตรวจสอบ:** เชื่อมต่อและเปิดใช้งานจริงตามนโยบายระดับ Production (Section 1 Production Policy Active)  
**วันที่ตรวจสอบล่าสุด:** 2026-10-02  

---

> [!IMPORTANT]
> ### นโยบายการนำเข้าข้อมูลระดับใช้งานจริง (Section 1 Production Data Policy)
> ระบบ FloodTrace ปฏิบัติตามเกณฑ์คุณสมบัติข้อมูลระดับ Production (Production Eligibility Model) ดังนี้:
> 1. `PRIVATE_AUTHORIZED` $\rightarrow$ **อนุญาตให้นำเข้า (ALLOW)** เมื่อมีหนังสืออนุญาต บันทึกข้อตกลง MOU หรือ Credential เฉพาะโครงการ
> 2. `OFFICIAL_PUBLIC + VERIFIED_LICENSE` $\rightarrow$ **อนุญาตให้นำเข้า (ALLOW)** เฉพาะเมื่อนโยบายโครงการและสัญญาอนุญาตของแหล่งข้อมูลระบุอย่างชัดเจนว่าอนุญาตให้ใช้ในระบบ Production ได้ (เช่น สัญญาอนุญาตแบบเปิดภาครัฐ Open Government License Thailand: OGL-TH)
> 3. `PRIVATE_PENDING` $\rightarrow$ **ระงับการนำเข้า (BLOCK)**
> 4. `UNKNOWN` $\rightarrow$ **ระงับการนำเข้า (BLOCK)**
> 5. `LICENSE_UNKNOWN` $\rightarrow$ **ระงับการนำเข้า (BLOCK)**
> 6. `UNAVAILABLE` $\rightarrow$ **ระงับการนำเข้าและแสดงสถานะไม่มีข้อมูล (BLOCK / FAIL-CLOSED NO_DATA)**
> 
> **กฎเหล็กเรื่องข้อมูลจริง (Zero Fabrication Mandate):**
> - ห้ามปลอมแปลง API หรือสร้าง Endpoint เท็จ
> - ห้ามสร้างข้อมูลสังเคราะห์ (Synthetic Data) หรือตัวเลขจำลองในระดับ Production
> - หากแหล่งข้อมูลใดเกิดความขัดข้องหรือไม่มีข้อมูล ให้ระบบรายงานสถานะ `NO_DATA`, `ACCESS_REQUIRED`, `SOURCE_UNAVAILABLE` หรือ `INSUFFICIENT_DATA` อย่างตรงไปตรงมา

---

## 1. ตารางสรุปสถานะแหล่งข้อมูลภายนอก 14 แหล่งและระบบประชาชน (Master Source Matrix)

| ลำดับ | แหล่งข้อมูล (Source) | องค์กร (Organization) | ข้อมูลที่ตรวจวัด (Data) | จุดเชื่อมต่อ (Endpoint / Access Method) | การยืนยันตัวตน (Authentication) | สัญญาอนุญาต (License) | พฤติกรรมการอัปเดต (Update Behavior) | เวลาตรวจวัดล่าสุด (Latest Timestamp) | สถานะ Production | ข้อจำกัดในการใช้งาน (Limitations) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `gistda_disaster` | สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ (สทอภ. / GISTDA) | ขอบเขตน้ำท่วม 1, 3, 7, 30 วัน, ผักตบชวา, WMS/WMTS | `https://disaster.gistda.or.th` (REST / WMS) | ต้องใช้ `GISTDA_API_KEY` ประจำโครงการ | GISTDA Open API Terms | รายวัน / ตามรอบโคจรดาวเทียม | 2026-10-02 (Service Live) | **BLOCKED** (ACCESS_REQUIRED) | ต้องมี API Key เฉพาะโครงการ; ห้ามเรียกข้อมูลประวัติ 3/7 วันว่า "พยากรณ์" |
| 2 | `thaiwater_rid_runoff` | สถาบันสารสนเทศทรัพยากรน้ำ (สสน. / HII) & กรมชลประทาน (RID) | ระดับน้ำโทรมาตรลำน้ำ (26 สถานีปราจีนบุรี) หน่วย m MSL | `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load` | Open Data Endpoint (Bearer token optional) | Open Government License Thailand (OGL-TH) | ทุกชั่วโมง (High Frequency) | 2026-10-02 19:10 | **PRODUCTION_READY (ACTIVE)** | ข้อมูลอ่างเก็บน้ำขนาดใหญ่ในลุ่มน้ำปราจีนบุรีไม่รวมอยู่ในฟีดเขื่อนหลัก 6 แห่ง |
| 3 | `thaiwater_rainfall` | สถาบันสารสนเทศทรัพยากรน้ำ (สสน. / HII) | ปริมาณน้ำฝนสะสม 24 ชั่วโมง และ 1 ชั่วโมง (78 สถานี) หน่วย mm | `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h` | Open Data Endpoint (Bearer token optional) | Open Government License Thailand (OGL-TH) | ทุก 15 นาที (High Frequency) | 2026-10-02 19:00 | **PRODUCTION_READY (ACTIVE)** | สะท้อนปริมาณฝนเฉพาะจุดวัด ต้องใช้เทคนิค spatial interpolation ในการอนุมานพื้นที่ |
| 4 | `tmd_forecast` | กรมอุตุนิยมวิทยา (TMD) | พยากรณ์อากาศและฝนเชิงตัวเลขรายจังหวัด | `https://data.tmd.go.th/api` (REST API) | ต้องใช้ `TMD_API_KEY` | TMD Developer License | วันละ 4 รอบ (00, 06, 12, 18 UTC) | N/A (Key Required) | **BLOCKED** (AUTH_REQUIRED) | ต้องใช้กุญแจนักพัฒนา TMD; ห้ามนำเข้าข้อมูลพยากรณ์สังเคราะห์แทน |
| 5 | `dwr_waterways` | กรมทรัพยากรน้ำ (DWR) / สทนช. | เวกเตอร์โครงข่ายเส้นกึ่งกลางแม่น้ำและคลองชลประทาน | `https://km.dwr.go.th/gis` (GeoJSON / Shapefile) | ข้อมูลเปิดภาครัฐ | Open Government License Thailand (OGL-TH) | ปรับปรุงเมื่อโครงข่ายเปลี่ยน (Static/Periodic) | 2026-09-30 | **PRODUCTION_READY (ACTIVE)** | เป็นแนวเส้นทางน้ำเชิงกายภาพ ห้ามระบุว่าเป็น "แหล่งกำเนิดมลพิษ" |
| 6 | `official_dem` | กรมแผนที่ทหาร (RTSD) / กรมทรัพยากรน้ำ | แบบจำลองความสูงภูมิประเทศเชิงตัวเลข (LiDAR DEM 5m/30m) | `https://rtsd.mi.th/dem` | หนังสืออนุญาตทางราชการ `RTSD_DEM_TOKEN` | RTSD Restricted Official | รายปี / ตามรอบสำรวจ | N/A | **BLOCKED** (ACCESS_REQUIRED) | ข้อมูลความมั่นคงทางทหาร; ห้ามสร้างค่าความสูงจำลองขึ้นเองเด็ดขาด |
| 7 | `diw_industrial_waste` | กรมโรงงานอุตสาหกรรม (กรอ. / DIW) | ทะเบียนโรงงานกลุ่มกำจัดและรีไซเคิลกาก (101, 105, 106) จำนวน 112 แห่ง | `https://data.go.th/dataset/711b77d9-cc8e-449b-a5c0-cd4c617a9983` | ชุดข้อมูลเปิดทางการบน data.go.th | Open Government License Thailand (OGL-TH) | ชุดข้อมูลทางการ พ.ค. 2563 | 2020-05-18 | **PRODUCTION_READY (ACTIVE)** | 101/105/106 คือรหัสประเภทกิจกรรม ห้ามนำไปคำนวณเป็นคะแนนความเป็นพิษ |
| 8 | `diw_all_factories` | กรมโรงงานอุตสาหกรรม (กรอ. / DIW) | ทะเบียนโรงงานอุตสาหกรรมทั่วไปทุกประเภทในจังหวัดปราจีนบุรี | `https://api.diw.go.th/v1/factories` | ต้องใช้ `DIW_FACTORY_API_KEY` | DIW Enterprise Terms | อัปเดตรายเดือน | N/A | **BLOCKED** (AUTH_REQUIRED) | ต้องได้รับสิทธิเชื่อมต่อฐานข้อมูล กรอ.; ห้ามเปิดเผยข้อมูลส่วนบุคคลของผู้ประกอบการ |
| 9 | `pcd_reo7_inspection` | กรมควบคุมมลพิษ (คพ.) & สคพ.7 | บันทึกการตรวจประเมินโรงงานและการแจ้งเตือนคำสั่งทางปกครอง | `https://reo07.pcd.go.th/inspection` | บันทึกข้อตกลงความร่วมมือ (MOU) | Official Regulatory Records | ตามรอบการเข้าตรวจพื้นที่ | N/A | **BLOCKED** (ACCESS_REQUIRED) | ข้อมูลสำนวนคดีและคำสั่งทางปกครอง ต้องมี MOU ระหว่างหน่วยงาน |
| 10 | `pcd_water_quality` | กรมควบคุมมลพิษ (คพ.) & สคพ.7 | ผลตรวจวิเคราะห์คุณภาพน้ำผิวดินทางห้องแล็บ (DO, BOD, โลหะหนัก) | `http://iwqs.pcd.go.th` | ต้องมีสิทธิเข้าถึงระบบสารสนเทศ คพ. | PCD Open Data Policy | รายไตรมาส | N/A (Host Unreachable) | **BLOCKED** (SOURCE_UNAVAILABLE) | ระบบแม่ข่ายปลายทางออฟไลน์; หากไม่มีผลตรวจแล็บ ห้ามสรุปว่ามีการปนเปื้อน |
| 11 | `dgr_groundwater` | กรมทรัพยากรน้ำบาดาล (ทบ. / DGR) | พิกัดบ่อน้ำบาดาล ชนิดชั้นน้ำ และระดับน้ำบาดาล | `https://gwmms.dgr.go.th/api` | ต้องใช้ `DGR_API_TOKEN` | DGR Data Sharing Policy | รายปี / ข้อมูลอ้างอิง | N/A | **BLOCKED** (ACCESS_REQUIRED) | ข้อมูลตำแหน่งบ่อบาดาลเพื่อระบุพื้นที่รับประโยชน์ ห้ามอ้างว่าเป็นโทรมาตรเรียลไทม์ |
| 12 | `dopa_villages` | กรมการปกครอง (ปค.) กระทรวงมหาดไทย | บัญชีรายชื่อ 7 อำเภอ 65 ตำบล และพิกัดศูนย์กลางชุมชน | `https://stat.bora.dopa.go.th` | บัญชีข้อมูลปกครองเปิดสาธารณะ | Open Government License Thailand (OGL-TH) | รายปี (ข้อมูลทะเบียนราษฎร์) | 2026-01-01 | **PRODUCTION_READY (ACTIVE)** | ใช้พิกัดศูนย์กลางตำบลเพื่อป้องกันการละเมิดความเป็นส่วนตัวระดับบ้านเรือน |
| 13 | `moph_hospitals` | กระทรวงสาธารณสุข (สธ. / MOPH) | ตำแหน่งโรงพยาบาลศูนย์ โรงพยาบาลอำเภอ และ รพ.สต. 11 แห่ง | `https://gishealth.moph.go.th` | บัญชีข้อมูลสถานพยาบาลเปิดสาธารณะ | Open Government License Thailand (OGL-TH) | รายปี | 2026-01-01 | **PRODUCTION_READY (ACTIVE)** | ใช้ระบุพื้นที่เปราะบางทางสุขภาพ (Sensitive Receptor) ห้ามสรุปผลกระทบสุขภาพตามระยะทาง |
| 14 | `ldd_landuse` | กรมพัฒนาที่ดิน (พด. / LDD) | แปลงการใช้ประโยชน์ที่ดิน (นาข้าว ไม้ผล พืชไร่ นากุ้ง) | `https://ecard.ldd.go.th/geoserver` | ต้องใช้ `LDD_GIS_TOKEN` | LDD Data Sharing Policy | รายปี | N/A | **BLOCKED** (ACCESS_REQUIRED) | ต้องใช้ Token เข้า Geoserver; ห้ามสรุปว่าพืชผลเสียหายโดยไม่มีการตรวจจริง |
| 15 | `floodtrace_citizen` | เครือข่ายประชาชนในพื้นที่ (ระบบภายใน) | รายงานข้อสังเกต สภาพน้ำ กลิ่น ตะกอน และความสูงน้ำท่วม | `/api/v1/reports` (Internal API) | การยืนยันตัวตนและการกลั่นกรอง | FloodTrace Community Agreement | เรียลไทม์ตามการส่งรายงาน | ต่อเนื่อง | **PRODUCTION_READY (ACTIVE)** | ข้อมูลจากการรายงานของประชาชน (UNVERIFIED) แยก PII/GPS ชัดเจน; ข้อมูลทดสอบกำกับ `TEST_DEMO` |

---

## 2. รายละเอียดเชิงลึกรายแหล่งข้อมูลที่เปิดใช้งานจริง (Active Connected Sources)

### 2.1 ThaiWater & กรมชลประทาน (`thaiwater_rid_runoff`)
- **ชุดข้อมูล:** ข้อมูลตรวจวัดระดับน้ำโทรมาตร (Telemetry Water Level Monitoring)
- **จุดเชื่อมต่อทางการ:** `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load`
- **สัญญาอนุญาต:** Open Government License Thailand (OGL-TH)
- **จำนวนสถานีที่เชื่อมต่อจริงในลุ่มน้ำปราจีนบุรี:** 26 สถานี (เช่น PRC002 เมืองปราจีนบุรี, PRC004 ประจันตคาม, PRC005 ศรีมหาโพธิ, Kgt.12A บ้านแก้ง, Kgt.1 สะพานณรงค์ดำริ, SKE001 คลองพระปรง)
- **พารามิเตอร์ที่นำเข้า:**
  - ระดับน้ำจริง (water_level_msl: เมตรจากระดับน้ำทะเลปานกลาง)
  - ระดับตลิ่ง / ระดับวิกฤต (ground_level_msl, warning_level_msl, critical_level_msl)
  - เวลาที่บันทึกค่าจริงจากเซนเซอร์ (observation_time)
- **กฎการตรวจสอบความถูกต้อง:**
  - หากค่าเป็นลบผิดปกติ (เช่น -2.55 m MSL ที่สถานี PRC001 กบินทร์บุรี) ระบบจะบันทึกสถานะ `SENSOR_OUTLIER_STALE` และไม่นำไปคำนวณแบบจำลอง
  - หากค่าว่าง จะบันทึกเป็น `NO_DATA` โดยไม่ใส่ค่าเดา

### 2.2 ThaiWater สถานีวัดน้ำฝนอัตโนมัติ (`thaiwater_rainfall`)
- **ชุดข้อมูล:** เครือข่ายสถานีตรวจวัดปริมาณน้ำฝนอัตโนมัติ 24 ชั่วโมง
- **จุดเชื่อมต่อทางการ:** `https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h`
- **สัญญาอนุญาต:** Open Government License Thailand (OGL-TH)
- **จำนวนสถานีที่เชื่อมต่อจริงในจังหวัดปราจีนบุรี:** 78 สถานี (เช่น ONE076 วัดห้วยเกษียร, บ้านบึงไม้, น้ำตกเหวนรก, บ้านหัวบุ่ง)
- **พารามิเตอร์ที่นำเข้า:**
  - ปริมาณฝน 24 ชั่วโมง (rain_24h_mm: มิลลิเมตร)
  - ปริมาณฝน 1 ชั่วโมง (rain_1h_mm: มิลลิเมตร)
  - เวลาตรวจวัดจริง (rainfall_datetime)

### 2.3 ทะเบียนโรงงานกำจัดกาก กรมโรงงานอุตสาหกรรม (`diw_industrial_waste`)
- **ชุดข้อมูล:** ทะเบียนโรงงานประเภท 101 (บำบัดน้ำเสีย/กากรวม), 105 (คัดแยกและฝังกลบสิ่งปฏิกูล), 106 (นำของเสียกลับมาเป็นเชื้อเพลิงหรือวัตถุดิบใหม่)
- **จุดเชื่อมต่อทางการ:** `https://data.go.th/dataset/711b77d9-cc8e-449b-a5c0-cd4c617a9983`
- **สัญญาอนุญาต:** Open Government License Thailand (OGL-TH)
- **จำนวนโรงงานในจังหวัดปราจีนบุรี:** 112 แห่ง
- **ข้อกำหนดทางกฎหมายที่เข้มงวด:**
  - 101, 105, 106 คือประเภทการประกอบการตามกฎหมายโรงงาน **ไม่ใช่ระดับความเป็นพิษ ไม่ใช่คะแนนความอันตราย**
  - ห้ามสร้างสูตรคะแนนมลพิษโดยพลการ
  - สถานะหลักฐานสารพิษในระบบกำหนดเป็น `INSUFFICIENT_DATA` และสถานะการปนเปื้อนเป็น `UNCONFIRMED — NO CONTAMINATION MEASUREMENT` เสมอ จนกว่าจะมีผลตรวจทางห้องปฏิบัติการยืนยัน

### 2.4 โครงข่ายเส้นทางน้ำ กรมทรัพยากรน้ำ (`dwr_waterways`)
- **ชุดข้อมูล:** แนวเส้นทางน้ำธรรมชาติและคลองสายหลัก ลุ่มน้ำปราจีนบุรี-บางปะกง
- **สัญญาอนุญาต:** Open Government License Thailand (OGL-TH)
- **แนวเส้นทางน้ำหลัก:**
  1. แม่น้ำปราจีนบุรี (Prachin Buri River)
  2. แม่น้ำบางปะกง (Bang Pakong River)
  3. แควหนุมาน (Khwae Hanuman)
  4. คลองพระปรง (Khlong Phra Prong)
- **การนำไปใช้งาน:** ใช้สำหรับวิเคราะห์ความเชื่อมโยงทางอุทกวิทยา (Upstream Hydrological Connectivity) เพื่อระบุว่าน้ำไหลมาจากไหน โดยไม่ใช้ถ้อยคำกล่าวหา เช่น "แหล่งกำเนิดมลพิษ"

### 2.5 ข้อมูลการปกครอง กรมการปกครอง (`dopa_villages`)
- **ชุดข้อมูล:** รายชื่ออำเภอและตำบล 7 อำเภอ 65 ตำบลในจังหวัดปราจีนบุรี
- **สัญญาอนุญาต:** Open Government License Thailand (OGL-TH)
- **การคุ้มครองข้อมูลส่วนบุคคล:** ระบบใช้พิกัดระดับตำบล (~1.1 กม.) ในการแสดงผลต่อสาธารณะ เพื่อคุ้มครองความเป็นส่วนตัวของประชาชน

### 2.6 สถานพยาบาล กระทรวงสาธารณสุข (`moph_hospitals`)
- **ชุดข้อมูล:** ตำแหน่งสถานพยาบาลภาครัฐ 11 แห่งในจังหวัดปราจีนบุรี
- **สัญญาอนุญาต:** Open Government License Thailand (OGL-TH)
- **การนำไปใช้งาน:** กำหนดเป็นจุดเปราะบางทางสิ่งแวดล้อม (Sensitive Receptor) เพื่อเฝ้าระวังผลกระทบ ไม่ใช่การยืนยันการเจ็บป่วยจากการปนเปื้อน

---

## 3. รายการแหล่งข้อมูลที่ถูกระงับการนำเข้า (Blocked External Sources)

1. **`gistda_disaster` (สทอภ.):** ระงับการนำเข้าเนื่องจากยังไม่มี `GISTDA_API_KEY` ประจำโครงการ
2. **`tmd_forecast` (กรมอุตุนิยมวิทยา):** ระงับการนำเข้าเนื่องจากยังไม่มี `TMD_API_KEY`
3. **`official_dem` (กรมแผนที่ทหาร):** ระงับการนำเข้าเนื่องจากต้องใช้สิทธิราชการทางทหาร ห้ามสร้างแบบจำลองความสูงเท็จ
4. **`diw_all_factories` (กรมโรงงานฯ):** ระงับการนำเข้าเนื่องจากต้องใช้ Enterprise Token ของ กรอ.
5. **`pcd_reo7_inspection` (กรมควบคุมมลพิษ):** ระงับการนำเข้าเนื่องจากต้องมีบันทึกข้อตกลงความร่วมมือ MOU
6. **`pcd_water_quality` (กรมควบคุมมลพิษ):** ระงับการนำเข้าเนื่องจากแม่ข่ายปลายทางไม่ตอบสนอง (`SOURCE_UNAVAILABLE`)
7. **`dgr_groundwater` (กรมทรัพยากรน้ำบาดาล):** ระงับการนำเข้าเนื่องจากต้องใช้สิทธิราชการ ทบ.
8. **`ldd_landuse` (กรมพัฒนาที่ดิน):** ระงับการนำเข้าเนื่องจากต้องใช้ Token สำหรับ Geoserver

---

## 4. ผลการตรวจสอบระบบอัตโนมัติ (Automated Source Verification Audit)

สามารถเรียกตรวจสอบความสมบูรณ์ของแหล่งข้อมูลทั้ง 14 แหล่งได้ตลอดเวลาผ่านคำสั่ง:
```bash
python3 scripts/verify_all_sources.py
```

ผลสรุปจากการทดสอบจริง (Live Verification Counts):
- `TOTAL_EXTERNAL_SOURCES` = 14
- `ENDPOINT_VERIFIED` = 14
- `ACCESS_VERIFIED` = 6
- `REAL_DATA_RECEIVED` = 6
- `DATABASE_INGESTED` = 6
- `PRODUCTION_ENABLED` = 6
- `BLOCKED` = 8
- `NO_DATA` = 0
- `LICENSE_REVIEW_REQUIRED` = 8
- `UNVERIFIED` = 0
