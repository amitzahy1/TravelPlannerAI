const p=t=>t?t.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):"",Q=["א׳","ב׳","ג׳","ד׳","ה׳","ו׳","ש׳"],B=["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"],V=["ינו׳","פבר׳","מרץ","אפר׳","מאי","יוני","יולי","אוג׳","ספט׳","אוק׳","נוב׳","דצמ׳"],P=t=>{if(!t)return"";if(/^\d{1,2}:\d{2}$/.test(t))return t;if(t.includes("T"))return t.split("T")[1].substring(0,5);try{const o=new Date(t);return isNaN(o.getTime())?t:o.toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit",hour12:!1})}catch{return t}},y=t=>{try{return(typeof t=="string"?new Date(t):t).toISOString().split("T")[0]}catch{return""}},A=(t,o)=>{const s=new Date(t);return s.setDate(s.getDate()+o),s},G=(t,o)=>{try{return Math.max(0,Math.ceil((new Date(o).getTime()-new Date(t).getTime())/864e5))}catch{return 0}},U=t=>`${t.getDate()} ${V[t.getMonth()]}`,X=t=>{var w,$,O,z,_,I,b,S;const o=[],s=e=>e&&!isNaN(new Date(e).getTime())&&o.push(new Date(e).getTime());if(($=(w=t.flights)==null?void 0:w.segments)==null||$.forEach(e=>s(e.date)),(O=t.hotels)==null||O.forEach(e=>{s(e.checkInDate),s(e.checkOutDate)}),(z=t.itinerary)==null||z.forEach(e=>s(e.date)),t.dates&&o.length===0&&t.dates.split(/[-–]/).forEach(e=>s(e.trim())),o.length===0)return[];const n=new Date(Math.min(...o));n.setHours(12,0,0,0);const l=new Date(Math.max(...o));l.setHours(12,0,0,0);const h={},T=Math.round((l.getTime()-n.getTime())/864e5)+1;for(let e=0;e<T;e++){const r=A(n,e),c=y(r);h[c]={date:r,iso:c,dayNum:r.getDate(),month:B[r.getMonth()],dow:Q[r.getDay()],events:[]}}const d=(e,r)=>{h[e]&&h[e].events.push(r)};return(I=(_=t.flights)==null?void 0:_.segments)==null||I.forEach((e,r)=>{var x;const c=y(e.date);d(c,{id:`f-${r}-d`,type:"flight_dep",time:P(e.departureTime)||"—",title:`טיסה ל-${e.toCity||e.toCode}`,subtitle:`${e.airline||""} ${e.flightNumber||""}`.trim(),icon:"✈️",flightData:e});let m=c;const v=P(e.departureTime),u=P(e.arrivalTime);if((x=e.arrivalTime)!=null&&x.includes("T"))m=y(e.arrivalTime);else if(v&&u&&u<v){const N=new Date(e.date);N.setDate(N.getDate()+1),m=y(N)}d(m,{id:`f-${r}-a`,type:"flight_arr",time:u||"—",title:`נחיתה ב-${e.toCity||e.toCode}`,subtitle:e.duration?`${e.duration}`:"",icon:"🛬",flightData:e})}),(b=t.hotels)==null||b.forEach((e,r)=>{const c=y(e.checkInDate),m=y(e.checkOutDate),v=G(e.checkInDate,e.checkOutDate);d(c,{id:`h-${r}-i`,type:"hotel_in",time:"15:00",title:"צ׳ק-אין",subtitle:e.name,icon:"🏨",hotelData:e,nightsCount:v}),d(m,{id:`h-${r}-o`,type:"hotel_out",time:"11:00",title:"צ׳ק-אאוט",subtitle:e.name,icon:"👋",hotelData:e})}),(S=t.itinerary)==null||S.forEach((e,r)=>{var m;const c=y(e.date);h[c]&&(e.title&&e.title!=="טיול חופשי"&&e.title!=="יום טיסה"&&(h[c].title=e.title),(m=e.activities)==null||m.forEach((v,u)=>{const x=v.match(/^(\d{1,2}:\d{2})(?:-\d{1,2}:\d{2})?\s*(.*)/),N=x?x[1]:"",a=x?x[2]:v,i=/הסעה|נסיעה|טרנספר|transfer|מונית|taxi/i.test(a),f=a.match(/\((.*?)\)$/),D=f?a.replace(/\s*\(.*?\)$/,"").trim():a,k=f?f[1]:"";d(c,{id:`a-${r}-${u}`,type:i?"transfer":"activity",time:N,title:D,subtitle:k,icon:i?"🚕":"📍"})}),e.notes&&d(c,{id:`n-${r}`,type:"activity",time:"",title:"הערה",details:e.notes,icon:"📝"}))}),Object.values(h).forEach(e=>{var m;const r=y(e.date),c=(m=t.hotels)==null?void 0:m.find(v=>r>y(v.checkInDate)&&r<y(v.checkOutDate));c&&e.events.length===0&&(e.title=`נופש ב-${c.name}`,e.events.push({id:`s-${r}`,type:"hotel_stay",time:"",title:c.name,subtitle:"יום חופשי במלון",icon:"🛏️",hotelData:c}))}),Object.values(h).sort((e,r)=>e.date.getTime()-r.date.getTime()).map((e,r,c)=>{var m,v;if(e.events.sort((u,x)=>!u.time&&!x.time?0:u.time?x.time?u.time.localeCompare(x.time):-1:1),!e.title){const u=e.events.find(x=>x.type==="flight_dep");u?e.title=`טיסה ל-${((m=u.flightData)==null?void 0:m.toCity)||((v=u.flightData)==null?void 0:v.toCode)||""}`:e.events.length===0?e.title="יום חופשי":e.title=r===0?"יום ראשון":r===c.length-1?"יום אחרון":"יום פעילות"}return e})},ee=t=>{const o=t.time?`<span class="evt-t">${t.time}</span>`:'<span class="evt-t evt-t-empty"></span>';let s=`evt evt-${t.type}`,n=`<span class="evt-i">${t.icon}</span><span class="evt-x"><span class="evt-title">${p(t.title)}</span>`;return t.subtitle&&(n+=`<span class="evt-sub">${p(t.subtitle)}</span>`),t.details&&(n+=`<span class="evt-sub">${p(t.details)}</span>`),n+="</span>",`<div class="${s}">${o}${n}</div>`},te=(t,o,s)=>{const n=o===0,l=o===s-1,h=n?"first":l?"last":"",T=t.events.length===0?'<div class="empty">☀️ יום פנוי</div>':t.events.map(ee).join("");return`
    <article class="day-card ${h}">
      <header class="day-head">
        <div class="day-num">
          <span class="dn">${t.dayNum}</span>
          <span class="dm">${V[t.date.getMonth()]}</span>
        </div>
        <div class="day-info">
          <span class="day-dow">יום ${t.dow}</span>
          <span class="day-title">${p(t.title||"")}</span>
        </div>
        <span class="day-idx">${o+1}/${s}</span>
      </header>
      <div class="day-events">${T}</div>
    </article>
  `},ae=t=>{var n;const o=((n=t.flights)==null?void 0:n.segments)||[];if(o.length===0)return"";const s=o.map(l=>{const h=P(l.departureTime),T=P(l.arrivalTime);return`
      <div class="ov-flight">
        <div class="ovf-top">
          <span class="ovf-date">${l.date?U(new Date(l.date)):""}</span>
          <span class="ovf-num">${p(l.flightNumber||"")}</span>
        </div>
        <div class="ovf-route">
          <div class="ovf-side">
            <div class="ovf-code">${p(l.fromCode||"")}</div>
            <div class="ovf-time">${h}</div>
          </div>
          <div class="ovf-arrow">
            <div class="ovf-airline">${p(l.airline||"")}</div>
            <div class="ovf-line">✈</div>
            ${l.duration?`<div class="ovf-dur">${p(l.duration)}</div>`:""}
          </div>
          <div class="ovf-side">
            <div class="ovf-code">${p(l.toCode||"")}</div>
            <div class="ovf-time">${T}</div>
          </div>
        </div>
      </div>
    `}).join("");return`
    <section class="overview">
      <h2 class="ov-title">✈️ טיסות <span class="ov-count">${o.length}</span></h2>
      <div class="ov-flights-grid">${s}</div>
    </section>
  `},ie=t=>{const o=t.hotels||[];if(o.length===0)return"";const s=o.map(n=>{var w;const l=G(n.checkInDate,n.checkOutDate),h=n.checkInDate?U(new Date(n.checkInDate)):"",T=n.checkOutDate?U(new Date(n.checkOutDate)):"",d=((w=n.rooms)==null?void 0:w.length)||0;return`
      <div class="ov-hotel">
        <div class="ovh-name">${p(n.name)}</div>
        ${n.address?`<div class="ovh-addr">📍 ${p(n.address)}</div>`:""}
        <div class="ovh-meta">
          <span class="ovh-dates">${h} → ${T}</span>
          ${l>0?`<span class="ovh-nights">${l} לילות</span>`:""}
          ${d>0?`<span class="ovh-rooms">${d} חדרים</span>`:""}
        </div>
      </div>
    `}).join("");return`
    <section class="overview">
      <h2 class="ov-title">🏨 מלונות <span class="ov-count">${o.length}</span></h2>
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
`,ne=["יום א׳","יום ב׳","יום ג׳","יום ד׳","יום ה׳","יום ו׳","שבת"],W=[{bg:"#ccfbf1",fg:"#115e59"},{bg:"#fce7f3",fg:"#9d174d"},{bg:"#fef3c7",fg:"#854d0e"},{bg:"#dbeafe",fg:"#1e40af"},{bg:"#ede9fe",fg:"#5b21b6"},{bg:"#fed7aa",fg:"#9a3412"},{bg:"#dcfce7",fg:"#166534"},{bg:"#fee2e2",fg:"#991b1b"}],q=[{bg:"#e0f2fe",fg:"#0c4a6e"},{bg:"#f3e8ff",fg:"#581c87"},{bg:"#ffedd5",fg:"#7c2d12"},{bg:"#dcfce7",fg:"#14532d"},{bg:"#fef9c3",fg:"#713f12"},{bg:"#cffafe",fg:"#155e75"},{bg:"#fae8ff",fg:"#701a75"}],re=(t,o)=>{var x,N;if(o.length===0)return"";const s=new Date(o[0].date);s.setHours(12,0,0,0);const n=new Date(o[o.length-1].date);n.setHours(12,0,0,0);const l=y(new Date),h=A(s,-1),T=A(n,1),d=new Date(h);d.setDate(d.getDate()-d.getDay());const w=new Date(T);w.setDate(w.getDate()+(6-w.getDay()));const $={};let O=0;(t.hotels||[]).forEach(a=>{const i=(a.name||"").trim().toLowerCase();!i||$[i]||($[i]=W[O%W.length],O++)});const z={};let _=0;const I=a=>{const i=(a||"").trim().toLowerCase();!i||z[i]||(z[i]=q[_%q.length],_++)};(N=(x=t.flights)==null?void 0:x.segments)==null||N.forEach(a=>{a.toCity&&I(a.toCity)}),(t.hotels||[]).forEach(a=>{a.city&&I(a.city)});const b={};o.forEach(a=>{b[a.iso]||(b[a.iso]=[]),a.events.forEach(i=>{var L,j,F,Y,g;let f="activity";i.type==="flight_dep"||i.type==="flight_arr"?f="flight":i.type==="hotel_in"||i.type==="hotel_out"||i.type==="hotel_stay"?f="hotel":i.type==="food"?f="food":i.type==="transfer"&&(f="transfer");const D=i.title;let k,E=`${f}::${D}`,M,H;if(f==="hotel"){const C=(((L=i.hotelData)==null?void 0:L.name)||"").trim().toLowerCase();C&&$[C]&&(k=$[C]),E=`hotel::${C}`,M=((j=i.hotelData)==null?void 0:j.city)||"",H=((F=i.hotelData)==null?void 0:F.name)||""}else if(f==="flight"){const C=(((Y=i.flightData)==null?void 0:Y.toCity)||((g=i.flightData)==null?void 0:g.fromCity)||"").trim().toLowerCase();C&&z[C]&&(k=z[C]),E=`flight::${C}`}b[a.iso].push({kind:f,label:D,runKey:E,color:k,hotelCity:M,hotelName:H})})});const S={},e=Math.round((w.getTime()-d.getTime())/864e5)+1,r=[];for(let a=0;a<e;a++)r.push(y(A(d,a)));for(let a=0;a<r.length;a++){const i=r[a],f=b[i]||[];S[i]=f.map(D=>{const k=a>0?b[r[a-1]]:void 0,E=a<r.length-1?b[r[a+1]]:void 0,M=!!(k!=null&&k.some(j=>j.runKey===D.runKey)),H=!!(E!=null&&E.some(j=>j.runKey===D.runKey));let L="single";return M&&H?L="mid":H?L="start":M&&(L="end"),{...D,runPos:L}})}const c=[];for(let a=0;a<e;a++){const i=A(d,a),f=y(i),D=i>=s&&i<=n,k=i.getDay(),E=S[f]||[],M=E.slice(0,4),H=E.length-M.length,L=M.map(g=>{const C=g.color?` style="background:${g.color.bg};color:${g.color.fg}"`:"",Z=g.runPos==="single"?"":` cal-chip-run-${g.runPos}`,K=g.runPos==="mid"||g.runPos==="end";let R;K?g.label==="צ׳ק-אאוט"||g.label==="צ'ק-אאוט"?R=p(g.label):g.hotelCity?R=p(g.hotelCity):g.hotelName?R=p(g.hotelName.split(" ").slice(0,2).join(" ")):R="·":R=p(g.label);const J=K?" cal-chip-run-cont":"";return`<span class="cal-chip cal-chip-${g.kind}${Z}${J}"${C} title="${p(g.label)}">${R}</span>`}).join(""),j=H>0?`<span class="cal-more">+${H} נוסף</span>`:"",F=`cal-num${k===5?" cal-num-fri":""}${k===6?" cal-num-sat":""}`,Y=`cal-cell${D?"":" cal-padding"}${f===l?" cal-today":""}`;c.push(`<div class="${Y}"><span class="${F}">${i.getDate()}</span>${L}${j}</div>`)}const m=ne.map((a,i)=>`<div class="${`cal-header${i===5?" cal-header-fri":""}${i===6?" cal-header-sat":""}`}">${a}</div>`).join(""),v=s.getMonth()===n.getMonth()&&s.getFullYear()===n.getFullYear()?`${B[s.getMonth()]} ${s.getFullYear()}`:`${B[s.getMonth()]}–${B[n.getMonth()]} ${n.getFullYear()}`,u=Object.keys($).length>0?`<div class="cal-legend">
        <span class="cal-legend-title">מלונות</span>
        ${(t.hotels||[]).filter((a,i,f)=>f.findIndex(D=>(D.name||"").toLowerCase()===(a.name||"").toLowerCase())===i).map(a=>{const i=$[(a.name||"").toLowerCase()];return i?`<span class="cal-legend-chip" style="background:${i.bg};color:${i.fg}">${p(a.name||"")}</span>`:""}).join("")}
      </div>`:"";return`<section class="calendar-section">
    <h2 class="ov-title">📅 לוח הטיול — ${p(v)}</h2>
    <div class="calendar-grid">${m}${c.join("")}</div>
    ${u}
  </section>`},se=t=>{var $,O,z,_;const o=X(t),s=t.coverImage||"https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1600&q=80",n=new Date().toLocaleDateString("he-IL"),l=((O=($=t.flights)==null?void 0:$.segments)==null?void 0:O.length)||0,h=((z=t.hotels)==null?void 0:z.length)||0,T=((_=t.itinerary)==null?void 0:_.reduce((I,b)=>{var S;return I+(((S=b.activities)==null?void 0:S.length)||0)},0))||0,d=o.length,w=o.map((I,b)=>te(I,b,o.length)).join("");return`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${p(t.name)} — סיכום מסע</title>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${oe}</style>
</head>
<body>
<div class="page">

  <header class="hero" style="background-image:url('${s}')">
    <div class="hero-c">
      <div>
        <h1>${p(t.name)}</h1>
        <div class="hero-meta">📍 ${p(t.destination||"")}</div>
      </div>
      <div class="hero-chips">
        ${d>0?`<span class="chip">📅 ${d} ימים</span>`:""}
        ${l>0?`<span class="chip">✈️ ${l} טיסות</span>`:""}
        ${h>0?`<span class="chip">🏨 ${h} מלונות</span>`:""}
      </div>
    </div>
  </header>

  <div class="stats">
    <div class="stat"><div class="stat-v">${d}</div><div class="stat-l">ימים</div></div>
    <div class="stat"><div class="stat-v">${l}</div><div class="stat-l">טיסות</div></div>
    <div class="stat"><div class="stat-v">${h}</div><div class="stat-l">מלונות</div></div>
    <div class="stat"><div class="stat-v">${T}</div><div class="stat-l">פעילויות</div></div>
  </div>

  ${re(t,o)}

  ${ae(t)}
  ${ie(t)}

  <section class="days-section">
    <h2 class="ov-title">📆 יום-יום <span class="ov-count">${d}</span></h2>
    <div class="days-grid">${w}</div>
  </section>

  <div class="footer">
    <div class="footer-logo">✈ Travel Planner Pro</div>
    נוצר ב-${n}
  </div>

</div>
</body>
</html>`},le=t=>{const o=se(t),s=new Blob([o],{type:"text/html;charset=utf-8"}),n=URL.createObjectURL(s),l=document.createElement("a");l.href=n,l.download=`${t.name.replace(/[^a-zA-Z0-9֐-׿ ]/g,"").trim()||"trip"} — סיכום מסע.html`,document.body.appendChild(l),l.click(),document.body.removeChild(l),URL.revokeObjectURL(n)};export{le as d};
