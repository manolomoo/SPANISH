/* 貴婦系統（全站共用）— 需先載入 rw.js。黑狗徽章與💩仍由 rw.js 負責。 */
(function(){
const K="esLadyRPG1";let MEM=null;
const ld=()=>{try{const v=localStorage.getItem(K);if(v)return JSON.parse(v)}catch(e){}return MEM||{}};
const sv=d=>{MEM=d;try{localStorage.setItem(K,JSON.stringify(d))}catch(e){}};
const TITLES=[["Chica","小資女"],["Señorita","氣質小姐"],["Dama Elegante","優雅淑女"],["Fashionista","時尚達人"],["Socialité","社交名媛"],["Señora","豪門太太"],["Dama de Sociedad","上流貴婦"],["Coleccionista","精品收藏家"],["Mecenas","慈善名流"],["Duquesa","公爵夫人"],["Reina Social","社交女王"],["Gran Dama","頂級貴婦"]];
const need=L=>Math.round(60*Math.pow(L,1.45));            // Lv L → L+1 所需 XP
function lvOf(xp){let L=1,r=xp;while(r>=need(L)){r-=need(L);L++}return{L,cur:r,nx:need(L)}}
const title=L=>TITLES[Math.min(L,TITLES.length)-1];
const ABIL=[
 {lv:2,id:"daily",name:"早午餐加倍",desc:"每天前 10 次練習 XP ×2"},
 {lv:3,id:"hint1",name:"管家提示 ×1",desc:"小測驗每天可用 1 次「💡 提示」刪掉一個錯誤選項"},
 {lv:4,id:"combo1",name:"名媛社交 I",desc:"連續答對 3 題起，答題 XP ×1.2"},
 {lv:5,id:"bronze",name:"玫瑰金項鍊",desc:"項鍊與頭像框解鎖：玫瑰金"},
 {lv:6,id:"hint2",name:"管家提示 ×2",desc:"每天提示增為 2 次"},
 {lv:6,id:"xp10",name:"珍珠加成 +10%",desc:"所有 XP +10%"},
 {lv:8,id:"combo2",name:"名媛社交 II",desc:"連續答對 5 題起，答題 XP ×1.5"},
 {lv:8,id:"silver",name:"白金項鍊",desc:"項鍊與頭像框解鎖：白金"},
 {lv:10,id:"hint3",name:"管家提示 ×3",desc:"每天提示增為 3 次"},
 {lv:10,id:"xp20",name:"珍珠加成 +20%",desc:"所有 XP +20%（取代 +10%）"},
 {lv:10,id:"cool",name:"墨鏡登場",desc:"頭像造型解鎖：墨鏡"},
 {lv:10,id:"gold",name:"鑽石項鍊",desc:"項鍊與頭像框解鎖：金鑽"},
 {lv:12,id:"combo3",name:"名媛社交 III",desc:"連續答對 10 題起，答題 XP ×2"},
 {lv:12,id:"crown",name:"貴婦后冠",desc:"頭像造型解鎖：后冠"}];
const has=(L,id)=>ABIL.some(a=>a.id===id&&L>=a.lv);
const ATTR={lis:"聽力",spk:"口說",voc:"詞彙",gra:"文法"};
const attrOf=(t,uid)=>t==="cards"||t==="story"?"lis":t==="speak"?"spk":t==="hang"?"voc":t==="quiz"?(uid==="u2"?"voc":"gra"):null;
const BASE={cards:[10,3],story:[8,3],speak:[12,5],hang:[25,15],quizOk:[15,8],quizBad:[3,3],crown:[50,50],king:[150,150]};
const today=()=>new Date().toLocaleDateString("sv");
const attrLv=p=>Math.floor(Math.sqrt((p||0)/10));          // 屬性等級
const attrBonus=p=>Math.min(attrLv(p)*2,30);                 // 每屬性等級 +2% 該類 XP，上限 30%
function st(){const d=ld();d.xp=d.xp||0;d.at=d.at||{};d.day=d.day||{};if(d.day.d!==today())d.day={d:today(),n:0,h:0};d.combo=d.combo||0;d.best=d.best||0;return d}
const SHOP=[
 {id:"bag-pink",slot:"bag",name:"粉紅手提包",price:120,ico:"👛"},
 {id:"bag-black",slot:"bag",name:"黑色鏈條包",price:180,ico:"👜"},
 {id:"bag-gold",slot:"bag",name:"金色晚宴包",price:260,ico:"💰"},
 {id:"heel-red",slot:"heels",name:"紅色高跟鞋",price:80,ico:"👠"},
 {id:"heel-nude",slot:"heels",name:"裸色高跟鞋",price:80,ico:"👡"},
 {id:"heel-white",slot:"heels",name:"白色高跟鞋",price:80,ico:"🥿"},
 {id:"neck-pearl",slot:"necklace",name:"珍珠項鍊",price:140,ico:"📿"},
 {id:"neck-ruby",slot:"necklace",name:"紅寶石項鍊",price:140,ico:"♦️"},
 {id:"ring-dia",slot:"ring",name:"鑽石戒指",price:220,ico:"💍"},
 {id:"sun-cat",slot:"shades",name:"貓眼墨鏡",price:150,ico:"🕶️"},
 {id:"sun-rose",slot:"shades",name:"玫瑰金墨鏡",price:150,ico:"😎"},
 {id:"hat-sun",slot:"hat",name:"寬邊遮陽帽",price:150,ico:"👒"},
 {id:"hat-fas",slot:"hat",name:"黑紗小禮帽",price:150,ico:"🎩"},
 {id:"tea-eng",slot:"tea",name:"英式下午茶",price:90,ico:"🫖"},
 {id:"tea-mac",slot:"tea",name:"馬卡龍下午茶",price:90,ico:"🧁"},
 {id:"f-rose",slot:"frame",name:"玫瑰金頭像框",price:160,ico:"🌹"},
 {id:"f-purple",slot:"frame",name:"紫水晶頭像框",price:160,ico:"🔮"},
 {id:"e-soc",slot:"entrance",name:"登場稱號・社交名媛",price:200,ico:"🥂"},
 {id:"e-queen",slot:"entrance",name:"登場稱號・派對女王",price:360,ico:"🎉"},
 {id:"hint",slot:"token",name:"管家提示券 ×1",price:50,ico:"💡"}];
const SLOTN={bag:"手提包",heels:"高跟鞋",necklace:"珠寶",ring:"珠寶",shades:"墨鏡",hat:"帽子",tea:"下午茶",frame:"頭像框",entrance:"稱號",token:"測驗提示"};
const COLL=SHOP.filter(x=>x.slot!=="token");
const shopItem=id=>SHOP.find(x=>x.id===id);
function balOf(s){return Math.max(0,(s.xp||0)-(s.spent||0))}
function owned(s,id){return (s.own||[]).indexOf(id)>=0}
function collHTML(s){const o=COLL.filter(it=>owned(s,it.id));return `<div class="rp-coll"><b>我的收藏 ${o.length}/${COLL.length}</b>${o.length?`<span class="ic">${o.map(it=>`<span title="${it.name}">${it.ico}</span>`).join("")}</span>`:'<span style="color:var(--mu)">尚未收藏</span>'}</div>`}
function migrate(){const d=ld();if(d.mig)return;const r=window.RW?RW.ld():{};let xp=0;const at={lis:0,spk:0,voc:0,gra:0};
 Object.entries(r.pm||{}).forEach(([k,n])=>{const[u,t]=k.split("|");const b=t==="quiz"?BASE.quizOk:BASE[t]||[5,2];const g=b[0]+(n-1)*b[1];xp+=g;const a=attrOf(t,u);if(a)at[a]+=g});
 (RW?RW.UNITS:[]).forEach(U=>{U.types.forEach(t=>{if(RW.tst(U.id,t)===2)xp+=BASE.crown[0]});if(RW.ust(U)===2)xp+=BASE.king[0]});
 const s=st();s.xp+=xp;Object.keys(at).forEach(a=>s.at[a]=(s.at[a]||0)+at[a]);s.mig=1;s.migXP=xp;sv(s)}
function avatar(L,sz){sz=sz||56;
 const SK="#f7d6c1",HR="#5b3a29",DR="#7c5cff";
 const bag="#e23d45",trim="#b4232c";
 // 項鍊：依等級（玫瑰金→白金→鑽石），預設細鍊
 const nk=has(L,"gold")?{c:"#f5b301",e:"#c78a00",gem:"#bfe9ff"}:has(L,"silver")?{c:"#e6eaf0",e:"#98a1b0"}:has(L,"bronze")?{c:"#e8a798",e:"#b9705f"}:null;
 const NP=[[25.6,45.6],[27.3,47.6],[29.5,49],[32,49.5],[34.5,49],[36.7,47.6],[38.4,45.6]];
 const neck=nk?NP.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="1.5" fill="${nk.c}" stroke="${nk.e}" stroke-width=".6"/>`).join("")+(nk.gem?`<path d="M30 51h4l1.2 1.5-3.2 3.3-3.2-3.300z" fill="${nk.gem}" stroke="${nk.e}" stroke-width=".7" stroke-linejoin="round"/>`:""):'<path d="M25.5 45.500q6.5 7 13 0" fill="none" stroke="#c9ccd6" stroke-width="1"/>';
 const sh=has(L,"cool")?{lens:"#16171c",rim:"#16171c"}:null;
 const shades=sh?`<path d="M22.5 23.500h8.300l-.8 3.600q-.5 1.9-2.4 1.900h-2.300q-2 0-2.4-1.900zM33.2 23.500h8.300l-.4 3.600q-.4 1.9-2.4 1.900h-2.300q-1.9 0-2.4-1.900z" fill="${sh.lens}" stroke="${sh.rim}" stroke-width="1.1" stroke-linejoin="round"/><path d="M30.8 24.300h2.4" stroke="${sh.rim}" stroke-width="1.2"/>`:'<circle cx="27.8" cy="26" r="1.2" fill="#3a2a2a"/><circle cx="36.2" cy="26" r="1.2" fill="#3a2a2a"/><path d="M25.8 23.600q2-1.3 4-.3M34.2 23.300q2-1 4 .3" fill="none" stroke="#5b3a29" stroke-width=".8" stroke-linecap="round"/>';
 const hat=`<circle cx="32" cy="8.5" r="5.2" fill="${HR}"/>`;
 const crown=L>=12&&has(L,"crown")?'<path d="M22.5 15.500l1.5-8 4.5 4.5 3.5-7.5 3.5 7.5 4.5-4.5 1.5 8z" fill="#f5b301" stroke="#c78a00" stroke-width="1" stroke-linejoin="round"/><circle cx="32" cy="5" r="1.6" fill="#e8463a"/><circle cx="27.8" cy="13" r="1" fill="#fff"/><circle cx="32" cy="13" r="1" fill="#bfe9ff"/><circle cx="36.2" cy="13" r="1" fill="#fff"/>':"";
 const bagSvg=`<path d="M46 46.500c0-7 8.5-7 8.5 0" fill="none" stroke="${trim}" stroke-width="1.8"/><rect x="42.5" y="46" width="15.5" height="11.5" rx="2.6" fill="${bag}" stroke="${trim}" stroke-width="1"/><path d="M42.8 50.200h15" stroke="${trim}" stroke-width="1"/><rect x="48.7" y="48.7" width="3.2" height="3.2" rx=".8" fill="#ffe08a" stroke="${trim}" stroke-width=".6"/>`;
 const svg=`<svg viewBox="0 0 64 64" width="${sz}" height="${sz}" aria-hidden="true"><path d="M19.5 26c0-9.5 5.5-15 12.5-15s12.5 5.5 12.5 15c0 6 1 12 3.5 17h-32c2.5-5 3.5-11 3.5-17z" fill="${HR}"/><path d="M12.5 64c0-11 8-17 19.5-17s19.5 6 19.5 17z" fill="${DR}"/><path d="M28.5 34h7v11.500h-7z" fill="${SK}"/><path d="M24 46.600q8 9.5 16 0-8-2.2-16 0z" fill="${SK}"/><ellipse cx="32" cy="25.5" rx="9.3" ry="10.3" fill="${SK}"/><path d="M22 25c.5-8.5 5.5-12 10-12s9.5 3.5 10 12c-4.5-1.5-8-4.5-10-8-2 3.5-5.5 6.5-10 8z" fill="${HR}"/><circle cx="22.9" cy="30.5" r="1.3" fill="#fffdf6" stroke="#b9ad94" stroke-width=".5"/><circle cx="41.1" cy="30.5" r="1.3" fill="#fffdf6" stroke="#b9ad94" stroke-width=".5"/><circle cx="26.3" cy="30" r="1.7" fill="#ff9aa8" opacity=".45"/><circle cx="37.7" cy="30" r="1.7" fill="#ff9aa8" opacity=".45"/><path d="M29.3 31.800q2.7 2.3 5.4 0q-2.7-1-5.4 0z" fill="#d6336c" stroke="#d6336c" stroke-width=".8" stroke-linejoin="round"/>${shades}${neck}${hat}${crown}${bagSvg}</svg>`;
 const fr=has(L,"gold")?"#f5b301":has(L,"silver")?"#b8c0cc":has(L,"bronze")?"#e0958a":"var(--ln)";
 return `<span class="rp-av" style="width:${sz+10}px;height:${sz+10}px;border-color:${fr}">${svg}</span>`}
const css=document.createElement("style");css.textContent=`
.rp-av{display:inline-flex;align-items:center;justify-content:center;border:4px solid;border-radius:50%;background:var(--cd,#fff);flex:0 0 auto}
.rp-bar{height:10px;border-radius:99px;background:var(--ln);overflow:hidden}.rp-bar i{display:block;height:100%;background:linear-gradient(90deg,#7c5cff,#2f6fed);border-radius:99px;transition:width .6s}
.rp-mini{position:fixed;left:12px;bottom:12px;z-index:96;background:var(--cd,#fff);border:1px solid var(--ln);border-radius:16px;padding:6px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;box-shadow:0 4px 14px #0003;color:var(--fg);width:176px}
.rp-go{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;color:inherit;text-decoration:none}
.rp-shopbtn{flex:1 0 100%;min-height:44px;margin:2px;border:0;border-radius:12px;background:var(--ac,#2f6fed);color:#fff;font-weight:800;font-size:16px}
.rp-mini .rp-av{border-width:3px}.rp-mini b{font-size:13px}.rp-mini .rp-bar{height:7px;margin-top:3px}
.rp-shop{margin-top:12px;display:flex;flex-direction:column;gap:8px}.rp-shop h3{margin:0;font-size:18px}
.rp-it{border:1px solid var(--ln);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px}
.rp-it .nm{display:flex;justify-content:space-between;gap:8px;font-size:16px;font-weight:800}
.rp-it button{min-height:44px;border-radius:10px;border:1px solid var(--ln);background:var(--cd,#fff);color:var(--fg);font-size:16px;font-weight:800}
.rp-it button.buy{background:var(--ac,#2f6fed);color:#fff;border-color:transparent}.rp-it button:disabled{opacity:.45}
.rp-coll{border:1px dashed var(--ln);border-radius:12px;padding:10px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:15px}.rp-coll .ic{font-size:22px;letter-spacing:2px;line-height:1.3}.rp-it .own{font-size:15px;font-weight:800;color:#1a9a5a}
.rp-sheet{position:fixed;inset:0;z-index:120;background:#0008;display:flex;align-items:flex-end;justify-content:center}
.rp-sheet .rp-box{background:var(--cd,#fff);color:var(--fg);width:min(560px,100%);max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px 16px 28px}
.rp-sheet .x{min-height:44px;min-width:72px;border-radius:10px;border:1px solid var(--ln);background:var(--cd,#fff);color:var(--fg);font-weight:800;font-size:16px}
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
 d.innerHTML=`<div>${avatar(L,80)}<div style="font-weight:800;color:#7c5cff;margin-top:6px">晉級！</div><h2>Lv ${L}</h2><div style="font-size:20px;font-weight:800">${t[0]}｜${t[1]}</div>${nw.length?'<div style="margin-top:8px">解鎖：'+nw.map(a=>"<b>"+a.name+"</b>").join("、")+"</div>":""}</div>`;
 d.onclick=()=>d.remove();document.body.appendChild(d);setTimeout(()=>d.remove(),3300);beep();
 for(let k=0;k<20;k++){const c=document.createElement("span");c.className="rw-cf";c.textContent=["⭐","✨","💎","👜"][k%4];c.style.left=Math.random()*100+"vw";c.style.animationDelay=Math.random()*.5+"s";document.body.appendChild(c);setTimeout(()=>c.remove(),2600)}}
function pop(txt){const e=document.createElement("div");e.className="rp-xp";e.textContent=txt;document.body.appendChild(e);setTimeout(()=>e.remove(),1300)}
function gain(o){const s=st();const L0=lvOf(s.xp).L;let b,lab=[];
 if(o.t==="quiz")b=o.ok?BASE.quizOk:BASE.quizBad;else b=BASE[o.t];if(!b)return;let x=o.isNew===false?b[1]:b[0];
 if(o.t==="quiz"){if(o.ok){s.combo++;s.best=Math.max(s.best,s.combo);const m=has(L0,"combo3")&&s.combo>=10?2:has(L0,"combo2")&&s.combo>=5?1.5:has(L0,"combo1")&&s.combo>=3?1.2:1;if(m>1){x*=m;lab.push("名媛社交 "+s.combo+" ×"+m)}}else s.combo=0}
 const a=attrOf(o.t,o.uid);if(a){const ab=attrBonus(s.at[a]);if(ab)x*=1+ab/100}
 const xb=has(L0,"xp20")?20:has(L0,"xp10")?10:0;if(xb)x*=1+xb/100;
 if(has(L0,"daily")&&s.day.n<10&&o.t!=="crown"&&o.t!=="king"){x*=2;lab.push("早午餐×2")}if(o.t!=="crown"&&o.t!=="king")s.day.n++;
 x=Math.max(1,Math.round(x));s.xp+=x;if(a)s.at[a]=(s.at[a]||0)+x;sv(s);
 pop("+"+x+" XP"+(lab.length?" "+lab.join(" "):""));const L1=lvOf(s.xp).L;if(L1>L0)setTimeout(()=>levelUp(L1),400);drawMini();if(RPG.onChange)RPG.onChange()}
let mini=null;function drawMini(){if(!mini)return;const s=st(),v=lvOf(s.xp),t=title(v.L);mini.innerHTML=`<a class="rp-go" href="index.html#rpg">${avatar(v.L,30)}<div style="flex:1;min-width:0"><b>Lv ${v.L}</b> <span style="font-size:11px;color:var(--mu)">${t[1]}</span><div class="rp-bar"><i style="width:${Math.round(v.cur/v.nx*100)}%"></i></div></div></a><button type="button" class="rp-shopbtn">貴婦精品店</button>`;
 mini.querySelector(".rp-shopbtn").onclick=e=>{e.preventDefault();e.stopPropagation();openShop()}}
function hints(){const s=st(),L=lvOf(s.xp).L;const max=has(L,"hint3")?3:has(L,"hint2")?2:has(L,"hint1")?1:0;return[max,Math.max(0,max-(s.day.h||0))]}
function hintUI(){const cfg=RW.cfg;if(!cfg||!cfg.qans)return;const qo=document.getElementById("qo");if(!qo)return;let b=document.getElementById("rphint");
 if(!b){b=document.createElement("button");b.id="rphint";b.className="rp-hint";qo.after(b);b.onclick=()=>{const[mx,left]=hints();const s=st();const tok=s.hintTok||0;if(!left&&!tok)return;const ans=cfg.qans();const bs=[...qo.querySelectorAll("button")].filter(x=>!x.disabled&&x.textContent!==ans);if(bs.length<2)return;const x=bs[Math.floor(Math.random()*bs.length)];x.disabled=true;x.style.opacity=.25;x.style.textDecoration="line-through";if(left)s.day.h++;else s.hintTok=tok-1;sv(s);hintUI()}}
 const[mx,left]=hints();const tok=st().hintTok||0;let answered=false;try{answered=!!eval("typeof pk!==\"undefined\"&&pk")}catch(e){}
 b.style.display=(mx||tok)&&!answered?"":"none";b.disabled=!(left||tok);b.textContent=tok?"💡 提示（今天剩 "+left+"/"+mx+"・道具 "+tok+"）":"💡 提示（今天剩 "+left+"/"+mx+"）"}
function shopBody(){const s=st(),bal=balOf(s);
 const rows=SHOP.map(it=>{const ok=bal>=it.price,buyBtn=`<button class="buy" data-buy="${it.id}" ${ok?"":"disabled"}>${ok?"購買":"經驗值不足"}</button>`;
  if(it.slot==="token")return `<div class="rp-it"><div class="nm"><span>${it.ico} ${it.name}</span><span>${it.price} XP</span></div><div style="font-size:13px;color:var(--mu)">持有 ${s.hintTok||0}。每日提示用完後，可在小測驗消耗。</div>${buyBtn}</div>`;
  const hasIt=owned(s,it.id);
  return `<div class="rp-it"><div class="nm"><span>${it.ico} ${it.name}</span><span>${hasIt?"":it.price+" XP"}</span></div><div style="font-size:13px;color:var(--mu)">${SLOTN[it.slot]||""}</div>${hasIt?'<div class="own">✔ 已擁有</div>':buyBtn}</div>`}).join("");
 return `<div style="font-size:14px;color:var(--mu)">可花經驗值 <b>${bal}</b>・總 XP ${s.xp||0}。花掉的經驗不會降低等級。買到的精品會放進收藏。</div>${collHTML(s)}${rows}`}
function wireShop(root){if(!root)return;root.querySelectorAll("[data-buy]").forEach(b=>b.onclick=()=>buy(b.getAttribute("data-buy")))}
function paintSheet(){const sh=document.getElementById("rpshop");if(!sh)return;const body=sh.querySelector(".rp-shopbody");body.innerHTML=`<div class="rp-shop">${shopBody()}</div>`;wireShop(body)}
function openShop(){let sh=document.getElementById("rpshop");if(!sh){sh=document.createElement("div");sh.id="rpshop";sh.className="rp-sheet";sh.innerHTML='<div class="rp-box"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px"><b style="font-size:18px">貴婦精品店</b><button type="button" class="x">關閉</button></div><div class="rp-shopbody"></div></div>';sh.querySelector(".x").onclick=()=>sh.remove();sh.addEventListener("click",e=>{if(e.target===sh)sh.remove()});document.body.appendChild(sh)}paintSheet()}
function afterShop(){drawMini();if(RPG.onChange)RPG.onChange();paintSheet()}
function buy(id){const it=shopItem(id);if(!it)return;const s=st(),spent=s.spent||0,bal=balOf(s);if(bal<it.price)return;if(it.slot==="token"){s.spent=spent+it.price;s.hintTok=(s.hintTok||0)+1;sv(s);afterShop();return}if(owned(s,id))return;s.spent=spent+it.price;s.own=(s.own||[]).concat(id);sv(s);afterShop()}
function page(){migrate();mini=document.createElement("div");mini.className="rp-mini";document.body.appendChild(mini);drawMini();
 window.addEventListener("rwx",e=>gain(e.detail));
 if(window.quiz){const q=window.quiz;window.quiz=function(){q.apply(this,arguments);hintUI()};hintUI()}}
function home(el){migrate();const draw=()=>{const s=st(),v=lvOf(s.xp),t=title(v.L);const[mx,left]=hints();const mxA=Math.max(1,...Object.keys(ATTR).map(a=>s.at[a]||0));
 el.innerHTML=`<div class="rp-card" id="rpg"><div class="rp-row">${avatar(v.L,64)}<div style="flex:1"><div style="font-size:13px;color:var(--mu)">💎 貴婦系統</div><div style="font-size:22px;font-weight:900">Lv ${v.L}　${t[0]}</div><div style="font-weight:700">${t[1]}</div></div></div>
 <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:10px;color:var(--mu)"><span>經驗值 ${v.cur} / ${v.nx}</span><span>總 XP ${s.xp}</span></div><div class="rp-bar"><i style="width:${Math.round(v.cur/v.nx*100)}%"></i></div>
 <div class="rp-at">${Object.entries(ATTR).map(([a,n])=>`<span>${n}</span><div class="rp-bar"><i style="width:${Math.round((s.at[a]||0)/mxA*100)}%;background:linear-gradient(90deg,#1a9a5a,#7ad38f)"></i></div><span style="font-size:12px">Lv${attrLv(s.at[a])} +${attrBonus(s.at[a])}%</span>`).join("")}</div>
 <div style="font-size:13px;margin-top:10px">今日：練習 ${s.day.n} 次${has(v.L,"daily")?"（早午餐加倍剩 "+Math.max(0,10-s.day.n)+" 次）":""}・提示 ${left}/${mx}・目前連續答對 ${s.combo}（最佳 ${s.best}）</div>
 <div class="rp-ab">${ABIL.map(a=>`<span class="${v.L>=a.lv?"on":"off"}" title="${a.desc}">${v.L>=a.lv?"✔":"🔒 Lv"+a.lv} ${a.name}</span>`).join("")}</div>
 <div class="rp-shop"><h3 id="shop">貴婦精品店</h3>${shopBody()}</div>
 <details class="rwr" style="margin-top:8px"><summary>升級規則</summary>
 XP：聽新卡 10（重聽 3）・答對 15（同題再答 8）・答錯 3・口說 12（重複 5）・吊人猜對 25・短文新句 8（重聽 3）・題型戴皇冠 +50・單元黑狗王 +150。<br>
 屬性：聽卡／短文→聽力、口說→口說、吊人和單元 2 測驗→詞彙、其他測驗→文法。屬性每升 1 級，該類 XP +2%（上限 30%）。<br>
 能力：${ABIL.map(a=>"Lv"+a.lv+" "+a.name+"："+a.desc).join("；")}。<br>${s.migXP?"已把之前的💩和徽章換算成 "+s.migXP+" XP。":""}</details></div>`;wireShop(el)};draw();RPG.onChange=draw}
window.RPG={page,home,st,lvOf,need,gain,hints,TITLES,ABIL};
})();
