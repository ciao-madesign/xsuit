import type { Message, PingReply, RestoreReply } from "../shared/messages";

// Page changes arrive in build B3+. For now the content script only answers the popup.
chrome.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
  if (msg.type === "xsuit/ping") {
    const reply: PingReply = { ok: true, applied: false };
    sendResponse(reply);
  } else if (msg.type === "xsuit/restore") {
    const reply: RestoreReply = {
      ok: true,
      restored: false,
      note: "Nothing to restore: no transformation has been applied.",
    };
    sendResponse(reply);
  }
  return false;
});
