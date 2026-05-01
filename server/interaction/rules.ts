import { getClientProfile } from '../business/client-profiles';
import { SearchResultItem } from '../search/types';
import { LeadLevel, LeadResult } from '../leads/types';

const negativeTerms = ['避雷', '骗局', '骗子', '投诉', '垃圾', '后悔', '割韭菜', '曝光'];
const genericLeadTerms = [
  '留学',
  '移民',
  '签证',
  '申请',
  '选校',
  '加拿大',
  '美国',
  '私密护理',
  '亲密关系',
  '盲盒',
  '潮玩',
  '工厂货源',
  '批发',
  '一件代发',
];

function compactText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function includesAny(text: string, terms: string[]) {
  return terms.filter((term) => text.includes(term));
}

function levelFromScore(score: number, negative: boolean): LeadLevel {
  if (negative) return 'negative';
  if (score >= 8) return 'A';
  if (score >= 4) return 'B';
  return 'C';
}

export function evaluateSearchItem(item: SearchResultItem, clientId?: string | null): LeadResult {
  const profile = getClientProfile(clientId);
  const keywords = profile?.seed_keywords || genericLeadTerms;
  const targetTerms = [
    ...keywords,
    ...(profile?.target_content || []),
    ...(profile?.target_users || []),
  ];
  const text = [
    item.title,
    item.author_name,
    item.keyword,
    item.type,
  ].map(compactText).join('\n');

  const matchedKeywords = includesAny(text, targetTerms);
  const negativeKeywords = includesAny(text, negativeTerms);
  const interactionScore =
    Math.min(item.liked_count || 0, 500) / 100 +
    Math.min(item.comment_count || 0, 200) / 50 +
    Math.min(item.collected_count || 0, 500) / 100;
  const keywordScore = matchedKeywords.length * 3;
  const leadScore = Math.round((keywordScore + interactionScore) * 10) / 10;
  const leadLevel = levelFromScore(leadScore, negativeKeywords.length > 0);

  return {
    matched_keywords: matchedKeywords,
    negative_keywords: negativeKeywords,
    lead_score: leadScore,
    lead_level: leadLevel,
    need_follow_up: leadLevel === 'A' || leadLevel === 'B',
    follow_up_suggestion: buildSuggestion(leadLevel, matchedKeywords, clientId),
  };
}

function buildSuggestion(level: LeadLevel, matchedKeywords: string[], clientId?: string | null) {
  if (level === 'negative') return '负面/避雷内容，建议只观察，不互动。';
  if (level === 'A') return '高价值线索：建议查看详情和评论区，人工判断是否生成回复建议。';
  if (level === 'B') return '中等线索：可加入观察池，后续结合评论区判断。';
  if (clientId) return '相关性较弱，暂作内容参考。';
  return matchedKeywords.length ? '有关键词命中，可作为内容参考。' : '未命中明确业务词，暂不跟进。';
}
