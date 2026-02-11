let pc, localStream, ws, usingFrontCamera = true;
const CLIENT_ID = Math.random().toString(36).substring(2,9);
let hasSentOffer = false;
let joinInterval = null;
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
    pc = new RTCPeerConnection({
        iceServers:[
            { urls: "turn:free.expressturn.com:3478", username: "000000002086180959", credential: "BTe2gOGg4BezIV/ZPcW11467m+U=" }
        ]
    });
    pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
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
