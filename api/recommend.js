export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { otts, genres, moods, times, contexts, extra, mbti } = req.body;
  const MBTI_DESC = {
    'ENFP': 'ENFP: 열정적이고 창의적, 다양한 장르와 감성적인 스토리 선호',
    'ESFJ': 'ESFJ: 따뜻하고 사교적, 로맨스·가족·감동 콘텐츠 선호',
    'ESFP': 'ESFP: 활발하고 즉흥적, 코미디·액션·예능 선호',
    'ESTJ': 'ESTJ: 현실적이고 체계적, 드라마·스릴러·범죄 선호',
    'INFP': 'INFP: 감성적이고 이상적, 판타지·로맨스·드라마 선호',
    'INTJ': 'INTJ: 전략적이고 독립적, SF·미스터리·스릴러 선호',
    'ISFJ': 'ISFJ: 세심하고 헌신적, 로맨스·가족·역사물 선호',
    'ISTJ': 'ISTJ: 신중하고 책임감 강함, 드라마·다큐·범죄 선호',
    'ISTP': 'ISTP: 분석적이고 실용적, 액션·범죄·스릴러 선호',
  };
  const mbtiDesc = mbti?.length
    ? '\nMBTI 유형: ' + mbti.map(m => MBTI_DESC[m] || m).join(', ')
    : '';
  const prompt = `당신은 한국 OTT 콘텐츠 전문 큐레이터입니다.
사용자의 "오늘 상황"까지 고려해서, 지금 바로 고르기 쉬운 추천 5개를 제안하세요.

중요: 각 작품마다 반드시 웹 검색으로 실제 줄거리, 분위기, 주요 장면, 시청자 반응을 확인한 뒤 작성하세요.
추측으로 작성하지 말고, 실제 작품 내용에 기반해서 hook과 reason을 써야 합니다.

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
    "hook": "웹 검색으로 확인한 실제 작품 분위기·내용을 바탕으로, 제목과 포스터에 딱 맞는 한 줄 추천사(20자 내외)",
    "reason": "웹 검색으로 확인한 실제 내용을 바탕으로, 왜 지금 이 사용자 상황에 딱인지 2~3문장(구체적으로)."
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
        model: 'gpt-5.4-nano',
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
