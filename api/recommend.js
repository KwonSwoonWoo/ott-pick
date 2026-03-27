export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
 
  const { otts, genres, moods, times, contexts, extra, mbti, candidates } = req.body;
 
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
 
  const hasCandidates = candidates && candidates.length > 0;
 
  const prompt = hasCandidates
    ? `당신은 한국 OTT 콘텐츠 전문 큐레이터입니다.
아래 후보 목록은 사용자가 보유한 OTT에서 실제 서비스 중인 작품들입니다.
사용자 취향을 분석해서 이 목록 중 가장 잘 맞는 5개를 골라 추천하세요.
 
[규칙 - 절대 준수]
- 반드시 아래 후보 목록에 있는 작품만 선택하세요. 목록에 없는 작품은 절대 추가하지 마세요.
- title과 title_en은 후보 목록의 값을 그대로 사용하세요. 수정하지 마세요.
- source도 후보 목록의 값을 그대로 사용하세요.
- hook과 reason만 창의적으로 작성하세요.
- reason에 URL이나 링크를 포함하지 마세요.
- 다양한 OTT의 작품이 고루 포함되도록 선택하세요.
 
[후보 작품 목록]
${candidates.map((c, i) => `${i + 1}. title: "${c.title}", title_en: "${c.title_en || ''}", genre: "${c.genre || ''}", source: "${c.source}"`).join('\n')}
 
사용자 취향:
- 원하는 장르: ${genres?.length ? genres.join(', ') : '상관없음'}
- 오늘 분위기: ${moods?.length ? moods.join(', ') : '상관없음'}
- 누구랑: ${contexts?.length ? contexts.join(', ') : '상관없음'}
- 시청 시간: ${times?.length ? times.join(', ') : '상관없음'}
- 추가 요청: ${extra || '없음'}${mbtiDesc}
 
응답 형식 (JSON만, 다른 텍스트 없이):
[
  {
    "title": "후보 목록의 title 그대로",
    "title_en": "후보 목록의 title_en 그대로",
    "year": "연도",
    "type": "movie 또는 tv",
    "genre": "장르",
    "source": "후보 목록의 source 그대로 (laftel 또는 tmdb)",
    "hook": "이 작품의 분위기·매력을 담은 한 줄 추천사(20자 내외)",
    "reason": "왜 지금 이 사용자 상황에 딱인지 2~3문장. URL 포함 금지."
  }
]`
    : `당신은 한국 OTT 콘텐츠 전문 큐레이터입니다.
사용자의 "오늘 상황"까지 고려해서, 지금 바로 고르기 쉬운 추천 5개를 제안하세요.
 
[가장 중요한 규칙 - 절대 위반 금지]
- 작품을 추천하기 전 반드시 웹 검색으로 해당 작품이 실제로 존재하는지 먼저 확인하세요.
- 검색으로 확인되지 않은 작품은 절대 추천하지 마세요.
- 제목을 지어내거나 추측으로 작성하는 것은 절대 금지입니다.
- 확신이 없으면 추천하지 말고, 대신 널리 알려진 검증된 인기작을 추천하세요.
- 5개를 채우기 위해 불확실한 작품을 넣지 마세요.
 
[제목 규칙]
- title(한국어): TMDB 또는 해당 OTT 공식 한국어 제목을 사용하세요.
- title_en(영어): TMDB에서 검색 가능한 정확한 영어 원제를 사용하세요.
- 보유 OTT에서 실제로 서비스 중인 작품만 추천하세요.
 
[콘텐츠 규칙]
- 각 작품마다 반드시 웹 검색으로 실제 내용을 확인한 뒤 작성하세요.
- reason에 URL이나 링크를 포함하지 마세요.
 
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
    "title": "TMDB 또는 OTT 공식 한국어 제목",
    "title_en": "TMDB 정확한 영어 원제",
    "year": "연도",
    "type": "movie 또는 tv",
    "genre": "장르",
    "source": "tmdb",
    "hook": "실제 작품 분위기·내용을 바탕으로 한 줄 추천사(20자 내외)",
    "reason": "왜 지금 이 사용자 상황에 딱인지 2~3문장. URL 포함 금지."
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
        tools: hasCandidates ? [] : [{ type: 'web_search_preview' }],
        input: prompt,
        max_output_tokens: 3000,
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
 
