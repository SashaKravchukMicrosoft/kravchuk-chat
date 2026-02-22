  Sentry.init({
    dsn: "https://a1c62d99ef214633b2852cc684b66f49@app.glitchtip.com/20613",

    // отключаем трейсинг — нужен только сбор ошибок
    tracesSampleRate: 0,

    environment: "production",

    beforeSend(event) {
      return {
        userPhone: localStorage.getItem('myPhone') || undefined,
      };
    }
  });

  // ловим глобальные ошибки
  window.onerror = function (msg, url, lineNo, columnNo, error) {
    Sentry.captureException(error || msg);
  };

  // ловим unhandled promise rejections
  window.onunhandledrejection = function (event) {
    Sentry.captureException(event.reason);
  };

// helper: create WebSocket and attach Sentry breadcrumbs/handlers
function createLoggedWebSocket(url, tag){
    try{
        const ws = new WebSocket(url);
        try{ Sentry.addBreadcrumb({ category: 'ws', message: `create ${tag} ${url}`, level: 'info' }); }catch(e){}
        ws.addEventListener('open', ()=>{ try{ Sentry.addBreadcrumb({ category: 'ws', message: `open ${tag} ${url}`, level: 'info' }); }catch(e){} });
        ws.addEventListener('error', (ev)=>{
            try{
                Sentry.addBreadcrumb({ category: 'ws', message: `error ${tag} ${url}`, level: 'error' });
                Sentry.captureException(new Error(`WebSocket error (${tag}) ${url}`));
            }catch(e){}
        });
        ws.addEventListener('close', (ev)=>{
            try{
                Sentry.addBreadcrumb({ category: 'ws', message: `close ${tag} ${url} code=${ev.code} reason=${ev.reason||''}`, level: 'warning' });
                if(ev && ev.code && ev.code !== 1000){
                    Sentry.captureMessage(`WebSocket closed (${tag}) ${url} code=${ev.code} reason=${ev.reason||''}`);
                }
            }catch(e){}
        });
        return ws;
    }catch(err){
        try{ Sentry.captureException(err); }catch(e){}
        throw err;
    }
}

// ===== MINIMAL INLINE MD5 (RFC 1321) =====
function md5(str){
    function safeAdd(x,y){const lsw=(x&0xffff)+(y&0xffff);return(((x>>16)+(y>>16)+(lsw>>16))<<16)|(lsw&0xffff);}
    function bitRotl(num,cnt){return(num<<cnt)|(num>>>(32-cnt));}
    function md5cmn(q,a,b,x,s,t){return safeAdd(bitRotl(safeAdd(safeAdd(a,q),safeAdd(x,t)),s),b);}
    function md5ff(a,b,c,d,x,s,t){return md5cmn((b&c)|((~b)&d),a,b,x,s,t);}
    function md5gg(a,b,c,d,x,s,t){return md5cmn((b&d)|(c&(~d)),a,b,x,s,t);}
    function md5hh(a,b,c,d,x,s,t){return md5cmn(b^c^d,a,b,x,s,t);}
    function md5ii(a,b,c,d,x,s,t){return md5cmn(c^(b|(~d)),a,b,x,s,t);}
    function str2blks(str){
        const nblk=((str.length+8)>>6)+1,blks=new Array(nblk*16).fill(0);
        for(let i=0;i<str.length;i++)blks[i>>2]|=str.charCodeAt(i)<<((i%4)*8);
        blks[str.length>>2]|=0x80<<((str.length%4)*8);
        blks[nblk*16-2]=str.length*8;
        return blks;
    }
    const x=str2blks(unescape(encodeURIComponent(str)));
    let a=0x67452301,b=0xefcdab89,c=0x98badcfe,d=0x10325476;
    for(let i=0;i<x.length;i+=16){
        const [oa,ob,oc,od]=[a,b,c,d];
        a=md5ff(a,b,c,d,x[i+0],7,-680876936);b=md5ff(d,a,b,c,x[i+1],12,-389564586);
        c=md5ff(c,d,a,b,x[i+2],17,606105819);d=md5ff(b,c,d,a,x[i+3],22,-1044525330);
        a=md5ff(a,b,c,d,x[i+4],7,-176418897);b=md5ff(d,a,b,c,x[i+5],12,1200080426);
        c=md5ff(c,d,a,b,x[i+6],17,-1473231341);d=md5ff(b,c,d,a,x[i+7],22,-45705983);
        a=md5ff(a,b,c,d,x[i+8],7,1770035416);b=md5ff(d,a,b,c,x[i+9],12,-1958414417);
        c=md5ff(c,d,a,b,x[i+10],17,-42063);d=md5ff(b,c,d,a,x[i+11],22,-1990404162);
        a=md5ff(a,b,c,d,x[i+12],7,1804603682);b=md5ff(d,a,b,c,x[i+13],12,-40341101);
        c=md5ff(c,d,a,b,x[i+14],17,-1502002290);d=md5ff(b,c,d,a,x[i+15],22,1236535329);
        a=md5gg(a,b,c,d,x[i+1],5,-165796510);b=md5gg(d,a,b,c,x[i+6],9,-1069501632);
        c=md5gg(c,d,a,b,x[i+11],14,643717713);d=md5gg(b,c,d,a,x[i+0],20,-373897302);
        a=md5gg(a,b,c,d,x[i+5],5,-701558691);b=md5gg(d,a,b,c,x[i+10],9,38016083);
        c=md5gg(c,d,a,b,x[i+15],14,-660478335);d=md5gg(b,c,d,a,x[i+4],20,-405537848);
        a=md5gg(a,b,c,d,x[i+9],5,568446438);b=md5gg(d,a,b,c,x[i+14],9,-1019803690);
        c=md5gg(c,d,a,b,x[i+3],14,-187363961);d=md5gg(b,c,d,a,x[i+8],20,1163531501);
        a=md5gg(a,b,c,d,x[i+13],5,-1444681467);b=md5gg(d,a,b,c,x[i+2],9,-51403784);
        c=md5gg(c,d,a,b,x[i+7],14,1735328473);d=md5gg(b,c,d,a,x[i+12],20,-1926607734);
        a=md5hh(a,b,c,d,x[i+5],4,-378558);b=md5hh(d,a,b,c,x[i+8],11,-2022574463);
        c=md5hh(c,d,a,b,x[i+11],16,1839030562);d=md5hh(b,c,d,a,x[i+14],23,-35309556);
        a=md5hh(a,b,c,d,x[i+1],4,-1530992060);b=md5hh(d,a,b,c,x[i+4],11,1272893353);
        c=md5hh(c,d,a,b,x[i+7],16,-155497632);d=md5hh(b,c,d,a,x[i+10],23,-1094730640);
        a=md5hh(a,b,c,d,x[i+13],4,681279174);b=md5hh(d,a,b,c,x[i+0],11,-358537222);
        c=md5hh(c,d,a,b,x[i+3],16,-722521979);d=md5hh(b,c,d,a,x[i+6],23,76029189);
        a=md5hh(a,b,c,d,x[i+9],4,-640364487);b=md5hh(d,a,b,c,x[i+12],11,-421815835);
        c=md5hh(c,d,a,b,x[i+15],16,530742520);d=md5hh(b,c,d,a,x[i+2],23,-995338651);
        a=md5ii(a,b,c,d,x[i+0],6,-198630844);b=md5ii(d,a,b,c,x[i+7],10,1126891415);
        c=md5ii(c,d,a,b,x[i+14],15,-1416354905);d=md5ii(b,c,d,a,x[i+5],21,-57434055);
        a=md5ii(a,b,c,d,x[i+12],6,1700485571);b=md5ii(d,a,b,c,x[i+3],10,-1894986606);
        c=md5ii(c,d,a,b,x[i+10],15,-1051523);d=md5ii(b,c,d,a,x[i+1],21,-2054922799);
        a=md5ii(a,b,c,d,x[i+8],6,1873313359);b=md5ii(d,a,b,c,x[i+15],10,-30611744);
        c=md5ii(c,d,a,b,x[i+6],15,-1560198380);d=md5ii(b,c,d,a,x[i+13],21,1309151649);
        a=md5ii(a,b,c,d,x[i+4],6,-145523070);b=md5ii(d,a,b,c,x[i+11],10,-1120210379);
        c=md5ii(c,d,a,b,x[i+2],15,718787259);d=md5ii(b,c,d,a,x[i+9],21,-343485551);
        a=safeAdd(a,oa);b=safeAdd(b,ob);c=safeAdd(c,oc);d=safeAdd(d,od);
    }
    return[a,b,c,d].map(n=>(n>>>0).toString(16).padStart(8,'0').match(/../g).map(x=>x[1]+x[0]).join('')).join('');
}

