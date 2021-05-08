var streaming = false;
var watching = false;
var streamId = 0;
var stream = null;
var remoteStream = null;

const chatArea = document.getElementById("chat-area");

let peers = {};

window.addEventListener("keyup", (event) => {
    event.preventDefault();
    //console.log("keyup", event.key);
    if (event.key == "Enter") {
        if (!watching && !streaming) return;
        if (streamId == 0) return;
        let message = document.getElementById("chat-input").value;
    
        if (message && message.length > 0) {
            $.post("https://utk_streamer/sendChatMessage", JSON.stringify({streamId: streamId, message: message}));
            document.getElementById("chat-input").value = "";
        }
    } else if (event.key == "Escape") {
        document.getElementById("wrapper").style.top = "100%";
        $.post("https://utk_streamer/closeNui", "{}");
    }
})

window.addEventListener("message", (event) => {
    if (event.data.type == "open") {
        document.getElementById("wrapper").style.top = "0px";
    } else if (event.data.type == "close") {
        document.getElementById("wrapper").style.top = "100%";
    } else if (event.data.type == "chatentry") {
        if (event.data.streamId == streamId) {
            receiveChatMessage(event.data.message);
        }
    } else if (event.data.type == "icecandidatestreamer") {
        newIceCandidateStreamer(event.data);
    } else if (event.data.type == "icecandidatewatcher") {
        newIceCandidateWatcher(event.data);
    } else if (event.data.type == "joinstream") {
        newPeer(event.data);
    } else if (event.data.type == "receiveoffer") {
        receiveRTCOffer(event.data);
    } else if (event.data.type == "receiveanswer") {
        receiveRTCAnswer(event.data);
    } else if (event.data.type == "joinRequest") {
        receiveJoinRequest(event.data.serverId);
    } else if (event.data.type == "leavestream") {
        leaveStream(event.data);
    } else if (event.data.type == "stopstream") {
        stopStream(event.data);
    }
})

function receiveChatMessage(message) { //? receive chat message and append it to chat area
    console.log("receiveChatMessage", message);
    let node = document.createElement("div");
    node.classList.add("chat-entry");
    node.innerText = message;
    chatArea.append(node);
}

document.getElementById("join-stream").addEventListener("click", () => {
    if (streaming || watching) return;
    watching = true;
    let unique = document.getElementById("join-stream-code").value;

    if (unique && !isNaN(Number(unique))) {
        let id = Number(unique);

        $.post("https://utk_streamer/tryJoinStream", JSON.stringify({streamId: id}), (response) => {
            if (response) {
                StartWatching(id, response);
            } else {
                watching = false;
                document.getElementById("join-stream-code").value = "Invalid Stream Code";
            }
        })
    }
})

document.getElementById("stop-stream").addEventListener("click", () => {
    if (streaming) {
        streaming = false;
        $.post("https://utk_streamer/stopStream", JSON.stringify({streamId: streamId}));
        streamId = 0;
        for (i in peers) {
            peers[i].RTC.close();
        }
        RTC.close();
        MainRender.stop();
    } else if (watching) {
        watching = false;
        streamId = 0;
        RTC.close();
        let video = document.getElementById("target-stream");
        $.post("https://utk_streamer/leaveStream", JSON.stringify({streamId: streamId}))
        video.pause();
        video.srcObject = null;
    }
})

document.getElementById("start-stream").addEventListener("click", () => {
    if (streaming || watching) return;
    streaming = true;
    //let unique = new Date().getTime();
    let unique = 1;
    let canvas = document.getElementById("self-render");
    canvas.style.display = "block";

    console.log("unique", unique);

    MainRender.renderToTarget(canvas);
    StartStreaming(unique);
})

//! WEBRTC Functions

