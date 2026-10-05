# สถาปัตยกรรมความปลอดภัย การกู้คืนระบบ และคู่มือรับมือภัยคุกคาม (SECURITY & RUNBOOKS)
**ขอบเขตระบบ:** แพลตฟอร์ม FloodTrace จังหวัดปราจีนบุรี  
**สถานะการตรวจสอบ:** ร่างฉบับตรวจสอบความจริงเพื่อการใช้งานจริง (PRODUCTION TRUTH AUDIT)  
**วันที่ตรวจสอบล่าสุด:** 2026-10-02  

---

## 1. สถาปัตยกรรมความปลอดภัยของระบบ (Security Architecture)

ระบบ FloodTrace ได้รับการออกแบบตามหลักการ **"Defense-in-Depth (การป้องกันเป็นชั้นเชิง)"** และ **"Least Privilege (การให้สิทธิ์เท่าที่จำเป็น)"**:

```
[ ผู้ใช้งานทั่วไป / อินเทอร์เน็ต ]
              │
              ▼
    [ CDN / DDoS Shield ]          <-- ป้องกันการยิงถล่มคำขอ (Cloudflare / WAF)
              │
              ▼
    [ Reverse Proxy & Rate Limit]  <-- กรองคำขออันตราย ตรวจสอบขนาด Body และตัด Rate Limit
              │
              ▼
    [ FastAPI Application Layer ]  <-- ตรวจสอบสิทธิ์ (RBAC), ถอดรหัส, และกำกับ X-Request-ID
              │
              ├──────────────────────────────┐
              ▼                              ▼
    [ PostgreSQL + PostGIS ]       [ Background SourceScheduler ]
    (Internal Docker Network)       (Circuit Breakers + Rate-Gated)
```

---

## 2. ระบบดึงข้อมูลอัตโนมัติและความปลอดภัยของการเชื่อมต่อภายนอก (Section 16 Scheduler Security)

การเชื่อมต่อกับแหล่งข้อมูลภายนอกดำเนินการผ่าน `SourceScheduler` (`apps/api/app/core/scheduler.py`) ซึ่งมีมาตรการความปลอดภัยและเสถียรภาพดังนี้:

1. **Source-Specific Intervals:** กำหนดความถี่ตามความเหมาะสมของแหล่งข้อมูล ไม่ส่งคำขอเร็วกว่าที่ผู้ให้บริการรองรับ (เช่น ThaiWater ทุก 15 นาที ส่วนข้อมูลอ้างอิงจะไม่มีการเรียกซ้ำ)
2. **Circuit Breaker Protection:**
   - ใช้ Circuit Breaker แยกตามแต่ละแหล่งข้อมูล
   - ตรวจสอบ `can_execute()` ก่อนส่งคำขอทุกครั้ง
   - หากเกิดข้อผิดพลาดติดต่อกัน Circuit Breaker จะตัดการทำงานสู่สถานะ `OPEN` ทันที เพื่อป้องกันการระดมส่งคำขอไปยังปลายทางที่กำลังล่ม
3. **Retry With Exponential Backoff:**
   - การลองใหม่ถูกหน่วงเวลาแบบ Exponential Backoff (1.5x)
   - มีการกำหนดจำนวนครั้งสูงสุด (`max_retries = 3`)
4. **Timeout Enforcement:**
   - จำกัด Timeout ของ HTTP Request ไว้ที่ 30 วินาทีอย่างเคร่งครัด ป้องกัน Worker ค้าง
5. **Deduplication Pre-Write Check:**
   - คำนวณ Payload Hash ก่อนบันทึกลงฐานข้อมูล หากข้อมูลไม่มีการเปลี่ยนแปลงจะข้ามการเขียนซ้ำ เพื่อประหยัด I/O และรักษาความสะอาดของฐานข้อมูล
