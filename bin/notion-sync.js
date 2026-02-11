#!/usr/bin/env node

/**
 * Notion Sync CLI Tool
 *
 * Command-line interface for all Notion operations in GSD.
 * Future phases will add subcommands: sync, create-workspace, push, etc.
 */

const { createNotionClient, validateAuth } = require('../lib/notion/client.js');
const { convertFile, convertDirectory } = require('../lib/notion/converter.js');
const fs = require('fs');
const path = require('path');

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
  ${green}auth-check${reset}        Verify Notion API key is valid
  ${green}convert [path]${reset}    Convert .planning/ markdown to Notion blocks
  ${green}help${reset}              Show this help message

${cyan}Options:${reset}
  ${yellow}--cwd <path>${reset}      Working directory (default: process.cwd())
  ${yellow}--dry-run${reset}         Preview conversion without side effects

${dim}Examples:${reset}
  ${dim}node bin/notion-sync.js auth-check${reset}
  ${dim}node bin/notion-sync.js auth-check --cwd /path/to/project${reset}
  ${dim}node bin/notion-sync.js convert                          # Convert all .planning/ files${reset}
  ${dim}node bin/notion-sync.js convert .planning/ROADMAP.md     # Convert single file${reset}
  ${dim}node bin/notion-sync.js convert --dry-run                # Preview without side effects${reset}
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
 * Handle convert subcommand
 */
async function handleConvert(targetPath, options) {
  const { cwd, dryRun } = options;

  try {
    // Determine if path is file or directory
    const fullPath = path.resolve(cwd, targetPath);

    // Check if path exists
    if (!fs.existsSync(fullPath)) {
      console.error(`${red}✗ Error:${reset} Path not found: ${targetPath}`);
      process.exit(1);
    }

    const stats = fs.statSync(fullPath);
    const isFile = stats.isFile();
    const isDirectory = stats.isDirectory();

    if (!isFile && !isDirectory) {
      console.error(`${red}✗ Error:${reset} Path must be a file or directory`);
      process.exit(1);
    }

    // Dry-run header
    if (dryRun) {
      const targetType = isFile ? '1 file' : 'directory';
      console.log(`${cyan}[DRY RUN]${reset} Would convert ${targetType} from ${targetPath}\n`);
    }

    // Process file
    if (isFile) {
      if (!fullPath.endsWith('.md')) {
        console.error(`${red}✗ Error:${reset} File must be a markdown file (.md)`);
        process.exit(1);
      }

      const result = convertFile(fullPath, { dryRun });

      if (dryRun) {
        printDryRunResult([result]);
      } else {
        console.log(`${green}✓ Converted${reset} ${result.fileName} — ${result.blockCount} blocks, ${result.chunks.length} chunks`);

        if (result.warnings.length > 0) {
          const logPath = path.join(cwd, '.planning', 'notion-sync.log');
          console.log(`${yellow}⚠ ${result.warnings.length} warnings written to ${logPath}${reset}`);
        }
      }

      process.exit(0);
    }

    // Process directory
    if (isDirectory) {
      const logPath = path.join(cwd, '.planning', 'notion-sync.log');

      const result = convertDirectory(fullPath, {
        dryRun,
        cwd,
        logPath: dryRun ? null : logPath,
        onProgress: (fileName, index, total) => {
          if (!dryRun) {
            console.log(`${dim}Converting ${fileName} (${index + 1}/${total})...${reset}`);
          }
        }
      });

      // Check if any files were found
      if (result.files.length === 0) {
        console.log(`${dim}No .md files found in ${targetPath}${reset}`);
        process.exit(0);
      }

      if (dryRun) {
        printDryRunResult(result.files);
        console.log(`\n${dim}Total: ${result.totalBlocks} blocks across ${result.files.reduce((sum, f) => sum + f.chunks.length, 0)} chunks${reset}`);

        if (result.totalWarnings > 0) {
          console.log(`${yellow}Warnings: ${result.totalWarnings} (see --verbose for details)${reset}`);
        }
      } else {
        console.log(`\n${green}✓ Conversion complete:${reset} ${result.files.length} files, ${result.totalBlocks} total blocks`);

        if (result.totalWarnings > 0) {
          console.log(`${yellow}⚠ ${result.totalWarnings} warnings written to ${logPath}${reset}`);
        }
      }

      process.exit(0);
    }

  } catch (error) {
    console.error(`${red}✗ Conversion error:${reset} ${error.message}`);
    process.exit(1);
  }
}

/**
 * Print dry-run result with block type breakdown
 */
function printDryRunResult(fileResults) {
  for (const result of fileResults) {
    const warningNote = result.warnings.length > 0 ? ` ${yellow}(⚠ ${result.warnings.length} warnings)${reset}` : '';
    console.log(`${cyan}${result.fileName}${reset} — ${result.blockCount} blocks, ${result.chunks.length} chunks${warningNote}`);

    // Block type breakdown
    const blockTypes = {};
    for (const block of result.blocks) {
      const type = block.type;
      blockTypes[type] = (blockTypes[type] || 0) + 1;
    }

    const typesList = Object.entries(blockTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => `${type}: ${count}`)
      .join(', ');

    console.log(`  ${dim}${typesList}${reset}\n`);
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

  // Extract --dry-run flag
  const dryRun = args.includes('--dry-run');

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

  if (command === 'convert') {
    // Find the path argument (second non-flag argument after 'convert')
    const commandIndex = args.indexOf('convert');
    const pathArg = args.slice(commandIndex + 1).find(arg => !arg.startsWith('--') && arg !== cwd);
    const targetPath = pathArg || '.planning/';

    await handleConvert(targetPath, { cwd, dryRun });
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
