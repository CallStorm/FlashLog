/** Settings page copy — keep Chinese here to avoid encoding issues in Settings.tsx */

export const SETTINGS_COPY = {
  loading: '加载中…',
  pageTitle: '设置',
  pageSubtitle: 'API 调用费用由您自行承担，密钥仅存于本机安全存储。',

  appearanceTitle: '外观',
  appearanceHint: '选择界面配色，将记住您的选择',
  themeGroup: '主题',
  themeLight: '浅色',
  themeDark: '深色',

  llmTitle: 'LLM · 火山方舟',
  restoreVolcDefaults: '恢复火山默认',
  apiKeyLabel: 'API Key（脱敏存储）',
  apiKeyPlaceholderNew: '输入新 Key 覆盖',
  apiKeyPlaceholder: '输入 API Key',
  apiKeySavedHint: '已保存 Key，输入新值可覆盖',
  save: '保存',
  modelLabel: 'Model / Endpoint ID（必填）',
  modelPlaceholder: 'ep-xxxxxxxx 或 doubao-1-5-pro-32k-250115',
  llmKeySaved: 'LLM API Key 已保存',

  asrTitle: 'ASR · 火山豆包语音',
  asrAuthHint: '新版控制台鉴权，见',
  asrDocLink: '大模型流式语音识别',
  asrKeyLabel: 'API Key（X-Api-Key）',
  resourceIdLabel: 'Resource ID（X-Api-Resource-Id）',
  asrKeySaved: 'ASR API Key 已保存',

  clearDataConfirm: '再次点击确认清除所有工时与草稿',
  clearData: '清除所有本地数据',
  clearDataHint: '不会清除已保存的 API Key；清空后待办统计起点重置为今天',
  dataCleared: '本地工时与草稿已清除',

  backToHome: '返回工作记录',

  workCategoriesTitle: '工时大类',
  workCategoriesHint:
    '保存工时记录时选择大类；分析页将按大类汇总任务与时间分布。至少保留一项。',
  workCategoriesDefaultLabel: '新建记录默认大类',
  workCategoriesAdd: '添加大类',
  workCategoriesDeleteBlocked: '仍有工时记录使用该类，请先在历史中修改后再删除',
  workCategoriesMinOne: '至少保留一个大类',
  workCategoriesNamePlaceholder: '大类名称，如项目类',
} as const;

export const REMINDER_COPY = {
  permissionDenied: '请在系统设置中允许通知与「闹钟和提醒」权限',
  enabled: '已开启定时提醒',
  disabled: '已关闭定时提醒',
  rescheduled: '已更新提醒排程',
  sectionTitle: '定时提醒',
  intro:
    '到点由系统在通知栏弹出提醒，无需保持 App 打开。请允许通知权限；Android 12+ 还需允许「闹钟和提醒」，否则退出后可能无法准时提醒。',
  repeatHint:
    '「工作日」按法定工作日排程；「每天」含周末。打开 App 会自动补排（约每 30 天需打开一次续排）。',
  notificationPermission: '通知权限',
  exactAlarmPermission: '精确闹钟',
  granted: '已允许',
  denied: '未允许',
  colon: '：',
  pendingCount: (n: number) => `已排程：${n} 条`,
  nextFire: (t: string) => `下次提醒：${t}`,
  openExactAlarm: '去开启「闹钟和提醒」',
  toggleLabel: '开启提醒',
  timeLabel: '提醒时间',
  repeatLabel: '重复',
  repeatGroup: '提醒重复',
  weekdays: '工作日',
  daily: '每天',
} as const;
