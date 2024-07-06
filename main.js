let localStream;
let remoteStream;
let peerConnection;
let APP_ID = "agora appid";
let token = null;
let uid = String(Math.floor(Math.random() * 10000))
let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room')
if(!roomId){
    window.location = `lobby.html`
}
let client;
let channel;

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.1.google.com:19302', 'stun:stun2.1.google.com:19302']
        }
    ]
}
let constraints={
    video:{
        width:{min:640,ideal:1920,max:1920},
        height:{min:480,ideal:1080,max:1080},
    },
    audio:true
}
const init = async () => {
    client = await AgoraRTM.createInstance(APP_ID);
    await client.login({ uid, token });
    channel = client.createChannel(roomId);
    await channel.join();
    channel.on('MemberJoined', handleUserJoin);
    channel.on('MemberLeft', handleUserLeft);
    client.on('MessageFromPeer', handleMessageFromPeer)
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById('user-1').srcObject = localStream;

}

let handleUserLeft  = async()=>{
    document.getElementById('user-2').style.display = 'none';
}

let handleMessageFromPeer = async (message, MemberId) => {
    message = JSON.parse(message.text);
    if(message.type === 'offer'){
        createAnswer(MemberId,message.offer);
    }
    if(message.type === 'answer'){
        addAnswer(message.answer);
    }
    if(message.type === 'candidate'){
        if(peerConnection){
            peerConnection.addIceCandidate(message.candidate);
        }
    }
}
let handleUserJoin = async (MemberId) => {
    createOffer(MemberId)
    console.log('new user joined the channel', MemberId)
}
let createPeerConnection = async (MemberId) => {
    peerConnection = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream;

    document.getElementById('user-2').style.display = 'block';

    if (!localStream) {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        document.getElementById('user-1').srcObject = localStream;
    }
    localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStream);
    })

    peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            remoteStream.addTrack(track);
        })
    }

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'candidate', 'candidate': event.candidate }) }, MemberId);

        }
    }
}
let createOffer = async (MemberId) => {
    await createPeerConnection(MemberId);

    let offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    client.sendMessageToPeer({ text: JSON.stringify({ 'type': 'offer', 'offer': offer }) }, MemberId);
    console.log(offer)
}


let createAnswer = async (MemberId,offer) => {
    await createPeerConnection(MemberId);
    await peerConnection.setRemoteDescription(offer);
    let answer  = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    client.sendMessageToPeer({text:JSON.stringify({'type':'answer','answer':answer})},MemberId)
}

let addAnswer =  async(answer)=>{
    if(!peerConnection.currentRemoteDescription){
        peerConnection.setRemoteDescription(answer);
    }
}
let leaveChannel  = async()=>{
     await channel.leave();
     await client.logout();
}

let toggleCamera = async()=>{
    let videoTrack = localStream.getTracks().find(track => track.kind === 'video');
    if(videoTrack.enabled){
        videoTrack.enabled = false;
    }else{
        videoTrack.enabled = true;
    }

}

let toggleAudio = async()=>{
    let audioTrack = localStream.getTracks().find(track => track.kind === 'audio');
    if(audioTrack.enabled){
        audioTrack.enabled = false;
    }else{
        audioTrack.enabled = true;
    }

}

document.getElementById('camera').addEventListener('click',toggleCamera)

document.getElementById('leave').addEventListener('click',leaveChannel)
document.getElementById('audio').addEventListener('click',toggleAudio)


window.addEventListener('beforeunload',leaveChannel)
init();


