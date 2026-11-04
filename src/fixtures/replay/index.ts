import type { ReplayScenario } from "../../lib/replay/replay-types";
import channelVeritasium from "./channel-veritasium.json";
import keywordHomeEspresso from "./keyword-home-espresso.json";
import longtailBudgetTravel from "./longtail-budget-travel.json";
import outliersBudgetTravel from "./outliers-budget-travel.json";
import questionsSourdough from "./questions-sourdough.json";
import questionsSourdoughStarter from "./questions-sourdough-starter.json";
import titleEspresso from "./title-espresso.json";

/** Display order of the recorded scenarios. */
export const REPLAY_SCENARIOS = [
  keywordHomeEspresso,
  titleEspresso,
  outliersBudgetTravel,
  questionsSourdoughStarter,
  longtailBudgetTravel,
  channelVeritasium,
  questionsSourdough,
] as unknown as ReplayScenario[];
