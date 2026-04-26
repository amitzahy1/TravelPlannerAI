const g=t=>t?t.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):"",Q=["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"],A=["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"],U=["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"],j=t=>{if(!t)return"";if(/^\d{1,2}:\d{2}$/.test(t))return t;if(t.includes("T"))return t.split("T")[1].substring(0,5);try{const i=new Date(t);return isNaN(i.getTime())?t:i.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit",hour12:!1})}catch{return t}},y=t=>{try{return(typeof t=="string"?new Date(t):t).toISOString().split("T")[0]}catch{return""}},R=(t,i)=>{const s=new Date(t);return s.setDate(s.getDate()+i),s},K=(t,i)=>{try{return Math.max(0,Math.ceil((new Date(i).getTime()-new Date(t).getTime())/864e5))}catch{return 0}},P=t=>`${t.getDate()} ${U[t.getMonth()]}`,X=t=>{var w,$,O,C,_,I,b,S;const i=[],s=e=>e&&!isNaN(new Date(e).getTime())&&i.push(new Date(e).getTime());if(($=(w=t.flights)==null?void 0:w.segments)==null||$.forEach(e=>s(e.date)),(O=t.hotels)==null||O.forEach(e=>{s(e.checkInDate),s(e.checkOutDate)}),(C=t.itinerary)==null||C.forEach(e=>s(e.date)),t.dates&&i.length===0&&t.dates.split(/[-–]/).forEach(e=>s(e.trim())),i.length===0)return[];const n=new Date(Math.min(...i));n.setHours(12,0,0,0);const d=new Date(Math.max(...i));d.setHours(12,0,0,0);const f={},T=Math.round((d.getTime()-n.getTime())/864e5)+1;for(let e=0;e<T;e++){const r=R(n,e),c=y(r);f[c]={date:r,iso:c,dayNum:r.getDate(),month:A[r.getMonth()],dow:Q[r.getDay()],events:[]}}const l=(e,r)=>{f[e]&&f[e].events.push(r)};return(I=(_=t.flights)==null?void 0:_.segments)==null||I.forEach((e,r)=>{var m;const c=y(e.date);l(c,{id:`f-${r}-d`,type:"flight_dep",time:j(e.departureTime)||"—",title:`טיסה ל-${e.toCity||e.toCode}`,subtitle:`${e.airline||""} ${e.flightNumber||""}`.trim(),icon:"✈️",flightData:e});let h=c;const x=j(e.departureTime),v=j(e.arrivalTime);if((m=e.arrivalTime)!=null&&m.includes("T"))h=y(e.arrivalTime);else if(x&&v&&v<x){const M=new Date(e.date);M.setDate(M.getDate()+1),h=y(M)}l(h,{id:`f-${r}-a`,type:"flight_arr",time:v||"—",title:`נחיתה ב-${e.toCity||e.toCode}`,subtitle:e.duration?`${e.duration}`:"",icon:"🛬",flightData:e})}),(b=t.hotels)==null||b.forEach((e,r)=>{const c=y(e.checkInDate),h=y(e.checkOutDate),x=K(e.checkInDate,e.checkOutDate);l(c,{id:`h-${r}-i`,type:"hotel_in",time:"15:00",title:"צ׳ק-אין",subtitle:e.name,icon:"🏨",hotelData:e,nightsCount:x}),l(h,{id:`h-${r}-o`,type:"hotel_out",time:"11:00",title:"צ׳ק-אאוט",subtitle:e.name,icon:"👋",hotelData:e})}),(S=t.itinerary)==null||S.forEach((e,r)=>{var h;const c=y(e.date);f[c]&&(e.title&&e.title!=="טיול חופשי"&&e.title!=="יום טיסה"&&(f[c].title=e.title),(h=e.activities)==null||h.forEach((x,v)=>{const m=x.match(/^(\d{1,2}:\d{2})(?:-\d{1,2}:\d{2})?\s*(.*)/),M=m?m[1]:"",a=m?m[2]:x,o=/הסעה|נסיעה|טרנספר|transfer|מונית|taxi/i.test(a),p=a.match(/\((.*?)\)$/),k=p?a.replace(/\s*\(.*?\)$/,"").trim():a,D=p?p[1]:"";l(c,{id:`a-${r}-${v}`,type:o?"transfer":"activity",time:M,title:k,subtitle:D,icon:o?"🚕":"📍"})}),e.notes&&l(c,{id:`n-${r}`,type:"activity",time:"",title:"הערה",details:e.notes,icon:"📝"}))}),Object.values(f).forEach(e=>{var h;const r=y(e.date),c=(h=t.hotels)==null?void 0:h.find(x=>r>y(x.checkInDate)&&r<y(x.checkOutDate));c&&e.events.length===0&&(e.title=`נופש ב-${c.name}`,e.events.push({id:`s-${r}`,type:"hotel_stay",time:"",title:c.name,subtitle:"יום חופשי במלון",icon:"🛏️",hotelData:c}))}),Object.values(f).sort((e,r)=>e.date.getTime()-r.date.getTime()).map((e,r,c)=>{var h,x;if(e.events.sort((v,m)=>!v.time&&!m.time?0:v.time?m.time?v.time.localeCompare(m.time):-1:1),!e.title){const v=e.events.find(m=>m.type==="flight_dep");v?e.title=`טיסה ל-${((h=v.flightData)==null?void 0:h.toCity)||((x=v.flightData)==null?void 0:x.toCode)||""}`:e.events.length===0?e.title="יום חופשי":e.title=r===0?"יום ראשון":r===c.length-1?"יום אחרון":"יום פעילות"}return e})},ee=t=>{const i=t.time?`<span class="evt-t">${t.time}</span>`:'<span class="evt-t evt-t-empty"></span>';let s=`evt evt-${t.type}`,n=`<span class="evt-i">${t.icon}</span><span class="evt-x"><span class="evt-title">${g(t.title)}</span>`;return t.subtitle&&(n+=`<span class="evt-sub">${g(t.subtitle)}</span>`),t.details&&(n+=`<span class="evt-sub">${g(t.details)}</span>`),n+="</span>",`<div class="${s}">${i}${n}</div>`},te=(t,i,s)=>{const n=i===0,d=i===s-1,f=n?"first":d?"last":"",T=t.events.length===0?'<div class="empty">☀️ יום פנוי</div>':t.events.map(ee).join("");return`
    <article class="day-card ${f}">
      <header class="day-head">
        <div class="day-num">
          <span class="dn">${t.dayNum}</span>
          <span class="dm">${U[t.date.getMonth()]}</span>
        </div>
        <div class="day-info">
          <span class="day-dow">יום ${t.dow}</span>
          <span class="day-title">${g(t.title||"")}</span>
        </div>
        <span class="day-idx">${i+1}/${s}</span>
      </header>
      <div class="day-events">${T}</div>
    </article>
  `},ae=t=>{var n;const i=((n=t.flights)==null?void 0:n.segments)||[];if(i.length===0)return"";const s=i.map(d=>{const f=j(d.departureTime),T=j(d.arrivalTime);return`
      <div class="ov-flight">
        <div class="ovf-top">
          <span class="ovf-date">${d.date?P(new Date(d.date)):""}</span>
          <span class="ovf-num">${g(d.flightNumber||"")}</span>
        </div>
        <div class="ovf-route">
          <div class="ovf-side">
            <div class="ovf-code">${g(d.fromCode||"")}</div>
            <div class="ovf-time">${f}</div>
          </div>
          <div class="ovf-arrow">
            <div class="ovf-airline">${g(d.airline||"")}</div>
            <div class="ovf-line">✈</div>
            ${d.duration?`<div class="ovf-dur">${g(d.duration)}</div>`:""}
          </div>
          <div class="ovf-side">
            <div class="ovf-code">${g(d.toCode||"")}</div>
            <div class="ovf-time">${T}</div>
          </div>
        </div>
      </div>
    `}).join("");return`
    <section class="overview">
      <h2 class="ov-title">✈️ טיסות <span class="ov-count">${i.length}</span></h2>
      <div class="ov-flights-grid">${s}</div>
    </section>
  `},ie=t=>{const i=t.hotels||[];if(i.length===0)return"";const s=i.map(n=>{var w;const d=K(n.checkInDate,n.checkOutDate),f=n.checkInDate?P(new Date(n.checkInDate)):"",T=n.checkOutDate?P(new Date(n.checkOutDate)):"",l=((w=n.rooms)==null?void 0:w.length)||0;return`
      <div class="ov-hotel">
        <div class="ovh-name">${g(n.name)}</div>
        ${n.address?`<div class="ovh-addr">📍 ${g(n.address)}</div>`:""}
        <div class="ovh-meta">
          <span class="ovh-dates">${f} → ${T}</span>
          ${d>0?`<span class="ovh-nights">${d} לילות</span>`:""}
          ${l>0?`<span class="ovh-rooms">${l} חדרים</span>`:""}
        </div>
      </div>
    `}).join("");return`
    <section class="overview">
      <h2 class="ov-title">🏨 מלונות <span class="ov-count">${i.length}</span></h2>
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
.cal-chip-run-cont { font-size: 8.5px; font-weight: 600; opacity: 0.7; }
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
`,ne=["יום א׳","יום ב׳","יום ג׳","יום ד׳","יום ה׳","יום ו׳","שבת"],Y=[{bg:"#ccfbf1",fg:"#115e59"},{bg:"#fce7f3",fg:"#9d174d"},{bg:"#fef3c7",fg:"#854d0e"},{bg:"#dbeafe",fg:"#1e40af"},{bg:"#ede9fe",fg:"#5b21b6"},{bg:"#fed7aa",fg:"#9a3412"},{bg:"#dcfce7",fg:"#166534"},{bg:"#fee2e2",fg:"#991b1b"}],B=[{bg:"#e0f2fe",fg:"#0c4a6e"},{bg:"#f3e8ff",fg:"#581c87"},{bg:"#ffedd5",fg:"#7c2d12"},{bg:"#dcfce7",fg:"#14532d"},{bg:"#fef9c3",fg:"#713f12"},{bg:"#cffafe",fg:"#155e75"},{bg:"#fae8ff",fg:"#701a75"}],re=(t,i)=>{var m,M;if(i.length===0)return"";const s=new Date(i[0].date);s.setHours(12,0,0,0);const n=new Date(i[i.length-1].date);n.setHours(12,0,0,0);const d=y(new Date),f=R(s,-1),T=R(n,1),l=new Date(f);l.setDate(l.getDate()-l.getDay());const w=new Date(T);w.setDate(w.getDate()+(6-w.getDay()));const $={};let O=0;(t.hotels||[]).forEach(a=>{const o=(a.name||"").trim().toLowerCase();!o||$[o]||($[o]=Y[O%Y.length],O++)});const C={};let _=0;const I=a=>{const o=(a||"").trim().toLowerCase();!o||C[o]||(C[o]=B[_%B.length],_++)};(M=(m=t.flights)==null?void 0:m.segments)==null||M.forEach(a=>{a.toCity&&I(a.toCity)}),(t.hotels||[]).forEach(a=>{a.city&&I(a.city)});const b={};i.forEach(a=>{b[a.iso]||(b[a.iso]=[]),a.events.forEach(o=>{var N,H,L;let p="activity";o.type==="flight_dep"||o.type==="flight_arr"?p="flight":o.type==="hotel_in"||o.type==="hotel_out"||o.type==="hotel_stay"?p="hotel":o.type==="food"?p="food":o.type==="transfer"&&(p="transfer");const k=o.title;let D,z=`${p}::${k}`;if(p==="hotel"){const u=(((N=o.hotelData)==null?void 0:N.name)||"").trim().toLowerCase();u&&$[u]&&(D=$[u]),z=`hotel::${u}`}else if(p==="flight"){const u=(((H=o.flightData)==null?void 0:H.toCity)||((L=o.flightData)==null?void 0:L.fromCity)||"").trim().toLowerCase();u&&C[u]&&(D=C[u]),z=`flight::${u}`}b[a.iso].push({kind:p,label:k,runKey:z,color:D})})});const S={},e=Math.round((w.getTime()-l.getTime())/864e5)+1,r=[];for(let a=0;a<e;a++)r.push(y(R(l,a)));for(let a=0;a<r.length;a++){const o=r[a],p=b[o]||[];S[o]=p.map(k=>{const D=a>0?b[r[a-1]]:void 0,z=a<r.length-1?b[r[a+1]]:void 0,N=!!(D!=null&&D.some(u=>u.runKey===k.runKey)),H=!!(z!=null&&z.some(u=>u.runKey===k.runKey));let L="single";return N&&H?L="mid":H?L="start":N&&(L="end"),{...k,runPos:L}})}const c=[];for(let a=0;a<e;a++){const o=R(l,a),p=y(o),k=o>=s&&o<=n,D=o.getDay(),z=S[p]||[],N=z.slice(0,4),H=z.length-N.length,L=N.map(E=>{const V=E.color?` style="background:${E.color.bg};color:${E.color.fg}"`:"",G=E.runPos==="single"?"":` cal-chip-run-${E.runPos}`,F=E.runPos==="mid"||E.runPos==="end",Z=F?"·":g(E.label),J=F?" cal-chip-run-cont":"";return`<span class="cal-chip cal-chip-${E.kind}${G}${J}"${V} title="${g(E.label)}">${Z}</span>`}).join(""),u=H>0?`<span class="cal-more">+${H} נוסף</span>`:"",W=`cal-num${D===5?" cal-num-fri":""}${D===6?" cal-num-sat":""}`,q=`cal-cell${k?"":" cal-padding"}${p===d?" cal-today":""}`;c.push(`<div class="${q}"><span class="${W}">${o.getDate()}</span>${L}${u}</div>`)}const h=ne.map((a,o)=>`<div class="${`cal-header${o===5?" cal-header-fri":""}${o===6?" cal-header-sat":""}`}">${a}</div>`).join(""),x=s.getMonth()===n.getMonth()&&s.getFullYear()===n.getFullYear()?`${A[s.getMonth()]} ${s.getFullYear()}`:`${A[s.getMonth()]}–${A[n.getMonth()]} ${n.getFullYear()}`,v=Object.keys($).length>0?`<div class="cal-legend">
        <span class="cal-legend-title">מלונות</span>
        ${(t.hotels||[]).filter((a,o,p)=>p.findIndex(k=>(k.name||"").toLowerCase()===(a.name||"").toLowerCase())===o).map(a=>{const o=$[(a.name||"").toLowerCase()];return o?`<span class="cal-legend-chip" style="background:${o.bg};color:${o.fg}">${g(a.name||"")}</span>`:""}).join("")}
      </div>`:"";return`<section class="calendar-section">
    <h2 class="ov-title">📅 לוח הטיול — ${g(x)}</h2>
    <div class="calendar-grid">${h}${c.join("")}</div>
    ${v}
  </section>`},se=t=>{var $,O,C,_;const i=X(t),s=t.coverImage||"https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80",n=new Date().toLocaleDateString("he-IL"),d=((O=($=t.flights)==null?void 0:$.segments)==null?void 0:O.length)||0,f=((C=t.hotels)==null?void 0:C.length)||0,T=((_=t.itinerary)==null?void 0:_.reduce((I,b)=>{var S;return I+(((S=b.activities)==null?void 0:S.length)||0)},0))||0,l=i.length,w=i.map((I,b)=>te(I,b,i.length)).join("");return`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${g(t.name)} — סיכום מסע</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${oe}</style>
</head>
<body>
<div class="page">

  <header class="hero" style="background-image:url('${s}')">
    <div class="hero-c">
      <div>
        <h1>${g(t.name)}</h1>
        <div class="hero-meta">📍 ${g(t.destination||"")}</div>
      </div>
      <div class="hero-chips">
        ${l>0?`<span class="chip">📅 ${l} ימים</span>`:""}
        ${d>0?`<span class="chip">✈️ ${d} טיסות</span>`:""}
        ${f>0?`<span class="chip">🏨 ${f} מלונות</span>`:""}
      </div>
    </div>
  </header>

  <div class="stats">
    <div class="stat"><div class="stat-v">${l}</div><div class="stat-l">ימים</div></div>
    <div class="stat"><div class="stat-v">${d}</div><div class="stat-l">טיסות</div></div>
    <div class="stat"><div class="stat-v">${f}</div><div class="stat-l">מלונות</div></div>
    <div class="stat"><div class="stat-v">${T}</div><div class="stat-l">פעילויות</div></div>
  </div>

  ${re(t,i)}

  ${ae(t)}
  ${ie(t)}

  <section class="days-section">
    <h2 class="ov-title">📆 יום-יום <span class="ov-count">${l}</span></h2>
    <div class="days-grid">${w}</div>
  </section>

  <div class="footer">
    <div class="footer-logo">✈ Travel Planner Pro</div>
    נוצר ב-${n}
  </div>

</div>
</body>
</html>`},de=t=>{const i=se(t),s=new Blob([i],{type:"text/html;charset=utf-8"}),n=URL.createObjectURL(s),d=document.createElement("a");d.href=n,d.download=`${t.name.replace(/[^a-zA-Z0-9֐-׿ ]/g,"").trim()||"trip"} — סיכום מסע.html`,document.body.appendChild(d),d.click(),document.body.removeChild(d),URL.revokeObjectURL(n)};export{de as d};
