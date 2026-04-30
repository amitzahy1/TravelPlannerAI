const f=t=>t?t.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):"",Q=["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"],B=["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"],V=["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"],R=t=>{if(!t)return"";if(/^\d{1,2}:\d{2}$/.test(t))return t;if(t.includes("T"))return t.split("T")[1].substring(0,5);try{const a=new Date(t);return isNaN(a.getTime())?t:a.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit",hour12:!1})}catch{return t}},k=t=>{try{return(typeof t=="string"?new Date(t):t).toISOString().split("T")[0]}catch{return""}},P=(t,a)=>{const s=new Date(t);return s.setDate(s.getDate()+a),s},q=(t,a)=>{try{return Math.max(0,Math.ceil((new Date(a).getTime()-new Date(t).getTime())/864e5))}catch{return 0}},A=t=>`${t.getDate()} ${V[t.getMonth()]}`,X=t=>{var x,y,O,C,S,L,w,I;const a=[],s=e=>e&&!isNaN(new Date(e).getTime())&&a.push(new Date(e).getTime());if((y=(x=t.flights)==null?void 0:x.segments)==null||y.forEach(e=>s(e.date)),(O=t.hotels)==null||O.forEach(e=>{s(e.checkInDate),s(e.checkOutDate)}),(C=t.itinerary)==null||C.forEach(e=>s(e.date)),t.dates&&a.length===0&&t.dates.split(/[-–]/).forEach(e=>s(e.trim())),a.length===0)return[];const n=new Date(Math.min(...a));n.setHours(12,0,0,0);const r=new Date(Math.max(...a));r.setHours(12,0,0,0);const p={},b=Math.round((r.getTime()-n.getTime())/864e5)+1;for(let e=0;e<b;e++){const d=P(n,e),c=k(d);p[c]={date:d,iso:c,dayNum:d.getDate(),month:B[d.getMonth()],dow:Q[d.getDay()],events:[]}}const l=(e,d)=>{p[e]&&p[e].events.push(d)};return(L=(S=t.flights)==null?void 0:S.segments)==null||L.forEach((e,d)=>{var m;const c=k(e.date);l(c,{id:`f-${d}-d`,type:"flight_dep",time:R(e.departureTime)||"—",title:`טיסה ל-${e.toCity||e.toCode}`,subtitle:`${e.airline||""} ${e.flightNumber||""}`.trim(),icon:"✈️",flightData:e});let h=c;const v=R(e.departureTime),u=R(e.arrivalTime);if((m=e.arrivalTime)!=null&&m.includes("T"))h=k(e.arrivalTime);else if(v&&u&&u<v){const M=new Date(e.date);M.setDate(M.getDate()+1),h=k(M)}l(h,{id:`f-${d}-a`,type:"flight_arr",time:u||"—",title:`נחיתה ב-${e.toCity||e.toCode}`,subtitle:e.duration?`${e.duration}`:"",icon:"🛬",flightData:e})}),(w=t.hotels)==null||w.forEach((e,d)=>{const c=k(e.checkInDate),h=k(e.checkOutDate),v=q(e.checkInDate,e.checkOutDate);l(c,{id:`h-${d}-i`,type:"hotel_in",time:"15:00",title:"צ׳ק-אין",subtitle:e.name,icon:"🏨",hotelData:e,nightsCount:v}),l(h,{id:`h-${d}-o`,type:"hotel_out",time:"11:00",title:"צ׳ק-אאוט",subtitle:e.name,icon:"👋",hotelData:e})}),(I=t.itinerary)==null||I.forEach((e,d)=>{var h;const c=k(e.date);p[c]&&(e.title&&e.title!=="טיול חופשי"&&e.title!=="יום טיסה"&&(p[c].title=e.title),(h=e.activities)==null||h.forEach((v,u)=>{const m=v.match(/^(\d{1,2}:\d{2})(?:-\d{1,2}:\d{2})?\s*(.*)/),M=m?m[1]:"",i=m?m[2]:v,o=/הסעה|נסיעה|טרנספר|transfer|מונית|taxi/i.test(i),g=i.match(/\((.*?)\)$/),D=g?i.replace(/\s*\(.*?\)$/,"").trim():i,z=g?g[1]:"";l(c,{id:`a-${d}-${u}`,type:o?"transfer":"activity",time:M,title:D,subtitle:z,icon:o?"🚕":"📍"})}),e.notes&&l(c,{id:`n-${d}`,type:"activity",time:"",title:"הערה",details:e.notes,icon:"📝"}))}),Object.values(p).forEach(e=>{var h;const d=k(e.date),c=(h=t.hotels)==null?void 0:h.find(v=>d>k(v.checkInDate)&&d<k(v.checkOutDate));c&&(e.events.length===0&&(e.title=`נופש ב-${c.name}`),e.events.unshift({id:`s-${d}`,type:"hotel_stay",time:"",title:c.name,subtitle:"יום חופשי במלון",icon:"🛏️",hotelData:c}))}),Object.values(p).sort((e,d)=>e.date.getTime()-d.date.getTime()).map((e,d,c)=>{var h,v;if(e.events.sort((u,m)=>!u.time&&!m.time?0:u.time?m.time?u.time.localeCompare(m.time):-1:1),!e.title){const u=e.events.find(m=>m.type==="flight_dep");u?e.title=`טיסה ל-${((h=u.flightData)==null?void 0:h.toCity)||((v=u.flightData)==null?void 0:v.toCode)||""}`:e.events.length===0?e.title="יום חופשי":e.title=d===0?"יום ראשון":d===c.length-1?"יום אחרון":"יום פעילות"}return e})},ee=t=>{const a=t.time?`<span class="evt-t">${t.time}</span>`:'<span class="evt-t evt-t-empty"></span>';let s=`evt evt-${t.type}`,n=`<span class="evt-i">${t.icon}</span><span class="evt-x"><span class="evt-title">${f(t.title)}</span>`;return t.subtitle&&(n+=`<span class="evt-sub">${f(t.subtitle)}</span>`),t.details&&(n+=`<span class="evt-sub">${f(t.details)}</span>`),n+="</span>",`<div class="${s}">${a}${n}</div>`},te=(t,a,s)=>{const n=a===0,r=a===s-1,p=n?"first":r?"last":"",b=t.events.length===0?'<div class="empty">☀️ יום פנוי</div>':t.events.map(ee).join("");return`
    <article class="day-card ${p}">
      <header class="day-head">
        <div class="day-num">
          <span class="dn">${t.dayNum}</span>
          <span class="dm">${V[t.date.getMonth()]}</span>
        </div>
        <div class="day-info">
          <span class="day-dow">יום ${t.dow}</span>
          <span class="day-title">${f(t.title||"")}</span>
        </div>
        <span class="day-idx">${a+1}/${s}</span>
      </header>
      <div class="day-events">${b}</div>
    </article>
  `},ae=t=>{var n;const a=((n=t.flights)==null?void 0:n.segments)||[];if(a.length===0)return"";const s=a.map(r=>{const p=R(r.departureTime),b=R(r.arrivalTime);return`
      <div class="ov-flight">
        <div class="ovf-top">
          <span class="ovf-date">${r.date?A(new Date(r.date)):""}</span>
          <span class="ovf-num">${f(r.flightNumber||"")}</span>
        </div>
        <div class="ovf-route">
          <div class="ovf-side">
            <div class="ovf-code">${f(r.fromCode||"")}</div>
            <div class="ovf-time">${p}</div>
          </div>
          <div class="ovf-arrow">
            <div class="ovf-airline">${f(r.airline||"")}</div>
            <div class="ovf-line">✈</div>
            ${r.duration?`<div class="ovf-dur">${f(r.duration)}</div>`:""}
          </div>
          <div class="ovf-side">
            <div class="ovf-code">${f(r.toCode||"")}</div>
            <div class="ovf-time">${b}</div>
          </div>
        </div>
      </div>
    `}).join("");return`
    <section class="overview">
      <h2 class="ov-title">✈️ טיסות <span class="ov-count">${a.length}</span></h2>
      <div class="ov-flights-grid">${s}</div>
    </section>
  `},ie=t=>{const a=t.hotels||[];if(a.length===0)return"";const s=a.map(n=>{var x;const r=q(n.checkInDate,n.checkOutDate),p=n.checkInDate?A(new Date(n.checkInDate)):"",b=n.checkOutDate?A(new Date(n.checkOutDate)):"",l=((x=n.rooms)==null?void 0:x.length)||0;return`
      <div class="ov-hotel">
        <div class="ovh-name">${f(n.name)}</div>
        ${n.address?`<div class="ovh-addr">📍 ${f(n.address)}</div>`:""}
        <div class="ovh-meta">
          <span class="ovh-dates">${p} → ${b}</span>
          ${r>0?`<span class="ovh-nights">${r} לילות</span>`:""}
          ${l>0?`<span class="ovh-rooms">${l} חדרים</span>`:""}
        </div>
      </div>
    `}).join("");return`
    <section class="overview">
      <h2 class="ov-title">🏨 מלונות <span class="ov-count">${a.length}</span></h2>
      <div class="ov-hotels-grid">${s}</div>
    </section>
  `},oe=`
:root {
  --font: 'Rubik', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --bg: #f7f9fc;
  --card: #ffffff;
  --text: #0f172a;
  --muted: #64748b;
  --primary: #2563eb;
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --green: #10b981;
  --green-50: #ecfdf5;
  --amber: #f59e0b;
  --amber-50: #fffbeb;
  --rose: #ef4444;
  --line: #e2e8f0;
  --line-2: #f1f5f9;
  --shadow-sm: 0 1px 2px rgba(15,23,42,0.05);
  --shadow-md: 0 4px 12px rgba(15,23,42,0.08);
  --radius: 14px;
  --radius-sm: 10px;
  --radius-xs: 6px;
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  direction: rtl;
  -webkit-font-smoothing: antialiased;
  font-size: 14px;
  line-height: 1.4;
}
.page {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 16px clamp(12px, 2vw, 28px) 40px;
}

/* ═══ HERO (compact) ═══ */
.hero {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  min-height: 160px;
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: flex-end;
  color: white;
  margin-bottom: 18px;
  box-shadow: var(--shadow-md);
}
.hero::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(15,23,42,0) 0%, rgba(15,23,42,0.85) 100%);
}
.hero-c {
  position: relative; z-index: 2;
  padding: 18px 22px;
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.hero h1 {
  margin: 0;
  font-size: clamp(22px, 2.6vw, 34px);
  font-weight: 800;
  letter-spacing: -0.5px;
  line-height: 1.1;
}
.hero-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; font-size: 13px; opacity: 0.95; }
.hero-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  background: rgba(255,255,255,0.18);
  border: 1px solid rgba(255,255,255,0.25);
  backdrop-filter: blur(6px);
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

