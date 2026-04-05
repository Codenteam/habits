/**
 * @ha-bits/bit-twitter
 * 
 * Twitter/X integration bit for tweeting and social media management.
 * Uses Twitter API v2 for posting tweets, media uploads, and interactions.
 * 
 * Authentication: OAuth 2.0 with PKCE (Authorization Code Flow)
 * Required scopes: tweet.read, tweet.write, users.read, offline.access
 */

interface TwitterAuth {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt?: number;
}

interface TwitterContext {
  auth?: TwitterAuth;
  propsValue: Record<string, any>;
}

interface TweetResponse {
  data: {
    id: string;
    text: string;
    edit_history_tweet_ids?: string[];
  };
}

interface MediaUploadResponse {
  media_id_string: string;
  media_id: number;
  size?: number;
  expires_after_secs?: number;
  processing_info?: {
    state: string;
    check_after_secs?: number;
  };
}

interface UserResponse {
  data: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
    description?: string;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
    };
  };
}

const TWITTER_API_BASE = "https://api.twitter.com/2";
const TWITTER_UPLOAD_BASE = "https://upload.twitter.com/1.1";

/**
 * Make a request to Twitter API v2
 */
async function twitterRequest(
  endpoint: string,
  method: string,
  bearerToken: string,
  body?: any
): Promise<any> {
  const url = `${TWITTER_API_BASE}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${bearerToken}`,
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twitter API Error (${response.status}): ${errorText}`);
  }
  
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
}

/**
 * Upload media to Twitter (requires OAuth 1.0a - using bearer token workaround)
 * Note: For full media upload, OAuth 1.0a with HMAC-SHA1 signature is recommended
 */
async function uploadMedia(
  imageUrl: string,
  bearerToken: string
): Promise<string> {
  // Download the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image from ${imageUrl}`);
  }
  
  const buffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(buffer).toString('base64');
  const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
  
  // For Twitter API v2 media upload, we use the chunked upload endpoint
  // This is simplified - in production, consider using OAuth 1.0a
  const url = `${TWITTER_UPLOAD_BASE}/media/upload.json`;
  
  const formData = new URLSearchParams();
  formData.append('media_data', base64Image);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${bearerToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });
  
  if (!response.ok) {
    throw new Error(`Twitter media upload error: ${await response.text()}`);
  }
  
  const result = await response.json() as MediaUploadResponse;
  return result.media_id_string;
}

