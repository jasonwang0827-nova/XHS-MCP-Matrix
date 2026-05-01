import { getClientProfile } from './client-profiles';
import { checkContentSafety } from './safety';

export function createReplySuggestion(input: {
  client_id: string;
  user_comment: string;
  intent?: 'lead' | 'support' | 'neutral' | 'objection';
  context?: string;
}) {
  const profile = getClientProfile(input.client_id);
  if (!profile) throw new Error(`unknown client_id: ${input.client_id}`);

  const intent = input.intent || 'neutral';
  const reply = buildReply(profile.client_id, input.user_comment, intent, input.context);
  const safety = checkContentSafety({
    client_id: profile.client_id,
    comment: reply,
  });

  return {
    client_id: profile.client_id,
    mode: profile.comment_mode,
    auto_send_allowed_by_default: profile.comment_mode === 'auto_allowed',
    draft: reply,
    safety,
    note: profile.comment_mode === 'draft_only_by_default'
      ? '该客户默认只生成回复建议，不自动发送。'
      : '该客户允许自动评论，但仍建议先检查上下文。',
  };
}

function buildReply(clientId: string, userComment: string, intent: string, context?: string) {
  if (clientId === 'client_a_edu_immigration') {
    return `可以先看你的目标国家、年级/学历、预算和时间线，再判断申请或移民路径。你方便说一下目前是在准备留学、签证，还是长期规划吗？`;
  }

  if (clientId === 'client_b_private_care') {
    return `这个问题建议从舒适度、材质安全和双方沟通三个角度看。不同人的感受差异很大，可以先从温和、日常护理型选择开始，别急着追求强刺激。`;
  }

  if (clientId === 'client_c_blindbox_supply') {
    return `可以的，主要看你想做零售、批发还是一件代发。不同模式对应的起订量、品类和发货节奏不一样，可以先确认你的渠道和预算。`;
  }

  return context
    ? `收到，你提到的“${userComment}”可以结合 ${context} 再细看。`
    : `收到，你提到的“${userComment}”可以再补充一点背景，我再给你更准确的建议。`;
}
