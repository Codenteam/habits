/**
 * @ha-bits/bit-salesforce
 * 
 * Salesforce CRM integration bit.
 * Implements the @ha-bits/bit-crm L0 interface for Salesforce.
 * 
 * Features:
 * - Contact management (create, update, get, list)
 * - Lead management (create, update, convert)
 * - Opportunity management (create, update)
 * - Account management
 * 
 * Level: L1 (Implements bit-crm interface)
 */

import type {
  CRMContext,
  Lead,
  Contact,
  Deal,
  Opportunity,
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
  CreateOpportunityResult,
  AddTagResult,
  CreateNoteResult,
} from '@ha-bits/bit-crm';

interface SalesforceContext extends CRMContext {
  auth: {
    accessToken: string;
    instanceUrl: string;
  };
}

/**
 * Make a Salesforce API request
 */
async function salesforceRequest(
  instanceUrl: string,
  endpoint: string,
  accessToken: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const url = `${instanceUrl}/services/data/v59.0${endpoint}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  };
  
  if (body && ['POST', 'PATCH'].includes(method)) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Salesforce API error: ${response.status} - ${error}`);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }
  
  return response.json();
}

/**
 * Run a SOQL query
 */
async function salesforceQuery(
  instanceUrl: string,
  accessToken: string,
  soql: string
): Promise<any> {
  const encoded = encodeURIComponent(soql);
  return salesforceRequest(instanceUrl, `/query?q=${encoded}`, accessToken);
}

