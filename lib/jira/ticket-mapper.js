/**
 * Jira Ticket Mapper
 *
 * Maps planning artifacts (ROADMAP.md, REQUIREMENTS.md) to Jira ticket structures
 * at three granularity levels: phase-level, category-level, requirement-level.
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve the path to a planning file for the active project.
 * For multi-project layouts (.active-project exists), returns
 * .planning/<slug>/<filename>. Otherwise .planning/<filename>.
 *
 * @param {string} cwd - Current working directory (project root)
 * @param {string} filename - Name of the planning file (e.g., 'ROADMAP.md')
 * @returns {string} Absolute path to the planning file
 */
function resolvePlanningPath(cwd, filename) {
  const planningRoot = path.join(cwd, '.planning');
  const activeProjectPath = path.join(planningRoot, '.active-project');

  try {
    if (fs.existsSync(activeProjectPath)) {
      const slug = fs.readFileSync(activeProjectPath, 'utf8').trim();
      if (slug) {
        const nested = path.join(planningRoot, slug);
        if (fs.existsSync(nested)) {
          return path.join(nested, filename);
        }
      }
    }
  } catch (e) {
    // Fall through to default
  }

  return path.join(planningRoot, filename);
}

/**
 * Parse ROADMAP.md to extract phases from the in-progress milestone.
 *
 * @param {string} content - ROADMAP.md file content
 * @returns {object} { milestone: string, phases: [{ number, name, goal, requirements, success_criteria }] }
 */
