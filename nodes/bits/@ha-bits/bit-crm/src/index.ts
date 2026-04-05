/**
 * @ha-bits/bit-crm
 * 
 * L0 (Level 0) base bit for CRM integrations.
 * 
 * This bit defines common interfaces, types, and in-memory stub implementations
 * for CRM operations. It should be replaced by concrete implementations:
 * - @ha-bits/bit-hubspot: HubSpot CRM
 * - @ha-bits/bit-salesforce: Salesforce CRM
 * - @ha-bits/bit-gohighlevel: GoHighLevel CRM
 * 
 * Level: L0 (Abstract base, provides in-memory demo implementation)
 */

// ============================================================================
// Common Types & Interfaces - exported for child bits to implement
// ============================================================================

export interface CRMContext {
  auth?: {
    apiKey?: string;
    baseUrl?: string;
    accessToken?: string;
    refreshToken?: string;
  };
  propsValue: Record<string, any>;
}

export interface Lead {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  status?: string;
  score?: number;
  source?: string;
  assignedTo?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Contact {
  id?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Deal {
  id?: string;
  name: string;
  amount?: number;
  currency?: string;
  stage?: string;
  probability?: number;
  closeDate?: string;
  contactId?: string;
  companyId?: string;
  ownerId?: string;
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Opportunity {
  id?: string;
  name: string;
  value?: number;
  stage?: string;
  status?: string;
  contactId?: string;
  pipelineId?: string;
  assignedTo?: string;
  customFields?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

// ---- Result Types ----
export interface CreateLeadResult {
  success: boolean;
  lead: Lead;
  message?: string;
}

export interface GetLeadResult {
  found: boolean;
  lead: Lead | null;
}

export interface UpdateLeadResult {
  success: boolean;
  lead: Lead;
}

export interface ListLeadsResult {
  leads: Lead[];
  count: number;
  nextPage?: string;
}

export interface CreateContactResult {
  success: boolean;
  contact: Contact;
  message?: string;
}

export interface GetContactResult {
  found: boolean;
  contact: Contact | null;
}

export interface UpdateContactResult {
  success: boolean;
  contact: Contact;
}

export interface ListContactsResult {
  contacts: Contact[];
  count: number;
  nextPage?: string;
}

export interface CreateDealResult {
  success: boolean;
  deal: Deal;
  message?: string;
}

export interface UpdateDealResult {
  success: boolean;
  deal: Deal;
}

export interface CreateOpportunityResult {
  success: boolean;
  opportunity: Opportunity;
  message?: string;
}

export interface AddTagResult {
  success: boolean;
  tags: string[];
  message?: string;
}

export interface CreateNoteResult {
  success: boolean;
  noteId: string;
  message?: string;
}

// In-memory storage for demo (would connect to actual CRM in production)
const leadStore = new Map<string, Lead>();
const contactStore = new Map<string, Contact>();
const dealStore = new Map<string, Deal>();
const opportunityStore = new Map<string, Opportunity>();

/**
 * Make a CRM API request (generic)
 */
async function crmApiRequest(
  baseUrl: string,
  endpoint: string,
  method: string,
  apiKey: string,
  body?: any
): Promise<any> {
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  
  const options: RequestInit = {
    method,
    headers,
  };
  
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`CRM API Error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

const crmBit = {
  displayName: 'CRM (Base)',
  description: 'L0 CRM base bit - in-memory demo. Replace with HubSpot, Salesforce, or GoHighLevel.',
  logoUrl: 'lucide:Users',
  runtime: 'all',
  
  /**
   * Declares which bits can replace this one.
   * These bits implement the same interface but with actual CRM backends.
   */
  replaceableBy: [
    '@ha-bits/bit-hubspot',
    '@ha-bits/bit-salesforce',
    '@ha-bits/bit-gohighlevel',
  ],
  
  auth: {
    type: 'CUSTOM',
    displayName: 'CRM Credentials',
    description: 'CRM API credentials',
    required: false,
    props: {
      apiKey: { type: 'SECRET_TEXT', displayName: 'API Key', required: true },
      baseUrl: { type: 'SHORT_TEXT', displayName: 'API Base URL', required: true },
    }
  },
  
  actions: {
    /**
     * Create a new lead
     */
    createLead: {
      name: 'createLead',
      displayName: 'Create Lead',
      description: 'Create a new lead in the CRM',
      props: {
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Lead email address',
          required: true,
        },
        firstName: {
          type: 'SHORT_TEXT',
          displayName: 'First Name',
          description: 'Lead first name',
          required: false,
        },
        lastName: {
          type: 'SHORT_TEXT',
          displayName: 'Last Name',
          description: 'Lead last name',
          required: false,
        },
        company: {
          type: 'SHORT_TEXT',
          displayName: 'Company',
          description: 'Lead company name',
          required: false,
        },
        phone: {
          type: 'SHORT_TEXT',
          displayName: 'Phone',
          description: 'Lead phone number',
          required: false,
        },
        source: {
          type: 'SHORT_TEXT',
          displayName: 'Source',
          description: 'Lead source (e.g., website, referral)',
          required: false,
        },
        status: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Status',
          description: 'Lead status',
          required: false,
          defaultValue: 'new',
          options: {
            options: [
              { label: 'New', value: 'new' },
              { label: 'Contacted', value: 'contacted' },
              { label: 'Qualified', value: 'qualified' },
              { label: 'Unqualified', value: 'unqualified' },
              { label: 'Converted', value: 'converted' },
            ],
          },
        },
        customFields: {
          type: 'JSON',
          displayName: 'Custom Fields',
          description: 'Additional custom fields as JSON',
          required: false,
          defaultValue: '{}',
        },
      },
      async run(context: CRMContext) {
        const { email, firstName, lastName, company, phone, source, status = 'new', customFields } = context.propsValue;
        
        if (!email) {
          throw new Error('Email is required');
        }
        
        const id = `lead_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        let custom = customFields;
        if (typeof customFields === 'string') {
          try {
            custom = JSON.parse(customFields);
          } catch {
            custom = {};
          }
        }
        
        const lead: Lead = {
          id,
          email,
          firstName,
          lastName,
          company,
          phone,
          source,
          status,
          score: 0,
          customFields: custom,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        leadStore.set(id, lead);
        
        console.log(`📊 CRM: Created lead ${id} - ${email}`);
        
        return {
          success: true,
          lead,
        };
      },
    },
    
    /**
     * Get a lead by ID or email
     */
    getLead: {
      name: 'getLead',
      displayName: 'Get Lead',
      description: 'Get a lead by ID or email',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          description: 'Lead ID (optional if email provided)',
          required: false,
        },
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Lead email (optional if ID provided)',
          required: false,
        },
      },
      async run(context: CRMContext) {
        const { leadId, email } = context.propsValue;
        
        let lead: Lead | undefined;
        
        if (leadId) {
          lead = leadStore.get(leadId);
        } else if (email) {
          lead = Array.from(leadStore.values()).find(l => l.email === email);
        }
        
        if (!lead) {
          console.log(`📊 CRM: Lead not found`);
          return { found: false, lead: null };
        }
        
        console.log(`📊 CRM: Found lead ${lead.id}`);
        
        return {
          found: true,
          lead,
        };
      },
    },
    
