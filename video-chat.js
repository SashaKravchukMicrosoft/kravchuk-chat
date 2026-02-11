let localStream, pc, ws;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const statusText = document.getElementById('status');

function log(msg){ statusText.innerText = msg; }

async function startCamera(){
    localStream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
    localVideo.srcObject = localStream;
}

function initPeer(){
    pc = new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});
    pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
    pc.onicecandidate = e => { if(e.candidate) sendSignal({candidate:e.candidate}); };
    localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
}

function sendSignal(message){
    message.room = ROOM;
    ws.send(JSON.stringify(message));
}

async function startChat(){
    const myNumber = document.getElementById('myNumber').value.trim();
    const peerNumber = document.getElementById('peerNumber').value.trim();
    if(!myNumber || !peerNumber){ log("Введите оба номера!"); return; }

    window.ROOM = btoa(myNumber + "-" + peerNumber);

    await startCamera();
    initPeer();

    ws = new WebSocket("wss://free.blr2.piesocket.com/v3/1?api_key=erThvvWxtJljLufJ79d2dGOrd4CQXtBpebRTjOuV");
    
    ws.onopen = async ()=>{
        log("Подключено к сигналингу, ожидаем соединения...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal({offer: offer});
        log("Offer отправлен, ждём собеседника...");
    };

    ws.onmessage = async msg=>{
        const data = JSON.parse(msg.data);
        if(data.room!==ROOM) return;

        if(data.offer && !pc.remoteDescription){
            await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({answer:answer});
            log("Ответ отправлен! Соединение устанавливается...");
        } else if(data.answer && !pc.remoteDescription){
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            log("Соединение установлено!");
        } else if(data.candidate){
            try{ await pc.addIceCandidate(data.candidate); }catch(e){}
        }
    };

    ws.onerror = e => log("Ошибка сигналинга: " + e.message);
    ws.onclose = () => log("Сигналинг соединение закрыто");
}

document.getElementById('startBtn').onclick = startChat;
