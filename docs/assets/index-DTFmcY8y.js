import{createClient as C}from"https://esm.sh/@supabase/supabase-js@2.45.0";(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const t of r)if(t.type==="childList")for(const s of t.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&a(s)}).observe(document,{childList:!0,subtree:!0});function n(r){const t={};return r.integrity&&(t.integrity=r.integrity),r.referrerPolicy&&(t.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?t.credentials="include":r.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function a(r){if(r.ep)return;r.ep=!0;const t=n(r);fetch(r.href,t)}})();const S="https://ljcczzlbjzoouwcxxary.supabase.co",T="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqY2N6emxianpvb3V3Y3h4YXJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NTUzOTMsImV4cCI6MjEwMzMzMTM5M30.y23JF2uevZvk4WlOhAqwCQnt_zgUdd_zIyW3d_jmvQ4",u=["#FF6B6B","#4ECDC4","#45B7D1","#FFA07A","#B19CD9","#87CEEB","#DDA0DD","#90EE90","#F7DC6F","#FF8C42","#5D8AA8","#E6B0F7"],h=C(S,T);let e={user:null,spheres:[],todayValues:{},history:{},currentTab:"today",isOnboarded:!1,userId:null};var w;const p=(w=window.Telegram)==null?void 0:w.WebApp;p&&(p.ready(),p.expand());function O(){if(!p||!p.initData)return null;try{const o=new URLSearchParams(p.initData).get("user");if(o)return JSON.parse(o)}catch{}return null}async function $(){const i=O();if(!i){e.userId="dev-"+Math.random().toString(36).slice(2,8),e.isOnboarded=!1,I();return}e.userId=i.id,e.user=i;try{await h.from("users").upsert({id:i.id,username:i.username||null,first_name:i.first_name||null});const{data:o,error:n}=await h.from("spheres").select("*").eq("user_id",i.id).order("display_order",{ascending:!0});if(n)throw n;e.spheres=o||[],e.spheres.length===0?I():(e.isOnboarded=!0,await b(),await E(),f())}catch(o){m("Ошибка: "+o.message),document.getElementById("app").innerHTML=`
      <div class="empty-state">
        <p>⚠️ ${o.message}</p>
      </div>`}}function I(){const i=document.getElementById("app");i.innerHTML=`
    <div class="header">
      <h1>Колесо Баланса</h1>
    </div>
    <div class="onboarding">
      <h2>Добро пожаловать!</h2>
      <p>
        Назови сферы своей жизни, которые хочешь отслеживать.
        Каждый день ты будешь оценивать их от 0 до 10,
        и видеть как меняется твой баланс.
      </p>
      <div id="sphere-inputs"></div>
      <button class="add-sphere-btn" id="add-sphere">+ Добавить сферу</button>
      <button class="save-btn" id="save-spheres">Готово 🎯</button>
    </div>
  `;const o=document.getElementById("sphere-inputs"),n=["Здоровье","Финансы","Карьера","Отношения"];function a(r="",t=0){const s=document.createElement("div");s.className="sphere-input-row",s.style.animationDelay=`${t*.1}s`,s.innerHTML=`
      <input type="text" placeholder="Название сферы" value="${r}" maxlength="30" />
      <button class="remove-btn">×</button>
    `,s.querySelector(".remove-btn").addEventListener("click",()=>s.remove()),o.appendChild(s)}n.forEach((r,t)=>a(r,t)),document.getElementById("add-sphere").addEventListener("click",()=>{a("",o.children.length)}),document.getElementById("save-spheres").addEventListener("click",async()=>{const r=o.querySelectorAll(".sphere-input-row"),t=[];if(r.forEach((s,d)=>{const l=s.querySelector("input").value.trim();l&&t.push({name:l,color:u[d%u.length]})}),t.length<2){m("Добавь хотя бы 2 сферы");return}if(!e.userId||e.userId.startsWith("dev-")){e.spheres=t.map((s,d)=>({...s,id:"local-"+d,user_id:e.userId,display_order:d})),e.isOnboarded=!0,f();return}try{const s=t.map((c,v)=>({user_id:e.userId,name:c.name,color:c.color,display_order:v})),{data:d,error:l}=await h.from("spheres").insert(s).select();if(l)throw l;e.spheres=d,e.isOnboarded=!0,await h.from("users").update({onboarded:!0}).eq("id",e.userId),await b(),f()}catch(s){m("Ошибка: "+s.message)}})}async function b(){const i=new Date().toISOString().split("T")[0],{data:o,error:n}=await h.from("entries").select("*").eq("user_id",e.userId).eq("entry_date",i);if(n)throw n;e.todayValues={},e.spheres.forEach(a=>{const r=(o||[]).find(t=>t.sphere_id===a.id);e.todayValues[a.id]=r?r.value:5})}async function E(){const i=new Date;i.setDate(i.getDate()-30);const{data:o,error:n}=await h.from("entries").select("entry_date, value, note, sphere_id").eq("user_id",e.userId).gte("entry_date",i.toISOString().split("T")[0]).order("entry_date",{ascending:!0});if(n)throw n;e.history={},(o||[]).forEach(a=>{e.history[a.entry_date]||(e.history[a.entry_date]=[]),e.history[a.entry_date].push(a)})}function f(){const i=document.getElementById("app"),o=new Date().toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"});i.innerHTML=`
    <div class="header">
      <h1>Колесо Баланса</h1>
      <div class="date">${o}</div>
    </div>
    <div class="tabs">
      <button class="tab active" data-tab="today">Сегодня</button>
      <button class="tab" data-tab="history">История</button>
      <button class="tab" data-tab="settings">Сферы</button>
    </div>
    <div id="tab-content"></div>
  `,document.querySelectorAll(".tab").forEach(n=>{n.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(a=>a.classList.remove("active")),n.classList.add("active"),e.currentTab=n.dataset.tab,g()})}),g()}function g(){const i=document.getElementById("tab-content");e.currentTab==="today"?B(i):e.currentTab==="history"?M(i):e.currentTab==="settings"&&q(i)}function B(i){i.innerHTML=`
    <div class="chart-container">
      <canvas id="wheel-chart"></canvas>
    </div>
    <div class="sliders-section">
      <div class="sliders-title">Оцени свой день (0–10)</div>
      <div id="sliders"></div>
      <button class="save-btn" id="save-entries">Сохранить</button>
    </div>
  `;const o=document.getElementById("sliders");e.spheres.forEach((n,a)=>{const r=n.color||u[a%u.length],t=e.todayValues[n.id]??5,s=document.createElement("div");s.className="slider-item",s.style.animationDelay=`${a*.08}s`,s.innerHTML=`
      <div class="slider-header">
        <div class="slider-name">
          <div class="slider-dot" style="background: ${r}"></div>
          <span>${n.name}</span>
        </div>
        <div class="slider-value" id="val-${n.id}">${t}</div>
      </div>
      <input type="range" min="0" max="10" value="${t}"
        data-sphere-id="${n.id}" data-color="${r}"
        style="background: linear-gradient(to right, ${r} 0%, ${r} ${t*10}%, var(--tg-bg) ${t*10}%)" />
    `,o.appendChild(s)}),o.querySelectorAll('input[type="range"]').forEach(n=>{n.addEventListener("input",a=>{const r=a.target.dataset.sphereId,t=parseInt(a.target.value),s=a.target.dataset.color;e.todayValues[r]=t;const d=document.getElementById(`val-${r}`);d.textContent=t,d.classList.add("changing"),setTimeout(()=>d.classList.remove("changing"),300),a.target.style.background=`linear-gradient(to right, ${s} 0%, ${s} ${t*10}%, var(--tg-bg) ${t*10}%)`,x()})}),document.getElementById("save-entries").addEventListener("click",async()=>{var r;if((r=e.userId)!=null&&r.startsWith("dev-")){m("Dev режим — данные не сохраняются");return}const n=new Date().toISOString().split("T")[0],a=e.spheres.map(t=>({user_id:e.userId,entry_date:n,sphere_id:t.id,value:Math.max(0,Math.min(10,e.todayValues[t.id]??5))}));try{const{error:t}=await h.from("entries").upsert(a,{onConflict:"user_id,entry_date,sphere_id"});if(t)throw t;const s=document.getElementById("save-entries");s.classList.add("success"),s.textContent="Сохранено! ✅",setTimeout(()=>{s.classList.remove("success"),s.textContent="Сохранить"},2e3),p!=null&&p.HapticFeedback&&p.HapticFeedback.notificationOccurred("success"),await E()}catch(t){m("Ошибка: "+t.message)}}),D()}let y=null;function D(){const i=document.getElementById("wheel-chart");if(!i)return;const o=i.getContext("2d"),n=e.spheres.map(s=>s.name),a=e.spheres.map((s,d)=>e.todayValues[s.id]??5),r=e.spheres.map((s,d)=>s.color||u[d%u.length]),t=o.createLinearGradient(0,0,0,400);t.addColorStop(0,"rgba(108, 140, 255, 0.4)"),t.addColorStop(1,"rgba(78, 205, 196, 0.2)"),y&&y.destroy(),Chart.register(ChartDataLabels),y=new Chart(o,{type:"radar",data:{labels:n,datasets:[{data:a,backgroundColor:t,borderColor:"rgba(108, 140, 255, 0.8)",borderWidth:2,pointBackgroundColor:r,pointBorderColor:"#fff",pointBorderWidth:2,pointRadius:6,pointHoverRadius:9}]},options:{responsive:!0,maintainAspectRatio:!0,animation:{duration:800,easing:"easeOutQuart"},plugins:{legend:{display:!1},datalabels:{color:s=>r[s.dataIndex]||"#fff",font:{size:11,weight:"600",family:"Inter"},formatter:s=>s,align:"end",anchor:"end",offset:4}},scales:{r:{min:0,max:10,ticks:{stepSize:2,color:"rgba(255,255,255,0.3)",backdropColor:"transparent",font:{size:9}},grid:{color:"rgba(255,255,255,0.1)"},angleLines:{color:"rgba(255,255,255,0.12)"},pointLabels:{color:"rgba(255,255,255,0.85)",font:{size:12,family:"Inter",weight:"500"}}}}}})}function x(){y&&(y.data.datasets[0].data=e.spheres.map(i=>e.todayValues[i.id]??5),y.update("active"))}function M(i){const o=Object.keys(e.history).sort().reverse();if(o.length===0){i.innerHTML=`
      <div class="history-section">
        <div class="empty-state">
          <p>📊</p>
          <p>Пока нет истории.<br>Начни заполнять колесо каждый день!</p>
        </div>
      </div>`;return}let n='<div class="history-section"><div class="history-title">История за 30 дней</div>';o.slice(0,30).forEach(a=>{const r=e.history[a],t=r.reduce((l,c)=>l+c.value,0)/r.length,d=new Date(a).toLocaleDateString("ru-RU",{day:"numeric",month:"short",weekday:"short"});n+=`
      <div class="history-day">
        <div class="history-date">${d} — средний баланс: <b>${t.toFixed(1)}</b></div>
        <div class="history-spheres">
          ${r.map(l=>{const c=e.spheres.find(_=>_.id===l.sphere_id),v=(c==null?void 0:c.color)||"#666",L=(c==null?void 0:c.name)||"?";return`<span class="history-pill" style="border-left: 3px solid ${v}">${L}: ${l.value}</span>`}).join("")}
        </div>
      </div>`}),n+="</div>",i.innerHTML=n}function q(i){i.innerHTML=`
    <div class="sliders-section">
      <div class="sliders-title">Мои сферы</div>
      <div id="spheres-list"></div>
      <button class="add-sphere-btn" id="add-sphere-settings">+ Добавить сферу</button>
    </div>
  `;const o=document.getElementById("spheres-list");function n(a,r){a.color||u[r%u.length];const t=document.createElement("div");t.className="sphere-input-row",t.innerHTML=`
      <input type="text" value="${a.name}" maxlength="30" />
      <button class="remove-btn" data-id="${a.id}">×</button>
    `,t.querySelector("input").addEventListener("blur",async s=>{var l;const d=s.target.value.trim();if(d&&!((l=e.userId)!=null&&l.startsWith("dev-")))try{const{error:c}=await h.from("spheres").update({name:d}).eq("id",a.id).eq("user_id",e.userId);if(c)throw c}catch(c){m("Ошибка: "+c.message)}}),t.querySelector(".remove-btn").addEventListener("click",async()=>{var s;if((s=e.userId)!=null&&s.startsWith("dev-")){e.spheres=e.spheres.filter(d=>d.id!==a.id),t.remove();return}try{const{error:d}=await h.from("spheres").delete().eq("id",a.id).eq("user_id",e.userId);if(d)throw d;e.spheres=e.spheres.filter(l=>l.id!==a.id),t.style.transition="all 0.3s",t.style.opacity="0",t.style.transform="translateX(-30px)",setTimeout(()=>t.remove(),300),m("Сфера удалена")}catch(d){m("Ошибка: "+d.message)}}),o.appendChild(t)}e.spheres.forEach((a,r)=>n(a,r)),document.getElementById("add-sphere-settings").addEventListener("click",async()=>{var r;const a=prompt("Название новой сферы:");if(a){if((r=e.userId)!=null&&r.startsWith("dev-")){const t={id:"local-"+Date.now(),user_id:e.userId,name:a.trim(),color:u[e.spheres.length%u.length],display_order:e.spheres.length};e.spheres.push(t),n(t,e.spheres.length-1);return}try{const{data:t,error:s}=await h.from("spheres").insert({user_id:e.userId,name:a.trim(),color:u[e.spheres.length%u.length],display_order:e.spheres.length}).select().single();if(s)throw s;e.spheres.push(t),n(t,e.spheres.length-1),await b(),e.currentTab==="today"&&g()}catch(t){m("Ошибка: "+t.message)}}})}function m(i){const o=document.querySelector(".toast");o&&o.remove();const n=document.createElement("div");n.className="toast",n.textContent=i,document.body.appendChild(n),setTimeout(()=>n.remove(),2500)}$();