var RTC = null;
const RTCServers = {iceServers: [{urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']}], iceCandidatePoolSize: 10};

async function StartStreaming(id) { //? start the stream and send streamId and offerObject to server
    if (RTC) RTC.close();
    document.getElementById("chat-area").innerHTML = "";
    streamId = id;

    document.getElementById("target-stream").style.display = "none";
    document.getElementById("self-render").style.display = "block";
    //stream = document.getElementById("self-render").captureStream();

    $.post("https://utk_streamer/startStreaming", JSON.stringify({streamId: streamId}));
}

async function newPeer(data) {
    console.log("newPeer", data);
    if (watching || !streaming) return;
    if (peers[data.serverid]) return;
    peers[data.serverid] = {serverid: data.serverid, RTC: null, ready: false}
    peers[data.serverid].RTC = new RTCPeerConnection(RTCServers);
    peers[data.serverid].RTC.onicecandidate = (event) => {
        if (event.candidate) {
            let candidate = new RTCIceCandidate(event.candidate);
            peers[data.serverid].RTC.addIceCandidate(candidate);
            console.log("icecandidatestreamer", {streamId: data.streamId, serverid: data.serverid, candidate: candidate})
            $.post("https://utk_streamer/newIceCandidateStreamer", JSON.stringify({streamId: data.streamId, serverid: data.serverid, candidate: candidate}));
        }
    }

    let stream = document.getElementById("self-render").captureStream();

    stream.getTracks().forEach(track => {
        //console.log("addtrack to " + serverId);
        peers[data.serverid].RTC.addTrack(track, stream);
    });

    let candidateOffer = await peers[data.serverid].RTC.createOffer();
    await peers[data.serverid].RTC.setLocalDescription(candidateOffer);

    let offerObject = {
        sdp: candidateOffer.sdp,
        type: candidateOffer.type
    }

    $.post("https://utk_streamer/sendRTCOffer", JSON.stringify({streamId: data.streamId, serverid: data.serverid, offer: offerObject}));
}

async function leaveStream(data) {
    if (peers[data.serverid]) {
        peers[data.serverid].RTC.close();
        peers[data.serverid] = null;
    };
}

async function stopStream(data) {
    if (streamId == data.streamId) {
        if (RTC) {
            watching = false;
            streamId = 0;
            RTC.close();
            let video = document.getElementById("target-stream");
            video.pause();
            video.srcObject = null;
        }
    }
}

async function StartWatching(id, serverid) { //? start watching a stream
    document.getElementById("chat-area").innerHTML = "";
    watching = true;
    streamId = id;
    if (RTC) RTC.close();
    RTC = new RTCPeerConnection(RTCServers);

    document.getElementById("self-render").style.display = "none";
    let video = document.getElementById("target-stream");
    video.style.display = "block";
    //video.pause()
    //video.src = "";
    video.srcObject = new MediaStream(); //? create a media stream for remote stream

    RTC.onicecandidate = (event) => {
        if (event.candidate) {
            let candidate = new RTCIceCandidate(event.candidate);
            RTC.addIceCandidate(candidate);
            console.log("icecandidatewatcher", {streamId: streamId, candidate: candidate, serverid: serverid})
            $.post("https://utk_streamer/newIceCandidateWatcher", JSON.stringify({streamId: streamId, candidate: candidate, serverid: serverid}));
        }
    }

    RTC.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
            video.srcObject.addTrack(track);
        })
    }

    // let sessionDesc = new RTCSessionDescription(JSON.parse(desc));
    // await RTC.setLocalDescription(sessionDesc);

    // let candidateAnswer = await RTC.createAnswer();
    // await RTC.setLocalDescription(candidateAnswer);

    // let answerObject = {
    //     sdp: candidateAnswer.sdp,
    //     type: candidateAnswer.type
    // }

    $.post("https://utk_streamer/joinStream", JSON.stringify({streamId: streamId, serverid: serverid}));
}

async function receiveRTCOffer(data) {
    console.log("receiveRTCOffer", data);
    //console.log("RTC", RTC);
    let sessionDesc = new RTCSessionDescription(data.offer);
    await RTC.setRemoteDescription(sessionDesc);

    let candidateAnswer = await RTC.createAnswer();
    await RTC.setLocalDescription(candidateAnswer);

    let answerObject = {
        sdp: candidateAnswer.sdp,
        type: candidateAnswer.type
    }

    $.post("https://utk_streamer/sendRTCAnswer", JSON.stringify({streamId: data.streamId, serverid: data.serverid, answer: answerObject}))
}

async function receiveRTCAnswer(data) { //? receive answer from watcher
    console.log("receiveRTCAnswer", data);
    if (peers[data.serverid]) {
        let answer = new RTCSessionDescription(data.answer);
        await peers[data.serverid].RTC.setRemoteDescription(answer);
        peers[data.serverid].ready = true;
    }
}

async function newIceCandidateStreamer(data) { //? receive an ice candidate from streamer
    console.log("newIceCandidateStreamer", data);
    if (streamId == data.streamId) {
        let candidate = new RTCIceCandidate(data.candidate);
        RTC.addIceCandidate(candidate);
    }
}

async function newIceCandidateWatcher(data) { //? receive an ice candidate from watcher
    console.log("newIceCandidateWatcher", data);
    if (peers[data.serverid]) {
        let candidate = new RTCIceCandidate(data.candidate);
        peers[data.serverid].RTC.addIceCandidate(candidate)
    }
}