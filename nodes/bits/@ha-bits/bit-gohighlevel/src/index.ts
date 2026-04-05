/**
 * @ha-bits/bit-gohighlevel
 * 
 * GoHighLevel (HighLevel) CRM integration bit.
 * Implements the @ha-bits/bit-crm L0 interface for GoHighLevel.
 * 
 * Features:
 * - Contact management (create, update, get, list)
 * - Opportunity/pipeline management
 * - Tag management
 * - Workflow automation
 * - SMS/Email campaigns
 * 
 * Level: L1 (Implements bit-crm interface)
 */

import type {
  CRMContext,
  Lead,
  Contact,
  Opportunity,
  CreateLeadResult,
  GetLeadResult,
  UpdateLeadResult,
  ListLeadsResult,
  CreateContactResult,
  GetContactResult,
  UpdateContactResult,
  ListContactsResult,
  CreateOpportunityResult,
  AddTagResult,
  CreateNoteResult,
} from '@ha-bits/bit-crm';

const GHL_API_BASE = 'https://rest.gohighlevel.com';

interface GoHighLevelContext extends CRMContext {
  auth: {
    accessToken: string;
    locationId: string;
  };
}

/**
 * Make a GoHighLevel API request
 */
async function ghlRequest(
  endpoint: string,
  accessToken: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  version: string = '2021-07-28'
): Promise<any> {
  const url = `${GHL_API_BASE}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'Version': version,
    },
  };
  
  if (body && ['POST', 'PUT'].includes(method)) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GoHighLevel API error: ${response.status} - ${error}`);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }
  
  return response.json();
}

