/* 黑狗 RPG 升級系統（全站共用）— 需先載入 rw.js */
(function(){
const K="esRPG1";let MEM=null;
const ld=()=>{try{const v=localStorage.getItem(K);if(v)return JSON.parse(v)}catch(e){}return MEM||{}};
const sv=d=>{MEM=d;try{localStorage.setItem(K,JSON.stringify(d))}catch(e){}};
const TITLES=[["Cachorro","幼犬"],["Perrito","小狗"],["Perro Curioso","好奇狗"],["Perro Estudiante","學生狗"],["Perro Explorador","探險狗"],["Perro Valiente","勇敢狗"],["Perro Sabio","智慧狗"],["Perro Caballero","騎士狗"],["Perro Capitán","隊長狗"],["Perro Maestro","大師狗"],["Gran Perro Negro","大黑狗"],["Rey Perro","黑狗王"]];
const need=L=>Math.round(60*Math.pow(L,1.45));            // Lv L → L+1 所需 XP
function lvOf(xp){let L=1,r=xp;while(r>=need(L)){r-=need(L);L++}return{L,cur:r,nx:need(L)}}
const title=L=>TITLES[Math.min(L,TITLES.length)-1];
const ABIL=[
 {lv:2,id:"daily",name:"晨練加倍",desc:"每天前 10 次練習 XP ×2"},
 {lv:3,id:"hint1",name:"嗅覺提示 ×1",desc:"小測驗每天可用 1 次「💡 提示」刪掉一個錯誤選項"},
 {lv:4,id:"combo1",name:"連擊 Combo I",desc:"連續答對 3 題起，答題 XP ×1.2"},
 {lv:5,id:"bronze",name:"銅色項圈",desc:"頭像框解鎖：銅"},
 {lv:6,id:"hint2",name:"嗅覺提示 ×2",desc:"每天提示增為 2 次"},
 {lv:6,id:"xp10",name:"勤學 +10%",desc:"所有 XP +10%"},
 {lv:8,id:"combo2",name:"連擊 Combo II",desc:"連續答對 5 題起，答題 XP ×1.5"},
 {lv:8,id:"silver",name:"銀色項圈",desc:"頭像框解鎖：銀"},
 {lv:10,id:"hint3",name:"嗅覺提示 ×3",desc:"每天提示增為 3 次"},
 {lv:10,id:"xp20",name:"勤學 +20%",desc:"所有 XP +20%（取代 +10%）"},
 {lv:10,id:"cool",name:"墨鏡黑狗",desc:"狗狗造型解鎖：墨鏡"},
 {lv:10,id:"gold",name:"金色項圈",desc:"頭像框解鎖：金"},
 {lv:12,id:"combo3",name:"連擊 Combo III",desc:"連續答對 10 題起，答題 XP ×2"},
 {lv:12,id:"crown",name:"黑狗王冠",desc:"狗狗造型解鎖：皇冠"}];
const has=(L,id)=>ABIL.some(a=>a.id===id&&L>=a.lv);
const ATTR={lis:"聽力",spk:"口說",voc:"詞彙",gra:"文法"};
const attrOf=(t,uid)=>t==="cards"||t==="story"?"lis":t==="speak"?"spk":t==="hang"?"voc":t==="quiz"?(uid==="u2"?"voc":"gra"):null;
const BASE={cards:[10,3],story:[8,3],speak:[12,5],hang:[25,15],quizOk:[15,8],quizBad:[3,3],crown:[50,50],king:[150,150]};
const today=()=>new Date().toLocaleDateString("sv");
const attrLv=p=>Math.floor(Math.sqrt((p||0)/10));          // 屬性等級
const attrBonus=p=>Math.min(attrLv(p)*2,30);                 // 每屬性等級 +2% 該類 XP，上限 30%
function st(){const d=ld();d.xp=d.xp||0;d.at=d.at||{};d.day=d.day||{};if(d.day.d!==today())d.day={d:today(),n:0,h:0};d.combo=d.combo||0;d.best=d.best||0;return d}
function migrate(){const d=ld();if(d.mig)return;const r=window.RW?RW.ld():{};let xp=0;const at={lis:0,spk:0,voc:0,gra:0};
 Object.entries(r.pm||{}).forEach(([k,n])=>{const[u,t]=k.split("|");const b=t==="quiz"?BASE.quizOk:BASE[t]||[5,2];const g=b[0]+(n-1)*b[1];xp+=g;const a=attrOf(t,u);if(a)at[a]+=g});
 (RW?RW.UNITS:[]).forEach(U=>{U.types.forEach(t=>{if(RW.tst(U.id,t)===2)xp+=BASE.crown[0]});if(RW.ust(U)===2)xp+=BASE.king[0]});
 const s=st();s.xp+=xp;Object.keys(at).forEach(a=>s.at[a]=(s.at[a]||0)+at[a]);s.mig=1;s.migXP=xp;sv(s)}
function avatar(L,sz){sz=sz||56;let svg=RW.dog(L>=12&&has(L,"crown")?2:1,sz);
 if(has(L,"cool"))svg=svg.replace("</svg>",'<g><rect x="18" y="28" width="12" height="8" rx="3" fill="#111" stroke="#555"/><rect x="34" y="28" width="12" height="8" rx="3" fill="#111" stroke="#555"/><path d="M30 31h4" stroke="#555" stroke-width="2"/><path d="M20 30l6 0" stroke="#fff" stroke-width="1" opacity=".6"/></g></svg>');
 const fr=has(L,"gold")?"#f5b301":has(L,"silver")?"#b8c0cc":has(L,"bronze")?"#c47b3a":"var(--ln)";
 return `<span class="rp-av" style="width:${sz+10}px;height:${sz+10}px;border-color:${fr}">${svg}</span>`}
const css=document.createElement("style");css.textContent=`
.rp-av{display:inline-flex;align-items:center;justify-content:center;border:4px solid;border-radius:50%;background:var(--cd,#fff);flex:0 0 auto}
.rp-bar{height:10px;border-radius:99px;background:var(--ln);overflow:hidden}.rp-bar i{display:block;height:100%;background:linear-gradient(90deg,#7c5cff,#2f6fed);border-radius:99px;transition:width .6s}
.rp-mini{position:fixed;left:12px;bottom:12px;z-index:96;background:var(--cd,#fff);border:1px solid var(--ln);border-radius:16px;padding:4px 10px 6px 4px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px #0003;color:var(--fg);text-decoration:none;width:150px}
.rp-mini .rp-av{border-width:3px}.rp-mini b{font-size:13px}.rp-mini .rp-bar{height:7px;margin-top:3px}
.rp-xp{position:fixed;left:40px;bottom:64px;z-index:97;font-weight:900;font-size:20px;color:#7c5cff;pointer-events:none;animation:rpx 1.3s ease forwards;text-shadow:0 1px 0 #fff}
@keyframes rpx{0%{opacity:0;transform:translateY(10px) scale(.7)}20%{opacity:1;transform:translateY(0) scale(1.15)}100%{opacity:0;transform:translateY(-70px)}}
.rp-up{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;background:#0008;animation:rpf 3.2s ease forwards}
.rp-up>div{background:var(--cd,#fff);color:var(--fg);border-radius:22px;padding:22px 26px;text-align:center;border:3px solid #7c5cff;max-width:86vw;animation:rpz .5s cubic-bezier(.2,1.6,.4,1)}
.rp-up h2{margin:6px 0;font-size:30px;background:linear-gradient(90deg,#7c5cff,#f5b301);-webkit-background-clip:text;color:transparent}
@keyframes rpz{from{transform:scale(.2) rotate(-8deg)}to{transform:scale(1)}}@keyframes rpf{0%,85%{opacity:1}100%{opacity:0;visibility:hidden}}
.rp-card{background:var(--cd);border:1px solid var(--ln);border-radius:18px;padding:16px;margin-bottom:16px}
.rp-row{display:flex;gap:12px;align-items:center}.rp-at{display:grid;grid-template-columns:44px 1fr 64px;gap:6px 8px;align-items:center;font-size:14px;margin-top:12px}
.rp-ab{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.rp-ab span{font-size:12px;padding:4px 8px;border-radius:99px;border:1px solid var(--ln)}.rp-ab .on{background:#7c5cff;color:#fff;border-color:#7c5cff}.rp-ab .off{color:var(--mu);opacity:.75}
.rp-hint{margin:4px auto 0;padding:6px 12px;border-radius:99px;border:1px dashed #7c5cff;background:transparent;color:#7c5cff;font-weight:700;font-size:14px}`;
document.head.appendChild(css);
function beep(){try{const A=window.AudioContext||window.webkitAudioContext;const c=new A();[523,659,784,1047].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(.0001,c.currentTime+i*.12);g.gain.exponentialRampToValueAtTime(.18,c.currentTime+i*.12+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+i*.12+.3);o.connect(g).connect(c.destination);o.start(c.currentTime+i*.12);o.stop(c.currentTime+i*.12+.32)});setTimeout(()=>c.close(),1500)}catch(e){}}
function levelUp(L){const t=title(L),nw=ABIL.filter(a=>a.lv===L);const d=document.createElement("div");d.className="rp-up";
 d.innerHTML=`<div>${avatar(L,80)}<div style="font-weight:800;color:#7c5cff;margin-top:6px">LEVEL UP!</div><h2>Lv ${L}</h2><div style="font-size:20px;font-weight:800">${t[0]}｜${t[1]}</div>${nw.length?'<div style="margin-top:8px">解鎖：'+nw.map(a=>"<b>"+a.name+"</b>").join("、")+"</div>":""}</div>`;
 d.onclick=()=>d.remove();document.body.appendChild(d);setTimeout(()=>d.remove(),3300);beep();
 for(let k=0;k<20;k++){const c=document.createElement("span");c.className="rw-cf";c.textContent=["⭐","✨","🐾","💜"][k%4];c.style.left=Math.random()*100+"vw";c.style.animationDelay=Math.random()*.5+"s";document.body.appendChild(c);setTimeout(()=>c.remove(),2600)}}
