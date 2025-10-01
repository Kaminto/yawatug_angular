import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SocialPostData {
  content: string;
  platforms: string[];
  media_urls?: string[];
  user_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { content, platforms, media_urls, user_id }: SocialPostData = await req.json()

    if (!content || !platforms || platforms.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Content and platforms are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user's social connections
    const { data: connections, error: connectionsError } = await supabaseClient
      .from('social_connections')
      .select('*')
      .eq('user_id', user_id)
      .in('platform', platforms)
      .eq('is_active', true)

    if (connectionsError) {
      throw connectionsError
    }

    const results = []

    for (const connection of connections) {
      try {
        let postResult = null

        switch (connection.platform) {
          case 'facebook':
            postResult = await postToFacebook(connection, content, media_urls)
            break
          case 'twitter':
            postResult = await postToTwitter(connection, content, media_urls)
            break
          case 'linkedin':
            postResult = await postToLinkedIn(connection, content, media_urls)
            break
          case 'instagram':
            postResult = await postToInstagram(connection, content, media_urls)
            break
          default:
            throw new Error(`Unsupported platform: ${connection.platform}`)
        }

        results.push({
          platform: connection.platform,
          success: true,
          post_id: postResult?.id || null,
          message: 'Posted successfully'
        })

        // Log successful post
        await supabaseClient
          .from('social_media_posts')
          .insert({
            user_id,
            platform: connection.platform,
            content,
            media_urls,
            external_post_id: postResult?.id,
            status: 'published',
            published_at: new Date().toISOString()
          })

      } catch (error) {
        console.error(`Failed to post to ${connection.platform}:`, error)
        results.push({
          platform: connection.platform,
          success: false,
          error: (error as Error).message
        })

        // Log failed post
        await supabaseClient
          .from('social_media_posts')
          .insert({
            user_id,
            platform: connection.platform,
            content,
            media_urls,
            status: 'failed',
            error_message: (error as Error).message
          })
      }
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Social media post error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function postToFacebook(connection: any, content: string, media_urls?: string[]) {
  const accessToken = connection.access_token
  const pageId = connection.page_id || 'me'

  const params = new URLSearchParams({
    message: content,
    access_token: accessToken
  })

  if (media_urls && media_urls.length > 0) {
    params.append('link', media_urls[0])
  }

  const response = await fetch(`https://graph.facebook.com/v18.0/${pageId}/feed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error?.message || 'Facebook API error')
  }

  return result
}

async function postToTwitter(connection: any, content: string, media_urls?: string[]) {
  // Note: Twitter API v2 requires OAuth 2.0 and specific implementation
  // This is a placeholder for the actual Twitter integration
  throw new Error('Twitter integration not implemented yet')
}

async function postToLinkedIn(connection: any, content: string, media_urls?: string[]) {
  const accessToken = connection.access_token
  const personUrn = connection.person_urn

  const postData = {
    author: personUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: {
          text: content
        },
        shareMediaCategory: 'NONE'
      }
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
    }
  }

    if (media_urls && media_urls.length > 0) {
      postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'ARTICLE';
      (postData.specificContent['com.linkedin.ugc.ShareContent'] as any).media = [{
        status: 'READY',
        originalUrl: media_urls[0]
      }];
    }

  const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify(postData)
  })

  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.message || 'LinkedIn API error')
  }

  return result
}

async function postToInstagram(connection: any, content: string, media_urls?: string[]) {
  // Instagram posting requires Facebook Graph API and specific media handling
  // This is a placeholder for the actual Instagram integration
  throw new Error('Instagram integration not implemented yet')
}