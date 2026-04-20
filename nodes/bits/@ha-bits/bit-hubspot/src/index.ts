/**
 * @ha-bits/bit-hubspot
 * 
 * HubSpot CRM integration bit.
 * Implements the @ha-bits/bit-crm L0 interface for HubSpot.
 * 
 * Features:
 * - Contact management (create, update, get, list)
 * - Deal management (create, update)
 * - List management (add contacts to lists)
 * - Tags and notes
 * 
 * Level: L1 (Implements bit-crm interface)
 */

import type {
  CRMContext,
  Lead,
  Contact,
  Deal,
  CreateLeadResult,
  GetLeadResult,
  UpdateLeadResult,
  ListLeadsResult,
  CreateContactResult,
  GetContactResult,
  UpdateContactResult,
  ListContactsResult,
  CreateDealResult,
  UpdateDealResult,
  AddTagResult,
  CreateNoteResult,
} from '@ha-bits/bit-crm';

const HUBSPOT_API_BASE = 'https://api.hubapi.com';

interface HubSpotContext extends CRMContext {
  auth: {
    accessToken: string;
  };
}

/**
 * Make a HubSpot API request
 */
async function hubspotRequest(
  endpoint: string,
  accessToken: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const url = `${HUBSPOT_API_BASE}${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  };
  
  if (body && ['POST', 'PATCH', 'PUT'].includes(method)) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HubSpot API error: ${response.status} - ${error}`);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }
  
  return response.json();
}

/**
 * Ensure a custom property exists on a HubSpot object type.
 * Does a GET first; if not found (throws), creates it via POST.
 */
async function ensureContactProperty(
  objectType: string,
  propertyName: string,
  accessToken: string,
  propertyDefinition: Record<string, any>
): Promise<void> {
  try {
    await hubspotRequest(
      `/crm/v3/properties/${objectType}/${propertyName}`,
      accessToken,
      'GET'
    );
    // Property already exists — nothing to do
  } catch {
    // Property not found — create it
    await hubspotRequest(
      `/crm/v3/properties/${objectType}`,
      accessToken,
      'POST',
      propertyDefinition
    );
  }
}

