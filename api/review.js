export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
 
  const { title, year, type, genre, mbti } = req.body;
 
  const mbtiSection = mbti ? `
 
[${mbti} 맞춤 큐레이션]
${mbti} 성향을 가진 분이 이 작품을 보면 어떤 점에서 특히 공감하거나 매력을 느낄지 2~3문장으로 분석` : '';
 
  const prompt = `당신은 감각적인 OTT 콘텐츠 블로거입니다.
"${title} (${year || ''})"에 대해 웹 검색을 바탕으로, 스포일러 없이 블로그 글처럼 감상문을 작성해주세요.
 
조건:
- 총 1000자 내외
- 스포일러 절대 금지 (결말, 반전, 핵심 장면 언급 금지)
- 한국어 존댓말
- URL 절대 금지 (http, https, www 포함 어떤 링크도 출력 금지)
- 출처, 참고자료, 각주 금지
- 마크다운 기호 금지 (**, ## 등)
- 단락 사이 빈 줄 한 줄씩 넣기
- 자연스러운 블로그 글체 (딱딱하지 않게)
- 순수 텍스트만 출력할 것
 
다음 구조로 작성하세요:
 
[작품 소개]
이 작품이 어떤 작품인지 2~3문장으로 소개
 
[분위기와 매력]
작품의 전반적인 분위기, 연출, 음악, 배우 연기 등 2~3문장
 
[이런 분께 추천해요]
어떤 상황, 어떤 취향의 사람에게 잘 맞는지 2~3문장${mbtiSection}
 
[한 줄 총평]
작품을 한 문장으로 압축한 총평`;
 
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
        max_output_tokens: 1200,
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