6. **Administrative Trigger Security:**
   - เส้นทาง `/api/v1/admin/scheduler/trigger/{source_id}` ใช้ credential ที่ยอมรับ (`X-Admin-Key` หรือ bearer) และตรวจสอบ principal/permission ที่ฝั่ง server

---

## 3. การแยกฐานข้อมูลและเครือข่ายภายใน (Database Network Isolation)

1. **ไม่เปิดพอร์ตสู่สาธารณะ:** ฐานข้อมูล PostgreSQL/PostGIS ผูกไว้เฉพาะในเครือข่ายเสมือนส่วนตัว (Internal Docker Network / VPC Subnet) ห้ามเปิดพอร์ต 5432 ออกสู่อินเทอร์เน็ตสาธารณะอย่างเด็ดขาด
2. **การบริหารจัดการ Connection Pool:**
   - `DB_POOL_SIZE = 10`: จำนวนการเชื่อมต่อพื้นฐานที่เปิดพร้อมใช้งาน
   - `DB_MAX_OVERFLOW = 20`: จำนวนการเชื่อมต่อสูงสุดที่ยอมให้ขยายได้ชั่วคราวขณะมีทราฟฟิกสูง
   - `DB_POOL_TIMEOUT = 30 วินาที`: หากไม่มี Connection ว่างภายใน 30 วินาที จะตัดการทำงานพร้อมส่งข้อความแจ้งเตือนอย่างปลอดภัย
   - `DB_STATEMENT_TIMEOUT = 10,000 มิลลิวินาที (10 วินาที)`: ตัดคำสั่ง SQL ที่ใช้เวลาประมวลผลนานผิดปกติ เพื่อป้องกันการเกิด Database Exhaustion
3. **การตรวจสอบความมีชีวิตของฐานข้อมูล:** ใช้ระบบ `pool_pre_ping=True` ตรวจสอบคำสั่ง `SELECT 1` ก่อนส่งคิวรีจริงเสมอ หากการเชื่อมต่อหลุดจะทำการต่อใหม่โดยอัตโนมัติ

---

## 4. การยืนยันตัวตนเจ้าหน้าที่ (Staff Authentication Containment)

ปัจจุบันคอนโซลเจ้าหน้าที่ใช้ principal คงที่หนึ่งรายการ: `staff_admin_01` / `admin_user` ซึ่งต้องมีอยู่และ active ในฐานข้อมูล และต้องมี role `ADMIN` เท่านั้น Credential รับผ่าน `X-Admin-Key` หรือ `Authorization: Bearer`; identity/role headers และ credential ใน query string ถูกปฏิเสธ

- ข้อมูลประจำตัวข้างต้นเป็น shared containment principal ไม่ได้ยืนยันว่าผู้ใช้เป็นบุคคลใด และไม่ใช่ระบบ SSO, MFA หรือการจัดการบัญชีหลายคน
- ข้อมูลประจำตัวหายไปหรือไม่ถูกต้องตอบ `401`; การระบุตัวตนผ่าน query/header ที่ห้ามใช้ตอบ `400`; ผู้มีตัวตนแต่ไม่มี permission ตอบ `403`
- บันทึกงานในคอนโซลใช้ ID/username จาก record ฝั่ง server (`staff_admin_01` / `admin_user`) เป็น actor
- UI ไม่ให้เลือก role หรือสวมรอย username; การโหลดข้อมูลเป็น request-driven และมีปุ่ม refresh ไม่มี query-token SSE

---

## 5. การป้องกันการเรียกใช้ API และความปลอดภัยของส่วนหัว (API Hardening)

1. **การจำกัดอัตราการเรียกใช้ (Rate Limiting):**
   - API ทั่วไป: 60 คำขอต่อนาทีต่อ IP
   - การส่งรายงานประชาชน: 10 คำขอต่อนาทีต่อ IP
   - การอัปโหลดภาพ: 5 คำขอต่อนาทีต่อ IP
2. **Security Headers:**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
   - `Content-Security-Policy: default-src 'self'`