let pc, localStream, ws, usingFrontCamera = true;
const CLIENT_ID = Math.random().toString(36).substring(2,9);
let hasSentOffer = false;
let joinInterval = null;
let EXPECTED_WS_CLOSE = false; // when true, suppress normal ws close log
let WS_WAS_OPEN = false; // true if ws.onopen has fired for current socket
let reconnectAttempts = 0;
const MAX_RECONNECT = 3;
const isMobile = (('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.innerWidth < 768);

// ===== INCOMING CALL NOTIFICATION GLOBALS =====
let notifWs = null;
let notifWsReconnectTimer = null;
let notifWsReconnectAttempts = 0;
let notifWsHeartbeat = null;
let notifWsOpenStableTimer = null;
let notifWsPermanentFail = false; // set when server reports unrecoverable error (e.g. unknown api key)
const MAX_NOTIF_RECONNECT_DELAY = 30000;
// Track active outgoing call notification repeaters so we can stop them when call starts
const activeOutgoingNotifications = new Map(); // callSignature -> { stop(), subroom, calleeNumber }
let activeIncomingCall = null; // { callSignature, callerNumber, callerAlias, subroom, cluster }
const seenCallSignatures = new Set();
let activeNotification = null;
let localMini = null;
let isSwapped = false;

// Personal channel ownership keys: prevents multiple windows from simultaneously
// owning the personal notification socket for the same user. We use a
// localStorage-based owner record plus a heartbeat so other windows can
// acquire ownership if the owner goes away.
const NOTIF_OWNER_KEY = 'kc_notif_owner';
let notifOwnerHeartbeat = null;
let isNotifOwner = false;

function startNotifOwnerHeartbeat(){
    stopNotifOwnerHeartbeat();
    try{ localStorage.setItem(NOTIF_OWNER_KEY, JSON.stringify({owner: CLIENT_ID, ts: Date.now()})); }catch(e){}
    notifOwnerHeartbeat = setInterval(()=>{
        try{ localStorage.setItem(NOTIF_OWNER_KEY, JSON.stringify({owner: CLIENT_ID, ts: Date.now()})); }catch(e){}
    },15000);
}
function stopNotifOwnerHeartbeat(){ if(notifOwnerHeartbeat){ clearInterval(notifOwnerHeartbeat); notifOwnerHeartbeat = null; } }
function releaseNotifOwnership(){
    try{
        const raw = localStorage.getItem(NOTIF_OWNER_KEY);
        if(raw){ const obj = JSON.parse(raw); if(obj && obj.owner===CLIENT_ID) localStorage.removeItem(NOTIF_OWNER_KEY); }
    }catch(e){}
    stopNotifOwnerHeartbeat();
    isNotifOwner = false;
}
function tryAcquireNotifOwnership(){
    try{
        const raw = localStorage.getItem(NOTIF_OWNER_KEY);
        const now = Date.now();
        if(raw){
            const obj = JSON.parse(raw);
            // owner considered stale if last ts older than 30s
            if(obj && obj.owner && obj.ts && (now - obj.ts) < 30000 && obj.owner !== CLIENT_ID) return false;
        }
        localStorage.setItem(NOTIF_OWNER_KEY, JSON.stringify({owner: CLIENT_ID, ts: now}));
        isNotifOwner = true;
        startNotifOwnerHeartbeat();
        return true;
    }catch(e){ console.warn('tryAcquireNotifOwnership failed',e); return false; }
}
const remoteVideo = document.getElementById('remoteVideo');
const statusText = document.getElementById('status');
const switchCamBtn = document.getElementById('switchCamBtn');
const micSelect = document.getElementById('micSelect');
const outputSelect = document.getElementById('outputSelect');
const micToggle = document.getElementById('micToggle');
const outputToggle = document.getElementById('outputToggle');
const hangupBtn = document.getElementById('hangupBtn');
const refreshBtn = document.getElementById('refreshBtn');

const roomSelect = document.getElementById('roomSelect');
const roomThumb = document.getElementById('roomThumb');

// ===== PHONE / STATE MACHINE GLOBALS =====
let APP_STATE = 'setup';
let dialedNumber = '';
const setupScreen        = document.getElementById('setupScreen');
const dialpadScreen      = document.getElementById('dialpadScreen');
const myPhoneInput       = document.getElementById('myPhoneInput');
const setupSubmitBtn     = document.getElementById('setupSubmitBtn');
const dialDisplayText    = document.getElementById('dialDisplayText');
const dialpadMyNum       = document.getElementById('dialpadMyNum');
const contactPickerBtn   = document.getElementById('contactPickerBtn');
const callBtn            = document.getElementById('callBtn');
const backspaceBtn       = document.getElementById('backspaceBtn');
const historyShortcutBtn = document.getElementById('historyShortcutBtn');
const burgerBtn          = document.getElementById('burgerBtn');
const burgerPanel        = document.getElementById('burgerPanel');
const burgerOverlay      = document.getElementById('burgerOverlay');
const burgerClose        = document.getElementById('burgerClose');
const panelMyNum         = document.getElementById('panelMyNum');
const callHistoryList    = document.getElementById('callHistoryList');
const changeNumberBtn    = document.getElementById('changeNumberBtn');
// Hide switch button on desktop immediately
try{ if(!isMobile && switchCamBtn) switchCamBtn.style.display = 'none'; }catch(e){}
// Hidden audio element to always play remote audio (prevents losing sound when swapping video elements)
const remoteAudio = document.createElement('audio');
remoteAudio.autoplay = true;
remoteAudio.style.display = 'none';
document.body.appendChild(remoteAudio);

function log(msg){ statusText.innerText = msg; }

function getRoomFromURL(){
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if(!room){
        console.warn('[room] No room specified in URL — not auto-generating one.');
        return null;
    }
    return room;
}

function getSubroomFromURL(){
    const params = new URLSearchParams(window.location.search);
    let sub = params.get('subroom');
    if(!sub){
        // default to first logical subroom later when rooms populated
        return null;
    }
    return sub;
}

// composite room string used for signaling scoping (cluster + subroom)
function getCompositeRoom(){
    const cluster = CLUSTER || getRoomFromURL();
    const sub = SUBROOM || '';
    return `${cluster}:${sub}`;
}

function getTurnFromURL(){
    const params = new URLSearchParams(window.location.search);
    const host = params.get('turnHost') || 'free.expressturn.com:3478';
    const username = params.get('turnUser');
    const credential = params.get('turnPass');
    return { host, username, credential };
}

async function startCamera(){
    if(localStream){
        localStream.getTracks().forEach(t=>t.stop());
    }
    const constraints = {
        video: {facingMode: usingFrontCamera ? 'user' : 'environment'},
        audio: true
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    // ensure mini preview exists and set its source
    if(!localMini) createLocalMini();
    if(!isSwapped){
        localMini.srcObject = localStream;
        // mirror only when using front camera
        localMini.style.transform = usingFrontCamera ? 'scaleX(-1)' : 'scaleX(1)';
    } else {
        // if swapped, main remoteVideo shows local preview — keep video muted to avoid echo
        remoteVideo.srcObject = localStream;
        remoteVideo.muted = true;
        // ensure main (large) video is not mirrored
        remoteVideo.style.transform = 'scaleX(1)';
    }
}

function initPeer(){
    const turn = getTurnFromURL();
    const iceServers = [
        // Google STUNs
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        // Common public STUNs
        { urls: 'stun:stun.ekiga.net:3478' },
        { urls: 'stun:stun.ideasip.com:3478' },
        { urls: 'stun:stun.rixtelecom.se:3478' },
        { urls: 'stun:stun.schlund.de:3478' },
        { urls: 'stun:stun.stunprotocol.org:3478' },
        { urls: 'stun:stun.voiparound.com:3478' },
        { urls: 'stun:stun.voipbuster.com:3478' },
        { urls: 'stun:stun.voipstunt.com:3478' },
        { urls: 'stun:stun.voxgratia.org:3478' },
        // Example IP / other STUNs
        { urls: 'stun:23.21.150.121:3478' },
        { urls: 'stun:iphone-stun.strato-iphone.de:3478' },
        { urls: 'stun:numb.viagenie.ca:3478' },
        { urls: 'stun:s1.taraba.net:3478' },
        { urls: 'stun:s2.taraba.net:3478' },
        { urls: 'stun:stun.12connect.com:3478' },
        { urls: 'stun:stun.12voip.com:3478' },
        { urls: 'stun:stun.1und1.de:3478' },
        { urls: 'stun:stun.2talk.co.nz:3478' },
        { urls: 'stun:stun.2talk.com:3478' },
        { urls: 'stun:stun.3clogic.com:3478' },
        { urls: 'stun:stun.3cx.com:3478' },
        { urls: 'stun:stun.a-mm.tv:3478' },
        { urls: 'stun:stun.aa.net.uk:3478' },
        { urls: 'stun:stun.acrobits.cz:3478' },
        { urls: 'stun:stun.actionvoip.com:3478' },
        { urls: 'stun:stun.advfn.com:3478' },
        { urls: 'stun:stun.aeta-audio.com:3478' },
        { urls: 'stun:stun.aeta.com:3478' },
        { urls: 'stun:stun.alltel.com.au:3478' },
        { urls: 'stun:stun.altar.com.pl:3478' },
        { urls: 'stun:stun.annatel.net:3478' },
        { urls: 'stun:stun.antisip.com:3478' },
        { urls: 'stun:stun.arbuz.ru:3478' },
        { urls: 'stun:stun.avigora.com:3478' },
        { urls: 'stun:stun.avigora.fr:3478' },
        { urls: 'stun:stun.awa-shima.com:3478' },
        { urls: 'stun:stun.awt.be:3478' },
        { urls: 'stun:stun.b2b2c.ca:3478' },
        { urls: 'stun:stun.bahnhof.net:3478' },
        { urls: 'stun:stun.barracuda.com:3478' },
        { urls: 'stun:stun.bluesip.net:3478' },
        { urls: 'stun:stun.budgetphone.nl:3478' },
        { urls: 'stun:stun.budgetsip.com:3478' },
        { urls: 'stun:stun.cablenet-as.net:3478' },
        { urls: 'stun:stun.callromania.ro:3478' },
        { urls: 'stun:stun.callwithus.com:3478' },
        { urls: 'stun:stun.chathelp.ru:3478' },
        { urls: 'stun:stun.cheapvoip.com:3478' },
        { urls: 'stun:stun.ciktel.com:3478' },
        { urls: 'stun:stun.cloopen.com:3478' },
        { urls: 'stun:stun.colouredlines.com.au:3478' },
        { urls: 'stun:stun.comfi.com:3478' },
        { urls: 'stun:stun.commpeak.com:3478' },
        { urls: 'stun:stun.comtube.com:3478' },
        { urls: 'stun:stun.comtube.ru:3478' },
        { urls: 'stun:stun.cope.es:3478' },
        { urls: 'stun:stun.counterpath.com:3478' },
        { urls: 'stun:stun.counterpath.net:3478' },
        { urls: 'stun:stun.doublerobotics.com:3478' },
        { urls: 'stun:stun.duocom.es:3478' },
        { urls: 'stun:stun.dus.net:3478' },
        { urls: 'stun:stun.e-fon.ch:3478' },
        { urls: 'stun:stun.easybell.de:3478' },
        { urls: 'stun:stun.easycall.pl:3478' },
        { urls: 'stun:stun.easyvoip.com:3478' },
        { urls: 'stun:stun.einsundeins.de:3478' },
        { urls: 'stun:stun.epygi.com:3478' },
        { urls: 'stun:stun.eyeball.com:3478' },
        { urls: 'stun:stun.faktortel.com.au:3478' },
        { urls: 'stun:stun.freecall.com:3478' },
        { urls: 'stun:stun.freeswitch.org:3478' },
        { urls: 'stun:stun.freevoipdeal.com:3478' },
        { urls: 'stun:stun.fuzemeeting.com:3478' },
        { urls: 'stun:stun.gmx.de:3478' },
        { urls: 'stun:stun.gmx.net:3478' },
        { urls: 'stun:stun.gradwell.com:3478' },
        { urls: 'stun:stun.halonet.pl:3478' },
        { urls: 'stun:stun.hoiio.com:3478' },
        { urls: 'stun:stun.hosteurope.de:3478' },
        { urls: 'stun:stun.internetcalls.com:3478' },
        { urls: 'stun:stun.intervoip.com:3478' },
        { urls: 'stun:stun.ipcomms.net:3478' },
        { urls: 'stun:stun.ipfire.org:3478' },
        { urls: 'stun:stun.ippi.fr:3478' },
        { urls: 'stun:stun.iptel.org:3478' },
        { urls: 'stun:stun.jumblo.com:3478' },
        { urls: 'stun:stun.justvoip.com:3478' },
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun.linphone.org:3478' },
        { urls: 'stun:stun.liveo.fr:3478' },
        { urls: 'stun:stun.lowratevoip.com:3478' },
        { urls: 'stun:stun.miwifi.com:3478' },
        { urls: 'stun:stun.mozcom.com:3478' },
        { urls: 'stun:stun.myvoiptraffic.com:3478' },
        { urls: 'stun:stun.mywatson.it:3478' },
        { urls: 'stun:stun.neotel.co.za:3478' },
        { urls: 'stun:stun.netappel.com:3478' },
        { urls: 'stun:stun.netgsm.com.tr:3478' },
        { urls: 'stun:stun.nfon.net:3478' },
        { urls: 'stun:stun.noblogs.org:3478' },
        { urls: 'stun:stun.node4.co.uk:3478' },
        { urls: 'stun:stun.nonoh.net:3478' },
        { urls: 'stun:stun.nottingham.ac.uk:3478' },
        { urls: 'stun:stun.nova.is:3478' },
        { urls: 'stun:stun.ooma.com:3478' },
        { urls: 'stun:stun.oriontelekom.rs:3478' },
        { urls: 'stun:stun.ozekiphone.com:3478' },
        { urls: 'stun:stun.patlive.com:3478' },
        { urls: 'stun:stun.personal-voip.de:3478' },
        { urls: 'stun:stun.pjsip.org:3478' },
        { urls: 'stun:stun.powerpbx.org:3478' },
        { urls: 'stun:stun.powervoip.com:3478' },
        { urls: 'stun:stun.qq.com:3478' },
        { urls: 'stun:stun.rackco.com:3478' },
        { urls: 'stun:stun.rixtelecom.se:3478' },
        { urls: 'stun:stun.schlund.de:3478' },
        { urls: 'stun:stun.sipgate.net:3478' },
        { urls: 'stun:stun.sipnet.net:3478' },
        { urls: 'stun:stun.sipnet.ru:3478' },
        { urls: 'stun:stun.sippeer.dk:3478' },
        { urls: 'stun:stun.skylink.ru:3478' },
        { urls: 'stun:stun.sma.de:3478' },
        { urls: 'stun:stun.sonetel.com:3478' },
        { urls: 'stun:stun.solcon.nl:3478' },
        { urls: 'stun:stun.sonetel.net:3478' },
        { urls: 'stun:stun.siptraffic.com:3478' },
        { urls: 'stun:stun.vo.lu:3478' },
        { urls: 'stun:stun.vivox.com:3478' },
        { urls: 'stun:stun.voip.aebc.com:3478' },
        { urls: 'stun:stun.voiparound.com:3478' },
        { urls: 'stun:stun.voipbuster.com:3478' },
        { urls: 'stun:stun.voipstunt.com:3478' },
        { urls: 'stun:stun.voxgratia.org:3478' },
        { urls: 'stun:stun.webcalldirect.com:3478' },
        { urls: 'stun:stun.whoi.edu:3478' },
        { urls: 'stun:stun.xs4all.nl:3478' },
        { urls: 'stun:stun1.faktortel.com.au:3478' },
        { urls: 'stun:stun1.voiceeclipse.net:3478' },
        { urls: 'stun:stunserver.org:3478' },
        // TURN servers with credentials (examples provided)
        { urls: 'turn:numb.viagenie.ca', username: 'webrtc@live.com', credential: 'muazkh' },
        { urls: 'turn:192.158.29.39:3478?transport=udp', username: '28224511:1379330808', credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=' },
        { urls: 'turn:192.158.29.39:3478?transport=tcp', username: '28224511:1379330808', credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=' },
        { urls: 'turn:turn.bistri.com:80', username: 'homeo', credential: 'homeo' },
        { urls: 'turn:turn.anyfirewall.com:443?transport=tcp', username: 'webrtc', credential: 'webrtc' }
    ];
    if(turn && turn.host){
        if(turn.username && turn.credential){
            const turnEntry = { urls: `turn:${turn.host}`, username: turn.username, credential: turn.credential };
            // prefer user-provided TURN by adding to the beginning of the list
            iceServers.unshift(turnEntry);
        } else {
            console.warn('TURN server from URL missing username/credential — skipping adding it to iceServers');
        }
    }

    // Filter out any TURN entries that don't have username+credential because
    // some browsers throw InvalidAccessError when constructing RTCPeerConnection
    // if a `turn:` URL lacks credentials.
    const finalIceServers = iceServers.filter(s => {
        const urls = s.urls || s.url || '';
        const urlStr = Array.isArray(urls) ? urls.join(' ') : String(urls);
        if(urlStr.startsWith('turn:') || urlStr.startsWith('turns:')){
            return s.username && s.credential;
        }
        return true;
    });

    if(finalIceServers.length !== iceServers.length){
        console.warn('Some TURN entries were removed from iceServers because they lacked credentials.');
    }

    // Create RTCPeerConnection, fall back to STUN-only list if needed
    try{
        pc = new RTCPeerConnection({ iceServers: finalIceServers });
    }catch(err){
        console.warn('RTCPeerConnection failed with provided iceServers, retrying with STUN-only list', err);
        const stunOnly = finalIceServers.filter(s => {
            const urls = s.urls || s.url || '';
            const urlStr = Array.isArray(urls) ? urls.join(' ') : String(urls);
            return !(urlStr.startsWith('turn:') || urlStr.startsWith('turns:'));
        });
        try{
            pc = new RTCPeerConnection({ iceServers: stunOnly });
        }catch(err2){
            console.error('Failed to create RTCPeerConnection even with STUN-only list', err2);
            throw err2;
        }
    }

    pc.ontrack = e => {
        const remote = e.streams[0];
        try{ remoteAudio.srcObject = remote; }
        catch(e){ console.error('setting remote audio failed', e); }

        // Always keep remote audio playing via remoteAudio. Mute video elements to avoid double-audio/echo.
        if(localMini && isSwapped){
            localMini.srcObject = remote;
            localMini.style.transform = 'scaleX(1)';
            remoteVideo.muted = true; // ensure remoteVideo (showing local or other) doesn't duplicate audio
        } else {
            remoteVideo.srcObject = remote;
            remoteVideo.muted = true;
        }
    };
    pc.onicecandidate = e => { if(e.candidate) sendSignal({type:'candidate', candidate:e.candidate}); };
    localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
    
    pc.onconnectionstatechange = ()=>{
        if((pc.connectionState==='disconnected' || pc.connectionState==='failed') && APP_STATE==='incall'){
            reconnectAttempts++;
            if(reconnectAttempts <= MAX_RECONNECT){
                log(`Собеседник отключился, перезапуск ${reconnectAttempts}/${MAX_RECONNECT}...`);
                restartChat();
            } else {
                log("Соединение потеряно.");
                reconnectAttempts = 0;
                setState('dialing');
            }
        } else if(pc.connectionState==='connected'){
            reconnectAttempts = 0;
            log("Соединение установлено!");
            stopJoinPing();
            // stop any outgoing call notifications for this subroom — remote answered/connected
            try{ if(SUBROOM) stopOutgoingNotificationsBySubroom(SUBROOM); }catch(e){}
        }
    };
}

function createLocalMini(){
    // create small self-preview in corner
    if(localMini) return;
    localMini = document.createElement('video');
    localMini.id = 'localMini';
    localMini.autoplay = true;
    localMini.muted = true;
    localMini.playsInline = true;
    Object.assign(localMini.style, {
        position: 'fixed',
        width: '180px',
        height: '135px',
        bottom: '12px',
        right: '12px',
        zIndex: 9999,
        border: '2px solid #222',
        borderRadius: '8px',
        backgroundColor: '#000',
        cursor: 'pointer',
        touchAction: 'none',
        objectFit: 'cover'
    });
    // Drag & click handling: distinguish drag from click (robust pointer handling)
    let dragState = { dragging: false, startX:0, startY:0, origLeft:0, origTop:0, currentPointerId: null, origOverscrollBody: undefined, origOverscrollDoc: undefined };
    localMini.addEventListener('pointerdown', (ev)=>{
        ev.preventDefault();
        dragState.currentPointerId = ev.pointerId;
        try{ localMini.setPointerCapture(dragState.currentPointerId); }catch(e){}
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        document.documentElement.style.cursor = 'grabbing';
        localMini.style.touchAction = 'none';
        localMini.draggable = false;
        dragState.dragging = true;
        dragState.startX = ev.clientX;
        dragState.startY = ev.clientY;
        const rect = localMini.getBoundingClientRect();
        dragState.origLeft = rect.left;
        dragState.origTop = rect.top;
        // switch to absolute positioning while dragging
        localMini.style.transition = 'none';
        localMini.style.right = 'auto';
        localMini.style.bottom = 'auto';
        localMini.style.left = rect.left + 'px';
        localMini.style.top = rect.top + 'px';
        // prevent page overscroll/scroll-chaining while dragging on mobile
        try{
            dragState.origOverscrollBody = document.body.style.overscrollBehavior;
            dragState.origOverscrollDoc = document.documentElement.style.overscrollBehavior;
            document.body.style.overscrollBehavior = 'none';
            document.documentElement.style.overscrollBehavior = 'none';
        }catch(e){}

        function onPointerMove(e){
            if(!dragState.dragging) return;
            if(e.pointerId !== dragState.currentPointerId) return;
            e.preventDefault();
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const w = localMini.offsetWidth  || 180;
            const h = localMini.offsetHeight || 135;
            let newLeft = dragState.origLeft + dx;
            let newTop  = dragState.origTop  + dy;
            // Clamp within viewport
            newLeft = Math.max(0, Math.min(newLeft, vw - w));
            newTop  = Math.max(0, Math.min(newTop,  vh - h));
            // Protect burger button (top-right, ~60px tall × ~55px wide from right edge)
            if(newLeft + w > vw - 55) newTop = Math.max(newTop, 60);
            localMini.style.left = newLeft + 'px';
            localMini.style.top  = newTop  + 'px';
        }

        function finishDrag(e){
            try{ if(dragState.currentPointerId) localMini.releasePointerCapture(dragState.currentPointerId); }catch(e){}
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.documentElement.style.cursor = '';
            try{
                if(dragState.origOverscrollBody !== undefined) document.body.style.overscrollBehavior = dragState.origOverscrollBody;
                if(dragState.origOverscrollDoc !== undefined) document.documentElement.style.overscrollBehavior = dragState.origOverscrollDoc;
            }catch(e){}
            localMini.style.touchAction = 'auto';
            dragState.dragging = false;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', finishDrag);
            document.removeEventListener('pointercancel', finishDrag);

            const moved = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
            if(moved < 8){
                swapVideos();
                return;
            }
            // snap to nearest corner
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rect = localMini.getBoundingClientRect();
            const cx = rect.left + rect.width/2;
            const cy = rect.top + rect.height/2;
            const left = cx < vw/2;
            const top = cy < vh/2;
            localMini.style.transition = 'left 0.15s, top 0.15s, right 0.15s, bottom 0.15s';
            // snap with 12px offset; top-right pushed down 60px to clear burger button
            if(left && top){ localMini.style.left='12px'; localMini.style.top='12px'; localMini.style.right='auto'; localMini.style.bottom='auto'; }
            else if(!left && top){ localMini.style.right='12px'; localMini.style.top='60px'; localMini.style.left='auto'; localMini.style.bottom='auto'; }
            else if(left && !top){ localMini.style.left='12px'; localMini.style.bottom='12px'; localMini.style.top='auto'; localMini.style.right='auto'; }
            else { localMini.style.right='12px'; localMini.style.bottom='12px'; localMini.style.top='auto'; localMini.style.left='auto'; }
        }

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', finishDrag);
        document.addEventListener('pointercancel', finishDrag);
    });
    document.body.appendChild(localMini);
    // hide switchCamBtn on desktop
    try{ if(!isMobile && switchCamBtn) switchCamBtn.style.display = 'none'; }
    catch(e){}
}

function swapVideos(){
    if(!localMini) return;
    const a = remoteVideo.srcObject;
    const b = localMini.srcObject;
    remoteVideo.srcObject = b;
    localMini.srcObject = a;
    // keep local preview mirrored only when it shows localStream AND it's the front camera
    if(localMini.srcObject === localStream) localMini.style.transform = usingFrontCamera ? 'scaleX(-1)' : 'scaleX(1)';
    else localMini.style.transform = 'scaleX(1)';
    // ensure main (large) video is not mirrored
    remoteVideo.style.transform = 'scaleX(1)';
    isSwapped = !isSwapped;
}

function sendSignal(msg){
    msg.room = getCompositeRoom();
    msg.clientId = CLIENT_ID;
    try{ ws.send(JSON.stringify(msg)); }
    catch(e){ console.error('sendSignal failed', e); }
}

function startJoinPing(){
    stopJoinPing();
    // send immediately then every 3s until we have an offer/connection
    const sendJoin = ()=>{
        if(!ws || ws.readyState !== WebSocket.OPEN) return;
        if(pc && (pc.connectionState==='connected' || pc.remoteDescription)){
            stopJoinPing();
            return;
        }
        sendSignal({type:'join'});
    };
    sendJoin();
    joinInterval = setInterval(sendJoin, 3000);
}

// Populate mic/output device lists
async function populateDeviceLists(){
    if(!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(d=>d.kind==='audioinput');
        const outputs = devices.filter(d=>d.kind==='audiooutput');
        if(micSelect){
            micSelect.innerHTML = '';
            mics.forEach(m=>{
                const opt = document.createElement('option');
                opt.value = m.deviceId;
                opt.text = m.label || `Микрофон ${micSelect.length+1}`;
                micSelect.appendChild(opt);
            });
            micSelect.onchange = ()=>{ handleMicChange(); micSelect.classList.add('hidden'); };
        }
        if(outputSelect){
            outputSelect.innerHTML = '';
            outputs.forEach(o=>{
                const opt = document.createElement('option');
                opt.value = o.deviceId;
                opt.text = o.label || `Динамик ${outputSelect.length+1}`;
                outputSelect.appendChild(opt);
            });
            outputSelect.onchange = ()=>{ handleOutputChange(); outputSelect.classList.add('hidden'); };
        }
        // After updating device lists, ensure visibility of toggles/selects
        updateDropdownVisibility();
    }catch(e){ console.error('enumerateDevices failed', e); updateDropdownVisibility(); }
}

// Hide dropdowns and their thumbnails when a dropdown has no options.
function updateDropdownVisibility(){
    try{
        if(micSelect){
            if(micSelect.options.length < 2){ micSelect.classList.add('hidden'); if(micToggle) micToggle.classList.add('hidden'); }
            else { if(micToggle) micToggle.classList.remove('hidden'); micSelect.classList.add('hidden'); }
        }
        if(outputSelect){
            if(outputSelect.options.length < 2){ outputSelect.classList.add('hidden'); if(outputToggle) outputToggle.classList.add('hidden'); }
            else { if(outputToggle) outputToggle.classList.remove('hidden'); outputSelect.classList.add('hidden'); }
        }
        if(roomSelect){
            if(roomSelect.options.length < 2){ roomSelect.classList.add('hidden'); if(roomThumb) roomThumb.classList.add('hidden'); }
            else { if(roomThumb) roomThumb.classList.remove('hidden'); roomSelect.classList.add('hidden'); }
        }
    }catch(e){ console.error('updateDropdownVisibility failed', e); }
}

// mic toggle shows/hides compact mic select
if(micToggle){
    micToggle.onclick = (ev)=>{
        if(!micSelect) return;
        if(micSelect.classList.contains('hidden')){
            micSelect.classList.remove('hidden');
            // focus so keyboard users can use it
            setTimeout(()=>micSelect.focus(),50);
        } else {
            micSelect.classList.add('hidden');
        }
    };
}
if(outputToggle){
    outputToggle.onclick = (ev)=>{
        if(!outputSelect) return;
        if(outputSelect.classList.contains('hidden')){
            outputSelect.classList.remove('hidden');
            setTimeout(()=>outputSelect.focus(),50);
        } else {
            outputSelect.classList.add('hidden');
        }
    };
}

// room toggle (collapsed by default)
if(roomThumb){
    roomThumb.onclick = (ev)=>{
        if(!roomSelect) return;
        if(roomSelect.classList.contains('hidden')){
            roomSelect.classList.remove('hidden');
            setTimeout(()=>roomSelect.focus(),50);
        } else {
            roomSelect.classList.add('hidden');
        }
    };
}

// Hangup / Refresh buttons behavior
async function hangupCall(){
    try{
        hasSentOffer = false;
        stopJoinPing();
        if(ws){ EXPECTED_WS_CLOSE = true; try{ ws.close(); }catch(e){} ws = null; }
        if(pc){ try{ pc.close(); }catch(e){} pc = null; }
        if(localStream){ localStream.getTracks().forEach(t=>t.stop()); }
        log('Звонок сброшен');
    }catch(e){ console.error('hangup failed', e); }
}

if(hangupBtn){
    hangupBtn.onclick = ()=>setState('dialing');
}

if(refreshBtn){
    refreshBtn.onclick = (ev)=>{
        // only refresh if not connected
        if(pc && pc.connectionState==='connected'){
            log('Соединение активно — сбросьте звонок сначала');
            return;
        }
        const u = new URL(window.location.href);
        u.searchParams.set('_', Date.now());
        window.location.href = u.toString();
    };
}

async function handleMicChange(){
    const id = micSelect.value;
    if(!id) return;
    try{
        const s = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: id } }, video: false });
        const newTrack = s.getAudioTracks()[0];
        // replace on pc if available
        if(pc){
            const audioSender = pc.getSenders().find(s=>s.track && s.track.kind==='audio');
            if(audioSender){
                await audioSender.replaceTrack(newTrack);
            } else {
                pc.addTrack(newTrack, s);
            }
        }
        // update localStream
        if(localStream){
            localStream.getAudioTracks().forEach(t=>{ t.stop(); try{ localStream.removeTrack(t); }catch(e){} });
            localStream.addTrack(newTrack);
        } else {
            localStream = s;
        }
    }catch(e){ console.error('switch mic failed', e); }
}

async function handleOutputChange(){
    const id = outputSelect.value;
    if(!id) return;
    if(typeof remoteAudio.setSinkId === 'function'){
        try{ await remoteAudio.setSinkId(id); }
        catch(e){ console.warn('setSinkId failed', e); }
    } else {
        console.warn('setSinkId not supported in this browser');
    }
}

function stopJoinPing(){
    if(joinInterval){ clearInterval(joinInterval); joinInterval = null; }
}

// Define available subrooms (emoji thumbnail + long name)
const ROOMS = [
    { id: 'elephant', emoji: '🐘', name: 'Комната Слона' },
    { id: 'giraffe',  emoji: '🦒', name: 'Комната Жирафа' },
    { id: 'lion',     emoji: '🦁', name: 'Комната Льва' },
    { id: 'monkey',   emoji: '🐒', name: 'Комната Обезьяны' },
    { id: 'panda',    emoji: '🐼', name: 'Комната Панды' },
    { id: 'fox',      emoji: '🦊', name: 'Комната Лисы' },
    { id: 'rabbit',   emoji: '🐰', name: 'Комната Кролика' }
];

function populateRoomSelector(){
    if(!roomSelect) return;
    roomSelect.innerHTML = '';
    ROOMS.forEach(r=>{
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.text = `${r.emoji} ${r.name}`;
        roomSelect.appendChild(opt);
    });
    // choose SUBROOM if present, otherwise default to first
    if(!SUBROOM) SUBROOM = ROOMS[0].id;
    roomSelect.value = SUBROOM;
    const chosen = ROOMS.find(x=>x.id===roomSelect.value) || ROOMS[0];
    if(roomThumb) roomThumb.textContent = chosen.emoji;

    roomSelect.onchange = ()=>{
        const newId = roomSelect.value;
        SUBROOM = newId;
        const r = ROOMS.find(x=>x.id===newId);
        if(roomThumb) roomThumb.textContent = (r && r.emoji) ? r.emoji : '';
        // update URL param
        const u = new URL(window.location.href);
        u.searchParams.set('subroom', SUBROOM);
        window.history.replaceState(null,null,u.toString());
        // reset offer flag and restart connection to wait for peers in chosen subroom
        hasSentOffer = false;
        stopJoinPing();
        restartChat();
    };
    // Ensure thumbnails/selects are visible/hidden based on available options
    updateDropdownVisibility();
}

async function startChat(){
    log("Запуск камеры...");
    await startCamera();
    initPeer();

    // Use composite room (cluster:subroom) for in-message scoping only
    const composite = encodeURIComponent(getCompositeRoom());
    // The PieSocket channel (path) and api_key must remain the cluster (original `room` param).
    // Read PieSocket host and api key from URL params when provided (preferred)
    const params = new URLSearchParams(window.location.search);
    const piesocketHost = params.get('piesocketHost') || 's15819.blr1.piesocket.com';
    // apiKey should default to the `room` (cluster) value — do not set it to the subroom.
    const apiKey = params.get('apiKey') || params.get('api_key') || CLUSTER;
    const wsBase = `wss://${piesocketHost}/v3/${encodeURIComponent(SUBROOM)}${encodeURIComponent(apiKey)}?api_key=${encodeURIComponent(apiKey)}`;
    const urlRoom = (new URLSearchParams(window.location.search)).get('room');
    let wsUrl = wsBase;
    if(urlRoom){
        wsUrl += `&room=${encodeURIComponent(urlRoom)}`;
    } else if(!CLUSTER){
        console.warn('[startChat] no room specified in URL and no CLUSTER present — proceeding without room query param');
    }
    ws = createLoggedWebSocket(wsUrl, 'signaling');

    // mark socket as opened when onopen fires
    ws.onopen = async ()=>{
        WS_WAS_OPEN = true;
        log("Сигналинг подключён, отправляю JOIN...");
        startJoinPing();
    };

    ws.onmessage = async e=>{
        let data;
        try{
            data = JSON.parse(e.data);
        }catch(err){
            console.warn('ws message parse failed', err);
            return;
        }

        // If the signaling server returns an error payload, stop JOIN pings
        // and surface the error to the user (e.g. {"error":"Unknown api key"}).
        if(data && data.error){
            stopJoinPing();
            log('Ошибка WSS сервера: ' + data.error);
            return;
        }

        if(data.room!==getCompositeRoom()) return;
        if(data.clientId === CLIENT_ID) return; // ignore our own messages
        // If a remote peer is present in this composite room (join/offer/answer),
        // stop any outgoing repeated call notifications for this subroom.
        if(data.type === 'join' || data.type === 'offer' || data.type === 'answer'){
            try{ if(SUBROOM) stopOutgoingNotificationsBySubroom(SUBROOM); }catch(e){}
        }

        console.log('Signal received:', data);

        if(data.type === 'join'){
            // Other peer joined — deterministic offer: higher clientId starts
            if(!hasSentOffer && CLIENT_ID > data.clientId){
                try{
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    sendSignal({type:'offer', offer});
                    hasSentOffer = true;
                    log("Offer отправлен, ждём ответ...");
                }catch(err){ console.error('create/send offer failed', err); }
            }
        } else if(data.type === 'offer'){
            try{
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal({type:'answer', answer});
                log("Ответ отправлен, соединение устанавливается...");
            }catch(err){ console.error('handle offer failed', err); }
        } else if(data.type === 'answer'){
            try{
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
                log("Соединение установлено!");
            }catch(err){ console.error('set remote answer failed', err); }
        } else if(data.type === 'candidate'){
            try{ await pc.addIceCandidate(new RTCIceCandidate(data.candidate)); }
            catch(e){ console.error('addIceCandidate failed', e); }
        }
    };

    ws.onerror = e => { console.error('ws error', e); log("Ошибка сигналинга"); };
    ws.onclose = () => { 
        stopJoinPing(); 
        if(EXPECTED_WS_CLOSE){ EXPECTED_WS_CLOSE = false; WS_WAS_OPEN = false; return; }
        if(!WS_WAS_OPEN){
            // socket never opened successfully
            WS_WAS_OPEN = false;
            log("Ошибка сигналинга");
        } else {
            WS_WAS_OPEN = false;
            log("Сигналинг закрыт");
        }
    };
}

// Переключение камеры
switchCamBtn.onclick = async ()=>{
    usingFrontCamera = !usingFrontCamera;
    try{
        // Try to get a new video track only and replace the existing sender's track
        const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: usingFrontCamera ? 'user' : 'environment' }, audio: false });
        const newVideoTrack = newStream.getVideoTracks()[0];

        if(pc){
            const senders = pc.getSenders();
            const videoSender = senders.find(s => s.track && s.track.kind === 'video');
            if(videoSender){
                await videoSender.replaceTrack(newVideoTrack);
            } else {
                // Fallback: add track if no sender found
                pc.addTrack(newVideoTrack, localStream || newStream);
            }
        }

        // Replace tracks in our local stream preview/state
        if(localStream){
            localStream.getVideoTracks().forEach(t=>{ t.stop(); localStream.removeTrack(t); });
            localStream.addTrack(newVideoTrack);
        } else {
            localStream = newStream;
        }

        log("Камера переключена");
    }catch(err){
        console.error('switch camera failed', err);
        // Fallback to full restart if replace fails
        if(localStream) localStream.getTracks().forEach(t=>t.stop());
        await startCamera();
        if(pc){ localStream.getTracks().forEach(t=>pc.addTrack(t,localStream)); }
        log("Камера переключена (перезапуск)");
    }
};

