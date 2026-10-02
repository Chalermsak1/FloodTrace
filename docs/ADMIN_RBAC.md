# สิทธิ์การเข้าถึงและการควบคุมตามบทบาท (Role-Based Access Control - RBAC)
**ระบบ:** FloodTrace Internal Operations  
**การบังคับใช้:** Enforced at API Layer (`apps/api/app/core/staff_rbac.py`)  
**วันที่ประกาศ:** 2026-10-02  

---

## 1. บทบาทเจ้าหน้าที่ 4 ระดับ (Staff Roles)

ระบบกำหนดบทบาทและขอบเขตอำนาจหน้าที่ของบุคลากรภายในออกเป็น 4 ระดับ:

### 1. ADMIN (ผู้ดูแลระบบแพลตฟอร์ม)
- **หน้าที่:** ควบคุมดูแลระบบความปลอดภัย ผู้ใช้งาน และนโยบายการเผยแพร่ข้อมูล
- **สิทธิ์การทำงาน:**
  - จัดการรายชื่อและสิทธิ์ของเจ้าหน้าที่ (Manage Staff Users & Roles)
  - มอบหมายและเปลี่ยนผู้รับผิดชอบรายงาน (Assign / Reassign)
  - ปรับเปลี่ยนสถานะในขั้นตอนการดำเนินงานทั้งหมด (All State Transitions)
  - อนุมัติการเปิดเผยข้อมูลต่อสาธารณะ (Manage Public Visibility: `PRIVATE`, `PUBLIC_SAFE_SUMMARY`, `PUBLIC_VERIFIED`, `WITHHELD`)
  - ตรวจสอบประวัติระบบและความปลอดภัย (View Immutable Audit Logs)
  - เข้าถึงพิกัด GPS ละเอียดดั้งเดิมและข้อมูลการติดต่อของผู้แจ้งเบาะแส

### 2. REVIEWER (นักวิชาการสิ่งแวดล้อม / ผู้ตรวจสอบข้อเท็จจริง)
- **หน้าที่:** ตรวจสอบพยานหลักฐาน เปรียบเทียบข้อมูลโทรมาตร และพิสูจน์ข้อเท็จจริง
- **สิทธิ์การทำงาน:**
  - ตรวจสอบรายงานและหลักฐานภาพถ่ายที่มีการลบ EXIF
  - เปรียบเทียบข้อมูลระบบ (System Cross-Check)
  - ขอข้อมูลเพิ่มเติมจากประชาชน (`NEED_MORE_INFO`)
  - บันทึกการพิสูจน์ข้อเท็จจริง 6 มิติ (Structured Verification)
  - บันทึกการส่งต่อหน่วยงานภายนอก (Escalate)
  - บันทึกการยุติเรื่อง (Resolve)
  - เข้าถึงพิกัด GPS ละเอียดดั้งเดิม
  - **ข้อจำกัด:** ไม่สามารถจัดการบัญชีผู้ใช้งาน และไม่สามารถเผยแพร่ข้อมูลสู่สาธารณะโดยตรง

### 3. OPERATOR (เจ้าหน้าที่รับแจ้งและคัดกรองเบื้องต้น)
- **หน้าที่:** ตรวจสอบรายงานที่เข้ามาใหม่ คัดกรองเบื้องต้น และแจกจ่ายงาน
- **สิทธิ์การทำงาน:**
  - ดูรายการรายงานใหม่ที่เข้ามาในระบบ
  - เรียกใช้การคัดกรองอัตโนมัติ (Trigger Triage)
  - มอบหมายรายงานให้แก่นักวิชาการสิ่งแวดล้อม (Assign Reports)
  - ปรับระดับความเร่งด่วนทางธุรการ (`URGENT`, `HIGH`, `NORMAL`, `LOW`)
  - เข้าถึงพิกัด GPS เพื่อประเมินพื้นที่รับผิดชอบ
  - **ข้อจำกัด:** ไม่สามารถทำการพิสูจน์ข้อเท็จจริง (`VERIFIED_OBSERVATION`) หรือยืนยันสถานะทางการได้

