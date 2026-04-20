// NutriSnap webhook handler
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ status: "ok" });
  }

  const LINE_TOKEN = "1tIxYulOCEIQJ/OkbwaoMkbwca5JwuSiZcLOpJ/JnltyWRmXjqDiDhZ0k584JDfBEsWjO+QezS2CGcIl9+/k4NCwZVq/Cog50byxyt7w8UpqtSipTqeKIq1XO6qR9oJnCik49ocLaN9arBiwrpq5CQdB04t89/1O/w1cDnyilFU=";
  const OPENAI_KEY = "sk-proj-jGqkbvE0Kmf8WrkRJe2uXVZp2U6Uv9Bx-P5QM86Xxn-zyQmzEl_kI07mIa3B1D4wzy70RndN6nT3BlbkFJ_UEeHz3Qtay7o2tvTGIywfJh_96_M8gHw-wnxvcxCSBgzCY-SiaK08XK1wuLWxjJuvfPL8QS8";
  const SHEET_ID   = "1CROu1WqL9ophrV4a9JF_WfPuWRvOF71DW-WyZe3VI40";

  try {
    const body = req.body;
    const events = body.events || [];

    for (const ev of events) {
      if (ev.type !== "message") continue;
      const uid   = ev.source.userId;
      const reply = ev.replyToken;
      const msg   = ev.message;

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
            messages: [{
              role: "user",
              content: [
                { type: "text", text: "你是專業營養師。分析這張食物照片，用繁體中文，每項獨立一行：食物內容：\n熱量：\n蛋白質：\n蔬菜評級：\n建議：" },
                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } }
              ]
            }]
          })
        });
        console.log("OpenAI response:", JSON.stringify(aiData));
        const text = aiData?.choices?.[0]?.message?.content || "AI 辨識失敗，請重試";

        await fetch("https://api.line.me/v2/bot/reply", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LINE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            replyToken: reply,
            messages: [{ type: "text", text: text }]
          })
        });

      } else if (msg.type === "text") {
        await fetch("https://api.line.me/v2/bot/reply", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LINE_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            replyToken: reply,
            messages: [{ type: "text", text: "請傳送食物照片，我會幫你分析營養！" }]
          })
        });
      }
    }
  } catch (err) {
    console.error(err);
  }

  res.status(200).json({ status: "ok" });
}
