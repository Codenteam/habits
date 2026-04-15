/**
 * @ha-bits/bit-linkedin
 * 
 * LinkedIn integration bit for posting content and managing professional presence.
 * Uses LinkedIn API v2 for posting, media upload, and profile/company management.
 * 
 * Authentication: OAuth 2.0 with PKCE
 * Required scopes: openid, profile, w_member_social
 */

interface LinkedInAuth {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number;
}

interface LinkedInContext {
  auth?: LinkedInAuth;
  propsValue: Record<string, any>;
}

interface LinkedInProfile {
  id: string;
  localizedFirstName?: string;
  localizedLastName?: string;
  profilePicture?: {
    displayImage: string;
  };
}

interface LinkedInPostResponse {
  id: string;
  activity?: string;
}

interface LinkedInUploadResponse {
  value: {
    uploadMechanism: {
      "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
        uploadUrl: string;
        headers: Record<string, string>;
      };
    };
    mediaArtifact: string;
    asset: string;
  };
}

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";
const LINKEDIN_API_REST = "https://api.linkedin.com/rest";

/**
 * Make a request to LinkedIn API
 */
async function linkedInRequest(
  endpoint: string,
  method: string,
  accessToken: string,
  body?: any,
  useRestApi: boolean = false
): Promise<any> {
  const baseUrl = useRestApi ? LINKEDIN_API_REST : LINKEDIN_API_BASE;
  const url = `${baseUrl}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };
  
  if (useRestApi) {
    headers['LinkedIn-Version'] = '202401';
  }
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LinkedIn API Error (${response.status}): ${errorText}`);
  }
  
  // Some endpoints return empty response
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
}

/**
 * Get the authenticated user's profile ID (URN)
 */
async function getProfileUrn(accessToken: string): Promise<string> {
  const profile = await linkedInRequest('/me', 'GET', accessToken);
  return `urn:li:person:${profile.id}`;
}

