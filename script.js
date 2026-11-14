/* ==========================================================================
   L'Oréal Smart Product & Routine Advisor - Chatbot Logic
   ========================================================================== */

// 1. Deployed Cloudflare Worker URL
const CLOUDFLARE_WORKER_URL = "https://loreal-chatbot.gonzalez-ivan1201.workers.dev";

// 2. System prompt guiding the AI to stay strictly on L'Oréal & beauty topics
const SYSTEM_PROMPT = `You are the official L'Oréal Smart Product & Routine Advisor.
Your expertise covers L'Oréal's extensive range of makeup, skincare, haircare, hair color, and fragrances (including L'Oréal Paris, CeraVe, La Roche-Posay, Garnier, Maybelline, Lancôme, Redken, and Kérastase), as well as personalized beauty routines and application tips.

Guidelines:
- Give warm, knowledgeable, concise, and well-structured product recommendations and step-by-step routines tailored to the user's skin type, hair type, concerns, or preferences.
- Remember details the user shares during the conversation (such as their name, skin/hair type, or budget) to personalize follow-up responses.
- STRICT TOPIC BOUNDARY: Only answer questions related to L'Oréal products, beauty routines, skincare, makeup, haircare, fragrances, or cosmetics. If a user asks about anything unrelated (such as math, coding, politics, sports, general trivia, or non-beauty topics), politely refuse and steer the conversation back to how you can help with L'Oréal products or beauty routines.`;

// 3. DOM Elements
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const chatWindow = document.getElementById("chatWindow");
const latestQuestionBar = document.getElementById("latestQuestionBar");
const latestQuestionText = document.getElementById("latestQuestionText");

// 4. Conversation History Array (LevelUp: Multi-turn context)
const conversationHistory = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

// 5. Helper function to render a message bubble in the chat window (LevelUp: Chat UI)
function appendMessage(sender, text, isTyping = false) {
  const row = document.createElement("div");
  row.classList.add("msg-row", sender);
  if (isTyping) {
    row.classList.add("typing");
  }

  const label = document.createElement("span");
  label.classList.add("msg-sender");
  label.textContent = sender === "user" ? "You" : "L'Oréal Advisor";

  const bubble = document.createElement("div");
  bubble.classList.add("msg-bubble");
  bubble.textContent = text;

  row.appendChild(label);
  row.appendChild(bubble);
  chatWindow.appendChild(row);

  // Auto-scroll to the latest message
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return row;
}

// 6. Display initial welcome message
const welcomeMessage =
  "👋 Welcome to L'Oréal! I'm your Smart Beauty Advisor. Tell me your name or what you're looking for—skincare, makeup, haircare, or a personalized routine—and I'd love to help!";
appendMessage("ai", welcomeMessage);
conversationHistory.push({
  role: "assistant",
  content: welcomeMessage,
});

// 7. Handle form submission and communicate with Cloudflare Worker
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const messageText = userInput.value.trim();
  if (!messageText) return;

  // LevelUp: Display and reset the user's latest question right above the response area
  latestQuestionText.textContent = messageText;
  latestQuestionBar.hidden = false;

  // Add user message to UI and conversation history
  appendMessage("user", messageText);
  conversationHistory.push({
    role: "user",
    content: messageText,
  });

  // Clear input and disable form while waiting for response
  userInput.value = "";
  userInput.disabled = true;
  sendBtn.disabled = true;

  // Show temporary typing indicator
  const typingRow = appendMessage(
    "ai",
    "Finding the best L'Oréal recommendations for you...",
    true
  );

  try {
    const response = await fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: conversationHistory,
      }),
    });

    if (!response.ok) {
      throw new Error(`Worker responded with status ${response.status}`);
    }

    const data = await response.json();

    // Remove typing indicator
    typingRow.remove();

    // Extract assistant reply from OpenAI Chat Completions format
    const reply = data?.choices?.[0]?.message?.content;

    if (reply) {
      appendMessage("ai", reply);
      conversationHistory.push({
        role: "assistant",
        content: reply,
      });
    } else if (data?.error?.message) {
      appendMessage("ai", `Sorry, there was an API issue: ${data.error.message}`);
    } else {
      appendMessage(
        "ai",
        "Sorry, I couldn't generate a response right now. Please try again."
      );
    }
  } catch (error) {
    typingRow.remove();
    console.error("Chat error:", error);
    appendMessage(
      "ai",
      "Unable to connect to the L'Oréal Advisor service. Please double-check your Cloudflare Worker URL and try again."
    );
  } finally {
    userInput.disabled = false;
    sendBtn.disabled = false;
    userInput.focus();
  }
});