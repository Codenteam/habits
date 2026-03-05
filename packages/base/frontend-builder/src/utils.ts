import type { Editor as GrapesEditor } from 'grapesjs';


let onGoingGrapesChange = false;
let cachedCode = '';
let onGoingCodeChange = false;
export function grapesToCode(editor: GrapesEditor, onChange: (html: string) => void): string | null {

    
    if(onGoingGrapesChange && cachedCode) return null;

    // Safety check: ensure editor wrapper exists before calling getHtml
    try {
      const wrapper = editor.getWrapper();
      if (!wrapper) {
        return cachedCode || '';
      }
    } catch {
      return cachedCode || '';
    }

    const editorContent = editor.getHtml();

    if(editorContent === cachedCode) {
        return cachedCode;
    }

    onGoingCodeChange = true;
    //   const wrapper = editor.getWrapper()!;
    //   const document = wrapper.getInnerHTML();
    //   const head = wrapper.head.toHTML();

      
      
      
      setTimeout(() => {
        onGoingCodeChange = false;
        onChange(editorContent);
      }, 100);
      cachedCode = editorContent;
      return editorContent;
}

export function codeToGrapes(editor: GrapesEditor, html: string, onChange: (html: string) => void){
    if(onGoingCodeChange) return;

    const mockHead = false;
    if(mockHead) {
    // Move any <head> content to <div id="head-mimic"> in the body, since GrapesJS doesn't allow direct head manipulation
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    let headContent = '';
    if (headMatch) {
        headContent = headMatch[1];
        // Remove original head content from HTML
        html = html.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '');
    }
    
    // Inject head content into a div in the body
    const headMimicDiv = `<div id="head-mimic" style="display:none;">${headContent}</div>`;
    html = html.replace(/<body([^>]*)>/i, `<body$1>${headMimicDiv}`);
  }


    onGoingGrapesChange = true;
    editor.setComponents(html, {asDocument: true});
    setTimeout(() => {
        onGoingGrapesChange = false;
        onChange(html);
    }, 100);
}

