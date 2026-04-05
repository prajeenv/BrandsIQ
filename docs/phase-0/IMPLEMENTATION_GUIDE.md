# BrandsIQ: Implementation Guide (Condensed)
**Version:** 1.0 | **Phase:** MVP | **Focus:** User Flows, Multi-Language, Sentiment, Edge Cases

---

## User Flows (Simplified)

### Complete New User Journey
```
1. Visit landing page → Click "Sign Up"
2. Enter email/password → Create account
3. System sends verification email
4. User clicks verification link → Email verified
5. Auto-login → Dashboard (empty state)
6. Click "Add Review" → Paste review text
7. System auto-detects language (e.g., "Spanish")
8. Click "Generate Response"
9. AI generates response in Spanish
10. User edits (optional) → Click "Approve"
11. Copy response → Paste on review platform
```

### Review Addition Flow
```
Dashboard → "Add Review" button
  ↓
Review Form:
- Paste review text (auto-detect language)
- Select platform (Google, Amazon, etc.)
- Add rating (optional), reviewer name (optional)
- Override language if detection wrong
  ↓
Click "Add Review"
  ↓
System:
1. Validates input (1-2000 chars)
2. Detects language (franc library)
3. Saves to database
4. Triggers sentiment analysis (DeepSeek)
  ↓
Redirects to review detail page
```

### Response Generation Flow
```
Review Detail Page → "Generate Response" button
  ↓
System checks:
- User has credits? (YES → continue, NO → show upgrade modal)
- Sentiment quota available? (YES → continue, NO → show limit)
  ↓
Generate Response:
1. Fetch user's brand voice
2. Call Claude API with prompt
3. Deduct 1.0 credits
4. Save response to database
5. Create version history entry
6. Log credit usage (audit trail)
  ↓
Show response with options:
- Edit
- Regenerate (different tone)
- Approve & Copy
```

### Response Editing Flow
```
Response displayed → User clicks "Edit"
  ↓
Text editor opens (pre-filled with AI response)
  ↓
User makes changes
  ↓
Click "Save"
  ↓
System:
1. Mark isEdited = true
2. Update editedAt timestamp
3. Create new version in ResponseVersion table
  ↓
Show updated response
```

### Regenerate Flow
```
Response displayed → User clicks "Regenerate"
  ↓
Modal appears: "Select tone"
- Professional
- Friendly
- Empathetic
  ↓
Click "Regenerate"
  ↓
System checks:
- User has 1.0 credits? (YES → continue, NO → error)
  ↓
System:
1. Call Claude API with new tone modifier
2. Deduct 1.0 credits
3. Create new version
4. Update response text
5. Log credit usage
  ↓
Show new response
```

---

## Multi-Language Support

### Language Detection

**Installation:**
```bash
npm install franc-min
npm install -D @types/franc
```

**Implementation:**
```typescript
// lib/language-detection.ts

import { franc } from "franc-min";

const LANGUAGE_MAP: Record<string, string> = {
  eng: "English", spa: "Spanish", fra: "French", deu: "German",
  ita: "Italian", por: "Portuguese", nld: "Dutch", pol: "Polish",
  rus: "Russian", jpn: "Japanese", cmn: "Chinese (Simplified)",
  kor: "Korean", ara: "Arabic", heb: "Hebrew", hin: "Hindi",
  tur: "Turkish", vie: "Vietnamese", tha: "Thai", ind: "Indonesian",
  // ... 20+ more languages
};

export function detectLanguage(text: string): {
  language: string;
  confidence: "high" | "low";
  code: string;
} {
  if (!text || text.trim().length < 10) {
    return { language: "English", confidence: "low", code: "eng" };
  }
  
  const langCode = franc(text, { minLength: 10 });
  
  if (langCode === "und") {
    return { language: "English", confidence: "low", code: "eng" };
  }
  
  return {
    language: LANGUAGE_MAP[langCode] || "English",
    confidence: text.length >= 50 ? "high" : "low",
    code: langCode
  };
}

export function getSupportedLanguages(): string[] {
  return Object.values(LANGUAGE_MAP).sort();
}
```