const hubspotBit = {
  // Unique identifier for webhook routing: /webhook/v/hubspot
  id: 'hubspot',
  displayName: 'HubSpot CRM',
  description: 'HubSpot CRM integration for contacts, deals, and lead management',
  logoUrl: 'lucide:Users',
  runtime: 'all',
  replaces: '@ha-bits/bit-crm',
  
  auth: {
      type: 'SECRET_TEXT' as const,
      displayName: 'HubSpot Access Token',
      description: 'Your HubSpot Private App access token (pat-...)',
      required: true,
  },
  
  actions: {
    /**
     * Create a new contact
     */
    createContact: {
      name: 'createContact',
      displayName: 'Create Contact',
      description: 'Create a new contact in HubSpot',
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
        website: {
          type: 'SHORT_TEXT',
          displayName: 'Website',
          description: 'Contact website',
          required: false,
        },
        lifecycleStage: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Lifecycle Stage',
          description: 'Contact lifecycle stage',
          required: false,
          options: {
            options: [
              { label: 'Subscriber', value: 'subscriber' },
              { label: 'Lead', value: 'lead' },
              { label: 'Marketing Qualified Lead', value: 'marketingqualifiedlead' },
              { label: 'Sales Qualified Lead', value: 'salesqualifiedlead' },
              { label: 'Opportunity', value: 'opportunity' },
              { label: 'Customer', value: 'customer' },
              { label: 'Evangelist', value: 'evangelist' },
            ],
          },
        },
      },
      async run(context: HubSpotContext): Promise<CreateContactResult> {
        const { email, firstName, lastName, company, phone, website, lifecycleStage } = context.propsValue;
        
        const properties: Record<string, string> = { email };
        if (firstName) properties.firstname = firstName;
        if (lastName) properties.lastname = lastName;
        if (company) properties.company = company;
        if (phone) properties.phone = phone;
        if (website) properties.website = website;
        if (lifecycleStage) properties.lifecyclestage = lifecycleStage;
        
        const data = await hubspotRequest(
          '/crm/v3/objects/contacts',
          context.auth.accessToken,
          'POST',
          { properties }
        );
        
        console.log(`🔶 HubSpot: Created contact ${data.id} - ${email}`);
        
        const contact: Contact = {
          id: data.id,
          email: data.properties.email,
          firstName: data.properties.firstname,
          lastName: data.properties.lastname,
          company: data.properties.company,
          phone: data.properties.phone,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        return { success: true, contact };
      },
    },
    
    /**
     * Get a contact by ID or email
     */
    getContact: {
      name: 'getContact',
      displayName: 'Get Contact',
      description: 'Get a contact from HubSpot by ID or email',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          description: 'HubSpot contact ID',
          required: false,
        },
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Contact email (if ID not provided)',
          required: false,
        },
      },
      async run(context: HubSpotContext): Promise<GetContactResult> {
        const { contactId, email } = context.propsValue;
        
        try {
          let data;
          
          if (contactId) {
            data = await hubspotRequest(
              `/crm/v3/objects/contacts/${contactId}`,
              context.auth.accessToken
            );
          } else if (email) {
            // Search by email
            const searchResult = await hubspotRequest(
              '/crm/v3/objects/contacts/search',
              context.auth.accessToken,
              'POST',
              {
                filterGroups: [{
                  filters: [{
                    propertyName: 'email',
                    operator: 'EQ',
                    value: email,
                  }],
                }],
              }
            );
            
            if (searchResult.results?.length > 0) {
              data = searchResult.results[0];
            }
          }
          
          if (!data) {
            console.log(`🔶 HubSpot: Contact not found`);
            return { found: false, contact: null };
          }
          
          const contact: Contact = {
            id: data.id,
            email: data.properties.email,
            firstName: data.properties.firstname,
            lastName: data.properties.lastname,
            company: data.properties.company,
            phone: data.properties.phone,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          };
          
          console.log(`🔶 HubSpot: Found contact ${contact.id}`);
          return { found: true, contact };
        } catch (error) {
          console.log(`🔶 HubSpot: Contact not found`);
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
      description: 'Update an existing contact in HubSpot',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          description: 'HubSpot contact ID to update',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Properties to update as JSON. Use HubSpot property names (e.g., firstname, lastname, company)',
          required: true,
        },
      },
      async run(context: HubSpotContext): Promise<UpdateContactResult> {
        const { contactId, updates } = context.propsValue;
        
        let properties = updates;
        if (typeof updates === 'string') {
          properties = JSON.parse(updates);
        }
        
        const data = await hubspotRequest(
          `/crm/v3/objects/contacts/${contactId}`,
          context.auth.accessToken,
          'PATCH',
          { properties }
        );
        
        console.log(`🔶 HubSpot: Updated contact ${contactId}`);
        
        const contact: Contact = {
          id: data.id,
          email: data.properties.email,
          firstName: data.properties.firstname,
          lastName: data.properties.lastname,
          company: data.properties.company,
          phone: data.properties.phone,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
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
      description: 'List contacts from HubSpot with optional filters',
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
          description: 'Maximum results (max 100)',
          required: false,
          defaultValue: 50,
        },
        after: {
          type: 'SHORT_TEXT',
          displayName: 'Pagination Cursor',
          description: 'Cursor for pagination',
          required: false,
        },
      },
      async run(context: HubSpotContext): Promise<ListContactsResult> {
        const { query, limit = 50, after } = context.propsValue;
        
        let data;
        
        if (query) {
          // Use search endpoint
          data = await hubspotRequest(
            '/crm/v3/objects/contacts/search',
            context.auth.accessToken,
            'POST',
            {
              query,
              limit: Math.min(Number(limit), 100),
              after,
            }
          );
        } else {
          // Use list endpoint
          let url = `/crm/v3/objects/contacts?limit=${Math.min(Number(limit), 100)}`;
          if (after) url += `&after=${after}`;
          
          data = await hubspotRequest(url, context.auth.accessToken);
        }
        
        const contacts: Contact[] = (data.results || []).map((r: any) => ({
          id: r.id,
          email: r.properties.email,
          firstName: r.properties.firstname,
          lastName: r.properties.lastname,
          company: r.properties.company,
          phone: r.properties.phone,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
        
        console.log(`🔶 HubSpot: Listed ${contacts.length} contacts`);
        
        return {
          contacts,
          count: contacts.length,
          nextPage: data.paging?.next?.after,
        };
      },
    },
    
    /**
     * Create a deal
     */
    createDeal: {
      name: 'createDeal',
      displayName: 'Create Deal',
      description: 'Create a new deal in HubSpot',
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
          description: 'Deal amount',
          required: false,
        },
        stage: {
          type: 'SHORT_TEXT',
          displayName: 'Deal Stage',
          description: 'Deal stage ID (from your pipeline)',
          required: false,
        },
        pipeline: {
          type: 'SHORT_TEXT',
          displayName: 'Pipeline',
          description: 'Pipeline ID',
          required: false,
        },
        closeDate: {
          type: 'SHORT_TEXT',
          displayName: 'Close Date',
          description: 'Expected close date (YYYY-MM-DD)',
          required: false,
        },
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          description: 'Associated contact ID',
          required: false,
        },
      },
      async run(context: HubSpotContext): Promise<CreateDealResult> {
        const { name, amount, stage, pipeline, closeDate, contactId } = context.propsValue;
        
        const properties: Record<string, any> = { dealname: name };
        if (amount) properties.amount = String(amount);
        if (stage) properties.dealstage = stage;
        if (pipeline) properties.pipeline = pipeline;
        if (closeDate) properties.closedate = closeDate;
        
        const data = await hubspotRequest(
          '/crm/v3/objects/deals',
          context.auth.accessToken,
          'POST',
          { properties }
        );
        
        // Associate with contact if provided
        if (contactId) {
          await hubspotRequest(
            `/crm/v4/objects/deals/${data.id}/associations/contacts/${contactId}`,
            context.auth.accessToken,
            'PUT',
            [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
          );
        }
        
        console.log(`🔶 HubSpot: Created deal ${data.id} - ${name}`);
        
        const deal: Deal = {
          id: data.id,
          name: data.properties.dealname,
          amount: data.properties.amount ? parseFloat(data.properties.amount) : undefined,
          stage: data.properties.dealstage,
          closeDate: data.properties.closedate,
          contactId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        return { success: true, deal };
      },
    },
    
    /**
     * Update a deal
     */
    updateDeal: {
      name: 'updateDeal',
      displayName: 'Update Deal',
      description: 'Update an existing deal in HubSpot',
      props: {
        dealId: {
          type: 'SHORT_TEXT',
          displayName: 'Deal ID',
          description: 'HubSpot deal ID to update',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Properties to update as JSON (use HubSpot property names)',
          required: true,
        },
      },
      async run(context: HubSpotContext): Promise<UpdateDealResult> {
        const { dealId, updates } = context.propsValue;
        
        let properties = updates;
        if (typeof updates === 'string') {
          properties = JSON.parse(updates);
        }
        
        const data = await hubspotRequest(
          `/crm/v3/objects/deals/${dealId}`,
          context.auth.accessToken,
          'PATCH',
          { properties }
        );
        
        console.log(`🔶 HubSpot: Updated deal ${dealId}`);
        
        const deal: Deal = {
          id: data.id,
          name: data.properties.dealname,
          amount: data.properties.amount ? parseFloat(data.properties.amount) : undefined,
          stage: data.properties.dealstage,
          closeDate: data.properties.closedate,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        return { success: true, deal };
      },
    },
    
    /**
     * Add contact to a list
     */
    addContactToList: {
      name: 'addContactToList',
      displayName: 'Add Contact to List',
      description: 'Add a contact to a HubSpot list',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          description: 'Contact ID to add',
          required: true,
        },
        listId: {
          type: 'SHORT_TEXT',
          displayName: 'List ID',
          description: 'HubSpot list ID',
          required: true,
        },
      },
      async run(context: HubSpotContext) {
        const { contactId, listId } = context.propsValue;
        
        await hubspotRequest(
          `/contacts/v1/lists/${listId}/add`,
          context.auth.accessToken,
          'POST',
          { vids: [parseInt(contactId)] }
        );
        
        console.log(`🔶 HubSpot: Added contact ${contactId} to list ${listId}`);
        
        return {
          success: true,
          contactId,
          listId,
        };
      },
    },
    
    /**
     * Create a note
     */
    createNote: {
      name: 'createNote',
      displayName: 'Create Note',
      description: 'Add a note to a contact or deal in HubSpot',
      props: {
        entityType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Entity Type',
          description: 'Type of entity to add note to',
          required: true,
          options: {
            options: [
              { label: 'Contact', value: 'contacts' },
              { label: 'Deal', value: 'deals' },
            ],
          },
        },
        entityId: {
          type: 'SHORT_TEXT',
          displayName: 'Entity ID',
          description: 'ID of the contact or deal',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Note Content',
          description: 'Content of the note',
          required: true,
        },
      },
      async run(context: HubSpotContext): Promise<CreateNoteResult> {
        const { entityType, entityId, content } = context.propsValue;
        
        // Create engagement note
        const data = await hubspotRequest(
          '/crm/v3/objects/notes',
          context.auth.accessToken,
          'POST',
          {
            properties: {
              hs_note_body: content,
              hs_timestamp: new Date().toISOString(),
            },
          }
        );
        
        // Associate with entity
        const associationTypeId = entityType === 'contacts' ? 202 : 214; // Note to contact/deal
        await hubspotRequest(
          `/crm/v4/objects/notes/${data.id}/associations/${entityType}/${entityId}`,
          context.auth.accessToken,
          'PUT',
          [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId }]
        );
        
        console.log(`🔶 HubSpot: Created note ${data.id} on ${entityType} ${entityId}`);
        
        return {
          success: true,
          noteId: data.id,
        };
      },
    },
    
    /**
     * Create a lead (using contacts with lead status)
     */
    createLead: {
      name: 'createLead',
      displayName: 'Create Lead',
      description: 'Create a new lead (contact with lead lifecycle stage) in HubSpot',
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
        phone: {
          type: 'SHORT_TEXT',
          displayName: 'Phone',
          required: false,
        },
        source: {
          type: 'SHORT_TEXT',
          displayName: 'Lead Source',
          description: 'How the lead was acquired',
          required: false,
        },
      },
      async run(context: HubSpotContext): Promise<CreateLeadResult> {
        const { email, firstName, lastName, company, phone, source } = context.propsValue;
        
        const properties: Record<string, string> = {
          email,
          lifecyclestage: 'lead',
        };
        if (firstName) properties.firstname = firstName;
        if (lastName) properties.lastname = lastName;
        if (company) properties.company = company;
        if (phone) properties.phone = phone;
        if (source) properties.hs_lead_status = source;
        
        const data = await hubspotRequest(
          '/crm/v3/objects/contacts',
          context.auth.accessToken,
          'POST',
          { properties }
        );
        
        console.log(`🔶 HubSpot: Created lead ${data.id} - ${email}`);
        
        const lead: Lead = {
          id: data.id,
          email: data.properties.email,
          firstName: data.properties.firstname,
          lastName: data.properties.lastname,
          company: data.properties.company,
          phone: data.properties.phone,
          source: data.properties.hs_lead_status,
          status: 'lead',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        return { success: true, lead };
      },
    },
    
    /**
     * Get a lead by ID or email
     */
    getLead: {
      name: 'getLead',
      displayName: 'Get Lead',
      description: 'Get a lead from HubSpot by ID or email',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          description: 'HubSpot contact ID',
          required: false,
        },
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Lead email',
          required: false,
        },
      },
      async run(context: HubSpotContext): Promise<GetLeadResult> {
        // Reuse getContact logic
        const result = await hubspotBit.actions.getContact.run({
          ...context,
          propsValue: {
            contactId: context.propsValue.leadId,
            email: context.propsValue.email,
          },
        } as any);
        
        if (!result.found || !result.contact) {
          return { found: false, lead: null };
        }
        
        const lead: Lead = {
          ...result.contact,
          status: 'lead',
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
      description: 'Update an existing lead in HubSpot',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          description: 'HubSpot contact/lead ID',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Properties to update',
          required: true,
        },
      },
      async run(context: HubSpotContext): Promise<UpdateLeadResult> {
        const result = await hubspotBit.actions.updateContact.run({
          ...context,
          propsValue: {
            contactId: context.propsValue.leadId,
            updates: context.propsValue.updates,
          },
        } as any);
        
        const lead: Lead = {
          ...result.contact,
          status: 'lead',
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
      description: 'List leads from HubSpot (contacts with lead lifecycle stage)',
      props: {
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          description: 'Maximum results',
          required: false,
          defaultValue: 50,
        },
      },
      async run(context: HubSpotContext): Promise<ListLeadsResult> {
        const { limit = 50 } = context.propsValue;
        
        const data = await hubspotRequest(
          '/crm/v3/objects/contacts/search',
          context.auth.accessToken,
          'POST',
          {
            filterGroups: [{
              filters: [{
                propertyName: 'lifecyclestage',
                operator: 'EQ',
                value: 'lead',
              }],
            }],
            limit: Math.min(Number(limit), 100),
          }
        );
        
        const leads: Lead[] = (data.results || []).map((r: any) => ({
          id: r.id,
          email: r.properties.email,
          firstName: r.properties.firstname,
          lastName: r.properties.lastname,
          company: r.properties.company,
          phone: r.properties.phone,
          status: 'lead',
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
        
        console.log(`🔶 HubSpot: Listed ${leads.length} leads`);
        
        return {
          leads,
          count: leads.length,
        };
      },
    },
    
    /**
     * Create or update a lead (upsert by email)
     */
    createOrUpdate: {
      name: 'createOrUpdate',
      displayName: 'Create or Update Lead',
      description: 'Creates a new lead in HubSpot or updates the existing one if the email already exists (upsert by email)',
      props: {
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Lead email address (used as unique key)',
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
          description: 'Lead company',
          required: false,
        },
        phone: {
          type: 'SHORT_TEXT',
          displayName: 'Phone',
          description: 'Lead phone number',
          required: false,
        },
        score: {
          type: 'SHORT_TEXT',
          displayName: 'score',
          description: 'Numeric score 0-100 from AI enrichment',
          required: false,
        },
      },
      async run(context: HubSpotContext) {
        const {
          email,
          firstName,
          lastName,
          company,
          phone,
          score
        } = context.propsValue;

        const properties: Record<string, string | number> = {
          email,
          lifecyclestage: 'lead',
        };
        if (firstName) properties.firstname = firstName;
        if (lastName) properties.lastname = lastName;
        if (company) properties.company = company;
        if (phone) properties.phone = phone;
        if (score != null && score !== '') {
          properties.score = Number(score);
        }

        // Ensure the 'score' property exists on contacts before using it
        await ensureContactProperty('contacts', 'score', context.auth.accessToken, {
          displayOrder: 4,
          fieldType: 'number',
          type: 'number',
          groupName: 'contactinformation',
          hasUniqueValue: false,
          hidden: false,
          label: 'Score',
          name: 'score',
        });

        // Check if contact already exists by email
        const searchResult = await hubspotRequest(
          '/crm/v3/objects/contacts/search',
          context.auth.accessToken,
          'POST',
          {
            filterGroups: [{
              filters: [{
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              }],
            }],
            limit: 1,
          }
        );

        const existing = searchResult.results?.[0];
        let data: any;

        if (existing) {
          // Update existing contact
          data = await hubspotRequest(
            `/crm/v3/objects/contacts/${existing.id}`,
            context.auth.accessToken,
            'PATCH',
            { properties }
          );
          console.log(`🔶 HubSpot: Updated existing lead ${existing.id} - ${email}`);
        } else {
          // Create new contact
          data = await hubspotRequest(
            '/crm/v3/objects/contacts',
            context.auth.accessToken,
            'POST',
            { properties }
          );
          console.log(`🔶 HubSpot: Created new lead ${data.id} - ${email}`);
        }

        const lead: Lead = {
          id: data.id,
          email: data.properties.email,
          firstName: data.properties.firstname,
          lastName: data.properties.lastname,
          company: data.properties.company,
          phone: data.properties.phone,
          status: 'lead',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        
        return { success: true, lead };
      },
    },

    /**
     * Add tags (using custom property)
     */
    addTag: {
      name: 'addTag',
      displayName: 'Add Tag',
      description: 'Add tags to a contact (via custom property)',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          description: 'Contact to tag',
          required: true,
        },
        tags: {
          type: 'JSON',
          displayName: 'Tags',
          description: 'Tags to add (array of strings)',
          required: true,
        },
        propertyName: {
          type: 'SHORT_TEXT',
          displayName: 'Tag Property',
          description: 'Custom property name for tags (default: tags)',
          required: false,
          defaultValue: 'tags',
        },
      },
      async run(context: HubSpotContext): Promise<AddTagResult> {
        const { contactId, tags, propertyName = 'tags' } = context.propsValue;
        
        let parsedTags = tags;
        if (typeof tags === 'string') {
          parsedTags = JSON.parse(tags);
        }
        
        // Get existing tags
        const current = await hubspotRequest(
          `/crm/v3/objects/contacts/${contactId}?properties=${propertyName}`,
          context.auth.accessToken
        );
        
        const existingTags = current.properties[propertyName]?.split(';').filter(Boolean) || [];
        const allTags = [...new Set([...existingTags, ...parsedTags])];
        
        // Update with merged tags
        await hubspotRequest(
          `/crm/v3/objects/contacts/${contactId}`,
          context.auth.accessToken,
          'PATCH',
          { properties: { [propertyName]: allTags.join(';') } }
        );
        
        console.log(`🔶 HubSpot: Added tags to contact ${contactId}`);
        
        return {
          success: true,
          tags: allTags,
        };
      },
    },
  },
  
  triggers: {
    /**
     * New contact trigger (webhook-based)
     * HubSpot sends webhooks with subscriptionType like 'contact.creation'
     */
    newContact: {
      name: 'newContact',
      displayName: 'New Contact',
      description: 'Triggers when a new contact is created in HubSpot',
      type: 'WEBHOOK',
      props: {},
      /**
       * Filter incoming webhooks to only handle new contact events.
       */
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        // HubSpot webhook payload can be an array of events
        const events = Array.isArray(payload.body) ? payload.body : [payload.body];
        return events.some(event => {
          const subType = event?.subscriptionType || event?.eventType || '';
          const normalizedType = String(subType).toLowerCase();
          return normalizedType.includes('contact') && normalizedType.includes('creation');
        });
      },
      async run(context: any) {
        const events = Array.isArray(context.webhookPayload?.body) 
          ? context.webhookPayload.body 
          : [context.webhookPayload?.body];
        return events
          .filter((e: any) => e?.subscriptionType?.includes('contact.creation'))
          .map((e: any) => ({
            contactId: e.objectId,
            event: 'newContact',
            raw: e
          }));
      },
    },
    
    /**
     * Contact updated trigger
     */
    contactUpdated: {
      name: 'contactUpdated',
      displayName: 'Contact Updated',
      description: 'Triggers when a contact is updated in HubSpot',
      type: 'WEBHOOK',
      props: {},
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const events = Array.isArray(payload.body) ? payload.body : [payload.body];
        return events.some(event => {
          const subType = event?.subscriptionType || event?.eventType || '';
          const normalizedType = String(subType).toLowerCase();
          return normalizedType.includes('contact') && 
                 (normalizedType.includes('update') || normalizedType.includes('propertychange'));
        });
      },
      async run(context: any) {
        const events = Array.isArray(context.webhookPayload?.body) 
          ? context.webhookPayload.body 
          : [context.webhookPayload?.body];
        return events
          .filter((e: any) => e?.subscriptionType?.includes('contact.'))
          .map((e: any) => ({
            contactId: e.objectId,
            propertyChanged: e.propertyName,
            event: 'contactUpdated',
            raw: e
          }));
      },
    },
    
    /**
     * New deal trigger
     */
    newDeal: {
      name: 'newDeal',
      displayName: 'New Deal',
      description: 'Triggers when a new deal is created in HubSpot',
      type: 'WEBHOOK',
      props: {},
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const events = Array.isArray(payload.body) ? payload.body : [payload.body];
        return events.some(event => {
          const subType = event?.subscriptionType || event?.eventType || '';
          const normalizedType = String(subType).toLowerCase();
          return normalizedType.includes('deal') && normalizedType.includes('creation');
        });
      },
      async run(context: any) {
        const events = Array.isArray(context.webhookPayload?.body) 
          ? context.webhookPayload.body 
          : [context.webhookPayload?.body];
        return events
          .filter((e: any) => e?.subscriptionType?.includes('deal.creation'))
          .map((e: any) => ({
            dealId: e.objectId,
            event: 'newDeal',
            raw: e
          }));
      },
    },
    
    /**
     * Deal stage changed trigger
     */
    dealStageChanged: {
      name: 'dealStageChanged',
      displayName: 'Deal Stage Changed',
      description: 'Triggers when a deal stage changes in HubSpot',
      type: 'WEBHOOK',
      props: {},
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const events = Array.isArray(payload.body) ? payload.body : [payload.body];
        return events.some(event => {
          const subType = event?.subscriptionType || event?.eventType || '';
          const propName = event?.propertyName || '';
          const normalizedType = String(subType).toLowerCase();
          return normalizedType.includes('deal') && 
                 (normalizedType.includes('stage') || propName === 'dealstage');
        });
      },
      async run(context: any) {
        const events = Array.isArray(context.webhookPayload?.body) 
          ? context.webhookPayload.body 
          : [context.webhookPayload?.body];
        return events
          .filter((e: any) => e?.subscriptionType?.includes('deal.') && e?.propertyName === 'dealstage')
          .map((e: any) => ({
            dealId: e.objectId,
            previousStage: e.propertyValue,
            event: 'dealStageChanged',
            raw: e
          }));
      },
    },
  },
};

export const hubspot = hubspotBit;
export default hubspotBit;
