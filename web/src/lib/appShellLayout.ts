/**
 * 已登录壳层（App main、Navbar 内层）与未登录 Landing 共用的水平约束，避免登录前后版心宽度漂移。
 */
export const APP_SHELL_MAX_CLASS = 'max-w-[1600px]';

export const APP_SHELL_PAD_CLASS = 'px-4 sm:px-6 lg:px-8';

/** Landing 主内容列宽上限（与 hero 一致）。 */
export const LANDING_MARKETING_MAX_CLASS = 'max-w-6xl';

/**
 * 未登录首页：hero、统计条、「全部模型」、底部 CTA 共用（顶栏仍为 `APP_SHELL_*` 全宽）。
 */
export const LANDING_CONTENT_COLUMN_CLASS = [
  'mx-auto w-full',
  LANDING_MARKETING_MAX_CLASS,
  APP_SHELL_PAD_CLASS,
].join(' ');
