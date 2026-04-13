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
    preview: '<div style="display:flex;align-items:center;justify-content:space-between;background:#1e293b;border-radius:4px;padding:6px 10px;">'
      + '<div style="font-weight:700;color:#fff;font-size:7px;">LOGO</div>'
      + '<div style="display:flex;gap:6px;">'
      + '<span style="background:#334155;border-radius:2px;width:16px;height:4px;display:block;"></span>'
      + '<span style="background:#334155;border-radius:2px;width:16px;height:4px;display:block;"></span>'
      + '<span style="background:#334155;border-radius:2px;width:16px;height:4px;display:block;"></span>'
      + '</div></div>',
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
    preview: '<div style="background:#f1f5f9;border-radius:4px;padding:8px 10px;text-align:center;">'
      + '<div style="font-size:6px;color:#94a3b8;">&copy; 2026 Tour Long</div></div>',
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
    preview: '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">'
      + '<div style="background:#e2e8f0;border-radius:2px;height:4px;width:100%;"></div>'
      + '<div style="display:flex;align-items:center;gap:2px;"><span style="font-size:6px;color:#94a3b8;">&#8597;</span><span style="font-size:5px;color:#94a3b8;">40px</span></div>'
      + '<div style="background:#e2e8f0;border-radius:2px;height:4px;width:100%;"></div></div>',
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
    preview: '<div style="padding:10px 8px;">'
      + '<div style="border-top:2px solid #cbd5e1;width:100%;"></div></div>',
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
    preview: '<div style="background:#0a0a0a;border-radius:4px;padding:12px 10px;text-align:center;">'
      + '<div style="font-weight:700;color:#fff;font-size:8px;margin-bottom:3px;">Page Title</div>'
      + '<div style="font-size:5px;color:#a1a1aa;margin-bottom:5px;">Description here</div>'
      + '<div style="background:#ef4444;color:#fff;font-size:5px;border-radius:3px;display:inline-block;padding:2px 8px;">Learn More</div></div>',
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
    preview: '<div style="padding:6px 10px;">'
      + '<div style="font-weight:700;font-size:8px;color:#1e293b;margin-bottom:3px;">Heading</div>'
      + '<div style="background:#e2e8f0;border-radius:2px;height:3px;width:100%;margin-bottom:2px;"></div>'
      + '<div style="background:#e2e8f0;border-radius:2px;height:3px;width:80%;margin-bottom:2px;"></div>'
      + '<div style="background:#e2e8f0;border-radius:2px;height:3px;width:60%;"></div></div>',
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
    preview: '<div style="background:#f1f5f9;border-radius:4px;padding:10px;display:flex;align-items:center;justify-content:center;">'
      + '<div style="background:#cbd5e1;border-radius:4px;width:60px;height:30px;display:flex;align-items:center;justify-content:center;">'
      + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'
      + '</div></div>',
    defaultData: {
      src: "",
      alt: "",
      size: "full",
      align: "center",
      borderRadius: "10",
    },
  },
  {
    type: "imagetext",
    name: "ภาพ + เนื้อหา",
    desc: "รูปภาพคู่กับหัวข้อและเนื้อหา",
    tip: "แสดงรูปภาพคู่กับข้อความ เลือกวางตำแหน่งเนื้อหาได้ (ซ้าย/ขวา/กลาง) เหมาะสำหรับแนะนำสินค้า บริการ หรือเรื่องราว",
    icon: "image-plus",
    iconBg: "bg-blue",
    group: "เนื้อหา",
    preview: '<div style="display:flex;gap:4px;padding:4px;">'
      + '<div style="flex:1;background:#dbeafe;border-radius:3px;height:32px;display:flex;align-items:center;justify-content:center;">'
      + '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'
      + '</div>'
      + '<div style="flex:1;padding:2px;">'
      + '<div style="font-size:5px;font-weight:700;color:#1e293b;margin-bottom:2px;">Title</div>'
      + '<div style="background:#e2e8f0;border-radius:1px;height:2px;width:90%;margin-bottom:1px;"></div>'
      + '<div style="background:#e2e8f0;border-radius:1px;height:2px;width:70%;"></div>'
      + '</div></div>',
    defaultData: {
      title: "หัวข้อ",
      content: "รายละเอียดเนื้อหาที่ต้องการแสดง",
      image: "",
      layout: "image-left",
      titleColor: "#ffffff",
      contentColor: "#94a3b8",
      bgColor: "transparent",
      imgRadius: 16,
      imgHeight: 300,
    },
  },
  {
    type: "promo",
    name: "การ์ดโปรโมท",
    desc: "การ์ดโปรโมทพร้อมรูปพื้นหลังและปุ่ม CTA",
    tip: "การ์ดโปรโมท เหมาะสำหรับแสดงสินค้า/เมนู/บริการเด่น รูปเป็นพื้นหลังเต็มการ์ด มี gradient overlay ให้ข้อความอ่านง่าย",
    icon: "badge-percent",
    iconBg: "bg-amber",
    group: "เนื้อหา",
    preview: '<div style="position:relative;background:linear-gradient(135deg,#1a1a2e,#f59e0b);border-radius:4px;overflow:hidden;height:44px;">'
      + '<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.5) 50%,transparent 100%);"></div>'
      + '<div style="position:relative;padding:6px 8px;width:55%;">'
      + '<div style="font-size:4px;color:#f59e0b;letter-spacing:0.5px;font-weight:700;margin-bottom:2px;">LABEL</div>'
      + '<div style="font-size:6px;color:#fff;font-weight:800;line-height:1.1;margin-bottom:3px;">Big Title</div>'
      + '<div style="background:#f59e0b;color:#fff;font-size:4px;border-radius:2px;display:inline-block;padding:1px 5px;font-weight:700;">BTN</div>'
      + '</div></div>',
    defaultData: {
      label: "RECIPES",
      title: "Your Big Title",
      buttonText: "View More",
      buttonLink: "#",
      image: "",
      textSide: "left",
      overlayColor: "#000000",
      overlayOpacity: 0.7,
      labelColor: "#f59e0b",
      titleColor: "#ffffff",
      btnColor: "#f59e0b",
      btnFontColor: "#ffffff",
      height: 240,
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
    preview: '<div style="background:#f0fdf4;border-radius:4px;padding:10px;text-align:center;">'
      + '<div style="font-weight:700;font-size:7px;color:#166534;margin-bottom:3px;">Ready to start?</div>'
      + '<div style="font-size:5px;color:#4ade80;margin-bottom:5px;">Join us today</div>'
      + '<div style="background:#22c55e;color:#fff;font-size:5px;border-radius:3px;display:inline-block;padding:2px 8px;">Get Started</div></div>',
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
    preview: '<div style="background:#1e293b;border-radius:4px;padding:12px;display:flex;align-items:center;justify-content:center;">'
      + '<div style="width:24px;height:24px;background:rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;">'
      + '<svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
      + '</div></div>',
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
    preview: '<div style="padding:4px;">'
      + '<div style="font-size:6px;font-weight:700;color:#1e293b;margin-bottom:4px;text-align:center;">Products</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;">'
      + '<div style="background:#fed7aa;border-radius:3px;padding:4px 2px;text-align:center;"><div style="background:#fdba74;border-radius:2px;height:12px;margin-bottom:2px;"></div><div style="font-size:4px;color:#9a3412;">Item</div></div>'
      + '<div style="background:#fed7aa;border-radius:3px;padding:4px 2px;text-align:center;"><div style="background:#fdba74;border-radius:2px;height:12px;margin-bottom:2px;"></div><div style="font-size:4px;color:#9a3412;">Item</div></div>'
      + '<div style="background:#fed7aa;border-radius:3px;padding:4px 2px;text-align:center;"><div style="background:#fdba74;border-radius:2px;height:12px;margin-bottom:2px;"></div><div style="font-size:4px;color:#9a3412;">Item</div></div>'
      + '</div></div>',
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
    preview: '<div style="padding:4px;">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:3px;">'
      + '<div style="background:#fffbeb;border-radius:3px;padding:4px;text-align:center;"><div style="font-size:8px;margin-bottom:1px;">&#10024;</div><div style="font-size:4px;color:#92400e;">Quality</div></div>'
      + '<div style="background:#fffbeb;border-radius:3px;padding:4px;text-align:center;"><div style="font-size:8px;margin-bottom:1px;">&#9889;</div><div style="font-size:4px;color:#92400e;">Fast</div></div>'
      + '<div style="background:#fffbeb;border-radius:3px;padding:4px;text-align:center;"><div style="font-size:8px;margin-bottom:1px;">&#9733;</div><div style="font-size:4px;color:#92400e;">Fresh</div></div>'
      + '<div style="background:#fffbeb;border-radius:3px;padding:4px;text-align:center;"><div style="font-size:8px;margin-bottom:1px;">&#10003;</div><div style="font-size:4px;color:#92400e;">Reviews</div></div>'
      + '</div></div>',
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
    preview: '<div style="padding:4px;">'
      + '<div style="display:flex;gap:3px;">'
      + '<div style="flex:1;background:#f0fdfa;border-radius:3px;padding:4px;text-align:center;"><div style="font-size:7px;">&#9742;</div><div style="font-size:4px;color:#0f766e;">Phone</div></div>'
      + '<div style="flex:1;background:#f0fdfa;border-radius:3px;padding:4px;text-align:center;"><div style="font-size:7px;">&#128172;</div><div style="font-size:4px;color:#0f766e;">Line</div></div>'
      + '<div style="flex:1;background:#f0fdfa;border-radius:3px;padding:4px;text-align:center;"><div style="font-size:7px;">&#9993;</div><div style="font-size:4px;color:#0f766e;">Email</div></div>'
      + '</div></div>',
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
    preview: '<div style="padding:4px;">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:2px;">'
      + '<div style="background:#fce7f3;border-radius:2px;height:16px;"></div>'
      + '<div style="background:#fbcfe8;border-radius:2px;height:16px;"></div>'
      + '<div style="background:#f9a8d4;border-radius:2px;height:16px;"></div>'
      + '<div style="background:#fce7f3;border-radius:2px;height:16px;"></div>'
      + '<div style="background:#fbcfe8;border-radius:2px;height:16px;"></div>'
      + '<div style="background:#fce7f3;border-radius:2px;height:16px;"></div>'
      + '<div style="background:#fce7f3;border-radius:2px;height:16px;"></div>'
      + '<div style="background:#f9a8d4;border-radius:2px;height:16px;"></div>'
      + '</div></div>',
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
    preview: '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:3px;padding:4px;">'
      + '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:3px;overflow:hidden;"><div style="background:#e9d5ff;height:14px;"></div><div style="padding:2px;"><div style="font-size:4px;font-weight:700;color:#1e293b;">Card 1</div><div style="font-size:3px;color:#94a3b8;">Detail</div></div></div>'
      + '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:3px;overflow:hidden;"><div style="background:#d8b4fe;height:14px;"></div><div style="padding:2px;"><div style="font-size:4px;font-weight:700;color:#1e293b;">Card 2</div><div style="font-size:3px;color:#94a3b8;">Detail</div></div></div>'
      + '<div style="background:#fff;border:1px solid #e2e8f0;border-radius:3px;overflow:hidden;"><div style="background:#e9d5ff;height:14px;"></div><div style="padding:2px;"><div style="font-size:4px;font-weight:700;color:#1e293b;">Card 3</div><div style="font-size:3px;color:#94a3b8;">Detail</div></div></div>'
      + '</div>',
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
    preview: '<div style="background:#fdf2f8;border-radius:4px;padding:6px;position:relative;">'
      + '<div style="background:#fbcfe8;border-radius:3px;height:24px;display:flex;align-items:center;justify-content:center;">'
      + '<div style="font-size:5px;color:#be185d;">Slide 1</div></div>'
      + '<div style="display:flex;justify-content:center;gap:2px;margin-top:3px;">'
      + '<span style="width:4px;height:4px;border-radius:50%;background:#ec4899;display:block;"></span>'
      + '<span style="width:4px;height:4px;border-radius:50%;background:#fce7f3;display:block;"></span>'
      + '<span style="width:4px;height:4px;border-radius:50%;background:#fce7f3;display:block;"></span>'
      + '</div></div>',
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
    preview: '<div style="display:flex;gap:3px;padding:4px;">'
      + '<div style="flex:1;background:#dbeafe;border-radius:3px;padding:6px;">'
      + '<div style="background:#93c5fd;border-radius:2px;height:3px;width:80%;margin-bottom:2px;"></div>'
      + '<div style="background:#93c5fd;border-radius:2px;height:3px;width:60%;"></div></div>'
      + '<div style="flex:1;background:#dbeafe;border-radius:3px;padding:6px;">'
      + '<div style="background:#93c5fd;border-radius:2px;height:3px;width:70%;margin-bottom:2px;"></div>'
      + '<div style="background:#93c5fd;border-radius:2px;height:3px;width:90%;"></div></div>'
      + '</div>',
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
    preview: '<div style="padding:4px;">'
      + '<div style="background:#fffbeb;border-radius:4px;padding:6px;border-left:2px solid #f59e0b;">'
      + '<div style="font-size:5px;color:#78350f;font-style:italic;margin-bottom:3px;">&ldquo;สินค้าดีมาก!&rdquo;</div>'
      + '<div style="display:flex;align-items:center;gap:3px;">'
      + '<div style="width:8px;height:8px;background:#fbbf24;border-radius:50%;"></div>'
      + '<div style="font-size:4px;color:#92400e;font-weight:600;">Customer</div>'
      + '<div style="font-size:5px;color:#f59e0b;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>'
      + '</div></div></div>',
    defaultData: {
      reviews: [
        { name: "คุณสมชาย", text: "สินค้าดีมาก!", rating: 5 },
        { name: "คุณสมหญิง", text: "อร่อยมาก แนะนำเลย", rating: 5 },
        { name: "คุณวิชัย", text: "จัดส่งไว บริการดี", rating: 4 },
      ],
    },
  },
];
