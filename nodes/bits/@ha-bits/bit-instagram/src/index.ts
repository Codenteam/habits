/**
 * @ha-bits/bit-instagram
 * 
 * Instagram integration bit for posting content via Meta Graph API.
 * Supports creating posts, stories, carousels, and managing comments.
 * 
 * Note: Requires a Facebook Page connected to an Instagram Business/Creator Account.
 * 
 * Authentication: OAuth 2.0 with PKCE (via Facebook Login)
 * Required scopes: instagram_basic, instagram_content_publish, pages_show_list
 */

interface InstagramAuth {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number;
}

interface InstagramContext {
  auth?: InstagramAuth;
  propsValue: Record<string, any>;
}

interface ContainerResponse {
  id: string;
}

interface MediaPublishResponse {
  id: string;
}

interface ProfileResponse {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
}

interface InsightsResponse {
  data: Array<{
    name: string;
    period: string;
    values: Array<{
      value: number;
      end_time?: string;
    }>;
    title: string;
    description: string;
    id: string;
  }>;
}

const GRAPH_API_BASE = "https://graph.facebook.com/v19.0";

/**
 * Make a request to Meta Graph API
 */
async function graphRequest(
  endpoint: string,
  method: string,
  accessToken: string,
  params?: Record<string, any>
): Promise<any> {
  let url = `${GRAPH_API_BASE}${endpoint}`;
  
  // Add access token to URL for GET requests
  const urlParams = new URLSearchParams({ access_token: accessToken });
  
  if (method === 'GET' && params) {
    Object.entries(params).forEach(([key, value]) => {
      urlParams.append(key, String(value));
    });
  }
  
  url += `?${urlParams.toString()}`;
  
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (method !== 'GET' && params) {
    options.body = JSON.stringify(params);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Instagram API Error (${response.status}): ${errorText}`);
  }
  
  return response.json();
}

/**
 * Poll for container status until ready or error
 */
async function waitForContainer(
  containerId: string,
  accessToken: string,
  maxWaitSeconds: number = 60
): Promise<void> {
  const startTime = Date.now();
  
  while ((Date.now() - startTime) < maxWaitSeconds * 1000) {
    const status = await graphRequest(
      `/${containerId}`,
      'GET',
      accessToken,
      { fields: 'status_code,status' }
    );
    
    if (status.status_code === 'FINISHED') {
      return;
    }
    
    if (status.status_code === 'ERROR') {
      throw new Error(`Container creation failed: ${status.status || 'Unknown error'}`);
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Timeout waiting for media container to be ready');
}

const instagramBit = {
  displayName: 'Instagram',
  description: 'Post content and manage Instagram presence via Meta Graph API',
  logoUrl: 'lucide:Instagram',
  runtime: 'all',
  
  // OAuth 2.0 PKCE authentication via Facebook Login
  auth: {
    type: 'OAUTH2',
    displayName: 'Instagram/Facebook OAuth',
    description: 'OAuth 2.0 authentication with Facebook/Instagram. Requires a Meta Developer App.',
    required: true,
    authorizationUrl: 'https://www.facebook.com/v19.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v19.0/oauth/access_token',
    // clientId is configured per-user/deployment
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],
  },
  
  actions: {
    /**
     * Create an image post on Instagram
     */
    createPost: {
      name: 'createPost',
      displayName: 'Create Image Post',
      description: 'Create an image post on Instagram',
      props: {
        instagramAccountId: {
          type: 'SHORT_TEXT',
          displayName: 'Instagram Account ID',
          description: 'Instagram Business Account ID',
          required: true,
        },
        imageUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Image URL',
          description: 'Public URL of the image to post (JPEG recommended, max 8MB)',
          required: true,
        },
        caption: {
          type: 'LONG_TEXT',
          displayName: 'Caption',
          description: 'Caption for the post (max 2200 characters, 30 hashtags)',
          required: false,
        },
        locationId: {
          type: 'SHORT_TEXT',
          displayName: 'Location ID',
          description: 'Facebook Page ID of the location (optional)',
          required: false,
        },
      },
      async run(context: InstagramContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Instagram/Facebook OAuth flow first.');
        }
        
        const { instagramAccountId, imageUrl, caption, locationId } = context.propsValue;
        
        // Step 1: Create media container
        const containerParams: Record<string, any> = {
          image_url: imageUrl,
          caption: caption || '',
        };
        
        if (locationId) {
          containerParams.location_id = locationId;
        }
        
        const container = await graphRequest(
          `/${instagramAccountId}/media`,
          'POST',
          context.auth.accessToken,
          containerParams
        ) as ContainerResponse;
        
        // Step 2: Wait for container to be ready
        await waitForContainer(container.id, context.auth.accessToken);
        
        // Step 3: Publish the media
        const published = await graphRequest(
          `/${instagramAccountId}/media_publish`,
          'POST',
          context.auth.accessToken,
          { creation_id: container.id }
        ) as MediaPublishResponse;
        
        return {
          success: true,
          mediaId: published.id,
          containerId: container.id,
          imageUrl,
          caption: caption?.substring(0, 100) + (caption && caption.length > 100 ? '...' : ''),
        };
      },
    },
    
    /**
     * Create a video post (Reel) on Instagram
     */
    createReel: {
      name: 'createReel',
      displayName: 'Create Reel',
      description: 'Create a video Reel on Instagram',
      props: {
        instagramAccountId: {
          type: 'SHORT_TEXT',
          displayName: 'Instagram Account ID',
          description: 'Instagram Business Account ID',
          required: true,
        },
        videoUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Video URL',
          description: 'Public URL of the video (MP4, max 100MB, 15min)',
          required: true,
        },
        caption: {
          type: 'LONG_TEXT',
          displayName: 'Caption',
          description: 'Caption for the reel',
          required: false,
        },
        coverUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Cover Image URL',
          description: 'URL of the cover image (optional)',
          required: false,
        },
        shareToFeed: {
          type: 'CHECKBOX',
          displayName: 'Share to Feed',
          description: 'Also share this reel to the main feed',
          required: false,
          defaultValue: true,
        },
      },
      async run(context: InstagramContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Instagram/Facebook OAuth flow first.');
        }
        
        const { instagramAccountId, videoUrl, caption, coverUrl, shareToFeed = true } = context.propsValue;
        
        // Step 1: Create media container for reel
        const containerParams: Record<string, any> = {
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption || '',
          share_to_feed: shareToFeed,
        };
        
        if (coverUrl) {
          containerParams.cover_url = coverUrl;
        }
        
        const container = await graphRequest(
          `/${instagramAccountId}/media`,
          'POST',
          context.auth.accessToken,
          containerParams
        ) as ContainerResponse;
        
        // Step 2: Wait for video to be processed (longer timeout for videos)
        await waitForContainer(container.id, context.auth.accessToken, 300); // 5 minutes for video
        
        // Step 3: Publish the reel
        const published = await graphRequest(
          `/${instagramAccountId}/media_publish`,
          'POST',
          context.auth.accessToken,
          { creation_id: container.id }
        ) as MediaPublishResponse;
        
        return {
          success: true,
          mediaId: published.id,
          containerId: container.id,
          videoUrl,
          isReel: true,
        };
      },
    },
    
    /**
     * Create a carousel post on Instagram
     */
    createCarousel: {
      name: 'createCarousel',
      displayName: 'Create Carousel',
      description: 'Create a carousel post with multiple images/videos',
      props: {
        instagramAccountId: {
          type: 'SHORT_TEXT',
          displayName: 'Instagram Account ID',
          description: 'Instagram Business Account ID',
          required: true,
        },
        mediaUrls: {
          type: 'LONG_TEXT',
          displayName: 'Media URLs',
          description: 'JSON array of media URLs (2-10 items), e.g., ["url1", "url2"]',
          required: true,
        },
        caption: {
          type: 'LONG_TEXT',
          displayName: 'Caption',
          description: 'Caption for the carousel post',
          required: false,
        },
      },
      async run(context: InstagramContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Instagram/Facebook OAuth flow first.');
        }
        
        const { instagramAccountId, mediaUrls: mediaUrlsJson, caption } = context.propsValue;
        
        // Parse media URLs
        let mediaUrls: string[];
        try {
          mediaUrls = JSON.parse(mediaUrlsJson);
          if (!Array.isArray(mediaUrls) || mediaUrls.length < 2 || mediaUrls.length > 10) {
            throw new Error('Carousel requires 2-10 media items');
          }
        } catch (e) {
          throw new Error(`Invalid mediaUrls JSON: ${e instanceof Error ? e.message : 'parse error'}`);
        }
        
        // Step 1: Create containers for each media item
        const childContainers: string[] = [];
        
        for (const url of mediaUrls) {
          const isVideo = url.match(/\.(mp4|mov|avi)$/i) || url.includes('video');
          
          const containerParams: Record<string, any> = {
            is_carousel_item: true,
          };
          
          if (isVideo) {
            containerParams.media_type = 'VIDEO';
            containerParams.video_url = url;
          } else {
            containerParams.image_url = url;
          }
          
          const container = await graphRequest(
            `/${instagramAccountId}/media`,
            'POST',
            context.auth.accessToken,
            containerParams
          ) as ContainerResponse;
          
          childContainers.push(container.id);
        }
        
        // Step 2: Wait for all containers to be ready
        for (const containerId of childContainers) {
          await waitForContainer(containerId, context.auth.accessToken, 120);
        }
        
        // Step 3: Create the carousel container
        const carouselContainer = await graphRequest(
          `/${instagramAccountId}/media`,
          'POST',
          context.auth.accessToken,
          {
            media_type: 'CAROUSEL',
            children: childContainers.join(','),
            caption: caption || '',
          }
        ) as ContainerResponse;
        
        // Step 4: Publish the carousel
        const published = await graphRequest(
          `/${instagramAccountId}/media_publish`,
          'POST',
          context.auth.accessToken,
          { creation_id: carouselContainer.id }
        ) as MediaPublishResponse;
        
        return {
          success: true,
          mediaId: published.id,
          containerId: carouselContainer.id,
          childContainers,
          itemCount: mediaUrls.length,
        };
      },
    },
    
    /**
     * Reply to a comment on Instagram
     */
    replyToComment: {
      name: 'replyToComment',
      displayName: 'Reply to Comment',
      description: 'Reply to a comment on an Instagram post',
      props: {
        commentId: {
          type: 'SHORT_TEXT',
          displayName: 'Comment ID',
          description: 'ID of the comment to reply to',
          required: true,
        },
        message: {
          type: 'LONG_TEXT',
          displayName: 'Reply Message',
          description: 'The reply message',
          required: true,
        },
      },
      async run(context: InstagramContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Instagram/Facebook OAuth flow first.');
        }
        
        const { commentId, message } = context.propsValue;
        
        const response = await graphRequest(
          `/${commentId}/replies`,
          'POST',
          context.auth.accessToken,
          { message }
        );
        
        return {
          success: true,
          replyId: response.id,
          commentId,
          message,
        };
      },
    },
    
    /**
     * Get Instagram profile information
     */
    getProfile: {
      name: 'getProfile',
      displayName: 'Get Profile',
      description: 'Get Instagram Business Account profile information',
      props: {
        instagramAccountId: {
          type: 'SHORT_TEXT',
          displayName: 'Instagram Account ID',
          description: 'Instagram Business Account ID',
          required: true,
        },
      },
      async run(context: InstagramContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Instagram/Facebook OAuth flow first.');
        }
        
        const { instagramAccountId } = context.propsValue;
        
        const profile = await graphRequest(
          `/${instagramAccountId}`,
          'GET',
          context.auth.accessToken,
          {
            fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count,biography,website',
          }
        ) as ProfileResponse;
        
        return {
          success: true,
          id: profile.id,
          username: profile.username,
          name: profile.name,
          profilePictureUrl: profile.profile_picture_url,
          followers: profile.followers_count,
          following: profile.follows_count,
          mediaCount: profile.media_count,
          biography: profile.biography,
          website: profile.website,
        };
      },
    },
    
    /**
     * Get insights for a media post
     */
    getMediaInsights: {
      name: 'getMediaInsights',
      displayName: 'Get Media Insights',
      description: 'Get analytics insights for an Instagram post',
      props: {
        mediaId: {
          type: 'SHORT_TEXT',
          displayName: 'Media ID',
          description: 'ID of the Instagram post',
          required: true,
        },
      },
      async run(context: InstagramContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Instagram/Facebook OAuth flow first.');
        }
        
        const { mediaId } = context.propsValue;
        
        const insights = await graphRequest(
          `/${mediaId}/insights`,
          'GET',
          context.auth.accessToken,
          {
            metric: 'impressions,reach,engagement,saved,shares,likes,comments,plays,video_views',
          }
        ) as InsightsResponse;
        
        const metrics: Record<string, number> = {};
        insights.data.forEach(item => {
          if (item.values && item.values.length > 0) {
            metrics[item.name] = item.values[0].value;
          }
        });
        
        return {
          success: true,
          mediaId,
          metrics,
        };
      },
    },
    
    /**
     * Get account insights
     */
    getAccountInsights: {
      name: 'getAccountInsights',
      displayName: 'Get Account Insights',
      description: 'Get analytics insights for the Instagram account',
      props: {
        instagramAccountId: {
          type: 'SHORT_TEXT',
          displayName: 'Instagram Account ID',
          description: 'Instagram Business Account ID',
          required: true,
        },
        period: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Period',
          description: 'Time period for insights',
          required: false,
          defaultValue: 'day',
          options: {
            options: [
              { label: 'Day', value: 'day' },
              { label: 'Week', value: 'week' },
              { label: 'Days 28', value: 'days_28' },
            ],
          },
        },
      },
      async run(context: InstagramContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Instagram/Facebook OAuth flow first.');
        }
        
        const { instagramAccountId, period = 'day' } = context.propsValue;
        
        const insights = await graphRequest(
          `/${instagramAccountId}/insights`,
          'GET',
          context.auth.accessToken,
          {
            metric: 'impressions,reach,follower_count,profile_views',
            period,
          }
        ) as InsightsResponse;
        
        const metrics: Record<string, number> = {};
        insights.data.forEach(item => {
          if (item.values && item.values.length > 0) {
            metrics[item.name] = item.values[0].value;
          }
        });
        
        return {
          success: true,
          instagramAccountId,
          period,
          metrics,
        };
      },
    },
  },

  // Empty triggers for now
  triggers: {},
};

export default instagramBit;
