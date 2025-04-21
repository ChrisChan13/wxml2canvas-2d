/** CSS 默认行高 */
export const DEFAULT_LINE_HEIGHT = 1.4;
/** 字体大小位置校准 */
// CSS 与 画布 的 font-size 存在数值偏差，暂时以常数换算实现近似结果
export const FONT_SIZE_OFFSET = 0.88;
/** 换行符 */
export const LINE_BREAK_SYMBOL = '\n';
/** 系统信息 */
export const {
  platform: SYS_PLATFORM,
  pixelRatio: SYS_DPR,
  windowWidth: SYS_WIDTH,
} = wx.getSystemInfoSync();
/** 是否为 iOS 平台 */
export const IS_IOS = SYS_PLATFORM === 'ios';
/** 是否为 macOS 平台 */
export const IS_MAC = SYS_PLATFORM === 'mac';
/** 是否为 Android 平台 */
export const IS_ANDROID = SYS_PLATFORM === 'android';
/** 是否为微信开发者工具 */
export const IS_DEVTOOL = SYS_PLATFORM === 'devtools';
/** 是否为 Windows 平台 */
export const IS_WINDOWS = SYS_PLATFORM === 'windows';
/** 设备像素与 750px 设计图比例 */
export const RPX_RATIO = 750 / SYS_WIDTH;
/** 三角函数值 转换 弧度 换算比例 */
export const TRI2RAD_RATIO = Math.PI / 180;
/** 椭圆形径向渐变的长短轴比例 */
// 暂未找到 CSS 中椭圆形径向渐变的长短轴生成规律，以常数代替实现近似结果
export const SIDE2CORNER_RATIO = 1.4141;
/** 视频海报的裁剪、缩放模式 */
export const VIDEO_POSTER_MODES = {
  contain: 'aspectFit',
  cover: 'aspectFill',
  fill: 'scaleToFill',
};
