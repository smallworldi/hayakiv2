
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function getLanguageButtons() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lang_russian')
      .setLabel('🇷🇺 Русский')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('lang_english')
      .setLabel('🇬🇧 English')
      .setStyle(ButtonStyle.Secondary)
  );
}

module.exports = { getLanguageButtons };
