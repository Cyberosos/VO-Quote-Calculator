// AOVO Tashkeel server — Cloudflare Worker
// Keeps your Claude API key secret and adds tashkeel to Arabic text.
//
// Settings to add in Cloudflare (Worker > Settings > Variables and Secrets):
//   ANTHROPIC_API_KEY  (type: Secret)  -> your key from console.anthropic.com
//   ALLOWED_ORIGIN     (type: Text)    -> your app's address, e.g. https://ahmed.github.io
//                                         (use * only while testing)

const MODEL = "claude-sonnet-5-5"; // good Arabic quality at a fair price
const MAX_CHARS = 4000;            // longest text accepted in one request

const PROMPTS = {
  full: `You are an expert in Arabic grammar (النحو والصرف) preparing scripts for professional voiceover artists.
Add complete and correct tashkeel (الحركات: فتحة، ضمة، كسرة، سكون، شدة، تنوين) to every letter of the Arabic text the user sends.
Rules:
- Never change, add, remove, or reorder any word. Only add diacritics.
- Apply correct i'rab at word endings according to each word's grammatical role.
- Keep all punctuation, numbers, line breaks, and spacing exactly as they are.
- Leave non-Arabic words (English, brand names, numbers) untouched.
- Keep anything inside [square brackets] exactly as it is; those are performance notes, not script.
- Return ONLY the diacritized text, with no explanation, title, or quotation marks.`,

  light: `You are an expert in Arabic grammar preparing scripts for professional voiceover artists.
Add tashkeel ONLY where a reader could mispronounce or misread the word: ambiguous words, word endings that carry i'rab, shadda, and uncommon names or terms. Leave obvious words without diacritics.
Rules:
- Never change, add, remove, or reorder any word. Only add diacritics.
- Keep all punctuation, numbers, line breaks, and spacing exactly as they are.
- Leave non-Arabic words untouched.
- Keep anything inside [square brackets] exactly as it is; those are performance notes, not script.
- Return ONLY the resulting text, with no explanation, title, or quotation marks.`
};

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    const reply = (obj, status = 200) =>
      new Response(JSON.stringify(obj), {
        status,
        headers: { ...cors, "Content-Type": "application/json; charset=utf-8" },
      });

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return reply({ error: "Use POST" }, 405);

    let body;
    try { body = await request.json(); } catch { return reply({ error: "Invalid request" }, 400); }

    const text = (body.text || "").trim();
    const mode = body.mode === "light" ? "light" : "full";
    if (!text) return reply({ error: "النص فارغ" }, 400);
    if (text.length > MAX_CHARS)
      return reply({ error: `النص طويل جدًا (الحد الأقصى ${MAX_CHARS} حرف)` }, 400);
    if (!/[\u0600-\u06FF]/.test(text)) return reply({ error: "لا يوجد نص عربي" }, 400);

    if (!env.ANTHROPIC_API_KEY) return reply({ error: "مفتاح API غير مضاف في إعدادات Cloudflare" }, 500);

    let apiRes;
    try {
    apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 16000,
        system: PROMPTS[mode],
        messages: [{ role: "user", content: text }],
      }),
    });
    } catch (e) {
      return reply({ error: "تعذّر الوصول إلى Claude: " + e.message }, 502);
    }

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.log("Anthropic error:", apiRes.status, detail);
      const why = apiRes.status === 401 ? "مفتاح API غير صحيح"
                : apiRes.status === 400 && detail.includes("credit") ? "لا يوجد رصيد في حساب Anthropic"
                : apiRes.status === 404 ? "اسم النموذج غير صحيح"
                : "خطأ من Claude (" + apiRes.status + ")";
      return reply({ error: why }, 502);
    }

    const data = await apiRes.json();
    const result = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    return reply({ result, mode });
  },
};
