export interface AiSummary {
  tldr: string
  points: string[]
  saved: number
  source: string
}

const DEFAULTS: Record<string, AiSummary> = {
  hacker_news: {
    tldr: 'RSS 并没有失败 —— 它只是换了一种语言。',
    points: [
      'Google Reader 在 2013 年关闭后，RSS 失去了中心化入口，但协议本身仍在驱动所有"按订阅送达"的产品：播客、Substack、YouTube 频道。',
      '新一代阅读器靠"把读这件事做得更安静"胜出，而不是协议本身的胜利。',
      '把"我读过什么"重新变成只属于读者的个人索引，把选择权从算法手里拿回来。',
    ],
    saved: 6,
    source: 'Folio 摘要',
  },
  the_verge: {
    tldr: '算法信息流的尽头，可能是读者主动"反向回退"到 RSS 的减噪体验。',
    points: [
      '当 TikTok 的"看完一个再推一个"也开始被吐槽时，越来越多用户开始把 RSS 当作减噪工具。',
      '消费科技新闻的注意力正在从社交分发回流到订阅分发。',
      '"你订阅什么我看什么"再次成为一种用户主张。',
    ],
    saved: 4,
    source: 'Folio 摘要',
  },
  ars_technica: {
    tldr: '深度技术报道仍然在订阅源里有稳定位置 —— 算法不容易替代。',
    points: [
      '评测与调查类内容对算法推荐的依赖度低，更适合 RSS 长读场景。',
      '技术读者更愿意为"专业策展"付费 / 订阅。',
      'RSS 适合深度，时效性内容更适合推送。',
    ],
    saved: 5,
    source: 'Folio 摘要',
  },
  techcrunch: {
    tldr: '初创公司与产品发布的报道流：RSS 仍然是 PM 与投资人的事实基线。',
    points: [
      '科技商业新闻的密度高、来源分散，订阅源能整合多源。',
      '行业快讯适合用过滤器（关键词、来源）二次筛选。',
      'RSS + 标签 / 智能视图是构建私人信息流的最低成本方式。',
    ],
    saved: 5,
    source: 'Folio 摘要',
  },
}

function fallback(title: string, excerpt: string): AiSummary {
  return {
    tldr: `本篇围绕"${title || '一个核心主张'}"展开 —— ${(excerpt || '文章提出了一个值得反复推敲的判断。').slice(0, 60)}…`,
    points: [
      '观点一：' + (excerpt || '文章提出了一个值得反复推敲的判断。'),
      '观点二：从历史或行业视角看，这个判断有更深的来源。',
      '观点三：对读者来说，可以带走的一个具体动作或提醒。',
    ],
    saved: 4,
    source: 'Folio 摘要',
  }
}

/**
 * 根据文章 url 或 title 关键字返回 mock 摘要。
 * 找不到则用 title + excerpt 派生默认版本。
 */
export function getMockAiSummary(article: {
  id: string
  title: string
  url?: string
  description?: string | null
}): AiSummary {
  const text = (article.url ?? '') + ' ' + article.title + ' ' + (article.description ?? '')
  for (const [key, summary] of Object.entries(DEFAULTS)) {
    if (text.toLowerCase().includes(key.replace('_', ' '))) return summary
  }
  return fallback(article.title, article.description ?? '')
}