const goHighLevelBit = {
  // Unique identifier for webhook routing: /webhook/v/gohighlevel
  id: 'gohighlevel',
  displayName: 'GoHighLevel CRM',
  description: 'GoHighLevel CRM integration for contacts, opportunities, and marketing automation',
  logoUrl: 'lucide:Rocket',
  runtime: 'all',
  replaces: '@ha-bits/bit-crm',
  
  auth: {
    type: 'OAUTH2' as const,
    displayName: 'GoHighLevel OAuth',
    description: 'Connect your GoHighLevel account',
    required: true,
    authUrl: 'https://marketplace.gohighlevel.com/oauth/chooselocation',
    tokenUrl: 'https://rest.gohighlevel.com/oauth/token',
    scope: ['contacts.readonly', 'contacts.write', 'opportunities.readonly', 'opportunities.write', 'locations.readonly'],
  },
  
  actions: {
    /**
     * Create a new contact
     */
    createContact: {
      name: 'createContact',
      displayName: 'Create Contact',
      description: 'Create a new contact in GoHighLevel',
      props: {
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
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Full Name',
          description: 'Full name (alternative to first/last)',
          required: false,
        },
        companyName: {
          type: 'SHORT_TEXT',
          displayName: 'Company Name',
          required: false,
        },
        website: {
          type: 'SHORT_TEXT',
          displayName: 'Website',
          required: false,
        },
        tags: {
          type: 'JSON',
          displayName: 'Tags',
          description: 'Array of tag names',
          required: false,
        },
        source: {
          type: 'SHORT_TEXT',
          displayName: 'Source',
          description: 'Lead source',
          required: false,
        },
        customFields: {
          type: 'JSON',
          displayName: 'Custom Fields',
          description: 'Custom field values as JSON array: [{"id": "field_id", "value": "value"}]',
          required: false,
        },
      },
      async run(context: GoHighLevelContext): Promise<CreateContactResult> {
        const { email, phone, firstName, lastName, name, companyName, website, tags, source, customFields } = context.propsValue;
        
        const contactData: Record<string, any> = {
          locationId: context.auth.locationId,
        };
        
        if (email) contactData.email = email;
        if (phone) contactData.phone = phone;
        if (firstName) contactData.firstName = firstName;
        if (lastName) contactData.lastName = lastName;
        if (name) contactData.name = name;
        if (companyName) contactData.companyName = companyName;
        if (website) contactData.website = website;
        if (source) contactData.source = source;
        
        if (tags) {
          let parsedTags = tags;
          if (typeof tags === 'string') parsedTags = JSON.parse(tags);
          contactData.tags = parsedTags;
        }
        
        if (customFields) {
          let parsed = customFields;
          if (typeof customFields === 'string') parsed = JSON.parse(customFields);
          contactData.customFields = parsed;
        }
        
        const result = await ghlRequest(
          '/contacts/',
          context.auth.accessToken,
          'POST',
          contactData
        );
        
        console.log(`🚀 GoHighLevel: Created contact ${result.contact.id} - ${email || phone}`);
        
        const contact: Contact = {
          id: result.contact.id,
          email: result.contact.email,
          firstName: result.contact.firstName,
          lastName: result.contact.lastName,
          company: result.contact.companyName,
          phone: result.contact.phone,
          tags: result.contact.tags,
          createdAt: result.contact.dateAdded,
        };
        
        return { success: true, contact };
      },
    },
    
    /**
     * Get a contact by ID, email, or phone
     */
    getContact: {
      name: 'getContact',
      displayName: 'Get Contact',
      description: 'Get a contact from GoHighLevel by ID, email, or phone',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: false,
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
      },
      async run(context: GoHighLevelContext): Promise<GetContactResult> {
        const { contactId, email, phone } = context.propsValue;
        
        try {
          let data;
          
          if (contactId) {
            data = await ghlRequest(
              `/contacts/${contactId}`,
              context.auth.accessToken
            );
            data = data.contact;
          } else if (email || phone) {
            // Search by email or phone
            let query = `locationId=${context.auth.locationId}`;
            if (email) query += `&email=${encodeURIComponent(email)}`;
            if (phone) query += `&phone=${encodeURIComponent(phone)}`;
            
            const searchResult = await ghlRequest(
              `/contacts/?${query}`,
              context.auth.accessToken
            );
            
            if (searchResult.contacts?.length > 0) {
              data = searchResult.contacts[0];
            }
          }
          
          if (!data) {
            console.log(`🚀 GoHighLevel: Contact not found`);
            return { found: false, contact: null };
          }
          
          const contact: Contact = {
            id: data.id,
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            company: data.companyName,
            phone: data.phone,
            tags: data.tags,
            createdAt: data.dateAdded,
            updatedAt: data.dateUpdated,
          };
          
          console.log(`🚀 GoHighLevel: Found contact ${contact.id}`);
          return { found: true, contact };
        } catch (error) {
          console.log(`🚀 GoHighLevel: Contact not found`);
          return { found: false, contact: null };
        }
      },
    },
    
    /**
     * Update a contact
     */
    updateContact: {
      name: 'updateContact',
      displayName: 'Update Contact',
      description: 'Update an existing contact in GoHighLevel',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Fields to update (email, phone, firstName, lastName, companyName, tags, etc.)',
          required: true,
        },
      },
      async run(context: GoHighLevelContext): Promise<UpdateContactResult> {
        const { contactId, updates } = context.propsValue;
        
        let updateData = updates;
        if (typeof updates === 'string') {
          updateData = JSON.parse(updates);
        }
        
        const result = await ghlRequest(
          `/contacts/${contactId}`,
          context.auth.accessToken,
          'PUT',
          updateData
        );
        
        console.log(`🚀 GoHighLevel: Updated contact ${contactId}`);
        
        const contact: Contact = {
          id: result.contact.id,
          email: result.contact.email,
          firstName: result.contact.firstName,
          lastName: result.contact.lastName,
          company: result.contact.companyName,
          phone: result.contact.phone,
          tags: result.contact.tags,
          updatedAt: result.contact.dateUpdated,
        };
        
        return { success: true, contact };
      },
    },
    
    /**
     * List contacts
     */
    listContacts: {
      name: 'listContacts',
      displayName: 'List Contacts',
      description: 'List contacts from GoHighLevel with optional filters',
      props: {
        query: {
          type: 'SHORT_TEXT',
          displayName: 'Search Query',
          description: 'Search by name, email, or phone',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          required: false,
          defaultValue: 50,
        },
        startAfter: {
          type: 'NUMBER',
          displayName: 'Start After',
          description: 'Pagination offset',
          required: false,
        },
      },
      async run(context: GoHighLevelContext): Promise<ListContactsResult> {
        const { query, limit = 50, startAfter } = context.propsValue;
        
        let url = `/contacts/?locationId=${context.auth.locationId}&limit=${limit}`;
        if (query) url += `&query=${encodeURIComponent(query)}`;
        if (startAfter) url += `&startAfter=${startAfter}`;
        
        const result = await ghlRequest(url, context.auth.accessToken);
        
        const contacts: Contact[] = (result.contacts || []).map((c: any) => ({
          id: c.id,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          company: c.companyName,
          phone: c.phone,
          tags: c.tags,
          createdAt: c.dateAdded,
          updatedAt: c.dateUpdated,
        }));
        
        console.log(`🚀 GoHighLevel: Listed ${contacts.length} contacts`);
        
        return {
          contacts,
          count: contacts.length,
          nextPage: result.meta?.nextPageUrl,
        };
      },
    },
    
    /**
     * Create an opportunity
     */
    createOpportunity: {
      name: 'createOpportunity',
      displayName: 'Create Opportunity',
      description: 'Create a new opportunity/deal in GoHighLevel',
      props: {
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Opportunity Name',
          required: true,
        },
        pipelineId: {
          type: 'SHORT_TEXT',
          displayName: 'Pipeline ID',
          required: true,
        },
        pipelineStageId: {
          type: 'SHORT_TEXT',
          displayName: 'Pipeline Stage ID',
          required: true,
        },
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: true,
        },
        monetaryValue: {
          type: 'NUMBER',
          displayName: 'Value',
          description: 'Monetary value of the opportunity',
          required: false,
        },
        status: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Status',
          required: false,
          defaultValue: 'open',
          options: {
            options: [
              { label: 'Open', value: 'open' },
              { label: 'Won', value: 'won' },
              { label: 'Lost', value: 'lost' },
              { label: 'Abandoned', value: 'abandoned' },
            ],
          },
        },
        assignedTo: {
          type: 'SHORT_TEXT',
          displayName: 'Assigned To',
          description: 'User ID to assign',
          required: false,
        },
      },
      async run(context: GoHighLevelContext): Promise<CreateOpportunityResult> {
        const { name, pipelineId, pipelineStageId, contactId, monetaryValue, status = 'open', assignedTo } = context.propsValue;
        
        const oppData: Record<string, any> = {
          locationId: context.auth.locationId,
          name,
          pipelineId,
          pipelineStageId,
          contactId,
          status,
        };
        
        if (monetaryValue) oppData.monetaryValue = Number(monetaryValue);
        if (assignedTo) oppData.assignedTo = assignedTo;
        
        const result = await ghlRequest(
          '/opportunities/',
          context.auth.accessToken,
          'POST',
          oppData
        );
        
        console.log(`🚀 GoHighLevel: Created opportunity ${result.opportunity.id} - ${name}`);
        
        const opportunity: Opportunity = {
          id: result.opportunity.id,
          name: result.opportunity.name,
          value: result.opportunity.monetaryValue,
          stage: result.opportunity.pipelineStageId,
          status: result.opportunity.status,
          contactId: result.opportunity.contactId,
          pipelineId: result.opportunity.pipelineId,
          assignedTo: result.opportunity.assignedTo,
          createdAt: result.opportunity.createdAt,
        };
        
        return { success: true, opportunity };
      },
    },
    
    /**
     * Update an opportunity
     */
    updateOpportunity: {
      name: 'updateOpportunity',
      displayName: 'Update Opportunity',
      description: 'Update an existing opportunity in GoHighLevel',
      props: {
        opportunityId: {
          type: 'SHORT_TEXT',
          displayName: 'Opportunity ID',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Fields to update (name, pipelineStageId, status, monetaryValue, etc.)',
          required: true,
        },
      },
      async run(context: GoHighLevelContext) {
        const { opportunityId, updates } = context.propsValue;
        
        let updateData = updates;
        if (typeof updates === 'string') {
          updateData = JSON.parse(updates);
        }
        
        const result = await ghlRequest(
          `/opportunities/${opportunityId}`,
          context.auth.accessToken,
          'PUT',
          updateData
        );
        
        console.log(`🚀 GoHighLevel: Updated opportunity ${opportunityId}`);
        
        return {
          success: true,
          opportunity: result.opportunity,
        };
      },
    },
    
    /**
     * Add tags to a contact
     */
    addTag: {
      name: 'addTag',
      displayName: 'Add Tag',
      description: 'Add tags to a contact in GoHighLevel',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: true,
        },
        tags: {
          type: 'JSON',
          displayName: 'Tags',
          description: 'Tags to add (array of strings)',
          required: true,
        },
      },
      async run(context: GoHighLevelContext): Promise<AddTagResult> {
        const { contactId, tags } = context.propsValue;
        
        let parsedTags = tags;
        if (typeof tags === 'string') {
          parsedTags = JSON.parse(tags);
        }
        
        const result = await ghlRequest(
          `/contacts/${contactId}/tags`,
          context.auth.accessToken,
          'POST',
          { tags: parsedTags }
        );
        
        console.log(`🚀 GoHighLevel: Added tags to contact ${contactId}`);
        
        return {
          success: true,
          tags: result.tags || parsedTags,
        };
      },
    },
    
    /**
     * Remove tags from a contact
     */
    removeTag: {
      name: 'removeTag',
      displayName: 'Remove Tag',
      description: 'Remove tags from a contact in GoHighLevel',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: true,
        },
        tags: {
          type: 'JSON',
          displayName: 'Tags',
          description: 'Tags to remove (array of strings)',
          required: true,
        },
      },
      async run(context: GoHighLevelContext) {
        const { contactId, tags } = context.propsValue;
        
        let parsedTags = tags;
        if (typeof tags === 'string') {
          parsedTags = JSON.parse(tags);
        }
        
        await ghlRequest(
          `/contacts/${contactId}/tags`,
          context.auth.accessToken,
          'DELETE',
          { tags: parsedTags }
        );
        
        console.log(`🚀 GoHighLevel: Removed tags from contact ${contactId}`);
        
        return {
          success: true,
          removedTags: parsedTags,
        };
      },
    },
    
    /**
     * Add contact to a workflow
     */
    addToWorkflow: {
      name: 'addToWorkflow',
      displayName: 'Add to Workflow',
      description: 'Add a contact to a GoHighLevel workflow/automation',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: true,
        },
        workflowId: {
          type: 'SHORT_TEXT',
          displayName: 'Workflow ID',
          required: true,
        },
      },
      async run(context: GoHighLevelContext) {
        const { contactId, workflowId } = context.propsValue;
        
        await ghlRequest(
          `/contacts/${contactId}/workflow/${workflowId}`,
          context.auth.accessToken,
          'POST',
          {}
        );
        
        console.log(`🚀 GoHighLevel: Added contact ${contactId} to workflow ${workflowId}`);
        
        return {
          success: true,
          contactId,
          workflowId,
        };
      },
    },
    
    /**
     * Create a note on a contact
     */
    createNote: {
      name: 'createNote',
      displayName: 'Create Note',
      description: 'Add a note to a contact in GoHighLevel',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Note Content',
          required: true,
        },
      },
      async run(context: GoHighLevelContext): Promise<CreateNoteResult> {
        const { contactId, content } = context.propsValue;
        
        const result = await ghlRequest(
          `/contacts/${contactId}/notes`,
          context.auth.accessToken,
          'POST',
          { body: content }
        );
        
        console.log(`🚀 GoHighLevel: Created note on contact ${contactId}`);
        
        return {
          success: true,
          noteId: result.note?.id || 'created',
        };
      },
    },
    
    /**
     * Create a lead (alias for createContact with source)
     */
    createLead: {
      name: 'createLead',
      displayName: 'Create Lead',
      description: 'Create a new lead in GoHighLevel (contact with lead source)',
      props: {
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
        company: {
          type: 'SHORT_TEXT',
          displayName: 'Company',
          required: false,
        },
        source: {
          type: 'SHORT_TEXT',
          displayName: 'Lead Source',
          required: false,
        },
        tags: {
          type: 'JSON',
          displayName: 'Tags',
          required: false,
        },
      },
      async run(context: GoHighLevelContext): Promise<CreateLeadResult> {
        const { email, phone, firstName, lastName, company, source, tags } = context.propsValue;
        
        const result = await goHighLevelBit.actions.createContact.run({
          ...context,
          propsValue: {
            email,
            phone,
            firstName,
            lastName,
            companyName: company,
            source: source || 'Lead Form',
            tags,
          },
        } as any);
        
        const lead: Lead = {
          ...result.contact,
          company,
          source: source || 'Lead Form',
          status: 'new',
        };
        
        return { success: true, lead };
      },
    },
    
    /**
     * Get a lead
     */
    getLead: {
      name: 'getLead',
      displayName: 'Get Lead',
      description: 'Get a lead from GoHighLevel by ID, email, or phone',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          required: false,
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
      },
      async run(context: GoHighLevelContext): Promise<GetLeadResult> {
        const result = await goHighLevelBit.actions.getContact.run({
          ...context,
          propsValue: {
            contactId: context.propsValue.leadId,
            email: context.propsValue.email,
            phone: context.propsValue.phone,
          },
        } as any);
        
        if (!result.found || !result.contact) {
          return { found: false, lead: null };
        }
        
        const lead: Lead = {
          ...result.contact,
          status: 'active',
        };
        
        return { found: true, lead };
      },
    },
    
    /**
     * Update a lead
     */
    updateLead: {
      name: 'updateLead',
      displayName: 'Update Lead',
      description: 'Update an existing lead in GoHighLevel',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          required: true,
        },
      },
      async run(context: GoHighLevelContext): Promise<UpdateLeadResult> {
        const result = await goHighLevelBit.actions.updateContact.run({
          ...context,
          propsValue: {
            contactId: context.propsValue.leadId,
            updates: context.propsValue.updates,
          },
        } as any);
        
        const lead: Lead = {
          ...result.contact,
          status: 'active',
        };
        
        return { success: true, lead };
      },
    },
    
    /**
     * List leads
     */
    listLeads: {
      name: 'listLeads',
      displayName: 'List Leads',
      description: 'List leads (contacts) from GoHighLevel',
      props: {
        query: {
          type: 'SHORT_TEXT',
          displayName: 'Search Query',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          required: false,
          defaultValue: 50,
        },
      },
      async run(context: GoHighLevelContext): Promise<ListLeadsResult> {
        const result = await goHighLevelBit.actions.listContacts.run(context);
        
        const leads: Lead[] = result.contacts.map(c => ({
          ...c,
          status: 'active',
        }));
        
        return {
          leads,
          count: leads.length,
        };
      },
    },
    
    /**
     * Get pipelines
     */
    getPipelines: {
      name: 'getPipelines',
      displayName: 'Get Pipelines',
      description: 'Get available pipelines and stages',
      props: {},
      async run(context: GoHighLevelContext) {
        const result = await ghlRequest(
          `/opportunities/pipelines?locationId=${context.auth.locationId}`,
          context.auth.accessToken
        );
        
        console.log(`🚀 GoHighLevel: Retrieved ${result.pipelines?.length || 0} pipelines`);
        
        return {
          pipelines: result.pipelines || [],
        };
      },
    },
    
    /**
     * Send SMS
     */
    sendSMS: {
      name: 'sendSMS',
      displayName: 'Send SMS',
      description: 'Send an SMS message to a contact',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: true,
        },
        message: {
          type: 'LONG_TEXT',
          displayName: 'Message',
          description: 'SMS message content',
          required: true,
        },
      },
      async run(context: GoHighLevelContext) {
        const { contactId, message } = context.propsValue;
        
        await ghlRequest(
          `/contacts/${contactId}/messages`,
          context.auth.accessToken,
          'POST',
          {
            type: 'SMS',
            message,
          }
        );
        
        console.log(`🚀 GoHighLevel: Sent SMS to contact ${contactId}`);
        
        return {
          success: true,
          contactId,
          type: 'SMS',
        };
      },
    },
  },
  
  triggers: {
    /**
     * New contact trigger
     * GoHighLevel sends webhook with event types like:
     * - ContactCreate, contact.created, contact.create
     */
    newContact: {
      name: 'newContact',
      displayName: 'New Contact',
      description: 'Triggers when a new contact is created in GoHighLevel',
      type: 'WEBHOOK',
      props: {},
      /**
       * Filter incoming webhooks to only handle new contact events.
       * GoHighLevel may use different event naming conventions.
       */
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const eventType = payload.body?.event || payload.body?.type || payload.body?.eventType || '';
        const normalizedEvent = String(eventType).toLowerCase();
        return normalizedEvent.includes('contact') && 
               (normalizedEvent.includes('create') || normalizedEvent.includes('new') || normalizedEvent.includes('add'));
      },
      async run(context: any) {
        // Extract contact data from the webhook payload
        const contact = context.webhookPayload?.body?.contact || 
                        context.webhookPayload?.body?.data?.contact || 
                        context.webhookPayload?.body;
        return [{ 
          contact,
          event: 'newContact',
          raw: context.webhookPayload?.body 
        }];
      },
    },
    
    /**
     * Contact updated trigger
     * GoHighLevel sends webhook with event types like:
     * - ContactUpdate, contact.updated, contact.update
     */
    contactUpdated: {
      name: 'contactUpdated',
      displayName: 'Contact Updated',
      description: 'Triggers when a contact is updated in GoHighLevel',
      type: 'WEBHOOK',
      props: {},
      /**
       * Filter incoming webhooks to only handle contact update events.
       */
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const eventType = payload.body?.event || payload.body?.type || payload.body?.eventType || '';
        const normalizedEvent = String(eventType).toLowerCase();
        return normalizedEvent.includes('contact') && 
               (normalizedEvent.includes('update') || normalizedEvent.includes('edit') || normalizedEvent.includes('modify'));
      },
      async run(context: any) {
        const contact = context.webhookPayload?.body?.contact || 
                        context.webhookPayload?.body?.data?.contact || 
                        context.webhookPayload?.body;
        return [{ 
          contact,
          event: 'contactUpdated',
          raw: context.webhookPayload?.body 
        }];
      },
    },
    
    /**
     * New opportunity trigger
     * GoHighLevel sends webhook with event types like:
     * - OpportunityCreate, opportunity.created, opportunity.create
     */
    opportunityCreated: {
      name: 'opportunityCreated',
      displayName: 'Opportunity Created',
      description: 'Triggers when a new opportunity is created',
      type: 'WEBHOOK',
      props: {},
      /**
       * Filter incoming webhooks to only handle new opportunity events.
       */
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const eventType = payload.body?.event || payload.body?.type || payload.body?.eventType || '';
        const normalizedEvent = String(eventType).toLowerCase();
        return normalizedEvent.includes('opportunity') && 
               (normalizedEvent.includes('create') || normalizedEvent.includes('new') || normalizedEvent.includes('add'));
      },
      async run(context: any) {
        const opportunity = context.webhookPayload?.body?.opportunity || 
                            context.webhookPayload?.body?.data?.opportunity || 
                            context.webhookPayload?.body;
        return [{ 
          opportunity,
          event: 'opportunityCreated',
          raw: context.webhookPayload?.body 
        }];
      },
    },
    
    /**
     * Opportunity stage changed trigger
     * GoHighLevel sends webhook with event types like:
     * - OpportunityStageUpdate, opportunity.stage.updated, opportunity.status.changed
     */
    opportunityStageChanged: {
      name: 'opportunityStageChanged',
      displayName: 'Opportunity Stage Changed',
      description: 'Triggers when an opportunity stage changes',
      type: 'WEBHOOK',
      props: {},
      /**
       * Filter incoming webhooks to only handle opportunity stage change events.
       */
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const eventType = payload.body?.event || payload.body?.type || payload.body?.eventType || '';
        const normalizedEvent = String(eventType).toLowerCase();
        return normalizedEvent.includes('opportunity') && 
               (normalizedEvent.includes('stage') || normalizedEvent.includes('status') || normalizedEvent.includes('pipeline'));
      },
      async run(context: any) {
        const opportunity = context.webhookPayload?.body?.opportunity || 
                            context.webhookPayload?.body?.data?.opportunity || 
                            context.webhookPayload?.body;
        return [{ 
          opportunity,
          event: 'opportunityStageChanged',
          previousStage: context.webhookPayload?.body?.previousStage,
          newStage: context.webhookPayload?.body?.newStage || context.webhookPayload?.body?.pipelineStageId,
          raw: context.webhookPayload?.body 
        }];
      },
    },
  },
};

export const gohighlevel = goHighLevelBit;
export default goHighLevelBit;
