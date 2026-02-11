let pc, localStream, ws, usingFrontCamera = true;
const CLIENT_ID = Math.random().toString(36).substring(2,9);
let hasSentOffer = false;
let joinInterval = null;
const isMobile = (('ontouchstart' in window) || navigator.maxTouchPoints > 0 || window.innerWidth < 768);
let localMini = null;
let isSwapped = false;
const remoteVideo = document.getElementById('remoteVideo');
const statusText = document.getElementById('status');
const switchCamBtn = document.getElementById('switchCamBtn');
const micSelect = document.getElementById('micSelect');
const outputSelect = document.getElementById('outputSelect');
const micToggle = document.getElementById('micToggle');
const outputToggle = document.getElementById('outputToggle');
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
    let room = params.get('room');
    if(!room){
        room = Math.random().toString(36).substring(2,8); // случайный код комнаты
        window.history.replaceState(null,null,'?room='+room);
    }
    return room;
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
        if(pc.connectionState==='disconnected' || pc.connectionState==='failed'){
            log("Собеседник отключился, перезапуск...");
            restartChat();
        } else if(pc.connectionState==='connected'){
            log("Соединение установлено!");
            stopJoinPing();
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
        objectFit: 'cover'
    });
    // Drag & click handling: distinguish drag from click
    let dragState = { dragging: false, startX:0, startY:0, origLeft:0, origTop:0 };
    localMini.addEventListener('pointerdown', (ev)=>{
        // prevent native selection/dragging while we handle custom drag
        ev.preventDefault();
        localMini.setPointerCapture(ev.pointerId);
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

        function onPointerMove(e){
            if(!dragState.dragging) return;
            e.preventDefault();
            const dx = e.clientX - dragState.startX;
            const dy = e.clientY - dragState.startY;
            localMini.style.left = (dragState.origLeft + dx) + 'px';
            localMini.style.top = (dragState.origTop + dy) + 'px';
        }

        function onPointerUp(e){
            localMini.releasePointerCapture(ev.pointerId);
            // restore selection/cursor behavior
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            document.documentElement.style.cursor = '';
            localMini.style.touchAction = 'auto';
            dragState.dragging = false;
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            // if movement was small, treat as click -> swap
            const moved = Math.hypot(e.clientX - dragState.startX, e.clientY - dragState.startY);
            if(moved < 8){
                swapVideos();
            } else {
                // snap to nearest corner
                const vw = window.innerWidth;
                const vh = window.innerHeight;
                const rect = localMini.getBoundingClientRect();
                const cx = rect.left + rect.width/2;
                const cy = rect.top + rect.height/2;
                const left = cx < vw/2;
                const top = cy < vh/2;
                localMini.style.transition = 'left 0.15s, top 0.15s, right 0.15s, bottom 0.15s';
                // snap with 12px offset
                if(left && top){ localMini.style.left='12px'; localMini.style.top='12px'; localMini.style.right='auto'; localMini.style.bottom='auto'; }
                else if(!left && top){ localMini.style.right='12px'; localMini.style.top='12px'; localMini.style.left='auto'; localMini.style.bottom='auto'; }
                else if(left && !top){ localMini.style.left='12px'; localMini.style.bottom='12px'; localMini.style.top='auto'; localMini.style.right='auto'; }
                else { localMini.style.right='12px'; localMini.style.bottom='12px'; localMini.style.top='auto'; localMini.style.left='auto'; }
            }
        }

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
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
    msg.room = ROOM;
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
    }catch(e){ console.error('enumerateDevices failed', e); }
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

async function startChat(){
    log("Запуск камеры...");
    await startCamera();
    initPeer();

    // Use the ROOM value directly as both channel and api_key so each room gets an exclusive WS endpoint
    const wsUrl = `wss://demo.piesocket.com/v3/${ROOM}?api_key=${ROOM}`;
    ws = new WebSocket(wsUrl);

    ws.onopen = async ()=>{
        log("Сигналинг подключён, отправляю JOIN...");
        startJoinPing();
    };

    ws.onmessage = async e=>{
        const data = JSON.parse(e.data);
        if(data.room!==ROOM) return;
        if(data.clientId === CLIENT_ID) return; // ignore our own messages

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
    ws.onclose = () => { stopJoinPing(); log("Сигналинг закрыт"); };
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
        if(pc){ pc.close(); pc = null; }
        if(ws){ ws.close(); ws = null; }
        await startChat();
    }catch(e){ log("Ошибка при перезапуске"); }
}

// Инициализация
const ROOM = getRoomFromURL();
// populate device lists first, then start chat
populateDeviceLists().then(()=>startChat()).catch(()=>startChat());
