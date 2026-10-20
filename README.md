# Transcript Trace

A small JavaScript automation that calls the OpenAI API to turn meeting transcripts into evidence-linked action candidates. Built as a personal portfolio project for property-management workflows. Uses Node.js 22+ with no external packages.

## What it does

- Numbers original transcript lines and processes overlapping 80-line chunks.
- Requests structured action items, explicit owners, literal deadlines and supporting quotations from OpenAI.
- Rejects missing or fabricated citations and owner/deadline strings absent from the cited text.
- Keeps every surviving candidate in `needs_review`: text matching does **not** establish semantic correctness.
- Exports JSON and CSV for review or import into Google Sheets. CSV formula prefixes are escaped.
- Retries transient HTTP failures up to three attempts; fails on incomplete or malformed responses.

## Run the offline demonstration

```sh
npm test
npm run demo
```

The synthetic property-management transcript includes two assigned actions, one unassigned task, and a tentative appliance purchase that should not become a task. The demo uses a **handwritten fixture**, including a fabricated action to demonstrate rejection. It makes **no API call** and is not evidence of live model performance. Inspect `output/actions.json` and `output/actions.csv`.

## Run with the real OpenAI API

Copy `.env.example` to `.env`. Set your **personal** `OPENAI_API_KEY` and an optional `OPENAI_MODEL` ID (defaults to `gpt-4.1-mini`). Never commit credentials. Then run:

```sh
node --env-file=.env cli.js sample.txt
node --env-file=.env cli.js path/to/transcript.txt output/session-1
```

Transcripts are sent to OpenAI. Use synthetic or authorized content. Outputs may contain sensitive meeting data and are ignored by Git. API usage is billed separately from chat subscriptions. The application uses the [OpenAI Responses API](https://developers.openai.com/api/docs/guides/structured-outputs).

## Design and practical limits

The model receives transcript data as JSON and is instructed to treat it as untrusted data. Citation validation is deterministic; interpretation still needs a person. A task can cite real words and still misrepresent a cancellation, speaker, or commitment. Owner/deadline validation only checks literal presence, so it cannot resolve pronouns or distinguish the addressee from the assignee. No task is automatically sent to ClickUp or another operational system.

Long transcripts use overlapping chunks with global line IDs. Only exact duplicate records are merged; paraphrased duplicates and corrections across distant chunks require review. Relative dates remain literal because a meeting date and timezone are not supplied. Input limits are 500,000 characters and 8,000 characters per line. Extremely dense chunks may exceed output limits; extraction fails rather than exporting partial live results. There is no durable checkpoint/resume, so rerunning a failed extraction can repeat billable requests.

## Validation status

Automated tests use mocked HTTP responses and adversarial fixtures. A live OpenAI API smoke test using `gpt-4.1-mini` was completed on October 20, 2026 with the synthetic sample. The first run found three actions but rejected two because their quotes omitted the speaker names. After clarifying the evidence instructions, the second run returned four candidates with valid citations: the three specific actions plus the broader unit-preparation task. The tentative appliance purchase was excluded. This small smoke test is not a measured accuracy benchmark or a deployment.

Before recording a demo, run the live sample and a longer synthetic transcript. Compare output against a manually reviewed list, check rejected proposals and missing actions, and record actual results. Include at least one correction/cancellation scenario. Report supported-action precision and recall separately from citation-validity rate.

## Failure case addressed

A model-shaped candidate with a nonexistent source line and an invented deadline is rejected by the evidence gate. The test suite reproduces this constructed failure and verifies the fix. This is a regression fixture, **not an observed live model incident**. Replace or supplement this section with a real debugging story after live testing.

## Scope

This version extracts actions from plain text. Fireflies ingestion, SOP generation, PDF parsing, a graphical interface, and Google Sheets API writes are future extensions. AI-assisted development was used; the repository documents its behavior and remaining limits for review.

## Observed live debugging example

The first real API run supplied correct assignees but quoted only the words after the speaker label. The validator correctly rejected those assignees because their names were absent from the supplied evidence. We clarified the prompt to include the speaker label when interpreting first-person commitments; the next run retained both assigned actions with complete supporting quotes. The strict validation gate stayed in place. The second run also included a broad preparation task, demonstrating why human semantic review remains necessary.