// Рестарт после рассоединения
async function restartChat(){
    try{
        // reset offer state and stop any pinging before tearing down
        hasSentOffer = false;
        stopJoinPing();
        if(ws){ EXPECTED_WS_CLOSE = true; try{ ws.close(); }catch(e){} ws = null; }
        if(pc){ try{ pc.close(); }catch(e){} pc = null; }
        await startChat();
    }catch(e){ log("Ошибка при перезапуске"); }
}

// ===== PHONE SYSTEM: SUBROOM COMPUTATION =====
function computeSubroom(myNumber, theirNumber){
    const normalize = n => n.replace(/\D/g,'');
    const arr = [normalize(myNumber), normalize(theirNumber)].sort();
    return md5(arr.join(':'));
}

function generateCallSignature(){
    if(typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'){
        return crypto.randomUUID();
    }
    return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2,11);
}

function getPersonalChannelUrl(number){
    const p = new URLSearchParams(window.location.search);
    const host = p.get('piesocketHost') || 's15819.blr1.piesocket.com';
    const apiKey = p.get('apiKey') || p.get('api_key') || CLUSTER;
    return `wss://${host}/v3/${normalizePhone(number).replace(/\D/g,'')}?api_key=${encodeURIComponent(apiKey)}`;
}

// ===== PHONE NUMBER NORMALIZATION =====
function normalizePhone(n){
    const s = String(n).trim();
    const plus = s.startsWith('+') ? '+' : '';
    return plus + s.replace(/\D/g,'');
}

