// ============================================================
// block-templates.js — Block Template Definitions
// ------------------------------------------------------------
// หน้าที่: กำหนด Block Types ทั้งหมดที่ใช้ใน Page Builder
// แต่ละ block มี: type, name, icon, group, tip, default data
// ============================================================

var blockTemplates = [
  // -------- เลย์เอาต์ --------
  {
    type: "header",
    name: "เมนูด้านบน",
    desc: "โลโก้และเมนูนำทาง",
    tip: "ใส่ไว้บนสุดของทุกหน้า เพื่อแสดงโลโก้และเมนูนำทาง สามารถ upload โลโก้ และตั้งชื่อเมนูได้สูงสุด 10 รายการ",
    icon: "navigation",
    iconBg: "bg-slate",
    group: "เลย์เอาต์",
    defaultData: {
      logoText: "TOUR LONG",
      navItems: ["Home", "Products", "About", "Contact"],
    },
  },
  {
    type: "footer",
    name: "ส่วนท้าย",
    desc: "ข้อความลิขสิทธิ์ด้านล่าง",
    tip: "ใส่ไว้ล่างสุดของทุกหน้า แสดงข้อความลิขสิทธิ์หรือข้อมูลบริษัท",
    icon: "panel-bottom",
    iconBg: "bg-slate",
    group: "เลย์เอาต์",
    defaultData: {
      text: "© 2026 Tour Long. All rights reserved.",
    },
  },
  {
    type: "spacer",
    name: "ช่องว่าง",
    desc: "เว้นระยะห่างระหว่างบล็อก",
    tip: "ใช้เว้นระยะห่างระหว่าง block ตั้งค่าความสูงได้ตามต้องการ (หน่วย px)",
    icon: "space",
    iconBg: "bg-slate",
    group: "เลย์เอาต์",
    defaultData: {
      height: 40,
    },
  },
  {
    type: "divider",
    name: "เส้นคั่น",
    desc: "เส้นแบ่งแนวนอน",
    tip: "เส้นแบ่งส่วนเนื้อหา เลือกได้ทั้งเส้นทึบ เส้นประ หรือเส้นจุด พร้อมเปลี่ยนสีได้",
    icon: "minus",
    iconBg: "bg-slate",
    group: "เลย์เอาต์",
    defaultData: {
      style: "solid",
      color: "#e2e8f0",
    },
  },

  // -------- เนื้อหา --------
  {
    type: "hero",
    name: "แบนเนอร์หลัก",
    desc: "แบนเนอร์ขนาดใหญ่พร้อมปุ่ม CTA",
    tip: "บล็อกแบนเนอร์ขนาดใหญ่ เหมาะสำหรับหน้าแรก ใส่หัวข้อ คำอธิบาย ปุ่มกด และเปลี่ยนสีพื้นหลังได้",
    icon: "layout",
    iconBg: "bg-teal",
    group: "เนื้อหา",
    defaultData: {
      title: "Hero Title",
      subtitle: "Subtitle description here",
      buttonText: "Learn More",
      buttonLink: "#",
      bgColor: "#0a0a0a",
      textAlign: "center",
    },
  },
  {
    type: "text",
    name: "ข้อความ / ย่อหน้า",
    desc: "หัวข้อและเนื้อหาข้อความ",
    tip: "บล็อกข้อความทั่วไป ใส่หัวข้อและเนื้อหาย่อหน้า เลือกขนาดหัวข้อ (เล็ก/กลาง/ใหญ่) และจัดตำแหน่งได้",
    icon: "type",
    iconBg: "bg-blue",
    group: "เนื้อหา",
    defaultData: {
      heading: "Section Heading",
      content: "Your text content goes here. Edit this in the settings panel.",
      headingSize: "medium",
      textAlign: "left",
    },
  },
  {
    type: "image",
    name: "รูปภาพ",
    desc: "รูปภาพเดี่ยวพร้อมตั้งค่า",
    tip: "แสดงรูปภาพเดี่ยว ใส่ URL รูปภาพ เลือกขนาด (เล็ก/กลาง/เต็ม) และจัดตำแหน่งได้",
    icon: "image",
    iconBg: "bg-purple",
    group: "เนื้อหา",
    defaultData: {
      src: "",
      alt: "",
      size: "full",
      align: "center",
      borderRadius: "10",
    },
  },
  {
    type: "cta",
    name: "ปุ่มกระตุ้น",
    desc: "บล็อกกระตุ้นการคลิกพร้อมปุ่ม",
    tip: "บล็อก Call to Action — ใส่หัวข้อ คำอธิบาย และปุ่มกดที่ลิงก์ไปหน้าที่ต้องการ เหมาะวางท้ายเนื้อหา",
    icon: "mouse-pointer-click",
    iconBg: "bg-green",
    group: "เนื้อหา",
    defaultData: {
      heading: "Ready to get started?",
      description: "Join us today and experience the difference.",
      buttonText: "Get Started",
      buttonLink: "#",
    },
  },
  {
    type: "video",
    name: "วิดีโอ",
    desc: "ฝังวิดีโอลงหน้าเว็บ",
    tip: "ฝังวิดีโอจาก YouTube หรือ URL อื่น ลงในหน้าเว็บ",
    icon: "play-circle",
    iconBg: "bg-red",
    group: "เนื้อหา",
    defaultData: {
      url: "",
      title: "Video Title",
    },
  },

  // -------- ร้านค้า --------
  {
    type: "products",
    name: "ตารางสินค้า",
    desc: "แสดงสินค้าเป็นกริด",
    tip: "แสดงรายการสินค้าเป็นกริด เลือกจำนวนคอลัมน์ (2-4) และจำนวนสินค้าสูงสุดที่แสดง",
    icon: "shopping-bag",
    iconBg: "bg-orange",
    group: "ร้านค้า",
    defaultData: {
      title: "Our Products",
      columns: 3,
      limit: 6,
    },
  },
  {
    type: "features",
    name: "จุดเด่น",
    desc: "ไฮไลท์จุดเด่นพร้อมไอคอน",
    tip: "แสดงจุดเด่น 4 ข้อพร้อมไอคอน เช่น ไม่ใส่ผงชูรส, จัดส่งไว เหมาะสร้างความน่าเชื่อถือ",
    icon: "sparkles",
    iconBg: "bg-amber",
    group: "ร้านค้า",
    defaultData: {
      title: "Why Choose Us",
      items: ["Quality", "Fresh", "Fast Delivery", "5-Star Reviews"],
    },
  },
  {
    type: "contact",
    name: "ข้อมูลติดต่อ",
    desc: "โทรศัพท์, Line, อีเมล",
    tip: "แสดงข้อมูลติดต่อ 3 ช่อง: เบอร์โทร, Line ID, อีเมล ในรูปแบบการ์ด",
    icon: "phone",
    iconBg: "bg-teal",
    group: "ร้านค้า",
    defaultData: {
      title: "Contact Us",
      phone: "081-234-5678",
      line: "@tourlong",
      email: "info@tourlong.com",
    },
  },
  {
    type: "gallery",
    name: "แกลเลอรี",
    desc: "แสดงรูปภาพหลายรูปเป็นกริด",
    tip: "แสดงรูปภาพหลายรูปเป็นตารางกริด เลือกจำนวนคอลัมน์ได้ 2-4",
    icon: "grid-3x3",
    iconBg: "bg-pink",
    group: "ร้านค้า",
    defaultData: {
      title: "Gallery",
      columns: 4,
    },
  },

  // -------- ขั้นสูง --------
  {
    type: "cards",
    name: "การ์ดกริด",
    desc: "การ์ด 2-4 คอลัมน์ พร้อมรูป + ข้อความ",
    tip: "แสดงการ์ดหลายใบเป็นกริด แต่ละใบมีรูปภาพ ชื่อ คำอธิบาย และปุ่มลิงก์ เพิ่มการ์ดได้ไม่จำกัด",
    icon: "layout-grid",
    iconBg: "bg-purple",
    group: "ขั้นสูง",
    defaultData: {
      columns: 3,
      cards: [
        { title: "Card 1", desc: "รายละเอียด", image: "", link: "#" },
        { title: "Card 2", desc: "รายละเอียด", image: "", link: "#" },
        { title: "Card 3", desc: "รายละเอียด", image: "", link: "#" },
      ],
    },
  },
  {
    type: "carousel",
    name: "ภาพสไลด์",
    desc: "ภาพเลื่อนอัตโนมัติ (Carousel)",
    tip: "แสดงภาพสไลด์เลื่อนอัตโนมัติ เพิ่มรูปได้หลายรูป ตั้งเวลาเลื่อนและเปิด/ปิด auto-play",
    icon: "gallery-horizontal-end",
    iconBg: "bg-pink",
    group: "ขั้นสูง",
    defaultData: {
      slides: [
        { image: "", caption: "Slide 1" },
        { image: "", caption: "Slide 2" },
        { image: "", caption: "Slide 3" },
      ],
      autoPlay: true,
      interval: 3,
    },
  },
  {
    type: "twocol",
    name: "2 คอลัมน์",
    desc: "แบ่งซ้าย-ขวา ใส่เนื้อหาแยก",
    tip: "แบ่งเนื้อหาเป็น 2 คอลัมน์ซ้าย-ขวา เลือกสัดส่วนได้ เช่น 50/50, 60/40, 70/30",
    icon: "columns-2",
    iconBg: "bg-blue",
    group: "ขั้นสูง",
    defaultData: {
      ratio: "50-50",
      leftTitle: "ด้านซ้าย",
      leftContent: "เนื้อหาด้านซ้าย",
      rightTitle: "ด้านขวา",
      rightContent: "เนื้อหาด้านขวา",
    },
  },
  {
    type: "testimonial",
    name: "รีวิวลูกค้า",
    desc: "ข้อความรีวิวจากลูกค้า",
    tip: "แสดงรีวิวจากลูกค้าเป็นการ์ด พร้อมชื่อ ข้อความรีวิว และ rating ดาว เพิ่มรีวิวได้ไม่จำกัด",
    icon: "message-square-quote",
    iconBg: "bg-amber",
    group: "ขั้นสูง",
    defaultData: {
      reviews: [
        { name: "คุณสมชาย", text: "สินค้าดีมาก!", rating: 5 },
        { name: "คุณสมหญิง", text: "อร่อยมาก แนะนำเลย", rating: 5 },
        { name: "คุณวิชัย", text: "จัดส่งไว บริการดี", rating: 4 },
      ],
    },
  },
];
