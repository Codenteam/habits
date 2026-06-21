/**
 * @ha-bits/bit-sumsub
 *
 * Sumsub identity verification (KYC/KYB) integration.
 * Enterprise bit — source lives in packages/manage/ee.
 */

import {
  buildVerificationUrl,
  getApplicantById,
  sumsubRequest,
  sumsubRequestApplicantCheck,
  sumsubUploadDocument,
  type SumsubAuth,
} from './driver';
import {
  normalizeSumsubWebhookEvent,
  shouldHandleSumsubWebhook,
  type SumsubWebhookPayload,
  type WebhookFilterPayload,
} from './webhook';

interface SumsubContext {
  auth?: SumsubAuth;
  propsValue: Record<string, unknown>;
  webhookPayload?: WebhookFilterPayload;
  payload?: SumsubWebhookPayload;
}

function requireAuth(auth?: SumsubAuth): SumsubAuth {
  if (!auth?.appToken || !auth?.secretKey) {
    throw new Error(
      'Sumsub credentials are required. Provide appToken and secretKey under credentials.sumsub.',
    );
  }
  return auth;
}

function asString(value: unknown, field: string): string {
  if (value === undefined || value === null || value === '') {
    throw new Error(`${field} is required`);
  }
  return String(value);
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  return String(value);
}