/* ═══ STATS BAR ═══ */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 18px;
}
.stat {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 10px 14px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}
.stat-v { font-size: 22px; font-weight: 800; color: var(--primary); line-height: 1; }
.stat-l { font-size: 11px; color: var(--muted); margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; }

/* ═══ OVERVIEW SECTIONS ═══ */
.overview { margin-bottom: 16px; }
.ov-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 700;
  color: var(--muted);
  display: flex;
  align-items: center;
  gap: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.ov-count {
  background: var(--primary-100);
  color: var(--primary);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}
.ov-flights-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 8px;
}
.ov-flight {
  background: linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%);
  color: white;
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
}
.ovf-top {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; opacity: 0.85; margin-bottom: 6px;
  border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 6px;
}
.ovf-num { font-family: 'Courier New', monospace; font-weight: 700; direction: ltr; }
.ovf-route { display: flex; align-items: center; gap: 6px; }
.ovf-side { text-align: center; min-width: 50px; direction: ltr; }
.ovf-code { font-size: 18px; font-weight: 800; font-family: 'Courier New', monospace; line-height: 1; }
.ovf-time { font-size: 12px; font-weight: 600; margin-top: 4px; opacity: 0.9; font-family: 'Courier New', monospace; }
.ovf-arrow { flex: 1; text-align: center; }
.ovf-airline { font-size: 9px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.5px; direction: ltr; }
.ovf-line { font-size: 14px; opacity: 0.6; margin: 2px 0; }
.ovf-dur { font-size: 9px; opacity: 0.6; direction: ltr; }

