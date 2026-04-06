export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
 
  const { otts, genres, moods, times, contexts, extra, mbti, candidates, isAnimeMode } = req.body;
 
  const MBTI_DESC = {
    'ENFP': 'ENFP: 열정적이고 창의적인 성격. 감성적인 인간관계 서사와 예상치 못한 반전을 즐김. 다양한 캐릭터가 등장하는 앙상블 드라마, 판타지·로맨스·성장물을 선호. 틀에 박힌 전개보다 독특하고 신선한 설정을 좋아함.',
    'ESFJ': 'ESFJ: 따뜻하고 사교적인 성격. 가족·우정·사랑을 중심으로 한 감동적인 이야기를 선호. 해피엔딩이 있는 로맨스, 가족 드라마, 실화 기반 감동 스토리를 좋아함. 잔인하거나 어두운 콘텐츠는 피하는 경향.',
    'ESFP': 'ESFP: 활발하고 즉흥적인 성격. 유머와 에너지가 넘치는 콘텐츠를 선호. 코미디, 버라이어티, 스포츠물, 밝고 빠른 전개의 액션을 즐김. 무겁고 철학적인 내용보다 가볍고 즐겁게 볼 수 있는 작품을 좋아함.',
    'ESTJ': 'ESTJ: 현실적이고 체계적인 성격. 논리적인 스토리와 명확한 인과관계를 중시. 범죄 스릴러, 법정 드라마, 실화 기반 다큐, 조직과 권력을 다룬 드라마를 선호. 허술한 설정이나 개연성 없는 전개를 싫어함.',
    'INFP': 'INFP: 감성적이고 이상주의적인 성격. 깊은 감정과 내면 성장을 다룬 작품을 선호. 시적인 분위기의 판타지, 애잔한 로맨스, 개인의 성장과 치유를 다룬 드라마를 즐김. 감동적이고 여운이 남는 결말을 좋아함.',
    'INTJ': 'INTJ: 전략적이고 독립적인 성격. 복잡한 세계관과 치밀한 플롯을 선호. SF, 미스터리, 심리 스릴러, 정치 드라마를 즐김. 예측 가능한 전개보다 반전과 지적 자극이 있는 작품, 안티히어로가 등장하는 서사를 좋아함.',
    'ISFJ': 'ISFJ: 세심하고 헌신적인 성격. 따뜻하고 안정적인 감성의 콘텐츠를 선호. 역사물, 가족 드라마, 잔잔한 로맨스, 실화 기반 휴먼 스토리를 즐김. 폭력적이거나 자극적인 콘텐츠보다 마음이 따뜻해지는 작품을 좋아함.',
    'ISTJ': 'ISTJ: 신중하고 책임감 강한 성격. 사실에 기반한 탄탄한 스토리를 선호. 범죄 수사물, 다큐멘터리, 역사 드라마, 사회 고발 콘텐츠를 즐김. 과장된 설정보다 현실적이고 디테일이 살아있는 작품을 좋아함.',
    'ISTP': 'ISTP: 분석적이고 실용적인 성격. 빠른 전개와 긴장감 있는 액션을 선호. 범죄물, 스릴러, 서바이벌, 하드보일드 느낌의 작품을 즐김. 감정적인 멜로보다 논리적이고 쿨한 주인공이 등장하는 서사를 좋아함.',
  };
  const mbtiDesc = mbti?.length
    ? '\nMBTI 유형: ' + mbti.map(m => MBTI_DESC[m] || m).join(', ')
    : '';
 
  const hasCandidates = candidates && candidates.length > 0;
  const animeInstruction = isAnimeMode ? "\n[중요] 사용자가 애니메이션을 원합니다. 반드시 5개 모두 애니메이션 작품으로 추천하세요." : "";
 
  // OTT별 후보 수 계산 및 목표 비율 생성
  let ottRatioDesc = '';
  if (hasCandidates) {
    const laftelCount = candidates.filter(c => c.source === 'laftel').length;
    const tmdbCount = candidates.filter(c => c.source === 'tmdb').length;
    const total = laftelCount + tmdbCount;
 
    if (laftelCount > 0 && tmdbCount > 0) {
      // 둘 다 있으면 비율에 맞게 배분
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
- title과 title_en은 후보 목록의 값을 그대로 사용하세요. 수정하지 마세요.
- source도 후보 목록의 값을 그대로 사용하세요.
- hook과 reason만 창의적으로 작성하세요.
- reason에 URL이나 링크를 포함하지 마세요.
- reason에 URL이나 링크를 포함하지 마세요.${ottRatioDesc}
 
[후보 작품 목록]
${candidates.map((c, i) => `${i + 1}. title: "${c.title}", title_en: "${c.title_en || ''}", genre: "${c.genre || ''}", source: "${c.source}"${c.content ? ', description: "' + c.content.slice(0, 100).replace(/"/g, "'") + '..."' : ''}`).join('\n')}
 
[사용자 자유 입력 처리 - 최우선 반영]
사용자가 추가 요청에 자유롭게 텍스트를 입력했을 경우, 이를 최우선으로 분석해서 추천에 반영하세요.
- "~같은 분위기", "~처럼", "~같은 거" → 반드시 후보 목록의 description을 하나씩 읽고, 해당 작품과 분위기·스토리·테마가 가장 유사한 작품을 선별하세요. 장르 태그만 보지 말고 description을 적극 활용하세요.
- 이미 본 작품 언급 → 해당 작품과 비슷하지만 다른 작품 추천
- 감정/기분 표현 → 그 감정에 맞는 작품 추천
- 현재 상황 설명 → 상황에 어울리는 작품 추천
- 피하고 싶은 것 언급 → 해당 요소 배제
추가 요청은 장르·분위기 칩 선택과 동등하게 반영하세요. description이 있는 경우 반드시 읽고 분위기 유사도를 판단하세요.
 
사용자 취향:
- 원하는 장르: ${genres?.length ? genres.join(', ') : '상관없음'}
- 오늘 분위기: ${moods?.length ? moods.join(', ') : '상관없음'}
- 누구랑: ${contexts?.length ? contexts.join(', ') : '상관없음'}
- 시청 시간: ${times?.length ? times.join(', ') : '상관없음'}
- 추가 요청: ${extra || '없음'}${mbtiDesc}${animeInstruction}
 
응답 형식 (JSON만, 다른 텍스트 없이):
[
  {
    "title": "후보 목록의 title 그대로",
    "title_en": "후보 목록의 title_en 그대로",
    "year": "연도",
    "type": "movie 또는 tv",
    "genre": "장르",
    "source": "후보 목록의 source 그대로 (laftel 또는 tmdb)",
    "hook": "작품의 핵심 장면·감정·상황을 구체적으로 담은 한 줄 추천사(20자 내외). 좋은 예: 죽은 줄 알았던 아버지가 적으로 돌아왔다, 첫사랑과 10년 만에 같은 회사에서 재회. 나쁜 예(금지): 다양한 갈등, 더욱 강력한 적들, 감동적인 이야기 - 이런 추상적 표현 절대 금지.",
    "reason": "왜 지금 이 사용자 상황에 딱인지 2~3문장. URL 포함 금지.",
    "poster_url": "TMDB 포스터 이미지 URL (https://image.tmdb.org/t/p/w500/... 형식). 웹 검색으로 TMDB에서 정확한 poster_path를 찾아서 완성된 URL로 반환. TMDB에 없으면 null."
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
 
[사용자 자유 입력 처리 - 최우선 반영]
사용자가 추가 요청에 자유롭게 텍스트를 입력했을 경우, 이를 최우선으로 분석해서 추천에 반영하세요.
- "~같은 분위기", "~처럼", "~같은 거" → 반드시 후보 목록의 description을 하나씩 읽고, 해당 작품과 분위기·스토리·테마가 가장 유사한 작품을 선별하세요. 장르 태그만 보지 말고 description을 적극 활용하세요.
- 이미 본 작품 언급 → 해당 작품과 비슷하지만 다른 작품 추천
- 감정/기분 표현 → 그 감정에 맞는 작품 추천
- 현재 상황 설명 → 상황에 어울리는 작품 추천
- 피하고 싶은 것 언급 → 해당 요소 배제
추가 요청은 장르·분위기 칩 선택과 동등하게 반영하세요. description이 있는 경우 반드시 읽고 분위기 유사도를 판단하세요.
 
사용자 취향:
- 보유 OTT: ${otts?.length ? otts.join(', ') : '상관없음'}
- 원하는 장르: ${genres?.length ? genres.join(', ') : '상관없음'}
- 오늘 분위기: ${moods?.length ? moods.join(', ') : '상관없음'}
- 누구랑: ${contexts?.length ? contexts.join(', ') : '상관없음'}
- 시청 시간: ${times?.length ? times.join(', ') : '상관없음'}
- 추가 요청: ${extra || '없음'}${mbtiDesc}${animeInstruction}
 
응답 형식 (JSON만, 다른 텍스트 없이):
[
  {
    "title": "TMDB 또는 OTT 공식 한국어 제목",
    "title_en": "TMDB 정확한 영어 원제",
    "year": "연도",
    "type": "movie 또는 tv",
    "genre": "장르",
    "source": "tmdb",
    "hook": "작품의 핵심 장면·감정·상황을 구체적으로 담은 한 줄 추천사(20자 내외). 좋은 예: 죽은 줄 알았던 아버지가 적으로 돌아왔다, 첫사랑과 10년 만에 같은 회사에서 재회. 나쁜 예(금지): 다양한 갈등, 더욱 강력한 적들, 감동적인 이야기 - 이런 추상적 표현 절대 금지.",
    "reason": "왜 지금 이 사용자 상황에 딱인지 2~3문장. URL 포함 금지.",
    "poster_url": "TMDB 포스터 이미지 URL (https://image.tmdb.org/t/p/w500/... 형식). 웹 검색으로 TMDB에서 정확한 poster_path를 찾아서 완성된 URL로 반환. TMDB에 없으면 null."
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
