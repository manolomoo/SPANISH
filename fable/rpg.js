/* 貴婦系統（全站共用）— 需先載入 rw.js。練習紀錄與💩仍由 rw.js 負責。 */
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
function migrate(){const d=ld();if(d.mig)return;const r=window.RW?RW.ld():{};let xp=0;const at={lis:0,spk:0,voc:0,gra:0};
 Object.entries(r.pm||{}).forEach(([k,n])=>{const[u,t]=k.split("|");const b=t==="quiz"?BASE.quizOk:BASE[t]||[5,2];const g=b[0]+(n-1)*b[1];xp+=g;const a=attrOf(t,u);if(a)at[a]+=g});
 (RW?RW.UNITS:[]).forEach(U=>{U.types.forEach(t=>{if(RW.tst(U.id,t)===2)xp+=BASE.crown[0]});if(RW.ust(U)===2)xp+=BASE.king[0]});
 const s=st();s.xp+=xp;Object.keys(at).forEach(a=>s.at[a]=(s.at[a]||0)+at[a]);s.mig=1;s.migXP=xp;sv(s)}
/* ===== 貴婦寶藏：累計 XP 到了就自動開箱（沒有商店、XP 不會被花掉）===== */
const CATS=[["bag","名牌包","👜"],["jewel","珠寶","💎"],["shoe","鞋子","👠"],["cloth","高訂","👗"],["art","名畫","🖼️"],["stock","股票","📈"],["house","房子","🏠"],["dog","狗狗","🐩"],["car","名車","🏎️"],["jet","遊艇／飛機","🛥️"]];
const W=1e4,Y=1e8;                                         // 萬、億（新台幣）
// 依 xp 由小到大排列；id 一旦上線就不要改。grow:1 = 股票，身價會隨累計 XP 增值（value 為基準價）
const TREASURES=[
 {id:"shoe-chanel-flat",xp:60,cat:"shoe",name:"香奈兒 雙色芭蕾平底鞋",value:3*W,ico:"🥿"},
 {id:"dog-maltese",xp:120,cat:"dog",name:"馬爾濟斯「棉花糖」",value:5*W,ico:"🐶"},
 {id:"jewel-tiffany-heart",xp:190,cat:"jewel",name:"Tiffany 愛心純銀手鍊",value:2*W,ico:"💝"},
 {id:"bag-gucci-marmont",xp:270,cat:"bag",name:"Gucci Marmont 鏈帶包",value:8*W,ico:"👛"},
 {id:"cloth-burberry-trench",xp:360,cat:"cloth",name:"Burberry 經典風衣",value:9*W,ico:"🧥"},
 {id:"shoe-jimmychoo",xp:460,cat:"shoe",name:"Jimmy Choo 水鑽高跟鞋",value:4*W,ico:"👠"},
 {id:"dog-poodle",xp:570,cat:"dog",name:"紅貴賓犬「可可」",value:6*W,ico:"🐩"},
 {id:"bag-lv-speedy",xp:690,cat:"bag",name:"LV Speedy 25 老花包",value:7*W,ico:"👜"},
 {id:"jewel-akoya-pearl",xp:820,cat:"jewel",name:"Akoya 珍珠項鍊",value:12*W,ico:"📿"},
 {id:"shoe-louboutin",xp:960,cat:"shoe",name:"Louboutin 紅底高跟鞋",value:5*W,ico:"👠"},
 {id:"cloth-chanel-tweed",xp:1100,cat:"cloth",name:"香奈兒 斜紋軟呢外套",value:28*W,ico:"🧥"},
 {id:"art-monet-print",xp:1250,cat:"art",name:"莫內《睡蓮》限量版畫",value:30*W,ico:"🖼️"},
 {id:"dog-shiba",xp:1400,cat:"dog",name:"柴犬「麻糬」",value:8*W,ico:"🐕"},
 {id:"stock-tsmc",xp:1560,cat:"stock",name:"台積電股票 1 張",value:110*W,ico:"📈",grow:1},
 {id:"bag-lady-dior",xp:1730,cat:"bag",name:"Dior Lady Dior 黛妃包",value:22*W,ico:"👜"},
 {id:"jewel-cartier-love",xp:1900,cat:"jewel",name:"Cartier Love 手環",value:25*W,ico:"💍"},
 {id:"shoe-manolo",xp:2080,cat:"shoe",name:"Manolo Blahnik 鑽扣緞面鞋",value:5*W,ico:"👡"},
 {id:"stock-nvidia",xp:2270,cat:"stock",name:"輝達 NVIDIA 股票 100 股",value:60*W,ico:"💹",grow:1},
 {id:"bag-chanel-cf",xp:2470,cat:"bag",name:"香奈兒 經典口蓋包",value:35*W,ico:"👜"},
 {id:"dog-frenchie",xp:2700,cat:"dog",name:"法國鬥牛犬「布丁」",value:10*W,ico:"🐶"},
 {id:"jewel-vca-alhambra",xp:2950,cat:"jewel",name:"梵克雅寶 四葉草項鍊",value:30*W,ico:"🍀"},
 {id:"cloth-dior-bar",xp:3200,cat:"cloth",name:"Dior Bar Jacket 套裝",value:45*W,ico:"👚"},
 {id:"shoe-roger-vivier",xp:3500,cat:"shoe",name:"Roger Vivier 水鑽方扣鞋",value:6*W,ico:"🥿"},
 {id:"bag-hermes-kelly",xp:3800,cat:"bag",name:"愛馬仕 Kelly 28 黑金",value:60*W,ico:"👜"},
 {id:"dog-corgi",xp:4100,cat:"dog",name:"柯基「吐司」",value:9*W,ico:"🐕"},
 {id:"art-kusama-pumpkin",xp:4450,cat:"art",name:"草間彌生《南瓜》版畫",value:150*W,ico:"🎃"},
 {id:"jewel-tiffany-diamond",xp:4800,cat:"jewel",name:"Tiffany 六爪鑽戒 2 克拉",value:180*W,ico:"💍"},
 {id:"stock-apple",xp:5200,cat:"stock",name:"蘋果 Apple 股票 100 股",value:80*W,ico:"🍎",grow:1},
 {id:"bag-hermes-birkin",xp:5600,cat:"bag",name:"愛馬仕 Birkin 30 金棕",value:90*W,ico:"👜"},
 {id:"car-porsche-911",xp:6000,cat:"car",name:"Porsche 911 Carrera",value:700*W,ico:"🚗"},
 {id:"cloth-valentino-gown",xp:6500,cat:"cloth",name:"Valentino 紅色晚禮服",value:60*W,ico:"👗"},
 {id:"art-vangogh-sketch",xp:7000,cat:"art",name:"梵谷 鳶尾花素描",value:800*W,ico:"🌻"},
 {id:"house-tokyo",xp:7500,cat:"house",name:"東京港區公寓",value:4500*W,ico:"🏙️"},
 {id:"dog-afghan",xp:8000,cat:"dog",name:"阿富汗獵犬「香檳」",value:20*W,ico:"🦮"},
 {id:"jewel-cartier-panthere",xp:8600,cat:"jewel",name:"Cartier 美洲豹鑽石胸針",value:600*W,ico:"🐆"},
 {id:"car-bentley",xp:9200,cat:"car",name:"Bentley Continental GT",value:1500*W,ico:"🚙"},
 {id:"cloth-haute-couture",xp:10000,cat:"cloth",name:"巴黎高訂晚禮服",value:300*W,ico:"👗"},
 {id:"car-ferrari",xp:11000,cat:"car",name:"Ferrari Roma",value:1800*W,ico:"🏎️"},
 {id:"house-xinyi",xp:12000,cat:"house",name:"信義區豪宅",value:2.8*Y,ico:"🏢"},
 {id:"bag-hermes-himalaya",xp:13200,cat:"bag",name:"愛馬仕 喜馬拉雅鱷魚皮 Birkin",value:1200*W,ico:"👜"},
 {id:"art-picasso",xp:14500,cat:"art",name:"畢卡索 肖像畫",value:3000*W,ico:"🎨"},
 {id:"car-lamborghini",xp:16000,cat:"car",name:"Lamborghini Revuelto",value:3000*W,ico:"🏎️"},
 {id:"stock-berkshire",xp:17500,cat:"stock",name:"波克夏 A 股 1 股",value:2000*W,ico:"💹",grow:1},
 {id:"house-london",xp:19000,cat:"house",name:"倫敦梅費爾聯排別墅",value:6*Y,ico:"🏛️"},
 {id:"car-rolls-royce",xp:20500,cat:"car",name:"Rolls-Royce Phantom",value:4500*W,ico:"🚘"},
 {id:"art-klimt",xp:22000,cat:"art",name:"克林姆 金箔仕女畫",value:2*Y,ico:"🖼️"},
 {id:"jewel-pink-diamond",xp:23500,cat:"jewel",name:"10 克拉粉紅鑽",value:3*Y,ico:"💎"},
 {id:"house-provence",xp:25000,cat:"house",name:"南法蔚藍海岸別墅",value:8*Y,ico:"🏡"},
 {id:"jet-riva",xp:27000,cat:"jet",name:"Riva 經典木質遊艇",value:1.2*Y,ico:"🚤"},
 {id:"art-monet-original",xp:29000,cat:"art",name:"莫內《睡蓮》真跡",value:25*Y,ico:"🖼️"},
 {id:"house-monaco",xp:31000,cat:"house",name:"摩納哥海景頂層公寓",value:12*Y,ico:"🏰"},
 {id:"jet-superyacht",xp:34000,cat:"jet",name:"60 米超級遊艇",value:15*Y,ico:"🛥️"},
 {id:"jet-g700",xp:38000,cat:"jet",name:"灣流 G700 私人飛機",value:25*Y,ico:"🛩️"}];
