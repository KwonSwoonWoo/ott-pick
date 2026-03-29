import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const schema = {
  name: "recommend_parse",
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      moods: {
        type: "array",
        items: { type: "string" },
      },
      genres: {
        type: "array",
        items: { type: "string" },
      },
      keywords: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["moods", "genres", "keywords"],
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { extra } = req.body ?? {};

    if (!extra || typeof extra !== "string") {
      return res.status(400).json({ error: "extra is required" });
    }

    const prompt = `
사용자의 OTT 추천 요청 문장을 분석해서 JSON만 반환하세요.

허용 moods:
["설레는","무거운","가벼운","감동적인","긴장되는","편안한","신나는","슬픈"]

허용 genres:
["로맨스","액션","스릴러","코미디","드라마","SF","판타지","미스터리","다큐","공포","애니"]

규칙:
- moods는 사용자의 감정/분위기를 추천 필터로 바꾼다.
- genres는 직접적으로 추론 가능한 장르만 넣는다.
- keywords는 자유 검색용 핵심어를 넣는다.
- "우울해", "지쳤어", "힐링 필요" 같은 표현은 보통 moods에 ["편안한","감동적인"] 쪽을 우선 고려한다.
- "이세계물", "환생물", "전생물", "회귀물", "빙의물"은 keywords에 반드시 반영한다.
- "귀멸의 칼날 같은 분위기"처럼 특정 작품 레퍼런스가 있으면 keywords에 작품명과 관련 키워드를 넣는다.
- 결과는 한국어 JSON만 반환한다.

예시 입력:
기분이 우울해

예시 출력:
{
  "moods": ["편안한", "감동적인"],
  "genres": ["드라마"],
  "keywords": ["힐링", "위로", "따뜻한"]
}

입력:
${extra}
`;

    const response = await client.responses.create({
      model: "gpt-5.4-nano",
      input: [
        {
          role: "system",
          content: "너는 OTT 추천 입력을 구조화된 JSON으로 바꾸는 파서다.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          ...schema,
        },
      },
    });

    const text = response.output_text;
    const parsed = JSON.parse(text);

    return res.status(200).json(parsed);
  } catch (error) {
    console.error("parse api error:", error);
    return res.status(500).json({
      moods: [],
      genres: [],
      keywords: [],
    });
  }
}