function pop(txt){const e=document.createElement("div");e.className="rp-xp";e.textContent=txt;document.body.appendChild(e);setTimeout(()=>e.remove(),1300)}
function gain(o){const s=st();const L0=lvOf(s.xp).L;let b,lab=[];
 if(o.t==="quiz")b=o.ok?BASE.quizOk:BASE.quizBad;else b=BASE[o.t];if(!b)return;let x=o.isNew===false?b[1]:b[0];
 if(o.t==="quiz"){if(o.ok){s.combo++;s.best=Math.max(s.best,s.combo);const m=has(L0,"combo3")&&s.combo>=10?2:has(L0,"combo2")&&s.combo>=5?1.5:has(L0,"combo1")&&s.combo>=3?1.2:1;if(m>1){x*=m;lab.push("Combo "+s.combo+" ×"+m)}}else s.combo=0}
 const a=attrOf(o.t,o.uid);if(a){const ab=attrBonus(s.at[a]);if(ab)x*=1+ab/100}
 const xb=has(L0,"xp20")?20:has(L0,"xp10")?10:0;if(xb)x*=1+xb/100;
 if(has(L0,"daily")&&s.day.n<10&&o.t!=="crown"&&o.t!=="king"){x*=2;lab.push("晨練×2")}if(o.t!=="crown"&&o.t!=="king")s.day.n++;
 x=Math.max(1,Math.round(x));s.xp+=x;if(a)s.at[a]=(s.at[a]||0)+x;sv(s);
 pop("+"+x+" XP"+(lab.length?" "+lab.join(" "):""));const L1=lvOf(s.xp).L;if(L1>L0)setTimeout(()=>levelUp(L1),400);drawMini();if(RPG.onChange)RPG.onChange()}
