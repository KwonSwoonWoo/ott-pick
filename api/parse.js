export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { extra } = req.body ?? {};
  if (!extra || typeof extra !== 'string') {
    return res.status(200).json({ genres: [], moods: [], keywords: [] });
  }

  const prompt = `사용자의 OTT 추천 요청 문장을 분석해서 JSON만 반환하세요.

허용 moods (이 목록에서만 선택):
["설레는","무거운","가벼운","감동적인","긴장되는","편안한","신나는","슬픈"]

허용 genres (이 목록에서만 선택 - 라프텔 실제 장르 기준):
["로맨스","액션","스릴러","코미디","드라마","SF","판타지","미스터리","공포","이세계","환생","전생","성장","일상","스포츠","음식","음악","치유","개그","러브코미디","모험","아포칼립스","악역영애","하렘","BL","GL","무거움","경쟁","추리","전쟁","히어로","아이돌","먼치킨"]

keywords 작성 기준:
- 라프텔 CSV의 title, content 필드 검색에 활용됨
- 참조 작품명, 위 genres 목록 값, CSV에 실제 있을 법한 테마어 위주로 작성
- 5개 이내

규칙:
- moods: 사용자 감정/분위기를 허용 목록에서 선택
- genres: 허용 목록에서만 선택, 직접 추론 가능한 것만
- keywords: 참조 작품명 + 관련 장르/테마
- "우울해","형 우울해","지쳤어","힐링 필요","위로받고 싶어" → moods: ["편안한","감동적인"], genres: ["치유","드라마"], keywords: ["힐링","위로","따뜻한"]
- "이세계물","환생물","전생물","회귀물","빙의물" → genres: ["이세계","환생","전생"], keywords: ["이세계","환생","전생","먼치킨"]
- "귀멸의 칼날 같은 분위기" → genres: ["액션","판타지","성장"], moods: ["긴장되는","무거운"], keywords: ["귀멸의 칼날","액션","판타지","성장","모험"]
- "어제 오징어게임 봤어" → genres: ["스릴러","드라마"], moods: ["긴장되는"], keywords: ["서바이벌","스릴러","무거움"]
- 특정 작품 언급 시 keywords에 작품명 반드시 포함
- JSON만 반환, 다른 텍스트 없이

예시 입력: 기분이 우울해
예시 출력:
{"moods":["편안한","감동적인"],"genres":["치유","드라마"],"keywords":["힐링","위로","따뜻한"]}

입력: ${extra}`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        input: prompt,
        max_output_tokens: 200,
      }),
    });

    if (!response.ok) return res.status(200).json({ genres: [], moods: [], keywords: [] });

    const data = await response.json();
    const msg = (data.output || []).find(o => o.type === 'message');
    const text = msg?.content?.find(c => c.type === 'output_text')?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ genres: [], moods: [], keywords: [] });

    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json({
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
      moods: Array.isArray(parsed.moods) ? parsed.moods : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    });
  } catch (error) {
    console.error('parse api error:', error);
    return res.status(200).json({ genres: [], moods: [], keywords: [] });
  }
}
