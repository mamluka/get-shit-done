/**
 * Notion SDK Client Module
 *
 * Initializes the Notion SDK client with config-based auth and retry settings.
 * Provides authentication validation against the Notion API.
 */

const fs = require('fs');
const path = require('path');
const { Client, isNotionClientError, APIErrorCode } = require('@notionhq/client');

/**
 * Load Notion configuration from .planning/config.json
 *
 * @param {string} cwd - Current working directory (project root)
 * @returns {object} The Notion config section from config.json
 * @throws {Error} If config.json doesn't exist, notion section is missing, or api_key is missing
 */
function loadNotionConfig(cwd) {
  const configPath = path.join(cwd, '.planning', 'config.json');

  // Check if config.json exists
  if (!fs.existsSync(configPath)) {
    throw new Error('No .planning/config.json found. Run npx get-shit-done-cc to set up.');
  }

  // Read and parse config.json
  let config;
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(content);
  } catch (e) {
    throw new Error(`Failed to parse .planning/config.json: ${e.message}`);
  }

  // Check if notion section exists
  if (!config.notion) {
    throw new Error('No Notion configuration in config.json. Add notion.api_key to .planning/config.json');
  }

  // Check if api_key exists and is not empty
  if (!config.notion.api_key || config.notion.api_key.trim() === '') {
    throw new Error('Notion API key not found. Add notion.api_key to .planning/config.json');
  }

  return config.notion;
}

/**
 * Create authenticated Notion SDK client with retry config
 *
 * @param {string} cwd - Current working directory (project root)
 * @returns {Client} Configured Notion SDK client instance
 * @throws {Error} If config is invalid or missing
 */
function createNotionClient(cwd) {
  const config = loadNotionConfig(cwd);

  return new Client({
    auth: config.api_key,
    // Rate limit protection: SDK handles 429 retries automatically
    // Using higher retry count for batch operations (default is 2)
    retry: {
      maxRetries: 3,
      initialRetryDelayMs: 500,
      maxRetryDelayMs: 60000,
    },
    timeoutMs: 60000,
  });
}

/**
 * Validate Notion API authentication by calling users.me()
 *
 * @param {Client} notion - Notion SDK client instance
 * @returns {Promise<object>} Validation result object
 *   - Success: { valid: true, bot_name: string, workspace: string }
 *   - Failure: { valid: false, error: string }
 */
async function validateAuth(notion) {
  try {
    const response = await notion.users.me();

    // Extract bot/user info from response
    // Response includes: object: "user", id: string, type: "bot", bot: { owner: {...}, workspace_name: string }, name: string
    const botName = response.name || 'GSD Sync';
    const workspace = response.bot?.workspace_name || 'Unknown Workspace';

    return {
      valid: true,
      bot_name: botName,
      workspace: workspace
    };

  } catch (error) {
    // Handle Notion API errors with type-safe error handling
    if (isNotionClientError(error)) {
      // Check for specific API error codes
      if (error.code === APIErrorCode.Unauthorized) {
        return {
          valid: false,
          error: 'API key is invalid or expired'
        };
      }

      // Other API errors
      return {
        valid: false,
        error: `Notion API error: ${error.message}`
      };
    }

    // Network or other errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return {
        valid: false,
        error: 'Cannot reach Notion API. Check your internet connection.'
      };
    }

    // Unknown error
    return {
      valid: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

module.exports = {
  loadNotionConfig,
  createNotionClient,
  validateAuth
};