**Usage in Review Form:**
```typescript
// Auto-detect on text input (debounced)
useEffect(() => {
  if (!reviewText || reviewText.length < 10) return;
  
  const timeoutId = setTimeout(() => {
    const result = detectLanguage(reviewText);
    setDetectedLanguage(result.language);
    setConfidence(result.confidence);
  }, 500);
  
  return () => clearTimeout(timeoutId);
}, [reviewText]);
```

### Supported Languages (40+)
English, Spanish, French, German, Italian, Portuguese, Dutch, Polish, Russian, Japanese, Chinese (Simplified), Chinese (Traditional), Korean, Arabic, Hebrew, Hindi, Turkish, Vietnamese, Thai, Indonesian, Malay, Filipino, Swedish, Danish, Finnish, Norwegian, Czech, Hungarian, Romanian, Ukrainian, Catalan, Croatian, Serbian, Slovenian, Bulgarian, Lithuanian, Latvian, Estonian, Bengali, Tamil, Telugu, Marathi, Urdu, Persian

### AI Response Generation (Native, Not Translated)

**Prompt Template:**
```typescript
function buildResponsePrompt(
  reviewText: string,
  language: string,
  brandVoice: BrandVoice,
  tone?: string
): string {
  const toneModifier = tone === "friendly" 
    ? "warm and personable" 
    : tone === "empathetic" 
    ? "understanding and compassionate"
    : "professional and courteous";

  return `You are responding to a customer review for a business. The review is in ${language}, and you must respond in ${language} (native quality, not translated).

Review Text:
"${reviewText}"

Brand Voice Guidelines:
- Tone: ${brandVoice.tone}
- Formality Level: ${brandVoice.formality}/5
- Key Phrases to Use: ${brandVoice.keyPhrases.join(", ")}
- Style Notes: ${brandVoice.styleNotes || "N/A"}
- Tone Modifier: ${toneModifier}

Instructions:
1. Write ONLY in ${language} (native speaker quality)
2. Keep response 50-150 words
3. Be genuine, not robotic
4. Match the brand voice guidelines
5. Address specific points from the review
6. DO NOT translate - write natively in ${language}

Response (in ${language}):`;
}
```

**API Call:**
```typescript
// lib/ai/claude.ts

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function generateResponse(
  reviewText: string,
  language: string,
  brandVoice: BrandVoice,
  tone?: string
): Promise<string> {
  const prompt = buildResponsePrompt(reviewText, language, brandVoice, tone);
  
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      { role: "user", content: prompt }
    ]
  });
  
  const responseText = message.content[0].type === "text" 
    ? message.content[0].text 
    : "";
  
  return responseText.trim();
}
```

### RTL Language Support (Arabic, Hebrew)
```css
/* globals.css */

[dir="rtl"] {
  direction: rtl;
  text-align: right;
}

[dir="rtl"] .review-text,
[dir="rtl"] .response-text {
  direction: rtl;
  text-align: right;
  unicode-bidi: plaintext; /* Preserve mixed content direction */
}
```

**Component:**
```typescript
// Detect RTL languages
const RTL_LANGUAGES = ["Arabic", "Hebrew", "Persian", "Urdu"];

function ReviewCard({ review }: { review: Review }) {
  const isRTL = RTL_LANGUAGES.includes(review.detectedLanguage);
  
  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <p className="review-text">{review.reviewText}</p>
    </div>
  );
}
```

---

## Sentiment Analysis (DeepSeek)

### Installation
```bash
npm install axios
```

### DeepSeek API Client

```typescript
// lib/ai/deepseek.ts

import axios from "axios";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export async function analyzeSentiment(reviewText: string): Promise<{
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
}> {
  const response = await axios.post(
    DEEPSEEK_API_URL,
    {
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are a sentiment analysis system. Analyze the sentiment of customer reviews and respond ONLY with: positive, neutral, or negative."
        },
        {
          role: "user",
          content: `Analyze the sentiment of this review:\n\n"${reviewText}"\n\nSentiment (positive/neutral/negative):`
        }
      ],
      temperature: 0.1, // Low temperature for consistent classification
      max_tokens: 10
    },
    {
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  
  const sentimentText = response.data.choices[0].message.content.trim().toLowerCase();
  
  // Validate and normalize
  let sentiment: "positive" | "neutral" | "negative";
  if (sentimentText.includes("positive")) {
    sentiment = "positive";
  } else if (sentimentText.includes("negative")) {
    sentiment = "negative";
  } else {
    sentiment = "neutral";
  }
  
  return {
    sentiment,
    confidence: 0.9 // DeepSeek doesn't provide confidence, use fixed value
  };
}
```

