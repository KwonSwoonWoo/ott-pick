export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { extra } = req.body;
  if (!extra) return res.status(200).json({ genres: [] });

  const prompt = `사용자가 다음과 같이 입력했습니다: "${extra}"

이 텍스트에서 애니메이션 장르 키워드를 추출해주세요.
아래 장르 목록 중 해당하는 것만 골라서 JSON 배열로 반환하세요.

사용 가능한 장르 목록:
이세계, 환생, 판타지, 로맨스, 액션, 공포, 코미디, 일상, 성장물, 스포츠, 음식, 힐링, 치유계, 미스터리, SF, 드라마, 학원, 음악, 무협, 마법소녀

규칙:
- 위 목록에 있는 장르만 반환하세요
- 텍스트에서 직접 언급하거나 강하게 암시하는 장르만 포함하세요
- 없으면 빈 배열을 반환하세요
- JSON만 반환하고 다른 텍스트는 포함하지 마세요

응답 형식: ["장르1", "장르2"]`;

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
        max_output_tokens: 100,
      }),
    });
    if (!response.ok) return res.status(200).json({ genres: [] });
    const data = await response.json();
    const msg = (data.output || []).find(o => o.type === 'message');
    const text = msg?.content?.find(c => c.type === 'output_text')?.text || '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const genres = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    return res.status(200).json({ genres });
  } catch {
    return res.status(200).json({ genres: [] });
  }
}
