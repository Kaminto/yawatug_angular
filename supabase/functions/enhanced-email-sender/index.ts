import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Connection pooling and caching
const connectionPool = new Map<string, any>();
const templateCache = new Map<string, any>();
const providerCache = new Map<string, any>();
const budgetCache = new Map<string, any>();

// Cache TTL (Time To Live) configurations
const CACHE_TTL = {
  TEMPLATES: 5 * 60 * 1000, // 5 minutes
  PROVIDERS: 10 * 60 * 1000, // 10 minutes  
  BUDGET: 1 * 60 * 1000, // 1 minute
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  templateType?: string;
  templateVariables?: Record<string, string>;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  priority?: 'high' | 'normal' | 'low';
  // For consent invitations
  consentData?: {
    club_allocation_id: string;
    club_member_id: string;
    phone: string;
    member_name: string;
    allocated_shares: number;
    debt_amount: number;
  };
}

interface EmailProvider {
  id: string;
  name: string;
  provider_type: string;
  api_endpoint: string;
  cost_per_email: number;
  configuration: any;
  priority: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  template_type: string;
  subject: string;
  html_content: string;
  text_content: string;
  variables: any;
}

interface CachedItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Global Supabase client for connection reuse
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Global Resend client for connection reuse
let resendClient: Resend | null = null;
const initializeResend = () => {
  if (!resendClient) {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (apiKey) {
      resendClient = new Resend(apiKey);
    }
  }
  return resendClient;
};

// Cache utility functions
const setCacheItem = <T>(cache: Map<string, CachedItem<T>>, key: string, data: T, ttl: number) => {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
};

const getCacheItem = <T>(cache: Map<string, CachedItem<T>>, key: string): T | null => {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() - item.timestamp > item.ttl) {
    cache.delete(key);
    return null;
  }
  
  return item.data;
};

// Enhanced budget check with caching
const checkEmailBudget = async (): Promise<any> => {
  const cacheKey = 'email_budget';
  const cached = getCacheItem(budgetCache, cacheKey);
  
  if (cached) {
    return cached;
  }

  const { data: budgetData, error: budgetError } = await supabase
    .from('email_budget_controls')
    .select('*')
    .eq('is_active', true)
    .eq('budget_type', 'general')
    .single();

  if (budgetError && budgetError.code !== 'PGRST116') {
    throw new Error('Failed to check email budget');
  }

  setCacheItem(budgetCache, cacheKey, budgetData, CACHE_TTL.BUDGET);
  return budgetData;
};

// Enhanced provider fetching with caching
const getEmailProviders = async (): Promise<EmailProvider[]> => {
  const cacheKey = 'email_providers';
  const cached = getCacheItem(providerCache, cacheKey);
  
  if (cached) {
    return cached as EmailProvider[];
  }

  const { data: providers, error: providersError } = await supabase
    .from('email_providers')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (providersError) {
    throw new Error('Failed to fetch email providers');
  }

  const providerData = providers || [];
  setCacheItem(providerCache, cacheKey, providerData, CACHE_TTL.PROVIDERS);
  return providerData;
};

