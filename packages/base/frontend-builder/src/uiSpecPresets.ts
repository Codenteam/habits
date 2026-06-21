/**
 * Widget presets (multi-widget groups) and full UiSpec templates.
 *
 * Presets are derived from patterns across showcase frontend index.yaml files:
 *   card (121), section (97), form (70), result-panel (68), text (58),
 *   button (57), markdown (47), metric-grid (44), status-banner (39),
 *   alert (38), kv-grid (37), history-grid (7), chat-panel (4).
 */

export interface WidgetPreset {
  id: string;
  label: string;
  description: string;
  /** Widget specs (no uids) — unfurled onto the canvas on drop. */
  widgets: Record<string, unknown>[];
}

export interface UiSpecTemplate {
  id: string;
  label: string;
  description: string;
  /** Full UiSpec YAML (version, meta, theme, layout, state, actions, widgets/views). */
  yaml: string;
}

/** Five presets covering the most common widget combinations in showcase habits. */
export const WIDGET_PRESETS: WidgetPreset[] = [
  {
    id: 'form-with-result',
    label: 'Form + result',
    description: 'Card with a form and a result panel — used in 60+ showcase habits',
    widgets: [
      {
        kind: 'card',
        title: 'Input',
        children: [
          {
            kind: 'form',
            bindTo: 'state',
            fields: [
              { name: 'input', type: 'text', label: 'Input', placeholder: 'Enter a value…', required: true },
            ],
            submit: { label: 'Submit', action: 'submit', loadingLabel: 'Working…' },
          },
        ],
      },
      {
        kind: 'result-panel',
        source: 'state.result',
        title: 'Result',
        showWhen: 'state.result',
        sections: [{ kind: 'json-dump', source: 'state.result', copy: true }],
      },
    ],
  },
  {
    id: 'feedback-stack',
    label: 'Status & errors',
    description: 'Status banner, loading spinner, and error alert — common feedback trio',
    widgets: [
      { kind: 'spinner', label: 'Loading…', showWhen: 'state.__loading.submit' },
      {
        kind: 'status-banner',
        source: 'state.status',
        showWhen: 'state.status',
      },
      {
        kind: 'alert',
        level: 'error',
        text: '{{state.error}}',
        showWhen: 'state.error',
      },
    ],
  },
  {
    id: 'hero-cta',
    label: 'Hero + action',
    description: 'Landing hero with a primary call-to-action button',
    widgets: [
      {
        kind: 'hero',
        icon: 'lucide:Sparkles',
        title: 'Welcome',
        subtitle: 'A short tagline for your habit',
        description: 'Describe what this page does in one or two sentences.',
      },
      {
        kind: 'button',
        label: 'Get started',
        action: 'getStarted',
        tone: 'primary',
        fullWidth: true,
      },
    ],
  },
  {
    id: 'metrics-card',
    label: 'Metrics dashboard',
    description: 'KPI metric grid inside a card — used in dashboards and admin views',
    widgets: [
      {
        kind: 'card',
        title: 'Overview',
        children: [
          {
            kind: 'metric-grid',
            columns: 3,
            metrics: [
              { value: '—', label: 'Total', tone: 'primary' },
              { value: '—', label: 'Active', tone: 'success' },
              { value: '—', label: 'Pending', tone: 'warn' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'history-browser',
    label: 'History browser',
    description: 'Grid of past items with load action — common in AI and journal habits',
    widgets: [
      {
        kind: 'history-grid',
        loadAction: 'loadItems',
        dataPath: 'entries',
        columns: 1,
        empty: 'No items yet.',
        itemTemplate: { title: '{{item.title}}', meta: '{{item.date}}' },
        reloadAfter: ['submit'],
      },
    ],
  },
];

export const WIDGET_PRESETS_BY_ID = new Map(WIDGET_PRESETS.map((p) => [p.id, p]));

/** Full-page templates with state, actions, and widgets wired together. */
export const UI_SPEC_TEMPLATES: UiSpecTemplate[] = [
  {
    id: 'contact-form',
    label: 'Contact form',
    description: 'Simple name, email, and message form with send action',
    yaml: `version: 1
meta:
  id: contact-form
  title: Contact us
  subtitle: Send us a message
  icon: "lucide:Mail"

theme:
  preset: neural
  mode: dark

layout:
  type: single
  header: { title: Contact us, subtitle: "We'd love to hear from you", icon: "lucide:Mail" }

state:
  name: ""
  email: ""
  message: ""
  status: null
  error: null

actions:
  sendMessage:
    method: POST
    endpoint: /api/contact
    body:
      name: "{{state.name}}"
      email: "{{state.email}}"
      message: "{{state.message}}"
    onSuccess:
      set: { status: "Message sent!", error: null, message: "" }
      toast: "Message sent"
    onError:
      set: { error: "$error.message", status: null }

widgets:
  - kind: card
    title: Get in touch
    children:
      - kind: form
        bindTo: state
        fields:
          - { name: name, type: text, label: Name, placeholder: "Your name", required: true }
          - { name: email, type: email, label: Email, placeholder: "you@example.com", required: true }
          - { name: message, type: textarea, label: Message, placeholder: "How can we help?", rows: 5, required: true }
        submit: { label: Send message, action: sendMessage, loadingLabel: "Sending…" }
      - kind: status-banner
        showWhen: state.status
        source: state.status
  - kind: alert
    level: error
    showWhen: state.error
    text: "{{state.error}}"
`,
  },
  {
    id: 'detailed-contact-form',
    label: 'Detailed contact form',
    description: 'Full contact form with phone, company, and subject fields',
    yaml: `version: 1
meta:
  id: detailed-contact
  title: Contact us
  subtitle: Detailed inquiry form
  icon: "lucide:Contact"

theme:
  preset: ha-bits-blue
  mode: dark

layout:
  type: single
  header: { title: Contact us, subtitle: "Tell us about your project", icon: "lucide:Contact" }

state:
  name: ""
  email: ""
  phone: ""
  company: ""
  subject: ""
  message: ""
  status: null
  error: null

actions:
  sendInquiry:
    method: POST
    endpoint: /api/contact
    body:
      name: "{{state.name}}"
      email: "{{state.email}}"
      phone: "{{state.phone}}"
      company: "{{state.company}}"
      subject: "{{state.subject}}"
      message: "{{state.message}}"
    onSuccess:
      set: { status: "Inquiry submitted!", error: null, message: "", subject: "" }
      toast: "Inquiry sent"
    onError:
      set: { error: "$error.message", status: null }

widgets:
  - kind: card
    title: Contact details
    children:
      - kind: form
        bindTo: state
        fields:
          - { name: name, type: text, label: Full name, required: true }
          - { name: email, type: email, label: Email, required: true }
          - { name: phone, type: text, label: Phone, placeholder: "+1 555 000 0000" }
          - { name: company, type: text, label: Company / organisation }
          - { name: subject, type: text, label: Subject, required: true }
          - { name: message, type: textarea, label: Message, rows: 6, required: true, showWordCount: true }
        submit: { label: Submit inquiry, action: sendInquiry, loadingLabel: "Submitting…" }
      - kind: status-banner
        showWhen: state.status
        source: state.status
  - kind: alert
    level: error
    showWhen: state.error
    text: "{{state.error}}"
`,
  },
  {
    id: 'chat-interface',
    label: 'Chat interface',
    description: 'Chat panel with message history, input, and send action',
    yaml: `version: 1
meta:
  id: chat
  title: Chat
  subtitle: Conversational interface
  icon: "lucide:MessageCircle"

theme:
  preset: neural
  mode: dark

layout:
  type: single
  header: { title: Chat, subtitle: "Ask anything", icon: "lucide:MessageCircle" }

state:
  messages: []
  message: ""
  error: null

actions:
  sendMessage:
    method: POST
    endpoint: /api/chat
    body:
      message: "{{state.message}}"
      history: "{{state.messages}}"
    responsePath: output.response
    onSuccess:
      append:
        messages:
          role: assistant
          content: "$response"
      set: { message: "", error: null }
    onError:
      set: { error: "$error.message" }
  clearChat:
    set: { messages: [], message: "", error: null }

widgets:
  - kind: empty-state
    icon: "lucide:MessageCircle"
    title: "Start a conversation"
    subtitle: "Type a message below to begin."
    showWhen: "!state.messages.length"
  - kind: chat-panel
    messages: state.messages
    inputAction: sendMessage
    inputField: state.message
    placeholder: "Type your message…"
    autoScroll: true
  - kind: button
    label: Clear chat
    action: clearChat
    tone: secondary
    showWhen: state.messages.length
  - kind: alert
    level: error
    showWhen: state.error
    text: "{{state.error}}"
`,
  },
  {
    id: 'form-result-page',
    label: 'Form + result page',
    description: 'Input form with JSON result panel — hello-world pattern',
    yaml: `version: 1
meta:
  id: form-result
  title: Form demo
  subtitle: Submit inputs and view the result
  icon: "lucide:PenLine"

theme:
  preset: neural
  mode: dark

layout:
  type: single
  header: { title: Form demo, subtitle: "Submit and see the response", icon: "lucide:PenLine" }

state:
  param1: ""
  param2: ""
  result: null
  error: null

actions:
  submit:
    method: POST
    endpoint: /api/process
    body:
      param1: "{{state.param1}}"
      param2: "{{state.param2}}"
    responsePath: output
    onSuccess:
      set: { result: "$response", error: null }
      toast: "Done"
    onError:
      set: { error: "$error.message" }

widgets:
  - kind: card
    title: Input
    children:
      - kind: form
        bindTo: state
        fields:
          - { name: param1, type: text, label: Param 1, placeholder: "First value", required: true }
          - { name: param2, type: text, label: Param 2, placeholder: "Second value", required: true }
        submit: { label: Submit, action: submit, loadingLabel: "Processing…" }
  - kind: alert
    level: error
    showWhen: state.error
    text: "{{state.error}}"
  - kind: result-panel
    source: state.result
    title: Result
    showWhen: state.result
    sections:
      - { kind: json-dump, source: state.result, copy: true }
`,
  },
  {
    id: 'ai-generator',
    label: 'AI generator',
    description: 'Prompt form with streaming output and workflow status',
    yaml: `version: 1
meta:
  id: ai-generator
  title: AI Generator
  subtitle: Stream results from your workflow
  icon: "lucide:Sparkles"

theme:
  preset: ha-bits-purple
  mode: dark

layout:
  type: single
  header: { title: AI Generator, subtitle: "Describe what you need", icon: "lucide:Sparkles" }

state:
  prompt: ""
  error: null

actions:
  generate:
    method: POST
    endpoint: /api/generate
    query:
      stream: "true"
    body:
      prompt: "{{state.prompt}}"
    stream: ndjson
    clear:
      - state.__stream.generate
    onError:
      set:
        error: "{{error.message}}"
  reset:
    set:
      prompt: "''"
      error: "''"
    clear:
      - state.__stream.generate

widgets:
  - kind: card
    title: Your prompt
    hideWhen: state.__stream.generate.length
    children:
      - kind: form
        bindTo: state
        fields:
          - name: prompt
            type: textarea
            label: Prompt
            placeholder: "Describe what you want to generate…"
            rows: 6
            required: true
            submitOnCtrlEnter: true
        submit:
          label: Generate (Ctrl+Enter)
          action: generate
          loadingLabel: "Generating…"
  - kind: spinner
    label: Generating…
    showWhen: state.__loading.generate
  - kind: status-banner
    showWhen: state.error
    source: state.error
  - kind: card
    title: Output
    showWhen: state.__stream.generate.length
    children:
      - kind: streaming-panel
        source: state.__stream.generate
        itemTemplate:
          title: "{{item.nodeName | default:item.nodeId}}"
          status: "{{item.status}}"
          body: "{{item.output | json}}"
      - kind: button
        label: New generation
        action: reset
        tone: secondary
`,
  },
  {
    id: 'ai-cookbook',
    label: 'AI Cookbook',
    description: 'Recipe generator with ingredient form, result panel, and history grid',
    yaml: `version: 1
meta:
  id: ai-cookbook
  title: AI Cookbook
  subtitle: Turn your ingredients into delicious recipes
  icon: "lucide:ChefHat"

theme:
  preset: ha-bits-warn
  mode: dark

layout:
  type: tabs
  header: { title: AI Cookbook, subtitle: "Recipe Generator", icon: "lucide:ChefHat" }
  nav:
    - { id: create, label: Create, icon: "lucide:Sparkles" }
    - { id: history, label: History, icon: "lucide:FolderOpen" }

state:
  ingredients: []
  mealType: ""
  cuisine: ""
  restrictions: ""
  servings: "4"
  currentRecipe: null
  error: null

actions:
  generate:
    method: POST
    endpoint: /api/generate-recipe
    body:
      ingredients: "{{state.ingredients}}"
      restrictions: "{{state.restrictions}}"
      cuisine: "{{state.cuisine}}"
      mealType: "{{state.mealType}}"
      servings: "{{state.servings}}"
    responsePath: output
    onSuccess:
      set: { currentRecipe: "$response", error: null }
      dispatch: listHistory
      toast: "Recipe ready"
    onError: { set: { error: "$error.message" } }
  listHistory:
    method: POST
    endpoint: /api/list-recipes
    body: { limit: 12 }
    responsePath: output
  reopenRecipe:
    method: GET
    endpoint: /api/get-recipe
    query:
      id: "{{params.id}}"
    responsePath: output.recipe
    onSuccess:
      set: { currentRecipe: "$response", error: null }
      goto: create
      toast: "Recipe loaded"
  clearRecipe:
    set: { currentRecipe: null, error: null }

defaultView: create

views:
  create:
    widgets:
      - kind: card
        title: Generate a recipe
        hideWhen: state.currentRecipe
        children:
          - kind: form
            bindTo: state
            fields:
              - { name: ingredients, type: tag-input, label: Available ingredients, placeholder: "Type and press Enter", required: true }
              - { name: mealType, type: select, label: Meal type, options: ["", breakfast, lunch, dinner, snack, dessert] }
              - { name: cuisine, type: select, label: Cuisine, options: ["", Italian, Mexican, Asian, Indian, Mediterranean, American, French] }
              - { name: restrictions, type: text, label: Dietary restrictions, placeholder: "vegetarian, gluten-free, dairy-free..." }
              - { name: servings, type: select, label: Servings, default: "4", options: ["1", "2", "4", "6", "8"] }
            submit: { label: Generate recipe, action: generate, loadingLabel: "Cooking up something..." }
      - kind: status-banner
        showWhen: state.error
        source: state.error
      - kind: result-panel
        showWhen: state.currentRecipe
        source: state.currentRecipe
        title: Your recipe
        sections:
          - kind: hero
            title: "{{state.currentRecipe.recipe.title}}"
            description: "{{state.currentRecipe.recipe.description}}"
            chips:
              - { label: "{{state.currentRecipe.recipe.prepTime}}", icon: "lucide:Timer" }
              - { label: "{{state.currentRecipe.recipe.cookTime}}", icon: "lucide:Flame" }
              - { label: "{{state.currentRecipe.recipe.servings}} servings", icon: "lucide:Utensils" }
              - { label: "{{state.currentRecipe.recipe.difficulty}}", icon: "lucide:TrendingUp" }
          - kind: section
            title: Ingredients
            children:
              - { kind: bullet-list, source: state.currentRecipe.recipe.ingredients, itemTemplate: "{{item.amount}} {{item.item}}" }
          - kind: section
            title: Instructions
            children:
              - { kind: numbered-list, source: state.currentRecipe.recipe.instructions, itemTemplate: "{{item.instruction}}" }
          - kind: section
            title: Nutrition per serving
            showWhen: state.currentRecipe.nutrition
            children:
              - kind: metric-grid
                columns: 5
                metrics:
                  - { value: "{{state.currentRecipe.nutrition.perServing.calories}}", label: kcal }
                  - { value: "{{state.currentRecipe.nutrition.perServing.protein}}", label: protein }
                  - { value: "{{state.currentRecipe.nutrition.perServing.carbs}}", label: carbs }
                  - { value: "{{state.currentRecipe.nutrition.perServing.fat}}", label: fat }
                  - { value: "{{state.currentRecipe.nutrition.perServing.fiber}}", label: fiber }
          - kind: section
            title: Shopping list
            showWhen: state.currentRecipe.shoppingList.needed
            children:
              - { kind: bullet-list, source: state.currentRecipe.shoppingList.needed, itemTemplate: "{{item.amount}} {{item.item}}" }
          - kind: section
            title: Chef tips
            showWhen: state.currentRecipe.recipe.tips
            children:
              - { kind: bullet-list, source: state.currentRecipe.recipe.tips, itemTemplate: "{{item}}" }
          - kind: button
            label: Generate another
            action: clearRecipe
            variant: secondary
  history:
    onEnter: listHistory
    widgets:
      - kind: history-grid
        loadAction: listHistory
        dataPath: recipes
        reloadAfter: [generate]
        columns: 2
        itemTemplate:
          title: "{{item.recipe.title}}"
          subtitle: "{{item.recipe.cuisine}} · {{item.recipe.totalTime}}"
          meta: "{{item._createdAt | date}}"
        onClick:
          action: reopenRecipe
          params: { id: "{{item._id}}" }
        empty: "No recipes yet."
`,
  },
];

export const UI_SPEC_TEMPLATES_BY_ID = new Map(UI_SPEC_TEMPLATES.map((t) => [t.id, t]));
