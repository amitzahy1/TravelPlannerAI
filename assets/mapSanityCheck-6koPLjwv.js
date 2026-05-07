import{g as _}from"./index-Dt4j54LY.js";import"./framer-COmKckl1.js";import"./firebase-BC6egmGd.js";import"./map-C2wn3rKq.js";const m="travel_app_map_sanity_cache_v1",S=720*60*60*1e3,d=new Map,$=()=>{try{const e=localStorage.getItem(m);if(!e)return;const o=JSON.parse(e),n=Date.now();Object.entries(o).forEach(([a,r])=>{r&&r.result&&n-(r.ts||0)<S&&d.set(a,r.result)})}catch{}},A=()=>{try{const e={},o=Date.now();d.forEach((n,a)=>{e[a]={result:n,ts:o}}),localStorage.setItem(m,JSON.stringify(e))}catch{}};typeof window<"u"&&$();const g=(e,o)=>`${e.id}|${e.lat.toFixed(3)}|${e.lng.toFixed(3)}|${o.toLowerCase()}`,E=(e,o)=>`
You are a map-quality verifier. For each item below, decide whether the
given (lat, lng) coordinates fall inside any of the listed trip countries.
Be strict: if the coordinates are obviously in a different country
(e.g. coordinates in West Africa for a place named "Bangkok"), mark
in_country = false.

Trip countries: ${o.join(", ")}

Items:
${e.map((n,a)=>`${a+1}. id=${n.id} | name=${n.name} | lat=${n.lat.toFixed(4)} | lng=${n.lng.toFixed(4)}`).join(`
`)}

Return JSON ONLY:
{ "results": [{ "id": string, "in_country": boolean, "actual_country"?: string }] }
`,k=async(e,o)=>{if(e.length===0||o.length===0)return e.map(t=>({id:t.id,in_country:!0}));const n=new Map,a=[];for(const t of e){const i=g(t,o[0]),f=d.get(i);f?n.set(t.id,f):a.push(t)}if(a.length===0)return e.map(t=>n.get(t.id));const r=60,u=[];for(let t=0;t<a.length;t+=r){const i=a.slice(t,t+r),f=E(i,o);try{const c=await _(null,[{role:"user",parts:[{text:f}]}],{responseMimeType:"application/json",temperature:0},"FAST"),s=JSON.parse((c==null?void 0:c.text)||"{}");(Array.isArray(s==null?void 0:s.results)?s.results:[]).forEach(l=>{if(!l||typeof l.id!="string")return;const y=i.find(w=>w.id===l.id);y&&d.set(g(y,o[0]),l),u.push(l)})}catch(c){console.warn("[mapSanityCheck] AI verification failed — defaulting to pass-through",c),i.forEach(s=>{const p={id:s.id,in_country:!0};d.set(g(s,o[0]),p),u.push(p)})}}A();const h=new Map;return n.forEach((t,i)=>h.set(i,t)),u.forEach(t=>h.set(t.id,t)),e.map(t=>h.get(t.id)||{id:t.id,in_country:!0})};export{k as verifyPinsAgainstTripCountries};