### Integration in Review Creation

```typescript
// app/api/reviews/route.ts

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorized();
  
  const { platform, reviewText, rating, reviewerName, reviewDate } = await req.json();
  
  // Validate input
  if (!reviewText || reviewText.length < 1 || reviewText.length > 2000) {
    return validationError("Review text must be 1-2000 characters");
  }
  
  // Detect language
  const languageResult = detectLanguage(reviewText);
  
  // Check sentiment quota
  const user = await prisma.user.findUnique({
    where: { id: session.user.id }
  });
  
  if (!user || user.sentimentUsed >= user.sentimentQuota) {
    return NextResponse.json(
      { error: { code: "SENTIMENT_QUOTA_EXCEEDED", message: "Monthly sentiment analysis limit reached" } },
      { status: 402 }
    );
  }
  
  // Analyze sentiment
  const { sentiment } = await analyzeSentiment(reviewText);
  
  // Create review
  const review = await prisma.review.create({
    data: {
      userId: session.user.id,
      platform,
      reviewText,
      rating,
      reviewerName,
      reviewDate: reviewDate ? new Date(reviewDate) : null,
      detectedLanguage: languageResult.language,
      sentiment
    }
  });
  
  // Log sentiment usage (audit trail)
  await prisma.sentimentUsage.create({
    data: {
      userId: session.user.id,
      reviewId: review.id,
      sentiment,
      details: JSON.stringify({
        platform,
        rating,
        preview: reviewText.substring(0, 100),
        analyzedAt: new Date(),
      })
    }
  });
  
  // Increment sentiment usage counter
  await prisma.user.update({
    where: { id: session.user.id },
    data: { sentimentUsed: { increment: 1 } }
  });
  
  return NextResponse.json({ success: true, data: { review } }, { status: 201 });
}
```

---

## Critical Edge Cases

### 1. Insufficient Credits
**Scenario:** User tries to generate response with 0 credits

**Handling:**
```typescript
if (user.credits < 1) {
  return NextResponse.json(
    {
      error: {
        code: "INSUFFICIENT_CREDITS",
        message: "You have 0 credits remaining",
        details: {
          creditsNeeded: 1,
          creditsAvailable: user.credits,
          resetDate: user.creditsResetDate,
          upgradeUrl: "/pricing"
        }
      }
    },
    { status: 402 }
  );
}
```

**UI:** Show upgrade modal with pricing options

### 2. Sentiment Quota Exceeded
**Scenario:** User tries to add review when sentiment quota used up

**Handling:**
```typescript
if (user.sentimentUsed >= user.sentimentQuota) {
  return NextResponse.json(
    {
      error: {
        code: "SENTIMENT_QUOTA_EXCEEDED",
        message: "Monthly sentiment analysis limit reached",
        details: {
          quotaUsed: user.sentimentUsed,
          quotaTotal: user.sentimentQuota,
          resetDate: user.sentimentResetDate
        }
      }
    },
    { status: 402 }
  );
}
```

**UI:** Allow review creation but show warning: "Sentiment analysis unavailable (quota reached)"

### 3. Language Detection Low Confidence
**Scenario:** Review text too short (<50 chars) or mixed languages

**Handling:**
- Show warning: "⚠️ Language detection uncertain. Please verify."
- Pre-select detected language but make dropdown prominent
- User must confirm before generating response

### 4. Very Long Review (>2000 chars)
**Scenario:** User pastes review exceeding 2000 char limit

**Handling:**
```typescript
// Client-side validation
if (reviewText.length > 2000) {
  setError("Review text must be under 2000 characters");
  return;
}

// Server-side validation
if (reviewText.length > 2000) {
  return validationError("Review text exceeds 2000 character limit");
}
```

### 5. API Failure (Claude or DeepSeek Down)
**Scenario:** AI API returns error or times out

**Handling:**
```typescript
try {
  const response = await generateResponse(reviewText, language, brandVoice);
} catch (error) {
  // Log error
  console.error("AI API error:", error);
  
  // Don't deduct credits on failure
  // Show user-friendly error
  return NextResponse.json(
    {
      error: {
        code: "AI_SERVICE_UNAVAILABLE",
        message: "AI service is temporarily unavailable. Please try again in a few moments.",
        retryAfter: 60 // seconds
      }
    },
    { status: 503 }
  );
}
```

