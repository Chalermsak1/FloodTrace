# คู่มือการใช้งานคอนโซลปฏิบัติการเจ้าหน้าที่ (Staff Operations Console Manual)

> **Current staff-console contract:** Staff health uses source, metrics, and scheduler responses; missing or malformed data is `UNKNOWN`, and stopped scheduling is `INACTIVE`. Verification inputs normalize blanks to null; status changes require matching evidence. The console uses the existing active `staff_admin_01` / `admin_user` `ADMIN` database record and accepts `X-Admin-Key` or bearer credentials. This is a shared containment principal, not per-person identity assurance. Console updates are request-driven with explicit refresh; it does not use query-token SSE.
**ระบบ:** FloodTrace Internal Operations  
**URL เข้าถึง:** `/admin/reports`  
**สถานะ:** Staff operations console with fixed-principal containment

---

## 1. ภาพรวมของคอนโซลเจ้าหน้าที่ (Console Overview)

FloodTrace Staff Operations Console ได้รับการออกแบบตามหลักการ **Calm, High-Clarity, Low-Clutter Operational Design** เพื่อให้เจ้าหน้าที่สามารถจัดการและคัดกรองรายงานจากประชาชนได้อย่างรวดเร็ว แม่นยำ และปลอดภัย

### โครงสร้างหน้าจอ 3 ส่วนเชื่อมโยงกัน (Synchronized 3-Pane Interface):
1. **คิวงานรายงาน (Left Pane - 4 Columns):**
   - ตารางรายการรายงานพร้อมตัวกรองสถานะ ความเร่งด่วน อำเภอ และคำค้นหา
   - การแบ่งหน้าแบบประมวลผลฝั่งเซิร์ฟเวอร์ (Server-Side Pagination)
   - ป้ายกำกับระดับความเร่งด่วน: `URGENT` (แดงกระพริบ), `HIGH` (ส้ม), `NORMAL` (ฟ้า), `LOW` (เทา)
   - ป้ายกำกับสถานะการดำเนินงาน 10 ระดับ
2. **แผนที่ปฏิบัติการ GIS (Center Pane - 4 Columns):**
   - แผนที่ภาพถ่ายดาวเทียมความละเอียดสูง (Esri World Imagery)
   - แสดงตำแหน่งหมุดรายงานประชาชนพร้อมสีจำแนกตามสถานะและความเร่งด่วน
   - ขอบเขตพื้นที่วิเคราะห์หลักจังหวัดปราจีนบุรี (Prachin Buri Active Bounding Scope)
   - ตำแหน่งสถานีตรวจวัดระดับน้ำและสถานีวัดน้ำฝนโทรมาตร
   - การคลิกหมุดบนแผนที่จะเปิดรายละเอียดรายงานในหน้าต่างขวาโดยอัตโนมัติ
3. **พื้นที่ตรวจสอบและวินิจฉัย (Right Pane - 4 Columns):**
   - หัวข้อสรุปสถานะ รหัสรายงาน และปุ่มปฏิบัติการหลัก (Action Bar)
   - ส่วนพับเก็บได้ 8 ส่วน (Collapsible Accordions):
     1. ข้อความดั้งเดิมจากประชาชน (Preserved Submission)
     2. พิกัดและขอบเขตพื้นที่ตรวจสอบ (Exact GPS & Public Generalized)
     3. หลักฐานที่ได้รับ (sanitized private media ผ่าน report-bound staff endpoint; ต้องมี `view_reports`; การเปิดดูถูกบันทึก audit)
     4. ข้อมูลระบบประกอบการตรวจสอบ (System Context Telemetry)
     5. บันทึกการพิสูจน์ข้อเท็จจริง (Structured 6-Dimension Verification)
     6. การส่งต่อหน่วยงานภายนอก (Escalation Records)
     7. การยุติเรื่องและข้อสรุป (Resolution Summary)
     8. ประวัติการปฏิบัติงาน (Immutable Audit Trail)

---

## 2. การอัปเดตข้อมูล

คอนโซลโหลดข้อมูลตามคำขอ และเจ้าหน้าที่กดปุ่มรีเฟรชเพื่อโหลดคิว สรุป และรายละเอียดปัจจุบันอีกครั้ง ไม่มีการอ้างว่าหน้าจออัปเดตต่อเนื่องแบบเรียลไทม์

เส้นทาง `/api/v1/admin/events` ไม่รับ credential ผ่าน query string; เบราว์เซอร์ `EventSource` ของคอนโซลไม่ได้เชื่อมต่อเส้นทางนี้

---

## 3. ตัวชี้วัดการดำเนินงาน (Operational Metrics)

คอนโซลแสดงการ์ดสรุปตัวชี้วัด 6 หมวด:
- **รายงานใหม่:** รายงานที่รอการคัดกรองเบื้องต้น
- **กำลังคัดกรอง / มอบหมาย:** รายงานที่อยู่ระหว่างมอบหมายให้เจ้าหน้าที่
- **อยู่ระหว่างตรวจสอบ:** เจ้าหน้าที่กำลังตรวจสอบพยานหลักฐานและโทรมาตร
- **ส่งต่อหน่วยงาน:** เรื่องที่ประสานงานออกสู่หน่วยงานภายนอก
- **ยืนยันข้อสังเกตแล้ว:** ข้อสังเกตที่มีพยานหลักฐานประจักษ์ชัดเจน
- **ค้างดำเนินการ (Unresolved):** จำนวนงานค้างพร้อมระบุจำนวนเรื่องด่วนที่สุด และอายุของรายงานที่ค้างนานที่สุด

*หมายเหตุ: ตัวชี้วัดทั้งหมดสะท้อนการดำเนินงานทางธุรการ มิใช่คะแนนความเสี่ยงทางวิทยาศาสตร์สิ่งแวดล้อม*
