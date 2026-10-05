# การแสดงผลแผนที่เชิงพื้นที่ (MAP VISUALIZATION ARCHITECTURE)

> **P0-1 current map contract:** This note supersedes contradictory claims that code-authored geometry is verified or current; historical audits remain unchanged. Public map boundary, priority surface, zones, forecast extent, and waterways return empty geometry while provenance is unverified or source access is blocked. Hand-authored district/subdistrict centroids are not rendered. Actual eligible telemetry and community observations remain separate evidence classes. P0-3 owns media delivery; P0-5 owns authentication and SSE.
**ระบบ:** แพลตฟอร์ม FloodTrace จังหวัดปราจีนบุรี  
**เครื่องมือแสดงผลหลัก:** MapLibre GL JS v6.11.2  
**รูปแบบข้อมูลเชิงพื้นที่:** GeoJSON Vector Features & Continuous Voronoi Polygons

---

## 1. เปรียบเทียบแผนที่พรีวิว (Home Map Preview) vs แผนที่เต็มรูปแบบ (Dedicated Map Page)

| คุณสมบัติ | Home Map Preview (`HomeMapPreview.tsx`) | Dedicated Full Map (`/map`) |
|---|---|---|
| **บทบาทหน้าที่** | ภาพรวมสถานการณ์เบื้องต้น (High-level Situational Preview) | เวิร์กสเปซวิเคราะห์เชิงลึก (In-depth GIS Analytical Workspace) |
| **ชั้นข้อมูลเริ่มต้น** | พื้นผิวเฝ้าระวัง 45 เซลล์, ขอบเขตจังหวัด, โครงข่ายแม่น้ำหลัก, หมุดโทรมาตรสำคัญ | ครบทุกเลเยอร์: อ่างรับน้ำ, เส้นชั้นความสูง, ทะเบียนรายงาน, ขอบเขตตำบล |
| **การควบคุมเลเยอร์** | Minimal (สลับมุมมอง จ.ปราจีนบุรี, ป้ายระดับความสำคัญลอย) | เมนูจัดการเปิด-ปิดเลเยอร์อิสระ (Layer Control Drawer/Panel) |
| **พฤติกรรมการคลิก** | แสดงการ์ดสรุปย่อของเซลล์ + ปุ่มเปิดแผนที่เต็มรูปแบบ | แสดงหน้าต่างข้อมูลรายละเอียดเชิงลึก (Deep Inspection Modal) |
| **ความสูงของแผนที่** | ความสูงคงที่ (620px) จัดวางในหน้าแรกอย่างลงตัว | เต็มหน้าจอเบราว์เซอร์ (Full Viewport Height: `h-screen`) |

---

## 2. ลำดับชั้นการเรนเดอร์ (Layer Stacking Order)

การเรนเดอร์แผนที่ใน MapLibre ได้รับการจัดเรียงจากล่างขึ้นบนเพื่อความชัดเจนและความต่อเนื่องของข้อมูล:

```
[Layer 7] หมุดตรวจวัดเชิงความหมาย (Semantic Circular Markers: โทรมาตรน้ำ, ฝน, รายงาน)
   ▲
[Layer 6] ป้ายชื่อภูมิศาสตร์ (Geographic Labels with Halos: อำเภอ, ตำบล, ลำน้ำสำคัญ)
   ▲
[Layer 5] โครงข่ายลำน้ำ (Major Waterways: แม่น้ำปราจีนบุรี, แม่น้ำบางปะกง, แควหนุมาน)
   ▲
[Layer 4] เส้นขอบเซลล์เฝ้าระวัง (Voronoi Cell Thin Borders: Stroke width 1.2px)
   ▲
[Layer 3] พื้นผิวเฝ้าระวังต่อเนื่อง (45 Voronoi Polygons with Monitoring Priority Colors)
   ▲
[Layer 2] เส้นขอบจังหวัดปราจีนบุรีเรืองแสง (Cyan Glow MultiPolygon Boundary)
   ▲
[Layer 1] หน้ากากภายนอกจังหวัดสีเทา (Exterior Dark Neutral Mask: fill-opacity 0.65)
   ▲
[Layer 0] ภาพถ่ายดาวเทียมฐาน (Esri World Imagery Basemap)
```

