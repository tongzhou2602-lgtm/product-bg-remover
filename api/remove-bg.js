// Vercel Serverless Function: /api/remove-bg
// 代理前端请求到 remove.bg API，保护 API Key 不暴露在前端
export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '请使用 POST 请求' });
  }

  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '服务器未配置 REMOVE_BG_API_KEY 环境变量' });
  }

  try {
    const { image_b64 } = req.body || {};
    if (!image_b64) {
      return res.status(400).json({ error: '缺少 image_b64 参数' });
    }

    // 调用 remove.bg API
    const upstream = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_b64: image_b64,
        size: 'preview'  // 免费层用 preview，约 0.25MP
      })
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[remove-bg] API 错误:', upstream.status, errText);
      return res.status(upstream.status).json({
        error: 'AI 抠图服务返回错误 (' + upstream.status + ')，可能是额度用完了或图片格式不支持'
      });
    }

    // 返回 PNG 图片
    const imageBuffer = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', imageBuffer.length);
    res.send(imageBuffer);

  } catch (err) {
    console.error('[remove-bg] 异常:', err);
    return res.status(500).json({ error: '服务器内部错误: ' + err.message });
  }
}
