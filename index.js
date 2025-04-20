const { Client, Events, GatewayIntentBits, Collection, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { config } = require('dotenv');

const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.AutoModerationConfiguration,
    GatewayIntentBits.AutoModerationExecution
  ]
});

client.commands = new Collection();
const recentMessages = new Map();
client.voiceTimeTracker = new Map();

// Carregar eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// Carregar comandos
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if (command.name) {
    client.commands.set(command.name, command);
  }
}

client.voiceTimeTracker = new Map();

client.on('voiceStateUpdate', (oldState, newState) => {
  const userId = newState.member.id;
  const AFK_CHANNEL = '1359950681427148880';

  if (!oldState.channelId && newState.channelId && newState.channelId !== AFK_CHANNEL) {
    // User joined a non-AFK voice channel
    client.voiceTimeTracker.set(userId, {
      startTime: Date.now(),
      totalTime: client.voiceTimeTracker.get(userId)?.totalTime || 0
    });
  } else if (oldState.channelId && (!newState.channelId || newState.channelId === AFK_CHANNEL)) {
    // User left voice channel or moved to AFK
    const userData = client.voiceTimeTracker.get(userId);
    if (userData && userData.startTime) {
      const timeSpent = Date.now() - userData.startTime;
      client.voiceTimeTracker.set(userId, {
        startTime: null,
        totalTime: userData.totalTime + timeSpent
      });
    }
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('name_')) {
    const channelId = interaction.customId.split('_')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel || !channel.permissionsFor(interaction.user).has('ManageChannels')) {
      return interaction.reply({ content: 'Você não tem permissão para gerenciar este canal!', ephemeral: true });
    }

    await interaction.reply({ content: 'Digite o novo nome para o canal:', ephemeral: true });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async m => {
      await channel.setName(m.content);
      await m.delete();
      await interaction.followUp({ content: `Nome do canal alterado para: ${m.content}`, ephemeral: true });
    });
  }

  else if (interaction.customId.startsWith('limit_')) {
    const channelId = interaction.customId.split('_')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel || !channel.permissionsFor(interaction.user).has('ManageChannels')) {
      return interaction.reply({ content: 'Você não tem permissão para gerenciar este canal!', ephemeral: true });
    }

    await interaction.reply({ content: 'Digite o novo limite de usuários (0 para sem limite):', ephemeral: true });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async m => {
      const limit = parseInt(m.content);
      if (isNaN(limit) || limit < 0) {
        return interaction.followUp({ content: 'Por favor, digite um número válido!', ephemeral: true });
      }
      await channel.setUserLimit(limit);
      await m.delete();
      await interaction.followUp({ content: `Limite de usuários alterado para: ${limit || 'Sem limite'}`, ephemeral: true });
    });
  }

  else if (interaction.customId.startsWith('whitelist_')) {
    const channelId = interaction.customId.split('_')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel || !channel.permissionsFor(interaction.user).has('ManageChannels')) {
      return interaction.reply({ content: 'Você não tem permissão para gerenciar este canal!', ephemeral: true });
    }

    await interaction.reply({ content: 'Mencione o usuário que você quer permitir entrar:', ephemeral: true });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async m => {
      const user = m.mentions.users.first();
      if (!user) {
        return interaction.followUp({ content: 'Por favor, mencione um usuário válido!', ephemeral: true });
      }
      await channel.permissionOverwrites.edit(user, { Connect: true });
      await m.delete();
      await interaction.followUp({ content: `${user} agora pode entrar no canal!`, ephemeral: true });
    });
  }

  else if (interaction.customId.startsWith('remove_whitelist_')) {
    const channelId = interaction.customId.split('_')[1];
    const channel = interaction.guild.channels.cache.get(channelId);

    if (!channel || !channel.permissionsFor(interaction.user).has('ManageChannels')) {
      return interaction.reply({ content: 'Você não tem permissão para gerenciar este canal!', ephemeral: true });
    }

    await interaction.reply({ content: 'Mencione o usuário que você quer remover o acesso:', ephemeral: true });

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async m => {
      const user = m.mentions.users.first();
      if (!user) {
        return interaction.followUp({ content: 'Por favor, mencione um usuário válido!', ephemeral: true });
      }
      await channel.permissionOverwrites.delete(user);
      await m.delete();
      await interaction.followUp({ content: `Permissões de ${user} foram removidas!`, ephemeral: true });
    });
  }

  else if (interaction.customId === 'lang_russian') {
    const russianEmbed = {
      title: '🤖 Информация о боте',
      description: 'Этот бот является **приватным административным ботом** сервера.\nОн поддерживает только команды для модерации (бан, мут, таймаут и т.п.).',
      color: 0x000000,
      footer: { text: 'Нажми 🇬🇧 для перевода на английский' }
    };
    await interaction.update({ embeds: [russianEmbed], components: [getLanguageButtons()] });
  } else if (interaction.customId === 'lang_english') {
    const englishEmbed = {
      title: '🤖 Bot Information',
      description: 'This is a **private administration bot** for this server.\nIt only supports moderation commands (ban, mute, timeout, etc).',
      color: 0x000000,
      footer: { text: 'Click 🇷🇺 to view the Russian version' }
    };
    await interaction.update({ embeds: [englishEmbed], components: [getLanguageButtons()] });
  } else if (interaction.customId === 'create_voice') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (member.voice.channelId !== '1359954764598612089') {
      return interaction.reply({ content: 'You need to join the "➕・create" channel first!', ephemeral: true });
    }

    await interaction.reply('Please enter a name for your voice channel:');

    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async nameMsg => {
      const channelName = nameMsg.content;
      interaction.lastLimitPrompt = await interaction.followUp('Please specify the user limit (number):');


      const limitCollector = interaction.channel.createMessageCollector({ filter, max: 1, time: 30000 });

      limitCollector.on('collect', async limitMsg => {
        const userLimit = parseInt(limitMsg.content);

        if (isNaN(userLimit) || userLimit < 1 || userLimit > 99) {
          return interaction.followUp('Invalid user limit. Please try again.');
        }

        // Delete user messages and bot responses
        await nameMsg.delete().catch(() => {});
        await limitMsg.delete().catch(() => {});
        await interaction.deleteReply().catch(() => {});
        if (interaction.lastLimitPrompt) {
          await interaction.lastLimitPrompt.delete().catch(() => {});
        }


        try {
          // Watch for the user joining the setup channel
          const voiceChannel = await interaction.guild.channels.create({
                name: channelName,
                type: 2,
                userLimit: userLimit,
                parent: '1359954462680027276',
                permissionOverwrites: [
                  {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.Connect]
                  },
                  {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.Connect]
                  }
                ]
          });

          // Move user to their new channel
          const member = await interaction.guild.members.fetch(interaction.user.id);
          await member.voice.setChannel(voiceChannel);

          // Watch for user leaving their channel
          const leaveHandler = async (oldState, newState) => {
            if (oldState.member.id === interaction.user.id && oldState.channelId === voiceChannel.id) {
              await voiceChannel.delete().catch(() => {});
              client.off('voiceStateUpdate', leaveHandler);
            }
          };

          client.on('voiceStateUpdate', leaveHandler);

          const successEmbed = new EmbedBuilder()
    .setTitle('Channel Created')
    .setDescription(`Your private channel \`${channelName}\` has been created!\nUser limit: \`${userLimit}\``)
    .setColor('#000000');


          await interaction.followUp({ embeds: [successEmbed] });

        } catch (error) {
          console.error(error);
          await interaction.followUp('An error occurred while creating the channel.');
        }
      });
    });
  }
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;

  const userId = message.author.id;
  const now = Date.now();
  const content = message.content.toLowerCase();

  const invitesRegex = /(discord\.gg\/|discord\.com\/invite\/)/;
  const linksRegex = /https?:\/\/|www\./;

  if (invitesRegex.test(content) || linksRegex.test(content)) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      await message.delete().catch(() => {});
      const warn = await message.channel.send(`${message.author}, ссылки запрещены!`);
      setTimeout(() => warn.delete().catch(() => {}), 3000);
      return;
    }
  }

  if (!recentMessages.has(userId)) {
    recentMessages.set(userId, []);
  }

  const userMessages = recentMessages.get(userId);
  userMessages.push({ content: message.content, timestamp: now });

  const filtered = userMessages.filter(msg => now - msg.timestamp < 5000);
  recentMessages.set(userId, filtered);

  const repeatedMessages = filtered.filter(m => m.content === message.content);

  if (repeatedMessages.length >= 3 || filtered.length >= 6) {
    await message.delete().catch(() => {});

    const member = message.member;

    if (member.moderatable) {
      try {
        await member.timeout(5 * 60 * 1000, 'Автоматическое мутирование за спам/флуд');
        const warn = await message.channel.send(`${member} был автоматически замучен на 5 минут за спам/флуд.`);
        setTimeout(() => warn.delete().catch(() => {}), 3000);
      } catch (err) {
        console.error('Ошибка при попытке замутить:', err);
      }
    } else {
      const warn = await message.channel.send(`Не удалось замутить ${member}. У бота нет прав.`);
      setTimeout(() => warn.delete().catch(() => {}), 3000);
    }
    return;
  }

  if (message.mentions.has(client.user) && message.content.trim() === `<@${client.user.id}>`) {
    const russianEmbed = {
      title: '🤖 Информация о боте',
      description: 'Этот бот является **приватным административным ботом** сервера.\nОн поддерживает только команды для модерации (бан, мут, таймаут и т.п.).',
      color: 0x000000,
      footer: { text: 'Нажми 🇬🇧 для перевода на английский' }
    };

    const englishEmbed = {
      title: '🤖 Bot Information',
      description: 'This is a **private administration bot** for this server.\nIt only supports moderation commands (ban, mute, timeout, etc).',
      color: 0x000000,
      footer: { text: 'Click 🇷🇺 to view the Russian version' }
    };

    await message.channel.send({
      embeds: [russianEmbed],
      components: [getLanguageButtons()]
    });
  }

  if (!message.content.startsWith('!')) return;
  const args = message.content.slice('!'.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    if (command.execute) {
      await command.execute(message, args);
    } else if (command.prefixExecute) {
      await command.prefixExecute(message, args);
    }
  } catch (error) {
    console.error(error);
    message.reply('Произошла ошибка при выполнении команды.');
  }
});

client.once(Events.ClientReady, () => {
  console.log(`Бот ${client.user.tag} запущен!`);
});

client.login(process.env.TOKEN);

function getLanguageButtons() {
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

require('./server');
