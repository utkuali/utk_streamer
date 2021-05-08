onNet("utk_render:sendChatMessage", (data) => {
    emitNet("utk_render:receiveChatMessage", -1, data);
})

onNet("utk_render:startStreaming", (data) => {
    emitNet("utk_render:newStream", -1, data);
})

onNet("utk_render:joinStream", (data) => {
    emitNet("utk_render:joinStream", -1, data);
})

onNet("utk_render:sendRTCOffer", (data) => {
    emitNet("utk_render:sendRTCOffer", data.serverid, data);
})

onNet("utk_render:sendRTCAnswer", (data) => {
    emitNet("utk_render:sendRTCAnswer", -1, data);
})

onNet("utk_render:newIceCandidateStreamer", (data) => {
    console.log("sending to " + data.serverid);
    emitNet("utk_render:newIceCandidateStreamer", data.serverid, data);
})

onNet("utk_render:newIceCandidateWatcher", (data) => {
    emitNet("utk_render:newIceCandidateWatcher", -1, data);
})

onNet("utk_render:leaveStream", (data) => {
    emitNet("utk_render:leaveStream", -1, data);
})

onNet("utk_render:stopStream", (data) => {
    emitNet("utk_render:stopStream", -1, data);
})