// Enhanced template fetching with caching
const getEmailTemplate = async (templateType: string): Promise<EmailTemplate | null> => {
  const cacheKey = `template_${templateType}`;
  const cached = getCacheItem(templateCache, cacheKey);
  
  if (cached) {
    return cached as EmailTemplate;
  }

  const { data: templateData, error: templateError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_type', templateType)
    .eq('is_active', true)
    .single();

  if (templateError && templateError.code !== 'PGRST116') {
    console.error('Template fetch error:', templateError);
    return null;
  }

  const template = templateData || null;
  setCacheItem(templateCache, cacheKey, template, CACHE_TTL.TEMPLATES);
  return template;
};

// Optimized template variable replacement using regex compilation
const replaceTemplateVariables = (content: string, variables: Record<string, string>): string => {
  // Compile all regexes once for better performance
  const replacements = Object.entries(variables).map(([key, value]) => ({
    regex: new RegExp(`{{${key}}}`, 'g'),
    value
  }));

  let result = content;
  for (const { regex, value } of replacements) {
    result = result.replace(regex, value);
  }
  
  return result;
};

// Optimized email sending with connection reuse
const sendViaProvider = async (
  provider: EmailProvider,
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string
): Promise<{ success: boolean; response?: any; error?: string; cost: number }> => {
  
  if (provider.provider_type === 'resend') {
    const resend = initializeResend();
    if (!resend) {
      throw new Error('Resend API key not configured');
    }

    const fromEmail = provider.configuration?.from_domain || "admin@yawatug.com";

    const emailResponse = await resend.emails.send({
      from: `Yawatu <${fromEmail}>`,
      to: [to],
      subject,
      html: htmlContent,
      text: textContent,
    });

    return {
      success: true,
      response: emailResponse,
      cost: provider.cost_per_email || 0.0001
    };

  } else if (provider.provider_type === 'sendgrid') {
    const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");
    if (!sendgridApiKey) {
      throw new Error('SendGrid API key not configured');
    }

    const fromEmail = provider.configuration?.from_email || "admin@yawatug.com";

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: to }],
          subject: subject,
        }],
        from: { email: fromEmail, name: 'Yawatu' },
        content: [
          {
            type: 'text/html',
            value: htmlContent,
          },
          ...(textContent ? [{
            type: 'text/plain',
            value: textContent,
          }] : [])
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }

    return {
      success: true,
      response: { message_id: response.headers.get('x-message-id') },
      cost: provider.cost_per_email || 0.0000895
    };

  } else {
    throw new Error(`Unsupported provider type: ${provider.provider_type}`);
  }
};

// Async logging to avoid blocking main thread
const logEmailDelivery = async (logData: any) => {
  // Fire and forget logging - don't await to avoid blocking
  supabase
    .from('email_delivery_logs')
    .insert(logData)
    .then(({ error }) => {
      if (error) {
        console.error('Failed to log email delivery:', error);
      }
    });
};

