/**
 * Jira Team Fetcher
 *
 * Provides team member retrieval and assignment formatting utilities
 * for Jira sync workflow. Handles display formatting and user input parsing
 * for team assignment operations.
 */

/**
 * Prepare instructions for fetching assignable users.
 * Returns MCP tool call parameters that the workflow will use.
 * Does NOT call MCP directly - returns instructions for workflow.
 *
 * @param {string} cloudId - Jira cloud ID
 * @param {string} projectKey - Jira project key (currently unused, reserved for future)
 * @returns {object} MCP tool call instructions { tool, params }
 */
function fetchAssignableUsers(cloudId, projectKey) {
  return {
    tool: 'mcp__jira__lookupJiraAccountId',
    params: {
      cloudId: cloudId,
      query: ''  // Empty query returns all visible users
    }
  };
}

/**
 * Format a list of users for terminal display.
 * Creates numbered list with display names and shortened identifiers.
 *
 * @param {Array<object>} users - Array of user objects with accountId and displayName
 * @returns {string} Formatted team list for display
 */
function formatTeamList(users) {
  if (!users || users.length === 0) {
    return 'No team members available.';
  }

  const lines = ['Team Members:', ''];

  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const num = i + 1;
    const displayName = user.displayName || 'Unknown User';

    // Show email local part if available, otherwise first 12 chars of accountId
    let identifier;
    if (user.emailAddress) {
      identifier = user.emailAddress.split('@')[0];
    } else if (user.accountId) {
      identifier = user.accountId.substring(0, 12);
    } else {
      identifier = 'no-id';
    }

    lines.push(`${num}. ${displayName} (${identifier})`);
  }

  return lines.join('\n');
}

/**
 * Parse user input for assignment operations.
 * Handles skip, bulk assignment, and individual assignment formats.
 *
 * @param {string} input - User input string
 * @param {number} userCount - Number of available users
 * @param {number} ticketCount - Number of tickets to assign
 * @returns {object} Parsed result: { action, ... } or { error }
 */
function parseAssignmentChoice(input, userCount, ticketCount) {
  const trimmed = input.trim().toLowerCase();

  // Handle skip
  if (trimmed === 'skip') {
    return { action: 'skip' };
  }

  // Handle bulk assignment: all:{N}
  if (trimmed.startsWith('all:')) {
    const userNum = parseInt(trimmed.substring(4), 10);

    if (isNaN(userNum) || userNum < 1 || userNum > userCount) {
      return {
        error: `Invalid user number: ${userNum}. Must be between 1 and ${userCount}.`
      };
    }

    return {
      action: 'bulk',
      userIndex: userNum
    };
  }

  // Handle individual assignments: "1:2, 3:1, 4:2"
  const parts = trimmed.split(',').map(p => p.trim()).filter(p => p.length > 0);
  const assignments = [];

  for (const part of parts) {
    const [ticketStr, userStr] = part.split(':').map(s => s.trim());

    if (!ticketStr || !userStr) {
      return {
        error: `Invalid assignment format: "${part}". Expected "ticketNum:userNum".`
      };
    }

    const ticketNum = parseInt(ticketStr, 10);
    const userNum = parseInt(userStr, 10);

    if (isNaN(ticketNum) || ticketNum < 1 || ticketNum > ticketCount) {
      return {
        error: `Invalid ticket number: ${ticketNum}. Must be between 1 and ${ticketCount}.`
      };
    }

    if (isNaN(userNum) || userNum < 1 || userNum > userCount) {
      return {
        error: `Invalid user number: ${userNum}. Must be between 1 and ${userCount}.`
      };
    }

    assignments.push({
      ticketIndex: ticketNum,
      userIndex: userNum
    });
  }

  if (assignments.length === 0) {
    return {
      error: 'No valid assignments found. Use "skip", "all:{N}", or "1:2, 3:1" format.'
    };
  }

  return {
    action: 'individual',
    assignments: assignments
  };
}

module.exports = {
  fetchAssignableUsers,
  formatTeamList,
  parseAssignmentChoice
};
