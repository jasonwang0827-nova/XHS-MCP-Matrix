import { getClientProfile } from './client-profiles';

export function createClientSearchPlan(input: {
  client_id: string;
  limit_per_keyword?: number;
}) {
  const profile = getClientProfile(input.client_id);
  if (!profile) throw new Error(`unknown client_id: ${input.client_id}`);

  const limit = input.limit_per_keyword ?? 20;
  return {
    client_id: profile.client_id,
    business: profile.business,
    keywords: profile.seed_keywords,
    target_users: profile.target_users,
    tasks: profile.seed_keywords.map((keyword) => ({
      type: 'search_feeds',
      account_id: profile.client_id,
      payload: {
        client_id: profile.client_id,
        keyword,
        limit,
        filters: defaultFilters(profile.client_id),
      },
    })),
  };
}

function defaultFilters(clientId: string) {
  if (clientId === 'client_a_edu_immigration') {
    return { sort_by: '最新', publish_time: '一周内', note_type: '不限' };
  }
  if (clientId === 'client_b_private_care') {
    return { sort_by: '综合', publish_time: '一周内', note_type: '图文' };
  }
  if (clientId === 'client_c_blindbox_supply') {
    return { sort_by: '最新', publish_time: '一周内', note_type: '视频' };
  }
  return { sort_by: '综合', publish_time: '不限', note_type: '不限' };
}
