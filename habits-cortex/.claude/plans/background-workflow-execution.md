# Background Workflow Execution (Non-Blocking UI)

## Context
`voice-capture` uses a streaming trigger (`triggerType: streaming`) that runs indefinitely while listening for voice commands. The current form runner in `runner.js:1478` does `await executeWorkflow(...)`, which blocks the UI thread for the entire duration. This means the app appears frozen while the workflow is "listening."

The fix is entirely in one file: `habits-cortex/www/runner.js`.

---

## What Already Exists (No New Infrastructure Needed)

- `window.HabitsBundle.executeWorkflowStreaming(workflowId, input, callback)` — already exported, calls `executeWorkflow` with an `onStream` option
- `window.HabitsBundle.cancelExecution(executionId)` — already implemented in the executor
- Stream event types already emitted: `execution_started`, `node_started`, `node_completed`, `node_failed`, `execution_completed`, `execution_failed`
- Each event carries `executionId` needed to cancel

---

## The Change — `runner.js` lines 1477–1542

Replace the blocking `await executeWorkflow(...)` block with a fire-and-forget streaming call.

### Before (blocking)
```js
const result = await window.HabitsBundle.executeWorkflow(workflow.id, inputData, { env: secrets });
// ... render result once at the end
```

### After (non-blocking)
```js
let activeExecutionId = null;

window.HabitsBundle.executeWorkflowStreaming(workflow.id, inputData, (event) => {
  if (event.executionId) activeExecutionId = event.executionId;

  if (event.type === 'execution_completed' || event.type === 'execution_failed') {
    // Final render (same logic as current success/fail rendering)
    renderWorkflowResult(event, outputContainer, workflow);
    resetSubmitButton(submitBtn);       // "Run Again" state
    activeExecutionId = null;
  } else {
    // Live stream: append each node event to the output area
    appendStreamEvent(event, outputContainer);
  }
}).catch(err => {
  renderWorkflowError(err, outputContainer);
  resetSubmitButton(submitBtn);
});
// Falls through immediately — UI stays responsive
```

The submit button changes to a **Stop** button after click:
```js
submitBtn.innerHTML = 'Stop';
submitBtn.onclick = () => {
  if (activeExecutionId) window.HabitsBundle.cancelExecution(activeExecutionId);
};
```

---

## Files to Change

| File | What changes |
|------|-------------|
| `habits-cortex/www/runner.js` lines 1414–1542 | Replace blocking `await executeWorkflow` with fire-and-forget streaming pattern; add Stop button; add live event append to output area |

No changes to Rust, cortex-core, or cortex-bundle.

---

## Verification

1. Pack & import the voice-demo habit
2. Click "Run Workflow" on `voice-capture` — button should immediately change to "Stop" and UI should remain interactive
3. Speak — each triggered event should appear as a log line in the output area in real-time
4. Click "Stop" — execution should cancel and button should return to "Run Again"
5. Check `voice-history` workflow still works (unrelated, should be unaffected)