// Async budget update
const updateBudgetSpending = async (budgetData: any, actualCost: number) => {
  // Fire and forget budget update - don't await to avoid blocking
  supabase
    .from('email_budget_controls')
    .update({
      current_spending: (budgetData.current_spending || 0) + actualCost,
      current_daily_count: (budgetData.current_daily_count || 0) + 1,
      current_monthly_count: (budgetData.current_monthly_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', budgetData.id)
    .then(({ error }) => {
      if (error) {
        console.error('Failed to update budget:', error);
      }
    });

  // Invalidate budget cache
  budgetCache.delete('email_budget');
};

// Handle consent invitations with database storage
const handleConsentInvitation = async (to: string, consentData: any, startTime: number): Promise<Response> => {
  try {
    // Generate invitation token
    const invitationToken = crypto.randomUUID().replace(/-/g, '');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const consentUrl = `${Deno.env.get('SITE_URL') || 'https://yawatug.com'}/consent/${invitationToken}`;
    
    console.log('Generated consent invitation:', { 
      token: invitationToken.substring(0, 8) + '...', 
      consentUrl,
      member: consentData.member_name 
    });

    // Store invitation in database
    const { error: insertError } = await supabase
      .from('club_share_consent_invitations')
      .insert({
        club_allocation_id: consentData.club_allocation_id,
        club_member_id: consentData.club_member_id,
        email: to,
        phone: consentData.phone || null,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      });

    if (insertError) {
      console.error('Failed to store consent invitation:', insertError);
      throw new Error(`Failed to store invitation: ${insertError.message}`);
    }

    // Prepare consent email content
    const subject = `Share Allocation Consent Required - Yawatu Minerals & Mining PLC`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0E4D92, #1a5bb8); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; font-size: 28px; margin: 0;">Share Allocation Consent</h1>
        </div>
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
          <p style="color: #333; font-size: 16px; line-height: 1.6;">Dear ${consentData.member_name},</p>
          
          <p style="color: #333; line-height: 1.6;">
            You have been allocated <strong>${consentData.allocated_shares} shares</strong> in Yawatu Minerals & Mining PLC 
            for a debt conversion amount of <strong>UGX ${consentData.debt_amount.toLocaleString()}</strong>.
          </p>
          
          <p style="color: #333; line-height: 1.6;">
            Please review and consent to this share allocation by clicking the button below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${consentUrl}" style="background: #F9B233; color: #0E4D92; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">
              Review & Consent
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            This invitation will expire on ${expiresAt.toLocaleDateString()}. 
            If you have any questions, please contact our support team.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; text-align: center;">
            <p>Best regards,<br><strong>Yawatu Minerals & Mining PLC</strong></p>
            <p>Email: admin@yawatug.com | Website: yawatug.com</p>
          </div>
        </div>
      </div>
    `;

    // Send email using the existing provider system
    const [budgetData, providers] = await Promise.all([
      checkEmailBudget(),
      getEmailProviders()
    ]);

    if (!providers || providers.length === 0) {
      throw new Error('No active email providers configured');
    }

    // Try sending with providers
    let sentSuccessfully = false;
    let usedProvider: EmailProvider | null = null;
    let providerResponse: any = null;
    let actualCost = 0;

    for (const provider of providers) {
      try {
        console.log(`Sending consent email via ${provider.name}`);
        const result = await sendViaProvider(provider, to, subject, htmlContent);
        
        providerResponse = result.response;
        actualCost = result.cost;
        usedProvider = provider;
        sentSuccessfully = true;
        break;
      } catch (error: any) {
        console.error(`Failed to send consent email via ${provider.name}:`, error.message);
        continue;
      }
    }

    if (!sentSuccessfully) {
      throw new Error('All email providers failed for consent invitation');
    }

    // Log successful delivery
    logEmailDelivery({
      email_address: to,
      subject: subject,
      template_id: null,
      provider_id: usedProvider!.id,
      provider_message_id: providerResponse?.id || providerResponse?.message_id,
      status: 'sent',
      cost: actualCost,
      delivery_attempts: 1,
      last_attempt_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      metadata: {
        consent_data: consentData,
        invitation_token: invitationToken,
        consent_url: consentUrl,
        provider_response: providerResponse,
        processing_time_ms: performance.now() - startTime
      }
    });

    // Update budget
    if (budgetData) {
      updateBudgetSpending(budgetData, actualCost);
    }

    const processingTime = performance.now() - startTime;
    console.log(`Consent invitation sent successfully via ${usedProvider!.name} in ${processingTime.toFixed(2)}ms`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Consent invitation sent successfully",
      provider_used: usedProvider!.name,
      cost: actualCost,
      message_id: providerResponse?.id || providerResponse?.message_id,
      invitation_token: invitationToken,
      consent_url: consentUrl,
      processing_time_ms: processingTime.toFixed(2)
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    const processingTime = performance.now() - startTime;
    console.error("Error in consent invitation:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        processing_time_ms: processingTime.toFixed(2)
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();

  try {
    const { to, templateType, templateVariables, subject, htmlContent, textContent, priority = 'normal', consentData }: EmailRequest = await req.json();

    console.log('Enhanced email sender request:', { to, templateType, priority, hasConsentData: !!consentData });

    // Handle special consent invitation case
    if (consentData) {
      return await handleConsentInvitation(to, consentData, startTime);
    }

    // Parallel execution of budget check and provider fetching
    const [budgetData, providers] = await Promise.all([
      checkEmailBudget(),
      getEmailProviders()
    ]);

    // Budget validation
    if (budgetData) {
      const estimatedCost = 0.0001;
      
      if (budgetData.current_daily_count >= (budgetData.max_emails_per_day || 1000)) {
        throw new Error('Daily email limit exceeded');
      }
      
      if (budgetData.current_monthly_count >= (budgetData.max_emails_per_month || 30000)) {
        throw new Error('Monthly email limit exceeded');
      }
      
      if ((budgetData.current_spending + estimatedCost) > budgetData.max_budget) {
        throw new Error('Budget limit would be exceeded');
      }
    }

    if (!providers || providers.length === 0) {
      throw new Error('No active email providers configured');
    }

    // Template fetching (if needed)
    let template: EmailTemplate | null = null;
    if (templateType) {
      template = await getEmailTemplate(templateType);
    }

    // Prepare email content
    let finalSubject = subject;
    let finalHtmlContent = htmlContent;
    let finalTextContent = textContent;

    if (template) {
      finalSubject = template.subject;
      finalHtmlContent = template.html_content;
      finalTextContent = template.text_content;

      // Optimized template variable replacement
      if (templateVariables) {
        finalSubject = replaceTemplateVariables(finalSubject || '', templateVariables);
        finalHtmlContent = replaceTemplateVariables(finalHtmlContent || '', templateVariables);
        finalTextContent = replaceTemplateVariables(finalTextContent || '', templateVariables);
      }
    }

    if (!finalSubject || !finalHtmlContent) {
      throw new Error('Subject and HTML content are required');
    }

    // Try sending with each provider until success
    let lastError: Error | null = null;
    let sentSuccessfully = false;
    let usedProvider: EmailProvider | null = null;
    let providerResponse: any = null;
    let actualCost = 0;

    for (const provider of providers) {
      try {
        console.log(`Attempting to send email via ${provider.name}`);

        const result = await sendViaProvider(provider, to, finalSubject, finalHtmlContent, finalTextContent);
        
        providerResponse = result.response;
        actualCost = result.cost;
        usedProvider = provider;
        sentSuccessfully = true;
        break;

      } catch (error: any) {
        console.error(`Failed to send via ${provider.name}:`, error.message);
        lastError = error;
        
        // Async logging of failed attempt
        logEmailDelivery({
          email_address: to,
          subject: finalSubject,
          template_id: template?.id,
          provider_id: provider.id,
          status: 'failed',
          cost: 0,
          delivery_attempts: 1,
          last_attempt_at: new Date().toISOString(),
          failed_at: new Date().toISOString(),
          error_message: error.message,
          metadata: {
            template_variables: templateVariables,
            provider_error: error.message,
            attempt_timestamp: new Date().toISOString()
          }
        });

        continue; // Try next provider
      }
    }

    if (!sentSuccessfully) {
      throw lastError || new Error('All email providers failed');
    }

    // Async operations for logging and budget updates
    const deliveryLogData = {
      email_address: to,
      subject: finalSubject,
      template_id: template?.id,
      provider_id: usedProvider!.id,
      provider_message_id: providerResponse?.id || providerResponse?.message_id,
      status: 'sent',
      cost: actualCost,
      delivery_attempts: 1,
      last_attempt_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      metadata: {
        template_variables: templateVariables,
        provider_response: providerResponse,
        template_used: template?.name,
        processing_time_ms: performance.now() - startTime
      }
    };

    // Fire async operations
    logEmailDelivery(deliveryLogData);
    if (budgetData) {
      updateBudgetSpending(budgetData, actualCost);
    }

    const processingTime = performance.now() - startTime;
    console.log(`Email sent successfully via ${usedProvider!.name} in ${processingTime.toFixed(2)}ms`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Email sent successfully",
      provider_used: usedProvider!.name,
      cost: actualCost,
      message_id: providerResponse?.id || providerResponse?.message_id,
      processing_time_ms: processingTime.toFixed(2)
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    const processingTime = performance.now() - startTime;
    console.error("Error in enhanced-email-sender function:", error);
    console.error(`Processing time: ${processingTime.toFixed(2)}ms`);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        processing_time_ms: processingTime.toFixed(2)
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);