// ===== CALLS HISTORY (localStorage) =====
function loadCallsHistory(){
    try{ return JSON.parse(localStorage.getItem('callsHistory')||'[]'); }catch(e){ return []; }
}
function saveCallToHistory(number){
    const h = loadCallsHistory();
    const n = normalizePhone(number);
    // carry over existing alias for this number if already named
    const existing = h.find(e=>normalizePhone(e.number)===n && e.alias);
    h.unshift({number:n, alias:existing?existing.alias:'', timestamp:Date.now()});
    localStorage.setItem('callsHistory', JSON.stringify(h));
}
function updateCallAlias(targetNumber, alias){
    const h = loadCallsHistory();
    const norm = normalizePhone(targetNumber);
    h.forEach(e=>{ if(normalizePhone(e.number)===norm) e.alias=alias; });
    localStorage.setItem('callsHistory', JSON.stringify(h));
}
function removeCallFromHistory(idx){
    const h = loadCallsHistory();
    h.splice(idx,1);
    localStorage.setItem('callsHistory', JSON.stringify(h));
}

// ===== TEARDOWN WITHOUT RESTART =====
function hangupAndStopStreams(){
    try{
        hasSentOffer = false;
        stopJoinPing();
        if(ws){ EXPECTED_WS_CLOSE=true; try{ws.close();}catch(e){} ws=null; }
        if(pc){ try{pc.close();}catch(e){} pc=null; }
        if(localStream){ localStream.getTracks().forEach(t=>t.stop()); localStream=null; }
        if(localMini){ localMini.remove(); localMini=null; }
        isSwapped=false;
    }catch(e){ console.error('hangupAndStopStreams failed',e); }
}

