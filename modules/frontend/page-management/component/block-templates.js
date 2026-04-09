// ============================================================
// block-templates.js — Block Template Definitions
// ------------------------------------------------------------
// หน้าที่: กำหนด Block Types ทั้งหมดที่ใช้ใน Page Builder
// แต่ละ block มี: type, name, icon, group, default data
// ============================================================

var blockTemplates = [
  // -------- เลย์เอาต์ --------
  {
    type: "header",
    name: "เมนูด้านบน",
    desc: "โลโก้และเมนูนำทาง",
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
    icon: "layout",
    iconBg: "bg-teal",
    group: "เนื้อหา",
    defaultData: {
      title: "Hero Title",
      subtitle: "Subtitle description here",
      buttonText: "Learn More",
      bgColor: "#0a0a0a",
      textAlign: "center",
    },
  },
  {
    type: "text",
    name: "ข้อความ / ย่อหน้า",
    desc: "หัวข้อและเนื้อหาข้อความ",
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
    icon: "grid-3x3",
    iconBg: "bg-pink",
    group: "ร้านค้า",
    defaultData: {
      title: "Gallery",
      columns: 4,
    },
  },
];