### 4. READ_ONLY (ผู้สังเกตการณ์ / ผู้ตรวจสอบภายนอก)
- **หน้าที่:** ตรวจสอบความโปร่งใส ติดตามสถานะงาน และศึกษาข้อมูล
- **สิทธิ์การทำงาน:**
  - ดูรายการรายงานและสถิติต่างๆ ในคิวงาน
  - ดูหลักฐานภาพถ่ายที่ปลอดภัย
  - ดูประวัติการปฏิบัติงาน (Audit History)
  - **ข้อจำกัดอย่างเด็ดขาด:** **ห้ามทำการแก้ไข เปลี่ยนสถานะ มอบหมายงาน หรือพิสูจน์ข้อเท็จจริงใดๆ ในระบบ** (ทุกคำขอแก้ไขจะถูกปฏิเสธด้วยรหัส `HTTP 403 Forbidden`)

---

## 2. ตารางเมทริกซ์สิทธิ์การปฏิบัติงาน (Permissions Matrix)

| การปฏิบัติงาน (Operation) | ADMIN | REVIEWER | OPERATOR | READ_ONLY | Endpoint ที่ควบคุม |
|---|:---:|:---:|:---:|:---:|---|
| ดูรายการรายงาน (View Reports) | ✅ | ✅ | ✅ | ✅ | `GET /api/v1/admin/reports` |
| ดูข้อมูลระบบเทียบเคียง (View System Context) | ✅ | ✅ | ✅ | ✅ | `GET /api/v1/admin/reports/{id}/context` |
| ดูประวัติระบบ (View Audit Logs) | ✅ | ✅ | ✅ | ✅ | `GET /api/v1/admin/reports/{id}/timeline` |
| ดูพิกัดจริง (View Exact GPS) | ✅ | ✅ | ✅ | ❌ | ซ่อนพิกัดจริงสำหรับ READ_ONLY |
| ดูข้อมูลผู้แจ้ง (View Contact Info) | ✅ | ✅ | ❌ | ❌ | ปกป้องตามนโยบาย PDPA |
| คัดกรองเบื้องต้น (Trigger Triage) | ✅ | ✅ | ✅ | ❌ | `POST /api/v1/admin/reports/{id}/triage` |
| มอบหมายงาน (Assign Report) | ✅ | ❌ | ✅ | ❌ | `POST /api/v1/admin/reports/{id}/assign` |
| ปรับความเร่งด่วน (Change Priority) | ✅ | ✅ | ✅ | ❌ | `POST /api/v1/admin/reports/{id}/priority` |
| ขอข้อมูลเพิ่มเติม (Request More Info) | ✅ | ✅ | ❌ | ❌ | `POST /api/v1/admin/reports/{id}/request-info` |
| พิสูจน์ข้อเท็จจริง (Verify Observation) | ✅ | ✅ | ❌ | ❌ | `POST /api/v1/admin/reports/{id}/verify` |
| ส่งต่อหน่วยงาน (Escalate Report) | ✅ | ✅ | ❌ | ❌ | `POST /api/v1/admin/reports/{id}/escalate` |
| ยุติเรื่อง (Resolve Report) | ✅ | ✅ | ❌ | ❌ | `POST /api/v1/admin/reports/{id}/resolve` |
| จัดการการเผยแพร่ (Manage Publication) | ✅ | ❌ | ❌ | ❌ | `POST /api/v1/admin/reports/{id}/publication` |
| จัดการผู้ใช้เจ้าหน้าที่ (Manage Staff Users) | ✅ | ❌ | ❌ | ❌ | `GET /api/v1/admin/staff/users` |

---

## 3. กลไกการยืนยันตัวตนและการตรวจสอบสิทธิ์ (Authentication Headers)

การเรียกใช้งาน API ภายใน กำหนดให้ส่ง Header อย่างใดอย่างหนึ่งต่อไปนี้:
1. `X-Admin-Key: <ADMIN_API_KEY>` (ใช้ตรวจสอบสิทธิ์หลัก)
2. `X-Staff-User: <username>` (ระบุชื่อบัญชีเจ้าหน้าที่ เช่น `reviewer_01`)
3. `X-Staff-Role: <role>` (ระบุบทบาทการปฏิบัติงาน)
4. `Authorization: Bearer <token>`