// ===== PERSONAL NOTIFICATION CHANNEL =====
function connectPersonalChannel(){
    const myNumber = localStorage.getItem('myPhoneNumber');
    if(!myNumber) return;
    // If page is hidden and we're not in an active call, avoid owning the
    // personal channel — this prevents multiple background windows from
    // fighting for the same user's channel.
    if(document.hidden && APP_STATE !== 'incall'){
        console.log('[notif] page hidden and not incall — skipping personal channel connect');
        return;
    }

    // Only one window should hold the personal channel owner; try to acquire.
    if(!tryAcquireNotifOwnership()){
        console.log('[notif] another window owns personal channel — skipping connect');
        return;
    }

    if(notifWs && (notifWs.readyState === WebSocket.OPEN || notifWs.readyState === WebSocket.CONNECTING)){
        return; // already alive, nothing to do
    }
    if(notifWs && notifWs.readyState !== WebSocket.CLOSED){
        try{ notifWs.close(); }catch(e){}
    }
    const url = getPersonalChannelUrl(myNumber);
    notifWs = createLoggedWebSocket(url, 'personal');
    notifWs.onopen = () => {
        console.log('[notif] Personal channel connected:', url);
        // clear any pending reconnect timer now that we opened
        if(notifWsReconnectTimer){ clearTimeout(notifWsReconnectTimer); notifWsReconnectTimer = null; }
        startNotifOwnerHeartbeat();
        notifWsHeartbeat = setInterval(() => {
            if(notifWs && notifWs.readyState === WebSocket.OPEN){
                try{ notifWs.send(JSON.stringify({type:'ping'})); }catch(e){}
            }
        }, 20000);
        // consider connection "stable" after 30s; only then reset reconnect attempts
        if(notifWsOpenStableTimer) clearTimeout(notifWsOpenStableTimer);
        notifWsOpenStableTimer = setTimeout(()=>{ notifWsReconnectAttempts = 0; notifWsOpenStableTimer = null; }, 30000);
    };
    notifWs.onmessage = (e) => {
        let data;
        try{ data = JSON.parse(e.data); }catch(err){ return; }
        // If server reports an error (e.g. invalid/unknown API key), treat as permanent
        if(data && data.error){
            notifWsPermanentFail = true;
            clearInterval(notifWsHeartbeat); notifWsHeartbeat = null;
            if(notifWsOpenStableTimer){ clearTimeout(notifWsOpenStableTimer); notifWsOpenStableTimer = null; }
            if(notifWsReconnectTimer){ clearTimeout(notifWsReconnectTimer); notifWsReconnectTimer = null; }
            console.error('[notif] Personal channel server error:', data.error);
            // release ownership and close socket without scheduling reconnects
            releaseNotifOwnership();
            try{ notifWs.close(); }catch(e){}
            notifWs = null;
            return;
        }
        if(!data || data.type !== 'incoming_call') return;
        const { callSignature, callerNumber, callerAlias, subroom, cluster, timestamp } = data;
        if(!callSignature) return;
        if(timestamp && Date.now() - timestamp > 60000) return;
        if(seenCallSignatures.has(callSignature)) return;
        if(APP_STATE === 'incall'){ seenCallSignatures.add(callSignature); return; }
        if(activeIncomingCall && activeIncomingCall.callSignature === callSignature) return;
        activeIncomingCall = { callSignature, callerNumber, callerAlias, subroom, cluster };
        showIncomingCallDialog(callSignature, callerNumber, callerAlias, subroom, cluster);
        if(document.visibilityState !== 'visible'){
            showBrowserNotification(callerAlias || callerNumber, callerNumber);
        }
    };
    notifWs.onerror = (e) => { console.warn('[notif] Personal channel error', e); };
    notifWs.onclose = () => {
        clearInterval(notifWsHeartbeat); notifWsHeartbeat = null;
        if(notifWsOpenStableTimer){ clearTimeout(notifWsOpenStableTimer); notifWsOpenStableTimer = null; }
        console.log('[notif] Personal channel closed');
        // release ownership so other windows can take over
        releaseNotifOwnership();
        // only schedule reconnect when visible or when in-call (callee must remain reachable)
        if((APP_STATE === 'dialing' || APP_STATE === 'incall') && !document.hidden) scheduleNotifReconnect();
    };
}

