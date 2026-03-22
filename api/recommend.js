export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { otts, genres, moods, times, contexts, extra, mbti } = req.body;

  const MBTI_DESC = {
    'E': '외향적(E): 활동적이고 사람들과 어울리는 걸 좋아함',
    'I': '내향적(I): 조용하고 깊은 사색을 즐김',
    'N': '직관형(N): 상상력이 풍부하고 추상적 개념 선호',
    'S': '감각형(S): 현실적이고 구체적인 것 선호',
    'T': '사고형(T): 논리적이고 분석적',
    'F': '감정형(F): 감성적이고 공감 능력이 높음',
    'J': '판단형(J): 계획적이고 완결된 스토리 선호',
    'P': '인식형(P): 유연하고 열린 결말도 즐김',
  };
  const mbtiDesc = mbti?.length
    ? '\nMBTI 성향: ' + mbti.map(m => MBTI_DESC[m] || m).join(', ')
    : '';

  const prompt = `당신은 한국 OTT 콘텐츠 전문 큐레이터입니다.
사용자의 "오늘 상황"까지 고려해서, 지금 바로 고르기 쉬운 추천 5개를 제안하세요.

사용자 취향:
- 보유 OTT: ${otts?.length ? otts.join(', ') : '상관없음'}
- 원하는 장르: ${genres?.length ? genres.join(', ') : '상관없음'}
- 오늘 분위기: ${moods?.length ? moods.join(', ') : '상관없음'}
- 누구랑: ${contexts?.length ? contexts.join(', ') : '상관없음'}
- 시청 시간: ${times?.length ? times.join(', ') : '상관없음'}
- 추가 요청: ${extra || '없음'}${mbtiDesc}

응답 형식 (JSON만, 다른 텍스트 없이):
[
  {
    "title": "작품명 (한국어)",
    "title_en": "영어 제목 또는 원제",
    "year": "연도",
    "type": "movie 또는 tv",
    "genre": "장르",
    "hook": "스포일러 없는 한 줄 추천사(20자 내외)",
    "reason": "왜 지금 이 상황에 딱인지 2~3문장(구체적으로)."
  }
]`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        tools: [{ type: 'web_search_preview' }],
        input: prompt,
        max_output_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json(err);
    }

    const data = await response.json();
    const msg = (data.output || []).find(o => o.type === 'message');
    const text = msg?.content?.find(c => c.type === 'output_text')?.text || '';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('JSON 파싱 실패');
    const recs = JSON.parse(jsonMatch[0]);

    return res.status(200).json(recs);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