const sumsubBit = {
  id: 'sumsub',
  displayName: 'Sumsub',
  description: 'Sumsub identity verification and KYC/KYB checks',
  logoUrl: 'lucide:ShieldCheck',
  runtime: 'all' as const,

  auth: {
    type: 'CUSTOM_AUTH' as const,
    displayName: 'Sumsub API',
    description: 'Sumsub app token and secret key from the Dashboard Dev space',
    required: true,
    props: {
      appToken: {
        type: 'SECRET_TEXT' as const,
        displayName: 'App Token',
        description: 'X-App-Token value from Sumsub Dashboard → Dev space → App tokens',
        required: true,
      },
      secretKey: {
        type: 'SECRET_TEXT' as const,
        displayName: 'Secret Key',
        description: 'Secret key shown once when the app token was created',
        required: true,
      },
      baseUrl: {
        type: 'SHORT_TEXT' as const,
        displayName: 'API Base URL',
        description: 'Override only if Sumsub provides a custom API host (default: https://api.sumsub.com)',
        required: false,
        defaultValue: 'https://api.sumsub.com',
      },
    },
    validate: async ({ auth }: { auth: SumsubAuth }) => {
      try {
        await sumsubRequest({
          method: 'GET',
          path: '/resources/status/api',
          auth,
        });
        return { valid: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { valid: false, error: message };
      }
    },
  },

  actions: {
    createApplicant: {
      name: 'createApplicant',
      displayName: 'Create Applicant',
      description: 'Create a Sumsub applicant profile for identity verification',
      props: {
        externalUserId: {
          type: 'SHORT_TEXT',
          displayName: 'External User ID',
          description: 'Your unique applicant identifier (max 512 characters)',
          required: true,
        },
        levelName: {
          type: 'SHORT_TEXT',
          displayName: 'Verification Level',
          description: 'Verification level name from Sumsub Dashboard → Application levels',
          required: true,
        },
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          required: false,
        },
        phone: {
          type: 'SHORT_TEXT',
          displayName: 'Phone',
          required: false,
        },
        firstName: {
          type: 'SHORT_TEXT',
          displayName: 'First Name',
          required: false,
        },
        lastName: {
          type: 'SHORT_TEXT',
          displayName: 'Last Name',
          required: false,
        },
        country: {
          type: 'SHORT_TEXT',
          displayName: 'Country',
          description: 'ISO 3166-1 alpha-3 country code (e.g. GBR, USA, DEU)',
          required: false,
        },
        requiredDocuments: {
          type: 'SHORT_TEXT',
          displayName: 'Required Documents (informational)',
          description:
            'Document requirements are configured on the verification level in Sumsub. This field is echoed in the response for workflow convenience.',
          required: false,
        },
      },
      async run(context: SumsubContext) {
        const auth = requireAuth(context.auth);
        const externalUserId = asString(context.propsValue.externalUserId, 'externalUserId');
        const levelName = asString(context.propsValue.levelName, 'levelName');

        const body: Record<string, unknown> = { externalUserId };

        const email = optionalString(context.propsValue.email);
        const phone = optionalString(context.propsValue.phone);
        const firstName = optionalString(context.propsValue.firstName);
        const lastName = optionalString(context.propsValue.lastName);
        const country = optionalString(context.propsValue.country);

        if (email) body.email = email;
        if (phone) body.phone = phone;

        const info: Record<string, string> = {};
        if (firstName) info.firstName = firstName;
        if (lastName) info.lastName = lastName;
        if (country) info.country = country;
        if (Object.keys(info).length > 0) {
          body.info = info;
        }

        if (country) {
          body.fixedInfo = { country };
        }

        const applicant = await sumsubRequest<{
          id: string;
          externalUserId: string;
          email?: string;
        }>({
          method: 'POST',
          path: `/resources/applicants?levelName=${encodeURIComponent(levelName)}`,
          body,
          auth,
        });

        return {
          applicantId: applicant.id,
          externalUserId: applicant.externalUserId,
          email: applicant.email ?? email ?? null,
          levelName,
          requiredDocuments: optionalString(context.propsValue.requiredDocuments) ?? null,
        };
      },
    },

    createAccessToken: {
      name: 'createAccessToken',
      displayName: 'Create Access Token',
      description:
        'Generate a WebSDK/MobileSDK access token so the applicant can complete verification',
      props: {
        applicantId: {
          type: 'SHORT_TEXT',
          displayName: 'Applicant ID',
          description: 'Sumsub applicant ID returned by Create Applicant',
          required: false,
        },
        userId: {
          type: 'SHORT_TEXT',
          displayName: 'External User ID',
          description: 'Your externalUserId. If omitted, resolved from applicantId.',
          required: false,
        },
        levelName: {
          type: 'SHORT_TEXT',
          displayName: 'Verification Level',
          required: true,
        },
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          required: false,
        },
        phone: {
          type: 'SHORT_TEXT',
          displayName: 'Phone',
          required: false,
        },
        ttlInSecs: {
          type: 'NUMBER',
          displayName: 'Token TTL (seconds)',
          description: 'How long the access token remains valid (default 600)',
          required: false,
          defaultValue: 600,
        },
      },
      async run(context: SumsubContext) {
        const auth = requireAuth(context.auth);
        const levelName = asString(context.propsValue.levelName, 'levelName');
        let userId = optionalString(context.propsValue.userId);
        const applicantId = optionalString(context.propsValue.applicantId);

        if (!userId) {
          if (!applicantId) {
            throw new Error('Either userId or applicantId is required');
          }
          const applicant = await getApplicantById(auth, applicantId);
          userId = applicant.externalUserId;
        }

        const body: Record<string, unknown> = {
          userId,
          levelName,
        };

        const email = optionalString(context.propsValue.email);
        const phone = optionalString(context.propsValue.phone);
        if (email || phone) {
          body.applicantIdentifiers = {
            ...(email ? { email } : {}),
            ...(phone ? { phone } : {}),
          };
        }

        const ttl = context.propsValue.ttlInSecs;
        if (ttl !== undefined && ttl !== null && ttl !== '') {
          body.ttlInSecs = Number(ttl);
        }

        const result = await sumsubRequest<{ token: string; userId: string }>({
          method: 'POST',
          path: '/resources/accessTokens/sdk',
          body,
          auth,
        });

        return {
          token: result.token,
          userId: result.userId,
          applicantId: applicantId ?? null,
          levelName,
          verificationUrl: buildVerificationUrl(result.token, auth.baseUrl),
        };
      },
    },

    getApplicantStatus: {
      name: 'getApplicantStatus',
      displayName: 'Get Applicant Status',
      description: 'Fetch the current review status for a Sumsub applicant',
      props: {
        applicantId: {
          type: 'SHORT_TEXT',
          displayName: 'Applicant ID',
          description: 'Sumsub applicant ID',
          required: true,
        },
      },
      async run(context: SumsubContext) {
        const auth = requireAuth(context.auth);
        const applicantId = asString(context.propsValue.applicantId, 'applicantId');

        const review = await sumsubRequest<{
          reviewStatus: string;
          reviewResult?: {
            reviewAnswer?: string;
            moderationComment?: string;
            clientComment?: string;
            rejectLabels?: string[];
            reviewRejectType?: string;
          };
          levelName?: string;
          reviewId?: string;
        }>({
          method: 'GET',
          path: `/resources/applicants/${encodeURIComponent(applicantId)}/status`,
          auth,
        });

        const reviewAnswer = review.reviewResult?.reviewAnswer ?? null;
        const approved =
          review.reviewStatus === 'completed' && reviewAnswer === 'GREEN'
            ? true
            : review.reviewStatus === 'completed' && reviewAnswer === 'RED'
              ? false
              : null;

        return {
          applicantId,
          status: review.reviewStatus,
          reviewAnswer,
          approved,
          allowNextSteps: approved === true,
          blockNextSteps: approved === false,
          levelName: review.levelName ?? null,
          reviewId: review.reviewId ?? null,
          moderationComment: review.reviewResult?.moderationComment ?? null,
          clientComment: review.reviewResult?.clientComment ?? null,
          rejectLabels: review.reviewResult?.rejectLabels ?? [],
          reviewRejectType: review.reviewResult?.reviewRejectType ?? null,
          raw: review,
        };
      },
    },

    uploadIdDocument: {
      name: 'uploadIdDocument',
      displayName: 'Upload ID Document',
      description: 'Upload an identity document image (ID card, passport, etc.) for an applicant',
      props: {
        applicantId: { type: 'SHORT_TEXT', displayName: 'Applicant ID', required: true },
        country: {
          type: 'SHORT_TEXT',
          displayName: 'Issuing country',
          description: 'ISO 3166-1 alpha-3 code (e.g. GBR)',
          required: true,
        },
        contentBase64: {
          type: 'LONG_TEXT',
          displayName: 'Document image',
          description: 'Base64 or data-URL image from the UI file upload',
          required: true,
        },
        mimeType: { type: 'SHORT_TEXT', displayName: 'MIME type', required: false },
        fileName: { type: 'SHORT_TEXT', displayName: 'File name', required: false },
        idDocType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Document type',
          required: false,
          defaultValue: 'ID_CARD',
          options: {
            options: [
              { label: 'ID card', value: 'ID_CARD' },
              { label: 'Passport', value: 'PASSPORT' },
              { label: 'Residence permit', value: 'RESIDENCE_PERMIT' },
              { label: 'Driving licence', value: 'DRIVERS' },
            ],
          },
        },
        idDocSubType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Document side',
          required: false,
          defaultValue: 'FRONT_SIDE',
          options: {
            options: [
              { label: 'Front side', value: 'FRONT_SIDE' },
              { label: 'Back side', value: 'BACK_SIDE' },
            ],
          },
        },
      },
      async run(context: SumsubContext) {
        const auth = requireAuth(context.auth);
        const applicantId = asString(context.propsValue.applicantId, 'applicantId');
        const country = asString(context.propsValue.country, 'country');
        const contentBase64 = asString(context.propsValue.contentBase64, 'contentBase64');
        const idDocType = optionalString(context.propsValue.idDocType) || 'ID_CARD';
        const idDocSubType = optionalString(context.propsValue.idDocSubType) || 'FRONT_SIDE';

        const result = await sumsubUploadDocument(
          auth,
          applicantId,
          { idDocType, country, idDocSubType },
          contentBase64,
          optionalString(context.propsValue.mimeType),
          optionalString(context.propsValue.fileName),
        );

        return {
          document: 'id',
          ...result,
          success: (result.errors?.length ?? 0) === 0,
        };
      },
    },

    uploadSelfie: {
      name: 'uploadSelfie',
      displayName: 'Upload Selfie',
      description: 'Upload a selfie image for liveness / face match verification',
      props: {
        applicantId: { type: 'SHORT_TEXT', displayName: 'Applicant ID', required: true },
        country: {
          type: 'SHORT_TEXT',
          displayName: 'Country',
          description: 'ISO 3166-1 alpha-3 code (e.g. GBR)',
          required: true,
        },
        contentBase64: {
          type: 'LONG_TEXT',
          displayName: 'Selfie image',
          description: 'Base64 or data-URL image from the UI file upload',
          required: true,
        },
        mimeType: { type: 'SHORT_TEXT', displayName: 'MIME type', required: false },
        fileName: { type: 'SHORT_TEXT', displayName: 'File name', required: false },
      },
      async run(context: SumsubContext) {
        const auth = requireAuth(context.auth);
        const applicantId = asString(context.propsValue.applicantId, 'applicantId');
        const country = asString(context.propsValue.country, 'country');
        const contentBase64 = asString(context.propsValue.contentBase64, 'contentBase64');

        const result = await sumsubUploadDocument(
          auth,
          applicantId,
          { idDocType: 'SELFIE', country },
          contentBase64,
          optionalString(context.propsValue.mimeType),
          optionalString(context.propsValue.fileName),
        );

        return {
          document: 'selfie',
          ...result,
          success: (result.errors?.length ?? 0) === 0,
        };
      },
    },

    requestApplicantCheck: {
      name: 'requestApplicantCheck',
      displayName: 'Request Applicant Check',
      description:
        'Submit the applicant for Sumsub review after required documents are uploaded',
      props: {
        applicantId: { type: 'SHORT_TEXT', displayName: 'Applicant ID', required: true },
        reason: {
          type: 'SHORT_TEXT',
          displayName: 'Reason',
          description: 'Optional note sent to Sumsub when requesting review',
          required: false,
          defaultValue: 'Documents submitted via Habits',
        },
      },
      async run(context: SumsubContext) {
        const auth = requireAuth(context.auth);
        const applicantId = asString(context.propsValue.applicantId, 'applicantId');
        const reason = optionalString(context.propsValue.reason);

        return sumsubRequestApplicantCheck(auth, applicantId, reason);
      },
    },

    parseWebhookEvent: {
      name: 'parseWebhookEvent',
      displayName: 'Parse Sumsub Webhook',
      description: 'Normalize a Sumsub webhook payload into review fields and allowNextSteps flags',
      props: {
        payload: {
          type: 'JSON',
          displayName: 'Webhook payload',
          description: 'Raw Sumsub webhook JSON body',
          required: true,
        },
      },
      async run(context: SumsubContext) {
        let body = context.propsValue.payload as SumsubWebhookPayload;
        if (typeof body === 'string') {
          body = JSON.parse(body) as SumsubWebhookPayload;
        }
        if (!body?.type) {
          throw new Error('Webhook payload must include a type field');
        }
        return normalizeSumsubWebhookEvent(body);
      },
    },
  },

  triggers: {
    verificationWebhook: {
      name: 'verificationWebhook',
      displayName: 'Sumsub Verification Webhook',
      description:
        'Receives Sumsub applicant webhooks (review completed, pending, created, on hold)',
      type: 'WEBHOOK',
      props: {},
      filter(payload: WebhookFilterPayload): boolean {
        const secret = process.env.HABITS_SUMSUB_WEBHOOK_SECRET || undefined;
        return shouldHandleSumsubWebhook(payload, secret);
      },
      async run(context: SumsubContext) {
        const body =
          (context.webhookPayload?.body as SumsubWebhookPayload | undefined) ||
          (context.payload as SumsubWebhookPayload | undefined) ||
          (context.propsValue?.payload as SumsubWebhookPayload | undefined);
        if (!body) {
          return [];
        }
        return [normalizeSumsubWebhookEvent(body)];
      },
    },

    applicantReviewed: {
      name: 'applicantReviewed',
      displayName: 'Applicant Reviewed',
      description: 'Fires when Sumsub completes applicant review (GREEN or RED)',
      type: 'WEBHOOK',
      props: {},
      filter(payload: WebhookFilterPayload): boolean {
        const secret = process.env.HABITS_SUMSUB_WEBHOOK_SECRET || undefined;
        if (payload.body?.type !== 'applicantReviewed') {
          return false;
        }
        return shouldHandleSumsubWebhook(payload, secret);
      },
      async run(context: SumsubContext) {
        const body =
          (context.webhookPayload?.body as SumsubWebhookPayload | undefined) ||
          (context.payload as SumsubWebhookPayload | undefined);
        if (!body) {
          return [];
        }
        return [normalizeSumsubWebhookEvent(body)];
      },
    },
  },
};

export const sumsub = sumsubBit;
export default sumsubBit;