function disconnectPersonalChannel(){
    if(notifWsReconnectTimer){ clearTimeout(notifWsReconnectTimer); notifWsReconnectTimer = null; }
    clearInterval(notifWsHeartbeat); notifWsHeartbeat = null;
    notifWsReconnectAttempts = 0;
    if(notifWsOpenStableTimer){ clearTimeout(notifWsOpenStableTimer); notifWsOpenStableTimer = null; }
    if(notifWs){ try{ notifWs.close(); }catch(e){} notifWs = null; }
    // release ownership when explicitly disconnecting
    releaseNotifOwnership();
}

function scheduleNotifReconnect(){
    // If we've received a permanent server-side failure (e.g. unknown API key), stop trying
    if(notifWsPermanentFail){ console.warn('[notif] Permanent failure flagged — not reconnecting'); return; }
    // don't attempt to reconnect while page is hidden (unless we're in-call)
    if(document.hidden && APP_STATE !== 'incall') return;
    if(notifWsReconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, notifWsReconnectAttempts), MAX_NOTIF_RECONNECT_DELAY);
    const jitter = Math.random() * 1000;
    notifWsReconnectAttempts++;
    console.log(`[notif] Reconnecting in ${Math.round(delay+jitter)}ms (attempt ${notifWsReconnectAttempts})`);
    notifWsReconnectTimer = setTimeout(() => { notifWsReconnectTimer = null; connectPersonalChannel(); }, delay + jitter);
}

