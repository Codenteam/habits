# Connection Graph Flow

The habit connection graph models how data moves from external sources through the UI, into workflows, and back to the user. Columns are ordered left to right:

**Sources → State → UI → Workflows → Output → Response**

Each row is one directed edge: **source → edge → destination**.

---

## Edge types

| Edge label | Meaning |
|------------|---------|
| `bind` | Form field writes into a state key |
| `submit` | Form submission triggers an action |
| `{bodyKey}` | State or action body field name (e.g. `param1`) |
| `POST` | UI action calls a workflow HTTP endpoint |
| `consumes` | Habit input (`habits.input.*`) required by a workflow |
| `env` | Environment variable (`habits.env.*`) required by a workflow |
| *(none)* | Workflow contains / owns an internal node or output |
| `output` | Workflow node value mapped to a habit output field |
| `response` | Workflow result handed to a response target |
| `set state` | Response written back into UI state (`onSuccess.set`) |
| `display` | State key shown in a result panel |
| `edge` | Internal wiring between workflow nodes |

---

## End-to-end path (typical form submit)

Ordered from user input to rendered result:

| # | Source | Edge | Destination | Layer → Layer |
|---|--------|------|-------------|---------------|
| 1 | `form:{field}` | `bind` | `state:{field}` | UI → State |
| 2 | `form:{field}` | `submit` | `action:{actionId}` | UI → UI |
| 3 | `state:{key}` | `{bodyKey}` | `action:{actionId}` | State → UI |
| 4 | `action:{actionId}` | `POST` | `workflow:{habitId}` | UI → Workflows |
| 5 | `action:{actionId}` | `{bodyKey}` | `input:{habitId}:{bodyKey}` | UI → Sources |
| 6 | `input:{habitId}:{field}` | `consumes` | `workflow:{habitId}` | Sources → Workflows |
| 7 | `env:{VAR}` | `env` | `workflow:{habitId}` | Sources → Workflows |
| 8 | `workflow:{habitId}` | *(structure)* | `node:{habitId}:{nodeId}` | Workflows → Workflows |
| 9 | `node:{habitId}:{nodeId}` | `output` | `output:{habitId}:{field}` | Workflows → Output |
| 10 | `output:{habitId}:{field}` | `output` | `response:{stateKey}` | Output → Response |
| 11 | `workflow:{habitId}` | `response` | `response:{stateKey}` | Workflows → Response |
| 12 | `response:{stateKey}` | `set state` | `state:{stateKey}` | Response → State |
| 13 | `state:{stateKey}` | `display` | `response:{stateKey}` | State → Response |

Steps 7 and 8–9 are optional depending on whether the habit uses env vars or multiple internal nodes.

---

## Example: `showcase/hello-world`

Stack workflows: `hello-world`, `hello-world-env`  
Frontend: `showcase/hello-world/frontend/index.yaml`

### Path A — “With inputs” tab (`callInput` → `hello-world`)

| # | Source | Edge | Destination |
|---|--------|------|-------------|
| 1 | `form:param1` | `bind` | `state:param1` |
| 2 | `form:param2` | `bind` | `state:param2` |
| 3 | `form:param1` | `submit` | `action:callInput` |
| 4 | `form:param2` | `submit` | `action:callInput` |
| 5 | `state:param1` | `param1` | `action:callInput` |
| 6 | `state:param2` | `param2` | `action:callInput` |
| 7 | `action:callInput` | `POST` | `workflow:hello-world` |
| 8 | `action:callInput` | `param1` | `input:hello-world:param1` |
| 9 | `action:callInput` | `param2` | `input:hello-world:param2` |
| 10 | `input:hello-world:param1` | `consumes` | `workflow:hello-world` |
| 11 | `input:hello-world:param2` | `consumes` | `workflow:hello-world` |
| 12 | `workflow:hello-world` | *(structure)* | `node:hello-world:say-hello` |
| 13 | `node:hello-world:say-hello` | `output` | `output:hello-world:greeting` |
| 14 | `workflow:hello-world` | *(structure)* | `output:hello-world:greeting` |
| 15 | `output:hello-world:greeting` | `output` | `response:inputResult` |
| 16 | `workflow:hello-world` | `response` | `response:inputResult` |
| 17 | `response:inputResult` | `set state` | `state:inputResult` |
| 18 | `state:inputResult` | `display` | `response:inputResult` |

**Runtime summary:** User types into `param1` / `param2` forms → state → `callInput` POSTs to `/api/hello-world` → `habits.input.param1/param2` → `say-hello` bit → `output.greeting` → `state.inputResult` → result panel.

### Path B — “From env” tab (`callEnv` → `hello-world-env`)

| # | Source | Edge | Destination |
|---|--------|------|-------------|
| 1 | `form:param2` | `bind` | `state:param2` |
| 2 | `form:param2` | `submit` | `action:callEnv` |
| 3 | `state:param2` | `param2` | `action:callEnv` |
| 4 | `action:callEnv` | `POST` | `workflow:hello-world-env` |
| 5 | `action:callEnv` | `param2` | `input:hello-world-env:param2` |
| 6 | `env:PARAM1` | `env` | `workflow:hello-world-env` |
| 7 | `input:hello-world-env:param2` | `consumes` | `workflow:hello-world-env` |
| 8 | `workflow:hello-world-env` | *(structure)* | `node:hello-world-env:say-hello` |
| 9 | `node:hello-world-env:say-hello` | `output` | `output:hello-world-env:greeting` |
| 10 | `workflow:hello-world-env` | *(structure)* | `output:hello-world-env:greeting` |
| 11 | `output:hello-world-env:greeting` | `output` | `response:envResult` |
| 12 | `workflow:hello-world-env` | `response` | `response:envResult` |
| 13 | `response:envResult` | `set state` | `state:envResult` |
| 14 | `state:envResult` | `display` | `response:envResult` |

**Runtime summary:** `param1` comes from `.env` (`PARAM1`) → `param2` from form/state → `callEnv` POSTs to `/api/hello-world-env` → `say-hello` bit → `state.envResult` → result panel.

---

## Node ID reference

| Prefix | Layer | Example |
|--------|-------|---------|
| `input:{habitId}:{field}` | Sources | `input:hello-world:param1` |
| `env:{VAR}` | Sources | `env:PARAM1` |
| `state:{key}` | State | `state:param1` |
| `form:{field}` | UI | `form:param1` |
| `action:{actionId}` | UI | `action:callInput` |
| `workflow:{habitId}` | Workflows | `workflow:hello-world` |
| `node:{habitId}:{nodeId}` | Workflows | `node:hello-world:say-hello` |
| `output:{habitId}:{field}` | Output | `output:hello-world:greeting` |
| `response:{stateKey}` | Response | `response:inputResult` |

---

## Implementation

Graph is built by `buildHabitGraph()` in `buildGraph.ts` and validated by `validateHabitGraph()` in `validateGraph.ts`. The Base UI **Habit Validation → Connection Graph** tab imports the same module via `@ha-bits/cortex-lab/graph` and renders it interactively with `buildPropagationSteps()`.
