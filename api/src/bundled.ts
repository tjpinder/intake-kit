// The framework YAML and the intake skill, bundled into the function as text so it reads no
// files at runtime. tests/api.test.ts checks this list matches skills/intake/modules/.

import router from "../../skills/intake/router.yaml";
import scoring from "../../skills/intake/scoring.yaml";
import sections from "../../templates/sections.yaml";
import skill from "../../skills/intake/SKILL.md";
import core from "../../skills/intake/modules/core.yaml";
import broken from "../../skills/intake/modules/broken.yaml";
import manualProcess from "../../skills/intake/modules/manual_process.yaml";
import knownIdea from "../../skills/intake/modules/known_idea.yaml";
import exploratory from "../../skills/intake/modules/exploratory.yaml";
import dataReport from "../../skills/intake/modules/data_report.yaml";
import modIntegration from "../../skills/intake/modules/mod.integration.yaml";
import modCompliance from "../../skills/intake/modules/mod.compliance.yaml";
import modMigration from "../../skills/intake/modules/mod.migration.yaml";
import type { FrameworkSources } from "../../src/lib/framework.ts";

export const sources: FrameworkSources = {
  router,
  scoring,
  sections,
  modules: {
    "core.yaml": core,
    "broken.yaml": broken,
    "manual_process.yaml": manualProcess,
    "known_idea.yaml": knownIdea,
    "exploratory.yaml": exploratory,
    "data_report.yaml": dataReport,
    "mod.integration.yaml": modIntegration,
    "mod.compliance.yaml": modCompliance,
    "mod.migration.yaml": modMigration,
  },
};

export { skill };
