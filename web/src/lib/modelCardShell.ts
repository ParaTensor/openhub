/**
 * 首页「全部模型」与登录后 /models 列表共用，避免登录前后卡片观感漂移。
 * 栅格与留白遵循 docs/ui-guidelines.md §5.5。
 */
export const MODEL_CARD_SHELL =
  'group flex min-h-[220px] flex-col rounded-xl border border-zinc-200 bg-white p-4 shadow-sm shadow-zinc-950/5 transition-all duration-200 hover:border-zinc-300 hover:shadow-md hover:shadow-zinc-950/10';

/** 响应式列数：大屏最多 4 列，避免定价/元数据卡片过窄（见 ui-guidelines §5.5）。 */
export const MODEL_CARD_GRID =
  'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
