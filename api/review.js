export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { title, year, type, genre, hook, moods, contexts, times, spoiler } = req.body;

  const prompt = spoiler
    ? `"${title} (${year||''})"에 대해 웹 검색 후 스포일러를 포함한 깊은 감상문을 써주세요.

다음 구조로 작성하세요:

[핵심 스포일러 요약] 주요 반전, 결말, 핵심 장면 2~3문장

[인상적인 장면] 가장 화제가 된 장면이나 대사 2~3문장

[작품이 말하고 싶은 것] 주제의식, 메시지 2~3문장

조건: 한국어 존댓말, URL 금지, 마크다운 금지, 단락 사이 빈 줄`

    : `당신은 한국 OTT 큐레이터입니다. "${title} (${year||''})"에 대해 웹 검색을 바탕으로,
사용자가 "지금 바로 볼지" 결정할 수 있게, 스포일러 없이 아주 간결하고 매력적으로 작성하세요.

사용자 맥락:
- 분위기: ${moods?.length ? moods.join(', ') : '상관없음'}
- 누구랑: ${contexts?.length ? contexts.join(', ') : '상관없음'}
- 시청 시간: ${times?.length ? times.join(', ') : '상관없음'}

아래 형식 그대로, 한국어 존댓말, URL/출처 링크 금지, 스포일러 금지:

[30초 요약] 3~4문장

[왜 지금 보기 좋아요] 2문장

[이런 분께 추천] 3개 불릿(•)

[비슷한 작품 1개] 제목 + 한 줄 이유`;

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
        max_output_tokens: 650,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json(err);
    }

    const data = await response.json();
    const msg = (data.output || []).find(o => o.type === 'message');
    const text = msg?.content?.find(c => c.type === 'output_text')?.text || '';

    return res.status(200).json({ text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