// Listen for storage changes so windows can react to ownership changes
window.addEventListener('storage', (e)=>{
    try{
        if(e.key === NOTIF_OWNER_KEY){
            // If owner cleared and we're visible and dialing, try to connect
            if(!e.newValue && !document.hidden && APP_STATE === 'dialing'){
                connectPersonalChannel();
            }
        }
    }catch(err){}
});

// Pause non-critical sockets when page is hidden and not in an active call.
document.addEventListener('visibilitychange', ()=>{
    try{
        if(document.hidden){
            // If not in active call, close signaling ws (join pings) to avoid multiple
            // windows contending for the same room and reduce server load.
            if(APP_STATE !== 'incall'){
                if(ws){ EXPECTED_WS_CLOSE = true; try{ ws.close(); }catch(e){} ws = null; }
                // release personal channel ownership and disconnect socket
                disconnectPersonalChannel();
                stopJoinPing();
            }
        } else {
            // Became visible: if we're dialing, try to connect personal channel again
            if(APP_STATE === 'dialing') connectPersonalChannel();
        }
    }catch(err){ console.warn('visibilitychange handler failed', err); }
});

// Ensure ownership is released on unload so other windows can take over quickly.
window.addEventListener('beforeunload', ()=>{ try{ releaseNotifOwnership(); }catch(e){} });

// ===== STATE MACHINE =====
function setState(newState){
    APP_STATE = newState;
    // Notification channel lifecycle
    hideIncomingCallDialog();
    if(newState === 'setup') disconnectPersonalChannel();
    if(newState === 'dialing'){ requestNotificationPermission(); connectPersonalChannel(); }
    // (incall: keep notifWs alive so callee receives further calls)
    const isSetup   = newState==='setup';
    const isDialing = newState==='dialing';
    const isIncall  = newState==='incall';

    if(setupScreen)   setupScreen.classList.toggle('hidden',   !isSetup);
    if(dialpadScreen) dialpadScreen.classList.toggle('hidden', !isDialing);
    if(remoteVideo)   remoteVideo.classList.toggle('hidden',   !isIncall);
    const ctrlEl = document.getElementById('controls');
    if(ctrlEl)      ctrlEl.classList.toggle('hidden',          !isIncall);
    if(statusText)  statusText.classList.toggle('hidden',      !isIncall);
    if(burgerBtn)   burgerBtn.classList.toggle('hidden',       isSetup);
    // always suppress animal room selector
    if(roomThumb)  roomThumb.classList.add('hidden');
    if(roomSelect) roomSelect.classList.add('hidden');

    if(isSetup){
        const existing = localStorage.getItem('myPhoneNumber');
        if(existing && myPhoneInput) myPhoneInput.value = existing;
        setTimeout(()=>{ if(myPhoneInput) myPhoneInput.focus(); },100);
    }
    if(isDialing){
        if(dialpadMyNum) dialpadMyNum.textContent = localStorage.getItem('myPhoneNumber')||'';
        dialedNumber = '';
        updateDialDisplay();
        hangupAndStopStreams();
    }
    if(isIncall){
        reconnectAttempts = 0;
        populateDeviceLists().then(()=>startChat()).catch(()=>startChat());
    }
}

// ===== DIAL DISPLAY =====
function updateDialDisplay(){
    if(dialDisplayText) dialDisplayText.textContent = dialedNumber;
}

// ===== OUTGOING CALL NOTIFICATION =====
function sendCallNotification(callerNumber, calleeNumber, subroom, cluster, callSignature){
    const url = getPersonalChannelUrl(calleeNumber);
    const tempWs = createLoggedWebSocket(url, 'outgoing');
    const history = loadCallsHistory();
    const entry = history.find(e => normalizePhone(e.number) === normalizePhone(callerNumber));
    const callerAlias = (entry && entry.alias) ? entry.alias : '';
    const INTERVAL_MS = 500;
    const MAX_DURATION = 30000; // stop repeating after 30s
    let intervalTimer = null;
    let durationTimer = null;

    function buildMsg(){
        return JSON.stringify({
            type: 'incoming_call',
            callSignature,
            callerNumber: normalizePhone(callerNumber),
            callerAlias,
            subroom,
            cluster,
            timestamp: Date.now()
        });
    }

    function sendIfOpen(){
        if(tempWs && tempWs.readyState === WebSocket.OPEN){
            try{ tempWs.send(buildMsg()); console.log('[notif] Call notification sent to', normalizePhone(calleeNumber)); }
            catch(e){ console.warn('[notif] Failed to send notification', e); }
        }
    }

    tempWs.onopen = () => {
        // send immediately then every INTERVAL_MS until MAX_DURATION
        sendIfOpen();
        intervalTimer = setInterval(sendIfOpen, INTERVAL_MS);
        durationTimer = setTimeout(()=>{
            if(intervalTimer){ clearInterval(intervalTimer); intervalTimer = null; }
            try{ tempWs.close(); }catch(e){}
        }, MAX_DURATION);
        // register stopper so other code can cancel these repeated notifications
        activeOutgoingNotifications.set(callSignature, {
            stop: ()=>{
                if(intervalTimer){ clearInterval(intervalTimer); intervalTimer = null; }
                if(durationTimer){ clearTimeout(durationTimer); durationTimer = null; }
                try{ if(tempWs && tempWs.readyState !== WebSocket.CLOSED) tempWs.close(); }catch(e){}
                activeOutgoingNotifications.delete(callSignature);
            },
            subroom,
            calleeNumber
        });
    };
    tempWs.onerror = (e) => { console.warn('[notif] Notification socket error', e); };
    tempWs.onclose = () => {
        if(intervalTimer){ clearInterval(intervalTimer); intervalTimer = null; }
        if(durationTimer){ clearTimeout(durationTimer); durationTimer = null; }
        if(activeOutgoingNotifications.has(callSignature)) activeOutgoingNotifications.delete(callSignature);
    };
}

function stopOutgoingNotificationsBySubroom(subroom){
    try{
        for(const [sig, info] of activeOutgoingNotifications.entries()){
            if(info && info.subroom === subroom){
                try{ info.stop(); }catch(e){}
            }
        }
    }catch(e){ console.warn('[notif] stopOutgoingNotificationsBySubroom failed', e); }
}

// ===== INITIATE CALL =====
function initiateCall(){
    const d = dialedNumber.trim();
    if(!d){ log('Введите номер для звонка'); return; }
    const myNum = localStorage.getItem('myPhoneNumber');
    if(!myNum){ setState('setup'); return; }
    SUBROOM = computeSubroom(myNum, d);
    const u = new URL(window.location.href);
    u.searchParams.set('subroom', SUBROOM);
    window.history.replaceState(null,null,u.toString());
    const callSignature = generateCallSignature();
    sendCallNotification(myNum, d, SUBROOM, CLUSTER, callSignature);
    saveCallToHistory(d);
    setState('incall');
}

// ===== SETUP SCREEN HANDLERS =====
function setupScreenHandlers(){
    function submitPhoneSetup(){
        const val = myPhoneInput ? myPhoneInput.value.trim() : '';
        if(!val){
            if(myPhoneInput) myPhoneInput.style.borderColor='#e53935';
            return;
        }
        localStorage.setItem('myPhoneNumber', val);
        setState('dialing');
    }
    if(setupSubmitBtn) setupSubmitBtn.addEventListener('click', submitPhoneSetup);
    if(myPhoneInput) myPhoneInput.addEventListener('keydown', e=>{ if(e.key==='Enter') submitPhoneSetup(); });
}