.ov-hotels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px;
}
.ov-hotel {
  background: var(--card);
  border: 1px solid var(--line);
  border-right: 3px solid var(--green);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  box-shadow: var(--shadow-sm);
}
.ovh-name { font-size: 14px; font-weight: 800; line-height: 1.25; }
.ovh-addr { font-size: 11px; color: var(--muted); margin-top: 3px; line-height: 1.3; }
.ovh-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.ovh-dates {
  font-size: 11px; font-weight: 600; color: var(--text);
  background: var(--line-2); padding: 3px 8px; border-radius: 6px; direction: ltr;
}
.ovh-nights {
  font-size: 11px; font-weight: 700; color: #065f46;
  background: var(--green-50); padding: 3px 8px; border-radius: 6px;
}
.ovh-rooms {
  font-size: 11px; font-weight: 700; color: #6b21a8;
  background: #faf5ff; padding: 3px 8px; border-radius: 6px;
}

/* ═══ DAYS GRID ═══ */
.days-section { margin-top: 8px; }
.days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
  align-items: start;
}
.day-card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}
.day-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(135deg, var(--primary-50), #ffffff);
  border-bottom: 1px solid var(--line-2);
}
.day-card.first .day-head { background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; }
.day-card.last .day-head { background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; }
.day-card.first .day-dow,
.day-card.last .day-dow { color: rgba(255,255,255,0.85); }
.day-card.first .day-idx,
.day-card.last .day-idx { background: rgba(255,255,255,0.25); color: white; }

