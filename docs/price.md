最推荐：使用 OpenRouter 的 /api/v1/models 接口（完美适配你复刻 OpenRouter）
这是目前最简单、最全面、更新最及时的方式。OpenRouter 本身就是把各厂商官方价格 pass-through 聚合在一起的。

优点：
覆盖 300+ 模型（包括最新 o3、Claude 4、Grok-3、Qwen 等）
直接包含 prompt / completion / input_cache_read / output_cache_read / reasoning / image 等多维度价格
新模型发布后几小时内就会更新
价格就是各厂商官方价格（你完全可以直接当成本价使用）

实现步骤（超简单）：
去 https://openrouter.ai/keys 免费生成一个 API Key（不需要付费）
写一个 cron job（每天跑 1~2 次）


Node.js / TypeScript 示例代码（直接复制到你的 cron service 里）：
TypeScriptimport { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncPricesFromOpenRouter() {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, // 你的 Key
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();

  for (const model of data.data) {
    const p = model.pricing || {}; // OpenRouter 返回的 pricing 对象

    await prisma.modelPricing.upsert({
      where: { model: model.id },
      update: {
        input_price: parseFloat(p.prompt || '0') * 1_000_000,        // 转成「每百万 token」价格
        output_price: parseFloat(p.completion || '0') * 1_000_000,
        cache_read_price: p.input_cache_read 
          ? parseFloat(p.input_cache_read) * 1_000_000 
          : null,
        cache_write_price: p.output_cache_read 
          ? parseFloat(p.output_cache_read) * 1_000_000 
          : null,
        reasoning_price: p.reasoning 
          ? parseFloat(p.reasoning) * 1_000_000 
          : null,
        updated_at: new Date(),
      },
      create: {
        model: model.id,
        input_price: parseFloat(p.prompt || '0') * 1_000_000,
        // ... 其他字段同上
        updated_at: new Date(),
      },
    });
  }

  console.log(`✅ 已同步 ${data.data.length} 个模型价格`);
}

syncPricesFromOpenRouter();

定时任务：用 node-cron 或 Vercel Cron / Railway Cron 每天 00:00 和 12:00 执行一次。
注意：OpenRouter 返回的价格单位是每 token，所以要乘 1,000,000 转成每百万 token（和 new-api、OpenAI 官方一致）。
