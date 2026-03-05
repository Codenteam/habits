# AI Journal Example

A personal AI-powered journaling companion that analyzes your entries, tracks mood patterns, provides supportive feedback, and generates weekly insights—like having a compassionate therapist in your pocket.

<div id="ai-journal-screenshot">

![AI Journal Frontend](/examples/ai-journal/demo/1.png)
*AI Journal - Your personal journaling companion*

</div>

<div id="ai-journal-screenshot-2">

![AI Journal Weekly Insights](/examples/ai-journal/demo/2.png)
*Weekly insights and mood tracking*

</div>

<DownloadExample examplePath="ai-journal" />

## What It Does

- **Save Entries**: Write journal entries and get instant AI analysis
- **Mood Tracking**: Automatic sentiment analysis with mood scores (1-10)
- **Theme Extraction**: Identifies recurring topics, people, and concerns
- **Supportive Responses**: Compassionate AI feedback that validates feelings
- **Reflection Prompts**: Personalized questions to encourage deeper reflection
- **Weekly Insights**: Aggregated analysis of mood trends and patterns

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/save-entry` | POST | Save a journal entry with AI analysis |
| `/api/get-entries` | GET | List all journal entries |
| `/api/get-entry` | GET | Get a specific entry by ID |
| `/api/weekly-insights` | GET | Generate weekly mood/theme insights |

## Quick Start

<ExampleRunner examplePath="ai-journal" />

::: code-group
```bash [Save Entry]
curl -X POST http://localhost:13000/api/save-entry \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "content": "Today was a mixed bag. Had a great morning coffee with Sarah and we talked about her new project. Work was stressful though - the deadline for the Q2 report is looming and I feel underprepared. But I am grateful for having supportive friends."
    }
  }'
```

```bash [Get Entries]
curl http://localhost:13000/api/get-entries
```

```bash [Weekly Insights]
curl http://localhost:13000/api/weekly-insights
```
:::

## Key Features

### Emotional Intelligence

Each journal entry is analyzed for:
- **Mood Score**: 1-10 scale from very negative to very positive
- **Primary Emotion**: The dominant feeling expressed
- **Secondary Emotions**: Other emotions detected
- **Energy Level**: Low, medium, or high
- **Stress Indicators**: Detection of stress signals

### Theme Analysis

The AI extracts:
- Recurring themes (work, relationships, health, etc.)
- Specific topics mentioned
- People referenced
- Gratitudes expressed
- Concerns and worries

### Supportive AI Companion

Unlike generic chatbots, the journal AI:
- Validates feelings without judgment
- Offers gentle insights, not unsolicited advice
- Asks thoughtful reflection questions
- Maintains a warm, human tone

### Weekly Insights

After a week of journaling, get:
- Mood trend analysis (improving/stable/declining)
- Average mood score
- Dominant themes
- Positive patterns to celebrate
- Areas that need attention
- Personalized encouragement

## Key Files

::: code-group

<<< @/../examples/ai-journal/stack.yaml [stack.yaml]

<<< @/../examples/ai-journal/habits/save-entry.yaml [save-entry.yaml]

<<< @/../examples/ai-journal/habits/get-entries.yaml [get-entries.yaml]

<<< @/../examples/ai-journal/habits/weekly-insights.yaml [weekly-insights.yaml]

:::

## Workflow Architecture

The `save-entry` workflow runs parallel AI analysis:

```
[Journal Entry] → [Analyze Mood]          ↘
               → [Extract Themes]          → [Save to DB] → [Output]
               → [Generate Response]      ↗
               → [Reflection Prompts]    ↗
```

1. **Analyze Mood**: Sentiment analysis with mood scoring
2. **Extract Themes**: Topic and concern identification
3. **Generate Response**: Compassionate feedback based on mood/themes
4. **Reflection Prompts**: Personalized questions for deeper thinking
5. **Save**: Stores entry with all analysis in database

## Frontend

Includes a calming, minimalist frontend at `http://localhost:13000/` for writing entries and viewing insights.