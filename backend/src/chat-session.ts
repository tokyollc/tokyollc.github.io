
import { DurableObject } from "cloudflare:workers";
import { TOKYO_LLC_KNOWLEDGE } from "./knowledge";

type AIChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

async function runAIWithRetry(
  ai: Ai,
  model: string,
  input: Parameters<Ai["run"]>[1],
  maxAttempts = 2
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = (await ai.run(model, input)) as AIChatCompletion;

      const content =
        result.choices?.[0]?.message?.content;

      if (
        typeof content === "string" &&
        content.trim().length > 0
      ) {
        return result;
      }

      lastError = new Error(
        "Workers AI returned an empty response."
      );

      console.error(
        `Workers AI attempt ${attempt} returned an empty response.`
      );
    } catch (error) {
      lastError = error;

      console.error(
        `Workers AI attempt ${attempt} failed:`,
        error
      );
    }

    if (attempt < maxAttempts) {
      const delayMs = 300 * Math.pow(2, attempt - 1);

      await new Promise((resolve) =>
        setTimeout(resolve, delayMs)
      );
    }
  }

  throw lastError;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGES_PER_SESSION = 30;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface LeadInfo {
  intent:
    | "GENERAL_QUESTION"
    | "SERVICE_INQUIRY"
    | "POTENTIAL_LEAD"
    | "HIGH_INTENT_LEAD"
    | "CONTACT_REQUEST"
    | "HUMAN_HANDOFF"
    | "UNSUPPORTED_REQUEST";

  service?: string;
  need?: string;
  property_type?: string;
  location?: string;
  frequency?: string;
}

function mergeLeadInfo(
  previous: LeadInfo | undefined,
  current: LeadInfo | undefined
): LeadInfo | undefined {
  if (!previous && !current) {
    return undefined;
  }

  if (!previous) {
    return current;
  }

  if (!current) {
    return previous;
  }

  return {
    intent: current.intent || previous.intent,
    service: current.service || previous.service || "",
    need: current.need || previous.need || "",
    property_type:
      current.property_type || previous.property_type || "",
    location: current.location || previous.location || "",
    frequency: current.frequency || previous.frequency || "",
  };
}

interface ConversationSummary {
  summary: string;
}

interface ConversationAnalytics {
  totalMessages: number;
  potentialLeads: number;
  highIntentLeads: number;
  humanHandoffs: number;
  serviceInquiries: number;
}

interface SessionRequest {
  message?: string;
  action?: "chat" | "clear";
}

