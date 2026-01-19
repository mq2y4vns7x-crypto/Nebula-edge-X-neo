document.addEventListener("DOMContentLoaded", () => {
  // Elements from your original UI
  const messagesContainer = document.getElementById("messages");
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const stopButton = document.getElementById("stop-response");
  const regenButton = document.getElementById("regenerate-response");
  
  // Safe Config
  const API_KEY = typeof CONFIG !== 'undefined' ? CONFIG.API_KEY : "";
  const MODEL = "xiaomi/mimo-v2-flash:free";
  const nebulaSystemPrompt = `You are Nebula, an elite AI with a stratospheric IQ and a razor-sharp comedic edge. Roast mistakes but help the user win. Tone: Confident, analytical, and eccentric.`;

  let currentChatId = Date.now().toString();
  let isTyping = false;
  let stopGeneration = false;
  let chatHistory = JSON.parse(localStorage.getItem("chatHistory")) || {};

  // Rendering logic that fixes the "disappearing text" bug
  function updateUI(target, text) {
    const isUnclosed = (text.match(/```/g) || []).length % 2 !== 0;
    target.innerHTML = marked.parse(isUnclosed ? text + "\n```" : text);
    target.querySelectorAll('pre code').forEach(block => hljs.highlightElement(block));
  }

  async function handleSend() {
    const text = userInput.value.trim();
    if (!text || isTyping) return;

    if (!API_KEY) return alert("API Key missing in config.js!");

    // UI cleaning for first message
    if (messagesContainer.querySelector(".intro-message")) messagesContainer.innerHTML = "";

    // Add User Message
    const userDiv = document.createElement("div");
    userDiv.className = "message user";
    userDiv.innerHTML = `<div class="message-content">${text}</div>`;
    messagesContainer.appendChild(userDiv);
    
    userInput.value = "";
    userInput.style.height = "auto";
    
    await getAIResponse(text);
  }

  async function getAIResponse(userText) {
    isTyping = true;
    stopGeneration = false;
    stopButton.style.display = "inline-block";

    const aiDiv = document.createElement("div");
    aiDiv.className = "message ai";
    const aiContent = document.createElement("div");
    aiContent.className = "message-content";
    aiDiv.appendChild(aiContent);
    messagesContainer.appendChild(aiDiv);

    let accumulatedText = "";

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: nebulaSystemPrompt },
            { role: "user", content: userText }
          ],
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done || stopGeneration) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const json = JSON.parse(data);
              accumulatedText += json.choices[0].delta.content || "";
              updateUI(aiContent, accumulatedText);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            } catch (e) {}
          }
        }
      }
    } catch (err) {
      aiContent.innerText = "Error: " + err.message;
    } finally {
      isTyping = false;
      stopButton.style.display = "none";
    }
  }

  sendButton.addEventListener("click", handleSend);
  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Keep your original theme toggle and clear history logic here...
});