.day-num {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 4px 8px;
  text-align: center;
  min-width: 44px;
  line-height: 1;
}
.day-num .dn { display: block; font-size: 18px; font-weight: 800; color: var(--primary); }
.day-num .dm { display: block; font-size: 10px; font-weight: 600; color: var(--muted); margin-top: 2px; }
.day-card.first .day-num .dn,
.day-card.last .day-num .dn { color: var(--primary); }
.day-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.day-dow { font-size: 10px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.4px; }
.day-title { font-size: 14px; font-weight: 700; line-height: 1.2; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.day-idx {
  font-size: 10px; font-weight: 700; color: var(--muted);
  background: var(--line-2); padding: 3px 7px; border-radius: 999px;
}

.day-events {
  display: flex;
  flex-direction: column;
  padding: 8px 10px 10px;
  gap: 4px;
}

/* ═══ EVENT ROWS (compact) ═══ */
.evt {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--radius-xs);
  font-size: 12.5px;
  line-height: 1.3;
  border: 1px solid transparent;
}
.evt:hover { background: var(--line-2); }
.evt-t {
  font-family: 'Courier New', monospace;
  font-weight: 700;
  font-size: 11px;
  color: var(--muted);
  min-width: 38px;
  text-align: left;
  direction: ltr;
  padding-top: 1px;
  flex-shrink: 0;
}
.evt-t-empty { min-width: 38px; }
.evt-i { font-size: 14px; flex-shrink: 0; line-height: 1; padding-top: 1px; }
.evt-x { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.evt-title { font-weight: 600; color: var(--text); overflow: hidden; text-overflow: ellipsis; }
.evt-sub { font-size: 11px; color: var(--muted); margin-top: 1px; }

/* Type-specific accents */
.evt-flight_dep, .evt-flight_arr {
  background: #eff6ff; border-color: #bfdbfe;
}
.evt-flight_dep .evt-title, .evt-flight_arr .evt-title { color: #1e40af; font-weight: 700; }
.evt-hotel_in {
  background: var(--green-50); border-color: #a7f3d0;
}
.evt-hotel_in .evt-title { color: #065f46; font-weight: 700; }
.evt-hotel_out {
  background: var(--amber-50); border-color: #fde68a;
}
.evt-hotel_out .evt-title { color: #92400e; font-weight: 700; }
.evt-hotel_stay {
  background: linear-gradient(135deg, #ecfdf5, #f0fdf4);
  border-color: #bbf7d0;
}
.evt-hotel_stay .evt-title { color: #14532d; font-weight: 700; }
.evt-transfer {
  background: #fffbeb; border-color: #fde68a;
}
.evt-transfer .evt-title { color: #78350f; font-weight: 700; }

.empty {
  text-align: center; padding: 14px 8px;
  color: var(--muted); font-size: 12px; font-weight: 600;
  background: var(--line-2); border-radius: var(--radius-xs);
}

/* ═══ FOOTER ═══ */
.footer {
  text-align: center;
  padding: 24px 16px 8px;
  color: #94a3b8;
  font-size: 11px;
}
.footer-logo { font-weight: 700; color: #64748b; margin-bottom: 2px; }

/* ═══ PRINT ═══ */
@media print {
  body { background: white; font-size: 11px; }
  .page { padding: 8px 12px; max-width: none; }
  .hero { min-height: 100px; box-shadow: none; }
  .day-card, .ov-flight, .ov-hotel, .stat { break-inside: avoid; box-shadow: none; }
  .days-grid { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 6px; }
}

/* ═══ MOBILE ═══ */
@media (max-width: 640px) {
  body { font-size: 13px; }
  .page { padding: 10px 10px 30px; }
  .hero { min-height: 130px; border-radius: 14px; }
  .hero-c { padding: 14px 14px; }
  .stats { grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .stat { padding: 8px 6px; }
  .stat-v { font-size: 18px; }
  .stat-l { font-size: 10px; }
  .days-grid { grid-template-columns: 1fr; gap: 8px; }
  .ov-flights-grid, .ov-hotels-grid { grid-template-columns: 1fr; }
}
@media (min-width: 1100px) {
  .days-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
}
@media (min-width: 1400px) {
  .days-grid { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
}

/* ═══ CALENDAR SECTION (Google-Calendar-style monthly grid) ═══ */
.calendar-section { margin-top: 24px; padding: 18px 14px 22px; background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 1px 3px rgba(15,23,42,0.04); }
.calendar-section .ov-title { margin-bottom: 14px; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; direction: rtl; }
.cal-header { background: linear-gradient(180deg, #f8fafc, #f1f5f9); padding: 8px 4px; text-align: center; font-weight: 800; font-size: 11px; color: #475569; border-radius: 6px; letter-spacing: 0.02em; }
.cal-header.cal-header-sat, .cal-header.cal-header-fri { color: #dc2626; }
.cal-cell { background: #fff; border: 1px solid #e2e8f0; min-height: 110px; padding: 4px 5px 5px; display: flex; flex-direction: column; gap: 2px; border-radius: 5px; overflow: hidden; }
.cal-cell.cal-padding { background: #f8fafc; opacity: 0.6; }
.cal-cell.cal-today { border-color: #2563eb; box-shadow: 0 0 0 1px #2563eb inset; }
.cal-num { font-weight: 800; font-size: 13px; color: #0f172a; text-align: left; line-height: 1.1; padding: 1px 2px; }
.cal-num.cal-num-fri, .cal-num.cal-num-sat { color: #dc2626; }
.cal-padding .cal-num { color: #94a3b8; font-weight: 600; }
/* Wrap to multiple lines so the full label is visible — no more "...ttaya". */
.cal-chip { display: block; padding: 3px 6px; font-size: 10px; line-height: 1.3; border-radius: 4px; white-space: normal; overflow-wrap: break-word; word-break: break-word; font-weight: 700; max-width: 100%; text-align: right; }
.cal-chip-flight { background: #fce7f3; color: #9d174d; }
.cal-chip-hotel { background: #ccfbf1; color: #115e59; }
.cal-chip-activity { background: #ede9fe; color: #5b21b6; }
.cal-chip-food { background: #ffedd5; color: #9a3412; }
.cal-chip-transfer { background: #fef3c7; color: #92400e; }
/* Run chips (consecutive same-event days) — visually connect by losing
     border-radius on the joining edges, keeping color continuous. */
.cal-chip-run-mid { border-radius: 0; padding-top: 1px; padding-bottom: 1px; opacity: 0.92; }
.cal-chip-run-start { border-bottom-right-radius: 0; border-top-right-radius: 4px; border-bottom-left-radius: 0; }
.cal-chip-run-end { border-top-right-radius: 0; border-top-left-radius: 0; padding-top: 1px; opacity: 0.92; }
.cal-chip-run-cont { font-size: 10px; font-weight: 600; opacity: 0.85; }
.cal-more { font-size: 9px; color: #64748b; font-weight: 700; padding-right: 3px; }
.cal-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 14px; padding: 10px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; }
.cal-legend-title { font-size: 10px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; padding-left: 4px; }
.cal-legend-chip { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 999px; white-space: nowrap; }
@media (max-width: 640px) {
  .calendar-section { padding: 14px 8px 16px; }
  .cal-cell { min-height: 68px; padding: 3px 3px 4px; }
  .cal-chip { font-size: 8.5px; padding: 1px 3px; border-radius: 3px; }
  .cal-num { font-size: 11px; }
  .cal-header { font-size: 9.5px; padding: 6px 2px; }
  .cal-more { font-size: 8px; }
}
@media print {
  .calendar-section { break-inside: avoid; page-break-inside: avoid; }
  .cal-cell { break-inside: avoid; }
}

/* ═══ PREMIUM PDF OVERRIDES ═══ */
@page {
  size: A4;
  margin: 10mm;
}
:root {
  --ink: #101828;
  --soft-ink: #344054;
  --paper: #f3f6fb;
  --mist: #eef4ff;
  --panel: #ffffff;
  --stroke: #d8e1ee;
  --brand: #155eef;
  --brand-dark: #0b2f6b;
  --cyan: #06aed4;
  --mint: #12b76a;
  --sun: #f79009;
}
body {
  background:
    radial-gradient(circle at top right, rgba(21, 94, 239, .14), transparent 30vw),
    linear-gradient(180deg, #f8fbff 0%, var(--paper) 100%);
  color: var(--ink);
  font-size: 13px;
}
.page {
  max-width: 1180px;
  padding: 22px;
}
.hero {
  min-height: 360px;
  border-radius: 22px;
  margin-bottom: 18px;
  box-shadow: 0 24px 70px rgba(16, 24, 40, .18);
}
.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(115deg, rgba(9, 22, 52, .92) 0%, rgba(9, 22, 52, .72) 42%, rgba(9, 22, 52, .22) 100%),
    radial-gradient(circle at 18% 18%, rgba(6, 174, 212, .42), transparent 32%);
  z-index: 1;
}
.hero::after {
  background: linear-gradient(180deg, transparent, rgba(9, 22, 52, .72));
  z-index: 1;
}
.hero-c {
  min-height: 360px;
  align-items: stretch;
  flex-direction: column;
  justify-content: space-between;
  padding: 34px;
}
.hero-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  width: 100%;
}
.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.16);
  border: 1px solid rgba(255,255,255,.22);
  color: rgba(255,255,255,.94);
  font-size: 12px;
  font-weight: 800;
}
.doc-label {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.92);
  color: var(--brand-dark);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.hero-main {
  max-width: 760px;
}
.hero-kicker {
  margin-bottom: 10px;
  color: rgba(255,255,255,.78);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}
.hero h1 {
  font-size: clamp(38px, 5.5vw, 72px);
  letter-spacing: 0;
  line-height: .98;
  max-width: 780px;
  text-wrap: balance;
}
.hero-meta {
  margin-top: 16px;
  font-size: 17px;
  font-weight: 700;
}
.hero-dates {
  margin-top: 8px;
  color: rgba(255,255,255,.86);
  font-size: 14px;
  font-weight: 700;
}
.hero-chips {
  gap: 8px;
}
.chip {
  background: rgba(255,255,255,.94);
  color: var(--brand-dark);
  border: 0;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  padding: 8px 13px;
}
.stats {
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin: -44px 22px 22px;
  position: relative;
  z-index: 4;
}
.stat {
  border: 1px solid rgba(216, 225, 238, .9);
  border-radius: 16px;
  padding: 16px 12px;
  box-shadow: 0 14px 40px rgba(16, 24, 40, .12);
}
.stat-v {
  color: var(--brand);
  font-size: 30px;
}
.stat-l {
  color: var(--soft-ink);
  letter-spacing: .05em;
}
.overview,
.calendar-section,
.days-section {
  margin-top: 18px;
}
.overview,
.calendar-section {
  padding: 18px;
  background: rgba(255,255,255,.92);
  border: 1px solid var(--stroke);
  border-radius: 18px;
  box-shadow: 0 10px 28px rgba(16, 24, 40, .06);
}
.ov-title {
  margin-bottom: 14px;
  color: var(--ink);
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: none;
}
.ov-count {
  background: var(--mist);
}
.ov-flights-grid,
.ov-hotels-grid {
  gap: 12px;
}
.ov-flight {
  background:
    radial-gradient(circle at top left, rgba(6, 174, 212, .45), transparent 42%),
    linear-gradient(135deg, #0b2f6b 0%, #155eef 100%);
  border-radius: 16px;
  padding: 15px;
}
.ovf-top {
  margin-bottom: 12px;
}
.ovf-code {
  font-size: 26px;
}
.ovf-time {
  font-size: 14px;
}
.ovf-line {
  font-size: 20px;
}
.ov-hotel {
  border: 1px solid var(--stroke);
  border-right: 5px solid var(--mint);
  border-radius: 16px;
  padding: 16px;
}
.ovh-name {
  font-size: 17px;
}
.ovh-addr {
  font-size: 12px;
}
.calendar-section {
  margin-top: 18px;
}
.calendar-grid {
  gap: 5px;
}
.cal-header {
  border-radius: 10px;
  padding: 10px 4px;
}
.cal-cell {
  min-height: 118px;
  border-radius: 10px;
  padding: 7px;
  background: #fbfdff;
}
.cal-cell.cal-padding {
  background: #f5f8fc;
}
.cal-chip {
  border-radius: 8px;
  padding: 4px 7px;
}
.days-section {
  padding: 18px;
  background: rgba(255,255,255,.7);
  border: 1px solid var(--stroke);
  border-radius: 18px;
}
.days-grid {
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.day-card {
  border-radius: 18px;
  border: 1px solid var(--stroke);
  box-shadow: 0 10px 28px rgba(16, 24, 40, .06);
}
.day-head {
  padding: 14px;
  background: linear-gradient(135deg, #f7fbff, #eef4ff);
}
.day-num {
  border-radius: 14px;
  min-width: 52px;
  padding: 7px 9px;
}
.day-num .dn {
  font-size: 22px;
}
.day-title {
  font-size: 16px;
  white-space: normal;
}
.day-events {
  padding: 12px;
  gap: 7px;
}
.evt {
  border-radius: 12px;
  padding: 9px 10px;
  font-size: 13px;
}
.evt-t {
  min-width: 42px;
}
.evt-i {
  font-size: 16px;
}
.evt-title {
  white-space: normal;
}
.footer {
  margin-top: 20px;
  border-top: 1px solid var(--stroke);
}
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    background:
      radial-gradient(circle at top right, rgba(21, 94, 239, .14), transparent 30vw),
      linear-gradient(180deg, #f8fbff 0%, var(--paper) 100%);
    font-size: 13px;
  }
  .page {
    max-width: 1180px;
    padding: 22px;
  }
  .hero {
    min-height: 360px;
    border-radius: 22px;
    margin: 0 0 18px;
    box-shadow: none;
  }
  .hero-c {
    min-height: 360px;
    padding: 34px;
  }
  .hero h1 {
    font-size: 56px;
  }
  .hero-meta {
    font-size: 17px;
  }
  .stats {
    margin: -44px 22px 22px;
    gap: 10px;
  }
  .stat {
    padding: 16px 12px;
    box-shadow: none;
  }
  .stat-v {
    font-size: 30px;
  }
  .overview,
  .calendar-section,
  .days-section {
    border-radius: 18px;
    padding: 18px;
    box-shadow: none;
  }
  .ov-title {
    font-size: 18px;
  }
  .cal-cell {
    min-height: 118px;
    padding: 7px;
  }
  .cal-chip {
    font-size: 10px;
    padding: 4px 7px;
    border-radius: 8px;
  }
  .days-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 14px;
  }
  .day-card {
    border-radius: 18px;
    box-shadow: none;
  }
  .day-head {
    padding: 14px;
  }
  .day-title {
    font-size: 16px;
  }
  .day-events {
    padding: 12px;
    gap: 7px;
  }
  .evt {
    padding: 9px 10px;
    font-size: 13px;
  }
  .footer {
    padding-top: 24px;
  }
  .day-card,
  .ov-flight,
  .ov-hotel,
  .stat,
  .calendar-section {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`,re=["יום א׳","יום ב׳","יום ג׳","יום ד׳","יום ה׳","יום ו׳","שבת"],W=[{bg:"#ccfbf1",fg:"#115e59"},{bg:"#fce7f3",fg:"#9d174d"},{bg:"#fef3c7",fg:"#854d0e"},{bg:"#dbeafe",fg:"#1e40af"},{bg:"#ede9fe",fg:"#5b21b6"},{bg:"#fed7aa",fg:"#9a3412"},{bg:"#dcfce7",fg:"#166534"},{bg:"#fee2e2",fg:"#991b1b"}],K=[{bg:"#e0f2fe",fg:"#0c4a6e"},{bg:"#f3e8ff",fg:"#581c87"},{bg:"#ffedd5",fg:"#7c2d12"},{bg:"#dcfce7",fg:"#14532d"},{bg:"#fef9c3",fg:"#713f12"},{bg:"#cffafe",fg:"#155e75"},{bg:"#fae8ff",fg:"#701a75"}],ne=(t,a)=>{var m,M;if(a.length===0)return"";const s=new Date(a[0].date);s.setHours(12,0,0,0);const n=new Date(a[a.length-1].date);n.setHours(12,0,0,0);const r=k(new Date),p=P(s,-1),b=P(n,1),l=new Date(p);l.setDate(l.getDate()-l.getDay());const x=new Date(b);x.setDate(x.getDate()+(6-x.getDay()));const y={};let O=0;(t.hotels||[]).forEach(i=>{const o=(i.name||"").trim().toLowerCase();!o||y[o]||(y[o]=W[O%W.length],O++)});const C={};let S=0;const L=i=>{const o=(i||"").trim().toLowerCase();!o||C[o]||(C[o]=K[S%K.length],S++)};(M=(m=t.flights)==null?void 0:m.segments)==null||M.forEach(i=>{i.toCity&&L(i.toCity)}),(t.hotels||[]).forEach(i=>{i.city&&L(i.city)});const w={};a.forEach(i=>{w[i.iso]||(w[i.iso]=[]),i.events.forEach(o=>{var _,j,F,Y,$;let g="activity";o.type==="flight_dep"||o.type==="flight_arr"?g="flight":o.type==="hotel_in"||o.type==="hotel_out"||o.type==="hotel_stay"?g="hotel":o.type==="food"?g="food":o.type==="transfer"&&(g="transfer");const D=o.title;let z,E=`${g}::${D}`,N,H;if(g==="hotel"){const T=(((_=o.hotelData)==null?void 0:_.name)||"").trim().toLowerCase();T&&y[T]&&(z=y[T]),E=`hotel::${T}`,N=((j=o.hotelData)==null?void 0:j.city)||"",H=((F=o.hotelData)==null?void 0:F.name)||""}else if(g==="flight"){const T=(((Y=o.flightData)==null?void 0:Y.toCity)||(($=o.flightData)==null?void 0:$.fromCity)||"").trim().toLowerCase();T&&C[T]&&(z=C[T]),E=`flight::${T}`}w[i.iso].push({kind:g,label:D,runKey:E,color:z,hotelCity:N,hotelName:H})})});const I={},e=Math.round((x.getTime()-l.getTime())/864e5)+1,d=[];for(let i=0;i<e;i++)d.push(k(P(l,i)));for(let i=0;i<d.length;i++){const o=d[i],g=w[o]||[];I[o]=g.map(D=>{const z=i>0?w[d[i-1]]:void 0,E=i<d.length-1?w[d[i+1]]:void 0,N=!!(z!=null&&z.some(j=>j.runKey===D.runKey)),H=!!(E!=null&&E.some(j=>j.runKey===D.runKey));let _="single";return N&&H?_="mid":H?_="start":N&&(_="end"),{...D,runPos:_}})}const c=[];for(let i=0;i<e;i++){const o=P(l,i),g=k(o),D=o>=s&&o<=n,z=o.getDay(),E=I[g]||[],N=E.slice(0,4),H=E.length-N.length,_=N.map($=>{const T=$.color?` style="background:${$.color.bg};color:${$.color.fg}"`:"",U=$.runPos==="single"?"":` cal-chip-run-${$.runPos}`,G=$.runPos==="mid"||$.runPos==="end",Z=f($.label),J=G?" cal-chip-run-cont":"";return`<span class="cal-chip cal-chip-${$.kind}${U}${J}"${T} title="${f($.label)}">${Z}</span>`}).join(""),j=H>0?`<span class="cal-more">+${H} נוסף</span>`:"",F=`cal-num${z===5?" cal-num-fri":""}${z===6?" cal-num-sat":""}`,Y=`cal-cell${D?"":" cal-padding"}${g===r?" cal-today":""}`;c.push(`<div class="${Y}"><span class="${F}">${o.getDate()}</span>${_}${j}</div>`)}const h=re.map((i,o)=>`<div class="${`cal-header${o===5?" cal-header-fri":""}${o===6?" cal-header-sat":""}`}">${i}</div>`).join(""),v=s.getMonth()===n.getMonth()&&s.getFullYear()===n.getFullYear()?`${B[s.getMonth()]} ${s.getFullYear()}`:`${B[s.getMonth()]}–${B[n.getMonth()]} ${n.getFullYear()}`,u=Object.keys(y).length>0?`<div class="cal-legend">
        <span class="cal-legend-title">מלונות</span>
        ${(t.hotels||[]).filter((i,o,g)=>g.findIndex(D=>(D.name||"").toLowerCase()===(i.name||"").toLowerCase())===o).map(i=>{const o=y[(i.name||"").toLowerCase()];return o?`<span class="cal-legend-chip" style="background:${o.bg};color:${o.fg}">${f(i.name||"")}</span>`:""}).join("")}
      </div>`:"";return`<section class="calendar-section">
    <h2 class="ov-title">📅 לוח הטיול — ${f(v)}</h2>
    <div class="calendar-grid">${h}${c.join("")}</div>
    ${u}
  </section>`},se=t=>{var O,C,S,L;const a=X(t),s=t.coverImage||"https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80",n=new Date().toLocaleDateString("he-IL"),r=((C=(O=t.flights)==null?void 0:O.segments)==null?void 0:C.length)||0,p=((S=t.hotels)==null?void 0:S.length)||0,b=((L=t.itinerary)==null?void 0:L.reduce((w,I)=>{var e;return w+(((e=I.activities)==null?void 0:e.length)||0)},0))||0,l=a.length,x=t.dates||(a.length?`${A(a[0].date)} - ${A(a[a.length-1].date)}`:""),y=a.map((w,I)=>te(w,I,a.length)).join("");return`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${f(t.name)} — סיכום מסע</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${oe}</style>
</head>
<body>
<div class="page">

  <header class="hero" style="background-image:url('${s}')">
    <div class="hero-c">
      <div class="hero-topline">
        <div class="brand-mark">✈ Travel Planner Pro</div>
        <div class="doc-label">Trip PDF</div>
      </div>
      <div class="hero-main">
        <div class="hero-kicker">מסמך מסע אישי</div>
        <h1>${f(t.name)}</h1>
        <div class="hero-meta">📍 ${f(t.destination||"")}</div>
        ${x?`<div class="hero-dates">📅 ${f(x)}</div>`:""}
      </div>
      <div class="hero-chips">
        ${l>0?`<span class="chip">📅 ${l} ימים</span>`:""}
        ${r>0?`<span class="chip">✈️ ${r} טיסות</span>`:""}
        ${p>0?`<span class="chip">🏨 ${p} מלונות</span>`:""}
      </div>
    </div>
  </header>

  <div class="stats">
    <div class="stat"><div class="stat-v">${l}</div><div class="stat-l">ימים</div></div>
    <div class="stat"><div class="stat-v">${r}</div><div class="stat-l">טיסות</div></div>
    <div class="stat"><div class="stat-v">${p}</div><div class="stat-l">מלונות</div></div>
    <div class="stat"><div class="stat-v">${b}</div><div class="stat-l">פעילויות</div></div>
  </div>

  ${ae(t)}
  ${ie(t)}
  ${ne(t,a)}

  <section class="days-section">
    <h2 class="ov-title">📆 יום-יום <span class="ov-count">${l}</span></h2>
    <div class="days-grid">${y}</div>
  </section>

  <div class="footer">
    <div class="footer-logo">✈ Travel Planner Pro</div>
    נוצר ב-${n}
  </div>

</div>
</body>
</html>`},de=t=>{var p,b,l;const a=se(t),s=`${t.name.replace(/[^a-zA-Z0-9֐-׿ ]/g,"").trim()||"trip"} - סיכום מסע`,n=a.replace(/<title>.*?<\/title>/,`<title>${f(s)}</title>`),r=document.createElement("iframe");r.title=s,r.style.position="fixed",r.style.left="-10000px",r.style.top="0",r.style.width="1px",r.style.height="1px",r.style.opacity="0",document.body.appendChild(r),r.onload=()=>{setTimeout(()=>{var x,y;(x=r.contentWindow)==null||x.focus(),(y=r.contentWindow)==null||y.print(),setTimeout(()=>r.remove(),6e4)},300)},(p=r.contentDocument)==null||p.open(),(b=r.contentDocument)==null||b.write(n),(l=r.contentDocument)==null||l.close()};export{de as e};
