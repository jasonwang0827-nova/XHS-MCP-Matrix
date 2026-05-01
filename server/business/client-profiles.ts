export type ClientId = 'client_a_edu_immigration' | 'client_b_private_care' | 'client_c_blindbox_supply';

export type ClientProfile = {
  client_id: ClientId;
  name: string;
  business: string;
  target_content: string[];
  target_users: string[];
  seed_keywords: string[];
  comment_mode: 'auto_allowed' | 'draft_only_by_default';
  safety_level: 'standard' | 'strict';
  tone: string;
};

export const clientProfiles: Record<ClientId, ClientProfile> = {
  client_a_edu_immigration: {
    client_id: 'client_a_edu_immigration',
    name: 'Client A',
    business: '留学 / 移民业务',
    target_content: ['留学申请', '移民规划', '海外生活', '选校规划', '签证经验', '加拿大教育', '美国教育'],
    target_users: ['学生', '家长', '想留学的人', '想移民加拿大的人', '想移民美国的人'],
    seed_keywords: ['加拿大留学', '美国留学', '留学申请', '选校规划', '签证经验', '移民加拿大', '海外生活'],
    comment_mode: 'auto_allowed',
    safety_level: 'standard',
    tone: '专业、耐心、像顾问一样给方向，不制造焦虑。',
  },
  client_b_private_care: {
    client_id: 'client_b_private_care',
    name: 'Client B',
    business: '成人用品 / 私密护理业务',
    target_content: ['成人用品', '亲密关系', '私密护理', '情侣生活', '品牌种草', '产品测评'],
    target_users: ['情侣', '关注亲密关系的人', '关注私密护理的人', '需要产品测评的人'],
    seed_keywords: ['私密护理', '亲密关系', '情侣生活', '女性护理', '安全感关系', '品牌测评'],
    comment_mode: 'draft_only_by_default',
    safety_level: 'strict',
    tone: '克制、健康科普、尊重边界，避免露骨和挑逗表达。',
  },
  client_c_blindbox_supply: {
    client_id: 'client_c_blindbox_supply',
    name: 'Client C',
    business: '盲盒 / 潮玩 / 工厂货源业务',
    target_content: ['盲盒', '潮玩', '开箱', '工厂货源', '招商合作', '批发供应', '一件代发'],
    target_users: ['潮玩爱好者', '批发商', '渠道商', '想做副业的人', '礼品店主', '直播带货商家'],
    seed_keywords: ['盲盒批发', '潮玩货源', '工厂货源', '一件代发', '开箱测评', '招商合作', '礼品供应链'],
    comment_mode: 'auto_allowed',
    safety_level: 'standard',
    tone: '直接、清楚、有供应链可信度，不夸大收益。',
  },
};

export function getClientProfile(clientId?: string | null) {
  if (!clientId) return null;
  return (clientProfiles as Record<string, ClientProfile>)[clientId] || null;
}

export function listClientProfiles() {
  return Object.values(clientProfiles);
}
