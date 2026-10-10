import React, { useState } from 'react';
import { 
  Droplets, 
  ShieldCheck, 
  HelpCircle, 
  AlertTriangle, 
  HeartHandshake, 
  Eye, 
  ChevronRight, 
  PhoneCall,
  CheckCircle2,
  FileText,
  BookOpen
} from 'lucide-react';
import { 
  Badge, 
  Button, 
  Modal,
  PageHeader
} from '../components/ui';

interface TopicItem {
  id: string;
  title: string;
  shortDesc: string;
  icon: React.ElementType;
  badge: string;
  content: {
    summary: string;
    points: string[];
    dos: string[];
    donts: string[];
  };
}

const TOPICS: TopicItem[] = [
  {
    id: 'what-is-contamination',
    title: 'สารปนเปื้อนในสิ่งแวดล้อมคืออะไร',
    shortDesc: 'ทำความเข้าใจความหมายของการปนเปื้อนในดิน น้ำ และอากาศรอบตัวเราอย่างถูกต้อง',
    icon: Droplets,
    badge: 'ความรู้พื้นฐาน',
    content: {
      summary: 'สารปนเปื้อนในสิ่งแวดล้อมหมายถึงสารเคมี วัตถุอันตราย หรือของเสียที่ปะปนอยู่ในแหล่งน้ำ ดิน หรืออากาศเกินกว่าเกณฑ์มาตรฐานธรรมชาติ ซึ่งอาจเกิดขึ้นจากกิจกรรมอุตสาหกรรม เกษตรกรรม หรือการกำจัดของเสียที่ไม่ถูกวิธี',
      points: [
        'สารปนเปื้อนแบ่งเป็นกลุ่มสารอินทรีย์ระเหยง่าย (VOCs), โลหะหนัก (เช่น สารหนู ตะกั่ว แคดเมียม), และสารละลายกรด-ด่าง',
        'การไหลของน้ำในช่วงน้ำท่วมหรือน้ำหลากอาจชะล้างหรือกระจายสารปนเปื้อนไปยังพื้นที่รอบข้างได้',
        'การประเมินการปนเปื้อนที่แท้จริงต้องอาศัยผลตรวจทางห้องปฏิบัติการที่ได้รับการรับรองเท่านั้น'
      ],
      dos: [
        'สังเกตความผิดปกติทางกายภาพเบื้องต้น เช่น สี กลิ่น ตะกอน',
        'ใช้น้ำประปาหรือน้ำดื่มบรรจุขวดที่ผ่านการฆ่าเชื้อ'
      ],
      donts: [
        'อย่าด่วนสรุปเองว่าแหล่งน้ำใดมีสารพิษแน่นอนโดยไม่มีผลตรวจวิเคราะห์',
        'อย่าสัมผัสหรือลงเล่นน้ำที่มีลักษณะผิดปกติเด็ดขาด'
      ]
    }
  },
  {
    id: 'post-flood',
    title: 'ข้อควรระวังหลังน้ำลด',
    shortDesc: 'วิธีตรวจเช็คบ้านเรือน แหล่งน้ำ และความปลอดภัยหลังจากน้ำท่วมขังเริ่มลดลง',
    icon: ShieldCheck,
    badge: 'การฟื้นฟู',
    content: {
      summary: 'ช่วงเวลาน้ำลดเป็นช่วงที่มีความเสี่ยงด้านสุขอนามัยและการสะสมของตะกอนตกค้างในดินและบ่อน้ำชุมชน ประชาชนควรฟื้นฟูพื้นที่อย่างระมัดระวัง',
      points: [
        'ตะกอนดินโคลนที่มากับน้ำอาจมีสารแขวนลอยหรือสิ่งปฏิกูลสะสมอยู่',
        'บ่อน้ำตื้นและน้ำบาดาลอาจถูกน้ำผิวดินปนเปื้อนไหลเข้า ต้องล้างบ่อและตรวจคุณภาพก่อนใช้',
        'พืชผักและผลไม้ที่ถูกน้ำท่วมขังควรล้างทำความสะอาดอย่างหมดจดหรือหลีกเลี่ยงการบริโภคสด'
      ],
      dos: [
        'สวมรองเท้าบูทและถุงมือยางทุกครั้งขณะทำความสะอาดคราบโคลน',
        'ระบายอากาศในบ้านเรือนให้ถ่ายเทสะดวกก่อนเข้าไปอยู่อาศัย'
      ],
      donts: [
        'อย่าใช้น้ำในบ่อน้ำตื้นที่เพิ่งถูกน้ำท่วมโดยยังไม่ได้ใส่คลอรีนฆ่าเชื้อ',
        'อย่าปล่อยให้เด็กวิ่งเล่นในพื้นที่ที่มีคราบโคลนตกค้าง'
      ]
    }
  },
  {
    id: 'water-usage',
    title: 'การใช้น้ำในพื้นที่เฝ้าระวัง',
    shortDesc: 'แนวทางการใช้น้ำเพื่อการอุปโภค บริโภค และการเกษตรในพื้นที่ที่ควรระวังเป็นพิเศษ',
    icon: Droplets,
    badge: 'แนวทางปฏิบัติ',
    content: {
      summary: 'ในพื้นที่ที่อยู่ในแนวเฝ้าระวังทางอุทกวิทยา ควรปรับเปลี่ยนพฤติกรรมการใช้น้ำเพื่อลดความเสี่ยงต่อสุขภาพของคนในครอบครัว',
      points: [
        'น้ำบริโภค (ดื่มและประกอบอาหาร): ควรใช้น้ำประปามาตรฐาน น้ำต้มสุก หรือน้ำดื่มบรรจุขวดเท่านั้น',
        'น้ำอุปโภค (อาบ ซักล้าง): หากน้ำมีกลิ่นฉุน แสบจมูก หรือเกิดผื่นคันหลังสัมผัส ให้หยุดใช้ทันที',
        'น้ำเพื่อการเกษตรและการประมง: ตรวจสอบประกาศแจ้งเตือนคุณภาพน้ำจาก สคพ.7 หรือกรมควบคุมมลพิษเป็นระยะ'
      ],
      dos: [
        'สำรองน้ำดื่มสะอาดไว้อย่างน้อย 3-5 วัน',
        'รายงานหน่วยงานทันทีหากพบว่าน้ำประปาหมู่บ้านมีความผิดปกติ'
      ],
      donts: [
        'อย่าสูบน้ำจากคลองที่อยู่ใกล้เขตเฝ้าระวังมาใช้รดพืชผักสวนครัวโดยตรง',
        'อย่าใช้น้ำบาดาลในพื้นที่ที่มีการแจ้งเตือนโดยไม่ผ่านการกรองตรวจ'
      ]
    }
  },
  {
    id: 'how-to-observe',
    title: 'วิธีสังเกตความผิดปกติของแหล่งน้ำ',
    shortDesc: 'จุดสังเกต 4 ด้าน: สี กลิ่น คราบผิวน้ำ และสิ่งมีชีวิต ที่ประชาชนช่วยรายงานได้',
    icon: Eye,
    badge: 'ข้อสังเกตชุมชน',
    content: {
      summary: 'สายตาและประสาทสัมผัสของคนในชุมชนคือแนวป้องกันแรก การสังเกตและส่งรายงานผ่าน FloodTrace ช่วยให้หน่วยงานสุ่มเก็บตัวอย่างได้ตรงจุด',
      points: [
        'สีน้ำ: น้ำมีสีเข้มผิดปกติ เช่น สีดำคล้ำ สีส้มสนิม หรือสีขุ่นเข้มผิดธรรมชาติ',
        'กลิ่น: ได้กลิ่นฉุนคล้ายสารเคมี กลิ่นน้ำมัน หรือกลิ่นเหม็นเน่ารุนแรง',
        'ฟองและคราบ: พบคราบน้ำมันสะท้อนแสงสีรุ้ง หรือฟองขาวหนาลอยท่วมผิวน้ำต่อเนื่อง',
        'สิ่งแวดล้อม: พบปลาหรือสัตว์น้ำลอยหัว หรือตายเป็นจำนวนมากผิดปกติ'
      ],
      dos: [
        'ถ่ายภาพนิ่งหรือวิดีโอจากระยะปลอดภัยเพื่อใช้ประกอบการรายงาน',
        'ระบุจุดสังเกต เช่น ชื่อคลอง วัด หรือสะพานใกล้เคียง'
      ],
      donts: [
        'อย่าก้มดมกลิ่นใกล้ผิวน้ำมากเกินไป เพราะไอระเหยอาจเป็นอันตรายต่อระบบทางเดินหายใจ',
        'อย่าลงไปเก็บตัวอย่างสารเคมีด้วยตนเองโดยไม่มีอุปกรณ์ป้องกัน'
      ]
    }
  },
  {
    id: 'vulnerable-groups',
    title: 'การดูแลเด็ก ผู้สูงอายุ และสัตว์เลี้ยง',
    shortDesc: 'กลุ่มเปราะบางต้องการการดูแลเป็นพิเศษจากมลพิษและสิ่งปนเปื้อนในน้ำ',
    icon: HeartHandshake,
    badge: 'สุขอนามัยครอบครัว',
    content: {
      summary: 'เด็กและผู้สูงอายุมีผิวหนังบอบบางและระบบภูมิคุ้มกันที่ไวต่อสารเคมีมากกว่าผู้ใหญ่ การดูแลป้องกันจึงต้องเคร่งครัดเป็นพิเศษ',
      points: [
        'เด็กเล็กมักเผลอนำมือที่สัมผัสน้ำหรือดินเข้าปาก ต้องหมั่นล้างมือด้วยสบู่สะอาด',
        'ผู้ป่วยโรคผิวหนังหรือโรคทางเดินหายใจควรหลีกเลี่ยงการอยู่ในบริเวณที่ได้กลิ่นสารเคมีฉุน',
        'สัตว์เลี้ยงและปศุสัตว์ควรได้รับน้ำดื่มสะอาดเช่นเดียวกับคนเพื่อป้องกันการติดเชื้อหรือสารพิษตกค้าง'
      ],
      dos: [
        'พาไปพบแพทย์ทันทีหากมีอาการผื่นคันรุนแรง แสบตา หรือคลื่นไส้หลังสัมผัสน้ำ',
        'จัดพื้นที่พักอาศัยของสัตว์เลี้ยงให้พ้นจากบริเวณที่มีน้ำขังผิดปกติ'
      ],
      donts: [
        'อย่าปล่อยให้สัตว์เลี้ยงดื่มน้ำจากแอ่งน้ำขังริมทาง',
        'อย่าใช้ยาปฏิชีวนะหรือยาทาแก้แพ้โดยไม่ปรึกษาเภสัชกรหรือแพทย์'
      ]
    }
  },
  {
    id: 'faq',
    title: 'คำถามที่พบบ่อย (FAQ)',
    shortDesc: 'รวมข้อสงสัยทั่วไปเกี่ยวกับระดับสีเฝ้าระวัง การรายงาน และการใช้งานระบบ FloodTrace',
    icon: HelpCircle,
    badge: 'ถาม-ตอบ',
    content: {
      summary: 'คำถามที่ประชาชนสอบถามบ่อยที่สุดเกี่ยวกับแพลตฟอร์ม FloodTrace และการแปลความหมายข้อมูล',
      points: [
        'ถาม: แถบสีแดงบนแผนที่แปลว่ามีสารพิษแน่นอนแล้วใช่หรือไม่? -> ตอบ: ไม่ใช่ สีแดงหมายถึง "พื้นที่เฝ้าระวังสูง" ที่มีปัจจัยเชื่อมโยงทางน้ำและมีข้อสังเกตที่ควรได้รับการตรวจสอบก่อน ไม่ใช่ผลยืนยันการปนเปื้อน',
        'ถาม: ทำไมสีเขียวถึงไม่ใช้คำว่า "ปลอดภัย"? -> ตอบ: สภาพแวดล้อมทางน้ำเปลี่ยนแปลงรวดเร็ว จึงใช้คำว่า "ระดับเฝ้าระวังต่ำ" เพื่อสะท้อนข้อเท็จจริงตามหลักวิชาการ',
        'ถาม: รายงานที่ประชาชนส่งเข้ามา จะเปิดเผยพิกัดบ้านหรือเบอร์โทรหรือไม่? -> ตอบ: ระบบปกป้องความเป็นส่วนตัวขั้นสูงสุด ไม่เปิดเผยชื่อ เบอร์โทร หรือพิกัดละเอียดสู่สาธารณะ'
      ],
      dos: [
        'ตรวจเช็คสถานะพื้นที่ตนเองสม่ำเสมอในเมนู "พื้นที่ของฉัน"',
        'โทรแจ้งสายด่วนกรมควบคุมมลพิษ 1650 หากเป็นเหตุฉุกเฉินเร่งด่วน'
      ],
      donts: [
        'อย่าแชร์ข้อมูลต่อโดยไม่ตรวจสอบที่มาเพื่อหลีกเลี่ยงการตื่นตระหนกในชุมชน'
      ]
    }
  }
];

