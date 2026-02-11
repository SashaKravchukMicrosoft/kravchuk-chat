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
        localMini.style.transform = 'scaleX(-1)';
    } else {
        // if swapped, main remoteVideo shows local preview
        remoteVideo.srcObject = localStream;
    }
}

function initPeer(){
    const turn = getTurnFromURL();
    const iceServers = [ { urls: "stun:stun.l.google.com:19302" } ];
    if(turn && turn.host){
        const turnEntry = { urls: `turn:${turn.host}` };
        if(turn.username) turnEntry.username = turn.username;
        if(turn.credential) turnEntry.credential = turn.credential;
        iceServers.push(turnEntry);
    }
    pc = new RTCPeerConnection({ iceServers });
    pc.ontrack = e => {
        const remote = e.streams[0];
        if(localMini && isSwapped){
            localMini.srcObject = remote;
            localMini.style.transform = 'scaleX(1)';
        } else {
            remoteVideo.srcObject = remote;
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
    localMini.addEventListener('click', ()=>{
        swapVideos();
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
    // keep local preview mirrored when it shows localStream
    if(localMini.srcObject === localStream) localMini.style.transform = 'scaleX(-1)';
    else localMini.style.transform = 'scaleX(1)';
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
startChat();