---

## 3. พื้นผิวเฝ้าระวังแบบต่อเนื่อง (Continuous Voronoi Spatial Surface)

เพื่อหลีกเลี่ยงปัญหา "กล่องสี่เหลี่ยมตัดขาด" (Arbitrary Hard-edged Boxes) และ "วงกลมซ้อนทับกัน" (Overlapping Circles):
- ระบบแบ่งพื้นที่ทั้ง 7 อำเภอของปราจีนบุรีออกเป็น **45 เซลล์ย่อย (Voronoi Polygons)** โดยอ้างอิงจากตำแหน่งทางภูมิศาสตร์ของ 45 ตำบลจริง (`AUTHENTIC_TAMBONS`)
- เซลล์แต่ละเซลล์เชื่อมต่อแนบสนิทกันแบบไร้รอยต่อ (Continuous Surface)
- มีการตัดขอบ (Clip) ให้ตรงกับรูปทรงเรขาคณิตของเขตจังหวัดปราจีนบุรีอย่างแม่นยำ
- สีของแต่ละเซลล์สะท้อน **ระดับความสำคัญในการเฝ้าระวังและตรวจสอบ (Monitoring Priority):**
  - **VERY_HIGH (แดงสดใส):** มีข้อบ่งชี้หลายมิติที่ต้องเร่งตรวจวัด
  - **HIGH (ส้มสดใส):** มีข้อสังเกตหรือระดับน้ำล้นตลิ่งที่ควรเฝ้าระวัง
  - **MODERATE (เหลืองอำพัน):** พื้นที่เสี่ยงปานกลางหรือปลายน้ำหลาก
  - **LOW (เขียวมรกต):** สภาพปกติ คุณภาพน้ำอยู่ในเกณฑ์
  - **NO_DATA (เทาโปร่งแสง):** ยังไม่มีข้อมูลตรวจวัดเพียงพอ

---

## 4. ป้ายกำกับภูมิศาสตร์และการหลีกเลี่ยงการชนกัน (Labels & Collision Avoidance)

- แสดงชื่ออำเภอและตำบลอย่างคมชัดด้วย `text-halo-color` (สีขาวหรือดำตามโหมด) และ `text-halo-width: 2px`
- ซ่อนและแสดงผลตามระดับการซูม (Zoom-dependent visibility):
  - **Zoom 6–8:** แสดงเฉพาะชื่อจังหวัด
  - **Zoom 9–11:** แสดงชื่ออำเภอ 7 อำเภอ
  - **Zoom 12–13:** แสดงชื่อตำบลและลำน้ำสายหลัก
  - **Zoom 14+:** แสดงชื่อหมู่บ้านและจุดสังเกตการณ์สำคัญ
- ตั้งค่า `text-allow-overlap: false` และ `text-ignore-placement: false` เพื่อป้องกันป้ายชื่อทับซ้อนกัน

---

## 5. การเพิ่มประสิทธิภาพการทำงาน (Performance Optimizations)

1. **Vector GeoJSON Source:** รวมคุณสมบัติลงใน GeoJSON แหล่งเดียว เพื่อลดภาระการส่งข้อมูลและการรีเฟรช DOM
2. **WebGL Context Retention:** ควบคุมวงจรชีวิตของแผนที่ MapLibre อย่างรัดกุม ป้องกันการเกิด Memory Leak หรือ Multiple Canvas Contexts
3. **Responsive Viewport:** แผนที่จะปรับระดับการซูม (FitBounds) ไปยังเขตจังหวัดปราจีนบุรีโดยอัตโนมัติทั้งบนหน้าจอ Desktop และ Mobile