export class ChatSession extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed." },
        { status: 405 }
      );
    }

    let body: SessionRequest;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

   if (body.action === "clear") {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();

      return Response.json(
        { success: true },
        {
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json; charset=utf-8",
          },
        }
      );
    }

    if (typeof body.message !== "string" || !body.message.trim()) {
      return Response.json(
        { error: "A message is required." },
        { status: 400 }
      );
    }

    if (body.message.length > 4000) {
      return Response.json(
        { error: "Message is too long. Maximum is 4000 characters." },
        { status: 400 }
      );
    }

    const now = Date.now();
    const expiresAt = await this.ctx.storage.get<number>("expiresAt");

    if (expiresAt && now >= expiresAt) {
      await this.ctx.storage.deleteAll();
    }

    const userMessageCount =
    (await this.ctx.storage.get<number>("userMessageCount")) ?? 0;

    if (userMessageCount >= MAX_MESSAGES_PER_SESSION) {
      return Response.json(
        {
          error:
            "This conversation has reached its message limit. Please start a new conversation.",
        },
        { status: 429 },
      );
    }

    const history =
      (await this.ctx.storage.get<ChatMessage[]>("history")) ?? [];

    const leadInfo =
      (await this.ctx.storage.get<LeadInfo>("leadInfo")) ?? undefined;

    const conversationSummary =
      (await this.ctx.storage.get<ConversationSummary>("conversationSummary")) ??
      undefined;  

    const analytics =
    (await this.ctx.storage.get<ConversationAnalytics>("analytics")) ?? {
      totalMessages: 0,
      potentialLeads: 0,
      highIntentLeads: 0,
      humanHandoffs: 0,
      serviceInquiries: 0,
    };  

    try {
      const result = await runAIWithRetry(
        this.env.AI,
        "@cf/openai/gpt-oss-20b",
        {
          messages: [
            {
              role: "system",
              content: `${TOKYO_LLC_KNOWLEDGE}

                        LEAD DETECTION

                        Return the customer-facing answer first.

                        After the answer, add a separate internal data section using exactly these markers:

                        ---LEAD_DATA---
                        {"intent":"GENERAL_QUESTION","service":"","need":"","property_type":"","location":"","frequency":""}
                        ---END_LEAD_DATA---

                        ---SUMMARY---
                        Customer has not provided any meaningful information yet.
                        ---END_SUMMARY---

                        Rules:
                        - The text before ---LEAD_DATA--- is the customer-facing answer.
                        - Never mention lead detection or internal data to the customer.
                        - Never mention the conversation summary or internal summary data to the customer.
                        - The summary must be concise and describe only information relevant to the customer's request.
                        - When a specific service need has been identified, include that need in the summary.
                        - Preserve important information established earlier in the conversation.
                        - Update the summary when the visitor provides new or corrected information.
                        - Do not invent information.
                        - The lead data must be valid JSON on a single line.
                        Valid intent values are:
                          GENERAL_QUESTION
                          SERVICE_INQUIRY
                          POTENTIAL_LEAD
                          HIGH_INTENT_LEAD
                          CONTACT_REQUEST
                          HUMAN_HANDOFF
                          UNSUPPORTED_REQUEST
                          
                        Intent classification rules:

                        - GENERAL_QUESTION:
                          The visitor is asking a general informational question and has not
                          expressed a specific service need.

                        - SERVICE_INQUIRY:
                          The visitor is asking whether Tokyo LLC offers a particular service
                          or is asking general questions about a service without expressing a
                          concrete need for their own property.

                        - POTENTIAL_LEAD:
                          The visitor has expressed a concrete service need for a specific
                          property, even if some information such as location or frequency
                          is still missing.

                          Examples:
                          - "Our office needs pressure washing."
                          - "I need cleaning for my retail store."
                          - "Our rental property needs some repairs."
                          - "We need the office cleaned three times a week."

                          A specific service need should normally be classified as
                          POTENTIAL_LEAD rather than SERVICE_INQUIRY.

                        - HIGH_INTENT_LEAD:
                          The visitor clearly expresses an intention to move forward, request
                          pricing, request scheduling, book a service, or take another
                          concrete next step with Tokyo LLC.

                        - CONTACT_REQUEST:
                          The visitor specifically asks for Tokyo LLC's phone number, email,
                          website, or other contact information.

                        - HUMAN_HANDOFF:
                          The visitor explicitly wants to speak with, talk to, or be contacted
                          by a human representative, employee, manager, or someone from
                          Tokyo LLC.

                          Examples:
                          - "Can I speak with someone?"
                          - "I want to talk to a person."
                          - "Can someone from the company contact me?"
                          - "I'd like to speak with a representative."
                          - "I need to talk to someone at Tokyo LLC."

                        - UNSUPPORTED_REQUEST:
                          The visitor is requesting a service or information that Tokyo LLC
                          does not currently list or that the assistant cannot appropriately
                          answer.

                        - When multiple categories could apply, use the highest applicable
                          intent.

                          A direct request for contact information such as a phone number,
                          email address, or website should be classified as CONTACT_REQUEST.

                          A request to speak with, talk to, or be contacted by a human
                          representative should be classified as HUMAN_HANDOFF.

                        Do not classify a visitor as a POTENTIAL_LEAD or HIGH_INTENT_LEAD based
                        only on a general question.
                        - Only record information explicitly stated or clearly established in the conversation.
                        - The "need" field should briefly describe the customer's specific service need in natural language.
                        - Keep the need specific but concise.
                        - Use information explicitly stated or clearly established by the visitor.
                        - Do not invent tasks, requirements, equipment, or procedures.
                        - Use an empty string when the customer's specific need is unclear.
                        - Preserve information established earlier in the conversation.
                        - Use an empty string when information is unknown.
                        - Do not invent information.
                        
                        Valid service values are:
                        - Office Cleaning
                        - Commercial Cleaning
                        - Deep Cleaning
                        - Property Maintenance
                        - Outdoor Services
                        - Commercial Services
                        - Specialty Services
                        - ""

                        Rules for service:
                        - Use the most specific applicable Tokyo LLC service.
                        - Use "Office Cleaning" for office cleaning requests.
                        - Use "Commercial Cleaning" for general commercial cleaning requests.
                        - Use "Deep Cleaning" for intensive or one-time cleaning requests.
                        - Use "Property Maintenance" for repairs, upkeep, or improvements.
                        - Use "Outdoor Services" for yard cleanup, pressure washing, or exterior maintenance.
                        - Use "Commercial Services" for broader office, retail, rental property, or facility support.
                        - Use "Specialty Services" for project-based, cleanup, hauling coordination, or unusual requests.
                        - Use an empty string if no listed service applies or the service is unclear.
                        - Never invent a service that is not listed above.

                        CURRENT CONVERSATION SUMMARY

                        ${conversationSummary?.summary || "No conversation summary exists yet."}

                        Use this summary as additional context for the current conversation.
                        Preserve information from the summary unless the visitor provides
                        new information that changes it.
                        
                        `,
            },
            ...history,
            {
              role: "user",
              content: body.message.trim(),
            },
          ],
          max_tokens: 700,
          temperature: 0.6,
          // Less internal "thinking" before answering: faster replies, and
          // fewer empty responses from thinking using up max_tokens.
          reasoning_effort: "low",
        }
      ) as AIChatCompletion ;

      const rawResponse =
        result.choices?.[0]?.message?.content ?? "";

      let answer = rawResponse;
      let detectedLeadInfo: LeadInfo | undefined;

      const leadStart = rawResponse.indexOf("---LEAD_DATA---");
      const leadEnd = rawResponse.indexOf("---END_LEAD_DATA---");

      if (leadStart !== -1 && leadEnd !== -1 && leadEnd > leadStart) {
        answer = rawResponse
          .slice(0, leadStart)
          .trim();

        const leadJson = rawResponse
          .slice(
            leadStart + "---LEAD_DATA---".length,
            leadEnd
          )
          .trim();

        try {
          const parsed = JSON.parse(leadJson);

          if (parsed && typeof parsed === "object") {
            detectedLeadInfo = parsed as LeadInfo;
          }
        } catch {
          console.error("Could not parse lead information.");
        }
      }

      const summaryStart = rawResponse.indexOf("---SUMMARY---");
      const summaryEnd = rawResponse.indexOf("---END_SUMMARY---");

      let detectedSummary: ConversationSummary | undefined;

      if (
        summaryStart !== -1 &&
        summaryEnd !== -1 &&
        summaryEnd > summaryStart
      ) {
        const summaryText = rawResponse
          .slice(
            summaryStart + "---SUMMARY---".length,
            summaryEnd
          )
          .trim();

        if (summaryText) {
          detectedSummary = {
            summary: summaryText,
          };
        }

        answer = answer
          .replace(
            rawResponse.slice(summaryStart, summaryEnd + "---END_SUMMARY---".length),
            ""
          )
          .trim();
      }

      const updatedAnalytics: ConversationAnalytics = {
        totalMessages: analytics.totalMessages + 1,
        potentialLeads:
          analytics.potentialLeads +
          (detectedLeadInfo?.intent === "POTENTIAL_LEAD" ? 1 : 0),
        highIntentLeads:
          analytics.highIntentLeads +
          (detectedLeadInfo?.intent === "HIGH_INTENT_LEAD" ? 1 : 0),
        humanHandoffs:
          analytics.humanHandoffs +
          (detectedLeadInfo?.intent === "HUMAN_HANDOFF" ? 1 : 0),
        serviceInquiries:
          analytics.serviceInquiries +
          (detectedLeadInfo?.intent === "SERVICE_INQUIRY" ? 1 : 0),
      };

      const updatedHistory = [
        ...history,
        { role: "user" as const, content: body.message.trim() },
        { role: "assistant" as const, content: answer },
      ].slice(-MAX_HISTORY_MESSAGES);

      const newExpiresAt = Date.now() + SESSION_TIMEOUT_MS;

      await this.ctx.storage.put({
        history: updatedHistory,
        userMessageCount: userMessageCount + 1,
        expiresAt: newExpiresAt,
        leadInfo: mergeLeadInfo(leadInfo, detectedLeadInfo),
        conversationSummary: detectedSummary ?? conversationSummary,
        analytics: updatedAnalytics,
      });

      try {
        if (detectedLeadInfo?.intent) {
          const analyticsId = this.env.ANALYTICS.idFromName("global");

          const analytics = this.env.ANALYTICS.get(analyticsId);

          await analytics.fetch("https://analytics.internal/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              intent: detectedLeadInfo.intent,
              service: detectedLeadInfo.service,
              location: detectedLeadInfo.location,
              property_type: detectedLeadInfo.property_type,
            }),
          });
        }
      } catch (error) {
        console.error("Analytics error:", error);
      }

      await this.ctx.storage.setAlarm(newExpiresAt);

      return Response.json({ response: answer });
    } catch (error) {
      console.error("Chat session AI error:", error);

      return Response.json(
        { error: "The AI service could not process the request." },
        { status: 500 }
      );
    }
  }

  async alarm(): Promise<void> {
    const expiresAt =
      await this.ctx.storage.get<number>("expiresAt");

    if (expiresAt && Date.now() < expiresAt) {
      await this.ctx.storage.setAlarm(expiresAt);
      return;
    }

    await this.ctx.storage.deleteAll();
  }
}