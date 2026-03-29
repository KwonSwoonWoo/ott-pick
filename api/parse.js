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
      moods: { type: "array", items: { type: "string" } },
      genres: { type: "array", items: { type: "string" } },
      keywords: { type: "array", items: { type: "string" } },
    },
    required: ["moods", "genres", "keywords"],
  },
};
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { extra } = req.body ?? {};
    if (!extra || typeof extra !== "string") return res.status(400).json({ error: "extra is required" });

    const prompt = `
사용자의 OTT 추천 요청 문장을 분석해서 JSON만 반환하세요.

허용 moods:
["설레는","무거운","가벼운","감동적인","긴장되는","편안한","신나는","슬픈"]

허용 genres:
["로맨스","액션","스릴러","코미디","드라마","SF","판타지","미스터리","다큐","공포","애니","이세계","환생","다크판타지","소년배틀","학원","음식","힐링","무협","스포츠","성장물"]

규칙:
- moods는 사용자의 감정/분위기를 추천 필터로 바꾼다.
- genres는 위 허용 목록에서만 선택한다.
- keywords는 라프텔/TMDB 검색에 쓸 핵심어를 자유롭게 5개 이내로 넣는다.
- "우울해", "지쳤어", "힐링 필요" → moods: ["편안한","감동적인"]
- "이세계물", "환생물", "전생물", "회귀물", "빙의물" → genres: ["이세계","애니"], keywords에 관련 키워드 포함
- "귀멸의 칼날 같은 분위기" → genres: ["액션","판타지","애니"], moods: ["긴장되는","무거운"], keywords: ["귀멸의 칼날","다크판타지","소년배틀","검술","퇴마"]
- "어제 오징어게임 봤어" → genres: ["스릴러","드라마"], moods: ["긴장되는"], keywords: ["오징어게임","서바이벌","사회비판"]
- 특정 작품 레퍼런스가 있으면 keywords에 작품명과 관련 키워드를 반드시 넣는다.
- 결과는 한국어 JSON만 반환한다.

예시 입력: 기분이 우울해
예시 출력:
{
  "moods": ["편안한","감동적인"],
  "genres": ["드라마"],
  "keywords": ["힐링","위로","따뜻한"]
}

입력:
${extra}
`;

    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: "너는 OTT 추천 입력을 구조화된 JSON으로 바꾸는 파서다." },
        { role: "user", content: prompt },
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
    return res.status(500).json({ moods: [], genres: [], keywords: [] });
  }
}
