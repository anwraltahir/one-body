import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getChatResponse(message: string, history: { role: string, parts: { text: string }[] }[]) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    أنت المساعد الذكي لمنصة "الجسد الواحد" الخيرية في السودان.
    مهمتك هي:
    1. مساعدة المستخدمين في اختيار المشاريع الخيرية المناسبة لهم.
    2. الإجابة على استفسارات حول كيفية التبرع أو إنشاء المشاريع.
    3. تقديم نصائح حول أنواع الصدقات (صدقة جارية، زكاة، إلخ).
    4. تشجيع المستخدمين بأسلوب إنساني وودود ومحفز.
    5. إذا سألك المستخدم عن مشاريع معينة، اقترح عليه تصنيفات مثل (مياه، مساجد، تعليم، صحة).
    
    تحدث باللغة العربية بلهجة سودانية مهذبة أو لغة عربية فصحى بسيطة.
    كن ملهماً وشفافاً.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        ...history,
        { role: "user", parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "عذراً، واجهت مشكلة في الاتصال. هل يمكنك المحاولة مرة أخرى؟";
  }
}