let mini=null;function drawMini(){if(!mini)return;const s=st(),v=lvOf(s.xp),t=title(v.L);mini.innerHTML=`${avatar(v.L,30)}<div style="flex:1;min-width:0"><b>Lv ${v.L}</b> <span style="font-size:11px;color:var(--mu)">${t[1]}</span><div class="rp-bar"><i style="width:${Math.round(v.cur/v.nx*100)}%"></i></div></div>`}
function hints(){const s=st(),L=lvOf(s.xp).L;const max=has(L,"hint3")?3:has(L,"hint2")?2:has(L,"hint1")?1:0;return[max,Math.max(0,max-s.day.h)]}
function hintUI(){const cfg=RW.cfg;if(!cfg||!cfg.qans)return;const qo=document.getElementById("qo");if(!qo)return;let b=document.getElementById("rphint");
 if(!b){b=document.createElement("button");b.id="rphint";b.className="rp-hint";qo.after(b);b.onclick=()=>{const[mx,left]=hints();if(!left)return;const ans=cfg.qans();const bs=[...qo.querySelectorAll("button")].filter(x=>!x.disabled&&x.textContent!==ans);if(bs.length<2)return;const x=bs[Math.floor(Math.random()*bs.length)];x.disabled=true;x.style.opacity=.25;x.style.textDecoration="line-through";const s=st();s.day.h++;sv(s);hintUI()}}
 const[mx,left]=hints();let answered=false;try{answered=!!eval("typeof pk!==\"undefined\"&&pk")}catch(e){}
 b.style.display=mx&&!answered?"":"none";b.disabled=!left;b.textContent="💡 提示（今天剩 "+left+"/"+mx+"）"}