    /**
     * Update a lead
     */
    updateLead: {
      name: 'updateLead',
      displayName: 'Update Lead',
      description: 'Update an existing lead',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          description: 'Lead ID to update',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Fields to update as JSON',
          required: true,
        },
      },
      async run(context: CRMContext) {
        const { leadId, updates } = context.propsValue;
        
        const lead = leadStore.get(leadId);
        if (!lead) {
          throw new Error(`Lead ${leadId} not found`);
        }
        
        let updateData = updates;
        if (typeof updates === 'string') {
          updateData = JSON.parse(updates);
        }
        
        const updatedLead = {
          ...lead,
          ...updateData,
          id: lead.id, // Preserve ID
          updatedAt: new Date().toISOString(),
        };
        
        leadStore.set(leadId, updatedLead);
        
        console.log(`📊 CRM: Updated lead ${leadId}`);
        
        return {
          success: true,
          lead: updatedLead,
        };
      },
    },
    
    /**
     * Score a lead
     */
    scoreLead: {
      name: 'scoreLead',
      displayName: 'Score Lead',
      description: 'Calculate and update lead score based on criteria',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          description: 'Lead to score',
          required: true,
        },
        criteria: {
          type: 'JSON',
          displayName: 'Scoring Criteria',
          description: 'Scoring rules as JSON. Format: [{"field": "company", "hasValue": true, "points": 10}]',
          required: true,
        },
      },
      async run(context: CRMContext) {
        const { leadId, criteria } = context.propsValue;
        
        const lead = leadStore.get(leadId);
        if (!lead) {
          throw new Error(`Lead ${leadId} not found`);
        }
        
        let rules = criteria;
        if (typeof criteria === 'string') {
          rules = JSON.parse(criteria);
        }
        
        let score = 0;
        const appliedRules: any[] = [];
        
        for (const rule of rules) {
          const { field, hasValue, equals, contains, points } = rule;
          const value = (lead as any)[field] || lead.customFields?.[field];
          
          let match = false;
          if (hasValue !== undefined) {
            match = hasValue ? !!value : !value;
          } else if (equals !== undefined) {
            match = value === equals;
          } else if (contains !== undefined && typeof value === 'string') {
            match = value.toLowerCase().includes(String(contains).toLowerCase());
          }
          
          if (match) {
            score += Number(points) || 0;
            appliedRules.push({ ...rule, matched: true });
          }
        }
        
        lead.score = score;
        lead.updatedAt = new Date().toISOString();
        leadStore.set(leadId, lead);
        
        console.log(`📊 CRM: Scored lead ${leadId} = ${score}`);
        
        return {
          leadId,
          score,
          appliedRules,
          lead,
        };
      },
    },
    
    /**
     * Assign lead to a user
     */
    assignLead: {
      name: 'assignLead',
      displayName: 'Assign Lead',
      description: 'Assign a lead to a team member',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          description: 'Lead to assign',
          required: true,
        },
        assigneeId: {
          type: 'SHORT_TEXT',
          displayName: 'Assignee ID/Email',
          description: 'Team member to assign to',
          required: true,
        },
      },
      async run(context: CRMContext) {
        const { leadId, assigneeId } = context.propsValue;
        
        const lead = leadStore.get(leadId);
        if (!lead) {
          throw new Error(`Lead ${leadId} not found`);
        }
        
        lead.assignedTo = assigneeId;
        lead.updatedAt = new Date().toISOString();
        leadStore.set(leadId, lead);
        
        console.log(`📊 CRM: Assigned lead ${leadId} to ${assigneeId}`);
        
        return {
          success: true,
          leadId,
          assignedTo: assigneeId,
          lead,
        };
      },
    },
    
    /**
     * Create a contact
     */
    createContact: {
      name: 'createContact',
      displayName: 'Create Contact',
      description: 'Create a new contact in the CRM',
      props: {
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Contact email address',
          required: true,
        },
        firstName: {
          type: 'SHORT_TEXT',
          displayName: 'First Name',
          description: 'Contact first name',
          required: false,
        },
        lastName: {
          type: 'SHORT_TEXT',
          displayName: 'Last Name',
          description: 'Contact last name',
          required: false,
        },
        company: {
          type: 'SHORT_TEXT',
          displayName: 'Company',
          description: 'Contact company',
          required: false,
        },
        phone: {
          type: 'SHORT_TEXT',
          displayName: 'Phone',
          description: 'Contact phone',
          required: false,
        },
        notes: {
          type: 'LONG_TEXT',
          displayName: 'Notes',
          description: 'Contact notes',
          required: false,
        },
      },
      async run(context: CRMContext) {
        const { email, firstName, lastName, company, phone, notes } = context.propsValue;
        
        const id = `contact_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        const contact: Contact = {
          id,
          email,
          firstName,
          lastName,
          company,
          phone,
          notes,
          createdAt: new Date().toISOString(),
        };
        
        contactStore.set(id, contact);
        
        console.log(`📊 CRM: Created contact ${id} - ${email}`);
        
        return {
          success: true,
          contact,
        };
      },
    },
    
    /**
     * Fetch customer/contact history
     */
    getHistory: {
      name: 'getHistory',
      displayName: 'Get Customer History',
      description: 'Fetch interaction history for a customer',
      props: {
        customerId: {
          type: 'SHORT_TEXT',
          displayName: 'Customer ID',
          description: 'Customer/contact ID',
          required: false,
        },
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Customer email',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum history entries',
          required: false,
          defaultValue: 10,
        },
      },
      async run(context: CRMContext) {
        const { customerId, email, limit = 10 } = context.propsValue;
        
        // In production, this would fetch actual history
        // For demo, return simulated history structure
        
        console.log(`📊 CRM: Fetched history for ${customerId || email}`);
        
        return {
          customerId: customerId || email,
          history: [],
          interactions: 0,
          lastContact: null,
          summary: 'No history available (demo mode)',
        };
      },
    },
    
    /**
     * Enrich lead/contact data
     */
    enrichLead: {
      name: 'enrichLead',
      displayName: 'Enrich Lead',
      description: 'Add enrichment data to a lead',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          description: 'Lead to enrich',
          required: true,
        },
        enrichmentData: {
          type: 'JSON',
          displayName: 'Enrichment Data',
          description: 'Enrichment data to add (JSON)',
          required: true,
        },
      },
      async run(context: CRMContext) {
        const { leadId, enrichmentData } = context.propsValue;
        
        const lead = leadStore.get(leadId);
        if (!lead) {
          throw new Error(`Lead ${leadId} not found`);
        }
        
        let data = enrichmentData;
        if (typeof enrichmentData === 'string') {
          data = JSON.parse(enrichmentData);
        }
        
        lead.customFields = {
          ...lead.customFields,
          enrichment: data,
          enrichedAt: new Date().toISOString(),
        };
        lead.updatedAt = new Date().toISOString();
        
        leadStore.set(leadId, lead);
        
        console.log(`📊 CRM: Enriched lead ${leadId}`);
        
        return {
          success: true,
          lead,
        };
      },
    },
    
    /**
     * List leads with filters
     */
    listLeads: {
      name: 'listLeads',
      displayName: 'List Leads',
      description: 'List leads with optional filters',
      props: {
        status: {
          type: 'SHORT_TEXT',
          displayName: 'Status Filter',
          description: 'Filter by status',
          required: false,
        },
        assignedTo: {
          type: 'SHORT_TEXT',
          displayName: 'Assigned To',
          description: 'Filter by assignee',
          required: false,
        },
        minScore: {
          type: 'NUMBER',
          displayName: 'Minimum Score',
          description: 'Filter by minimum score',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum results',
          required: false,
          defaultValue: 50,
        },
      },
      async run(context: CRMContext) {
        const { status, assignedTo, minScore, limit = 50 } = context.propsValue;
        
        let leads = Array.from(leadStore.values());
        
        if (status) {
          leads = leads.filter(l => l.status === status);
        }
        
        if (assignedTo) {
          leads = leads.filter(l => l.assignedTo === assignedTo);
        }
        
        if (minScore !== undefined) {
          leads = leads.filter(l => (l.score || 0) >= Number(minScore));
        }
        
        leads = leads.slice(0, Number(limit));
        
        console.log(`📊 CRM: Listed ${leads.length} leads`);
        
        return {
          leads,
          count: leads.length,
        };
      },
    },

    /**
     * Create a deal/opportunity
     */
    createDeal: {
      name: 'createDeal',
      displayName: 'Create Deal',
      description: 'Create a new deal in the CRM',
      props: {
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Deal Name',
          description: 'Name of the deal',
          required: true,
        },
        amount: {
          type: 'NUMBER',
          displayName: 'Amount',
          description: 'Deal value',
          required: false,
        },
        currency: {
          type: 'SHORT_TEXT',
          displayName: 'Currency',
          description: 'Currency code (e.g., USD)',
          required: false,
          defaultValue: 'USD',
        },
        stage: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Stage',
          description: 'Deal stage',
          required: false,
          defaultValue: 'new',
          options: {
            options: [
              { label: 'New', value: 'new' },
              { label: 'Qualified', value: 'qualified' },
              { label: 'Proposal', value: 'proposal' },
              { label: 'Negotiation', value: 'negotiation' },
              { label: 'Won', value: 'won' },
              { label: 'Lost', value: 'lost' },
            ],
          },
        },
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          description: 'Associated contact ID',
          required: false,
        },
        closeDate: {
          type: 'SHORT_TEXT',
          displayName: 'Close Date',
          description: 'Expected close date (ISO format)',
          required: false,
        },
      },
      async run(context: CRMContext): Promise<CreateDealResult> {
        const { name, amount, currency = 'USD', stage = 'new', contactId, closeDate } = context.propsValue;
        
        const id = `deal_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        const deal: Deal = {
          id,
          name,
          amount: amount ? Number(amount) : undefined,
          currency,
          stage,
          contactId,
          closeDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        dealStore.set(id, deal);
        
        console.log(`📊 CRM: Created deal ${id} - ${name}`);
        
        return {
          success: true,
          deal,
        };
      },
    },

    /**
     * Update a deal
     */
    updateDeal: {
      name: 'updateDeal',
      displayName: 'Update Deal',
      description: 'Update an existing deal',
      props: {
        dealId: {
          type: 'SHORT_TEXT',
          displayName: 'Deal ID',
          description: 'Deal ID to update',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Fields to update as JSON',
          required: true,
        },
      },
      async run(context: CRMContext): Promise<UpdateDealResult> {
        const { dealId, updates } = context.propsValue;
        
        const deal = dealStore.get(dealId);
        if (!deal) {
          throw new Error(`Deal ${dealId} not found`);
        }
        
        let updateData = updates;
        if (typeof updates === 'string') {
          updateData = JSON.parse(updates);
        }
        
        const updatedDeal = {
          ...deal,
          ...updateData,
          id: deal.id,
          updatedAt: new Date().toISOString(),
        };
        
        dealStore.set(dealId, updatedDeal);
        
        console.log(`📊 CRM: Updated deal ${dealId}`);
        
        return {
          success: true,
          deal: updatedDeal,
        };
      },
    },

    /**
     * List contacts
     */
    listContacts: {
      name: 'listContacts',
      displayName: 'List Contacts',
      description: 'List contacts with optional filters',
      props: {
        query: {
          type: 'SHORT_TEXT',
          displayName: 'Search Query',
          description: 'Search by name or email',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum results',
          required: false,
          defaultValue: 50,
        },
      },
      async run(context: CRMContext): Promise<ListContactsResult> {
        const { query, limit = 50 } = context.propsValue;
        
        let contacts = Array.from(contactStore.values());
        
        if (query) {
          const q = String(query).toLowerCase();
          contacts = contacts.filter(c => 
            c.email?.toLowerCase().includes(q) ||
            c.firstName?.toLowerCase().includes(q) ||
            c.lastName?.toLowerCase().includes(q) ||
            c.company?.toLowerCase().includes(q)
          );
        }
        
        contacts = contacts.slice(0, Number(limit));
        
        console.log(`📊 CRM: Listed ${contacts.length} contacts`);
        
        return {
          contacts,
          count: contacts.length,
        };
      },
    },

    /**
     * Get a contact by ID or email
     */
    getContact: {
      name: 'getContact',
      displayName: 'Get Contact',
      description: 'Get a contact by ID or email',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          description: 'Contact ID (optional if email provided)',
          required: false,
        },
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Contact email (optional if ID provided)',
          required: false,
        },
      },
      async run(context: CRMContext): Promise<GetContactResult> {
        const { contactId, email } = context.propsValue;
        
        let contact: Contact | undefined;
        
        if (contactId) {
          contact = contactStore.get(contactId);
        } else if (email) {
          contact = Array.from(contactStore.values()).find(c => c.email === email);
        }
        
        if (!contact) {
          console.log(`📊 CRM: Contact not found`);
          return { found: false, contact: null };
        }
        
        console.log(`📊 CRM: Found contact ${contact.id}`);
        
        return {
          found: true,
          contact,
        };
      },
    },

    /**
     * Update a contact
     */
    updateContact: {
      name: 'updateContact',
      displayName: 'Update Contact',
      description: 'Update an existing contact',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          description: 'Contact ID to update',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Fields to update as JSON',
          required: true,
        },
      },
      async run(context: CRMContext): Promise<UpdateContactResult> {
        const { contactId, updates } = context.propsValue;
        
        const contact = contactStore.get(contactId);
        if (!contact) {
          throw new Error(`Contact ${contactId} not found`);
        }
        
        let updateData = updates;
        if (typeof updates === 'string') {
          updateData = JSON.parse(updates);
        }
        
        const updatedContact = {
          ...contact,
          ...updateData,
          id: contact.id,
          updatedAt: new Date().toISOString(),
        };
        
        contactStore.set(contactId, updatedContact);
        
        console.log(`📊 CRM: Updated contact ${contactId}`);
        
        return {
          success: true,
          contact: updatedContact,
        };
      },
    },

    /**
     * Add tags to a contact or lead
     */
    addTag: {
      name: 'addTag',
      displayName: 'Add Tag',
      description: 'Add tags to a contact or lead',
      props: {
        entityType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Entity Type',
          description: 'Type of entity to tag',
          required: true,
          options: {
            options: [
              { label: 'Lead', value: 'lead' },
              { label: 'Contact', value: 'contact' },
            ],
          },
        },
        entityId: {
          type: 'SHORT_TEXT',
          displayName: 'Entity ID',
          description: 'ID of the lead or contact',
          required: true,
        },
        tags: {
          type: 'JSON',
          displayName: 'Tags',
          description: 'Tags to add (array of strings)',
          required: true,
        },
      },
      async run(context: CRMContext): Promise<AddTagResult> {
        const { entityType, entityId, tags } = context.propsValue;
        
        let parsedTags = tags;
        if (typeof tags === 'string') {
          parsedTags = JSON.parse(tags);
        }
        
        if (entityType === 'lead') {
          const lead = leadStore.get(entityId);
          if (!lead) throw new Error(`Lead ${entityId} not found`);
          
          lead.tags = [...new Set([...(lead.tags || []), ...parsedTags])];
          lead.updatedAt = new Date().toISOString();
          leadStore.set(entityId, lead);
          
          console.log(`📊 CRM: Added tags to lead ${entityId}`);
          return { success: true, tags: lead.tags };
        } else {
          const contact = contactStore.get(entityId);
          if (!contact) throw new Error(`Contact ${entityId} not found`);
          
          contact.tags = [...new Set([...(contact.tags || []), ...parsedTags])];
          contact.updatedAt = new Date().toISOString();
          contactStore.set(entityId, contact);
          
          console.log(`📊 CRM: Added tags to contact ${entityId}`);
          return { success: true, tags: contact.tags };
        }
      },
    },

    /**
     * Create a note on a contact or deal
     */
    createNote: {
      name: 'createNote',
      displayName: 'Create Note',
      description: 'Add a note to a contact or deal',
      props: {
        entityType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Entity Type',
          description: 'Type of entity',
          required: true,
          options: {
            options: [
              { label: 'Contact', value: 'contact' },
              { label: 'Deal', value: 'deal' },
              { label: 'Lead', value: 'lead' },
            ],
          },
        },
        entityId: {
          type: 'SHORT_TEXT',
          displayName: 'Entity ID',
          description: 'ID of the entity',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Note Content',
          description: 'Content of the note',
          required: true,
        },
      },
      async run(context: CRMContext): Promise<CreateNoteResult> {
        const { entityType, entityId, content } = context.propsValue;
        
        const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // In production, this would save to the CRM's notes system
        // For demo, we add to customFields
        const note = {
          id: noteId,
          content,
          createdAt: new Date().toISOString(),
        };
        
        if (entityType === 'contact') {
          const contact = contactStore.get(entityId);
          if (!contact) throw new Error(`Contact ${entityId} not found`);
          contact.customFields = { ...contact.customFields, notes: [...(contact.customFields?.notes || []), note] };
          contactStore.set(entityId, contact);
        } else if (entityType === 'lead') {
          const lead = leadStore.get(entityId);
          if (!lead) throw new Error(`Lead ${entityId} not found`);
          lead.customFields = { ...lead.customFields, notes: [...(lead.customFields?.notes || []), note] };
          leadStore.set(entityId, lead);
        } else if (entityType === 'deal') {
          const deal = dealStore.get(entityId);
          if (!deal) throw new Error(`Deal ${entityId} not found`);
          deal.customFields = { ...deal.customFields, notes: [...(deal.customFields?.notes || []), note] };
          dealStore.set(entityId, deal);
        }
        
        console.log(`📊 CRM: Created note ${noteId} on ${entityType} ${entityId}`);
        
        return {
          success: true,
          noteId,
        };
      },
    },
  },
  
  triggers: {},
};

export const crm = crmBit;
export default crmBit;
