let pc, localStream, ws, usingFrontCamera = true;
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

async function startCamera(){
    if(localStream){
        localStream.getTracks().forEach(t=>t.stop());
    }
    const constraints = {
        video: {facingMode: usingFrontCamera ? 'user' : 'environment'},
        audio: true
    };
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
}

function initPeer(){
    pc = new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
    pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
    pc.onicecandidate = e => { if(e.candidate) sendSignal({candidate:e.candidate}); };
    localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
    
    pc.onconnectionstatechange = ()=>{
        if(pc.connectionState==='disconnected' || pc.connectionState==='failed'){
            log("Собеседник отключился, перезапуск...");
            restartChat();
        } else if(pc.connectionState==='connected'){
            log("Соединение установлено!");
        }
    };
}

function sendSignal(msg){
    msg.room = ROOM;
    ws.send(JSON.stringify(msg));
}

async function startChat(){
    log("Запуск камеры...");
    await startCamera();
    initPeer();

    ws = new WebSocket("wss://demo.piesocket.com/v3/channel_1?api_key=demo");

    ws.onopen = async ()=>{
        log("Сигналинг подключён, ожидаем собеседника...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({offer: offer});
        log("Offer отправлен, ждём ответ...");
    };

    ws.onmessage = async e=>{
        const data = JSON.parse(e.data);
        if(data.room!==ROOM) return;

        if(data.offer && !pc.remoteDescription){
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({answer:answer});
            log("Ответ отправлен, соединение устанавливается...");
        } else if(data.answer && !pc.remoteDescription){
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            log("Соединение установлено!");
        } else if(data.candidate){
            try{ await pc.addIceCandidate(data.candidate); }catch(e){}
        }
    };

    ws.onerror = e => log("Ошибка сигналинга");
    ws.onclose = () => log("Сигналинг закрыт");
}

// Переключение камеры
switchCamBtn.onclick = async ()=>{
    usingFrontCamera = !usingFrontCamera;
    if(localStream) localStream.getTracks().forEach(t=>t.stop());
    await startCamera();
    if(pc){
        localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
    }
    log("Камера переключена");
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
