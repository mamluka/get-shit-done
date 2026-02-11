#!/usr/bin/env node

/**
 * Notion Sync CLI Tool
 *
 * Command-line interface for all Notion operations in GSD.
 * Future phases will add subcommands: sync, create-workspace, push, etc.
 */

const { createNotionClient, validateAuth } = require('../lib/notion/client.js');

// ANSI color codes for terminal output
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

/**
 * Print help message
 */
function printHelp() {
  console.log(`
${cyan}Usage:${reset} node bin/notion-sync.js <command> [options]

${cyan}Commands:${reset}
  ${green}auth-check${reset}    Verify Notion API key is valid
  ${green}help${reset}          Show this help message

${cyan}Options:${reset}
  ${yellow}--cwd <path>${reset}  Working directory (default: process.cwd())

${dim}Examples:${reset}
  ${dim}node bin/notion-sync.js auth-check${reset}
  ${dim}node bin/notion-sync.js auth-check --cwd /path/to/project${reset}
`);
}

/**
 * Handle auth-check subcommand
 */
async function handleAuthCheck(cwd) {
  try {
    // Create Notion client from config
    const notion = createNotionClient(cwd);

    // Validate authentication
    console.log(`${dim}Validating Notion API key...${reset}`);
    const result = await validateAuth(notion);

    if (result.valid) {
      console.log(`${green}✓ Notion authentication successful${reset}`);
      console.log(`  Bot name: ${cyan}${result.bot_name}${reset}`);
      console.log(`  Workspace: ${cyan}${result.workspace}${reset}`);
      process.exit(0);
    } else {
      console.error(`${red}✗ Authentication failed:${reset} ${result.error}`);
      console.error(`${dim}Check your API key in .planning/config.json${reset}`);
      process.exit(1);
    }

  } catch (error) {
    // Config loading errors (from loadNotionConfig)
    console.error(`${red}✗ Error:${reset} ${error.message}`);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);

  // Extract --cwd flag
  const cwdIndex = args.indexOf('--cwd');
  const cwd = cwdIndex !== -1 && args[cwdIndex + 1] ? args[cwdIndex + 1] : process.cwd();

  // Find the command (first non-flag argument)
  const command = args.find(arg => !arg.startsWith('--') && arg !== cwd);

  // Route to subcommand handlers
  if (!command || command === 'help') {
    printHelp();
    process.exit(0);
  }

  if (command === 'auth-check') {
    await handleAuthCheck(cwd);
    return;
  }

  // Unknown command
  console.error(`${red}✗ Unknown command:${reset} ${command}`);
  printHelp();
  process.exit(1);
}

// Run main with error handling
main().catch(err => {
  console.error(`${red}✗ Unexpected error:${reset} ${err.message}`);
  process.exit(1);
});