function page(){migrate();mini=document.createElement("a");mini.className="rp-mini";mini.href="index.html#rpg";document.body.appendChild(mini);drawMini();
 window.addEventListener("rwx",e=>gain(e.detail));
 if(window.quiz){const q=window.quiz;window.quiz=function(){q.apply(this,arguments);hintUI()};hintUI()}}
function home(el){migrate();const draw=()=>{const s=st(),v=lvOf(s.xp),t=title(v.L);const[mx,left]=hints();const mxA=Math.max(1,...Object.keys(ATTR).map(a=>s.at[a]||0));
 el.innerHTML=`<div class="rp-card" id="rpg"><div class="rp-row">${avatar(v.L,64)}<div style="flex:1"><div style="font-size:13px;color:var(--mu)">我的黑狗角色</div><div style="font-size:22px;font-weight:900">Lv ${v.L}　${t[0]}</div><div style="font-weight:700">${t[1]}</div></div></div>
 <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:10px;color:var(--mu)"><span>經驗值 ${v.cur} / ${v.nx}</span><span>總 XP ${s.xp}</span></div><div class="rp-bar"><i style="width:${Math.round(v.cur/v.nx*100)}%"></i></div>
 <div class="rp-at">${Object.entries(ATTR).map(([a,n])=>`<span>${n}</span><div class="rp-bar"><i style="width:${Math.round((s.at[a]||0)/mxA*100)}%;background:linear-gradient(90deg,#1a9a5a,#7ad38f)"></i></div><span style="font-size:12px">Lv${attrLv(s.at[a])} +${attrBonus(s.at[a])}%</span>`).join("")}</div>
 <div style="font-size:13px;margin-top:10px">今日：練習 ${s.day.n} 次${has(v.L,"daily")?"（晨練加倍剩 "+Math.max(0,10-s.day.n)+" 次）":""}・提示 ${left}/${mx}・目前連擊 ${s.combo}（最佳 ${s.best}）</div>
 <div class="rp-ab">${ABIL.map(a=>`<span class="${v.L>=a.lv?"on":"off"}" title="${a.desc}">${v.L>=a.lv?"✔":"🔒 Lv"+a.lv} ${a.name}</span>`).join("")}</div>
 <details class="rwr" style="margin-top:8px"><summary>升級規則</summary>
 XP：聽新卡 10（重聽 3）・答對 15（同題再答 8）・答錯 3・口說 12（重複 5）・吊人猜對 25・短文新句 8（重聽 3）・題型戴皇冠 +50・單元黑狗王 +150。<br>
 屬性：聽卡／短文→聽力、口說→口說、吊人和單元 2 測驗→詞彙、其他測驗→文法。屬性每升 1 級，該類 XP +2%（上限 30%）。<br>
 能力：${ABIL.map(a=>"Lv"+a.lv+" "+a.name+"："+a.desc).join("；")}。<br>${s.migXP?"已把之前的💩和徽章換算成 "+s.migXP+" XP。":""}</details></div>`};draw();RPG.onChange=draw}
window.RPG={page,home,st,lvOf,need,gain,hints,TITLES,ABIL};
})();