const linkedInBit = {
  displayName: 'LinkedIn',
  description: 'Post content and manage professional presence on LinkedIn',
  logoUrl: 'lucide:Linkedin',
  runtime: 'all',
  
  // OAuth 2.0 PKCE authentication for LinkedIn API
  auth: {
    type: 'OAUTH2',
    displayName: 'LinkedIn OAuth',
    description: 'OAuth 2.0 authentication with LinkedIn. Requires a LinkedIn Developer App.',
    required: true,
    authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    // clientId is configured per-user/deployment
    scopes: ['openid', 'profile', 'w_member_social'],
  },
  
  actions: {
    /**
     * Create a text post on LinkedIn
     */
    createPost: {
      name: 'createPost',
      displayName: 'Create Post',
      description: 'Create a text post on LinkedIn (personal or company page)',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Post Content',
          description: 'The text content of the post (max 3000 characters)',
          required: true,
        },
        visibility: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Visibility',
          description: 'Who can see this post',
          required: false,
          defaultValue: 'PUBLIC',
          options: {
            options: [
              { label: 'Public', value: 'PUBLIC' },
              { label: 'Connections Only', value: 'CONNECTIONS' },
            ],
          },
        },
        authorUrn: {
          type: 'SHORT_TEXT',
          displayName: 'Author URN (optional)',
          description: 'URN of the author (person or organization). Leave empty to post as yourself.',
          required: false,
        },
      },
      async run(context: LinkedInContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the LinkedIn OAuth flow first.');
        }
        
        const { text, visibility = 'PUBLIC', authorUrn } = context.propsValue;
        
        // Get author URN if not provided
        const author = authorUrn || await getProfileUrn(context.auth.accessToken);
        
        const postBody = {
          author,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text,
              },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility,
          },
        };
        
        const response = await linkedInRequest('/ugcPosts', 'POST', context.auth.accessToken, postBody);
        
        return {
          success: true,
          postId: response.id,
          postUrn: response.id,
          author,
          text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        };
      },
    },
    
    /**
     * Create a post with an image on LinkedIn
     */
    createImagePost: {
      name: 'createImagePost',
      displayName: 'Create Image Post',
      description: 'Create a post with an image on LinkedIn',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Post Content',
          description: 'The text content of the post',
          required: true,
        },
        imageUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Image URL',
          description: 'URL of the image to upload',
          required: true,
        },
        imageTitle: {
          type: 'SHORT_TEXT',
          displayName: 'Image Title',
          description: 'Title for the image',
          required: false,
        },
        imageDescription: {
          type: 'SHORT_TEXT',
          displayName: 'Image Description',
          description: 'Alt text description for the image',
          required: false,
        },
        visibility: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Visibility',
          description: 'Who can see this post',
          required: false,
          defaultValue: 'PUBLIC',
          options: {
            options: [
              { label: 'Public', value: 'PUBLIC' },
              { label: 'Connections Only', value: 'CONNECTIONS' },
            ],
          },
        },
        authorUrn: {
          type: 'SHORT_TEXT',
          displayName: 'Author URN (optional)',
          description: 'URN of the author. Leave empty to post as yourself.',
          required: false,
        },
      },
      async run(context: LinkedInContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the LinkedIn OAuth flow first.');
        }
        
        const { text, imageUrl, imageTitle, imageDescription, visibility = 'PUBLIC', authorUrn } = context.propsValue;
        
        const author = authorUrn || await getProfileUrn(context.auth.accessToken);
        
        // Step 1: Register the image upload
        const registerBody = {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: author,
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent',
            }],
          },
        };
        
        const registerResponse = await linkedInRequest('/assets?action=registerUpload', 'POST', context.auth.accessToken, registerBody) as LinkedInUploadResponse;
        
        const uploadUrl = registerResponse.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const asset = registerResponse.value.asset;
        
        // Step 2: Download the image from the provided URL
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image from ${imageUrl}`);
        }
        const imageBuffer = await imageResponse.arrayBuffer();
        
        // Step 3: Upload the image to LinkedIn
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${context.auth.accessToken}`,
          },
          body: imageBuffer,
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload image to LinkedIn: ${await uploadResponse.text()}`);
        }
        
        // Step 4: Create the post with the uploaded image
        const postBody = {
          author,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text,
              },
              shareMediaCategory: 'IMAGE',
              media: [{
                status: 'READY',
                description: {
                  text: imageDescription || '',
                },
                media: asset,
                title: {
                  text: imageTitle || '',
                },
              }],
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility,
          },
        };
        
        const response = await linkedInRequest('/ugcPosts', 'POST', context.auth.accessToken, postBody);
        
        return {
          success: true,
          postId: response.id,
          postUrn: response.id,
          author,
          asset,
        };
      },
    },
    
    /**
     * Create a post with an article link on LinkedIn
     */
    createArticlePost: {
      name: 'createArticlePost',
      displayName: 'Create Article Post',
      description: 'Create a post with an article/link preview on LinkedIn',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Post Content',
          description: 'The text content of the post',
          required: true,
        },
        articleUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Article URL',
          description: 'URL of the article to share',
          required: true,
        },
        articleTitle: {
          type: 'SHORT_TEXT',
          displayName: 'Article Title',
          description: 'Title for the article preview',
          required: false,
        },
        articleDescription: {
          type: 'LONG_TEXT',
          displayName: 'Article Description',
          description: 'Description for the article preview',
          required: false,
        },
        visibility: {
          type: 'STATIC_DROPDOWN',
          displayName: 'Visibility',
          description: 'Who can see this post',
          required: false,
          defaultValue: 'PUBLIC',
          options: {
            options: [
              { label: 'Public', value: 'PUBLIC' },
              { label: 'Connections Only', value: 'CONNECTIONS' },
            ],
          },
        },
        authorUrn: {
          type: 'SHORT_TEXT',
          displayName: 'Author URN (optional)',
          description: 'URN of the author. Leave empty to post as yourself.',
          required: false,
        },
      },
      async run(context: LinkedInContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the LinkedIn OAuth flow first.');
        }
        
        const { text, articleUrl, articleTitle, articleDescription, visibility = 'PUBLIC', authorUrn } = context.propsValue;
        
        const author = authorUrn || await getProfileUrn(context.auth.accessToken);
        
        const postBody = {
          author,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text,
              },
              shareMediaCategory: 'ARTICLE',
              media: [{
                status: 'READY',
                description: {
                  text: articleDescription || '',
                },
                originalUrl: articleUrl,
                title: {
                  text: articleTitle || '',
                },
              }],
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': visibility,
          },
        };
        
        const response = await linkedInRequest('/ugcPosts', 'POST', context.auth.accessToken, postBody);
        
        return {
          success: true,
          postId: response.id,
          postUrn: response.id,
          author,
          articleUrl,
        };
      },
    },
    
    /**
     * Get the authenticated user's profile
     */
    getProfile: {
      name: 'getProfile',
      displayName: 'Get Profile',
      description: 'Get the authenticated user\'s LinkedIn profile information',
      props: {},
      async run(context: LinkedInContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the LinkedIn OAuth flow first.');
        }
        
        const profile = await linkedInRequest('/me', 'GET', context.auth.accessToken);
        
        // Get profile picture
        let profilePicture;
        try {
          const pictureData = await linkedInRequest(
            '/me?projection=(id,profilePicture(displayImage~digitalmediaAsset:playableStreams))',
            'GET',
            context.auth.accessToken
          );
          if (pictureData.profilePicture?.['displayImage~']?.elements?.[0]?.identifiers?.[0]?.identifier) {
            profilePicture = pictureData.profilePicture['displayImage~'].elements[0].identifiers[0].identifier;
          }
        } catch {
          // Profile picture fetch failed, continue without it
        }
        
        return {
          success: true,
          id: profile.id,
          urn: `urn:li:person:${profile.id}`,
          firstName: profile.localizedFirstName,
          lastName: profile.localizedLastName,
          profilePicture,
        };
      },
    },
    
    /**
     * Delete a LinkedIn post
     */
    deletePost: {
      name: 'deletePost',
      displayName: 'Delete Post',
      description: 'Delete a post from LinkedIn',
      props: {
        postUrn: {
          type: 'SHORT_TEXT',
          displayName: 'Post URN',
          description: 'The URN of the post to delete (e.g., urn:li:share:123456789)',
          required: true,
        },
      },
      async run(context: LinkedInContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the LinkedIn OAuth flow first.');
        }
        
        const { postUrn } = context.propsValue;
        
        // Encode the URN for the URL
        const encodedUrn = encodeURIComponent(postUrn);
        
        await linkedInRequest(`/ugcPosts/${encodedUrn}`, 'DELETE', context.auth.accessToken);
        
        return {
          success: true,
          deletedPostUrn: postUrn,
        };
      },
    },
  },

  // Empty triggers for now
  triggers: {},
};

export default linkedInBit;
