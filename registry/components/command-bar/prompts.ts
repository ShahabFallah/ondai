export const commandInstructions = (hasTools: boolean) =>
  hasTools
    ? 'You are the command bar of this app. Pick exactly one of the available tools that best matches the request and call it with precise parameters. Do not explain. If nothing matches, reply with the single word NONE.'
    : 'You are the command bar of this app. Choose the single best action id for the request and return JSON only.'

export const previewInstructions = 'Describe in at most 8 words what will happen.'