const catName=c=>(CATS.find(x=>x[0]===c)||[,""])[1];
const growPct=xp=>Math.round(Math.min(Math.max(xp,0),50000)/50000*80);       // 股票增值：每 625 XP +1%，上限 +80%
const trValue=(t,xp)=>t.grow?Math.round(t.value*(1+growPct(xp)/100)/1000)*1000:t.value;
const num=n=>Math.round(n).toLocaleString("en-US");
function money(n){const w=Math.round(n/W);if(w<1)return num(n)+" 元";const y=Math.floor(w/1e4),r=w%1e4;return y?num(y)+" 億"+(r?" "+num(r)+" 萬":""):num(w)+" 萬"}
const owned=xp=>TREASURES.filter(t=>xp>=t.xp);
const worth=xp=>owned(xp).reduce((a,t)=>a+trValue(t,xp),0);
const SAYINGS=["優雅不是天生的，是每天練出來的。","今天多念一句，包包就離妳近一點。","真正的貴婦，連動詞變化都很從容。","錢包可以空，西班牙文不能空。","下午茶之前，先來一輪回音法。","學語言和買包一樣：越早開始越划算。","台積電會漲，妳的西班牙文也會。","Una dama nunca deja de aprender. 貴婦永遠在學習。","今天的口說，是明天在馬德里點餐的底氣。","Poco a poco 慢慢來，豪宅也是一塊磚一塊磚蓋的。","狗狗在等妳下課，再念一遍就好。","氣質是存出來的，經驗值也是。"];
function saying(){const d=new Date(),n=Math.floor((Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()))/864e5);return SAYINGS[n%SAYINGS.length]}
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
.rp-mini{position:fixed;left:12px;bottom:12px;z-index:96;background:var(--cd,#fff);border:1px solid var(--ln);border-radius:16px;padding:6px;display:flex;align-items:center;gap:6px;box-shadow:0 4px 14px #0003;color:var(--fg);width:176px}
.rp-go{display:flex;align-items:center;gap:6px;flex:1 1 auto;min-width:0;color:inherit;text-decoration:none}
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
.rp-hint{margin:4px auto 0;padding:6px 12px;border-radius:99px;border:1px dashed #7c5cff;background:transparent;color:#7c5cff;font-weight:700;font-size:14px}
.rp-as-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.rp-as-h b{font-size:18px}.rp-as-h span{font-size:13px;color:var(--mu);white-space:nowrap}
.rp-as-v{font-size:26px;font-weight:900;margin:6px 0 8px;background:linear-gradient(90deg,#7c5cff,#f5b301);-webkit-background-clip:text;background-clip:text;color:transparent}
.rp-as-v small{font-size:13px;font-weight:700;color:var(--mu);margin-right:6px}
.rp-as-n{font-size:13px;color:var(--mu);margin-top:6px}.rp-as-q{font-size:13px;margin-top:8px;padding:8px 10px;border-radius:12px;border:1px dashed var(--ln);color:var(--fg)}
.rp-tabs{display:flex;gap:6px;overflow-x:auto;margin:12px -4px 10px;padding:0 4px 4px;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
.rp-tabs button{flex:0 0 auto;min-height:44px;min-width:44px;padding:0 12px;border-radius:99px;border:1px solid var(--ln);background:var(--cd);color:var(--fg);font:inherit;font-size:13px;font-weight:700;white-space:nowrap;cursor:pointer}
.rp-tabs button i{font-style:normal;font-weight:400;color:var(--mu);margin-left:4px;font-size:12px}.rp-tabs button.on{background:#7c5cff;border-color:#7c5cff;color:#fff}.rp-tabs button.on i{color:#fffc}
.rp-tg{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.rp-ti{border:1px solid var(--ln);border-radius:14px;padding:10px 6px 8px;text-align:center;min-width:0;position:relative}
.rp-ti .e{font-size:30px;line-height:1.2}.rp-ti .n{font-size:12px;font-weight:700;line-height:1.35;margin-top:4px;overflow-wrap:anywhere}.rp-ti .v{font-size:12px;color:#b07d00;font-weight:800;margin-top:3px}
.rp-ti .c{font-size:11px;color:var(--mu);margin-top:2px}.rp-ti .g{font-size:11px;color:#1a9a5a;font-weight:700}
.rp-ti.on{border-color:#f5b30188;background:linear-gradient(180deg,#f5b30114,transparent)}
.rp-ti.off{border-style:dashed}.rp-ti.off .e{filter:grayscale(1) contrast(0);opacity:.45}.rp-ti.off .n,.rp-ti.off .v{color:var(--mu);font-weight:600}
.rp-ti.nx{border-color:#7c5cff;border-style:solid}.rp-ti.nx .v{color:#7c5cff;font-weight:800}
@media(prefers-color-scheme:dark){.rp-ti .v{color:#f5c542}}
.rp-box{position:fixed;inset:0;z-index:102;display:flex;align-items:center;justify-content:center;background:#0009;padding:16px;animation:rpbf .25s ease}
.rp-box>div{background:var(--cd,#fff);color:var(--fg);border-radius:22px;padding:20px 22px 16px;text-align:center;border:3px solid #f5b301;box-shadow:0 0 0 4px #7c5cff55,0 12px 40px #0006;width:min(340px,100%);max-height:90vh;overflow:auto;animation:rpz .5s cubic-bezier(.2,1.6,.4,1)}
.rp-box .k{font-weight:900;font-size:22px;background:linear-gradient(90deg,#7c5cff,#f5b301);-webkit-background-clip:text;background-clip:text;color:transparent}
.rp-box .e{font-size:64px;line-height:1.2;margin:6px 0 2px}.rp-box .es{font-size:34px;line-height:1.3;margin:8px 0 4px;letter-spacing:2px}
.rp-box .n{font-size:19px;font-weight:900;line-height:1.35}.rp-box .c{font-size:13px;color:var(--mu);margin-top:4px}.rp-box .v{font-size:17px;font-weight:800;color:#b07d00;margin-top:6px}
.rp-box .l{font-size:13px;line-height:1.6;margin-top:6px;text-align:left}
.rp-box .bt{display:flex;gap:8px;justify-content:center;margin-top:14px}.rp-box button{min-height:44px;padding:0 18px;border-radius:99px;border:1px solid var(--ln);background:transparent;color:var(--fg);font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.rp-box button.go{background:#7c5cff;border-color:#7c5cff;color:#fff}
@media(prefers-color-scheme:dark){.rp-box .v{color:#f5c542}}
@keyframes rpbf{from{opacity:0}to{opacity:1}}
.rp-toast{position:fixed;left:12px;bottom:78px;z-index:101;display:flex;align-items:center;gap:8px;min-height:48px;max-width:min(300px,calc(100vw - 24px));padding:7px 14px 7px 10px;border-radius:16px;background:var(--cd,#fff);color:var(--fg);border:2px solid #f5b301;box-shadow:0 4px 16px #0004;cursor:pointer;animation:rptn .35s cubic-bezier(.2,1.5,.4,1)}
.rp-toast .e{font-size:28px;line-height:1;flex:0 0 auto}.rp-toast .x{min-width:0}.rp-toast small{display:block;font-size:11px;font-weight:800;color:#7c5cff}.rp-toast b{display:block;font-size:14px;line-height:1.3}.rp-toast em{display:block;font-style:normal;font-size:11px;color:var(--mu)}
.rp-toast.out{opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s}
@keyframes rptn{from{opacity:0;transform:translateY(14px) scale(.8)}to{opacity:1;transform:none}}`;
document.head.appendChild(css);
function beep(){try{const A=window.AudioContext||window.webkitAudioContext;const c=new A();[523,659,784,1047].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.type="triangle";o.frequency.value=f;g.gain.setValueAtTime(.0001,c.currentTime+i*.12);g.gain.exponentialRampToValueAtTime(.18,c.currentTime+i*.12+.02);g.gain.exponentialRampToValueAtTime(.0001,c.currentTime+i*.12+.3);o.connect(g).connect(c.destination);o.start(c.currentTime+i*.12);o.stop(c.currentTime+i*.12+.32)});setTimeout(()=>c.close(),1500)}catch(e){}}
function levelUp(L){const t=title(L),nw=ABIL.filter(a=>a.lv===L);const d=document.createElement("div");d.className="rp-up";
 d.innerHTML=`<div>${avatar(L,80)}<div style="font-weight:800;color:#7c5cff;margin-top:6px">晉級！</div><h2>Lv ${L}</h2><div style="font-size:20px;font-weight:800">${t[0]}｜${t[1]}</div>${nw.length?'<div style="margin-top:8px">解鎖：'+nw.map(a=>"<b>"+a.name+"</b>").join("、")+"</div>":""}</div>`;
 d.onclick=()=>d.remove();document.body.appendChild(d);setTimeout(()=>d.remove(),3300);beep();
 for(let k=0;k<20;k++){const c=document.createElement("span");c.className="rw-cf";c.textContent=["⭐","✨","💎","👜"][k%4];c.style.left=Math.random()*100+"vw";c.style.animationDelay=Math.random()*.5+"s";document.body.appendChild(c);setTimeout(()=>c.remove(),2600)}}
function pop(txt){const e=document.createElement("div");e.className="rp-xp";e.textContent=txt;document.body.appendChild(e);setTimeout(()=>e.remove(),1300)}
let homeEl=null;                                           // 首頁才有；單元頁用 mini
function confetti(n,z){for(let k=0;k<n;k++){const c=document.createElement("span");c.className="rw-cf";c.textContent=["💎","✨","👜","👠","🎁"][k%5];c.style.left=Math.random()*100+"vw";c.style.animationDelay=Math.random()*.5+"s";if(z)c.style.zIndex=z;document.body.appendChild(c);setTimeout(()=>c.remove(),3000)}}
function seeAll(){if(homeEl){const a=document.getElementById("assets");if(a&&a.scrollIntoView)a.scrollIntoView({behavior:"smooth",block:"start"})}else location.href="index.html#assets"}
// 開箱視窗（首頁、補開摘要）：點任何地方或「關閉」都會關，時間到自動關；一定移除節點，不鎖捲動、不碰音訊
function openBox(items,sum){document.querySelectorAll(".rp-box").forEach(x=>x.remove());if(!items.length)return;const xp=st().xp,d=document.createElement("div");d.className="rp-box";d.setAttribute("role","dialog");let h;
 if(items.length===1&&!sum){const t=items[0];h=`<div class="k">🎁 開箱！</div><div class="e">${t.ico}</div><div class="n">${t.name}</div><div class="c">${catName(t.cat)}${t.grow?"・會隨 XP 增值":""}</div><div class="v">身價 ${money(trValue(t,xp))}</div><div class="bt"><button type="button">關閉</button></div>`}
 else{const top=items.slice(-6),tot=items.reduce((a,t)=>a+trValue(t,xp),0);
  h=`<div class="k">🎁 開箱！</div><div class="n" style="margin-top:6px">${sum?"一次補開 "+items.length+" 件貴婦寶藏":"一次開出 "+items.length+" 件寶藏"}</div><div class="es">${top.map(t=>t.ico).join("")}${items.length>top.length?"…":""}</div>${items.length<=4?'<div class="l">'+items.map(t=>t.ico+" "+t.name+"（"+money(trValue(t,xp))+"）").join("<br>")+"</div>":sum?'<div class="c">之前累積的 XP 已自動換成寶藏，經驗值不會被花掉</div>':""}<div class="v">合計身價 ${money(tot)}</div><div class="bt"><button type="button" class="go">查看全部</button><button type="button">關閉</button></div>`}
 d.innerHTML="<div>"+h+"</div>";let tm=0;const close=()=>{clearTimeout(tm);d.remove()};d.onclick=close;
 const go=d.querySelector("button.go");if(go)go.onclick=e=>{e.stopPropagation();close();seeAll()};
 document.body.appendChild(d);tm=setTimeout(close,sum?(homeEl?6000:4000):3800);confetti(sum||items.length>1?18:14,103)}
// 單元頁：mini-HUD 上方的小吐司，不擋回音法按鈕，約 2.5 秒自動消失
function toast(items){document.querySelectorAll(".rp-toast").forEach(x=>x.remove());if(!items.length)return;const xp=st().xp,t=items[items.length-1],n=items.length,d=document.createElement("div");d.className="rp-toast";d.setAttribute("role","status");
 d.innerHTML=`<span class="e">${t.ico}</span><span class="x"><small>🎁 開箱！${n>1?"一次 "+n+" 件":catName(t.cat)}</small><b>${n>1?t.name+" 等 "+n+" 件":t.name}</b><em>身價 ${money(n>1?items.reduce((a,i)=>a+trValue(i,xp),0):trValue(t,xp))}</em></span>`;
 d.onclick=()=>d.remove();document.body.appendChild(d);setTimeout(()=>d.classList.add("out"),2300);setTimeout(()=>d.remove(),2600);confetti(6)}
// 檢查新開箱：第一次執行（舊玩家）把已達標的全部記為看過，只跳一次摘要；之後只對真正新的 id 動畫
function trCheck(delay){const s=st(),got=owned(s.xp);
 if(!s.trInit){s.trInit=1;s.trSeen=got.map(t=>t.id);sv(s);if(got.length)openBox(got,true);return got}
 const seen=Array.isArray(s.trSeen)?s.trSeen:[],nw=got.filter(t=>seen.indexOf(t.id)<0);if(!nw.length)return nw;
 s.trSeen=seen.concat(nw.map(t=>t.id));sv(s);const show=()=>mini?toast(nw):openBox(nw,false);if(delay)setTimeout(show,delay);else show();return nw}
function gain(o){const s=st();const L0=lvOf(s.xp).L;let b,lab=[];
 if(o.t==="quiz")b=o.ok?BASE.quizOk:BASE.quizBad;else b=BASE[o.t];if(!b)return;let x=o.isNew===false?b[1]:b[0];
 if(o.t==="quiz"){if(o.ok){s.combo++;s.best=Math.max(s.best,s.combo);const m=has(L0,"combo3")&&s.combo>=10?2:has(L0,"combo2")&&s.combo>=5?1.5:has(L0,"combo1")&&s.combo>=3?1.2:1;if(m>1){x*=m;lab.push("名媛社交 "+s.combo+" ×"+m)}}else s.combo=0}
 const a=attrOf(o.t,o.uid);if(a){const ab=attrBonus(s.at[a]);if(ab)x*=1+ab/100}
 const xb=has(L0,"xp20")?20:has(L0,"xp10")?10:0;if(xb)x*=1+xb/100;
 if(has(L0,"daily")&&s.day.n<10&&o.t!=="crown"&&o.t!=="king"){x*=2;lab.push("早午餐×2")}if(o.t!=="crown"&&o.t!=="king")s.day.n++;
 x=Math.max(1,Math.round(x));s.xp+=x;if(a)s.at[a]=(s.at[a]||0)+x;sv(s);
 pop("+"+x+" XP"+(lab.length?" "+lab.join(" "):""));const L1=lvOf(s.xp).L;if(L1>L0)setTimeout(()=>levelUp(L1),400);trCheck(L1>L0&&!mini?3600:0);drawMini();if(RPG.onChange)RPG.onChange()}
let mini=null;function drawMini(){if(!mini)return;const s=st(),v=lvOf(s.xp),t=title(v.L);mini.innerHTML=`<a class="rp-go" href="index.html#rpg">${avatar(v.L,30)}<div style="flex:1;min-width:0"><b>Lv ${v.L}</b> <span style="font-size:11px;color:var(--mu)">${t[1]}</span><div class="rp-bar"><i style="width:${Math.round(v.cur/v.nx*100)}%"></i></div></div></a>`}
function hints(){const s=st(),L=lvOf(s.xp).L;const max=has(L,"hint3")?3:has(L,"hint2")?2:has(L,"hint1")?1:0;return[max,Math.max(0,max-(s.day.h||0))]}
function hintUI(){const cfg=RW.cfg;if(!cfg||!cfg.qans)return;const qo=document.getElementById("qo");if(!qo)return;let b=document.getElementById("rphint");
 if(!b){b=document.createElement("button");b.id="rphint";b.className="rp-hint";qo.after(b);b.onclick=()=>{const[mx,left]=hints();if(!left)return;const s=st();const ans=cfg.qans();const bs=[...qo.querySelectorAll("button")].filter(x=>!x.disabled&&x.textContent!==ans);if(bs.length<2)return;const x=bs[Math.floor(Math.random()*bs.length)];x.disabled=true;x.style.opacity=.25;x.style.textDecoration="line-through";s.day.h++;sv(s);hintUI()}}
 const[mx,left]=hints();let answered=false;try{answered=!!eval("typeof pk!==\"undefined\"&&pk")}catch(e){}
 b.style.display=mx&&!answered?"":"none";b.disabled=!left;b.textContent="💡 提示（今天剩 "+left+"/"+mx+"）"}
function page(){migrate();mini=document.createElement("div");mini.className="rp-mini";document.body.appendChild(mini);drawMini();trCheck();
 window.addEventListener("rwx",e=>gain(e.detail));
 if(window.quiz){const q=window.quiz;window.quiz=function(){q.apply(this,arguments);hintUI()};hintUI()}}
let trTab="all";
function assetsHTML(s){const xp=s.xp,got=owned(xp),nx=TREASURES.find(t=>xp<t.xp),list=trTab==="all"?TREASURES:TREASURES.filter(t=>t.cat===trTab);
 const tabs=[["all","全部"]].concat(CATS).map(c=>{const a=c[0]==="all"?TREASURES:TREASURES.filter(t=>t.cat===c[0]);return `<button type="button" data-c="${c[0]}" class="${trTab===c[0]?"on":""}" aria-pressed="${trTab===c[0]}">${c[2]?c[2]+" ":""}${c[1]}<i>${a.filter(t=>xp>=t.xp).length}/${a.length}</i></button>`}).join("");
 const tiles=list.map(t=>xp>=t.xp?`<div class="rp-ti on"><div class="e">${t.ico}</div><div class="n">${t.name}</div><div class="v">${money(trValue(t,xp))}</div>${t.grow&&growPct(xp)?'<div class="g">📈 增值 +'+growPct(xp)+"%</div>":""}</div>`
  :`<div class="rp-ti off${t===nx?" nx":""}"><div class="e">${t.ico}</div><div class="n">？？？</div><div class="v">${t===nx?"還差 "+num(t.xp-xp)+" XP":"需 "+num(t.xp)+" XP"}</div><div class="c">${catName(t.cat)}</div></div>`).join("");
 return `<div class="rp-as-h"><b>👑 我的貴婦資產</b><span>已收藏 ${got.length}/${TREASURES.length}</span></div>
 <div class="rp-as-v"><small>總身價</small>${got.length?money(worth(xp)):"0 元"}</div>
 <div class="rp-bar"><i style="width:${Math.round(got.length/TREASURES.length*100)}%;background:linear-gradient(90deg,#7c5cff,#f5b301)"></i></div>
 <div class="rp-as-n">${nx?"下一件寶藏："+catName(nx.cat)+"・還差 "+num(nx.xp-xp)+" XP 自動開箱":"全部寶藏都收藏齊了，頂級貴婦就是妳！"}</div>
 <div class="rp-as-q">💬 今日貴婦小語：${saying()}</div>
 <div class="rp-tabs" role="group" aria-label="寶藏分類">${tabs}</div><div class="rp-tg">${tiles}</div>`}
function drawAssets(){const a=document.getElementById("assets");if(!a)return;const o=a.querySelector(".rp-tabs"),sl=o?o.scrollLeft:0;a.innerHTML=assetsHTML(st());const n=a.querySelector(".rp-tabs");if(n)n.scrollLeft=sl;
 n.onclick=e=>{const b=e.target.closest?e.target.closest("button[data-c]"):null;if(!b)return;trTab=b.getAttribute("data-c");drawAssets()}}
function home(el){migrate();homeEl=el;const draw=()=>{const s=st(),v=lvOf(s.xp),t=title(v.L);const[mx,left]=hints();const mxA=Math.max(1,...Object.keys(ATTR).map(a=>s.at[a]||0));
 el.innerHTML=`<div class="rp-card" id="rpg"><div class="rp-row">${avatar(v.L,64)}<div style="flex:1"><div style="font-size:13px;color:var(--mu)">💎 貴婦系統</div><div style="font-size:22px;font-weight:900">Lv ${v.L}　${t[0]}</div><div style="font-weight:700">${t[1]}</div></div></div>
 <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:10px;color:var(--mu)"><span>經驗值 ${v.cur} / ${v.nx}</span><span>總 XP ${s.xp}</span></div><div class="rp-bar"><i style="width:${Math.round(v.cur/v.nx*100)}%"></i></div>
 <div class="rp-at">${Object.entries(ATTR).map(([a,n])=>`<span>${n}</span><div class="rp-bar"><i style="width:${Math.round((s.at[a]||0)/mxA*100)}%;background:linear-gradient(90deg,#1a9a5a,#7ad38f)"></i></div><span style="font-size:12px">Lv${attrLv(s.at[a])} +${attrBonus(s.at[a])}%</span>`).join("")}</div>
 <div style="font-size:13px;margin-top:10px">今日：練習 ${s.day.n} 次${has(v.L,"daily")?"（早午餐加倍剩 "+Math.max(0,10-s.day.n)+" 次）":""}・提示 ${left}/${mx}・目前連續答對 ${s.combo}（最佳 ${s.best}）</div>
 <div class="rp-ab">${ABIL.map(a=>`<span class="${v.L>=a.lv?"on":"off"}" title="${a.desc}">${v.L>=a.lv?"✔":"🔒 Lv"+a.lv} ${a.name}</span>`).join("")}</div>
 <details class="rwr" style="margin-top:8px"><summary>升級規則</summary>
 XP：聽新卡 10（重聽 3）・答對 15（同題再答 8）・答錯 3・口說 12（重複 5）・吊人猜對 25・短文新句 8（重聽 3）・題型全部完成 +50・單元全部完成 +150。<br>
 屬性：聽卡／短文→聽力、口說→口說、吊人和單元 2 測驗→詞彙、其他測驗→文法。屬性每升 1 級，該類 XP +2%（上限 30%）。<br>
 能力：${ABIL.map(a=>"Lv"+a.lv+" "+a.name+"："+a.desc).join("；")}。<br>${s.migXP?"已把之前的💩和練習紀錄換算成 "+s.migXP+" XP。":""}<br>寶藏會依累計 XP 自動開箱，經驗值不會被花掉。</details></div><div class="rp-card" id="assets"></div>`;drawAssets()};draw();RPG.onChange=draw;trCheck()}
window.RPG={page,home,st,lvOf,need,gain,hints,TITLES,ABIL,TREASURES,CATS,trValue,money,worth};
})();