const salesforceBit = {
  // Unique identifier for webhook routing: /webhook/v/salesforce
  id: 'salesforce',
  displayName: 'Salesforce CRM',
  description: 'Salesforce CRM integration for contacts, leads, and opportunities',
  logoUrl: 'lucide:Cloud',
  runtime: 'all',
  replaces: '@ha-bits/bit-crm',
  
  auth: {
    type: 'OAUTH2' as const,
    displayName: 'Salesforce OAuth',
    description: 'Connect your Salesforce account',
    required: true,
    authUrl: 'https://login.salesforce.com/services/oauth2/authorize',
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    scope: ['api', 'refresh_token'],
    extraAuthParams: {
      response_type: 'code',
    },
  },
  
  actions: {
    /**
     * Create a new lead
     */
    createLead: {
      name: 'createLead',
      displayName: 'Create Lead',
      description: 'Create a new lead in Salesforce',
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
          required: true,
        },
        company: {
          type: 'SHORT_TEXT',
          displayName: 'Company',
          required: true,
        },
        phone: {
          type: 'SHORT_TEXT',
          displayName: 'Phone',
          required: false,
        },
        title: {
          type: 'SHORT_TEXT',
          displayName: 'Title',
          description: 'Job title',
          required: false,
        },
        source: {
          type: 'SHORT_TEXT',
          displayName: 'Lead Source',
          description: 'Source of the lead',
          required: false,
        },
        status: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Status',
          required: false,
          defaultValue: 'Open - Not Contacted',
          options: {
            options: [
              { label: 'Open - Not Contacted', value: 'Open - Not Contacted' },
              { label: 'Working - Contacted', value: 'Working - Contacted' },
              { label: 'Closed - Converted', value: 'Closed - Converted' },
              { label: 'Closed - Not Converted', value: 'Closed - Not Converted' },
            ],
          },
        },
      },
      async run(context: SalesforceContext): Promise<CreateLeadResult> {
        const { email, firstName, lastName, company, phone, title, source, status } = context.propsValue;
        
        const leadData: Record<string, any> = {
          Email: email,
          LastName: lastName,
          Company: company,
        };
        if (firstName) leadData.FirstName = firstName;
        if (phone) leadData.Phone = phone;
        if (title) leadData.Title = title;
        if (source) leadData.LeadSource = source;
        if (status) leadData.Status = status;
        
        const result = await salesforceRequest(
          context.auth.instanceUrl,
          '/sobjects/Lead',
          context.auth.accessToken,
          'POST',
          leadData
        );
        
        console.log(`☁️ Salesforce: Created lead ${result.id} - ${email}`);
        
        const lead: Lead = {
          id: result.id,
          email,
          firstName,
          lastName,
          company,
          phone,
          source,
          status: status || 'Open - Not Contacted',
          createdAt: new Date().toISOString(),
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
      description: 'Get a lead from Salesforce by ID or email',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          description: 'Salesforce Lead ID',
          required: false,
        },
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
          description: 'Lead email',
          required: false,
        },
      },
      async run(context: SalesforceContext): Promise<GetLeadResult> {
        const { leadId, email } = context.propsValue;
        
        try {
          let data;
          
          if (leadId) {
            data = await salesforceRequest(
              context.auth.instanceUrl,
              `/sobjects/Lead/${leadId}`,
              context.auth.accessToken
            );
          } else if (email) {
            const result = await salesforceQuery(
              context.auth.instanceUrl,
              context.auth.accessToken,
              `SELECT Id, Email, FirstName, LastName, Company, Phone, Status, LeadSource, CreatedDate FROM Lead WHERE Email = '${email}' LIMIT 1`
            );
            
            if (result.records?.length > 0) {
              data = result.records[0];
            }
          }
          
          if (!data) {
            console.log(`☁️ Salesforce: Lead not found`);
            return { found: false, lead: null };
          }
          
          const lead: Lead = {
            id: data.Id,
            email: data.Email,
            firstName: data.FirstName,
            lastName: data.LastName,
            company: data.Company,
            phone: data.Phone,
            status: data.Status,
            source: data.LeadSource,
            createdAt: data.CreatedDate,
          };
          
          console.log(`☁️ Salesforce: Found lead ${lead.id}`);
          return { found: true, lead };
        } catch (error) {
          console.log(`☁️ Salesforce: Lead not found`);
          return { found: false, lead: null };
        }
      },
    },
    
    /**
     * Update a lead
     */
    updateLead: {
      name: 'updateLead',
      displayName: 'Update Lead',
      description: 'Update an existing lead in Salesforce',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          description: 'Salesforce Lead ID',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Fields to update. Use Salesforce field names (FirstName, LastName, Email, etc.)',
          required: true,
        },
      },
      async run(context: SalesforceContext): Promise<UpdateLeadResult> {
        const { leadId, updates } = context.propsValue;
        
        let updateData = updates;
        if (typeof updates === 'string') {
          updateData = JSON.parse(updates);
        }
        
        await salesforceRequest(
          context.auth.instanceUrl,
          `/sobjects/Lead/${leadId}`,
          context.auth.accessToken,
          'PATCH',
          updateData
        );
        
        // Fetch updated record
        const data = await salesforceRequest(
          context.auth.instanceUrl,
          `/sobjects/Lead/${leadId}`,
          context.auth.accessToken
        );
        
        console.log(`☁️ Salesforce: Updated lead ${leadId}`);
        
        const lead: Lead = {
          id: data.Id,
          email: data.Email,
          firstName: data.FirstName,
          lastName: data.LastName,
          company: data.Company,
          phone: data.Phone,
          status: data.Status,
          source: data.LeadSource,
          updatedAt: new Date().toISOString(),
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
      description: 'List leads from Salesforce with optional filters',
      props: {
        status: {
          type: 'SHORT_TEXT',
          displayName: 'Status Filter',
          description: 'Filter by status',
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
      async run(context: SalesforceContext): Promise<ListLeadsResult> {
        const { status, limit = 50 } = context.propsValue;
        
        let soql = `SELECT Id, Email, FirstName, LastName, Company, Phone, Status, LeadSource, CreatedDate FROM Lead`;
        if (status) {
          soql += ` WHERE Status = '${status}'`;
        }
        soql += ` ORDER BY CreatedDate DESC LIMIT ${limit}`;
        
        const result = await salesforceQuery(
          context.auth.instanceUrl,
          context.auth.accessToken,
          soql
        );
        
        const leads: Lead[] = (result.records || []).map((r: any) => ({
          id: r.Id,
          email: r.Email,
          firstName: r.FirstName,
          lastName: r.LastName,
          company: r.Company,
          phone: r.Phone,
          status: r.Status,
          source: r.LeadSource,
          createdAt: r.CreatedDate,
        }));
        
        console.log(`☁️ Salesforce: Listed ${leads.length} leads`);
        
        return {
          leads,
          count: leads.length,
        };
      },
    },
    
    /**
     * Create a contact
     */
    createContact: {
      name: 'createContact',
      displayName: 'Create Contact',
      description: 'Create a new contact in Salesforce',
      props: {
        email: {
          type: 'SHORT_TEXT',
          displayName: 'Email',
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
          required: true,
        },
        accountId: {
          type: 'SHORT_TEXT',
          displayName: 'Account ID',
          description: 'Associated Account ID',
          required: false,
        },
        phone: {
          type: 'SHORT_TEXT',
          displayName: 'Phone',
          required: false,
        },
        title: {
          type: 'SHORT_TEXT',
          displayName: 'Title',
          required: false,
        },
      },
      async run(context: SalesforceContext): Promise<CreateContactResult> {
        const { email, firstName, lastName, accountId, phone, title } = context.propsValue;
        
        const contactData: Record<string, any> = {
          Email: email,
          LastName: lastName,
        };
        if (firstName) contactData.FirstName = firstName;
        if (accountId) contactData.AccountId = accountId;
        if (phone) contactData.Phone = phone;
        if (title) contactData.Title = title;
        
        const result = await salesforceRequest(
          context.auth.instanceUrl,
          '/sobjects/Contact',
          context.auth.accessToken,
          'POST',
          contactData
        );
        
        console.log(`☁️ Salesforce: Created contact ${result.id} - ${email}`);
        
        const contact: Contact = {
          id: result.id,
          email,
          firstName,
          lastName,
          phone,
          createdAt: new Date().toISOString(),
        };
        
        return { success: true, contact };
      },
    },
    
    /**
     * Get a contact
     */
    getContact: {
      name: 'getContact',
      displayName: 'Get Contact',
      description: 'Get a contact from Salesforce by ID or email',
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
      },
      async run(context: SalesforceContext): Promise<GetContactResult> {
        const { contactId, email } = context.propsValue;
        
        try {
          let data;
          
          if (contactId) {
            data = await salesforceRequest(
              context.auth.instanceUrl,
              `/sobjects/Contact/${contactId}`,
              context.auth.accessToken
            );
          } else if (email) {
            const result = await salesforceQuery(
              context.auth.instanceUrl,
              context.auth.accessToken,
              `SELECT Id, Email, FirstName, LastName, Phone, Title, AccountId, CreatedDate FROM Contact WHERE Email = '${email}' LIMIT 1`
            );
            
            if (result.records?.length > 0) {
              data = result.records[0];
            }
          }
          
          if (!data) {
            console.log(`☁️ Salesforce: Contact not found`);
            return { found: false, contact: null };
          }
          
          const contact: Contact = {
            id: data.Id,
            email: data.Email,
            firstName: data.FirstName,
            lastName: data.LastName,
            phone: data.Phone,
            createdAt: data.CreatedDate,
          };
          
          console.log(`☁️ Salesforce: Found contact ${contact.id}`);
          return { found: true, contact };
        } catch (error) {
          console.log(`☁️ Salesforce: Contact not found`);
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
      description: 'Update an existing contact in Salesforce',
      props: {
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Fields to update (use Salesforce field names)',
          required: true,
        },
      },
      async run(context: SalesforceContext): Promise<UpdateContactResult> {
        const { contactId, updates } = context.propsValue;
        
        let updateData = updates;
        if (typeof updates === 'string') {
          updateData = JSON.parse(updates);
        }
        
        await salesforceRequest(
          context.auth.instanceUrl,
          `/sobjects/Contact/${contactId}`,
          context.auth.accessToken,
          'PATCH',
          updateData
        );
        
        const data = await salesforceRequest(
          context.auth.instanceUrl,
          `/sobjects/Contact/${contactId}`,
          context.auth.accessToken
        );
        
        console.log(`☁️ Salesforce: Updated contact ${contactId}`);
        
        const contact: Contact = {
          id: data.Id,
          email: data.Email,
          firstName: data.FirstName,
          lastName: data.LastName,
          phone: data.Phone,
          updatedAt: new Date().toISOString(),
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
      description: 'List contacts from Salesforce',
      props: {
        query: {
          type: 'SHORT_TEXT',
          displayName: 'Search Query',
          description: 'Search by name or email',
          required: false,
        },
        accountId: {
          type: 'SHORT_TEXT',
          displayName: 'Account ID',
          description: 'Filter by account',
          required: false,
        },
        limit: {
          type: 'NUMBER',
          displayName: 'Limit',
          required: false,
          defaultValue: 50,
        },
      },
      async run(context: SalesforceContext): Promise<ListContactsResult> {
        const { query, accountId, limit = 50 } = context.propsValue;
        
        let soql = `SELECT Id, Email, FirstName, LastName, Phone, Title, AccountId, CreatedDate FROM Contact`;
        const conditions: string[] = [];
        
        if (accountId) {
          conditions.push(`AccountId = '${accountId}'`);
        }
        if (query) {
          conditions.push(`(Email LIKE '%${query}%' OR Name LIKE '%${query}%')`);
        }
        
        if (conditions.length > 0) {
          soql += ` WHERE ${conditions.join(' AND ')}`;
        }
        soql += ` ORDER BY CreatedDate DESC LIMIT ${limit}`;
        
        const result = await salesforceQuery(
          context.auth.instanceUrl,
          context.auth.accessToken,
          soql
        );
        
        const contacts: Contact[] = (result.records || []).map((r: any) => ({
          id: r.Id,
          email: r.Email,
          firstName: r.FirstName,
          lastName: r.LastName,
          phone: r.Phone,
          createdAt: r.CreatedDate,
        }));
        
        console.log(`☁️ Salesforce: Listed ${contacts.length} contacts`);
        
        return {
          contacts,
          count: contacts.length,
        };
      },
    },
    
    /**
     * Create an opportunity
     */
    createOpportunity: {
      name: 'createOpportunity',
      displayName: 'Create Opportunity',
      description: 'Create a new opportunity in Salesforce',
      props: {
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Opportunity Name',
          required: true,
        },
        amount: {
          type: 'NUMBER',
          displayName: 'Amount',
          required: false,
        },
        stage: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Stage',
          required: true,
          options: {
            options: [
              { label: 'Prospecting', value: 'Prospecting' },
              { label: 'Qualification', value: 'Qualification' },
              { label: 'Needs Analysis', value: 'Needs Analysis' },
              { label: 'Value Proposition', value: 'Value Proposition' },
              { label: 'Id. Decision Makers', value: 'Id. Decision Makers' },
              { label: 'Perception Analysis', value: 'Perception Analysis' },
              { label: 'Proposal/Price Quote', value: 'Proposal/Price Quote' },
              { label: 'Negotiation/Review', value: 'Negotiation/Review' },
              { label: 'Closed Won', value: 'Closed Won' },
              { label: 'Closed Lost', value: 'Closed Lost' },
            ],
          },
        },
        closeDate: {
          type: 'SHORT_TEXT',
          displayName: 'Close Date',
          description: 'Expected close date (YYYY-MM-DD)',
          required: true,
        },
        accountId: {
          type: 'SHORT_TEXT',
          displayName: 'Account ID',
          description: 'Associated Account ID',
          required: false,
        },
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          description: 'Primary Contact ID',
          required: false,
        },
      },
      async run(context: SalesforceContext): Promise<CreateOpportunityResult> {
        const { name, amount, stage, closeDate, accountId, contactId } = context.propsValue;
        
        const oppData: Record<string, any> = {
          Name: name,
          StageName: stage,
          CloseDate: closeDate,
        };
        if (amount) oppData.Amount = Number(amount);
        if (accountId) oppData.AccountId = accountId;
        
        const result = await salesforceRequest(
          context.auth.instanceUrl,
          '/sobjects/Opportunity',
          context.auth.accessToken,
          'POST',
          oppData
        );
        
        // Associate with contact if provided
        if (contactId) {
          await salesforceRequest(
            context.auth.instanceUrl,
            '/sobjects/OpportunityContactRole',
            context.auth.accessToken,
            'POST',
            {
              OpportunityId: result.id,
              ContactId: contactId,
              IsPrimary: true,
            }
          );
        }
        
        console.log(`☁️ Salesforce: Created opportunity ${result.id} - ${name}`);
        
        const opportunity: Opportunity = {
          id: result.id,
          name,
          value: amount ? Number(amount) : undefined,
          stage,
          contactId,
          createdAt: new Date().toISOString(),
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
      description: 'Update an existing opportunity in Salesforce',
      props: {
        opportunityId: {
          type: 'SHORT_TEXT',
          displayName: 'Opportunity ID',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          description: 'Fields to update (use Salesforce field names like StageName, Amount)',
          required: true,
        },
      },
      async run(context: SalesforceContext) {
        const { opportunityId, updates } = context.propsValue;
        
        let updateData = updates;
        if (typeof updates === 'string') {
          updateData = JSON.parse(updates);
        }
        
        await salesforceRequest(
          context.auth.instanceUrl,
          `/sobjects/Opportunity/${opportunityId}`,
          context.auth.accessToken,
          'PATCH',
          updateData
        );
        
        console.log(`☁️ Salesforce: Updated opportunity ${opportunityId}`);
        
        return { success: true, opportunityId };
      },
    },
    
    /**
     * Create a deal (alias for createOpportunity)
     */
    createDeal: {
      name: 'createDeal',
      displayName: 'Create Deal',
      description: 'Create a new deal/opportunity in Salesforce',
      props: {
        name: {
          type: 'SHORT_TEXT',
          displayName: 'Deal Name',
          required: true,
        },
        amount: {
          type: 'NUMBER',
          displayName: 'Amount',
          required: false,
        },
        stage: {
          type: 'SHORT_TEXT',
          displayName: 'Stage',
          description: 'Deal stage (Salesforce stage name)',
          required: false,
          defaultValue: 'Prospecting',
        },
        closeDate: {
          type: 'SHORT_TEXT',
          displayName: 'Close Date',
          description: 'Expected close date (YYYY-MM-DD)',
          required: true,
        },
        contactId: {
          type: 'SHORT_TEXT',
          displayName: 'Contact ID',
          required: false,
        },
      },
      async run(context: SalesforceContext): Promise<CreateDealResult> {
        const { name, amount, stage = 'Prospecting', closeDate, contactId } = context.propsValue;
        
        const result = await salesforceBit.actions.createOpportunity.run({
          ...context,
          propsValue: { name, amount, stage, closeDate, contactId },
        } as any);
        
        const deal: Deal = {
          id: result.opportunity.id,
          name: result.opportunity.name,
          amount: result.opportunity.value,
          stage: result.opportunity.stage,
          closeDate,
          contactId,
          createdAt: result.opportunity.createdAt,
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
      description: 'Update an existing deal/opportunity in Salesforce',
      props: {
        dealId: {
          type: 'SHORT_TEXT',
          displayName: 'Deal ID',
          required: true,
        },
        updates: {
          type: 'JSON',
          displayName: 'Updates',
          required: true,
        },
      },
      async run(context: SalesforceContext): Promise<UpdateDealResult> {
        const { dealId, updates } = context.propsValue;
        
        await salesforceBit.actions.updateOpportunity.run({
          ...context,
          propsValue: { opportunityId: dealId, updates },
        } as any);
        
        // Fetch updated opportunity
        const data = await salesforceRequest(
          context.auth.instanceUrl,
          `/sobjects/Opportunity/${dealId}`,
          context.auth.accessToken
        );
        
        const deal: Deal = {
          id: data.Id,
          name: data.Name,
          amount: data.Amount,
          stage: data.StageName,
          closeDate: data.CloseDate,
          updatedAt: new Date().toISOString(),
        };
        
        return { success: true, deal };
      },
    },
    
    /**
     * Create a note (Task with subject)
     */
    createNote: {
      name: 'createNote',
      displayName: 'Create Note',
      description: 'Add a note/task to a contact, lead, or opportunity in Salesforce',
      props: {
        entityType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Entity Type',
          required: true,
          options: {
            options: [
              { label: 'Contact', value: 'Contact' },
              { label: 'Lead', value: 'Lead' },
              { label: 'Opportunity', value: 'Opportunity' },
            ],
          },
        },
        entityId: {
          type: 'SHORT_TEXT',
          displayName: 'Entity ID',
          required: true,
        },
        content: {
          type: 'LONG_TEXT',
          displayName: 'Note Content',
          required: true,
        },
      },
      async run(context: SalesforceContext): Promise<CreateNoteResult> {
        const { entityType, entityId, content } = context.propsValue;
        
        // Create a Task as a note
        const taskData: Record<string, any> = {
          Subject: 'Note',
          Description: content,
          Status: 'Completed',
          Priority: 'Normal',
          WhoId: entityType === 'Contact' || entityType === 'Lead' ? entityId : undefined,
          WhatId: entityType === 'Opportunity' ? entityId : undefined,
        };
        
        const result = await salesforceRequest(
          context.auth.instanceUrl,
          '/sobjects/Task',
          context.auth.accessToken,
          'POST',
          taskData
        );
        
        console.log(`☁️ Salesforce: Created note ${result.id} on ${entityType} ${entityId}`);
        
        return {
          success: true,
          noteId: result.id,
        };
      },
    },
    
    /**
     * Add tag (via custom field - Topic)
     */
    addTag: {
      name: 'addTag',
      displayName: 'Add Tag/Topic',
      description: 'Add a topic to a record in Salesforce',
      props: {
        entityType: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Entity Type',
          required: true,
          options: {
            options: [
              { label: 'Lead', value: 'Lead' },
              { label: 'Contact', value: 'Contact' },
              { label: 'Opportunity', value: 'Opportunity' },
            ],
          },
        },
        entityId: {
          type: 'SHORT_TEXT',
          displayName: 'Entity ID',
          required: true,
        },
        tags: {
          type: 'JSON',
          displayName: 'Topics/Tags',
          description: 'Topics to add (array of strings)',
          required: true,
        },
      },
      async run(context: SalesforceContext): Promise<AddTagResult> {
        const { entityType, entityId, tags } = context.propsValue;
        
        let parsedTags = tags;
        if (typeof tags === 'string') {
          parsedTags = JSON.parse(tags);
        }
        
        const addedTags: string[] = [];
        
        // Add topics via TopicAssignment
        for (const tag of parsedTags) {
          try {
            // First, find or create the topic
            const topicResult = await salesforceQuery(
              context.auth.instanceUrl,
              context.auth.accessToken,
              `SELECT Id FROM Topic WHERE Name = '${tag}' LIMIT 1`
            );
            
            let topicId: string;
            if (topicResult.records?.length > 0) {
              topicId = topicResult.records[0].Id;
            } else {
              // Create topic
              const newTopic = await salesforceRequest(
                context.auth.instanceUrl,
                '/sobjects/Topic',
                context.auth.accessToken,
                'POST',
                { Name: tag }
              );
              topicId = newTopic.id;
            }
            
            // Assign topic to entity
            await salesforceRequest(
              context.auth.instanceUrl,
              '/sobjects/TopicAssignment',
              context.auth.accessToken,
              'POST',
              {
                TopicId: topicId,
                EntityId: entityId,
              }
            );
            
            addedTags.push(tag);
          } catch (error) {
            console.log(`☁️ Salesforce: Could not add tag ${tag}: ${error}`);
          }
        }
        
        console.log(`☁️ Salesforce: Added ${addedTags.length} tags to ${entityType} ${entityId}`);
        
        return {
          success: true,
          tags: addedTags,
        };
      },
    },
    
    /**
     * Convert lead to contact/opportunity
     */
    convertLead: {
      name: 'convertLead',
      displayName: 'Convert Lead',
      description: 'Convert a lead to a contact and optionally an opportunity',
      props: {
        leadId: {
          type: 'SHORT_TEXT',
          displayName: 'Lead ID',
          required: true,
        },
        accountId: {
          type: 'SHORT_TEXT',
          displayName: 'Account ID',
          description: 'Existing account to associate (or leave blank to create new)',
          required: false,
        },
        createOpportunity: {
          type: 'CHECKBOX',
          displayName: 'Create Opportunity',
          description: 'Create an opportunity during conversion',
          required: false,
          defaultValue: true,
        },
        opportunityName: {
          type: 'SHORT_TEXT',
          displayName: 'Opportunity Name',
          description: 'Name for the new opportunity (if creating)',
          required: false,
        },
      },
      async run(context: SalesforceContext) {
        const { leadId, accountId, createOpportunity = true, opportunityName } = context.propsValue;
        
        // Use Salesforce Lead Convert API
        const convertRequest = {
          leadId,
          accountId,
          convertedStatus: 'Closed - Converted',
          doNotCreateOpportunity: !createOpportunity,
          opportunityName: opportunityName || undefined,
        };
        
        const result = await salesforceRequest(
          context.auth.instanceUrl,
          '/sobjects/LeadConvert',
          context.auth.accessToken,
          'POST',
          convertRequest
        );
        
        console.log(`☁️ Salesforce: Converted lead ${leadId}`);
        
        return {
          success: true,
          leadId,
          contactId: result.contactId,
          accountId: result.accountId,
          opportunityId: result.opportunityId,
        };
      },
    },
  },
  
  triggers: {
    /**
     * New lead trigger
     * Salesforce outbound messages include sobject type and event info
     */
    newLead: {
      name: 'newLead',
      displayName: 'New Lead',
      description: 'Triggers when a new lead is created in Salesforce',
      type: 'WEBHOOK',
      props: {},
      /**
       * Filter incoming webhooks to only handle new lead events.
       */
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const body = payload.body;
        // Salesforce outbound messages typically have Notification.sObject
        const sObjectType = body?.Notification?.sObject?.$?.['xsi:type'] || 
                           body?.sobjectType || 
                           body?.object || '';
        const event = body?.Notification?.ActionId || body?.event || body?.action || '';
        const normalizedType = String(sObjectType).toLowerCase();
        const normalizedEvent = String(event).toLowerCase();
        return normalizedType.includes('lead') && 
               (normalizedEvent.includes('create') || normalizedEvent.includes('insert') || normalizedEvent.includes('new'));
      },
      async run(context: any) {
        const body = context.webhookPayload?.body;
        const lead = body?.Notification?.sObject || body?.data || body;
        return [{
          lead,
          leadId: lead?.Id,
          event: 'newLead',
          raw: body
        }];
      },
    },
    
    /**
     * New contact trigger
     */
    newContact: {
      name: 'newContact',
      displayName: 'New Contact',
      description: 'Triggers when a new contact is created in Salesforce',
      type: 'WEBHOOK',
      props: {},
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const body = payload.body;
        const sObjectType = body?.Notification?.sObject?.$?.['xsi:type'] || 
                           body?.sobjectType || 
                           body?.object || '';
        const event = body?.Notification?.ActionId || body?.event || body?.action || '';
        const normalizedType = String(sObjectType).toLowerCase();
        const normalizedEvent = String(event).toLowerCase();
        return normalizedType.includes('contact') && 
               (normalizedEvent.includes('create') || normalizedEvent.includes('insert') || normalizedEvent.includes('new'));
      },
      async run(context: any) {
        const body = context.webhookPayload?.body;
        const contact = body?.Notification?.sObject || body?.data || body;
        return [{
          contact,
          contactId: contact?.Id,
          event: 'newContact',
          raw: body
        }];
      },
    },
    
    /**
     * Opportunity stage changed trigger
     */
    opportunityStageChanged: {
      name: 'opportunityStageChanged',
      displayName: 'Opportunity Stage Changed',
      description: 'Triggers when an opportunity stage changes in Salesforce',
      type: 'WEBHOOK',
      props: {},
      filter(payload: { body: any; headers: Record<string, string>; query: Record<string, string>; method: string }): boolean {
        const body = payload.body;
        const sObjectType = body?.Notification?.sObject?.$?.['xsi:type'] || 
                           body?.sobjectType || 
                           body?.object || '';
        const changedFields = body?.Notification?.sObject?.ChangedFields || body?.changedFields || [];
        const normalizedType = String(sObjectType).toLowerCase();
        // Check if it's an opportunity and stage was changed
        const stageChanged = Array.isArray(changedFields) 
          ? changedFields.some((f: string) => f.toLowerCase().includes('stage'))
          : String(changedFields).toLowerCase().includes('stage');
        return normalizedType.includes('opportunity') && 
               (stageChanged || body?.event?.toLowerCase().includes('stage'));
      },
      async run(context: any) {
        const body = context.webhookPayload?.body;
        const opportunity = body?.Notification?.sObject || body?.data || body;
        return [{
          opportunity,
          opportunityId: opportunity?.Id,
          stageName: opportunity?.StageName,
          event: 'opportunityStageChanged',
          raw: body
        }];
      },
    },
  },
};

export const salesforce = salesforceBit;
export default salesforceBit;