export const KnowledgePage: React.FC = () => {
  const [selectedTopic, setSelectedTopic] = useState<TopicItem | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      
      {/* Page Header */}
      <PageHeader
        title="ความรู้และคำแนะนำ"
        subtitle="คู่มือการดูแลสุขภาพตนเองและครอบครัว การสังเกตสภาวะแวดล้อม และแนวทางปฏิบัติตนอย่างปลอดภัยในพื้นที่เฝ้าระวัง"
        icon={<BookOpen className="w-5 h-5 text-blue-600" />}
        badge={
          <Badge variant="neutral" size="sm">
            ศูนย์ข้อมูลความรู้และสุขอนามัยชุมชน
          </Badge>
        }
        actions={
          <a
            href="tel:1650"
            className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors min-h-[40px]"
          >
            <PhoneCall className="w-4 h-4" />
            <span>สายด่วนมลพิษ 1650</span>
          </a>
        }
      />

      {/* 6 Large Educational Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {TOPICS.map((topic) => {
          const Icon = topic.icon;
          return (
            <div
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs hover:shadow-card hover:border-[#0284C7]/60 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#0284C7] group-hover:bg-[#0284C7] group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                    <Icon className="w-6 h-6" />
                  </div>
                  <Badge variant="neutral" size="sm">
                    {topic.badge}
                  </Badge>
                </div>

                <h2 className="text-lg font-bold text-[#0A2540] group-hover:text-[#0284C7] transition-colors leading-snug">
                  {topic.title}
                </h2>
                
                <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed line-clamp-3">
                  {topic.shortDesc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm font-semibold text-[#0284C7]">
                <span>อ่านคำแนะนำฉบับเต็ม</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Modal using UI Modal */}
      {selectedTopic && (
        <Modal
          isOpen={!!selectedTopic}
          onClose={() => setSelectedTopic(null)}
          title={selectedTopic.title}
          subtitle={selectedTopic.content.summary}
          badge={<Badge variant="unmonitored">{selectedTopic.badge}</Badge>}
          footer={
            <Button
              variant="primary"
              size="md"
              onClick={() => setSelectedTopic(null)}
            >
              ปิดหน้าต่าง
            </Button>
          }
        >
          <div className="space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div>
              <h4 className="font-bold text-sm sm:text-base text-slate-900 mb-2">ประเด็นสำคัญที่ควรรู้:</h4>
              <ul className="space-y-2">
                {selectedTopic.content.points.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-[#0284C7] font-bold shrink-0">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            {selectedTopic.content.dos.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                  <div className="font-bold text-emerald-900 mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>สิ่งที่ควรปฏิบัติ</span>
                  </div>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-emerald-950">
                    {selectedTopic.content.dos.map((d, idx) => (
                      <li key={idx}>✓ {d}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200">
                  <div className="font-bold text-rose-900 mb-1.5 flex items-center gap-1.5 text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>สิ่งที่ไม่ควรทำ</span>
                  </div>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-rose-950">
                    {selectedTopic.content.donts.map((d, idx) => (
                      <li key={idx}>✗ {d}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

    </div>
  );
};
