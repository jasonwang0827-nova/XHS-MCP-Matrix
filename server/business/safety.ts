import { ClientProfile, getClientProfile } from './client-profiles';

export type SafetyCheckResult = {
  ok: boolean;
  level: 'standard' | 'strict';
  violations: Array<{
    term: string;
    severity: 'block' | 'warn';
    reason: string;
  }>;
  suggestions: string[];
};

const standardBlockedTerms = [
  '包过',
  '百分百成功',
  '稳赚',
  '暴利',
  '加微信',
  '私信返现',
];

const strictPrivateCareBlockedTerms = [
  '约炮',
  '一夜情',
  '裸聊',
  '成人视频',
  '成人视频',
  '强效催情',
  '催情',
  '壮阳',
  '性暗示',
  '挑逗',
  '露骨',
  '激情视频',
  '上门服务',
];

const strictPrivateCareWarnTerms = [
  '成人用品',
  '情趣',
  '私处',
  '私密部位',
  '性爱',
  '敏感',
];

function includesAny(text: string, terms: string[], severity: 'block' | 'warn', reason: string) {
  return terms
    .filter((term) => text.includes(term))
    .map((term) => ({ term, severity, reason }));
}

export function checkContentSafety(input: {
  client_id?: string | null;
  title?: string;
  content?: string;
  comment?: string;
  tags?: string[];
}): SafetyCheckResult {
  const profile = getClientProfile(input.client_id);
  const level = profile?.safety_level || 'standard';
  const text = [
    input.title,
    input.content,
    input.comment,
    ...(input.tags || []),
  ].filter(Boolean).join('\n');

  const violations = [
    ...includesAny(text, standardBlockedTerms, 'block', '平台常见风险词，容易触发营销/夸大承诺风险'),
  ];

  if (level === 'strict') {
    violations.push(
      ...includesAny(text, strictPrivateCareBlockedTerms, 'block', '私密护理客户严格模式：避免露骨、挑逗或违规成人表达'),
      ...includesAny(text, strictPrivateCareWarnTerms, 'warn', '私密护理客户建议改成健康护理/关系沟通表达'),
    );
  }

  const suggestions = buildSuggestions(profile, violations);
  return {
    ok: !violations.some((item) => item.severity === 'block'),
    level,
    violations,
    suggestions,
  };
}

function buildSuggestions(profile: ClientProfile | null, violations: SafetyCheckResult['violations']) {
  const suggestions: string[] = [];
  if (!violations.length) return suggestions;

  suggestions.push('减少绝对化承诺，改成经验分享、注意事项、测评观察。');
  if (profile?.client_id === 'client_b_private_care') {
    suggestions.push('把成人用品表达改成亲密关系、日常护理、舒适度测评、伴侣沟通。');
    suggestions.push('评论和私信先生成回复建议，由人工确认后再发送。');
  }
  if (profile?.client_id === 'client_a_edu_immigration') {
    suggestions.push('避免承诺录取/签证结果，改成申请条件、时间线、材料准备建议。');
  }
  if (profile?.client_id === 'client_c_blindbox_supply') {
    suggestions.push('避免收益夸大，突出货源稳定、品类、起订量、售后和合作流程。');
  }
  return suggestions;
}
