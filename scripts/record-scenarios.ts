/** The creator questions recorded once against the real vidIQ MCP for Replay mode. */
export const SCENARIOS = [
  {
    id: "keyword-home-espresso",
    label: "Keyword research: home espresso",
    prompt: "Keyword research for 'home espresso'. What should a small channel target?",
  },
  {
    id: "title-espresso",
    label: "Score a title + stronger variations",
    prompt: "Score this title and suggest stronger variations: 'I Tried 5 Cheap Espresso Machines So You Don't Have To'",
  },
  {
    id: "outliers-budget-travel",
    label: "Outliers in budget travel",
    prompt: "Find outlier videos in budget travel from the last three months.",
  },
  {
    id: "questions-sourdough",
    label: "Questions people ask: sourdough",
    prompt: "What questions do people search about sourdough for beginners?",
  },
  {
    id: "channel-veritasium",
    label: "Channel growth: @veritasium",
    prompt: "How much has @veritasium grown in the last 30 days?",
  },
] as const;
