RegisterNuiCallbackType("sendChatMessage");
RegisterNuiCallbackType("tryJoinStream");
RegisterNuiCallbackType("joinStream");
RegisterNuiCallbackType("newIceCandidateStreamer");
RegisterNuiCallbackType("newIceCandidateWatcher");
RegisterNuiCallbackType("startStreaming");
RegisterNuiCallbackType("sendRTCOffer");
RegisterNuiCallbackType("sendRTCAnswer");
RegisterNuiCallbackType("leaveStream");
RegisterNuiCallbackType("stopStream");
RegisterNuiCallbackType("closeNui");

var SendNUIMessage = (data) => SendNuiMessage(JSON.stringify(data));
const activeStreams = {};
let myStream = false;
let nuiOpen = false;
let frontCam = false;

var cameraLoop = null;

RegisterCommand("streamer", (args) => {
    if (!nuiOpen) {
        nuiOpen = true;
        SetNuiFocus(true, true);
        SendNUIMessage({type: "open"});
    } else {
        nuiOpen = false;
        SetNuiFocus(false, false);
        SendNUIMessage({type: "close"});
    }
})

on("__cfx_nui:closeNui", (data, cb) => {
    cb("ok");
    nuiOpen = false;
    SetNuiFocus(false, false);
})

on("__cfx_nui:sendChatMessage", (data, cb) => {
    cb("ok");
    emitNet("utk_render:sendChatMessage", data);
})

on("__cfx_nui:tryJoinStream", (data, cb) => {
    if (activeStreams[data.streamId]) {
        let serverid = GetPlayerServerId(PlayerId())
        console.log("serverid", serverid);
        cb(serverid);
    } else {
        cb(false);
    }
})

on("__cfx_nui:joinStream", (data, cb) => {
    cb("ok");
    emitNet("utk_render:joinStream", data);
})

on("__cfx_nui:newIceCandidateStreamer", (data, cb) => {
    cb("ok");
    emitNet("utk_render:newIceCandidateStreamer", data);
})

on("__cfx_nui:newIceCandidateWatcher", (data, cb) => {
    cb("ok");
    emitNet("utk_render:newIceCandidateWatcher", data);
})

on("__cfx_nui:startStreaming", (data, cb) => {
    cb("ok")
    myStream = data.streamId;
    CreateMobilePhone(1)
    CellCamActivate(true, true)
    cameraLoop = setInterval(() => {
        if (IsControlJustPressed(1, 27)) {
            frontCam = !frontCam
            exports["utk_render"].CellFrontCamActivate(frontCam)
        } else if (IsControlJustPressed(1, 177)) {
            DestroyMobilePhone()
            CellCamActivate(false, false)
            clearInterval(cameraLoop);
            cameraLoop = null;
        }
        HideHudComponentThisFrame(7)
        HideHudComponentThisFrame(8)
        HideHudComponentThisFrame(9)
        HideHudComponentThisFrame(6)
        HideHudComponentThisFrame(19)
        HideHudAndRadarThisFrame()
    }, 1);
    emitNet("utk_render:startStreaming", data);
})

on("__cfx_nui:sendRTCOffer", (data, cb) => {
    cb("ok")
    emitNet("utk_render:sendRTCOffer", data);
})

on("__cfx_nui:sendRTCAnswer", (data, cb) => {
    cb("ok")
    emitNet("utk_render:sendRTCAnswer", data);
})

on("__cfx_nui:leaveStream", (data, cb) => {
    cb("ok")
    data.serverid = GetPlayerServerId(PlayerId())
    emitNet("utk_render:leaveStream", data);
})

on("__cfx_nui:stopStream", (data, cb) => {
    cb("ok")
    emitNet("utk_render:stopStream", data);
    clearInterval(cameraLoop);
})

onNet("utk_render:receiveChatMessage", (data) => {
    SendNUIMessage({type: "chatentry", streamId: data.streamId, message: data.message});
})

onNet("utk_render:newStream", (data) => {
    activeStreams[data.streamId] = true;
})

onNet("utk_render:joinStream", (data) => {
    if (myStream == data.streamId) {
        SendNUIMessage({type: "joinstream", streamId: data.streamId, serverid: data.serverid});
    }
})

onNet("utk_render:sendRTCOffer", (data) => {
    SendNUIMessage({type: "receiveoffer", streamId: data.streamId, serverid: data.serverid, offer: data.offer});
})

onNet("utk_render:sendRTCAnswer", (data) => {
    if (myStream == data.streamId) {
        SendNUIMessage({type: "receiveanswer", streamId: data.streamId, serverid: data.serverid, answer: data.answer});
    }
})

onNet("utk_render:newIceCandidateStreamer", (data) => {
    SendNUIMessage({type: "icecandidatestreamer", streamId: data.streamId, candidate: data.candidate});
})

onNet("utk_render:newIceCandidateWatcher", (data) => {
    if (myStream == data.streamId) {
        SendNUIMessage({type: "icecandidatewatcher", streamId: data.streamId, serverid: data.serverid, candidate: data.candidate});
    }
})

onNet("utk_render:leaveStream", (data) => {
    if (myStream == data.streamId) {
        SendNUIMessage({type: "leavestream", serverid: data.serverid});
    }
})

onNet("utk_render:stopStream", (data) => {
    if (myStream != data.streamId) {
        SendNUIMessage({type: "stopstream", streamId: data.streamId, serverid: data.serverid, candidate: data.candidate});
    } else {
        myStream = false
    }
})