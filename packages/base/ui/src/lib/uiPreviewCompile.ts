/**
 * Compile UiSpec YAML to HTML in the browser for the WYSIWYG preview pane.
 */

type CompileUiYaml = (
  source: string,
  opts?: { builderPreview?: boolean },
) => { html: string };

let compileUiYamlFn: CompileUiYaml | null = null;

async function getCompiler(): Promise<CompileUiYaml> {
  if (!compileUiYamlFn) {
    const mod = await import('@ha-bits/cortex-core/ui');
    compileUiYamlFn = mod.compileUiYaml;
  }
  return compileUiYamlFn;
}

export async function compilePreviewHtml(yaml: string): Promise<string> {
  const compileUiYaml = await getCompiler();
  return compileUiYaml(yaml, { builderPreview: true }).html;
}