const twitterBit = {
  displayName: 'Twitter/X',
  description: 'Post tweets and manage Twitter/X presence',
  logoUrl: 'lucide:Twitter',
  runtime: 'all',
  
  // OAuth 2.0 PKCE authentication for Twitter API v2
  auth: {
    type: 'OAUTH2',
    displayName: 'Twitter OAuth',
    description: 'OAuth 2.0 authentication with Twitter. Requires a Twitter Developer App with OAuth 2.0 enabled.',
    required: true,
    authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    // clientId is configured per-user/deployment
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  },
  
  actions: {
    /**
     * Post a new tweet
     */
    tweet: {
      name: 'tweet',
      displayName: 'Post Tweet',
      description: 'Post a new tweet to Twitter/X',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Tweet Text',
          description: 'The text of the tweet (max 280 characters)',
          required: true,
        },
        replyToTweetId: {
          type: 'SHORT_TEXT',
          displayName: 'Reply To Tweet ID',
          description: 'Optional: ID of tweet to reply to',
          required: false,
        },
        quoteTweetId: {
          type: 'SHORT_TEXT',
          displayName: 'Quote Tweet ID',
          description: 'Optional: ID of tweet to quote',
          required: false,
        },
      },
      async run(context: TwitterContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Twitter OAuth flow first.');
        }
        
        const { text, replyToTweetId, quoteTweetId } = context.propsValue;
        
        const tweetBody: any = { text };
        
        if (replyToTweetId) {
          tweetBody.reply = { in_reply_to_tweet_id: replyToTweetId };
        }
        
        if (quoteTweetId) {
          tweetBody.quote_tweet_id = quoteTweetId;
        }
        
        const response = await twitterRequest('/tweets', 'POST', context.auth.accessToken, tweetBody) as TweetResponse;
        
        return {
          success: true,
          tweetId: response.data.id,
          text: response.data.text,
          url: `https://twitter.com/i/web/status/${response.data.id}`,
        };
      },
    },
    
    /**
     * Post a tweet with media
     */
    tweetWithMedia: {
      name: 'tweetWithMedia',
      displayName: 'Tweet with Media',
      description: 'Post a tweet with an image or video',
      props: {
        text: {
          type: 'LONG_TEXT',
          displayName: 'Tweet Text',
          description: 'The text of the tweet',
          required: true,
        },
        mediaUrl: {
          type: 'SHORT_TEXT',
          displayName: 'Media URL',
          description: 'URL of the image/video to attach',
          required: true,
        },
        altText: {
          type: 'SHORT_TEXT',
          displayName: 'Alt Text',
          description: 'Alternative text for the media (accessibility)',
          required: false,
        },
      },
      async run(context: TwitterContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Twitter OAuth flow first.');
        }
        
        const { text, mediaUrl, altText } = context.propsValue;
        
        // Upload media
        const mediaId = await uploadMedia(mediaUrl, context.auth.accessToken);
        
        // Create tweet with media
        const tweetBody: any = {
          text,
          media: {
            media_ids: [mediaId],
          },
        };
        
        const response = await twitterRequest('/tweets', 'POST', context.auth.accessToken, tweetBody) as TweetResponse;
        
        return {
          success: true,
          tweetId: response.data.id,
          text: response.data.text,
          mediaId,
          url: `https://twitter.com/i/web/status/${response.data.id}`,
        };
      },
    },
    
    /**
     * Reply to an existing tweet
     */
    reply: {
      name: 'reply',
      displayName: 'Reply to Tweet',
      description: 'Reply to an existing tweet',
      props: {
        tweetId: {
          type: 'SHORT_TEXT',
          displayName: 'Tweet ID',
          description: 'ID of the tweet to reply to',
          required: true,
        },
        text: {
          type: 'LONG_TEXT',
          displayName: 'Reply Text',
          description: 'The text of the reply',
          required: true,
        },
      },
      async run(context: TwitterContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Twitter OAuth flow first.');
        }
        
        const { tweetId, text } = context.propsValue;
        
        const tweetBody = {
          text,
          reply: {
            in_reply_to_tweet_id: tweetId,
          },
        };
        
        const response = await twitterRequest('/tweets', 'POST', context.auth.accessToken, tweetBody) as TweetResponse;
        
        return {
          success: true,
          replyId: response.data.id,
          text: response.data.text,
          inReplyTo: tweetId,
          url: `https://twitter.com/i/web/status/${response.data.id}`,
        };
      },
    },
    
    /**
     * Retweet a tweet
     */
    retweet: {
      name: 'retweet',
      displayName: 'Retweet',
      description: 'Retweet an existing tweet',
      props: {
        userId: {
          type: 'SHORT_TEXT',
          displayName: 'User ID',
          description: 'Your Twitter user ID (leave empty to auto-detect)',
          required: false,
        },
        tweetId: {
          type: 'SHORT_TEXT',
          displayName: 'Tweet ID',
          description: 'ID of the tweet to retweet',
          required: true,
        },
      },
      async run(context: TwitterContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Twitter OAuth flow first.');
        }
        
        let { userId, tweetId } = context.propsValue;
        
        // Auto-detect user ID if not provided
        if (!userId) {
          const meResponse = await twitterRequest('/users/me', 'GET', context.auth.accessToken) as UserResponse;
          userId = meResponse.data.id;
        }
        
        const response = await twitterRequest(
          `/users/${userId}/retweets`,
          'POST',
          context.auth.accessToken,
          { tweet_id: tweetId }
        );
        
        return {
          success: true,
          retweeted: response.data?.retweeted ?? true,
          tweetId,
        };
      },
    },
    
    /**
     * Like a tweet
     */
    like: {
      name: 'like',
      displayName: 'Like Tweet',
      description: 'Like a tweet',
      props: {
        userId: {
          type: 'SHORT_TEXT',
          displayName: 'User ID',
          description: 'Your Twitter user ID (leave empty to auto-detect)',
          required: false,
        },
        tweetId: {
          type: 'SHORT_TEXT',
          displayName: 'Tweet ID',
          description: 'ID of the tweet to like',
          required: true,
        },
      },
      async run(context: TwitterContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Twitter OAuth flow first.');
        }
        
        let { userId, tweetId } = context.propsValue;
        
        // Auto-detect user ID if not provided
        if (!userId) {
          const meResponse = await twitterRequest('/users/me', 'GET', context.auth.accessToken) as UserResponse;
          userId = meResponse.data.id;
        }
        
        const response = await twitterRequest(
          `/users/${userId}/likes`,
          'POST',
          context.auth.accessToken,
          { tweet_id: tweetId }
        );
        
        return {
          success: true,
          liked: response.data?.liked ?? true,
          tweetId,
        };
      },
    },
    
    /**
     * Delete a tweet
     */
    deleteTweet: {
      name: 'deleteTweet',
      displayName: 'Delete Tweet',
      description: 'Delete one of your tweets',
      props: {
        tweetId: {
          type: 'SHORT_TEXT',
          displayName: 'Tweet ID',
          description: 'ID of the tweet to delete',
          required: true,
        },
      },
      async run(context: TwitterContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Twitter OAuth flow first.');
        }
        
        const { tweetId } = context.propsValue;
        
        const response = await twitterRequest(`/tweets/${tweetId}`, 'DELETE', context.auth.accessToken);
        
        return {
          success: true,
          deleted: response.data?.deleted ?? true,
          tweetId,
        };
      },
    },
    
    /**
     * Get user information
     */
    getUser: {
      name: 'getUser',
      displayName: 'Get User',
      description: 'Get information about a Twitter user',
      props: {
        username: {
          type: 'SHORT_TEXT',
          displayName: 'Username',
          description: 'Twitter username (without @)',
          required: true,
        },
      },
      async run(context: TwitterContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Twitter OAuth flow first.');
        }
        
        const { username } = context.propsValue;
        
        const response = await twitterRequest(
          `/users/by/username/${username}?user.fields=profile_image_url,description,public_metrics`,
          'GET',
          context.auth.accessToken
        ) as UserResponse;
        
        return {
          success: true,
          id: response.data.id,
          name: response.data.name,
          username: response.data.username,
          profileImageUrl: response.data.profile_image_url,
          description: response.data.description,
          followers: response.data.public_metrics?.followers_count,
          following: response.data.public_metrics?.following_count,
          tweetCount: response.data.public_metrics?.tweet_count,
        };
      },
    },
    
    /**
     * Get the authenticated user's profile
     */
    getMe: {
      name: 'getMe',
      displayName: 'Get My Profile',
      description: 'Get the authenticated user\'s Twitter profile',
      props: {},
      async run(context: TwitterContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Twitter OAuth flow first.');
        }
        
        const response = await twitterRequest(
          '/users/me?user.fields=profile_image_url,description,public_metrics',
          'GET',
          context.auth.accessToken
        ) as UserResponse;
        
        return {
          success: true,
          id: response.data.id,
          name: response.data.name,
          username: response.data.username,
          profileImageUrl: response.data.profile_image_url,
          description: response.data.description,
          followers: response.data.public_metrics?.followers_count,
          following: response.data.public_metrics?.following_count,
          tweetCount: response.data.public_metrics?.tweet_count,
        };
      },
    },
    
    /**
     * Create a thread of tweets
     */
    createThread: {
      name: 'createThread',
      displayName: 'Create Thread',
      description: 'Create a thread of multiple tweets',
      props: {
        tweets: {
          type: 'LONG_TEXT',
          displayName: 'Thread Tweets',
          description: 'JSON array of tweet texts, e.g., ["First tweet", "Second tweet", "Third tweet"]',
          required: true,
        },
      },
      async run(context: TwitterContext): Promise<any> {
        if (!context.auth || !context.auth.accessToken) {
          throw new Error('No OAuth token available. Please complete the Twitter OAuth flow first.');
        }
        
        const { tweets: tweetsJson } = context.propsValue;
        
        let tweets: string[];
        try {
          tweets = JSON.parse(tweetsJson);
          if (!Array.isArray(tweets) || tweets.length === 0) {
            throw new Error('Tweets must be a non-empty array');
          }
        } catch (e) {
          throw new Error(`Invalid tweets JSON: ${e instanceof Error ? e.message : 'parse error'}`);
        }
        
        const postedTweets: { id: string; text: string }[] = [];
        let previousTweetId: string | undefined;
        
        for (const text of tweets) {
          const tweetBody: any = { text };
          
          if (previousTweetId) {
            tweetBody.reply = { in_reply_to_tweet_id: previousTweetId };
          }
          
          const response = await twitterRequest('/tweets', 'POST', context.auth.accessToken, tweetBody) as TweetResponse;
          
          postedTweets.push({
            id: response.data.id,
            text: response.data.text,
          });
          
          previousTweetId = response.data.id;
        }
        
        return {
          success: true,
          threadLength: postedTweets.length,
          tweets: postedTweets,
          firstTweetUrl: `https://twitter.com/i/web/status/${postedTweets[0].id}`,
        };
      },
    },
  },

  // Empty triggers for now
  triggers: {},
};

export default twitterBit;
