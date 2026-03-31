export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { extra } = req.body ?? {};
  if (!extra || typeof extra !== 'string') {
    return res.status(200).json({ genres: [], moods: [], keywords: [], keywords_en: [], persons: [] });
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
keywords_en 작성 기준:
- TMDB 키워드 검색에 활용되는 영어 키워드
- 사용자 입력의 핵심 테마/소재를 영어로 변환 (예: 로봇→robot, 좀비→zombie, 우울→healing, 복수→revenge)
- 감정/분위기도 영어 테마어로 변환 (예: 우울해→healing comfort, 설레는→romance)
- 참조 작품명은 영어 원제로 (예: 귀멸의 칼날→demon slayer)
- 5개 이내
persons 작성 기준:
- 실존 인물명(배우, 감독, 방송인 등)이 언급된 경우 해당 인물명을 그대로 배열에 담으세요
- 인물명이 없으면 빈 배열 []
- 예: "마동석 나오는 거" → persons: ["마동석"]
- 예: "오은영" → persons: ["오은영"]
- 예: "로봇 영화", "기분이 우울해" → persons: []
규칙:
- moods: 사용자 감정/분위기를 허용 목록에서 선택
- genres: 허용 목록에서만 선택, 직접 추론 가능한 것만
- keywords: 참조 작품명 + 관련 장르/테마
- keywords_en: 핵심 테마를 TMDB 검색에 맞는 영어 키워드로
- persons: 실존 인물명만 (배우/감독/방송인)
- "우울해" → moods: ["편안한","감동적인"], genres: ["치유","드라마"], keywords: ["힐링","위로","따뜻한"], keywords_en: ["healing","comfort","emotional"], persons: []
- "이세계물" → genres: ["이세계","환생","전생"], keywords: ["이세계","환생","전생","먼치킨"], keywords_en: ["isekai","reincarnation"], persons: []
- "귀멸의 칼날 같은 분위기" → genres: ["액션","판타지","성장"], moods: ["긴장되는","무거운"], keywords: ["귀멸의 칼날","액션","판타지","성장","모험"], keywords_en: ["demon slayer","sword","supernatural"], persons: []
- "로봇 영화" → genres: ["SF","액션"], moods: ["신나는"], keywords: ["로봇","SF"], keywords_en: ["robot","mecha","android"], persons: []
- "마동석 나오는 거" → genres: ["액션"], moods: ["신나는"], keywords: ["마동석","액션"], keywords_en: ["action","korean action"], persons: ["마동석"]
- "오은영" → genres: ["다큐","드라마"], moods: ["감동적인","편안한"], keywords: ["육아","심리","치유","가족"], keywords_en: ["parenting","psychology","documentary","family"], persons: ["오은영"]
- "유재석" → genres: ["개그","코미디"], moods: ["가벼운","신나는"], keywords: ["예능","코미디","유머"], keywords_en: ["variety show","comedy","entertainment"], persons: ["유재석"]
- "봉준호 영화" → genres: ["스릴러","드라마"], moods: ["무거운","긴장되는"], keywords: ["사회비판","스릴러","한국영화"], keywords_en: ["social commentary","thriller","korean film"], persons: ["봉준호"]
- 특정 작품 언급 시 keywords에 작품명 반드시 포함
- JSON만 반환, 다른 텍스트 없이
예시 입력: 기분이 우울해
예시 출력:
{"moods":["편안한","감동적인"],"genres":["치유","드라마"],"keywords":["힐링","위로","따뜻한"],"keywords_en":["healing","comfort","emotional"],"persons":[]}
입력: EXTRA_PLACEHOLDER`;
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
        input: prompt.replace('EXTRA_PLACEHOLDER', extra),
        max_output_tokens: 200,
      }),
    });
    if (!response.ok) return res.status(200).json({ genres: [], moods: [], keywords: [], keywords_en: [], persons: [] });
    const data = await response.json();
    const msg = (data.output || []).find(o => o.type === 'message');
    const text = msg?.content?.find(c => c.type === 'output_text')?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(200).json({ genres: [], moods: [], keywords: [], keywords_en: [], persons: [] });
    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json({
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
      moods: Array.isArray(parsed.moods) ? parsed.moods : [],
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      keywords_en: Array.isArray(parsed.keywords_en) ? parsed.keywords_en : [],
      persons: Array.isArray(parsed.persons) ? parsed.persons : [],
    });
  } catch (error) {
    console.error('parse api error:', error);
    return res.status(200).json({ genres: [], moods: [], keywords: [], keywords_en: [], persons: [] });
  }
}
