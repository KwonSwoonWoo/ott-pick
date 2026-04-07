export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { otts, genres, moods, times, contexts, extra, mbti, candidates, isAnimeMode, contentType } = req.body;

  const MBTI_DESC = {
    'ENFP': 'ENFP: 열정적이고 창의적인 성격. 감성적인 인간관계 서사와 예상치 못한 반전을 즐김. 다양한 캐릭터가 등장하는 앙상블 드라마, 판타지·로맨스·성장물을 선호.',
    'ESFJ': 'ESFJ: 따뜻하고 사교적인 성격. 가족·우정·사랑을 중심으로 한 감동적인 이야기를 선호. 해피엔딩이 있는 로맨스, 가족 드라마를 좋아함.',
    'ESFP': 'ESFP: 활발하고 즉흥적인 성격. 유머와 에너지가 넘치는 콘텐츠를 선호. 코미디, 스포츠물, 밝고 빠른 전개의 액션을 즐김.',
    'ESTJ': 'ESTJ: 현실적이고 체계적인 성격. 범죄 스릴러, 법정 드라마, 실화 기반 다큐를 선호.',
    'INFP': 'INFP: 감성적이고 이상주의적인 성격. 시적인 분위기의 판타지, 애잔한 로맨스, 성장과 치유를 다룬 드라마를 즐김.',
    'INTJ': 'INTJ: 전략적이고 독립적인 성격. SF, 미스터리, 심리 스릴러, 정치 드라마를 즐김.',
    'ISFJ': 'ISFJ: 세심하고 헌신적인 성격. 역사물, 가족 드라마, 잔잔한 로맨스를 즐김.',
    'ISTJ': 'ISTJ: 신중하고 책임감 강한 성격. 범죄 수사물, 다큐멘터리, 역사 드라마를 즐김.',
    'ISTP': 'ISTP: 분석적이고 실용적인 성격. 범죄물, 스릴러, 서바이벌을 즐김.',
  };

  const mbtiDesc = mbti?.length
    ? '\nMBTI 유형: ' + mbti.map(m => MBTI_DESC[m] || m).join(', ')
    : '';

  const hasCandidates = candidates && candidates.length > 0;
  const animeInstruction = isAnimeMode ? "\n[중요] 사용자가 애니메이션을 원합니다. 반드시 5개 모두 애니메이션 작품으로 추천하세요." : "";
  const contentTypeInstruction = contentType === '시리즈'
    ? "\n[중요] 사용자가 TV 시리즈를 원합니다. 반드시 5개 모두 TV 시리즈만 추천하고 type은 반드시 \"tv\"로 설정하세요."
    : contentType === '영화'
    ? "\n[중요] 사용자가 영화를 원합니다. 반드시 5개 모두 영화만 추천하고 type은 반드시 \"movie\"로 설정하세요."
    : "";

  // OTT별 후보 수 계산
  let ottRatioDesc = '';
  if (hasCandidates) {
    const laftelCount = candidates.filter(c => c.source === 'laftel').length;
    const tmdbCount = candidates.filter(c => c.source === 'tmdb').length;
    const total = laftelCount + tmdbCount;
    if (laftelCount > 0 && tmdbCount > 0) {
      const laftelTarget = Math.round(5 * laftelCount / total);
      const tmdbTarget = 5 - laftelTarget;
      ottRatioDesc = `\n[OTT별 추천 비율 - 반드시 준수]\n- source가 "laftel"인 작품: 정확히 ${laftelTarget}개\n- source가 "tmdb"인 작품: 정확히 ${tmdbTarget}개`;
    } else if (laftelCount > 0) {
      ottRatioDesc = '\n[OTT별 추천 비율]\n- source가 "laftel"인 작품: 5개';
    } else {
      ottRatioDesc = '\n[OTT별 추천 비율]\n- source가 "tmdb"인 작품: 5개';
    }
  }

  const prompt = hasCandidates
    ? `당신은 한국 OTT 콘텐츠 전문 큐레이터입니다.
아래 후보 목록은 사용자가 보유한 OTT에서 실제 서비스 중인 작품들입니다.
사용자 취향을 분석해서 이 목록 중 가장 잘 맞는 5개를 골라 추천하세요.

[규칙 - 절대 준수]
- 반드시 아래 후보 목록에 있는 작품만 선택하세요. 목록에 없는 작품은 절대 추가하지 마세요.
- title과 title_en은 후보 목록의 값을 그대로 사용하세요.
- source도 후보 목록의 값을 그대로 사용하세요.
- poster_path도 후보 목록의 값을 그대로 사용하세요.
- hook과 reason만 창의적으로 작성하세요.
- reason에 URL이나 링크를 포함하지 마세요.${ottRatioDesc}

[후보 작품 목록]
${candidates.map((c, i) => `${i + 1}. title: "${c.title}", title_en: "${c.title_en || ''}", genre: "${c.genre || ''}", source: "${c.source}", poster_path: "${c.poster_path || ''}"${c.content ? ', description: "' + c.content.slice(0, 100).replace(/"/g, "'") + '..."' : ''}`).join('\n')}

[사용자 자유 입력 처리 - 최우선 반영]
- "~같은 분위기" → 후보 목록의 description을 읽고 분위기가 가장 유사한 작품 선별
- 감정/기분 표현 → 그 감정에 맞는 작품 추천
- 이미 본 작품 언급 → 비슷하지만 다른 작품 추천

사용자 취향:
- 원하는 장르: ${genres?.length ? genres.join(', ') : '상관없음'}
- 오늘 분위기: ${moods?.length ? moods.join(', ') : '상관없음'}
- 누구랑: ${contexts?.length ? contexts.join(', ') : '상관없음'}
- 시청 시간: ${times?.length ? times.join(', ') : '상관없음'}
- 추가 요청: ${extra || '없음'}${mbtiDesc}${animeInstruction}${contentTypeInstruction}

응답 형식 (JSON만, 다른 텍스트 없이):
[
  {
    "title": "후보 목록의 title 그대로",
    "title_en": "후보 목록의 title_en 그대로",
    "year": "연도",
    "type": "movie 또는 tv",
    "genre": "장르",
    "source": "후보 목록의 source 그대로",
    "poster_path": "후보 목록의 poster_path 그대로",
    "hook": "작품의 핵심 장면·감정을 구체적으로 담은 한 줄 추천사(20자 내외). 추상적 표현 금지.",
    "reason": "왜 지금 이 사용자에게 딱인지 2~3문장. URL 포함 금지."
  }
]`
    : `당신은 한국 OTT 콘텐츠 전문 큐레이터입니다.
사용자 취향에 맞는 추천 5개를 제안하세요.

[규칙]
- 웹 검색으로 실제 존재하는 작품만 추천하세요.
- title(한국어): TMDB 공식 한국어 제목
- title_en(영어): TMDB 정확한 영어 원제
- reason에 URL 포함 금지

사용자 취향:
- 보유 OTT: ${otts?.length ? otts.join(', ') : '상관없음'}
- 원하는 장르: ${genres?.length ? genres.join(', ') : '상관없음'}
- 오늘 분위기: ${moods?.length ? moods.join(', ') : '상관없음'}
- 누구랑: ${contexts?.length ? contexts.join(', ') : '상관없음'}
- 시청 시간: ${times?.length ? times.join(', ') : '상관없음'}
- 추가 요청: ${extra || '없음'}${mbtiDesc}${animeInstruction}${contentTypeInstruction}

응답 형식 (JSON만, 다른 텍스트 없이):
[
  {
    "title": "한국어 제목",
    "title_en": "영어 원제",
    "year": "연도",
    "type": "movie 또는 tv",
    "genre": "장르",
    "source": "tmdb",
    "poster_path": "",
    "hook": "한 줄 추천사(20자 내외). 추상적 표현 금지.",
    "reason": "2~3문장. URL 포함 금지."
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