function parseRoadmap(content) {
  const lines = content.split('\n');
  let inProgressMilestone = null;
  let currentSection = null;
  let insideDetailsBlock = false;
  let phases = [];
  let currentPhase = null;
  let collectingSuccessCriteria = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track <details> blocks (completed milestones)
    if (line.trim().startsWith('<details>')) {
      insideDetailsBlock = true;
      continue;
    }
    if (line.trim().startsWith('</details>')) {
      insideDetailsBlock = false;
      continue;
    }

    // Skip content inside details blocks
    if (insideDetailsBlock) {
      continue;
    }

    // Find the in-progress milestone section (contains rocket emoji or "In Progress")
    if (line.startsWith('###') && (line.includes('🚧') || line.includes('In Progress'))) {
      const match = line.match(/###\s*🚧?\s*(.+?)\s*\(In Progress\)?/);
      if (match) {
        inProgressMilestone = match[1].trim();
        currentSection = 'in-progress';
      }
      continue;
    }

    // Only process phases within the in-progress milestone
    if (currentSection !== 'in-progress') {
      continue;
    }

    // Phase heading: #### Phase N: Name
    if (line.startsWith('####') && line.includes('Phase')) {
      // Save previous phase if exists
      if (currentPhase) {
        phases.push(currentPhase);
      }

      const match = line.match(/####\s*Phase\s+(\d+):\s*(.+)/);
      if (match) {
        currentPhase = {
          number: parseInt(match[1], 10),
          name: match[2].trim(),
          goal: '',
          requirements: [],
          success_criteria: []
        };
        collectingSuccessCriteria = false;
      }
      continue;
    }

    if (!currentPhase) {
      continue;
    }

    // Goal: **Goal**: text
    if (line.startsWith('**Goal**:') || line.startsWith('**Goal:')) {
      currentPhase.goal = line.replace(/\*\*Goal\*?\*?:?\s*/, '').trim();
      continue;
    }

    // Requirements: **Requirements**: REQ-01, REQ-02
    if (line.startsWith('**Requirements**:') || line.startsWith('**Requirements:')) {
      const reqText = line.replace(/\*\*Requirements\*?\*?:?\s*/, '').trim();
      currentPhase.requirements = reqText.split(',').map(r => r.trim()).filter(r => r);
      continue;
    }

    // Success Criteria heading
    if (line.startsWith('**Success Criteria**')) {
      collectingSuccessCriteria = true;
      continue;
    }

    // Collect numbered success criteria
    if (collectingSuccessCriteria && line.trim().match(/^\d+\./)) {
      const criterion = line.trim().replace(/^\d+\.\s*/, '');
      currentPhase.success_criteria.push(criterion);
      continue;
    }

    // Stop collecting success criteria if we hit **Plans:** or another phase
    if (collectingSuccessCriteria && (line.startsWith('**Plans') || line.startsWith('####'))) {
      collectingSuccessCriteria = false;
    }
  }

  // Save last phase
  if (currentPhase) {
    phases.push(currentPhase);
  }

  return {
    milestone: inProgressMilestone || 'Unknown Milestone',
    phases: phases
  };
}

/**
 * Parse REQUIREMENTS.md to extract requirement categories and individual requirements.
 *
 * @param {string} content - REQUIREMENTS.md file content
 * @returns {array} [{ category: string, requirements: [{ id: string, description: string }] }]
 */
function parseRequirements(content) {
  const lines = content.split('\n');
  let categories = [];
  let currentCategory = null;
  let inVersionSection = false;
  let insideDetailsBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track <details> blocks (completed versions)
    if (line.trim().startsWith('<details>')) {
      insideDetailsBlock = true;
      continue;
    }
    if (line.trim().startsWith('</details>')) {
      insideDetailsBlock = false;
      continue;
    }

    // Skip content inside details blocks
    if (insideDetailsBlock) {
      continue;
    }

    // Find the latest version section (e.g., ## v1.4 Requirements)
    if (line.startsWith('## v') && line.includes('Requirements')) {
      inVersionSection = true;
      continue;
    }

    // Stop at next major heading (older versions, traceability, etc.)
    if (inVersionSection && line.startsWith('## ') && !line.includes('v1.') && !line.includes('Requirements')) {
      break;
    }

    if (!inVersionSection) {
      continue;
    }

    // Category heading: ### Category Name
    if (line.startsWith('###')) {
      const categoryName = line.replace(/^###\s*/, '').trim();
      currentCategory = {
        category: categoryName,
        requirements: []
      };
      categories.push(currentCategory);
      continue;
    }

    if (!currentCategory) {
      continue;
    }

    // Requirement: - [ ] **REQ-ID**: Description
    const reqMatch = line.match(/^-\s*\[\s*[x ]?\s*\]\s*\*\*([A-Z]+-\d+)\*\*:\s*(.+)/);
    if (reqMatch) {
      currentCategory.requirements.push({
        id: reqMatch[1],
        description: reqMatch[2].trim()
      });
    }
  }

  return categories;
}

/**
 * Load notion-sync.json and extract Notion page URLs.
 * Gracefully handles missing file or multi-project layouts.
 *
 * @param {string} cwd - Current working directory (project root)
 * @returns {object} Map of file paths to Notion page IDs
 */
function loadNotionLinks(cwd) {
  const planningRoot = path.join(cwd, '.planning');
  const activeProjectPath = path.join(planningRoot, '.active-project');
  let syncPath;

  try {
    if (fs.existsSync(activeProjectPath)) {
      const slug = fs.readFileSync(activeProjectPath, 'utf8').trim();
      if (slug && fs.existsSync(path.join(planningRoot, slug))) {
        syncPath = path.join(planningRoot, slug, 'notion-sync.json');
      }
    }
  } catch (e) {
    // Fall through to default
  }

  if (!syncPath) {
    syncPath = path.join(planningRoot, 'notion-sync.json');
  }

  if (!fs.existsSync(syncPath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(syncPath, 'utf8');
    const state = JSON.parse(content);
    const notionLinks = {};

    // Extract doc_pages from all projects
    if (state.projects) {
      for (const projectSlug in state.projects) {
        const project = state.projects[projectSlug];
        if (project.doc_pages) {
          for (const filePath in project.doc_pages) {
            const value = project.doc_pages[filePath];
            // Handle both string and object formats
            const pageId = typeof value === 'string' ? value : (value.page_id || null);
            if (pageId) {
              notionLinks[filePath] = pageId;
            }
          }
        }
      }
    }

    return notionLinks;
  } catch (e) {
    return {};
  }
}

/**
 * Map tickets at phase level.
 * One ticket per phase with all requirements listed in description.
 *
 * @param {object} roadmapData - Parsed roadmap data
 * @param {array} requirementCategories - Parsed requirement categories
 * @param {object} notionLinks - Notion page ID map
 * @returns {array} Array of ticket objects
 */
function mapPhaseLevel(roadmapData, requirementCategories, notionLinks) {
  const tickets = [];

  // Build requirement lookup map
  const reqMap = {};
  for (const cat of requirementCategories) {
    for (const req of cat.requirements) {
      reqMap[req.id] = req;
    }
  }

  for (const phase of roadmapData.phases) {
    let description = `**Goal:** ${phase.goal}\n\n`;

    // Add requirements
    if (phase.requirements.length > 0) {
      description += '**Requirements:**\n';
      for (const reqId of phase.requirements) {
        const req = reqMap[reqId];
        if (req) {
          description += `- ${reqId}: ${req.description}\n`;
        } else {
          description += `- ${reqId}\n`;
        }
      }
      description += '\n';
    }

    // Add success criteria
    if (phase.success_criteria.length > 0) {
      description += '**Success Criteria:**\n';
      for (let i = 0; i < phase.success_criteria.length; i++) {
        description += `${i + 1}. ${phase.success_criteria[i]}\n`;
      }
    }

    const ticket = {
      type: 'phase',
      phase_number: phase.number,
      title: `Phase ${phase.number}: ${phase.name}`,
      description: description.trim()
    };

    // Add Notion page link if available
    const roadmapPageId = notionLinks['.planning/ROADMAP.md'] || notionLinks['ROADMAP.md'];
    if (roadmapPageId) {
      ticket.notion_page_id = roadmapPageId;
    }

    tickets.push(ticket);
  }

  return tickets;
}

/**
 * Map tickets at category level.
 * One ticket per requirement category with requirements as checklist items.
 *
 * @param {object} roadmapData - Parsed roadmap data
 * @param {array} requirementCategories - Parsed requirement categories
 * @param {object} notionLinks - Notion page ID map
 * @returns {array} Array of ticket objects
 */
function mapCategoryLevel(roadmapData, requirementCategories, notionLinks) {
  const tickets = [];

  // Build map of requirement ID to phase
  const reqToPhase = {};
  for (const phase of roadmapData.phases) {
    for (const reqId of phase.requirements) {
      if (!reqToPhase[reqId]) {
        reqToPhase[reqId] = [];
      }
      reqToPhase[reqId].push(phase.number);
    }
  }

  for (const cat of requirementCategories) {
    // Only include categories that have requirements mapped to current milestone phases
    const relevantReqs = cat.requirements.filter(req => reqToPhase[req.id]);
    if (relevantReqs.length === 0) {
      continue;
    }

    // Determine which phases this category spans
    const phaseNumbers = new Set();
    for (const req of relevantReqs) {
      const phases = reqToPhase[req.id] || [];
      phases.forEach(p => phaseNumbers.add(p));
    }
    const phaseList = Array.from(phaseNumbers).sort((a, b) => a - b);

    let description = '';
    if (phaseList.length > 0) {
      description += `**Phases:** ${phaseList.join(', ')}\n\n`;
    }

    description += '**Requirements:**\n';
    for (const req of relevantReqs) {
      description += `- [ ] ${req.id}: ${req.description}\n`;
    }

    const ticket = {
      type: 'category',
      category: cat.category,
      title: cat.category,
      description: description.trim()
    };

    // Add Notion page link if available
    const requirementsPageId = notionLinks['.planning/REQUIREMENTS.md'] || notionLinks['REQUIREMENTS.md'];
    if (requirementsPageId) {
      ticket.notion_page_id = requirementsPageId;
    }

    tickets.push(ticket);
  }

  return tickets;
}

/**
 * Map tickets at requirement level.
 * One ticket per individual requirement with phase context.
 *
 * @param {object} roadmapData - Parsed roadmap data
 * @param {array} requirementCategories - Parsed requirement categories
 * @param {object} notionLinks - Notion page ID map
 * @returns {array} Array of ticket objects
 */
function mapRequirementLevel(roadmapData, requirementCategories, notionLinks) {
  const tickets = [];

  // Build map of requirement ID to phase
  const reqToPhase = {};
  for (const phase of roadmapData.phases) {
    for (const reqId of phase.requirements) {
      reqToPhase[reqId] = phase;
    }
  }

  // Flatten all requirements
  for (const cat of requirementCategories) {
    for (const req of cat.requirements) {
      // Only include requirements mapped to phases in current milestone
      const phase = reqToPhase[req.id];
      if (!phase) {
        continue;
      }

      let description = `**Phase:** ${phase.number} - ${phase.name}\n\n`;
      description += `**Phase Goal:** ${phase.goal}\n\n`;
      description += `**Requirement:** ${req.description}`;

      const ticket = {
        type: 'requirement',
        requirement_id: req.id,
        title: `${req.id}: ${req.description.substring(0, 60)}${req.description.length > 60 ? '...' : ''}`,
        description: description.trim()
      };

      // Add Notion page link if available
      const requirementsPageId = notionLinks['.planning/REQUIREMENTS.md'] || notionLinks['REQUIREMENTS.md'];
      if (requirementsPageId) {
        ticket.notion_page_id = requirementsPageId;
      }

      tickets.push(ticket);
    }
  }

  return tickets;
}

/**
 * Map planning artifacts to Jira tickets based on granularity strategy.
 *
 * @param {string} cwd - Current working directory (project root)
 * @param {string} granularity - Granularity level: 'phase', 'category', or 'requirement'
 * @returns {object} { granularity, milestone, ticket_count, tickets: [...] } or { error: '...' }
 */
function mapTickets(cwd, granularity) {
  // Validate granularity
  const validGranularities = ['phase', 'category', 'requirement'];
  if (!validGranularities.includes(granularity)) {
    return { error: `Invalid granularity: ${granularity}. Must be one of: ${validGranularities.join(', ')}` };
  }

  // Resolve paths
  const roadmapPath = resolvePlanningPath(cwd, 'ROADMAP.md');
  const requirementsPath = resolvePlanningPath(cwd, 'REQUIREMENTS.md');

  // Check if files exist
  if (!fs.existsSync(roadmapPath)) {
    return { error: `ROADMAP.md not found at ${roadmapPath}` };
  }
  if (!fs.existsSync(requirementsPath)) {
    return { error: `REQUIREMENTS.md not found at ${requirementsPath}` };
  }

  // Read and parse files
  let roadmapContent, requirementsContent;
  try {
    roadmapContent = fs.readFileSync(roadmapPath, 'utf8');
    requirementsContent = fs.readFileSync(requirementsPath, 'utf8');
  } catch (e) {
    return { error: `Failed to read planning files: ${e.message}` };
  }

  const roadmapData = parseRoadmap(roadmapContent);
  const requirementCategories = parseRequirements(requirementsContent);
  const notionLinks = loadNotionLinks(cwd);

  // Check if we have data
  if (roadmapData.phases.length === 0) {
    return { error: 'No phases found in ROADMAP.md in-progress milestone' };
  }
  if (requirementCategories.length === 0) {
    return { error: 'No requirement categories found in REQUIREMENTS.md' };
  }

  // Map tickets based on granularity
  let tickets;
  if (granularity === 'phase') {
    tickets = mapPhaseLevel(roadmapData, requirementCategories, notionLinks);
  } else if (granularity === 'category') {
    tickets = mapCategoryLevel(roadmapData, requirementCategories, notionLinks);
  } else if (granularity === 'requirement') {
    tickets = mapRequirementLevel(roadmapData, requirementCategories, notionLinks);
  }

  return {
    granularity: granularity,
    milestone: roadmapData.milestone,
    ticket_count: tickets.length,
    tickets: tickets
  };
}

module.exports = {
  mapTickets
};
