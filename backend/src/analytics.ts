import { DurableObject } from "cloudflare:workers";

interface AnalyticsEvent {
  intent:
    | "GENERAL_QUESTION"
    | "SERVICE_INQUIRY"
    | "POTENTIAL_LEAD"
    | "HIGH_INTENT_LEAD"
    | "CONTACT_REQUEST"
    | "HUMAN_HANDOFF"
    | "UNSUPPORTED_REQUEST";

  service?: string;
  location?: string;
  property_type?: string;
}

interface AnalyticsTotals {
  totalMessages: number;
  potentialLeads: number;
  highIntentLeads: number;
  humanHandoffs: number;
  serviceInquiries: number;
  contactRequests: number;
  services: Record<string, number>;
  locations: Record<string, number>;
  property_types?: Record<string, number>;
}

export class Analytics extends DurableObject<Env> {
    async fetch(request: Request): Promise<Response> {
        if (request.method !== "POST") {
            return Response.json(
            { error: "Method not allowed." },
            { status: 405 }
            );
        }

        let event: AnalyticsEvent;

        try {
        event = (await request.json()) as AnalyticsEvent;
        } catch {
            return Response.json(
                { error: "Invalid JSON body." },
                { status: 400 }
            );
        }

        const validIntents: AnalyticsEvent["intent"][] = [
            "GENERAL_QUESTION",
            "SERVICE_INQUIRY",
            "POTENTIAL_LEAD",
            "HIGH_INTENT_LEAD",
            "CONTACT_REQUEST",
            "HUMAN_HANDOFF",
            "UNSUPPORTED_REQUEST",
        ];

        if (typeof event !== "object" ||
            event === null ||
            Array.isArray(event) ||
            !validIntents.includes(event.intent)) {
            return Response.json(
                { error: "Invalid analytics event." },
                { status: 400 }
            );
        }

        const optionalFields = [
            { name: "service", value: event.service, maxLength: 100 },
            { name: "location", value: event.location, maxLength: 100 },
            { name: "property_type", value: event.property_type, maxLength: 100 },
            ] as const;

        for (const field of optionalFields) {
            if (
                field.value !== undefined &&
                (typeof field.value !== "string" ||
                field.value.length > field.maxLength)
            ) {
                return Response.json(
                { error: `Invalid analytics field: ${field.name}.` },
                { status: 400 }
                );
            }
        }

        const totals =
            (await this.ctx.storage.get<AnalyticsTotals>("totals")) ?? {
                totalMessages: 0,
                potentialLeads: 0,
                highIntentLeads: 0,
                humanHandoffs: 0,
                serviceInquiries: 0,
                contactRequests: 0,
                services: {},
                locations: {},
                property_types: {}
            };

        totals.totalMessages += 1;

        if (event.service) {
            if (!totals.services) {
                totals.services = {};
            }

            totals.services[event.service] = (totals.services[event.service] ?? 0) + 1;
        }
        if (event.location) {
            if (!totals.locations) {
                totals.locations = {};
            }

            totals.locations[event.location] = (totals.locations[event.location] ?? 0) + 1;
        }
        if (event.property_type) {
            if (!totals.property_types) {
                totals.property_types = {};
        }

        totals.property_types[event.property_type] =
            (totals.property_types[event.property_type] ?? 0) + 1;
        }

        if (event.intent === "POTENTIAL_LEAD") {
            totals.potentialLeads += 1;
        }

        if (event.intent === "HIGH_INTENT_LEAD") {
            totals.highIntentLeads += 1;
        }

        if (event.intent === "HUMAN_HANDOFF") {
            totals.humanHandoffs += 1;
        }

        if (event.intent === "SERVICE_INQUIRY") {
            totals.serviceInquiries += 1;
        }

        if (event.intent === "CONTACT_REQUEST") {
            totals.contactRequests += 1;
        }

        await this.ctx.storage.put("totals", totals);

        return Response.json({ success: true });
    }
}