// ===== DIAL PAD HANDLERS =====
function initDialPad(){
    let zeroLongPressed = false;

    document.querySelectorAll('.dial-key').forEach(btn=>{
        btn.addEventListener('click',()=>{
            if(btn.dataset.digit==='0' && zeroLongPressed){ zeroLongPressed=false; return; }
            dialedNumber += btn.dataset.digit;
            updateDialDisplay();
        });
    });

    // Long-press "0" inserts "+" (like real phones)
    const zeroBtn = document.querySelector('.dial-key[data-digit="0"]');
    if(zeroBtn){
        let zeroTimer;
        zeroBtn.addEventListener('pointerdown',()=>{
            zeroTimer = setTimeout(()=>{
                zeroLongPressed = true;
                dialedNumber += '+';
                updateDialDisplay();
            }, 500);
        });
        zeroBtn.addEventListener('pointerup',  ()=>clearTimeout(zeroTimer));
        zeroBtn.addEventListener('pointercancel',()=>{ clearTimeout(zeroTimer); zeroLongPressed=false; });
    }
    if(backspaceBtn){
        backspaceBtn.addEventListener('click',()=>{ dialedNumber=dialedNumber.slice(0,-1); updateDialDisplay(); });
        let clearTimer;
        backspaceBtn.addEventListener('pointerdown',()=>{ clearTimer=setTimeout(()=>{ dialedNumber=''; updateDialDisplay(); },600); });
        backspaceBtn.addEventListener('pointerup',()=>clearTimeout(clearTimer));
        backspaceBtn.addEventListener('pointercancel',()=>clearTimeout(clearTimer));
    }
    if(callBtn) callBtn.addEventListener('click', initiateCall);
    if(historyShortcutBtn) historyShortcutBtn.addEventListener('click', openBurgerPanel);

    // Keyboard input (desktop) — only active while on dial pad
    document.addEventListener('keydown', e=>{
        if(APP_STATE !== 'dialing') return;
        if(burgerPanel && burgerPanel.classList.contains('open')) return;
        const key = e.key;
        if(/^[\d*#+]$/.test(key)){
            e.preventDefault();
            dialedNumber += key;
            updateDialDisplay();
        } else if(key==='Backspace'){
            e.preventDefault();
            dialedNumber = dialedNumber.slice(0,-1);
            updateDialDisplay();
        } else if(key==='Delete'){
            e.preventDefault();
            dialedNumber = '';
            updateDialDisplay();
        } else if(key==='Enter'){
            e.preventDefault();
            initiateCall();
        }
    });
}

// ===== CONTACT PICKER API =====
function initContactPicker(){
    if('contacts' in navigator && 'ContactsManager' in window){
        if(contactPickerBtn) contactPickerBtn.classList.remove('hidden');
        if(contactPickerBtn) contactPickerBtn.addEventListener('click', async()=>{
            try{
                const results = await navigator.contacts.select(['tel'],{multiple:false});
                if(results && results.length>0){
                    const tels = results[0].tel;
                    if(tels && tels.length>0){ dialedNumber=tels[0]; updateDialDisplay(); }
                }
            }catch(e){ console.warn('Contact picker dismissed',e); }
        });
    }
}

// ===== INCOMING CALL DIALOG =====
function requestNotificationPermission(){
    if(!('Notification' in window)) return;
    if(Notification.permission === 'default'){
        Notification.requestPermission().catch(()=>{});
    }
}

function showBrowserNotification(displayName, callerNumber){
    if(!('Notification' in window) || Notification.permission !== 'granted') return;
    try{
        if(activeNotification){ activeNotification.close(); activeNotification = null; }
        const body = (displayName !== callerNumber && displayName)
            ? `${displayName} (${normalizePhone(callerNumber)})`
            : normalizePhone(callerNumber);
        activeNotification = new Notification('Входящий звонок', {
            body,
            tag: 'incoming-call',
            requireInteraction: true
        });
        activeNotification.onclick = () => {
            window.focus();
            if(activeNotification){ activeNotification.close(); activeNotification = null; }
        };
    }catch(e){ console.warn('[notif] Browser Notification failed', e); }
}

function showIncomingCallDialog(callSignature, callerNumber, callerAlias, subroom, cluster){
    const overlay    = document.getElementById('incomingCallOverlay');
    const nameEl     = document.getElementById('incomingCallerName');
    const numEl      = document.getElementById('incomingCallerNumber');
    const acceptBtn  = document.getElementById('acceptCallBtn');
    const declineBtn = document.getElementById('declineCallBtn');
    const history = loadCallsHistory();
    const localEntry = history.find(e => normalizePhone(e.number) === normalizePhone(callerNumber));
    const displayName = (localEntry && localEntry.alias) || callerAlias || normalizePhone(callerNumber);
    if(nameEl)  nameEl.textContent  = displayName;
    if(numEl)   numEl.textContent   = normalizePhone(callerNumber);
    if(acceptBtn)  acceptBtn.onclick  = () => onAcceptCall(subroom, cluster, callSignature);
    if(declineBtn) declineBtn.onclick = () => onDeclineCall(callSignature);
    if(overlay) overlay.classList.remove('hidden');
}

function hideIncomingCallDialog(){
    const overlay = document.getElementById('incomingCallOverlay');
    if(overlay) overlay.classList.add('hidden');
    activeIncomingCall = null;
    if(activeNotification){ activeNotification.close(); activeNotification = null; }
}

function onAcceptCall(subroom, cluster, callSignature){
    seenCallSignatures.add(callSignature);
    hideIncomingCallDialog();
    SUBROOM = subroom;
    CLUSTER = cluster;
    const u = new URL(window.location.href);
    u.searchParams.set('subroom', SUBROOM);
    window.history.replaceState(null,null,u.toString());
    setState('incall');
}

function onDeclineCall(callSignature){
    seenCallSignatures.add(callSignature);
    hideIncomingCallDialog();
}

// ===== BURGER MENU =====
function openBurgerPanel(){
    renderCallHistory();
    if(panelMyNum) panelMyNum.textContent = localStorage.getItem('myPhoneNumber')||'';
    if(burgerPanel) burgerPanel.classList.add('open');
    if(burgerOverlay) burgerOverlay.classList.remove('hidden');
}
function closeBurgerPanel(){
    if(burgerPanel) burgerPanel.classList.remove('open');
    if(burgerOverlay) burgerOverlay.classList.add('hidden');
}
function renderCallHistory(){
    if(!callHistoryList) return;
    const history = loadCallsHistory();
    callHistoryList.innerHTML = '';
    if(history.length===0){
        callHistoryList.innerHTML='<p style="padding:16px 8px;color:#666">Нет истории звонков</p>';
        return;
    }
    history.forEach((entry,idx)=>{
        const el = document.createElement('div');
        el.className='history-entry';
        const displayName = entry.alias || normalizePhone(entry.number);
        const date = new Date(entry.timestamp).toLocaleString('ru');
        el.innerHTML=`
          <div class="history-info">
            <span class="history-name" data-idx="${idx}">${displayName}</span>
            <span class="history-date">${date}</span>
          </div>
          <button class="history-call-btn" title="Позвонить">📞</button>
          <button class="history-del-btn" title="Удалить">✕</button>`;
        el.querySelector('.history-name').addEventListener('click',()=>startAliasEdit(idx));
        el.querySelector('.history-call-btn').addEventListener('click',()=>{
            closeBurgerPanel();
            dialedNumber = entry.number;
            initiateCall();
        });
        el.querySelector('.history-del-btn').addEventListener('click',()=>{
            removeCallFromHistory(idx);
            renderCallHistory();
        });
        callHistoryList.appendChild(el);
    });
}
function startAliasEdit(idx){
    const history = loadCallsHistory();
    const entry = history[idx];
    const nameEl = callHistoryList.querySelector(`.history-name[data-idx="${idx}"]`);
    if(!nameEl) return;
    const input = document.createElement('input');
    input.type='text'; input.value=entry.alias||''; input.placeholder=normalizePhone(entry.number);
    Object.assign(input.style,{background:'#333',color:'#fff',border:'1px solid #555',
        borderRadius:'4px',padding:'4px 8px',width:'100%',boxSizing:'border-box',fontSize:'15px'});
    nameEl.replaceWith(input);
    input.focus();
    const persist=()=>{ updateCallAlias(entry.number, input.value.trim()); renderCallHistory(); };
    input.addEventListener('blur',persist);
    input.addEventListener('keydown',e=>{ if(e.key==='Enter') input.blur(); if(e.key==='Escape'){ input.removeEventListener('blur',persist); renderCallHistory(); } });
}
function initBurgerMenu(){
    if(burgerBtn) burgerBtn.addEventListener('click', openBurgerPanel);
    if(burgerClose) burgerClose.addEventListener('click', closeBurgerPanel);
    if(burgerOverlay) burgerOverlay.addEventListener('click', closeBurgerPanel);
    if(changeNumberBtn) changeNumberBtn.addEventListener('click',()=>{ closeBurgerPanel(); setState('setup'); });
}

// ===== APP ENTRY POINT =====
function initApp(){
    initContactPicker();
    setupScreenHandlers();
    initDialPad();
    initBurgerMenu();
    const phone = localStorage.getItem('myPhoneNumber');
    setState(phone ? 'dialing' : 'setup');
}

// Инициализация: cluster (unique link) + subroom selection
let CLUSTER = getRoomFromURL();
let SUBROOM = getSubroomFromURL();

// ===== START THE APP =====
initApp();
