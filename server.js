const express = require("express");
const app = express();
app.use(express.json());

const LINE_TOKEN = process.env.LINE_TOKEN;
const OPENAI_KEY = process.env.OPENAI_KEY;

app.post("/webhook", async (req, res) => {
  res.status(200).json({ status: "ok" });
  try {
    const events = req.body.events || [];
    for (const ev of events) {
      if (ev.type !== "message") continue;
      const reply = ev.replyToken;
      const msg = ev.message;
      if (msg.type === "image") {
        const imgRes = await fetch(
          `https://api-data.line.me/v2/bot/message/${msg.id}/content`,
          { headers: { Authorization: `Bearer ${LINE_TOKEN}` } }
        );
        const imgBuffer = await imgRes.arrayBuffer();
        const b64 = Buffer.from(imgBuffer).toString("base64");
        const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            max_tokens: 300,
            messages: [{ role: "user", content: [
              { type: "text", text: "You are a nutritionist. Analyze this food photo and reply in Traditional Chinese with each item on its own line: food content, calories, protein, vegetable rating, advice." },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } }
            ]}]
          })
        });
        const aiJson = await aiRes.json();
        const text = aiJson?.choices?.[0]?.message?.content || "AI 辨識失敗，請重試";
        await fetch("https://api.line.me/v2/bot/reply", {
          method: "POST",
          headers: { Authorization: `Bearer ${LINE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ replyToken: reply, messages: [{ type: "text", text }] })
        });
      } else if (msg.type === "text") {
        await fetch("https://api.line.me/v2/bot/reply", {
          method: "POST",
          headers: { Authorization: `Bearer ${LINE_TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ replyToken: reply, messages: [{ type: "text", text: "請傳送食物照片，我會幫你分析營養！" }] })
        });
      }
    }
  } catch (err) {
    console.error(err);
  }
});

app.get("/", (req, res) => res.send("NutriSnap OK"));
app.listen(process.env.PORT || 3000, () => console.log("Server running"));
