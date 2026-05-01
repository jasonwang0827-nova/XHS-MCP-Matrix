import fs from 'fs';
import path from 'path';
import { startAccount } from '../accounts/runtime';
import { LeadItem } from '../leads/types';
import { listLeads } from '../leads/store';
import { toolRegistry } from '../tool-registry';
import { SearchResponse, SearchResultItem } from '../search/types';

const REPORT_DIR = '/Users/jason/Nova/XHS-mcp/data/leads/reports';

function compactText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureReportDir() {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

function parseToolText(result: any) {
  const text = result?.result?.content?.[0]?.text;
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function sourceXsecToken(lead: LeadItem) {
  const raw = lead.raw_item as any;
  return compactText(raw?.note?.xsec_token || raw?.note?.xsecToken || raw?.xsec_token);
}

function sourceComment(lead: LeadItem) {
  const raw = lead.raw_item as any;
  return raw?.comment || {};
}

function normalizeProfile(profile: any) {
  const basic = profile?.userBasicInfo || profile?.data?.userBasicInfo || {};
  const interactions = profile?.interactions || profile?.data?.interactions || [];
  const countByType = new Map(
    (Array.isArray(interactions) ? interactions : []).map((item: any) => [compactText(item?.type || item?.name), compactText(item?.count)]),
  );
  return {
    nickname: compactText(basic?.nickname),
    red_id: compactText(basic?.redId),
    ip_location: compactText(basic?.ipLocation),
    desc: compactText(basic?.desc),
    follows: countByType.get('follows') || countByType.get('关注') || '',
    fans: countByType.get('fans') || countByType.get('粉丝') || '',
    interactions: countByType.get('interaction') || countByType.get('获赞与收藏') || '',
    feeds_count: Array.isArray(profile?.feeds) ? profile.feeds.length : 0,
  };
}

function markdownTable(header: string[], body: Array<Array<string | number | null | undefined>>) {
  const escapeCell = (value: string | number | null | undefined) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...body.map((cells) => `| ${cells.map(escapeCell).join(' | ')} |`),
  ].join('\n');
}

function searchResultsTable(results: SearchResultItem[]) {
  const header = [
    '序号',
    '笔记标题',
    '作者',
    '点赞',
    '评论',
    '收藏',
    '来源账号',
    '链接',
  ];
  const body = results.map((item, index) => [
    String(index + 1),
    item.title || '无标题',
    item.author_name || '未知',
    item.liked_count,
    item.comment_count,
    item.collected_count,
    (item.matched_accounts || [item.source_account_id]).join('、'),
    item.url,
  ]);
  return markdownTable(header, body);
}

function leadRowsTable(rows: any[]) {
  const header = [
    '序号',
    '客户线索',
    '小红书号',
    'IP',
    '粉丝',
    '命中词',
    '评论内容',
    '来自哪篇笔记',
    '人工处理建议',
  ];
  const body = rows.map((row, index) => [
    String(index + 1),
    row.author_name,
    row.red_id || row.author_id,
    row.ip_location,
    row.fans,
    row.matched_keywords.join('、'),
    row.comment_content,
    row.note_title,
    row.suggested_action,
  ]);
  return markdownTable(header, body);
}

export async function generateLeadProfileSummary(input: {
  account_id?: string | null;
  growth_profile_id?: string | null;
  limit?: number;
  search_response?: SearchResponse | null;
  comment_keywords?: string[];
  max_notes?: number;
  comments_limit?: number;
}) {
  ensureReportDir();
  const limit = Math.max(1, Math.min(Number(input.limit || 50), 200));
  const leads = listLeads({
    account_id: input.account_id || null,
    growth_profile_id: input.growth_profile_id || null,
  })
    .filter((lead) => lead.source === 'comment')
    .slice(0, limit);

  const rows = [];
  const errors = [];

  for (const lead of leads) {
    const xsecToken = sourceXsecToken(lead);
    const comment = sourceComment(lead);
    let profile = {};
    let profileError = '';

    if (lead.author_id && xsecToken) {
      try {
        await startAccount(lead.account_id);
        const result = await toolRegistry.user_profile({
          account_id: lead.account_id,
          user_id: lead.author_id,
          xsec_token: xsecToken,
        });
        if (result?.success) {
          profile = parseToolText(result);
        } else {
          profileError = compactText(result?.result?.content?.[0]?.text) || 'user_profile failed';
        }
      } catch (error: any) {
        profileError = error?.message || String(error);
      }
    } else {
      profileError = 'missing author_id_or_xsec_token';
    }

    if (profileError) {
      errors.push({ lead_id: lead.lead_id, author_id: lead.author_id, error: profileError });
    }

    const normalized = normalizeProfile(profile);
    rows.push({
      lead_id: lead.lead_id,
      account_id: lead.account_id,
      author_name: lead.author_name,
      author_id: lead.author_id,
      red_id: normalized.red_id,
      ip_location: normalized.ip_location,
      follows: normalized.follows,
      fans: normalized.fans,
      interactions: normalized.interactions,
      feeds_count: normalized.feeds_count,
      comment_id: compactText(comment?.comment_id),
      comment_content: compactText(comment?.content),
      matched_keywords: lead.lead_result?.matched_keywords || [],
      note_id: lead.note_id,
      note_title: lead.title,
      note_url: lead.url,
      suggested_action: '建议人工查看主页后手工关注；回复需人工确认。',
      profile_error: profileError,
    });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseName = `comment-lead-summary-${timestamp}`;
  const jsonFile = path.join(REPORT_DIR, `${baseName}.json`);
  const mdFile = path.join(REPORT_DIR, `${baseName}.md`);
  const report = {
    ok: true,
    generated_at: new Date().toISOString(),
    filters: {
      account_id: input.account_id || null,
      growth_profile_id: input.growth_profile_id || null,
      limit,
      search_keyword: input.search_response?.keyword || null,
      search_accounts: input.search_response?.searched_accounts || [],
      comment_keywords: (input.comment_keywords || []).map(compactText).filter(Boolean),
      max_notes: input.max_notes || null,
      comments_limit: input.comments_limit || null,
    },
    summary: {
      searched_notes: input.search_response?.total_unique || input.search_response?.results?.length || 0,
      leads: rows.length,
      profiles_ok: rows.filter((row) => !row.profile_error).length,
      profiles_failed: errors.length,
    },
    search_results: input.search_response?.results || [],
    rows,
    errors,
    files: {
      json: jsonFile,
      markdown: mdFile,
    },
  };

  fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    mdFile,
    [
      '# 小红书客户线索筛选报告',
      '',
      `生成时间：${report.generated_at}`,
      '',
      '## 1. 本次搜索任务',
      '',
      `- 搜索账号：${(report.filters.search_accounts || []).map((item: any) => `${item.account_id}${item.ok ? '' : '（失败）'}`).join('、') || report.filters.account_id || '未指定'}`,
      `- 搜索关键词：${report.filters.search_keyword || '未提供'}`,
      `- 搜索结果：原始 ${input.search_response?.total_raw ?? 0} 条，去重后 ${report.summary.searched_notes} 条`,
      '',
      searchResultsTable(report.search_results),
      '',
      '## 2. 评论筛选规则',
      '',
      `- 评论筛选词组：${report.filters.comment_keywords.join('、') || '未提供'}`,
      `- 深挖笔记数量：${report.filters.max_notes || '按页面设置'}`,
      `- 每篇评论读取上限：${report.filters.comments_limit || '按页面设置'}`,
      '',
      '## 3. 筛选出的客户线索',
      '',
      `- 命中线索：${report.summary.leads} 条`,
      `- 评论人主页读取成功：${report.summary.profiles_ok} 条`,
      `- 评论人主页读取失败：${report.summary.profiles_failed} 条`,
      '',
      leadRowsTable(rows),
      '',
      '## 4. 处理建议',
      '',
      '- 本报告只做线索汇总，不自动关注、不自动私信、不自动回复。',
      '- 建议人工优先查看“评论内容明确表达需求”的线索。',
      '- 粉丝数较高、昵称带机构属性的账号可能是同行或服务商，建议人工二次判断。',
    ].join('\n'),
  );

  return report;
}