### 6. Duplicate Review Submission
**Scenario:** User accidentally submits same review twice

**Handling:**
- Client: Disable submit button after click (prevent double-click)
- Server: Check for duplicate within 5 minutes (same userId + reviewText)
```typescript
const recentDuplicate = await prisma.review.findFirst({
  where: {
    userId: session.user.id,
    reviewText,
    createdAt: {
      gte: new Date(Date.now() - 5 * 60 * 1000) // Within 5 minutes
    }
  }
});

if (recentDuplicate) {
  return NextResponse.json(
    { error: { code: "DUPLICATE_REVIEW", message: "This review was already added" } },
    { status: 409 }
  );
}
```

### 7. Race Condition on Credit Deduction
**Scenario:** User clicks "Generate" multiple times rapidly

**Handling:**
```typescript
// Use Prisma transaction with row locking
await prisma.$transaction(async (tx) => {
  // Lock user row
  const user = await tx.user.findUnique({
    where: { id: userId }
  });
  
  if (!user || user.credits < 1) {
    throw new Error("INSUFFICIENT_CREDITS");
  }
  
  // Deduct credits atomically
  await tx.user.update({
    where: { id: userId },
    data: { credits: { decrement: 1 } }
  });
  
  // Create usage log
  await tx.creditUsage.create({
    data: { userId, creditsUsed: 1, action: "GENERATE_RESPONSE" }
  });
});
```

### 8. Response Too Long (>500 chars)
**Scenario:** AI generates response exceeding 500 char limit

**Handling:**
```typescript
let responseText = await generateResponse(...);

if (responseText.length > 500) {
  // Truncate at last complete sentence before 500 chars
  responseText = responseText.substring(0, 500);
  const lastPeriod = responseText.lastIndexOf(".");
  if (lastPeriod > 400) {
    responseText = responseText.substring(0, lastPeriod + 1);
  }
}
```

### 9. User Deletes Review with Pending Response
**Scenario:** Review deleted while AI response generation in progress

**Handling:**
- Use database cascade: `onDelete: Cascade` on ReviewResponse
- Check review exists before saving response:
```typescript
const review = await prisma.review.findUnique({
  where: { id: reviewId }
});

if (!review) {
  // Review was deleted, don't save response
  // Refund credits
  await refundCredits(userId, 1, "Review deleted during generation");
  return;
}
```

### 10. Email Not Verified After 7 Days
**Scenario:** User signed up but never verified email

**Handling:**
- Show banner on dashboard: "Please verify your email"
- Limit functionality: Can't generate responses until verified
- Send reminder emails: Day 1, Day 3, Day 7
- Auto-delete unverified accounts after 30 days

---

## Testing Scenarios

### Multi-Language Testing
1. Test each of top 10 languages (English, Spanish, French, German, Italian, Portuguese, Chinese, Japanese, Korean, Arabic)
2. Verify native quality (not translated sound)
3. Test language detection with short text (<50 chars)
4. Test mixed language reviews (e.g., English + Spanish)

### Credit System Testing
1. Generate response → verify 1.0 credits deducted
2. Regenerate → verify 1.0 credits deducted
3. Try with 0 credits → verify error shown
4. Check audit trail → verify CreditUsage logged
5. Race condition test → rapid clicks → verify no over-deduction

### Sentiment Analysis Testing
1. Positive review (5 stars, great feedback) → verify "positive"
2. Negative review (1 star, complaints) → verify "negative"
3. Neutral review (3 stars, mixed) → verify "neutral"
4. Test quota limit → verify error when exceeded

### Authentication Testing
1. Sign up → verify email sent → click link → verify email confirmed
2. Login before email verified → verify error shown
3. Google OAuth → verify auto-login, email pre-verified
4. Password reset → verify email sent → reset works
5. Failed login 5x → verify account locked 15 min

### API Error Handling
1. Invalid JWT → verify 401 Unauthorized
2. Missing required fields → verify 400 Validation Error
3. Non-existent review ID → verify 404 Not Found
4. Rate limit exceeded → verify 429 Too Many Requests
5. Server error → verify 500 Internal Error (logged)
