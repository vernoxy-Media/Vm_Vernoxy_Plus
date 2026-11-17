export const TEMPLATE_TOKENS = {
  Repository: Symbol('TemplateRepository'),
  Engine: Symbol('TemplateEngine'),
  Sources: Symbol('TemplateSources'),
  Assets: Symbol('TemplateAssetStore'),
  ImageOptimizer: Symbol('ImageOptimizer'),
  AssetUrls: Symbol('AssetUrls'),
  BundledAssets: Symbol('BundledAssets'),
} as const;
