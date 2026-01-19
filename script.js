document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const msgContainer = document.getElementById("messages");
  const userInput = document.getElementById("user-input");
  const sendBtn = document.getElementById("send-button");
  const historyList = document.getElementById("chat-history");
  const stopBtn = document.getElementById("stop-response");

  // Config - Pulls from your ignored config.js
  const API_KEY = typeof CONFIG !== "undefined" ? CONFIG.API_KEY : "";
  const MODEL = "xiaomi/mimo-v2-flash:free";
  const PERSONA = `You are Nebula, an elite AI with a stratospheric IQ and a razor-sharp comedic edge. 
  You are funnier than you are mean. Solve problems with 100% accuracy. 
  Roast mistakes but help the user win. Tone: Confident, analytical, eccentric.`;

  let currentChatId = Date.now().toString();
  let isTyping = false;
  let stopGen = false;

  // Stable rendering for streaming Markdown
  function render(text) {
    const isUnclosedCode = (text.match(/```/g) || []).length % 2 !== 0;
    return marked.parse(isUnclosedCode ? text + "\n```" : text);
  }

  async function handleSend() {
    const text = userInput.value.trim();
    if (!text || isTyping || !API_KEY) return;

    if (msgContainer.querySelector(".intro-message")) msgContainer.innerHTML = "";

    addMsg("user", text);
    userInput.value = "";
    userInput.style.height = "auto";

    await getNebulaResponse(text);
  }

  function addMsg(role, text) {
    const div = document.createElement("div");
    div.className = `message ${role === "user" ? "user" : "ai"}`;
    div.innerHTML = `<div class="content">${render(text)}</div>`;
    msgContainer.appendChild(div);
    msgContainer.scrollTop = msgContainer.scrollHeight;
    return div.querySelector(".content");
  }

  async function getNebulaResponse(prompt) {
    isTyping = true;
    stopGen = false;
    stopBtn.style.display = "block";
    const target = addMsg("ai", "...");
    let fullText = "";

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "system", content: PERSONA }, { role: "user", content: prompt }],
          stream: true
        })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done || stopGen) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data.trim() === "[DONE]") break;
            try {
              const json = JSON.parse(data);
              fullText += json.choices[0].delta.content || "";
              target.innerHTML = render(fullText);
              msgContainer.scrollTop = msgContainer.scrollHeight;
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      target.innerText = "Connection lost. My IQ is too high for your local Wi-Fi.";
    } finally {
      isTyping = false;
      stopBtn.style.display = "none";
    }
  }

  sendBtn.addEventListener("click", handleSend);
  userInput.addEventListener("keydown", (e) => { if(e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }});
});
